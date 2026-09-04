# Auditoria de performance (somente leitura) — RegTech Zenith

Nada foi alterado: sem edições, sem instalações, sem migrations, sem deploy, sem escrita no banco, sem login de teste, sem teste de carga.

## A. Resumo executivo — 5 maiores causas prováveis

1. **A área logada não guarda nada em cache.** Não existe configuração de validade de dados em nenhum ponto do projeto (`staleTime`/`refetchOnWindowFocus` ausentes). Toda navegação e todo retorno à aba rebaixa as mesmas listas. Evidência: as mesmas buscas repetidas às 16:28:41, 16:29:23 e 16:38:25 — e `listCompanies`/`listEmployees` duplicadas dentro do mesmo segundo. **Portável ao ambiente real.**
2. **Fila de esperas antes de a tela logada aparecer.** Verificar login (ida à rede) → buscar empresas → escolher empresa no navegador → só então buscar os dados da tela. Medido: `/dashboard` é a rota mais lenta nos **dois** ambientes (editor 1,72–1,74 s até o primeiro conteúdo; Vercel 0,63–0,70 s), contra 0,20–0,49 s das rotas públicas. **Portável.**
3. **A área logada é montada só no navegador** (`ssr: false`): nada chega pronto do servidor, a tela fica em branco até o programa carregar. Explica a diferença de FCP acima. **Portável.**
4. **Partida a frio na Vercel.** A primeira resposta do dia levou 2,26 s; as seguintes, 0,16–0,41 s. **Exclusivo da Vercel.**
5. **Editor/sandbox amplifica tudo.** O preview roda em modo de desenvolvimento (`vite dev`), servindo 220–241 arquivos separados por página, contra 24–56 no site publicado. Boa parte da lentidão sentida no editor **não existe** no site real. **Exclusivo do sandbox.**

## B. Comparação sandbox × Vercel

| Achado | Editor (sandbox) | Vercel | Evidência | Portável? | Confiança |
| --- | --- | --- | --- | --- | --- |
| Nº de arquivos por página | 220–241 | 24–56 | medição direta | Não | Alta |
| Rota `/dashboard` mais lenta que as públicas | 1,73 s | 0,66 s | FCP 3 execuções | Sim | Alta |
| Sem cache de dados | sim | sim (mesmo código) | ausência de `staleTime` + repetição na rede | Sim | Alta |
| Partida a frio | não | 2,26 s na 1ª | curl 5 execuções | Só Vercel | Alta |
| Erros 4xx/5xx nas rotas testadas | 0 | 0 | medição | — | Alta |
| Requisições acima de 500 ms | 0 | 0 | medição | — | Alta |
| Mapa de código-fonte exposto | não avaliado | não (404) | verificação direta | — | Alta |

Classificação: SANDBOX_ONLY (nº de arquivos, modo dev) · CODE_PORTABLE (cache, fila de esperas, render só no navegador, consultas sem recorte) · VERCEL_RUNTIME (partida a frio) · NÃO CONFIRMADO (telemetria do banco comercial).

## C. Ranking por impacto

- **P0** — nenhum bloqueio, travamento ou tempo esgotado foi observado nas rotas testadas.
- **P1** — (1) ausência de cache; (2) fila de esperas na entrada da área logada; (3) lista de obrigações sem recorte de período.
- **P2** — (4) checagem de sessão repetida a cada chamada; (5) pré-carga de links desligada; (6) `ssr: false` na área logada; (7) partida a frio na Vercel.
- **P3** — 26 consultas com `select("*")` e apenas 15 usos de limite em todo o código; sem evidência de impacto hoje pelo volume atual de dados.

## D. Achados detalhados

**1. Sem cache (P1)** — `src/router.tsx:6` cria o cliente de dados sem opções padrão; nenhum arquivo define `staleTime`. Evidência: buscas idênticas repetidas em três instantes distintos. Ambiente: ambos. Correção: `staleTime` ~5 min e `refetchOnWindowFocus: false`. Risco: baixo (dados podem ficar até 5 min defasados; invalidação explícita já existe após gravações). Validação: repetir a navegação e confirmar que as buscas não se repetem.

**2. Entrada da área logada em série (P1)** — `src/routes/_authenticated/route.tsx:9-14`: `supabase.auth.getUser()` e depois `listCompanies()`, sequencialmente, a cada navegação. Correção: reaproveitar ambos via cache do roteador. Risco: médio (mexe no controle de acesso; exige teste de entrada/saída).

**3. Empresa ativa resolvida tarde (P1)** — `src/lib/companyContext.tsx:35-40`: `companyId` só é definido depois da montagem, então nenhuma consulta da tela parte antes disso. Correção: resolver de forma síncrona/hidratada. Risco: baixo/médio.

**4. Obrigações sem recorte (P1)** — `src/lib/calendar.functions.ts:12` usa `select("*")` sem filtro de data; é a maior resposta observada e é buscada no painel e no calendário. Correção: janela de período + colunas usadas. Risco: baixo (a tela precisa manter o mesmo conteúdo visível).

**5. Sessão relida a cada chamada (P2)** — `src/integrations/supabase/auth-attacher.ts:8`: leitura de sessão antes de cada chamada; com 6 chamadas por tela, são 6 leituras extras. Arquivo é gerado — não deve ser editado; mitiga-se reduzindo o número de chamadas (itens 1–3).

**6. Pré-carga desligada (P2)** — `src/router.tsx:12` (`defaultPreloadStaleTime: 0`). Correção: ligar pré-carga ao passar o mouse. Risco: baixo.

**7. Área logada só no navegador (P2)** — `src/routes/_authenticated/route.tsx:7`. É a causa direta do branco inicial, mas é o padrão gerido da integração de login; alterar exige cuidado com laços de redirecionamento. Avaliar por último e isoladamente.

**8. Partida a frio (P2)** — Vercel, primeira requisição 2,26 s. Mitigação possível: aquecimento periódico. Risco: baixo.

## E. Baseline por rota (3 execuções após aquecimento)

| Rota | Ambiente | TTFB | FCP | LCP | Requisições | Bytes | Mais lenta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| / | editor | 41–47 ms | 300–396 ms | não medido | 227 | 36,6 KB | 159 ms |
| /packs | editor | 21–25 ms | 200–240 ms | não medido | 225 | 36,0 KB | 155 ms |
| /auth | editor | 13–16 ms | 220–268 ms | não medido | 220 | 35,7 KB | 168 ms |
| /dashboard | editor | 12–17 ms | 1720–1744 ms | não medido | 241 | 40,5 KB | 352 ms |
| / | Vercel | 7–12 ms | 412–492 ms | não medido | 36 | não medido | 116 ms |
| /packs | Vercel | 8–10 ms | 304–328 ms | não medido | 31 | não medido | 77 ms |
| /auth | Vercel | 7–9 ms | 356–468 ms | não medido | 24 | não medido | 104 ms |
| /dashboard | Vercel | 9–14 ms | 632–696 ms | não medido | 56 | não medido | 225 ms |

`/dashboard` foi medida **sem sessão** (redireciona para entrada) — nenhuma credencial foi criada ou reutilizada. A área logada com sessão real: **não testada**. LCP não é reportado por este navegador nas páginas medidas: **não medido**. Bytes na Vercel vêm zerados pelo navegador (respostas de outra origem/cache): **não medido**; pelo servidor, o programa principal tem 159 KB e o estilo 15 KB comprimidos.

## F. Separação final

- **Confirmado no código (afeta o site real):** ausência de cache; fila de esperas na entrada da área logada; empresa ativa resolvida tarde; obrigações sem recorte; pré-carga desligada.
- **Exclusivo do editor:** 220–241 arquivos por página (modo de desenvolvimento), recompilação a cada alteração. Não ocorre no site publicado.
- **Confirmado na Vercel:** partida a frio de ~2,3 s na primeira visita. Nenhum erro, nenhuma requisição acima de 500 ms.
- **Depende de telemetria do banco comercial:** o projeto `lyjxnceaoaivnantwmni` **não é acessível daqui**; toda a análise de consultas é inferida do código, **não confirmada por telemetria**. Também não é possível confirmar daqui a qual banco o site na Vercel aponta, nem a região das funções versus a do banco.
- **Lacunas de observabilidade:** não há medição de duração nas chamadas de dados (o utilitário `timed()` existe em `src/lib/observability/metrics.ts` mas não é usado nas funções de dados); não há registro de tempo por rota; não há amostragem de Web Vitals no site real. Sem isso, a comparação com o banco comercial permanece inferida.

## Paridade de código

- Código em execução no editor: `157d8292` — idêntico a `origin/main`; árvore de trabalho limpa (nenhuma diferença).
- Execução do preview: TanStack Start sobre Vite, comando `vite dev --port 8080` (modo desenvolvimento, sem empacotamento). O site na Vercel roda a versão empacotada — daí a diferença de 220 para 30 arquivos.
- Risco de observar código diferente do publicado: **baixo quanto ao código**, **alto quanto ao modo de execução**.

## Próximo passo

Nada será alterado sem sua aprovação. Se aprovar, a ordem sugerida é: item 1 (cache) → item 4 (recorte das obrigações) → itens 2 e 3 (entrada da área logada) → item 6 (pré-carga) → item 7 (avaliação isolada).
