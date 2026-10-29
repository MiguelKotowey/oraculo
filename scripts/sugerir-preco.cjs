// Sugere preço de venda pra um pokémon específico, olhando os comparáveis mais
// próximos (mesma espécie + mesma potência + nota parecida) em todo o histórico de
// data/listings/*.json, em vez da mediana geral da espécie (que mistura potências e
// notas muito diferentes). Uso:
//   node scripts/sugerir-preco.cjs --especie "Pinsir" --potencia 3 --nota 3.528
// Opcional: --shiny, --k N (quantos comparáveis usar, padrão 5).
const fs = require('fs');
const path = require('path');

const DIR_LISTINGS = path.join(__dirname, '..', 'data', 'listings');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const chave = argv[i].slice(2);
      const proximo = argv[i + 1];
      if (proximo === undefined || proximo.startsWith('--')) args[chave] = true;
      else { args[chave] = proximo; i++; }
    }
  }
  return args;
}

function carregarAnuncios() {
  if (!fs.existsSync(DIR_LISTINGS)) return [];
  const anuncios = [];
  for (const f of fs.readdirSync(DIR_LISTINGS).filter(f => f.endsWith('.json'))) {
    const d = JSON.parse(fs.readFileSync(path.join(DIR_LISTINGS, f), 'utf8'));
    for (const a of d.anuncios) anuncios.push({ ...a, dataSnapshot: d.dataSnapshot });
  }
  return anuncios;
}

function mediana(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.especie || !args.potencia || !args.nota) {
    console.error('uso: node scripts/sugerir-preco.cjs --especie "Pinsir" --potencia 3 --nota 3.528 [--shiny] [--k 5]');
    process.exit(1);
  }
  const especie = String(args.especie).trim().toLowerCase();
  const potencia = parseInt(args.potencia, 10);
  const nota = parseFloat(args.nota);
  const shiny = !!args.shiny;
  const k = args.k ? parseInt(args.k, 10) : 5;

  const candidatos = carregarAnuncios().filter(a =>
    !a.retido && // "retido" = alguém comprando agora, preço não é estável
    a.shiny === shiny &&
    a.potencia === potencia &&
    (a.especie || '').trim().toLowerCase() === especie
  );

  if (!candidatos.length) {
    console.log(`nenhum comparável pra "${args.especie}" P${potencia}${shiny ? ' shiny' : ''} no histórico importado.`);
    return;
  }

  const comparaveis = candidatos
    .map(a => ({ ...a, distNota: Math.abs(a.nota - nota) }))
    .sort((a, b) => a.distNota - b.distNota)
    .slice(0, k);

  const precos = comparaveis.map(c => c.precoGemas);
  console.log(`Comparáveis pra ${args.especie} P${potencia}, nota ${nota}${shiny ? ' (shiny)' : ''} (${candidatos.length} anúncio(s) no total, usando os ${comparaveis.length} mais próximos por nota):\n`);
  for (const c of comparaveis) {
    console.log(`  nota ${c.nota} -> ${c.precoGemas} gemas (${c.dataSnapshot}, ${c.vendedor}, na feira ${c.naFeiraDias}d)`);
  }
  console.log(`\nFaixa sugerida: ${Math.min(...precos)}–${Math.max(...precos)} gemas (mediana dos comparáveis: ${mediana(precos)})`);

  if (potencia >= 3 && nota < 3.5) {
    console.log('\nAviso: potência P3+ com nota abaixo de 3,5 — considerar refino (gastar pedras pra subir status-base) antes de vender. Potência rara com nota baixa costuma deixar valor na mesa (ver CONTRATO-INGESTAO.md).');
  }
}

main();
