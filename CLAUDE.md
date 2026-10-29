# oráculo

Histórico de preços do Mercado da Comunidade (RMT) do PokeIdle (gemas) pra calcular
preço de venda eficiente por Pokémon. Fluxo: a raspagem roda no projeto irmão
`C:\git\pokeidle` (não aqui) → `scripts/ingerir-rmt.cjs` importa e normaliza os
snapshots em `data/listings/` → `scripts/sugerir-preco.cjs` sugere faixa de preço por
espécie+potência+nota a partir do histórico acumulado.

Schema dos dados e contrato pra qualquer scraper (hoje ou futuro) que alimente este
repo: [`CONTRATO-INGESTAO.md`](./CONTRATO-INGESTAO.md) é a fonte de verdade. Visão
geral de uso: [`README.md`](./README.md).
