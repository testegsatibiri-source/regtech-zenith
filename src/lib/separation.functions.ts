import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CountryRuntime } from "@/sdk";
import type { SeparationGround, FinalPayInput } from "@/sdk";

const computeFinalPaySchema = z.object({
  companyId: z.string().uuid(),
  employeeId: z.string().uuid(),
  groundCode: z.string(),
  separationDate: z.string().date(),
  yearsOfService: z.number().min(0),
  basicSalary: z.number().min(0),
  unusedLeaveDays: z.number().min(0).optional(),
  thirteenthMonthEarned: z.number().min(0).optional(),
  deductions: z.number().min(0).optional(),
});

export const listSeparationGrounds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ country: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const pack = CountryRuntime.get(data.country);
    if (!pack) throw new Error(`Country pack ${data.country} not installed`);
    if (!pack.providers.separation) throw new Error("Separation provider not available");
    return pack.providers.separation.grounds(context).map((g) => ({
      code: g.code,
      title: g.title,
      category: g.category,
      entitledToSeparationPay: g.entitledToSeparationPay,
    }));
  });

export const computeFinalPay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => computeFinalPaySchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: membership } = await supabase
      .from("companies")
      .select("id, country_code, owner_id")
      .eq("id", data.companyId)
      .maybeSingle();
    if (!membership) throw new Error("Company not found");
    if (membership.owner_id !== userId) throw new Error("Forbidden");

    const pack = CountryRuntime.get(membership.country_code);
    if (!pack) throw new Error(`Country pack ${membership.country_code} not installed`);
    if (!pack.providers.separation) throw new Error("Separation provider not available");

    const ground = pack.providers.separation.grounds(context).find((g) => g.code === data.groundCode);
    if (!ground) throw new Error("Unknown separation ground");

    const input: FinalPayInput = {
      employeeId: data.employeeId,
      separationDate: data.separationDate,
      ground,
      yearsOfService: data.yearsOfService,
      basicSalary: data.basicSalary,
      leaveAccrual: data.unusedLeaveDays ? { days: data.unusedLeaveDays, dailyRate: data.basicSalary / 26 } : null,
      thirteenthAccrual: data.thirteenthMonthEarned ? { earned: data.thirteenthMonthEarned } : null,
      deductions: data.deductions ?? 0,
    };

    const result = pack.providers.separation.computeFinalPay(input, context);
    return {
      ...result,
      components: result.components,
      missing: result.missing,
      complete: result.complete,
      total: result.total,
      deadline: result.deadline,
    };
  });
