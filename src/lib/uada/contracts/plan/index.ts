// H14 — Plan artefact contract. Reusable by H15 Review.
import type { Evidence } from "@/lib/uada/contracts/response";
import type { H14ImpactLevel } from "@/lib/uada/contracts/impact";

export interface PlanStep {
  order: number;
  title: string;
  detail: string;
  affectedFiles: string[];
  evidencePaths: string[];
}

export interface Risk {
  severity: "low" | "medium" | "high";
  description: string;
  mitigation?: string;
}

export interface Plan {
  objective: string;
  summary: string;
  steps: PlanStep[];
  risks: Risk[];
  assumptions: string[];
  blockedBy: string[];
  affectedFiles: string[];
  estimatedImpact: H14ImpactLevel;
  evidence: Evidence[];
}
