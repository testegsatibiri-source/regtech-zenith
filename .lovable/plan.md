# Landing pública do Pack Philippines (/ph)

Página pública em Filipino/Taglish para o Country Pack das Filipinas, espelhando a estrutura já aprovada da landing da Indonésia — mesma forma, sem importar nada do pack ID.

## O que será construído

1. **Rota `/ph`** com layout próprio (`ph.route.tsx`, idioma `fil`) e a página `ph.index.tsx`, renderizada no servidor a cada visita para que status e versão venham do runtime ao vivo.
2. **Seções da página** (Filipino com termos técnicos em inglês, como se usa no mercado):
   - Hero: proposta de valor do pack PH.
   - Status: tier do pack, versão e ruleset lidos do runtime; quando o pack não estiver disponível, mostra "Hindi available ang status" em vez de erro.
   - Cobertura: apenas o que o pack realmente entrega (SSS, PhilHealth, Pag-IBIG, BIR/TRAIN mensal, 13th month PD 851, licenças, separation pay, prazos e filings, contratos/probation).
   - Verificações automáticas: as regras que o pack executa hoje.
   - Arquitetura/dados: onde ficam os dados e como o pack é versionado.
   - Formulário de piloto com consentimento versionado.
   - Rodapé.
3. **Formulário de piloto**: reaproveita a mesma tabela de pedidos já existente, com país "PH" e uma nova versão de consentimento `ph-pilot-2026-09-17`, mantendo os mesmos limites anti-abuso e a mesma ausência de dados pessoais nas notificações.
4. **Política de privacidade** `/ph/patakaran-sa-privacy`, no mesmo formato da versão indonésia.
5. **Ligações**: a landing passa a ser o destino do card das Filipinas no catálogo e no rodapé do site, e entra no sitemap.

## Honestidade da comunicação (mesmo padrão da Indonésia)

- Nada de afirmar o que o pack não faz: sem "IA", sem "criptografia ponta a ponta", sem prometer submissão automática em portais do governo.
- Status e versão sempre do runtime, nunca texto fixo.
- O pack está em validação; a página não sugere disponibilidade comercial.
- Sem citar a tabela de salário mínimo NCR como vigente (ela está em revisão), e sem números salariais na copy.

## Detalhes técnicos

- Arquivos novos: `src/routes/ph.route.tsx`, `src/routes/ph.index.tsx`, `src/routes/ph.patakaran-sa-privacy.tsx`, `src/components/landing-ph/*` (Navbar, Hero, Status, Coverage, AutomatedChecks, Architecture, PilotForm, Footer, statusLabels).
- Loader `getPhLandingData` em `src/lib/packs/packs.functions.ts`, lendo o catálogo (`code === "PH"`), no mesmo molde de `getIdLandingData`.
- `LANDING_ROUTES` em `src/lib/packs/catalog.ts` ganha a entrada `PH` (diff aditivo).
- Servidor do formulário: nova função em `src/lib/pilot.functions.ts` ou parâmetro de país na existente, reutilizando validação, hash de IP, limites por e-mail/IP e trilha de auditoria.
- `head()` próprio por rota, com título/descrição/OG específicos em Filipino.
- Guard-rails de string existentes ("AI", "end-to-end", prefixo de ruleset) estendidos à nova landing.
- Zero alteração em Core/SDK/Runtime ou na lógica do pack PH.

## Fora de escopo

- Qualquer mudança nos valores ou regras do pack PH (inclui o Wage Order NCR pendente).
- Painel de rescisão PH, landings de outros países, domínio próprio `.ph`.
- Publicação: só ocorre mediante ordem explícita.

## Critério de aceite

- `/ph` responde 200 com status e ruleset vindos do runtime; página inteira em Filipino/Taglish.
- Envio do formulário grava o pedido com país PH e a versão de consentimento nova.
- `/ph/patakaran-sa-privacy` acessível a partir do formulário e do rodapé.
- Sitemap inclui as duas rotas; typecheck limpo e suíte de testes verde.
