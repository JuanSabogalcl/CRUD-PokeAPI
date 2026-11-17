// Ronda de la semana 13 sobre la última versión (CRUD + combate).
// E01–E09: caja negra (particiones, valores límite y tablas de decisión) con los datos raros de la
// exploración guiada. N01–N07: suite mínima no funcional con umbrales (semana 11).
// Cada caso afirma el comportamiento esperado según el requisito, no lo que hace el código.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fields, stats } = require('./helpers');

const NAME_MAX = 40;
const SPECIES = {
  bulbasaur: { id: 1, stats: [45, 49, 49, 65, 65, 45] },
  charmander: { id: 4, stats: [39, 52, 43, 60, 50, 65] },
  squirtle: { id: 7, stats: [44, 48, 65, 50, 64, 43] },
  ditto: { id: 132, stats: [48, 48, 48, 48, 48, 48] },
};
// Mensajes técnicos o en inglés que no deben llegar al usuario.
const INTERNAL_TEXT = /cannot|undefined|is not|iterable|typeerror|<html|stack/i;

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
};

module.exports = function registerSemana13Cases(add, { ok, jsonError }) {
  const body = (overrides = {}) => ({ pokemonName: 'ditto', stats: { ...stats }, ...overrides });
  const make = async (c, name, extra = {}) => {
    const { id, stats: values } = SPECIES[name];
    const result = await c.req('POST', '/api/records', { pokemonName: name, pokemonId: id,
      stats: Object.fromEntries(fields.map((field, index) => [field, values[index]])), ...extra });
    ok(result, 201);
    return result.data;
  };
  const battle = async (c, p1, p2, extra = {}) => c.req('POST', '/api/battles',
    { mode: 'pvp', seed: 7, p1: { recordId: p1.id }, p2: { recordId: p2.id }, ...extra });
  const count = async (c) => (await c.req('GET', '/api/records')).data.length;
  const timed = async (fn) => { const started = performance.now(); const result = await fn(); return [result, performance.now() - started]; };

  // ---------- Caja negra ----------

  add('E01', 'Nombre: valores límite de longitud (1–40)', 'RN-01', async (c) => {
    for (const [length, status] of [[1, 201], [NAME_MAX - 1, 201], [NAME_MAX, 201], [NAME_MAX + 1, 400], [5000, 400]]) {
      const result = await c.req('POST', '/api/records', body({ pokemonName: 'a'.repeat(length) }));
      if (status === 201) ok(result, 201);
      else jsonError(result, 400);
    }
    assert.equal(await count(c), 3, 'Solo se guardan los nombres de 1, 39 y 40 caracteres');
  });

  add('E02', 'Nombre: caracteres válidos y contenido HTML', 'RN-01 / RNF-SEG', async (c) => {
    for (const name of ['Mr. Mime', 'Nidoran♀', "Farfetch'd", 'porygon-z']) {
      const result = await c.req('POST', '/api/records', body({ pokemonName: name }));
      ok(result, 201); assert.equal(result.data.pokemonName, name.toLowerCase());
    }
    const before = await count(c);
    for (const name of ['<img src=x onerror=alert(1)>', '<script>alert(1)</script>', 'ditto\u0000', 'a\nb']) {
      jsonError(await c.req('POST', '/api/records', body({ pokemonName: name })), 400);
    }
    const record = (await c.req('GET', '/api/records')).data[0];
    jsonError(await c.req('PUT', `/api/records/${record.id}`, { pokemonName: '<b>x</b>' }), 400);
    assert.equal(await count(c), before, 'Los nombres rechazados no se guardan');
  });

  add('E03', 'Número de Pokédex (pokemonId): clases y límites', 'RN-02', async (c) => {
    for (const [value, stored] of [[undefined, null], [null, null], [1, 1], ['25', 25], [100000, 100000]]) {
      const result = await c.req('POST', '/api/records', body({ pokemonId: value }));
      ok(result, 201); assert.equal(result.data.pokemonId, stored);
    }
    const before = await count(c);
    for (const value of [0, -1, 2.5, 100001, 'abc', '', { a: 1 }, true, []]) {
      jsonError(await c.req('POST', '/api/records', body({ pokemonId: value })), 400);
    }
    assert.equal(await count(c), before);
  });

  add('E04', 'Imagen (sprite): solo URL http/https seguras', 'RN-03 / RNF-SEG', async (c) => {
    const valid = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png';
    for (const value of [valid, 'http://example.test/ditto.png']) {
      const result = await c.req('POST', '/api/records', body({ sprite: value }));
      ok(result, 201); assert.equal(result.data.sprite, value);
    }
    const before = await count(c);
    for (const value of ['javascript:alert(1)', 'x" onerror="alert(1)', 'https://e.test/a.png" onerror="alert(1)',
      'data:text/html,<script>alert(1)</script>', `https://e.test/${'a'.repeat(500)}.png`, 'ftp://e.test/a.png', 123]) {
      jsonError(await c.req('POST', '/api/records', body({ sprite: value })), 400);
    }
    assert.equal(await count(c), before);
  });

  add('E05', 'Consulta a PokeAPI: identificador fuera de formato y respuesta incompleta', 'CA06 / CA14', async (c) => {
    for (const route of ['/api/pokemon/%2E%2E', '/api/pokemon/%2e', '/api/pokemon/..%2F25', '/api/pokemon/pika%20chu']) {
      const result = await c.raw('GET', route);
      jsonError(result, 400);
      assert.doesNotMatch(result.data.error, INTERNAL_TEXT);
    }
    const incomplete = await c.req('GET', '/api/pokemon/sin-stats');
    jsonError(incomplete, 502);
    assert.doesNotMatch(incomplete.data.error, INTERNAL_TEXT);
    ok(await c.req('GET', '/api/pokemon/%20PIKACHU%20'), 200);
  });

  add('E06', 'Rutas de la API inexistentes responden con error JSON', 'CA15', async (c) => {
    for (const [method, route] of [['GET', '/api/no-existe'], ['DELETE', '/api/records'], ['POST', '/api/pokemon/pikachu'], ['GET', '/api/pokemon/']]) {
      const result = await c.raw(method, route);
      jsonError(result, 404);
    }
  });

  add('E07', 'Renombrar un registro actualiza la especie usada en el combate', 'RF02 / Sección 11', async (c) => {
    const squirtle = await make(c, 'squirtle'), ditto = await make(c, 'ditto');
    ok(await battle(c, squirtle, ditto), 201);
    ok(await c.req('PUT', `/api/records/${squirtle.id}`, { pokemonName: 'bulbasaur' }), 200);
    const renamed = await battle(c, squirtle, ditto);
    ok(renamed, 201);
    assert.equal(renamed.data.participants.p1.name, 'bulbasaur');
    assert.deepEqual(renamed.data.participants.p1.types, ['grass', 'poison'], 'No debe conservar el tipo Agua de Squirtle');
    assert.equal(renamed.data.participants.p1.pokemonId, 1);
    // Si el cambio indica el número, se respeta: un apodo que sigue siendo Squirtle.
    ok(await c.req('PUT', `/api/records/${squirtle.id}`, { pokemonName: 'mi-squirtle', pokemonId: 7 }), 200);
    const nickname = await battle(c, squirtle, ditto);
    ok(nickname, 201);
    assert.deepEqual(nickname.data.participants.p1.types, ['water']);
  });

  add('E08', 'Tabla de decisión: iniciar combate', 'RF01 / Sección 11', async (c) => {
    const charmander = await make(c, 'charmander'), bulbasaur = await make(c, 'bulbasaur');
    // Regla 3: sin tipos, PokeAPI disponible y el Pokémon existe -> 201 y se guardan los tipos.
    ok(await battle(c, charmander, bulbasaur), 201);
    assert.deepEqual((await c.req('GET', `/api/records/${bulbasaur.id}`)).data.types, ['grass', 'poison']);
    // Regla 1: tipos ya guardados -> 201 aunque PokeAPI esté caída.
    c.fixture.state.failure = true;
    ok(await battle(c, charmander, bulbasaur), 201);
    // Regla 4: sin tipos y PokeAPI caída -> 502.
    const ditto = await make(c, 'ditto');
    jsonError(await battle(c, ditto, bulbasaur), 502);
    c.fixture.state.failure = false;
    // Regla 5: sin tipos y no existe en PokeAPI -> 422.
    const custom = await c.req('POST', '/api/records', body({ pokemonName: 'grupo6-custom' }));
    jsonError(await battle(c, custom.data, bulbasaur), 422);
    // Regla 2: registro inexistente -> 404.
    jsonError(await battle(c, { id: '00000000-0000-0000-0000-000000000000' }, bulbasaur), 404);
  });

  add('E09', 'Tabla de decisión: ejecutar turno', 'RF04 / RF11', async (c) => {
    const charmander = await make(c, 'charmander'), bulbasaur = await make(c, 'bulbasaur');
    // Regla 1: combate inexistente -> 404.
    jsonError(await c.req('POST', '/api/battles/no-existe/turn', { p1Move: 'flamethrower' }), 404);
    const created = (await battle(c, charmander, bulbasaur)).data;
    // Regla 3: en curso y movimiento inválido -> 400 sin avanzar la ronda.
    jsonError(await c.req('POST', `/api/battles/${created.id}/turn`, { p1Move: 'hyper-beam', p2Move: 'tackle' }), 400);
    // Regla 4: en curso y movimiento válido -> 200 y avanza la ronda.
    let current = created;
    do {
      const result = await c.req('POST', `/api/battles/${current.id}/turn`, { p1Move: 'flamethrower', p2Move: 'vine-whip' });
      ok(result, 200); assert.equal(result.data.battle.round, current.round + 1);
      current = result.data.battle;
    } while (current.status === 'en-curso');
    // Regla 2: finalizado -> 409 con cualquier movimiento.
    jsonError(await c.req('POST', `/api/battles/${current.id}/turn`, { p1Move: 'flamethrower', p2Move: 'vine-whip' }), 409);
  });

  // ---------- No funcionales ----------

  add('N01', 'Rendimiento: listar 151 registros (p95 ≤ 300 ms)', 'RNF-REN-01', async (c) => {
    ok(await c.req('POST', '/api/records/sync-gen1'), 200);
    const times = [];
    for (let i = 0; i < 30; i += 1) {
      const started = performance.now();
      const response = await fetch(`${c.base()}/api/records`);
      await response.json();
      assert.equal(response.status, 200);
      times.push(performance.now() - started);
    }
    const p95 = percentile(times, 95);
    c.note(`30 consultas: p50 ${percentile(times, 50).toFixed(1)} ms, p95 ${p95.toFixed(1)} ms, máx ${Math.max(...times).toFixed(1)} ms`);
    assert.ok(p95 <= 300, `p95 ${p95.toFixed(1)} ms supera 300 ms`);
  });

  add('N02', 'Rendimiento: resolver una ronda de combate (p95 ≤ 150 ms)', 'RNF-REN-02', async (c) => {
    const charmander = await make(c, 'charmander'), ditto = await make(c, 'ditto');
    const times = [];
    let current = null;
    while (times.length < 20) {
      if (!current || current.status !== 'en-curso') current = (await battle(c, charmander, ditto, { mode: 'cpu', seed: times.length })).data;
      const [result, ms] = await timed(() => c.req('POST', `/api/battles/${current.id}/turn`, { p1Move: 'swift' }));
      ok(result, 200);
      current = result.data.battle;
      times.push(ms);
    }
    const p95 = percentile(times, 95);
    c.note(`20 rondas: p50 ${percentile(times, 50).toFixed(1)} ms, p95 ${p95.toFixed(1)} ms`);
    assert.ok(p95 <= 150, `p95 ${p95.toFixed(1)} ms supera 150 ms`);
  });

  add('N03', 'Seguridad: el cliente no puede alterar el combate', 'RNF-SEG-01 / Sección 10', async (c) => {
    const charmander = await make(c, 'charmander'), ditto = await make(c, 'ditto');
    const created = (await battle(c, charmander, ditto, { mode: 'cpu' })).data;
    assert.ok(!('rngState' in created) && !('seed' in created), 'No se expone el estado aleatorio');
    const result = await c.req('POST', `/api/battles/${created.id}/turn`,
      { p1Move: 'swift', p2Move: 'no-existe', damage: 999, hp: 1, winner: 'p1' });
    ok(result, 200);
    const wild = result.data.turn.events.find((event) => event.attacker === 'p2');
    if (wild) assert.ok(created.participants.p2.moves.some((move) => move.id === wild.move.id), 'El salvaje usa su propio movimiento');
    for (const event of result.data.turn.events) {
      assert.ok(event.damage < 999);
      assert.equal(event.hpAfter, Math.max(0, event.hpBefore - event.damage));
    }
    // Sin COMBAT_ALLOW_SEED la semilla del cliente se ignora (aunque sea inválida).
    await c.restart({ COMBAT_ALLOW_SEED: 'false' });
    ok(await battle(c, charmander, ditto, { seed: 'manipulada' }), 201);
  });

  add('N04', 'Seguridad: cabeceras HTTP y tamaño máximo del cuerpo', 'RNF-SEG-02', async (c) => {
    const result = await c.raw('GET', '/api/records');
    ok(result, 200);
    assert.equal(result.headers['x-powered-by'], undefined, 'No debe anunciar la tecnología del servidor');
    assert.equal(result.headers['x-content-type-options'], 'nosniff');
    jsonError(await c.req('POST', '/api/records', JSON.stringify(body({ pokemonName: 'x'.repeat(200000) })), true), 413);
  });

  add('N05', 'Usabilidad: errores comprensibles en JSON y en español', 'RNF-USA-01', async (c) => {
    const custom = await c.req('POST', '/api/records', body({ pokemonName: 'grupo6-custom' }));
    const responses = [
      await c.req('POST', '/api/records', {}),
      await c.req('GET', '/api/records/00000000-0000-0000-0000-000000000000'),
      await c.raw('GET', '/api/no-existe'),
      await c.raw('GET', '/api/pokemon/%2E%2E'),
      await c.req('POST', '/api/battles', { p1: { recordId: custom.data.id }, p2: { recordId: custom.data.id } }),
    ];
    c.fixture.state.failure = true;
    responses.push(await c.req('GET', '/api/pokemon/pikachu'));
    for (const result of responses) {
      assert.ok(result.status >= 400, `Se esperaba un error y llegó ${result.status}`);
      assert.match(String(result.contentType), /application\/json/, `Respuesta ${result.status} no es JSON`);
      assert.equal(typeof result.data.error, 'string');
      assert.doesNotMatch(result.data.error, INTERNAL_TEXT, `Mensaje técnico: ${result.data.error}`);
    }
  });

  add('N06', 'Confiabilidad: 40 peticiones concurrentes y 25 combates completos', 'RNF-CON-01', async (c) => {
    const charmander = await make(c, 'charmander'), squirtle = await make(c, 'squirtle');
    const requests = Array.from({ length: 40 }, (_, i) => (i % 4 === 0
      ? fetch(`${c.base()}/api/battles`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p1: { recordId: charmander.id }, p2: { recordId: squirtle.id } }) })
      : fetch(`${c.base()}${i % 2 ? '/api/records' : '/api/combat/rules'}`)));
    const statuses = (await Promise.all(requests)).map((response) => response.status);
    assert.equal(statuses.filter((status) => status >= 500).length, 0, `Errores 5xx: ${statuses.join(',')}`);
    let rounds = 0;
    for (let i = 0; i < 25; i += 1) {
      let current = (await battle(c, charmander, squirtle, { mode: 'cpu', seed: 1000 + i })).data;
      while (current.status === 'en-curso') {
        assert.ok(current.round < 80, 'Un combate no debe superar 80 rondas');
        const response = await fetch(`${c.base()}/api/battles/${current.id}/turn`, { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p1Move: 'flamethrower' }) });
        assert.equal(response.status, 200);
        current = (await response.json()).battle;
      }
      assert.ok(current.result?.winner);
      rounds += current.round;
    }
    c.note(`40 concurrentes sin 5xx; 25 combates terminados con ganador, ${(rounds / 25).toFixed(1)} rondas en promedio`);
  });

  add('N07', 'Confiabilidad: archivo de datos dañado o incompleto', 'RNF-CON-02', async (c) => {
    const file = path.join(c.dataDir, 'records.json');
    ok(await c.req('GET', '/api/records'), 200); // Precondición: la API responde con datos sanos.
    fs.writeFileSync(file, '{');
    await c.restart({ AUTO_SYNC_GEN1: 'true' }); // Arranque normal: intenta sincronizar al iniciar.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    assert.ok(c.alive(), 'El servidor no debe caerse con un archivo de datos dañado');
    const broken = await c.req('GET', '/api/records');
    jsonError(broken, 500);
    assert.match(broken.data.error, /archivo de datos/i, 'El mensaje debe indicar la causa');
    ok(await c.req('GET', '/api/combat/rules'), 200);
    fs.writeFileSync(file, JSON.stringify([{ id: 'roto', pokemonName: 'sin-estadisticas' },
      { id: 'bien', pokemonName: 'ditto', pokemonId: 132, stats: { ...stats } }]));
    await c.restart();
    const list = await c.req('GET', '/api/records');
    ok(list, 200);
    assert.equal(list.data.length, 2, 'Un registro incompleto no debe impedir listar los demás');
  });
};
