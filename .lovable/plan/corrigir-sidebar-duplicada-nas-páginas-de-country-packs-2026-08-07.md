# Corrigir sidebar duplicada nas páginas de Country Packs

## O que está acontecendo

Verifiquei a página aberta (`/country-packs`): existem **dois menus laterais** renderizados ao mesmo tempo (2 elementos `aside` / 2 `nav`).

Causa confirmada: o layout autenticado (`src/routes/_authenticated/route.tsx`) já envolve todas as páginas no `AppShell` (que contém a sidebar e o cabeçalho). As páginas de Country Packs envolvem o conteúdo **de novo** em outro `AppShell`, criando uma segunda sidebar dentro da área de conteúdo — é isso que aparece "vazando" ao entrar no pack da Indonésia.

## Correção

- `src/routes/_authenticated/country-packs.index.tsx`: remover o wrapper `AppShell` e o import, mantendo o conteúdo interno.
- `src/routes/_authenticated/country-packs.$country.tsx`: remover os dois wrappers `AppShell` (página de detalhe e estado "pack não instalado") e o import.

Nenhuma outra página faz isso, então o resto do app continua igual.

## Verificação

Abrir `/country-packs` e `/country-packs/id` e confirmar uma única sidebar, com o item "Country Packs" ativo.
