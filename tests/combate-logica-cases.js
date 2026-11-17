// K01–K05: la lógica de pelea a través de la API real (HTTP), comparada con el oráculo
// independiente de tests/oraculo-combate.js. Los combates se crean con registros del CRUD.
const assert = require('node:assert/strict');
const { fields } = require('./helpers');
const oracle = require('./oraculo-combate');

const FIXTURE = ['bulbasaur', 'charmander', 'squirtle', 'pikachu', 'diglett', 'abra', 'machop', 'geodude',
  'gastly', 'gyarados', 'ditto', 'dratini'];

module.exports = function registerCombatLogicCases(add, { ok }) {
  const make = async (c, name) => {
    const { id, base } = oracle.SPECIES[name];
    const result = await c.req('POST', '/api/records', { pokemonName: name, pokemonId: id,
      stats: Object.fromEntries(fields.map((field, index) => [field, base[index]])) });
    ok(result, 201);
    return result.data;
  };
  const start = async (c, p1, p2, extra = {}) => {
    const result = await c.req('POST', '/api/battles', { mode: 'cpu', p1: { recordId: p1.id }, p2: { recordId: p2.id }, ...extra });
    ok(result, 201);
    return result.data;
  };
  const turn = async (c, battle, p1Move, p2Move) => {
    const result = await c.req('POST', `/api/battles/${battle.id}/turn`, { p1Move, p2Move });
    ok(result, 200);
    return result.data;
  };
  // Comprueba un evento de la API con el oráculo, usando los datos que entrega la propia API.
  const checkEvent = (battle, event) => {
    const attacker = battle.participants[event.attacker];
    const defender = battle.participants[event.defender];
    const move = attacker.moves.find((item) => item.id === event.move.id);
    assert.ok(move, 'El movimiento pertenece al atacante');
    if (!event.hit) { assert.equal(event.damage, 0); return null; }
    const expected = oracle.expectedHit({ attacker, defender, move, critical: Boolean(event.critical), random: event.random });
    assert.equal(event.damage, expected.damage, `${attacker.name} ${move.id} → ${defender.name}`);
    assert.equal(event.effectiveness, expected.effectiveness);
    assert.equal(event.hpAfter, Math.max(0, event.hpBefore - event.damage));
    return expected;
  };

  add('K01', 'Combates completos por la API: cada ataque coincide con el oráculo', 'RF04–RF11', async (c) => {
    const records = {};
    for (const name of FIXTURE) records[name] = await make(c, name);
    const pick = oracle.seeded(13);
    const totals = { battles: 0, attacks: 0, misses: 0, crits: 0, effects: { 0: 0, 0.25: 0, 0.5: 0, 1: 0, 2: 0, 4: 0 } };
    for (let n = 0; n < 30; n += 1) {
      const p1Name = FIXTURE[Math.floor(pick() * FIXTURE.length)];
      const p2Name = FIXTURE[Math.floor(pick() * FIXTURE.length)];
      let battle = await start(c, records[p1Name], records[p2Name], { seed: 500 + n });
      // Las estadísticas de combate que entrega la API son las de la fórmula de nivel 50.
      assert.deepEqual(battle.participants.p1.stats, oracle.stats(oracle.baseOf(p1Name)));
      assert.deepEqual(battle.participants.p2.stats, oracle.stats(oracle.baseOf(p2Name)));
      while (battle.status === 'en-curso') {
        const moves = battle.participants.p1.moves;
        const data = await turn(c, battle, moves[Math.floor(pick() * moves.length)].id);
        battle = data.battle;
        const first = oracle.firstBySpeed(battle.participants.p1, battle.participants.p2);
        if (first) assert.equal(data.turn.order[0], first, 'Actúa primero el más rápido');
        for (const event of data.turn.events) {
          const expected = checkEvent(battle, event);
          totals.attacks += 1;
          if (!expected) totals.misses += 1;
          else {
            totals.effects[expected.effectiveness] += 1;
            if (event.critical) totals.crits += 1;
          }
        }
      }
      assert.equal(battle.participants[battle.result.loser].hp.current, 0);
      assert.ok(battle.participants[battle.result.winner].hp.current > 0);
      totals.battles += 1;
    }
    const effects = Object.entries(totals.effects).filter(([, count]) => count).map(([value, count]) => `×${value}: ${count}`).join(', ');
    c.note(`${totals.battles} combates, ${totals.attacks} ataques (${totals.misses} fallos, ${totals.crits} críticos; efectividad ${effects}); todos coinciden con el oráculo`);
  });

  add('K02', 'Multiplicadores dobles: ×4 y ×0,25 por la API', 'RF08', async (c) => {
    const pikachu = await make(c, 'pikachu'), gyarados = await make(c, 'gyarados'), bulbasaur = await make(c, 'bulbasaur');
    const quad = await turn(c, await start(c, pikachu, gyarados, { mode: 'pvp', seed: 3 }), 'thunderbolt', 'surf');
    const quadEvent = quad.turn.events.find((event) => event.attacker === 'p1');
    assert.equal(quadEvent.effectiveness, 4, 'Eléctrico contra Agua/Volador = 2 × 2');
    assert.match(quadEvent.message, /súper eficaz/);
    checkEvent(quad.battle, quadEvent);
    const quarter = await turn(c, await start(c, bulbasaur, bulbasaur, { mode: 'pvp', seed: 3 }), 'razor-leaf', 'razor-leaf');
    for (const event of quarter.turn.events.filter((item) => item.hit)) {
      assert.equal(event.effectiveness, 0.25, 'Planta contra Planta/Veneno = 0,5 × 0,5');
      assert.match(event.message, /No es muy eficaz/);
      checkEvent(quarter.battle, event);
    }
    c.note(`Rayo a Gyarados: ×4, daño ${quadEvent.damage}. Hoja Afilada entre Bulbasaur: ×0,25`);
  });

  add('K03', 'Orden por Velocidad y empate sorteado por la API', 'RF05', async (c) => {
    const pikachu = await make(c, 'pikachu'), geodude = await make(c, 'geodude'), ditto = await make(c, 'ditto');
    for (let seed = 0; seed < 8; seed += 1) {
      const data = await turn(c, await start(c, geodude, pikachu, { mode: 'pvp', seed }), 'tackle', 'swift');
      assert.equal(data.turn.order[0], 'p2', 'Pikachu (Vel. 95) actúa antes que Geodude (Vel. 25)');
    }
    const firsts = new Set();
    for (let seed = 0; seed < 30; seed += 1) {
      const data = await turn(c, await start(c, ditto, ditto, { mode: 'pvp', seed }), 'swift', 'swift');
      assert.equal(data.turn.speedTie, true);
      firsts.add(data.turn.order[0]);
    }
    assert.deepEqual([...firsts].sort(), ['p1', 'p2'], 'En empate, a veces empieza cada uno');
  });

  add('K04', 'Precisión y golpes críticos por la API', 'RF06 / críticos', async (c) => {
    const pikachu = await make(c, 'pikachu'), gyarados = await make(c, 'gyarados');
    let hits = 0, crits = 0;
    const N = 150;
    for (let seed = 0; seed < N; seed += 1) {
      const data = await turn(c, await start(c, pikachu, gyarados, { mode: 'pvp', seed: 1000 + seed }), 'thunder', 'surf');
      const event = data.turn.events.find((item) => item.attacker === 'p1');
      if (!event) continue;
      if (event.hit) {
        hits += 1;
        if (event.critical) crits += 1;
        checkEvent(data.battle, event);
      } else {
        assert.equal(event.hpAfter, event.hpBefore, 'Un fallo no quita PS');
        assert.match(event.message, /falló/);
      }
    }
    assert.ok(hits / N > 0.6 && hits / N < 0.8, `Trueno (70 %) acertó ${hits} de ${N}`);
    assert.ok(crits > 0, 'Hubo golpes críticos y su daño siguió la fórmula');
    c.note(`Trueno acertó ${hits} de ${N} (${((hits / N) * 100).toFixed(0)} %, esperado 70 %); ${crits} críticos (esperado ≈ 17,6 % de los aciertos)`);
  });

  add('K05', 'El Pokémon salvaje elige al azar entre sus movimientos por la API', 'Modo salvaje', async (c) => {
    const ditto = await make(c, 'ditto'), gyarados = await make(c, 'gyarados');
    const counts = {};
    let battle;
    for (let seed = 0; seed < 120; seed += 1) {
      const data = await turn(c, (battle = await start(c, ditto, gyarados, { seed: 2000 + seed })), 'tackle', 'surf');
      const wild = data.turn.events.find((event) => event.attacker === 'p2');
      if (wild) counts[wild.move.id] = (counts[wild.move.id] || 0) + 1;
    }
    const own = battle.participants.p2.moves.map((move) => move.id).sort();
    assert.deepEqual(Object.keys(counts).sort(), own, 'Usa sus 4 movimientos y ninguno ajeno (ignora el p2Move del cliente)');
    c.note(`Elecciones del salvaje: ${Object.entries(counts).map(([id, count]) => `${id} ${count}`).join(', ')}`);
  });
};
