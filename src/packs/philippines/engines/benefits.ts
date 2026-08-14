// SSS + PhilHealth + Pag-IBIG (2024).
import { PH_PARAMS } from "../params";
import type { BenefitsInput, BenefitsOutput } from "@/sdk";

function findSssRow(salary: number) {
  // Lookup in descending order to match the correct bracket.
  return [...PH_PARAMS.sss.table].reverse().find((r) => salary >= r.salaryMin) ?? PH_PARAMS.sss.table[0]!;
}

export function calculatePhBenefits({ salary }: BenefitsInput): BenefitsOutput {
  const s = Math.max(0, salary);

  // SSS — RA 11199 stepped MSC table (2024).
  const sssRow = s > 0 ? findSssRow(s) : null;
  const sssEE = sssRow ? Math.round(sssRow.employee) : 0;
  const sssER = sssRow ? Math.round(sssRow.employer) : 0;
  const sssEC = sssRow ? sssRow.ec : 0;

  // PhilHealth — 5% split 50/50 with floor/cap
  const phBase = s <= 0 ? 0 : Math.min(Math.max(s, PH_PARAMS.philhealth.floor), PH_PARAMS.philhealth.cap);
  const phTotal = Math.round(phBase * PH_PARAMS.philhealth.rate);
  const phEE = Math.round(phTotal / 2);
  const phER = phTotal - phEE;

  // Pag-IBIG — 2%/2% capped at ₱200 each
  const pagEE = s > 0 ? Math.min(Math.round(s * PH_PARAMS.pagibig.rate), PH_PARAMS.pagibig.cap) : 0;
  const pagER = s > 0 ? Math.min(Math.round(s * PH_PARAMS.pagibig.rate), PH_PARAMS.pagibig.cap) : 0;

  const employee = { sss: sssEE, philhealth: phEE, pagibig: pagEE, total: sssEE + phEE + pagEE };
  const employer = {
    sss: sssER, ec: sssEC, philhealth: phER, pagibig: pagER,
    total: sssER + sssEC + phER + pagER,
  };
  return { employee, employer };
}
