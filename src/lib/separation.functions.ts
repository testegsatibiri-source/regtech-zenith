import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CountryRuntime } from "@/sdk";
import type { FinalPayInput } from "@/sdk";

const computeFinalPaySchema = z.object({
  companyId: z.string().uuid(),
  employeeId: z.string().uuid(),
  fullName: z.string(),
  baseSalary: z.number().min(0),
  joinDate: z.string().date(),
  groundCode: z.string(),
  separationDate: z.string().date(),
  yearsOfService: z.number().min(0),
  finalPeriodDaysWorked: z.number().min(0).default(0),
  finalPeriodDays: z.number().min(1).default(26),
  unusedLeaveDays: z.number().min(0).optional(),
  thirteenthAmount: z.number().min(0).optional(),
  deductions: z.number().min(0).optional(),
});

export const listSeparationGrounds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ country: z.string() }).parse(data))
  .handler(async ({ data }) => {
    // Separation is an optional capability: countries without an offboarding
    // engine return an empty list instead of failing the page.
    const pack = CountryRuntime.find(data.country);
    if (!pack?.providers.separation) return [];
    const ctx = CountryRuntime.contextFor(data.country);
    return pack.providers.separation.grounds(ctx).map((g) => ({
      code: g.code,
      title: g.title,
      article: g.article,
      category: g.category,
      monthsPerYear: g.monthsPerYear,
      requiresTwinNotice: g.requiresTwinNotice,
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

    const pack = CountryRuntime.find(membership.country_code);
    if (!pack) throw new Error(`Country pack ${membership.country_code} not installed`);
    if (!pack.providers.separation) {
      throw new Error(`Offboarding is not available for ${membership.country_code} yet`);
    }

    const ctx = CountryRuntime.contextFor(membership.country_code);
    const ground = pack.providers.separation.grounds(ctx).find((g) => g.code === data.groundCode);
    if (!ground) throw new Error("Unknown separation ground");

    const input: FinalPayInput = {
      employee: {
        employeeId: data.employeeId,
        fullName: data.fullName,
        baseSalary: data.baseSalary,
        joinDate: data.joinDate,
        separationDate: data.separationDate,
      },
      separation: {
        ground,
        monthlySalaryForStatutory: data.baseSalary,
        ytdAnnualGrossEarned: data.baseSalary * Math.min(data.yearsOfService, 1) * 12,
        finalPeriodDaysWorked: data.finalPeriodDaysWorked,
        finalPeriodDays: data.finalPeriodDays,
        // H22 Fase B — when the pack ships a LeaveProvider, the SIL accrual
        // comes from it; the manual field is only an override.
        leaveAccrual: data.unusedLeaveDays
          ? {
              silUnusedDays: data.unusedLeaveDays,
              silDailyRate: data.baseSalary / 26,
              complete: true,
            }
          : (pack.providers.leave?.accrual(
              {
                employee: {
                  employeeId: data.employeeId,
                  fullName: data.fullName,
                  baseSalary: data.baseSalary,
                  joinDate: data.joinDate,
                },
                asOf: data.separationDate,
              },
              ctx,
            ) ?? null),

      },
      thirteenthAmount: data.thirteenthAmount,
      deductions: data.deductions ?? 0,
    };

    return pack.providers.separation.computeFinalPay(input, ctx);
  });
