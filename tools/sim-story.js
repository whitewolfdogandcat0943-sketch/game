/* sim-story.js - 物語モードを1周ぶん自動で通す
 * 会話は飛ばし、戦闘だけを簡易AIで処理して、章ごとの手応えを測る。 */
const { loadEngine, newState } = require('./load-data.js');

function heroAI(G, b) {
  var u = b.actor;
  var foes = G.Battle.aliveEnemies(b);
  var party = G.Battle.partyUnits(b);
  var mates = party.filter(G.Battle.alive);
  var sks = G.Stats.skillList(u.hero).map(function (id) { return G.SKILLS[id]; })
    .filter(function (s) { return (s.mp || 0) <= u.mp; });
  var hurt = mates.slice().sort(function (x, y) { return x.hp / x.S.maxHp - y.hp / y.S.maxHp; })[0];
  var down = party.filter(function (m) { return m.hp <= 0; })[0];

  /* 1. 倒れた仲間を起こす */
  if (down) {
    var rev = sks.filter(function (s) { return s.eff && s.eff.revive; })[0];
    if (rev) return { type: 'skill', id: rev.id, target: { ally: party.indexOf(down) } };
    if (b.state.hero.items.r_revive) {
      return { type: 'item', id: 'r_revive', target: { ally: party.indexOf(down) } };
    }
  }
  /* 2. 誰かが瀕死なら回復を優先する */
  var heals = sks.filter(function (s) { return s.kind === 'heal'; });
  if (heals.length && hurt && hurt.hp / hurt.S.maxHp < 0.45) {
    var many = mates.filter(function (m) { return m.hp / m.S.maxHp < 0.6; }).length >= 2;
    var pickH = heals.filter(function (s) { return many ? s.target === 'allies' : true; })[0] || heals[0];
    return { type: 'skill', id: pickH.id, target: { ally: party.indexOf(hurt) } };
  }
  if (hurt && hurt.hp / hurt.S.maxHp < 0.4) {
    var pot = b.state.hero.items.i_hipotion ? 'i_hipotion'
            : (b.state.hero.items.i_potion ? 'i_potion' : null);
    if (pot) return { type: 'item', id: pot, target: { ally: party.indexOf(hurt) } };
  }
  /* 3. 攻撃 */
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

/* 町での買い物。実際の遊びでは必ず補充してから潜るので、
 * 補充しないままの数字で難度を測ると実態より厳しく出る。 */
function restock(G, st) {
  const want = { i_hipotion: 10, i_potion: 10, r_revive: 3, i_ether: 6 };
  Object.keys(want).forEach(id => {
    const def = (G.ITEM_BY_ID && G.ITEM_BY_ID[id]) ||
                G.ITEMS.concat(G.RARE_ITEMS || []).filter(x => x.id === id)[0];
    if (!def) return;
    while ((st.hero.items[id] || 0) < want[id] && st.hero.gold >= def.price) {
      st.hero.gold -= def.price;
      G.addItem(st.hero, id, 1);
    }
  });
}

function fight(G, state, enc) {
  var b = G.Battle.start(state, enc.units, { isBoss: enc.isBoss });
  var guard = 0;
  while (!b.over && guard++ < 400) {
    if (!b.awaiting) { G.Battle.advance(b); continue; }
    G.Battle.playerAction(b, heroAI(G, b));
  }
  return b;
}

function playthrough(G, log) {
  const st = newState(G);
  G.Story.begin(st, 'カイ');
  const out = [];
  let wipes = 0;
  for (let ci = 0; ci < G.STORY.CHAPTERS.length; ci++) {
    const c = G.Story.chapter(st);
    const dungeons = c.places.filter(p => p.kind === 'dungeon');
    for (const d of dungeons) {
      restock(G, st);
      G.Story.enterDungeon(st, d.id);
      let steps = 0;
      while (st.story.dungeon && steps++ < 40) {
        const enc = G.Story.nextEncounter(st);
        const b = fight(G, st, enc);
        if (b.result !== 'win') {
          wipes++;
          // 立て直し: 全回復して同じ戦闘からやり直す
          st.hero.gold = Math.floor(st.hero.gold / 2);
          G.Run.healParty(st, 1);
          continue;
        }
        G.Run.grantVictory(st, b, enc.kind);
        G.Run.applyLevelUps(st);
        G.Run.healParty(st, 0.3, 0.2);
        if (G.Story.advanceDungeon(st)) G.Story.leaveDungeon(st);
      }
      G.Run.healParty(st, 1);   /* 宿に泊まった想定 */
    }
    out.push({
      ch: c.id, title: c.title, lv: st.hero.level, gold: st.hero.gold,
      party: (st.party || []).length, wipes: wipes
    });
    if (!G.Story.chapterDone(st)) { out.push({ ch: c.id, error: '目標未達' }); break; }
    G.Story.joinForChapter(st);
    if (!G.Story.nextChapter(st)) break;
  }
  if (log) out.forEach(r => console.log(JSON.stringify(r)));
  return { st, wipes, done: st.story.done, out };
}

function main() {
  const G = loadEngine();
  /* 難易度を指定できる: node tools/sim-story.js --diff hard */
  const di = process.argv.indexOf('--diff');
  const diff = di >= 0 ? process.argv[di + 1] : 'normal';
  G.Diff.set(diff);
  console.log('難易度:', G.Diff.get().name);
  const n = process.argv.indexOf('-v') >= 0 ? 1 : 20;
  let done = 0, totalWipes = 0, lvs = [];
  for (let i = 0; i < n; i++) {
    const r = playthrough(G, n === 1);
    if (r.done) done++;
    totalWipes += r.wipes;
    lvs.push(r.st.hero.level);
  }
  lvs.sort((a, b) => a - b);
  console.log('通し回数:', n, '／ 完走:', done);
  console.log('全滅回数の平均:', (totalWipes / n).toFixed(1));
  console.log('最終レベル 中央値:', lvs[Math.floor(n / 2)], '最小:', lvs[0], '最大:', lvs[lvs.length - 1]);
}
main();
