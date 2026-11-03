// Interfaz del combate estilo Game Boy: solo muestra el estado y envía el movimiento elegido.
// El servidor resuelve precisión, daño, PS, el ataque del Pokémon salvaje y el ganador (lib/combat).
const STAT_SHORT = {
  hp: 'PS', attack: 'Atq', defense: 'Def', 'special-attack': 'AtqEsp', 'special-defense': 'DefEsp', speed: 'Vel',
};
const SIDES = ['p1', 'p2'];
const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const TEXT_SPEED_MS = 18;
const AUTO_ADVANCE_MS = 2600;

const el = (id) => document.getElementById(id);
const setupSection = el('setupSection');
const battleSection = el('battleSection');
const selects = { p1: el('p1Select'), p2: el('p2Select') };
const previews = { p1: el('p1Preview'), p2: el('p2Preview') };
const sprites = { p1: el('playerSprite'), p2: el('enemySprite') };
const infoBoxes = { p1: el('playerInfo'), p2: el('enemyInfo') };
const menus = { command: el('commandMenu'), moves: el('moveMenu'), end: el('endMenu') };
const startBtn = el('startBtn');
const messageEl = el('message');
const advanceEl = el('advance');
const moveGrid = el('moveGrid');
const moveInfo = el('moveInfo');
const battleLog = el('battleLog');
const toast = el('toast');

let records = [];
let typeLabels = {};
let battle = null;
let shownHp = { p1: 0, p2: 0 }; // PS que se ven en pantalla mientras se anima el turno.
let busy = false;
let activeMenu = null;
let cursor = 0;
let advance = null; // Función que continúa el texto actual (clic o tecla).

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

function showAlert(id, message) {
  el(id).textContent = message;
  el(id).classList.toggle('hidden', !message);
}

async function api(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: options.body ? { 'Content-Type': 'application/json' } : {},
    });
  } catch {
    throw new Error('No hay conexión con el servidor del proyecto');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Error ${response.status} en la API`);
  return data;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pokemonNumber = (id) => (id ? `#${String(id).padStart(3, '0')}` : '');
const typeBadges = (types = []) => types
  .map((type) => `<span class="type-badge type-${escapeHtml(type)}">${escapeHtml(typeLabels[type] || type)}</span>`)
  .join('');

// Imágenes modernas: render 3D de Pokémon HOME y, si no existe, el artwork oficial o el sprite guardado.
function setArtwork(img, pokemonId, fallback) {
  const sources = [pokemonId && `${SPRITES}/other/home/${pokemonId}.png`,
    pokemonId && `${SPRITES}/other/official-artwork/${pokemonId}.png`, fallback].filter(Boolean);
  img.onerror = () => {
    sources.shift();
    if (sources.length) img.src = sources[0];
    else img.onerror = null;
  };
  img.src = sources[0] || '';
}

// ---------- Preparación ----------

function renderPreview(side) {
  const record = records.find((item) => item.id === selects[side].value);
  if (!record) {
    previews[side].innerHTML = '<div class="empty-state">Sin Pokémon seleccionado</div>';
    return;
  }
  const stats = Object.entries(STAT_SHORT)
    .map(([key, label]) => `<span><strong>${label}</strong> ${escapeHtml(record.stats?.[key] ?? '?')}</span>`)
    .join('');
  previews[side].innerHTML = `
    <img alt="${escapeHtml(record.pokemonName)}">
    <div>
      <div class="record-name">${pokemonNumber(record.pokemonId)} ${escapeHtml(record.pokemonName)}</div>
      <div class="types">${record.types?.length ? typeBadges(record.types)
        : '<span class="hint">Tipos por completar desde PokeAPI al iniciar</span>'}</div>
      <div class="preview-stats">${stats}</div>
    </div>`;
  setArtwork(previews[side].querySelector('img'), record.pokemonId, record.sprite);
}

function populateSelects() {
  const options = records
    .map((record) => `<option value="${escapeHtml(record.id)}">${pokemonNumber(record.pokemonId)} ${escapeHtml(record.pokemonName)}</option>`)
    .join('');
  for (const side of SIDES) {
    selects[side].innerHTML = `<option value="">Selecciona un Pokémon...</option>${options}`;
  }
  const byName = (name) => records.find((record) => record.pokemonName === name)?.id;
  selects.p1.value = byName('pikachu') || records[0]?.id || '';
  selects.p2.value = byName('charmander') || records[1]?.id || records[0]?.id || '';
}

async function loadRecords() {
  const selected = { p1: selects.p1.value, p2: selects.p2.value };
  records = (await api('/api/records'))
    .filter((record) => record.stats)
    .sort((a, b) => (a.pokemonId || 9999) - (b.pokemonId || 9999));
  populateSelects();
  for (const side of SIDES) {
    if (records.some((record) => record.id === selected[side])) selects[side].value = selected[side];
    renderPreview(side);
  }
}

// ---------- Texto y menús ----------

const nameOf = (side) => battle.participants[side].name.toUpperCase();
// El rival se nombra como en los juegos: "el CHARMANDER salvaje".
const subject = (side, start = false) => (side === 'p1' ? nameOf(side)
  : `${start ? 'El' : 'el'} ${nameOf(side)} salvaje`);

function hideMenus() {
  Object.values(menus).forEach((menu) => menu.classList.add('hidden'));
  el('textBox').dataset.menu = '';
  activeMenu = null;
}

// Escribe el texto letra a letra; un clic o tecla lo completa de golpe.
function typeText(text) {
  advanceEl.classList.add('hidden');
  return new Promise((resolve) => {
    let index = 0;
    let typing = true;
    const finish = () => {
      typing = false;
      advance = null;
      messageEl.textContent = text;
      resolve();
    };
    advance = finish;
    const step = () => {
      if (!typing) return;
      index += 1;
      messageEl.textContent = text.slice(0, index);
      if (index >= text.length) finish();
      else setTimeout(step, TEXT_SPEED_MS);
    };
    step();
  });
}

// Muestra ▼ y espera un clic/tecla (o unos segundos) antes de seguir, como el botón A.
function waitForAdvance() {
  advanceEl.classList.remove('hidden');
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      advance = null;
      advanceEl.classList.add('hidden');
      resolve();
    };
    const timer = setTimeout(done, AUTO_ADVANCE_MS);
    advance = done;
  });
}

async function say(text, { pause = true } = {}) {
  hideMenus();
  await typeText(text);
  if (pause) await waitForAdvance();
}

function menuOptions() {
  return activeMenu ? [...menus[activeMenu].querySelectorAll('.menu-option')] : [];
}

function setCursor(index) {
  const options = menuOptions();
  if (!options.length) return;
  cursor = (index + options.length) % options.length;
  options.forEach((option, i) => option.classList.toggle('focused', i === cursor));
  if (activeMenu === 'moves') renderMoveInfo(options[cursor].dataset.move);
}

function openMenu(name) {
  hideMenus();
  advance = null;
  advanceEl.classList.add('hidden');
  activeMenu = name;
  menus[name].classList.remove('hidden');
  el('textBox').dataset.menu = name;
  setCursor(0);
}

function renderMoveInfo(moveId) {
  const move = battle.participants.p1.moves.find((item) => item.id === moveId);
  if (!move) return;
  moveInfo.innerHTML = `
    <div>TIPO/</div>
    <div class="move-info-type"><span class="type-badge type-${escapeHtml(move.type)}">${escapeHtml(move.typeLabel)}</span></div>
    <div>${move.category === 'special' ? 'ESPECIAL' : 'FÍSICO'}</div>
    <div>POD ${move.fixedDamage ? `${move.fixedDamage} fijo` : move.power}</div>
    <div>PREC ${move.accuracy === null ? '---' : `${move.accuracy}%`}</div>
    ${move.stab ? '<div class="stab-tag">STAB</div>' : ''}`;
}

function renderMoves() {
  moveGrid.innerHTML = battle.participants.p1.moves.map((move) => `
    <button type="button" class="menu-option" data-move="${escapeHtml(move.id)}">${escapeHtml(move.name.toUpperCase())}</button>
  `).join('');
}

async function showCommands() {
  await say(`¿Qué debe hacer ${nameOf('p1')}?`, { pause: false });
  openMenu('command');
}

// ---------- Escena ----------

function hpClass(current, max) {
  const ratio = current / max;
  if (ratio > 0.5) return 'hp-high';
  if (ratio > 0.2) return 'hp-mid';
  return 'hp-low';
}

function renderInfo(side) {
  const fighter = battle.participants[side];
  const hp = Math.round(shownHp[side]);
  infoBoxes[side].innerHTML = `
    <div class="info-name">
      <span>${escapeHtml(fighter.name.toUpperCase())}</span>
      <span class="info-level">Nv${battle.level}</span>
    </div>
    <div class="info-types">${typeBadges(fighter.types)}</div>
    <div class="hp-row">
      <span class="hp-label">PS</span>
      <div class="hp-bar" role="progressbar" aria-label="PS de ${escapeHtml(fighter.name)}"
        aria-valuemin="0" aria-valuemax="${fighter.hp.max}" aria-valuenow="${hp}">
        <div class="hp-fill ${hpClass(hp, fighter.hp.max)}" style="width:${(hp / fighter.hp.max) * 100}%"></div>
      </div>
    </div>
    ${side === 'p1' ? `<div class="hp-numbers">${hp}/ ${fighter.hp.max}</div>` : ''}`;
}

function animateHp(side, from, to, duration = 700) {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    const frame = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      shownHp[side] = from + (to - from) * progress;
      renderInfo(side);
      if (progress < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

async function flash(side, className, ms) {
  sprites[side].classList.add(className);
  await wait(ms);
  sprites[side].classList.remove(className);
}

function renderScene() {
  for (const side of SIDES) {
    const fighter = battle.participants[side];
    sprites[side].className = `sprite ${side === 'p1' ? 'player-sprite' : 'enemy-sprite'} enter`;
    sprites[side].alt = fighter.name;
    setArtwork(sprites[side], fighter.pokemonId, fighter.sprite);
    renderInfo(side);
  }
  renderMoves();
}

function breakdown(event) {
  if (!event.hit) return 'Falló por precisión: no se aplicó daño.';
  if (event.fixedDamage) return `Daño fijo ${event.fixedDamage} × efectividad ${event.effectiveness}`;
  if (event.effectiveness === 0) return `Efectividad 0 (inmunidad): daño 0. Base ${event.baseDamage}.`;
  return `Base ${event.baseDamage} × STAB ${event.stab} × Efect. ${event.effectiveness}`
    + `${event.critical ? ' × Crítico 1.5' : ''} × Var. ${(event.random / 100).toFixed(2)} = ${event.damage}`
    + ` · PS ${event.hpBefore} → ${event.hpAfter}`;
}

function renderLog() {
  battleLog.innerHTML = [...battle.turns].reverse().map((turn) => `
    <li>
      <div class="log-round">Ronda ${turn.round}${turn.speedTie ? ' · empate de Velocidad resuelto al azar' : ''}</div>
      ${turn.events.map((event) => `
        <div class="log-event ${event.hit ? '' : 'missed'}">
          <span>${escapeHtml(event.message)}</span>
          <small>${escapeHtml(breakdown(event))}</small>
        </div>`).join('')}
    </li>`).join('') || '<li class="hint">Todavía no hay rondas.</li>';
}

// Reproduce los eventos que ya resolvió el servidor, uno por uno, como en los juegos.
async function playEvent(event) {
  const { attacker, defender } = event;
  await say(`¡${subject(attacker, true)} usó ${event.move.name.toUpperCase()}!`, { pause: false });
  await flash(attacker, attacker === 'p1' ? 'lunge-right' : 'lunge-left', 320);
  if (!event.hit) {
    await say('¡Pero falló!');
    return;
  }
  if (event.damage > 0) {
    flash(defender, 'hit', 600);
    await animateHp(defender, event.hpBefore, event.hpAfter);
  }
  const lines = [];
  if (event.critical) lines.push('¡Un golpe crítico!');
  if (event.effectiveness === 0) lines.push(`No afecta a ${subject(defender)}...`);
  else if (event.effectiveness > 1) lines.push('¡Es súper eficaz!');
  else if (event.effectiveness < 1) lines.push('No es muy eficaz...');
  if (!lines.length) await waitForAdvance(); // Da tiempo a leer "X usó Y" aunque no haya más texto.
  for (const line of lines) await say(line);
  if (event.fainted) {
    sprites[defender].classList.add('fainted');
    await wait(500);
    await say(`¡${subject(defender, true)} se debilitó!`);
  }
}

async function finishBattle() {
  const won = battle.result.winner === 'p1';
  const title = (side) => battle.participants[side].name.replace(/^./, (char) => char.toUpperCase());
  el('resultBanner').textContent = `Ganador: ${title(battle.result.winner)}. Derrotado: ${title(battle.result.loser)}.`;
  el('resultBanner').className = `result-banner ${won ? '' : 'lost'}`;
  await say(won ? `¡Ganaste! Derrotaste al ${nameOf('p2')} salvaje.`
    : `¡${nameOf('p1')} no puede continuar! Perdiste el combate.`, { pause: false });
  openMenu('end');
}

async function playTurn(moveId) {
  if (busy) return;
  busy = true;
  hideMenus();
  try {
    const data = await api(`/api/battles/${battle.id}/turn`, {
      method: 'POST', body: JSON.stringify({ p1Move: moveId }),
    });
    battle = data.battle;
    showAlert('battleError', '');
    for (const event of data.turn.events) await playEvent(event);
    SIDES.forEach((side) => { shownHp[side] = battle.participants[side].hp.current; renderInfo(side); });
    renderLog();
    if (battle.status === 'finalizado') await finishBattle();
    else await showCommands();
  } catch (error) {
    showAlert('battleError', error.message);
    await showCommands();
  } finally {
    busy = false;
  }
}

async function startBattle() {
  showAlert('setupError', '');
  if (!selects.p1.value || !selects.p2.value) {
    showAlert('setupError', 'Selecciona tu Pokémon y el Pokémon salvaje');
    return;
  }
  const body = { mode: 'cpu', p1: { recordId: selects.p1.value }, p2: { recordId: selects.p2.value } };
  startBtn.disabled = true;
  startBtn.textContent = 'Preparando...';
  try {
    battle = await api('/api/battles', { method: 'POST', body: JSON.stringify(body) });
  } catch (error) {
    showAlert('setupError', error.message);
    return;
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = '¡A combatir!';
  }
  shownHp = { p1: battle.participants.p1.hp.current, p2: battle.participants.p2.hp.current };
  showAlert('battleError', '');
  el('resultBanner').classList.add('hidden');
  setupSection.classList.add('hidden');
  battleSection.classList.remove('hidden');
  renderScene();
  renderLog();
  battleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  loadRecords().catch(() => {}); // Refresca los tipos que el servidor completó.
  busy = true;
  await say(`¡Un ${nameOf('p2')} salvaje apareció!`);
  await say(`¡Adelante, ${nameOf('p1')}!`);
  busy = false;
  await showCommands();
}

async function runAway() {
  busy = true;
  await say('¡Escapaste sin problemas!');
  busy = false;
  backToSetup();
}

function backToSetup() {
  hideMenus();
  battleSection.classList.add('hidden');
  setupSection.classList.remove('hidden');
  SIDES.forEach(renderPreview);
}

function choose(option) {
  if (busy || !option) return;
  const { command, move } = option.dataset;
  if (move) return playTurn(move);
  if (command === 'fight') return openMenu('moves');
  if (command === 'run') return runAway();
  if (command === 'rematch') return startBattle();
  if (command === 'new') return backToSetup();
}

// ---------- Eventos ----------

function renderRules(rules) {
  el('rulesBox').innerHTML = `
    <ul>
      <li>Tú eliges a ambos Pokémon; el rival actúa como <strong>Pokémon salvaje</strong> y elige al azar uno de sus 4 movimientos en cada ronda.</li>
      <li>Nivel fijo <strong>${rules.level}</strong>. PS = 2·Base·Nv/100 + Nv + 10; demás = 2·Base·Nv/100 + 5.</li>
      <li>Actúa primero el de mayor Velocidad; un empate se sortea.</li>
      <li>Daño base = ⌊⌊⌊2·Nv/5 + 2⌋ · Poder · Atq / Def⌋ / 50⌋ + 2 (se trunca en cada paso).</li>
      <li>Daño final = ⌊Base × STAB × Efectividad × Crítico × Variación⌋, mínimo ${rules.minDamage}; con efectividad 0 el daño es 0.</li>
      <li>STAB ×${rules.stab}. Variación aleatoria entre ${rules.random.min} y ${rules.random.max}.</li>
      <li>Crítico ×${rules.critical.multiplier} con probabilidad ${escapeHtml(rules.critical.chance)}.</li>
      <li>Movimientos de Fuego, Agua, Eléctrico, Planta, Hielo, Psíquico y Dragón son especiales (usan Ataque y Defensa Especial); el resto son físicos.</li>
      <li>Tabla de tipos de la primera generación (Fantasma no afecta a Psíquico; Hielo es neutral contra Fuego).</li>
    </ul>`;
}

for (const side of SIDES) selects[side].addEventListener('change', () => renderPreview(side));

el('randomBtn').addEventListener('click', () => {
  if (!records.length) return;
  selects.p2.value = records[Math.floor(Math.random() * records.length)].id;
  renderPreview('p2');
});

startBtn.addEventListener('click', startBattle);

el('textBox').addEventListener('click', (event) => {
  const option = event.target.closest('.menu-option');
  if (option) choose(option);
  else advance?.();
});

el('textBox').addEventListener('mouseover', (event) => {
  const option = event.target.closest('.menu-option');
  if (option) setCursor(menuOptions().indexOf(option));
});

document.addEventListener('keydown', (event) => {
  if (battleSection.classList.contains('hidden') || ['SELECT', 'INPUT'].includes(document.activeElement?.tagName)) return;
  const key = event.key.toLowerCase();
  const accept = ['enter', ' ', 'z'].includes(key);
  if (advance && (accept || key === 'x')) {
    event.preventDefault();
    advance();
    return;
  }
  if (!activeMenu || busy) return;
  const columns = 2;
  const moves = { arrowleft: -1, arrowright: 1, arrowup: -columns, arrowdown: columns };
  if (moves[key] !== undefined) {
    event.preventDefault();
    const target = cursor + moves[key];
    if (target >= 0 && target < menuOptions().length) setCursor(target);
  } else if (accept) {
    event.preventDefault();
    choose(menuOptions()[cursor]);
  } else if ((key === 'escape' || key === 'x') && activeMenu === 'moves') {
    event.preventDefault();
    showCommands();
  }
});

async function init() {
  try {
    const rules = await api('/api/combat/rules');
    typeLabels = rules.typeLabels;
    renderRules(rules);
    await loadRecords();
    if (records.length < 2) {
      showAlert('setupError', 'No hay suficientes registros. Abre el CRUD y usa "Sincronizar 151 Pokémon".');
    }
  } catch (error) {
    showAlert('setupError', `No se pudo cargar la información de la API: ${error.message}`);
    showToast(error.message, 'error');
  }
}

init();
