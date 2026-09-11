/* field.js - 歩く（マップ上の移動と、そこで起きること）
 *
 * 絵を出す側（ui/field.js）と、何が起きるか（main.js）の間に挟まる層。
 * ここは「今どこに居て、次の一歩は踏めるか」だけを持ち、
 * 描画もDOMも触らない。塔や戦闘と同じで、検証ツールから直接叩ける形にする。
 *
 * 移動はマス単位。1歩ぶんを何フレームか掛けて滑らせるが、
 * 途中の座標は見た目の話なので tween に置き、論理位置は常にマス目のまま持つ。
 * こうしておくと「壁に半分めり込む」類の不具合が原理的に起きない。
 */
G.Field = (function () {
  var U = G.U;

  var DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  function map(id) { return G.MAPS[id]; }

  function tileAt(m, x, y) {
    if (!m || y < 0 || y >= m.rows.length) return 'voidTile';
    var row = m.rows[y];
    if (x < 0 || x >= row.length) return 'voidTile';
    return G.MAP_LEGEND[row[x]] || 'grass';
  }

  /** そのマスに人物が立っているか */
  function npcAt(state, m, x, y) {
    var f = state.field;
    var list = m.npcs || [];
    for (var i = 0; i < list.length; i++) {
      var n = list[i];
      var p = liveNpc(f, i, n);
      if (p.x === x && p.y === y) return { npc: n, i: i, x: p.x, y: p.y };
    }
    return null;
  }

  /** 歩き回る人物の、今の位置。動かない人物は定義どおり。 */
  function liveNpc(f, i, n) {
    if (!n.wander) return { x: n.x, y: n.y, dir: n.dir || 'down' };
    var mv = (f && f.npcPos && f.npcPos[i]) || null;
    return mv ? mv : { x: n.x, y: n.y, dir: n.dir || 'down' };
  }

  function passable(state, m, x, y) {
    if (!G.Tiles.passable(tileAt(m, x, y))) return false;
    if (npcAt(state, m, x, y)) return false;
    return true;
  }

  /* ===================== 出入り ===================== */

  /** マップに入る。where を渡すとそこへ、渡さなければ既定の開始位置へ。 */
  function enter(state, mapId, where) {
    var m = map(mapId);
    if (!m) return null;
    var st = where || m.start || { x: 1, y: 1, dir: 'down' };
    state.field = {
      map: mapId, x: st.x, y: st.y, dir: st.dir || 'down',
      /* 見た目用。論理位置とは別に持つ */
      ox: 0, oy: 0, step: 0, frame: 0, walking: false,
      steps: 0, npcPos: {}, npcTick: 0,
      /* 直前の場所。出口を踏んだときに戻る先を決めるのに使う */
      from: (state.field && state.field.map) || null
    };
    return state.field;
  }

  function leave(state) { state.field = null; }

  function current(state) { return state.field && map(state.field.map); }

  /* ===================== 移動 ===================== */

  /** 向きを変えるだけ。段差や壁に向かってもこれは通る。 */
  function face(state, dir) {
    if (!state.field || !DIRS[dir]) return false;
    state.field.dir = dir;
    return true;
  }

  /** 一歩踏み出せるか調べ、踏めるなら論理位置を進める。
   *  戻り値は何が起きたか: 'move' / 'blocked' / 'exit' / 'warp' */
  function step(state, dir) {
    var f = state.field, m = current(state);
    if (!f || !m || f.walking) return null;
    var d = DIRS[dir];
    if (!d) return null;
    f.dir = dir;
    var nx = f.x + d[0], ny = f.y + d[1];

    if (!passable(state, m, nx, ny)) return 'blocked';

    f.x = nx; f.y = ny; f.steps++;
    f.walking = true; f.step = 0;
    /* 見た目は「まだ前のマスに居る」状態から始めて、そこへ寄せていく */
    f.ox = -d[0]; f.oy = -d[1];

    /* 出口 */
    var ex = (m.exits || []).filter(function (e) { return e.x === nx && e.y === ny; })[0];
    if (ex) return 'exit';
    /* 内部の行き先（階段・洞窟）。第三段階で使う */
    var wp = (m.warps || []).filter(function (w) { return w.x === nx && w.y === ny; })[0];
    if (wp) { f.pendingWarp = wp; return 'warp'; }
    return 'move';
  }

  /** 見た目の補間を進める。dt は経過フレーム数（1が標準）。 */
  function tick(state, dt) {
    var f = state.field;
    if (!f) return;
    dt = dt || 1;
    if (f.walking) {
      f.step += dt;
      var T = 7;                       /* 1歩に掛けるフレーム数 */
      var t = Math.min(1, f.step / T);
      f.ox = f.ox * (1 - t) + 0 * t;
      f.oy = f.oy * (1 - t) + 0 * t;
      if (f.step >= T) { f.walking = false; f.ox = 0; f.oy = 0; f.frame = f.frame ? 0 : 1; }
    }
    /* 町の人がその場をうろつく。動きすぎると話しかけられないので、かなり遅い。 */
    f.npcTick = (f.npcTick || 0) + dt;
    if (f.npcTick >= 40) { f.npcTick = 0; wanderAll(state); }
  }

  function wanderAll(state) {
    var f = state.field, m = current(state);
    if (!f || !m) return;
    (m.npcs || []).forEach(function (n, i) {
      if (!n.wander || !U.chance(0.35)) return;
      var p = liveNpc(f, i, n);
      var dirs = ['up', 'down', 'left', 'right'];
      var dir = U.pick(dirs), d = DIRS[dir];
      var nx = p.x + d[0], ny = p.y + d[1];
      /* 元の持ち場から離れすぎない。町の端まで散っていくと、
       * 話を聞きに行く相手が見つからなくなる。 */
      if (Math.abs(nx - n.x) > 2 || Math.abs(ny - n.y) > 2) { f.npcPos[i] = { x: p.x, y: p.y, dir: dir }; return; }
      if (nx === f.x && ny === f.y) { f.npcPos[i] = { x: p.x, y: p.y, dir: dir }; return; }
      if (!G.Tiles.passable(tileAt(m, nx, ny)) || npcAt(state, m, nx, ny)) {
        f.npcPos[i] = { x: p.x, y: p.y, dir: dir }; return;
      }
      f.npcPos[i] = { x: nx, y: ny, dir: dir };
    });
  }

  /* ===================== 調べる ===================== */

  /** 今向いている先に居る相手。話しかける対象を返す。 */
  function facing(state) {
    var f = state.field, m = current(state);
    if (!f || !m) return null;
    var d = DIRS[f.dir];
    var hit = npcAt(state, m, f.x + d[0], f.y + d[1]);
    if (hit) {
      /* 話しかけられたら、こちらを向く */
      var back = { up: 'down', down: 'up', left: 'right', right: 'left' }[f.dir];
      if (hit.npc.wander) f.npcPos[hit.i] = { x: hit.x, y: hit.y, dir: back };
      return hit.npc;
    }
    return null;
  }

  /** 人物の台詞。自前で持たず、既存のデータを引きに行く。 */
  function linesOf(state, n) {
    if (!n) return [];
    if (n.src === 'talk') {
      var m = current(state);
      var place = m && G.STORY.PLACE_BY_ID[m.place];
      if (!place) return [];
      var ch = G.Story.chapter(state);
      var moved = !!(ch && state.story && state.story.cleared[ch.goal] && place.talksAfter);
      var t = (moved ? place.talksAfter : place.talks)[n.idx];
      return t ? [{ w: t.who, t: t.t }] : [];
    }
    if (n.src === 'errand') {
      var x = (G.ERRAND_BY_ID || {})[n.id];
      if (!x) return [];
      var taken = G.Story.errandTaken(state, x.id);
      var done = G.Story.errandDone(state, x.id);
      if (done) return [{ w: x.who, t: '「……あのときは、助かった」' }];
      if (!taken) return [{ w: x.who, t: x.ask }];
      var pr = G.Story.errandProgress(state, x.id);
      return [{ w: x.who, t: pr.ok ? x.mid : x.mid }];
    }
    return [{ w: n.spr ? (n.name || '') : '', t: n.say || '' }];
  }

  /** 話しかけたあとに走らせる操作。無ければ null。 */
  function actOf(state, n) {
    if (!n) return null;
    if (n.src === 'errand') {
      var x = (G.ERRAND_BY_ID || {})[n.id];
      if (!x || G.Story.errandDone(state, x.id)) return null;
      if (!G.Story.errandTaken(state, x.id)) return 'errandAsk:' + x.id;
      return G.Story.errandProgress(state, x.id).ok ? 'errandDone:' + x.id : null;
    }
    if (n.act === 'inn') {
      var m = current(state);
      var place = m && G.STORY.PLACE_BY_ID[m.place];
      return 'inn:' + ((place && place.inn) || 30);
    }
    return n.act || null;
  }

  return {
    DIRS: DIRS, map: map, tileAt: tileAt, passable: passable, liveNpc: liveNpc, npcAt: npcAt,
    enter: enter, leave: leave, current: current,
    face: face, step: step, tick: tick,
    facing: facing, linesOf: linesOf, actOf: actOf
  };
})();
