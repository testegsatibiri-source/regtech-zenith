# Evidence Register + Gates H20–H24, depois publicação

Objetivo: o status comercial do pack Filipinas passa a ser **calculado** a partir das evidências, e não declarado à mão. Em seguida o site é publicado (incluindo /ph), com o PH exibido como VALIDATED / PILOT.

## Etapa 1 — Evidence Register no projeto
- Registro legível: `docs/governance/evidence-register/PH-evidence-register-v1.0.md` (EV-PH-* e GAP-PH-*, com status, camadas, responsável e data de expiração).
- Registro que o código lê: `src/lib/assurance/registers/ph.ts`, com os mesmos IDs. Um teste garante que os dois documentos batem.
- Evidências: SSS-001, BIR-001, WAGE-NCR-001, SEPARATION-001, FILING-001, SECURITY-001, PRIVACY-001. Gaps: LEGAL-001, FILING-001, WAGE-REGIONAL-001, OVERTIME-001, DPA-DPO-001, OPS-SLA-001.
- Regra de não inferência: uma camada superior (REGULATORY, PRODUCTION) nunca é considerada atendida só porque uma inferior (IMPLEMENTATION, TEST) foi.

## Etapa 2 — Motor de avaliação e Gates
- Motor puro e determinístico em `src/lib/assurance/engine.ts`. Não acessa rede nem banco, e a data da avaliação entra como parâmetro.
- Gates:
  - H20 payrollCorrectness
  - H21 regulatoryOperations
  - H22 laborCoverage
  - H23 privacySecurity
  - H24 enterpriseOperations
- Cada gate retorna `{gate, status PASS|CONDITIONAL|FAIL, version, evaluatedAt, evidenceRefs, blockingGaps}`.
- Evidência vencida ou com status FAILED derruba o gate. PENDING bloqueia PASS.
- `commercialReady = H20 ∧ H21 ∧ H22 ∧ H23 ∧ H24` (todos em PASS).
- Maturidade derivada: VALIDATED/PILOT, enquanto houver gate que não esteja em PASS.
- Resultado esperado hoje: H20 CONDITIONAL, H21 FAIL, H22 FAIL, H23 FAIL, H24 CONDITIONAL, portanto `commercialReady = false`.

## Etapa 3 — Trava contra autodeclaração
- Um teste de consistência reprova o build se `manifest.commercialReady` do pack PH for diferente do valor calculado pelo motor. Ninguém consegue virar a flag sem que os gates passem.
- O manifesto assinado não muda: continua `false`, então não há re-assinatura nem bump de ruleset.

## Etapa 4 — Validação e registro auditável
- Testes cobrem: cada gate, expiração, não inferência, determinismo (mesma entrada gera a mesma saída e o mesmo hash) e o AND final.
- Rodar a suíte completa. Os 276 testes atuais continuam verdes, mais os novos.
- Gerar o relatório `docs/governance/gates/PH-gate-evaluation-2026-09-25.md` com o resultado, o hash SHA-256 da avaliação, a versão do pack e a do ruleset.
- Especificação do motor em `docs/governance/gates/H20-H24-evaluation-spec.md`.
- ADR-0040 formaliza a regra "status comercial é derivado de evidência".

## Etapa 5 — Exibição transparente
- A tela de prontidão da plataforma e o status da landing /ph passam a ler o resultado do motor. Aparecem os gates e o texto "VALIDATED / PILOT — not yet commercially qualified for unrestricted production", sem prometer submissão automática nos portais.

## Etapa 6 — Publicação
- Verificação prévia: resultado da varredura de segurança, build limpo e checagem de que os packs estão no pacote.
- Publicar em uboardasia.com. Depois, confirmar uma vez que /ph e /id respondem.

## Fora de escopo
- Não haverá liberação comercial do PH: H21, H22 e H23 continuam bloqueados por B1 (portais), B2b (parecer IBP), B4, B6 e DPO/runbook.
- Nenhuma alteração em Core, SDK, Runtime ou nos cálculos do pack.

## Detalhes técnicos
- Tipos: `EvidenceRecord {evidenceId, controlId, domain, claim, layer, status, source, version, effectiveFrom, expiresAt, owner, relatedGaps}` e `GateDefinition {gate, requires: {evidenceId, minLayer}[], blockingGaps[]}`.
- O hash da avaliação usa JSON canônico (chaves ordenadas) com `crypto.subtle`, e o mesmo código roda no servidor e nos testes.
- O registro de ledgers é aditivo: novas linhas em roadmap.md e tech-debt.md, sem reescrever o conteúdo existente.
