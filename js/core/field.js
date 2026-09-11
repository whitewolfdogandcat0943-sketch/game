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

  /* ===================== 地帯 =====================
   *
   * 橋で隔てられたまとまりを、ひとつの地帯とする。
   * 座標で「ここからここまで」と書かないのは、川を一マス直すたびに
   * 範囲表も直す羽目になり、必ずどちらかが古くなるから。
   * 種から塗りつぶせば、地形がそのまま境界になる。
   *
   * 塗るのは一度だけで、結果は地図に貼っておく。
   */
  function zoneMap(m) {
    if (m._zones) return m._zones;
    var w = m.rows[0].length, h = m.rows.length;
    var out = {};
    (m.zones || []).forEach(function (z) {
      var sx = z.seed.x, sy = z.seed.y;
      if (!walkable(m, sx, sy) || out[sy * w + sx]) return;
      var q = [[sx, sy]];
      out[sy * w + sx] = z.id;
      while (q.length) {
        var p = q.shift(), x = p[0], y = p[1];
        for (var i = 0; i < 4; i++) {
          var d = [[1, 0], [-1, 0], [0, 1], [0, -1]][i];
          var nx = x + d[0], ny = y + d[1], k = ny * w + nx;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || out[k]) continue;
          /* 橋は壁あつかい。ここで止めないと地帯がひと続きになる。 */
          if (tileAt(m, nx, ny) === 'bridge' || !walkable(m, nx, ny)) continue;
          out[k] = z.id; q.push([nx, ny]);
        }
      }
    });
    /* 橋そのものは、両岸のうち低いほうに属させる。
     * 渡りきるまでは前の土地の敵が出るので、渡った瞬間に段が上がって見える。 */
    (m.rows || []).forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) {
        if (tileAt(m, x, y) !== 'bridge') continue;
        var best = null;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var id = out[(y + d[1]) * w + (x + d[0])];
          if (!id) return;
          var z = zoneOfId(m, id);
          if (!best || z.lv < best.lv) best = z;
        });
        if (best) out[y * w + x] = best.id;
      }
    });
    m._zones = out;
    return out;
  }

  function zoneOfId(m, id) {
    return (m.zones || []).filter(function (z) { return z.id === id; })[0] || null;
  }

  /** そのマスの地帯。無ければ null。 */
  function zoneAt(m, x, y) {
    if (!m || !m.zones) return null;
    var w = m.rows[0].length;
    return zoneOfId(m, zoneMap(m)[y * w + x]);
  }

  /** タイルとして通れるか（人物は見ない）。地帯を塗るときに使う。 */
  function walkable(m, x, y) { return G.Tiles.passable(tileAt(m, x, y)); }

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
    /* 関所。物語がそこまで進んでいなければ、その一歩は踏めない。 */
    var gate = gateAt(state, m, nx, ny);
    if (gate && !gateOpen(state, gate)) { f.blockedBy = gate; return 'gate'; }

    /* 直前に居たマス。目印から出るときの戻り先に使う。 */
    f.prev = { x: f.x, y: f.y };
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
  function gateAt(state, m, x, y) {
    return (m.gates || []).filter(function (g) { return g.x === x && g.y === y; })[0] || null;
  }
  function gateOpen(state, g) {
    if (!g || !g.need) return true;
    return !!(state.story && state.story.cleared && state.story.cleared[g.need]);
  }

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

  /* ===================== 野外の敵 =====================
   *
   * 歩いていると敵が出る。出やすさは地面で変える。
   * 道は安全で、森と沼は危ない ―― 近道は、近いぶんだけ高くつく。
   *
   * 町の目印のまわりだけは出ないようにしてある。
   * 宿を出た一歩目で襲われると、回復した意味が無くなって理不尽に感じる。
   */
  var DANGER = {
    road: 0.35, bridge: 0.25, sand: 0.9, grass: 1.0, flower: 1.0,
    hill: 1.25, forest: 1.6, marsh: 1.9, shallow: 1.2
  };

  /** 町の入口のそば（3マス以内）は安全 */
  function nearHaven(m, x, y) {
    var ws = m.warps || [];
    for (var i = 0; i < ws.length; i++) {
      var t = tileAt(m, ws[i].x, ws[i].y);
      if (t !== 'townIcon' && t !== 'castleIcon') continue;
      if (Math.abs(ws[i].x - x) + Math.abs(ws[i].y - y) <= 3) return true;
    }
    return false;
  }

  /** 一歩ぶんの危険を積む。溜まったら戦闘。
   *  戻り値は組んだ相手の一覧、まだなら null。 */
  function rollEncounter(state) {
    var f = state.field, m = current(state);
    if (!f || !m || !m.zones) return null;
    var z = zoneAt(m, f.x, f.y);
    if (!z) return null;
    if (nearHaven(m, f.x, f.y)) return null;
    var t = tileAt(m, f.x, f.y);
    f.enc = (f.enc || 0) + (DANGER[t] == null ? 1.0 : DANGER[t]);
    /* 閾値はそのつど引き直す。固定だと「何歩で出る」が読めてしまい、
     * 危ない道を選んだ緊張がただの計算になる。 */
    if (f.encNext == null) f.encNext = U.rf(9, 22);
    if (f.enc < f.encNext) return null;
    f.enc = 0; f.encNext = U.rf(9, 22);
    return buildEncounter(state, z);
  }

  /** 地帯の顔ぶれで一戦ぶん組む。難易度の上乗せは塔や物語と同じ扱い。 */
  function buildEncounter(state, z) {
    var lv = z.lv, dm = G.Diff.get();
    var n = U.rint(z.n ? z.n[0] : 2, z.n ? z.n[1] : 4) + (lv >= 6 ? (dm.mobPlus || 0) : 0);
    var units = [];
    for (var i = 0; i < n; i++) {
      var def = G.ENEMY_BY_ID[U.pick(z.pool)];
      if (!def) continue;
      units.push(G.Battle.makeEnemyUnit(def, lv, i));
    }
    if (!units.length) return null;
    state.run.floor = lv;
    return { units: units, isBoss: false, kind: 'battle', zone: z };
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
      var moved = !!(place.talksAfter && G.Story.placeMoved(state, m.place));
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
    facing: facing, linesOf: linesOf, actOf: actOf,
    zoneMap: zoneMap, zoneAt: zoneAt, gateAt: gateAt, gateOpen: gateOpen,
    rollEncounter: rollEncounter, buildEncounter: buildEncounter, nearHaven: nearHaven
  };
})();
