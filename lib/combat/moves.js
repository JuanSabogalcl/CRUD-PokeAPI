// Catálogo propio de movimientos: el proyecto no almacena movimientos y la PokeAPI lista cientos
// por Pokémon, así que se define un subconjunto fijo. Poder y precisión son los valores de la
// primera generación (consultables en https://pokeapi.co/api/v2/move/{nombre} -> past_values).
// Solo se modela el daño directo: efectos secundarios (quemar, drenar, prioridad, dos turnos,
// golpes múltiples o mayor probabilidad de crítico) quedan fuera del alcance.
// accuracy: null = el movimiento nunca falla. fixedDamage: daño fijo que ignora la fórmula.
const MOVES = {
  tackle: { name: 'Placaje', type: 'normal', power: 35, accuracy: 95 },
  'body-slam': { name: 'Golpe Cuerpo', type: 'normal', power: 85, accuracy: 100 },
  slam: { name: 'Atizar', type: 'normal', power: 80, accuracy: 75 },
  swift: { name: 'Rapidez', type: 'normal', power: 60, accuracy: null },
  ember: { name: 'Ascuas', type: 'fire', power: 40, accuracy: 100 },
  flamethrower: { name: 'Lanzallamas', type: 'fire', power: 95, accuracy: 100 },
  'fire-blast': { name: 'Llamarada', type: 'fire', power: 120, accuracy: 85 },
  'water-gun': { name: 'Pistola Agua', type: 'water', power: 40, accuracy: 100 },
  surf: { name: 'Surf', type: 'water', power: 95, accuracy: 100 },
  'hydro-pump': { name: 'Hidrobomba', type: 'water', power: 120, accuracy: 80 },
  'thunder-shock': { name: 'Impactrueno', type: 'electric', power: 40, accuracy: 100 },
  thunderbolt: { name: 'Rayo', type: 'electric', power: 95, accuracy: 100 },
  thunder: { name: 'Trueno', type: 'electric', power: 120, accuracy: 70 },
  'vine-whip': { name: 'Látigo Cepa', type: 'grass', power: 35, accuracy: 100 },
  'razor-leaf': { name: 'Hoja Afilada', type: 'grass', power: 55, accuracy: 95 },
  'mega-drain': { name: 'Megaagotar', type: 'grass', power: 40, accuracy: 100 },
  'aurora-beam': { name: 'Rayo Aurora', type: 'ice', power: 65, accuracy: 100 },
  'ice-beam': { name: 'Rayo Hielo', type: 'ice', power: 95, accuracy: 100 },
  blizzard: { name: 'Ventisca', type: 'ice', power: 120, accuracy: 90 },
  'low-kick': { name: 'Patada Baja', type: 'fighting', power: 50, accuracy: 90 },
  submission: { name: 'Sumisión', type: 'fighting', power: 80, accuracy: 80 },
  acid: { name: 'Ácido', type: 'poison', power: 40, accuracy: 100 },
  sludge: { name: 'Lodo', type: 'poison', power: 65, accuracy: 100 },
  'bone-club': { name: 'Hueso Palo', type: 'ground', power: 65, accuracy: 85 },
  earthquake: { name: 'Terremoto', type: 'ground', power: 100, accuracy: 100 },
  'wing-attack': { name: 'Ataque Ala', type: 'flying', power: 35, accuracy: 100 },
  'drill-peck': { name: 'Pico Taladro', type: 'flying', power: 80, accuracy: 100 },
  confusion: { name: 'Confusión', type: 'psychic', power: 50, accuracy: 100 },
  psychic: { name: 'Psíquico', type: 'psychic', power: 90, accuracy: 100 },
  'leech-life': { name: 'Chupavidas', type: 'bug', power: 20, accuracy: 100 },
  'rock-throw': { name: 'Lanzarrocas', type: 'rock', power: 50, accuracy: 65 },
  'rock-slide': { name: 'Avalancha', type: 'rock', power: 75, accuracy: 90 },
  lick: { name: 'Lengüetazo', type: 'ghost', power: 20, accuracy: 100 },
  'dragon-rage': { name: 'Furia Dragón', type: 'dragon', power: null, accuracy: 100, fixedDamage: 40 },
};

// En la Gen 1 la categoría depende del tipo del movimiento, no del movimiento en sí.
const SPECIAL_TYPES = ['fire', 'water', 'electric', 'grass', 'ice', 'psychic', 'dragon'];
const moveCategory = (type) => (SPECIAL_TYPES.includes(type) ? 'special' : 'physical');

// Movimientos por tipo en orden de preferencia: principal y alternativo (suele ser menos preciso).
const TYPE_MOVES = {
  normal: ['body-slam', 'slam'],
  fire: ['flamethrower', 'fire-blast'],
  water: ['surf', 'hydro-pump'],
  electric: ['thunderbolt', 'thunder'],
  grass: ['razor-leaf', 'vine-whip'],
  ice: ['ice-beam', 'blizzard'],
  fighting: ['low-kick', 'submission'],
  poison: ['sludge', 'acid'],
  ground: ['earthquake', 'bone-club'],
  flying: ['drill-peck', 'wing-attack'],
  psychic: ['psychic', 'confusion'],
  bug: ['leech-life'],
  rock: ['rock-slide', 'rock-throw'],
  ghost: ['lick'],
  dragon: ['dragon-rage'],
};
const FILLER_MOVES = ['tackle', 'swift', 'slam'];
const MOVESET_SIZE = 4;

// Conjunto determinista de 4 movimientos: el principal de cada tipo, el alternativo del tipo
// primario y movimientos Normales de relleno (Placaje permite comparar ataques sin STAB).
function movesetFor(types) {
  const [primary, secondary] = types;
  const candidates = [TYPE_MOVES[primary]?.[0], TYPE_MOVES[secondary]?.[0], TYPE_MOVES[primary]?.[1],
    ...FILLER_MOVES];
  return [...new Set(candidates.filter(Boolean))].slice(0, MOVESET_SIZE);
}

function describeMove(id) {
  const move = MOVES[id];
  return { id, ...move, category: moveCategory(move.type) };
}

module.exports = { MOVES, TYPE_MOVES, moveCategory, movesetFor, describeMove };
