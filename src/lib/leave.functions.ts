// H22 Fase B — statutory leave (Core side).
// Leave types and entitlement rules are owned by the Country Pack; the Core
// only persists balances/requests and asks the pack how many days are due.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { CountryRuntime } from "@/sdk";
import "@/sdk/bootstrap";

export const listLeaveTypes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ country: z.string().min(2).max(2) }).parse(d))
  .handler(async ({ data }) => {
    // Optional capability: countries without a leave engine return an empty list.
    const pack = CountryRuntime.find(data.country.toUpperCase());
    if (!pack?.providers.leave) return [];
    const ctx = CountryRuntime.contextFor(data.country.toUpperCase());
    return pack.providers.leave.types(ctx);
  });

const entitlementSchema = z.object({
  companyId: z.string().uuid(),
  employeeId: z.string().uuid(),
  year: z.number().int().min(2020).max(2100),
});

export const getLeaveEntitlements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => entitlementSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: company } = await supabase
      .from("companies")
      .select("id, country_code")
      .eq("id", data.companyId)
      .maybeSingle();
    if (!company) throw new Error("Company not found");

    const pack = CountryRuntime.find(company.country_code);
    if (!pack?.providers.leave) {
      return { available: false, country: company.country_code, entitlements: [] as never[] };
    }

    const { data: employee } = await supabase
      .from("employees")
      .select("id, full_name, base_salary, join_date, marital_status, country_metadata")
      .eq("id", data.employeeId)
      .maybeSingle();
    if (!employee) throw new Error("Employee not found");

    const meta = (employee.country_metadata ?? {}) as Record<string, unknown>;

    // Days already used in the requested cycle come from approved requests.
    const { data: approved } = await supabase
      .from("leave_requests")
      .select("leave_code, days")
      .eq("employee_id", data.employeeId)
      .eq("status", "approved")
      .gte("start_date", `${data.year}-01-01`)
      .lte("start_date", `${data.year}-12-31`);

    const usedDays: Record<string, number> = {};
    for (const row of approved ?? []) {
      usedDays[row.leave_code] = (usedDays[row.leave_code] ?? 0) + Number(row.days ?? 0);
    }

    const ctx = CountryRuntime.contextFor(company.country_code);
    const input = {
      employee: {
        employeeId: employee.id,
        fullName: employee.full_name,
        baseSalary: Number(employee.base_salary),
        joinDate: employee.join_date ?? `${data.year}-01-01`,
        sex: (meta["sex"] as "male" | "female" | undefined) ?? null,
        maritalStatus: employee.marital_status,
        soloParent: Boolean(meta["solo_parent"]),
        childrenCount: Number(meta["children_count"] ?? 0),
        countryMetadata: meta,
      },
      asOf: `${data.year}-12-31`,
      usedDays,
    };

    return {
      available: true,
      country: company.country_code,
      entitlements: pack.providers.leave.entitlement(input, ctx),
      accrual: pack.providers.leave.accrual(input, ctx),
    };
  });

export const listLeaveRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("leave_requests")
      .select(
        "id, employee_id, leave_code, start_date, end_date, days, paid, status, reason, decided_at, created_at",
      )
      .eq("company_id", data.companyId)
      .order("start_date", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const createRequestSchema = z.object({
  companyId: z.string().uuid(),
  employeeId: z.string().uuid(),
  leaveCode: z.string().min(2),
  startDate: z.string().date(),
  endDate: z.string().date(),
  days: z.number().min(0.5),
  reason: z.string().max(500).optional(),
});

export const createLeaveRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createRequestSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: company } = await supabase
      .from("companies")
      .select("id, country_code")
      .eq("id", data.companyId)
      .maybeSingle();
    if (!company) throw new Error("Company not found");
    if (new Date(data.endDate) < new Date(data.startDate)) {
      throw new Error("End date must not precede the start date");
    }

    const pack = CountryRuntime.find(company.country_code);
    const type = pack?.providers.leave?.types().find((t) => t.code === data.leaveCode);
    if (!type)
      throw new Error(
        `Leave type ${data.leaveCode} is not offered by the ${company.country_code} pack`,
      );

    const { data: row, error } = await supabase
      .from("leave_requests")
      .insert({
        company_id: data.companyId,
        employee_id: data.employeeId,
        leave_code: data.leaveCode,
        start_date: data.startDate,
        end_date: data.endDate,
        days: data.days,
        paid: type.paid,
        status: "submitted",
        reason: data.reason ?? null,
        metadata: { legalBasis: type.legalBasis, requiresProof: type.requiresProof ?? null },
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const decideLeaveRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        status: z.enum(["approved", "rejected", "cancelled"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("leave_requests")
      .update({
        status: data.status,
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.requestId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
