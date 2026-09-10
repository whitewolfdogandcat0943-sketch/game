/* classes.js - 職業（初級 / 上級 / 最上級）と解放条件 */
(function () {
  /* --- 解放条件ビルダー --------------------------------------------- */
  /* 各条件は d（記述子）を持つ。これによりエンジン非依存のJSONへ書き出せる。 */
  function stat(key, val, label) {
    return { label: label, d: { t: 'stat', k: key, v: val },
             test: function (c) { return (c.S[key] || 0) >= val; },
             now: function (c) { return c.S[key] || 0; }, need: val, key: key };
  }
  function allElem(val) {
    return {
      label: '6属性すべてのダメージ強化が ' + Math.round(val * 100) + '% 以上',
      d: { t: 'allElem', v: val },
      test: function (c) {
        return G.MAGIC_ELEMENTS.every(function (e) { return (c.S['el_' + e] || 0) >= val; });
      }
    };
  }
  function pairElem(a, b, val) {
    return {
      label: G.ELEMENTS[a].name + '＋' + G.ELEMENTS[b].name + '属性強化の合計が ' + Math.round(val * 100) + '% 以上',
      d: { t: 'pairElem', a: a, b: b, v: val },
      test: function (c) { return (c.S['el_' + a] || 0) + (c.S['el_' + b] || 0) >= val; }
    };
  }
  function mythicN(n) {
    return { label: 'ミシックアクセサリを ' + n + '個 装備している', d: { t: 'rarityCount', r: 'mythic', v: n },
             test: function (c) { return c.mythicCount >= n; } };
  }
  function legendN(n) {
    return { label: 'レジェンドアクセサリを ' + n + '個 装備している', d: { t: 'rarityCount', r: 'legend', v: n },
             test: function (c) { return c.legendCount >= n; } };
  }
  function lv(n) {
    return { label: 'レベル ' + n + ' 以上', d: { t: 'level', v: n },
             test: function (c) { return c.hero.level >= n; } };
  }
  function runStat(key, n, label) {
    return { label: label, d: { t: 'runStat', k: key, v: n },
             test: function (c) { return (c.run.stats[key] || 0) >= n; } };
  }
  function itemsUsed(n) { return runStat('itemsUsed', n, 'この冒険でアイテムを ' + n + '回以上使用'); }
  function kills(n) { return runStat('kills', n, 'この冒険で ' + n + '体以上撃破'); }
  function reflectKills(n) { return runStat('reflectKills', n, '反射ダメージで ' + n + '体以上撃破'); }
  function critCount(n) { return runStat('crits', n, 'この冒険で会心を ' + n + '回以上発生'); }
  function aoeKills(n) { return runStat('aoeKills', n, '範囲攻撃で ' + n + '体以上撃破'); }
  function statusApplied(n) { return runStat('statusApplied', n, 'この冒険で状態異常を ' + n + '回以上 付与'); }
  function evades(n) { return runStat('evades', n, 'この冒険で敵の攻撃を ' + n + '回以上 回避'); }
  /* --- 戦闘スタイル（どう戦ったか）: 上級職の解放に使う --- */
  function style(axis, pts, share) {
    return {
      label: '戦い方が「' + G.Style.axisName(axis) + '」に寄っている（実績 ' + pts +
             ' 以上／全体の ' + Math.round(share * 100) + '% 以上）',
      d: { t: 'style', k: axis, v: pts, share: share },
      test: function (c) {
        var rec = G.Style.behaviourOf(c.hero), sh = G.Style.shares(rec);
        return (rec[axis] || 0) >= pts && sh.share[axis] >= share;
      },
      prog: function (c) {
        var rec = G.Style.behaviourOf(c.hero), sh = G.Style.shares(rec);
        return (rec[axis] || 0) + ' / ' + pts + '（' + Math.round(sh.share[axis] * 100) + '%）';
      }
    };
  }
  function styleAny(axes, pts, share) {
    var names = axes.map(function (a) { return G.Style.axisName(a); }).join('・');
    return {
      label: '戦い方が「' + names + '」に寄っている（実績 ' + pts + ' 以上）',
      d: { t: 'styleAny', ks: axes, v: pts, share: share },
      test: function (c) {
        var rec = G.Style.behaviourOf(c.hero), sh = G.Style.shares(rec);
        return axes.some(function (a) { return (rec[a] || 0) >= pts && sh.share[a] >= share; });
      },
      prog: function (c) {
        var rec = G.Style.behaviourOf(c.hero);
        return axes.map(function (a) { return G.Style.axisName(a) + (rec[a] || 0); }).join(' ');
      }
    };
  }
  function styleDual(a, b, n) {
    return {
      label: G.ELEMENTS[a].name + 'と' + G.ELEMENTS[b].name + 'の両方で ' + n + '回以上ダメージを与えた',
      d: { t: 'styleDual', a: a, b: b, v: n },
      test: function (c) {
        var rec = G.Style.behaviourOf(c.hero);
        return (rec[a] || 0) >= n && (rec[b] || 0) >= n;
      },
      prog: function (c) {
        var rec = G.Style.behaviourOf(c.hero);
        return (rec[a] || 0) + ' / ' + (rec[b] || 0);
      }
    };
  }
  function styleHybrid(n) {
    return {
      label: '物理と魔法の両方で ' + n + '回以上ダメージを与えた',
      d: { t: 'styleHybrid', v: n },
      test: function (c) {
        var rec = G.Style.behaviourOf(c.hero);
        return (rec.phys || 0) >= n && (rec.mag || 0) >= n;
      },
      prog: function (c) {
        var rec = G.Style.behaviourOf(c.hero);
        return '物理' + (rec.phys || 0) + ' / 魔法' + (rec.mag || 0);
      }
    };
  }

  /* --- アクセサリ構成（どう組んだか）: 最上級職の解放に使う --- */
  function accStyle(axis, score, share) {
    return {
      label: 'アクセサリ4枠が「' + G.Style.axisName(axis) + '」構成（得点 ' + score +
             ' 以上／全体の ' + Math.round(share * 100) + '% 以上）',
      d: { t: 'accStyle', k: axis, v: score, share: share },
      test: function (c) {
        var a = G.Style.accShares(c.hero);
        return a.score[axis] >= score && a.share[axis] >= share;
      },
      prog: function (c) {
        var a = G.Style.accShares(c.hero);
        return Math.round(a.score[axis]) + ' / ' + score +
               '（' + Math.round(a.share[axis] * 100) + '%）';
      }
    };
  }
  function accStyleDual(x, y, each) {
    return {
      label: 'アクセサリ4枠で「' + G.Style.axisName(x) + '」と「' + G.Style.axisName(y) +
             '」を両立（各 ' + each + ' 以上）',
      d: { t: 'accStyleDual', a: x, b: y, v: each },
      test: function (c) {
        var a = G.Style.accShares(c.hero);
        return a.score[x] >= each && a.score[y] >= each;
      },
      prog: function (c) {
        var a = G.Style.accShares(c.hero);
        return Math.round(a.score[x]) + ' / ' + Math.round(a.score[y]);
      }
    };
  }
  function accElemPair(v) {
    return {
      label: 'アクセサリ4枠の光＋闇の強化が ' + v + ' 以上',
      d: { t: 'accElemPair', v: v },
      test: function (c) {
        var s = G.Style.fromAccessories(c.hero);
        return (s.light || 0) + (s.dark || 0) >= v;
      },
      prog: function (c) {
        var s = G.Style.fromAccessories(c.hero);
        return Math.round((s.light || 0) + (s.dark || 0)) + ' / ' + v;
      }
    };
  }

  G.COND = { style: style, styleAny: styleAny, styleDual: styleDual, styleHybrid: styleHybrid,
             accStyle: accStyle, accStyleDual: accStyleDual, accElemPair: accElemPair,
             statusApplied: statusApplied, evades: evades, stat: stat, allElem: allElem, pairElem: pairElem, mythicN: mythicN, legendN: legendN, lv: lv,
             itemsUsed: itemsUsed, kills: kills, reflectKills: reflectKills, critCount: critCount, aoeKills: aoeKills };

  var C = {};
  function def(o) { C[o.id] = o; return o; }

  /* =================== 初級職 (Tier 1) =================== */
  def({
    id: 'swordsman', name: '剣士', tier: 1, icon: '🗡',
    desc: '高い攻撃力と耐久を併せ持つ基本職。物理・会心・反射など幅広いビルドの土台。',
    base: { hp: 120, mp: 30, str: 12, int: 5, vit: 10, agi: 7, luk: 6 },
    grow: { hp: 11, mp: 2, str: 2.0, int: 0.6, vit: 1.6, agi: 1.0, luk: 0.8 },
    mods: { critRate: 0.03, atkPct: 0.05 }, flags: [],
    skills: ['slash', 'warcry', 'heavyBlow', 'crossSlash', 'bladeDance', 'focus', 'coverStance', 'shieldBash']
  });
  def({
    id: 'mage', name: '魔術士', tier: 1, icon: '📕',
    desc: '全属性魔法の使い手。属性ビルド・範囲ビルドの起点となる。',
    base: { hp: 88, mp: 60, str: 5, int: 13, vit: 6, agi: 8, luk: 8 },
    grow: { hp: 7, mp: 5, str: 0.6, int: 2.2, vit: 0.9, agi: 1.1, luk: 1.0 },
    mods: { magPct: 0.06, mpRegen: 2 }, flags: [],
    skills: ['fireball', 'iceLance', 'boltStrike', 'manaSurge', 'manaBurn', 'arcaneSeal']
  });
  def({
    id: 'rogue', name: '盗賊', tier: 1, icon: '🗝',
    desc: '素早さと会心に優れる。宝箱の中身が良くなり、ゴールド獲得も増える。',
    base: { hp: 100, mp: 38, str: 9, int: 7, vit: 7, agi: 13, luk: 12 },
    grow: { hp: 8.5, mp: 3, str: 1.5, int: 1.0, vit: 1.0, agi: 2.0, luk: 1.8 },
    mods: { critRate: 0.08, critDmg: 0.15, goldUp: 0.20, dropUp: 0.15 }, flags: [],
    skills: ['backstab', 'venomFang', 'shadowStep', 'pickpocket', 'markTarget', 'smokeBomb']
  });
  def({
    id: 'priest', name: '神官', tier: 1, icon: '✧',
    desc: '回復と光闇の術に長ける。反射・耐久・アイテムなど支援型ビルドに強い。',
    base: { hp: 108, mp: 52, str: 7, int: 11, vit: 9, agi: 7, luk: 9 },
    grow: { hp: 9.5, mp: 4.2, str: 1.0, int: 1.9, vit: 1.4, agi: 0.9, luk: 1.2 },
    mods: { 'el_light': 0.10, dr: 0.04 }, flags: [],
    skills: ['heal', 'smite', 'sanctuary', 'purify', 'martyr', 'groupHeal']
  });

  /* =================== 上級職 (Tier 2) =================== */
  def({
    id: 'berserker', name: '狂戦士', tier: 2, icon: '🪓',
    desc: '生命を削って暴威を振るう。吸収と低HP時の爆発力が持ち味。',
    from: ['swordsman', 'rogue'],
    req: [style('life', 25, 0.20), lv(6)],
    base: { hp: 150, mp: 34, str: 17, int: 5, vit: 12, agi: 9, luk: 7 },
    grow: { hp: 14, mp: 2, str: 2.6, int: 0.5, vit: 1.8, agi: 1.2, luk: 0.8 },
    mods: { atkPct: 0.15, lifesteal: 0.10, dr: -0.05, hpPct: 0.10 }, flags: ['lowHpRage'],
    skills: ['slash', 'heavyBlow', 'bloodRage', 'crushArmor', 'berserkRush', 'bloodOffering', 'carnage', 'avengeStance']
  });
  def({
    id: 'assassin', name: '暗殺者', tier: 2, icon: '🔪',
    desc: '会心特化。低HPの敵を確実に葬る処刑術を持つ。',
    from: ['rogue', 'swordsman'],
    req: [style('crit', 30, 0.25), lv(6)],
    base: { hp: 108, mp: 40, str: 13, int: 7, vit: 7, agi: 16, luk: 15 },
    grow: { hp: 9, mp: 3, str: 2.0, int: 0.9, vit: 1.0, agi: 2.4, luk: 2.2 },
    mods: { critRate: 0.12, critDmg: 0.35, spd: 12 }, flags: ['critPierce'],
    skills: ['backstab', 'thousandCuts', 'shadowStep', 'executioner', 'phantomBlades', 'markTarget', 'smokeBomb']
  });
  def({
    id: 'elementalist', name: '元素使い', tier: 2, icon: '🜁',
    desc: '複数属性を操る術士。弱点を突き、耐性を貫く。',
    from: ['mage', 'priest'],
    req: [style('elem', 25, 0.20), lv(6)],
    base: { hp: 96, mp: 74, str: 5, int: 18, vit: 7, agi: 10, luk: 9 },
    grow: { hp: 8, mp: 6, str: 0.5, int: 2.8, vit: 1.0, agi: 1.2, luk: 1.0 },
    mods: { magPct: 0.14, pierce: 0.20, 'el_fire': 0.08, 'el_ice': 0.08, 'el_thunder': 0.08, 'el_wind': 0.08 },
    flags: ['guardBreak'],
    skills: ['fireball', 'iceLance', 'boltStrike', 'galeEdge', 'elementalBurst', 'frostNova', 'flameWhirl', 'overload', 'dispelWave']
  });
  def({
    id: 'guardian', name: '守護者', tier: 2, icon: '🛡',
    desc: '反射と鉄壁の体現者。受けたダメージを刃に変える。',
    from: ['swordsman', 'priest'],
    req: [styleAny(['reflect', 'guard'], 28, 0.20), lv(6)],
    base: { hp: 168, mp: 40, str: 11, int: 8, vit: 18, agi: 5, luk: 7 },
    grow: { hp: 16, mp: 2.6, str: 1.6, int: 1.0, vit: 2.6, agi: 0.6, luk: 0.8 },
    mods: { defPct: 0.20, reflect: 0.15, dr: 0.08, hpPct: 0.12, spd: -5 }, flags: ['barrierOnHit'],
    skills: ['thornGuard', 'ironWall', 'retaliate', 'provoke', 'bulwark', 'counterWall', 'tauntRoar', 'earthSplitter']
  });
  def({
    id: 'stormcaller', name: '嵐使い', tier: 2, icon: '🌪',
    desc: '範囲殲滅の専門家。単体技すら周囲へ波及させる。',
    from: ['mage', 'rogue'],
    req: [style('aoe', 30, 0.25), lv(6)],
    base: { hp: 104, mp: 66, str: 8, int: 15, vit: 8, agi: 14, luk: 9 },
    grow: { hp: 9, mp: 5, str: 1.0, int: 2.3, vit: 1.1, agi: 1.9, luk: 1.0 },
    mods: { aoePower: 0.30, aoeRatio: 0.25, 'el_wind': 0.20, spd: 10 }, flags: ['overkillChain'],
    skills: ['tempest', 'shockwave', 'stormCall', 'gravityWell', 'thunderJudge', 'cycloneCage']
  });
  def({
    id: 'alchemist', name: '錬金術士', tier: 2, icon: '⚗',
    desc: 'アイテムを兵器に変える技師。消耗品を消耗させずに戦う。',
    from: ['mage', 'rogue', 'priest'],
    req: [style('item', 20, 0.15), lv(6)],
    base: { hp: 112, mp: 58, str: 8, int: 14, vit: 10, agi: 10, luk: 12 },
    grow: { hp: 10, mp: 4, str: 1.0, int: 2.0, vit: 1.4, agi: 1.3, luk: 1.6 },
    mods: { itemPower: 0.45, itemKeep: 0.15, dropUp: 0.20 }, flags: ['itemRefill'],
    skills: ['throwBomb', 'panacea', 'transmute', 'catalyst', 'acidFlask', 'elixirRain', 'bombArray', 'homunculus']
  });
  def({
    id: 'exorcist', name: '破魔僧', tier: 2, icon: '☩',
    desc: '光と闇、相反する二極を同時に操る修行者。',
    from: ['priest', 'mage'],
    req: [styleDual('light', 'dark', 10), lv(6)],
    base: { hp: 126, mp: 62, str: 9, int: 15, vit: 11, agi: 8, luk: 10 },
    grow: { hp: 11, mp: 4.6, str: 1.2, int: 2.2, vit: 1.5, agi: 1.0, luk: 1.2 },
    mods: { 'el_light': 0.20, 'el_dark': 0.20, lifesteal: 0.08, dr: 0.06 }, flags: ['soulHarvest'],
    skills: ['smite', 'darkPact', 'judgement', 'sanctuary', 'holyNova', 'resurrect', 'holyChain', 'blessing', 'guardianAngel']
  });

  def({
    id: 'windrunner', name: '韋駄天', tier: 2, icon: '🌬',
    desc: '速さこそ攻防のすべて。避けきり、先んじて刻む。',
    from: ['rogue', 'swordsman'],
    req: [style('speed', 20, 0.15), lv(6)],
    base: { hp: 112, mp: 42, str: 12, int: 8, vit: 8, agi: 18, luk: 11 },
    grow: { hp: 9.5, mp: 3, str: 1.8, int: 1.0, vit: 1.1, agi: 2.8, luk: 1.4 },
    mods: { spd: 22, evade: 0.12, critRate: 0.06 }, flags: ['firstHitCrit', 'counterEvade'],
    skills: ['shukuchi', 'galeFlurry', 'backstab', 'whirlwind', 'bladeStorm', 'afterimage']
  });
  def({
    id: 'hexer', name: '呪術師', tier: 2, icon: '🕯',
    desc: '毒と呪いで敵を弱らせ、崩れたところを刈り取る。',
    from: ['mage', 'priest', 'rogue'],
    req: [style('status', 15, 0.16), lv(6)],
    base: { hp: 108, mp: 66, str: 7, int: 16, vit: 9, agi: 11, luk: 10 },
    grow: { hp: 9, mp: 5, str: 0.8, int: 2.4, vit: 1.2, agi: 1.3, luk: 1.2 },
    mods: { 'el_dark': 0.22, magPct: 0.10, dotPower: 0.15 }, flags: ['statusDamage', 'lingering'],
    skills: ['plague', 'hexMist', 'venomFang', 'curseBurst', 'soulSeal', 'plagueMark']
  });
  def({
    id: 'plaguedoctor', name: '疫医', tier: 2, icon: '🐦',
    desc: '殺し方が遅いだけで、確実ではある。撒いたぶんだけ、時間が働く。',
    from: ['mage', 'priest', 'rogue'],
    req: [style('status', 22, 0.18), lv(6)],
    base: { hp: 112, mp: 64, str: 7, int: 16, vit: 10, agi: 11, luk: 10 },
    grow: { hp: 10, mp: 5, str: 0.8, int: 2.4, vit: 1.3, agi: 1.3, luk: 1.2 },
    mods: { dotPower: 0.35, dotTurns: 1, 'el_dark': 0.15, magPct: 0.08 },
    flags: ['venomEdge'],
    skills: ['rotTouch', 'miasma', 'pyreCurse', 'incubate', 'sporeBurst', 'venomFang']
  });
  def({
    id: 'bard', name: '吟遊詩人', tier: 2, icon: '🎼',
    desc: '自分では大して殴らない。そのかわり、4人ぶんの数字を動かす。',
    from: ['priest', 'rogue', 'mage'],
    req: [style('buff', 18, 0.15), lv(6)],
    base: { hp: 116, mp: 62, str: 9, int: 14, vit: 10, agi: 13, luk: 12 },
    grow: { hp: 10, mp: 4.8, str: 1.1, int: 2.1, vit: 1.3, agi: 1.7, luk: 1.5 },
    mods: { buffPower: 0.30, buffTurns: 1, mp: 20, spd: 6 }, flags: ['openingRally'],
    skills: ['warSong', 'wardSong', 'resonance', 'encoreCall', 'lullaby', 'heal']
  });
  def({
    id: 'binder', name: '呪縛士', tier: 2, icon: '⛓',
    desc: '毒でも刃でもなく、相手の数字そのものを削る。効かない相手がいない。',
    from: ['mage', 'rogue', 'priest'],
    req: [style('debuff', 18, 0.15), lv(6)],
    base: { hp: 112, mp: 64, str: 8, int: 15, vit: 10, agi: 12, luk: 10 },
    grow: { hp: 10, mp: 5, str: 0.9, int: 2.3, vit: 1.3, agi: 1.5, luk: 1.2 },
    mods: { debuffPower: 0.30, debuffTurns: 1, 'el_dark': 0.16, magPct: 0.08 },
    flags: ['hexBrand'],
    skills: ['dullEdge', 'sapWill', 'leadenChant', 'frailty', 'witherAll', 'bindingWord']
  });
  def({
    id: 'spellblade', name: '魔剣士', tier: 2, icon: '🗡',
    desc: '剣に魔を通す。物理と魔法、どちらの数値も無駄にしない。',
    from: ['swordsman', 'mage'],
    req: [styleHybrid(40), lv(6)],
    base: { hp: 128, mp: 56, str: 13, int: 13, vit: 10, agi: 11, luk: 9 },
    grow: { hp: 11, mp: 4, str: 2.0, int: 2.0, vit: 1.4, agi: 1.3, luk: 1.0 },
    mods: { atkPct: 0.10, magPct: 0.10, 'el_fire': 0.12, 'el_light': 0.12 }, flags: ['spellblade'],
    skills: ['spellEdge', 'dualPole', 'slash', 'fireball', 'runeBlade', 'spellChain', 'unisonEdge']
  });

  /* =================== 最上級職 (Tier 3) =================== */
  def({
    id: 'phantomSaint', name: '絶影剣聖', tier: 3,
    from: ['assassin', 'berserker'],
    req: [accStyle('crit', 110, 0.45), legendN(1), lv(12)],
    base: { hp: 150, mp: 60, str: 20, int: 10, vit: 11, agi: 22, luk: 20 },
    grow: { hp: 12, mp: 4, str: 2.9, int: 1.2, vit: 1.5, agi: 3.0, luk: 2.8 },
    mods: { critRate: 0.20, critDmg: 0.90, spd: 25, atkPct: 0.25 }, flags: ['critPierce', 'doubleStrike'],
    skills: ['ult_phantomEdge', 'ult_shadowRequiem', 'thousandCuts', 'executioner', 'shadowStep', 'phantomBlades', 'markTarget']
  });
  def({
    id: 'mirrorEmperor', name: '鏡獄天帝', tier: 3,
    from: ['guardian'],
    req: [accStyle('reflect', 120, 0.40), legendN(1), lv(12)],
    base: { hp: 230, mp: 60, str: 14, int: 12, vit: 26, agi: 7, luk: 9 },
    grow: { hp: 20, mp: 3.4, str: 1.8, int: 1.4, vit: 3.4, agi: 0.8, luk: 1.0 },
    mods: { reflect: 0.35, reflectPow: 0.60, defPct: 0.35, dr: 0.15, hpPct: 0.20 },
    flags: ['reflectAll', 'healOnReflect', 'barrierOnHit'],
    skills: ['ult_mirrorEnd', 'ult_mirrorPrison', 'thornGuard', 'mirrorField', 'retaliate', 'counterWall', 'bulwark']
  });
  def({
    id: 'calamityKing', name: '天災嵐王', tier: 3,
    from: ['stormcaller'],
    req: [accStyle('aoe', 130, 0.40), legendN(1), lv(12)],
    base: { hp: 150, mp: 90, str: 11, int: 21, vit: 12, agi: 19, luk: 11 },
    grow: { hp: 12, mp: 6.5, str: 1.2, int: 3.0, vit: 1.6, agi: 2.4, luk: 1.2 },
    mods: { aoePower: 0.60, aoeRatio: 0.40, magPct: 0.25, 'el_wind': 0.30, spd: 15 },
    flags: ['overkillChain', 'fireSplash'],
    skills: ['ult_calamity', 'ult_stormThrone', 'tempest', 'meteor', 'blizzard', 'stormCall', 'cycloneCage']
  });
  def({
    id: 'astralArchmage', name: '星辰術皇', tier: 3,
    from: ['elementalist', 'exorcist'],
    req: [accStyle('elem', 150, 0.45), legendN(1), lv(12)],
    base: { hp: 140, mp: 108, str: 9, int: 24, vit: 11, agi: 14, luk: 12 },
    grow: { hp: 11, mp: 7.5, str: 0.8, int: 3.4, vit: 1.4, agi: 1.6, luk: 1.4 },
    mods: { magPct: 0.30, pierce: 0.30, 'el_fire': 0.18, 'el_ice': 0.18, 'el_thunder': 0.18,
            'el_wind': 0.18, 'el_light': 0.18, 'el_dark': 0.18 },
    flags: ['guardBreak', 'allElemStrike', 'freezeOnIce', 'shockOnThunder'],
    skills: ['ult_astralBurst', 'ult_starfall', 'elementalBurst', 'meteor', 'blizzard', 'chainBolt', 'overload']
  });
  def({
    id: 'alchemySovereign', name: '万象錬成王', tier: 3,
    from: ['alchemist'],
    req: [accStyle('item', 150, 0.45), legendN(1), lv(12)],
    base: { hp: 170, mp: 84, str: 12, int: 19, vit: 15, agi: 14, luk: 18 },
    grow: { hp: 14, mp: 5.6, str: 1.3, int: 2.6, vit: 2.0, agi: 1.7, luk: 2.4 },
    mods: { itemPower: 0.90, itemKeep: 0.25, magPct: 0.20, dropUp: 0.40, goldUp: 0.35 },
    flags: ['itemRefill', 'itemEcho'],
    skills: ['ult_grandElixir', 'ult_philosopher', 'throwBomb', 'acidFlask', 'elixirRain', 'catalyst', 'homunculus']
  });
  def({
    id: 'bloodfiend', name: '血喰鬼神', tier: 3,
    from: ['berserker', 'assassin'],
    req: [accStyle('life', 90, 0.35), legendN(1), lv(12)],
    base: { hp: 210, mp: 56, str: 24, int: 8, vit: 17, agi: 15, luk: 10 },
    grow: { hp: 18, mp: 2.8, str: 3.4, int: 0.8, vit: 2.2, agi: 1.8, luk: 1.2 },
    mods: { atkPct: 0.40, lifesteal: 0.30, hpPct: 0.25, 'el_dark': 0.25 },
    flags: ['lowHpRage', 'stackAtkOnKill', 'soulHarvest'],
    skills: ['ult_devourFang', 'ult_bloodFeast', 'bloodRage', 'crushArmor', 'carnage', 'bloodOffering']
  });
  def({
    id: 'finalArbiter', name: '終焉審判者', tier: 3,
    from: ['exorcist', 'priest'],
    req: [accElemPair(70), legendN(1), lv(12)],
    base: { hp: 190, mp: 96, str: 13, int: 22, vit: 16, agi: 12, luk: 13 },
    grow: { hp: 15, mp: 6.4, str: 1.4, int: 3.1, vit: 2.0, agi: 1.3, luk: 1.5 },
    mods: { 'el_light': 0.40, 'el_dark': 0.40, magPct: 0.25, dr: 0.12, lifesteal: 0.15 },
    flags: ['soulHarvest', 'guardBreak', 'endure'],
    skills: ['ult_lastJudgement', 'ult_finalVerdict', 'judgement', 'holyNova', 'resurrect', 'blessing', 'holyChain']
  });
  def({
    id: 'voidSovereign', name: '虚無帝', tier: 3,
    from: ['assassin', 'guardian', 'elementalist', 'alchemist', 'stormcaller', 'berserker', 'exorcist',
           'windrunner', 'hexer', 'spellblade'],
    req: [mythicN(3), lv(14), { label: 'ミシックを3種類以上「発見」済み', d: { t: 'metaMythics', v: 3 },
          test: function (c) { return (c.meta.mythics || []).length >= 3; } }],
    base: { hp: 200, mp: 100, str: 18, int: 18, vit: 18, agi: 18, luk: 18 },
    grow: { hp: 16, mp: 6, str: 2.4, int: 2.4, vit: 2.4, agi: 2.4, luk: 2.4 },
    mods: { atkPct: 0.25, magPct: 0.25, defPct: 0.25, hpPct: 0.25, spd: 18, pierce: 0.35, critRate: 0.15 },
    flags: ['mythicScaling', 'guardBreak', 'endure', 'soulHarvest'],
    skills: ['ult_voidCollapse', 'ult_nullify', 'ult_astralBurst', 'gravityWell', 'dispelWave', 'arcaneSeal']
  });

  def({
    id: 'skyrunner', name: '神速天翔', tier: 3,
    from: ['windrunner', 'assassin'],
    req: [accStyle('speed', 130, 0.40), legendN(1), lv(12)],
    base: { hp: 160, mp: 70, str: 18, int: 12, vit: 12, agi: 26, luk: 16 },
    grow: { hp: 13, mp: 4.4, str: 2.6, int: 1.4, vit: 1.6, agi: 3.6, luk: 2.2 },
    mods: { spd: 45, evade: 0.22, critRate: 0.15, atkPct: 0.20 },
    flags: ['speedPower', 'counterEvade', 'firstHitCrit', 'doubleStrike'],
    skills: ['ult_thousandShadow', 'ult_godspeed', 'shukuchi', 'galeFlurry', 'bladeStorm', 'afterimage']
  });
  def({
    id: 'plaguelord', name: '疫災呪王', tier: 3,
    from: ['hexer', 'exorcist'],
    req: [accStyle('status', 110, 0.35), legendN(1), lv(12)],
    base: { hp: 170, mp: 96, str: 10, int: 23, vit: 14, agi: 13, luk: 12 },
    grow: { hp: 14, mp: 6.6, str: 1.0, int: 3.2, vit: 1.8, agi: 1.5, luk: 1.4 },
    mods: { 'el_dark': 0.40, magPct: 0.25, pierce: 0.20, lifesteal: 0.12, dotPower: 0.45 },
    flags: ['statusDamage', 'spreadStatus', 'lingering', 'statusOnHit'],
    skills: ['ult_pandemic', 'ult_blackMiasma', 'hexMist', 'curseBurst', 'plagueMark', 'soulSeal']
  });
  def({
    id: 'graceEmperor', name: '天佑楽帝', tier: 3,
    from: ['bard', 'priest'],
    desc: 'この人が歌い出すと、同じ4人が別の隊になる。',
    req: [accStyle('buff', 130, 0.40), legendN(1), lv(12)],
    base: { hp: 168, mp: 104, str: 10, int: 21, vit: 14, agi: 16, luk: 15 },
    grow: { hp: 14, mp: 7.0, str: 1.1, int: 2.9, vit: 1.8, agi: 2.2, luk: 1.9 },
    mods: { buffPower: 0.60, buffTurns: 2, magPct: 0.18, mp: 60, mpRegen: 7, spd: 10 },
    flags: ['boonShare', 'encore', 'boonGuard', 'openingRally'],
    skills: ['ult_paean', 'valorMarch', 'warSong', 'wardSong', 'resonance', 'encoreCall', 'groupHeal']
  });
  def({
    id: 'ruinEmperor', name: '零落呪帝', tier: 3,
    from: ['binder', 'hexer'],
    desc: '殺さずに、勝てなくする。強かったはずのものが、ただの的になる。',
    req: [accStyle('debuff', 130, 0.40), legendN(1), lv(12)],
    base: { hp: 164, mp: 100, str: 10, int: 23, vit: 13, agi: 14, luk: 12 },
    grow: { hp: 13, mp: 6.8, str: 1.0, int: 3.1, vit: 1.7, agi: 1.8, luk: 1.4 },
    mods: { debuffPower: 0.60, debuffTurns: 2, 'el_dark': 0.35, magPct: 0.22, pierce: 0.18 },
    flags: ['hexBrand', 'doomToll', 'spreadHex', 'frailtyAura'],
    skills: ['ult_ruin', 'witherAll', 'dullEdge', 'sapWill', 'leadenChant', 'frailty', 'bindingWord']
  });
  def({
    id: 'rotKing', name: '万蝕王', tier: 3,
    from: ['plaguedoctor', 'hexer'],
    desc: '倒すのではなく、腐らせる。触れたものが、触れた順に還っていく。',
    req: [accStyle('status', 130, 0.40), legendN(1), lv(12)],
    base: { hp: 172, mp: 98, str: 10, int: 23, vit: 15, agi: 13, luk: 12 },
    grow: { hp: 14, mp: 6.8, str: 1.0, int: 3.1, vit: 1.9, agi: 1.5, luk: 1.4 },
    mods: { dotPower: 0.65, dotTurns: 2, 'el_dark': 0.35, magPct: 0.20, lifesteal: 0.12 },
    flags: ['festering', 'deepRot', 'rotFeast', 'venomEdge'],
    skills: ['ult_rotworld', 'miasma', 'pyreCurse', 'incubate', 'sporeBurst', 'rotTouch', 'plagueMark']
  });
  def({
    id: 'poleEmperor', name: '双極魔剣皇', tier: 3,
    from: ['spellblade', 'elementalist', 'assassin'],
    req: [accStyleDual('crit', 'elem', 60), legendN(1), lv(12)],
    base: { hp: 185, mp: 88, str: 20, int: 20, vit: 14, agi: 16, luk: 13 },
    grow: { hp: 15, mp: 5.6, str: 2.9, int: 2.9, vit: 1.9, agi: 1.9, luk: 1.5 },
    mods: { atkPct: 0.28, magPct: 0.28, critRate: 0.12, 'el_fire': 0.20, 'el_light': 0.20, 'el_dark': 0.20 },
    flags: ['spellblade', 'critPierce', 'guardBreak'],
    skills: ['ult_duality', 'ult_twinPole', 'spellEdge', 'dualPole', 'runeBlade', 'spellChain', 'unisonEdge']
  });

  /* 説明文・アイコンの補完 */
  var META = {
    phantomSaint:   ['🌑', '会心を極めた者だけが至る剣の頂。全ての一撃が必殺となる。'],
    mirrorEmperor:  ['🪞', '受けた痛みをそのまま返す不壊の王。反射が敵全体に及ぶ。'],
    calamityKing:   ['🌀', '一振りで戦場を消し飛ばす天災の化身。範囲の極致。'],
    astralArchmage: ['✴', '六属性すべてを従える星の術皇。あらゆる耐性は意味を成さない。'],
    alchemySovereign:['🏺', '万物を薬と爆薬に変える錬成の王。アイテムは尽きない。'],
    bloodfiend:     ['🩸', '喰らうほどに強くなる鬼神。奪った生命がそのまま力となる。'],
    finalArbiter:   ['⚖', '光と闇を同時に振るう最終審判者。相反する二極が一つになる。'],
    voidSovereign:  ['🕳', 'ミシックの力を束ねた者のみが到達する空位の玉座。'],
    skyrunner:      ['💨', '誰にも捉えられない領域。避け、先んじ、斬り刻む。'],
    plaguelord:     ['☣', 'あらゆる呪いを従える災厄の王。蝕まれた敵ほど深く斬れる。'],
    poleEmperor:    ['⚔', '剣と魔、二つの極を一振りに束ねた皇。どちらの数値も捨てない。']
  };
  Object.keys(META).forEach(function (k) {
    if (C[k]) { C[k].icon = META[k][0]; C[k].desc = META[k][1]; }
  });

  /* =================== 仲間だけの最上級職 ===================
   * ally を持つ職業はその人物専用。主人公は就けない。
   * 「主人公は何にでもなれる／仲間は自分にしかなれないものになる」という対比。 */

  def({
    id: 'dawnMother', name: '暁光聖母', tier: 3, ally: 'mina',
    from: ['exorcist', 'priest'],
    desc: '倒れることを許さない者。光と癒しの極みに達し、断たれた命すら朝へ連れ戻す。',
    req: [accStyle('life', 90, 0.30), accElemPair(50), lv(12)],
    base: { hp: 190, mp: 110, str: 8, int: 23, vit: 20, agi: 10, luk: 14 },
    grow: { hp: 15, mp: 7.2, str: 0.9, int: 3.2, vit: 2.6, agi: 1.2, luk: 1.8 },
    mods: { magPct: 0.30, 'el_light': 0.45, lifesteal: 0.20, dr: 0.15, mp: 60, mpRegen: 8 },
    flags: ['overheal', 'endure', 'wardAll'],
    skills: ['ult_dawnbreak', 'resurrect', 'groupHeal', 'blessing', 'purify', 'guardianAngel', 'holyChain']
  });
  def({
    id: 'undyingAegis', name: '不倒聖盾', tier: 3, ally: 'mina',
    from: ['guardian', 'priest'],
    desc: '祈りを盾の形に固めた者。前に出ることはないが、この人の後ろで誰も倒れない。',
    req: [accStyle('guard', 100, 0.35), legendN(1), lv(12)],
    base: { hp: 250, mp: 90, str: 9, int: 18, vit: 28, agi: 7, luk: 11 },
    grow: { hp: 21, mp: 5.6, str: 1.0, int: 2.4, vit: 3.6, agi: 0.8, luk: 1.3 },
    mods: { defPct: 0.40, res: 45, dr: 0.22, hpPct: 0.25, reflect: 0.20 },
    flags: ['wardAll', 'lastStand', 'barrierOnHit', 'overheal'],
    skills: ['ult_undying', 'bulwark', 'sanctuary', 'homunculus', 'guardianAngel', 'martyr', 'groupHeal']
  });

  def({
    id: 'ironBastion', name: '不動城塞', tier: 3, ally: 'garo',
    from: ['guardian'],
    desc: '守るべき城を失って、自分が城になった男。動かないことが、そのまま攻撃になる。',
    req: [accStyleDual('guard', 'reflect', 60), legendN(1), lv(12)],
    base: { hp: 290, mp: 55, str: 18, int: 8, vit: 32, agi: 6, luk: 8 },
    grow: { hp: 25, mp: 3.0, str: 2.2, int: 0.9, vit: 4.0, agi: 0.7, luk: 0.9 },
    mods: { defPct: 0.45, dr: 0.24, reflect: 0.32, reflectPow: 0.45, hpPct: 0.30 },
    flags: ['wallPower', 'thornAura', 'counterEvade', 'endure'],
    skills: ['ult_bastion', 'counterWall', 'bulwark', 'tauntRoar', 'ironWall', 'retaliate', 'earthSplitter']
  });
  def({
    id: 'wrathBulwark', name: '忿怒盾鬼', tier: 3, ally: 'garo',
    from: ['berserker'],
    desc: '守り切れなかった記憶を燃やして立つ者。傷が深いほど、その一撃は重くなる。',
    req: [accStyleDual('life', 'guard', 55), legendN(1), lv(12)],
    base: { hp: 260, mp: 55, str: 24, int: 8, vit: 24, agi: 10, luk: 9 },
    grow: { hp: 22, mp: 3.0, str: 3.2, int: 0.9, vit: 3.0, agi: 1.3, luk: 1.0 },
    mods: { atkPct: 0.35, lifesteal: 0.32, hpPct: 0.28, dr: 0.10, critDmg: 0.40 },
    flags: ['lowHpRage', 'lastStand', 'killHeal', 'wallPower'],
    skills: ['ult_wrathgate', 'carnage', 'bloodRage', 'bloodOffering', 'avengeStance', 'crushArmor', 'tauntRoar']
  });

  def({
    id: 'worldTheorem', name: '万理術理', tier: 3, ally: 'sera',
    from: ['elementalist'],
    desc: '相刻の式をすべて解いた者。世界が何でできているかを知っているので、何にでも効く。',
    req: [accStyle('elem', 140, 0.42), allElem(0.14), lv(12)],
    base: { hp: 150, mp: 130, str: 8, int: 26, vit: 12, agi: 15, luk: 13 },
    grow: { hp: 12, mp: 8.0, str: 0.9, int: 3.6, vit: 1.5, agi: 2.0, luk: 1.5 },
    mods: { magPct: 0.35, pierce: 0.45, mp: 70, mpRegen: 9, spd: 12 },
    flags: ['allElemStrike', 'elementCycle', 'weakHunter', 'doubleCast'],
    skills: ['ult_theorem', 'ult_astralBurst', 'elementalBurst', 'meteor', 'blizzard', 'chainBolt', 'overload']
  });
  def({
    id: 'stillCalamity', name: '静謐災禍', tier: 3, ally: 'sera',
    from: ['stormcaller', 'hexer'],
    desc: '声を荒らげずに土地を枯らす者。理屈が分かっているぶん、手際がいい。',
    req: [accStyleDual('aoe', 'status', 55), legendN(1), lv(12)],
    base: { hp: 155, mp: 120, str: 9, int: 25, vit: 13, agi: 17, luk: 12 },
    grow: { hp: 12, mp: 7.4, str: 1.0, int: 3.4, vit: 1.6, agi: 2.2, luk: 1.4 },
    mods: { aoePower: 0.50, aoeRatio: 0.35, 'el_dark': 0.35, magPct: 0.22, mp: 50 },
    flags: ['spreadStatus', 'lingering', 'statusDamage', 'overkillChain'],
    skills: ['ult_stillness', 'plagueMark', 'gravityWell', 'cycloneCage', 'hexMist', 'soulSeal', 'dispelWave']
  });

  G.CLASSES = C;
  G.CLASS_LIST = Object.keys(C).map(function (k) { return C[k]; });
  G.STARTER_CLASSES = ['swordsman', 'mage', 'rogue', 'priest'];
})();
