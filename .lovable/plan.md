# Auditoria de lentidão — diagnóstico e plano de correção

## O que foi medido

O servidor não é o gargalo. Medições feitas agora, direto no ambiente:

- página inicial: ~0,06 s
- área interna (`/payroll`): ~0,02 s
- verificação de saúde do sistema: ~0,27 s (aquecida)

A lentidão percebida está no **carregamento das telas internas no navegador**, não no banco nem no servidor.

## Causas confirmadas

**1. As telas internas não têm nenhum cache de dados.**
Não existe nenhuma configuração de "validade" dos dados em todo o projeto. Consequência: toda vez que a pessoa troca de tela, volta para a aba do navegador ou clica em um menu, **todas as listas são baixadas de novo do zero**. Isso está visível no registro de rede: exatamente as mesmas seis buscas (empresas, funcionários, folhas, contratos, obrigações, pacotes de país) foram repetidas às 16:28:41 e novamente às 16:29:23.

**2. Fila de esperas encadeadas antes de qualquer conteúdo aparecer.**
Ao abrir uma tela interna a sequência é: baixar o programa → verificar o login (ida ao servidor de autenticação) → buscar a lista de empresas → só então o navegador escolhe a empresa ativa → só então começam as buscas da tela. São 4 idas e voltas em fila, nada em paralelo, e a tela fica vazia o tempo todo.

**3. A área interna é renderizada 100% no navegador** (`ssr: false`). Nada é enviado pronto pelo servidor, então a tela permanece em branco até o programa inteiro ser baixado e executado.

**4. Cada busca faz uma checagem de sessão antes de sair.** Com 6 buscas por tela, são 6 checagens extras a cada carregamento.

**5. A lista de obrigações vem inteira, sem recorte por período.** É de longe a maior resposta do sistema (dezenas de registros com todos os campos), e é baixada tanto no painel quanto no calendário — de novo, a cada visita.

**6. A pré-carga de links está desligada** (`defaultPreloadStaleTime: 0`), então passar o mouse sobre o menu não adianta nada.

## Correções propostas (ordem de impacto)

1. **Cache padrão de dados** — definir validade de 5 minutos e desligar a rebusca automática ao voltar para a aba. Elimina de imediato a repetição completa a cada navegação. Maior ganho, menor risco.
2. **Reaproveitar a verificação de login e a lista de empresas** entre telas, em vez de refazer as duas a cada navegação interna.
3. **Resolver a empresa ativa antes da primeira pintura**, para as buscas da tela partirem junto e não depois.
4. **Recortar a lista de obrigações por período** (janela padrão de meses, em vez de tudo) e trazer só os campos usados na tela.
5. **Ligar a pré-carga ao passar o mouse** nos itens de menu, para a próxima tela já chegar pronta.
6. **Reavaliar o "só no navegador" da área interna** — deixar ao menos o esqueleto da tela vir pronto do servidor, para acabar com o branco inicial.

## Notas técnicas

- Itens 1 e 5: `QueryClient` em `src/router.tsx` (`defaultOptions.queries.staleTime`, `refetchOnWindowFocus: false`) e `defaultPreloadStaleTime`.
- Item 2: `beforeLoad` em `src/routes/_authenticated/route.tsx` chama `supabase.auth.getUser()` + `listCompanies()` em série a cada navegação; migrar para `context.queryClient.ensureQueryData`.
- Item 3: `CompanyProvider` (`src/lib/companyContext.tsx`) define `companyId` num `useEffect` pós-montagem; ler o valor salvo de forma síncrona/hidratada.
- Item 4: `listObligations` em `src/lib/calendar.functions.ts` usa `.select("*")` sem filtro de data.
- Item 6: `ssr: false` em `src/routes/_authenticated/route.tsx` — mudança mais sensível, avaliar por último e isoladamente.

## Fora de escopo

Nenhum deploy, migration ou workflow será executado. Nenhuma regra de cálculo de folha, pacote de país ou permissão será alterada.
