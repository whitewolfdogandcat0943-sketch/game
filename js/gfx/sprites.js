/* sprites.js - ドット絵スプライトの手続き生成
 *
 * 外部画像を一切使わず、16x16のドットマップ + HSLパレットから
 * Canvasで描画してdataURLにキャッシュする。
 *
 * ドットマップは「左半分8列」を定義し、右半分は鏡像として生成する。
 * これにより幅が常に16に揃い、生物的な左右対称のシルエットになる。
 *
 *   .  透明        o  輪郭
 *   1..5  暗→明のカラーランプ
 *   a,b   アクセント（金属・宝石・武器）明/暗
 *   e     瞳        w  ハイライト
 */
G.Gfx = (function () {

  var SIZE = 16;

  /* ===================== ドットマップ（左半分） ===================== */
  var ARCH = {
    /* --- 粘体 --- */
    slime: [
      "........", "........", "........", "......oo",
      ".....o45", "....o444", "...o4433", "..o44332",
      "..o4e332", ".o443322", ".o433222", "o4433221",
      "o4433222", "o3332211", ".ooooooo", "........"
    ],
    /* --- 蝙蝠 --- */
    bat: [
      "........", "........", "..o.....", ".o3o....",
      ".o33o...", ".o333o..", "..o333o.", "...o3333",
      "...o33e3", "....o333", "....o332", ".....o33",
      ".....o22", "......o2", "......oo", "........"
    ],
    /* --- 小型人型（大きな耳） --- */
    goblin: [
      "........", "........", ".....ooo", "...oo333",
      "...o3e33", "...o3333", "....ooo3", "....oaaa",
      "...o3aaa", "...o3aaa", "....o333", "....o222",
      "....o22.", "....o2..", "....oo..", "........"
    ],
    /* --- 大型人型（小さな頭・分厚い腕） --- */
    brute: [
      "........", "........", "......oo", ".....o33",
      ".....oe3", ".....o33", "....oooo", "..oaaaaa",
      ".o33aaaa", ".o33aaaa", "..o3aaaa", "..o33222",
      "...o222.", "...o22..", "...oo...", "........"
    ],
    /* --- 骸骨（肋骨の隙間） --- */
    skeleton: [
      "........", "........", ".....ooo", "....o555",
      "....o5e5", "....o555", ".....o5o", "......oo",
      "....o555", "...o5.55", "...o5.55", "....o555",
      "....o55.", "....o5..", "....oo..", "........"
    ],
    /* --- 法衣（袖と浮遊する光） --- */
    robed: [
      "........", "........", "......oo", ".....o33",
      "....o3e3", "....o333", "..a.o333", "...o3333",
      "..o33333", ".oa33333", ".o333333", ".o333322",
      "o3332222", "o3322222", "oooooooo", "........"
    ],
    /* --- 鳥 --- */
    bird: [
      "........", "........", "......oo", ".o....o4",
      "o4o..o44", "o44o.o44", "o444oo44", ".o44e444",
      ".o444444", "..o44433", "..o44333", "...o4433",
      "....o433", "....o4o3", "....oo..", "........"
    ],
    /* --- 樹木 --- */
    tree: [
      "........", "...ooooo", "..o44444", ".o444444",
      ".o44e444", "o4444444", "o4444444", ".o444444",
      "..oo3333", "....o211", "....o211", "....o221",
      "....o211", "...o2211", "..ooooo1", "........"
    ],
    /* --- 亡霊 --- */
    ghost: [
      "........", "........", "......oo", ".....o44",
      "....o444", "....o4e4", "....o444", "...o4444",
      "...o4443", "..o44333", "..o43333", "..o43332",
      "..o3332.", ".o33.o2.", ".oo...o.", "........"
    ],
    /* --- 岩石 --- */
    golem: [
      "........", "........", "....oooo", "....o333",
      "....o3e3", "....oooo", "..oo.o33", ".o22.o33",
      ".o22.o33", ".o22.o33", "..oo.o33", "....o333",
      "....o33.", "....o33.", "....oo..", "........"
    ],
    /* --- 甲冑騎士（バイザーと肩当て） --- */
    knight: [
      "........", "........", ".....ooo", "....oaaa",
      "....obeb", "....oaaa", ".....ooo", "..oaaaaa",
      ".oa5aaaa", "..oaaaaa", "...o3333", "...o3332",
      "....o22.", "....o22.", "....oo..", "........"
    ],
    /* --- 四足獣（角と四肢） --- */
    beast: [
      "........", "..o.....", "..o4..oo", "...o4o44",
      "...o44e4", "...o4444", "....oooo", "...o4444",
      "..o44444", ".o444444", ".o444444", ".o444444",
      ".o4o.o44", ".o2o.o22", ".oo...oo", "........"
    ],
    /* --- 竜 --- */
    dragon: [
      "........", "o.......", "oo.....o", "o3o...o4",
      "o33o..o4", "o333o.o4", "o3333oo4", ".o333444",
      ".o344e44", "..o44444", "..o44444", "...o4444",
      "...o4433", "..o44o33", "..oo..oo", "........"
    ],
    /* --- 天使 --- */
    angel: [
      "........", "........", "......oo", ".....o55",
      ".....oe5", "o....o55", "o5o.o555", "o55oo555",
      ".o555a55", ".o555555", "..o55555", "..o55444",
      "...o444.", "...o44..", "...oo...", "........"
    ],
    /* --- 光球 --- */
    orb: [
      "........", "........", "......oo", ".....o55",
      "....o555", "...o5544", "...o544w", "..o54444",
      "..o54444", "..o54444", "...o5444", "...o5443",
      "....o543", ".....o43", "......oo", "........"
    ],
    /* --- 虚無 --- */
    void: [
      "........", "......oo", "....oo22", "...o2222",
      "..o22211", "..o221ae", ".o2211aa", ".o221aaa",
      ".o2211aa", "..o22111", "..o22211", "...o2221",
      "....o222", ".....o22", "......oo", "........"
    ],
    /* --- 蠍（鋏と尾） --- */
    scorpion: [
      "........", ".......o", "......oa", "......o3",
      "..oo..o3", ".o33o.o3", ".o33oo33", "..o33333",
      "..o33e33", ".o333333", "o3333333", "o3333333",
      "o3o3o3o3", ".o.o.o.o", "........", "........"
    ],
    /* --- 結晶・鏡像 --- */
    mirror: [
      "........", ".......o", "......o5", ".....o55",
      "....o555", "...o5555", "..o55555", ".o555555",
      ".o5555w5", "..o55555", "...o5555", "....o555",
      ".....o55", "......o5", ".......o", "........"
    ],
    /* --- 軽装（フードと短剣） --- */
    hooded: [
      "........", "........", "......oo", ".....o22",
      "....o222", "....o2e2", "....o222", "...o2222",
      "..o22222", "..o2a222", "..o22222", "...o2222",
      "...o222.", "...o22..", "...oo...", "........"
    ],
    /* --- 重装（肩当てと胸甲） --- */
    warrior: [
      "........", "........", ".....ooo", "....o333",
      "....o3e3", "....o333", ".....ooo", "...oaaaa",
      "..oa5aaa", "...oaaaa", "...o3aaa", "....o333",
      "....o22.", "....o22.", "....oo..", "........"
    ]
  };

  /* 頭上に載せる装飾（最上級職の証） */
  var CROWN = [
    "....o.o.", "....oao.", "...oaaao", "....ooo."
  ];

  /* ===================== パレット ===================== */
  function hsl(h, s, l) {
    return 'hsl(' + ((h % 360) + 360) % 360 + ',' + G.U.clamp(s, 0, 100) + '%,' + G.U.clamp(l, 0, 100) + '%)';
  }

  function palette(spec) {
    var h = spec.hue, s = spec.sat != null ? spec.sat : 45, l = spec.lum != null ? spec.lum : 52;
    var ah = spec.accent != null ? spec.accent : (h + 40);
    return {
      o: hsl(h, Math.min(70, s + 10), Math.max(8, l * 0.28)),
      '1': hsl(h, s, l * 0.50),
      '2': hsl(h, s, l * 0.70),
      '3': hsl(h, s, l * 0.88),
      '4': hsl(h, s, l * 1.05),
      '5': hsl(h, Math.max(0, s - 10), Math.min(90, l * 1.25)),
      a: hsl(ah, spec.accentSat != null ? spec.accentSat : 55, 62),
      b: hsl(ah, spec.accentSat != null ? spec.accentSat : 55, 40),
      e: spec.eye || '#ffe066',
      w: 'rgba(255,255,255,.85)'
    };
  }

  /* ===================== 描画 ===================== */
  function expand(half) {
    var rows = [], i;
    for (i = 0; i < half.length; i++) {
      var l = half[i];
      while (l.length < 8) l += '.';
      rows.push(l + l.split('').reverse().join(''));
    }
    while (rows.length < SIZE) rows.push('................');
    return rows;
  }

  var cache = {};

  function draw(spec, px) {
    var key = spec.arch + '|' + spec.hue + '|' + spec.sat + '|' + spec.lum + '|' + spec.accent + '|' +
      spec.eye + '|' + (spec.crown ? 1 : 0) + '|' + px;
    if (cache[key]) return cache[key];

    var rows = expand(ARCH[spec.arch] || ARCH.slime);
    var pal = palette(spec);
    var cv = document.createElement('canvas');
    cv.width = SIZE * px; cv.height = SIZE * px;
    var ctx = cv.getContext('2d');

    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var ch = rows[r][c];
        if (!ch || ch === '.' || ch === ' ') continue;
        var col = pal[ch];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(c * px, r * px, px, px);
      }
    }
    /* 最上級職の冠 */
    if (spec.crown) {
      var cr = expand(CROWN);
      for (var r2 = 0; r2 < cr.length; r2++) {
        for (var c2 = 0; c2 < SIZE; c2++) {
          var ch2 = cr[r2][c2];
          if (!ch2 || ch2 === '.') continue;
          ctx.fillStyle = ch2 === 'a' ? '#ffd45e' : 'rgba(20,14,4,.9)';
          ctx.fillRect(c2 * px, r2 * px, px, px);
        }
      }
    }
    var url = cv.toDataURL();
    cache[key] = url;
    return url;
  }

  /* ===================== 個体ごとの設定 ===================== */
  var ENEMY_SPEC = {
    /* --- 試練の塔（北欧）--- */
    nm_draugr:     { arch: 'skeleton', hue: 150, sat: 18, lum: 46, eye: '#8cf0b0' },
    nm_ratatosk:   { arch: 'beast',    hue: 28,  sat: 62, lum: 52, eye: '#fff' },
    nm_hresvelgr:  { arch: 'bird',     hue: 205, sat: 42, lum: 58, eye: '#dff6ff' },
    nm_hrimthurs:  { arch: 'brute',    hue: 196, sat: 40, lum: 58, accent: 200, eye: '#eafaff' },
    nm_einherjar:  { arch: 'warrior',  hue: 42,  sat: 40, lum: 52, accent: 15 },
    nm_muspelspark:{ arch: 'orb',      hue: 16,  sat: 90, lum: 56, eye: '#fff0c0' },
    nm_nidhoggr_larva: { arch: 'scorpion', hue: 285, sat: 42, lum: 40, eye: '#c08cff' },
    nm_jotun:      { arch: 'golem',    hue: 150, sat: 20, lum: 44, eye: '#9fe8c0' },
    nm_valkyrie:   { arch: 'angel',    hue: 50,  sat: 55, lum: 64, eye: '#fff8d0' },
    nm_garmr:      { arch: 'beast',    hue: 340, sat: 38, lum: 38, eye: '#ff6b6b' },
    nm_surtsguard: { arch: 'knight',   hue: 12,  sat: 70, lum: 48, accent: 30, eye: '#ffd08c' },
    nm_vafthrudnir:{ arch: 'hooded',   hue: 265, sat: 34, lum: 44, eye: '#b98cff' },
    nb_fenrir:     { arch: 'beast',    hue: 220, sat: 18, lum: 42, accent: 0,   eye: '#8ca0c0' },
    nb_fenrir_true:{ arch: 'beast',    hue: 350, sat: 46, lum: 34, accent: 20,  eye: '#ff8c2a' },
    nb_jormungandr:{ arch: 'dragon',   hue: 140, sat: 52, lum: 40, eye: '#c8ff6b' },
    nb_surtr:      { arch: 'knight',   hue: 8,   sat: 82, lum: 46, accent: 34,  eye: '#fff0a0' },
    nb_hel:        { arch: 'robed',    hue: 255, sat: 30, lum: 38, accent: 150, eye: '#d0ffe8' },
    nb_nidhoggr:   { arch: 'dragon',   hue: 282, sat: 48, lum: 34, accent: 300, eye: '#ff6bd8' },
    slime:       { arch: 'slime',    hue: 120, sat: 48, lum: 50 },
    bat:         { arch: 'bat',      hue: 275, sat: 30, lum: 46 },
    goblin:      { arch: 'goblin',   hue: 95,  sat: 40, lum: 44, accent: 25 },
    wisp:        { arch: 'orb',      hue: 22,  sat: 85, lum: 55, eye: '#fff2c4' },
    skeleton:    { arch: 'skeleton', hue: 45,  sat: 14, lum: 70, eye: '#ff5a72' },
    orc:         { arch: 'brute',    hue: 100, sat: 30, lum: 42, accent: 20 },
    icewitch:    { arch: 'robed',    hue: 195, sat: 55, lum: 55, accent: 190, eye: '#dff6ff' },
    thundhawk:   { arch: 'bird',     hue: 48,  sat: 65, lum: 55, eye: '#fff' },
    treant:      { arch: 'tree',     hue: 110, sat: 35, lum: 42, accent: 30 },
    shade:       { arch: 'ghost',    hue: 268, sat: 40, lum: 44, eye: '#ff6b6b' },
    golem:       { arch: 'golem',    hue: 30,  sat: 14, lum: 46, eye: '#7ee0ff' },
    harpy:       { arch: 'bird',     hue: 320, sat: 40, lum: 55 },
    demonknight: { arch: 'knight',   hue: 350, sat: 45, lum: 40, accent: 350, accentSat: 30, eye: '#ff3b57' },
    archlich:    { arch: 'robed',    hue: 285, sat: 45, lum: 40, accent: 130, eye: '#a6ff7a' },
    salamander:  { arch: 'beast',    hue: 14,  sat: 70, lum: 48, eye: '#ffe066' },
    stormlord:   { arch: 'robed',    hue: 210, sat: 50, lum: 48, accent: 55, eye: '#ffe066' },
    mirrorknight:{ arch: 'mirror',   hue: 200, sat: 22, lum: 66, eye: '#ffffff' },
    seraph:      { arch: 'angel',    hue: 45,  sat: 30, lum: 68, accent: 280, eye: '#c08bff' },
    b_ogre:      { arch: 'brute',    hue: 8,   sat: 40, lum: 45, accent: 35, eye: '#ffe066' },
    b_frostqueen:{ arch: 'robed',    hue: 188, sat: 60, lum: 60, accent: 200, eye: '#ffffff' },
    b_thornbeast:{ arch: 'scorpion', hue: 275, sat: 45, lum: 45, eye: '#ff5a72' },
    b_stormdrake:{ arch: 'dragon',   hue: 205, sat: 55, lum: 50, eye: '#ffe066' },
    b_voidlord:  { arch: 'void',     hue: 282, sat: 50, lum: 38, accent: 300, eye: '#ff5fd2' },
    b_worldmirror:{arch: 'mirror',   hue: 300, sat: 35, lum: 62, accent: 190, eye: '#ff5fd2' }
  };

  var CLASS_SPEC = {
    fenrir:         { arch: 'beast',   hue: 348, sat: 40, lum: 40, accent: 25, eye: '#ff8c2a' },
    swordsman:      { arch: 'warrior', hue: 210, sat: 35, lum: 52, accent: 45 },
    mage:           { arch: 'robed',   hue: 265, sat: 45, lum: 52, accent: 190 },
    rogue:          { arch: 'hooded',  hue: 150, sat: 30, lum: 46, accent: 45 },
    priest:         { arch: 'robed',   hue: 48,  sat: 35, lum: 68, accent: 200 },
    berserker:      { arch: 'brute',   hue: 355, sat: 45, lum: 45, accent: 35 },
    assassin:       { arch: 'hooded',  hue: 285, sat: 35, lum: 40, accent: 340 },
    elementalist:   { arch: 'robed',   hue: 175, sat: 55, lum: 52, accent: 30 },
    guardian:       { arch: 'knight',  hue: 215, sat: 30, lum: 50, accent: 200, accentSat: 20 },
    stormcaller:    { arch: 'robed',   hue: 150, sat: 50, lum: 55, accent: 55 },
    alchemist:      { arch: 'robed',   hue: 35,  sat: 50, lum: 55, accent: 130 },
    exorcist:       { arch: 'robed',   hue: 50,  sat: 25, lum: 70, accent: 280 },
    windrunner:     { arch: 'hooded',  hue: 165, sat: 45, lum: 52, accent: 55 },
    hexer:          { arch: 'robed',   hue: 278, sat: 45, lum: 44, accent: 120, eye: '#a6ff7a' },
    bard:           { arch: 'robed',   hue: 44,  sat: 62, lum: 58, accent: 200, eye: '#ffe08a' },
    binder:         { arch: 'robed',   hue: 258, sat: 40, lum: 38, accent: 300, eye: '#c89dff' },
    plaguedoctor:   { arch: 'robed',   hue: 96,  sat: 34, lum: 34, accent: 70,  eye: '#c8ff8a' },
    spellblade:     { arch: 'warrior', hue: 258, sat: 40, lum: 50, accent: 25 },
    phantomSaint:   { arch: 'hooded',  hue: 265, sat: 40, lum: 38, accent: 50, crown: true, eye: '#ff5fd2' },
    /* 仲間だけの最上級職 */
    dawnMother:     { arch: 'angel',   hue: 44,  sat: 34, lum: 70, accent: 200, crown: true, eye: '#8fe6ff' },
    undyingAegis:   { arch: 'robed',   hue: 48,  sat: 26, lum: 66, accent: 205, crown: true, eye: '#ffffff' },
    ironBastion:    { arch: 'golem',   hue: 18,  sat: 26, lum: 44, accent: 35,  crown: true, eye: '#ffd27a' },
    wrathBulwark:   { arch: 'brute',   hue: 6,   sat: 44, lum: 36, accent: 30,  crown: true, eye: '#ff7a4a' },
    worldTheorem:   { arch: 'robed',   hue: 278, sat: 44, lum: 44, accent: 190, crown: true, eye: '#c8b4ff' },
    stillCalamity:  { arch: 'ghost',   hue: 286, sat: 38, lum: 32, accent: 130, crown: true, eye: '#9dffb0' },
    mirrorEmperor:  { arch: 'knight',  hue: 195, sat: 30, lum: 62, accent: 190, accentSat: 25, crown: true },
    calamityKing:   { arch: 'robed',   hue: 155, sat: 55, lum: 55, accent: 50, crown: true },
    astralArchmage: { arch: 'robed',   hue: 250, sat: 55, lum: 55, accent: 55, crown: true, eye: '#fff3c4' },
    alchemySovereign:{arch: 'robed',   hue: 30,  sat: 60, lum: 58, accent: 130, crown: true },
    bloodfiend:     { arch: 'brute',   hue: 350, sat: 55, lum: 42, accent: 0,   crown: true, eye: '#ff3b57' },
    finalArbiter:   { arch: 'angel',   hue: 45,  sat: 30, lum: 70, accent: 280, crown: true },
    voidSovereign:  { arch: 'void',    hue: 288, sat: 50, lum: 42, accent: 300, crown: true, eye: '#ff5fd2' },
    skyrunner:      { arch: 'hooded',  hue: 155, sat: 55, lum: 58, accent: 45,  crown: true },
    plaguelord:     { arch: 'robed',   hue: 292, sat: 50, lum: 42, accent: 110, crown: true, eye: '#a6ff7a' },
    graceEmperor:   { arch: 'angel',   hue: 46,  sat: 58, lum: 66, accent: 200, crown: true, eye: '#ffe6a0' },
    ruinEmperor:    { arch: 'ghost',   hue: 262, sat: 46, lum: 30, accent: 305, crown: true, eye: '#d0a8ff' },
    rotKing:        { arch: 'robed',   hue: 100, sat: 40, lum: 28, accent: 70,  crown: true, eye: '#a6ff7a' },
    poleEmperor:    { arch: 'warrior', hue: 232, sat: 45, lum: 54, accent: 45,  crown: true }
  };

  /* ハッシュで未登録IDにも安定した見た目を与える */
  function hash(str) {
    var h = 2166136261, i;
    for (i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h;
  }
  function fallback(id) {
    var h = hash(id);
    var keys = Object.keys(ARCH);
    return { arch: keys[h % keys.length], hue: h % 360, sat: 40, lum: 50 };
  }

  function enemySpec(id) { return ENEMY_SPEC[id] || fallback(id); }
  function classSpec(id) { return CLASS_SPEC[id] || fallback(id); }

  /* ===================== 装備アイコン ===================== */
  var GEAR_ARCH = {
    weapon: [
      "........", "........", ".......a", "......5a",
      "......5a", "......5a", "......5a", "......5a",
      "......5a", "....bbbb", ".......b", ".......b",
      "......bb", ".......b", "........", "........"
    ],
    armor: [
      "........", "........", "...ooo..", "..oaaa..",
      "..oaaaaa", "..oa3aaa", "..o33aaa", "..o333aa",
      "..o3333a", "..o33333", "...o3333", "...o3332",
      "....oo22", ".....ooo", "........", "........"
    ],
    acc: [
      "........", "........", "........", "......oo",
      ".....oaa", "....oaa5", "....oa5.", "....oa5.",
      "....oa5.", "....oaa5", ".....oaa", "......oo",
      "........", "........", "........", "........"
    ],
    item: [
      "........", "......oo", "......o5", "......o5",
      ".....oa5", "....oa55", "...oa555", "...oa555",
      "...oa555", "...oa555", "...oa555", "....oa55",
      ".....ooo", "........", "........", "........"
    ]
  };
  Object.keys(GEAR_ARCH).forEach(function (k) { ARCH['icon_' + k] = GEAR_ARCH[k]; });

  var RARITY_HUE = { common: 210, normal: 200, rare: 200, legend: 32, mythic: 315 };

  function iconSpec(kind, rarity, hue) {
    return {
      arch: 'icon_' + kind,
      hue: hue != null ? hue : (RARITY_HUE[rarity] != null ? RARITY_HUE[rarity] : 210),
      sat: rarity === 'mythic' ? 60 : (rarity === 'legend' ? 55 : 30),
      lum: 58,
      accent: RARITY_HUE[rarity] != null ? RARITY_HUE[rarity] : 210,
      accentSat: rarity === 'mythic' ? 70 : (rarity === 'legend' ? 65 : 25)
    };
  }


  /* ===================== マップのノードアイコン ===================== */
  var NODE_ARCH = {
    battle: [
      "........", "........", ".......a", "......5a",
      "......5a", "......5a", "......5a", "......5a",
      "....bbbb", ".......b", ".......b", "......bb",
      ".......b", "........", "........", "........"
    ],
    elite: [
      "........", "........", "....oooo", "...o5555",
      "...o5bb5", "...o5555", "....o5o5", "....o555",
      "....o5.5", "....o5.5", ".....ooo", "........",
      "........", "........", "........", "........"
    ],
    treasure: [
      "........", "........", "...ooooo", "..o33333",
      "..o3a333", "..oooooo", "..o22222", "..o22a22",
      "..o22222", "..ooooo2", "........", "........",
      "........", "........", "........", "........"
    ],
    shop: [
      "........", "........", "......oo", ".....o3o",
      "....o333", "...o3333", "..o33a33", "..o33333",
      "..o33333", "..o33333", "...ooooo", "........",
      "........", "........", "........", "........"
    ],
    rest: [
      "........", "........", "......oo", ".....o44",
      "....o444", "....o4a4", "...o4444", "...o4444",
      "...o4444", "..obbbbb", "...ooooo", "........",
      "........", "........", "........", "........"
    ],
    altar: [
      "........", ".ooooooo", ".o555555", "..oooooo",
      "..o55555", "...ooooo", "....55..", "....55..",
      "....55..", "....55..", "....55..", "...oooo.",
      "........", "........", "........", "........"
    ],
    event: [
      "........", "........", ".......o", "......oa",
      "......oa", ".....oaa", "...ooaaa", "oaaaaaaa",
      "...ooaaa", ".....oaa", "......oa", "......oa",
      ".......o", "........", "........", "........"
    ],
    boss: [
      "........", "........", "....o.o.", "...oaoao",
      "...oaaao", "..oaaaaa", "..obbbbb", "...ooooo",
      "........", "........", "........", "........",
      "........", "........", "........", "........"
    ]
  };
  Object.keys(NODE_ARCH).forEach(function (k) { ARCH['node_' + k] = NODE_ARCH[k]; });

  var NODE_HUE = { battle: 210, elite: 285, treasure: 45, shop: 130, rest: 25, altar: 355, event: 190, boss: 45 };

  function nodeImg(kind, px) {
    var hue = NODE_HUE[kind] != null ? NODE_HUE[kind] : 200;
    return img({ arch: 'node_' + kind, hue: hue, sat: 45, lum: 58, accent: hue, accentSat: 60 }, px || 3, 'node-ico');
  }

  /* ===================== 公開API ===================== */
  /** <img> タグ文字列を返す（innerHTML再構築でも使えるようdataURL） */
  function img(spec, px, cls, attrs) {
    var url = draw(spec, px);
    return '<img class="spr ' + (cls || '') + '" src="' + url + '" alt="" ' + (attrs || '') + '>';
  }
  function enemyImg(id, px, cls, attrs) { return img(enemySpec(id), px, cls, attrs); }
  function classImg(id, px, cls, attrs) { return img(classSpec(id), px, cls, attrs); }

  /** 仲間の見た目。職業の絵型を土台に、その人の色で描き分ける。 */
  function allySpec(def) {
    var base = classSpec(def.classId);
    var spec = {};
    for (var k in base) spec[k] = base[k];
    if (def.arch) spec.arch = def.arch;
    if (def.hue != null) spec.hue = def.hue;
    if (def.accent != null) spec.accent = def.accent;
    return spec;
  }
  function allyImg(def, px, cls, attrs) { return img(allySpec(def), px, cls, attrs); }

  /** パーティメンバー（主人公は職業、仲間は固有の色）を描く */
  function memberImg(member, px, cls, attrs) {
    var def = member.allyId && G.ALLIES && G.ALLIES[member.allyId];
    return def ? allyImg(def, px, cls, attrs) : classImg(member.classId, px, cls, attrs);
  }
  function iconImg(kind, rarity, px, hue) { return img(iconSpec(kind, rarity, hue), px, 'ico'); }

  return {
    draw: draw, img: img, enemyImg: enemyImg, classImg: classImg, iconImg: iconImg, nodeImg: nodeImg,
    allyImg: allyImg, memberImg: memberImg, allySpec: allySpec,
    enemySpec: enemySpec, classSpec: classSpec, iconSpec: iconSpec,
    ARCH: ARCH, expand: expand, SIZE: SIZE
  };
})();
