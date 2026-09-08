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
  G.COND = { statusApplied: statusApplied, evades: evades, stat: stat, allElem: allElem, pairElem: pairElem, mythicN: mythicN, legendN: legendN, lv: lv,
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
    skills: ['slash', 'warcry', 'heavyBlow']
  });
  def({
    id: 'mage', name: '魔術士', tier: 1, icon: '📕',
    desc: '全属性魔法の使い手。属性ビルド・範囲ビルドの起点となる。',
    base: { hp: 88, mp: 60, str: 5, int: 13, vit: 6, agi: 8, luk: 8 },
    grow: { hp: 7, mp: 5, str: 0.6, int: 2.2, vit: 0.9, agi: 1.1, luk: 1.0 },
    mods: { magPct: 0.06, mpRegen: 2 }, flags: [],
    skills: ['fireball', 'iceLance', 'boltStrike', 'manaSurge']
  });
  def({
    id: 'rogue', name: '盗賊', tier: 1, icon: '🗝',
    desc: '素早さと会心に優れる。宝箱の中身が良くなり、ゴールド獲得も増える。',
    base: { hp: 100, mp: 38, str: 9, int: 7, vit: 7, agi: 13, luk: 12 },
    grow: { hp: 8.5, mp: 3, str: 1.5, int: 1.0, vit: 1.0, agi: 2.0, luk: 1.8 },
    mods: { critRate: 0.08, critDmg: 0.15, goldUp: 0.20, dropUp: 0.15 }, flags: [],
    skills: ['backstab', 'venomFang', 'shadowStep']
  });
  def({
    id: 'priest', name: '神官', tier: 1, icon: '✧',
    desc: '回復と光闇の術に長ける。反射・耐久・アイテムなど支援型ビルドに強い。',
    base: { hp: 108, mp: 52, str: 7, int: 11, vit: 9, agi: 7, luk: 9 },
    grow: { hp: 9.5, mp: 4.2, str: 1.0, int: 1.9, vit: 1.4, agi: 0.9, luk: 1.2 },
    mods: { 'el_light': 0.10, dr: 0.04 }, flags: [],
    skills: ['heal', 'smite', 'sanctuary']
  });

  /* =================== 上級職 (Tier 2) =================== */
  def({
    id: 'berserker', name: '狂戦士', tier: 2, icon: '🪓',
    desc: '生命を削って暴威を振るう。吸収と低HP時の爆発力が持ち味。',
    from: ['swordsman', 'rogue'],
    req: [stat('atk', 95, '物理攻撃 95 以上'), stat('lifesteal', 0.10, '吸収 10% 以上'), lv(6)],
    base: { hp: 150, mp: 34, str: 17, int: 5, vit: 12, agi: 9, luk: 7 },
    grow: { hp: 14, mp: 2, str: 2.6, int: 0.5, vit: 1.8, agi: 1.2, luk: 0.8 },
    mods: { atkPct: 0.15, lifesteal: 0.10, dr: -0.05, hpPct: 0.10 }, flags: ['lowHpRage'],
    skills: ['slash', 'heavyBlow', 'bloodRage', 'crushArmor']
  });
  def({
    id: 'assassin', name: '暗殺者', tier: 2, icon: '🔪',
    desc: '会心特化。低HPの敵を確実に葬る処刑術を持つ。',
    from: ['rogue', 'swordsman'],
    req: [stat('critRate', 0.35, '会心率 35% 以上'), stat('critDmg', 1.90, '会心ダメージ 190% 以上'), lv(6)],
    base: { hp: 108, mp: 40, str: 13, int: 7, vit: 7, agi: 16, luk: 15 },
    grow: { hp: 9, mp: 3, str: 2.0, int: 0.9, vit: 1.0, agi: 2.4, luk: 2.2 },
    mods: { critRate: 0.12, critDmg: 0.35, spd: 12 }, flags: ['critPierce'],
    skills: ['backstab', 'thousandCuts', 'shadowStep', 'executioner']
  });
  def({
    id: 'elementalist', name: '元素使い', tier: 2, icon: '🜁',
    desc: '複数属性を操る術士。弱点を突き、耐性を貫く。',
    from: ['mage', 'priest'],
    req: [{ label: '3属性以上のダメージ強化が 15% 以上', d: { t: 'elemCount', n: 3, v: 0.15 },
            test: function (c) { return G.MAGIC_ELEMENTS.filter(function (e) { return (c.S['el_' + e] || 0) >= 0.15; }).length >= 3; } },
          stat('mag', 95, '魔法攻撃 95 以上'), lv(6)],
    base: { hp: 96, mp: 74, str: 5, int: 18, vit: 7, agi: 10, luk: 9 },
    grow: { hp: 8, mp: 6, str: 0.5, int: 2.8, vit: 1.0, agi: 1.2, luk: 1.0 },
    mods: { magPct: 0.14, pierce: 0.20, 'el_fire': 0.08, 'el_ice': 0.08, 'el_thunder': 0.08, 'el_wind': 0.08 },
    flags: ['guardBreak'],
    skills: ['fireball', 'iceLance', 'boltStrike', 'galeEdge', 'elementalBurst']
  });
  def({
    id: 'guardian', name: '守護者', tier: 2, icon: '🛡',
    desc: '反射と鉄壁の体現者。受けたダメージを刃に変える。',
    from: ['swordsman', 'priest'],
    req: [stat('reflect', 0.25, '反射率 25% 以上'), stat('def', 70, '物理防御 70 以上'), lv(6)],
    base: { hp: 168, mp: 40, str: 11, int: 8, vit: 18, agi: 5, luk: 7 },
    grow: { hp: 16, mp: 2.6, str: 1.6, int: 1.0, vit: 2.6, agi: 0.6, luk: 0.8 },
    mods: { defPct: 0.20, reflect: 0.15, dr: 0.08, hpPct: 0.12, spd: -5 }, flags: ['barrierOnHit'],
    skills: ['thornGuard', 'ironWall', 'retaliate', 'provoke']
  });
  def({
    id: 'stormcaller', name: '嵐使い', tier: 2, icon: '🌪',
    desc: '範囲殲滅の専門家。単体技すら周囲へ波及させる。',
    from: ['mage', 'rogue'],
    req: [stat('aoeRatio', 0.30, '波及率 30% 以上'), stat('aoePower', 0.30, '範囲威力 30% 以上'), lv(6)],
    base: { hp: 104, mp: 66, str: 8, int: 15, vit: 8, agi: 14, luk: 9 },
    grow: { hp: 9, mp: 5, str: 1.0, int: 2.3, vit: 1.1, agi: 1.9, luk: 1.0 },
    mods: { aoePower: 0.30, aoeRatio: 0.25, 'el_wind': 0.20, spd: 10 }, flags: ['overkillChain'],
    skills: ['tempest', 'shockwave', 'stormCall', 'gravityWell']
  });
  def({
    id: 'alchemist', name: '錬金術士', tier: 2, icon: '⚗',
    desc: 'アイテムを兵器に変える技師。消耗品を消耗させずに戦う。',
    from: ['mage', 'rogue', 'priest'],
    req: [stat('itemPower', 0.40, 'アイテム威力 40% 以上'), itemsUsed(10), lv(6)],
    base: { hp: 112, mp: 58, str: 8, int: 14, vit: 10, agi: 10, luk: 12 },
    grow: { hp: 10, mp: 4, str: 1.0, int: 2.0, vit: 1.4, agi: 1.3, luk: 1.6 },
    mods: { itemPower: 0.45, itemKeep: 0.15, dropUp: 0.20 }, flags: ['itemRefill'],
    skills: ['throwBomb', 'panacea', 'transmute', 'catalyst', 'acidFlask']
  });
  def({
    id: 'exorcist', name: '破魔僧', tier: 2, icon: '☩',
    desc: '光と闇、相反する二極を同時に操る修行者。',
    from: ['priest', 'mage'],
    req: [pairElem('light', 'dark', 0.45), stat('mag', 85, '魔法攻撃 85 以上'), lv(6)],
    base: { hp: 126, mp: 62, str: 9, int: 15, vit: 11, agi: 8, luk: 10 },
    grow: { hp: 11, mp: 4.6, str: 1.2, int: 2.2, vit: 1.5, agi: 1.0, luk: 1.2 },
    mods: { 'el_light': 0.20, 'el_dark': 0.20, lifesteal: 0.08, dr: 0.06 }, flags: ['soulHarvest'],
    skills: ['smite', 'darkPact', 'judgement', 'sanctuary', 'holyNova']
  });

  def({
    id: 'windrunner', name: '韋駄天', tier: 2, icon: '🌬',
    desc: '速さこそ攻防のすべて。避けきり、先んじて刻む。',
    from: ['rogue', 'swordsman'],
    req: [stat('spd', 70, '素早さ 70 以上'), stat('evade', 0.20, '回避率 20% 以上'), lv(6)],
    base: { hp: 112, mp: 42, str: 12, int: 8, vit: 8, agi: 18, luk: 11 },
    grow: { hp: 9.5, mp: 3, str: 1.8, int: 1.0, vit: 1.1, agi: 2.8, luk: 1.4 },
    mods: { spd: 22, evade: 0.12, critRate: 0.06 }, flags: ['firstHitCrit', 'counterEvade'],
    skills: ['shukuchi', 'galeFlurry', 'backstab', 'whirlwind']
  });
  def({
    id: 'hexer', name: '呪術師', tier: 2, icon: '🕯',
    desc: '毒と呪いで敵を弱らせ、崩れたところを刈り取る。',
    from: ['mage', 'priest', 'rogue'],
    req: [statusApplied(12), stat('mag', 85, '魔法攻撃 85 以上'), lv(6)],
    base: { hp: 108, mp: 66, str: 7, int: 16, vit: 9, agi: 11, luk: 10 },
    grow: { hp: 9, mp: 5, str: 0.8, int: 2.4, vit: 1.2, agi: 1.3, luk: 1.2 },
    mods: { 'el_dark': 0.22, magPct: 0.10 }, flags: ['statusDamage', 'lingering'],
    skills: ['plague', 'hexMist', 'venomFang', 'curseBurst']
  });
  def({
    id: 'spellblade', name: '魔剣士', tier: 2, icon: '🗡',
    desc: '剣に魔を通す。物理と魔法、どちらの数値も無駄にしない。',
    from: ['swordsman', 'mage'],
    req: [stat('atk', 90, '物理攻撃 90 以上'), stat('mag', 90, '魔法攻撃 90 以上'), lv(6)],
    base: { hp: 128, mp: 56, str: 13, int: 13, vit: 10, agi: 11, luk: 9 },
    grow: { hp: 11, mp: 4, str: 2.0, int: 2.0, vit: 1.4, agi: 1.3, luk: 1.0 },
    mods: { atkPct: 0.10, magPct: 0.10, 'el_fire': 0.12, 'el_light': 0.12 }, flags: ['spellblade'],
    skills: ['spellEdge', 'dualPole', 'slash', 'fireball']
  });

  /* =================== 最上級職 (Tier 3) =================== */
  def({
    id: 'phantomSaint', name: '絶影剣聖', tier: 3,
    from: ['assassin', 'berserker'],
    req: [stat('critRate', 0.60, '会心率 60% 以上'), stat('critDmg', 2.60, '会心ダメージ 260% 以上'),
          critCount(60), legendN(1), lv(12)],
    base: { hp: 150, mp: 60, str: 20, int: 10, vit: 11, agi: 22, luk: 20 },
    grow: { hp: 12, mp: 4, str: 2.9, int: 1.2, vit: 1.5, agi: 3.0, luk: 2.8 },
    mods: { critRate: 0.20, critDmg: 0.90, spd: 25, atkPct: 0.25 }, flags: ['critPierce', 'doubleStrike'],
    skills: ['ult_phantomEdge', 'thousandCuts', 'executioner', 'shadowStep', 'backstab']
  });
  def({
    id: 'mirrorEmperor', name: '鏡獄天帝', tier: 3,
    from: ['guardian'],
    req: [stat('reflect', 0.60, '反射率 60% 以上'), stat('def', 110, '物理防御 110 以上'),
          reflectKills(8), legendN(1), lv(12)],
    base: { hp: 230, mp: 60, str: 14, int: 12, vit: 26, agi: 7, luk: 9 },
    grow: { hp: 20, mp: 3.4, str: 1.8, int: 1.4, vit: 3.4, agi: 0.8, luk: 1.0 },
    mods: { reflect: 0.35, reflectPow: 0.60, defPct: 0.35, dr: 0.15, hpPct: 0.20 },
    flags: ['reflectAll', 'healOnReflect', 'barrierOnHit'],
    skills: ['ult_mirrorEnd', 'thornGuard', 'mirrorField', 'retaliate', 'ironWall']
  });
  def({
    id: 'calamityKing', name: '天災嵐王', tier: 3,
    from: ['stormcaller'],
    req: [stat('aoePower', 0.80, '範囲威力 80% 以上'), stat('aoeRatio', 0.55, '波及率 55% 以上'),
          aoeKills(20), legendN(1), lv(12)],
    base: { hp: 150, mp: 90, str: 11, int: 21, vit: 12, agi: 19, luk: 11 },
    grow: { hp: 12, mp: 6.5, str: 1.2, int: 3.0, vit: 1.6, agi: 2.4, luk: 1.2 },
    mods: { aoePower: 0.60, aoeRatio: 0.40, magPct: 0.25, 'el_wind': 0.30, spd: 15 },
    flags: ['overkillChain', 'fireSplash'],
    skills: ['ult_calamity', 'tempest', 'meteor', 'blizzard', 'stormCall']
  });
  def({
    id: 'astralArchmage', name: '星辰術皇', tier: 3,
    from: ['elementalist', 'exorcist'],
    req: [allElem(0.22), stat('pierce', 0.35, '耐性貫通 35% 以上'), stat('mag', 160, '魔法攻撃 160 以上'), legendN(1), lv(12)],
    base: { hp: 140, mp: 108, str: 9, int: 24, vit: 11, agi: 14, luk: 12 },
    grow: { hp: 11, mp: 7.5, str: 0.8, int: 3.4, vit: 1.4, agi: 1.6, luk: 1.4 },
    mods: { magPct: 0.30, pierce: 0.30, 'el_fire': 0.18, 'el_ice': 0.18, 'el_thunder': 0.18,
            'el_wind': 0.18, 'el_light': 0.18, 'el_dark': 0.18 },
    flags: ['guardBreak', 'allElemStrike', 'freezeOnIce', 'shockOnThunder'],
    skills: ['ult_astralBurst', 'elementalBurst', 'meteor', 'blizzard', 'chainBolt', 'holyNova']
  });
  def({
    id: 'alchemySovereign', name: '万象錬成王', tier: 3,
    from: ['alchemist'],
    req: [stat('itemPower', 1.00, 'アイテム威力 100% 以上'), stat('itemKeep', 0.35, 'アイテム温存率 35% 以上'),
          itemsUsed(25), legendN(1), lv(12)],
    base: { hp: 170, mp: 84, str: 12, int: 19, vit: 15, agi: 14, luk: 18 },
    grow: { hp: 14, mp: 5.6, str: 1.3, int: 2.6, vit: 2.0, agi: 1.7, luk: 2.4 },
    mods: { itemPower: 0.90, itemKeep: 0.25, magPct: 0.20, dropUp: 0.40, goldUp: 0.35 },
    flags: ['itemRefill', 'itemEcho'],
    skills: ['ult_grandElixir', 'throwBomb', 'acidFlask', 'panacea', 'catalyst', 'transmute']
  });
  def({
    id: 'bloodfiend', name: '血喰鬼神', tier: 3,
    from: ['berserker', 'assassin'],
    req: [stat('lifesteal', 0.35, '吸収 35% 以上'), stat('atk', 200, '物理攻撃 200 以上'), kills(45), legendN(1), lv(12)],
    base: { hp: 210, mp: 56, str: 24, int: 8, vit: 17, agi: 15, luk: 10 },
    grow: { hp: 18, mp: 2.8, str: 3.4, int: 0.8, vit: 2.2, agi: 1.8, luk: 1.2 },
    mods: { atkPct: 0.40, lifesteal: 0.30, hpPct: 0.25, 'el_dark': 0.25 },
    flags: ['lowHpRage', 'stackAtkOnKill', 'soulHarvest'],
    skills: ['ult_devourFang', 'bloodRage', 'crushArmor', 'heavyBlow', 'venomFang']
  });
  def({
    id: 'finalArbiter', name: '終焉審判者', tier: 3,
    from: ['exorcist', 'priest'],
    req: [pairElem('light', 'dark', 0.95), stat('dr', 0.25, '被ダメ軽減 25% 以上'), stat('mag', 160, '魔法攻撃 160 以上'),
          legendN(1), lv(12)],
    base: { hp: 190, mp: 96, str: 13, int: 22, vit: 16, agi: 12, luk: 13 },
    grow: { hp: 15, mp: 6.4, str: 1.4, int: 3.1, vit: 2.0, agi: 1.3, luk: 1.5 },
    mods: { 'el_light': 0.40, 'el_dark': 0.40, magPct: 0.25, dr: 0.12, lifesteal: 0.15 },
    flags: ['soulHarvest', 'guardBreak', 'endure'],
    skills: ['ult_lastJudgement', 'judgement', 'holyNova', 'darkPact', 'sanctuary']
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
    skills: ['ult_voidCollapse', 'ult_astralBurst', 'elementalBurst', 'gravityWell', 'executioner']
  });

  def({
    id: 'skyrunner', name: '神速天翔', tier: 3,
    from: ['windrunner', 'assassin'],
    req: [stat('spd', 130, '素早さ 130 以上'), stat('evade', 0.35, '回避率 35% 以上'),
          evades(35), legendN(1), lv(12)],
    base: { hp: 160, mp: 70, str: 18, int: 12, vit: 12, agi: 26, luk: 16 },
    grow: { hp: 13, mp: 4.4, str: 2.6, int: 1.4, vit: 1.6, agi: 3.6, luk: 2.2 },
    mods: { spd: 45, evade: 0.22, critRate: 0.15, atkPct: 0.20 },
    flags: ['speedPower', 'counterEvade', 'firstHitCrit', 'doubleStrike'],
    skills: ['ult_thousandShadow', 'shukuchi', 'galeFlurry', 'thousandCuts', 'whirlwind']
  });
  def({
    id: 'plaguelord', name: '疫災呪王', tier: 3,
    from: ['hexer', 'exorcist'],
    req: [statusApplied(60), stat('el_dark', 0.50, '闇属性ダメージ 50% 以上'),
          stat('pierce', 0.25, '耐性貫通 25% 以上'), legendN(1), lv(12)],
    base: { hp: 170, mp: 96, str: 10, int: 23, vit: 14, agi: 13, luk: 12 },
    grow: { hp: 14, mp: 6.6, str: 1.0, int: 3.2, vit: 1.8, agi: 1.5, luk: 1.4 },
    mods: { 'el_dark': 0.40, magPct: 0.25, pierce: 0.20, lifesteal: 0.12 },
    flags: ['statusDamage', 'spreadStatus', 'lingering', 'statusOnHit'],
    skills: ['ult_pandemic', 'hexMist', 'curseBurst', 'plague', 'darkPact']
  });
  def({
    id: 'poleEmperor', name: '双極魔剣皇', tier: 3,
    from: ['spellblade', 'elementalist', 'assassin'],
    req: [stat('atk', 180, '物理攻撃 180 以上'), stat('mag', 180, '魔法攻撃 180 以上'),
          stat('critRate', 0.35, '会心率 35% 以上'), legendN(1), lv(12)],
    base: { hp: 185, mp: 88, str: 20, int: 20, vit: 14, agi: 16, luk: 13 },
    grow: { hp: 15, mp: 5.6, str: 2.9, int: 2.9, vit: 1.9, agi: 1.9, luk: 1.5 },
    mods: { atkPct: 0.28, magPct: 0.28, critRate: 0.12, 'el_fire': 0.20, 'el_light': 0.20, 'el_dark': 0.20 },
    flags: ['spellblade', 'critPierce', 'guardBreak'],
    skills: ['ult_duality', 'spellEdge', 'dualPole', 'elementalBurst', 'heavyBlow']
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

  G.CLASSES = C;
  G.CLASS_LIST = Object.keys(C).map(function (k) { return C[k]; });
  G.STARTER_CLASSES = ['swordsman', 'mage', 'rogue', 'priest'];
})();
