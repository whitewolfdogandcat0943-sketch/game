/* pacing.js - レベルデザインの点検
 *
 *   node tools/pacing.js            物語モードの章ごと
 *   node tools/pacing.js --tower    試練の塔の5階ごと
 *
 * 「難しすぎる／簡単すぎる」だけでなく、
 * 「新しいことが起きない時間が続いていないか」を見る。
 * 人が飽きるのは、難度が合っていない区間より、
 * 何も新しくならない区間のほうが多いため。 */
const { loadEngine, newState } = require('./load-data.js');
const G = loadEngine();

const di = process.argv.indexOf('--diff');
G.Diff.set(di >= 0 ? process.argv[di + 1] : 'normal');
const ri = process.argv.indexOf('--runs');
/* 章ごとの数字は1周ごとのばらつきが大きい（残HPで±10ポイント動く）。
 * 微調整の判断をするときは --runs 24 くらいまで上げること。 */
const RUNS = ri >= 0 ? Math.max(1, parseInt(process.argv[ri + 1], 10) || 6) : 6;

function ai(G, b) {
  const u = b.actor;
  const foes = G.Battle.aliveEnemies(b);
  const party = G.Battle.partyUnits(b);
  const mates = party.filter(G.Battle.alive);
  const sks = G.Stats.skillList(u.hero).map(id => G.SKILLS[id]).filter(s => (s.mp || 0) <= u.mp);
  const hurt = mates.slice().sort((x, y) => x.hp / x.S.maxHp - y.hp / y.S.maxHp)[0];
  const down = party.filter(m => m.hp <= 0)[0];
  if (down) {
    const rev = sks.filter(s => s.eff && s.eff.revive)[0];
    if (rev) return { type: 'skill', id: rev.id, target: { ally: party.indexOf(down) } };
  }
  const heals = sks.filter(s => s.kind === 'heal');
  if (heals.length && hurt && hurt.hp / hurt.S.maxHp < 0.45) {
    return { type: 'skill', id: heals[0].id, target: { ally: party.indexOf(hurt) } };
  }
  let atks = sks.filter(s => s.kind === 'phys' || s.kind === 'mag');
  if (foes.length >= 3) { const a = atks.filter(s => s.target === 'all'); if (a.length) atks = a; }
  if (u.mp < u.S.maxMp * 0.2) atks = atks.filter(s => (s.mp || 0) === 0);
  atks.sort((x, y) => (y.power || 0) * (y.hits || 1) - (x.power || 0) * (x.hits || 1));
  const use = atks[0] || G.SKILLS.attack;
  const foe = foes.slice().sort((x, y) => x.hp - y.hp)[0];
  return { type: 'skill', id: use.id, target: { foe: b.enemies.indexOf(foe) } };
}
function restock(st) {
  const want = { i_hipotion: 10, i_potion: 10, r_revive: 3 };
  Object.keys(want).forEach(id => {
    const def = G.ITEM_BY_ID[id];
    if (!def) return;
    while ((st.hero.items[id] || 0) < want[id] && st.hero.gold >= def.price) {
      st.hero.gold -= def.price; G.addItem(st.hero, id, 1);
    }
  });
}
/* その時点で「新しく開いているもの」を数える */
function novelty(st) {
  return {
    skills: G.Stats.skillList(st.hero).length,
    classes: G.Unlock.availableClasses(st, st.hero).filter(r => r.ok).length,
    legends: G.Stats.equippedAccs(st.hero).filter(a => a.rarity !== 'normal').length,
    bagLegend: (st.hero.bag.acc || []).filter(id => G.ACC_BY_ID[id] &&
      G.ACC_BY_ID[id].rarity === 'legend').length,
    sp: G.Tree.totalSpent(st.hero) + (st.hero.sp || 0),
    mastery: G.Mastery.wins(st.hero, st.hero.classId)
  };
}

function story() {
  const acc = {};
  for (let r = 0; r < RUNS; r++) {
    const st = newState(G);
    G.Story.begin(st, 'カイ');
    for (let ci = 0; ci < G.STORY.CHAPTERS.length; ci++) {
      const c = G.Story.chapter(st);
      const k = c.id;
      acc[k] = acc[k] || { hp: [], rounds: [], fights: 0, wipes: 0, downs: 0, lv: [], foeLv: [],
                           skills: [], classes: [], legends: [], sp: [], boss: [] };
      for (const d of c.places.filter(p => p.kind === 'dungeon')) {
        restock(st);
        G.Story.enterDungeon(st, d.id);
        let steps = 0;
        while (st.story.dungeon && steps++ < 40) {
          const enc = G.Story.nextEncounter(st);
          const b = G.Battle.start(st, enc.units, { isBoss: enc.isBoss });
          let g = 0;
          while (!b.over && g++ < 400) {
            if (!b.awaiting) { G.Battle.advance(b); continue; }
            G.Battle.playerAction(b, ai(G, b));
          }
          acc[k].fights++;
          if (b.result !== 'win') {
            acc[k].wipes++;
            st.hero.gold = Math.floor(st.hero.gold / 2); G.Run.healParty(st, 1); continue;
          }
          const mates = G.Battle.partyUnits(b);
          acc[k].downs += mates.filter(m => m.hp <= 0).length;
          const ratio = mates.reduce((a, m) => a + Math.max(0, m.hp) / m.S.maxHp, 0) / mates.length;
          acc[k].hp.push(ratio);
          acc[k].rounds.push(b.round);
          acc[k].foeLv.push(st.run.floor);
          if (enc.isBoss) acc[k].boss.push(ratio);
          G.Run.grantVictory(st, b, enc.kind);
          G.Run.applyLevelUps(st);
          G.Run.healParty(st, 0.3, 0.2);
          if (G.Story.advanceDungeon(st)) G.Story.leaveDungeon(st);
        }
        G.Run.healParty(st, 1);
      }
      const n = novelty(st);
      acc[k].lv.push(st.hero.level);
      acc[k].skills.push(n.skills);
      acc[k].classes.push(n.classes);
      acc[k].legends.push(n.legends + n.bagLegend);
      acc[k].sp.push(n.sp);
      if (!G.Story.chapterDone(st)) break;
      G.Story.joinForChapter(st);
      if (!G.Story.nextChapter(st)) break;
    }
  }
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  console.log('難易度: ' + G.Diff.get().name + ' ／ ' + RUNS + '周\n');
  console.log('■ 手応えの推移');
  console.log('章  戦闘  勝利時の残HP  主戦の残HP  ラウンド  倒れた  全滅');
  Object.keys(acc).sort().forEach(k => {
    const a = acc[k];
    console.log('第' + k + '章' + String(Math.round(a.fights / RUNS)).padStart(5) +
      (avg(a.hp) * 100).toFixed(0).padStart(12) + '%' +
      (avg(a.boss) * 100).toFixed(0).padStart(10) + '%' +
      avg(a.rounds).toFixed(1).padStart(10) +
      String(a.downs).padStart(8) + String(a.wipes).padStart(6));
  });
  console.log('\n■ 育ちと、相手の格');
  console.log('章  こちらのLv  敵の格(道中)  差');
  Object.keys(acc).sort().forEach(k => {
    const a = acc[k];
    const lv = avg(a.lv), fl = avg(a.foeLv);
    console.log('第' + k + '章' + lv.toFixed(0).padStart(9) + fl.toFixed(0).padStart(12) +
      ('  ' + (lv / Math.max(1, fl)).toFixed(2) + '倍').padStart(10));
  });
  console.log('\n■ 新しいことが起きているか（章の終わり時点の累計）');
  console.log('章  使える技  転職の候補  レジェンド  SP総量  増えた技');
  let prevSk = 0;
  Object.keys(acc).sort().forEach(k => {
    const a = acc[k];
    const sk = avg(a.skills);
    console.log('第' + k + '章' + sk.toFixed(0).padStart(8) +
      avg(a.classes).toFixed(1).padStart(11) +
      avg(a.legends).toFixed(1).padStart(12) +
      avg(a.sp).toFixed(0).padStart(8) +
      ('  +' + (sk - prevSk).toFixed(0)).padStart(10));
    prevSk = sk;
  });
}

function tower() {
  const band = {};
  for (let r = 0; r < RUNS; r++) {
    const st = newState(G);
    G.Run.newRun(st, 'swordsman', 'リオン');
    ['mina', 'garo', 'sera'].forEach(id => G.Run.joinAlly(st, id));
    for (let f = 1; f <= 25; f++) {
      st.run.floor = f;
      const k = Math.ceil(f / 5);
      band[k] = band[k] || { hp: [], rounds: [], deaths: 0, lv: [], skills: [], classes: [] };
      const kind = f % 5 === 0 ? 'boss' : (f % 3 === 0 ? 'elite' : 'battle');
      const enc = G.Run.makeEncounter(st, kind);
      const b = G.Battle.start(st, enc.units, { isBoss: enc.isBoss });
      let g = 0;
      while (!b.over && g++ < 400) {
        if (!b.awaiting) { G.Battle.advance(b); continue; }
        G.Battle.playerAction(b, ai(G, b));
      }
      if (b.result !== 'win') { band[k].deaths++; break; }
      const mates = G.Battle.partyUnits(b);
      band[k].hp.push(mates.reduce((a, m) => a + Math.max(0, m.hp) / m.S.maxHp, 0) / mates.length);
      band[k].rounds.push(b.round);
      G.Run.grantVictory(st, b, kind);
      G.Run.applyLevelUps(st);
      if (f % 5 === 0) G.Run.healParty(st, 1); else G.Run.healParty(st, 0.25, 0.15);
      const n = novelty(st);
      band[k].lv.push(st.hero.level); band[k].skills.push(n.skills); band[k].classes.push(n.classes);
    }
  }
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  console.log('難易度: ' + G.Diff.get().name + ' ／ ' + RUNS + '走行\n');
  console.log('階層     残HP  ラウンド   Lv  使える技  転職候補  ここで倒れた');
  Object.keys(band).sort((a, b2) => a - b2).forEach(k => {
    const a = band[k];
    console.log((((k - 1) * 5 + 1) + '〜' + (k * 5) + '階').padEnd(9) +
      (avg(a.hp) * 100).toFixed(0).padStart(4) + '%' +
      avg(a.rounds).toFixed(1).padStart(9) +
      avg(a.lv).toFixed(0).padStart(6) +
      avg(a.skills).toFixed(0).padStart(9) +
      avg(a.classes).toFixed(1).padStart(9) +
      String(a.deaths).padStart(11));
  });
}

if (process.argv.indexOf('--tower') >= 0) tower(); else story();
