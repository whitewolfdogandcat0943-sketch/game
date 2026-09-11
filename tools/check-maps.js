/* check-maps.js - 歩けるマップが、実際に歩けるかを見る
 *
 * 地図は「見て書く」データなので、1文字ずれただけで壁に埋まる。
 * 目では気づけないので、ここで機械に歩かせる。
 *   - 行の長さが揃っているか／知らない記号が無いか
 *   - 出入口から、すべての人物と扉に歩いて辿り着けるか
 *   - 人物が壁の中に立っていないか、重なっていないか
 */
const { load } = require('./load-data.js');

/* 通行判定の表はデータ側（G.TILE_SOLID）にある。写しは作らない。 */

function main() {
  const G = load();
  const SOLID = G.TILE_SOLID;
  const bad = [], warn = [];
  const L = G.MAP_LEGEND;

  Object.keys(G.MAPS).forEach(id => {
    const m = G.MAPS[id];
    const h = m.rows.length, w = m.rows[0].length;
    const tag = `${m.name}(${id})`;

    /* --- 形 --- */
    m.rows.forEach((r, y) => {
      if (r.length !== w) bad.push(`${tag}: ${y}行目の長さが ${r.length}（他は ${w}）`);
      for (const ch of r) if (!L[ch]) bad.push(`${tag}: 知らない記号 "${ch}"（${y}行目）`);
    });
    if (bad.length) return;

    const kind = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 'voidTile' : L[m.rows[y][x]];
    const pass = (x, y) => !SOLID[kind(x, y)];

    /* --- 出入口から歩ける範囲 --- */
    const starts = [m.start, ...(m.exits || []), ...(m.warps || [])].filter(Boolean);
    if (!starts.length) { bad.push(`${tag}: 出入口も開始位置も無い`); return; }
    starts.forEach(s => { if (!pass(s.x, s.y)) bad.push(`${tag}: 出入口(${s.x},${s.y})が通れないタイル(${kind(s.x, s.y)})`); });

    const seen = new Set(), q = [];
    starts.forEach(s => { if (pass(s.x, s.y)) { seen.add(s.y * w + s.x); q.push([s.x, s.y]); } });
    while (q.length) {
      const [x, y] = q.shift();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy, k = ny * w + nx;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen.has(k) || !pass(nx, ny)) return;
        seen.add(k); q.push([nx, ny]);
      });
    }

    /* --- 扉の向こうに入れるか --- */
    let doors = 0, shut = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (kind(x, y) !== 'door') continue;
      doors++;
      if (!seen.has(y * w + x)) { shut++; bad.push(`${tag}: 扉(${x},${y})に辿り着けない`); }
      else {
        /* 扉の内側（上下左右のうち、屋内の床）に入れるか */
        const inside = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => {
          const k = kind(x + dx, y + dy);
          return (k === 'floorWood' || k === 'floorStone' || k === 'carpet') && seen.has((y + dy) * w + (x + dx));
        });
        if (!inside) bad.push(`${tag}: 扉(${x},${y})の先に床が無い（入っても行き止まり）`);
      }
    }

    /* --- 人物 --- */
    const at = {};
    (m.npcs || []).forEach(n => {
      const k = n.y * w + n.x;
      if (at[k]) bad.push(`${tag}: (${n.x},${n.y})に人物が重なっている`);
      at[k] = true;
      if (n.spr === null) {
        /* 置き物。本人は壁でよいが、隣に立てないと話せない */
        const near = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => seen.has((n.y + dy) * w + (n.x + dx)));
        if (!near) bad.push(`${tag}: 「${n.name}」(${n.x},${n.y})の隣に立てない`);
        return;
      }
      if (!pass(n.x, n.y)) bad.push(`${tag}: 「${n.name || n.src}」(${n.x},${n.y})が壁の中(${kind(n.x, n.y)})`);
      else if (!seen.has(k)) bad.push(`${tag}: 「${n.name || n.src}」(${n.x},${n.y})に辿り着けない`);
    });

    /* --- 参照先 --- */
    const place = G.STORY.PLACE_BY_ID[m.place];
    if (m.kind === 'town' && !place) bad.push(`${tag}: 物語の場所 ${m.place} が無い`);
    (m.npcs || []).forEach(n => {
      if (n.src === 'talk') {
        if (!place) return;
        if (!(place.talks || [])[n.idx]) bad.push(`${tag}: 街の声 ${n.idx} 番が無い`);
        if (place.talksAfter && !place.talksAfter[n.idx]) bad.push(`${tag}: 踏破後の声 ${n.idx} 番が無い`);
      }
      if (n.src === 'errand' && !(G.ERRAND_BY_ID || {})[n.id]) bad.push(`${tag}: 頼まれごと ${n.id} が無い`);
    });

    /* --- 施設がそろっているか --- */
    const acts = (m.npcs || []).map(n => n.act).filter(Boolean);
    ['inn', 'townShop', 'altar'].forEach(a => {
      if (place && place[a === 'townShop' ? 'shop' : a === 'inn' ? 'inn' : 'altar'] && acts.indexOf(a) < 0) {
        warn.push(`${tag}: ${a} が地図に置かれていない`);
      }
    });
    /* 街の声と頼まれごとが全部、誰かの口に入っているか */
    if (place) {
      const voiced = (m.npcs || []).filter(n => n.src === 'talk').length;
      if (voiced < (place.talks || []).length) warn.push(`${tag}: 街の声 ${place.talks.length} 本のうち ${voiced} 本しか人が居ない`);
      const qs = (G.ERRANDS || []).filter(e => e.town === m.place).length;
      const placed = (m.npcs || []).filter(n => n.src === 'errand').length;
      if (placed < qs) warn.push(`${tag}: 頼まれごと ${qs} 件のうち ${placed} 件しか人が居ない`);
    }

    /* --- フィールド固有: 行き先・地帯・関所 --- */
    let zinfo = '';
    if (m.kind === 'world') {
      (m.warps || []).forEach(wp => {
        if (!seen.has(wp.y * w + wp.x)) bad.push(`${tag}: 行き先(${wp.x},${wp.y})→${wp.to} に辿り着けない`);
        const isMap = !!G.MAPS[wp.to], isPlace = !!G.STORY.PLACE_BY_ID[wp.to];
        if (!isMap && !isPlace && wp.to !== 'tower') bad.push(`${tag}: 行き先 ${wp.to} が無い`);
      });
      /* すべての町とダンジョンが大陸に置かれているか */
      const on = new Set((m.warps || []).map(wp => wp.to));
      G.STORY.CHAPTERS.forEach(c => c.places.forEach(pl => {
        if (!on.has(pl.id)) bad.push(`${tag}: ${pl.name}(${pl.id}) が大陸に置かれていない`);
      }));

      /* 地帯。橋を壁として塗り、重なりと取りこぼしを見る */
      const zone = {}, sizes = {};
      (m.zones || []).forEach(z => {
        const sx = z.seed.x, sy = z.seed.y, k0 = sy * w + sx;
        if (!pass(sx, sy)) { bad.push(`${tag}: ${z.name} の種が通れない`); return; }
        if (zone[k0]) { bad.push(`${tag}: ${z.name} の種が ${zone[k0]} と同じまとまりにある（川が繋がっている）`); return; }
        const qq = [[sx, sy]]; zone[k0] = z.id; sizes[z.id] = 1;
        while (qq.length) {
          const [x, y] = qq.shift();
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy, k = ny * w + nx;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h || zone[k]) continue;
            if (kind(nx, ny) === 'bridge' || !pass(nx, ny)) continue;
            zone[k] = z.id; sizes[z.id]++; qq.push([nx, ny]);
          }
        }
      });
      let orphan = 0;
      seen.forEach(k => { if (!zone[k] && kind(k % w, Math.floor(k / w)) !== 'bridge') orphan++; });
      if (orphan) warn.push(`${tag}: どの地帯にも属さない陸が ${orphan} マス`);
      /* 段が上がっていく並びになっているか */
      const lvs = (m.zones || []).map(z => z.lv);
      for (let i = 1; i < lvs.length; i++) {
        if (lvs[i] <= lvs[i - 1]) warn.push(`${tag}: ${m.zones[i].name} の格(${lvs[i]})が手前より高くない`);
      }
      (m.zones || []).forEach(z => {
        (z.pool || []).forEach(id => { if (!G.ENEMY_BY_ID[id]) bad.push(`${tag}: ${z.name} の敵 ${id} が無い`); });
        if (!z.pool || !z.pool.length) bad.push(`${tag}: ${z.name} に敵が居ない`);
      });
      zinfo = ' ／ 地帯 ' + (m.zones || []).map(z => z.name + 'Lv' + z.lv + '(' + (sizes[z.id] || 0) + ')').join('・');

      /* 関所 */
      (m.gates || []).forEach(g => {
        if (kind(g.x, g.y) !== 'bridge') bad.push(`${tag}: 関所(${g.x},${g.y})が橋の上にない`);
        if (g.need && !G.STORY.PLACE_BY_ID[g.need]) bad.push(`${tag}: 関所の条件 ${g.need} が無い`);
        if (!g.shut) bad.push(`${tag}: 関所(${g.x},${g.y})に断り文句が無い`);
      });
    }

    console.log(`${m.name.padEnd(10, '　')} ${w}×${h}  歩ける ${seen.size} マス ／ 扉 ${doors}（塞がり ${shut}）／ 人物 ${(m.npcs || []).length}${zinfo}`);
  });

  console.log('');
  console.log(`地図 ${Object.keys(G.MAPS).length}枚`);
  warn.forEach(x => console.log('△ ' + x));
  if (bad.length) { bad.slice(0, 30).forEach(x => console.log('✗ ' + x)); process.exit(1); }
  console.log('すべての地図が、出入口から隅まで歩ける');
}
main();
