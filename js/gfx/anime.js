/* anime.js - 漫画寄りのバストアップ（SVG・手続き生成）
 *
 * v1（左右対称・均一な線）から作り直したもの。効いたのは次の2点。
 *
 *   1. 入り抜きのある線
 *      漫画の線は太さが一定ではない。始点は細く、途中で太り、抜きで細くなる。
 *      SVG の stroke は太さを変えられないので、曲線を標本化して法線方向に
 *      太さぶん膨らませ、閉じた図形として塗っている（ink）。
 *      これだけで「図形」が「線画」に近づく。
 *
 *   2. 真正面をやめる
 *      左右対称は、人が描いた絵にはまず無い。顔をわずかに振り、
 *      遠い側の頬を圧縮し、目の大きさと間隔を左右で変えている。
 *
 * それでも人の絵にはならない。制御点を数値で置いている以上、
 * 線の迷いや省略の判断は入らない。差し替えの仕組みを併設してあるのはそのため。
 */
G.Anime = (function () {
  var VW = 400, VH = 460;
  var CX = 200;

  /* 顔の割付。頭の中心から全ての高さを出す。 */
  var F = {
    skullY: 92,
    cheekY: 236,
    chinY:  340,
    eyeY:   250,
    browY:  208,
    noseY:  292,
    mouthY: 314
  };

  var BUILD = {
    slim:   { fw: 82, jaw: 0.30, shoulder: 214, chin: 350, turn: 0.22 },
    normal: { fw: 87, jaw: 0.35, shoulder: 248, chin: 346, turn: 0.21 },
    heavy:  { fw: 96, jaw: 0.46, shoulder: 306, chin: 338, turn: 0.18 }
  };

  /* ===================== 曲線と線 ===================== */

  function n(v) { return Math.round(v * 10) / 10; }
  function pt(x, y) { return n(x) + ' ' + n(y); }

  function bez(p, t) {
    var u = 1 - t;
    return {
      x: u * u * u * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t * t * t * p[6],
      y: u * u * u * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t * t * t * p[7]
    };
  }
  function tan(p, t) {
    var u = 1 - t;
    return {
      x: 3 * u * u * (p[2] - p[0]) + 6 * u * t * (p[4] - p[2]) + 3 * t * t * (p[6] - p[4]),
      y: 3 * u * u * (p[3] - p[1]) + 6 * u * t * (p[5] - p[3]) + 3 * t * t * (p[7] - p[5])
    };
  }

  /** 入り抜きのある線。曲線を標本化し、法線方向へ太さぶん膨らませて塗る。
   * w は [始点, 中間, 終点] の太さ。始点0にすれば筆の入りになる。 */
  function ink(p, w, fill) {
    var N = 26, a = [], b = [], i, t, c, tg, len, nx, ny, ww;
    for (i = 0; i <= N; i++) {
      t = i / N;
      c = bez(p, t); tg = tan(p, t);
      len = Math.sqrt(tg.x * tg.x + tg.y * tg.y) || 1;
      nx = -tg.y / len; ny = tg.x / len;
      /* 太さは始点→中間→終点を二次補間 */
      ww = (1 - t) * (1 - t) * w[0] + 2 * (1 - t) * t * w[1] + t * t * w[2];
      a.push(pt(c.x + nx * ww, c.y + ny * ww));
      b.unshift(pt(c.x - nx * ww, c.y - ny * ww));
    }
    return '<path d="M ' + a.join(' L ') + ' L ' + b.join(' L ') + ' Z" fill="' + fill + '"/>';
  }

  function cubic(x0, y0, x1, y1, x2, y2, x3, y3) {
    return [x0, y0, x1, y1, x2, y2, x3, y3];
  }
  function pathOf(p) {
    return 'M ' + pt(p[0], p[1]) + ' C ' + pt(p[2], p[3]) + ' ' + pt(p[4], p[5]) + ' ' + pt(p[6], p[7]);
  }

  /* ===================== 色 ===================== */

  function hsl(h, s, l) {
    return 'hsl(' + (((h % 360) + 360) % 360) + ',' + G.U.clamp(s, 0, 100) + '%,' + G.U.clamp(l, 0, 100) + '%)';
  }
  function tone(h, s, l) {
    return {
      hi:  hsl(h - 4, s * 0.72, Math.min(97, l * 1.30)),
      mid: hsl(h, s, l),
      sh:  hsl(h + 10, Math.min(92, s * 1.18), l * 0.72),
      ln:  hsl(h + 6, Math.min(70, s * 0.9), Math.max(10, l * 0.26))
    };
  }
  /** 16進の色を明暗へ振る。瞳のグラデーションに使う。 */
  function shade(hex, k) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    var v = parseInt(m[1], 16);
    var c = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map(function (x) {
      return Math.max(0, Math.min(255, Math.round(x * k)));
    });
    return '#' + c.map(function (x) { return x.toString(16).padStart(2, '0'); }).join('');
  }

  function pal(spec) {
    var sh2 = spec.skinHue != null ? spec.skinHue : 26;
    var sl = spec.skinLum != null ? spec.skinLum : 68;
    return {
      skin: {
        hi:  hsl(sh2 + 6, 60, Math.min(98, sl * 1.34)),
        mid: hsl(sh2, 52, Math.min(95, sl * 1.22)),
        sh:  hsl(sh2 - 8, 46, sl * 0.94),
        ln:  hsl(sh2 - 14, 42, sl * 0.42)
      },
      hair: tone(spec.hairHue, spec.hairSat != null ? spec.hairSat : 40,
                 Math.max(18, spec.hairLum != null ? spec.hairLum : 34)),
      cloth: tone(spec.hue, spec.sat != null ? spec.sat : 42, spec.lum != null ? spec.lum : 45),
      accent: tone(spec.accent, spec.accentSat != null ? spec.accentSat : 55,
                   spec.accentLum != null ? spec.accentLum : 52),
      metal: tone(spec.metalHue != null ? spec.metalHue : 210, 14, 62),
      cape: tone(spec.capeHue != null ? spec.capeHue : spec.accent, 46,
                 Math.max(16, (spec.lum != null ? spec.lum : 45) * 0.58)),
      eye: spec.eye || '#3a4258',
      eyeDark: shade(spec.eye || '#3a4258', 0.42),
      eyeLite: shade(spec.eye || '#3a4258', 1.75),
      blush: hsl(8, 80, 72),
      ink: '#241d24'
    };
  }

  /* ===================== 骨格（3/4のあおり） ===================== */

  function geo(spec) {
    var b = BUILD[spec.build] || BUILD.normal;
    var fw = b.fw;
    var shift = fw * b.turn;          /* 顔の中心線が振れる量 */
    return {
      b: b, fw: fw, shift: shift,
      cxF:   CX + shift,              /* 顔の中心線 */
      far:   CX - fw * 0.86,          /* 遠い側（左）の輪郭 */
      near:  CX + fw * 1.02,          /* 近い側（右）の輪郭 */
      chinX: CX + shift * 0.85,
      chinY: b.chin,
      capTop: F.skullY - 74
    };
  }

  /** 輪郭。遠い側を圧縮し、近い側を張らせる。 */
  function facePath(g) {
    var fw = g.fw;
    return 'M ' + pt(g.chinX, g.chinY) +
      ' C ' + pt(g.chinX - fw * 0.34, g.chinY - 8) + ' ' + pt(g.far + fw * 0.04, F.cheekY + 56) + ' ' + pt(g.far, F.cheekY) +
      ' C ' + pt(g.far - fw * 0.04, F.cheekY - 68) + ' ' + pt(g.far + fw * 0.02, F.skullY + 34) + ' ' + pt(g.far + fw * 0.32, F.skullY + 6) +
      ' C ' + pt(g.cxF - fw * 0.22, F.skullY - 24) + ' ' + pt(g.cxF + fw * 0.46, F.skullY - 22) + ' ' + pt(g.near - fw * 0.14, F.skullY + 16) +
      ' C ' + pt(g.near + fw * 0.06, F.cheekY - 58) + ' ' + pt(g.near + fw * 0.01, F.cheekY + 12) + ' ' + pt(g.near - fw * 0.10, F.cheekY + 50) +
      ' C ' + pt(g.near - fw * 0.34, g.chinY - 12) + ' ' + pt(g.chinX + fw * 0.26, g.chinY - 2) + ' ' + pt(g.chinX, g.chinY) + ' Z';
  }

  /* ===================== 目 ===================== */

  /** 漫画の目。上まぶたを太く水平気味に、下を薄く、瞳は縦長。
   * far のときは奥行きぶん幅を詰め、輪郭に寄せる。 */
  function eye(g, p, spec, far) {
    var fw = g.fw;
    var k = far ? 0.76 : 1.0;                       /* 奥の目は小さく見える */
    var ex = g.cxF + (far ? -1 : 1) * fw * (far ? 0.50 : 0.44);
    var ew = fw * 0.30 * k, eh = fw * 0.29 * k;
    var o = '';
    var iy = F.eyeY + eh * 0.04;

    /* 白目 */
    o += '<path d="M ' + pt(ex - ew, F.eyeY + eh * 0.10) +
      ' C ' + pt(ex - ew * 0.72, F.eyeY - eh * 1.02) + ' ' + pt(ex + ew * 0.70, F.eyeY - eh * 0.96) + ' ' + pt(ex + ew, F.eyeY - eh * 0.12) +
      ' C ' + pt(ex + ew * 0.66, F.eyeY + eh * 1.02) + ' ' + pt(ex - ew * 0.66, F.eyeY + eh * 1.00) + ' ' + pt(ex - ew, F.eyeY + eh * 0.10) +
      ' Z" fill="#fdfbf7"/>';
    /* 瞳。縦長で、上を暗く下を明るく。 */
    var gid = 'ir' + (far ? 'F' : 'N');
    o += '<ellipse cx="' + n(ex) + '" cy="' + n(iy) + '" rx="' + n(ew * 0.60) + '" ry="' + n(eh * 0.98) +
      '" fill="url(#' + gid + ')"/>';
    o += '<ellipse cx="' + n(ex) + '" cy="' + n(iy - eh * 0.06) + '" rx="' + n(ew * 0.28) + '" ry="' + n(eh * 0.52) +
      '" fill="#15111a"/>';
    /* 虹彩の下端に光を溜める */
    o += '<ellipse cx="' + n(ex) + '" cy="' + n(iy + eh * 0.52) + '" rx="' + n(ew * 0.40) + '" ry="' + n(eh * 0.26) +
      '" fill="#ffffff" opacity=".30"/>';
    /* 光点は大小2つ、位置をずらす */
    o += '<ellipse cx="' + n(ex - ew * 0.30) + '" cy="' + n(iy - eh * 0.44) + '" rx="' + n(ew * 0.24) +
      '" ry="' + n(eh * 0.26) + '" fill="#ffffff"/>';
    o += '<circle cx="' + n(ex + ew * 0.34) + '" cy="' + n(iy + eh * 0.30) + '" r="' + n(ew * 0.11) + '" fill="#ffffff" opacity=".8"/>';

    /* 上まぶた。目頭は細く入り、目尻で太って抜ける。 */
    var lash = cubic(ex - ew * 1.10, F.eyeY + eh * 0.02,
                     ex - ew * 0.58, F.eyeY - eh * 1.22,
                     ex + ew * 0.62, F.eyeY - eh * 1.14,
                     ex + ew * 1.20, F.eyeY - eh * 0.34);
    o += ink(lash, [1.4 * k, 7.0 * k, 2.0 * k], p.ink);
    /* 目尻のはね */
    o += ink(cubic(ex + ew * 1.10, F.eyeY - eh * 0.44,
                   ex + ew * 1.32, F.eyeY - eh * 0.60,
                   ex + ew * 1.46, F.eyeY - eh * 0.74,
                   ex + ew * 1.58, F.eyeY - eh * 0.96), [4.0 * k, 2.2 * k, 0.2], p.ink);
    /* 二重の線 */
    o += ink(cubic(ex - ew * 0.86, F.eyeY - eh * 0.92,
                   ex - ew * 0.40, F.eyeY - eh * 1.52,
                   ex + ew * 0.50, F.eyeY - eh * 1.44,
                   ex + ew * 1.02, F.eyeY - eh * 0.80), [0.3, 2.0 * k, 0.4], p.skin.ln);
    /* 下まぶた。細く短く。 */
    o += ink(cubic(ex - ew * 0.72, F.eyeY + eh * 0.86,
                   ex - ew * 0.30, F.eyeY + eh * 1.14,
                   ex + ew * 0.34, F.eyeY + eh * 1.08,
                   ex + ew * 0.80, F.eyeY + eh * 0.72), [0.3, 2.2 * k, 0.3], p.skin.ln);
    return o;
  }

  function brow(g, p, spec, far) {
    var fw = g.fw;
    var k = far ? 0.86 : 1.0;
    var ex = g.cxF + (far ? -1 : 1) * fw * (far ? 0.50 : 0.44);
    var w = fw * 0.34 * k, tilt = (spec.brow || 0) * 9;
    var inner = ex + (far ? 1 : -1) * w * 0.92;
    var outer = ex + (far ? -1 : 1) * w * 0.98;
    return ink(cubic(inner, F.browY + tilt + 4,
                     ex + (far ? 1 : -1) * w * 0.30, F.browY - 10,
                     ex + (far ? -1 : 1) * w * 0.40, F.browY - 12 - tilt * 0.4,
                     outer, F.browY - tilt * 0.2 + 2),
               [2.0 * k, 7.5 * k, 1.2 * k], p.hair.sh);
  }

  /* ===================== 髪 ===================== */

  /** 房。根元は幅を持ち、先は尖る。漫画の髪は房の重なりで出来ている。 */
  function clump(rx, ry, tx, ty, w, bow, fill, line) {
    var mx = (rx + tx) / 2, my = (ry + ty) / 2, dy = ty - ry;
    var d = 'M ' + pt(rx - w, ry) +
      ' C ' + pt(mx - w * 1.05 + bow, my - dy * 0.10) + ' ' + pt(tx - w * 0.26 + bow, ty - dy * 0.26) + ' ' + pt(tx, ty) +
      ' C ' + pt(tx + w * 0.32 + bow, ty - dy * 0.28) + ' ' + pt(mx + w * 1.00 + bow, my - dy * 0.08) + ' ' + pt(rx + w, ry) + ' Z';
    var o = '<path d="' + d + '" fill="' + fill + '"/>';
    /* 房の合わせ目に入り抜きの線を1本入れる。これが無いと塊に見える。 */
    if (line) {
      o += ink(cubic(rx - w, ry, mx - w * 1.05 + bow, my - dy * 0.10,
                     tx - w * 0.26 + bow, ty - dy * 0.26, tx, ty), [0.4, 3.4, 0.2], line);
    }
    return o;
  }

  /** 髪の内側に走らせる細い線。束感が出る。 */
  function strandLine(x0, y0, x1, y1, bow, c) {
    return ink(cubic(x0, y0, x0 + bow, (y0 + y1) / 2, x1 + bow * 0.4, (y0 + y1) / 2, x1, y1), [0.2, 2.0, 0.2], c);
  }

  function cap(g, p, spread, hairline) {
    var fw = g.fw;
    var L = g.cxF - fw * spread, R = g.cxF + fw * spread;
    return '<path d="M ' + pt(L, F.browY + hairline) +
      ' C ' + pt(L - fw * 0.24, g.capTop) + ' ' + pt(R + fw * 0.24, g.capTop) + ' ' + pt(R, F.browY + hairline) +
      ' C ' + pt(g.cxF + fw * 0.56, F.browY - 34) + ' ' + pt(g.cxF - fw * 0.62, F.browY - 32) +
      ' ' + pt(L, F.browY + hairline) + ' Z" fill="' + p.hair.mid + '"/>';
  }

  /** 前髪。分け目を中心から外し、房の長さを不揃いにする。 */
  function bangs(g, p, tips) {
    var fw = g.fw, o = '';
    tips.forEach(function (t) {
      o += clump(g.cxF + fw * t[0], F.browY - 46, g.cxF + fw * t[1], F.browY + t[2],
                 fw * t[3], fw * (t[4] || 0), t[5], p.hair.ln);
    });
    return o;
  }

  var HAIR = {
    short: function (g, p, back) {
      var fw = g.fw;
      if (back) {
        return '<path d="M ' + pt(g.far - fw * 0.16, F.cheekY - 12) +
          ' C ' + pt(g.cxF - fw * 1.30, g.capTop + 16) + ' ' + pt(g.cxF + fw * 1.30, g.capTop + 16) +
          ' ' + pt(g.near + fw * 0.12, F.cheekY - 12) +
          ' L ' + pt(g.near, F.cheekY + 66) + ' L ' + pt(g.far, F.cheekY + 66) + ' Z" fill="' + p.hair.sh + '"/>';
      }
      var o = cap(g, p, 1.02, 8);
      o += bangs(g, p, [
        [-0.66, -1.00, 44, 0.30, -0.10, p.hair.mid],
        [-0.30, -0.56, 18, 0.29, -0.04, p.hair.hi],
        [ 0.06, -0.10, 42, 0.28,  0.01, p.hair.mid],
        [ 0.40,  0.56, 14, 0.27,  0.06, p.hair.sh],
        [ 0.70,  1.00, 34, 0.28,  0.10, p.hair.mid]
      ]);
      o += clump(g.far - fw * 0.02, F.browY - 16, g.far - fw * 0.06, F.cheekY + 42, fw * 0.13, -fw * 0.03, p.hair.mid, p.hair.ln);
      o += clump(g.near + fw * 0.02, F.browY - 16, g.near + fw * 0.04, F.cheekY + 36, fw * 0.12, fw * 0.03, p.hair.sh, p.hair.ln);
      /* 跳ね毛。輪郭が整いすぎると型抜きに見える。 */
      o += clump(g.cxF - fw * 0.86, F.skullY + 22, g.cxF - fw * 1.22, F.skullY + 48, fw * 0.12, -fw * 0.06, p.hair.mid, p.hair.ln);
      [-0.52, -0.22, 0.10, 0.42, 0.72].forEach(function (t, i) {
        o += strandLine(g.cxF + fw * t * 0.62, F.skullY + 2 + i * 3,
                        g.cxF + fw * t, F.browY - 14 + (i % 2) * 12, fw * t * 0.10, p.hair.ln);
      });
      return o;
    },
    crop: function (g, p, back) {
      var fw = g.fw;
      if (back) return '';
      var o = cap(g, p, 0.98, -24);
      o += bangs(g, p, [
        [-0.50, -0.76, -4, 0.28, -0.05, p.hair.hi],
        [-0.10, -0.24,  8, 0.27,  0.00, p.hair.mid],
        [ 0.36,  0.62,  0, 0.28,  0.06, p.hair.sh]
      ]);
      o += clump(g.far + fw * 0.02, F.browY - 30, g.far, F.cheekY + 6, fw * 0.10, 0, p.hair.mid, p.hair.ln);
      o += clump(g.near - fw * 0.02, F.browY - 30, g.near, F.cheekY, fw * 0.10, 0, p.hair.sh, p.hair.ln);
      [-0.56, -0.24, 0.08, 0.40, 0.68].forEach(function (t, i) {
        o += strandLine(g.cxF + fw * t * 0.60, F.skullY + 8 + i * 3,
                        g.cxF + fw * t, F.browY - 30 + (i % 2) * 10, fw * t * 0.09, p.hair.ln);
      });
      return o;
    },
    long: function (g, p, back) {
      var fw = g.fw;
      if (back) {
        return '<path d="M ' + pt(g.cxF - fw * 1.12, F.skullY + 58) +
          ' C ' + pt(g.cxF - fw * 1.44, g.capTop - 8) + ' ' + pt(g.cxF + fw * 1.44, g.capTop - 8) +
          ' ' + pt(g.cxF + fw * 1.12, F.skullY + 58) +
          ' C ' + pt(g.cxF + fw * 1.70, F.chinY + 40) + ' ' + pt(g.cxF + fw * 1.46, VH - 12) + ' ' + pt(g.cxF + fw * 1.14, VH) +
          ' L ' + pt(g.cxF - fw * 1.18, VH) +
          ' C ' + pt(g.cxF - fw * 1.48, VH - 12) + ' ' + pt(g.cxF - fw * 1.70, F.chinY + 40) +
          ' ' + pt(g.cxF - fw * 1.12, F.skullY + 58) + ' Z" fill="' + p.hair.sh + '"/>';
      }
      var o = cap(g, p, 1.06, 12);
      o += bangs(g, p, [
        [-0.58, -0.96, 50, 0.31, -0.11, p.hair.hi],
        [-0.20, -0.42, 26, 0.30, -0.03, p.hair.mid],
        [ 0.20,  0.14, 46, 0.29,  0.02, p.hair.mid],
        [ 0.62,  0.96, 32, 0.31,  0.11, p.hair.sh]
      ]);
      o += clump(g.far - fw * 0.04, F.skullY + 44, g.far - fw * 0.22, F.chinY + 50, fw * 0.18, -fw * 0.08, p.hair.mid, p.hair.ln);
      o += clump(g.near + fw * 0.04, F.skullY + 44, g.near + fw * 0.20, F.chinY + 44, fw * 0.17, fw * 0.08, p.hair.sh, p.hair.ln);
      [-0.60, -0.30, 0.04, 0.36, 0.66].forEach(function (t, i) {
        o += strandLine(g.cxF + fw * t * 0.60, F.skullY + i * 3,
                        g.cxF + fw * t, F.browY + 6 + (i % 2) * 14, fw * t * 0.11, p.hair.ln);
      });
      return o;
    },
    bob: function (g, p, back) {
      var fw = g.fw;
      if (back) {
        return '<path d="M ' + pt(g.cxF - fw * 1.18, F.skullY + 48) +
          ' C ' + pt(g.cxF - fw * 1.48, g.capTop - 10) + ' ' + pt(g.cxF + fw * 1.48, g.capTop - 10) +
          ' ' + pt(g.cxF + fw * 1.18, F.skullY + 48) +
          ' L ' + pt(g.cxF + fw * 1.26, F.chinY + 18) + ' L ' + pt(g.cxF - fw * 1.26, F.chinY + 18) + ' Z" fill="' + p.hair.sh + '"/>';
      }
      var o = cap(g, p, 1.10, 2);
      o += '<path d="M ' + pt(g.far - fw * 0.20, F.browY - 12) +
        ' C ' + pt(g.far - fw * 0.34, F.cheekY) + ' ' + pt(g.far - fw * 0.30, F.chinY - 12) + ' ' + pt(g.far - fw * 0.14, F.chinY + 26) +
        ' L ' + pt(g.far + fw * 0.14, F.chinY + 8) +
        ' C ' + pt(g.far + fw * 0.04, F.cheekY + 8) + ' ' + pt(g.far, F.browY + 28) + ' ' + pt(g.far + fw * 0.02, F.browY - 8) +
        ' Z" fill="' + p.hair.mid + '"/>';
      o += '<path d="M ' + pt(g.near + fw * 0.18, F.browY - 12) +
        ' C ' + pt(g.near + fw * 0.32, F.cheekY) + ' ' + pt(g.near + fw * 0.28, F.chinY - 14) + ' ' + pt(g.near + fw * 0.10, F.chinY + 20) +
        ' L ' + pt(g.near - fw * 0.16, F.chinY + 4) +
        ' C ' + pt(g.near - fw * 0.06, F.cheekY + 8) + ' ' + pt(g.near - fw * 0.02, F.browY + 28) + ' ' + pt(g.near, F.browY - 8) +
        ' Z" fill="' + p.hair.sh + '"/>';
      o += bangs(g, p, [
        [-0.70, -0.88, 22, 0.33, -0.03, p.hair.hi],
        [-0.28, -0.38, 28, 0.32,  0.00, p.hair.mid],
        [ 0.16,  0.20, 26, 0.32,  0.01, p.hair.mid],
        [ 0.62,  0.78, 20, 0.33,  0.03, p.hair.sh]
      ]);
      return o;
    },
    tail: function (g, p, back) {
      var fw = g.fw;
      if (back) {
        return '<path d="M ' + pt(g.cxF + fw * 0.90, F.skullY + 50) +
          ' C ' + pt(g.cxF + fw * 1.78, F.cheekY) + ' ' + pt(g.cxF + fw * 1.66, F.chinY + 90) + ' ' + pt(g.cxF + fw * 1.16, VH) +
          ' L ' + pt(g.cxF + fw * 0.62, VH) +
          ' C ' + pt(g.cxF + fw * 1.14, F.chinY + 70) + ' ' + pt(g.cxF + fw * 1.20, F.cheekY + 10) +
          ' ' + pt(g.cxF + fw * 0.74, F.skullY + 66) + ' Z" fill="' + p.hair.sh + '"/>';
      }
      var o = HAIR.short(g, p, false);
      o += '<ellipse cx="' + n(g.cxF + fw * 0.98) + '" cy="' + n(F.skullY + 56) + '" rx="' + n(fw * 0.19) +
        '" ry="' + n(fw * 0.12) + '" fill="' + p.accent.mid + '"/>';
      return o;
    },
    hood: function (g, p, back) {
      var fw = g.fw, c = p.cape;
      if (back) {
        return '<path d="M ' + pt(g.cxF - fw * 1.30, F.cheekY) +
          ' C ' + pt(g.cxF - fw * 1.54, g.capTop - 32) + ' ' + pt(g.cxF + fw * 1.54, g.capTop - 32) +
          ' ' + pt(g.cxF + fw * 1.30, F.cheekY) +
          ' C ' + pt(g.cxF + fw * 1.64, VH - 40) + ' ' + pt(g.cxF + fw * 1.74, VH) + ' ' + pt(g.cxF + fw * 1.74, VH) +
          ' L ' + pt(g.cxF - fw * 1.74, VH) +
          ' C ' + pt(g.cxF - fw * 1.74, VH) + ' ' + pt(g.cxF - fw * 1.64, VH - 40) + ' ' + pt(g.cxF - fw * 1.30, F.cheekY) +
          ' Z" fill="' + c.mid + '"/>';
      }
      var o = '<path d="M ' + pt(g.cxF - fw * 1.26, F.cheekY - 16) +
        ' C ' + pt(g.cxF - fw * 1.46, g.capTop - 22) + ' ' + pt(g.cxF + fw * 1.46, g.capTop - 22) +
        ' ' + pt(g.cxF + fw * 1.26, F.cheekY - 16) +
        ' C ' + pt(g.cxF + fw * 0.84, F.browY + 4) + ' ' + pt(g.cxF - fw * 0.88, F.browY + 4) +
        ' ' + pt(g.cxF - fw * 1.26, F.cheekY - 16) + ' Z" fill="' + c.mid + '"/>';
      o += ink(cubic(g.cxF - fw * 1.26, F.cheekY - 16, g.cxF - fw * 0.88, F.browY + 4,
                     g.cxF + fw * 0.84, F.browY + 4, g.cxF + fw * 1.26, F.cheekY - 16), [1, 6, 1], c.ln);
      return o;
    }
  };

  /* ===================== 体 ===================== */

  function body(g, p, spec) {
    var o = '', fw = g.fw;
    var neckTop = g.chinY - 30, nw = fw * 0.28;
    var shY = g.chinY + 54, sw = g.b.shoulder;
    var lean = g.shift * 0.5;                    /* 肩も僅かに振る */

    /* 首。振りに合わせて傾ける */
    o += '<path d="M ' + pt(g.chinX - nw, neckTop) + ' L ' + pt(g.chinX - nw * 1.15 - lean * 0.3, shY - 4) +
      ' L ' + pt(g.chinX + nw * 1.15 - lean * 0.3, shY - 4) + ' L ' + pt(g.chinX + nw, neckTop) + ' Z" fill="' + p.skin.sh + '"/>';
    /* 胸鎖乳突筋の線を1本。首が円柱に見えなくなる。 */
    o += ink(cubic(g.chinX - nw * 0.5, neckTop + 6, g.chinX - nw * 0.8, neckTop + 26,
                   g.chinX - nw * 1.0, shY - 26, g.chinX - nw * 1.05, shY - 8), [0.2, 1.8, 0.2], p.skin.ln);

    if (spec.cape) {
      o += '<path d="M ' + pt(CX - sw * 1.14 + lean, VH) + ' C ' + pt(CX - sw * 1.00 + lean, shY + 4) +
        ' ' + pt(CX - sw * 0.52 + lean, shY - 18) + ' ' + pt(CX + lean, shY - 24) +
        ' C ' + pt(CX + sw * 0.52 + lean, shY - 18) + ' ' + pt(CX + sw * 1.00 + lean, shY + 4) +
        ' ' + pt(CX + sw * 1.14 + lean, VH) + ' Z" fill="' + p.cape.mid + '"/>';
    }
    /* 肩。左右で高さを変えると、正面立ちの硬さが抜ける。 */
    o += '<path d="M ' + pt(CX - sw * 0.94 + lean, VH) +
      ' C ' + pt(CX - sw * 0.82 + lean, shY + 14) + ' ' + pt(CX - sw * 0.44 + lean, shY - 6) + ' ' + pt(CX + lean, shY - 12) +
      ' C ' + pt(CX + sw * 0.46 + lean, shY - 10) + ' ' + pt(CX + sw * 0.84 + lean, shY + 4) + ' ' + pt(CX + sw * 0.96 + lean, VH) +
      ' Z" fill="' + p.cloth.mid + '"/>';
    o += '<path d="M ' + pt(CX + lean, shY - 12) + ' C ' + pt(CX + sw * 0.46 + lean, shY - 10) +
      ' ' + pt(CX + sw * 0.84 + lean, shY + 4) + ' ' + pt(CX + sw * 0.96 + lean, VH) +
      ' L ' + pt(CX + sw * 0.32 + lean, VH) + ' Z" fill="' + p.cloth.sh + '" opacity=".8"/>';
    /* 肩の線 */
    o += ink(cubic(CX - sw * 0.94 + lean, VH, CX - sw * 0.82 + lean, shY + 14,
                   CX - sw * 0.44 + lean, shY - 6, CX + lean, shY - 12), [0.4, 4.0, 1.2], p.cloth.ln);
    o += ink(cubic(CX + lean, shY - 12, CX + sw * 0.46 + lean, shY - 10,
                   CX + sw * 0.84 + lean, shY + 4, CX + sw * 0.96 + lean, VH), [1.2, 4.0, 0.4], p.cloth.ln);

    /* 襟。V字の合わせ2枚。 */
    var vx = g.chinX;
    o += '<path d="M ' + pt(vx - nw * 1.2, shY - 12) + ' L ' + pt(vx, shY + 62) + ' L ' + pt(vx + nw * 1.2, shY - 12) +
      ' L ' + pt(vx + nw * 1.2, shY) + ' L ' + pt(vx, shY + 82) + ' L ' + pt(vx - nw * 1.2, shY) + ' Z" fill="' + p.skin.sh + '"/>';
    o += '<path d="M ' + pt(vx - nw * 1.2, shY - 12) + ' L ' + pt(vx, shY + 62) + ' L ' + pt(vx - nw * 2.4, shY + 8) + ' Z" fill="' + p.cloth.hi + '"/>';
    o += '<path d="M ' + pt(vx + nw * 1.2, shY - 12) + ' L ' + pt(vx, shY + 62) + ' L ' + pt(vx + nw * 2.4, shY + 8) + ' Z" fill="' + p.cloth.sh + '"/>';
    o += ink(cubic(vx - nw * 1.2, shY - 12, vx - nw * 0.8, shY + 20, vx - nw * 0.3, shY + 44, vx, shY + 62), [1, 3.4, 0.6], p.cloth.ln);
    o += ink(cubic(vx + nw * 1.2, shY - 12, vx + nw * 0.8, shY + 20, vx + nw * 0.3, shY + 44, vx, shY + 62), [1, 3.4, 0.6], p.cloth.ln);

    if (spec.pauldron) {
      [-1, 1].forEach(function (s) {
        var x = CX + lean + s * sw * 0.70;
        o += '<path d="M ' + pt(x - sw * 0.30, VH) + ' C ' + pt(x - sw * 0.32, shY + 28) +
          ' ' + pt(x + sw * 0.30, shY + 24) + ' ' + pt(x + sw * 0.30, VH) + ' Z" fill="' +
          (s < 0 ? p.metal.mid : p.metal.sh) + '"/>';
        o += ink(cubic(x - sw * 0.30, VH, x - sw * 0.32, shY + 28, x + sw * 0.30, shY + 24, x + sw * 0.30, VH), [0.6, 3.6, 0.6], p.metal.ln);
        o += ink(cubic(x - sw * 0.22, shY + 60, x - sw * 0.14, shY + 40, x + sw * 0.14, shY + 38, x + sw * 0.24, shY + 56), [0.3, 2.6, 0.3], p.metal.hi);
      });
    }
    if (spec.cape) {
      o += '<circle cx="' + n(vx) + '" cy="' + n(shY + 16) + '" r="' + n(sw * 0.085) + '" fill="' + p.accent.mid + '"/>';
      o += '<circle cx="' + n(vx - sw * 0.028) + '" cy="' + n(shY + 13) + '" r="' + n(sw * 0.035) + '" fill="' + p.accent.hi + '"/>';
    }
    return o;
  }

  /* ===================== 組み立て ===================== */

  function svg(spec) {
    var p = pal(spec), g = geo(spec);
    var fw = g.fw;
    var style = HAIR[spec.hair] || HAIR.short;
    var hooded = spec.hair === 'hood';
    var o = '';

    o += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + VW + ' ' + VH + '" width="' + VW + '" height="' + VH + '">';
    o += '<defs>';
    ['irN', 'irF'].forEach(function (id) {
      o += '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + p.eyeDark + '"/>' +
        '<stop offset="46%" stop-color="' + p.eye + '"/>' +
        '<stop offset="100%" stop-color="' + p.eyeLite + '"/></linearGradient>';
    });
    o += '<linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#ffffff" stop-opacity=".34"/>' +
      '<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></linearGradient>';
    o += '</defs>';

    o += style(g, p, true);
    o += body(g, p, spec);

    /* 耳は近い側だけ見せる。両方出すと正面顔に戻ってしまう。 */
    o += '<ellipse cx="' + n(g.near - fw * 0.02) + '" cy="' + n(F.cheekY + 16) + '" rx="' + n(fw * 0.10) +
      '" ry="' + n(fw * 0.16) + '" fill="' + p.skin.sh + '"/>';

    /* 顔 */
    o += '<path d="' + facePath(g) + '" fill="' + p.skin.mid + '" stroke="' + p.ink +
      '" stroke-width="2.6" stroke-linejoin="round"/>';
    o += '<clipPath id="fc"><path d="' + facePath(g) + '"/></clipPath>';
    o += '<g clip-path="url(#fc)">';
    /* 近い側の頬に影。光は左上。 */
    o += '<path d="M ' + pt(g.cxF + fw * 0.34, 0) + ' L ' + pt(VW, 0) + ' L ' + pt(VW, VH) +
      ' L ' + pt(g.cxF + fw * 0.58, VH) + ' Z" fill="' + p.skin.sh + '" opacity=".5"/>';
    /* 前髪の落ち影 */
    o += '<path d="M ' + pt(g.cxF - fw * 1.4, F.skullY - 20) + ' L ' + pt(g.cxF + fw * 1.4, F.skullY - 20) +
      ' L ' + pt(g.cxF + fw * 1.4, F.browY + 10) + ' Q ' + pt(g.cxF, F.browY + 42) +
      ' ' + pt(g.cxF - fw * 1.4, F.browY + 6) + ' Z" fill="' + p.skin.sh + '" opacity=".55"/>';
    o += '</g>';
    /* 輪郭線。顎は太く、頭頂へ向かって細く抜く。 */
    o += ink(cubic(g.chinX, g.chinY, g.chinX - fw * 0.34, g.chinY - 8,
                   g.far + fw * 0.04, F.cheekY + 56, g.far, F.cheekY), [4.6, 3.4, 1.4], p.ink);
    o += ink(cubic(g.chinX, g.chinY, g.chinX + fw * 0.26, g.chinY - 2,
                   g.near - fw * 0.34, g.chinY - 12, g.near - fw * 0.10, F.cheekY + 50), [4.6, 3.6, 1.6], p.ink);

    if (!hooded) {
      o += eye(g, p, spec, true) + eye(g, p, spec, false);
      o += brow(g, p, spec, true) + brow(g, p, spec, false);
    } else {
      o += '<g clip-path="url(#fc)"><rect x="0" y="0" width="' + VW + '" height="' + VH +
        '" fill="#0a0d18" opacity=".66"/></g>';
      [-1, 1].forEach(function (s) {
        var ex = g.cxF + s * fw * 0.46;
        o += '<ellipse cx="' + n(ex) + '" cy="' + n(F.eyeY) + '" rx="' + n(fw * 0.19) + '" ry="' + n(fw * 0.10) + '" fill="#a8ecff"/>';
        o += '<ellipse cx="' + n(ex) + '" cy="' + n(F.eyeY) + '" rx="' + n(fw * 0.08) + '" ry="' + n(fw * 0.05) + '" fill="#fff"/>';
      });
    }

    /* 鼻。線は1本、短く。 */
    o += ink(cubic(g.cxF + fw * 0.10, F.noseY - 20, g.cxF + fw * 0.16, F.noseY - 8,
                   g.cxF + fw * 0.14, F.noseY - 2, g.cxF + fw * 0.04, F.noseY + 1), [0.2, 2.6, 0.8], p.skin.ln);
    /* 口。中央からずらす。 */
    o += ink(cubic(g.cxF - fw * 0.16, F.mouthY, g.cxF - fw * 0.05, F.mouthY + 9,
                   g.cxF + fw * 0.07, F.mouthY + 9, g.cxF + fw * 0.17, F.mouthY - 1), [0.6, 3.4, 0.6], p.ink);
    if (spec.beard) {
      o += '<path d="M ' + pt(g.cxF - fw * 0.60, F.mouthY - 20) +
        ' Q ' + pt(g.cxF, F.mouthY + 62) + ' ' + pt(g.cxF + fw * 0.60, F.mouthY - 20) +
        ' Q ' + pt(g.cxF, F.mouthY + 14) + ' ' + pt(g.cxF - fw * 0.60, F.mouthY - 20) + ' Z" fill="' + p.hair.mid + '"/>';
    }
    if (spec.blush) {
      [[-0.60, 0.86], [0.62, 1.0]].forEach(function (t) {
        o += '<ellipse cx="' + n(g.cxF + fw * t[0]) + '" cy="' + n(F.eyeY + 46) + '" rx="' + n(fw * 0.19 * t[1]) +
          '" ry="' + n(fw * 0.075) + '" fill="' + p.blush + '" opacity=".30"/>';
      });
    }

    o += style(g, p, false);

    if (!hooded) {
      /* 髪の艶。まっすぐな帯ではなく、途切れさせる。 */
      o += '<path d="M ' + pt(g.cxF - fw * 0.80, F.skullY + 30) +
        ' Q ' + pt(g.cxF - fw * 0.20, F.skullY + 8) + ' ' + pt(g.cxF + fw * 0.30, F.skullY + 22) +
        ' Q ' + pt(g.cxF - fw * 0.18, F.skullY + 24) + ' ' + pt(g.cxF - fw * 0.80, F.skullY + 30) + ' Z" fill="url(#hg)"/>';
      o += '<path d="M ' + pt(g.cxF + fw * 0.50, F.skullY + 28) +
        ' Q ' + pt(g.cxF + fw * 0.78, F.skullY + 22) + ' ' + pt(g.cxF + fw * 0.92, F.skullY + 40) +
        ' Q ' + pt(g.cxF + fw * 0.70, F.skullY + 32) + ' ' + pt(g.cxF + fw * 0.50, F.skullY + 28) + ' Z" fill="url(#hg)"/>';
    }
    if (spec.circlet) {
      o += ink(cubic(g.cxF - fw * 0.90, F.browY - 20, g.cxF - fw * 0.30, F.browY + 2,
                     g.cxF + fw * 0.34, F.browY + 2, g.cxF + fw * 0.90, F.browY - 22), [2, 5, 2], p.accent.mid);
      o += '<circle cx="' + n(g.cxF) + '" cy="' + n(F.browY - 2) + '" r="8" fill="' + p.accent.hi + '"/>';
    }
    o += '</svg>';
    return o;
  }

  var cache = {};
  function dataUrl(spec) {
    var key = JSON.stringify(spec);
    if (cache[key]) return cache[key];
    return (cache[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(spec)));
  }
  function img(spec, h, cls, attrs) {
    h = h || 180;
    var w = Math.round(h * VW / VH);
    return '<img class="portrait anime ' + (cls || '') + '" src="' + dataUrl(spec) +
      '" width="' + w + '" height="' + h + '" alt="" ' + (attrs || '') + '>';
  }

  return { svg: svg, dataUrl: dataUrl, img: img, VW: VW, VH: VH, FACE: F, BUILD: BUILD, HAIR: HAIR };
})();
