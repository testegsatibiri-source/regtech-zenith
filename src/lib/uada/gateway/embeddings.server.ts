// H13 — Embedding batch calls to the Lovable AI Gateway.
// Server-only. Uses raw fetch (embeddings endpoint is not wrapped by AI SDK).

export const DEFAULT_EMBEDDING_MODEL = "google/gemini-embedding-001";
export const DEFAULT_EMBEDDING_DIMENSIONS = 3072;
export const MAX_BATCH_GEMINI = 100;
export const MAX_BATCH_OPENAI = 64;

export interface EmbedResult {
  vectors: number[][];
  tokens: number;
}

export async function embedBatch(
  inputs: string[],
  model = DEFAULT_EMBEDDING_MODEL,
): Promise<EmbedResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
  if (inputs.length === 0) return { vectors: [], tokens: 0 };

  const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-Consumer": "uada",
    },
    body: JSON.stringify({ model, input: inputs }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Embeddings ${response.status}: ${text.slice(0, 200)}`);
  }

  const body = (await response.json()) as {
    data: { index: number; embedding: number[] }[];
    usage?: { prompt_tokens?: number; total_tokens?: number };
  };

  const vectors = body.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);

  return { vectors, tokens: body.usage?.total_tokens ?? body.usage?.prompt_tokens ?? 0 };
}

export function batchSizeFor(model: string): number {
  return model.startsWith("google/") ? MAX_BATCH_GEMINI : MAX_BATCH_OPENAI;
}
