/* check-classes.js - すべての職業に実際に就けるかを確かめる
 *
 *   node tools/check-classes.js
 *
 * 職業を増やしても、条件を満たす手段（アクセサリ・戦い方）が無ければ飾りになる。
 * 職業の req に入っている条件記述子（d）をそのまま読み、
 * それを満たす4枠と戦闘記録を機械的に組んで判定する。
 * 条件を書き換えたら、このツールも自動で追随する。 */
const { loadEngine, newState } = require('./load-data.js');
const G = loadEngine();

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

/** 条件記述子から「4枠に何を入れるべきか」を組む */
function buildAccs(conds, realm) {
  const pool = G.LEGENDS.concat(G.NORMALS).filter(a => G.inRealm(a, realm || 'mid'));
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
      .map(a => ({ a, v: scoreFn(a) }))
      .filter(x => x.v > 0)
      .sort((x, y) => y.v - x.v)
      .slice(0, n)
      .forEach(x => { taken.add(x.a.id); picks.push(x.a); });
  }
  if (needAllElem) take(allElemScore, 4);
  want.forEach(([axis, n]) => { if (picks.length < 4) take(a => axisScore(a, axis), Math.min(n, 4 - picks.length)); });
  if (needLegend && !picks.some(a => a.rarity === 'legend')) {
    const axis = (want[0] || ['crit'])[0];
    const best = G.LEGENDS.filter(a => !taken.has(a.id))
      .map(a => ({ a, v: needAllElem ? allElemScore(a) : axisScore(a, axis) }))
      .filter(x => x.v > 0).sort((x, y) => y.v - x.v)[0];
    if (best) { picks.pop(); picks.push(best.a); }
  }
  return picks.slice(0, 4).map(a => a.id);
}

/** 上級職の条件記述子から「どの軸で戦えばよいか」を読む */
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

/* どちらの世界のアクセサリだけで組めるかを見る。
 * 塔と物語でアクセサリの顔ぶれを分けたので、「塔からは就けない職業」が
 * 出ていないかを確かめる必要がある。 */
const ri = process.argv.indexOf('--realm');
const REALM = ri >= 0 ? process.argv[ri + 1] : 'mid';

let bad = 0;
const rows = [];

G.CLASS_LIST.forEach(cls => {
  if (cls.tier === 1) return;

  const st = newState(G);
  let who;
  if (cls.ally) {
    /* 仲間の固有職は、その仲間で判定する */
    const allyId = cls.ally;
    G.Run.newRun(st, 'swordsman', 'カイ');
    G.Run.joinAlly(st, allyId);
    who = st.party.filter(m => m.allyId === allyId)[0];
    st.hero.level = 20; G.Run.syncAllies(st);
  } else {
    const start = (cls.from || []).filter(f => G.CLASSES[f] && G.CLASSES[f].tier === 1)[0] || 'swordsman';
    G.Run.newRun(st, start, 'カイ');
    who = st.hero;
    who.level = 20;
  }

  /* 前提職に就いておく */
  const line = cls.ally ? (G.ALLIES[cls.ally].line || []) : null;
  const from = (cls.from || []).filter(f => !line || line.indexOf(f) >= 0)[0];
  if (from && from !== who.classId) { who.classHistory.push(who.classId); who.classId = from; }

  const conds = (cls.req || []).map(r => r.d);

  /* 全軸を薄く積んだうえで、必要な軸だけ厚くする（占有率の条件があるため） */
  G.Style.AXIS_IDS.concat(['light', 'dark', 'phys', 'mag']).forEach(a => G.Style.addTo(who, a, 4));
  styleAxes(conds).forEach(a => G.Style.addTo(who, a, 400));

  /* 隠し職業の鍵（着ぐるみなど）は、発見済みにしたうえで身に着ける。
   * 発見していないと一覧にも出てこないので、装備だけでは判定できない。 */
  const key = conds.filter(d => d && d.t === 'wearing')[0];
  if (key) {
    if (st.meta.mythics.indexOf(key.id) < 0) st.meta.mythics.push(key.id);
    G.addAcc(st.hero, key.id);
    who.equip.acc[0] = key.id;
  }

  if (conds.some(d => d && d.t === 'rarityCount' && d.r === 'mythic')) {
    G.MYTHICS.slice(0, 3).forEach((a, i) => { G.addAcc(st.hero, a.id); who.equip.acc[i] = a.id; });
    st.meta.mythics = G.MYTHICS.slice(0, 3).map(a => a.id);
  } else {
    buildAccs(conds, REALM).forEach((aid, i) => {
      const slot = key ? i + 1 : i;
      if (slot > 3) return;
      G.addAcc(st.hero, aid); who.equip.acc[slot] = aid;
    });
  }

  const r = G.Unlock.availableClasses(st, who).filter(x => x.cls.id === cls.id)[0];
  const kit = who.equip.acc.filter(Boolean).map(a => G.ACC_BY_ID[a].name).join('・');
  if (r && r.ok) {
    rows.push({ ok: true, cls, kit });
  } else {
    bad++;
    const ng = r ? r.conds.filter(c => !c.ok).map(c => c.label + (c.prog ? '（' + c.prog + '）' : '')) : ['判定なし'];
    rows.push({ ok: false, cls, ng });
  }
});

[2, 3].forEach(tier => {
  const list = rows.filter(x => x.cls.tier === tier);
  console.log('\n■ ' + (tier === 2 ? '上級職' : '最上級職') + '（' + list.length + '職）');
  list.forEach(x => {
    const tag = x.cls.ally ? '［' + G.ALLIES[x.cls.ally].name + '専用］' : '';
    if (x.ok) console.log('   ' + x.cls.name + tag + ' … 到達可  [' + x.kit + ']');
    else {
      console.log('   ' + x.cls.name + tag + ' … !! 到達不可');
      x.ng.forEach(n => console.log('        ' + n));
    }
  });
});

/* 主人公が仲間の固有職に就けないことも確かめる */
const st2 = newState(G);
G.Run.newRun(st2, 'swordsman', 'カイ');
const heroLine = G.Unlock.classLine(st2.hero);
const leaked = G.CLASS_LIST.filter(c => c.ally && heroLine.indexOf(c.id) >= 0).map(c => c.name);
console.log('\n（' + (REALM === 'norse' ? '塔（北欧）' : '物語（相刻）') + 'のアクセサリだけで判定）');
console.log('職業 ' + G.CLASS_LIST.length + '種（主人公 ' + heroLine.length + '／仲間の固有職 ' +
  G.CLASS_LIST.filter(c => c.ally).length + '）' +
  (leaked.length ? '  !! 仲間の固有職が主人公に漏れている: ' + leaked.join('・') : ''));
if (leaked.length) bad++;

console.log('\n' + (bad ? '問題 ' + bad + ' 件' : 'すべての職業に到達できる'));
process.exit(bad ? 1 : 0);
