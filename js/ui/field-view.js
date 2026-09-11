/* field-view.js - 歩くマップの描画と操作
 *
 * ここだけ他の画面と作りが違う。他は「状態を見てHTMLを組み直す」だが、
 * 歩く画面は毎フレーム描き直すので canvas にする。
 * HTMLで20×28マスを並べても動くが、一歩ごとに700個の要素を作り直すことになり、
 * 歩いた瞬間に引っかかる。歩き心地は、この作りの良し悪しがそのまま出る。
 *
 * 操作は矢印キー／WASD と、画面上の十字ボタンの両方。
 * 決定はスペース・Enter・Z と、画面上の「しらべる」。
 */
G.FieldView = (function () {
  var U = G.U;
  var PX = 3;                      /* タイル1ドットを何倍で描くか */
  var TS = 16 * PX;                /* 画面上のタイル1枚の大きさ */
  var VW = 19, VH = 13;            /* 見える範囲（マス） */

  var cv = null, ctx = null, raf = null, held = {}, lastT = 0;
  var onAct = null;                /* main.js から渡される「調べる」処理 */

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null; held = {};
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
  }

  var KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right'
  };

  function keyDown(e) {
    var dir = KEYMAP[e.key];
    if (dir) { held[dir] = true; e.preventDefault(); return; }
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      if (onAct) onAct();
    }
  }
  function keyUp(e) { var dir = KEYMAP[e.key]; if (dir) held[dir] = false; }

  /* ===================== 描画 ===================== */

  function drawFrame(state) {
    var F = G.Field, f = state.field, m = F.current(state);
    if (!f || !m || !ctx) return;

    /* カメラ。端では地図の外を見せないよう寄せる。
     * 外を見せると「地図が浮いている」感じになって、世界が小さく見える。 */
    var w = m.rows[0].length, h = m.rows.length;
    var px = f.x + f.ox, py = f.y + f.oy;
    var cx = U.clamp(px - (VW - 1) / 2, 0, Math.max(0, w - VW));
    var cy = U.clamp(py - (VH - 1) / 2, 0, Math.max(0, h - VH));

    ctx.fillStyle = '#0b0d14';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.imageSmoothingEnabled = false;

    var x0 = Math.floor(cx), y0 = Math.floor(cy);
    var offX = (cx - x0) * TS, offY = (cy - y0) * TS;
    for (var ry = -1; ry <= VH; ry++) {
      for (var rx = -1; rx <= VW; rx++) {
        var tx = x0 + rx, ty = y0 + ry;
        var t = G.Tiles.tile(F.tileAt(m, tx, ty), tx, ty);
        ctx.drawImage(t, Math.round(rx * TS - offX), Math.round(ry * TS - offY), TS, TS);
      }
    }

    /* 人物。奥に居る者から描くと、重なったときに手前が上に来る */
    var draws = [];
    (m.npcs || []).forEach(function (n, i) {
      if (!n.spr) return;
      var p = F.liveNpc(f, i, n);
      draws.push({ y: p.y, cv: G.Tiles.walker(n.spr, p.dir, 0), x: p.x, oy: 0 });
    });
    draws.push({ y: py, cv: G.Tiles.walker(heroSpec(state), f.dir, f.walking ? f.frame : 0), x: px, oy: 0 });
    draws.sort(function (a, b) { return a.y - b.y; });
    draws.forEach(function (d) {
      ctx.drawImage(d.cv, Math.round((d.x - cx) * TS), Math.round((d.y - cy) * TS), TS, TS);
    });

    /* 話しかけられる相手が居るときだけ、足元に印を出す。
     * 「調べる」を連打して回るのは、探検ではなく作業になる。 */
    var n2 = peek(state);
    if (n2) {
      var d3 = F.DIRS[f.dir];
      var mx = (f.x + d3[0] - cx) * TS, my = (f.y + d3[1] - cy) * TS;
      ctx.fillStyle = 'rgba(255,207,107,.85)';
      ctx.fillRect(Math.round(mx + TS / 2 - 3), Math.round(my - 8), 6, 6);
    }
  }

  /** 向いている先に誰か居るか（顔の向きは変えない） */
  function peek(state) {
    var F = G.Field, f = state.field, m = F.current(state);
    if (!f || !m) return null;
    var d = F.DIRS[f.dir];
    var hit = F.npcAt(state, m, f.x + d[0], f.y + d[1]);
    return hit ? hit.npc : null;
  }

  /** 主人公の見た目。職業の色を歩きキャラに移す。 */
  function heroSpec(state) {
    var c = G.CLASSES[state.hero.classId] || {};
    return { hue: c.hue == null ? 210 : c.hue, accent: c.accent, hair: 26 };
  }

  /* ===================== 動かす ===================== */

  function loop(state) {
    raf = requestAnimationFrame(function (t) {
      var dt = lastT ? Math.min(3, (t - lastT) / 16.7) : 1;
      lastT = t;
      var f = state.field;
      if (!f) { stop(); return; }
      if (!f.walking) {
        var dir = held.up ? 'up' : held.down ? 'down' : held.left ? 'left' : held.right ? 'right' : null;
        if (dir) {
          var r = G.Field.step(state, dir);
          if (r && r !== 'blocked' && r !== 'move' && onStep) onStep(r);
          else if (r === 'move' && onStep) onStep('move');
        }
      }
      G.Field.tick(state, dt);
      drawFrame(state);
      loop(state);
    });
  }

  var onStep = null;

  /** 画面を組み、動かし始める。
   *  hooks = { act: 調べる, step: 一歩ごと } */
  function open(state, hooks) {
    hooks = hooks || {};
    onAct = hooks.act || null;
    onStep = hooks.step || null;
    stop();

    var m = G.Field.current(state);
    var h = '<div class="fieldwrap">' +
      '<div class="fieldtitle">' + (m ? U.esc(m.name) : '') + '</div>' +
      '<canvas id="fieldCv" width="' + (VW * TS) + '" height="' + (VH * TS) + '"></canvas>' +
      '<div class="fieldpad">' +
        '<div class="dpad">' +
          '<button class="pad up" data-pad="up">▲</button>' +
          '<button class="pad left" data-pad="left">◀</button>' +
          '<button class="pad right" data-pad="right">▶</button>' +
          '<button class="pad down" data-pad="down">▼</button>' +
        '</div>' +
        '<div class="fieldbtns">' +
          '<button class="btn primary" data-act="fieldTalk">しらべる</button>' +
          '<button class="btn" data-act="fieldMenu">つよさ</button>' +
        '</div>' +
      '</div>' +
      '<div class="tiny muted fieldhelp">矢印キー／WASD で歩く・スペースで しらべる</div>' +
      '</div>';
    G.Screens.raw(h);

    cv = document.getElementById('fieldCv');
    ctx = cv ? cv.getContext('2d') : null;
    bindPad();
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    lastT = 0;
    drawFrame(state);
    loop(state);
  }

  /** 画面上の十字ボタン。押しっぱなしで歩き続けられるようにする。 */
  function bindPad() {
    var pads = document.querySelectorAll('[data-pad]');
    Array.prototype.forEach.call(pads, function (el) {
      var dir = el.getAttribute('data-pad');
      function on(e) { e.preventDefault(); held[dir] = true; }
      function off() { held[dir] = false; }
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointerleave', off);
      el.addEventListener('pointercancel', off);
    });
  }

  return { open: open, stop: stop, peek: peek, TS: TS, VW: VW, VH: VH };
})();
