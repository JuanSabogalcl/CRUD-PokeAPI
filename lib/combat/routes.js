const { randomInt } = require('node:crypto');
const { TYPE_LABELS, TYPE_CHART, mapTypesFromApi } = require('./types');
const { MOVES, describeMove } = require('./moves');
const rules = require('./rules');
const { CombatError, createBattle, playTurn, publicBattle } = require('./battle');

const MAX_BATTLES = 100;
const MODES = ['cpu', 'pvp'];
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// Los combates viven en memoria del servidor: el cliente solo envía movimientos y nunca daño
// ni PS. Se conservan los últimos MAX_BATTLES; reiniciar el servidor los descarta.
function createBattleStore() {
  const battles = new Map();
  return {
    get: (id) => battles.get(id),
    add(battle) {
      battles.set(battle.id, battle);
      if (battles.size > MAX_BATTLES) battles.delete(battles.keys().next().value);
    },
  };
}

function registerCombatRoutes(app, { readRecords, writeRecords, fetchPokemonData }) {
  const store = createBattleStore();

  // Los registros sincronizados antes de este módulo no traen tipos. Se completan desde PokeAPI
  // con el número (o el nombre) del Pokémon y se guardan en el mismo registro, sin duplicarlo.
  async function ensureTypes(record) {
    if (Array.isArray(record.types) && record.types.length) return record;
    let data;
    try {
      data = await fetchPokemonData(record.pokemonId || record.pokemonName);
    } catch (error) {
      throw error.status === 404
        ? new CombatError(`Datos incompletos de ${record.pokemonName}: no tiene tipos y no existe en PokeAPI para completarlos`, 422)
        : new CombatError(`No se pudieron completar los tipos de ${record.pokemonName}: ${error.message}`, error.status === 504 ? 504 : 502);
    }
    const types = mapTypesFromApi(data);
    if (!types.length) throw new CombatError(`PokeAPI no devolvió tipos para ${record.pokemonName}`, 502);
    const records = readRecords();
    const stored = records.find((item) => item.id === record.id);
    if (stored) {
      stored.types = types;
      writeRecords(records);
    }
    return { ...record, types };
  }

  async function loadCombatant(body, side) {
    const recordId = body[side]?.recordId;
    if (typeof recordId !== 'string' || !recordId) {
      throw new CombatError(`Selecciona un Pokémon para el jugador ${side === 'p1' ? 1 : 2}`, 400);
    }
    const record = readRecords().find((item) => item.id === recordId);
    if (!record) throw new CombatError(`Registro ${recordId} no encontrado`, 404);
    return ensureTypes(record);
  }

  function parseSeed(body) {
    // La semilla manual solo se acepta en pruebas para no permitir elegir tiradas favorables.
    if (body.seed === undefined || process.env.COMBAT_ALLOW_SEED !== 'true') return randomInt(2 ** 32);
    if (!Number.isInteger(body.seed) || body.seed < 0 || body.seed >= 2 ** 32) {
      throw new CombatError('seed debe ser un entero entre 0 y 4294967295', 400);
    }
    return body.seed;
  }

  const handle = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof CombatError) return res.status(error.status).json({ error: error.message });
      next(error);
    }
  };

  app.get('/api/combat/rules', (_req, res) => {
    res.json({
      level: rules.LEVEL,
      stab: rules.STAB_MULTIPLIER,
      critical: { multiplier: rules.CRITICAL_MULTIPLIER, chance: 'floor(Velocidad base / 2) / 256' },
      random: { min: rules.RANDOM_MIN / 100, max: rules.RANDOM_MAX / 100 },
      minDamage: rules.MIN_DAMAGE,
      typeLabels: TYPE_LABELS,
      typeChart: TYPE_CHART,
      moves: Object.keys(MOVES).map(describeMove),
    });
  });

  app.post('/api/battles', handle(async (req, res) => {
    const body = req.body;
    if (!isObject(body)) throw new CombatError('El cuerpo debe ser un objeto JSON', 400);
    const mode = body.mode ?? 'cpu';
    if (!MODES.includes(mode)) throw new CombatError('mode debe ser "cpu" o "pvp"', 400);
    const seed = parseSeed(body);
    const p1 = await loadCombatant(body, 'p1');
    const p2 = await loadCombatant(body, 'p2');
    const battle = createBattle({ p1, p2, mode, seed });
    store.add(battle);
    res.status(201).json(publicBattle(battle));
  }));

  app.get('/api/battles/:id', handle(async (req, res) => {
    const battle = store.get(req.params.id);
    if (!battle) throw new CombatError('Combate no encontrado', 404);
    res.json(publicBattle(battle));
  }));

  app.post('/api/battles/:id/turn', handle(async (req, res) => {
    const battle = store.get(req.params.id);
    if (!battle) throw new CombatError('Combate no encontrado', 404);
    if (!isObject(req.body)) throw new CombatError('El cuerpo debe ser un objeto JSON', 400);
    const turn = playTurn(battle, { p1: req.body.p1Move, p2: req.body.p2Move });
    res.json({ turn, battle: publicBattle(battle) });
  }));
}

module.exports = { registerCombatRoutes };
