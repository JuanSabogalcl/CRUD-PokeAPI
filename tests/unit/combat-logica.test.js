// Pruebas de la lógica de pelea contra el oráculo independiente (tests/oraculo-combate.js).
// L01–L12: miles de ataques y combates completos; cada resultado del motor se compara con el
// calculado a partir de la especificación. Las pruebas estadísticas usan semillas fijas.
const test = require('node:test');
const assert = require('node:assert/strict');
const oracle = require('../oraculo-combate');
const { typeEffectiveness } = require('../../lib/combat/types');
const { MOVES, movesetFor, describeMove } = require('../../lib/combat/moves');
const rules = require('../../lib/combat/rules');
const { createBattle, executeAction, playTurn, publicBattle } = require('../../lib/combat/battle');

const NAMES = Object.keys(oracle.SPECIES);
const report = (t, text) => t.diagnostic(text);

// Generador guionizado que debe consumirse completo: comprueba también el orden de las tiradas.
function scripted(values) {
  const queue = [...values];
  const random = () => {
    assert.ok(queue.length > 0, 'El motor pidió más números aleatorios de los que fija la especificación');
    return queue.shift();
  };
  random.left = () => queue.length;
  return random;
}
const rollFor = (value) => (value - 85 + 0.5) / 16; // Tirada que produce la variación entera `value`.

test('L01 · tabla de tipos de la Gen 1: las 225 combinaciones coinciden y hay 6 inmunidades', (t) => {
  const zeros = [];
  for (const attack of oracle.TYPES) {
    for (const defense of oracle.TYPES) {
      const expected = oracle.effectiveness(attack, [defense]).value;
      assert.equal(typeEffectiveness(attack, [defense]), expected, `${attack} → ${defense}`);
      if (expected === 0) zeros.push(`${attack}→${defense}`);
    }
  }
  assert.deepEqual(zeros.sort(), ['electric→ground', 'fighting→ghost', 'ghost→normal', 'ghost→psychic',
    'ground→flying', 'normal→ghost']);
  report(t, `225 combinaciones verificadas; inmunidades: ${zeros.join(', ')}`);
});

test('L02 · doble tipo: se multiplican los dos modificadores (1 575 combinaciones)', (t) => {
  let checked = 0;
  const seen = new Set();
  for (const attack of oracle.TYPES) {
    oracle.TYPES.forEach((first, i) => oracle.TYPES.slice(i + 1).forEach((second) => {
      const expected = oracle.effectiveness(attack, [first, second]).value;
      assert.equal(typeEffectiveness(attack, [first, second]), expected, `${attack} → ${first}/${second}`);
      seen.add(expected);
      checked += 1;
    }));
  }
  assert.equal(checked, 1575);
  assert.deepEqual([...seen].sort((a, b) => a - b), [0, 0.25, 0.5, 1, 2, 4]);
  report(t, `${checked} combinaciones; valores posibles: ${[...seen].sort((a, b) => a - b).join(', ')}`);
});

test('L03 · estadísticas de combate al nivel 50 para toda base entre 1 y 255', () => {
  for (let base = 1; base <= 255; base += 1) {
    const all = Object.fromEntries(oracle.STAT_ORDER.map((key) => [key, base]));
    assert.deepEqual(rules.battleStats(all), oracle.stats(all), `base ${base}`);
  }
});

test('L04 · daño: el motor coincide con el oráculo en todos los ataques posibles', (t) => {
  let checked = 0;
  let damaging = 0;
  for (const attackerName of NAMES) {
    for (const defenderName of NAMES) {
      const battle = createBattle({ p1: oracle.recordOf(attackerName), p2: oracle.recordOf(defenderName), mode: 'pvp', seed: 1 });
      const attacker = battle.participants.p1;
      const defender = battle.participants.p2;
      for (const moveId of attacker.moves) {
        const move = describeMove(moveId);
        const eff = oracle.effectiveness(move.type, defender.types).value;
        for (const critical of [false, true]) {
          for (const value of [85, 92, 100]) {
            defender.hp.current = defender.hp.max;
            const rolls = [];
            if (move.accuracy !== null) rolls.push(0); // acierta
            if (eff > 0 && !move.fixedDamage) rolls.push(critical ? 0 : 0.999999, rollFor(value));
            const random = scripted(rolls);
            const event = executeAction(battle, 'p1', moveId, random);
            assert.equal(random.left(), 0, 'El motor no consumió las tiradas en el orden documentado');
            const expected = oracle.expectedHit({ attacker, defender, move, critical: critical && eff > 0 && !move.fixedDamage, random: value });
            const label = `${attackerName} ${moveId} → ${defenderName} (crítico ${critical}, var ${value})`;
            assert.equal(event.damage, expected.damage, label);
            assert.equal(event.effectiveness, expected.effectiveness, label);
            if (!move.fixedDamage) {
              assert.equal(event.baseDamage, expected.baseDamage, label);
              assert.equal(event.stab, expected.stab, label);
            }
            assert.equal(event.hpAfter, Math.max(0, event.hpBefore - expected.damage), label);
            checked += 1;
            if (expected.damage > 0) damaging += 1;
          }
        }
      }
    }
  }
  report(t, `${checked} ataques comparados con el oráculo (${damaging} con daño, ${checked - damaging} sin daño por inmunidad)`);
});

test('L05 · precisión: la tasa de acierto observada coincide con la de cada movimiento', (t) => {
  const N = 20000;
  const lines = [];
  for (const moveId of ['rock-throw', 'thunder', 'slam', 'hydro-pump', 'fire-blast', 'blizzard', 'tackle', 'surf', 'swift']) {
    const battle = createBattle({ p1: oracle.recordOf('mewtwo'), p2: oracle.recordOf('snorlax'), mode: 'pvp', seed: 2024 });
    let hits = 0;
    for (let i = 0; i < N; i += 1) {
      battle.participants.p2.hp.current = battle.participants.p2.hp.max;
      const event = executeAction(battle, 'p1', moveId, () => rules.nextRandom(battle));
      if (event.hit) hits += 1;
      else assert.equal(event.damage, 0, 'Un fallo no hace daño');
    }
    const expected = MOVES[moveId].accuracy === null ? 1 : MOVES[moveId].accuracy / 100;
    const observed = hits / N;
    assert.ok(Math.abs(observed - expected) <= 0.015, `${moveId}: ${observed} frente a ${expected}`);
    lines.push(`${moveId} ${(observed * 100).toFixed(1)} % (esperado ${expected * 100} %)`);
  }
  report(t, lines.join(' · '));
});

test('L06 · golpes críticos: la frecuencia observada es ⌊Velocidad base / 2⌋ / 256', (t) => {
  const N = 20000;
  const lines = [];
  for (const name of ['snorlax', 'charmander', 'pikachu', 'mewtwo']) {
    const battle = createBattle({ p1: oracle.recordOf(name), p2: oracle.recordOf('snorlax'), mode: 'pvp', seed: 77 });
    let crits = 0;
    for (let i = 0; i < N; i += 1) {
      battle.participants.p2.hp.current = battle.participants.p2.hp.max;
      if (executeAction(battle, 'p1', 'swift', () => rules.nextRandom(battle)).critical) crits += 1;
    }
    const expected = oracle.criticalChance(oracle.SPECIES[name].base[5]);
    assert.ok(Math.abs(crits / N - expected) <= 0.012, `${name}: ${crits / N} frente a ${expected}`);
    lines.push(`${name} ${((crits / N) * 100).toFixed(1)} % (esperado ${(expected * 100).toFixed(1)} %)`);
  }
  report(t, lines.join(' · '));
});

test('L07 · variación aleatoria: enteros de 85 a 100 con frecuencia pareja', (t) => {
  const N = 32000;
  const battle = createBattle({ p1: oracle.recordOf('ditto'), p2: oracle.recordOf('snorlax'), mode: 'pvp', seed: 9 });
  const counts = new Map();
  for (let i = 0; i < N; i += 1) {
    battle.participants.p2.hp.current = battle.participants.p2.hp.max;
    const { random } = executeAction(battle, 'p1', 'swift', () => rules.nextRandom(battle));
    assert.ok(Number.isInteger(random) && random >= 85 && random <= 100, `variación ${random}`);
    counts.set(random, (counts.get(random) || 0) + 1);
  }
  assert.equal(counts.size, 16, 'Deben aparecer los 16 valores');
  for (const [value, count] of counts) assert.ok(Math.abs(count - N / 16) <= (N / 16) * 0.15, `${value}: ${count}`);
  report(t, `16 valores, entre ${Math.min(...counts.values())} y ${Math.max(...counts.values())} apariciones (esperado ${N / 16})`);
});

test('L08 · orden por Velocidad en los 361 enfrentamientos y empates sorteados 50/50', (t) => {
  for (const first of NAMES) {
    for (const second of NAMES) {
      const battle = createBattle({ p1: oracle.recordOf(first), p2: oracle.recordOf(second), mode: 'pvp', seed: 5 });
      const turn = playTurn(battle, { p1: battle.participants.p1.moves[0], p2: battle.participants.p2.moves[0] });
      const expected = oracle.firstBySpeed(battle.participants.p1, battle.participants.p2);
      if (expected) assert.equal(turn.order[0], expected, `${first} contra ${second}`);
      else assert.equal(turn.speedTie, true);
    }
  }
  let p1First = 0;
  const N = 4000;
  for (let seed = 0; seed < N; seed += 1) {
    const battle = createBattle({ p1: oracle.recordOf('ditto'), p2: oracle.recordOf('ditto'), mode: 'pvp', seed });
    if (playTurn(battle, { p1: 'swift', p2: 'swift' }).order[0] === 'p1') p1First += 1;
  }
  assert.ok(Math.abs(p1First / N - 0.5) <= 0.03, `empates: jugador 1 primero ${p1First / N}`);
  report(t, `361 enfrentamientos con el orden correcto; en ${N} empates el jugador 1 fue primero el ${((p1First / N) * 100).toFixed(1)} %`);
});

test('L09 · 2 000 combates completos: cada ataque, los PS y el final siguen las reglas', (t) => {
  const pick = oracle.seeded(4242);
  const totals = { battles: 0, rounds: 0, attacks: 0, misses: 0, crits: 0, immune: 0, superEffective: 0, resisted: 0 };
  for (let n = 0; n < 2000; n += 1) {
    const p1Name = NAMES[Math.floor(pick() * NAMES.length)];
    const p2Name = NAMES[Math.floor(pick() * NAMES.length)];
    const battle = createBattle({ p1: oracle.recordOf(p1Name), p2: oracle.recordOf(p2Name), mode: 'cpu', seed: n });
    const { p1, p2 } = battle.participants;
    while (battle.status === 'en-curso') {
      assert.ok(battle.round < 200, 'El combate debe terminar');
      const before = { p1: p1.hp.current, p2: p2.hp.current };
      const turn = playTurn(battle, { p1: p1.moves[Math.floor(pick() * p1.moves.length)] });
      const expectedFirst = oracle.firstBySpeed(p1, p2);
      if (expectedFirst) assert.equal(turn.order[0], expectedFirst, 'Orden por Velocidad');
      assert.ok(turn.events.length >= 1 && turn.events.length <= 2);
      const hp = { ...before };
      turn.events.forEach((event, index) => {
        const attacker = battle.participants[event.attacker];
        const defender = battle.participants[event.defender];
        assert.ok(attacker.moves.includes(event.move.id), 'Solo usa movimientos propios');
        assert.ok(hp[event.attacker] > 0, 'Un Pokémon debilitado no ataca');
        assert.equal(event.hpBefore, hp[event.defender], 'Los PS previos son los que dejó el ataque anterior');
        if (event.hit) {
          const expected = oracle.expectedHit({ attacker, defender, move: describeMove(event.move.id),
            critical: Boolean(event.critical), random: event.random });
          assert.equal(event.damage, expected.damage, `${attacker.name} ${event.move.id} → ${defender.name}`);
          if (event.critical) totals.crits += 1;
          if (expected.effectiveness === 0) totals.immune += 1;
          else if (expected.effectiveness > 1) totals.superEffective += 1;
          else if (expected.effectiveness < 1) totals.resisted += 1;
        } else {
          assert.equal(event.damage, 0);
          totals.misses += 1;
        }
        assert.equal(event.hpAfter, Math.max(0, event.hpBefore - event.damage), 'PS = antes − daño, nunca negativos');
        assert.equal(event.fainted, event.hpAfter === 0);
        if (event.fainted) assert.equal(index, turn.events.length - 1, 'Nadie actúa después de un debilitado');
        hp[event.defender] = event.hpAfter;
        totals.attacks += 1;
      });
      assert.deepEqual({ p1: p1.hp.current, p2: p2.hp.current }, hp, 'El estado del combate coincide con los eventos');
      assert.ok(p1.hp.current <= before.p1 && p2.hp.current <= before.p2, 'Los PS nunca suben');
    }
    const last = battle.turns.at(-1).events.at(-1);
    assert.equal(last.fainted, true);
    assert.equal(battle.winner, last.attacker);
    assert.equal(battle.participants[battle.loser].hp.current, 0);
    assert.ok(battle.participants[battle.winner].hp.current > 0);
    assert.throws(() => playTurn(battle, { p1: p1.moves[0] }), { status: 409 });
    totals.battles += 1;
    totals.rounds += battle.round;
  }
  report(t, `${totals.battles} combates, ${totals.rounds} rondas, ${totals.attacks} ataques: ${totals.misses} fallos, ${totals.crits} críticos, `
    + `${totals.superEffective} súper eficaces, ${totals.resisted} poco eficaces, ${totals.immune} sin efecto; todos coinciden con el oráculo`);
});

test('L10 · el Pokémon salvaje elige al azar entre sus 4 movimientos (8 000 rondas)', (t) => {
  const counts = {};
  const N = 8000;
  for (let seed = 0; seed < N; seed += 1) {
    const battle = createBattle({ p1: oracle.recordOf('snorlax'), p2: oracle.recordOf('lapras'), mode: 'cpu', seed });
    const wild = playTurn(battle, { p1: 'tackle' }).events.find((event) => event.attacker === 'p2');
    if (wild) counts[wild.move.id] = (counts[wild.move.id] || 0) + 1;
  }
  const moves = movesetFor(oracle.SPECIES.lapras.types);
  assert.deepEqual(Object.keys(counts).sort(), [...moves].sort());
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  for (const id of moves) assert.ok(Math.abs(counts[id] / total - 0.25) <= 0.02, `${id}: ${counts[id] / total}`);
  report(t, moves.map((id) => `${MOVES[id].name} ${((counts[id] / total) * 100).toFixed(1)} %`).join(' · '));
});

test('L11 · STAB y conjuntos de movimientos: 4 movimientos y STAB marcado solo con el tipo propio', () => {
  for (const name of NAMES) {
    const view = publicBattle(createBattle({ p1: oracle.recordOf(name), p2: oracle.recordOf('ditto'), mode: 'pvp', seed: 1 }));
    const fighter = view.participants.p1;
    assert.equal(fighter.moves.length, 4, name);
    // Furia Dragón (daño fijo) es el único ataque Dragón de la Gen 1 y no recibe STAB.
    assert.ok(fighter.moves.some((move) => fighter.types.includes(move.type)), `${name} tiene un ataque de su tipo`);
    for (const move of fighter.moves) {
      assert.equal(move.stab, fighter.types.includes(move.type) && !move.fixedDamage, `${name} ${move.id}`);
      assert.equal(move.category, oracle.isSpecial(move.type) ? 'special' : 'physical', `${move.id}`);
    }
  }
});

test('L12 · reglas especiales: Furia Dragón hace 40 fijo y un ataque débil sigue la fórmula (mínimo 1)', () => {
  for (const defender of NAMES) {
    const battle = createBattle({ p1: oracle.recordOf('dratini'), p2: oracle.recordOf(defender), mode: 'pvp', seed: 1 });
    const event = executeAction(battle, 'p1', 'dragon-rage', scripted([0]));
    assert.equal(event.damage, 40, `contra ${defender}`);
    assert.equal(event.critical, undefined, 'El daño fijo no tiene crítico');
  }
  // Ataque muy débil contra defensa muy alta y doble resistencia: el daño nunca baja de 1.
  const weak = createBattle({ p1: oracle.recordOf('caterpie'), p2: oracle.recordOf('onix'), mode: 'pvp', seed: 1 });
  const event = executeAction(weak, 'p1', 'tackle', scripted([0, 0.999999, rollFor(85)]));
  assert.equal(event.effectiveness, 0.5);
  assert.equal(event.damage, oracle.expectedHit({ attacker: weak.participants.p1, defender: weak.participants.p2,
    move: describeMove('tackle'), critical: false, random: 85 }).damage);
  assert.ok(event.damage >= 1);
});
