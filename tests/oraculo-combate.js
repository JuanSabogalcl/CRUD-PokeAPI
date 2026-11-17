// Oráculo de las reglas del combate, escrito a partir de la especificación técnica (sección 5) y de
// docs/combate/ARQUITECTURA.md, sin importar nada de lib/combat. Las pruebas comparan cada resultado
// del motor con el que calcula este archivo: si coinciden, la lógica se aplica como se especificó.
// El daño se calcula con enteros (fracciones exactas) para no depender de la coma flotante.

const LEVEL = 50;

// Tabla de tipos de la primera generación, transcrita por separado y en otro formato:
// [tipo del ataque, tipo defensor, multiplicador] solo para lo que no es neutral (x1).
const NOT_NEUTRAL = [
  ['normal', 'rock', 0.5], ['normal', 'ghost', 0],
  ['fighting', 'normal', 2], ['fighting', 'flying', 0.5], ['fighting', 'poison', 0.5], ['fighting', 'rock', 2],
  ['fighting', 'bug', 0.5], ['fighting', 'ghost', 0], ['fighting', 'psychic', 0.5], ['fighting', 'ice', 2],
  ['flying', 'fighting', 2], ['flying', 'rock', 0.5], ['flying', 'bug', 2], ['flying', 'grass', 2], ['flying', 'electric', 0.5],
  ['poison', 'poison', 0.5], ['poison', 'ground', 0.5], ['poison', 'rock', 0.5], ['poison', 'bug', 2], ['poison', 'ghost', 0.5], ['poison', 'grass', 2],
  ['ground', 'flying', 0], ['ground', 'poison', 2], ['ground', 'rock', 2], ['ground', 'bug', 0.5], ['ground', 'fire', 2],
  ['ground', 'grass', 0.5], ['ground', 'electric', 2],
  ['rock', 'fighting', 0.5], ['rock', 'flying', 2], ['rock', 'ground', 0.5], ['rock', 'bug', 2], ['rock', 'fire', 2], ['rock', 'ice', 2],
  ['bug', 'fighting', 0.5], ['bug', 'flying', 0.5], ['bug', 'poison', 2], ['bug', 'ghost', 0.5], ['bug', 'fire', 0.5],
  ['bug', 'grass', 2], ['bug', 'psychic', 2],
  ['ghost', 'normal', 0], ['ghost', 'ghost', 2], ['ghost', 'psychic', 0],
  ['fire', 'rock', 0.5], ['fire', 'bug', 2], ['fire', 'fire', 0.5], ['fire', 'water', 0.5], ['fire', 'grass', 2],
  ['fire', 'ice', 2], ['fire', 'dragon', 0.5],
  ['water', 'ground', 2], ['water', 'rock', 2], ['water', 'fire', 2], ['water', 'water', 0.5], ['water', 'grass', 0.5], ['water', 'dragon', 0.5],
  ['grass', 'flying', 0.5], ['grass', 'poison', 0.5], ['grass', 'ground', 2], ['grass', 'rock', 2], ['grass', 'bug', 0.5],
  ['grass', 'fire', 0.5], ['grass', 'water', 2], ['grass', 'grass', 0.5], ['grass', 'dragon', 0.5],
  ['electric', 'flying', 2], ['electric', 'ground', 0], ['electric', 'water', 2], ['electric', 'grass', 0.5],
  ['electric', 'electric', 0.5], ['electric', 'dragon', 0.5],
  ['psychic', 'fighting', 2], ['psychic', 'poison', 2], ['psychic', 'psychic', 0.5],
  ['ice', 'flying', 2], ['ice', 'ground', 2], ['ice', 'water', 0.5], ['ice', 'grass', 2], ['ice', 'ice', 0.5], ['ice', 'dragon', 2],
  ['dragon', 'dragon', 2],
];
const TYPES = ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost',
  'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon'];
const SPECIAL = new Set(['fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon']);
const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

function single(attackType, defenderType) {
  const entry = NOT_NEUTRAL.find(([a, d]) => a === attackType && d === defenderType);
  return entry ? entry[2] : 1;
}

// Multiplicador como fracción exacta: 0, 1/4, 1/2, 1, 2 o 4.
function effectiveness(attackType, defenderTypes) {
  let num = 1;
  let den = 1;
  for (const type of defenderTypes) {
    const value = single(attackType, type);
    if (value === 0) return { value: 0, num: 0, den: 1 };
    if (value === 2) num *= 2;
    if (value === 0.5) den *= 2;
  }
  return { value: num / den, num, den };
}

// Estadísticas a nivel 50 sin IV ni EV: PS = ⌊2·B·N/100⌋ + N + 10; demás = ⌊2·B·N/100⌋ + 5.
function stats(base) {
  const scaled = (value) => Math.floor((2 * value * LEVEL) / 100);
  return Object.fromEntries(STAT_ORDER.map((key) => [key, scaled(base[key]) + (key === 'hp' ? LEVEL + 10 : 5)]));
}

const isSpecial = (type) => SPECIAL.has(type);
const criticalChance = (baseSpeed) => Math.min(Math.floor(baseSpeed / 2), 255) / 256;

// Daño base = ⌊⌊⌊2·N/5 + 2⌋ · Poder · A / D⌋ / 50⌋ + 2.
function baseDamage(power, attack, defense) {
  return Math.floor(Math.floor((Math.floor((2 * LEVEL) / 5) + 2) * power * attack / defense) / 50) + 2;
}

// Resultado esperado de un ataque que acierta. `random` es el entero 85–100 que tocó.
function expectedHit({ attacker, defender, move, critical, random }) {
  const eff = effectiveness(move.type, defender.types);
  if (move.fixedDamage) return { effectiveness: eff.value, damage: eff.num === 0 ? 0 : move.fixedDamage };
  const special = isSpecial(move.type);
  const attackStat = attacker.stats[special ? 'special-attack' : 'attack'];
  const defenseStat = defender.stats[special ? 'special-defense' : 'defense'];
  const base = baseDamage(move.power, attackStat, defenseStat);
  const stab = attacker.types.includes(move.type);
  if (eff.num === 0) return { baseDamage: base, stab: stab ? 1.5 : 1, effectiveness: 0, damage: 0 };
  // ⌊base × STAB × efectividad × crítico × variación / 100⌋ con fracciones exactas.
  const num = base * (stab ? 3 : 1) * eff.num * (critical ? 3 : 1) * random;
  const den = (stab ? 2 : 1) * eff.den * (critical ? 2 : 1) * 100;
  return { baseDamage: base, stab: stab ? 1.5 : 1, effectiveness: eff.value, damage: Math.max(1, Math.floor(num / den)) };
}

// Quién actúa primero según la Velocidad de combate (null si empatan).
function firstBySpeed(p1, p2) {
  if (p1.stats.speed === p2.stats.speed) return null;
  return p1.stats.speed > p2.stats.speed ? 'p1' : 'p2';
}

// Generador con semilla para que las pruebas que eligen al azar sean repetibles.
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Estadísticas base y tipos de la primera generación (PokéAPI), usados como datos de prueba.
const SPECIES = {
  bulbasaur: { id: 1, types: ['grass', 'poison'], base: [45, 49, 49, 65, 65, 45] },
  charmander: { id: 4, types: ['fire'], base: [39, 52, 43, 60, 50, 65] },
  squirtle: { id: 7, types: ['water'], base: [44, 48, 65, 50, 64, 43] },
  caterpie: { id: 10, types: ['bug'], base: [45, 30, 35, 20, 20, 45] },
  pidgey: { id: 16, types: ['normal', 'flying'], base: [40, 45, 40, 35, 35, 56] },
  pikachu: { id: 25, types: ['electric'], base: [35, 55, 40, 50, 50, 90] },
  diglett: { id: 50, types: ['ground'], base: [10, 55, 25, 35, 45, 95] },
  abra: { id: 63, types: ['psychic'], base: [25, 20, 15, 105, 55, 90] },
  machop: { id: 66, types: ['fighting'], base: [70, 80, 50, 35, 35, 35] },
  geodude: { id: 74, types: ['rock', 'ground'], base: [40, 80, 100, 30, 30, 20] },
  gastly: { id: 92, types: ['ghost', 'poison'], base: [30, 35, 30, 100, 35, 80] },
  onix: { id: 95, types: ['rock', 'ground'], base: [35, 45, 160, 30, 45, 70] },
  jynx: { id: 124, types: ['ice', 'psychic'], base: [65, 50, 35, 115, 95, 95] },
  gyarados: { id: 130, types: ['water', 'flying'], base: [95, 125, 79, 60, 100, 81] },
  lapras: { id: 131, types: ['water', 'ice'], base: [130, 85, 80, 85, 95, 60] },
  ditto: { id: 132, types: ['normal'], base: [48, 48, 48, 48, 48, 48] },
  snorlax: { id: 143, types: ['normal'], base: [160, 110, 65, 65, 110, 30] },
  dratini: { id: 147, types: ['dragon'], base: [41, 64, 45, 50, 50, 50] },
  mewtwo: { id: 150, types: ['psychic'], base: [106, 110, 90, 154, 90, 130] },
};
const baseOf = (name) => Object.fromEntries(STAT_ORDER.map((key, i) => [key, SPECIES[name].base[i]]));
const recordOf = (name) => ({ id: name, pokemonId: SPECIES[name].id, pokemonName: name,
  types: [...SPECIES[name].types], stats: baseOf(name) });

module.exports = { TYPES, effectiveness, stats, baseDamage, expectedHit, criticalChance, firstBySpeed,
  isSpecial, seeded, SPECIES, STAT_ORDER, recordOf, baseOf };
