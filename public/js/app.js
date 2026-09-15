const STAT_FIELDS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const GEN1_TOTAL = 151;

const searchForm = document.getElementById('searchForm');
const statsForm = document.getElementById('statsForm');
const apiResult = document.getElementById('apiResult');
const recordsList = document.getElementById('recordsList');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const refreshBtn = document.getElementById('refreshBtn');
const syncGen1Btn = document.getElementById('syncGen1Btn');
const pokemonCatalog = document.getElementById('pokemonCatalog');
const catalogFilter = document.getElementById('catalogFilter');
const pokemonSelect = document.getElementById('pokemonSelect');
const pokemonNameSelect = document.getElementById('pokemonNameSelect');
const recordCount = document.getElementById('recordCount');
const recordsFilter = document.getElementById('recordsFilter');
const toast = document.getElementById('toast');

let editingId = null;
let gen1List = [];
let savedRecords = [];
let savedNames = new Set();
let activePokemonName = 'ditto';

function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

function formatPokemonNumber(id) {
  return `#${String(id).padStart(3, '0')}`;
}

function getFormStats() {
  return Object.fromEntries(
    STAT_FIELDS.map((field) => [field, document.getElementById(field).value]),
  );
}

function setFormStats(stats, pokemonName = '', pokemonId = null) {
  document.getElementById('pokemonName').value = pokemonName;
  if (pokemonName) {
    pokemonNameSelect.value = pokemonName;
  }
  STAT_FIELDS.forEach((field) => {
    document.getElementById(field).value = stats[field] ?? '';
  });

  if (pokemonId) {
    document.getElementById('recordId').dataset.pokemonId = pokemonId;
  }
}

function resetForm() {
  editingId = null;
  document.getElementById('recordId').value = '';
  delete document.getElementById('recordId').dataset.pokemonId;
  statsForm.reset();
  pokemonNameSelect.value = '';
  formTitle.textContent = 'Crear registro';
  submitBtn.textContent = 'Guardar';
  cancelBtn.classList.add('hidden');
}

function populateSelects(list) {
  const options = list
    .map(({ id, name }) => `<option value="${name}">${formatPokemonNumber(id)} ${name}</option>`)
    .join('');

  pokemonSelect.innerHTML = `<option value="">Selecciona un Pokémon...</option>${options}`;
  pokemonNameSelect.innerHTML = `<option value="">Selecciona de la Gen 1...</option>${options}`;

  pokemonSelect.value = 'ditto';
}

function updateRecordCount(total = savedNames.size) {
  recordCount.textContent = `${total} / ${GEN1_TOTAL} registros`;
}

function renderCatalog(filter = '') {
  const query = filter.trim().toLowerCase();

  const filtered = gen1List.filter(({ id, name }) => {
    if (!query) return true;
    return name.includes(query) || String(id).includes(query.replace('#', ''));
  });

  if (filtered.length === 0) {
    pokemonCatalog.innerHTML = '<div class="empty-state">No hay Pokémon que coincidan con el filtro.</div>';
    return;
  }

  pokemonCatalog.innerHTML = filtered
    .map(({ id, name, sprite }) => {
      const isSaved = savedNames.has(name);
      const isActive = activePokemonName === name;

      return `
        <button type="button" class="pokemon-card ${isSaved ? 'saved' : ''} ${isActive ? 'active' : ''}" data-name="${name}">
          <span class="pokemon-card-id">${formatPokemonNumber(id)}</span>
          <img src="${sprite}" alt="${name}" loading="lazy">
          <span class="pokemon-card-name">${name}</span>
          ${isSaved ? '<span class="pokemon-card-badge">Guardado</span>' : ''}
        </button>
      `;
    })
    .join('');
}

function renderApiResult(pokemon) {
  const maxStat = 255;
  const statsHtml = pokemon.statsFormatted
    .map(({ label, value }) => {
      const width = Math.min((value / maxStat) * 100, 100);
      return `
        <div class="stat-row">
          <span class="stat-label">${label}</span>
          <div class="stat-bar"><div class="stat-bar-fill" style="width:${width}%"></div></div>
          <span class="stat-value">${value}</span>
        </div>
      `;
    })
    .join('');

  apiResult.innerHTML = `
    <div class="api-result-header">
      ${pokemon.sprite ? `<img src="${pokemon.sprite}" alt="${pokemon.name}">` : ''}
      <div>
        <h3>${formatPokemonNumber(pokemon.id)} ${pokemon.name}</h3>
        <p class="hint">Datos obtenidos de PokeAPI</p>
      </div>
    </div>
    <div class="stats-bars">${statsHtml}</div>
    <div class="form-actions" style="margin-top:16px">
      <button type="button" class="btn-load" id="loadToFormBtn">Cargar al formulario</button>
    </div>
  `;

  apiResult.classList.remove('hidden');

  document.getElementById('loadToFormBtn').addEventListener('click', () => {
    setFormStats(pokemon.stats, pokemon.name, pokemon.id);
    showToast(`Estadísticas de ${pokemon.name} cargadas al formulario`);
  });
}

async function fetchPokemon(name) {
  const response = await fetch(`/api/pokemon/${encodeURIComponent(name)}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error al buscar Pokémon');
  }

  return data;
}

async function loadGen1List() {
  const response = await fetch('/api/pokemon-list?limit=151');
  const data = await response.json();
  gen1List = data.results;
  populateSelects(gen1List);
  renderCatalog();
}

function renderRecordsList(filter = '') {
  const query = filter.trim().toLowerCase();
  const records = savedRecords.filter((record) => {
    if (!query) return true;
    return record.pokemonName.includes(query)
      || String(record.pokemonId).includes(query.replace('#', ''));
  });

  if (savedRecords.length === 0) {
    recordsList.innerHTML = '<div class="empty-state">No hay registros. Usa "Sincronizar 151 Pokémon" para importar toda la Gen 1.</div>';
    return;
  }

  if (records.length === 0) {
    recordsList.innerHTML = '<div class="empty-state">Ningún registro coincide con el filtro.</div>';
    return;
  }

  recordsList.innerHTML = records
    .map((record) => {
      const statsHtml = record.statsFormatted
        .map(({ label, value }) => `<div class="record-stat"><strong>${label}</strong>${value}</div>`)
        .join('');

      return `
        <article class="record-item" data-id="${record.id}">
          <div class="record-top">
            <div class="record-info">
              ${record.sprite ? `<img class="record-sprite" src="${record.sprite}" alt="${record.pokemonName}">` : ''}
              <div>
                <div class="record-name">${record.pokemonId ? formatPokemonNumber(record.pokemonId) : ''} ${record.pokemonName}</div>
                <div class="record-meta">Actualizado: ${new Date(record.updatedAt).toLocaleString('es-ES')}</div>
              </div>
            </div>
            <div class="record-actions">
              <button type="button" class="btn-view" data-action="view">Ver</button>
              <button type="button" class="btn-edit" data-action="edit">Editar</button>
              <button type="button" class="btn-delete" data-action="delete">Eliminar</button>
            </div>
          </div>
          <div class="record-stats">${statsHtml}</div>
        </article>
      `;
    })
    .join('');
}

async function loadRecords() {
  const response = await fetch('/api/records');
  savedRecords = await response.json();

  savedNames = new Set(savedRecords.map((record) => record.pokemonName));
  updateRecordCount(savedRecords.length);
  renderCatalog(catalogFilter.value);
  renderRecordsList(recordsFilter.value);
}

async function selectPokemon(name) {
  if (!name) return;

  activePokemonName = name;
  document.getElementById('pokemonSearch').value = name;
  pokemonSelect.value = name;
  renderCatalog(catalogFilter.value);

  try {
    const pokemon = await fetchPokemon(name);
    renderApiResult(pokemon);
  } catch (error) {
    apiResult.classList.add('hidden');
    showToast(error.message, 'error');
  }
}

async function syncGen1() {
  syncGen1Btn.disabled = true;
  syncGen1Btn.textContent = 'Sincronizando...';

  try {
    const response = await fetch('/api/records/sync-gen1', { method: 'POST' });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al sincronizar');
    }

    showToast(`${data.message} (${data.created} nuevos, ${data.updated} actualizados)`);
    await loadRecords();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    syncGen1Btn.disabled = false;
    syncGen1Btn.textContent = 'Sincronizar 151 Pokémon';
  }
}

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = pokemonSelect.value || document.getElementById('pokemonSearch').value.trim();
  await selectPokemon(name);
  showToast(`Pokémon ${name} encontrado`);
});

pokemonSelect.addEventListener('change', (event) => {
  if (event.target.value) {
    selectPokemon(event.target.value);
  }
});

pokemonNameSelect.addEventListener('change', (event) => {
  if (event.target.value) {
    document.getElementById('pokemonName').value = event.target.value;
  }
});

catalogFilter.addEventListener('input', (event) => {
  renderCatalog(event.target.value);
});

recordsFilter.addEventListener('input', (event) => {
  renderRecordsList(event.target.value);
});

pokemonCatalog.addEventListener('click', (event) => {
  const card = event.target.closest('.pokemon-card');
  if (!card) return;
  selectPokemon(card.dataset.name);
});

syncGen1Btn.addEventListener('click', syncGen1);

statsForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const pokemonName = document.getElementById('pokemonName').value.trim();
  const stats = getFormStats();
  const pokemonId = document.getElementById('recordId').dataset.pokemonId;
  const payload = {
    pokemonName,
    stats,
    pokemonId: pokemonId ? Number(pokemonId) : undefined,
  };

  try {
    const url = editingId ? `/api/records/${editingId}` : '/api/records';
    const method = editingId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al guardar');
    }

    showToast(editingId ? 'Registro actualizado' : 'Registro creado');
    resetForm();
    await loadRecords();
  } catch (error) {
    showToast(error.message, 'error');
  }
});

cancelBtn.addEventListener('click', resetForm);
refreshBtn.addEventListener('click', loadRecords);

recordsList.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const item = button.closest('.record-item');
  const id = item.dataset.id;
  const action = button.dataset.action;

  if (action === 'view') {
    const response = await fetch(`/api/records/${id}`);
    const record = await response.json();
    await selectPokemon(record.pokemonName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (action === 'edit') {
    const response = await fetch(`/api/records/${id}`);
    const record = await response.json();

    editingId = record.id;
    document.getElementById('recordId').value = record.id;
    if (record.pokemonId) {
      document.getElementById('recordId').dataset.pokemonId = record.pokemonId;
    }
    setFormStats(record.stats, record.pokemonName, record.pokemonId);
    formTitle.textContent = 'Editar registro';
    submitBtn.textContent = 'Actualizar';
    cancelBtn.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (action === 'delete') {
    if (!confirm('¿Eliminar este registro?')) return;

    const response = await fetch(`/api/records/${id}`, { method: 'DELETE' });
    const data = await response.json();

    if (!response.ok) {
      showToast(data.error || 'Error al eliminar', 'error');
      return;
    }

    showToast('Registro eliminado');
    if (editingId === id) resetForm();
    await loadRecords();
  }
});

async function init() {
  await loadGen1List();
  await loadRecords();
  await selectPokemon('ditto');
}

init();
