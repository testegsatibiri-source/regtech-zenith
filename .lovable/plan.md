# Plano — Ajuste de copy da landing /ph (honestidade das tabelas e dos filings)

Contexto: a correção do DEBT-030/031 (SSS 15% / Circular 2024-006 e NCR ₱755 / NCR-28) já está aplicada no código do pack v1.7.0, mas ainda falta re-assinatura e a pack está em Validation — nada foi publicado. Ainda assim, a revisão de copy faz sentido: "data de vigência registrada" não comunica atualidade, e "inihandang layout" soa prontos quando o B1 (validação em portal real) está aberto.

## Mudanças (apenas 2 chaves do dicionário, `src/lib/i18n.tsx`)

### 1. `ph.coverage.contrib.body` — Statutory contributions

- **fil (novo):** "Kalkulasyon ng share ng employer at employee mula sa versioned na contribution tables, na may kumpletong kasaysayan ng mga pagbabago sa parameters at pinagmulan ng bawat talahanayan."
- **en (espelho):** "Employer and employee shares computed from versioned contribution tables, with a full change history for every parameter."

### 2. `ph.coverage.filings.body` — Deadlines & filings

- **fil (novo):** "Kalendaryo ng mga deadline at mga layout na ginagawa sa loob ng sistema — hinihintay pa ang validation laban sa mga opisyal na portal. Ang aktwal na pagsusumite sa mga government portal ay ginagawa ng inyong team — hindi ito awtomatikong ipinapasa ng plataporma."
- **en (espelho):** "Filing calendar and internally generated layouts — still pending validation against the official portals. Submission to government portals is done by your team, not automatically by the platform."

## Não muda

- Estrutura da página, títulos, demais seções, guard-rails de strings proibidas e o teste `-ph.route.test.ts` (nenhum termo banido nas novas strings).
- Nada no pack PH, Core ou SDK.

## Confirmações pedidas antes de aplicar

- **Espelho em inglês:** `/ph` renderiza via `LocaleScope lang="fil"` sem seletor de idioma; como todas as chaves `ph.*` têm `fil`, o texto `en` não aparece na página — é só fallback estrutural do dicionário. Atualizo o `en` por consistência (custo zero), mas não é bloqueante.
- **Guard-rail:** verifiquei as strings novas contra `BANNED_MARKETING` do teste: "awtomatikong ipinapasa" não casa com "awtomatikong pagsusumite", e não há "AI " maiúsculo. O teste será executado (não apenas assumido) após a edição.

## Critério de aceite

- As duas seções em `/ph` exibem o texto revisado; nenhuma promessa de atualidade de tabelas ou prontidão de filings.
- Typecheck limpo e suíte verde (incluindo `-ph.route.test.ts` executado).
