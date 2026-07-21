// SSS + PhilHealth + Pag-IBIG (2024).
import { PH_PARAMS } from "../params";
import type { BenefitsInput, BenefitsOutput } from "@/sdk";

export function calculatePhBenefits({ salary }: BenefitsInput): BenefitsOutput {
  const s = Math.max(0, salary);

  // SSS — clamp to MSC range
  const msc = Math.min(Math.max(s, PH_PARAMS.sss.mscMin), PH_PARAMS.sss.mscMax);
  const sssEE = s > 0 ? Math.round(msc * PH_PARAMS.sss.employeeRate) : 0;
  const sssER = s > 0 ? Math.round(msc * PH_PARAMS.sss.employerRate) : 0;
  const sssEC = s > 0 ? (msc >= 15_000 ? PH_PARAMS.sss.ecMax : PH_PARAMS.sss.ecMin) : 0;

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
