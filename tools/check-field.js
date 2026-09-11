/* check-field.js - 歩く仕組みが、絵なしで正しく動くかを見る
 *
 * 描画は目で確かめるしかないが、移動と当たり判定と会話は機械で確かめられる。
 * canvas を使う tiles.js は読めないので、通行判定だけ差し替えて動かす。
 *
 *   - 出入口から全部の人物の隣まで、実際に一歩ずつ歩いて辿り着けるか
 *   - 話しかけたとき、台詞と用件がちゃんと返るか
 *   - 壁に向かって歩いたとき、めり込まずに止まるか
 */
const { loadEngine, newState } = require('./load-data.js');

const SOLID = {
  mountain: 1, water: 1, wall: 1, roof: 1, tree: 1, rock: 1, counter: 1,
  table: 1, bed: 1, shelf: 1, pot: 1, barrel: 1, sign: 1, fountain: 1,
  chest: 1, chestOpen: 1, torch: 1, pillar: 1, altarTile: 1, voidTile: 1,
  townIcon: 1, castleIcon: 1, caveIcon: 1, shrineIcon: 1, towerIcon: 1
};

/** 経路探索。歩く仕組みそのものを使わず、独立に道を見つける。
 *  同じ関数で道を作って同じ関数で歩くと、両方壊れていても気づけない。 */
function route(G, state, m, from, to) {
  const w = m.rows[0].length, h = m.rows.length;
  const key = (x, y) => y * w + x;
  const prev = new Map(), q = [[from.x, from.y]];
  prev.set(key(from.x, from.y), null);
  while (q.length) {
    const [x, y] = q.shift();
    if (x === to.x && y === to.y) break;
    for (const [dx, dy, d] of [[0, -1, 'up'], [0, 1, 'down'], [-1, 0, 'left'], [1, 0, 'right']]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || prev.has(k)) continue;
      if (!G.Field.passable(state, m, nx, ny) && !(nx === to.x && ny === to.y)) continue;
      prev.set(k, [x, y, d]); q.push([nx, ny]);
    }
  }
  if (!prev.has(key(to.x, to.y))) return null;
  const path = [];
  let cur = key(to.x, to.y);
  while (prev.get(cur)) { const [px, py, d] = prev.get(cur); path.unshift(d); cur = key(px, py); }
  return path;
}

function main() {
  const G = loadEngine();
  /* 描画抜きで通行判定だけ用意する */
  G.Tiles = { passable: k => !SOLID[k] };

  const st = newState(G);
  G.Story.begin(st, 'カイ');
  const bad = [], warn = [];

  Object.keys(G.MAPS).forEach(id => {
    const m = G.MAPS[id];
    st.story.ch = G.STORY.CHAPTERS.filter(c => c.places.some(p => p.id === m.place))[0].id;
    st.story.place = m.place;
    G.Field.enter(st, id);
    const tag = `${m.name}(${id})`;
    let walked = 0, talked = 0, acts = 0;

    /* 壁に向かって歩いても抜けないこと */
    const before = { x: st.field.x, y: st.field.y };
    ['up', 'down', 'left', 'right'].forEach(d => {
      for (let i = 0; i < 60; i++) {
        st.field.walking = false;
        const r = G.Field.step(st, d);
        if (r === 'blocked' || r === 'exit') break;
      }
      const t = G.Field.tileAt(m, st.field.x, st.field.y);
      if (SOLID[t]) bad.push(`${tag}: ${d} に歩き続けたら ${t} の中に入った`);
      G.Field.enter(st, id);
    });
    st.field.x = before.x; st.field.y = before.y;

    /* すべての人物に、歩いて行って話しかける */
    (m.npcs || []).forEach(n => {
      const spots = [[0, -1, 'down'], [0, 1, 'up'], [-1, 0, 'right'], [1, 0, 'left']]
        .map(([dx, dy, face]) => ({ x: n.x + dx, y: n.y + dy, face }))
        .filter(s => G.Field.passable(st, m, s.x, s.y));
      if (!spots.length) { bad.push(`${tag}: 「${n.name || n.id}」の隣に立つ場所が無い`); return; }

      let ok = false;
      for (const s of spots) {
        G.Field.enter(st, id);
        const path = route(G, st, m, { x: st.field.x, y: st.field.y }, s);
        if (!path) continue;
        path.forEach(d => { st.field.walking = false; G.Field.step(st, d); });
        if (st.field.x !== s.x || st.field.y !== s.y) continue;
        walked += path.length;
        G.Field.face(st, s.face);
        const got = G.Field.facing(st);
        if (got !== n) continue;
        const lines = G.Field.linesOf(st, n);
        if (!lines.length || !lines[0].t) { bad.push(`${tag}: 「${n.name || n.id}」に話しかけても何も言わない`); }
        else talked++;
        if (G.Field.actOf(st, n)) acts++;
        ok = true; break;
      }
      if (!ok) bad.push(`${tag}: 「${n.name || n.id}」に歩いて行けない`);
    });

    /* 出口に辿り着けること */
    (m.exits || []).forEach(e => {
      G.Field.enter(st, id);
      const path = route(G, st, m, { x: st.field.x, y: st.field.y }, e);
      if (!path) { bad.push(`${tag}: 出口(${e.x},${e.y})まで歩けない`); return; }
      let last = null;
      path.forEach(d => { st.field.walking = false; last = G.Field.step(st, d); });
      if (last !== 'exit') bad.push(`${tag}: 出口(${e.x},${e.y})を踏んでも外に出ない（${last}）`);
    });

    console.log(`${m.name.padEnd(10, '　')} 歩数 ${String(walked).padStart(4)} ／ 話せた ${talked}/${(m.npcs || []).length} ／ 用件つき ${acts} ／ 出口 ${(m.exits || []).length}`);
  });

  console.log('');
  warn.forEach(x => console.log('△ ' + x));
  if (bad.length) { bad.slice(0, 20).forEach(x => console.log('✗ ' + x)); process.exit(1); }
  console.log('どの町も、歩いて回れて、全員に話しかけられて、外に出られる');
}
main();
