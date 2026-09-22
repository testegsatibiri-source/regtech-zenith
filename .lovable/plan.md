# Plano — Resposta ao Questionário de Auditoria PH (18 itens)

O questionário confirma o diagnóstico já conhecido. Este plano converte cada item ❌/⚠️/❓ em ação concreta, separando o que fechamos em código agora do que depende de terceiros.

## Etapa A — Fechar a Etapa 1 pendente (itens 1, 2, 18)

Os valores já estão corrigidos no código (v1.7.0 / PH-2025.1), mas o pack ainda não está re-assinado.

1. Rodar `scripts/sign-ph.ts` com o manifesto v1.7.0 / PH-2025.1 (gera keypairs Ed25519 novos e imprime o SQL).
2. Atualizar `src/packs/philippines/signature.ts` com a nova assinatura dual.
3. Criar migração com o SQL impresso (INSERT em `pack_signing_keys`, desativando as chaves antigas).
4. Diff aditivo em `tech-debt.md` fechando DEBT-030/031 e em `roadmap.md` marcando a Etapa 1.
5. Verificação: `bunx tsgo --noEmit` + `bunx vitest run` + `scripts/verify-bundle-packs.mjs` contra a build real.

Resultado: itens 1 e 2 passam de ⚠️ para ✅ "reivindicado" e o item 18 ganha data (esta sessão). Publicação continua só mediante ordem explícita.

## Etapa B — RA 10173 / proteção de dados (item 8)

Hoje não existe documentação de conformidade. Sem mudança de código:

1. Criar `docs/governance/legal-opinions/PH-data-protection-ra10173.md` documentando o que já existe por arquitetura: RLS deny-all em `pilot_requests`, IP armazenado só como hash SHA-256, sem PII em notificações, retenção de 24 meses, controle de acesso por papel via tabela de roles.
2. Listar como lacunas (com ticket nomeado) o que não está coberto: registro de tratamento de dados bancários, DPO nomeado, procedimento de breach notification (NPC exige 72h).
3. Item 8 passa de ❓ para ⚠️ documentado — veredito final exige revisão externa (mesma janela do parecer B2b).

## Etapa C — UI operacional (itens 14, 15)

Espelhando o que já existe para a Indonésia, sem tocar em Core/SDK/Runtime:

1. Formulário de funcionário PH: campos TIN, SSS, PhilHealth, Pag-IBIG (hoje o rascunho inicia com campos indonésios). Inclui validação de formato de cada identificador.
2. `PhSeparationPanel` na tela de separations, espelhando `IdSeparationPanel` (Arts. 297-299, twin notice, COE 3 dias, final pay 30 dias).
3. Download dos 5 filings (BIR 1601-C, Alphalist DAT, SSS R-3, PhilHealth RF-1, Pag-IBIG MCRF) pela UI, com SHA-256 visível ao lado de cada arquivo.
4. Testes de rota/UI nos mesmos moldes dos existentes.

Resultado: itens 14 e 15 passam de ❌ para ✅ "reivindicado".

## Etapa D — Bloqueios externos (itens 4, 5, 11 — B2b, B1)

Não são fecháveis por código; este plano apenas os formaliza:

1. **B2b (item 4):** contratar advogado filipino com nº IBP para revisar as 5 tabelas estatutárias + lógica de cálculo. O parecer entra em `docs/governance/legal-opinions/` com sign-off duplo. Aproveitar a mesma contratação para revisar o documento da Etapa B (RA 10173).
2. **B1 (itens 5, 11):** só se fecha com piloto real — ciclo completo folha → filings → upload real nos 4 portais, registrando aceite/rejeição de cada layout (cada rejeição vira ticket com dono). Captação do piloto via landing /ph já publicada.

## Etapa E — Decisões contratuais (itens 16, 17)

Não é trabalho de código; precisa de decisão sua, que registro no plano:

- Quem responde por multa causada por parâmetro desatualizado (recomendação: cláusula de responsabilidade limitada no contrato do piloto + SLA de atualização de tabelas).
- Indenização/garantia antes da comercialização plena (recomendação: piloto explicitamente "sem garantia de precisão, valores validados pelo contador do cliente" até o flip de commercialReady).

Se quiser, redijo o texto-base dessas cláusulas para revisão do seu jurídico.

## Fora de escopo deste plano (registrado como débito)

- **B4 (itens 3, 12):** salário mínimo das outras 16 regiões. O shape de array em params.ts já está preparado; cobertura regional entra num sprint próprio após o piloto. O piloto opera com funcionários NCR.
- **B6 (item 13):** módulo de jornada/horas extras (T&A). Módulo novo, escopo próprio. O piloto opera sem overtime.

## Verificação

- `bunx tsgo --noEmit` limpo e `bunx vitest run` verde (hoje 276 testes) após cada etapa.
- Etapa A adiciona `scripts/verify-bundle-packs.mjs` contra a build real.
- Conferência visual das novas telas de UI via navegador antes de concluir a Etapa C.

## Detalhes técnicos

- Re-assinatura: `scripts/sign-ph.ts` gera keypairs novos a cada execução; runtime verifica via `DbTrustStore` (src/lib/platform/service/signing.ts); migração anterior de chaves: 20260828001545.
- Pack: `src/packs/philippines/` (params.ts, signature.ts, index.ts v1.7.0).
- Ordem: A → B → C (A e B paralelas), D e E correm fora do código.
- `commercialReady` permanece false até B1 + B2b fecharem; landing /ph e catálogo refletem o status automaticamente pelo runtime.
- Nada é publicado sem ordem explícita.
