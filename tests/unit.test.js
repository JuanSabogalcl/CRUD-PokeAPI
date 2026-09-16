const { mapStatsFromApi, getSpriteUrl, STAT_LABELS } = require('../lib/pokeapi-sync');

// Nivel UNITARIA: funciones puras de lib/pokeapi-sync.js, sin servidor ni red.
// Tipo: funcional (entrada -> proceso -> salida verificable).

describe('UNITARIA - mapStatsFromApi', () => {
  test('UNI-01 extrae solo las 6 estadísticas conocidas y descarta las demás', () => {
    const statsApi = [
      { stat: { name: 'hp' }, base_stat: 45 },
      { stat: { name: 'attack' }, base_stat: 49 },
      { stat: { name: 'defense' }, base_stat: 49 },
      { stat: { name: 'special-attack' }, base_stat: 65 },
      { stat: { name: 'special-defense' }, base_stat: 65 },
      { stat: { name: 'speed' }, base_stat: 45 },
      { stat: { name: 'stat-desconocida-de-otra-generacion' }, base_stat: 999 },
    ];

    const result = mapStatsFromApi(statsApi);

    expect(Object.keys(result).sort()).toEqual(Object.keys(STAT_LABELS).sort());
    expect(result).not.toHaveProperty('stat-desconocida-de-otra-generacion');
    expect(result.hp).toBe(45);
    expect(result.speed).toBe(45);
  });

  test('UNI-02 con una lista vacía devuelve un objeto vacío (caso borde)', () => {
    expect(mapStatsFromApi([])).toEqual({});
  });
});

describe('UNITARIA - getSpriteUrl', () => {
  test('UNI-03 prioriza el artwork oficial cuando existe', () => {
    const data = {
      id: 25,
      sprites: {
        front_default: 'https://ejemplo/front.png',
        other: { 'official-artwork': { front_default: 'https://ejemplo/official.png' } },
      },
    };

    expect(getSpriteUrl(data)).toBe('https://ejemplo/official.png');
  });

  test('UNI-04 si no hay artwork oficial, usa el sprite frontal por defecto', () => {
    const data = { id: 25, sprites: { front_default: 'https://ejemplo/front.png' } };

    expect(getSpriteUrl(data)).toBe('https://ejemplo/front.png');
  });

  test('UNI-05 sin ningún sprite disponible, arma la URL de respaldo por id', () => {
    const data = { id: 25, sprites: {} };

    expect(getSpriteUrl(data)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    );
  });
});
