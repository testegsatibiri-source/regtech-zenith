# Correção de idioma na landing /id — trechos em português

## Problema

Três textos do dicionário de traduções (`src/lib/i18n.tsx`, chaves `id.*`) foram gravados em português em vez de Bahasa Indonesia. Aparecem na página /id nas seções "Validasi Automatis" e "Arsitektur":

1. Linha 135 — descrição da validação automática ("Cada transaksi passa por um motor de validação...")
2. Linha 147 — descrição do Country Pack ID ("...contendo apenas a lógica específica da legislação trabalhista indonésia.")
3. Linha 152 — descrição da trilha de auditoria ("Cada cálculo referencia a versão exata do ruleset...")

O inglês (`en`) dessas chaves está correto; apenas o `id` está errado.

## Correção

Substituir os três valores `id` por traduções fiéis em Bahasa Indonesia, mantendo os termos técnicos (ruleset, Ed25519, deterministic validation engine) e sem adicionar promessas novas à copy:

1. "Setiap transaksi melewati mesin validasi deterministik yang memeriksa bukti wajib sebelum catatan apa pun dikonfirmasi — misalnya, proses pemutusan hubungan kerja hanya tercatat ketika seluruh dokumentasi yang diwajibkan undang-undang sudah lengkap."
2. "Modul terisolasi dan bertanda tangan kriptografis (Ed25519) yang hanya berisi logika spesifik peraturan ketenagakerjaan Indonesia."
3. "Setiap perhitungan mereferensikan versi ruleset yang persis menghasilkannya, siap untuk inspeksi."

## Verificação

- Auditoria completa do bloco `id.*` no dicionário para garantir que não há outros trechos em português (varredura por padrões de PT-BR: "ção", " cada ", "contendo", etc.).
- Conferir também o bloco `fil.*` (landing /ph) contra o mesmo vazamento.
- Estender o teste de guard-rail existente (`src/routes/__tests__/-id.route.test.ts`) com uma checagem que reprova strings `id` contendo marcadores típicos de português, evitando regressão.
- `bunx tsgo --noEmit` + `bunx vitest run` verdes.
- Conferência visual da página /id no navegador (preview local).

## Fora de escopo

- Publicação (só mediante ordem explícita).
- Qualquer mudança em packs, Core/SDK/Runtime ou conteúdo além dessas três strings.
