// H16 — ScoreEngine. Deterministic Architecture Score over a snapshot.
// Reads nothing directly: all facts come from ContextAssembler (ADR-0029).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UadaResponse, Evidence } from "@/lib/uada/contracts/response";
import type { ScoreReport } from "@/lib/uada/contracts/score";
import { assertScoreReport } from "@/lib/uada/contracts/score";
import { computeScoreReport } from "@/lib/uada/score/dimensions";
import { ContextAssembler } from "@/lib/uada/context/ContextAssembler.server";
import { computeEvidenceHash } from "@/lib/uada/contracts/response/hash";

export interface ScoreOptions {
  snapshotVersion?: number;
  /** Skip writing to uada_score_reports (dry run from the console). */
  persist?: boolean;
  /** Injected reference instant — tests and replays pin this. */
  now?: string;
}

async function admin(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

async function loadPreviousOverall(
  db: SupabaseClient,
  snapshotVersion: number,
): Promise<number | undefined> {
  const { data, error } = await db
    .from("uada_score_reports")
    .select("overall, snapshot_version")
    .lt("snapshot_version", snapshotVersion)
    .order("snapshot_version", { ascending: false })
    .limit(1);
  if (error) return undefined;
  const row = (data ?? [])[0] as { overall: number | string } | undefined;
  return row ? Number(row.overall) : undefined;
}

async function persistReport(
  db: SupabaseClient,
  snapshotVersion: number,
  report: ScoreReport,
): Promise<void> {
  const rows = report.dimensions.map((d) => ({
    snapshot_version: snapshotVersion,
    dimension: d.name,
    score: d.score,
    weight: d.weight,
    overall: report.overall,
    details: { evidence: d.evidence },
    updated_at: new Date().toISOString(),
  }));
  const { error } = await db
    .from("uada_score_reports")
    .upsert(rows, { onConflict: "snapshot_version,dimension" });
  if (error) throw error;
}

export const ScoreEngine = {
  async score(opts: ScoreOptions = {}): Promise<UadaResponse<ScoreReport>> {
    const facts = await ContextAssembler.assembleArchitecture(opts.snapshotVersion, opts.now);
    const db = await admin();
    const previous = await loadPreviousOverall(db, facts.snapshotVersion);
    const report = computeScoreReport(facts, previous);
    assertScoreReport(report);

    const warnings: Array<{ code: string; message: string }> = [];
    if (facts.nodes.length === 0 || facts.documents.length === 0) {
      warnings.push({
        code: "insufficient_evidence",
        message: "snapshot has no indexed graph nodes or documents",
      });
    }

    // Evidence = the dimension records themselves, bound to this snapshot.
    const evidence: Evidence[] = [];
    for (const d of report.dimensions) {
      const snippet = d.evidence.join("; ");
      const path = `uada://score/${facts.snapshotVersion}/${d.name}`;
      const score = Math.round((d.score / 100) * 100) / 100;
      evidence.push({
        source: "code",
        path,
        snippet,
        score,
        snapshotVersion: facts.snapshotVersion,
        evidenceHash: await computeEvidenceHash({
          path,
          score,
          snapshotVersion: facts.snapshotVersion,
          snippet,
        }),
      });
    }

    if (opts.persist !== false && warnings.length === 0) {
      await persistReport(db, facts.snapshotVersion, report);
    }

    return {
      data: report,
      // Fully deterministic computation; only evidence scarcity lowers trust.
      confidence: warnings.length === 0 ? 1 : 0,
      snapshotVersion: facts.snapshotVersion,
      filesUsed: [],
      model: "deterministic",
      evidence,
      warnings: warnings.length ? warnings : undefined,
    };
  },
};
