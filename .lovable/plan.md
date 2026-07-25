
# H12.5 Close-out — ADR-0027, ADR-0028 e Freeze dos Critérios de Aceite da H13

Sprint bridge sem código de runtime, sem migração, sem IA. Só governança escrita para travar decisões antes da H13 começar.

## Escopo

Três documentos novos, nada mais.

### 1. `docs/adr/ADR-0027-embedding-storage-and-index-strategy.md`
Formaliza como o Knowledge Store lida com embeddings ao longo do tempo.

Conteúdo:
- **Coexistência multi-dimensão**: `uada_embeddings` guardará `embedding_model` (text) + `embedding_dimensions` (int) + `embedding` (vector). Uma tabela, várias dimensões — índice HNSW por par (model, dimensions), não global.
- **Estratégia de índice**: HNSW por padrão (`m=16`, `ef_construction=64`), `vector_cosine_ops`. IVFFlat só se HNSW indisponível.
- **Troca de modelo**: novo modelo ⇒ novo snapshot `building` que reindexa do zero com o novo par (model, dims); snapshot antigo continua `active` até o novo promover. Nunca misturar dimensões dentro do mesmo snapshot.
- **Migração de dimensão**: proibido `ALTER` destrutivo. Sempre via novo snapshot + retention da ADR-0026.
- **Consequências**: custo de armazenamento durante rebuild; ganho de reversibilidade.

### 2. `docs/adr/ADR-0028-knowledge-freshness-policy.md`
Define quando e como a base é atualizada.

Conteúdo:
- **Gatilhos de novo snapshot**: mudança de modelo de embedding, mudança de schema Postgres (detectada por hash de `information_schema`), rebuild manual, corrupção detectada. Alinha com `RebuildPlan.reason` já definido em `contracts/snapshot/policy.ts`.
- **Reindex incremental vs completo**:
  - Incremental: arquivos com mtime/hash alterado desde `last_indexed_at` do snapshot ativo, sem tocar em outros documentos.
  - Completo: obrigatório para os 4 gatilhos acima; nunca incremental cruzando snapshots.
- **Critérios para promover `building → active`**: readiness report OK, cobertura mínima (100% de tabelas/RPCs/RLS/migrations/rotas conhecidas), zero PII detectada, testes de smoke de busca semântica passando.
- **Retenção**: reafirma `DEFAULT_RETENTION` da ADR-0026 (1 ativo, 10 arquivados, 30d/180d). Sem duplicar valores — referencia.
- **SLA de frescor**: incremental disparado on-demand na H13; agendamento fica para H14+.

### 3. `docs/uada/h13-acceptance-criteria.md`
Freeze dos critérios de aceite antes de abrir a H13. Documento vivo até H13 mergear, depois só leitura.

Conteúdo (checklist):
- [ ] Reindex completo em ≤ **5 minutos** para o repositório de referência.
- [ ] SLO: ≥95% das execuções abaixo de 5 minutos.
- [ ] Métrica: o tempo de reindexação é medido desde a criação do `IndexRun` até a promoção atômica do snapshot para `active`. Latência de filas ou indisponibilidade temporária do provedor de IA não compõem o SLO e devem ser registradas separadamente como métricas operacionais.
- [ ] O valor poderá ser revisado quando o tamanho do repositório crescer significativamente (por exemplo, duplicar de tamanho), mediante nova ADR ou atualização da política de desempenho.
- [ ] Cobertura 100%: tabelas, colunas, RPCs, políticas RLS, índices, migrations, ADRs, rotas, server functions, packs.
- [ ] Knowledge Graph sem nós órfãos (todo nó tem ≥1 aresta ou é raiz declarada).
- [ ] Busca semântica retorna top-K correto em suíte fixture (precision@5 ≥ 0.8 em queries de referência).
- [ ] Reindex incremental toca apenas arquivos alterados (verificado por log de `uada_index_runs`).
- [ ] **Zero PII indexada**: allowlist de schemas/tabelas; denylist explícita (`payroll_items`, `employees`, `employment_contracts`, `auth.*`, `storage.*`). Teste de contrato garante bloqueio.
- [ ] Todas as tabelas `uada_*` com RLS + GRANT explícito + feature gate `uada.enabled` desligado por padrão.
- [ ] **Rollback**:
  - Toda promoção de snapshot deve ser atômica.
  - O snapshot anterior permanece íntegro até a promoção do novo.
  - Rollback não executa reindexação.
  - Rollback consiste apenas na troca do snapshot ativo.
  - Tempo máximo de rollback: < 1 minuto.
  - Nenhuma consulta fica indisponível durante promoção ou rollback.
- [ ] **Determinismo da indexação**: duas reindexações consecutivas, sem alterações no repositório, devem produzir o mesmo grafo, os mesmos hashes e a mesma cobertura (desconsiderando timestamps e IDs técnicos).
- [ ] `bun run typecheck` + `bun test` verdes.

**Escopo travado da H13** (fora dela: planning, review, audit, docs, orchestrator):
- Knowledge Store (impl Postgres do contrato H12.5)
- Graph Store (impl Postgres do contrato H12.5)
- Indexadores: `db.ts` (schema), `code.ts` (AST leve), `docs.ts` (ADRs/MD)
- Graph Builder
- Memory Engine (contratos + tabela `uada_memory`)
- Embeddings via Lovable AI Gateway
- `reindex()` server function (full + incremental)
- UI mínima em `/platform/uada` (status snapshot + botão reindex, protegida por gate)

## Fora de escopo desta sprint bridge
- Nenhuma migração SQL. As tabelas `uada_*` entram junto com o código da H13.
- Nenhuma alteração em `src/lib/uada/**`.
- Nenhum feature gate novo.

## Aceite da bridge
- 2 ADRs mergeadas.
- 1 documento de critérios revisado e assinado pelo usuário.
- H13 pode abrir com escopo, gatilhos e critérios já congelados.
