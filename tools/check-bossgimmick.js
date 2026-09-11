/* check-bossgimmick.js - ボスの仕掛けが本当に働くか
 *
 *   node tools/check-bossgimmick.js
 *   node tools/check-bossgimmick.js --diff brutal
 *   node tools/check-bossgimmick.js -v      戦闘ログを出す
 *
 * 仕掛けは「書いてあるのに何も起きない」が一番こわい。
 * ボスごとに実戦を回し、その仕掛けに固有のログと状態変化が出たかを見る。
 * あわせて「気づけば崩せるか」も見る ―― 崩し方の無い仕掛けは、
 * 噛み合わないビルドにとってただの壁になるため。 */
const { loadEngine, newState } = require('./load-data.js');
const G = loadEngine();

const di = process.argv.indexOf('--diff');
G.Diff.set(di >= 0 ? process.argv[di + 1] : 'normal');
const VERBOSE = process.argv.indexOf('-v') >= 0;
const RUNS = 10;

/* 仕掛けごとに「働いた証拠」。ログの文面と、戦闘中の状態の両方で見る。 */
const PROOF = {
  devour: {
    label: '取り巻きを喰らって回復する',
    line: /喰らった/,
    counter: '喰らった回数',
    beatable: '取り巻きを先に片付ければ喰えない'
  },
  summon: {
    label: '手勢を呼び続ける',
    line: /現れた！/,
    counter: '呼んだ回数',
    beatable: '範囲技で薙ぐか、本体を速く落とす'
  },
  shell: {
    label: '鎧を剥がすまで刃が通らない',
    line: /が砕けた！/,
    counter: '剥がせた回数',
    beatable: '術なら倍の速さで剥がせる'
  },
  aloft: {
    label: '空へ舞い上がる',
    line: /舞い上がった！/,
    counter: '飛んだ回数',
    beatable: '属性を乗せた一撃か術なら空にも届く'
  },
  siphon: {
    label: 'こちらの加護を吸い取る',
    line: /吸い取った|吸い込む/,
    counter: '吸われた回数',
    beatable: '掛け直す間合いを計るか、吸われる前に決める'
  },
  unbound: {
    label: '鎖を断ち切って豹変する',
    line: /千切れた！/,
    counter: '解けた回数',
    beatable: '縛られているあいだに削りきる'
  },
  maw: {
    label: '仲間を咥え込んで場から外す',
    line: /咥え込んだ！/,
    counter: '咥えた回数',
    beatable: '大きな一撃で顎をこじ開けて引き剥がす'
  },
  venom: {
    label: '全体を毒に沈める',
    line: /毒に侵された/,
    counter: '撒かれた回数',
    beatable: '解毒か、毒に強い構え'
  },
  conflagration: {
    label: '燃え広がり、長引くほど熱くなる',
    line: /燃え広がる/,
    counter: '燃えた段数',
    beatable: '上がり幅に天井があるので、削りきる速さで越える'
  },
  reap: {
    label: '倒した者を起き上がらせる',
    line: /起き上がった/,
    counter: '起こされた回数',
    beatable: '一体につき一度だけ。本体を落とせば終わる'
  },
  gnaw: {
    label: '削っても根を啜って戻る',
    line: /根を啜り|蝕まれていて/,
    counter: '啜った回数',
    beatable: '毒か火傷を乗せているあいだは戻れない'
  },
  clones: {
    label: '写し身が甦り続ける',
    line: /立ち上がった/,
    counter: '甦った回数',
    beatable: '本体を落とせば写し身も崩れる'
  },
  phases: {
    label: '相が入れ替わる',
    line: /の相が変わった/,
    counter: '入れ替わった回数',
    beatable: '弱点が回るので、どのビルドにも通る時間帯が来る'
  }
};

function ai(b) {
  const u = b.actor;
  const foes = G.Battle.aliveEnemies(b);
  const party = G.Battle.partyUnits(b);
  const mates = party.filter(G.Battle.alive);
  const sks = G.Stats.skillList(u.hero).map(id => G.SKILLS[id]).filter(s => s && (s.mp || 0) <= u.mp);
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
  /* 召喚は kind:'util' なので、威力で選ぶ流れには乗らない。
   * 場に出ていないときだけ、先に呼ぶ。呼ばないと召喚職が何もしないことになる。 */
  const sum = sks.filter(s => s.eff && s.eff.summon)
    .sort((x, y) => (y.eff.summon.pw || 0) - (x.eff.summon.pw || 0))[0];
  if (sum) {
    const out = party.filter(m => m.summon && G.Battle.alive(m)).length;
    if (out < (sum.eff.summon.cap || 1)) return { type: 'skill', id: sum.id, target: {} };
  }
  let atks = sks.filter(s => s.kind === 'phys' || s.kind === 'mag');
  if (foes.length >= 3) { const a = atks.filter(s => s.target === 'all'); if (a.length) atks = a; }
  if (u.mp < u.S.maxMp * 0.2) atks = atks.filter(s => (s.mp || 0) === 0);
  atks.sort((x, y) => (y.power || 0) * (y.hits || 1) - (x.power || 0) * (x.hits || 1));
  const use = atks[0] || G.SKILLS.attack;
  /* 本体を狙う。写し身を叩き続けても終わらない相手がいるので、ボスを優先する */
  const boss = foes.filter(f => f.isBoss)[0];
  const foe = boss || foes.slice().sort((x, y) => x.hp - y.hp)[0];
  return { type: 'skill', id: use.id, target: { foe: b.enemies.indexOf(foe) } };
}

/* 挑む側のビルドを2種類用意する。
 * 一本の軸だけで試すと、「その軸に厳しい仕掛け」を
 * 「理不尽な仕掛け」と読み違える。会心（物理一本）と術（属性）の両方で挑ませ、
 * どちらか一方でも通れば「崩し方がある」とみなす。 */
const BUILDS = {
  '会心': a => G.Style.scoreOf(a).crit || 0,
  '術': a => (G.Style.scoreOf(a).elem || 0) + (a.mods && a.mods.magPct ? a.mods.magPct * 100 : 0)
};

/* その主が出る章の想定に近い装備とレベルで挑ませる */
function party(lv, pick) {
  const st = newState(G);
  G.Run.newRun(st, 'swordsman', 'カイ');
  ['mina', 'garo', 'sera'].forEach(id => G.Run.joinAlly(st, id));
  st.hero.level = lv;
  G.Run.syncAllies(st);
  G.Run.applyLevelUps(st);
  /* 軸の通ったビルドを持たせる。適当に4枚挿すと、装備が弱いだけの負けを
   * 「仕掛けが理不尽」と読み違えるため。 */
  const kit = G.LEGENDS.map(a => ({ a, v: pick(a) }))
    .filter(x => x.v > 0).sort((x, y) => y.v - x.v).slice(0, 4).map(x => x.a.id);
  while (kit.length < 4) kit.push(G.LEGENDS[kit.length].id);
  kit.forEach((id, i) => { G.addAcc(st.hero, id); st.hero.equip.acc[i] = id; });

  /* 実際にそこへ辿り着いたパーティは、武器防具とツリーも育っている。
   * 素の状態で挑ませると、装備が足りないだけの負けを
   * 「仕掛けが理不尽」と読み違える（最終戦が38ラウンドになった）。 */
  const gear = Object.keys(G.GEAR).map(k => G.GEAR[k]).filter(g => g.rarity === 'legend');
  const w = gear.filter(g => g.slot === 'weapon')[0];
  const a = gear.filter(g => g.slot !== 'weapon')[0];
  if (w) { G.addGear(st.hero, w.id); st.hero.equip.weapon = w.id; }
  if (a) { G.addGear(st.hero, a.id); st.hero.equip.armor = a.id; }
  st.hero.sp = Math.max(st.hero.sp || 0, Math.round(lv * 1.4));
  spendSp(st.hero);
  G.Run.healParty(st, 1);
  return st;
}

/** SPを取れるノードから順に振る */
function spendSp(hero) {
  hero.tree = hero.tree || {};
  let guard = 0;
  while ((hero.sp || 0) > 0 && guard++ < 200) {
    const n = Object.keys(G.TREE.byId).map(k => G.TREE.byId[k]).filter(x => {
      const c = G.Tree.check(hero, x);
      return c.ok && (x.cost || 1) <= hero.sp;
    })[0];
    if (!n) break;
    hero.tree[n.id] = true;
    hero.sp -= (n.cost || 1);
  }
}

/* その主がどこで出るかを引く（レベルと取り巻きを合わせるため）。
 * 物語の主は章から、塔の主は5階ごとの並びから。 */
const SLOT = {};
G.STORY.CHAPTERS.forEach(c => c.places.filter(p => p.kind === 'dungeon').forEach(d => {
  SLOT[d.boss] = { lv: d.bossLv, pool: d.pool, place: d.name, ch: '物語' + c.id };
}));
/* 塔でその階に着いたときのパーティのレベル（実測の中央値）。
 * 階層の数字そのままで挑ませると、実際より強い側で試すことになり、
 * 仕掛けが出る前に決着してしまう。 */
const TOWER_LV = { 5: 5, 10: 12, 15: 20, 20: 28, 25: 36, 30: 44 };
/* 主が出る階は G.TOWER_BOSSES が決めるので、そこから引く。
 * 配列の並び順で決め打ちにすると、データを足したときに階が入れ替わる。 */
(G.TOWER_BOSSES || []).forEach((id, i) => {
  const b = G.ENEMY_BY_ID[id];
  if (!b) return;
  const f = (i + 1) * 5;
  const mobs = G.MOBS.filter(m => m.realm === 'norse' && m.tier <= (f <= 5 ? 1 : (f <= 12 ? 2 : 3)));
  SLOT[b.id] = { lv: f, partyLv: TOWER_LV[f] || Math.round(f * 1.5), pool: mobs.map(m => m.id),
                 place: '塔 ' + f + '階', ch: '塔' + f + 'F' };
});

let bad = 0;
const rows = [];

G.BOSSES.forEach(def => {
  const slot = SLOT[def.id] || { lv: 20, pool: ['goblin'], place: '塔', ch: '-' };
  const kind = def.gimmick ? def.gimmick.kind : (def.phases && def.phases.length ? 'phases' : null);
  const proof = kind ? PROOF[kind] : null;
  let fired = 0, rounds = 0, err = null;
  const wins = {};
  const problems = [];

  if (!kind) { problems.push('仕掛けが無い'); bad++; }

  const names = Object.keys(BUILDS);
  for (let r = 0; r < RUNS && kind; r++) {
    const bn = names[r % names.length];
    wins[bn] = wins[bn] || 0;
    try {
      /* 実測で、パーティはその章の主のおよそ1.6倍のレベルで着く。
       * そこに合わせないと、装備とレベルが足りないだけの負けになる。 */
      const st = party(slot.partyLv || Math.max(4, Math.round(slot.lv * 1.6)), BUILDS[bn]);
      st.run.floor = slot.lv;
      const units = [G.Battle.makeEnemyUnit(def, slot.lv, 0)];
      for (let i = 0; i < 2; i++) {
        units.push(G.Battle.makeEnemyUnit(G.ENEMY_BY_ID[slot.pool[i % slot.pool.length]],
          Math.max(1, slot.lv - 2), i + 1));
      }
      const b = G.Battle.start(st, units, { isBoss: true });
      let g = 0;
      while (!b.over && g++ < 300) {
        if (!b.awaiting) { G.Battle.advance(b); continue; }
        G.Battle.playerAction(b, ai(b));
      }
      const lines = b.log.map(l => (l && l.t) || '');
      const hit = lines.filter(t => proof.line.test(t)).length;
      fired += hit;
      if (b.result === 'win') wins[bn]++;
      rounds += b.round;
      if (VERBOSE && r === 0) {
        console.log('\n--- ' + def.name + ' のログ（仕掛けに関する行だけ）---');
        lines.filter(t => proof.line.test(t) || /🪞|🛡|🌪|🍖|📣|🕳/.test(t))
          .slice(0, 12).forEach(t => console.log('   ' + t));
      }
    } catch (e) { err = e.message; break; }
  }

  const total = Object.keys(wins).reduce((a, k) => a + wins[k], 0);
  if (err) { problems.push('例外: ' + err); }
  else if (kind && fired === 0) { problems.push('仕掛けが一度も働かない'); }
  else if (kind && total === 0) { problems.push('どのビルドでも勝てない（崩し方が無い）'); }
  if (problems.length) bad++;

  rows.push({ def, kind, proof, fired, wins, total, rounds: rounds / RUNS, problems, slot });
});

console.log('■ ボスの仕掛け（各' + RUNS + '戦・難易度 ' + G.Diff.get().name + '）\n');
rows.forEach(r => {
  const ok = r.problems.length === 0;
  console.log((ok ? '  ' : '!!') + r.def.name.padEnd(10, '　') +
    ' ' + String(r.slot.ch).padEnd(6) + ' ' +
    (r.kind || '—').padEnd(8) +
    (r.proof ? r.proof.label : '').padEnd(22, '　') +
    (r.fired + '回').padStart(6) +
    ('  ' + Object.keys(r.wins).map(k => k + ' ' + r.wins[k] + '/' + (RUNS / 2)).join(' ／ ')) +
    ('  ' + r.rounds.toFixed(1) + 'ラウンド'));
  if (r.proof) console.log('      崩し方: ' + r.proof.beatable);
  r.problems.forEach(p => console.log('      !! ' + p));
});

console.log('\n' + (bad ? '!! 問題のある主 ' + bad + '体' : 'すべての主に固有の仕掛けがあり、働いていて、崩せる'));
process.exit(bad ? 1 : 0);
