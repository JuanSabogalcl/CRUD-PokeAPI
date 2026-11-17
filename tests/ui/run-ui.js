// Pruebas de interfaz (U01–U23): un usuario real en Edge comete errores típicos y se verifica que
// la lógica del sistema se aplica en pantalla. Cada caso guarda capturas como evidencia.
//   node tests/ui/run-ui.js --run=semana13-ui-ronda-1 [--casos=U01,U06]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { root, fields, launch, stop, tempData } = require('../helpers');
const { createFixture } = require('../fixture');
const { launchEdge, sleep } = require('./navegador');
const oracle = require('../oraculo-combate');

const SPECIES = {
  bulbasaur: { id: 1, stats: [45, 49, 49, 65, 65, 45] },
  charmander: { id: 4, stats: [39, 52, 43, 60, 50, 65] },
  squirtle: { id: 7, stats: [44, 48, 65, 50, 64, 43] },
  pikachu: { id: 25, stats: [35, 55, 40, 50, 50, 90] },
  gastly: { id: 92, stats: [30, 35, 30, 100, 35, 80] },
  ditto: { id: 132, stats: [48, 48, 48, 48, 48, 48] },
  gyarados: { id: 130, stats: [95, 125, 79, 60, 100, 81] },
};
const FORM_STATS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

const cases = [];
const add = (id, title, criterion, run) => cases.push({ id, title, criterion, run });

// ---------- Ayudas comunes ----------

async function api(base, method, route, body) {
  const response = await fetch(base + route, { method, headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, data: await response.json().catch(() => null) };
}

async function seed(c, ...names) {
  const records = {};
  for (const name of names) {
    const { id, stats } = SPECIES[name];
    const result = await api(c.base, 'POST', '/api/records', { pokemonName: name, pokemonId: id,
      stats: Object.fromEntries(fields.map((field, index) => [field, stats[index]])) });
    assert.equal(result.status, 201);
    records[name] = result.data;
  }
  return records;
}

const records = async (c) => (await api(c.base, 'GET', '/api/records')).data;
const posts = (page, route) => page.requests.filter((r) => r.method === 'POST' && r.url.startsWith(route)).length;

async function fillForm(page, name, values = {}) {
  if (name !== undefined) await page.type('#pokemonName', name);
  for (const field of FORM_STATS) {
    if (values[field] !== undefined) await page.type(`#${field}`, String(values[field]));
  }
}
const allStats = (value) => Object.fromEntries(FORM_STATS.map((field) => [field, value]));

async function lastToast(page, type) {
  await page.waitFor(`window.__toasts.some((t) => t.type === ${JSON.stringify(type)})`, { timeout: 6000,
    message: `No apareció un aviso de tipo ${type}` });
  const list = await page.toasts();
  return list.filter((toast) => toast.type === type).pop().text;
}

// La página consulta a Ditto al cargar y eso desplaza el formulario: se espera a que termine
// para que los clics caigan donde haría clic un usuario.
async function ready(page) {
  await page.goto('/');
  await page.waitFor('document.querySelectorAll("#pokemonSelect option").length > 1');
  await page.waitFor('!document.getElementById("apiResult").classList.contains("hidden")');
  await waitStill(page);
}

async function openCrud(page) {
  await ready(page);
  await page.waitFor('document.querySelectorAll("#recordsList .record-item").length > 0');
}

// Espera a que termine el desplazamiento suave (por ejemplo, el que hace «Editar»).
async function waitStill(page) {
  let last = -1;
  for (let i = 0; i < 30; i += 1) {
    const y = await page.eval('scrollY');
    if (y === last) return;
    last = y;
    await sleep(150);
  }
}

async function edit(page, recordId) {
  await page.click(`.record-item[data-id="${recordId}"] [data-action="edit"]`);
  await page.waitFor('document.getElementById("formTitle").textContent === "Editar registro"');
  await waitStill(page);
}

// ---------- Ayudas del combate ----------

async function openBattle(page, p1, p2) {
  await page.goto('/combate.html');
  await page.waitFor('document.querySelectorAll("#p1Select option").length > 1');
  await page.select('#p1Select', p1 ? p1.id : '');
  await page.select('#p2Select', p2 ? p2.id : '');
}

// Avanza el texto (clic en la caja) hasta que aparezca uno de los menús. Si un mensaje coincide
// con alguna expresión de `shots` (y el anterior con `prev`, si se indica), toma la captura en ese momento.
async function advanceUntil(c, menus = ['command', 'end'], shots = []) {
  const pending = [...shots];
  const started = Date.now();
  while (Date.now() - started < 45000) {
    const state = await c.page.eval(`({ menu: document.getElementById('textBox').dataset.menu,
      advance: !document.getElementById('advance').classList.contains('hidden'),
      text: document.getElementById('message').textContent, prev: window.__msgs[window.__msgs.length - 2] || '' })`);
    const index = pending.findIndex((shot) => shot.re.test(state.text) && (!shot.prev || shot.prev.test(state.prev)));
    if (index >= 0 && (state.advance || menus.includes(state.menu))) {
      await c.shot(pending[index].name, '.gb-frame');
      pending.splice(index, 1);
    }
    if (menus.includes(state.menu)) return state.menu;
    if (state.advance) await c.page.click('#message');
    await sleep(120);
  }
  throw new Error(`La pantalla no llegó a ${menus.join('/')}`);
}

async function startBattle(c, p1, p2) {
  await openBattle(c.page, p1, p2);
  await c.page.click('#startBtn');
  await advanceUntil(c, ['command']);
}

async function useMove(c, moveId, shots) {
  await c.page.click('[data-command="fight"]');
  await c.page.waitFor('!document.getElementById("moveMenu").classList.contains("hidden")');
  await c.page.click(`[data-move="${moveId}"]`);
  return advanceUntil(c, ['command', 'end'], shots);
}

const uiBattle = (page) => page.eval('battle');

// ---------- CRUD: errores al llenar el formulario ----------

add('U01', 'Crear con el formulario vacío', 'RN-01 / interfaz', async (c) => {
  await seed(c, 'ditto');
  await openCrud(c.page);
  const before = (await records(c)).length;
  await c.page.click('#submitBtn');
  await sleep(600);
  const message = await c.page.eval('document.getElementById("pokemonName").validationMessage');
  await c.shot('formulario-vacio', '.form-section');
  assert.equal(posts(c.page, '/api/records'), 0, 'No debe enviarse nada al servidor');
  assert.ok(message, 'El navegador debe marcar el nombre como obligatorio');
  assert.equal((await records(c)).length, before);
  c.note(`Mensaje del navegador: «${message}»`);
});

add('U02', 'Estadística fuera de rango en el formulario (0, 1000, 2.5 y 1)', 'R05 / interfaz', async (c) => {
  await ready(c.page);
  await fillForm(c.page, 'ditto', allStats(48));
  const messages = [];
  for (const value of ['0', '1000', '2.5']) {
    await c.page.type('#hp', value);
    await c.page.click('#submitBtn');
    await sleep(400);
    messages.push(`${value}: «${await c.page.eval('document.getElementById("hp").validationMessage')}»`);
    if (value === '0') await c.shot('ps-cero', '.form-section');
  }
  assert.equal(posts(c.page, '/api/records'), 0, 'Ningún valor fuera de rango debe llegar al servidor');
  await c.page.type('#hp', '1');
  await c.page.click('#submitBtn');
  assert.match(await lastToast(c.page, 'success'), /Registro creado/);
  await c.shot('ps-uno-guardado', '.list-section');
  const saved = await records(c);
  assert.equal(saved.length, 1); assert.equal(saved[0].stats.hp, 1);
  c.note(messages.join(' · '));
});

add('U03', 'Nombre con solo espacios', 'R04 / interfaz', async (c) => {
  await ready(c.page);
  await fillForm(c.page, '   ', allStats(48));
  await c.page.click('#submitBtn');
  const text = await lastToast(c.page, 'error');
  await c.shot('aviso-nombre-vacio');
  assert.match(text, /nombre/i);
  assert.equal((await records(c)).length, 0);
  c.note(`Aviso: «${text}»`);
});

add('U04', 'Nombre con etiquetas HTML', 'D08 / interfaz', async (c) => {
  await ready(c.page);
  await fillForm(c.page, '<b>hack</b>', allStats(48));
  await c.page.click('#submitBtn');
  const text = await lastToast(c.page, 'error');
  await c.shot('aviso-html');
  assert.match(text, /< >/);
  assert.equal((await records(c)).length, 0);
  assert.equal(await c.page.eval('document.querySelectorAll("#recordsList b").length'), 0);
  c.note(`Aviso: «${text}»`);
});

add('U05', 'Nombre de 41 caracteres', 'D16 / interfaz', async (c) => {
  await ready(c.page);
  await fillForm(c.page, 'a'.repeat(41), allStats(48));
  const typed = await c.page.eval('document.getElementById("pokemonName").value.length');
  await c.page.click('#submitBtn');
  await sleep(800);
  const toasts = await c.page.toasts();
  await c.shot('nombre-41');
  const saved = (await records(c)).filter((record) => record.pokemonName.length > 40);
  assert.equal(saved.length, 0, 'No debe guardarse un nombre de más de 40 caracteres');
  assert.ok(typed <= 40 || toasts.some((t) => t.type === 'error' && /40/.test(t.text)),
    'El usuario debe enterarse del límite (campo limitado o aviso)');
  c.note(`Caracteres aceptados en el campo: ${typed}. Avisos: ${toasts.map((t) => t.text).join(' | ') || 'ninguno'}`);
});

add('U06', 'Doble clic en Guardar', 'Integridad / interfaz', async (c) => {
  await ready(c.page);
  await fillForm(c.page, 'doble-clic', allStats(48));
  await c.page.dblclick('#submitBtn');
  await sleep(1500);
  await c.page.eval('document.getElementById("recordsFilter").value = "doble"; document.getElementById("recordsFilter").dispatchEvent(new Event("input"))');
  await c.shot('tras-doble-clic', '.list-section');
  const created = (await records(c)).filter((record) => record.pokemonName === 'doble-clic').length;
  c.note(`Peticiones POST enviadas: ${posts(c.page, '/api/records')}. Registros creados: ${created}`);
  assert.equal(created, 1, `Se crearon ${created} registros con un doble clic`);
});

add('U07', 'Editar con un valor inválido y cancelar', 'R06 / interfaz', async (c) => {
  const { ditto } = await seed(c, 'ditto');
  await openCrud(c.page);
  await edit(c.page, ditto.id);
  await c.page.type('#hp', '0');
  await c.page.click('#submitBtn');
  await sleep(400);
  await c.shot('editar-ps-cero', '.form-section');
  assert.equal(c.page.requests.filter((r) => r.method === 'PUT').length, 0);
  await c.page.click('#cancelBtn');
  await sleep(300);
  assert.equal(await c.page.eval('document.getElementById("formTitle").textContent'), 'Crear registro');
  const after = (await api(c.base, 'GET', `/api/records/${ditto.id}`)).data;
  assert.deepEqual(after.stats, ditto.stats, 'El registro no debe cambiar');
  await c.shot('cancelado', '.form-section');
});

add('U08', 'Eliminar: cancelar y luego confirmar', 'S05 / interfaz', async (c) => {
  const { ditto } = await seed(c, 'ditto', 'pikachu');
  await openCrud(c.page);
  c.page.acceptDialogs = false;
  await c.page.click(`.record-item[data-id="${ditto.id}"] [data-action="delete"]`);
  await sleep(500);
  assert.equal((await api(c.base, 'GET', `/api/records/${ditto.id}`)).status, 200, 'Cancelar no debe borrar');
  assert.equal(c.page.requests.filter((r) => r.method === 'DELETE').length, 0);
  c.page.acceptDialogs = true;
  await c.page.click(`.record-item[data-id="${ditto.id}"] [data-action="delete"]`);
  assert.match(await lastToast(c.page, 'success'), /eliminado/);
  await c.shot('eliminado', '.list-section');
  assert.equal((await api(c.base, 'GET', `/api/records/${ditto.id}`)).status, 404);
  assert.equal(c.page.dialogs.length, 2);
  c.note(`Diálogo: «${c.page.dialogs[0].message}» (cancelado y luego aceptado)`);
});

// ---------- CRUD: búsqueda ----------

async function search(c, text) {
  await ready(c.page);
  await c.page.eval('window.__toasts = []');
  await c.page.type('#pokemonSearch', text);
  await c.page.key('Enter');
}

add('U09', 'Búsqueda con mayúsculas y espacios', 'R01 / interfaz', async (c) => {
  await search(c, '  PIKACHU  ');
  await c.page.waitFor('/pikachu/i.test(document.querySelector("#apiResult h3")?.textContent || "")');
  await c.shot('pikachu', '.search-section');
  assert.match(await lastToast(c.page, 'success'), /pikachu encontrado/);
});

add('U10', 'Búsqueda de un Pokémon que no existe', 'R02 / interfaz', async (c) => {
  await search(c, 'no-existe-grupo6');
  const text = await lastToast(c.page, 'error');
  await sleep(400);
  await c.shot('no-existe', '.search-section');
  const toasts = await c.page.toasts();
  assert.match(text, /no encontrado/i);
  assert.ok(!toasts.some((t) => t.type === 'success'), 'No debe anunciar «encontrado»');
  assert.ok(await c.page.eval('document.getElementById("apiResult").classList.contains("hidden")'));
});

add('U11', 'Búsqueda escrita con formato inválido («Mr. Mime»)', 'D12 / interfaz', async (c) => {
  await search(c, 'Mr. Mime');
  const text = await lastToast(c.page, 'error');
  await sleep(400);
  await c.shot('formato-invalido', '.search-section');
  assert.match(text, /letras, números y guiones/);
  assert.ok(!(await c.page.toasts()).some((t) => t.type === 'success'));
  c.note(`Aviso: «${text}»`);
});

add('U12', 'Búsqueda vacía', 'D10 / interfaz', async (c) => {
  // Sin nada en la lista ni en el campo de texto (si la lista tiene un Pokémon, se busca ese).
  await ready(c.page);
  await c.page.eval('window.__toasts = []');
  await c.page.select('#pokemonSelect', '');
  await c.page.type('#pokemonSearch', '');
  await c.page.click('#searchForm button[type="submit"]');
  const text = await lastToast(c.page, 'error');
  await c.shot('busqueda-vacia', '.search-section');
  assert.match(text, /Escribe o selecciona/);
  const searches = c.page.requests.filter((r) => r.url.startsWith('/api/pokemon/'));
  assert.ok(searches.every((r) => r.url !== '/api/pokemon/'), 'No debe consultar sin nombre');
});

// ---------- La lógica del CRUD se aplica en el combate ----------

add('U13', 'Editar la Velocidad cambia quién ataca primero', 'RF05 / interfaz', async (c) => {
  const { pikachu, charmander } = await seed(c, 'pikachu', 'charmander');
  await openCrud(c.page);
  await edit(c.page, pikachu.id);
  await c.page.type('#speed', '10');
  await c.page.click('#submitBtn');
  assert.match(await lastToast(c.page, 'success'), /actualizado/);
  await c.shot('velocidad-editada', '.list-section');
  await openBattle(c.page, pikachu, charmander);
  await c.shot('vista-previa', '.setup-grid');
  assert.match(await c.page.eval('document.getElementById("p1Preview").innerText'), /Vel\s*10/);
  await c.page.click('#startBtn');
  await advanceUntil(c, ['command']);
  await c.page.eval('window.__msgs = []');
  await useMove(c, 'thunderbolt', [{ re: /salvaje usó/, name: 'salvaje-primero' }]);
  const attacks = (await c.page.messages()).filter((text) => /usó/.test(text));
  const battle = await uiBattle(c.page);
  assert.equal(battle.participants.p1.stats.speed, 15, 'Velocidad de combate = base 10 + 5');
  assert.match(attacks[0], /CHARMANDER salvaje usó/, 'Con Vel 15 contra 70, el salvaje ataca primero');
  c.note(`Orden en pantalla: ${attacks.join(' → ')}`);
});

add('U14', 'Renombrar desde el formulario cambia la especie en el combate', 'D14 / interfaz', async (c) => {
  const { squirtle, ditto } = await seed(c, 'squirtle', 'ditto');
  await openCrud(c.page);
  await edit(c.page, squirtle.id);
  await c.page.type('#pokemonName', 'bulbasaur');
  await c.page.click('#submitBtn');
  assert.match(await lastToast(c.page, 'success'), /actualizado/);
  await startBattle(c, squirtle, ditto);
  await c.shot('bulbasaur-en-combate', '.gb-frame');
  const battle = await uiBattle(c.page);
  assert.deepEqual(battle.participants.p1.types, ['grass', 'poison']);
  assert.match(await c.page.eval('document.getElementById("playerInfo").innerText'), /BULBASAUR[\s\S]*Planta[\s\S]*Veneno/);
});

// ---------- Combate: errores del usuario y lógica en pantalla ----------

add('U15', 'Iniciar el combate sin elegir al Pokémon salvaje', 'RF01 / interfaz', async (c) => {
  const { pikachu } = await seed(c, 'pikachu', 'ditto');
  await openBattle(c.page, pikachu, null);
  await c.page.click('#startBtn');
  await sleep(400);
  await c.shot('sin-salvaje', '#setupSection');
  assert.match(await c.page.eval('document.getElementById("setupError").textContent'), /Selecciona tu Pokémon y el Pokémon salvaje/);
  assert.equal(posts(c.page, '/api/battles'), 0);
});

add('U16', 'Pokémon salvaje con datos incompletos', 'C12 / interfaz', async (c) => {
  const { pikachu } = await seed(c, 'pikachu');
  const custom = (await api(c.base, 'POST', '/api/records', { pokemonName: 'grupo6-custom',
    stats: Object.fromEntries(fields.map((field) => [field, 50])) })).data;
  await openBattle(c.page, pikachu, custom);
  await c.page.click('#startBtn');
  await c.page.waitFor('!document.getElementById("setupError").classList.contains("hidden")');
  await c.shot('datos-incompletos', '#setupSection');
  const text = await c.page.eval('document.getElementById("setupError").textContent');
  assert.match(text, /grupo6-custom/);
  c.note(`Mensaje: «${text}»`);
});

add('U17', 'Inmunidad visible: Rapidez contra Gastly', 'RF08 / interfaz', async (c) => {
  const { charmander, gastly } = await seed(c, 'charmander', 'gastly');
  await startBattle(c, charmander, gastly);
  await useMove(c, 'swift', [{ re: /No afecta/, name: 'no-afecta' }]);
  const battle = await uiBattle(c.page);
  const gastlyHp = battle.participants.p2.hp;
  const bar = await c.page.eval('parseFloat(document.querySelector("#enemyInfo .hp-fill").style.width)');
  const shown = (await c.page.messages()).find((text) => /No afecta/.test(text));
  assert.equal(shown, 'No afecta al GASTLY salvaje...', `Mensaje mostrado: «${shown}»`);
  assert.equal(gastlyHp.current, gastlyHp.max, 'Gastly no pierde PS');
  assert.equal(Math.round(bar), 100);
});

add('U18', 'Súper eficaz: PS y desglose en pantalla iguales a la lógica', 'RF07–RF10 / interfaz', async (c) => {
  const { squirtle, charmander } = await seed(c, 'squirtle', 'charmander');
  await startBattle(c, squirtle, charmander);
  await useMove(c, 'surf', [{ re: /súper eficaz/, name: 'super-eficaz' }]);
  const battle = await uiBattle(c.page);
  const event = battle.turns[0].events.find((e) => e.attacker === 'p1');
  const enemy = battle.participants.p2.hp;
  const player = battle.participants.p1.hp;
  const screen = await c.page.eval(`({ bar: parseFloat(document.querySelector('#enemyInfo .hp-fill').style.width),
    numbers: document.querySelector('#playerInfo .hp-numbers').textContent,
    log: document.getElementById('battleLog').textContent })`);
  await c.page.eval('document.querySelector(".log-card").open = true');
  await c.shot('desglose', '.log-card');
  assert.equal(event.effectiveness, 2);
  assert.ok(Math.abs(screen.bar - (enemy.current / enemy.max) * 100) < 0.5, 'La barra del rival refleja sus PS reales');
  assert.equal(screen.numbers, `${player.current}/ ${player.max}`, 'Los números del jugador son los reales');
  assert.match(screen.log, new RegExp(`Base ${event.baseDamage} × STAB 1.5 × Efect. 2`));
  const expected = Math.floor((event.baseDamage * 1.5 * 2 * (event.critical ? 1.5 : 1) * event.random) / 100);
  assert.equal(event.damage, Math.max(1, expected), 'El daño mostrado sigue la fórmula');
  c.note(`Daño ${event.damage} = ⌊${event.baseDamage} × 1,5 × 2${event.critical ? ' × 1,5' : ''} × ${event.random / 100}⌋`);
});

add('U19', 'Doble clic en un ataque', 'RF04 / interfaz', async (c) => {
  const { charmander, ditto } = await seed(c, 'charmander', 'ditto');
  await startBattle(c, charmander, ditto);
  await c.page.click('[data-command="fight"]');
  await c.page.waitFor('!document.getElementById("moveMenu").classList.contains("hidden")');
  await c.page.dblclick('[data-move="swift"]');
  await advanceUntil(c, ['command', 'end']);
  await c.shot('tras-doble-clic', '.gb-frame');
  const turns = c.page.requests.filter((r) => r.url.endsWith('/turn')).length;
  const battle = await uiBattle(c.page);
  c.note(`Peticiones de turno: ${turns}. Rondas jugadas: ${battle.round}`);
  assert.equal(battle.round, 1, 'Un doble clic debe jugar una sola ronda');
});

add('U20', 'Después de terminar no se puede seguir atacando', 'RF11 / interfaz', async (c) => {
  const { squirtle, charmander } = await seed(c, 'squirtle', 'charmander');
  await startBattle(c, squirtle, charmander);
  let menu = 'command';
  for (let i = 0; i < 10 && menu === 'command'; i += 1) menu = await useMove(c, 'surf');
  assert.equal(menu, 'end');
  await c.shot('fin-del-combate', '.gb-frame');
  const state = await c.page.eval(`({ fight: !document.getElementById('commandMenu').classList.contains('hidden'),
    end: [...document.querySelectorAll('#endMenu .menu-option')].map((b) => b.textContent),
    banner: document.getElementById('resultBanner').textContent })`);
  assert.equal(state.fight, false, 'El menú LUCHAR no debe aparecer');
  assert.deepEqual(state.end, ['REVANCHA', 'NUEVO']);
  const forced = await c.page.eval(`fetch('/api/battles/' + battle.id + '/turn', { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p1Move: 'surf' }) }).then((r) => r.status)`);
  assert.equal(forced, 409, 'El servidor rechaza un turno forzado');
  c.note(`${state.banner}. Turno forzado desde la página: HTTP ${forced}`);
});

add('U21', 'Se pierde la conexión al atacar', 'Sección 10 / interfaz', async (c) => {
  const { charmander, ditto } = await seed(c, 'charmander', 'ditto');
  await startBattle(c, charmander, ditto);
  await c.page.failRequests('*/turn');
  await c.page.click('[data-command="fight"]');
  await c.page.click('[data-move="swift"]');
  await c.page.waitFor('!document.getElementById("battleError").classList.contains("hidden")');
  await advanceUntil(c, ['command']);
  await c.shot('sin-conexion', '.gb-frame');
  const error = await c.page.eval('document.getElementById("battleError").textContent');
  assert.match(error, /No hay conexión/);
  await c.page.failRequests(null);
  await useMove(c, 'swift');
  assert.equal((await uiBattle(c.page)).round, 1, 'Al volver la conexión el turno se juega');
  await c.shot('conexion-recuperada', '.gb-frame');
  c.note(`Mensaje: «${error}»`);
});

add('U22', 'Recargar la página a mitad del combate', 'Confiabilidad / interfaz', async (c) => {
  const { charmander, ditto } = await seed(c, 'charmander', 'ditto');
  await startBattle(c, charmander, ditto);
  await useMove(c, 'swift');
  await c.page.goto('/combate.html');
  await c.page.waitFor('document.querySelectorAll("#p1Select option").length > 1');
  await c.shot('tras-recargar', '#setupSection');
  assert.ok(await c.page.eval('!document.getElementById("setupSection").classList.contains("hidden")'));
  assert.equal(c.page.consoleErrors.length, 0, c.page.consoleErrors.join(' | '));
  c.note('La página vuelve a la preparación sin errores; el combate en curso no se recupera (no es un requisito)');
});

add('U23', 'HUIR y empezar otro combate', 'Interfaz', async (c) => {
  const { charmander, ditto } = await seed(c, 'charmander', 'ditto');
  await startBattle(c, charmander, ditto);
  await c.page.click('[data-command="run"]');
  await c.page.waitFor('/Escapaste/.test(document.getElementById("message").textContent)');
  await c.shot('huir', '.gb-frame');
  await c.page.waitFor('!document.getElementById("setupSection").classList.contains("hidden")', { timeout: 6000 });
  await c.page.click('#startBtn');
  await advanceUntil(c, ['command']);
  assert.equal(posts(c.page, '/api/battles'), 2);
});

// ---------- Lógica de pelea en pantalla, comparada con el oráculo ----------

// Comprueba cada evento de la ronda con el oráculo y que la pantalla muestre lo mismo que el servidor.
async function checkRoundOnScreen(c, battle, turn) {
  const log = await c.page.eval('document.getElementById("battleLog").textContent');
  for (const event of turn.events) {
    const attacker = battle.participants[event.attacker];
    const defender = battle.participants[event.defender];
    const move = attacker.moves.find((item) => item.id === event.move.id);
    if (!event.hit) { assert.equal(event.damage, 0); continue; }
    const expected = oracle.expectedHit({ attacker, defender, move, critical: Boolean(event.critical), random: event.random });
    assert.equal(event.damage, expected.damage, `${attacker.name} ${move.id}: daño ${event.damage}, oráculo ${expected.damage}`);
    if (!move.fixedDamage && expected.effectiveness > 0) {
      const line = `Base ${expected.baseDamage} × STAB ${expected.stab} × Efect. ${expected.effectiveness}`
        + `${event.critical ? ' × Crítico 1.5' : ''} × Var. ${(event.random / 100).toFixed(2)} = ${expected.damage}`;
      assert.ok(log.includes(line), `El registro en pantalla debe mostrar «${line}»`);
    }
  }
  const screen = await c.page.eval(`({ player: document.querySelector('#playerInfo .hp-numbers').textContent,
    enemy: parseFloat(document.querySelector('#enemyInfo .hp-fill').style.width) })`);
  const { p1, p2 } = battle.participants;
  assert.equal(screen.player, `${p1.hp.current}/ ${p1.hp.max}`, 'PS del jugador en pantalla');
  assert.ok(Math.abs(screen.enemy - (p2.hp.current / p2.hp.max) * 100) < 0.5, 'Barra del rival en pantalla');
}

// Juega rondas con el mismo movimiento hasta que `found(turn)` se cumpla (o se agoten los intentos).
async function playUntil(c, moveId, found, shots, maxRounds = 25) {
  for (let round = 0; round < maxRounds; round += 1) {
    const menu = await useMove(c, moveId, shots);
    const battle = await uiBattle(c.page);
    const turn = battle.turns.at(-1);
    await checkRoundOnScreen(c, battle, turn);
    if (found(turn, battle)) return { battle, turn, menu };
    if (menu === 'end') {
      await c.page.click('[data-command="rematch"]');
      await advanceUntil(c, ['command']);
    }
  }
  throw new Error(`No ocurrió el evento buscado en ${maxRounds} rondas`);
}

add('U24', 'Combate completo: cada ronda en pantalla coincide con el oráculo', 'RF04–RF11 / interfaz', async (c) => {
  const { charmander, ditto } = await seed(c, 'charmander', 'ditto');
  await startBattle(c, charmander, ditto);
  let rounds = 0;
  let attacks = 0;
  let menu = 'command';
  while (menu === 'command') {
    menu = await useMove(c, 'tackle');
    const battle = await uiBattle(c.page);
    await checkRoundOnScreen(c, battle, battle.turns.at(-1));
    attacks += battle.turns.at(-1).events.length;
    rounds += 1;
    if (rounds === 2) await c.shot('ronda-2', '.gb-frame');
  }
  const battle = await uiBattle(c.page);
  await c.page.eval('document.querySelector(".log-card").open = true');
  await c.shot('registro-completo', '.log-card');
  await c.shot('fin', '.gb-frame');
  assert.equal(battle.participants[battle.result.loser].hp.current, 0);
  c.note(`${rounds} rondas y ${attacks} ataques: daño, PS, barra y desglose iguales al oráculo. Ganador: ${battle.participants[battle.result.winner].name}`);
});

add('U25', 'Fallo por precisión en pantalla: Trueno (70 %) no quita PS', 'RF06 / interfaz', async (c) => {
  const { pikachu, ditto } = await seed(c, 'pikachu', 'ditto');
  await startBattle(c, pikachu, ditto);
  const { turn } = await playUntil(c, 'thunder', (t) => t.events.some((e) => e.attacker === 'p1' && !e.hit),
    [{ re: /¡Pero falló!/, prev: /PIKACHU usó TRUENO/, name: 'trueno-fallo' }]);
  const miss = turn.events.find((e) => e.attacker === 'p1');
  assert.equal(miss.damage, 0);
  assert.equal(miss.hpAfter, miss.hpBefore, 'El rival conserva sus PS');
  c.note(`Trueno falló: PS del rival ${miss.hpBefore} → ${miss.hpAfter}`);
});

add('U26', 'Golpe crítico en pantalla: daño × 1,5 según la fórmula', 'Críticos / interfaz', async (c) => {
  const { pikachu, ditto } = await seed(c, 'pikachu', 'ditto');
  await startBattle(c, pikachu, ditto);
  const { battle, turn } = await playUntil(c, 'swift', (t) => t.events.some((e) => e.attacker === 'p1' && e.critical),
    [{ re: /¡Un golpe crítico!/, prev: /PIKACHU usó RAPIDEZ/, name: 'critico' }], 40);
  const crit = turn.events.find((e) => e.attacker === 'p1');
  const normal = oracle.expectedHit({ attacker: battle.participants.p1, defender: battle.participants.p2,
    move: battle.participants.p1.moves.find((m) => m.id === 'swift'), critical: false, random: crit.random });
  c.note(`Crítico: daño ${crit.damage} frente a ${normal.damage} sin crítico con la misma variación (${crit.random / 100})`);
  assert.ok(crit.damage > normal.damage);
});

add('U27', '«No es muy eficaz» en pantalla: Fuego contra Agua (× 0,5)', 'RF08 / interfaz', async (c) => {
  const { charmander, squirtle } = await seed(c, 'charmander', 'squirtle');
  await startBattle(c, charmander, squirtle);
  const { turn } = await playUntil(c, 'flamethrower', (t) => t.events.some((e) => e.attacker === 'p1' && e.hit),
    [{ re: /No es muy eficaz/, prev: /CHARMANDER usó LANZALLAMAS|golpe crítico/, name: 'poco-eficaz' }]);
  const event = turn.events.find((e) => e.attacker === 'p1');
  assert.equal(event.effectiveness, 0.5);
  c.note(`Lanzallamas a Squirtle: × 0,5, daño ${event.damage}`);
});

add('U28', '× 4 en pantalla: Rayo contra Gyarados hasta el final del combate', 'RF08 / RF11 / interfaz', async (c) => {
  const { pikachu, gyarados } = await seed(c, 'pikachu', 'gyarados');
  await startBattle(c, pikachu, gyarados);
  // Con la fórmula, un Rayo × 4 quita entre 117 y 138 de los 155 PS de Gyarados: hacen falta dos golpes.
  const shots = [{ re: /súper eficaz/, prev: /PIKACHU usó RAYO/, name: 'super-eficaz-x4' }, { re: /se debilitó/, name: 'debilitado' }];
  let menu = 'command';
  let damages = [];
  while (menu === 'command') {
    menu = await useMove(c, 'thunderbolt', shots);
    const battle = await uiBattle(c.page);
    const turn = battle.turns.at(-1);
    await checkRoundOnScreen(c, battle, turn);
    for (const event of turn.events.filter((e) => e.attacker === 'p1' && e.hit)) {
      assert.equal(event.effectiveness, 4, 'Eléctrico contra Agua/Volador = × 4');
      damages.push(event.damage);
    }
  }
  const battle = await uiBattle(c.page);
  await c.shot('fin-del-combate', '.gb-frame');
  const loser = battle.participants[battle.result.loser];
  assert.equal(loser.hp.current, 0);
  assert.ok(battle.participants[battle.result.winner].hp.current > 0);
  c.note(`Daños de Rayo × 4: ${damages.join(', ')}. Ganador: ${battle.participants[battle.result.winner].name}`);
});

// ---------- Ejecución ----------

function gitCommit() {
  try {
    const head = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
    const dirty = execSync('git status --porcelain -- server.js lib public', { cwd: root, encoding: 'utf8' }).trim();
    return dirty ? `${head} + cambios sin commit` : head;
  } catch { return 'desconocido'; }
}

async function main() {
  const runName = process.argv.find((arg) => arg.startsWith('--run='))?.split('=')[1]
    || `ui-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  if (!/^[\w-]+$/.test(runName)) throw new Error('Nombre de ronda inválido');
  const only = process.argv.find((arg) => arg.startsWith('--casos='))?.split('=')[1]?.split(',');
  const outDir = path.join(root, 'docs', 'pruebas', 'evidencias', runName);
  fs.mkdirSync(outDir, { recursive: true });
  const edge = await launchEdge();
  const startedAt = new Date().toISOString();
  const results = [];
  try {
    for (const item of cases.filter((entry) => !only || only.includes(entry.id))) {
      const dataDir = tempData();
      const shots = [];
      const notes = [];
      let fixture, server, page;
      let status = 'PASA', observation = '';
      const start = Date.now();
      try {
        fixture = await createFixture({ realSprites: true });
        server = await launch(dataDir, fixture.base);
        page = await edge.newPage(server.base);
        const context = {
          base: server.base, page,
          note: (text) => notes.push(text),
          shot: async (name, selector) => {
            const file = `${item.id}-${shots.length + 1}-${name}.png`;
            await page.screenshot(path.join(outDir, file), selector);
            shots.push(file);
          },
        };
        await item.run(context);
      } catch (error) {
        status = page ? 'FALLA' : 'BLOQUEADO';
        observation = error.message.split('\n')[0];
        if (page) {
          const file = `${item.id}-${shots.length + 1}-falla.png`;
          await page.screenshot(path.join(outDir, file)).then(() => shots.push(file)).catch(() => {});
        }
      } finally {
        const detail = { id: item.id, title: item.title, criterion: item.criterion, status,
          observation: [observation, ...notes].filter(Boolean).join('. '), durationMs: Date.now() - start,
          screenshots: shots, apiRequests: page?.requests || [], dialogs: page?.dialogs || [],
          consoleErrors: page?.consoleErrors || [], toasts: await page?.toasts().catch(() => []) ?? [],
          messages: await page?.messages().catch(() => []) ?? [] };
        if (page) await page.close();
        await stop(server);
        if (fixture) await fixture.close();
        fs.rmSync(dataDir, { recursive: true, force: true });
        fs.writeFileSync(path.join(outDir, `${item.id}.json`), JSON.stringify(detail, null, 2));
        results.push({ id: item.id, title: item.title, criterion: item.criterion, status,
          observation: detail.observation, screenshots: shots, evidence: `${item.id}.json` });
        console.log(`${status.padEnd(9)} ${item.id} ${item.title}${detail.observation ? `: ${detail.observation.slice(0, 160)}` : ''}`);
      }
    }
  } finally {
    await edge.close();
  }
  const totals = Object.fromEntries(['PASA', 'FALLA', 'BLOQUEADO'].map((state) => [state, results.filter((r) => r.status === state).length]));
  const report = { startedAt, endedAt: new Date().toISOString(), node: process.version, browser: edge.version,
    sourceCommit: gitCommit(), totals, results,
    decision: totals.FALLA || totals.BLOQUEADO ? 'NO LISTO' : 'LISTO para el alcance de interfaz probado' };
  fs.writeFileSync(path.join(outDir, 'resultados.json'), JSON.stringify(report, null, 2));
  const clean = (value) => String(value).replace(/\|/g, '/').replace(/\r?\n/g, ' ');
  fs.writeFileSync(path.join(outDir, 'REPORTE.md'), `# Reporte de pruebas de interfaz\n\nFecha UTC: ${startedAt}. ${edge.version}, ventana 1280 × 900. Commit: ${report.sourceCommit}.\n\nUn usuario simulado hace clics y escribe en la interfaz real; la PokeAPI es la simulada de las pruebas.\n\n${totals.PASA} PASA, ${totals.FALLA} FALLA, ${totals.BLOQUEADO} BLOQUEADO.\n\n| Caso | Criterio | Resultado | Capturas | Observación |\n|---|---|---|---|---|\n${results.map((r) => `| ${r.id} ${r.title} | ${r.criterion} | ${r.status} | ${r.screenshots.map((s) => `[${s.replace(/^U\d+-/, '').replace('.png', '')}](${s})`).join(', ')} | ${clean(r.observation || 'Coincide con el esperado')} |`).join('\n')}\n\nDecisión: **${report.decision}**.\n`);
  console.log(`\n${totals.PASA}/${results.length} PASA. Reporte: ${path.relative(root, outDir)}\\REPORTE.md`);
  process.exitCode = totals.FALLA || totals.BLOQUEADO ? 1 : 0;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
