/* check-classplay.js - 全職業を実際に動かす
 *
 *   node tools/check-classplay.js              全37職
 *   node tools/check-classplay.js --diff hard  難易度を指定
 *   node tools/check-classplay.js -v           職業ごとの内訳も出す
 *
 * check-classes.js は「条件を満たせるか」を計算で確かめる静的な検査で、
 * 職業が飾りになっていないかまでは見ていない。
 * 実際に就いて、技を全部撃って、戦って勝てるところまでを通す。
 *
 * 見るのは次の4点。
 *   到達  本物の転職ゲート（Unlock.classCheck）が通るか
 *   技    その職業の技を1つずつ実戦で撃ち、例外なく通り、効果が出るか
 *   戦闘  その職業で想定レベルの相手に勝てるか
 *   ツリー 職業ツリーの全ノードを選び、能力値の再計算が通るか
 *
 * 「技が撃てる」は、対象の解決漏れを拾うために入れてある。
 * 以前 kind:'util' の技が敵に届かず、4つの技が長いあいだ何もしていなかった。 */
const { loadEngine, newState } = require('./load-data.js');
const G = loadEngine();

const di = process.argv.indexOf('--diff');
G.Diff.set(di >= 0 ? process.argv[di + 1] : 'normal');
const VERBOSE = process.argv.indexOf('-v') >= 0;
const FIGHTS = 12;

/* ---------- アクセサリの組み立て（条件記述子から読む） ---------- */
function axisScore(acc, axis) {
  if (axis === 'lightdark') {
    const m = acc.mods || {};
    return (Math.max(0, m.el_light || 0) + Math.max(0, m.el_dark || 0)) * 100;
  }
  return G.Style.scoreOf(acc)[axis] || 0;
}
function allElemScore(acc) {
  const m = acc.mods || {};
  return Math.min.apply(null, G.MAGIC_ELEMENTS.map(e => Math.max(0, m['el_' + e] || 0)));
}
const ri = process.argv.indexOf('--realm');
/* どちらの世界のアクセサリだけで組めるかを切り替える。
 * 塔と物語でアクセサリの顔ぶれを分けたので、片側だけでは組めない職業が
 * 出ていないかを確かめられるようにしてある。 */
const REALM = ri >= 0 ? process.argv[ri + 1] : 'mid';

function buildAccs(conds) {
  const pool = G.LEGENDS.concat(G.NORMALS).filter(a => G.inRealm(a, REALM));
  const want = [];
  let needLegend = 0, needAllElem = false;
  conds.forEach(d => {
    if (!d) return;
    if (d.t === 'accStyle') want.push([d.k, 4]);
    else if (d.t === 'accStyleDual') { want.push([d.a, 2]); want.push([d.b, 2]); }
    else if (d.t === 'accElemPair') want.push(['lightdark', 4]);
    else if (d.t === 'allElem') needAllElem = true;
    else if (d.t === 'rarityCount' && d.r === 'legend') needLegend = Math.max(needLegend, d.v || 1);
  });
  const picks = [], taken = new Set();
  function take(scoreFn, n) {
    pool.filter(a => !taken.has(a.id))
      .map(a => ({ a, v: scoreFn(a) })).filter(x => x.v > 0)
      .sort((x, y) => y.v - x.v).slice(0, n)
      .forEach(x => { taken.add(x.a.id); picks.push(x.a); });
  }
  if (needAllElem) take(allElemScore, 4);
  want.forEach(([axis, n]) => { if (picks.length < 4) take(a => axisScore(a, axis), Math.min(n, 4 - picks.length)); });
  if (needLegend && !picks.some(a => a.rarity === 'legend')) {
    const axis = (want[0] || ['crit'])[0];
    const best = G.LEGENDS.filter(a => G.inRealm(a, REALM) && !taken.has(a.id))
      .map(a => ({ a, v: needAllElem ? allElemScore(a) : axisScore(a, axis) }))
      .filter(x => x.v > 0).sort((x, y) => y.v - x.v)[0];
    if (best) { picks.pop(); picks.push(best.a); }
  }
  /* 4枠に満たなければ何でも埋める。戦闘を回すのが目的なので空けない */
  pool.forEach(a => { if (picks.length < 4 && !taken.has(a.id)) { taken.add(a.id); picks.push(a); } });
  return picks.slice(0, 4).map(a => a.id);
}
function styleAxes(conds) {
  const out = [];
  conds.forEach(d => {
    if (!d) return;
    if (d.t === 'style') out.push(d.k);
    else if (d.t === 'styleAny') out.push.apply(out, d.ks);
    else if (d.t === 'styleDual') { out.push(d.a); out.push(d.b); }
    else if (d.t === 'styleHybrid') { out.push('phys'); out.push('mag'); }
  });
  return out;
}

/* その職業を着た状態の一式を作る。戻り値の who が試験対象。 */
function setup(cls) {
  const st = newState(G);
  let who;
  const start = (cls.from || []).filter(f => G.CLASSES[f] && G.CLASSES[f].tier === 1)[0] || 'swordsman';
  G.Run.newRun(st, start, 'カイ');
  /* 味方対象の技（蘇生・献身・アンコール）は、味方が居ないと何も起こらない。
   * どの職業でも常に4人で試す。 */
  ['mina', 'garo', 'sera'].forEach(id => G.Run.joinAlly(st, id));
  if (cls.ally) {
    who = st.party.filter(m => m.allyId === cls.ally)[0];
    /* 試験対象を操作できる位置（先頭）に置く。Battle.controller は party[0] を返す */
    st.party = [who].concat(st.party.filter(m => m !== who));
  } else {
    who = st.hero;
  }
  const lvWant = cls.tier === 3 ? 26 : (cls.tier === 2 ? 16 : 8);
  st.hero.level = lvWant;
  who.level = lvWant;
  if (G.Run.syncAllies) G.Run.syncAllies(st);
  who.level = lvWant;

  /* 前提職を履歴に積む */
  const line = cls.ally ? (G.ALLIES[cls.ally].line || []) : null;
  const from = (cls.from || []).filter(f => !line || line.indexOf(f) >= 0)[0];
  if (from && from !== who.classId) {
    if (who.classHistory.indexOf(who.classId) < 0) who.classHistory.push(who.classId);
    who.classId = from;
  }

  const conds = (cls.req || []).map(r => r.d);

  /* 戦い方の記録（上級職の条件）を積む。
   * 占有率で見る条件があるので、全軸を薄く敷いてから必要な軸だけ厚くする。 */
  G.Style.AXIS_IDS.concat(['light', 'dark', 'phys', 'mag']).forEach(a => G.Style.addTo(who, a, 4));
  styleAxes(conds).forEach(a => G.Style.addTo(who, a, 400));

  /* アクセサリを4枠に装備する。
   * ミシックを数える条件（虚無帝）は、発見済みにしたうえでミシックを挿す。 */
  let accIds;
  if (conds.some(d => d && d.t === 'rarityCount' && d.r === 'mythic')) {
    accIds = G.MYTHICS.slice(0, 3).map(a => a.id);
    st.meta.mythics = G.MYTHICS.slice(0, 3).map(a => a.id);
  } else {
    accIds = buildAccs(conds);
  }
  who.equip = who.equip || {};
  who.equip.acc = who.equip.acc || [];
  accIds.forEach((aid, i) => { G.addAcc(st.hero, aid); who.equip.acc[i] = aid; });

  return { st, who, accIds };
}

/* ---------- 実戦で技を1つずつ撃つ ---------- */
function makeFoes(st, n, floor, boss) {
  const pool = G.ENEMIES.filter(e => !e.boss);
  const out = [];
  if (boss) out.push(G.Battle.makeEnemyUnit(G.ENEMY_BY_ID[boss], floor, 0));
  for (let i = out.length; i < n; i++) {
    out.push(G.Battle.makeEnemyUnit(pool[i % pool.length], floor, i));
  }
  return out;
}

/* その格の相手。装備を積んだ単独の職業は雑魚では止まらないので
 * （最上級職は27階の雑魚にも12/12で勝つ）、腕試しは章の主でやる。 */
const TRIAL = {
  1: { boss: 'b_ogre', floor: 5 },
  2: { boss: 'b_thornbeast', floor: 11 },
  3: { boss: 'b_voidlord', floor: 22 }
};

/** その職業の技をすべて撃ってみる。撃てなかったものを返す。 */
function fireAllSkills(st, who, cls) {
  const ids = (cls.skills || []).slice();
  const dead = [];
  ids.forEach(id => {
    const sk = G.SKILLS[id];
    if (!sk) { dead.push(id + '（技の定義が無い）'); return; }
    let res = null;
    try {
      res = fireOne(st, who, sk);
    } catch (e) {
      dead.push(sk.name + '（例外: ' + e.message + '）');
      return;
    }
    if (!res.accepted) dead.push(sk.name + '（行動が通らない）');
    else if (!res.hit) {
      dead.push(sk.name + '（' + (res.side === 'foe' ? '敵' : '味方') + 'に何も起きない）');
    }
  });
  return dead;
}

/* 効いたかどうかを、対象の名前がログに出るかで見る。
 * ただし「すでに在るものを延ばす」系の技は、成功しても対象名を出さない。
 * その効果に限り、成功したときにしか出ない一行を印として使う。 */
const SUCCESS_MARK = {
  extendRot: '長引いた',      /* 潜伏 */
  extendBuffs: '延びた',      /* アンコール */
  makeItem: '錬成した'        /* 錬成・即席調合 */
};

/** その技が「どちら側に効くはずか」を定義から読む。 */
function intendedSide(sk) {
  if (sk.kind === 'heal' || sk.kind === 'buff') return 'ally';
  if (sk.target === 'self' || sk.target === 'ally' || sk.target === 'downed') return 'ally';
  return 'foe';
}
/** その技が出したログだけを切り出す。
 *
 * playerAction は内部で advance まで進めるので、戻ってきた時点では
 * 他のユニットの手番も済んでいる。前後の状態を比べるだけでは、
 * 味方の反射や敵の自己強化を「この技の効果」と読み違える。
 * 技の announce 行（▶）から次の ▶ までが、その技だけの結果。 */
function ownLines(b, from) {
  const out = [];
  let marks = 0;
  for (let i = from; i < b.log.length; i++) {
    const t = (b.log[i] && b.log[i].t) || '';
    if (t.indexOf('▶') === 0) { marks++; if (marks >= 2) break; continue; }
    out.push(t);
  }
  return out;
}

/** 技を1つ、実戦で撃つ。「効くはずの側」に本当に届いたかを見る。
 *
 * 「何か起きたか」だけを見ると、対象の解決を間違えている技を見逃す。
 * 実際、敵に効くはずの技が自分に返っていた不具合は、
 * 「ログが1行増えた」を効果とみなしていたせいで検出できなかった。 */
function fireOne(st, who, sk) {
  /* 自分から強化をかけない相手を選ぶ。敵が自分に棘鎧を張ると、
   * それを「この技が敵に効いた」と読み違えるため。 */
  const plain = ['slime', 'bat', 'goblin', 'skeleton'];
  const foes = plain.slice(0, 3).map((id, i) =>
    G.Battle.makeEnemyUnit(G.ENEMY_BY_ID[id], Math.max(3, who.level - 4), i));
  const b = G.Battle.start(st, foes, {});
  let guard = 0;
  while (!b.over && guard++ < 60) {
    if (b.awaiting) break;
    G.Battle.advance(b);
  }
  if (!b.awaiting) return { accepted: false, hit: false };
  const src = b.actor;
  src.S.maxMp = Math.max(src.S.maxMp, 999);
  src.mp = 999;

  const mates = G.Battle.partyUnits(b);
  /* 「すでに在るものを延ばす／剥がす」技は、前提が無いと何も起こらない。
   * 技が死んでいるのか前提が無いだけなのかを取り違えないよう、先に作っておく。
   *   解呪  → 相手に強化を乗せる
   *   潜伏  → 相手に継続ダメージを乗せる
   *   アンコール → 味方に強化を乗せる
   *   蘇生  → 味方を倒しておく */
  b.enemies.forEach(e => {
    (e.buffs = e.buffs || []).push({ k: 'atkPct', v: 0.30, t: 5 });
    (e.statuses = e.statuses || []).push({ k: 'poison', t: 3, v: 0.05, mag: 10 });
  });
  const needDown = sk.eff && sk.eff.revive;
  mates.forEach(m => {
    (m.buffs = m.buffs || []).push({ k: 'atkPct', v: 0.20, t: 4 });
    if (m === src) return;
    m.hp = needDown ? 0 : Math.max(1, Math.round(m.S.maxHp * 0.4));
  });
  src.hp = Math.max(1, Math.round(src.S.maxHp * 0.4));

  const side = intendedSide(sk);
  const names = (side === 'foe' ? b.enemies : mates).map(u => u.name);
  const from = b.log.length;
  const beforeItems = JSON.stringify(st.hero.items || {});

  const target = side === 'foe'
    ? { foe: 0 }
    : { ally: Math.max(0, mates.indexOf(mates.filter(m => m !== src)[0] || src)) };
  const accepted = G.Battle.playerAction(b, { type: 'skill', id: sk.id, target });
  if (!accepted) return { accepted: false, hit: false, side };

  const lines = ownLines(b, from);
  let hit = lines.some(t => names.some(n => t.indexOf(n) >= 0));
  if (!hit) {
    const marks = Object.keys(SUCCESS_MARK).filter(k => sk.eff && sk.eff[k]).map(k => SUCCESS_MARK[k]);
    hit = marks.some(m => lines.some(t => t.indexOf(m) >= 0));
  }
  if (!hit && sk.eff && sk.eff.makeItem) hit = JSON.stringify(st.hero.items || {}) !== beforeItems;
  return { accepted: true, hit, side, lines };
}

/* ---------- その職業で戦う ---------- */
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
  let atks = sks.filter(s => s.kind === 'phys' || s.kind === 'mag');
  if (foes.length >= 3) { const a = atks.filter(s => s.target === 'all'); if (a.length) atks = a; }
  if (u.mp < u.S.maxMp * 0.2) atks = atks.filter(s => (s.mp || 0) === 0);
  atks.sort((x, y) => (y.power || 0) * (y.hits || 1) - (x.power || 0) * (x.hits || 1));
  const use = atks[0] || G.SKILLS.attack;
  const foe = foes.slice().sort((x, y) => x.hp - y.hp)[0];
  return { type: 'skill', id: use.id, target: { foe: b.enemies.indexOf(foe) } };
}

/* その一手が何かを生んだかを、ログの文面から読む。 */
function worked(lines) {
  return lines.some(t =>
    t.indexOf('ダメージ') >= 0 || t.indexOf('回復') >= 0 ||
    t.indexOf('⬆') >= 0 || t.indexOf('⬇') >= 0 ||
    t.indexOf('付与') >= 0 || t.indexOf('バリア') >= 0 ||
    t.indexOf('立ち上がった') >= 0 || t.indexOf('かばう') >= 0 ||
    t.indexOf('長引いた') >= 0 || t.indexOf('延びた') >= 0 || t.indexOf('錬成') >= 0);
}

/** その職業ひとりで、格に見合った主に挑ませる。
 *
 * 4人で戦わせると、試験対象が置物でも他の3人が勝ってしまう
 * （最上級職の能力値を1/10にしても 12/12 勝った）ので、単独で見る。
 *
 * ただし勝てないことを失敗とはしない。支援・弱体の職業は、
 * 役割どおりに働いていても単独では主を倒しきれない。
 * 落とすのは「手番を使って何も起こせていない」ときだけで、
 * 単独の勝敗は、その職業がどれだけ自前で完結しているかの目安として出す。
 *
 * 操作されるのは常に party[0]（Battle.controller）なので、
 * 単独にしてしまえば、数えている手番はすべて試験対象のもの。 */
function fight(st, who, floor, boss, solo) {
  const keep = st.party;
  if (solo) st.party = [who];
  try {
    const foes = makeFoes(st, 2, floor, boss);
    const b = G.Battle.start(st, foes, { isBoss: !!boss });
    let g = 0, acts = 0, effective = 0;
    while (!b.over && g++ < 200) {
      if (!b.awaiting) { G.Battle.advance(b); continue; }
      const from = b.log.length;
      G.Battle.playerAction(b, ai(b));
      acts++;
      if (worked(ownLines(b, from))) effective++;
    }
    return { win: b.result === 'win', acts, effective, rounds: b.round };
  } finally { st.party = keep; }
}

/* ---------- 職業ツリー ---------- */
function treeCheck(st, who, cls) {
  const rows = G.CLASSTREE[cls.id];
  if (!rows || !rows.length) return ['職業ツリーが無い'];
  const bad = [];
  G.Mastery.gain(who, cls.id, G.Mastery.NEED[G.Mastery.NEED.length - 1] + 1);
  [1, 2, 3].forEach(tier => {
    const row = rows.filter(r => r.tier === tier)[0];
    if (!row) { bad.push(tier + '段目が無い'); return; }
    if (!G.Mastery.pick(who, cls.id, tier, 'a')) bad.push(tier + '段目を選べない');
  });
  try {
    const S = G.Stats.compute(who).S;
    if (!(S.maxHp > 0)) bad.push('ツリー適用後の能力値が壊れている');
  } catch (e) { bad.push('ツリー適用で例外: ' + e.message); }
  return bad;
}

/* ---------- 本体 ---------- */
let bad = 0;
const groups = { 1: [], 2: [], 3: [] };

G.CLASS_LIST.forEach(cls => {
  const problems = [];
  let wins = 0, party = 0, dead = [], gate = '—', work = 0;

  try {
    const { st, who, accIds } = setup(cls);

    /* 到達: 本物の転職ゲートを通す */
    if (cls.tier >= 2) {
      const chk = G.Unlock.classCheck(cls.id, G.Unlock.ctx(st, null, who));
      gate = chk.ok ? 'ok' : 'NG';
      if (!chk.ok) {
        const ng = (chk.conds || []).filter(c => !c.ok)
          .map(c => c.label + (c.prog ? '（' + c.prog + '）' : ''));
        problems.push('転職の条件を満たせない: ' + (ng.length ? ng.join(' / ') : '理由不明'));
      }
    } else gate = 'ok';
    if (who.classHistory.indexOf(who.classId) < 0) who.classHistory.push(who.classId);
    who.classId = cls.id;

    const S = G.Stats.compute(who).S;
    who.hp = S.maxHp; who.mp = S.maxMp;

    /* 技: 1つずつ実戦で撃つ */
    dead = fireAllSkills(st, who, cls);
    if (dead.length) problems.push('通らない技: ' + dead.join('、'));

    /* 戦闘 */
    const trial = TRIAL[cls.tier];
    let acts = 0, effective = 0;
    for (let i = 0; i < FIGHTS; i++) {
      G.Run.healParty(st, 1);
      const r = fight(st, who, trial.floor, trial.boss, true);
      if (r.win) wins++;
      acts += r.acts; effective += r.effective;
    }
    for (let i = 0; i < FIGHTS; i++) {
      G.Run.healParty(st, 1);
      if (fight(st, who, trial.floor, trial.boss, false).win) party++;
    }
    work = acts ? effective / acts : 0;
    if (!acts) problems.push('手番が一度も回ってこない');
    else if (work < 0.5) problems.push('自分の手番の ' + Math.round(work * 100) +
      '% しか結果を出していない（空振りが多すぎる）');
    /* 単独で勝てないのは支援・弱体の職業では当たり前なので落とさない。
     * 4人でも勝てないなら、その職業は本当に成立していない。 */
    if (party === 0) problems.push('4人でも章の主に一度も勝てない');

    /* 職業ツリー */
    const tb = treeCheck(st, who, cls);
    if (tb.length) problems.push('職業ツリー: ' + tb.join('、'));

  } catch (e) {
    problems.push('例外: ' + e.message);
  }

  groups[cls.tier].push({ cls, problems, wins, party, gate, work,
                          skills: (cls.skills || []).length, dead: dead.length });
  if (problems.length) bad++;
});

const label = { 1: '初級職', 2: '上級職', 3: '最上級職' };
[1, 2, 3].forEach(t => {
  const rows = groups[t];
  if (!rows.length) return;
  console.log('\n■ ' + label[t] + '（' + rows.length + '職）');
  console.log('  職業              到達  技   撃てた  単独で主  4人で主  働いた手番  ツリー');
  rows.forEach(r => {
    const nm = r.cls.name + (r.cls.ally ? '［' + G.ALLIES[r.cls.ally].name + '専用］' : '');
    const ok = r.problems.length === 0;
    console.log('  ' + (ok ? '  ' : '!!') + nm.padEnd(20, '　').slice(0, 20) +
      r.gate.padStart(4) + String(r.skills).padStart(5) +
      (r.skills - r.dead + '/' + r.skills).padStart(8) +
      (r.wins + '/' + FIGHTS).padStart(10) +
      (r.party + '/' + FIGHTS).padStart(9) +
      (Math.round(r.work * 100) + '%').padStart(11) +
      (r.problems.some(p => p.indexOf('職業ツリー') === 0) ? '      NG' : '      ok'));
    if (!ok) r.problems.forEach(p => console.log('        ' + p));
  });
});

console.log('\n（' + (REALM === 'norse' ? '塔（北欧）' : '物語（相刻）') + 'のアクセサリだけで判定）');
console.log('難易度 ' + G.Diff.get().name + ' ／ 職業 ' + G.CLASS_LIST.length +
  '種 ／ 単独' + FIGHTS + '戦＋4人' + FIGHTS + '戦');
console.log('単独で主に勝てないのは、支援・弱体の職業では役割どおり（4人で勝てていれば問題なし）。');
console.log(bad ? '!! 問題のある職業 ' + bad + '種' : 'すべての職業が、就けて・技が通って・勝てて・ツリーも効く');
process.exit(bad ? 1 : 0);
