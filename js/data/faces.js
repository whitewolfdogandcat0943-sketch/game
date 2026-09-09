/* faces.js - 立ち絵の人物設定
 *
 * 見た目のパラメータだけを持つ。描画は gfx/portraits.js の仕事。
 * 主人公は転職で装いが変わるので、職業ごとの上書きを別に持つ。
 */
G.FACES = (function () {

  /* ---------- 仲間・主人公 ---------- */
  var CAST = {
    /* 主人公。既定は見習い衛士の装い。職業で上書きされる。 */
    hero: {
      build: 'normal', hair: 'short',
      hairHue: 24, hairSat: 34, hairLum: 26,
      hue: 214, sat: 34, lum: 42, accent: 45,
      prop: 'sword', pauldron: true, brow: 0, eye: '#2b3550'
    },
    mina: {
      build: 'slim', hair: 'long',
      hairHue: 44, hairSat: 46, hairLum: 62,
      hue: 48, sat: 30, lum: 74, accent: 200, accentLum: 60,
      robe: true, prop: 'mace', circlet: true, beltAccent: true,
      skinLum: 72, eye: '#3a6b7a'
    },
    garo: {
      build: 'heavy', hair: 'crop',
      hairHue: 12, hairSat: 40, hairLum: 24,
      hue: 12, sat: 32, lum: 38, accent: 35, metalHue: 24,
      prop: 'greatsword', pauldron: true, beard: true, cape: true, capeHue: 8,
      brow: -1, skinHue: 24, skinLum: 60, eye: '#5a3a24'
    },
    sera: {
      build: 'slim', hair: 'bob',
      hairHue: 275, hairSat: 30, hairLum: 30,
      hue: 275, sat: 34, lum: 38, accent: 190, accentLum: 58,
      robe: true, prop: 'staff', raiseRight: true, cape: true, capeHue: 268,
      skinLum: 74, eye: '#6a4b9a'
    }
  };

  /* ---------- 主人公の職業別の装い ---------- */
  var CLASS_LOOK = {
    swordsman:      { hue: 214, sat: 34, lum: 44, accent: 45,  prop: 'sword',      pauldron: true },
    mage:           { hue: 265, sat: 40, lum: 42, accent: 190, prop: 'staff',      robe: true, pauldron: false, hair: 'short' },
    rogue:          { hue: 190, sat: 26, lum: 30, accent: 150, prop: 'sword',      pauldron: false, cape: true, capeHue: 200 },
    priest:         { hue: 45,  sat: 26, lum: 70, accent: 205, prop: 'mace',       robe: true, circlet: true, pauldron: false },
    berserker:      { hue: 6,   sat: 44, lum: 36, accent: 30,  prop: 'greatsword', pauldron: true, build: 'heavy', beard: true },
    assassin:       { hue: 258, sat: 30, lum: 22, accent: 320, prop: 'sword',      cape: true, capeHue: 258, hair: 'tail' },
    elementalist:   { hue: 20,  sat: 46, lum: 46, accent: 195, prop: 'staff',      robe: true, cape: true, capeHue: 30 },
    guardian:       { hue: 205, sat: 22, lum: 46, accent: 48,  prop: 'sword',      pauldron: true, build: 'heavy', metalHue: 210 },
    stormcaller:    { hue: 200, sat: 44, lum: 46, accent: 55,  prop: 'staff',      robe: true, cape: true, capeHue: 205 },
    alchemist:      { hue: 96,  sat: 32, lum: 42, accent: 60,  prop: 'book',       hair: 'tail' },
    exorcist:       { hue: 46,  sat: 30, lum: 66, accent: 280, prop: 'mace',       robe: true, circlet: true },
    windrunner:     { hue: 160, sat: 38, lum: 44, accent: 60,  prop: 'sword',      cape: true, capeHue: 165, build: 'slim', hair: 'tail' },
    hexer:          { hue: 285, sat: 34, lum: 26, accent: 120, prop: 'staff',      hair: 'hood', robe: true },
    spellblade:     { hue: 235, sat: 38, lum: 40, accent: 15,  prop: 'sword',      cape: true, capeHue: 240, pauldron: true },
    phantomSaint:   { hue: 250, sat: 22, lum: 26, accent: 50,  prop: 'sword',      cape: true, capeHue: 250, hair: 'tail', circlet: true },
    mirrorEmperor:  { hue: 200, sat: 20, lum: 58, accent: 320, prop: 'greatsword', pauldron: true, build: 'heavy', circlet: true, metalHue: 200 },
    calamityKing:   { hue: 205, sat: 46, lum: 40, accent: 55,  prop: 'staff',      robe: true, cape: true, capeHue: 210, circlet: true },
    astralArchmage: { hue: 268, sat: 42, lum: 40, accent: 48,  prop: 'staff',      robe: true, cape: true, capeHue: 275, circlet: true },
    alchemySovereign:{hue: 100, sat: 34, lum: 44, accent: 48,  prop: 'book',       cape: true, capeHue: 96, circlet: true },
    bloodfiend:     { hue: 352, sat: 46, lum: 32, accent: 12,  prop: 'greatsword', pauldron: true, build: 'heavy', beard: true, circlet: true },
    finalArbiter:   { hue: 48,  sat: 32, lum: 68, accent: 285, prop: 'mace',       robe: true, cape: true, capeHue: 45, circlet: true },
    voidSovereign:  { hue: 282, sat: 36, lum: 22, accent: 300, prop: 'staff',      hair: 'hood', robe: true, cape: true, capeHue: 285, circlet: true },
    skyrunner:      { hue: 168, sat: 40, lum: 48, accent: 55,  prop: 'sword',      cape: true, capeHue: 170, build: 'slim', hair: 'tail', circlet: true },
    plaguelord:     { hue: 290, sat: 36, lum: 24, accent: 120, prop: 'staff',      hair: 'hood', robe: true, cape: true, capeHue: 288, circlet: true },
    poleEmperor:    { hue: 240, sat: 40, lum: 38, accent: 20,  prop: 'sword',      cape: true, capeHue: 245, pauldron: true, circlet: true }
  };

  /* ---------- 物語の脇役 ---------- */
  var NPC = {
    '衛士長': { build: 'heavy', hair: 'crop', hairHue: 210, hairSat: 8, hairLum: 52,
                hue: 212, sat: 18, lum: 40, accent: 45, prop: 'sword', pauldron: true,
                beard: true, brow: -1, skinLum: 58, eye: '#4a4f5e' },
    '枢機卿': { build: 'slim', hair: 'hood', hairHue: 0, hairSat: 0, hairLum: 40,
                hue: 350, sat: 26, lum: 30, accent: 45, prop: 'none', robe: true,
                cape: true, capeHue: 350, skinLum: 62 },
    'ガロ': null, 'ミナ': null, 'セラ': null   /* 仲間は CAST を使う（下で解決） */
  };

  /** 話者名から立ち絵の設定を引く。無ければ null（立ち絵なし）。 */
  function byName(name, state) {
    if (!name) return null;
    if (state && state.hero && name === state.hero.name) return forHero(state.hero);
    var ally = (G.ALLY_LIST || []).filter(function (a) { return a.name === name; })[0];
    if (ally && CAST[ally.id]) return CAST[ally.id];
    if (NPC[name]) return NPC[name];
    return null;
  }

  /** 主人公の立ち絵。今の職業の装いを重ねる。 */
  function forHero(hero) {
    var base = CAST.hero, look = CLASS_LOOK[hero && hero.classId] || {};
    var out = {};
    for (var k in base) out[k] = base[k];
    for (var k2 in look) out[k2] = look[k2];
    return out;
  }

  /** パーティメンバー（主人公も仲間も）の立ち絵 */
  function forMember(m) {
    if (m && m.allyId && CAST[m.allyId]) return CAST[m.allyId];
    return forHero(m);
  }

  return { CAST: CAST, CLASS_LOOK: CLASS_LOOK, NPC: NPC,
           byName: byName, forHero: forHero, forMember: forMember };
})();
