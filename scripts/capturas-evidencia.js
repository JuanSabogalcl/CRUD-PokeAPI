// Genera capturas PNG de la evidencia de la API (petición y respuesta reales de cada caso) con
// Microsoft Edge en modo headless. Uso:
//   node scripts/capturas-evidencia.js --ronda=semana13-ronda-1-diagnostico --salida=docs/pruebas/semana-13/capturas/antes
//   node scripts/capturas-evidencia.js --ronda=semana13-ronda-2-verificacion --comparar=semana13-ronda-1-diagnostico --salida=.../despues
// Por defecto captura los casos que fallaron; con --comparar captura esos mismos casos en la nueva ronda.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const arg = (name) => process.argv.find((item) => item.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const evidenceDir = (name) => path.join(root, 'docs', 'pruebas', 'evidencias', name);
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((file) => fs.existsSync(file));

const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
const pretty = (value, maxLines = 22) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  const lines = String(text ?? '').split('\n').map((line) => (line.length > 150 ? `${line.slice(0, 150)}…` : line));
  return lines.length > maxLines ? [...lines.slice(0, maxLines), `… (${lines.length - maxLines} líneas más)`].join('\n') : lines.join('\n');
};
const sameRequest = (a, b) => a.request.method === b.request.method && a.request.route === b.request.route
  && JSON.stringify(a.request.body ?? null) === JSON.stringify(b.request.body ?? null);

// Casos que hacen varias peticiones antes de comprobar: se elige la que demuestra el resultado.
const PREFERRED = {
  N05: (exchange) => !/json/i.test(exchange.response.contentType || ''), // la respuesta que no era JSON
  N07: (exchange) => exchange.response.status === 500, // la consulta con el archivo dañado
};

// Intercambio que demuestra el resultado: el preferido del caso, el equivalente al de la ronda
// comparada o, si no, el último (en una falla es el que rompió la aserción).
function keyExchange(caseData, reference) {
  const exchanges = caseData.exchanges || [];
  const preferred = PREFERRED[caseData.id] && exchanges.find(PREFERRED[caseData.id]);
  if (preferred) return preferred;
  if (reference) {
    const target = keyExchange(reference);
    const match = target && exchanges.find((exchange) => sameRequest(exchange, target));
    if (match) return match;
  }
  return exchanges[exchanges.length - 1];
}

function render(caseData, exchange, report, label) {
  const passed = caseData.status === 'PASA';
  const request = exchange ? `${exchange.request.method} ${exchange.request.route}${exchange.request.raw ? '   (ruta sin normalizar)' : ''}`
    + (exchange.request.body === undefined ? '' : `\n${pretty(typeof exchange.request.body === 'string' && exchange.request.body.length > 300
      ? `${exchange.request.body.slice(0, 120)}… (${exchange.request.body.length} caracteres)` : exchange.request.body, 12)}`) : 'Sin petición';
  const response = exchange ? `HTTP ${exchange.response.status}   ${exchange.response.contentType || ''}`
    + (exchange.response.headers ? `\n${Object.entries(exchange.response.headers).map(([k, v]) => `${k}: ${v ?? '(ausente)'}`).join('\n')}` : '')
    + `\n\n${pretty(exchange.response.body)}` : '';
  const crash = /SyntaxError|Unhandled|ERR_/.test(caseData.serverLog || '') ? pretty(caseData.serverLog, 10) : '';
  const observation = pretty(caseData.observation || 'Coincide con el esperado', 8);
  // Alto aproximado: líneas de cada bloque (con ajuste de líneas largas) más encabezados.
  const lines = [request, response, crash, observation].filter(Boolean)
    .reduce((total, text) => total + text.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 120)), 0), 0);
  const height = 340 + lines * 19 + (crash ? 70 : 0);
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
    body{margin:0;background:#0f172a;color:#e2e8f0;font:15px/1.45 'Segoe UI',Arial,sans-serif}
    .wrap{padding:22px 26px}
    .top{display:flex;justify-content:space-between;align-items:center;gap:16px}
    h1{font-size:20px;margin:0}
    .meta{color:#94a3b8;font-size:13px;margin:4px 0 14px}
    .badge{font-weight:800;padding:6px 14px;border-radius:999px;color:#fff;background:${passed ? '#16a34a' : '#dc2626'}}
    h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#fbbf24;margin:14px 0 6px}
    pre{margin:0;background:#020617;border:1px solid #334155;border-radius:8px;padding:12px;font:13px/1.45 Consolas,monospace;white-space:pre-wrap;word-break:break-all}
    .obs{background:${passed ? '#052e16' : '#450a0a'};border:1px solid ${passed ? '#16a34a' : '#dc2626'};border-radius:8px;padding:10px 12px;white-space:pre-wrap}
  </style></head><body><div class="wrap">
    <div class="top"><h1>${escapeHtml(caseData.id)} · ${escapeHtml(caseData.title)}</h1><span class="badge">${escapeHtml(caseData.status)}</span></div>
    <div class="meta">${escapeHtml(label)} · Ronda ${escapeHtml(path.basename(report.dir))} · ${escapeHtml(report.startedAt)} · commit ${escapeHtml(String(report.sourceCommit).replace(/^([0-9a-f]{7})[0-9a-f]{33}/, '$1'))} · Criterio ${escapeHtml(caseData.criterion)}</div>
    <h2>Petición</h2><pre>${escapeHtml(request)}</pre>
    <h2>Respuesta obtenida</h2><pre>${escapeHtml(response)}</pre>
    ${crash ? `<h2>Salida del servidor</h2><pre>${escapeHtml(crash)}</pre>` : ''}
    <h2>Resultado de la aserción</h2><div class="obs">${escapeHtml(observation)}</div>
  </div></body></html>`;
  return { html, height };
}

function main() {
  const ronda = arg('ronda');
  const salida = path.resolve(root, arg('salida') || '');
  const comparar = arg('comparar');
  if (!ronda || !arg('salida') || !EDGE) throw new Error('Faltan --ronda/--salida o no se encontró Microsoft Edge');
  const report = { ...JSON.parse(fs.readFileSync(path.join(evidenceDir(ronda), 'resultados.json'), 'utf8')), dir: ronda };
  const reference = comparar && JSON.parse(fs.readFileSync(path.join(evidenceDir(comparar), 'resultados.json'), 'utf8'));
  const ids = arg('casos')?.split(',')
    || (reference ? reference.results : report.results).filter((item) => item.status !== 'PASA').map((item) => item.id);
  const label = arg('etiqueta') || (comparar ? 'Después de corregir' : 'Antes de corregir');
  fs.mkdirSync(salida, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'capturas-'));
  for (const id of ids) {
    const caseData = JSON.parse(fs.readFileSync(path.join(evidenceDir(ronda), `${id}.json`), 'utf8'));
    const refCase = comparar && JSON.parse(fs.readFileSync(path.join(evidenceDir(comparar), `${id}.json`), 'utf8'));
    const { html, height } = render(caseData, keyExchange(caseData, refCase), report, label);
    const htmlFile = path.join(tmp, `${id}.html`);
    fs.writeFileSync(htmlFile, html);
    const out = path.join(salida, `${id}.png`);
    execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=1100,${Math.round(height)}`,
      `--screenshot=${out}`, `file:///${htmlFile.replace(/\\/g, '/')}`], { stdio: 'ignore', timeout: 60000 });
    console.log(`${id} -> ${path.relative(root, out)}`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

main();
