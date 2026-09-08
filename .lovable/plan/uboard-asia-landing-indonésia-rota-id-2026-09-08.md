# UBoard Asia — Landing Indonésia (rota `/id`)

Nova página pública em Bahasa Indonesia para o mercado indonésio, com status e versão do
Country Pack ID lidos do runtime (nunca escritos à mão) e copy calibrado para não afirmar
nada além do que o pack entrega hoje.

## Escopo

Entra: rota `/id`, copy em indonésio, seção de status dinâmica, formulário de piloto com
consentimento, página de política de privacidade em indonésio, testes de proteção.

Não entra: landing global (uboardasia.com), qualquer mudança em Core/SDK/Runtime,
`commercialReady`, manifesto, assinatura ou a lógica de classificação em
`src/lib/packs/catalog.ts`, landings de outros países, e o apontamento do domínio
`uboardasia.id` (ainda não registrado — fica como tarefa posterior; a página vive em `/id`).

## Páginas

1. `/id` — landing indonésia, renderizada no servidor a cada acesso (não entra em
   pré-renderização, mesma regra já usada em `/packs`).
   Seções: navegação → hero → **Status Validasi** → cobertura regulatória → motor de
   validação → arquitetura (Core Global + Country Pack ID) → formulário de piloto → rodapé.
2. `/id/kebijakan-privasi` — política de privacidade em indonésio, exigida pelo
   consentimento do formulário. Descreve dados coletados, finalidade, prazo de guarda,
   direitos do titular (UU PDP 27/2022) e contato.

## Dados vindos do runtime

O carregador da rota chama a mesma função de servidor já usada pelas outras telas públicas
(`loadCatalogForRequest`) e extrai a entrada `ID`. A página exibe:

- rótulo de status a partir de `statusLabel` (`Validation` → "Dalam Validasi",
  `Production` → "Produksi"), nunca uma string fixa;
- versão do ruleset a partir de `rulesetVersion` e versão do pack de `version`;
- a seção Status Validasi é renderizada sempre; quando o pack não está liberado
  comercialmente ela aparece obrigatoriamente logo abaixo do hero.

Nenhuma reclassificação no navegador — a classificação vem do servidor, como no H17/H19.

## Copy (Bahasa Indonesia)

Usa o texto aprovado no pedido, integralmente: hero, cobertura (PPh 21 TER A/B/C com
reconciliação anual; BPJS JKK/JKM/JHT/JP/JKP; PP 35/2021 com 20 cenários de PHK; THR;
lembur 1/173; proteção de dados "dirancang sejalan dengan UU PDP … tinjauan hukum
independen sedang berjalan"), "Mesin Validasi Kepatuhan" (sem a palavra AI), arquitetura,
CTA e rodapé. Sem "harian" no TER, sem JKN, sem "Lengkap", sem "end-to-end encryption".

Os textos estáticos ficam num dicionário indonésio próprio da landing, separado do
dicionário global; a página é travada em indonésio (`LocaleScope`), sem seletor de idioma.

## Formulário de piloto

Campos: nome completo, e-mail corporativo, empresa, número estimado de funcionários,
cargo (HR Executive / Finance Director / Legal & Compliance Officer / Accounting Partner)
e caixa de consentimento obrigatória com link para a política de privacidade.

Comportamento:

- grava numa tabela nova de pedidos de piloto no banco, com acesso restrito à equipe
  interna (nenhum acesso público de leitura);
- registra a marca de consentimento (data/hora, versão do texto aceito);
- limite de envios por IP e por e-mail para conter spam;
- aviso por e-mail **sem dados pessoais**: apenas "novo pedido recebido" e um link para o
  painel interno autenticado. Se o envio de e-mail ainda não estiver configurado, o aviso
  fica desligado e o pedido continua sendo gravado — aviso na entrega;
- cada leitura de um pedido pela equipe é registrada no log de auditoria já existente;
- os pedidos entram na rotina de descarte por prazo de guarda já construída na Fase D,
  reaproveitando a mesma tabela de políticas de retenção — sem duplicar rotina.

## Detalhes técnicos

- `src/routes/id.tsx` (+ `src/routes/id.kebijakan-privasi.tsx`), SSR por requisição,
  `head()` próprio com título/descrição/OG em indonésio e `lang="id"` no conteúdo.
- Loader chama uma função de servidor nova em `src/lib/packs/packs.functions.ts`
  (`getIdLandingData`) que devolve a entrada de catálogo do ID; sem I/O no cliente.
- Componentes de seção em `src/components/landing-id/` recebendo o pack por props.
- Envio do formulário via `createServerFn` público em `src/lib/pilot.functions.ts`,
  validando com Zod, aplicando rate limit e escrevendo com cliente de servidor;
  leitura dos pedidos apenas por função autenticada com verificação de papel.
- Banco: tabela `pilot_requests` (nome, e-mail, empresa, faixa de funcionários, cargo,
  origem, consentimento, IP com hash, status) + GRANTs, RLS restrita a papéis de
  plataforma, gatilho de `updated_at`, e uma linha de política de retenção para a
  categoria de leads.
- Testes (`vitest`): (1) a rota `/id` não está em lista de pré-renderização;
  (2) guard-rail que varre os componentes da landing procurando versões/status escritos à
  mão ("v1.0", "Production", "Validation", "Dalam Validasi", "ID-2026") fora do binding;
  (3) o rótulo exibido segue `statusLabel` do catálogo.

## Critérios de aceite

- Nenhuma versão ou status do pack escrito à mão no componente.
- Se o pack virar produção, o selo muda sozinho, sem nova publicação de texto.
- Rota fora da pré-renderização.
- Nenhuma menção a "AI" para descrever validação determinística.
- Nenhuma menção a criptografia ponta a ponta.
- Seção de Status Validasi sempre presente enquanto o pack não estiver liberado.
- Nenhum dado pessoal do visitante aparece no corpo do e-mail de aviso.
- Envio do formulário é bloqueado sem a caixa de consentimento marcada.
- Página de política de privacidade existe e está linkada antes do lançamento.
- Pedidos de piloto entram na rotina de retenção/descarte existente.

## Pendências fora do código

- Registro e apontamento de `uboardasia.id` (não registrado hoje).
- Revisão do bloco de proteção de dados pelo advogado indonésio da Fase D antes de publicar.
- Registro PSE (Kominfo) e decisão sobre residência de dados.
