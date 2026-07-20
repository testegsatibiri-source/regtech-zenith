export interface ThirteenthInput {
  monthlySalary: number;
  monthsOfService: number;
}
export interface ThirteenthOutput {
  eligible: boolean;
  amount: number;
  prorated: boolean;
}
export interface ThirteenthProvider {
  calculate(input: ThirteenthInput): ThirteenthOutput;
}
