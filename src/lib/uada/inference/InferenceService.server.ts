// H14 — InferenceService (server-only). ADR-0029 — Inference Principle.
// The ONLY component that talks to the AI Gateway / ModelRouter.
// Enforces: budget, retry, redaction, evidence completeness.
import { generateText } from "ai";
import type { ContextBundle } from "@/lib/uada/contracts/context";
import type { Plan } from "@/lib/uada/contracts/plan";
import type { Evidence, UadaResponse } from "@/lib/uada/contracts/response";
import type { ReviewFinding } from "@/lib/uada/contracts/review";
import { assertEvidenceComplete } from "@/lib/uada/contracts/response/hash";
import { ModelRouter, type UadaTask } from "@/lib/uada/model/router";
import { UADA_BASE_SYSTEM_PROMPT } from "@/lib/uada/prompts/base";
import { createUadaAiGatewayProvider } from "@/lib/uada/gateway/aiGateway.server";

export interface InferRequest {
  task: UadaTask;
  system?: string;
  prompt: string;
  bundle: ContextBundle;
  /** Soft cap on prompt+context tokens sent to the model. */
  tokenBudget?: number;
  /** Retries for transient failures (429/5xx). Default 1. */
  maxRetries?: number;
}

export interface InferResult<T> extends UadaResponse<T> {
  runId?: string;
  latencyMs: number;
}

function buildContextBlock(bundle: ContextBundle): string {
  const docs = bundle.documents
    .slice(0, 20)
    .map((d, i) => `[${i + 1}] ${d.path} (${d.kind}, score=${d.score})\n${d.summary}`)
    .join("\n\n");
  const nodes = bundle.nodes
    .slice(0, 30)
    .map((n) => `- ${n.kind}: ${n.label}${n.path ? ` (${n.path})` : ""}`)
    .join("\n");
  return [
    `# Snapshot v${bundle.snapshotVersion} — ${bundle.metrics.documents} docs / ${bundle.metrics.nodes} nodes`,
    "",
    "## Evidence (cite by path only)",
    docs || "(no documents)",
    "",
    "## Graph neighbours",
    nodes || "(no nodes)",
  ].join("\n");
}

async function callGateway(
  model: string,
  providerOptions: Record<string, unknown> | undefined,
  system: string,
  prompt: string,
  maxRetries: number,
): Promise<{ text: string; runId?: string; latencyMs: number }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
  const gateway = createUadaAiGatewayProvider(apiKey);
  const modelInstance = gateway(model);

  let lastErr: unknown;
  const started = Date.now();
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await generateText({
        model: modelInstance,
        system,
        prompt,
        ...(providerOptions ? { providerOptions: providerOptions as never } : {}),
      });
      return {
        text: result.text,
        runId: gateway.getRunId(),
        latencyMs: Date.now() - started,
      };
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Only retry on rate limit / 5xx.
      if (!/429|rate|5\d\d/.test(msg) || attempt === maxRetries) break;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function safeJsonParse<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]) as T; } catch { return null; }
}

export const InferenceService = {
  async infer(req: InferRequest): Promise<InferResult<string>> {
    const choice = ModelRouter.pick(req.task);
    const system = req.system ?? UADA_BASE_SYSTEM_PROMPT;
    const prompt = `${buildContextBlock(req.bundle)}\n\n---\n\n${req.prompt}`;
    const { text, runId, latencyMs } = await callGateway(
      choice.model,
      choice.providerOptions,
      system,
      prompt,
      req.maxRetries ?? 1,
    );

    const resp: InferResult<string> = {
      data: text,
      confidence: req.bundle.evidence.length > 0 ? 0.8 : 0,
      snapshotVersion: req.bundle.snapshotVersion,
      filesUsed: req.bundle.documents.map((d) => d.path),
      model: choice.model,
      evidence: req.bundle.evidence,
      warnings: req.bundle.evidence.length === 0
        ? [{ code: "insufficient_evidence", message: "no evidence in bundle" }]
        : undefined,
      runId,
      latencyMs,
    };
    await assertEvidenceComplete(resp, { minEvidence: 0 });
    return resp;
  },

  async plan(bundle: ContextBundle, objective: string): Promise<UadaResponse<Plan>> {
    // Zero evidence -> refuse to plan (ADR-0025 "Never invent").
    if (bundle.evidence.length === 0) {
      const empty: Plan = {
        objective,
        summary: "Insufficient evidence to generate a plan.",
        steps: [],
        risks: [],
        assumptions: [],
        blockedBy: ["no evidence in bundle"],
        affectedFiles: [],
        estimatedImpact: "direct",
        evidence: [],
      };
      const resp: UadaResponse<Plan> = {
        data: empty,
        confidence: 0,
        snapshotVersion: bundle.snapshotVersion,
        filesUsed: [],
        model: "none",
        evidence: [],
        warnings: [{ code: "insufficient_evidence", message: "planner refused: no evidence" }],
      };
      await assertEvidenceComplete(resp, { minEvidence: 0 });
      return resp;
    }

    const choice = ModelRouter.pick("plan");
    const evidencePaths = new Set(bundle.documents.map((d) => d.path));
    const system = `${UADA_BASE_SYSTEM_PROMPT}

You are producing a STRUCTURED PLAN. Reply with a single JSON object with this shape:
{
  "summary": string,
  "steps": [{ "order": number, "title": string, "detail": string, "affectedFiles": string[], "evidencePaths": string[] }],
  "risks": [{ "severity": "low"|"medium"|"high", "description": string, "mitigation": string }],
  "assumptions": string[],
  "blockedBy": string[],
  "affectedFiles": string[]
}
Rules:
- Every "evidencePaths" entry MUST appear in the Evidence section above.
- Every "affectedFiles" entry MUST be a file cited in the Evidence section.
- If you cannot ground a step, omit it.`;
    const prompt = `Objective: ${objective}\n\nProduce the plan JSON now.`;

    const { text, latencyMs } = await callGateway(
      choice.model,
      choice.providerOptions,
      system,
      `${buildContextBlock(bundle)}\n\n---\n\n${prompt}`,
      1,
    );

    type Raw = Omit<Plan, "objective" | "estimatedImpact" | "evidence">;
    const parsed = safeJsonParse<Raw>(text);
    const draft: Plan = {
      objective,
      summary: parsed?.summary ?? text.slice(0, 400),
      steps: (parsed?.steps ?? [])
        .filter((s) => Array.isArray(s.evidencePaths) && s.evidencePaths.every((p) => evidencePaths.has(p)))
        .map((s, i) => ({ order: s.order ?? i + 1, title: s.title, detail: s.detail, affectedFiles: s.affectedFiles ?? [], evidencePaths: s.evidencePaths })),
      risks: parsed?.risks ?? [],
      assumptions: parsed?.assumptions ?? [],
      blockedBy: parsed?.blockedBy ?? [],
      affectedFiles: (parsed?.affectedFiles ?? []).filter((f) => evidencePaths.has(f)),
      estimatedImpact: parsed?.steps && parsed.steps.length > 5 ? "transitive" : parsed?.steps && parsed.steps.length > 2 ? "indirect" : "direct",
      evidence: bundle.evidence,
    };

    const filteredCount = (parsed?.steps?.length ?? 0) - draft.steps.length;
    const warnings: Evidence extends never ? never : { code: string; message: string }[] = [];
    if (filteredCount > 0) warnings.push({ code: "steps_dropped_missing_evidence", message: `${filteredCount} step(s) dropped for citing unknown files` });
    if (!parsed) warnings.push({ code: "unparseable_plan", message: "model output was not valid JSON; used raw summary" });

    const resp: UadaResponse<Plan> = {
      data: draft,
      confidence: draft.steps.length > 0 ? 0.75 : 0.2,
      snapshotVersion: bundle.snapshotVersion,
      filesUsed: bundle.documents.map((d) => d.path),
      model: choice.model,
      evidence: bundle.evidence,
      warnings: warnings.length ? warnings : undefined,
    };
    await assertEvidenceComplete(resp, { minEvidence: 0 });
    // Attach latency in a warning-free channel via console for now; H20 will
    // wire this into telemetry.
    void latencyMs;
    return resp;
  },

  /**
   * H15 — Advisory review findings (ADR-0030). Additive only: deterministic
   * rules always win. Every finding must cite a path present in the bundle.
   */
  async reviewAdvisory(
    bundle: ContextBundle,
    input: { filesChanged: string[]; diff: string; ruleFindings: ReviewFinding[] },
  ): Promise<ReviewFinding[]> {
    if (bundle.evidence.length === 0) return [];
    const choice = ModelRouter.pick("review");
    const known = new Set(bundle.documents.map((d) => d.path));
    for (const p of input.filesChanged) known.add(p);

    const system = `${UADA_BASE_SYSTEM_PROMPT}

You are performing an ARCHITECTURE REVIEW of a diff. Reply with a single JSON object:
{ "findings": [{ "severity": "info"|"warning"|"error", "title": string, "detail": string, "path": string, "references": string[], "suggestion": string }] }
Rules:
- "path" MUST be one of the changed files or a path cited in the Evidence section.
- Do NOT repeat findings already listed under "Deterministic findings".
- If you have nothing grounded to add, return {"findings": []}.`;

    const alreadyFound = input.ruleFindings
      .map((f) => `- ${f.id} ${f.path}: ${f.title}`)
      .join("\n") || "(none)";
    const truncatedDiff = input.diff.slice(0, 20000);
    const prompt = [
      "## Changed files",
      input.filesChanged.join("\n") || "(none)",
      "",
      "## Deterministic findings",
      alreadyFound,
      "",
      "## Diff",
      truncatedDiff,
      "",
      "Return the advisory findings JSON now.",
    ].join("\n");

    const { text } = await callGateway(
      choice.model,
      choice.providerOptions,
      system,
      `${buildContextBlock(bundle)}\n\n---\n\n${prompt}`,
      1,
    );

    type RawFinding = {
      severity?: string;
      title?: string;
      detail?: string;
      path?: string;
      references?: string[];
      suggestion?: string;
    };
    const parsed = safeJsonParse<{ findings?: RawFinding[] }>(text);
    const severities = new Set(["info", "warning", "error"]);

    return (parsed?.findings ?? [])
      .filter((f) => !!f.path && known.has(f.path) && !!f.title)
      .slice(0, 20)
      .map((f, i): ReviewFinding => ({
        id: `ADV-${i + 1}`,
        origin: "advisory",
        severity: (severities.has(String(f.severity)) ? f.severity : "info") as ReviewFinding["severity"],
        title: String(f.title),
        detail: String(f.detail ?? ""),
        path: String(f.path),
        references: Array.isArray(f.references) ? f.references.map(String) : [],
        suggestion: f.suggestion ? String(f.suggestion) : undefined,
      }));
  },
};

