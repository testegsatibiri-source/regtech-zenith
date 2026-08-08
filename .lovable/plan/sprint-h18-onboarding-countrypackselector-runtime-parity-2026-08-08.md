# Sprint H18 — Onboarding & CountryPackSelector Runtime Parity

## Objetivo

Uma única fonte de verdade sobre "qual Country Pack está disponível agora", compartilhada
por `/packs` (pública), `/onboarding` e New Company (autenticadas), avaliada por request
via `classifyWithHealth()`.

## Estado atual (verificado)

- `/packs`, `/` e `/packs/$country` já chamam `listCatalogWithHealth()` / `getProductionPack()` diretamente no loader — lógica repetida em cada rota.
- `createCompany` (`src/lib/data.functions.ts`) aceita `country_code` e `currency` do cliente, ambos com default `"ID"` / `"IDR"`.
- `CompanySwitcher` (`AppShell.tsx`) envia `country_code: "ID", currency: "IDR"` fixos.
- Não existe `/onboarding` nem `CountryPackSelector`.
- Não há redirect por ausência de empresa: usuário sem empresa vê o dashboard vazio.

## Arquitetura

```text
catalog/manifest -> classify() -> classifyWithHealth()
                          |
              loadCountryPacksForRequest()   (loader único, SSR por request)
                          |
        /packs      /onboarding      CompanySwitcher > New Company
                          |
              CountryPackSelector (packs)  -> seleção
                          |
              createCompany(country_code)  -> backend revalida + deriva currency
```

## Etapas

### H18.0 — Contract freeze
- `src/lib/packs/onboarding-contract/index.ts`: tipo `AvailablePack` (`countryCode`, `name`, `currency`, `status`, `flagAsset`).
- `src/lib/packs/onboarding-contract/examples.ts`: exemplo real com um pack production, um beta (que fica de fora) e um roadmap.
- Saída: shape único, sem definição duplicada.

### H18.1 — Loader único
- `src/lib/packs/loader.server.ts` com `loadCountryPacksForRequest()` chamando `classifyWithHealth()` e retornando só `tier === "production"` (installed não-degradado, manifesto >= 1.0.0 válido, `health().status === "ok"`).
- Refatorar o loader de `/packs` para consumir essa função.
- Teste de paridade: mesma chamada em contexto público e autenticado simulados retorna resultado idêntico; pack degradado (fixtures H17 ID/PH/MY) não aparece.

### H18.2 — CountryPackSelector
- Assinatura final: `<CountryPackSelector packs={availablePacks} value={...} onSelect={...} />`.
- Sem `productionOnly` nem qualquer regra de negócio; sem `<select>`.
- Apresentação: `CountryFlag`, nome, moeda derivada (`Indonesia · IDR`).
- Teste: renderiza exatamente os packs recebidos, sem chamar `listCatalog`/`classify` internamente.

### H18.3 — `/onboarding`
- Rota autenticada com layout mínimo (sem sidebar do dashboard).
- Passo único: nome, legal name, tax ID + `CountryPackSelector` alimentado pelo loader.
- CTA `Create company` desabilitado até haver `country_code`.
- Submit: `createCompany({ ...companyFields, country_code })` — sem `currency`.

### H18.4 — Redirect no layout autenticado
- Regra aplicada uma única vez no layout raiz autenticado:
  - zero empresas e rota != `/onboarding` -> redireciona para `/onboarding`;
  - com empresa e rota == `/onboarding` -> redireciona para `/dashboard`.
- Falha ao criar empresa mantém o erro na própria página, sem loop de redirect.
- Teste E2E: usuário novo em `/employees` cai em `/onboarding`; após criar, `/onboarding` manda para `/dashboard`.

### H18.5 — `createCompany` server-side
- `currency` sai do input aceito; payload antigo com `currency` é ignorado, não gera erro (rollout controlado).
- Backend revalida `country_code` contra `loadCountryPacksForRequest()` antes de persistir; rejeita se o pack não estiver production no momento do submit (corrida de degradação).
- Currency gravada vem do manifesto do pack.
- Teste: `country_code` de pack beta/roadmap retorna erro explícito.

### ADR-0033
Documenta a regra: uma única fonte de disponibilidade runtime para todas as superfícies.

## Fora de escopo (H19+)
Providers MY/VN/TH; multi-company com jurisdições distintas no mesmo dashboard; troca de jurisdição de empresa existente; telemetria de funil.

## Critérios de aceite
- Nenhuma empresa nova nasce com país default — `country_code` é escolha explícita validada no backend.
- Usuário autenticado sem empresa sempre passa por `/onboarding`; com empresa, nunca o vê.
- `/onboarding`, New Company e `/packs` consomem exatamente `loadCountryPacksForRequest()`, com teste de paridade.

## Débitos
- DEBT-022: auditar `currency` de empresas existentes contra o manifesto do respectivo pack.
- DEBT-023: remover definitivamente `currency` do schema de input quando não houver clientes antigos.
