const express = require('express');
const fs = require('fs');
const path = require('path');
const {
  STAT_LABELS,
  GEN1_LIMIT,
  mapStatsFromApi,
  getSpriteUrl,
  syncGen1Records: syncGen1FromApi,
} = require('./lib/pokeapi-sync');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'records.json');
const POKEAPI_BASE = 'https://pokeapi.co/api/v2/pokemon';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
  }
}

function readRecords() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeRecords(records) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2));
}

function formatPokemonResponse(data) {
  const stats = mapStatsFromApi(data.stats);

  return {
    id: data.id,
    name: data.name,
    sprite: getSpriteUrl(data),
    stats,
    statsFormatted: Object.entries(stats).map(([key, value]) => ({
      key,
      label: STAT_LABELS[key],
      value,
    })),
  };
}

function formatRecord(record) {
  return {
    ...record,
    sprite: record.sprite
      || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${record.pokemonId || 0}.png`,
    statsFormatted: Object.entries(record.stats).map(([key, value]) => ({
      key,
      label: STAT_LABELS[key],
      value,
    })),
  };
}

async function fetchPokemonList(limit = GEN1_LIMIT, offset = 0) {
  const response = await fetch(`${POKEAPI_BASE}?limit=${limit}&offset=${offset}`);
  if (!response.ok) {
    throw new Error('No se pudo obtener la lista de Pokémon');
  }

  return response.json();
}

async function fetchPokemonData(nameOrId) {
  const response = await fetch(`${POKEAPI_BASE}/${nameOrId}`);
  if (!response.ok) {
    throw new Error(`Pokémon "${nameOrId}" no encontrado`);
  }

  return response.json();
}

app.get('/api/stats-labels', (_req, res) => {
  res.json(STAT_LABELS);
});

app.get('/api/pokemon-list', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || GEN1_LIMIT, GEN1_LIMIT);
  const offset = Number(req.query.offset) || 0;

  try {
    const listData = await fetchPokemonList(limit, offset);

    res.json({
      count: listData.count,
      totalGen1: GEN1_LIMIT,
      results: listData.results.map((item, index) => ({
        id: offset + index + 1,
        name: item.name,
        url: item.url,
        sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${offset + index + 1}.png`,
      })),
    });
  } catch {
    res.status(500).json({ error: 'Error al conectar con PokeAPI' });
  }
});

app.get('/api/pokemon/:name', async (req, res) => {
  const name = req.params.name.trim().toLowerCase();

  try {
    const data = await fetchPokemonData(name);
    res.json(formatPokemonResponse(data));
  } catch (error) {
    const status = error.message.includes('no encontrado') ? 404 : 500;
    res.status(status).json({ error: error.message || 'Error al conectar con PokeAPI' });
  }
});

app.post('/api/records/sync-gen1', async (_req, res) => {
  try {
    const result = await syncGen1FromApi(__dirname);
    res.json({
      message: `Sincronizados ${result.total} Pokémon de la Gen 1`,
      ...result,
    });
  } catch {
    res.status(500).json({ error: 'Error al sincronizar la Gen 1 desde PokeAPI' });
  }
});

app.get('/api/records', (_req, res) => {
  const records = readRecords().map(formatRecord);
  res.json(records);
});

app.get('/api/records/:id', (req, res) => {
  const records = readRecords();
  const record = records.find((r) => r.id === req.params.id);

  if (!record) {
    return res.status(404).json({ error: 'Registro no encontrado' });
  }

  res.json(formatRecord(record));
});

app.post('/api/records', (req, res) => {
  const { pokemonName, stats } = req.body;

  if (!pokemonName || !stats) {
    return res.status(400).json({ error: 'Nombre del Pokémon y estadísticas son requeridos' });
  }

  const missing = Object.keys(STAT_LABELS).filter(
    (key) => stats[key] === undefined || stats[key] === null || stats[key] === '',
  );

  if (missing.length > 0) {
    return res.status(400).json({ error: 'Todas las estadísticas son requeridas' });
  }

  const records = readRecords();
  const newRecord = {
    id: crypto.randomUUID(),
    pokemonName: pokemonName.toLowerCase(),
    pokemonId: req.body.pokemonId || null,
    sprite: req.body.sprite || null,
    stats: Object.fromEntries(
      Object.keys(STAT_LABELS).map((key) => [key, Number(stats[key])]),
    ),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  records.push(newRecord);
  writeRecords(records);

  res.status(201).json(formatRecord(newRecord));
});

app.put('/api/records/:id', (req, res) => {
  const records = readRecords();
  const index = records.findIndex((r) => r.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Registro no encontrado' });
  }

  const { pokemonName, stats } = req.body;
  const current = records[index];

  if (pokemonName) {
    current.pokemonName = pokemonName.toLowerCase();
  }

  if (stats) {
    current.stats = Object.fromEntries(
      Object.keys(STAT_LABELS).map((key) => [
        key,
        stats[key] !== undefined ? Number(stats[key]) : current.stats[key],
      ]),
    );
  }

  current.updatedAt = new Date().toISOString();
  records[index] = current;
  writeRecords(records);

  res.json(formatRecord(current));
});

app.delete('/api/records/:id', (req, res) => {
  const records = readRecords();
  const index = records.findIndex((r) => r.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Registro no encontrado' });
  }

  const [deleted] = records.splice(index, 1);
  writeRecords(records);

  res.json({ message: 'Registro eliminado', record: formatRecord(deleted) });
});

async function bootstrapGen1() {
  const records = readRecords();
  if (records.length >= GEN1_LIMIT) {
    console.log(`Gen 1 lista: ${records.length}/${GEN1_LIMIT} Pokémon cargados`);
    return;
  }

  console.log(`Importando Gen 1 desde PokeAPI (${records.length}/${GEN1_LIMIT})...`);
  try {
    const result = await syncGen1FromApi(__dirname);
    console.log(`Gen 1 sincronizada: ${result.total} registros (${result.created} nuevos, ${result.updated} actualizados)`);
  } catch (error) {
    console.error('No se pudo sincronizar la Gen 1 al iniciar:', error.message);
  }
}

app.listen(PORT, () => {
  ensureDataFile();
  console.log(`Servidor CRUD PokeAPI en http://localhost:${PORT}`);
  bootstrapGen1();
});
