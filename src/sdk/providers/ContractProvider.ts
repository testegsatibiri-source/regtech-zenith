import type { ProviderContext } from "../context";

export interface ContractLike {
  id?: string;
  contract_type: string;
  start_date: string;
  end_date?: string | null;
  probation_end?: string | null;
  status?: string;
}

export interface ContractFinding {
  code: string;
  title: string;
  severity: "critical" | "high" | "medium";
  passed: boolean;
  message: string;
  weight: number;
}

export interface ContractProvider {
  readonly version: string;
  validate(contract: ContractLike, ctx?: ProviderContext): ContractFinding[];
  coverage(activeEmployees: number, activeContracts: number, ctx?: ProviderContext): number;
}
