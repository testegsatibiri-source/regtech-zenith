# Auditoria do Country Pack Indonésia — o que falta para uso com clientes reais

Veredito: o pacote **não** está liberado para clientes reais. Ele declara `commercialReady: false` no próprio manifesto assinado (v2.2.0 / ID-2026.4), o que hoje o classifica como "beta/validação": aparece na vitrine, mas fica fora de calculadora pública, onboarding e API comercial. Isso é intencional — há quatro bloqueios reais em aberto.

## O que já está pronto

- Motor de folha: PPh 21 por TER (tabelas A, B e C transcritas do texto oficial), reconciliação anual, BPJS 2026 completo (JHT, JP com teto, JKK por 5 níveis de risco, JKM, JKP), THR pró-rata e por religião declarada, motor de hora extra (1/173, jornadas 5x8 e 6x7).
- Contratos PKWT/PKWTT, calendário de obrigações, regras de conformidade, auditoria.
- Arquitetura: parâmetros datados com base legal e status de fonte, pacote assinado em dupla via, imutabilidade de registros e isolamento por empresa no banco.

## Os bloqueios em aberto

**1. Salário mínimo não confirmado na fonte oficial (DEBT-024 / DEBT-025)**
Os valores de 2026 por província vêm de imprensa, não do decreto do governador; os valores por município/regência ainda são de 2025 e estão marcados como desatualizados. O sistema é honesto sobre isso (marca a regra como não conclusiva), mas isso significa que a folha de um cliente real pode estar abaixo do piso legal sem que o sistema afirme nada.

**2. Conferência humana das tabelas de imposto (DEBT-026)**
As faixas B e C foram transcritas de um PDF digitalizado. Falta uma revisão visual humana faixa a faixa antes de assumir responsabilidade sobre o cálculo.

**3. Rescisão indonésia inexistente (Fase C)**
Não há cálculo de pesangon, uang penghargaan masa kerja nem uang penggantian hak. Também falta o histórico encadeado de renovações de contrato temporário com conversão automática para efetivo. Cliente real demite; hoje o sistema não sabe calcular isso.

**4. Lei de proteção de dados indonésia (Fase D, ADR-0038)**
A camada de privacidade existente foi desenhada para as Filipinas. Faltam: mapeamento para a UU 27/2022, encarregado de dados nomeado, processo formal de incidente em 72h, direitos do titular, purga automática de retenção vencida e, sobretudo, **criptografia por campo de NIK, NPWP e conta bancária** — hoje em texto aberto. A ADR-0038 só admite uma exceção: parecer jurídico assinado por advogado licenciado na Indonésia com prática em UU PDP, versionado em `docs/governance/legal-opinions/`.

**Fora do gate, mas necessário comercialmente (Fase E):** não existe nenhuma saída oficial indonésia — sem e-Bupot (DJP), sem relatório de contribuição BPJS, sem arquivo bancário de pagamento em massa. O cliente calcula, mas exporta nada para os portais.

## Caminho recomendado até o piloto real

Ordem por risco sobre o cliente, não por esforço:

1. **A0 — Piso salarial oficial.** Carregar os decretos (SK Gubernur) de 2026 das 38 províncias e dos municípios em uso, virar o status para oficial e confirmar que a regra volta a ser conclusiva.
2. **DEBT-026 — Revisão visual das faixas B e C** contra o PDF renderizado, com teste golden.
3. **Fase C — Rescisão.** Provedor de separação para a Indonésia (tabelas do PP 35/2021) e cadeia de renovações PKWT → PKWTT.
4. **Fase D — Privacidade.** Criptografia por campo dos identificadores sensíveis com chave fora do banco, mapeamento UU PDP, incidente em 72h, direitos do titular e purga automática. Alternativa admitida: parecer jurídico registrado, que só compra tempo.
5. **Fase E — Exportações oficiais** (e-Bupot, BPJS, arquivo bancário), pré-requisito prático do piloto.
6. **Fechamento do gate:** subir a versão do pacote, redeclarar `commercialReady: true`, reassinar (autor + contrachave da plataforma) e revalidar o boot.

## Opção intermediária: piloto controlado

Se a intenção é rodar com um cliente real antes de fechar tudo, o caminho defensável é um **piloto em paralelo**, contratualmente declarado como não-oficial: cliente ciente de que a folha é conferida em paralelo pelo processo atual dele, escopo limitado a províncias com piso já confirmado, sem rescisões no escopo, e com o parecer jurídico da Fase D registrado antes de qualquer dado real de funcionário entrar. Isso não altera `commercialReady`, e é isso que o mantém honesto.

## Detalhes técnicos

- Gate: `commercialReady` entra nos bytes canônicos assinados (`params/canonical-manifest.ts`), então qualquer mudança exige nova assinatura e rotação no trust store.
- Capacidades declaradas hoje: payroll, tax, benefits, thirteenth, overtime, calendar, contracts, audit, rules. Ausentes em relação às Filipinas: `separation`, `leave`, `filings`.
- Não há `pgp_sym_encrypt` nem qualquer criptografia por campo no repositório; os identificadores ficam em `country_metadata`.
- `resolveWageFloor()` já propaga o pior status da cadeia província → município, então basta reconciliar os dados para o gate destravar sem mudança de lógica.
- ADRs aplicáveis: ADR-0035 (gate assinado), ADR-0038 (extensão de privacidade), ADR-0037 (imutabilidade de declarações).

Este documento é uma auditoria. Diga qual frente devo executar primeiro e eu detalho a implementação.
