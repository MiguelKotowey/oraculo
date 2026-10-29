# oráculo

Histórico de preços do Mercado da Comunidade (RMT) do PokeIdle, focado em Gemas, pra
calcular o **preço de venda eficiente** de um Pokémon — equilíbrio entre preço pedido e
velocidade de venda, não simplesmente o preço máximo que alguém pagou por algo parecido.

A raspagem em si **não é feita aqui**: o projeto irmão
[`pokeidle`](../pokeidle) (`C:\git\pokeidle`) abre o jogo e salva os anúncios ativos do
dia em `pokeidle/data/rmt-gemas-<data>.json`. Este repo só consome esses snapshots,
normaliza e guarda o histórico — e, com isso, calcula sugestão de preço.

## Dados

Duas coleções, formato JSON (sem banco — baixo atrito, igual ao pokeidle já faz;
reavaliar só se surgir necessidade real de query mais complexa):

- **`data/listings/<data>.json`** — oferta/preço de mercado, um arquivo por snapshot,
  append-only (nunca sobrescreve um dia já importado). Normalizado: números limpos em
  vez de strings com rótulo embutido (`"N 3,650"` → `3.65`).
- **`data/sales/vendas.json`** — vendas realizadas (ground truth), preenchido manualmente
  por enquanto. É o dado que falta pra medir velocidade de venda de fato, não só oferta.

Schema completo e regras pra quem for escrever um importador novo:
[`CONTRATO-INGESTAO.md`](./CONTRATO-INGESTAO.md).

## Scripts

```bash
node scripts/ingerir-rmt.cjs
```
Lê `C:\git\pokeidle\data\rmt-gemas-*.json`, normaliza e grava em `data/listings/`. Roda
quantas vezes quiser — snapshot já importado é ignorado, nunca duplica.

```bash
node scripts/sugerir-preco.cjs --especie "Pinsir" --potencia 3 --nota 3.528
```
Sugere faixa de preço pra um Pokémon específico, olhando os comparáveis mais próximos
(mesma espécie + mesma potência + nota parecida) em todo o histórico já importado — em
vez da mediana geral da espécie, que mistura potências e notas muito diferentes.
Opcional: `--shiny`, `--k N` (quantos comparáveis usar, padrão 5).

## Limitações conhecidas / próximo passo

- `sugerir-preco.cjs` usa só oferta (anúncios ativos), não velocidade de venda — hoje
  não tem como saber se um preço parecido vendeu em 1 dia ou ficou 30 dias sem vender.
  Quando `data/sales/vendas.json` tiver volume, o próximo passo é incorporar
  `diasParaVender` na sugestão (ex: penalizar comparáveis que ficaram muito tempo
  parados, ou achar o ponto de menor "tempo até vender" sem abrir mão de muito preço).
- Amostra pequena por espécie+potência pode dar faixa larga (poucos comparáveis = mais
  ruído) — o script mostra quantos comparáveis achou, confira esse número antes de
  confiar na sugestão.
