const { createTestServer } = require('./helpers/testServer');

// Nivel Sistema / Tipo Funcional. Técnica: tabla de decisión (ver
// docs/tabla-decision-crear-registro.md) sobre la regla de negocio de
// POST /api/records: "solo se crea el registro si llegan el nombre Y las
// 6 estadísticas completas". 2 condiciones booleanas -> 2^2 = 4 reglas.
const server = createTestServer(4314);

const STATS_COMPLETAS = {
  hp: 1,
  attack: 1,
  defense: 1,
  'special-attack': 1,
  'special-defense': 1,
  speed: 1,
};

async function postRecord(payload) {
  const res = await fetch(`${server.baseUrl}/api/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { res, body: await res.json() };
}

beforeAll(() => server.start());
afterAll(() => server.stop());

describe('TABLA DE DECISIÓN - crear registro (pokemonName x stats completas)', () => {
  test('DT-01 (V,V) nombre presente + stats completas -> Crear (201)', async () => {
    const { res, body } = await postRecord({ pokemonName: 'dt-regla1', stats: STATS_COMPLETAS });
    try {
      expect(res.status).toBe(201);
    } finally {
      await fetch(`${server.baseUrl}/api/records/${body.id}`, { method: 'DELETE' });
    }
  });

  test('DT-02 (V,F) nombre presente + stats incompletas -> Rechazar (400)', async () => {
    const { res } = await postRecord({ pokemonName: 'dt-regla2', stats: { hp: 1 } });
    expect(res.status).toBe(400);
  });

  test('DT-03 (F,V) nombre ausente + stats completas -> Rechazar (400)', async () => {
    const { res } = await postRecord({ stats: STATS_COMPLETAS });
    expect(res.status).toBe(400);
  });

  test('DT-04 (F,F) nombre ausente + stats ausentes -> Rechazar (400)', async () => {
    const { res } = await postRecord({});
    expect(res.status).toBe(400);
  });
});
