# Posicionamento vs. checklist de folha Indonésia — e plano H23 (paridade ID)

Resposta honesta ponto a ponto, verificada no código, seguida do plano de evolução.

## 1. Motor de folha — o que existe hoje

| Exigência | Situação verificada | Evidência |
|---|---|---|
| PPh 21 método TER, 3 grupos A/B/C | Parcial. Classificação A/B/C por estado civil está correta e testada; a tabela TER A é oficial (PP 58/2023), mas **TER B e TER C reutilizam os brackets de A** e estão marcados `sourceStatus: "needs-review"` | `src/packs/indonesia/params/ter-tables.ts` |
| Reconciliação anual (bulanan vs. tahunan, dez.) | **Não existe.** Só há cálculo mensal | `src/lib/engines/indonesia.ts` |
| BPJS Kesehatan + Ketenagakerjaan (JHT/JKK/JKM/JP) | Existe, com tetos e alíquotas empregado/empregador separadas | `calculateBpjs` |
| JKP (perda de emprego) | **Não existe** | — |
| Tetos não hardcoded | Parcial: TER e UMP já saem por ConfigService versionado; **os parâmetros BPJS ainda são constantes em `ID_PARAMS` v2024.1** | `src/lib/countryPacks.ts` |
| THR pró-rata por tempo de casa | Existe (pró-rata mês a mês, ≥1 mês) | `calculateThr` |
| THR por religião declarada (Natal, Nyepi, Waisak…) | **Não existe.** O calendário só resolve Idul Fitri − 7 dias, para todos | `params/eid-al-fitr.ts` |
| UMP provincial | Existe (38 províncias), mas maioria marcada `stale` com valores 2024 (DEBT-024) | `params/ump-2026.ts` |
| UMK por município/regência | **Não existe** — só granularidade provincial |
| Lembur (1/173, multiplicadores dia útil/feriado, 5x8 vs 6x7) | **Não existe motor de cálculo.** Só há regra de limite de horas (18h/semana) | regra `ID-OT-06` |

## 2. Contratos e vínculo

- PKWT vs PKWTT: implementado com regras do PP 35/2021 (fim obrigatório, teto de 5 anos, proibição de probation em PKWT, probation ≤ 90 dias em PKWTT, alerta de vencimento).
- **Renovação/conversão automática pós-Cipta Kerja**: só o teto de 5 anos; não há histórico encadeado de renovações.
- **Rescisão ID (pesangon / penghargaan masa kerja / penggantian hak)**: **não existe**. O motor de separação (`SeparationProvider`) hoje só está implementado nas Filipinas.
- **Outsourcing/responsabilidade solidária**: não existe.

## 3. Segurança — resposta direta

- **RLS real no banco**: sim, por tenant, com `owns_company()` e GRANTs explícitos por tabela — não é filtro de aplicação.
- **Trilha de auditoria**: existe `platform_audit_log` e `personal_data_access_log` append-only (sem UPDATE/DELETE), e cada payroll run guarda `snapshot_hash` + `ruleset_hash`. Filings são imutáveis por trigger.
- **UU PDP (Lei 27/2022)**: a camada construída (consentimento, base legal, retenção, log de acesso, score de prontidão em `/privacy`) foi desenhada para RA 10173 (Filipinas). Os conceitos são reaproveitáveis, mas **falta o mapeamento PDP-ID**, o processo formal de incidente em 72h e o DPO nomeado.
- **Direitos do titular (exportar/corrigir/apagar)**: não há fluxo de atendimento nem purge automatizado de retenção vencida.
- **Criptografia**: em trânsito sim (TLS) e em repouso no nível do banco gerenciado. **Não há criptografia em nível de campo para NIK, NPWP e dados bancários** — hoje ficam em `country_metadata` em texto.
- **Residência de dados**: hoje o banco não está na Indonésia. É decisão de infraestrutura, não de código — precisa ser respondida contratualmente.
- **ISO 27001 / pentest / RPO-RTO contratual**: não aplicável ao código; são compromissos organizacionais ainda inexistentes.

## 4. Integrações

- **Não existe integração ID.** Há apenas API pública própria (`/api/public/v1/*`) e geradores de arquivo estatutário para as Filipinas (BIR/SSS/PhilHealth/HDMF).
- Para ID faltam: e-Bupot/DJP Online, submissão BPJS, arquivo de disbursement bancário (Mandiri/BCA/BRI) e o formato exato aceito por cada portal.

## 5. Os três pontos céticos — resposta

1. **Tabela de parâmetros versionada?** Parcialmente sim: TER, UMP e o calendário de Idul Fitri já são parâmetros datados com `legalBasis` e `sourceStatus`, servidos pelo ConfigService, com estado de aprovação em `regulatory_parameters` (draft → review → approved → active → superseded). **Mas** os parâmetros BPJS ainda são constante de código — isso é dívida real e assumida.
2. **Mudança retroativa recalcula em silêncio?** Não. O run guarda `snapshot_hash` + `ruleset_version`, filings submetidos são imutáveis por trigger de banco e a correção é feita por *amended filing* (ADR-0037 / DEBT-023). O pack só entra em produção assinado (Ed25519, dupla assinatura); bump de ruleset obriga re-assinatura.
3. **Fonte da regra é regulamento publicado?** Cada tabela carrega `legalBasis` citando o instrumento (PP 58/2023, PMK 168/2023, PP 35/2021, Kepmenaker). Onde a fonte não foi conferida bracket a bracket, o campo `sourceStatus: "needs-review"` marca isso explicitamente em vez de fingir precisão — é essa a honestidade que o pack ID ainda precisa converter em "official".

**Veredito:** a arquitetura (packs desacoplados, parâmetros versionados e assinados, imutabilidade, RLS) está no nível pedido. O **conteúdo regulatório do pack Indonésia está atrás do pack Filipinas** e não passa numa auditoria exigente hoje.

## Plano H23 — Paridade regulatória do Country Pack Indonésia

**Fase A0 — Dado salarial defasado (em paralelo com a Fase A, começa imediatamente)**

Aceito a inversão: UMP/UMK errado atinge todo funcionário em toda folha, enquanto pesangon é evento pontual e auditável depois do fato. É dado, não lógica nova — não há motivo para esperar a Fase B.

1. Atualizar a tabela UMP para os valores 2026 (Kepmenaker) e eliminar todas as marcas `stale` (DEBT-024).
2. UMK por município/regência: hierarquia província → kabupaten/kota no resolver, com fallback explícito e flag de staleness visível na folha, não só em dashboard.
3. Alerta de bloqueio: enquanto qualquer província/município usado por um funcionário ativo estiver `stale`, a folha exibe aviso de risco e a regra `ID-UMR-01` é reportada como não-conclusiva em vez de "aprovada".

**Fase A — Motor de folha (bloqueante)**
4. Reconciliar TER B e TER C bracket a bracket contra PP 58/2023 lampiran B/C; virar `sourceStatus: "official"` só com teste golden.
5. Motor de lembur: `OvertimeProvider` no SDK + engine ID com 1/173, multiplicadores dia útil/feriado e regimes 5x8 e 6x7.
6. Reconciliação anual PPh 21 (bulanan × tahunan) com apuração de dezembro e ajuste.
7. Mover parâmetros BPJS de `ID_PARAMS` para parâmetros datados no ConfigService; adicionar JKP.

**Fase B — THR por religião**
8. Calendário de Natal, Nyepi, Waisak e Imlek além de Idul Fitri; a data de vencimento do THR passa a depender da religião declarada do funcionário, com marcação `needs_review` quando o ano não estiver semeado.


**Fase C — Rescisão e contratos**
8. `SeparationProvider` para ID: pesangon, uang penghargaan masa kerja, uang penggantian hak, por motivo de desligamento (tabelas do PP 35/2021).
9. Histórico encadeado de renovações PKWT com conversão automática para PKWTT.

**Fase D — UU PDP e criptografia (co-bloqueante do gate comercial)**

Aceito a segunda objeção: armazenar NIK, NPWP e conta bancária em texto em `country_metadata`, com a UU PDP em fiscalização ativa desde 2024, é exposição legal presente para qualquer empregador com funcionários reais no pack — não é feature pendente.

10. Mapear a camada de privacidade existente para a UU 27/2022: bases legais ID por categoria de dado, DPO nomeado, registro formal de incidente com prazo de 72h, direitos do titular (exportar/corrigir/apagar).
11. Criptografia em nível de campo para NIK, NPWP e conta bancária, com chave gerenciada separadamente do banco.
12. Job de purge automatizado das categorias de retenção vencidas.

**Fase E — Saídas oficiais**
13. Geradores de arquivo ID no formato aceito pelos portais: e-Bupot (DJP), relatório de contribuição BPJS, e arquivo de disbursement bancário em massa.

Fora do escopo de código (decisão do negócio): residência de dados na Indonésia, ISO 27001, pentest com relatório e RPO/RTO contratuais.

## Gate de commercialReady (revisado)

`commercialReady` do pack ID permanece `false` até o fim das Fases A0, A, B, C **e D**. Não há caminho de liberação antecipada por decisão de produto: a única exceção admitida é um **parecer jurídico explícito e registrado** confirmando que operar sem criptografia de campo sobre NIK/NPWP/conta bancária é aceitável no interim — e esse parecer entra como artefato versionado em `docs/governance/`, referenciado pelo ADR que altera o gate, não como flag no código.

Isso amplia o ADR-0035: `commercialReady` deixa de significar apenas "as tabelas estatutárias são reais" e passa a significar "as tabelas estatutárias são reais **e** o tratamento dos dados pessoais é legalmente defensável na jurisdição". Um ADR-0038 registra essa extensão do critério.

## Detalhes técnicos

- Novos contratos entram como capabilities opcionais no SDK (`overtime` já existe como capability declarada mas sem provider real; `separation` já tem contrato pronto usado pelo PH).
- Toda mudança de parâmetro sobe versão do ruleset e obriga re-assinatura Ed25519 + rotação no Trust Store; a suíte de adulteração do H20 cobre isso.
- Novos parâmetros nascem em `src/packs/indonesia/params/*` com `legalBasis` e `sourceStatus`, nunca como constante no engine.
- O tratamento `sourceStatus: "needs-review"` do TER B/C é mantido como padrão do projeto para qualquer tabela não reconciliada bracket a bracket — é o mecanismo que evitou no pack ID o que aconteceu no PH antes do H20.
