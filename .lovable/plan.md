# Onboarding: escolher a jurisdição (Country Pack) no cadastro

## Como está hoje (verificado no código)

- `/auth` (`src/routes/auth.tsx`): cadastro pede apenas nome, e-mail e senha. Nenhuma escolha de país.
- Depois do cadastro o usuário cai direto em `/dashboard`, sem empresa criada.
- A empresa só é criada pelo botão "+" no topo (`CompanySwitcher` em `AppShell.tsx`), e ali o país está **fixo em `ID` / `IDR`** no código.
- `createCompany` (`src/lib/data.functions.ts`) aceita `country_code`, com default `"ID"` — ou seja, o backend já suporta multi-país; só a interface não pergunta.

Resultado: hoje o usuário **não informa** o country pack, e qualquer empresa nasce como Indonésia.

## O que proponho

A escolha do país não deve ficar no formulário de cadastro (a conta é global), e sim no **primeiro passo depois do login**, junto com a criação da empresa — porque o country pack pertence à empresa, não ao usuário.

### 1. Tela de onboarding `/onboarding`
Exibida quando o usuário autenticado ainda não tem nenhuma empresa:
- Nome da empresa, nome legal (opcional), Tax ID.
- Seleção de jurisdição em cards com bandeira, nome do país e moeda.
- Só jurisdições **em produção** ficam selecionáveis (hoje Indonésia e Filipinas); as demais aparecem como "Em breve", desabilitadas.
- Ao confirmar: cria a empresa com o `country_code` e a `currency` corretos e leva ao dashboard.

### 2. Diálogo "New company" passa a perguntar o país
O mesmo seletor de jurisdição entra no diálogo do `CompanySwitcher`, eliminando o `ID` fixo.

### 3. Redirecionamento
O layout autenticado manda para `/onboarding` quando a lista de empresas está vazia, em vez de mostrar um dashboard sem dados.

## Detalhes técnicos

- Fonte das jurisdições: `listCatalog()` de `src/lib/packs/catalog.ts` (filtro `tier === "production"`), reaproveitando `CountryFlag`. Nada de lista nova duplicada.
- `currency` vem do catálogo/manifesto do pack, não digitada pelo usuário.
- Novo arquivo `src/routes/_authenticated/onboarding.tsx` com `head()` próprio.
- `createCompany` já valida `country_code`; nenhuma mudança de schema ou migração é necessária.
- A página de onboarding permanece em inglês (shell global), conforme a regra atual de idioma.
