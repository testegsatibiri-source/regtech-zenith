// H23-C — Indonesia separation server functions.
// Fluxo: browser → server function → autorização (owns_company + capability)
// → cálculo → persistência com snapshot imutável + hash. Nenhuma escrita
// financeira arbitrária vem do frontend.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sha256Hex } from "@/lib/hashing";
import {
  computeIdSeparation,
  ID_SEPARATION_REASONS,
  type IdSeparationInput,
} from "@/packs/indonesia/engines/separation";
import { ID_SEPARATION_RULESET } from "@/packs/indonesia/params/pp35-2021";

const wageBaseSchema = z.object({
  baseSalary: z.number().min(0),
  fixedAllowances: z.number().min(0).nullish(),
  wageFrequency: z.enum(["monthly", "daily", "piece"]).optional(),
  dailyRate: z.number().min(0).optional(),
  pieceRate12MonthAverage: z.number().min(0).optional(),
});

const pkwtSchema = z.object({
  startDate: z.string().date(),
  endDate: z.string().date(),
  totalDurationMonths: z.number().min(0),
});

const computeSchema = z.object({
  companyId: z.string().uuid(),
  employeeId: z.string().uuid(),
  fullName: z.string().min(1),
  joinDate: z.string().date(),
  separationDate: z.string().date(),
  contractType: z.enum(["PKWT", "PKWTT"]),
  pkwt: pkwtSchema.optional(),
  reasonCode: z.string().min(1),
  wageBase: wageBaseSchema,
  extras: z
    .object({
      unusedLeaveDays: z.number().min(0).optional(),
      repatriationCost: z.number().min(0).optional(),
      otherContractualRights: z.number().min(0).optional(),
      uangPisahAmount: z.number().min(0).optional(),
      unpaidSalaryAmount: z.number().min(0).optional(),
      contractualAdjustments: z.number().optional(),
      thrAlreadyPaid: z.boolean().optional(),
      workingDaysPerMonth: z.number().min(1).max(31).optional(),
    })
    .optional(),
});

function toEngineInput(data: z.infer<typeof computeSchema>): IdSeparationInput {
  return {
    employee: {
      employeeId: data.employeeId,
      fullName: data.fullName,
      joinDate: data.joinDate,
      separationDate: data.separationDate,
      contractType: data.contractType,
      pkwt: data.pkwt,
    },
    reasonCode: data.reasonCode,
    wageBase: data.wageBase,
    extras: data.extras,
  };
}

async function assertCompanyAccess(
  supabase: { from: (t: string) => unknown; rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> },
  companyId: string,
  userId: string,
  capability: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = supabase.from("companies") as any;
  const { data: company } = await q
    .select("id, country_code, owner_id")
    .eq("id", companyId)
    .maybeSingle();
  if (!company) throw new Error("Company not found");
  if (company.owner_id !== userId) throw new Error("Forbidden");
  if (company.country_code !== "ID") {
    throw new Error("Indonesian separation ruleset only applies to ID companies");
  }
  const { data: allowed } = await supabase.rpc("has_capability", {
    _user_id: userId,
    _capability: capability,
  });
  if (!allowed) {
    throw new Error(`Forbidden — requires the "${capability}" permission`);
  }
}

export const listIdSeparationReasons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () =>
    ID_SEPARATION_REASONS.map((r) => ({
      code: r.code,
      title: r.title,
      titleId: r.titleId,
      category: r.category,
      articles: r.articles,
      entitlement: r.entitlement,
    })),
  );

export const computeIdSeparationPreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => computeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertCompanyAccess(supabase, data.companyId, userId, "separation.calculate");
    return computeIdSeparation(toEngineInput(data));
  });

export const finalizeIdSeparationCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => computeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertCompanyAccess(supabase, data.companyId, userId, "separation.calculate");

    const engineInput = toEngineInput(data);
    const result = computeIdSeparation(engineInput);

    // Hash cobre: inputs snapshot + versão do ruleset + direitos do motivo + componentes.
    const calculation_hash = await sha256Hex({
      inputsSnapshot: result.inputsSnapshot,
      ruleVersion: result.ruleVersion,
      entitlement: result.reason?.entitlement ?? null,
      components: result.components.map((c) => ({ code: c.code, amount: c.amount })),
    });

    const { error, data: row } = await supabase
      .from("separation_cases")
      .insert({
        company_id: data.companyId,
        employee_id: data.employeeId,
        employee_name: data.fullName,
        reason_code: data.reasonCode,
        contract_type: data.contractType,
        join_date: data.joinDate,
        separation_date: data.separationDate,
        statutory_minimum: result.statutoryMinimum,
        components: result.components,
        inputs_snapshot: result.inputsSnapshot,
        calculation_trace: result.calculationTrace,
        legal_basis_snapshot: result.legalBasis,
        ruleset_version: result.ruleVersion,
        ruleset_effective_date: result.rulesetEffectiveDate,
        calculation_status: result.status,
        blocked_code: result.blockedCode ?? null,
        completeness_status: result.completeness.complete ? "complete" : "incomplete",
        missing_inputs: result.completeness.missingInputs,
        warnings: result.warnings,
        compliance_violations: result.complianceViolations,
        requires_legal_classification: result.requiresLegalClassification,
        renewal_blocked: result.renewalBlocked,
        regulatory_status: result.regulatoryStatus.status,
        calculation_hash,
        calculated_by: userId,
      })
      .select("id, calculation_hash")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, calculationHash: row.calculation_hash, result };
  });

export const listIdSeparationCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ companyId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertCompanyAccess(supabase, data.companyId, userId, "separation.view");
    const { data: rows, error } = await supabase
      .from("separation_cases")
      .select(
        "id, employee_name, reason_code, contract_type, separation_date, statutory_minimum, calculation_status, blocked_code, completeness_status, requires_legal_classification, renewal_blocked, ruleset_version, calculation_hash, calculated_at, approved_at",
      )
      .eq("company_id", data.companyId)
      .order("separation_date", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return rows;
  });

export const approveIdSeparationCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ companyId: z.string().uuid(), caseId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertCompanyAccess(supabase, data.companyId, userId, "separation.approve");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = supabase.from("separation_cases") as any;
    const { data: existing } = await q
      .select("id, calculated_by, approved_at")
      .eq("id", data.caseId)
      .eq("company_id", data.companyId)
      .maybeSingle();
    if (!existing) throw new Error("Separation case not found");
    if (existing.approved_at) throw new Error("Already approved");
    if (existing.calculated_by === userId) {
      throw new Error("Segregation of duties: the approver cannot be the person who calculated");
    }
    const { error } = await q
      .update({ approved_by: userId, approved_at: new Date().toISOString() })
      .eq("id", data.caseId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ID_SEPARATION_META = {
  ruleVersion: ID_SEPARATION_RULESET.ruleVersion,
  effectiveFrom: ID_SEPARATION_RULESET.effectiveFrom,
  blockingFrom: ID_SEPARATION_RULESET.regulatoryStatus.blockingFrom,
};
