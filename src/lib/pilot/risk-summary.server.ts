import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

const SYSTEM = `You are a compliance analyst assisting UBoardAsia platform operators triaging applications to a Homologation Pilot Program for payroll & compliance Country Packs (Indonesia, Philippines).
Context: both packs are VALIDATED/PILOT, commercialReady=false. Philippines pilot scope is NCR only, without an overtime engine; filings are assisted generation with manual employer upload; no external legal opinion yet.
Given the case data and operator notes, respond in Portuguese (Brazil) in Markdown with exactly these sections:
## Resumo do caso (3-5 frases)
## Riscos de compliance (bullets, each tagged [ALTO]/[MÉDIO]/[BAIXO], citing the fact that triggers it)
## Perguntas a esclarecer (bullets)
## Recomendação (one of: aprovar, qualificar, rejeitar — with one-sentence justification; the human operator decides)
Be factual; never invent data not provided. Keep under 350 words.`;

export async function summarizePilotCase(caseText: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI service is not configured.");
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  let failure: unknown;
  const result = streamText({
    model: provider.responses(MODEL),
    system: SYSTEM,
    prompt: caseText,
    onError: ({ error }) => {
      failure = error;
    },
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = await result.text;
  if (!text.trim()) {
    const status = (failure as { statusCode?: number } | undefined)?.statusCode;
    if (status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
    if (status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos em Settings → Plans & credits.");
    if (status === 403) throw new Error("Acesso à IA bloqueado para este workspace.");
    throw new Error("A IA não retornou uma análise. Tente novamente.");
  }
  return text;
}
