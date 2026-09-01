// H14 — SearchEngine. Does NOT touch stores directly. Delegates to ContextAssembler.
import type { UadaResponse } from "@/lib/uada/contracts/response";
import type { ContextBundle } from "@/lib/uada/contracts/context";
import { assertEvidenceComplete } from "@/lib/uada/contracts/response/hash";
import { ContextAssembler } from "@/lib/uada/context/ContextAssembler.server";

export interface SearchOptions {
  query: string;
  snapshotVersion?: number;
  k: number;
  minimumScore: number;
  expansionDepth: number;
  reranker?: "none" | "graph-proximity";
  embeddingModel?: string;
}

export interface SearchHitV2 {
  documentId: string;
  path: string;
  kind: string;
  summary: string;
  score: number;
}

export const SearchEngine = {
  async search(opts: SearchOptions): Promise<UadaResponse<SearchHitV2[]>> {
    const bundle: ContextBundle = await ContextAssembler.assemble({
      objective: opts.query,
      snapshotVersion: opts.snapshotVersion,
      maxDocuments: opts.k,
      maxTokens: 8000,
      expansionDepth: opts.expansionDepth,
      includeDocs: true,
      includeGraph: opts.expansionDepth > 0,
      includeMemory: false,
      embeddingModel: opts.embeddingModel,
      minimumScore: opts.minimumScore,
    });

    let hits: SearchHitV2[] = bundle.documents.map((d) => ({
      documentId: d.id,
      path: d.path,
      kind: d.kind,
      summary: d.summary,
      score: d.score,
    }));

    if (opts.reranker === "graph-proximity" && bundle.nodes.length > 0) {
      // Boost documents whose path also appears as a graph node (indicates
      // stronger signal — the code parser recognised the file as structured).
      const nodePaths = new Set(bundle.nodes.map((n) => n.path).filter(Boolean));
      hits = hits
        .map((h) => ({
          ...h,
          score: nodePaths.has(h.path) ? Math.min(1, h.score + 0.05) : h.score,
        }))
        .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
    }

    const resp: UadaResponse<SearchHitV2[]> = {
      data: hits,
      confidence: hits.length > 0 ? Math.min(1, (hits[0]?.score ?? 0) + 0.1) : 0,
      snapshotVersion: bundle.snapshotVersion,
      filesUsed: hits.map((h) => h.path),
      model: "search",
      evidence: bundle.evidence,
    };
    await assertEvidenceComplete(resp, { minEvidence: 0 });
    return resp;
  },
};
