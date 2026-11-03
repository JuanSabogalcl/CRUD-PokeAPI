// Reglas numéricas del combate centralizadas en un solo lugar. La interfaz solo las muestra
// (GET /api/combat/rules); nunca las recalcula.
const LEVEL = 50;
const STAB_MULTIPLIER = 1.5;
const CRITICAL_MULTIPLIER = 1.5;
const RANDOM_MIN = 85; // Variación aleatoria entera entre 85 y 100, aplicada como porcentaje.
const RANDOM_MAX = 100;
const MIN_DAMAGE = 1; // Un ataque que acierta y no es inmune hace al menos 1 punto de daño.

// Estadísticas de combate a partir de las base al nivel fijo, sin IV ni EV (fórmula de juegos
// posteriores, aproximación educativa): PS = 2·B·N/100 + N + 10 y resto = 2·B·N/100 + 5, truncando.
function battleStats(base, level = LEVEL) {
  const scaled = (value) => Math.floor((2 * value * level) / 100);
  return {
    hp: scaled(base.hp) + level + 10,
    attack: scaled(base.attack) + 5,
    defense: scaled(base.defense) + 5,
    'special-attack': scaled(base['special-attack']) + 5,
    'special-defense': scaled(base['special-defense']) + 5,
    speed: scaled(base.speed) + 5,
  };
}

// Aproximación de la Gen 1: probabilidad = floor(Velocidad base / 2) / 256, con tope 255/256.
function criticalChance(baseSpeed) {
  return Math.min(Math.floor(baseSpeed / 2), 255) / 256;
}

// Daño base = floor(floor(floor(2·N/5 + 2) · Poder · A / D) / 50) + 2. Se trunca en cada paso.
function baseDamage({ level = LEVEL, power, attack, defense }) {
  const levelFactor = Math.floor((2 * level) / 5) + 2;
  return Math.floor(Math.floor((levelFactor * power * attack) / defense) / 50) + 2;
}

// Daño final = floor(Base · STAB · Efectividad · Crítico · Variación / 100), mínimo 1.
// STAB, efectividad y crítico son potencias de 2 o 1,5, por lo que el producto es exacto en
// coma flotante y el único redondeo es el truncamiento final. Efectividad 0 => daño 0.
function finalDamage({ base, stab, effectiveness, critical, random }) {
  if (effectiveness === 0) return 0;
  return Math.max(MIN_DAMAGE, Math.floor((base * stab * effectiveness * critical * random) / 100));
}

// Generador pseudoaleatorio con semilla (mulberry32). El estado entero se guarda en el combate,
// de modo que con la misma semilla y las mismas elecciones el combate es reproducible.
function nextRandom(holder) {
  holder.rngState = (holder.rngState + 0x6D2B79F5) >>> 0;
  let t = holder.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

module.exports = {
  LEVEL, STAB_MULTIPLIER, CRITICAL_MULTIPLIER, RANDOM_MIN, RANDOM_MAX, MIN_DAMAGE,
  battleStats, criticalChance, baseDamage, finalDamage, nextRandom,
};
