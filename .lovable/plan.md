# Etapa 0 — Destravar o CI antes de tocar em staging

Diagnóstico feito agora, rodando localmente exatamente os mesmos comandos do CI:

| Gate do CI | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `bunx tsgo --noEmit` | verde, zero erros |
| Testes | `bun test` | verde, 217 passam / 0 falham |
| Build | `bun run build` | verde |
| **Lint** | `bunx eslint .` | **vermelho — 4225 erros, 11 avisos** |

Ou seja: o vermelho do CI vem de um único gate, o lint. Todos os workflows que rodam `bunx eslint .` (`ci-feature`, e por consequência qualquer PR para `develop`) falham; os demais gates já estão saudáveis. Nenhum erro é de lógica ou de compilação.

## Composição real dos 4225 erros

- **4219 são de formatação** (`prettier/prettier`) — indentação, quebras de linha, vírgulas finais. Auto-corrigíveis, zero impacto em comportamento.
- **6 são erros reais de regra**:
  - `scripts/sign-ph.ts` (linhas 5, 10, 37) — três `any` explícitos.
  - `src/packs/__tests__/signature-tamper.test.ts` (28, 32) — dois `any` explícitos.
  - `src/integrations/supabase/previewAuthStorage.ts:38` — `prefer-const`.
- **11 avisos** (não quebram o CI): `react-refresh/only-export-components` em componentes shadcn e dois `react-hooks/exhaustive-deps` (`companyContext.tsx`, `calendar.tsx`).

## O que farei

1. **Formatação em massa** — `bunx eslint . --fix` (equivalente a `prettier --write`) sobre todo o repositório. Mudança puramente cosmética; typecheck, testes e build são re-executados depois para provar que nada mudou de comportamento.
2. **Os cinco `any`** — tipar corretamente em `scripts/sign-ph.ts` e no teste de adulteração. `scripts/sign-ph.ts` é script de build, não entra no bundle; o teste é o de tamper reaproveitado do H20, então rodo a suíte de packs para confirmar que continua detectando adulteração.
3. **`prefer-const`** — `previewAuthStorage.ts` é arquivo auto-gerado da integração e **não deve ser editado**. Em vez de alterá-lo, adiciono `src/integrations/supabase/previewAuthStorage.ts` ao ignore do ESLint (junto com os demais gerados), que é o tratamento correto para código que não é nosso.
4. **Avisos** — deixo como estão nesta etapa. Os `react-refresh` vêm dos componentes shadcn padrão e não são acionáveis; os dois `exhaustive-deps` viram registro em `docs/tech-debt.md` para tratamento posterior, sem mexer em comportamento de tela agora.
5. **Blindagem do gate** — adicionar um step de `prettier --check` (ou manter o lint como está) e registrar em `docs/governance/contribution-guide.md` que `bunx eslint .` precisa passar antes de qualquer push, para o problema não voltar por acúmulo.

## Verificação de saída

Só considero a Etapa 0 concluída com os quatro gates verdes na mesma execução:

```text
bunx tsgo --noEmit   -> 0 erros
bunx eslint .        -> 0 erros
bun test             -> 217 pass / 0 fail
bun run build        -> sucesso
```

Depois disso seguimos a sequência já aprovada (build Vercel → `.env.example` → Supabase staging → migrations → chaves públicas dos packs → CI staging → clone independente → AI provider → Google OAuth → produção), com as regras de governança acordadas: default de build é Lovable/Cloudflare, migrations forward-only, `lyjxnceaoaivnantwmni` só como staging, chaves privadas fora do Git e do banco, nenhuma chave de IA no frontend.

## Observação

O volume de erros de formatação indica que o lint nunca rodou em massa sobre este repositório — é dívida acumulada, não regressão recente. Por isso a correção é grande em número de linhas e pequena em risco. Vou entregá-la separada de qualquer mudança funcional, para que o diff continue auditável.
