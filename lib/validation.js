const { STAT_LABELS } = require('./pokeapi-sync');
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// Se conserva el contrato del formulario: enteros entre 1 y 999 y cadenas numéricas.
function validateRecord(body, partial = false) {
  if (!isObject(body)) return { error: 'El cuerpo debe ser un objeto JSON' };
  const value = {};
  if (!partial || Object.hasOwn(body, 'pokemonName')) {
    if (typeof body.pokemonName !== 'string' || !body.pokemonName.trim()) {
      return { error: 'El nombre del Pokémon debe ser un texto no vacío' };
    }
    value.pokemonName = body.pokemonName.trim().toLowerCase();
  }
  if (!partial || Object.hasOwn(body, 'stats')) {
    if (!isObject(body.stats)) return { error: 'Las estadísticas deben ser un objeto JSON' };
    value.stats = {};
    for (const key of Object.keys(STAT_LABELS)) {
      if (partial && !Object.hasOwn(body.stats, key)) continue;
      const raw = body.stats[key];
      const number = Number(raw);
      if (!['string','number'].includes(typeof raw) || (typeof raw === 'string' && !raw.trim())
        || !Number.isInteger(number) || number < 1 || number > 999) {
        return { error: `La estadística ${key} debe ser un entero entre 1 y 999` };
      }
      value.stats[key] = number;
    }
  }
  return { value };
}
module.exports = { validateRecord };
