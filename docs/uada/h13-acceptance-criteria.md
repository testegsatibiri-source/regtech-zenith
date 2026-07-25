# H13 — Knowledge Store, Graph Store & Indexers — Acceptance Criteria

Status: **Frozen** for Sprint H13.

These criteria must be met before H13 is considered complete. The checklist is
a living document during implementation and becomes read-only after merge.

## Performance

- [ ] Reindex completo em ≤ **5 minutos** para o repositório de referência.
- [ ] SLO: ≥95% das execuções abaixo de 5 minutos.
- [ ] Métrica: o tempo de reindexação é medido desde a criação do `IndexRun`
      até a promoção atômica do snapshot para `active`. Latência de filas ou
      indisponibilidade temporária do provedor de IA não compõem o SLO e devem
      ser registradas separadamente como métricas operacionais.
- [ ] O valor poderá ser revisado quando o tamanho do repositório crescer
      significativamente (por exemplo, duplicar de tamanho), mediante nova ADR
      ou atualização da política de desempenho.

## Coverage & Quality

- [ ] Cobertura 100%: tabelas, colunas, RPCs, políticas RLS, índices,
      migrations, ADRs, rotas, server functions, packs.
- [ ] Knowledge Graph sem nós órfãos (todo nó tem ≥1 aresta ou é raiz
      declarada).
- [ ] Busca semântica retorna top-K correto em suíte fixture (precision@5 ≥ 0.8
      em queries de referência).
- [ ] Reindex incremental toca apenas arquivos alterados (verificado por log de
      `uada_index_runs`).

## Security & Compliance

- [ ] **Zero PII indexada**: allowlist de schemas/tabelas; denylist explícita
      (`payroll_items`, `employees`, `employment_contracts`, `auth.*`,
      `storage.*`). Teste de contrato garante bloqueio.
- [ ] Todas as tabelas `uada_*` com RLS + GRANT explícito + feature gate
      `uada.enabled` desligado por padrão.

## Rollback

- [ ] Toda promoção de snapshot deve ser atômica.
- [ ] O snapshot anterior permanece íntegro até a promoção do novo.
- [ ] Rollback não executa reindexação.
- [ ] Rollback consiste apenas na troca do snapshot ativo.
- [ ] Tempo máximo de rollback: < 1 minuto.
- [ ] Nenhuma consulta fica indisponível durante promoção ou rollback.

## Determinism

- [ ] **Determinismo da indexação**: duas reindexações consecutivas, sem
      alterações no repositório, devem produzir o mesmo grafo, os mesmos hashes
      e a mesma cobertura (desconsiderando timestamps e IDs técnicos).

## Build & Tests

- [ ] `bun run typecheck` verde.
- [ ] `bun test` verde.

## Escopo travado da H13

Fora deste escopo (H14+):

- Planning, review, audit, docs generation, orchestrator, multi-agent system,
  plugin runtime.

Dentro deste escopo:

- Knowledge Store (implementação Postgres do contrato H12.5).
- Graph Store (implementação Postgres do contrato H12.5).
- Indexadores: `db.ts` (schema), `code.ts` (AST leve), `docs.ts` (ADRs/MD).
- Graph Builder.
- Memory Engine (contratos + tabela `uada_memory`).
- Embeddings via Lovable AI Gateway.
- `reindex()` server function (full + incremental).
- UI mínima em `/platform/uada` (status snapshot + botão reindex, protegida por
  feature gate).
