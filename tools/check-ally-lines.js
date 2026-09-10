/* check-ally-lines.js - 仲間が自分の系統の先端まで到達できるか確かめる
 *
 *   node tools/check-ally-lines.js
 *
 * 系統に最上級職を並べても、条件を満たす手段が無ければ飾りになる。
 * 職業の req に入っている条件記述子（d）をそのまま読み、
 * それを満たすアクセサリ4枠を機械的に組んで判定する。
 * 条件を書き換えたら、このツールも自動で追随する。 */
const { loadEngine, newState } = require('./load-data.js');
const G = loadEngine();

/** アクセサリ1個の、ある軸への寄与 */
function axisScore(acc, axis) {
  if (axis === 'lightdark') {
    const m = acc.mods || {};
    return (Math.max(0, m.el_light || 0) + Math.max(0, m.el_dark || 0)) * 100;
  }
  return G.Style.scoreOf(acc)[axis] || 0;
}
/** 6属性すべてを底上げする度合い（allElem 条件用） */
function allElemScore(acc) {
  const m = acc.mods || {};
  return Math.min.apply(null, G.MAGIC_ELEMENTS.map(e => Math.max(0, m['el_' + e] || 0)));
}

/** 条件記述子から「4枠に何を入れるべきか」を組む */
function buildAccs(conds) {
  const pool = G.LEGENDS.concat(G.NORMALS);
  const want = [];                       /* [軸, 欲しい枠数] */
  let needLegend = 0, needAllElem = false;

  conds.forEach(d => {
    if (!d) return;
    if (d.t === 'accStyle') want.push([d.k, 4]);
    else if (d.t === 'accStyleDual') { want.push([d.a, 2]); want.push([d.b, 2]); }
    else if (d.t === 'accElemPair') want.push(['lightdark', 4]);
    else if (d.t === 'allElem') needAllElem = true;
    else if (d.t === 'legendN') needLegend = Math.max(needLegend, d.v || 1);
  });

  const picks = [];
  const taken = new Set();
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
  /* レジェンドが要るのに1つも入っていなければ、一番効く軸のレジェンドと入れ替える */
  if (needLegend && !picks.some(a => a.rarity === 'legend')) {
    const axis = (want[0] || ['crit'])[0];
    const best = G.LEGENDS.filter(a => !taken.has(a.id))
      .map(a => ({ a, v: needAllElem ? allElemScore(a) : axisScore(a, axis) }))
      .filter(x => x.v > 0).sort((x, y) => y.v - x.v)[0];
    if (best) { picks.pop(); picks.push(best.a); }
  }
  return picks.slice(0, 4).map(a => a.id);
}

/* 上級職は「行動の実績」で決まる。どの軸を積めばよいかは
 * 職業の条件記述子から読む。職業を足してもこのツールが追随するように。 */
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

let bad = 0;
Object.keys(G.ALLIES).forEach(id => {
  const def = G.ALLIES[id];
  console.log('\n■ ' + def.name + '（系統 ' + def.line.length + '職）');
  def.line.forEach(cid => {
    const cls = G.CLASSES[cid];
    if (cls.tier === 1) { console.log('   t1 ' + cls.name + ' … 初期職'); return; }

    const st = newState(G);
    G.Run.newRun(st, 'swordsman', 'カイ');
    G.Run.joinAlly(st, id);
    const m = st.party[1];
    st.hero.level = 20; G.Run.syncAllies(st);

    const from = (cls.from || []).filter(f => def.line.indexOf(f) >= 0)[0];
    if (from && from !== m.classId) { m.classHistory.push(m.classId); m.classId = from; }

    G.Style.AXIS_IDS.concat(['light', 'dark', 'phys', 'mag']).forEach(a => G.Style.addTo(m, a, 4));
    const conds = (cls.req || []).map(r => r.d);
    styleAxes(conds).forEach(a => G.Style.addTo(m, a, 400));
    if (cls.tier === 2) {
      /* 上級職は戦い方だけで決まるので、ここでは装備を触らない */
    } else {
      if (conds.some(d => d && d.t === 'rarityCount' && d.r === 'mythic')) {
        G.MYTHICS.slice(0, 3).forEach((a, i) => { G.addAcc(st.hero, a.id); m.equip.acc[i] = a.id; });
        st.meta.mythics = G.MYTHICS.slice(0, 3).map(a => a.id);
      } else {
        buildAccs(conds).forEach((aid, i) => { G.addAcc(st.hero, aid); m.equip.acc[i] = aid; });
      }
    }

    const r = G.Unlock.availableClasses(st, m).filter(x => x.cls.id === cid)[0];
    const ng = r ? r.conds.filter(c => !c.ok).map(c => c.label + (c.prog ? '（' + c.prog + '）' : '')) : ['判定なし'];
    if (r && r.ok) {
      const kit = m.equip.acc.filter(Boolean).map(a => G.ACC_BY_ID[a].name).join('・');
      console.log('   t' + cls.tier + ' ' + cls.name + ' … 到達可' + (kit ? '  [' + kit + ']' : ''));
    } else { bad++; console.log('   t' + cls.tier + ' ' + cls.name + ' … !! 到達不可'); ng.forEach(x => console.log('        ' + x)); }
  });
});

/* 主人公が仲間の固有職に就けないことも確かめる */
const st2 = newState(G);
G.Run.newRun(st2, 'swordsman', 'カイ');
const heroLine = G.Unlock.classLine(st2.hero);
const leaked = G.CLASS_LIST.filter(c => c.ally && heroLine.indexOf(c.id) >= 0).map(c => c.name);
console.log('\n主人公が就ける職業: ' + heroLine.length + '職' +
  (leaked.length ? '  !! 仲間の固有職が混じっている: ' + leaked.join('・') : '（仲間の固有職は含まない）'));
if (leaked.length) bad++;

console.log('\n' + (bad ? '問題 ' + bad + ' 件' : 'すべての系統の先端に到達でき、固有職の分離もできている'));
