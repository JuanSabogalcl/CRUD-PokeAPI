// Pruebas funcionales obligatorias del módulo de combate (sección 12 de la especificación).
// Se ejecutan contra la API real del proyecto con la PokeAPI simulada de tests/fixture.js.
const assert = require('node:assert/strict');
const { fields } = require('./helpers');

const SPECIES = {
  bulbasaur: { id: 1, stats: [45, 49, 49, 65, 65, 45] },
  charmander: { id: 4, stats: [39, 52, 43, 60, 50, 65] },
  squirtle: { id: 7, stats: [44, 48, 65, 50, 64, 43] },
  pikachu: { id: 25, stats: [35, 55, 40, 50, 50, 90] },
  diglett: { id: 50, stats: [10, 55, 25, 35, 45, 95] },
  gastly: { id: 92, stats: [30, 35, 30, 100, 35, 80] },
  ditto: { id: 132, stats: [48, 48, 48, 48, 48, 48] },
};

module.exports = function registerCombatCases(add, { ok, jsonError }) {
  // Registro creado por el CRUD sin tipos: el combate los completa desde PokeAPI.
  const make = async (c, name) => {
    const { id, stats } = SPECIES[name];
    const result = await c.req('POST', '/api/records', { pokemonName: name, pokemonId: id,
      stats: Object.fromEntries(fields.map((field, index) => [field, stats[index]])) });
    ok(result, 201);
    return result.data;
  };
  const start = async (c, p1, p2, extra = {}) => {
    const result = await c.req('POST', '/api/battles', { mode: 'pvp', p1: { recordId: p1.id },
      p2: { recordId: p2.id }, seed: 7, ...extra });
    ok(result, 201);
    return result.data;
  };
  const turn = async (c, battle, p1Move, p2Move) => {
    const result = await c.req('POST', `/api/battles/${battle.id}/turn`, { p1Move, p2Move });
    ok(result, 200);
    return result.data;
  };
  const eventOf = (data, side) => data.turn.events.find((event) => event.attacker === side);
  // Recalcula el daño con los modificadores informados para comprobar la fórmula documentada.
  const expectedDamage = (e) => (e.effectiveness === 0 ? 0 : Math.max(1,
    Math.floor((e.baseDamage * e.stab * e.effectiveness * (e.critical ? 1.5 : 1) * e.random) / 100)));
  const assertHpRule = (e) => {
    assert.ok(e.hpAfter >= 0, 'Los PS no pueden ser negativos');
    assert.equal(e.hpAfter, Math.max(0, e.hpBefore - e.damage));
  };

  add('C01', 'Seleccionar dos Pokémon disponibles en la API', 'RF01', async (c) => {
    ok(await c.req('POST', '/api/records/sync-gen1'), 200);
    const records = (await c.req('GET', '/api/records')).data;
    const bulbasaur = records.find((record) => record.pokemonName === 'bulbasaur');
    const charmander = records.find((record) => record.pokemonName === 'charmander');
    assert.deepEqual(bulbasaur.types, ['grass', 'poison'], 'La sincronización guarda los tipos');
    const battle = await start(c, bulbasaur, charmander, { mode: 'cpu' });
    assert.equal(battle.status, 'en-curso');
    assert.equal(battle.participants.p1.recordId, bulbasaur.id);
    assert.equal(battle.participants.p1.pokemonId, 1);
    assert.equal(battle.participants.p2.recordId, charmander.id);
    assert.equal(battle.participants.p2.controller, 'cpu');
    assert.equal((await c.req('GET', '/api/records')).data.length, 151, 'No se duplican registros');
  });

  add('C02', 'Mostrar los datos básicos de ambos Pokémon', 'RF02/RF03', async (c) => {
    const battle = await start(c, await make(c, 'pikachu'), await make(c, 'squirtle'));
    for (const side of ['p1', 'p2']) {
      const fighter = battle.participants[side];
      assert.equal(typeof fighter.name, 'string');
      assert.match(fighter.sprite, /^https?:\/\//);
      assert.ok(fighter.types.length >= 1 && fighter.typeLabels.length === fighter.types.length);
      assert.ok(fighter.hp.max > 0); assert.equal(fighter.hp.current, fighter.hp.max);
      assert.deepEqual(Object.keys(fighter.stats), fields);
      assert.equal(fighter.moves.length, 4);
      for (const move of fighter.moves) assert.ok(move.name && move.type && 'accuracy' in move);
    }
    assert.deepEqual(battle.participants.p1.types, ['electric']);
    assert.equal(battle.participants.p1.hp.max, 35 + 60, 'PS al nivel 50 = base + 60');
    const read = await c.req('GET', `/api/battles/${battle.id}`);
    ok(read, 200); assert.deepEqual(read.data, battle);
    const clefairy = await c.req('GET', '/api/pokemon/clefairy');
    ok(clefairy, 200); assert.deepEqual(clefairy.data.types, ['normal'], 'Tipo de la Gen 1, no Hada');
    const page = await c.req('GET', '/combate.html');
    ok(page, 200); assert.match(page.contentType, /text\/html/);
  });

  add('C03', 'Ejecutar un movimiento válido y actualizar los PS', 'RF04/RF10', async (c) => {
    const battle = await start(c, await make(c, 'charmander'), await make(c, 'ditto'));
    const data = await turn(c, battle, 'swift', 'swift');
    assert.equal(data.turn.round, 1);
    assert.deepEqual(data.turn.order, ['p1', 'p2'], 'Charmander (Vel 70) actúa antes que Ditto (Vel 53)');
    for (const event of data.turn.events) {
      assert.equal(event.hit, true, 'Rapidez nunca falla');
      assert.ok(event.damage > 0);
      assertHpRule(event);
      assert.equal(data.battle.participants[event.defender].hp.current, event.hpAfter);
    }
    assert.equal(data.battle.turns.length, 1);
  });

  add('C04', 'Un movimiento fallido por precisión no causa daño', 'RF06', async (c) => {
    const p1 = await make(c, 'charmander'), p2 = await make(c, 'bulbasaur');
    let missed;
    for (let seed = 1; seed <= 60 && !missed; seed += 1) {
      const battle = await start(c, p1, p2, { seed });
      const data = await turn(c, battle, 'fire-blast', 'vine-whip'); // Llamarada: 85 % de precisión
      const event = eventOf(data, 'p1');
      if (!event.hit) missed = { event, data };
    }
    assert.ok(missed, 'Con 60 semillas debe aparecer al menos un fallo');
    assert.equal(missed.event.damage, 0);
    assert.equal(missed.event.hpAfter, missed.event.hpBefore);
    assert.equal(missed.data.battle.participants.p2.hp.current, missed.data.battle.participants.p2.hp.max);
    assert.match(missed.event.message, /falló/);
  });

  add('C05', 'Ataque con STAB y ataque sin STAB', 'RF07/RF09', async (c) => {
    const p1 = await make(c, 'charmander'), p2 = await make(c, 'ditto');
    const stab = eventOf(await turn(c, await start(c, p1, p2), 'flamethrower', 'swift'), 'p1');
    const plain = eventOf(await turn(c, await start(c, p1, p2), 'swift', 'swift'), 'p1');
    assert.equal(stab.stab, 1.5); assert.equal(stab.move.type, 'fire');
    assert.equal(plain.stab, 1); assert.equal(plain.move.type, 'normal');
    for (const event of [stab, plain]) {
      assert.ok(event.random >= 85 && event.random <= 100);
      assert.equal(event.damage, expectedDamage(event));
    }
  });

  add('C06', 'Ataque súper efectivo', 'RF08', async (c) => {
    const data = await turn(c, await start(c, await make(c, 'charmander'), await make(c, 'bulbasaur')),
      'flamethrower', 'vine-whip');
    const event = eventOf(data, 'p1');
    assert.equal(event.effectiveness, 2);
    assert.equal(event.damage, expectedDamage(event));
    assert.match(event.message, /súper eficaz/);
  });

  add('C07', 'Ataque poco efectivo', 'RF08', async (c) => {
    const data = await turn(c, await start(c, await make(c, 'charmander'), await make(c, 'squirtle')),
      'flamethrower', 'swift');
    const event = eventOf(data, 'p1');
    assert.equal(event.effectiveness, 0.5);
    assert.equal(event.damage, expectedDamage(event));
    assert.match(event.message, /No es muy eficaz/);
  });

  add('C08', 'Inmunidad entre tipos de primera generación', 'RF08', async (c) => {
    const normalVsGhost = eventOf(await turn(c, await start(c, await make(c, 'charmander'),
      await make(c, 'gastly')), 'swift', 'swift'), 'p1');
    const electricVsGround = eventOf(await turn(c, await start(c, await make(c, 'pikachu'),
      await make(c, 'diglett')), 'thunderbolt', 'swift'), 'p1');
    for (const event of [normalVsGhost, electricVsGround]) {
      assert.equal(event.hit, true);
      assert.equal(event.effectiveness, 0);
      assert.equal(event.damage, 0);
      assert.equal(event.hpAfter, event.hpBefore);
      assert.match(event.message, /No afecta/);
    }
  });

  add('C09', 'El daño no deja PS negativos', 'RF10', async (c) => {
    let data = { battle: await start(c, await make(c, 'charmander'), await make(c, 'bulbasaur')) };
    for (let i = 0; i < 20 && data.battle.status === 'en-curso'; i += 1) {
      data = await turn(c, data.battle, 'flamethrower', 'vine-whip');
    }
    const events = data.battle.turns.flatMap((item) => item.events);
    events.forEach(assertHpRule);
    const fatal = events.find((event) => event.fainted);
    assert.ok(fatal.damage > fatal.hpBefore, 'El golpe final supera los PS restantes');
    assert.equal(fatal.hpAfter, 0);
    assert.equal(data.battle.participants[fatal.defender].hp.current, 0);
  });

  add('C10', 'El combate termina cuando un Pokémon llega a cero', 'RF11', async (c) => {
    let data = { battle: await start(c, await make(c, 'squirtle'), await make(c, 'charmander'), { mode: 'cpu', seed: 99 }) };
    for (let i = 0; i < 50 && data.battle.status === 'en-curso'; i += 1) {
      data = await turn(c, data.battle, 'surf');
    }
    const { result, participants } = data.battle;
    assert.equal(data.battle.status, 'finalizado');
    assert.ok(['p1', 'p2'].includes(result.winner));
    assert.notEqual(result.winner, result.loser);
    assert.equal(participants[result.loser].hp.current, 0);
    assert.ok(participants[result.winner].hp.current > 0);
    assert.match(result.message, new RegExp(participants[result.winner].name));
  });

  add('C11', 'No se permiten acciones después de finalizar', 'RF11', async (c) => {
    let data = { battle: await start(c, await make(c, 'charmander'), await make(c, 'bulbasaur')) };
    while (data.battle.status === 'en-curso') data = await turn(c, data.battle, 'flamethrower', 'vine-whip');
    const before = (await c.req('GET', `/api/battles/${data.battle.id}`)).data;
    jsonError(await c.req('POST', `/api/battles/${data.battle.id}/turn`, { p1Move: 'flamethrower', p2Move: 'vine-whip' }), 409);
    jsonError(await c.req('POST', `/api/battles/${data.battle.id}/turn`, {}), 409);
    assert.deepEqual((await c.req('GET', `/api/battles/${data.battle.id}`)).data, before);
  });

  add('C12', 'Error o dato faltante de la API con mensaje controlado', 'Sección 10/11', async (c) => {
    const pikachu = await make(c, 'pikachu'), ditto = await make(c, 'ditto');
    c.fixture.state.failure = true;
    const down = await c.req('POST', '/api/battles', { p1: { recordId: pikachu.id }, p2: { recordId: ditto.id } });
    jsonError(down, 502); assert.match(down.data.error, /pikachu/);
    c.fixture.state.failure = false;
    const battle = await start(c, pikachu, ditto);
    assert.deepEqual((await c.req('GET', `/api/records/${pikachu.id}`)).data.types, ['electric'],
      'Los tipos completados se guardan en el registro existente');

    const custom = await c.req('POST', '/api/records', { pokemonName: 'grupo6-custom',
      stats: Object.fromEntries(fields.map((field) => [field, 50])) });
    const incomplete = await c.req('POST', '/api/battles', { p1: { recordId: custom.data.id }, p2: { recordId: ditto.id } });
    jsonError(incomplete, 422); assert.match(incomplete.data.error, /grupo6-custom/);

    jsonError(await c.req('POST', '/api/battles', { p1: { recordId: '00000000-0000-0000-0000-000000000000' }, p2: { recordId: ditto.id } }), 404);
    jsonError(await c.req('POST', '/api/battles', { p1: { recordId: pikachu.id } }), 400);
    jsonError(await c.req('POST', '/api/battles', { mode: 'online', p1: { recordId: pikachu.id }, p2: { recordId: ditto.id } }), 400);
    jsonError(await c.req('POST', '/api/battles', []), 400);
    jsonError(await c.req('GET', '/api/battles/no-existe'), 404);
    jsonError(await c.req('POST', `/api/battles/${battle.id}/turn`, { p1Move: 'hyper-beam', p2Move: 'swift' }), 400);
    assert.equal((await c.req('GET', `/api/battles/${battle.id}`)).data.round, 0);
  });
};
