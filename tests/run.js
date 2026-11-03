const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { root, fields, stats, launch, stop, tempData, request } = require('./helpers');
const { createFixture } = require('./fixture');

const cases = [];
const add = (id, title, criterion, run) => cases.push({ id, title, criterion, run });
const valid = (name = 'ditto') => ({ pokemonName: name, pokemonId: 132, stats: { ...stats } });
const ok = (result, status) => assert.equal(result.status, status, JSON.stringify(result.data).slice(0,300));
const jsonError = (result, status) => {
  ok(result, status);
  assert.match(result.contentType, /application\/json/);
  assert.equal(typeof result.data.error, 'string');
};
const create = async (c, name) => {
  const result = await c.req('POST', '/api/records', valid(name));
  ok(result, 201);
  return result.data;
};

add('S01', 'Disponibilidad y contrato básico', 'CA01', async (c) => {
  const labels = await c.req('GET', '/api/stats-labels');
  ok(labels, 200); assert.deepEqual(Object.keys(labels.data), fields);
  const records = await c.req('GET', '/api/records');
  ok(records, 200); assert.deepEqual(records.data, []);
});
add('S02', 'Crear registro con seis estadísticas', 'CA02', async (c) => {
  const record = await create(c, 'DITTO');
  assert.match(record.id, /^[0-9a-f-]{36}$/);
  assert.equal(record.pokemonName, 'ditto');
  assert.deepEqual(record.stats, stats);
  assert.equal(record.statsFormatted.length, 6);
  assert.ok(Number.isFinite(Date.parse(record.createdAt)));
  assert.equal((await c.req('GET', '/api/records')).data.length, 1);
});
add('S03', 'Consultar registro persistido por ID', 'CA03', async (c) => {
  const record = await create(c);
  const read = await c.req('GET', `/api/records/${record.id}`);
  ok(read, 200); assert.deepEqual(read.data, record);
});
add('S04', 'Actualizar parcialmente y conservar al reiniciar', 'CA04', async (c) => {
  const record = await create(c);
  const updated = await c.req('PUT', `/api/records/${record.id}`, { pokemonName: 'PIKACHU', stats: { hp: 60 } });
  ok(updated, 200);
  assert.equal(updated.data.pokemonName, 'pikachu');
  assert.deepEqual(updated.data.stats, { ...stats, hp: 60 });
  assert.equal(updated.data.createdAt, record.createdAt);
  assert.ok(Date.parse(updated.data.updatedAt) >= Date.parse(record.updatedAt));
  await c.restart();
  const persisted = await c.req('GET', `/api/records/${record.id}`);
  ok(persisted, 200); assert.deepEqual(persisted.data, updated.data);
});
add('S05', 'Eliminar y comprobar ausencia', 'CA05', async (c) => {
  const record = await create(c);
  ok(await c.req('DELETE', `/api/records/${record.id}`), 200);
  jsonError(await c.req('GET', `/api/records/${record.id}`), 404);
  await c.restart();
  assert.deepEqual((await c.req('GET', '/api/records')).data, []);
});
add('R01', 'Mapeo de PokeAPI por nombre y número', 'CA06', async (c) => {
  for (const query of ['%20PIKACHU%20', '25']) {
    const result = await c.req('GET', `/api/pokemon/${query}`);
    ok(result, 200); assert.equal(result.data.id, 25);
    assert.equal(result.data.name, 'pikachu');
    assert.deepEqual(Object.values(result.data.stats), [35,55,40,50,50,90]);
    assert.equal(result.data.statsFormatted.length, 6);
    assert.equal(result.data.sprite, 'https://example.test/25.png');
  }
});
add('R02', 'Pokémon inexistente', 'CA07', async (c) => {
  jsonError(await c.req('GET', '/api/pokemon/no-existe-grupo6'), 404);
});
add('R03', 'Catálogo Gen 1 y parámetros de paginación', 'CA08', async (c) => {
  const list = await c.req('GET', '/api/pokemon-list?limit=999');
  ok(list, 200); assert.equal(list.data.results.length, 151);
  assert.equal(list.data.results[0].id, 1); assert.equal(list.data.results[150].name, 'mew');
  const last = await c.req('GET', '/api/pokemon-list?limit=10&offset=150');
  ok(last, 200); assert.equal(last.data.results.length, 1, 'No deben salir Pokémon posteriores a Mew');
  assert.equal(last.data.results[0].id, 151);
  assert.deepEqual((await c.req('GET', '/api/pokemon-list?offset=151')).data.results, []);
  for (const query of ['limit=-1','limit=0','limit=abc','offset=-1','offset=1.5','limit=2&limit=3']) {
    jsonError(await c.req('GET', `/api/pokemon-list?${query}`), 400);
  }
});
add('R04', 'Campos obligatorios y nombre válido al crear', 'CA09', async (c) => {
  const missing = valid(); delete missing.stats.speed;
  for (const payload of [{}, { pokemonName: 'ditto' }, missing, valid('   '), valid(42),
    { ...valid(), stats: null }, { ...valid(), stats: [] }]) {
    jsonError(await c.req('POST', '/api/records', payload), 400);
  }
  assert.deepEqual((await c.req('GET', '/api/records')).data, []);
});
add('R05', 'Límites y tipos de las seis estadísticas', 'CA10', async (c) => {
  for (const value of [1, 999, '48']) {
    const payload = valid(); payload.stats = Object.fromEntries(fields.map((field) => [field, value]));
    const result = await c.req('POST', '/api/records', payload);
    ok(result, 201); assert.equal(result.data.stats.hp, Number(value));
  }
  const before = (await c.req('GET', '/api/records')).data;
  for (const field of fields) {
    for (const value of [0, -1, 1000, 2.5, 'abc', '', ' ', null, true, [], {}]) {
      const payload = valid(); payload.stats[field] = value;
      jsonError(await c.req('POST', '/api/records', payload), 400);
    }
  }
  assert.deepEqual((await c.req('GET', '/api/records')).data, before);
});
add('R06', 'Actualización inválida sin alterar datos', 'CA11', async (c) => {
  const record = await create(c);
  for (const payload of [{ pokemonName: ' ' }, { pokemonName: 42 }, { stats: { hp: -1 } },
    { stats: { speed: null } }, { stats: { attack: 'abc' } }, { stats: null }, { stats: [] },
    { pokemonName: 'pikachu', stats: { hp: 1000 } }]) {
    jsonError(await c.req('PUT', `/api/records/${record.id}`, payload), 400);
    assert.deepEqual((await c.req('GET', `/api/records/${record.id}`)).data, record);
  }
});
add('R07', 'ID inexistente en lectura, edición y eliminación', 'CA12', async (c) => {
  for (const method of ['GET','PUT','DELETE']) {
    jsonError(await c.req(method, '/api/records/00000000-0000-0000-0000-000000000000',
      method === 'PUT' ? { stats: { hp: 50 } } : undefined), 404);
  }
  assert.deepEqual((await c.req('GET', '/api/records')).data, []);
});
add('R08', 'Sincronizar 151 sin duplicar y conservar registros locales', 'CA13', async (c) => {
  const custom = await create(c, 'grupo6-custom');
  const first = await c.req('POST', '/api/records/sync-gen1');
  ok(first, 200); assert.equal(first.data.created, 151); assert.equal(first.data.total, 152);
  const records = (await c.req('GET', '/api/records')).data;
  assert.equal(new Set(records.map((record) => record.id)).size, 152);
  assert.deepEqual(records.find((record) => record.id === custom.id), custom);
  const second = await c.req('POST', '/api/records/sync-gen1');
  ok(second, 200); assert.equal(second.data.created, 0); assert.equal(second.data.updated, 151);
  const again = (await c.req('GET', '/api/records')).data;
  assert.deepEqual(again.map((record) => record.id), records.map((record) => record.id));
  assert.deepEqual(again.map((record) => record.createdAt), records.map((record) => record.createdAt));
  await c.restart();
  assert.equal((await c.req('GET', '/api/records')).data.length, 152);
});
add('R09', 'Errores, timeout y sincronización fallida del proveedor', 'CA14', async (c) => {
  await create(c);
  const before = (await c.req('GET', '/api/records')).data;
  c.fixture.state.failure = true;
  for (const [method, route] of [['GET','/api/pokemon/pikachu'],['GET','/api/pokemon-list'],['POST','/api/records/sync-gen1']]) {
    jsonError(await c.req(method, route), 502);
  }
  c.fixture.state.failure = false;
  jsonError(await c.req('GET', '/api/pokemon/slow'), 504);
  jsonError(await c.req('GET', '/api/pokemon/broken-json'), 502);
  c.fixture.state.brokenDetail = true;
  jsonError(await c.req('POST', '/api/records/sync-gen1'), 502);
  assert.deepEqual((await c.req('GET', '/api/records')).data, before);
});
add('R10', 'JSON malformado y cuerpo incompatible', 'CA15', async (c) => {
  jsonError(await c.req('POST', '/api/records', '{"pokemonName":', true), 400);
  for (const payload of [[], null, 'ditto', 123]) {
    jsonError(await c.req('POST', '/api/records', payload), 400);
  }
  const record = await create(c);
  for (const payload of [[], null, 'ditto', 123]) {
    jsonError(await c.req('PUT', `/api/records/${record.id}`, payload), 400);
  }
  assert.deepEqual((await c.req('GET', `/api/records/${record.id}`)).data, record);
});

require('./combat-cases')(add, { ok, jsonError });

const SUITE_PREFIX = { smoke: 'S', regression: 'R', combat: 'C' };

async function main() {
  const suite = process.argv.find((arg) => arg.startsWith('--suite='))?.split('=')[1] || 'all';
  if (suite !== 'all' && !SUITE_PREFIX[suite]) throw new Error('Suite inválida');
  const runName = process.argv.find((arg) => arg.startsWith('--run='))?.split('=')[1]
    || new Date().toISOString().replace(/[:.]/g, '-');
  if (!/^[\w-]+$/.test(runName)) throw new Error('Nombre de ronda inválido');
  const outDir = path.join(root, 'docs', 'pruebas', 'evidencias', runName);
  fs.mkdirSync(outDir, { recursive: true });
  const selected = cases.filter((item) => suite === 'all' || item.id.startsWith(SUITE_PREFIX[suite]));
  const results = [];
  const startedAt = new Date().toISOString();
  for (const item of selected) {
    const evidence = [];
    const dataDir = tempData();
    let fixture, server;
    let status = 'PASA', observation = '';
    const start = Date.now();
    try {
      fixture = await createFixture();
      server = await launch(dataDir, fixture.base);
      const context = {
        fixture,
        req: (...args) => request(server.base, evidence, ...args),
        restart: async () => { await stop(server); server = await launch(dataDir, fixture.base); },
      };
      await item.run(context);
    } catch (error) {
      status = evidence.length === 0 ? 'BLOQUEADO' : 'FALLA';
      observation = error.message;
    } finally {
      const serverLog = server?.logs() || '';
      await stop(server);
      if (fixture) await fixture.close();
      // Solo se elimina el directorio temporal creado para este caso.
      fs.rmSync(dataDir, { recursive: true, force: true });
      const result = { id: item.id, title: item.title, criterion: item.criterion, status,
        observation, durationMs: Date.now() - start, evidence: `${item.id}.json` };
      results.push(result);
      fs.writeFileSync(path.join(outDir, result.evidence), JSON.stringify({ ...result, exchanges: evidence, serverLog }, null, 2));
      console.log(`${status.padEnd(9)} ${item.id} ${item.title}${observation ? `: ${observation.slice(0,180)}` : ''}`);
    }
  }
  const totals = Object.fromEntries(['PASA','FALLA','BLOQUEADO'].map((state) => [state, results.filter((item) => item.status === state).length]));
  const hashes = Object.fromEntries(['server.js','lib/pokeapi-sync.js','lib/pokeapi-client.js','lib/validation.js','lib/combat/types.js','lib/combat/moves.js','lib/combat/rules.js','lib/combat/battle.js','lib/combat/routes.js','tests/run.js','tests/combat-cases.js','tests/fixture.js','tests/helpers.js'].filter((file) => fs.existsSync(path.join(root,file))).map((file) => [file, createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
  const report = { startedAt, endedAt: new Date().toISOString(), node: process.version, platform: process.platform,
    suite, provider: 'PokeAPI simulada en localhost; integración HTTP real con la API del proyecto',
    sourceCommit: 'c468b40f1258fd01b1228544065f1a123eef2825', hashes, totals, results,
    decision: totals.FALLA || totals.BLOQUEADO ? 'NO LISTO' : 'LISTO para el alcance automatizado local' };
  fs.writeFileSync(path.join(outDir, 'resultados.json'), JSON.stringify(report, null, 2));
  const clean = (value) => String(value).replace(/\|/g, '/').replace(/\r?\n/g, ' ');
  fs.writeFileSync(path.join(outDir, 'REPORTE.md'), `# Reporte de ejecución\n\nFecha UTC: ${startedAt}. Node ${process.version}. Suite: ${suite}.\n\n${report.provider}.\n\n${totals.PASA} PASA, ${totals.FALLA} FALLA, ${totals.BLOQUEADO} BLOQUEADO.\n\n| Caso | Criterio | Resultado | Evidencia | Observación |\n|---|---|---|---|---|\n${results.map((item) => `| ${item.id} ${item.title} | ${item.criterion} | ${item.status} | [JSON](${item.evidence}) | ${clean(item.observation || 'Coincide con el esperado')} |`).join('\n')}\n\nDecisión: **${report.decision}**. El servicio público y la interfaz se verifican por separado.\n`);
  console.log(`\n${totals.PASA}/${selected.length} PASA. Reporte: ${path.relative(root,outDir)}\\REPORTE.md`);
  process.exitCode = totals.FALLA || totals.BLOQUEADO ? 1 : 0;
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
