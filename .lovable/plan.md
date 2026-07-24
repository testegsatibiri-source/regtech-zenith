
# UADA — Sprint H12.5 (Foundation) — plano final

Aprovadas as 3 sugestões. H12.5 continua **contratos, tipos e interfaces — nenhuma IA, nenhum embedding, nenhuma indexação**. Só a fundação.

## Ajustes finais incorporados

| # | Ajuste | Onde entra |
|---|--------|------------|
| 1 | Separar **Knowledge Store** (docs/snapshots/embeddings) de **Graph Store** (nós/arestas/traversal) — mesmo Postgres, componentes distintos | `contracts/knowledge/*` e `contracts/graph/*` isolados; interfaces `KnowledgeStore` e `GraphStore` independentes |
| 2 | Acrescentar **ToolRegistry** ao lado do **CapabilityRegistry** — capability = *o que*, tool = *como* | `capabilities/CapabilityRegistry.ts` + `tools/ToolRegistry.ts` |
| 3 | **Política explícita de snapshots** — ativo, arquivados, retenção, rebuild | `contracts/snapshot/policy.ts` + ADR-0026 |

## Estrutura de pastas

```
src/lib/uada/
  contracts/
    knowledge/         # Document, Snapshot, EmbeddingRef (SEM implementação)
    graph/             # GraphNode, GraphEdge, ImpactLevel, TraversalQuery
    snapshot/          # SnapshotState, RetentionPolicy, RebuildPlan
    response/          # UadaResponse<T>, Evidence, Warning
    plugin/            # UadaPlugin
    rules/             # RuleDefinition (Rule Engine, YAML shape)
    roadmap/           # RoadmapItem (done|planned|blocked)
  capabilities/        # CapabilityRegistry (o que existe)
  tools/               # ToolRegistry (como executa)  ← novo
  engines/             # interfaces puras: SearchEngine, PlanEngine, ReviewEngine, AuditEngine, DocsEngine, ScoreEngine, ImpactEngine
  model/               # ModelRouter (mapa task→model, sem chamada)
  gateway/             # createLovableAiGatewayProvider server-only (não usado ainda)
  prompts/             # base system prompt (regra "Nunca inventar")
  stores/              # interfaces KnowledgeStore, GraphStore (contratos, sem impl)
  __tests__/           # testes de contrato + registries
docs/adr/
  ADR-0020-uada-architecture.md
  ADR-0025-response-envelope-anti-hallucination.md
  ADR-0026-snapshot-lifecycle.md
```

## Contratos-chave

### 1. Envelope de resposta (obrigatório para toda engine)
```ts
interface UadaResponse<T> {
  data: T;
  confidence: number;          // 0..1
  snapshotVersion: number;
  filesUsed: string[];
  model: string;
  evidence: Evidence[];
  warnings?: Warning[];
}
```

### 2. Knowledge Store (isolado do grafo)
```ts
interface KnowledgeStore {
  getActiveSnapshot(): Promise<Snapshot>;
  listDocuments(q: DocQuery): Promise<Document[]>;
  semanticSearch(q: SearchQuery): Promise<SearchHit[]>;
}
```

### 3. Graph Store (isolado do knowledge)
```ts
type ImpactLevel = "low" | "medium" | "high" | "critical";
interface GraphStore {
  neighbors(nodeId: string, edge?: EdgeKind): Promise<GraphNode[]>;
  impactOf(nodeId: string, depth?: number): Promise<ImpactReport>;
  dependenciesOf(nodeId: string): Promise<GraphNode[]>;
}
```

### 4. CapabilityRegistry (o que) + ToolRegistry (como)
```ts
CapabilityRegistry.register({ id: "impact", version: "1.0.0", inputSchema, outputSchema });
ToolRegistry.bind("impact", { implementation: "GraphTraversalService", handler: symbolRef });
// Orchestrator (H19): capabilities.list() → tools.resolve(capId)
```
As 11 capabilities catalogadas: `search`, `plan`, `review`, `audit`, `impact`, `dependencies`, `docs`, `context`, `graph`, `score`, `capabilities`. Todas registradas sem handler ligado ainda.

### 5. Snapshot lifecycle (política explícita)
```ts
type SnapshotState = "building" | "active" | "archived" | "deprecated";
interface RetentionPolicy {
  keepActive: 1;
  keepArchived: number;       // default 10
  archiveAfterDays: number;   // default 30
  purgeAfterDays: number;     // default 180
}
interface RebuildPlan {
  reason: "model_change" | "schema_change" | "manual" | "corruption";
  targets: ("knowledge" | "graph")[];
}
```
Regras (ADR-0026):
- Exatamente **1 snapshot ativo** por vez.
- Novo snapshot entra como `building`, promove para `active`, o anterior vira `archived`.
- Retenção: N archived + purge por idade.
- **Rebuild completo** sempre possível a partir do repo + DB schema (indexação é determinística).

### 6. ModelRouter (mapa, sem execução)
`pick(task)` retorna model id + providerOptions. Mapa inicial: `index → gemini-3.1-flash-lite`, `review → gemini-3.6-flash`, `plan → gpt-5.5`, `audit → gemini-3.6-flash`, `docs → gemini-3.1-flash-lite`. Sem chamadas até H13+.

### 7. Regra global "Nunca inventar" (`prompts/base.ts`)
Prompt base injetado em toda engine futura: sem `Evidence` suficiente, o agente responde "não há evidência suficiente" e lista o que faltou. Nunca deduz tabela/coluna/rota/ADR.

## Feature Gates novos (rows em `platform_feature_gates`)
`uada.enabled`, `uada.review_enabled`, `uada.audit_enabled`, `uada.autocommit_docs`, `uada.plugin_system` — **todos `false` nos 3 ambientes**. Só o schema entra; nenhum consumidor ainda.

## AI Gateway helper (server-only)
`src/lib/uada/gateway/aiGateway.server.ts` seguindo `ai-sdk-lovable-gateway` (createLovableAiGatewayProvider + envelope de run-id). Não consumido nesta sprint.

## ADRs a publicar
- **ADR-0020** UADA architecture & boundaries (isolamento total do Core, `uada_*` tables, tabela dupla Knowledge/Graph).
- **ADR-0025** Response envelope + anti-hallucination policy.
- **ADR-0026** Snapshot lifecycle & retention.

## Testes (H12.5 = só contratos)
- `CapabilityRegistry.list()` retorna as 11 capabilities.
- `ToolRegistry.resolve("impact")` retorna `null` (sem handler ligado, mas contrato válido).
- Tipos `UadaResponse` compilam com `evidence` obrigatório.
- `RetentionPolicy` defaults respeitados por helper `applyRetention()` puro.
- Snapshot state machine: transições válidas (`building→active→archived→deprecated`), inválidas rejeitadas.

## O que **não** entra nesta sprint
- Sem migração `uada_*` (fica para H13, quando os stores forem implementados).
- Sem indexação, sem embedding, sem chamada de IA.
- Sem UI `/platform/uada` (H14).
- Sem GitHub App (H15).

## Aceite
- `bun run typecheck` verde.
- Testes de contrato verdes.
- 3 ADRs mergeadas.
- Feature gates seed em migração isolada (única mudança de DB nesta sprint: inserir 5 linhas em `platform_feature_gates`, tudo `false`).
- Zero import de `src/lib/uada/**` fora dele mesmo (guard no lint futuro).

Após aprovado, entrego H12.5 completa e volto com plano detalhado para **H13 — Knowledge Store + Graph Store + Memory**, agora já com os dois stores explicitamente separados.
