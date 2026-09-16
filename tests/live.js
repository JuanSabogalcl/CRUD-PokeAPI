const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, fields, launch, stop, tempData, request } = require('./helpers');

async function main() {
  const dataDir = tempData();
  const outDir = path.join(root, 'docs', 'pruebas', 'evidencias', 'integracion-real');
  fs.mkdirSync(outDir, { recursive: true });
  const evidence = [], results = [];
  let server;
  const startedAt = new Date().toISOString();
  try {
    server = await launch(dataDir, 'https://pokeapi.co/api/v2/pokemon', 10000);
    const checks = [
      ['L01', '/api/pokemon/pikachu', (r) => {
        assert.equal(r.status, 200); assert.equal(r.data.id, 25);
        assert.equal(r.data.name, 'pikachu'); assert.deepEqual(Object.keys(r.data.stats), fields);
        assert.equal(r.data.stats.hp, 35); assert.equal(r.data.stats.speed, 90);
      }],
      ['L02', '/api/pokemon-list?limit=151', (r) => {
        assert.equal(r.status, 200); assert.equal(r.data.results.length, 151);
        assert.equal(r.data.results[0].name, 'bulbasaur'); assert.equal(r.data.results[150].name, 'mew');
      }],
      ['L03', '/api/pokemon/no-existe-grupo6', (r) => assert.equal(r.status, 404)],
    ];
    for (const [id, route, verify] of checks) {
      let status = 'PASA', observation = '';
      try {
        const result = await request(server.base, evidence, 'GET', route);
        if ([502,504].includes(result.status)) {
          status = 'BLOQUEADO'; observation = result.data.error;
        } else verify(result);
      } catch (error) { status = 'FALLA'; observation = error.message; }
      results.push({ id, route, status, observation });
      console.log(`${status} ${id} ${route} ${observation}`);
    }
  } finally {
    await stop(server);
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
  fs.writeFileSync(path.join(outDir, 'resultados.json'), JSON.stringify({ startedAt,
    node: process.version, provider: 'PokeAPI pública real', results, exchanges: evidence }, null, 2));
  fs.writeFileSync(path.join(outDir, 'REPORTE.md'), `# Comprobación de integración real\n\nFecha UTC: ${startedAt}. Proveedor: https://pokeapi.co/api/v2/pokemon.\n\nComprobaciones adicionales a la suite controlada de 15 casos. No modifican registros.\n\n| Caso | Consulta | Resultado | Observación |\n|---|---|---|---|\n${results.map((r) => `| ${r.id} | ${r.route} | ${r.status} | ${r.observation || 'Coincide con el esperado'} |`).join('\n')}\n\n[Evidencia HTTP completa](resultados.json). Un resultado BLOQUEADO requiere restablecer la conexión y repetir.\n`);
  process.exitCode = results.some((r) => r.status !== 'PASA') ? 1 : 0;
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
