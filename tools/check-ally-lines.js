/* check-ally-lines.js - 仲間が自分の系統の先端まで到達できるか確かめる
 *
 *   node tools/check-ally-lines.js
 *
 * 系統に最上級職を並べても、条件を満たす手段が無ければ飾りになる。
 * 「アクセサリ4枠と戦い方の積み方次第で、実際に届く」ことを機械的に確認する。 */
const { loadEngine, newState } = require('./load-data.js');

const G = loadEngine();

/** その職業の解放に効きそうなアクセサリを、4枠ぶん貪欲に選ぶ */
function bestAccsFor(axis, needMythic) {
  const pool = needMythic ? G.MYTHICS : G.LEGENDS.concat(G.NORMALS);
  const scored = pool.map(a => {
    const s = G.Style.scoreOf(a);
    return { a, v: axis === 'lightdark'
      ? (Math.max(0, (a.mods && a.mods.el_light) || 0) + Math.max(0, (a.mods && a.mods.el_dark) || 0)) * 100
      : (s[axis] || 0) };
  }).filter(x => x.v > 0).sort((x, y) => y.v - x.v);
  return scored.slice(0, 4).map(x => x.a.id);
}

/* 最上級職ごとに、どの軸を伸ばせばよいか */
const AXIS_OF = {
  phantomSaint: 'crit', mirrorEmperor: 'reflect', calamityKing: 'aoe',
  astralArchmage: 'elem', alchemySovereign: 'item', bloodfiend: 'life',
  skyrunner: 'speed', plaguelord: 'status', finalArbiter: 'lightdark',
  poleEmperor: 'crit', voidSovereign: 'mythic'
};

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

    /* 前提職に就いておく */
    const from = (cls.from || []).filter(f => def.line.indexOf(f) >= 0)[0];
    if (from && from !== m.classId) { m.classHistory.push(m.classId); m.classId = from; }

    /* その職に効く戦い方を積む */
    G.Style.AXIS_IDS.concat(['light', 'dark', 'phys', 'mag']).forEach(a => G.Style.addTo(m, a, 4));
    const axis = AXIS_OF[cid];
    if (cls.tier === 2) {
      /* 上級職は行動の比率で決まるので、その職の軸を厚く積む */
      ({ guardian: ['guard', 'reflect'], berserker: ['life'], exorcist: ['light', 'dark'],
         elementalist: ['elem'], stormcaller: ['aoe'], hexer: ['status'],
         alchemist: ['item'], assassin: ['crit'], windrunner: ['speed'],
         spellblade: ['phys', 'mag'] }[cid] || []).forEach(a => G.Style.addTo(m, a, 400));
    } else if (axis && axis !== 'mythic') {
      G.Style.AXIS_IDS.forEach(a => G.Style.addTo(m, a, 0));
      bestAccsFor(axis, false).forEach((aid, i) => { G.addAcc(st.hero, aid); m.equip.acc[i] = aid; });
    } else if (axis === 'mythic') {
      /* 虚無帝はミシック3個装備が条件 */
      G.MYTHICS.slice(0, 3).forEach((a, i) => { G.addAcc(st.hero, a.id); m.equip.acc[i] = a.id; });
      st.meta.mythics = G.MYTHICS.slice(0, 3).map(a => a.id);
    }

    const r = G.Unlock.availableClasses(st, m).filter(x => x.cls.id === cid)[0];
    const ng = r ? r.conds.filter(c => !c.ok).map(c => c.label) : ['判定なし'];
    if (r && r.ok) console.log('   t' + cls.tier + ' ' + cls.name + ' … 到達可');
    else { bad++; console.log('   t' + cls.tier + ' ' + cls.name + ' … !! 到達不可: ' + ng.join(' / ')); }
  });
});
console.log('\n' + (bad ? '到達できない職業が ' + bad + ' 件ある' : 'すべての系統の先端に到達できる'));
