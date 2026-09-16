const fs = require('fs');
const path = require('path');
const { createTestServer } = require('./helpers/testServer');

// Suite REGRESIÓN: validaciones, errores y casos borde que no deben romperse
// entre despliegues. Riesgo medio/bajo respecto al smoke, pero cubre lo que
// un cambio descuidado suele romper primero.
const server = createTestServer(4311);

const STATS_VALIDAS = {
  hp: 1,
  attack: 1,
  defense: 1,
  'special-attack': 1,
  'special-defense': 1,
  speed: 1,
};

beforeAll(() => server.start());
afterAll(() => server.stop());

describe('REGRESIÓN - validaciones, errores y casos borde', () => {
  test('REG-01 GET /api/pokemon/:name con nombre inexistente devuelve 404', async () => {
    const res = await fetch(`${server.baseUrl}/api/pokemon/noexiste123`);
    expect(res.status).toBe(404);
  });

  test('REG-02 POST /api/records sin "stats" devuelve 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pokemonName: 'sinstats' }),
    });
    expect(res.status).toBe(400);
  });

  test('REG-03 POST /api/records sin "pokemonName" devuelve 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stats: STATS_VALIDAS }),
    });
    expect(res.status).toBe(400);
  });

  test('REG-04 GET /api/records/:id con id inexistente devuelve 404', async () => {
    const res = await fetch(`${server.baseUrl}/api/records/no-existe`);
    expect(res.status).toBe(404);
  });

  test('REG-05 PUT /api/records/:id con id inexistente devuelve 404', async () => {
    const res = await fetch(`${server.baseUrl}/api/records/no-existe`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stats: { hp: 1 } }),
    });
    expect(res.status).toBe(404);
  });

  test('REG-06 DELETE /api/records/:id con id inexistente devuelve 404', async () => {
    const res = await fetch(`${server.baseUrl}/api/records/no-existe`, { method: 'DELETE' });
    expect(res.status).toBe(404);
  });

  test('REG-07 GET /api/pokemon-list respeta el tope de 151 (Gen 1)', async () => {
    const res = await fetch(`${server.baseUrl}/api/pokemon-list?limit=500`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.results.length).toBeLessThanOrEqual(151);
    expect(body.totalGen1).toBe(151);
  });

  test('REG-08 POST /api/records/sync-gen1 sincroniza los 151 Pokémon de la Gen 1', async () => {
    const res = await fetch(`${server.baseUrl}/api/records/sync-gen1`, { method: 'POST' });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total).toBe(151);
  });

  test('REG-09 [DEFECTO CONOCIDO] el nombre de un registro se sanitiza antes de guardarse (XSS)', async () => {
    const payload = '<img src=x onerror=alert(1)>';
    const res = await fetch(`${server.baseUrl}/api/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pokemonName: payload, stats: STATS_VALIDAS }),
    });
    const body = await res.json();

    try {
      expect(res.status).toBe(201);
      // Se espera que el backend rechace o escape HTML/JS crudo en pokemonName.
      // Hoy lo guarda y lo devuelve tal cual -> el frontend lo inyecta sin escapar
      // (public/js/app.js, renderRecordsList) y el script se ejecuta en el navegador.
      expect(body.pokemonName).not.toContain('<img');
    } finally {
      // Limpieza garantizada incluso si la aserción de arriba falla (defecto conocido).
      await fetch(`${server.baseUrl}/api/records/${body.id}`, { method: 'DELETE' });
    }
  });

  test('REG-10 [DEFECTO CONOCIDO] crypto.randomUUID se referencia con su módulo explícito (compatibilidad Node 18)', () => {
    const projectRoot = path.join(__dirname, '..');
    const serverSrc = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
    const syncSrc = fs.readFileSync(path.join(projectRoot, 'lib', 'pokeapi-sync.js'), 'utf8');

    const usaGlobalCryptoSinRequire = (src) => /[^.]crypto\.randomUUID/.test(src)
      && !/require\(['"]crypto['"]\)/.test(src);

    // El README exige Node 18+, pero `globalThis.crypto` sin flag solo está
    // garantizado desde Node 19+. Sin `require('crypto')` explícito, Create y
    // la sincronización Gen 1 fallarían con "crypto is not defined" en Node 18.
    expect(usaGlobalCryptoSinRequire(serverSrc)).toBe(false);
    expect(usaGlobalCryptoSinRequire(syncSrc)).toBe(false);
  });
});
