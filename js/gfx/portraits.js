/* portraits.js - キャラクターの立ち絵（手続き生成）
 *
 * 画像ファイルは1枚も持たない。48×84のドットを毎回コードで組み立てて描く。
 * 敵・職業のスプライトが16×16なのに対し、こちらは会話用に大きく、
 * 髪・顔・装い・得物を人物ごとに描き分けられるようにしてある。
 *
 * 描き方は「部品の重ね合わせ」。体型→脚→胴→腕→頭→髪→得物 の順に置き、
 * 最後に輪郭を1px巻く。輪郭があるとどの背景でもシルエットが立つ。
 */
G.Portraits = (function () {
  var W = 48, H = 84;
  var CX = 24;            /* 体の中心 */

  /* ===================== ドットの下地 ===================== */

  function Grid() {
    this.d = new Array(W * H);
    for (var i = 0; i < W * H; i++) this.d[i] = null;
  }
  Grid.prototype.get = function (x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return null;
    return this.d[y * W + x];
  };
  Grid.prototype.set = function (x, y, c) {
    if (!c || x < 0 || y < 0 || x >= W || y >= H) return;
    this.d[y * W + x] = c;
  };
  Grid.prototype.rect = function (x, y, w, h, c) {
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.set(x + i, y + j, c);
  };
  /** 中心 cx から左右対称に幅 w を置く */
  Grid.prototype.bar = function (cx, y, w, c) {
    var x0 = Math.round(cx - w / 2);
    for (var i = 0; i < w; i++) this.set(x0 + i, y, c);
  };
  /** 上底 w0 → 下底 w1 の台形。体幹や裾に使う */
  Grid.prototype.taper = function (cx, y0, y1, w0, w1, c) {
    var n = y1 - y0;
    for (var j = 0; j <= n; j++) {
      var w = Math.round(w0 + (w1 - w0) * (n ? j / n : 0));
      this.bar(cx, y0 + j, w, c);
    }
  };
  /** 楕円。頭や肩に使う */
  Grid.prototype.ellipse = function (cx, cy, rx, ry, c) {
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        var dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1.02) this.set(x, y, c);
      }
    }
  };
  /** すでに色が置かれている所だけ塗り替える（陰影を後から乗せる） */
  Grid.prototype.shade = function (x, y, w, h, c) {
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      if (this.get(x + i, y + j)) this.set(x + i, y + j, c);
    }
  };

  /* ===================== パレット ===================== */

  function hsl(h, s, l) {
    return 'hsl(' + (((h % 360) + 360) % 360) + ',' + G.U.clamp(s, 0, 100) + '%,' + G.U.clamp(l, 0, 100) + '%)';
  }
  /** 明・中・暗の3段を作る。ドット絵は3段あれば立体に見える。 */
  function ramp(h, s, l) {
    return { hi: hsl(h, s * 0.85, Math.min(94, l * 1.28)), mid: hsl(h, s, l), lo: hsl(h, Math.min(90, s * 1.1), l * 0.66) };
  }

  function palette(spec) {
    var skin = ramp(spec.skinHue != null ? spec.skinHue : 26, spec.skinSat != null ? spec.skinSat : 40,
                    spec.skinLum != null ? spec.skinLum : 68);
    return {
      skin: skin,
      hair: ramp(spec.hairHue, spec.hairSat != null ? spec.hairSat : 40, spec.hairLum != null ? spec.hairLum : 34),
      cloth: ramp(spec.hue, spec.sat != null ? spec.sat : 42, spec.lum != null ? spec.lum : 45),
      accent: ramp(spec.accent, spec.accentSat != null ? spec.accentSat : 55, spec.accentLum != null ? spec.accentLum : 52),
      blushC: hsl(8, 55, 70),
      mouth: hsl(6, 34, Math.max(24, (spec.skinLum != null ? spec.skinLum : 68) * 0.55)),
      metal: ramp(spec.metalHue != null ? spec.metalHue : 210, 12, 58),
      leather: ramp(28, 34, 32),
      eye: spec.eye || '#2a2f3d',
      line: hsl(spec.hue, 35, 12)
    };
  }

  /* ===================== 部品 ===================== */

  /** 体型ごとの寸法。ここを変えるだけで人物の印象が決まる。 */
  var BUILD = {
    slim:   { sh: 17, waist: 12, hip: 14, headR: 7.6, legW: 6, armW: 4 },
    normal: { sh: 20, waist: 14, hip: 16, headR: 7.8, legW: 6, armW: 4 },
    heavy:  { sh: 25, waist: 19, hip: 20, headR: 8.2, legW: 8, armW: 5 }
  };

  /* 縦の骨格。頭を大きめに取り、顔が読めるようにしてある。 */
  function geom(spec) {
    var b = BUILD[spec.build] || BUILD.normal;
    var headCy = 15;
    return {
      b: b,
      headCy: headCy,
      chin: Math.round(headCy + b.headR),
      shoulder: Math.round(headCy + b.headR) + 4,
      waistY: 52,
      hipY: 57,
      footY: 78
    };
  }

  /* --- 脚と靴 --- */
  function legs(g, p, gm, spec) {
    var b = gm.b, boot = spec.bootHue != null ? ramp(spec.bootHue, 30, 30) : p.leather;
    var inner = 1;                       /* 左右の脚のあいだ */
    [-1, 1].forEach(function (side) {
      var x0 = (side < 0) ? CX - inner - b.legW : CX + inner;
      for (var y = gm.hipY; y <= gm.footY; y++) {
        var t = (y - gm.hipY) / (gm.footY - gm.hipY);
        var w = Math.max(4, Math.round(b.legW - t * 1.5));
        var xs = (side < 0) ? x0 + (b.legW - w) : x0;
        var isBoot = y >= gm.footY - 9;
        var c = isBoot ? boot.mid : p.cloth.lo;
        for (var i = 0; i < w; i++) g.set(xs + i, y, c);
        /* 内側の面を落とす */
        g.set(side < 0 ? xs + w - 1 : xs, y, isBoot ? boot.lo : hslShift(c));
        /* 外側に受光 */
        if (side < 0) g.set(xs, y, isBoot ? boot.hi : p.cloth.mid);
      }
      /* 靴先 */
      var fw = b.legW + 2;
      var fx = (side < 0) ? CX - inner - fw : CX + inner;
      g.rect(fx, gm.footY + 1, fw, 2, boot.mid);
      g.rect(fx, gm.footY + 2, fw, 1, boot.lo);
    });
  }
  function hslShift(c) { return c; }

  /* --- 胴 --- */
  function torso(g, p, gm, spec) {
    var b = gm.b, top = gm.shoulder;
    if (spec.robe) {
      g.taper(CX, top, gm.waistY, b.sh, b.waist + 2, p.cloth.mid);
      g.taper(CX, gm.waistY + 1, gm.footY + 2, b.waist + 3, b.hip + 8, p.cloth.mid);
    } else {
      g.taper(CX, top, gm.waistY, b.sh, b.waist, p.cloth.mid);
      g.taper(CX, gm.waistY + 1, gm.hipY + 1, b.waist + 1, b.hip, p.cloth.mid);
    }
    var bot = spec.robe ? gm.footY + 2 : gm.hipY + 1;
    /* 左から光。右に落ちる面を暗く、左端を明るく。 */
    for (var y = top; y <= bot; y++) {
      for (var x = CX + 4; x < W; x++) if (g.get(x, y) === p.cloth.mid) g.set(x, y, p.cloth.lo);
      for (var x2 = CX - 10; x2 < CX - 5; x2++) if (g.get(x2, y) === p.cloth.mid) g.set(x2, y, p.cloth.hi);
    }
    /* 法衣の襞 */
    if (spec.robe) {
      for (var fy = gm.waistY + 3; fy <= gm.footY + 1; fy++) {
        g.shade(CX - 7, fy, 1, 1, p.cloth.lo);
        g.shade(CX + 2, fy, 1, 1, p.cloth.hi);
      }
    }
    /* 襟と胸元 */
    g.rect(CX - 3, top, 6, 3, p.skin.mid);
    g.rect(CX - 3, top + 2, 6, 1, p.skin.lo);
    g.rect(CX - 5, top - 1, 3, 2, p.cloth.hi);
    g.rect(CX + 2, top - 1, 3, 2, p.cloth.lo);
  }

  /* --- 帯・ベルト --- */
  function belt(g, p, gm, spec) {
    var b = gm.b, c = spec.beltAccent ? p.accent : p.leather;
    g.bar(CX, gm.waistY, b.waist + 3, c.mid);
    g.bar(CX, gm.waistY + 1, b.waist + 3, c.lo);
    g.rect(CX - 2, gm.waistY, 4, 2, p.metal.hi);
    g.rect(CX - 2, gm.waistY + 1, 4, 1, p.metal.mid);
  }

  /* --- 腕 --- */
  function arms(g, p, gm, spec) {
    var b = gm.b, sx = Math.round(b.sh / 2);
    var hands = {};
    [-1, 1].forEach(function (side) {
      var x = (side < 0) ? CX - sx - 1 : CX + sx - b.armW + 1;
      var raise = (side > 0 && spec.raiseRight) ? 8 : 0;
      var top = gm.shoulder + 1 - raise;
      var bot = gm.waistY + 5 - raise;
      var sleeveTo = top + Math.round((bot - top) * (spec.robe ? 0.78 : 0.52));
      for (var y = top; y <= bot; y++) {
        var c = (y <= sleeveTo) ? (side < 0 ? p.cloth.mid : p.cloth.lo) : p.skin.mid;
        for (var i = 0; i < b.armW; i++) g.set(x + i, y, c);
        /* 胴との境に影を1本入れて腕を独立させる */
        g.set(side < 0 ? x + b.armW - 1 : x, y, (y <= sleeveTo) ? p.cloth.lo : p.skin.lo);
        if (side < 0 && y <= sleeveTo) g.set(x, y, p.cloth.hi);
      }
      /* 手 */
      g.rect(x, bot + 1, b.armW, 3, p.skin.mid);
      g.rect(x, bot + 3, b.armW, 1, p.skin.lo);
      hands[side] = { x: x, y: bot + 1, w: b.armW };
    });
    if (spec.pauldron) {
      [-1, 1].forEach(function (side) {
        var cx = (side < 0) ? CX - sx + 1 : CX + sx - 1;
        g.ellipse(cx, gm.shoulder + 2, b.armW / 2 + 2.4, 3.2, p.metal.mid);
        g.shade(cx - 4, gm.shoulder + 4, 9, 2, p.metal.lo);
        g.shade(cx - 3, gm.shoulder, 4, 1, p.metal.hi);
      });
    }
    return hands;
  }

  /* --- マント --- */
  function cape(g, p, gm, spec) {
    if (!spec.cape) return;
    var ch = spec.capeHue != null ? spec.capeHue : spec.accent;
    /* 服と近い色だと輪郭に埋もれるので、明度で必ず差をつける */
    var clum = (spec.lum != null ? spec.lum : 45);
    var b = gm.b, c = ramp(ch, 46, Math.max(16, clum * 0.58));
    /* 体より広く取ることで、正面からでも左右に見える */
    g.taper(CX, gm.shoulder - 1, gm.footY - 1, b.sh + 6, b.hip + 18, c.mid);
    for (var y = gm.shoulder - 1; y <= gm.footY - 1; y++) {
      for (var x = CX + 2; x < W; x++) if (g.get(x, y) === c.mid) g.set(x, y, c.lo);
      for (var x2 = 0; x2 < CX - 9; x2++) if (g.get(x2, y) === c.mid) g.set(x2, y, c.hi);
    }
    /* 留め具 */
    g.rect(CX - 2, gm.shoulder - 1, 4, 2, p.accent.mid);
  }

  /* --- 頭・顔 --- */
  function head(g, p, gm, spec) {
    var b = gm.b, cy = gm.headCy, r = b.headR;
    /* 首 */
    g.rect(CX - 3, gm.chin - 2, 6, 5, p.skin.mid);
    g.rect(CX - 3, gm.chin - 2, 6, 2, p.skin.lo);   /* 顎の影 */
    /* 頭蓋 */
    g.ellipse(CX, cy, r, r + 1, p.skin.mid);
    /* 顎を絞る */
    g.bar(CX, Math.round(cy + r), Math.round(r * 1.5), p.skin.mid);
    g.bar(CX, Math.round(cy + r) + 1, Math.round(r * 1.0), p.skin.mid);
    /* 左から光 */
    for (var y = Math.round(cy - r) - 1; y <= Math.round(cy + r) + 1; y++) {
      for (var x = CX + 3; x < W; x++) if (g.get(x, y) === p.skin.mid) g.set(x, y, p.skin.lo);
      for (var x2 = CX - Math.round(r); x2 < CX - 4; x2++) if (g.get(x2, y) === p.skin.mid) g.set(x2, y, p.skin.hi);
    }

    var ey = Math.round(cy + 1);
    /* 目。白目・瞳・上まぶたの3層で表情が出る */
    [-1, 1].forEach(function (s2) {
      var x = (s2 < 0) ? CX - 6 : CX + 3;
      g.rect(x, ey, 3, 3, '#f4f1e8');
      g.rect(x + (s2 < 0 ? 1 : 0), ey, 2, 3, p.eye);       /* 瞳は内寄り */
      g.rect(x, ey - 1, 3, 1, p.hair.lo);                  /* 上まぶた */
      g.set(x + (s2 < 0 ? 1 : 0), ey, '#ffffff');          /* 光点 */
    });
    /* 眉 */
    var by = ey - 3 - (spec.brow || 0);
    g.rect(CX - 7, by, 4, 1, p.hair.lo);
    g.rect(CX + 3, by, 4, 1, p.hair.lo);
    if (spec.brow < 0) { g.set(CX - 3, by + 1, p.hair.lo); g.set(CX + 3, by + 1, p.hair.lo); }
    /* 鼻 */
    g.rect(CX, ey + 3, 1, 2, p.skin.lo);
    /* 口 */
    g.rect(CX - 2, ey + 6, 4, 1, p.skin.lo);
    /* 頬の赤み */
    if (spec.blush) {
      g.set(CX - 6, ey + 4, p.blushC); g.set(CX - 5, ey + 4, p.blushC);
      g.set(CX + 5, ey + 4, p.blushC); g.set(CX + 6, ey + 4, p.blushC);
    }
    /* 髭 */
    if (spec.beard) {
      g.rect(CX - 6, ey + 4, 12, 5, p.hair.mid);
      g.rect(CX - 6, ey + 7, 12, 2, p.hair.lo);
      g.rect(CX - 2, ey + 5, 4, 1, p.skin.lo);            /* 口をのぞかせる */
      g.rect(CX - 8, ey, 2, 5, p.hair.mid);               /* もみあげ */
      g.rect(CX + 6, ey, 2, 5, p.hair.lo);
    }
  }

  /* --- 髪 --- */
  var HAIR = {
    short: function (g, p, gm) {
      var cy = gm.headCy, r = gm.b.headR;
      g.ellipse(CX, cy - r * 0.55, r + 0.6, r * 0.62, p.hair.mid);
      g.rect(CX - Math.round(r) - 1, Math.round(cy - 3), 2, 7, p.hair.mid);
      g.rect(CX + Math.round(r) - 1, Math.round(cy - 3), 2, 7, p.hair.lo);
      /* 前髪の束 */
      g.rect(CX - 5, Math.round(cy - r) + 1, 4, 4, p.hair.hi);
      g.rect(CX - 1, Math.round(cy - r) + 2, 3, 3, p.hair.mid);
      g.rect(CX + 3, Math.round(cy - r) + 1, 3, 4, p.hair.lo);
    },
    crop: function (g, p, gm) {
      var cy = gm.headCy, r = gm.b.headR;
      g.ellipse(CX, cy - r * 0.72, r + 0.2, r * 0.48, p.hair.mid);
      g.shade(CX - 9, Math.round(cy - r) - 1, 18, 2, p.hair.hi);
      g.rect(CX - Math.round(r) - 1, Math.round(cy - 3), 2, 5, p.hair.lo);
      g.rect(CX + Math.round(r) - 1, Math.round(cy - 3), 2, 5, p.hair.lo);
    },
    long: function (g, p, gm) {
      var cy = gm.headCy, r = gm.b.headR;
      g.ellipse(CX, cy - r * 0.5, r + 1.4, r * 0.68, p.hair.mid);
      [-1, 1].forEach(function (s2) {
        var x = (s2 < 0) ? CX - Math.round(r) - 3 : CX + Math.round(r) + 1;
        for (var y = Math.round(cy - 3); y <= gm.shoulder + 12; y++) {
          var w = (y > gm.shoulder + 6) ? 2 : 3;
          for (var i = 0; i < w; i++) g.set(x + i, y, s2 < 0 ? p.hair.mid : p.hair.lo);
          if (s2 < 0) g.set(x, y, p.hair.hi);
        }
      });
      g.rect(CX - 7, Math.round(cy - r) + 1, 5, 4, p.hair.hi);
      g.rect(CX - 2, Math.round(cy - r) + 1, 4, 3, p.hair.mid);
      g.rect(CX + 2, Math.round(cy - r) + 1, 5, 4, p.hair.lo);
    },
    bob: function (g, p, gm) {
      var cy = gm.headCy, r = gm.b.headR;
      g.ellipse(CX, cy - r * 0.48, r + 1.4, r * 0.70, p.hair.mid);
      [-1, 1].forEach(function (s2) {
        var x = (s2 < 0) ? CX - Math.round(r) - 3 : CX + Math.round(r) + 1;
        for (var y = Math.round(cy - 3); y <= Math.round(cy + r) + 3; y++) {
          for (var i = 0; i < 3; i++) g.set(x + i, y, s2 < 0 ? p.hair.mid : p.hair.lo);
          if (s2 < 0) g.set(x, y, p.hair.hi);
        }
      });
      /* ぱっつん前髪 */
      g.rect(CX - 8, Math.round(cy - r) + 1, 16, 5, p.hair.mid);
      g.rect(CX - 8, Math.round(cy - r) + 1, 6, 4, p.hair.hi);
      g.rect(CX + 4, Math.round(cy - r) + 1, 4, 5, p.hair.lo);
    },
    tail: function (g, p, gm) {
      HAIR.short(g, p, gm);
      var cy = gm.headCy, r = gm.b.headR;
      var x = CX + Math.round(r) + 1;
      for (var y = Math.round(cy - 1); y <= gm.shoulder + 14; y++) {
        var w = (y > gm.shoulder + 8) ? 2 : 3;
        for (var i = 0; i < w; i++) g.set(x + i, y, p.hair.mid);
        g.set(x + w - 1, y, p.hair.lo);
      }
    },
    hood: function (g, p, gm, spec) {
      var cy = gm.headCy, r = gm.b.headR;
      /* 頭巾は法衣の続き。服と同系にしないと「長い髪」に見えてしまう。 */
      var hh = (spec && spec.hoodHue != null) ? spec.hoodHue
             : (spec && spec.hue != null) ? spec.hue : 0;
      var hl = (spec && spec.lum != null) ? Math.max(16, spec.lum * 0.8) : 26;
      var c = ramp(hh, (spec && spec.sat != null) ? spec.sat * 0.9 : 20, hl);
      /* 布のかぶり */
      g.ellipse(CX, cy - 0.4, r + 3, r + 2.4, c.mid);
      g.taper(CX, Math.round(cy + r) - 1, gm.shoulder + 3, Math.round(r * 2.6), Math.round(r * 3.4), c.mid);
      for (var y = Math.round(cy - r) - 3; y <= gm.shoulder + 3; y++) {
        for (var x = CX + 2; x < W; x++) if (g.get(x, y) === c.mid) g.set(x, y, c.lo);
        for (var x2 = 0; x2 < CX - 8; x2++) if (g.get(x2, y) === c.mid) g.set(x2, y, c.hi);
      }
      /* 頭巾の縁に受光 */
      g.shade(CX - Math.round(r) - 3, Math.round(cy - r) - 3, 2 * Math.round(r) + 6, 2, c.hi);
      /* 影に沈んだ顔 */
      g.ellipse(CX, cy + 1, r - 1.4, r - 0.4, p.skin.lo);
      var ey = Math.round(cy + 1);
      g.rect(CX - 6, ey, 3, 2, '#a8e6ff');
      g.rect(CX + 3, ey, 3, 2, '#a8e6ff');
      g.rect(CX - 5, ey, 1, 2, '#ffffff');
    }
  };

  /* --- 得物。手の位置に合わせて握らせる --- */
  var PROP = {
    sword: function (g, p, gm, hands) {
      var h = hands[1], x = h.x + 1;
      var grip = h.y;
      var len = Math.max(10, gm.footY - (grip + 6) - 2);
      g.rect(x, grip - 4, 2, 6, p.leather.mid);              /* 柄 */
      g.rect(x - 2, grip + 2, 6, 2, p.metal.lo);             /* 鍔 */
      g.rect(x - 1, grip + 4, 4, len, p.metal.mid);          /* 刀身 */
      g.rect(x - 1, grip + 4, 2, len, p.metal.hi);
      g.rect(x, grip + 4 + len, 2, 3, p.metal.mid);          /* 切先 */
      g.rect(x - 1, grip - 5, 4, 1, p.accent.mid);           /* 柄頭 */
    },
    greatsword: function (g, p, gm, hands) {
      /* 肩に担ぐように、刃を手から上へ伸ばす */
      var h = hands[1], x = h.x;
      var grip = h.y;
      var bladeBot = grip - 5;
      var bladeTop = Math.max(2, gm.headCy - 8);
      var len = bladeBot - bladeTop;
      g.rect(x, grip - 3, 3, 8, p.leather.mid);              /* 柄 */
      g.rect(x, grip - 3, 1, 8, p.leather.hi);
      g.rect(x - 1, grip + 5, 5, 2, p.accent.mid);           /* 柄頭 */
      g.rect(x - 3, bladeBot, 9, 2, p.metal.lo);             /* 鍔 */
      g.rect(x - 2, bladeTop, 7, len, p.metal.mid);          /* 刀身 */
      g.rect(x - 2, bladeTop, 3, len, p.metal.hi);
      g.rect(x - 1, bladeTop - 3, 5, 3, p.metal.mid);        /* 切先 */
      g.rect(x - 1, bladeTop - 3, 2, 3, p.metal.hi);
    },
    staff: function (g, p, gm, hands) {
      var h = hands[1], x = h.x + 1;
      var top = gm.shoulder - 16;
      g.rect(x, top, 3, gm.footY - top + 3, p.leather.mid);
      g.rect(x, top, 1, gm.footY - top + 3, p.leather.hi);
      g.ellipse(x + 1, top - 3, 4.2, 4.2, p.accent.mid);
      g.ellipse(x + 0.2, top - 4, 2, 2, p.accent.hi);
      g.rect(x - 1, top + 4, 5, 2, p.metal.mid);
    },
    mace: function (g, p, gm, hands) {
      var h = hands[1], x = h.x + 1;
      var grip = h.y;
      g.rect(x, grip - 4, 3, 13, p.leather.mid);
      g.rect(x, grip - 4, 1, 13, p.leather.hi);
      /* 角ばった鎚頭 */
      g.rect(x - 1, grip - 11, 5, 7, p.metal.mid);
      g.rect(x - 1, grip - 11, 2, 7, p.metal.hi);
      g.rect(x - 3, grip - 10, 2, 5, p.metal.lo);            /* 左の鍔 */
      g.rect(x + 4, grip - 10, 2, 5, p.metal.lo);            /* 右の鍔 */
      g.rect(x - 3, grip - 8, 9, 1, p.metal.hi);             /* 帯 */
      g.rect(x - 1, grip - 4, 5, 1, p.metal.lo);
      g.rect(x, grip - 13, 3, 2, p.accent.mid);              /* 頂の飾り */
    },
    book: function (g, p, gm, hands) {
      var h = hands[-1], x = h.x - 6;
      g.rect(x, h.y - 8, 8, 11, p.accent.mid);
      g.rect(x, h.y - 8, 8, 2, p.accent.hi);
      g.rect(x + 7, h.y - 8, 2, 11, '#efe8d4');
      g.rect(x + 2, h.y - 5, 3, 1, p.metal.hi);
    },
    none: function () {}
  };

  /* ===================== 組み立て ===================== */

  function build(spec) {
    var g = new Grid(), p = palette(spec), gm = geom(spec);
    cape(g, p, gm, spec);
    legs(g, p, gm, spec);
    torso(g, p, gm, spec);
    belt(g, p, gm, spec);
    /* 腕を先に置いて手の位置を得る。得物はその手に握らせる。 */
    var hands = arms(g, p, gm, spec);
    (PROP[spec.prop] || PROP.none)(g, p, gm, hands);
    /* 得物の上から手を描き直し、握っているように見せる */
    [-1, 1].forEach(function (side) {
      var h = hands[side];
      g.rect(h.x, h.y, h.w, 3, p.skin.mid);
      g.rect(h.x, h.y + 2, h.w, 1, p.skin.lo);
    });
    head(g, p, gm, spec);
    (HAIR[spec.hair] || HAIR.short)(g, p, gm, spec);
    if (spec.circlet) {
      var cy = gm.headCy, r = gm.b.headR;
      g.bar(CX, Math.round(cy - r) + 1, Math.round(r * 1.8), p.accent.mid);
      g.set(CX, Math.round(cy - r), p.accent.hi);
    }
    return { g: g, p: p };
  }

  /** 輪郭を1px巻く。背景がどんな色でもシルエットが立つ。 */
  function outline(g, color) {
    var add = [];
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      if (g.get(x, y)) continue;
      if (g.get(x - 1, y) || g.get(x + 1, y) || g.get(x, y - 1) || g.get(x, y + 1)) add.push([x, y]);
    }
    add.forEach(function (a) { g.set(a[0], a[1], color); });
  }

  /* ===================== バストアップ =====================
   * 会話では顔が読めることが全て。全身は縦72pxのうち顔が16pxしかないので、
   * 胸から上だけを別に組み、同じ画素数を顔に注ぎ込む。
   * 目・鼻・口・輪郭を全身版よりずっと細かく置ける。 */

  var BW = 52, BH = 60, BCX = 26;

  function BGrid() {
    this.w = BW; this.h = BH;
    this.d = new Array(BW * BH);
    for (var i = 0; i < BW * BH; i++) this.d[i] = null;
  }
  BGrid.prototype = Object.create(Grid.prototype);
  BGrid.prototype.constructor = BGrid;

  /** 座標の外枠だけ差し替えた版を使うため、Grid の関数を寸法非依存にしておく */
  function inB(x, y) { return !(x < 0 || y < 0 || x >= BW || y >= BH); }

  function bustGrid() {
    var g = new BGrid();
    g.get = function (x, y) { return inB(x, y) ? this.d[y * BW + x] : null; };
    g.set = function (x, y, c) { if (c && inB(x, y)) this.d[y * BW + x] = c; };
    return g;
  }

  /** y <= maxY の範囲だけに楕円を置く。髪が額や目を覆わないようにするため。 */
  function ellipseTo(g, cx, cy, rx, ry, c, maxY) {
    for (var y = Math.floor(cy - ry); y <= Math.min(maxY, Math.ceil(cy + ry)); y++) {
      for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        var dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1.02) g.set(x, y, c);
      }
    }
  }

  function buildBust(spec) {
    var g = bustGrid(), p = palette(spec);
    /* 顔の割付。頭を先に決め、そこから全ての位置を出す。 */
    var cy = 22, r = 15;
    var chinY   = cy + r + 2;          /* 顎先   39 */
    var browY   = cy - 5;              /* 眉     17 */
    var eyeY    = cy;                  /* 目     22 */
    var noseY   = cy + 7;              /* 鼻先   29 */
    var mouthY  = cy + 11;             /* 口     33 */
    var hairTo  = browY - 1;           /* 髪はここまで。額を残す。 */
    var neckY   = chinY;
    var hooded  = spec.hair === 'hood';

    /* --- 肩・胸 --- */
    var shW = { slim: 36, normal: 40, heavy: 48 }[spec.build] || 40;
    function shoulders() {
      g.taper(BCX, neckY + 5, BH - 1, shW - 10, shW + 4, p.cloth.mid);
      for (var y = neckY + 5; y < BH; y++) {
        for (var x = BCX + 4; x < BW; x++) if (g.get(x, y) === p.cloth.mid) g.set(x, y, p.cloth.lo);
        for (var x2 = 0; x2 < BCX - 11; x2++) if (g.get(x2, y) === p.cloth.mid) g.set(x2, y, p.cloth.hi);
      }
      g.taper(BCX, neckY + 5, neckY + 9, 16, 24, p.cloth.hi);   /* 襟 */
    }
    if (spec.cape) {
      var cc = ramp(spec.capeHue != null ? spec.capeHue : spec.accent, 46,
                    Math.max(16, (spec.lum != null ? spec.lum : 45) * 0.58));
      g.taper(BCX, neckY + 4, BH - 1, shW - 2, shW + 12, cc.mid);
      for (var cyy = neckY + 4; cyy < BH; cyy++) {
        for (var cxx = BCX + 2; cxx < BW; cxx++) if (g.get(cxx, cyy) === cc.mid) g.set(cxx, cyy, cc.lo);
      }
    }
    shoulders();
    if (spec.pauldron) {
      [-1, 1].forEach(function (side) {
        var px2 = BCX + side * (shW / 2 - 3);
        g.ellipse(px2, neckY + 9, 8.5, 5, p.metal.mid);
        g.shade(px2 - 9, neckY + 12, 19, 2, p.metal.lo);
        g.shade(px2 - 6, neckY + 5, 8, 2, p.metal.hi);
      });
    }
    if (spec.cape) { g.rect(BCX - 4, neckY + 4, 8, 4, p.accent.mid); g.rect(BCX - 4, neckY + 4, 4, 2, p.accent.hi); }

    /* --- 首 --- */
    g.rect(BCX - 4, neckY - 3, 8, 9, p.skin.mid);
    g.rect(BCX - 4, neckY - 3, 8, 3, p.skin.lo);       /* 顎が落とす影 */
    g.rect(BCX + 2, neckY - 3, 2, 9, p.skin.lo);

    /* --- 顔 --- */
    g.ellipse(BCX, cy, r, r + 1, p.skin.mid);
    g.bar(BCX, chinY - 3, Math.round(r * 1.30), p.skin.mid);
    g.bar(BCX, chinY - 2, Math.round(r * 1.00), p.skin.mid);
    g.bar(BCX, chinY - 1, Math.round(r * 0.70), p.skin.mid);
    g.bar(BCX, chinY,     Math.round(r * 0.42), p.skin.mid);
    for (var fy = cy - r - 1; fy <= chinY; fy++) {
      for (var fx = BCX + 5; fx < BW; fx++) if (g.get(fx, fy) === p.skin.mid) g.set(fx, fy, p.skin.lo);
      for (var fx2 = BCX - r - 1; fx2 < BCX - 8; fx2++) if (g.get(fx2, fy) === p.skin.mid) g.set(fx2, fy, p.skin.hi);
    }
    g.shade(BCX - 11, eyeY + 4, 4, 2, p.skin.hi);      /* 頬骨 */

    /* --- 目。顔幅30に対して片目6px、間隔6px。 --- */
    function eyes(irisC, pupilC) {
      [-1, 1].forEach(function (side) {
        var x = (side < 0) ? BCX - 9 : BCX + 3;
        g.rect(x, eyeY, 6, 4, '#f6f3ea');                    /* 白目 */
        g.rect(x + (side < 0 ? 1 : 1), eyeY, 4, 4, irisC);   /* 虹彩 */
        g.rect(x + 2, eyeY + 1, 2, 2, pupilC);               /* 瞳 */
        g.set(x + 1, eyeY, '#ffffff');                       /* 光点 */
        g.rect(x, eyeY - 1, 6, 1, p.hair.lo);                /* 上まつ毛 */
        g.rect(x, eyeY + 4, 6, 1, p.skin.lo);                /* 下まぶた */
      });
    }
    eyes(p.eye, '#141a27');

    /* --- 眉 --- */
    [-1, 1].forEach(function (side) {
      var x = (side < 0) ? BCX - 10 : BCX + 3;
      g.rect(x, browY, 7, 2, p.hair.mid);
      g.rect(x, browY, 7, 1, p.hair.lo);
      /* 眉尻を下げると柔らかく、上げると険しくなる */
      var tip = (side < 0) ? x : x + 5;
      g.rect(tip, browY + ((spec.brow || 0) < 0 ? 1 : -1), 2, 1, p.hair.mid);
    });

    /* --- 鼻 --- */
    g.rect(BCX - 1, noseY - 4, 2, 4, p.skin.lo);
    g.rect(BCX - 2, noseY, 4, 1, p.skin.lo);
    g.rect(BCX - 2, noseY - 1, 1, 1, p.skin.hi);

    /* --- 口 --- */
    g.rect(BCX - 3, mouthY, 7, 1, p.mouth);
    g.rect(BCX - 2, mouthY + 1, 5, 1, p.skin.lo);
    g.rect(BCX - 2, mouthY - 1, 4, 1, p.skin.hi);

    if (spec.beard) {
      g.rect(BCX - 10, mouthY - 3, 20, 8, p.hair.mid);
      g.rect(BCX - 10, mouthY + 3, 20, 3, p.hair.lo);
      g.rect(BCX - 3, mouthY, 7, 1, p.mouth);
      g.rect(BCX - r - 1, eyeY + 2, 3, 9, p.hair.mid);
      g.rect(BCX + r - 2, eyeY + 2, 3, 9, p.hair.lo);
    }

    /* --- 髪 / 頭巾 --- */
    if (hooded) {
      var hh = spec.hoodHue != null ? spec.hoodHue : spec.hue;
      var hc = ramp(hh, (spec.sat || 30) * 0.9, Math.max(16, (spec.lum || 30) * 0.8));
      /* 顔の外側だけを布で囲う */
      g.ellipse(BCX, cy - 1, r + 6, r + 5, hc.mid);
      g.taper(BCX, chinY - 4, BH - 1, Math.round(r * 2.6), Math.round(r * 3.2), hc.mid);
      /* 内側をくり抜いて顔を戻す */
      g.ellipse(BCX, cy + 1, r - 1, r, p.skin.lo);
      g.bar(BCX, chinY - 3, Math.round(r * 1.2), p.skin.lo);
      for (var hy = 0; hy < BH; hy++) {
        for (var hx = BCX + 3; hx < BW; hx++) if (g.get(hx, hy) === hc.mid) g.set(hx, hy, hc.lo);
        for (var hx2 = 0; hx2 < BCX - 15; hx2++) if (g.get(hx2, hy) === hc.mid) g.set(hx2, hy, hc.hi);
      }
      /* 影の中で目だけが光る */
      eyes('#8fd8f5', '#e8fbff');
      g.rect(BCX - 10, browY + 1, 7, 1, hc.lo);
      g.rect(BCX + 3, browY + 1, 7, 1, hc.lo);
      g.rect(BCX - 1, noseY - 3, 2, 3, '#00000022');
      g.rect(BCX - 3, mouthY, 7, 1, '#00000033');
    } else {
      /* 頭頂。額を残して眉の上で止める。 */
      ellipseTo(g, BCX, cy - r * 0.30, r + 2, r * 0.96, p.hair.mid, hairTo);
      for (var ay = 0; ay <= hairTo; ay++) {
        for (var ax = BCX + 4; ax < BW; ax++) if (g.get(ax, ay) === p.hair.mid) g.set(ax, ay, p.hair.lo);
        for (var ax2 = 0; ax2 < BCX - 10; ax2++) if (g.get(ax2, ay) === p.hair.mid) g.set(ax2, ay, p.hair.hi);
      }
      (BUST_HAIR[spec.hair] || BUST_HAIR.short)(g, p, cy, r, hairTo, spec, chinY);
      if (spec.circlet) {
        g.rect(BCX - 12, hairTo - 1, 24, 2, p.accent.mid);
        g.rect(BCX - 3, hairTo - 3, 6, 3, p.accent.hi);
      }
    }
    return { g: g, p: p };
  }

  /* 毛先。バストアップでは束の形が人物の印象を決める。 */
  var BUST_HAIR = {
    short: function (g, p, cy, r, hairTo) {
      g.rect(BCX - 14, hairTo - 4, 7, 5, p.hair.hi);         /* 前髪の束 */
      g.rect(BCX - 7, hairTo - 3, 6, 4, p.hair.mid);
      g.rect(BCX - 1, hairTo - 5, 6, 6, p.hair.mid);
      g.rect(BCX + 5, hairTo - 3, 8, 4, p.hair.lo);
      g.rect(BCX - r - 2, cy - 8, 3, 11, p.hair.mid);        /* もみあげ */
      g.rect(BCX + r - 1, cy - 8, 3, 11, p.hair.lo);
    },
    crop: function (g, p, cy, r, hairTo) {
      g.rect(BCX - 13, hairTo - 2, 26, 3, p.hair.mid);
      g.rect(BCX - 13, hairTo - 2, 9, 2, p.hair.hi);
      g.rect(BCX - r - 1, cy - 9, 2, 9, p.hair.mid);
      g.rect(BCX + r - 1, cy - 9, 2, 9, p.hair.lo);
    },
    long: function (g, p, cy, r, hairTo, spec, chinY) {
      [-1, 1].forEach(function (side) {
        for (var y = cy - 10; y < BH; y++) {
          var t = (y - (cy - 10)) / (BH - (cy - 10));
          var w = Math.round(5 + t * 4);                    /* 毛先へ向けて広がる */
          var off = Math.round(t * 2);
          var x = (side < 0) ? BCX - r - w + 1 - off : BCX + r - 1 + off;
          for (var i = 0; i < w; i++) g.set(x + i, y, side < 0 ? p.hair.mid : p.hair.lo);
          if (side < 0) { g.set(x, y, p.hair.hi); g.set(x + 1, y, p.hair.hi); }
          else g.set(x + w - 1, y, p.hair.lo);
        }
      });
      g.rect(BCX - 15, hairTo - 5, 8, 6, p.hair.hi);
      g.rect(BCX - 7, hairTo - 4, 7, 5, p.hair.mid);
      g.rect(BCX + 1, hairTo - 5, 7, 6, p.hair.lo);
    },
    bob: function (g, p, cy, r, hairTo, spec, chinY) {
      [-1, 1].forEach(function (side) {
        var x = (side < 0) ? BCX - r - 5 : BCX + r - 1;
        for (var y = cy - 10; y <= chinY + 2; y++) {
          for (var i = 0; i < 6; i++) g.set(x + i, y, side < 0 ? p.hair.mid : p.hair.lo);
          if (side < 0) { g.set(x, y, p.hair.hi); g.set(x + 1, y, p.hair.hi); }
        }
      });
      g.rect(BCX - 15, hairTo - 5, 30, 6, p.hair.mid);       /* ぱっつん */
      g.rect(BCX - 15, hairTo - 5, 10, 5, p.hair.hi);
      g.rect(BCX + 7, hairTo - 5, 8, 6, p.hair.lo);
    },
    tail: function (g, p, cy, r, hairTo, spec, chinY) {
      BUST_HAIR.short(g, p, cy, r, hairTo, spec, chinY);
      var x = BCX + r + 1;
      for (var y = cy - 5; y < BH; y++) {
        for (var i = 0; i < 5; i++) g.set(x + i, y, p.hair.mid);
        g.set(x + 4, y, p.hair.lo);
      }
      g.rect(x - 1, cy - 6, 7, 3, p.accent.mid);             /* 結び目 */
    }
  };

  /* ===================== 描画 ===================== */

  var cache = {};

  /** 輪郭は描画の直前に巻く。外周1pxぶんの余白は各グリッドが持っている。 */
  function paint(res, w, h, px) {
    outline2(res.g, w, h, 'rgba(6,8,14,.92)');
    var cv = document.createElement('canvas');
    cv.width = w * px; cv.height = h * px;
    var ctx = cv.getContext('2d');
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var c = res.g.get(x, y);
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x * px, y * px, px, px);
    }
    return cv.toDataURL();
  }
  function outline2(g, w, h, color) {
    var add = [];
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      if (g.get(x, y)) continue;
      if (g.get(x - 1, y) || g.get(x + 1, y) || g.get(x, y - 1) || g.get(x, y + 1)) add.push([x, y]);
    }
    add.forEach(function (a) { g.set(a[0], a[1], color); });
  }

  function draw(spec, px) {
    var key = 'f|' + JSON.stringify(spec) + '|' + px;
    if (cache[key]) return cache[key];
    return (cache[key] = paint(build(spec), W, H, px));
  }

  /** バストアップ。会話で顔を見せたいときはこちら。 */
  function drawBust(spec, px) {
    var key = 'b|' + JSON.stringify(spec) + '|' + px;
    if (cache[key]) return cache[key];
    return (cache[key] = paint(buildBust(spec), BW, BH, px));
  }

  /* ===================== 差し替え画像 =====================
   * PORTRAIT_ASSETS に宣言された画像が実在すればそちらを使い、
   * 無ければ手続き生成に戻る。起動時に一度だけ実在を確かめる。 */

  var assetReady = {};      /* パス -> 読み込めたか */

  function assetFor(spec, kind) {
    var table = G.PORTRAIT_ASSETS || {};
    var ids = [spec.id, spec.fallbackId].filter(Boolean);
    for (var i = 0; i < ids.length; i++) {
      var e = table[ids[i]];
      var path = e && e[kind];
      if (path && assetReady[path]) return path;
    }
    return null;
  }

  /** 宣言された画像を先に読み込んでおく。全部終わったら done を呼ぶ。 */
  function preload(done) {
    var table = G.PORTRAIT_ASSETS || {};
    var paths = [];
    Object.keys(table).forEach(function (id) {
      ['bust', 'full'].forEach(function (k) {
        var pth = table[id] && table[id][k];
        if (pth && paths.indexOf(pth) < 0) paths.push(pth);
      });
    });
    if (!paths.length) { if (done) done(0); return; }
    var left = paths.length, ok = 0;
    paths.forEach(function (pth) {
      var im = new Image();
      im.onload = function () { assetReady[pth] = true; ok++; if (!--left && done) done(ok); };
      im.onerror = function () { assetReady[pth] = false; if (!--left && done) done(ok); };
      im.src = pth;
    });
  }

  function img(spec, px, cls, attrs) {
    px = px || 3;
    var w = W * px, h = H * px;
    var file = assetFor(spec, 'full');
    return '<img class="portrait ' + (file ? 'drawn ' : '') + (cls || '') + '" src="' +
      (file || draw(spec, px)) +
      '" width="' + w + '" height="' + h + '" alt="" ' + (attrs || '') + '>';
  }
  function bustImg(spec, px, cls, attrs) {
    px = px || 3;
    var w = BW * px, h = BH * px;
    var file = assetFor(spec, 'bust');
    return '<img class="portrait bust ' + (file ? 'drawn ' : '') + (cls || '') + '" src="' +
      (file || drawBust(spec, px)) +
      '" width="' + w + '" height="' + h + '" alt="" ' + (attrs || '') + '>';
  }

  /** 会話で使う顔。用意した画像 → アニメ調 → ドット絵、の順に落ちる。 */
  function dialogImg(spec, h, cls, attrs) {
    h = h || 180;
    var file = assetFor(spec, 'bust');
    if (file) {
      var w = Math.round(h * BW / BH);
      return '<img class="portrait bust drawn ' + (cls || '') + '" src="' + file +
        '" width="' + w + '" height="' + h + '" alt="" ' + (attrs || '') + '>';
    }
    if (G.Anime && style() !== 'pixel') return G.Anime.img(spec, h, cls, attrs);
    return bustImg(spec, Math.max(1, Math.round(h / BH)), cls, attrs);
  }

  /** 絵柄の設定。'anime'（既定）か 'pixel'。 */
  function style() {
    var m = G.state && G.state.meta;
    return (m && m.portraitStyle) || 'anime';
  }
  function setStyle(v) {
    if (!G.state || !G.state.meta) return;
    G.state.meta.portraitStyle = (v === 'pixel') ? 'pixel' : 'anime';
    if (G.Save) G.Save.saveMeta(G.state);
  }

  return { draw: draw, img: img, drawBust: drawBust, bustImg: bustImg, dialogImg: dialogImg,
           style: style, setStyle: setStyle,
           build: build, buildBust: buildBust, preload: preload,
           W: W, H: H, BW: BW, BH: BH, HAIR: HAIR, PROP: PROP };
})();
