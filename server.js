const express = require('express');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('node:crypto');
const { validateRecord } = require('./lib/validation');
const { fetchJson } = require('./lib/pokeapi-client');
const {
  STAT_LABELS,
  GEN1_LIMIT,
  mapStatsFromApi,
  getSpriteUrl,
  syncGen1Records: syncGen1FromApi,
} = require('./lib/pokeapi-sync');
const { mapTypesFromApi } = require('./lib/combat/types');
const { registerCombatRoutes } = require('./lib/combat/routes');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'records.json');
const POKEAPI_BASE = process.env.POKEAPI_BASE || 'https://pokeapi.co/api/v2/pokemon';

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
    types: mapTypesFromApi(data),
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
  return fetchJson(`${POKEAPI_BASE}?limit=${limit}&offset=${offset}`);
}

async function fetchPokemonData(nameOrId) {
  return fetchJson(`${POKEAPI_BASE}/${encodeURIComponent(nameOrId)}`);
}

app.get('/api/stats-labels', (_req, res) => {
  res.json(STAT_LABELS);
});

app.get('/api/pokemon-list', async (req, res) => {
  const parseInteger = (value, fallback) => value === undefined ? fallback
    : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  const requestedLimit = parseInteger(req.query.limit, GEN1_LIMIT);
  const offset = parseInteger(req.query.offset, 0);
  if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1
    || !Number.isSafeInteger(offset) || offset < 0) {
    return res.status(400).json({ error: 'limit debe ser un entero positivo y offset un entero no negativo' });
  }
  if (offset >= GEN1_LIMIT) return res.json({ count: GEN1_LIMIT, totalGen1: GEN1_LIMIT, results: [] });
  const limit = Math.min(requestedLimit, GEN1_LIMIT - offset);

  try {
    const listData = await fetchPokemonList(limit, offset);

    res.json({
      count: GEN1_LIMIT,
      totalGen1: GEN1_LIMIT,
      results: listData.results.map((item, index) => ({
        id: offset + index + 1,
        name: item.name,
        url: item.url,
        sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${offset + index + 1}.png`,
      })),
    });
  } catch (error) {
    res.status(error.status === 504 ? 504 : 502).json({ error: error.message || 'Error al conectar con PokeAPI' });
  }
});

app.get('/api/pokemon/:name', async (req, res) => {
  const name = req.params.name.trim().toLowerCase();

  try {
    const data = await fetchPokemonData(name);
    res.json(formatPokemonResponse(data));
  } catch (error) {
    const status = error.status || 502;
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
  } catch (error) {
    res.status(error.status === 504 ? 504 : 502).json({ error: 'Error al sincronizar la Gen 1 desde PokeAPI' });
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
  const validation = validateRecord(req.body);
  if (validation.error) return res.status(400).json({ error: validation.error });
  const { pokemonName, stats } = validation.value;

  const records = readRecords();
  const newRecord = {
    id: randomUUID(),
    pokemonName,
    pokemonId: req.body.pokemonId || null,
    sprite: req.body.sprite || null,
    stats,
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

  const validation = validateRecord(req.body, true);
  if (validation.error) return res.status(400).json({ error: validation.error });
  const { pokemonName, stats } = validation.value;
  const current = records[index];

  if (pokemonName) {
    current.pokemonName = pokemonName;
  }

  if (stats) {
    current.stats = { ...current.stats, ...stats };
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

registerCombatRoutes(app, { readRecords, writeRecords, fetchPokemonData });

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

// Express entrega JSON también para errores del parser y del almacenamiento.
app.use((error, _req, res, _next) => {
  const status = error.status >= 400 && error.status < 500 ? error.status : 500;
  res.status(status).json({ error: status === 400 ? 'El cuerpo debe contener JSON válido'
    : status === 413 ? 'El cuerpo excede el tamaño permitido' : 'No se pudo procesar la solicitud' });
});

const server = app.listen(PORT, process.env.HOST || '127.0.0.1', () => {
  ensureDataFile();
  console.log(`Servidor CRUD PokeAPI en http://localhost:${server.address().port}`);
  if (process.send) process.send({ port: server.address().port });
  if (process.env.AUTO_SYNC_GEN1 !== 'false') bootstrapGen1();
});
