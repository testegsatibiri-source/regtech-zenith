// H2 — CountryPack contract. Enables MY/SG/PH/VN/TH without refactor.
export type CountryCode = "ID" | "MY" | "SG" | "PH" | "VN" | "TH";

export interface TaxInput {
  monthlyGross: number;
  maritalStatus: string;
  hasNpwp?: boolean;
}
export interface TaxOutput {
  category?: string;
  rate: number;
  tax: number;
  surcharge: number;
}

export interface SocialInput {
  salary: number;
}
export interface SocialOutput {
  employee: Record<string, number> & { total: number };
  employer: Record<string, number> & { total: number };
}

export interface ThirteenthInput {
  monthlySalary: number;
  monthsOfService: number;
}
export interface ThirteenthOutput {
  eligible: boolean;
  amount: number;
  prorated: boolean;
}

export type Severity = "critical" | "high" | "medium" | "info";
export interface ComplianceRule<Ctx = unknown> {
  code: string;
  title: string;
  severity: Severity;
  weight: number;
  evaluate: (
    employee: EmployeeLike,
    ctx: Ctx & { params: Record<string, unknown> },
  ) => {
    passed: boolean;
    message: string;
    conclusive?: boolean;
  };
}

export interface EmployeeLike {
  full_name: string;
  base_salary: number;
  marital_status?: string;
  religion?: string | null;
  country_metadata?: Record<string, unknown> | null;
}

export interface CountryPack<Ctx = unknown> {
  code: CountryCode;
  name: string;
  currency: string;
  rulesetVersion: string; // e.g. 'ID-2024.11.01'
  params: Record<string, unknown>;
  taxEngine: (input: TaxInput) => TaxOutput;
  socialEngine?: (input: SocialInput) => SocialOutput;
  thirteenthEngine?: (input: ThirteenthInput) => ThirteenthOutput;
  complianceRules: ComplianceRule<Ctx>[];
}
