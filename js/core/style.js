/* style.js - 「戦闘スタイル」の計測と、アクセサリ構成から読み取るスタイル
 *
 * 職業の解放を、数値の閾値ではなく次の2種類の証拠で行うための土台。
 *   上級職   … 実際にどう戦ったか（行動の実績）        -> G.Style.behaviour
 *   最上級職 … アクセサリ4枠がどんな構成か（組み方）   -> G.Style.fromAccessories
 *
 * どちらも同じ9軸で表す。
 */
G.Style = (function () {

  var AXES = [
    { id: 'crit',    name: '会心',     cls: 'r-legend' },
    { id: 'reflect', name: '反射',     cls: 'r-mythic' },
    { id: 'aoe',     name: '範囲',     cls: 'e-wind'   },
    { id: 'elem',    name: '属性',     cls: 'e-ice'    },
    { id: 'item',    name: 'アイテム', cls: 'e-fire'   },
    { id: 'life',    name: '吸収',     cls: 'e-dark'   },
    { id: 'guard',   name: '堅守',     cls: 'e-phys'   },
    { id: 'speed',   name: '速攻',     cls: 'e-thunder'},
    { id: 'status',  name: '呪詛',     cls: 'e-light'  }
  ];
  var AXIS_IDS = AXES.map(function (a) { return a.id; });

  /* アクセサリのmodが、どの軸にどれだけ効くか */
  var MOD_AXES = {
    critRate: { crit: 100 }, critDmg: { crit: 40 },
    reflect: { reflect: 120 }, reflectPow: { reflect: 50 },
    aoeRatio: { aoe: 110 }, aoePower: { aoe: 80 },
    pierce: { elem: 70 },
    itemPower: { item: 90 }, itemKeep: { item: 80 },
    lifesteal: { life: 150 },
    dr: { guard: 200 }, defPct: { guard: 60 }, hpPct: { guard: 60 },
    def: { guard: 0.5 }, res: { guard: 0.4 }, hp: { guard: 0.12 },
    spd: { speed: 1.2 }, evade: { speed: 200 }
  };
  G.MAGIC_ELEMENTS.forEach(function (e) { MOD_AXES['el_' + e] = { elem: 60 }; });

  /* 特殊効果（フラグ）も構成の性格を強く決めるので加点する */
  var FLAG_AXES = {
    critPierce: { crit: 12 }, critChain: { crit: 15 }, firstHitCrit: { crit: 10 },
    reflectAll: { reflect: 20 }, healOnReflect: { reflect: 12 }, thornAura: { reflect: 12 },
    overkillChain: { aoe: 12 }, hordeSlayer: { aoe: 12 }, deathSpike: { aoe: 12 }, fireSplash: { aoe: 10 },
    guardBreak: { elem: 12 }, weakHunter: { elem: 15 }, elementCycle: { elem: 12 },
    itemEcho: { item: 15 }, itemRefill: { item: 12 }, alchemyShield: { item: 10 },
    killHeal: { life: 12 }, overheal: { life: 10 }, soulHarvest: { life: 8 },
    wardAll: { guard: 15 }, lastStand: { guard: 12 }, endure: { guard: 12 }, barrierOnHit: { guard: 10 },
    counterEvade: { speed: 12 }, speedPower: { speed: 15 }, doubleStrike: { speed: 8 },
    statusOnHit: { status: 20 }, spreadStatus: { status: 18 },
    lingering: { status: 15 }, statusDamage: { status: 18 },
    freezeOnIce: { status: 12 }, shockOnThunder: { status: 12 }
  };

  function empty() {
    var o = {};
    AXIS_IDS.forEach(function (k) { o[k] = 0; });
    return o;
  }

  /* ---------- 冒険中の行動から積み上がるスタイル ---------- */

  /** run.stats.style を初期化する */
  function newRecord() {
    var o = empty();
    o.light = 0; o.dark = 0;      /* 破魔僧・終焉審判者の判定用 */
    o.phys = 0; o.mag = 0;        /* 魔剣士・双極魔剣皇の判定用 */
    return o;
  }

  /** 行動の実績を加算する */
  function add(state, axis, n) {
    if (!state.run || !state.run.stats) return;
    var st = state.run.stats.style || (state.run.stats.style = newRecord());
    st[axis] = (st[axis] || 0) + (n == null ? 1 : n);
  }

  function behaviour(state) {
    return (state.run && state.run.stats && state.run.stats.style) || newRecord();
  }

  /** 行動スタイルの総量と、各軸の占有率 */
  function shares(rec) {
    var total = 0;
    AXIS_IDS.forEach(function (k) { total += (rec[k] || 0); });
    var out = { total: total, share: {} };
    AXIS_IDS.forEach(function (k) { out.share[k] = total > 0 ? (rec[k] || 0) / total : 0; });
    return out;
  }

  /* ---------- アクセサリ4枠から読み取るスタイル ---------- */

  function scoreOf(obj) {
    var s = empty();
    var mods = obj.mods || {};
    Object.keys(mods).forEach(function (k) {
      var w = MOD_AXES[k];
      if (!w) return;
      Object.keys(w).forEach(function (ax) { s[ax] += Math.max(0, mods[k]) * w[ax]; });
    });
    (obj.flags || []).forEach(function (f) {
      var w = FLAG_AXES[f];
      if (!w) return;
      Object.keys(w).forEach(function (ax) { s[ax] += w[ax]; });
    });
    return s;
  }

  /** 装備中のアクセサリ4枠だけを見たスタイル */
  function fromAccessories(hero) {
    var s = empty();
    s.light = 0; s.dark = 0;
    G.Stats.equippedAccs(hero).forEach(function (a) {
      var one = scoreOf(a);
      AXIS_IDS.forEach(function (k) { s[k] += one[k]; });
      s.light += Math.max(0, (a.mods && a.mods.el_light) || 0) * 100;
      s.dark += Math.max(0, (a.mods && a.mods.el_dark) || 0) * 100;
    });
    return s;
  }

  /** アクセサリ4枠のスタイル得点と占有率 */
  function accShares(hero) {
    var s = fromAccessories(hero);
    var total = 0;
    AXIS_IDS.forEach(function (k) { total += s[k]; });
    var share = {};
    AXIS_IDS.forEach(function (k) { share[k] = total > 0 ? s[k] / total : 0; });
    return { score: s, share: share, total: total };
  }

  function axisName(id) {
    for (var i = 0; i < AXES.length; i++) if (AXES[i].id === id) return AXES[i].name;
    return id;
  }
  function axisClass(id) {
    for (var i = 0; i < AXES.length; i++) if (AXES[i].id === id) return AXES[i].cls;
    return '';
  }

  return {
    AXES: AXES, AXIS_IDS: AXIS_IDS, MOD_AXES: MOD_AXES, FLAG_AXES: FLAG_AXES,
    empty: empty, newRecord: newRecord, add: add, behaviour: behaviour,
    shares: shares, scoreOf: scoreOf, fromAccessories: fromAccessories, accShares: accShares,
    axisName: axisName, axisClass: axisClass
  };
})();
