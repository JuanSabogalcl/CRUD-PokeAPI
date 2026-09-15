const STAT_FIELDS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

const searchForm = document.getElementById('searchForm');
const statsForm = document.getElementById('statsForm');
const apiResult = document.getElementById('apiResult');
const recordsList = document.getElementById('recordsList');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const refreshBtn = document.getElementById('refreshBtn');
const toast = document.getElementById('toast');

let editingId = null;

function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

function getFormStats() {
  return Object.fromEntries(
    STAT_FIELDS.map((field) => [field, document.getElementById(field).value]),
  );
}

function setFormStats(stats, pokemonName = '') {
  document.getElementById('pokemonName').value = pokemonName;
  STAT_FIELDS.forEach((field) => {
    document.getElementById(field).value = stats[field] ?? '';
  });
}

function resetForm() {
  editingId = null;
  document.getElementById('recordId').value = '';
  statsForm.reset();
  formTitle.textContent = 'Crear registro';
  submitBtn.textContent = 'Guardar';
  cancelBtn.classList.add('hidden');
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
        <h3>${pokemon.name}</h3>
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
    setFormStats(pokemon.stats, pokemon.name);
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

async function loadRecords() {
  const response = await fetch('/api/records');
  const records = await response.json();

  if (records.length === 0) {
    recordsList.innerHTML = '<div class="empty-state">No hay registros. Crea uno o busca un Pokémon en PokeAPI.</div>';
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
            <div>
              <div class="record-name">${record.pokemonName}</div>
              <div class="record-meta">Actualizado: ${new Date(record.updatedAt).toLocaleString('es-ES')}</div>
            </div>
            <div class="record-actions">
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

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('pokemonSearch').value.trim();

  try {
    const pokemon = await fetchPokemon(name);
    renderApiResult(pokemon);
    showToast(`Pokémon ${pokemon.name} encontrado`);
  } catch (error) {
    apiResult.classList.add('hidden');
    showToast(error.message, 'error');
  }
});

statsForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const pokemonName = document.getElementById('pokemonName').value.trim();
  const stats = getFormStats();
  const payload = { pokemonName, stats };

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

  if (action === 'edit') {
    const response = await fetch(`/api/records/${id}`);
    const record = await response.json();

    editingId = record.id;
    document.getElementById('recordId').value = record.id;
    setFormStats(record.stats, record.pokemonName);
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

loadRecords();
fetchPokemon('ditto')
  .then(renderApiResult)
  .catch(() => {});
