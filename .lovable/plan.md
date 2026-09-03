# Deploy Vercel abrindo com erro: variáveis de ambiente ausentes

## Diagnóstico (confirmado)

`https://regtech-zenith.vercel.app/` responde **HTTP 500**. O HTML entregue contém o erro exato do SSR:

```text
Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY.
```

O deploy em si funcionou (build, assets, `__root__` renderizou com sucesso); apenas a rota `/` falhou porque o cliente Supabase é criado no servidor e não encontrou nenhuma das variáveis.

O código lê, nesta ordem (`src/integrations/supabase/client.ts`):
- `import.meta.env.VITE_SUPABASE_URL` → injetado em **build time**
- fallback `process.env.SUPABASE_URL` → lido em **runtime**

Nenhuma das duas está definida no projeto Vercel, então o pipeline (`vercel pull` → `vercel build`) não tem o que injetar.

## Correção — nenhuma alteração de código necessária

É configuração no Vercel. Em **Vercel → Project `regtech-zenith` → Settings → Environment Variables**, criar (escopo **Preview**, que é o usado pelo `deploy-staging`, e depois **Production**):

| Variável | Valor (staging/Preview) |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://lyjxnceaoaivnantwmni.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | publishable (anon) key do staging |
| `VITE_SUPABASE_PROJECT_ID` | `lyjxnceaoaivnantwmni` |
| `SUPABASE_URL` | igual ao `VITE_SUPABASE_URL` |
| `SUPABASE_PUBLISHABLE_KEY` | igual ao publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role do staging (server-only) |

Regras mantidas: service_role nunca em Git nem no frontend; produção usa os valores do `uboard-prod`, jamais os de staging.

Depois de salvar, **rodar de novo** o "Release Validation → Staging" (`workflow_dispatch`, `force_deploy: false`) — as `VITE_*` são inlinadas no bundle em build time, portanto um redeploy é obrigatório; salvar a variável sozinha não corrige o deploy atual.

## Verificação

1. `curl -s -o /dev/null -w "%{http_code}" https://regtech-zenith.vercel.app/` → esperado `200`.
2. Conferir que a página não contém mais "Missing Supabase environment variable(s)".
3. Navegar em `/` e `/packs` sem erro; `/auth` carregando o formulário de login.

## Fora de escopo

- Nenhuma alteração em código da aplicação, workflows, migrations ou nomes de secrets.
- As 28 migrations do staging continuam pendentes (etapa seguinte do roadmap); o app pode subir e falhar em consultas até que sejam aplicadas — isso é esperado e tratado depois.
