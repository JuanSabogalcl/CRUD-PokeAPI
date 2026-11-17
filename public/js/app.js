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
let saving = false; // Evita guardar dos veces con un doble clic o Enter repetido (D18).
let searchTicket = 0; // Solo se muestra la respuesta de la última búsqueda pedida (D21).
const deleting = new Set(); // Registros con un borrado en curso (D23).
let gen1List = [];
let savedRecords = [];
let savedNames = new Set();
let activePokemonName = 'ditto';
// Pokémon cuyos datos se cargaron en el formulario: su número solo se envía si el nombre no cambia.
let formPokemon = { name: '', id: null };

function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

function formatPokemonNumber(id) {
  return `#${String(id).padStart(3, '0')}`;
}

// Convierte lo que escribe el usuario al nombre que usa PokeAPI: «#025» → «25», «Mr. Mime» → «mr-mime»,
// «Nidoran♀» → «nidoran-f», «Farfetch'd» → «farfetchd» (D22).
function toPokeApiName(text) {
  const value = text.trim().toLowerCase().replace(/^#/, '');
  if (/^\d+$/.test(value)) return String(Number(value));
  return value.replace(/♀/g, '-f').replace(/♂/g, '-m').replace(/['’.]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-');
}

// Todo dato que viene de la API se escapa antes de insertarlo como HTML (D08).
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
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
  formPokemon = { name: pokemonName, id: pokemonId };
}

function resetForm() {
  editingId = null;
  document.getElementById('recordId').value = '';
  delete document.getElementById('recordId').dataset.pokemonId;
  statsForm.reset();
  pokemonNameSelect.value = '';
  formPokemon = { name: '', id: null };
  formTitle.textContent = 'Crear registro';
  submitBtn.textContent = 'Guardar';
  cancelBtn.classList.add('hidden');
}

function populateSelects(list) {
  const options = list
    .map(({ id, name }) => `<option value="${escapeHtml(name)}">${formatPokemonNumber(id)} ${escapeHtml(name)}</option>`)
    .join('');

  pokemonSelect.innerHTML = `<option value="">Selecciona un Pokémon...</option>${options}`;
  pokemonNameSelect.innerHTML = `<option value="">Selecciona de la Gen 1...</option>${options}`;

  pokemonSelect.value = list.some(({ name }) => name === 'ditto') ? 'ditto' : '';
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

  if (gen1List.length === 0) {
    pokemonCatalog.innerHTML = '<div class="empty-state">No se pudo cargar el catálogo desde PokeAPI. Los registros guardados siguen disponibles más abajo.</div>';
    return;
  }

  if (filtered.length === 0) {
    pokemonCatalog.innerHTML = '<div class="empty-state">No hay Pokémon que coincidan con el filtro.</div>';
    return;
  }

  pokemonCatalog.innerHTML = filtered
    .map(({ id, name, sprite }) => {
      const isSaved = savedNames.has(name);
      const isActive = activePokemonName === name;

      return `
        <button type="button" class="pokemon-card ${isSaved ? 'saved' : ''} ${isActive ? 'active' : ''}" data-name="${escapeHtml(name)}">
          <span class="pokemon-card-id">${formatPokemonNumber(id)}</span>
          <img src="${escapeHtml(sprite)}" alt="${escapeHtml(name)}" loading="lazy">
          <span class="pokemon-card-name">${escapeHtml(name)}</span>
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
          <span class="stat-label">${escapeHtml(label)}</span>
          <div class="stat-bar"><div class="stat-bar-fill" style="width:${width}%"></div></div>
          <span class="stat-value">${value}</span>
        </div>
      `;
    })
    .join('');

  apiResult.innerHTML = `
    <div class="api-result-header">
      ${pokemon.sprite ? `<img src="${escapeHtml(pokemon.sprite)}" alt="${escapeHtml(pokemon.name)}">` : ''}
      <div>
        <h3>${formatPokemonNumber(pokemon.id)} ${escapeHtml(pokemon.name)}</h3>
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

// Si PokeAPI falla, el catálogo queda vacío con un aviso, pero el resto de la página sigue (D11).
async function loadGen1List() {
  try {
    const response = await fetch('/api/pokemon-list?limit=151');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo cargar el catálogo');
    gen1List = data.results;
  } catch (error) {
    gen1List = [];
    showToast(`Catálogo no disponible: ${error.message}`, 'error');
  }
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
        .map(({ label, value }) => `<div class="record-stat"><strong>${escapeHtml(label)}</strong>${escapeHtml(value)}</div>`)
        .join('');

      return `
        <article class="record-item" data-id="${escapeHtml(record.id)}">
          <div class="record-top">
            <div class="record-info">
              ${record.sprite ? `<img class="record-sprite" src="${escapeHtml(record.sprite)}" alt="${escapeHtml(record.pokemonName)}">` : ''}
              <div>
                <div class="record-name">${record.pokemonId ? formatPokemonNumber(record.pokemonId) : ''} ${escapeHtml(record.pokemonName)}</div>
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
  const data = await response.json();
  if (!response.ok) {
    showToast(data.error || 'No se pudieron cargar los registros', 'error');
    return;
  }
  savedRecords = data;

  savedNames = new Set(savedRecords.map((record) => record.pokemonName));
  updateRecordCount(savedRecords.length);
  renderCatalog(catalogFilter.value);
  renderRecordsList(recordsFilter.value);
}

// Devuelve si se encontró, para no anunciar "encontrado" cuando la consulta falla (D10).
async function selectPokemon(name) {
  if (!name) return false;
  const ticket = ++searchTicket;

  activePokemonName = name;
  document.getElementById('pokemonSearch').value = name;
  pokemonSelect.value = name;
  renderCatalog(catalogFilter.value);

  try {
    const pokemon = await fetchPokemon(name);
    if (ticket !== searchTicket) return false; // Llegó tarde: el usuario ya pidió otro Pokémon.
    // Se muestra el nombre oficial aunque se haya buscado por número.
    activePokemonName = pokemon.name;
    document.getElementById('pokemonSearch').value = pokemon.name;
    pokemonSelect.value = pokemon.name;
    renderCatalog(catalogFilter.value);
    renderApiResult(pokemon);
    return pokemon.name;
  } catch (error) {
    if (ticket !== searchTicket) return false;
    apiResult.classList.add('hidden');
    showToast(error.message, 'error');
    return false;
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

// El texto escrito manda: elegir de la lista ya lo copia al campo de texto (D10).
searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = toPokeApiName(document.getElementById('pokemonSearch').value) || pokemonSelect.value;
  if (!name) {
    showToast('Escribe o selecciona un Pokémon', 'error');
    return;
  }
  const found = await selectPokemon(name);
  if (found) showToast(`Pokémon ${found} encontrado`);
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
  if (saving) return;

  const pokemonName = document.getElementById('pokemonName').value.trim();
  // Avisar antes de duplicar un Pokémon que ya está guardado (D20).
  const duplicate = savedRecords.some((record) => record.pokemonName === pokemonName.toLowerCase() && record.id !== editingId);
  if (duplicate && !confirm(`Ya existe un registro de «${pokemonName.toLowerCase()}». ¿Quieres guardar otro con el mismo nombre?`)) return;

  saving = true;
  submitBtn.disabled = true;
  const stats = getFormStats();
  // El número de Pokédex solo acompaña al nombre con el que se cargó; si el nombre cambió se omite (D14).
  const samePokemon = formPokemon.id && pokemonName.toLowerCase() === String(formPokemon.name).toLowerCase();
  const payload = {
    pokemonName,
    stats,
    pokemonId: samePokemon ? Number(formPokemon.id) : undefined,
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
  } finally {
    saving = false;
    submitBtn.disabled = false;
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
    // Un segundo clic mientras se borra no vuelve a preguntar ni a borrar (D23).
    if (deleting.has(id)) return;
    if (!confirm('¿Eliminar este registro?')) return;
    deleting.add(id);

    try {
      const response = await fetch(`/api/records/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Error al eliminar', 'error');
        return;
      }

      showToast('Registro eliminado');
      if (editingId === id) resetForm();
      await loadRecords();
    } finally {
      deleting.delete(id);
    }
  }
});

async function init() {
  await loadGen1List();
  await loadRecords();
  if (gen1List.length) await selectPokemon('ditto');
}

init();
