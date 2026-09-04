# Roadmap

## H23 Fase D — UU PDP (Lei 27/2022) + criptografia de campo (pack Indonésia)

Plano aprovado: `.lovable/plan/fase-d-uu-pdp-lei-27-2022-e-criptografia-de-campo-no-pacote-2026-09-04.md`

- [x] D1 — Módulo de cifra AES-GCM com key ring + testes (ida/volta, rotação, adulteração); chave derivada por SHA-256 do segredo `ID_PDP_FIELD_KEY`
- [x] D2 — Selagem de NIK/NPWP/conta bancária na gravação; leitura mascarada; revelação auditada (`revealEmployeeField` → `personal_data_access_log`)
- [x] D3 — Migração dos valores existentes (`migrateSensitiveFields`) + relatório de pendências (`getFieldEncryptionStatus`)
- [x] D4 — Tabelas e telas: DPO, incidente 72h, direitos do titular
- [x] D5a — Catálogo de retenção indonésio (`RETENTION_CATALOG_ID`, `seedRetentionPoliciesForCountry`)
- [ ] D5b — Rotina de purga agendada conforme o catálogo de retenção
- [ ] D6 — `docs/governance/legal-opinions/` + atualização do registro de dívidas
- [ ] D7 — (após Fase C) bump de versão, `commercialReady`, reassinatura

Resíduo herdado: **DEBT-026** — conferência visual humana das faixas TER B/C (revisão, não código).

## Acesso por convite + Resend

Plano aprovado: `.lovable/plan/acesso-por-convite-resend-fase-2-auditoria-de-schema-e-plano-2026-09-03.md`

- [ ] Fase 0 — Fechar incidente de teste (conta com token exposto, Site URL, redirects)
- [ ] Fase 1 — Aprovar matriz RBAC + decidir eixo do convite (A plataforma / B organização / C ambos)
- [x] Fase 2 — Auditoria read-only do schema
- [x] Fase 3 — Fechar autocadastro: `handle_new_user` sem `admin`, `disable_signup`, UI sem Sign up
- [x] Fase 4 — Migration do modelo de convite (token_hash, status, idempotência) — Onda A (plataforma)
- [ ] Fase 5 — Resend SMTP no Supabase Auth (staging)
- [ ] Fase 6 — Server function de envio de convite
- [ ] Fase 7 — Rota `/invite/accept` + RPC transacional
- [x] Fase 8 — Recuperação de senha (`/reset-password`)
- [ ] Fase 9 — Sessões e revogação
- [ ] Fase 10 — RLS + revogar grants de `anon`
- [ ] Fase 11 — Reenvio, cooldown e expiração
- [ ] Fase 12 — Auditoria e observabilidade
- [ ] Fase 13 — Testes positivos e negativos
- [ ] Fase 14 — Implantação staging → produção

## Pendências externas (fora do editor)
- Variáveis Supabase no escopo Preview da Vercel + re-run "Release Validation → Staging"
- Verificar subdomínio de e-mail no Resend (SPF/DKIM/DMARC)
- Parecer jurídico UU PDP (advogado licenciado na Indonésia) — pré-condição do gate comercial
