# Fase D — UU PDP (Lei 27/2022) e criptografia de campo no pacote Indonésia

## Correção de premissa (verificada no código)

- **TER B e C já são oficiais.** `src/packs/indonesia/params/ter-tables.ts` traz B e C com faixas próprias (38 e 39 faixas, isenção Rp 6.200.000 e Rp 6.600.000), `sourceStatus: "official"`, paramsVersion 2026.2. Não reaproveitam mais as faixas de A.
- **A reconciliação anual já existe.** `reconcileAnnualPph21` em `src/lib/engines/indonesia.ts`, com PTKP, biaya jabatan e deduções de JHT/JP, coberta por `h23-a.test.ts` e `h23-a2.test.ts`.
- Logo, a Fase A está fechada em código. O resíduo é o **DEBT-026**: conferência visual humana faixa a faixa contra o PDF digitalizado da DJP — revisão, não implementação. Fica como tarefa paralela de revisão antes de virar o portão.
- Restam como bloqueios: dado salarial oficial (DEBT-024/025), Fase C (rescisão) e Fase D (privacidade).

Recomendação: iniciar a Fase D agora, por ser a de maior prazo externo e co-bloqueante desde a ADR-0038.

## O que a Fase D entrega

**1. Criptografia por campo dos identificadores sensíveis**
Hoje NIK, NPWP e conta bancária ficam em texto aberto dentro de `country_metadata` na tabela de funcionários. Passam a ser gravados cifrados, com a chave guardada fora do banco (segredo do ambiente, lido apenas no servidor).

- Novo módulo de cifra no servidor (AES-GCM via Web Crypto, compatível com o runtime de borda), com identificador de versão de chave em cada valor para permitir rotação.
- Novo formato de armazenamento: `{ v: 1, alg: "AES-GCM", kid, iv, ct }` no lugar do texto.
- Leitura tolerante: valor em texto ainda é aceito e marcado como "pendente de migração", para não quebrar registros existentes.
- Migração única que cifra os valores já gravados e um relatório de quantos restam em texto.
- A tela de funcionários passa a mostrar o identificador mascarado por padrão, com revelação sob demanda — e cada revelação grava no registro de acesso já existente.

**2. Mapeamento da camada de privacidade para a Indonésia**
A camada atual (`/privacy`) foi desenhada para a lei filipina. Passa a ser específica por país:

- Bases legais e finalidades da UU 27/2022 para o pacote ID (consentimento, obrigação legal, contrato de trabalho).
- Categorias de dado com prazos de retenção indonésios e a base legal citada.
- Encarregado de proteção de dados (DPO) nomeado por empresa, com contato registrado.
- Registro formal de incidente com o prazo de 72 horas: abertura, classificação, prazo de notificação e trilha de decisão.
- Direitos do titular: exportar, corrigir e apagar, como pedido registrado com prazo e desfecho.
- Purga automática das categorias de retenção vencidas, executada por rotina agendada e sempre registrada.

**3. Artefato jurídico e portão**
- Criar `docs/governance/legal-opinions/` com o modelo já existente; a Fase D só admite liberação antecipada com parecer de advogado licenciado na Indonésia, versionado ali.
- Só após 1, 2 e a Fase C fecharem: subir a versão do pacote, redeclarar `commercialReady: true`, reassinar (autor + contrachave) e revalidar o boot.

## Ordem de execução

1. Módulo de cifra + testes de ida e volta e de rotação de chave.
2. Gravação/leitura cifrada dos três campos + mascaramento na interface + trilha de acesso.
3. Migração dos dados existentes e relatório de pendências.
4. Tabelas e telas de DPO, incidente 72h e direitos do titular.
5. Catálogo de retenção indonésio + rotina de purga.
6. Pasta de pareceres jurídicos e atualização do registro de dívidas.

## Detalhes técnicos

- Chave via segredo de ambiente (`ID_PDP_FIELD_KEY`), lida somente dentro do `handler` de funções de servidor; nunca exposta ao navegador nem prefixada com `VITE_`.
- Cifra e decifra somente no servidor; o cliente nunca recebe o valor cheio, exceto na revelação explícita e auditada.
- Novas tabelas: `data_subject_requests`, `privacy_incidents`, `data_protection_officers` — todas com RLS por empresa e GRANTs explícitos, seguindo o padrão das tabelas de privacidade já existentes.
- Retenção indonésia servida como parâmetro datado com base legal, no mesmo modelo do restante do pacote.
- Purga executada por rotina agendada chamando uma rota pública protegida por segredo, com registro append-only.
- Migrações forward-only em `supabase/migrations/`, sem aplicação automática — aplicação deliberada após validação em staging, conforme o processo já acordado.

Aprovando este plano, começo pelo módulo de cifra e pelos três campos sensíveis.
