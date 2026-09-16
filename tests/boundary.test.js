const { createTestServer } = require('./helpers/testServer');

// Nivel Sistema / Tipo Funcional. Técnica: partición de equivalencia + valores
// límite (Semana 5) sobre el campo `hp` sujeto al rango 1-999 que declara el
// propio formulario (public/index.html: min="1" max="999"). `hp` es
// representativo: las 6 estadísticas pasan por el mismo `Number(stats[key])`
// en server.js sin ninguna validación adicional de rango o tipo.
const server = createTestServer(4313);

function statsWith(hp) {
  return { hp, attack: 1, defense: 1, 'special-attack': 1, 'special-defense': 1, speed: 1 };
}

async function crearConHp(hp) {
  const res = await fetch(`${server.baseUrl}/api/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pokemonName: `boundary-${hp}`, stats: statsWith(hp) }),
  });
  const body = await res.json();
  return { res, body };
}

async function limpiar(id) {
  if (id) await fetch(`${server.baseUrl}/api/records/${id}`, { method: 'DELETE' });
}

beforeAll(() => server.start());
afterAll(() => server.stop());

describe('CAJA NEGRA - partición de equivalencia y valores límite (campo hp, rango 1-999)', () => {
  test('BVA-01 [clase válida / límite mínimo] hp=1 se acepta y se guarda tal cual', async () => {
    const { res, body } = await crearConHp(1);
    try {
      expect(res.status).toBe(201);
      expect(body.stats.hp).toBe(1);
    } finally {
      await limpiar(body.id);
    }
  });

  test('BVA-02 [clase válida / límite máximo] hp=999 se acepta y se guarda tal cual', async () => {
    const { res, body } = await crearConHp(999);
    try {
      expect(res.status).toBe(201);
      expect(body.stats.hp).toBe(999);
    } finally {
      await limpiar(body.id);
    }
  });

  test('BVA-03 [DEFECTO CONOCIDO: DEF-03] hp=0 (min-1) debería rechazarse', async () => {
    const { res, body } = await crearConHp(0);
    try {
      expect(res.status).toBe(400);
    } finally {
      await limpiar(body.id);
    }
  });

  test('BVA-04 [DEFECTO CONOCIDO: DEF-03] hp=1000 (max+1) debería rechazarse', async () => {
    const { res, body } = await crearConHp(1000);
    try {
      expect(res.status).toBe(400);
    } finally {
      await limpiar(body.id);
    }
  });

  test('BVA-05 [DEFECTO CONOCIDO: DEF-03] hp negativo (-50, clase inválida) debería rechazarse', async () => {
    const { res, body } = await crearConHp(-50);
    try {
      expect(res.status).toBe(400);
    } finally {
      await limpiar(body.id);
    }
  });

  test('EQ-06 [DEFECTO CONOCIDO: DEF-03] hp no numérico ("abc") debería rechazarse, no guardarse como null', async () => {
    const { res, body } = await crearConHp('abc');
    try {
      expect(res.status).toBe(400);
    } finally {
      await limpiar(body.id);
    }
  });

  test('EQ-07 [ya cubierto en REG-02] hp vacío ("") se rechaza como campo requerido', async () => {
    const { res, body } = await crearConHp('');
    try {
      expect(res.status).toBe(400);
    } finally {
      await limpiar(body.id);
    }
  });
});
