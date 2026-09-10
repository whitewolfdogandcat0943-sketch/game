/* stats.js - ビルド集計（装備・職業・バフからの派生ステータス算出） */
G.Stats = (function () {

  var BASE_KEYS = ['hp', 'mp', 'str', 'int', 'vit', 'agi', 'luk'];

  function emptyMods() { return {}; }

  function addMods(dst, src) {
    if (!src) return dst;
    for (var k in src) if (src.hasOwnProperty(k)) dst[k] = (dst[k] || 0) + src[k];
    return dst;
  }

  /** 装備中アクセサリ（null除去） */
  function equippedAccs(hero) {
    return (hero.equip.acc || []).filter(function (x) { return !!x; }).map(function (id) { return G.ACC_BY_ID[id]; })
      .filter(function (x) { return !!x; });
  }

  function rarityCount(hero, rarity) {
    return equippedAccs(hero).filter(function (a) { return a.rarity === rarity; }).length;
  }

  /** レベルアップに必要な累積経験値 */
  function expToNext(level) { return Math.round(20 * Math.pow(level, 1.5) + 14 * level); }

  /** 職業の基礎ステータス（レベル成長込み） */
  function baseStats(hero) {
    var cls = G.CLASSES[hero.classId];
    var out = {}, i, k;
    for (i = 0; i < BASE_KEYS.length; i++) {
      k = BASE_KEYS[i];
      out[k] = (cls.base[k] || 0) + (cls.grow[k] || 0) * (hero.level - 1);
    }
    /* 転職前の職業からは基礎値の15%を引き継ぐ（ビルドの積み重ね） */
    (hero.classHistory || []).forEach(function (cid) {
      var c = G.CLASSES[cid];
      if (!c || cid === hero.classId) return;
      for (var j = 0; j < BASE_KEYS.length; j++) {
        var kk = BASE_KEYS[j];
        out[kk] += ((c.base[kk] || 0) + (c.grow[kk] || 0) * (hero.level - 1)) * 0.15;
      }
    });
    return out;
  }

  /**
   * ビルド全体を集計する。
   * @param hero  主人公
   * @param buffs 戦闘中バフ [{k,v,t}] （任意）
   * @param bflags 戦闘中に付与されたフラグ配列（任意）
   * @returns {S, flags, mods, base, sources}
   */
  function compute(hero, buffs, bflags) {
    var cls = G.CLASSES[hero.classId];
    var mods = emptyMods();
    var flags = {};
    var sources = [];

    function take(obj, label) {
      if (!obj) return;
      addMods(mods, obj.mods);
      (obj.flags || []).forEach(function (f) { flags[f] = true; });
      if (label) sources.push({ label: label, name: obj.name || label, mods: obj.mods, flags: obj.flags });
    }

    take(cls, '職業');
    if (hero.equip.weapon) take(G.GEAR[hero.equip.weapon], '武器');
    if (hero.equip.armor) take(G.GEAR[hero.equip.armor], '防具');
    equippedAccs(hero).forEach(function (a) { take(a, 'アクセサリ'); });
    /* 職業ツリー（現在の職業で選択中のものだけが有効） */
    if (G.Mastery) G.Mastery.activeNodes(hero).forEach(function (nd) { take(nd, '職業ツリー'); });
    /* スキルツリーで取得したノード */
    Object.keys(hero.tree || {}).forEach(function (id) {
      var n = G.TREE && G.TREE.byId[id];
      if (n && hero.tree[id]) take(n, 'スキルツリー');
    });

    (buffs || []).forEach(function (b) { mods[b.k] = (mods[b.k] || 0) + b.v; });
    (bflags || []).forEach(function (f) { flags[f] = true; });

    var b = baseStats(hero);
    var S = {};

    /* 敵の弱体も同じ経路で乗るので、下限を切っておく（G.PCT_FLOOR = -70%まで） */
    var F = G.PCT_FLOOR;
    S.maxHp = Math.max(1, Math.round((b.hp + b.vit * 6 + (mods.hp || 0)) * (1 + F(mods.hpPct))));
    S.maxMp = Math.max(0, Math.round(b.mp + b.int * 1.5 + (mods.mp || 0)));
    S.atk = Math.max(1, Math.round((8 + b.str * 2.2 + (mods.atk || 0)) * (1 + F(mods.atkPct))));
    S.mag = Math.max(1, Math.round((8 + b.int * 2.2 + (mods.mag || 0)) * (1 + F(mods.magPct))));
    S.def = Math.max(0, Math.round((6 + b.vit * 2.6 + (mods.def || 0)) * (1 + F(mods.defPct))));
    S.res = Math.max(0, Math.round((6 + b.int * 1.3 + b.vit * 1.5 + (mods.res || 0)) * (1 + F(mods.resPct))));
    S.spd = Math.max(1, Math.round(5 + b.agi * 1.2 + (mods.spd || 0)));

    S.critRate = clamp01(0.05 + b.luk * 0.004 + (mods.critRate || 0));
    S.critDmg = Math.max(1.1, 1.5 + (mods.critDmg || 0));
    S.reflect = Math.max(0, mods.reflect || 0);
    S.reflectPow = mods.reflectPow || 0;
    S.aoeRatio = Math.max(0, mods.aoeRatio || 0);
    S.aoePower = mods.aoePower || 0;
    S.pierce = G.U.clamp(mods.pierce || 0, 0, 1);
    S.itemPower = mods.itemPower || 0;
    S.itemKeep = G.U.clamp(mods.itemKeep || 0, 0, 0.9);
    S.lifesteal = Math.max(0, mods.lifesteal || 0);
    S.dr = G.U.clamp(mods.dr || 0, -1, 0.85);
    S.dmgUp = mods.dmgUp || 0;
    S.mpRegen = mods.mpRegen || 0;
    S.goldUp = mods.goldUp || 0;
    S.dropUp = mods.dropUp || 0;
    S.evade = G.U.clamp(mods.evade || 0, 0, 0.6);
    /* 支援・弱体は「かける側」の性能。受け手ではなく術者の値を見る */
    S.buffPower = Math.max(0, mods.buffPower || 0);
    S.buffTurns = Math.max(0, Math.round(mods.buffTurns || 0));
    S.debuffPower = Math.max(0, mods.debuffPower || 0);
    S.debuffTurns = Math.max(0, Math.round(mods.debuffTurns || 0));

    G.ALL_ELEMENTS.forEach(function (e) { S['el_' + e] = mods['el_' + e] || 0; });

    /* 素の基礎値も参照できるように */
    S._base = b;
    return { S: S, flags: flags, mods: mods, sources: sources };
  }

  function clamp01(v) { return G.U.clamp(v, 0, 1); }

  /** 現在の職業＋履歴から使用可能スキルID一覧を得る */
  function skillList(hero) {
    var out = ['attack', 'guard'];
    /* 固有技は職業に関わらず常に持つ。仲間が転職しても失われない。 */
    (hero.signature || []).forEach(function (s) { if (out.indexOf(s) < 0) out.push(s); });
    var ids = (hero.classHistory || []).concat([hero.classId]);
    ids.forEach(function (cid) {
      var c = G.CLASSES[cid];
      if (!c) return;
      c.skills.forEach(function (s) { if (out.indexOf(s) < 0) out.push(s); });
    });
    var w = hero.equip.weapon && G.GEAR[hero.equip.weapon];
    if (w && w.grant && out.indexOf(w.grant) < 0) out.push(w.grant);
    Object.keys(hero.tree || {}).forEach(function (id) {
      var n = G.TREE && G.TREE.byId[id];
      if (n && n.skill && out.indexOf(n.skill) < 0) out.push(n.skill);
    });
    if (G.Mastery) G.Mastery.activeNodes(hero).forEach(function (nd) {
      if (nd.skill && out.indexOf(nd.skill) < 0) out.push(nd.skill);
    });
    return out;
  }

  /** 通常攻撃の属性（武器依存） */
  function attackElement(hero) {
    var w = hero.equip.weapon && G.GEAR[hero.equip.weapon];
    return (w && w.el) ? w.el : 'phys';
  }

  return {
    compute: compute, equippedAccs: equippedAccs, rarityCount: rarityCount,
    expToNext: expToNext, skillList: skillList, attackElement: attackElement,
    baseStats: baseStats, addMods: addMods
  };
})();
