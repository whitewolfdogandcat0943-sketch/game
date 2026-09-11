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
  const SOLID = G.TILE_SOLID;
  /* 描画抜きで通行判定だけ用意する */
  G.Tiles = { passable: k => !SOLID[k] };

  const st = newState(G);
  G.Story.begin(st, 'カイ');
  const bad = [], warn = [];

  Object.keys(G.MAPS).forEach(id => {
    const m = G.MAPS[id];
    const own = G.STORY.CHAPTERS.filter(c => c.places.some(p => p.id === m.place))[0];
    if (own) { st.story.ch = own.id; st.story.place = m.place; }
    else { st.story.ch = 6; st.story.place = null; }
    /* 大陸を隅まで歩くので、関所はいったん開けておく。
     * 関所そのものは、このあと閉じた状態と開いた状態の両方で確かめる。 */
    st.story.cleared = {};
    if (m.kind === 'world') (m.gates || []).forEach(g => { if (g.need) st.story.cleared[g.need] = true; });
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

    /* --- 大陸だけの確かめ --- */
    if (m.kind === 'world') {
      /* すべての行き先を、実際に歩いて踏む */
      (m.warps || []).forEach(wp => {
        G.Field.enter(st, id);
        const path = route(G, st, m, { x: st.field.x, y: st.field.y }, wp);
        if (!path) { bad.push(`${tag}: ${wp.to} まで歩けない`); return; }
        let last = null;
        path.forEach(d => { st.field.walking = false; last = G.Field.step(st, d); });
        if (last !== 'warp') bad.push(`${tag}: ${wp.to} の入口を踏んでも入らない（${last}）`);
      });

      /* 関所。物語が進む前は止まり、進んだら通れること */
      const openAll = Object.assign({}, st.story.cleared);
      (m.gates || []).forEach(g => {
        st.story.cleared = {};
        G.Field.enter(st, id);
        const path = route(G, st, m, { x: st.field.x, y: st.field.y }, g);
        if (!path) { bad.push(`${tag}: 関所(${g.x},${g.y})まで歩けない`); return; }
        let last = null;
        path.forEach(d => { st.field.walking = false; last = G.Field.step(st, d); });
        if (last !== 'gate') bad.push(`${tag}: 関所(${g.x},${g.y})が、条件前でも通れてしまう（${last}）`);
        st.story.cleared[g.need] = true;
        G.Field.enter(st, id);
        last = null;
        path.forEach(d => { st.field.walking = false; last = G.Field.step(st, d); });
        if (last === 'gate') bad.push(`${tag}: 関所(${g.x},${g.y})が、条件を満たしても開かない`);
      });
      st.story.cleared = openAll;

      /* 敵の出方。地帯ごとに千歩あるいて、間隔と相手を見る */
      console.log('  ' + '地帯'.padEnd(8, '　') + ' 格  千歩あたり  敵の数  顔ぶれ');
      (m.zones || []).forEach(z => {
        /* 種は町のすぐそばに置いてあるので、そこは安全域で敵が出ない。
         * 測るときは、その地帯の中で町から離れた平地に立たせる。 */
        let spot = null;
        for (let y = 0; y < m.rows.length && !spot; y++) {
          for (let x = 0; x < m.rows[0].length; x++) {
            const zz = G.Field.zoneAt(m, x, y);
            if (!zz || zz.id !== z.id) continue;
            if (G.Field.nearHaven(m, x, y)) continue;
            if (SOLID[G.Field.tileAt(m, x, y)]) continue;
            if (G.Field.tileAt(m, x, y) !== 'grass' && G.Field.tileAt(m, x, y) !== 'hill') continue;
            spot = { x: x, y: y, dir: 'down' }; break;
          }
        }
        if (!spot) { bad.push(`${tag}: ${z.name} に、町から離れた平地が無い`); return; }
        G.Field.enter(st, id, spot);
        let fights = 0, mobs = 0;
        const seenIds = {};
        for (let i = 0; i < 1000; i++) {
          /* その場で足踏みさせる。地面の違いは別に測るので、ここは平地基準。 */
          const enc = G.Field.rollEncounter(st);
          if (!enc) continue;
          fights++; mobs += enc.units.length;
          enc.units.forEach(u => { seenIds[u.ref.id] = 1; });
        }
        if (!fights) { bad.push(`${tag}: ${z.name} で千歩あるいても敵が出ない`); return; }
        const per = (1000 / fights).toFixed(1);
        if (fights < 40) warn.push(`${tag}: ${z.name} は ${per} 歩に一度しか出ない（間延びする）`);
        if (fights > 130) warn.push(`${tag}: ${z.name} は ${per} 歩ごとに出る（歩けない）`);
        const missing = (z.pool || []).filter(x => !seenIds[x]);
        if (missing.length) warn.push(`${tag}: ${z.name} で ${missing.join('・')} が一度も出なかった`);
        console.log('  ' + z.name.padEnd(8, '　') + ' ' + String(z.lv).padStart(2) +
          '  ' + String(fights).padStart(3) + '回(' + per + '歩)' +
          '  ' + (mobs / fights).toFixed(1) + '体  ' +
          Object.keys(seenIds).map(k => G.ENEMY_BY_ID[k].name).join('・'));
      });

      /* 町の入口のそばでは出ないこと */
      const haven = (m.warps || []).filter(wp => G.Field.tileAt(m, wp.x, wp.y) === 'townIcon')[0];
      if (haven) {
        G.Field.enter(st, id, { x: haven.x, y: haven.y + 1, dir: 'down' });
        let hit = 0;
        for (let i = 0; i < 500; i++) if (G.Field.rollEncounter(st)) hit++;
        if (hit) bad.push(`${tag}: 町の入口のそばで ${hit} 回も敵が出る`);
      }
    }

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
