// PH statutory filing exports — H21 Phase 4 (DEBT-023).
//
// BIR / SSS / PhilHealth / Pag-IBIG accept employer submissions only through
// their web portals, using fixed-layout files. This engine produces those files
// deterministically from finalized payroll data. Transmission and the official
// receipt are recorded by the Core, never faked here.
import type { FilingArtifact, FilingForm, FilingRequest, FilingEmployeeRecord } from "@/sdk";
import { PH_PARAMS } from "../../params";
import { validatePhEmployeeIdentifiers, validatePhEmployerIdentifiers } from "../identifiers";
import { csvRow, digits, money, monthLabel, padAmount, padText, splitName } from "./layouts";

const RULESET = `PH-${PH_PARAMS.version}`;

export const PH_FILING_FORMS: FilingForm[] = [
  {
    code: "BIR-1601C",
    title: "BIR 1601-C — Monthly Remittance Return of Income Taxes Withheld on Compensation",
    agency: "BIR",
    format: "csv",
    cadence: "monthly",
    legalBasis: "NIRC §79 / RR 11-2018",
    scope: "period",
    description: "Monthly withholding summary for eBIRForms / eFPS encoding.",
  },
  {
    code: "BIR-1604C-ALPHALIST",
    title: "BIR 1604-C Alphalist (Schedule 7.1) — Annual employee compensation list",
    agency: "BIR",
    format: "dat",
    cadence: "annual",
    legalBasis: "RR 11-2018 / RMC 73-2019",
    scope: "annual",
    description: "Annual alphalist DAT file uploaded through the BIR Alphalist Data Entry module.",
  },
  {
    code: "SSS-R3",
    title: "SSS R-3 — Contribution Collection List",
    agency: "SSS",
    format: "txt",
    cadence: "monthly",
    legalBasis: "RA 11199 §19-A",
    scope: "period",
    description: "Monthly member contribution list for the SSS employer portal (eR3 text layout).",
  },
  {
    code: "PHIC-RF1",
    title: "PhilHealth RF-1 — Employer's Remittance Report",
    agency: "PhilHealth",
    format: "csv",
    cadence: "monthly",
    legalBasis: "RA 11223 / PhilHealth Circular 2020-0025",
    scope: "period",
    description: "Monthly premium remittance report for the Electronic Premium Remittance System.",
  },
  {
    code: "HDMF-MCRF",
    title: "Pag-IBIG MCRF — Membership Contribution Remittance Form",
    agency: "Pag-IBIG (HDMF)",
    format: "csv",
    cadence: "monthly",
    legalBasis: "RA 9679 / HDMF Circular 274",
    scope: "period",
    description: "Monthly savings remittance schedule for the Pag-IBIG employer portal.",
  },
];

const contrib = (
  r: FilingEmployeeRecord,
  side: "employeeContributions" | "employerContributions",
  key: string,
) => Number(r[side]?.[key] ?? 0);

function collectWarnings(req: FilingRequest): string[] {
  const warnings: string[] = [];
  const employer = validatePhEmployerIdentifiers(req.employer.statutoryMetadata ?? null);
  for (const issue of employer.issues) warnings.push(`Employer: ${issue.message}`);

  let bad = 0;
  for (const e of req.employees) {
    const v = validatePhEmployeeIdentifiers(e.identifiers ?? null);
    if (!v.complete) bad += 1;
  }
  if (bad > 0) {
    warnings.push(
      `${bad} employee(s) have missing or malformed statutory identifiers — the agency portal will reject those rows`,
    );
  }
  if (req.employees.length === 0) warnings.push("No payroll records found for the selected period");
  return warnings;
}

function employerField(req: FilingRequest, key: string): string {
  const meta = (req.employer.statutoryMetadata ?? {}) as Record<string, unknown>;
  return digits(meta[key]);
}

function periodTag(req: FilingRequest): string {
  return monthLabel(req.year, req.month);
}

// ---------------------------------------------------------------- generators

function bir1601c(req: FilingRequest): {
  content: string;
  rows: number;
  totals: Record<string, number>;
} {
  const totalGross = req.employees.reduce((s: number, e: FilingEmployeeRecord) => s + e.gross, 0);
  const totalTax = req.employees.reduce(
    (s: number, e: FilingEmployeeRecord) => s + e.taxWithheld,
    0,
  );
  const totalStat = req.employees.reduce(
    (s: number, e: FilingEmployeeRecord) =>
      s +
      Object.values(e.employeeContributions ?? {}).reduce((a: number, b) => a + Number(b || 0), 0),
    0,
  );
  const taxable = Math.max(0, totalGross - totalStat);
  const lines = [
    csvRow(["FORM", "1601-C"]),
    csvRow(["TIN", employerField(req, "tin")]),
    csvRow(["RDO", employerField(req, "rdo")]),
    csvRow(["REGISTERED_NAME", req.employer.legalName]),
    csvRow(["MONTH", req.month ?? ""]),
    csvRow(["YEAR", req.year]),
    csvRow(["", ""]),
    csvRow(["LINE", "DESCRIPTION", "AMOUNT"]),
    csvRow(["13", "Total amount of compensation", money(totalGross)]),
    csvRow(["16", "Total non-taxable compensation (statutory contributions)", money(totalStat)]),
    csvRow(["17", "Total taxable compensation", money(taxable)]),
    csvRow(["20", "Total taxes withheld", money(totalTax)]),
    csvRow(["23", "Total amount still due / remittable", money(totalTax)]),
    csvRow(["", "Number of employees", String(req.employees.length)]),
  ];
  return {
    content: `${lines.join("\n")}\n`,
    rows: req.employees.length,
    totals: { gross: totalGross, taxWithheld: totalTax, statutoryDeductions: totalStat, taxable },
  };
}

function alphalist1604c(req: FilingRequest): {
  content: string;
  rows: number;
  totals: Record<string, number>;
} {
  const tin = employerField(req, "tin");
  const branch = tin.length === 12 ? tin.slice(9) : "0000";
  const header = [
    "HDR",
    "1604C",
    "S7.1",
    tin.slice(0, 9),
    branch,
    req.employer.legalName.toUpperCase(),
    String(req.year),
  ].join(",");

  let gross = 0;
  let tax = 0;
  let thirteenth = 0;
  const detail = req.employees.map((e: FilingEmployeeRecord) => {
    const { last, first, middle } = splitName(e.fullName);
    const empTin = digits(e.identifiers?.["tin"]);
    const nonTaxable =
      Object.values(e.employeeContributions ?? {}).reduce((a: number, b) => a + Number(b || 0), 0) +
      Math.min(e.thirteenthMonth ?? 0, PH_PARAMS.birExemptBenefitsCeiling);
    gross += e.gross;
    tax += e.taxWithheld;
    thirteenth += e.thirteenthMonth ?? 0;
    return [
      "D7.1",
      empTin.slice(0, 9) || "000000000",
      empTin.length === 12 ? empTin.slice(9) : "0000",
      last,
      first,
      middle,
      money(e.gross),
      money(nonTaxable),
      money(Math.max(0, e.gross - nonTaxable)),
      money(e.taxWithheld),
    ].join(",");
  });
  const footer = ["CTR", String(req.employees.length), money(gross), money(tax)].join(",");
  return {
    content: `${[header, ...detail, footer].join("\n")}\n`,
    rows: req.employees.length,
    totals: { gross, taxWithheld: tax, thirteenthMonth: thirteenth },
  };
}

function sssR3(req: FilingRequest): {
  content: string;
  rows: number;
  totals: Record<string, number>;
} {
  const er = employerField(req, "sss");
  const header = [
    "H",
    padText(er, 13),
    padText(req.employer.legalName, 60),
    padText(periodTag(req), 6),
  ].join("");

  let ee = 0;
  let emp = 0;
  let ec = 0;
  const detail = req.employees.map((r: FilingEmployeeRecord) => {
    const { last, first, middle } = splitName(r.fullName);
    const sss = digits(r.identifiers?.["sss"]);
    const eeAmt = contrib(r, "employeeContributions", "sss");
    const erAmt = contrib(r, "employerContributions", "sss");
    const ecAmt = contrib(r, "employerContributions", "ec");
    ee += eeAmt;
    emp += erAmt;
    ec += ecAmt;
    return [
      "D",
      padText(sss, 10),
      padText(last, 25),
      padText(first, 25),
      padText(middle, 15),
      padAmount(eeAmt, 9),
      padAmount(erAmt, 9),
      padAmount(ecAmt, 7),
      padAmount(eeAmt + erAmt + ecAmt, 9),
    ].join("");
  });
  const trailer = [
    "T",
    String(req.employees.length).padStart(6, "0"),
    padAmount(ee + emp + ec, 13),
  ].join("");
  return {
    content: `${[header, ...detail, trailer].join("\n")}\n`,
    rows: req.employees.length,
    totals: { employee: ee, employer: emp, ec, total: ee + emp + ec },
  };
}

function philhealthRf1(req: FilingRequest): {
  content: string;
  rows: number;
  totals: Record<string, number>;
} {
  let ee = 0;
  let er = 0;
  const rows = req.employees.map((r: FilingEmployeeRecord) => {
    const { last, first, middle } = splitName(r.fullName);
    const eeAmt = contrib(r, "employeeContributions", "philhealth");
    const erAmt = contrib(r, "employerContributions", "philhealth");
    ee += eeAmt;
    er += erAmt;
    return csvRow([
      digits(r.identifiers?.["philhealth"]),
      last,
      first,
      middle,
      money(r.gross),
      money(eeAmt),
      money(erAmt),
      money(eeAmt + erAmt),
    ]);
  });
  const lines = [
    csvRow(["PEN", employerField(req, "philhealth")]),
    csvRow(["EMPLOYER", req.employer.legalName]),
    csvRow(["APPLICABLE_PERIOD", periodTag(req)]),
    csvRow([
      "PIN",
      "LAST_NAME",
      "FIRST_NAME",
      "MIDDLE_NAME",
      "MONTHLY_BASIC_SALARY",
      "PERSONAL_SHARE",
      "EMPLOYER_SHARE",
      "TOTAL",
    ]),
    ...rows,
    csvRow(["TOTAL", req.employees.length, "", "", "", money(ee), money(er), money(ee + er)]),
  ];
  return {
    content: `${lines.join("\n")}\n`,
    rows: req.employees.length,
    totals: { employee: ee, employer: er, total: ee + er },
  };
}

function pagibigMcrf(req: FilingRequest): {
  content: string;
  rows: number;
  totals: Record<string, number>;
} {
  let ee = 0;
  let er = 0;
  const rows = req.employees.map((r: FilingEmployeeRecord) => {
    const { last, first, middle } = splitName(r.fullName);
    const eeAmt = contrib(r, "employeeContributions", "pagibig");
    const erAmt = contrib(r, "employerContributions", "pagibig");
    ee += eeAmt;
    er += erAmt;
    return csvRow([
      digits(r.identifiers?.["pagibig"]),
      last,
      first,
      middle,
      money(r.gross),
      money(eeAmt),
      money(erAmt),
      money(eeAmt + erAmt),
    ]);
  });
  const lines = [
    csvRow(["EMPLOYER_ID", employerField(req, "pagibig")]),
    csvRow(["EMPLOYER_NAME", req.employer.legalName]),
    csvRow(["PERIOD_COVERED", periodTag(req)]),
    csvRow([
      "PAGIBIG_MID",
      "LAST_NAME",
      "FIRST_NAME",
      "MIDDLE_NAME",
      "MONTHLY_COMPENSATION",
      "EE_SHARE",
      "ER_SHARE",
      "TOTAL",
    ]),
    ...rows,
    csvRow(["TOTAL", req.employees.length, "", "", "", money(ee), money(er), money(ee + er)]),
  ];
  return {
    content: `${lines.join("\n")}\n`,
    rows: req.employees.length,
    totals: { employee: ee, employer: er, total: ee + er },
  };
}

const GENERATORS: Record<
  string,
  (req: FilingRequest) => { content: string; rows: number; totals: Record<string, number> }
> = {
  "BIR-1601C": bir1601c,
  "BIR-1604C-ALPHALIST": alphalist1604c,
  "SSS-R3": sssR3,
  "PHIC-RF1": philhealthRf1,
  "HDMF-MCRF": pagibigMcrf,
};

export function generatePhFiling(req: FilingRequest): FilingArtifact {
  const form = PH_FILING_FORMS.find((f) => f.code === req.formCode);
  if (!form) throw new Error(`Unknown PH filing form: ${req.formCode}`);
  if (form.scope === "period" && !req.month) {
    throw new Error(`${form.code} is a monthly form — a period month is required`);
  }
  const generate = GENERATORS[form.code]!;
  const { content, rows, totals } = generate(req);
  const suffix =
    form.scope === "period" ? `${req.year}${String(req.month).padStart(2, "0")}` : String(req.year);
  const tin = employerField(req, "tin") || "NOTIN";
  return {
    formCode: form.code,
    title: form.title,
    filename: `${form.code}_${tin}_${suffix}.${form.format}`,
    format: form.format,
    content,
    rowCount: rows,
    totals,
    warnings: collectWarnings(req),
    rulesetVersion: RULESET,
  };
}
