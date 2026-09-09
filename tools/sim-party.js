/* sim-party.js - パーティ戦闘のシミュレーション
 * 主人公の行動は簡易AIで代行し、仲間は本編と同じ自動行動で戦う。 */
const { loadEngine, newState } = require('./load-data.js');

function heroAI(G, b) {
  var u = b.actor;
  var foes = G.Battle.aliveEnemies(b);
  var party = G.Battle.partyUnits(b);
  var mates = party.filter(G.Battle.alive);
  var sks = G.Stats.skillList(u.hero).map(function (id) { return G.SKILLS[id]; })
    .filter(function (s) { return (s.mp || 0) <= u.mp; });
  var hurt = mates.slice().sort(function (x, y) { return x.hp / x.S.maxHp - y.hp / y.S.maxHp; })[0];
  if (u.hp / u.S.maxHp < 0.35 && b.state.hero.items.i_potion) {
    return { type: 'item', id: 'i_potion', target: { ally: party.indexOf(u) } };
  }
  var heals = sks.filter(function (s) { return s.kind === 'heal'; });
  if (heals.length && hurt.hp / hurt.S.maxHp < 0.4) {
    return { type: 'skill', id: heals[0].id, target: { ally: party.indexOf(hurt) } };
  }
  var atks = sks.filter(function (s) { return s.kind === 'phys' || s.kind === 'mag'; });
  if (foes.length >= 3) {
    var aoe = atks.filter(function (s) { return s.target === 'all'; });
    if (aoe.length) atks = aoe;
  }
  if (u.mp < u.S.maxMp * 0.2) atks = atks.filter(function (s) { return (s.mp || 0) === 0; });
  atks.sort(function (x, y) { return (y.power || 0) * (y.hits || 1) - (x.power || 0) * (x.hits || 1); });
  var use = atks[0] || G.SKILLS.attack;
  var foe = foes.slice().sort(function (x, y) { return x.hp - y.hp; })[0];
  return { type: 'skill', id: use.id, target: { foe: b.enemies.indexOf(foe) } };
}

function runBattle(G, state, kind, verbose) {
  var enc = G.Run.makeEncounter(state, kind);
  var b = G.Battle.start(state, enc.units, { isBoss: kind === 'boss' });
  var guard = 0;
  while (!b.over && guard++ < 400) {
    if (!b.awaiting) { G.Battle.advance(b); continue; }
    G.Battle.playerAction(b, heroAI(G, b));
  }
  if (verbose) b.log.forEach(function (l) { console.log('  ' + l.t); });
  return b;
}

function main() {
  const G = loadEngine();
  const verbose = process.argv.indexOf('-v') >= 0;
  const runs = verbose ? 1 : 40;
  let wins = 0, floors = [], deaths = {};
  for (let r = 0; r < runs; r++) {
    const st = newState(G);
    G.Run.newRun(st, 'swordsman', 'リオン');
    ['mina', 'garo', 'sera'].forEach(function (id) { G.Run.joinAlly(st, id); });
    let alive = true;
    for (let f = 1; f <= 25 && alive; f++) {
      st.run.floor = f;
      const kind = f % 5 === 0 ? 'boss' : (f % 3 === 0 ? 'elite' : 'battle');
      const b = runBattle(G, st, kind, verbose && f <= 2);
      if (b.result !== 'win') {
        alive = false; floors.push(f);
        G.Battle.partyUnits(b).forEach(function (m) {
          if (m.hp <= 0) deaths[m.name] = (deaths[m.name] || 0) + 1;
        });
        break;
      }
      G.Run.grantVictory(st, b, kind);
      G.Run.applyLevelUps(st);
      if (f % 5 === 0) G.Run.healParty(st, 1);
      else G.Run.healParty(st, 0.25, 0.15);
    }
    if (alive) { wins++; floors.push(25); }
  }
  if (!verbose) {
    floors.sort(function (a, b2) { return a - b2; });
    console.log('走行数:', runs, '／ 25階到達:', wins);
    console.log('到達階の中央値:', floors[Math.floor(floors.length / 2)], '最小:', floors[0], '最大:', floors[floors.length - 1]);
    console.log('全滅時に倒れていた人数:', JSON.stringify(deaths));
  }
}
main();
