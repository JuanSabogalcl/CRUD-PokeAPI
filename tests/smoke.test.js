const { createTestServer } = require('./helpers/testServer');

// Suite SMOKE: camino feliz del CRUD completo. Riesgo alto-alto (impacto alto,
// probabilidad alta de que un despliegue roto afecte esto) -> se ejecuta primero.
const server = createTestServer(4310);

const STATS_VALIDAS = {
  hp: 10,
  attack: 20,
  defense: 30,
  'special-attack': 40,
  'special-defense': 50,
  speed: 60,
};

beforeAll(() => server.start());
afterAll(() => server.stop());

describe('SMOKE - CRUD principal de la API Pokémon', () => {
  let createdId;

  test('SMK-01 GET /api/pokemon/:name devuelve las estadísticas de un Pokémon válido', async () => {
    const res = await fetch(`${server.baseUrl}/api/pokemon/ditto`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.name).toBe('ditto');
    expect(body.stats).toHaveProperty('hp');
    expect(body.stats).toHaveProperty('speed');
  });

  test('SMK-02 POST /api/records crea un registro nuevo (Create)', async () => {
    const res = await fetch(`${server.baseUrl}/api/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pokemonName: 'testmon-smoke', stats: STATS_VALIDAS }),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBeDefined();
    expect(body.pokemonName).toBe('testmon-smoke');

    createdId = body.id;
  });

  test('SMK-03 GET /api/records incluye el registro creado (Read)', async () => {
    const res = await fetch(`${server.baseUrl}/api/records`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((record) => record.id === createdId)).toBe(true);
  });

  test('SMK-04 PUT /api/records/:id actualiza el registro (Update)', async () => {
    const res = await fetch(`${server.baseUrl}/api/records/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stats: { hp: 99 } }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.stats.hp).toBe(99);
  });

  test('SMK-05 DELETE /api/records/:id elimina el registro (Delete)', async () => {
    const res = await fetch(`${server.baseUrl}/api/records/${createdId}`, { method: 'DELETE' });
    expect(res.status).toBe(200);

    const check = await fetch(`${server.baseUrl}/api/records/${createdId}`);
    expect(check.status).toBe(404);
  });
});
