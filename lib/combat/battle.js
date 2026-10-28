const { randomUUID } = require('node:crypto');
const { STAT_LABELS } = require('../pokeapi-sync');
const { TYPES, TYPE_LABELS, typeEffectiveness } = require('./types');
const { movesetFor, describeMove } = require('./moves');
const rules = require('./rules');

const SIDES = ['p1', 'p2'];
const STAT_KEYS = Object.keys(STAT_LABELS);
const other = (side) => (side === 'p1' ? 'p2' : 'p1');

class CombatError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

// Un registro sirve para combatir si conserva las 6 estadísticas válidas y 1 o 2 tipos de la Gen 1.
function validateCombatRecord(record) {
  const name = record?.pokemonName || 'el registro';
  for (const key of STAT_KEYS) {
    const value = record?.stats?.[key];
    if (!Number.isInteger(value) || value < 1 || value > 999) {
      return `Datos incompletos de ${name}: falta la estadística ${STAT_LABELS[key]} o no es válida`;
    }
  }
  const types = record.types;
  if (!Array.isArray(types) || types.length < 1 || types.length > 2 || !types.every((t) => TYPES.includes(t))) {
    return `Datos incompletos de ${name}: los tipos no son válidos para la primera generación`;
  }
  return null;
}

function createCombatant(record, side, controller) {
  const error = validateCombatRecord(record);
  if (error) throw new CombatError(error, 422);
  const baseStats = Object.fromEntries(STAT_KEYS.map((key) => [key, record.stats[key]]));
  const stats = rules.battleStats(baseStats);
  return {
    side,
    controller,
    recordId: record.id ?? null,
    pokemonId: record.pokemonId ?? null,
    name: record.pokemonName,
    // Mismo respaldo que formatRecord en server.js para registros creados sin imagen.
    sprite: record.sprite || (record.pokemonId
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${record.pokemonId}.png` : null),
    types: [...record.types],
    baseStats,
    stats,
    hp: { current: stats.hp, max: stats.hp },
    moves: movesetFor(record.types),
  };
}

function createBattle({ p1, p2, mode = 'cpu', seed }) {
  return {
    id: randomUUID(),
    mode,
    status: 'en-curso',
    round: 0,
    level: rules.LEVEL,
    seed,
    rngState: seed >>> 0,
    winner: null,
    loser: null,
    participants: {
      p1: createCombatant(p1, 'p1', 'humano'),
      p2: createCombatant(p2, 'p2', mode === 'cpu' ? 'cpu' : 'humano'),
    },
    turns: [],
    createdAt: new Date().toISOString(),
  };
}

// RF05: actúa primero el de mayor Velocidad; si empatan se sortea con el generador del combate.
function turnOrder(battle, random) {
  const { p1, p2 } = battle.participants;
  if (p1.stats.speed !== p2.stats.speed) {
    return { order: p1.stats.speed > p2.stats.speed ? ['p1', 'p2'] : ['p2', 'p1'], speedTie: false };
  }
  return { order: random() < 0.5 ? ['p1', 'p2'] : ['p2', 'p1'], speedTie: true };
}

function effectivenessMessage(value, defenderName) {
  if (value === 0) return `No afecta a ${defenderName}...`;
  if (value > 1) return '¡Es súper eficaz!';
  if (value < 1) return 'No es muy eficaz...';
  return '';
}

// Resuelve un movimiento. Orden de consumo del generador: precisión (si el movimiento puede
// fallar), luego crítico y variación (solo si el ataque acierta, afecta y no es de daño fijo).
function executeAction(battle, attackerSide, moveId, random) {
  const attacker = battle.participants[attackerSide];
  const defender = battle.participants[other(attackerSide)];
  if (attacker.hp.current <= 0) {
    throw new CombatError(`${attacker.name} está debilitado y no puede usar movimientos`, 409);
  }
  const move = describeMove(moveId);
  const hpBefore = defender.hp.current;
  const event = {
    attacker: attackerSide,
    defender: defender.side,
    move: { id: move.id, name: move.name, type: move.type, category: move.category,
      power: move.power, accuracy: move.accuracy },
    hit: move.accuracy === null || random() * 100 < move.accuracy,
    damage: 0,
    hpBefore,
    hpAfter: hpBefore,
    fainted: false,
  };
  const used = `${attacker.name} usó ${move.name}.`;
  if (!event.hit) {
    event.message = `${used} ¡Pero falló!`;
    return event;
  }

  event.effectiveness = typeEffectiveness(move.type, defender.types);
  if (move.fixedDamage) {
    event.fixedDamage = move.fixedDamage;
    event.damage = event.effectiveness === 0 ? 0 : move.fixedDamage;
  } else {
    const [attackKey, defenseKey] = move.category === 'special'
      ? ['special-attack', 'special-defense'] : ['attack', 'defense'];
    event.stab = attacker.types.includes(move.type) ? rules.STAB_MULTIPLIER : 1;
    event.baseDamage = rules.baseDamage({ level: battle.level, power: move.power,
      attack: attacker.stats[attackKey], defense: defender.stats[defenseKey] });
    event.critical = false;
    if (event.effectiveness > 0) {
      event.critical = random() < rules.criticalChance(attacker.baseStats.speed);
      event.random = rules.RANDOM_MIN + Math.floor(random() * (rules.RANDOM_MAX - rules.RANDOM_MIN + 1));
    }
    event.damage = rules.finalDamage({ base: event.baseDamage, stab: event.stab,
      effectiveness: event.effectiveness,
      critical: event.critical ? rules.CRITICAL_MULTIPLIER : 1, random: event.random });
  }

  // RF10: los PS nunca bajan de cero ni superan el máximo.
  defender.hp.current = Math.min(defender.hp.max, Math.max(0, hpBefore - event.damage));
  event.hpAfter = defender.hp.current;
  event.fainted = event.hpAfter === 0;
  event.message = [used, event.critical ? '¡Golpe crítico!' : '',
    effectivenessMessage(event.effectiveness, defender.name),
    event.damage > 0 ? `${defender.name} pierde ${hpBefore - event.hpAfter} PS.` : '',
    event.fainted ? `¡${defender.name} se debilitó!` : ''].filter(Boolean).join(' ');
  return event;
}

// RF04: en cada ronda cada participante elige un movimiento (la CPU lo elige el servidor) y se
// resuelven en orden de Velocidad. Si el objetivo se debilita, el combate termina ahí.
function playTurn(battle, choices = {}, random = () => rules.nextRandom(battle)) {
  if (battle.status !== 'en-curso') {
    throw new CombatError('El combate ya finalizó; no se permiten más acciones', 409);
  }
  const selected = {};
  for (const side of SIDES) {
    const combatant = battle.participants[side];
    if (combatant.controller === 'cpu') continue;
    const moveId = choices?.[side];
    if (typeof moveId !== 'string' || !combatant.moves.includes(moveId)) {
      throw new CombatError(`Selecciona un movimiento válido para ${combatant.name} (${side})`, 400);
    }
    selected[side] = moveId;
  }
  for (const side of SIDES) {
    const combatant = battle.participants[side];
    if (combatant.controller === 'cpu') {
      selected[side] = combatant.moves[Math.floor(random() * combatant.moves.length)];
    }
  }

  battle.round += 1;
  const { order, speedTie } = turnOrder(battle, random);
  const events = [];
  for (const side of order) {
    const event = executeAction(battle, side, selected[side], random);
    events.push(event);
    if (event.fainted) {
      battle.status = 'finalizado';
      battle.winner = side;
      battle.loser = other(side);
      break;
    }
  }
  const turn = { round: battle.round, order, speedTie, events };
  battle.turns.push(turn);
  return turn;
}

// Vista que se entrega al cliente: sin el estado del generador para que no pueda anticipar tiradas.
function publicBattle(battle) {
  const participant = (c) => ({
    ...c,
    typeLabels: c.types.map((type) => TYPE_LABELS[type]),
    moves: c.moves.map((id) => {
      const move = describeMove(id);
      return { ...move, typeLabel: TYPE_LABELS[move.type],
        stab: c.types.includes(move.type) && !move.fixedDamage };
    }),
  });
  const { p1, p2 } = battle.participants;
  const result = battle.status === 'finalizado'
    ? { winner: battle.winner, loser: battle.loser,
      message: `¡${battle.participants[battle.winner].name} gana el combate! ${battle.participants[battle.loser].name} quedó debilitado.` }
    : null;
  return {
    id: battle.id,
    mode: battle.mode,
    status: battle.status,
    round: battle.round,
    level: battle.level,
    participants: { p1: participant(p1), p2: participant(p2) },
    turns: battle.turns,
    result,
    createdAt: battle.createdAt,
  };
}

module.exports = {
  CombatError, validateCombatRecord, createCombatant, createBattle, turnOrder, executeAction,
  playTurn, publicBattle,
};
