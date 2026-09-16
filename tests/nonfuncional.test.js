const { createTestServer } = require('./helpers/testServer');

// Nivel SISTEMA (vía HTTP contra el servidor real). Tipo: NO funcional (rendimiento).
// No mide contra PokeAPI (dependencia externa) sino un endpoint 100% local,
// para que el umbral no dependa de la latencia de red de un tercero.
const server = createTestServer(4312);

beforeAll(() => server.start());
afterAll(() => server.stop());

describe('NO FUNCIONAL - rendimiento', () => {
  test('NFR-01 GET /api/records (local, sin red externa) responde en menos de 300ms', async () => {
    const start = Date.now();
    const res = await fetch(`${server.baseUrl}/api/records`);
    const elapsedMs = Date.now() - start;

    expect(res.status).toBe(200);
    expect(elapsedMs).toBeLessThan(300);
  });
});
