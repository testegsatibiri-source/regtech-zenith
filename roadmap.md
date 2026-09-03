# Roadmap — Acesso por convite + Resend

Plano aprovado: `.lovable/plan/acesso-por-convite-resend-fase-2-auditoria-de-schema-e-plano-2026-09-03.md`

- [ ] Fase 0 — Fechar incidente de teste (conta com token exposto, Site URL, redirects)
- [ ] Fase 1 — Aprovar matriz RBAC + decidir eixo do convite (A plataforma / B organização / C ambos)
- [x] Fase 2 — Auditoria read-only do schema
- [x] Fase 3 — Fechar autocadastro: `handle_new_user` sem `admin`, `disable_signup`, UI sem Sign up
- [ ] Fase 4 — Migration do modelo de convite (token_hash, status, idempotência)
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
