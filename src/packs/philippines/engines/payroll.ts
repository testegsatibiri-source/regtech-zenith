// Payroll composition. Prefers `ctx.siblings.*` (ADR-0003 DI) with local
// fallback so the provider is usable outside the Runtime.
import type { PayslipInput, Payslip, ProviderContext } from "@/sdk";
import { calculatePhTax } from "./tax";
import { calculatePhBenefits } from "./benefits";

export function buildPhPayslip(input: PayslipInput, ctx?: ProviderContext): Payslip {
  const gross = input.baseSalary + (input.allowances ?? 0);

  const taxProvider = ctx?.siblings.tax;
  const benefitsProvider = ctx?.siblings.benefits;

  const tax = taxProvider
    ? taxProvider.calculate(
        { monthlyGross: gross, maritalStatus: input.maritalStatus, hasNpwp: input.hasNpwp },
        ctx,
      )
    : calculatePhTax({
        monthlyGross: gross,
        maritalStatus: input.maritalStatus,
        hasNpwp: input.hasNpwp,
      });

  const benefits = benefitsProvider
    ? benefitsProvider.calculate({ salary: input.baseSalary }, ctx)
    : calculatePhBenefits({ salary: input.baseSalary });

  const net = gross - tax.tax - benefits.employee.total;
  const employerCost = gross + benefits.employer.total;
  return { gross, tax, benefits, net, employerCost };
}
