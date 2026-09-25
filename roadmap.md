# Roadmap — Homologação PH (auditoria 18 itens)

- [ ] Etapa A: re-assinatura v1.7.0 / PH-2025.1 (sign-ph.ts → signature.ts + migração pack_signing_keys)
- [ ] Etapa A: fechar DEBT-030/031 em tech-debt.md (diff aditivo)
- [ ] Etapa B: doc PH-data-protection-ra10173.md (lacunas com ticket nomeado)
- [x] Etapa C: formulário de funcionário com campos PH (TIN/SSS/PhilHealth/Pag-IBIG) — rascunho segue o pack ativo
- [x] Etapa C: PhSeparationPanel na UI de separations (arts. 297-299, twin notice, COE 3 dias, final pay 30 dias)
- [x] Etapa C: download dos 5 filings pela UI com checksum SHA-256 completo visível
- [x] Etapa C: elegibilidade NCR/overtime no formulário de piloto /ph (consentimento ph-pilot-2026-09-23, novas colunas em pilot_requests)
- [x] Verificação: tsgo + vitest (276) + build real

- [BLOQUEADO externo] Etapa D: parecer advogado filipino (B2b)
- [BLOQUEADO externo] Etapa D: piloto em portal real (B1) — depende de publicação /ph após A+C, só com ordem explícita
- [BLOQUEADO] Etapa E: decisões contratuais (responsabilidade/indenização) — decisão do usuário
- [BLOQUEADO] Gate: commercialReady flip (depende de B1+B2b)
