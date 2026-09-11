/* tiles.js - マップのタイルと歩行キャラを手続きで描く
 *
 * sprites.js と同じ方針で、外部画像は使わない。
 * ただし敵や職業の絵と違って、タイルは「並べて敷き詰める」ものなので
 * 左右対称のドットマップではなく、16x16 の canvas を直接塗って作る。
 * 一度作った canvas は使い回す（毎フレーム描き直すと、歩くだけで重くなる）。
 *
 * タイルの見た目は、既存のUIに合わせて暗めに寄せてある。
 * ドラクエの野原はもっと明るいが、この世界は色が褪せていく話なので、
 * 彩度を上げると画面だけが元気になってしまう。
 */
G.Tiles = (function () {

  var S = 16;                 /* タイル1枚のドット数 */
  var cache = {};

  /* 位置で決まる、ぶれない乱数。
   * 毎フレーム振り直すと草が波打つので、必ず座標から作る。 */
  function rnd(seed) {
    var x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  /* ===================== タイルの絵 ===================== */

  function mk(fn, variant) {
    var cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    var c = cv.getContext('2d');
    fn(c, variant || 0);
    return cv;
  }

  function fill(c, col) { c.fillStyle = col; c.fillRect(0, 0, S, S); }
  function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }

  /** 地面に散らす点。v で散り方が変わるので、同じ草原でも数種類作れる。 */
  function speck(c, col, n, v) {
    for (var i = 0; i < n; i++) {
      var x = Math.floor(rnd(i * 3.1 + v * 17.7) * S);
      var y = Math.floor(rnd(i * 7.3 + v * 29.1) * S);
      px(c, x, y, 1, 1, col);
    }
  }

  var DRAW = {
    /* --- 野外 --- */
    grass: function (c, v) {
      fill(c, '#2c5437');
      speck(c, '#24462d', 26, v);
      speck(c, '#356245', 10, v + 5);
      /* 草の束。三本ぶんの縦線で「草地」に見える */
      for (var i = 0; i < 3; i++) {
        var x = 2 + Math.floor(rnd(i + v * 13) * 12), y = 3 + Math.floor(rnd(i * 5 + v * 3) * 10);
        px(c, x, y, 1, 2, '#3d7050'); px(c, x + 2, y + 1, 1, 2, '#3d7050');
      }
    },
    forest: function (c, v) {
      fill(c, '#27492f');
      /* 木を二本。重なりで奥行きを出す */
      function tree(ox, oy) {
        px(c, ox + 2, oy + 6, 2, 3, '#3a2a1c');
        px(c, ox, oy + 1, 6, 5, '#1e4128');
        px(c, ox + 1, oy, 4, 2, '#2a5735');
        px(c, ox + 1, oy + 2, 2, 2, '#356b40');
      }
      tree(1, 1); tree(8, 6);
      speck(c, '#1d3924', 14, v);
    },
    hill: function (c, v) {
      fill(c, '#4a5236');
      px(c, 0, 10, S, 6, '#3e452d');
      for (var i = 0; i < 4; i++) px(c, i * 4 + 1, 9, 2, 1, '#59613f');
      speck(c, '#565f3c', 16, v);
    },
    mountain: function (c) {
      fill(c, '#2b2f3b');
      /* 山肌。左が明るく右が陰、で立体に見える */
      for (var y = 0; y < S; y++) {
        var w = Math.min(S, y + 3);
        var x0 = Math.max(0, Math.floor((S - w) / 2));
        px(c, x0, y, w, 1, '#3a4052');
        px(c, x0, y, Math.max(1, Math.floor(w / 3)), 1, '#4a5268');
      }
      px(c, 6, 0, 4, 3, '#8f98ad');
    },
    water: function (c, v) {
      fill(c, '#1a3862');
      px(c, 0, 0, S, 8, '#1e3f6d');
      for (var i = 0; i < 3; i++) {
        var y = 3 + i * 5 + (v % 2);
        px(c, 2 + (i * 5) % 8, y, 5, 1, '#2b5b94');
        px(c, 9 - (i * 3) % 6, y + 2, 3, 1, '#255086');
      }
    },
    shallow: function (c, v) {
      fill(c, '#2a628f');
      speck(c, '#3a7aa8', 18, v);
      px(c, 0, 12, S, 4, '#6d6a4e');
    },
    sand: function (c, v) { fill(c, '#6b6046'); speck(c, '#7b7052', 24, v); speck(c, '#5c5239', 12, v + 3); },
    road: function (c, v) {
      fill(c, '#4c4638');
      speck(c, '#5a5343', 20, v); speck(c, '#413c30', 14, v + 7);
    },
    bridge: function (c) {
      fill(c, '#1a3862');
      px(c, 0, 2, S, 12, '#5a4530');
      for (var i = 0; i < 4; i++) px(c, i * 4 + 3, 2, 1, 12, '#3f3021');
      px(c, 0, 2, S, 1, '#6d553c'); px(c, 0, 13, S, 1, '#6d553c');
    },
    marsh: function (c, v) {
      fill(c, '#2f4232');
      speck(c, '#22331f', 20, v);
      px(c, 2, 6, 5, 1, '#3d5c48'); px(c, 9, 11, 5, 1, '#3d5c48');
    },

    /* --- 建物と屋内 --- */
    wall: function (c) {
      fill(c, '#2f3344');
      for (var y = 0; y < S; y += 4) {
        var off = (y / 4) % 2 ? 4 : 0;
        for (var x = -4; x < S; x += 8) {
          px(c, x + off, y, 7, 3, '#3a3f53');
          px(c, x + off, y, 7, 1, '#454b62');
        }
      }
    },
    roof: function (c) {
      fill(c, '#4a2d2d');
      for (var y = 0; y < S; y += 4) {
        for (var x = 0; x < S; x += 4) {
          px(c, x, y, 3, 3, '#5a3636');
          px(c, x, y + 2, 3, 1, '#3d2525');
        }
      }
    },
    floorWood: function (c) {
      fill(c, '#3b2c1d');
      for (var y = 0; y < S; y += 4) px(c, 0, y, S, 1, '#2c2116');
      px(c, 0, 2, S, 1, '#453425'); px(c, 0, 10, S, 1, '#453425');
    },
    /* 屋内の石床。壁と色が近いと、建物が「詰まった塊」に見えて中が読めない。
     * 壁より一段暗く、目地をはっきり出して「床」に寄せる。 */
    floorStone: function (c) {
      fill(c, '#232733');
      px(c, 0, 7, S, 1, '#1a1d26'); px(c, 7, 0, 1, 8, '#1a1d26'); px(c, 3, 8, 1, 8, '#1a1d26');
      px(c, 0, 8, S, 1, '#2b3040'); px(c, 8, 0, 1, 7, '#2b3040');
    },
    carpet: function (c) {
      fill(c, '#4a2338');
      px(c, 1, 1, 14, 14, '#5c2c46');
      px(c, 3, 3, 10, 10, '#6b3453');
      px(c, 6, 6, 4, 4, '#8a4a6d');
    },
    door: function (c) {
      fill(c, '#2f3344');
      px(c, 3, 2, 10, 14, '#5a4530');
      px(c, 3, 2, 10, 1, '#6d553c');
      px(c, 4, 4, 8, 10, '#4a3827');
      px(c, 10, 9, 2, 2, '#c9a94e');
    },
    stairsDown: function (c) {
      fill(c, '#2a2e39');
      for (var i = 0; i < 4; i++) {
        px(c, i * 2, 4 + i * 3, S - i * 4, 3, '#3d4356');
        px(c, i * 2, 4 + i * 3, S - i * 4, 1, '#4d546b');
      }
    },
    stairsUp: function (c) {
      fill(c, '#2a2e39');
      for (var i = 0; i < 4; i++) {
        px(c, 6 - i * 2, 13 - i * 3, 4 + i * 4, 3, '#3d4356');
        px(c, 6 - i * 2, 13 - i * 3, 4 + i * 4, 1, '#535a72');
      }
    },
    counter: function (c) {
      fill(c, '#473625');
      px(c, 0, 3, S, 10, '#6b5238');
      px(c, 0, 3, S, 2, '#7d613f');
      px(c, 0, 12, S, 1, '#3a2c1e');
    },
    table: function (c) {
      fill(c, '#473625');
      px(c, 1, 4, 14, 8, '#6b5238');
      px(c, 1, 4, 14, 1, '#7d613f');
      px(c, 2, 12, 2, 3, '#3a2c1e'); px(c, 12, 12, 2, 3, '#3a2c1e');
    },
    bed: function (c) {
      fill(c, '#473625');
      px(c, 2, 1, 12, 14, '#5a4530');
      px(c, 3, 2, 10, 5, '#c8ccd8');   /* 枕 */
      px(c, 3, 7, 10, 7, '#3f5a7a');   /* 掛け布 */
      px(c, 3, 7, 10, 1, '#54739a');
    },
    shelf: function (c) {
      fill(c, '#3f3020');
      px(c, 1, 1, 14, 14, '#513e2a');
      for (var y = 3; y < 14; y += 5) {
        px(c, 1, y, 14, 1, '#33271a');
        for (var x = 2; x < 14; x += 3) px(c, x, y - 3, 2, 3, ['#8a4a3a', '#3a6a8a', '#8a7a3a'][(x + y) % 3]);
      }
    },
    pot: function (c) {
      fill(c, '#383d49');
      px(c, 5, 5, 6, 8, '#6b4a33');
      px(c, 4, 4, 8, 2, '#7d5a3d');
      px(c, 6, 7, 2, 4, '#8a6544');
    },
    barrel: function (c) {
      fill(c, '#473625');
      px(c, 4, 2, 8, 12, '#6b5238');
      px(c, 4, 4, 8, 1, '#3a2c1e'); px(c, 4, 11, 8, 1, '#3a2c1e');
      px(c, 4, 2, 8, 1, '#7d613f');
    },
    sign: function (c) {
      fill(c, '#2c5437');
      px(c, 7, 8, 2, 7, '#4a3827');
      px(c, 2, 3, 12, 7, '#6b5238');
      px(c, 3, 4, 10, 5, '#7d613f');
      px(c, 4, 5, 8, 1, '#4a3827'); px(c, 4, 7, 6, 1, '#4a3827');
    },
    fountain: function (c) {
      fill(c, '#383d49');
      px(c, 1, 1, 14, 14, '#4a5160');
      px(c, 2, 2, 12, 12, '#1e3f6d');
      px(c, 4, 4, 8, 8, '#2b5b94');
      px(c, 6, 2, 4, 3, '#6ea6d8');
    },
    tree: function (c) {
      fill(c, '#2c5437');
      px(c, 7, 10, 2, 5, '#3a2a1c');
      px(c, 3, 2, 10, 8, '#1e4128');
      px(c, 4, 1, 8, 3, '#2a5735');
      px(c, 5, 3, 3, 3, '#3a7048');
    },
    rock: function (c) {
      fill(c, '#2c5437');
      px(c, 3, 6, 10, 7, '#4a5162');
      px(c, 4, 4, 8, 3, '#5a6274');
      px(c, 5, 5, 3, 2, '#6e7789');
    },
    flower: function (c, v) {
      DRAW.grass(c, v);
      var cols = ['#c86a8a', '#d8c05a', '#8aa8d8'];
      for (var i = 0; i < 3; i++) {
        var x = 2 + Math.floor(rnd(i * 11 + v) * 11), y = 2 + Math.floor(rnd(i * 5 + v * 2) * 11);
        px(c, x, y, 2, 2, cols[i % 3]);
        px(c, x, y + 2, 1, 2, '#3d7050');
      }
    },

    /* --- フィールド上の目印 --- */
    townIcon: function (c) {
      DRAW.grass(c, 1);
      px(c, 2, 7, 12, 8, '#6b5238');
      px(c, 1, 4, 14, 4, '#8a3a3a');
      px(c, 2, 3, 12, 2, '#a04747');
      px(c, 6, 10, 4, 5, '#3a2c1e');
    },
    castleIcon: function (c) {
      DRAW.grass(c, 2);
      px(c, 2, 5, 12, 10, '#4a5162');
      px(c, 1, 2, 3, 4, '#5a6274'); px(c, 12, 2, 3, 4, '#5a6274'); px(c, 6, 1, 4, 5, '#5a6274');
      px(c, 6, 9, 4, 6, '#2a2e39');
      px(c, 7, 0, 1, 3, '#c9a94e');
    },
    caveIcon: function (c) {
      DRAW.mountain(c, 0);
      px(c, 4, 7, 8, 9, '#12141c');
      px(c, 5, 5, 6, 3, '#12141c');
    },
    shrineIcon: function (c) {
      DRAW.grass(c, 3);
      px(c, 2, 4, 12, 2, '#6e7789');
      px(c, 3, 6, 2, 9, '#5a6274'); px(c, 11, 6, 2, 9, '#5a6274');
      px(c, 5, 8, 6, 7, '#2a2e39');
      px(c, 7, 1, 2, 3, '#c9a94e');
    },
    towerIcon: function (c) {
      DRAW.grass(c, 4);
      px(c, 4, 3, 8, 12, '#4a4155');
      px(c, 3, 1, 10, 3, '#5a5068');
      px(c, 6, 6, 4, 4, '#c9a94e');
      px(c, 6, 11, 4, 4, '#2a2e39');
    },
    caveMouth: function (c) {
      fill(c, '#2b2f3b');
      px(c, 2, 3, 12, 13, '#3a4052');
      px(c, 4, 6, 8, 10, '#0e1016');
      px(c, 5, 4, 6, 3, '#0e1016');
    },

    /* --- 置き物 --- */
    chest: function (c) {
      fill(c, '#383d49');
      px(c, 3, 6, 10, 8, '#6b5238');
      px(c, 3, 4, 10, 3, '#7d613f');
      px(c, 3, 8, 10, 1, '#3a2c1e');
      px(c, 7, 8, 2, 3, '#c9a94e');
    },
    chestOpen: function (c) {
      fill(c, '#383d49');
      px(c, 3, 8, 10, 6, '#4a3827');
      px(c, 4, 9, 8, 4, '#2a1f14');
      px(c, 3, 4, 10, 3, '#5a4530');
    },
    torch: function (c) {
      DRAW.wall(c, 0);
      px(c, 7, 8, 2, 6, '#4a3827');
      px(c, 6, 4, 4, 4, '#e07a2a');
      px(c, 7, 2, 2, 3, '#ffd45e');
    },
    pillar: function (c) {
      fill(c, '#383d49');
      px(c, 3, 0, 10, S, '#565e70');
      px(c, 3, 0, 3, S, '#69728a');
      px(c, 2, 0, 12, 2, '#69728a'); px(c, 2, 14, 12, 2, '#69728a');
    },
    altarTile: function (c) {
      fill(c, '#383d49');
      px(c, 2, 6, 12, 9, '#565e70');
      px(c, 2, 4, 12, 3, '#69728a');
      px(c, 6, 0, 4, 5, '#c9a94e');
      px(c, 7, 1, 2, 3, '#fff0b8');
    },
    voidTile: function (c) { fill(c, '#0b0d14'); }
  };

  /* 通れるか。ここに無いものは通れる扱い。 */
  /* 通れるかどうかの表は maps.js（G.TILE_SOLID）が持つ。
   * 描画は canvas が要るので検証ツールから読めない。表をこちらに置くと、
   * 検証側に写しを作ることになり、必ずどちらかが古くなる。 */
  var SOLID = G.TILE_SOLID || {};

  /** そのタイルを踏めるか */
  function passable(kind) { return !SOLID[kind]; }

  /** タイルの canvas を得る。同じ種類でも座標でわずかに表情を変える。 */
  function tile(kind, x, y) {
    var d = DRAW[kind] ? kind : 'grass';
    /* 表情を変えるのは地面だけ。建物がばらつくと、作りが雑に見える。 */
    var varied = (d === 'grass' || d === 'water' || d === 'sand' || d === 'road' ||
                  d === 'forest' || d === 'hill' || d === 'marsh' || d === 'flower' || d === 'shallow');
    var v = varied ? ((x * 31 + y * 17) % 4) : 0;
    var key = d + '#' + v;
    if (!cache[key]) cache[key] = mk(DRAW[d], v);
    return cache[key];
  }

  /* ===================== 歩行キャラ =====================
   *
   * 4方向 × 2コマ。横向きは片側だけ描いて、反対はそのまま反転する。
   * 顔の作りが左右で変わらない絵なので、反転しても破綻しない。
   *
   *   . 透明  o 輪郭  h 髪  s 肌  e 瞳
   *   1 服(暗)  2 服  3 服(明)  a 差し色（帯・留め具）
   */
  var POSE = {
    down: [[
      "................", "................", "................", "......oooo......",
      ".....ohhhho.....", "....ohhhhhho....", "....osssssso....", "....osesseso....",
      "....osssssso....", ".....oooooo.....", "....o322223o....", "....o322223o....",
      "....oaaaaaao....", "....o122221o....", "....o11..11o....", ".....oo..oo....."
    ], [
      "................", "................", "................", "......oooo......",
      ".....ohhhho.....", "....ohhhhhho....", "....osssssso....", "....osesseso....",
      "....osssssso....", ".....oooooo.....", "....o322223o....", "....o322223o....",
      "....oaaaaaao....", "....o122221o....", "...oo1111oo.....", "......o..o......"
    ]],
    up: [[
      "................", "................", "................", "......oooo......",
      ".....ohhhho.....", "....ohhhhhho....", "....ohhhhhho....", "....ohhhhhho....",
      "....ohhhhhho....", ".....oooooo.....", "....o322223o....", "....o322223o....",
      "....oaaaaaao....", "....o122221o....", "....o11..11o....", ".....oo..oo....."
    ], [
      "................", "................", "................", "......oooo......",
      ".....ohhhho.....", "....ohhhhhho....", "....ohhhhhho....", "....ohhhhhho....",
      "....ohhhhhho....", ".....oooooo.....", "....o322223o....", "....o322223o....",
      "....oaaaaaao....", "....o122221o....", "...oo1111oo.....", "......o..o......"
    ]],
    /* 右向き。左向きはこれを反転して使う */
    side: [[
      "................", "................", "................", "......oooo......",
      ".....ohhhho.....", "....ohhhhhho....", "....ohhhhsso....", "....ohhssseo....",
      "....ohssssso....", ".....oooooo.....", "....o322223o....", "....o32222ao....",
      "....oaaaaaao....", "....o122221o....", "....o11..11o....", ".....oo..oo....."
    ], [
      "................", "................", "................", "......oooo......",
      ".....ohhhho.....", "....ohhhhhho....", "....ohhhhsso....", "....ohhssseo....",
      "....ohssssso....", ".....oooooo.....", "....o322223o....", "....o32222ao....",
      "....oaaaaaao....", "....o122221o....", "...oo1111oo.....", "......o..o......"
    ]]
  };

  function hsl(h, s, l) { return 'hsl(' + ((h % 360) + 360) % 360 + ',' + s + '%,' + l + '%)'; }

  function walkerPal(spec) {
    var h = spec.hue == null ? 210 : spec.hue;
    var a = spec.accent == null ? h + 40 : spec.accent;
    var hair = spec.hair == null ? 28 : spec.hair;
    return {
      o: 'rgba(12,10,18,.92)',
      h: hsl(hair, 45, 30), s: hsl(28, 45, 72), e: '#171a26',
      1: hsl(h, 34, 28), 2: hsl(h, 38, 40), 3: hsl(h, 42, 52),
      a: hsl(a, 60, 52)
    };
  }

  var wcache = {};

  /** 歩行キャラの canvas。dir は down/up/left/right、frame は 0 か 1。 */
  function walker(spec, dir, frame) {
    spec = spec || {};
    var flip = (dir === 'left');
    var pose = (dir === 'left' || dir === 'right') ? 'side' : dir;
    var key = [spec.hue, spec.accent, spec.hair, pose, frame ? 1 : 0, flip ? 1 : 0].join('|');
    if (wcache[key]) return wcache[key];

    var rows = POSE[pose][frame ? 1 : 0];
    var pal = walkerPal(spec);
    var cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    var c = cv.getContext('2d');
    for (var r = 0; r < S; r++) {
      for (var x = 0; x < S; x++) {
        var ch = rows[r][flip ? (S - 1 - x) : x];
        if (!ch || ch === '.') continue;
        var col = pal[ch];
        if (!col) continue;
        px(c, x, r, 1, 1, col);
      }
    }
    wcache[key] = cv;
    return cv;
  }

  return { SIZE: S, tile: tile, walker: walker, passable: passable, DRAW: DRAW, SOLID: SOLID };
})();
