// H23-C — Indonesia separation engine (pesangon / UPMK / UPH / PKWT).
//
// The engine returns an EVIDENCE OBJECT, never a bare total:
// `statutoryMinimum` + per-component amounts + legal basis + input snapshot +
// calculation trace + completeness + warnings + compliance violations.
//
// Two hard normative gates (plano aprovado Fase C):
//   • terminationDate >= ruleset.regulatoryStatus.blockingFrom ("2026-10-31")
//     → BLOCKED_PENDING_REGULATORY_REVALIDATION (needs a validated successor)
//   • terminationDate < ruleset.effectiveFrom ("2024-10-31")
//     → BLOCKED_MISSING_HISTORICAL_RULESET (no certified historical ruleset)
//
// PKWT acima do limite legal NÃO converte automaticamente para PKWTT:
// gera `complianceViolation` + `requiresLegalClassification` + bloqueio de
// renovação. A consequência jurídica é matéria do parecer (pergunta 2).

import {
  ID_SEPARATION_RULESET,
  ID_SEPARATION_REASONS,
  PESANGON_BANDS,
  UPMK_BANDS,
  PKWT_RULES,
  WAGE_BASE_RULES,
  bandForMonths,
  findSeparationReason,
  type LegalInstrument,
  type SeparationReason,
} from "../params/pp35-2021";

export type IdBlockedCode =
  | "BLOCKED_PENDING_REGULATORY_REVALIDATION"
  | "BLOCKED_MISSING_HISTORICAL_RULESET";

export type WageFrequency = "monthly" | "daily" | "piece";

export interface SeparationWageBase {
  baseSalary: number;
  /** tunjangan tetap (art. 157). undefined/null = dado ausente → incomplete. */
  fixedAllowances?: number | null;
  wageFrequency?: WageFrequency;
  dailyRate?: number;
  pieceRate12MonthAverage?: number;
}

export interface IdSeparationInput {
  employee: {
    employeeId: string;
    fullName: string;
    joinDate: string; // ISO date
    separationDate: string; // ISO date
    contractType: "PKWT" | "PKWTT";
    pkwt?: {
      startDate: string;
      endDate: string;
      /** Total PKWT duration incl. agreed extensions, in months. */
      totalDurationMonths: number;
    };
  };
  reasonCode: string;
  wageBase: SeparationWageBase;
  extras?: {
    unusedLeaveDays?: number;
    repatriationCost?: number;
    otherContractualRights?: number;
    /** uang pisah per agreement/regulation (never a statutory default). */
    uangPisahAmount?: number;
    unpaidSalaryAmount?: number;
    contractualAdjustments?: number;
    /** Whether this year's THR was already paid. undefined = missing input. */
    thrAlreadyPaid?: boolean;
    workingDaysPerMonth?: number;
  };
}

export interface IdSeparationComponent {
  code: string;
  label: string;
  amount: number;
  kind: "statutory" | "contractual";
  legalBasis: LegalInstrument[];
}

export interface IdSeparationResult {
  status: "computed" | "blocked";
  blockedCode?: IdBlockedCode;
  blockedReason?: string;
  /** Piso legal (paling sedikit) — MK 168/PUU-XXI/2023. */
  statutoryMinimum: number;
  components: IdSeparationComponent[];
  legalBasis: LegalInstrument[];
  ruleVersion: string;
  rulesetEffectiveDate: string;
  regulatoryStatus: typeof ID_SEPARATION_RULESET.regulatoryStatus;
  inputsSnapshot: IdSeparationInput;
  calculationTrace: string[];
  completeness: { complete: boolean; missingInputs: string[] };
  warnings: string[];
  complianceViolations: { code: string; message: string }[];
  requiresLegalClassification: boolean;
  renewalBlocked: boolean;
  reason: SeparationReason | null;
  serviceMonths: number;
  monthlyWageBase: number;
}

const round = (n: number) => Math.round(n);

/** Completed months between two ISO dates (floor; no rounding of years). */
export function monthsOfService(fromIso: string, toIso: string): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

function blocked(code: IdBlockedCode, reason: string, input: IdSeparationInput): IdSeparationResult {
  return {
    status: "blocked",
    blockedCode: code,
    blockedReason: reason,
    statutoryMinimum: 0,
    components: [],
    legalBasis: ID_SEPARATION_RULESET.legalBasis,
    ruleVersion: ID_SEPARATION_RULESET.ruleVersion,
    rulesetEffectiveDate: ID_SEPARATION_RULESET.effectiveFrom,
    regulatoryStatus: ID_SEPARATION_RULESET.regulatoryStatus,
    inputsSnapshot: input,
    calculationTrace: [reason],
    completeness: { complete: false, missingInputs: [] },
    warnings: [],
    complianceViolations: [],
    requiresLegalClassification: false,
    renewalBlocked: false,
    reason: null,
    serviceMonths: 0,
    monthlyWageBase: 0,
  };
}

export function computeIdSeparation(input: IdSeparationInput): IdSeparationResult {
  const trace: string[] = [];
  const warnings: string[] = [];
  const missingInputs: string[] = [];
  const violations: { code: string; message: string }[] = [];
  const components: IdSeparationComponent[] = [];

  const terminationDate = input.employee.separationDate;

  // ---- Gate 1: future normative frontier (MK 168 transition deadline) ----
  if (terminationDate >= ID_SEPARATION_RULESET.regulatoryStatus.blockingFrom) {
    return blocked(
      "BLOCKED_PENDING_REGULATORY_REVALIDATION",
      `Termination on/after ${ID_SEPARATION_RULESET.regulatoryStatus.blockingFrom} requires a validated successor ruleset (MK 168/PUU-XXI/2023 transition deadline). The pack does not cross the normative frontier silently.`,
      input,
    );
  }

  // ---- Gate 2: historical frontier (ruleset effectiveFrom) ----
  if (terminationDate < ID_SEPARATION_RULESET.effectiveFrom) {
    return blocked(
      "BLOCKED_MISSING_HISTORICAL_RULESET",
      `Termination before ${ID_SEPARATION_RULESET.effectiveFrom} predates this ruleset's normative window. A certified historical ruleset is required; none is installed.`,
      input,
    );
  }

  const reason = findSeparationReason(input.reasonCode);
  if (!reason) {
    return blocked(
      "BLOCKED_MISSING_HISTORICAL_RULESET",
      `Unknown separation reason "${input.reasonCode}" — refusing to compute without a normative basis.`,
      input,
    );
  }

  const serviceMonths = monthsOfService(input.employee.joinDate, terminationDate);
  trace.push(`service: ${input.employee.joinDate} → ${terminationDate} = ${serviceMonths} completed month(s) (floor bands; no rounding)`);

  // ---- Wage base (UU 6/2023 art. 157) ----
  const freq: WageFrequency = input.wageBase.wageFrequency ?? "monthly";
  const workdays = input.extras?.workingDaysPerMonth ?? WAGE_BASE_RULES.defaultWorkingDaysPerMonth;
  let monthlyWageBase = 0;
  if (freq === "monthly") {
    if (input.wageBase.fixedAllowances === undefined || input.wageBase.fixedAllowances === null) {
      missingInputs.push(
        "fixedAllowances (tunjangan tetap) not provided — art. 157 wage base is incomplete",
      );
    }
    monthlyWageBase = input.wageBase.baseSalary + (input.wageBase.fixedAllowances ?? 0);
    trace.push(
      `wage base (monthly): ${input.wageBase.baseSalary} + tunjangan tetap ${input.wageBase.fixedAllowances ?? "MISSING→0"} = ${monthlyWageBase} (UU 6/2023 art. 157)`,
    );
  } else if (freq === "daily") {
    if (!input.wageBase.dailyRate || input.wageBase.dailyRate <= 0) {
      missingInputs.push("dailyRate required for daily-paid worker");
    }
    monthlyWageBase = (input.wageBase.dailyRate ?? 0) * workdays;
    trace.push(`wage base (daily): ${input.wageBase.dailyRate ?? 0} × ${workdays} workdays = ${monthlyWageBase}`);
  } else {
    if (!input.wageBase.pieceRate12MonthAverage || input.wageBase.pieceRate12MonthAverage <= 0) {
      missingInputs.push("pieceRate12MonthAverage required for piece-rate worker");
    }
    monthlyWageBase = input.wageBase.pieceRate12MonthAverage ?? 0;
    trace.push(`wage base (piece): 12-month average = ${monthlyWageBase}`);
  }

  const ent = reason.entitlement;

  // ---- PKWT compliance: > 5 years is a violation, NOT a conversion ----
  let requiresLegalClassification = false;
  let renewalBlocked = false;
  if (input.employee.contractType === "PKWT" && input.employee.pkwt) {
    if (input.employee.pkwt.totalDurationMonths > PKWT_RULES.maxTotalMonths) {
      violations.push({
        code: "ID-PKWT-DURATION",
        message: `PKWT total duration ${input.employee.pkwt.totalDurationMonths} months exceeds the ${PKWT_RULES.maxTotalMonths}-month cap (PP 35/2021 art. 8). Renewal blocked; legal classification required — no automatic conversion to PKWTT.`,
      });
      requiresLegalClassification = true;
      renewalBlocked = true;
      trace.push("PKWT duration cap exceeded → complianceViolation + requiresLegalClassification + renewalBlocked");
    }
  }

  // ---- Pesangon (art. 40(2), paling sedikit) ----
  if (ent.pesangon?.applicable) {
    const band = bandForMonths(PESANGON_BANDS, serviceMonths);
    if (band) {
      const mult = ent.pesangon.multiplier ?? 1;
      const amount = round(band.monthsWage * mult * monthlyWageBase);
      components.push({
        code: "PESANGON",
        label: `Pesangon — ${band.label} → ${band.monthsWage} month(s) × ${mult} (statutory minimum, art. 40(2) + MK 168)`,
        amount,
        kind: "statutory",
        legalBasis: reason.legalBasis,
      });
      trace.push(`pesangon: band ${band.label} = ${band.monthsWage}m × ${mult} × ${monthlyWageBase} = ${amount}`);
    }
  } else {
    trace.push("pesangon: not applicable for this reason");
  }

  // ---- UPMK (art. 40(3)) ----
  if (ent.upmk?.applicable) {
    const band = bandForMonths(UPMK_BANDS, serviceMonths);
    if (band) {
      const mult = ent.upmk.multiplier ?? 1;
      const amount = round(band.monthsWage * mult * monthlyWageBase);
      components.push({
        code: "UPMK",
        label: `UPMK — ${band.label} → ${band.monthsWage} month(s) × ${mult} (art. 40(3))`,
        amount,
        kind: "statutory",
        legalBasis: reason.legalBasis,
      });
      trace.push(`upmk: band ${band.label} = ${band.monthsWage}m × ${mult} × ${monthlyWageBase} = ${amount}`);
    } else {
      trace.push(`upmk: service ${serviceMonths}m below 36m floor → 0`);
    }
  }

  // ---- UPH (art. 40(4)) — THR stays OUT, sibling component ----
  if (ent.uph.applicable) {
    if (input.extras?.unusedLeaveDays === undefined) {
      missingInputs.push("unusedLeaveDays (annual leave not taken) not provided — UPH incomplete");
    } else if (input.extras.unusedLeaveDays > 0) {
      const amount = round((input.extras.unusedLeaveDays * monthlyWageBase) / WAGE_BASE_RULES.leaveConversionDivisor);
      components.push({
        code: "UPH_UNUSED_LEAVE",
        label: `UPH — ${input.extras.unusedLeaveDays} unused leave day(s) (art. 40(4)(a))`,
        amount,
        kind: "statutory",
        legalBasis: reason.legalBasis,
      });
      trace.push(`uph.leave: ${input.extras.unusedLeaveDays}d × ${monthlyWageBase}/${WAGE_BASE_RULES.leaveConversionDivisor} = ${amount}`);
    }
    if ((input.extras?.repatriationCost ?? 0) > 0) {
      components.push({
        code: "UPH_REPATRIATION",
        label: "UPH — repatriation to place of recruitment (art. 40(4)(b))",
        amount: round(input.extras!.repatriationCost!),
        kind: "statutory",
        legalBasis: reason.legalBasis,
      });
      trace.push(`uph.repatriation: ${input.extras!.repatriationCost}`);
    }
    if ((input.extras?.otherContractualRights ?? 0) > 0) {
      components.push({
        code: "UPH_CONTRACTUAL",
        label: "UPH — other rights under PK/PP/PKB (art. 40(4)(c))",
        amount: round(input.extras!.otherContractualRights!),
        kind: "statutory",
        legalBasis: reason.legalBasis,
      });
      trace.push(`uph.other: ${input.extras!.otherContractualRights}`);
    }
  }

  // ---- THR — sibling component, never inside UPH (no double counting) ----
  if (input.extras?.thrAlreadyPaid === undefined) {
    missingInputs.push("thrAlreadyPaid not provided — THR position unknown");
  } else if (!input.extras.thrAlreadyPaid) {
    // Permenaker 6/2016 art. 3: 1 month wage ≥12 months service; prorata below.
    const months = Math.min(serviceMonths, 12);
    if (months >= 1) {
      const amount = round((months / 12) * monthlyWageBase);
      components.push({
        code: "THR",
        label: `THR ${months < 12 ? `pro-rata ${months}/12` : "full"} — unpaid this year (Permenaker 6/2016 art. 3)`,
        amount,
        kind: "statutory",
        legalBasis: [{ instrument: "Permenaker 6/2016", articles: ["3"] }],
      });
      trace.push(`thr: ${months}/12 × ${monthlyWageBase} = ${amount}`);
    } else {
      trace.push("thr: service < 1 month → not eligible");
    }
  } else {
    trace.push("thr: already paid this year → 0");
  }

  // ---- PKWT compensation (arts. 15–17) ----
  if (ent.pkwtCompensation?.applicable && input.employee.pkwt) {
    const pkwtMonths = monthsOfService(input.employee.pkwt.startDate, terminationDate);
    const amount = round((pkwtMonths / 12) * PKWT_RULES.compensationMonthsPerYear * monthlyWageBase);
    components.push({
      code: "PKWT_COMPENSATION",
      label: `PKWT end-of-contract compensation — ${pkwtMonths}/12 × 1 month wage (art. 15(3))`,
      amount,
      kind: "statutory",
      legalBasis: reason.legalBasis,
    });
    trace.push(`pkwt compensation: ${pkwtMonths}/12 × ${monthlyWageBase} = ${amount}`);
    if (ent.remainingTermWages?.applicable) {
      const remainingMonths = monthsOfService(terminationDate, input.employee.pkwt.endDate);
      if (remainingMonths > 0) {
        const remaining = round(remainingMonths * monthlyWageBase);
        components.push({
          code: "PKWT_REMAINING_TERM",
          label: `Remaining-term wages — ${remainingMonths} month(s) until ${input.employee.pkwt.endDate} (art. 17 / UU 13/2003 art. 62)`,
          amount: remaining,
          kind: "statutory",
          legalBasis: reason.legalBasis,
        });
        trace.push(`pkwt remaining term: ${remainingMonths}m × ${monthlyWageBase} = ${remaining}`);
      }
    }
  }

  // ---- uang pisah (conditional, source = agreement/regulation) ----
  if (ent.uangPisah?.applicable) {
    if (input.extras?.uangPisahAmount === undefined) {
      warnings.push(
        `uang pisah applies for this reason but the amount comes from the ${ent.uangPisah.source} — none provided; recorded as 0`,
      );
      trace.push("uang pisah: applicable but amount not provided → 0 (warning)");
    } else if (input.extras.uangPisahAmount > 0) {
      components.push({
        code: "UANG_PISAH",
        label: `Uang pisah — per ${ent.uangPisah.source.replace(/_/g, " ")}`,
        amount: round(input.extras.uangPisahAmount),
        kind: "contractual",
        legalBasis: reason.legalBasis,
      });
      trace.push(`uang pisah: ${input.extras.uangPisahAmount} (contractual)`);
    }
  }

  // ---- Unpaid salary ----
  if ((input.extras?.unpaidSalaryAmount ?? 0) > 0) {
    components.push({
      code: "UNPAID_SALARY",
      label: "Unpaid salary owed",
      amount: round(input.extras!.unpaidSalaryAmount!),
      kind: "statutory",
      legalBasis: [{ instrument: "UU 6/2023", articles: ["156"] }],
    });
    trace.push(`unpaid salary: ${input.extras!.unpaidSalaryAmount}`);
  }

  // ---- Contractual adjustments (above the floor; never in the baseline) ----
  if ((input.extras?.contractualAdjustments ?? 0) !== 0) {
    components.push({
      code: "CONTRACTUAL_ADJUSTMENT",
      label: "Contractual adjustment (PK/PP/PKB above the statutory floor)",
      amount: round(input.extras!.contractualAdjustments!),
      kind: "contractual",
      legalBasis: [],
    });
    trace.push(`contractual adjustment: ${input.extras!.contractualAdjustments} (excluded from statutory minimum)`);
  }

  const statutoryMinimum = components
    .filter((c) => c.kind === "statutory")
    .reduce((s, c) => s + c.amount, 0);
  trace.push(`statutoryMinimum (paling sedikit): ${statutoryMinimum}`);

  return {
    status: "computed",
    statutoryMinimum,
    components,
    legalBasis: ID_SEPARATION_RULESET.legalBasis,
    ruleVersion: ID_SEPARATION_RULESET.ruleVersion,
    rulesetEffectiveDate: ID_SEPARATION_RULESET.effectiveFrom,
    regulatoryStatus: ID_SEPARATION_RULESET.regulatoryStatus,
    inputsSnapshot: input,
    calculationTrace: trace,
    completeness: { complete: missingInputs.length === 0, missingInputs },
    warnings,
    complianceViolations: violations,
    requiresLegalClassification,
    renewalBlocked,
    reason,
    serviceMonths,
    monthlyWageBase,
  };
}

export { ID_SEPARATION_REASONS, ID_SEPARATION_RULES_VERSION };

const ID_SEPARATION_RULES_VERSION = ID_SEPARATION_RULESET.ruleVersion;
