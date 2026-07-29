# H14 — ContextAssembler, InferenceService, Search, Impact & Planner (v2)

Sugestões aprovadas integralmente. As duas mudanças estruturais (ContextAssembler como único ponto de expansão de grafo + InferenceService entre engines e ModelRouter) são incorporadas ao core do plano. Os demais 7 ajustes viram contrato explícito.

## Arquitetura consolidada

```text
                UI  /  Server Functions
                        │
                        ▼
              ┌───────────────────┐
              │ ContextAssembler  │  única porta p/ contexto
              │  (determinístico) │  faz search + graph expansion
              └─────────┬─────────┘
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
 KnowledgeStore    GraphStore       MemoryStore
        └───────────────┼────────────────┘
                        ▼
                  ContextBundle
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
      Search          Impact           Planner
                                         │
                                         ▼
                               ┌───────────────────┐
                               │ InferenceService  │  única porta p/ IA
                               │  (orçamento,      │
                               │   retry, métricas)│
                               └─────────┬─────────┘
                                         ▼
                                   ModelRouter
                                         ▼
                              Lovable AI Gateway
```

Princípios (ADR-0029):
- **Context Assembly Principle** — nenhuma engine acessa `KnowledgeStore`, `GraphStore`, `SnapshotManager` ou embeddings diretamente. Tudo passa por `ContextAssembler`.
- **Inference Principle** — nenhuma engine chama `ModelRouter`/AI Gateway diretamente. Tudo passa por `InferenceService`.

## Contratos novos

### ContextAssembler

```ts
interface ContextRequest {
  objective: string;
  snapshotVersion?: number;   // default: active
  maxDocuments: number;       // hard cap
  maxTokens: number;          // budget
  expansionDepth: number;     // 0 = sem expansão de grafo
  includeDocs: boolean;
  includeGraph: boolean;
  includeMemory: boolean;
  embeddingModel?: string;    // default: DEFAULT_EMBEDDING_MODEL
}

interface ContextBundle {
  snapshotVersion: number;
  documents: DocumentRef[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  memory: MemoryEntry[];
  evidence: Evidence[];       // já com hash + snapshotVersion
  metrics: ContextMetrics;
}

interface ContextMetrics {
  documents: number;
  nodes: number;
  edges: number;
  tokens: number;
  assemblyMs: number;
  expansionMs: number;
  embeddingMs: number;
}
```

Determinismo: mesmo `ContextRequest` + mesmo `snapshotVersion` → mesmo `ContextBundle` (ordenação estável por `(score desc, path asc)`).

### SearchEngine

```ts
interface SearchOptions {
  snapshotVersion?: number;
  k: number;
  minimumScore: number;
  expansionDepth: number;     // repassado ao ContextAssembler
  reranker?: "none" | "graph-proximity";
  embeddingModel?: string;
}
```

Search **não** chama GraphStore. Apenas configura `ContextRequest` e o Assembler decide expansão.

### ImpactEngine

```ts
type ImpactLevel = "direct" | "indirect" | "transitive";
type EdgeSource = "ast" | "sql" | "docs" | "manifest" | "inferred";

interface EdgeConfidence {
  kind: string;
  source: EdgeSource;
  confidence: number;   // 0..1 — AST=1.0, docs=0.6, inferred=0.4
}

interface ImpactNode {
  node: GraphNode;
  level: ImpactLevel;
  confidence: number;   // agregado das arestas do caminho
  paths: EdgePath[];
}
```

### Planner + Plan artefato

```ts
interface Plan {
  objective: string;
  summary: string;
  steps: PlanStep[];
  risks: Risk[];
  assumptions: string[];
  blockedBy: string[];
  affectedFiles: string[];
  estimatedImpact: ImpactLevel;
  evidence: Evidence[];
}
```

Reutilizável no H15 (Review) sem retrabalho.

### InferenceService

```ts
interface InferenceService {
  infer<T>(req: InferRequest<T>): Promise<UadaResponse<T>>;
  summarize(text: string, opts?: SummarizeOpts): Promise<UadaResponse<string>>;
  plan(bundle: ContextBundle, objective: string): Promise<UadaResponse<Plan>>;
  review(bundle: ContextBundle, diff: string): Promise<UadaResponse<ReviewFindings>>; // stub, uso em H15
}
```

Responsabilidades: escolha do modelo via `ModelRouter`, orçamento de tokens, retry/backoff, redaction, métricas por chamada, `assertEvidenceComplete` antes do return.

### Benchmark por snapshot

`uada_benchmark_results` já existe. Adicionar índice `(benchmark_id, snapshot_id)` e view `uada_benchmark_regression` comparando snapshot N vs. N−1 por fixture. Runner grava sempre com `snapshotVersion`.

## Componentes técnicos

- `src/lib/uada/context/ContextAssembler.server.ts`
- `src/lib/uada/inference/InferenceService.server.ts`
- `src/lib/uada/engines/search.server.ts`
- `src/lib/uada/engines/impact.server.ts`
- `src/lib/uada/engines/plan.server.ts`
- `src/lib/uada/benchmark/runner.server.ts`
- `src/lib/uada/uada.functions.ts` — server fns: `search`, `impactOf`, `plan`, `runBenchmark`
- `src/routes/platform/uada.tsx` — abas **Search**, **Impact**, **Plan**, **Benchmarks**
- Migração: índice + view de regressão de benchmark; coluna `confidence numeric` e `source text` em `uada_graph_edges` (default 1.0/'ast' para backward compat)
- ADR-0029 — Context Assembly & Inference Principles

## Segurança & gates

- Feature gate existente `uada.enabled` continua obrigatório.
- Novo gate `uada.planning` (default OFF em prod, ON em dev/staging).
- Read-only sobre snapshot ativo; zero acesso a tabelas de clientes.
- RBAC via `is_uada_reader` em toda server fn (`requireSupabaseAuth` + capability check).

## Aceitação

- ContextAssembler determinístico: 3 execuções da mesma request → hash idêntico do bundle.
- Search: ≥95% do fixture com ≥1 evidência `score ≥ minimumScore`.
- Impact: nível `direct` correto em 100% dos casos fixados; `confidence` populada em toda aresta.
- Planner: sem evidências → `confidence=0` + warning `insufficient_evidence`; nunca gera `steps` sem `evidence[]`.
- InferenceService: única origem de chamadas ao gateway (grep confirma zero import de `aiGateway.server` fora dele).
- Benchmark runner detecta regressão vs. snapshot anterior quando score cai > 0.05.
- `tsgo --noEmit` 0 erros; suite `h14.test.ts` verde.

## Entregáveis

- Código + migração acima
- Testes `src/lib/uada/__tests__/h14.test.ts` (determinismo, evidência, isolamento de engines)
- ADR-0029 com os dois princípios explícitos
- UI operacional com 4 abas novas em `/platform/uada`
