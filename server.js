const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'records.json');
const POKEAPI_BASE = 'https://pokeapi.co/api/v2/pokemon';

const STAT_LABELS = {
  hp: 'PS (Puntos de Salud)',
  attack: 'Ataque',
  defense: 'Defensa',
  'special-attack': 'Ataque Especial',
  'special-defense': 'Defensa Especial',
  speed: 'Velocidad',
};

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

function formatRecord(record) {
  return {
    ...record,
    statsFormatted: Object.entries(record.stats).map(([key, value]) => ({
      key,
      label: STAT_LABELS[key],
      value,
    })),
  };
}

app.get('/api/stats-labels', (_req, res) => {
  res.json(STAT_LABELS);
});

app.get('/api/pokemon/:name', async (req, res) => {
  const name = req.params.name.trim().toLowerCase();

  try {
    const response = await fetch(`${POKEAPI_BASE}/${name}`);
    if (!response.ok) {
      return res.status(response.status).json({ error: `Pokémon "${name}" no encontrado` });
    }

    const data = await response.json();
    const stats = mapStatsFromApi(data.stats);

    res.json({
      id: data.id,
      name: data.name,
      sprite: data.sprites?.other?.['official-artwork']?.front_default
        || data.sprites?.front_default,
      stats,
      statsFormatted: Object.entries(stats).map(([key, value]) => ({
        key,
        label: STAT_LABELS[key],
        value,
      })),
    });
  } catch {
    res.status(500).json({ error: 'Error al conectar con PokeAPI' });
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

app.listen(PORT, () => {
  ensureDataFile();
  console.log(`Servidor CRUD PokeAPI en http://localhost:${PORT}`);
});
