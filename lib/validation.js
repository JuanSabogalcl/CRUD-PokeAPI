const { STAT_LABELS } = require('./pokeapi-sync');
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const NAME_MAX = 40;
const POKEMON_ID_MAX = 100000; // PokeAPI usa números por encima de 10000 para formas alternativas.
const SPRITE_MAX = 500;
// Sin etiquetas HTML ni caracteres de control (D08); sí acentos, puntos, apóstrofos y ♀/♂.
const UNSAFE_NAME = /[<>\u0000-\u001f\u007f]/;
// Solo URL http(s) sin espacios, comillas ni ángulos: evita javascript:, data: y romper atributos (D09).
const SAFE_URL = /^https?:\/\/[^\s"'<>`]+$/i;

// Se conserva el contrato del formulario: enteros entre 1 y 999 y cadenas numéricas.
function parseInteger(raw, min, max) {
  const number = Number(raw);
  if (!['string', 'number'].includes(typeof raw) || (typeof raw === 'string' && !raw.trim())
    || !Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

function validateRecord(body, partial = false) {
  if (!isObject(body)) return { error: 'El cuerpo debe ser un objeto JSON' };
  const value = {};
  if (!partial || Object.hasOwn(body, 'pokemonName')) {
    if (typeof body.pokemonName !== 'string' || !body.pokemonName.trim()) {
      return { error: 'El nombre del Pokémon debe ser un texto no vacío' };
    }
    const name = body.pokemonName.trim().toLowerCase();
    if (name.length > NAME_MAX) return { error: `El nombre del Pokémon admite máximo ${NAME_MAX} caracteres` };
    if (UNSAFE_NAME.test(name)) return { error: 'El nombre del Pokémon no puede contener < > ni caracteres de control' };
    value.pokemonName = name;
  }
  if (!partial || Object.hasOwn(body, 'stats')) {
    if (!isObject(body.stats)) return { error: 'Las estadísticas deben ser un objeto JSON' };
    value.stats = {};
    for (const key of Object.keys(STAT_LABELS)) {
      if (partial && !Object.hasOwn(body.stats, key)) continue;
      const number = parseInteger(body.stats[key], 1, 999);
      if (number === null) return { error: `La estadística ${key} debe ser un entero entre 1 y 999` };
      value.stats[key] = number;
    }
  }
  // Campos opcionales: ausentes o null significan "sin dato".
  if (body.pokemonId === null) {
    value.pokemonId = null;
  } else if (body.pokemonId !== undefined) {
    value.pokemonId = parseInteger(body.pokemonId, 1, POKEMON_ID_MAX);
    if (value.pokemonId === null) return { error: `pokemonId debe ser un entero entre 1 y ${POKEMON_ID_MAX}` };
  }
  if (body.sprite === null) {
    value.sprite = null;
  } else if (body.sprite !== undefined) {
    if (typeof body.sprite !== 'string' || body.sprite.length > SPRITE_MAX || !SAFE_URL.test(body.sprite)) {
      return { error: `sprite debe ser una URL http o https de máximo ${SPRITE_MAX} caracteres, sin espacios ni comillas` };
    }
    value.sprite = body.sprite;
  }
  return { value };
}

// Identificador para consultar PokeAPI: nombre como lo usa PokeAPI (letras, números y guiones) o número (D12).
function parsePokemonQuery(raw) {
  const query = String(raw ?? '').trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(query) ? query : null;
}

module.exports = { validateRecord, parsePokemonQuery, NAME_MAX };
