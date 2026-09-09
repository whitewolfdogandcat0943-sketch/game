/* anime.js - アニメ調バストアップ（SVG・手続き生成）
 *
 * ドット絵は顔の情報量に限界がある。会話用の顔だけはベクターで描く。
 * 曲線・セル塗り・大きな瞳が使えるので、同じ設定から別の絵柄が起こせる。
 *
 * 絵柄の約束事:
 *   - 目は大きく、上まつ毛を太く、下まぶたは細く
 *   - 鼻は影だけ、口は小さく
 *   - 顎は尖らせ、頬から顎までを一本の曲線で通す
 *   - 髪は房に分け、房ごとに先を尖らせる
 *   - 影は1段だけ（セル塗り）。光は左上から
 */
G.Anime = (function () {
  var VW = 400, VH = 460;
  var CX = 200;

  /* 顔の骨格。ここを動かすと年齢と性別の印象が変わる。 */
  var FACE = {
    skullY: 96,      /* 頭頂 */
    cheekY: 232,     /* 頬の最も広い高さ */
    chinY:  336,     /* 顎先 */
    eyeY:   248,     /* 目の中心 */
    browY:  212,     /* 眉 */
    noseY:  286,     /* 鼻先 */
    mouthY: 308      /* 口 */
  };

  var BUILD = {
    slim:   { fw: 80, jaw: 0.30, shoulder: 210, chin: 348 },
    normal: { fw: 85, jaw: 0.36, shoulder: 245, chin: 344 },
    heavy:  { fw: 94, jaw: 0.48, shoulder: 305, chin: 336 }
  };

  /* 髪の塊が届く高さ。頭頂より十分に上へ制御点を置かないと禿げる。 */
  function capTop() { return FACE.skullY - 78; }

  /* ===================== 色 ===================== */

  function hsl(h, s, l) {
    return 'hsl(' + (((h % 360) + 360) % 360) + ',' + G.U.clamp(s, 0, 100) + '%,' + G.U.clamp(l, 0, 100) + '%)';
  }
  function tone(h, s, l) {
    return {
      hi:  hsl(h, s * 0.8, Math.min(96, l * 1.22)),
      mid: hsl(h, s, l),
      sh:  hsl(h + 8, Math.min(90, s * 1.15), l * 0.76),   /* 影は少し寒色へ倒す */
      ln:  hsl(h, Math.min(80, s * 1.2), l * 0.34)         /* 線 */
    };
  }
  function pal(spec) {
    var skinH = spec.skinHue != null ? spec.skinHue : 26;
    var skinL = spec.skinLum != null ? spec.skinLum : 68;
    return {
      skin: {
        hi:  hsl(skinH + 4, 52, Math.min(97, skinL * 1.30)),
        mid: hsl(skinH, 46, Math.min(94, skinL * 1.18)),
        sh:  hsl(skinH - 6, 44, skinL * 0.92),
        ln:  hsl(skinH - 10, 40, skinL * 0.46)
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
      blush: hsl(8, 78, 74)
    };
  }

  /* ===================== 形 ===================== */

  function n(v) { return Math.round(v * 10) / 10; }
  function pt(x, y) { return n(x) + ' ' + n(y); }

  /** 輪郭。頬から顎までを一本で通し、顎先を尖らせる。 */
  function facePath(b) {
    var fw = b.fw, chin = b.chin, jaw = b.jaw;
    var F = FACE;
    return 'M ' + pt(CX, chin) +
      ' C ' + pt(CX - fw * jaw, chin - 6) + ' ' + pt(CX - fw * 0.86, F.cheekY + 54) + ' ' + pt(CX - fw, F.cheekY) +
      ' C ' + pt(CX - fw - 2, F.cheekY - 64) + ' ' + pt(CX - fw * 0.99, F.skullY + 34) + ' ' + pt(CX - fw * 0.70, F.skullY + 8) +
      ' C ' + pt(CX - fw * 0.42, F.skullY - 16) + ' ' + pt(CX + fw * 0.42, F.skullY - 16) + ' ' + pt(CX + fw * 0.70, F.skullY + 8) +
      ' C ' + pt(CX + fw * 0.99, F.skullY + 34) + ' ' + pt(CX + fw + 2, F.cheekY - 64) + ' ' + pt(CX + fw, F.cheekY) +
      ' C ' + pt(CX + fw * 0.86, F.cheekY + 54) + ' ' + pt(CX + fw * jaw, chin - 6) + ' ' + pt(CX, chin) + ' Z';
  }

  /** 目。上まつ毛を太く、瞳を大きく。 */
  function eye(side, p, spec, b) {
    var F = FACE, fw = b.fw;
    var ex = CX + side * fw * 0.46;         /* 目の中心 */
    var ew = fw * 0.34, eh = fw * 0.31;
    var lash = ew * 0.30;
    var out = '';
    /* 白目 */
    out += '<ellipse cx="' + n(ex) + '" cy="' + n(F.eyeY) + '" rx="' + n(ew) + '" ry="' + n(eh) + '" fill="#fbfaf7"/>';
    /* 瞳（下が明るいグラデーション） */
    var gid = 'ir' + (side < 0 ? 'L' : 'R');
    out += '<ellipse cx="' + n(ex) + '" cy="' + n(F.eyeY + eh * 0.06) + '" rx="' + n(ew * 0.62) +
           '" ry="' + n(eh * 0.92) + '" fill="url(#' + gid + ')"/>';
    out += '<ellipse cx="' + n(ex) + '" cy="' + n(F.eyeY + eh * 0.10) + '" rx="' + n(ew * 0.30) +
           '" ry="' + n(eh * 0.52) + '" fill="#181d2b"/>';
    /* 光点 */
    out += '<ellipse cx="' + n(ex - ew * 0.28) + '" cy="' + n(F.eyeY - eh * 0.42) + '" rx="' + n(ew * 0.22) +
           '" ry="' + n(eh * 0.24) + '" fill="#ffffff"/>';
    out += '<circle cx="' + n(ex + ew * 0.30) + '" cy="' + n(F.eyeY + eh * 0.38) + '" r="' + n(ew * 0.10) +
           '" fill="#ffffff" opacity=".75"/>';
    /* 上まつ毛。目尻側を伸ばす */
    var x0 = ex - side * ew * 1.06, x1 = ex + side * ew * 1.10;
    out += '<path d="M ' + pt(x0, F.eyeY - eh * 0.10) +
           ' C ' + pt(ex - side * ew * 0.7, F.eyeY - eh * 1.34) + ' ' + pt(ex + side * ew * 0.55, F.eyeY - eh * 1.30) +
           ' ' + pt(x1, F.eyeY - eh * 0.42) +
           ' C ' + pt(ex + side * ew * 0.6, F.eyeY - eh * 0.92) + ' ' + pt(ex - side * ew * 0.7, F.eyeY - eh * 0.86) +
           ' ' + pt(x0, F.eyeY - eh * 0.10) + ' Z" fill="' + p.hair.ln + '"/>';
    /* 目尻の跳ね */
    out += '<path d="M ' + pt(x1, F.eyeY - eh * 0.42) +
           ' q ' + n(side * ew * 0.30) + ' ' + n(-eh * 0.30) + ' ' + n(side * ew * 0.44) + ' ' + n(-eh * 0.10) +
           ' q ' + n(-side * ew * 0.22) + ' ' + n(-eh * 0.02) + ' ' + n(-side * ew * 0.44) + ' ' + n(eh * 0.10) +
           ' Z" fill="' + p.hair.ln + '"/>';
    /* 下まぶた */
    out += '<path d="M ' + pt(ex - ew * 0.78, F.eyeY + eh * 0.74) +
           ' Q ' + pt(ex, F.eyeY + eh * 1.02) + ' ' + pt(ex + ew * 0.82, F.eyeY + eh * 0.62) +
           '" fill="none" stroke="' + p.skin.ln + '" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>';
    return out;
  }

  function brow(side, p, spec, b) {
    var F = FACE, fw = b.fw;
    var ex = CX + side * fw * 0.46;
    var w = fw * 0.36, tilt = (spec.brow || 0) * 8;
    var inner = ex - side * w * 0.9, outer = ex + side * w * 0.95;
    return '<path d="M ' + pt(inner, F.browY + tilt) +
      ' Q ' + pt(ex, F.browY - 12) + ' ' + pt(outer, F.browY - tilt * 0.3) +
      ' Q ' + pt(ex, F.browY - 2) + ' ' + pt(inner, F.browY + tilt + 8) +
      ' Z" fill="' + p.hair.sh + '"/>';
  }

  /* ===================== 髪 ===================== */

  /** 房を1つ。根元は幅を持ち、先は尖る。bow で反りを付ける。
   * アニメ調の髪は「滑らかな塊」ではなく「尖った房の集合」なので、
   * これを何本も重ねることで髪に見える。 */
  function strand(rx, ry, tx, ty, w, bow, fill, line) {
    var mx = (rx + tx) / 2, my = (ry + ty) / 2;
    var d = 'M ' + pt(rx - w, ry) +
      ' C ' + pt(mx - w * 1.05 + bow, my - (ty - ry) * 0.10) + ' ' + pt(tx - w * 0.28 + bow, ty - (ty - ry) * 0.24) +
      ' ' + pt(tx, ty) +
      ' C ' + pt(tx + w * 0.34 + bow, ty - (ty - ry) * 0.26) + ' ' + pt(mx + w * 1.02 + bow, my - (ty - ry) * 0.08) +
      ' ' + pt(rx + w, ry) + ' Z';
    return '<path d="' + d + '" fill="' + fill + '"' +
      (line ? ' stroke="' + line + '" stroke-width="2.2" stroke-linejoin="round"' : '') + '/>';
  }

  /** 前髪。房を並べて生え際を作る。tips は [根元x比, 先端x比, 先端の深さ, 幅比, 色] の並び。 */
  function bangs(p, b, tips) {
    var F = FACE, fw = b.fw, o = '';
    tips.forEach(function (t) {
      o += strand(CX + fw * t[0], F.browY - 48, CX + fw * t[1], F.browY + t[2],
                  fw * t[3], fw * (t[4] || 0), t[5], p.hair.ln);
    });
    return o;
  }

  /** 頭の塊。上は capTop まで、下は生え際まで。 */
  function cap(p, b, spread, hairline) {
    var F = FACE, fw = b.fw;
    return '<path d="M ' + pt(CX - fw * spread, F.browY + hairline) +
      ' C ' + pt(CX - fw * (spread + 0.26), capTop()) + ' ' + pt(CX + fw * (spread + 0.26), capTop()) +
      ' ' + pt(CX + fw * spread, F.browY + hairline) +
      ' C ' + pt(CX + fw * 0.62, F.browY - 34) + ' ' + pt(CX - fw * 0.62, F.browY - 34) +
      ' ' + pt(CX - fw * spread, F.browY + hairline) + ' Z" fill="' + p.hair.mid +
      '" stroke="' + p.hair.ln + '" stroke-width="2.4" stroke-linejoin="round"/>';
  }

  var HAIR = {
    /* 短髪。房を不揃いに散らす。 */
    short: function (p, b, back) {
      var F = FACE, fw = b.fw;
      if (back) {
        return '<path d="M ' + pt(CX - fw * 1.06, F.cheekY - 10) +
          ' C ' + pt(CX - fw * 1.28, capTop() + 20) + ' ' + pt(CX + fw * 1.28, capTop() + 20) +
          ' ' + pt(CX + fw * 1.06, F.cheekY - 10) +
          ' L ' + pt(CX + fw * 0.96, F.cheekY + 64) + ' L ' + pt(CX - fw * 0.96, F.cheekY + 64) +
          ' Z" fill="' + p.hair.sh + '"/>';
      }
      var o = cap(p, b, 1.04, 10);
      o += bangs(p, b, [
        [-0.62, -1.02,  46, 0.30, -0.10, p.hair.mid],
        [-0.30, -0.58,  22, 0.29, -0.05, p.hair.hi],
        [ 0.02, -0.16,  40, 0.28,  0.00, p.hair.mid],
        [ 0.30,  0.46,  16, 0.27,  0.05, p.hair.sh],
        [ 0.60,  0.98,  38, 0.30,  0.11, p.hair.mid]
      ]);
      /* もみあげ */
      o += strand(CX - fw * 0.98, F.browY - 14, CX - fw * 1.04, F.cheekY + 40, fw * 0.13, -fw * 0.03, p.hair.mid, p.hair.ln);
      o += strand(CX + fw * 0.98, F.browY - 14, CX + fw * 1.04, F.cheekY + 40, fw * 0.13,  fw * 0.03, p.hair.sh, p.hair.ln);
      /* 外へ跳ねる毛。輪郭が滑らかだと兜に見える。 */
      o += strand(CX - fw * 0.90, F.skullY + 24, CX - fw * 1.22, F.skullY + 52, fw * 0.13, -fw * 0.06, p.hair.mid, p.hair.ln);
      o += strand(CX + fw * 0.86, F.skullY + 20, CX + fw * 1.16, F.skullY + 40, fw * 0.12,  fw * 0.06, p.hair.sh, p.hair.ln);
      return o;
    },
    /* 刈り上げ。房を短く、生え際を高く。 */
    crop: function (p, b, back) {
      var F = FACE, fw = b.fw;
      if (back) return '';
      var o = cap(p, b, 0.98, -26);
      o += bangs(p, b, [
        [-0.46, -0.72, -2, 0.28, -0.05, p.hair.hi],
        [-0.06, -0.22,  8, 0.27,  0.00, p.hair.mid],
        [ 0.38,  0.62,  0, 0.28,  0.06, p.hair.sh]
      ]);
      o += strand(CX - fw * 0.96, F.browY - 26, CX - fw * 1.00, F.cheekY + 6, fw * 0.10, 0, p.hair.mid, p.hair.ln);
      o += strand(CX + fw * 0.96, F.browY - 26, CX + fw * 1.00, F.cheekY + 6, fw * 0.10, 0, p.hair.sh, p.hair.ln);
      return o;
    },
    /* 長い髪。背面に大きく流し、顔の横へ細い房を落とす。 */
    long: function (p, b, back) {
      var F = FACE, fw = b.fw;
      if (back) {
        return '<path d="M ' + pt(CX - fw * 1.10, F.skullY + 60) +
          ' C ' + pt(CX - fw * 1.42, capTop() - 6) + ' ' + pt(CX + fw * 1.42, capTop() - 6) +
          ' ' + pt(CX + fw * 1.10, F.skullY + 60) +
          ' C ' + pt(CX + fw * 1.66, F.chinY + 40) + ' ' + pt(CX + fw * 1.44, VH - 10) + ' ' + pt(CX + fw * 1.14, VH) +
          ' L ' + pt(CX - fw * 1.14, VH) +
          ' C ' + pt(CX - fw * 1.44, VH - 10) + ' ' + pt(CX - fw * 1.66, F.chinY + 40) +
          ' ' + pt(CX - fw * 1.10, F.skullY + 60) + ' Z" fill="' + p.hair.sh + '"/>';
      }
      var o = cap(p, b, 1.06, 14);
      o += bangs(p, b, [
        [-0.54, -0.94,  52, 0.31, -0.11, p.hair.hi],
        [-0.18, -0.44,  30, 0.30, -0.04, p.hair.mid],
        [ 0.16,  0.10,  46, 0.29,  0.03, p.hair.mid],
        [ 0.54,  0.92,  36, 0.31,  0.11, p.hair.sh]
      ]);
      /* 顔の横に落ちる房 */
      o += strand(CX - fw * 1.02, F.skullY + 40, CX - fw * 1.22, F.chinY + 46, fw * 0.17, -fw * 0.08, p.hair.mid, p.hair.ln);
      o += strand(CX + fw * 1.02, F.skullY + 40, CX + fw * 1.22, F.chinY + 46, fw * 0.17,  fw * 0.08, p.hair.sh, p.hair.ln);
      return o;
    },
    /* 切り揃えた髪。前髪は水平、横は顎の高さで断つ。 */
    bob: function (p, b, back) {
      var F = FACE, fw = b.fw;
      if (back) {
        return '<path d="M ' + pt(CX - fw * 1.16, F.skullY + 50) +
          ' C ' + pt(CX - fw * 1.46, capTop() - 8) + ' ' + pt(CX + fw * 1.46, capTop() - 8) +
          ' ' + pt(CX + fw * 1.16, F.skullY + 50) +
          ' L ' + pt(CX + fw * 1.24, F.chinY + 16) + ' L ' + pt(CX - fw * 1.24, F.chinY + 16) + ' Z" fill="' + p.hair.sh + '"/>';
      }
      var o = cap(p, b, 1.10, 4);
      /* 横に落ちる面。毛先を少し内へ絞る */
      o += '<path d="M ' + pt(CX - fw * 1.12, F.browY - 10) +
        ' C ' + pt(CX - fw * 1.24, F.cheekY) + ' ' + pt(CX - fw * 1.20, F.chinY - 10) + ' ' + pt(CX - fw * 1.06, F.chinY + 24) +
        ' L ' + pt(CX - fw * 0.80, F.chinY + 8) +
        ' C ' + pt(CX - fw * 0.90, F.cheekY + 10) + ' ' + pt(CX - fw * 0.94, F.browY + 30) + ' ' + pt(CX - fw * 0.92, F.browY - 6) +
        ' Z" fill="' + p.hair.mid + '" stroke="' + p.hair.ln + '" stroke-width="2.2"/>';
      o += '<path d="M ' + pt(CX + fw * 1.12, F.browY - 10) +
        ' C ' + pt(CX + fw * 1.24, F.cheekY) + ' ' + pt(CX + fw * 1.20, F.chinY - 10) + ' ' + pt(CX + fw * 1.06, F.chinY + 24) +
        ' L ' + pt(CX + fw * 0.80, F.chinY + 8) +
        ' C ' + pt(CX + fw * 0.90, F.cheekY + 10) + ' ' + pt(CX + fw * 0.94, F.browY + 30) + ' ' + pt(CX + fw * 0.92, F.browY - 6) +
        ' Z" fill="' + p.hair.sh + '" stroke="' + p.hair.ln + '" stroke-width="2.2"/>';
      /* ぱっつん前髪。先を揃えるが、房の切れ目は残す */
      o += bangs(p, b, [
        [-0.66, -0.86, 24, 0.32, -0.03, p.hair.hi],
        [-0.26, -0.36, 28, 0.31,  0.00, p.hair.mid],
        [ 0.14,  0.16, 28, 0.31,  0.00, p.hair.mid],
        [ 0.56,  0.72, 24, 0.32,  0.03, p.hair.sh]
      ]);
      return o;
    },
    /* 括った髪。 */
    tail: function (p, b, back) {
      var F = FACE, fw = b.fw;
      if (back) {
        return '<path d="M ' + pt(CX + fw * 0.90, F.skullY + 50) +
          ' C ' + pt(CX + fw * 1.74, F.cheekY) + ' ' + pt(CX + fw * 1.64, F.chinY + 90) + ' ' + pt(CX + fw * 1.14, VH) +
          ' L ' + pt(CX + fw * 0.62, VH) +
          ' C ' + pt(CX + fw * 1.12, F.chinY + 70) + ' ' + pt(CX + fw * 1.18, F.cheekY + 10) +
          ' ' + pt(CX + fw * 0.74, F.skullY + 66) + ' Z" fill="' + p.hair.sh + '"/>';
      }
      var o = HAIR.short(p, b, false);
      o += '<ellipse cx="' + n(CX + fw * 0.98) + '" cy="' + n(F.skullY + 58) + '" rx="' + n(fw * 0.20) +
        '" ry="' + n(fw * 0.13) + '" fill="' + p.accent.mid + '" stroke="' + p.hair.ln + '" stroke-width="2"/>';
      return o;
    },
    /* 頭巾。 */
    hood: function (p, b, back) {
      var F = FACE, fw = b.fw, c = p.cape;
      if (back) {
        return '<path d="M ' + pt(CX - fw * 1.30, F.cheekY) +
          ' C ' + pt(CX - fw * 1.52, capTop() - 30) + ' ' + pt(CX + fw * 1.52, capTop() - 30) +
          ' ' + pt(CX + fw * 1.30, F.cheekY) +
          ' C ' + pt(CX + fw * 1.62, VH - 40) + ' ' + pt(CX + fw * 1.72, VH) + ' ' + pt(CX + fw * 1.72, VH) +
          ' L ' + pt(CX - fw * 1.72, VH) +
          ' C ' + pt(CX - fw * 1.72, VH) + ' ' + pt(CX - fw * 1.62, VH - 40) + ' ' + pt(CX - fw * 1.30, F.cheekY) +
          ' Z" fill="' + c.mid + '" stroke="' + c.ln + '" stroke-width="2.4"/>';
      }
      /* 前へ垂れる縁。目のすぐ上で止め、顔を影に沈める。 */
      var o = '<path d="M ' + pt(CX - fw * 1.26, F.cheekY - 14) +
        ' C ' + pt(CX - fw * 1.44, capTop() - 20) + ' ' + pt(CX + fw * 1.44, capTop() - 20) +
        ' ' + pt(CX + fw * 1.26, F.cheekY - 14) +
        ' C ' + pt(CX + fw * 0.86, F.browY + 6) + ' ' + pt(CX - fw * 0.86, F.browY + 6) +
        ' ' + pt(CX - fw * 1.26, F.cheekY - 14) + ' Z" fill="' + c.mid + '" stroke="' + c.ln + '" stroke-width="2.4"/>';
      o += '<path d="M ' + pt(CX - fw * 1.26, F.cheekY - 14) +
        ' C ' + pt(CX - fw * 0.86, F.browY + 6) + ' ' + pt(CX + fw * 0.86, F.browY + 6) +
        ' ' + pt(CX + fw * 1.26, F.cheekY - 14) +
        ' L ' + pt(CX + fw * 1.20, F.cheekY + 6) +
        ' C ' + pt(CX + fw * 0.84, F.browY + 26) + ' ' + pt(CX - fw * 0.84, F.browY + 26) +
        ' ' + pt(CX - fw * 1.20, F.cheekY + 6) + ' Z" fill="' + c.sh + '"/>';
      return o;
    }
  };

  /* ===================== 服 ===================== */

  function body(p, spec, b) {
    var F = FACE, o = '';
    var neckTop = b.chin - 26, neckW = b.fw * 0.30;
    var shY = b.chin + 56, sw = b.shoulder;
    /* 首 */
    o += '<path d="M ' + pt(CX - neckW, neckTop) + ' L ' + pt(CX - neckW * 1.1, shY - 6) +
      ' L ' + pt(CX + neckW * 1.1, shY - 6) + ' L ' + pt(CX + neckW, neckTop) + ' Z" fill="' + p.skin.sh + '"/>';
    /* 肩 */
    if (spec.cape) {
      o += '<path d="M ' + pt(CX - sw * 1.12, VH) + ' C ' + pt(CX - sw * 0.98, shY + 6) + ' ' + pt(CX - sw * 0.52, shY - 16) +
        ' ' + pt(CX, shY - 22) + ' C ' + pt(CX + sw * 0.52, shY - 16) + ' ' + pt(CX + sw * 0.98, shY + 6) +
        ' ' + pt(CX + sw * 1.12, VH) + ' Z" fill="' + p.cape.mid + '"/>';
    }
    o += '<path d="M ' + pt(CX - sw * 0.92, VH) + ' C ' + pt(CX - sw * 0.80, shY + 10) + ' ' + pt(CX - sw * 0.44, shY - 8) +
      ' ' + pt(CX, shY - 14) + ' C ' + pt(CX + sw * 0.44, shY - 8) + ' ' + pt(CX + sw * 0.80, shY + 10) +
      ' ' + pt(CX + sw * 0.92, VH) + ' Z" fill="' + p.cloth.mid + '"/>';
    /* 右側に影 */
    o += '<path d="M ' + pt(CX, shY - 14) + ' C ' + pt(CX + sw * 0.44, shY - 8) + ' ' + pt(CX + sw * 0.80, shY + 10) +
      ' ' + pt(CX + sw * 0.92, VH) + ' L ' + pt(CX + sw * 0.30, VH) + ' Z" fill="' + p.cloth.sh + '" opacity=".85"/>';
    /* 襟。首元をV字に開け、合わせを2枚重ねる。 */
    o += '<path d="M ' + pt(CX - neckW * 1.15, shY - 10) + ' L ' + pt(CX, shY + 66) +
      ' L ' + pt(CX + neckW * 1.15, shY - 10) +
      ' L ' + pt(CX + neckW * 1.15, shY + 2) + ' L ' + pt(CX, shY + 84) + ' L ' + pt(CX - neckW * 1.15, shY + 2) +
      ' Z" fill="' + p.skin.sh + '"/>';
    o += '<path d="M ' + pt(CX - neckW * 1.15, shY - 10) + ' L ' + pt(CX, shY + 66) +
      ' L ' + pt(CX - neckW * 2.30, shY + 10) + ' Z" fill="' + p.cloth.hi + '"/>';
    o += '<path d="M ' + pt(CX + neckW * 1.15, shY - 10) + ' L ' + pt(CX, shY + 66) +
      ' L ' + pt(CX + neckW * 2.30, shY + 10) + ' Z" fill="' + p.cloth.sh + '"/>';
    /* 肩当て */
    if (spec.pauldron) {
      [-1, 1].forEach(function (s) {
        var x = CX + s * sw * 0.70;
        o += '<path d="M ' + pt(x - sw * 0.30, VH) + ' C ' + pt(x - sw * 0.32, shY + 30) + ' ' + pt(x + sw * 0.30, shY + 26) +
          ' ' + pt(x + sw * 0.30, VH) + ' Z" fill="' + (s < 0 ? p.metal.mid : p.metal.sh) + '"/>';
        o += '<path d="M ' + pt(x - sw * 0.30, shY + 62) + ' C ' + pt(x - sw * 0.20, shY + 40) + ' ' + pt(x + sw * 0.18, shY + 38) +
          ' ' + pt(x + sw * 0.30, shY + 58) + '" fill="none" stroke="' + p.metal.hi + '" stroke-width="5" opacity=".7"/>';
      });
    }
    /* マントの留め具 */
    if (spec.cape) {
      o += '<circle cx="' + CX + '" cy="' + n(shY + 20) + '" r="' + n(sw * 0.09) + '" fill="' + p.accent.mid + '"/>';
      o += '<circle cx="' + n(CX - sw * 0.03) + '" cy="' + n(shY + 17) + '" r="' + n(sw * 0.04) + '" fill="' + p.accent.hi + '"/>';
    }
    return o;
  }

  /* ===================== 組み立て ===================== */

  function svg(spec) {
    var p = pal(spec), b = BUILD[spec.build] || BUILD.normal;
    var F = FACE;
    var style = HAIR[spec.hair] || HAIR.short;
    var hooded = spec.hair === 'hood';
    var o = '';

    o += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + VW + ' ' + VH + '" width="' + VW + '" height="' + VH + '">';
    o += '<defs>';
    ['irL', 'irR'].forEach(function (id) {
      o += '<radialGradient id="' + id + '" cx="50%" cy="70%" r="70%">' +
        '<stop offset="0%" stop-color="' + p.eye + '" stop-opacity="0.55"/>' +
        '<stop offset="55%" stop-color="' + p.eye + '"/>' +
        '<stop offset="100%" stop-color="#10141f"/></radialGradient>';
    });
    o += '<linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#ffffff" stop-opacity=".30"/>' +
      '<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></linearGradient>';
    o += '</defs>';

    o += style(p, b, true);      /* 髪の背面 */
    o += body(p, spec, b);       /* 首・肩 */

    /* 耳 */
    [-1, 1].forEach(function (s) {
      o += '<ellipse cx="' + n(CX + s * b.fw * 0.98) + '" cy="' + n(F.cheekY + 18) + '" rx="' + n(b.fw * 0.11) +
        '" ry="' + n(b.fw * 0.17) + '" fill="' + p.skin.sh + '"/>';
    });

    /* 顔 */
    o += '<path d="' + facePath(b) + '" fill="' + p.skin.mid + '" stroke="' + p.skin.ln +
      '" stroke-width="2.2" stroke-opacity=".55"/>';
    /* 右側の陰（セル塗り1段） */
    o += '<clipPath id="fc"><path d="' + facePath(b) + '"/></clipPath>';
    o += '<g clip-path="url(#fc)">';
    o += '<path d="M ' + pt(CX + b.fw * 0.30, 0) + ' L ' + pt(VW, 0) + ' L ' + pt(VW, VH) +
      ' L ' + pt(CX + b.fw * 0.52, VH) + ' Z" fill="' + p.skin.sh + '" opacity=".55"/>';
    /* 前髪が顔に落とす影 */
    o += '<path d="M ' + pt(CX - b.fw * 1.2, F.skullY) + ' L ' + pt(CX + b.fw * 1.2, F.skullY) +
      ' L ' + pt(CX + b.fw * 1.2, F.browY + 16) + ' Q ' + pt(CX, F.browY + 40) + ' ' + pt(CX - b.fw * 1.2, F.browY + 16) +
      ' Z" fill="' + p.skin.sh + '" opacity=".5"/>';
    o += '</g>';

    if (!hooded) {
      /* 目・眉 */
      o += eye(-1, p, spec, b) + eye(1, p, spec, b);
      o += brow(-1, p, spec, b) + brow(1, p, spec, b);
    } else {
      /* 影の中で光る目 */
      o += '<g clip-path="url(#fc)"><rect x="0" y="0" width="' + VW + '" height="' + VH +
        '" fill="#0a0d18" opacity=".62"/></g>';
      [-1, 1].forEach(function (s) {
        var ex = CX + s * b.fw * 0.46;
        o += '<ellipse cx="' + n(ex) + '" cy="' + n(F.eyeY) + '" rx="' + n(b.fw * 0.20) + '" ry="' + n(b.fw * 0.11) +
          '" fill="#a8ecff"/>';
        o += '<ellipse cx="' + n(ex) + '" cy="' + n(F.eyeY) + '" rx="' + n(b.fw * 0.09) + '" ry="' + n(b.fw * 0.06) +
          '" fill="#ffffff"/>';
      });
    }

    /* 鼻と口 */
    o += '<path d="M ' + pt(CX - b.fw * 0.05, F.noseY - 14) + ' Q ' + pt(CX + b.fw * 0.03, F.noseY) +
      ' ' + pt(CX - b.fw * 0.09, F.noseY + 2) + '" fill="none" stroke="' + p.skin.ln +
      '" stroke-width="3" stroke-linecap="round" opacity=".45"/>';
    o += '<path d="M ' + pt(CX - b.fw * 0.15, F.mouthY) + ' Q ' + pt(CX, F.mouthY + 9) +
      ' ' + pt(CX + b.fw * 0.15, F.mouthY) + '" fill="none" stroke="' + p.skin.ln +
      '" stroke-width="3.4" stroke-linecap="round"/>';
    if (spec.beard) {
      o += '<path d="M ' + pt(CX - b.fw * 0.62, F.mouthY - 18) +
        ' Q ' + pt(CX, F.mouthY + 62) + ' ' + pt(CX + b.fw * 0.62, F.mouthY - 18) +
        ' Q ' + pt(CX, F.mouthY + 14) + ' ' + pt(CX - b.fw * 0.62, F.mouthY - 18) + ' Z" fill="' + p.hair.mid + '"/>';
    }
    if (spec.blush) {
      [-1, 1].forEach(function (s) {
        o += '<ellipse cx="' + n(CX + s * b.fw * 0.62) + '" cy="' + n(F.eyeY + 44) + '" rx="' + n(b.fw * 0.20) +
          '" ry="' + n(b.fw * 0.08) + '" fill="' + p.blush + '" opacity=".28"/>';
      });
    }

    o += style(p, b, false);     /* 髪の前面 */

    /* 髪の艶 */
    if (!hooded) {
      o += '<path d="M ' + pt(CX - b.fw * 0.78, F.skullY + 26) +
        ' Q ' + pt(CX - b.fw * 0.10, F.skullY + 6) + ' ' + pt(CX + b.fw * 0.62, F.skullY + 30) +
        ' Q ' + pt(CX - b.fw * 0.10, F.skullY + 22) + ' ' + pt(CX - b.fw * 0.78, F.skullY + 26) +
        ' Z" fill="url(#hg)"/>';
    }
    if (spec.circlet) {
      o += '<path d="M ' + pt(CX - b.fw * 0.92, F.browY - 18) + ' Q ' + pt(CX, F.browY + 4) +
        ' ' + pt(CX + b.fw * 0.92, F.browY - 18) + '" fill="none" stroke="' + p.accent.mid + '" stroke-width="7"/>';
      o += '<circle cx="' + CX + '" cy="' + n(F.browY - 2) + '" r="8" fill="' + p.accent.hi + '"/>';
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

  return { svg: svg, dataUrl: dataUrl, img: img, VW: VW, VH: VH, FACE: FACE, BUILD: BUILD, HAIR: HAIR };
})();
