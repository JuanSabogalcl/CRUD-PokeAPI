const fs = require('fs');
const path = require('path');

const POKEAPI_BASE = 'https://pokeapi.co/api/v2/pokemon';
const GEN1_LIMIT = 151;
const FETCH_BATCH_SIZE = 20;

const STAT_LABELS = {
  hp: 'PS (Puntos de Salud)',
  attack: 'Ataque',
  defense: 'Defensa',
  'special-attack': 'Ataque Especial',
  'special-defense': 'Defensa Especial',
  speed: 'Velocidad',
};

function getDataFile(baseDir) {
  return path.join(baseDir, 'data', 'records.json');
}

function ensureDataFile(dataFile) {
  const dataDir = path.dirname(dataFile);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify([], null, 2));
  }
}

function readRecords(dataFile) {
  ensureDataFile(dataFile);
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function writeRecords(dataFile, records) {
  ensureDataFile(dataFile);
  fs.writeFileSync(dataFile, JSON.stringify(records, null, 2));
}

function mapStatsFromApi(stats) {
  const mapped = {};
  for (const entry of stats) {
    const name = entry.stat.name;
    if (STAT_LABELS[name]) {
      mapped[name] = entry.base_stat;
    }
  }
  return mapped;
}

function getSpriteUrl(data) {
  return data.sprites?.other?.['official-artwork']?.front_default
    || data.sprites?.front_default
    || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${data.id}.png`;
}

function recordFromPokemon(data) {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    pokemonId: data.id,
    pokemonName: data.name,
    sprite: getSpriteUrl(data),
    stats: mapStatsFromApi(data.stats),
    createdAt: now,
    updatedAt: now,
  };
}

async function fetchPokemonList(limit = GEN1_LIMIT, offset = 0) {
  const response = await fetch(`${POKEAPI_BASE}?limit=${limit}&offset=${offset}`);
  if (!response.ok) {
    throw new Error('No se pudo obtener la lista de Pokémon');
  }

  return response.json();
}

async function syncGen1Records(baseDir = path.join(__dirname, '..')) {
  const dataFile = getDataFile(baseDir);
  const listData = await fetchPokemonList(GEN1_LIMIT, 0);
  const records = readRecords(dataFile);
  const byName = new Map(records.map((record) => [record.pokemonName, record]));
  let created = 0;
  let updated = 0;

  for (let index = 0; index < listData.results.length; index += FETCH_BATCH_SIZE) {
    const batch = listData.results.slice(index, index + FETCH_BATCH_SIZE);
    const batchData = await Promise.all(
      batch.map((item) => fetch(item.url).then((response) => response.json())),
    );

    for (const data of batchData) {
      const existing = byName.get(data.name);

      if (existing) {
        existing.pokemonId = data.id;
        existing.sprite = getSpriteUrl(data);
        existing.stats = mapStatsFromApi(data.stats);
        existing.updatedAt = new Date().toISOString();
        updated += 1;
      } else {
        const record = recordFromPokemon(data);
        records.push(record);
        byName.set(data.name, record);
        created += 1;
      }
    }
  }

  records.sort((a, b) => (a.pokemonId || 9999) - (b.pokemonId || 9999));
  writeRecords(dataFile, records);

  return {
    created,
    updated,
    total: records.length,
    expected: GEN1_LIMIT,
  };
}

module.exports = {
  STAT_LABELS,
  GEN1_LIMIT,
  mapStatsFromApi,
  getSpriteUrl,
  syncGen1Records,
};
