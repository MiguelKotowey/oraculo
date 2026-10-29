// Lê os snapshots crus de C:\git\pokeidle\data\rmt-gemas-*.json (dono da raspagem é o
// projeto pokeidle, aqui só consumimos) e grava versões normalizadas, uma por data, em
// data/listings/<data>.json. Nunca sobrescreve um snapshot já importado — se o arquivo
// de destino já existe, pula. Parsing de campos segue o mesmo contrato que
// pokeidle/scripts/analisar-rmt.cjs já usa (nota/qualidade são decimais com vírgula,
// preço/IV são inteiros com ponto de milhar) — ver CONTRATO-INGESTAO.md.
const fs = require('fs');
const path = require('path');

const DIR_ORIGEM = path.join(__dirname, '..', '..', 'pokeidle', 'data');
const DIR_DESTINO = path.join(__dirname, '..', 'data', 'listings');

const parseInt_ = s => s ? parseInt(String(s).replace(/\./g, ''), 10) : null;
const parseDec = s => s ? parseFloat(String(s).replace(/[^\d,.-]/g, '').replace(',', '.')) : null;

function parseNaFeira(s) {
  const m = /Na feira:\s*(\d+)\s*([dh])/i.exec(s || '');
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return m[2].toLowerCase() === 'h' ? +(n / 24).toFixed(2) : n;
}

function normalizarAnuncio(p) {
  return {
    especie: (p.nome || '').replace(/\s*\([^)]*\)\s*$/, ''), // tira apelido do dono, ex: "Dragonite (Shrek)"
    tipos: p.tipos || [],
    nivel: p.nivel,
    potencia: p.potencia ? parseInt_(p.potencia.replace('P', '')) : null,
    iv: parseInt_((p.iv || '').replace('IV', '')),
    qualidade: parseDec(p.qualidade),
    nota: parseDec(p.nota),
    precoGemas: parseInt_(p.precoTxt),
    vendedor: p.vendedor,
    naFeiraDias: parseNaFeira(p.naFeira),
    retido: !!p.retido,
    shiny: !!p.shiny,
  };
}

function main() {
  if (!fs.existsSync(DIR_ORIGEM)) {
    throw new Error(`não achei o repo pokeidle em ${DIR_ORIGEM} — ajuste DIR_ORIGEM se a pasta foi movida`);
  }
  fs.mkdirSync(DIR_DESTINO, { recursive: true });

  const arquivos = fs.readdirSync(DIR_ORIGEM).filter(f => /^rmt-gemas-\d{4}-\d{2}-\d{2}\.json$/.test(f));
  let importados = 0, pulados = 0;

  for (const arquivo of arquivos) {
    const data = arquivo.match(/\d{4}-\d{2}-\d{2}/)[0];
    const destino = path.join(DIR_DESTINO, `${data}.json`);
    if (fs.existsSync(destino)) { pulados++; continue; }

    const bruto = JSON.parse(fs.readFileSync(path.join(DIR_ORIGEM, arquivo), 'utf8'));
    const normalizados = (bruto.pokemon || [])
      .map(normalizarAnuncio)
      .filter(a => a.precoGemas != null && a.nota != null);

    // a raspagem pagina o RMT e repete anúncio idêntico (mesmo vendedor+nota+preço) em
    // mais de uma página quando a lista reordena entre páginas — mesmo anúncio não vira
    // 2+ comparáveis distintos no histórico.
    const vistos = new Set();
    const anuncios = normalizados.filter(a => {
      const chave = JSON.stringify(a);
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    });

    fs.writeFileSync(destino, JSON.stringify({
      dataSnapshot: data,
      origem: `pokeidle/data/${arquivo}`,
      ingeridoEm: new Date().toISOString(),
      anuncios,
    }, null, 2));
    const duplicados = normalizados.length - anuncios.length;
    console.log(`importado: ${data} (${anuncios.length} anúncios, ${duplicados} duplicado(s) descartado(s)) -> ${path.relative(process.cwd(), destino)}`);
    importados++;
  }

  console.log(`\n${importados} snapshot(s) importado(s), ${pulados} já existia(m).`);
}

main();
