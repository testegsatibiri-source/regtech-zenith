// H15 — ReviewEngine. Deterministic rules first, model advisory second.
// Reads nothing directly: context comes from ContextAssembler (ADR-0029).
import type { UadaResponse } from "@/lib/uada/contracts/response";
import type { ReviewReport, ReviewFinding } from "@/lib/uada/contracts/review";
import { summariseVerdict } from "@/lib/uada/contracts/review";
import { parseUnifiedDiff } from "@/lib/uada/review/diff";
import { ReviewRules } from "@/lib/uada/review/rules";
import { ContextAssembler } from "@/lib/uada/context/ContextAssembler.server";
import { InferenceService } from "@/lib/uada/inference/InferenceService.server";
import { assertEvidenceComplete } from "@/lib/uada/contracts/response/hash";

export interface ReviewOptions {
  diff: string;
  snapshotVersion?: number;
  /** Ask the model for extra, evidence-bound observations. Default true. */
  advisory?: boolean;
  maxDocuments?: number;
}

export const ReviewEngine = {
  async review(opts: ReviewOptions): Promise<UadaResponse<ReviewReport>> {
    const parsed = parseUnifiedDiff(opts.diff);
    const ruleFindings = ReviewRules.run(parsed);
    const filesChanged = parsed.files.map((f) => f.path).sort((a, b) => a.localeCompare(b));

    const bundle = await ContextAssembler.assemble({
      objective: `Review changes to: ${filesChanged.join(", ") || "(no files)"}`,
      snapshotVersion: opts.snapshotVersion,
      maxDocuments: opts.maxDocuments ?? 10,
      maxTokens: 10000,
      expansionDepth: 1,
      includeDocs: true,
      includeGraph: true,
      includeMemory: false,
      minimumScore: 0.3,
    });

    let advisory: ReviewFinding[] = [];
    const warnings: Array<{ code: string; message: string }> = [];

    if (opts.advisory !== false && bundle.evidence.length > 0 && parsed.files.length > 0) {
      try {
        advisory = await InferenceService.reviewAdvisory(bundle, {
          filesChanged,
          diff: opts.diff,
          ruleFindings,
        });
      } catch (err) {
        warnings.push({
          code: "advisory_failed",
          message: err instanceof Error ? err.message : "advisory review failed",
        });
      }
    } else if (bundle.evidence.length === 0) {
      warnings.push({
        code: "insufficient_evidence",
        message: "no snapshot evidence — deterministic rules only",
      });
    }

    const findings = [...ruleFindings, ...advisory];
    const report: ReviewReport = {
      filesChanged,
      additions: parsed.additions,
      deletions: parsed.deletions,
      findings,
      verdict: summariseVerdict(findings),
      rulesEvaluated: ReviewRules.ids(),
      evidence: bundle.evidence,
    };

    const resp: UadaResponse<ReviewReport> = {
      data: report,
      // Deterministic rules stand on their own; evidence lifts confidence.
      confidence: bundle.evidence.length > 0 ? 0.85 : 0,
      snapshotVersion: bundle.snapshotVersion,
      filesUsed: bundle.documents.map((d) => d.path),
      model: advisory.length > 0 ? "advisory" : "none",
      evidence: bundle.evidence,
      warnings: warnings.length ? warnings : undefined,
    };
    await assertEvidenceComplete(resp, { minEvidence: 0 });
    return resp;
  },
};
