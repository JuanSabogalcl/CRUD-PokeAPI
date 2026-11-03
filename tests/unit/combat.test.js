// Pruebas unitarias de la lógica de combate, sin servidor ni interfaz: node --test tests/unit/
const test = require('node:test');
const assert = require('node:assert/strict');
const { typeEffectiveness, mapTypesFromApi } = require('../../lib/combat/types');
const { MOVES, movesetFor } = require('../../lib/combat/moves');
const rules = require('../../lib/combat/rules');
const { createBattle, executeAction, playTurn, publicBattle, validateCombatRecord } = require('../../lib/combat/battle');

const fields = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const record = (name, types, values, id = name) => ({
  id, pokemonName: name, types, stats: Object.fromEntries(fields.map((key, i) => [key, values[i]])),
});
const charmander = () => record('charmander', ['fire'], [39, 52, 43, 60, 50, 65]);
const bulbasaur = () => record('bulbasaur', ['grass', 'poison'], [45, 49, 49, 65, 65, 45]);
const squirtle = () => record('squirtle', ['water'], [44, 48, 65, 50, 64, 43]);
const gastly = () => record('gastly', ['ghost', 'poison'], [30, 35, 30, 100, 35, 80]);
const ditto = () => record('ditto', ['normal'], [48, 48, 48, 48, 48, 48]);

// Generador guionizado: devuelve los valores en orden y falla si se consumen más de los previstos.
const scripted = (...values) => () => {
  assert.ok(values.length > 0, 'Se consumieron más números aleatorios de los previstos');
  return values.shift();
};
const HIT = 0, NO_CRIT = 0.99, CRIT = 0, MAX_ROLL = 0.999; // MAX_ROLL => variación 100.

test('tabla de tipos Gen 1: debilidad, resistencia, inmunidad y doble tipo', () => {
  assert.equal(typeEffectiveness('fire', ['grass']), 2);
  assert.equal(typeEffectiveness('fire', ['water']), 0.5);
  assert.equal(typeEffectiveness('normal', ['ghost']), 0);
  assert.equal(typeEffectiveness('electric', ['ground']), 0);
  assert.equal(typeEffectiveness('ground', ['flying']), 0);
  assert.equal(typeEffectiveness('ghost', ['psychic']), 0, 'Particularidad de la Gen 1');
  assert.equal(typeEffectiveness('ice', ['fire']), 1, 'Hielo era neutral contra Fuego en la Gen 1');
  assert.equal(typeEffectiveness('bug', ['poison']), 2);
  assert.equal(typeEffectiveness('electric', ['water', 'flying']), 4);
  assert.equal(typeEffectiveness('fire', ['grass', 'poison']), 2);
  assert.equal(typeEffectiveness('grass', ['poison', 'flying']), 0.25);
});

test('tipos desde PokeAPI usan past_types y descartan tipos posteriores a la Gen 1', () => {
  const t = (...names) => names.map((name, i) => ({ slot: i + 1, type: { name } }));
  assert.deepEqual(mapTypesFromApi({ types: t('fairy'),
    past_types: [{ generation: { name: 'generation-v' }, types: t('normal') }] }), ['normal']);
  assert.deepEqual(mapTypesFromApi({ types: t('electric', 'steel'),
    past_types: [{ generation: { name: 'generation-i' }, types: t('electric') }] }), ['electric']);
  assert.deepEqual(mapTypesFromApi({ types: t('grass', 'poison') }), ['grass', 'poison']);
  assert.deepEqual(mapTypesFromApi({ types: t('steel') }), ['normal']);
  assert.deepEqual(mapTypesFromApi({}), []);
});

test('estadísticas de combate al nivel 50 y fórmula de daño base con truncamiento', () => {
  assert.deepEqual(rules.battleStats(charmander().stats),
    { hp: 99, attack: 57, defense: 48, 'special-attack': 65, 'special-defense': 55, speed: 70 });
  // floor(22·40·60/60)=880 -> floor(880/50)=17 -> 17+2 = 19
  assert.equal(rules.baseDamage({ level: 50, power: 40, attack: 60, defense: 60 }), 19);
  // floor(22·95·65/53)=2563 -> floor(2563/50)=51 -> 53
  assert.equal(rules.baseDamage({ level: 50, power: 95, attack: 65, defense: 53 }), 53);
});

test('ejemplo del documento: 20 × 1,5 × 1,0 × 0,90 = 27', () => {
  assert.equal(rules.finalDamage({ base: 20, stab: 1.5, effectiveness: 1, critical: 1, random: 90 }), 27);
  assert.equal(rules.finalDamage({ base: 20, stab: 1.5, effectiveness: 0, critical: 1.5, random: 100 }), 0);
  assert.equal(rules.finalDamage({ base: 2, stab: 1, effectiveness: 0.25, critical: 1, random: 85 }), 1);
});

test('probabilidad de crítico centralizada y basada en la Velocidad base', () => {
  assert.equal(rules.criticalChance(65), 32 / 256);
  assert.equal(rules.criticalChance(600), 255 / 256);
  assert.equal(rules.CRITICAL_MULTIPLIER, 1.5);
});

test('cada Pokémon recibe 4 movimientos con STAB y un movimiento sin STAB', () => {
  assert.deepEqual(movesetFor(['fire']), ['flamethrower', 'fire-blast', 'tackle', 'swift']);
  assert.deepEqual(movesetFor(['grass', 'poison']), ['razor-leaf', 'sludge', 'vine-whip', 'tackle']);
  assert.deepEqual(movesetFor(['bug']), ['leech-life', 'tackle', 'swift', 'slam']);
  for (const types of [['normal'], ['dragon'], ['ghost', 'poison'], ['water', 'ice']]) {
    const moves = movesetFor(types);
    assert.equal(moves.length, 4);
    assert.ok(moves.every((id) => MOVES[id]));
  }
});

test('ataque con STAB súper eficaz: daño exacto y PS actualizados', () => {
  const battle = createBattle({ p1: charmander(), p2: bulbasaur(), seed: 1 });
  // Lanzallamas (100 %) consume precisión, crítico y variación: acierta, sin crítico, variación 100.
  const event = executeAction(battle, 'p1', 'flamethrower', scripted(HIT, NO_CRIT, MAX_ROLL));
  assert.equal(event.stab, 1.5);
  assert.equal(event.effectiveness, 2);
  assert.equal(event.baseDamage, rules.baseDamage({ power: 95, attack: 65, defense: 70 }));
  assert.equal(event.damage, Math.floor(event.baseDamage * 1.5 * 2));
  assert.equal(event.hpAfter, Math.max(0, event.hpBefore - event.damage));
  assert.equal(battle.participants.p2.hp.current, event.hpAfter);
});

test('ataque sin STAB y poco eficaz', () => {
  const battle = createBattle({ p1: charmander(), p2: squirtle(), seed: 1 });
  const tackle = executeAction(battle, 'p1', 'tackle', scripted(HIT, NO_CRIT, MAX_ROLL));
  assert.equal(tackle.stab, 1);
  assert.equal(tackle.effectiveness, 1);
  const fire = executeAction(battle, 'p1', 'flamethrower', scripted(HIT, NO_CRIT, MAX_ROLL));
  assert.equal(fire.effectiveness, 0.5);
  assert.equal(fire.damage, Math.floor(fire.baseDamage * 1.5 * 0.5));
});

test('inmunidad: daño 0 sin consumir crítico ni variación', () => {
  const battle = createBattle({ p1: charmander(), p2: gastly(), seed: 1 });
  const event = executeAction(battle, 'p1', 'swift', scripted());
  assert.equal(event.hit, true);
  assert.equal(event.effectiveness, 0);
  assert.equal(event.damage, 0);
  assert.equal(event.critical, false);
  assert.equal(event.hpAfter, event.hpBefore);
  assert.match(event.message, /No afecta/);
});

test('fallo por precisión: no hay daño y se informa', () => {
  const battle = createBattle({ p1: charmander(), p2: bulbasaur(), seed: 1 });
  const before = battle.participants.p2.hp.current;
  const event = executeAction(battle, 'p1', 'fire-blast', scripted(0.86)); // 86 >= 85 => falla
  assert.equal(event.hit, false);
  assert.equal(event.damage, 0);
  assert.equal(battle.participants.p2.hp.current, before);
  assert.match(event.message, /falló/);
});

test('golpe crítico multiplica por 1,5', () => {
  const battle = createBattle({ p1: charmander(), p2: ditto(), seed: 1 });
  const normal = executeAction(battle, 'p1', 'swift', scripted(NO_CRIT, MAX_ROLL));
  const critical = executeAction(battle, 'p1', 'swift', scripted(CRIT, MAX_ROLL));
  assert.equal(critical.critical, true);
  assert.equal(critical.damage, Math.floor(normal.baseDamage * 1.5));
  assert.match(critical.message, /crítico/);
});

test('Furia Dragón hace daño fijo de 40', () => {
  const dratini = record('dratini', ['dragon'], [41, 64, 45, 50, 50, 50]);
  const battle = createBattle({ p1: dratini, p2: ditto(), seed: 1 });
  const event = executeAction(battle, 'p1', 'dragon-rage', scripted(HIT));
  assert.equal(event.damage, 40);
});

test('orden por Velocidad y empate resuelto con el generador', () => {
  const battle = createBattle({ p1: bulbasaur(), p2: charmander(), mode: 'pvp', seed: 1 });
  // Rapidez de Charmander (sin precisión): crítico, variación. Placaje de Bulbasaur: precisión, crítico, variación.
  const turn = playTurn(battle, { p1: 'tackle', p2: 'swift' }, scripted(NO_CRIT, MAX_ROLL, HIT, NO_CRIT, MAX_ROLL));
  assert.deepEqual(turn.order, ['p2', 'p1'], 'Charmander es más rápido');
  assert.equal(turn.speedTie, false);

  const mirror = createBattle({ p1: ditto(), p2: ditto(), mode: 'pvp', seed: 1 });
  const tie = playTurn(mirror, { p1: 'swift', p2: 'swift' }, scripted(0.7, NO_CRIT, MAX_ROLL, NO_CRIT, MAX_ROLL));
  assert.equal(tie.speedTie, true);
  assert.deepEqual(tie.order, ['p2', 'p1']);
});

test('PS no negativos, fin del combate y bloqueo de acciones posteriores', () => {
  const battle = createBattle({ p1: charmander(), p2: bulbasaur(), mode: 'pvp', seed: 1 });
  battle.participants.p2.hp.current = 5;
  const turn = playTurn(battle, { p1: 'flamethrower', p2: 'tackle' }, scripted(HIT, NO_CRIT, MAX_ROLL));
  assert.equal(turn.events.length, 1, 'Bulbasaur no actúa porque quedó debilitado');
  assert.equal(turn.events[0].hpAfter, 0);
  assert.ok(turn.events[0].damage > 5);
  assert.equal(battle.status, 'finalizado');
  assert.equal(battle.winner, 'p1');
  assert.equal(battle.loser, 'p2');
  assert.match(publicBattle(battle).result.message, /charmander gana/);
  assert.throws(() => playTurn(battle, { p1: 'flamethrower', p2: 'tackle' }), { status: 409 });
  assert.throws(() => executeAction(battle, 'p2', 'tackle', scripted()), { status: 409 });
});

test('movimientos inválidos y CPU que elige del propio conjunto', () => {
  const battle = createBattle({ p1: charmander(), p2: bulbasaur(), mode: 'pvp', seed: 1 });
  assert.throws(() => playTurn(battle, { p1: 'hyper-beam', p2: 'tackle' }), { status: 400 });
  assert.throws(() => playTurn(battle, { p1: 'flamethrower' }), { status: 400 });
  assert.equal(battle.round, 0);

  const cpu = createBattle({ p1: charmander(), p2: bulbasaur(), mode: 'cpu', seed: 3 });
  const turn = playTurn(cpu, { p1: 'swift', p2: 'no-se-usa' });
  const cpuEvent = turn.events.find((event) => event.attacker === 'p2');
  if (cpuEvent) assert.ok(cpu.participants.p2.moves.includes(cpuEvent.move.id));
});

test('misma semilla y mismas elecciones producen el mismo combate', () => {
  const run = () => {
    const battle = createBattle({ p1: charmander(), p2: squirtle(), seed: 2024 });
    while (battle.status === 'en-curso') playTurn(battle, { p1: 'fire-blast' });
    return battle.turns.map((turn) => turn.events.map((event) => [event.hit, event.critical, event.random, event.damage]));
  };
  assert.deepEqual(run(), run());
  assert.ok(!('rngState' in publicBattle(createBattle({ p1: ditto(), p2: ditto(), seed: 1 }))));
});

test('registros sin tipos o con estadísticas inválidas se rechazan', () => {
  assert.match(validateCombatRecord({ ...ditto(), types: undefined }), /tipos/);
  assert.match(validateCombatRecord({ ...ditto(), types: ['fairy'] }), /tipos/);
  assert.match(validateCombatRecord({ ...ditto(), stats: { hp: 10 } }), /estadística/);
  assert.equal(validateCombatRecord(ditto()), null);
  assert.throws(() => createBattle({ p1: { ...ditto(), types: [] }, p2: ditto(), seed: 1 }), { status: 422 });
});
