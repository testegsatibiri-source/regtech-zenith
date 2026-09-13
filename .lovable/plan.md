# Botão de login na landing Indonésia (`/id`)

## O que está acontecendo

A navegação da landing indonésia (`IdNavbar`) só tem âncoras internas (Platform, Kepatuhan, API, Kontak) — não existe nenhum caminho para entrar na plataforma. Um visitante que já é cliente (ou quer acessar a conta) precisa sair da página e navegar manualmente até `/auth`. A navegação global (`SiteHeader`) já resolve isso: mostra "Sign in" para visitante anônimo e "Dashboard" para usuário logado, lendo a sessão via `useSession()`.

## O que vai mudar

1. **Botão de acesso na navbar da landing ID**, no canto direito, reagindo à sessão:
   - visitante anônimo → botão "Masuk" (Sign in) levando a `/auth`;
   - usuário logado → botão "Dashboard" levando a `/dashboard`.
2. **Textos em indonésio**: novas chaves `id.nav.masuk` ("Masuk") e `id.nav.dashboard` ("Dashboard") no dicionário, com equivalentes em inglês.
3. Sessão lida pelo mesmo `useSession()` já usado no cabeçalho global — sem nova lógica de autenticação.

## Fora de escopo

Nada de mudar fluxo de login, a página `/auth`, o rodapé, ou qualquer outra seção da landing. A landing continua 100% em indonésio.

## Detalhes técnicos

- `src/components/landing-id/IdNavbar.tsx`: importar `useSession` e `Button`; renderizar à direita da navbar o botão condicional (`user ? <Link to="/dashboard"> : <Link to="/auth">`).
- `src/lib/i18n.tsx`: adicionar `id.nav.masuk` (en "Sign in" / id "Masuk") e `id.nav.dashboard` (en/id "Dashboard").
- Verificação: `bunx tsgo --noEmit` e checagem visual de `/id` mostrando "Masuk" deslogado e "Dashboard" após login.
