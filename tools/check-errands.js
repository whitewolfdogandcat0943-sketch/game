/* check-errands.js - 町の頼まれごとが、実際に達成できるかを見る
 *
 * 台詞は読めば分かるが、「その章でその敵が本当に出るか」は読んでも分からない。
 * 受けたのに一生終わらない用事があると、町が信用できなくなる。
 */
const { load } = require('./load-data.js');

function main() {
  const G = load();
  const bad = [], warn = [];
  const towns = {}, dungeons = {};
  G.STORY.CHAPTERS.forEach(c => c.places.forEach(p => {
    if (p.kind === 'town') towns[p.id] = { ch: c.id, place: p };
    else dungeons[p.id] = { ch: c.id, place: p };
  }));

  console.log('章  町           用事                         必要なもの                 報酬');
  G.ERRANDS.forEach(x => {
    const t = towns[x.town];
    if (!t) { bad.push(`${x.id}: 町 ${x.town} が無い`); return; }
    if (t.ch !== x.ch) bad.push(`${x.id}: 章(${x.ch})と町の章(${t.ch})が食い違う`);

    let need = '';
    if (x.kind === 'kill') {
      const e = G.ENEMY_BY_ID[x.target];
      if (!e) { bad.push(`${x.id}: 敵 ${x.target} が無い`); return; }
      need = `${e.name} ×${x.n}`;
      /* その章以降のどこかのダンジョンの出現表に入っているか */
      const where = Object.keys(dungeons).filter(k =>
        dungeons[k].ch >= x.ch && (dungeons[k].place.pool || []).indexOf(x.target) >= 0);
      if (!where.length) bad.push(`${x.id}: ${e.name} は第${x.ch}章以降のどこにも出ない`);
      else {
        /* 一回の踏破で出る数の見当。depth-1 戦 × 平均3体 × 出現率 */
        const d = dungeons[where[0]].place;
        const per = (d.depth - 1) * 3 / d.pool.length;
        if (per * 1.6 < x.n) warn.push(`${x.id}: ${e.name} ×${x.n} は ${d.name} を何周かしないと終わらない見込み（1周 約${per.toFixed(1)}体）`);
      }
    } else if (x.kind === 'bring') {
      const it = G.ITEM_BY_ID[x.item];
      if (!it) { bad.push(`${x.id}: 品 ${x.item} が無い`); return; }
      need = `${it.name} ×${x.n}`;
      if (it.tier >= 3 && x.ch <= 3) warn.push(`${x.id}: ${it.name} は上位品。第${x.ch}章では手に入りにくい`);
    } else {
      bad.push(`${x.id}: 種類 ${x.kind} は扱えない`);
      return;
    }

    const r = x.reward || {};
    (r.items || []).forEach(pair => {
      if (!G.ITEM_BY_ID[pair[0]]) bad.push(`${x.id}: 報酬の品 ${pair[0]} が無い`);
    });
    if (r.acc && !G.ACC_BY_ID[r.acc]) bad.push(`${x.id}: 報酬のアクセ ${r.acc} が無い`);
    if (r.acc && G.ACC_BY_ID[r.acc] && G.ACC_BY_ID[r.acc].rarity === 'relic') {
      bad.push(`${x.id}: 形見を報酬にしている（形見は主戦からだけ）`);
    }
    ['ask', 'mid', 'done'].forEach(k => { if (!x[k]) bad.push(`${x.id}: ${k} の台詞が無い`); });

    const rw = [r.gold ? r.gold + 'G' : '', (r.items || []).map(p => G.ITEM_BY_ID[p[0]].name + '×' + p[1]).join('・'),
                r.acc ? '💍' + G.ACC_BY_ID[r.acc].name : ''].filter(Boolean).join(' / ');
    console.log(`${x.ch}   ${t.place.name.padEnd(9, '　')} ${x.who.padEnd(12, '　')} ${need.padEnd(20, '　')} ${rw}`);
  });

  /* 町ごとの配り方。1つも無い町があると、そこだけ人の居ない町になる */
  Object.keys(towns).forEach(id => {
    const n = G.ERRANDS.filter(x => x.town === id).length;
    if (!n) warn.push(`${towns[id].place.name}: 頼まれごとが1つも無い`);
  });

  console.log('');
  console.log(`用事 ${G.ERRANDS.length}件 ／ 町 ${Object.keys(towns).length}`);
  warn.forEach(w => console.log('△ ' + w));
  if (bad.length) { bad.forEach(b => console.log('✗ ' + b)); process.exit(1); }
  console.log('すべての頼まれごとが、その章のうちに達成できる');
}
main();
