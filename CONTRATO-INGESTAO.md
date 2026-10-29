# Contrato de ingestão

Formato que **qualquer** raspagem (hoje o `pokeidle`, ou outra fonte futura) precisa
produzir pra alimentar o oráculo. Isso é o schema normalizado real — o mesmo que
`scripts/ingerir-rmt.cjs` grava em `data/listings/` — não é um padrão à parte. Se o
schema mudar, muda aqui e no script juntos.

## Listagem (oferta/preço de mercado)

Um arquivo por snapshot de raspagem, em `data/listings/<YYYY-MM-DD>.json`:

```json
{
  "dataSnapshot": "2026-10-27",
  "origem": "pokeidle/data/rmt-gemas-2026-10-27.json",
  "ingeridoEm": "2026-10-28T12:00:00.000Z",
  "anuncios": [
    {
      "especie": "Pinsir",
      "tipos": ["BUG"],
      "nivel": 100,
      "potencia": 3,
      "iv": 122,
      "qualidade": 1.597,
      "nota": 3.518,
      "precoGemas": 75,
      "vendedor": "sant1",
      "naFeiraDias": 5,
      "retido": false,
      "shiny": false
    }
  ]
}
```

Campos de cada anúncio:

| Campo | Tipo | Observação |
|---|---|---|
| `especie` | string | Nome limpo, sem apelido do dono (ex: tirar o `(Shrek)` de `"Dragonite (Shrek)"`) |
| `tipos` | string[] | Tipos do Pokémon (`"BUG"`, `"FLYING"`, ...) |
| `nivel` | number | Nível do Pokémon |
| `potencia` | number | 1–5, extraído de rótulos como `"P3"` |
| `iv` | number | Inteiro, extraído de `"IV 122"` |
| `qualidade` | number | Decimal, extraído de `"Q 1,597"` (vírgula = separador decimal) |
| `nota` | number | Decimal, extraído de `"N 3,518"` (vírgula = separador decimal) — é o principal eixo de comparação entre anúncios da mesma espécie+potência |
| `precoGemas` | number | Inteiro, em gemas (ponto = separador de milhar no texto bruto, se houver) |
| `vendedor` | string | Nome de quem anunciou |
| `naFeiraDias` | number \| null | Tempo que o anúncio já está ativo, convertido pra dias (ex: `"Na feira: 1d"` → `1`) |
| `retido` | boolean | `true` = alguém comprando agora, preço não é estável — recomendação de preço deve ignorar |
| `shiny` | boolean | Shiny não segue a mesma curva de preço por nota — nunca misturar com não-shiny na mesma análise |

Regras pra quem for escrever um novo importador:

- **Append-only por data.** Um snapshot é o retrato de um dia; nunca sobrescreva
  `data/listings/<data>.json` já existente — se já foi importado, pule.
- **Deduplicar exato dentro do mesmo snapshot.** A raspagem do pokeidle pagina a lista
  e pode repetir o mesmo anúncio (mesmo vendedor+nota+preço+tudo) em páginas diferentes
  se a lista reordenar entre páginas — isso não é 2 anúncios, é 1. Descarte duplicatas
  exatas antes de gravar.
- **Preço e nota sempre numéricos**, nunca a string crua com rótulo embutido
  (`"N 3,650"`, `"IV 113"`) — isso é o problema que esse contrato resolve.
- Se um anúncio não tiver preço ou nota, descarte (não dá pra comparar).

## Venda realizada (ground truth, preenchido manualmente por enquanto)

Array único em `data/sales/vendas.json` (sem sharding por data — volume baixo,
preenchido a mão):

```json
{
  "especie": "Pinsir",
  "potencia": 3,
  "nota": 3.518,
  "qualidade": 1.597,
  "precoGemas": 75,
  "shiny": false,
  "anuncioEm": "2026-10-22",
  "vendidoEm": "2026-10-27",
  "diasParaVender": 5,
  "observacao": ""
}
```

Mesmos nomes/tipos de campo da listagem (`especie`, `potencia`, `nota`, `qualidade`,
`precoGemas`, `shiny`) mais `anuncioEm`/`vendidoEm` (datas ISO) e `diasParaVender`
(derivado das duas, guardado pronto pra não recalcular toda hora). `observacao` é
texto livre opcional. Se um dia a raspagem do "Histórico de vendas" dentro do jogo for
automatizada, ela deve gerar exatamente esse formato — nenhum campo novo necessário.

## Regra de negócio: potência alta + nota baixa pode valer refinar antes de vender

Descoberta de 2026-10-29: dá pra aumentar a `nota` de um pokémon "refinando" o
status-base da espécie (mecânica paga em pedras, custo total pra +N = `500×N³` pedras —
fórmula completa em `C:\git\pokememe\Formulas e Numeros-chave.md`, fora deste repo). O
refino soma na base antes de IV e multiplicadores, então empurra a nota pra cima.

Potência P3+ é rara, mas uma nota de nascimento abaixo de ~3,5 (o piso de vendabilidade
observado nos dados — abaixo disso o mercado trata como baixa qualidade mesmo em
potência rara) deixa esse valor "preso": o pokémon vende pelo preço de nota baixa
mesmo sendo estruturalmente raro. `scripts/sugerir-preco.cjs` avisa quando isso
acontece (`potencia >= 3 && nota < 3.5`), mas só sinaliza — não calcula custo de
refino nem simula se compensa (depende de mecânica que o pokeidle entende melhor;
fica como próximo passo se/quando fizer sentido).
