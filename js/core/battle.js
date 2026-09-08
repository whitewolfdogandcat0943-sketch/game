/* battle.js - 戦闘エンジン（ターン制・速度順） */
G.Battle = (function () {
  var U = G.U;

  /* ===================== ユニット生成 ===================== */

  function makeHeroUnit(state) {
    var hero = state.hero;
    var u = {
      side: 'player', id: 'hero', name: hero.name, icon: G.CLASSES[hero.classId].icon,
      hero: hero, state: state, buffs: [], flagBuffs: [], statuses: [],
      barrier: 0, endureUsed: false, killStacks: 0, extraEndure: false,
      weak: [], resist: []
    };
    refresh(u);
    u.hp = hero.hp; u.mp = hero.mp;
    if (u.hp <= 0) u.hp = u.S.maxHp;
    return u;
  }

  function makeEnemyUnit(def, floor, idx) {
    var s = enemyScale(floor, def);
    var u = {
      side: 'enemy', id: def.id + '#' + idx, name: def.name, icon: def.icon, ref: def,
      isBoss: !!def.boss, buffs: [], flagBuffs: [], statuses: [],
      barrier: 0, endureUsed: false, killStacks: 0,
      weak: def.weak || [], resist: def.resist || [],
      base: {
        maxHp: Math.round(def.hp * s.hp), atk: Math.round(def.atk * s.pw), mag: Math.round(def.mag * s.pw),
        def: Math.round(def.def * s.df), res: Math.round(def.res * s.df), spd: def.spd + Math.floor(floor * 0.4)
      },
      exp: Math.round(def.exp * s.rw), gold: Math.round(def.gold * s.rw)
    };
    refresh(u);
    u.hp = u.S.maxHp; u.mp = 999;
    return u;
  }

  /* 敵の「適正階層」。ここからの差分でスケールするので、
   * 上位ティアの敵が登場した瞬間に極端な数値にならない。 */
  var HOME_FLOOR = { mob: { 1: 1, 2: 6, 3: 13 }, boss: { 1: 5, 2: 10, 3: 15 } };

  /** 階層に応じた敵スケーリング */
  function enemyScale(floor, def) {
    var home = (def && def.boss ? HOME_FLOOR.boss : HOME_FLOOR.mob)[(def && def.tier) || 1] || 1;
    var rel = Math.max(-1, floor - home);
    var abs = Math.max(0, floor - 1);
    return {
      hp: Math.max(0.6, 1 + rel * 0.20 + Math.pow(Math.max(0, rel), 1.45) * 0.018),
      /* 雑魚は数で攻めるため、1体あたりの火力は控えめにする */
      pw: (def && def.boss ? 1 : 0.88) * Math.max(0.7, 1 + rel * 0.10 + Math.pow(Math.max(0, rel), 1.30) * 0.006),
      df: Math.max(0.7, 1 + rel * 0.11),
      rw: 1 + abs * 0.26
    };
  }

  /* ===================== ステータス再計算 ===================== */

  function refresh(u) {
    if (u.side === 'player') {
      var c = G.Stats.compute(u.hero, u.buffs, u.flagBuffs.map(function (f) { return f.f; }));
      u.S = c.S; u.flags = c.flags;
      u.S.maxHp = Math.max(1, u.S.maxHp);
      /* 装備の付け替えで最大値が下がった場合に現在値がはみ出さないようにする */
      if (u.flags.speedPower) u.S.atk += Math.round(u.S.spd * 0.40);
      if (u.flags.wallPower) u.S.atk += Math.round(u.S.def * 0.35);
      if (u.hp != null) u.hp = Math.min(u.hp, u.S.maxHp);
      if (u.mp != null) u.mp = Math.min(u.mp, u.S.maxMp);
    } else {
      var S = {
        maxHp: u.base.maxHp, atk: u.base.atk, mag: u.base.mag, def: u.base.def, res: u.base.res, spd: u.base.spd,
        critRate: 0.05, critDmg: 1.5, reflect: 0, reflectPow: 0, aoeRatio: 0, aoePower: 0,
        pierce: 0, dr: 0, dmgUp: 0, lifesteal: 0, evade: 0, itemPower: 0, itemKeep: 0
      };
      G.ALL_ELEMENTS.forEach(function (e) { S['el_' + e] = 0; });
      var pctAcc = {};
      u.buffs.forEach(function (b) {
        if (/Pct$/.test(b.k)) { pctAcc[b.k] = (pctAcc[b.k] || 0) + b.v; }
        else { S[b.k] = (S[b.k] || 0) + b.v; }
      });
      S.atk = Math.round(S.atk * (1 + (pctAcc.atkPct || 0)));
      S.mag = Math.round(S.mag * (1 + (pctAcc.magPct || 0)));
      S.def = Math.max(0, Math.round(S.def * (1 + (pctAcc.defPct || 0))));
      S.res = Math.max(0, Math.round(S.res * (1 + (pctAcc.resPct || 0))));
      S.maxHp = Math.round(S.maxHp * (1 + (pctAcc.hpPct || 0)));
      /* 状態異常の影響 */
      if (hasStatus(u, 'freeze')) S.spd = Math.round(S.spd * 0.4);
      S.dr = U.clamp(S.dr, -1, 0.85);
      u.S = S;
      u.flags = {};
      u.flagBuffs.forEach(function (f) { u.flags[f.f] = true; });
    }
    if (u.side === 'player' && hasStatus(u, 'freeze')) u.S.spd = Math.round(u.S.spd * 0.5);
    return u.S;
  }

  function hasStatus(u, k) { return u.statuses.some(function (s) { return s.k === k; }); }

  /* ===================== 戦闘開始 ===================== */

  function start(state, enemyUnits, opts) {
    opts = opts || {};
    var hero = makeHeroUnit(state);
    var b = {
      state: state, hero: hero, enemies: enemyUnits, units: [hero].concat(enemyUnits),
      round: 0, queue: [], qi: 0, log: [], over: false, result: null,
      awaiting: false, isBoss: !!opts.isBoss, floor: state.run.floor,
      rec: {
        critStreak: 0, critStreakMax: 0, reflectDmg: 0, reflectKills: 0, elementsUsed: {},
        itemsUsed: 0, damageTaken: 0, maxMultiKill: 0, kills: 0, aoeKills: 0, isBoss: !!opts.isBoss,
        damageDealt: 0, turns: 0,
        /* ミシック条件の判定に使う記録 */
        mpSpent: 0, skillsUsed: {}, skillKinds: 0, onlyBasic: true, statusPeak: 0,
        barrierAbsorbed: 0, evadeStreak: 0, evadeStreakMax: 0, healed: 0,
        weakKills: 0, maxHitDamage: 0, firstHitDone: false
      }
    };
    b.units.forEach(function (u, i) { u.idx = i; });
    b.fx = [];
    log(b, '⚔ 戦闘開始！ ' + enemyUnits.map(function (e) { return e.name; }).join('・') + ' が現れた。', 'sys');

    /* itemRefill: 戦闘開始時にアイテム補充 */
    if (hero.flags.itemRefill) {
      var pool = G.ITEMS.filter(function (i) { return i.tier <= 2; });
      var got = U.pick(pool);
      G.addItem(state.hero, got.id, 1);
      log(b, '🧪 錬成術が働き〈' + got.name + '〉を1個 補充した。', 'good');
    }
    if (hero.flags.alchemyShield) {
      hero.barrier += Math.round(hero.S.maxHp * 0.12 * (1 + (hero.S.itemPower || 0)));
      log(b, '⚗ 触媒が反応し、バリア（' + hero.barrier + '）を展開した。', 'good');
    }
    newRound(b);
    advance(b);
    return b;
  }

  function log(b, text, cls) { b.log.push({ t: text, c: cls || '' }); }

  /** 描画後に再生する演出イベントを積む（fx.js が消費する） */
  function fx(b, o) { if (b && b.fx && o.i != null) b.fx.push(o); }

  function alive(u) { return u.hp > 0; }
  function aliveEnemies(b) { return b.enemies.filter(alive); }

  function newRound(b) {
    b.round++;
    b.rec.turns++;
    b.queue = b.units.filter(alive).slice().sort(function (x, y) {
      var d = y.S.spd - x.S.spd;
      return d !== 0 ? d : (Math.random() - 0.5);
    });
    b.qi = 0;
  }

  /* ===================== 進行 ===================== */

  function advance(b) {
    if (b.over) return;
    var guard = 0;
    while (guard++ < 200) {
      if (b.qi >= b.queue.length) { endRound(b); if (b.over) return; newRound(b); continue; }
      var u = b.queue[b.qi];
      if (!alive(u)) { b.qi++; continue; }
      if (u.side === 'player') { b.awaiting = true; return; }
      takeEnemyTurn(b, u);
      b.qi++;
      if (checkEnd(b)) return;
    }
  }

  /** ターン開始時の行動不能判定 */
  function stunned(b, u) {
    if (hasStatus(u, 'shock') && U.chance(0.35)) { log(b, '⚡ ' + u.name + ' は麻痺して動けない！', 'bad'); return true; }
    if (hasStatus(u, 'freeze') && U.chance(0.20)) { log(b, '❄ ' + u.name + ' は凍りついて動けない！', 'bad'); return true; }
    return false;
  }

  function endRound(b) {
    if (b.hero.flags.thornAura && alive(b.hero)) {
      var td = Math.max(1, Math.round(b.hero.S.maxHp * 0.012 * (1 + (b.hero.S.reflect || 0) * 2)));
      aliveEnemies(b).forEach(function (x) {
        applyRawDamage(b, x, td, '🌵 棘の霧', b.hero, { aoe: true, noReflect: true });
      });
    }
    b.units.forEach(function (u) {
      if (!alive(u)) return;
      /* DOT */
      u.statuses.forEach(function (s) {
        if (s.k === 'burn' || s.k === 'poison') {
          var d = Math.max(1, Math.round(u.S.maxHp * s.v));
          applyRawDamage(b, u, d, s.k === 'burn' ? '🔥 火傷' : '☠ 毒', null);
        }
      });
      /* 継続時間の減少 */
      u.statuses = u.statuses.filter(function (s) { return (--s.t) > 0; });
      u.buffs = u.buffs.filter(function (x) { return (--x.t) > 0; });
      u.flagBuffs = u.flagBuffs.filter(function (x) { return (--x.t) > 0; });
      if (u.side === 'player') {
        var regen = u.S.mpRegen || 0;
        if (regen) u.mp = Math.min(u.S.maxMp, u.mp + regen);
      }
      refresh(u);
    });
    checkEnd(b);
  }

  function checkEnd(b) {
    if (b.over) return true;
    if (b.hero.hp <= 0) { b.over = true; b.result = 'lose'; log(b, '💀 力尽きた……', 'bad'); return true; }
    if (aliveEnemies(b).length === 0) { b.over = true; b.result = 'win'; log(b, '🏆 戦闘に勝利した！', 'good'); return true; }
    return false;
  }

  /* ===================== ダメージ計算 ===================== */

  function damageMods(u, tgt, b) {
    var extra = 0;
    var f = u.flags || {};
    if (f.pristine && u.side === 'player' && u._b && u._b.rec.damageTaken <= 0) extra += 0.40;
    if (f.lowHpRage && u.hp / u.S.maxHp <= 0.30) extra += 0.60;
    if (f.mythicScaling && u.side === 'player') extra += 0.10 * G.Stats.rarityCount(u.hero, 'mythic');
    if (f.stackAtkOnKill) extra += 0.06 * (u.killStacks || 0);
    if (f.manaPower && u.S.maxMp) extra += 0.30 * U.clamp(u.mp / u.S.maxMp, 0, 1);
    if (tgt) {
      if (f.executeLow && tgt.hp / tgt.S.maxHp <= 0.25) extra += 0.60;
      if (f.bossSlayer && tgt.isBoss) extra += 0.25;
      if (f.statusDamage && tgt.statuses.length) extra += 0.35;
    }
    if (b && u.side === 'player') {
      var n = aliveEnemies(b).length;
      if (f.hordeSlayer && n >= 3) extra += 0.22;
      if (f.soloFocus && n === 1) extra += 0.40;
    }
    return extra;
  }

  function elementMult(tgt, el, pierce, guardBreak) {
    if (el === 'phys') {
      if ((tgt.resist || []).indexOf('phys') >= 0) return mixResist(pierce, guardBreak);
      return 1;
    }
    if ((tgt.weak || []).indexOf(el) >= 0) return G.WEAK_MULT;
    if ((tgt.resist || []).indexOf(el) >= 0) return mixResist(pierce, guardBreak);
    return 1;
  }
  function mixResist(pierce, guardBreak) {
    var p = U.clamp((pierce || 0) + (guardBreak ? 0.25 : 0), 0, 1);
    return G.RESIST_MULT + (1 - G.RESIST_MULT) * p;
  }

  /**
   * 攻撃1発分の計算と適用
   * o: {power, kind, el, critBonus, critBonusDmg, alwaysCrit, defIgnore, isAoe, aoeBonus,
   *     tag, silent, noReflect, fullPierce, drain, sourceSkill}
   */
  function strike(b, src, tgt, o) {
    if (!alive(tgt) || !alive(src)) return 0;
    var S = src.S, T = tgt.S;
    var kind = o.kind === 'mag' ? 'mag' : 'phys';
    var atkStat = o.atkStat != null ? o.atkStat : (kind === 'mag' ? S.mag : S.atk);
    var defStat = kind === 'mag' ? T.res : T.def;
    var el = o.el || 'phys';

    /* 回避 */
    if (!o.trueHit && T.evade && U.chance(T.evade)) {
      if (!o.silent) { log(b, '💨 ' + tgt.name + ' は攻撃をかわした！'); fx(b, { t: 'miss', i: tgt.idx }); }
      if (tgt.side === 'player') {
        b.state.run.stats.evades = (b.state.run.stats.evades || 0) + 1;
        b.rec.evadeStreak++;
        b.rec.evadeStreakMax = Math.max(b.rec.evadeStreakMax, b.rec.evadeStreak);
      }
      if (tgt.flags && tgt.flags.counterEvade && !o.isCounter && alive(tgt)) {
        log(b, '⚡ ' + tgt.name + ' の反撃！');
        strike(b, tgt, src, { kind: 'phys', el: 'phys', power: 80, isCounter: true, trueHit: true });
      }
      return 0;
    }

    var dmg = atkStat * (o.power / 100);
    dmg *= (1 + (S['el_' + el] || 0));
    var eMult = o.fullPierce ? Math.max(1, elementMult(tgt, el, 1, true))
                             : elementMult(tgt, el, S.pierce, src.flags && src.flags.guardBreak);
    if (eMult > 1 && src.flags && src.flags.weakHunter) eMult *= 1.30;
    dmg *= eMult;
    dmg *= (1 + (S.dmgUp || 0) + damageMods(src, tgt, b));
    if (o.isAoe) dmg *= (1 + (S.aoePower || 0) + (o.aoeBonus || 0));

    /* 会心 */
    var critRate = (S.critRate || 0) + (o.critBonus || 0);
    var isCrit = o.alwaysCrit || U.chance(critRate);
    if (!isCrit && src.side === 'player' && src.flags.firstHitCrit && !b.rec.firstHitDone) isCrit = true;
    if (src.side === 'player') b.rec.firstHitDone = true;
    var defIgnore = o.defIgnore || 0;
    if (isCrit) {
      dmg *= ((S.critDmg || 1.5) + (o.critBonusDmg || 0));
      if (src.flags && src.flags.critPierce) defIgnore = Math.max(defIgnore, 0.5);
    }

    dmg *= 100 / (100 + Math.max(0, defStat) * (1 - U.clamp(defIgnore, 0, 1)));
    dmg *= U.rf(0.93, 1.07);
    dmg *= (1 - (T.dr || 0));
    var out = Math.max(1, Math.round(dmg));

    /* 記録: 会心連続数 */
    if (src.side === 'player') {
      if (isCrit) {
        b.rec.critStreak++;
        b.rec.critStreakMax = Math.max(b.rec.critStreakMax, b.rec.critStreak);
        b.state.run.stats.crits++;
      } else b.rec.critStreak = 0;
      b.rec.elementsUsed[el] = true;
    }

    var dealt = applyRawDamage(b, tgt, out, null, src, {
      crit: isCrit, el: el, silent: o.silent, tag: o.tag, aoe: !!o.isAoe, noReflect: o.noReflect, kind: kind
    });

    /* 吸収 */
    var steal = (S.lifesteal || 0) + (o.drain || 0);
    if (steal > 0 && dealt > 0) heal(b, src, Math.round(dealt * steal), '吸収');

    if (src.side === 'player') b.rec.maxHitDamage = Math.max(b.rec.maxHitDamage, dealt);

    /* 会心追撃 */
    if (isCrit && dealt > 0 && src.flags && src.flags.critChain && !o.isChain && alive(tgt) && U.chance(0.25)) {
      log(b, '🗡 追撃！', 'crit');
      var co = {}; for (var ck in o) co[ck] = o[ck];
      co.power = Math.round(o.power * 0.5); co.isChain = true; co.alwaysCrit = false;
      strike(b, src, tgt, co);
    }

    /* 攻撃時の状態異常付与 */
    if (dealt > 0 && src.flags && src.flags.statusOnHit && alive(tgt) && U.chance(0.20)) {
      addStatus(b, tgt, U.pick(['burn', 'poison', 'freeze', 'shock']), 2);
    }

    /* 属性付随効果 */
    if (src.flags) {
      if (src.flags.shockOnThunder && el === 'thunder' && alive(tgt) && U.chance(0.25)) addStatus(b, tgt, 'shock', 2);
      if (src.flags.freezeOnIce && el === 'ice' && alive(tgt) && U.chance(0.30)) addStatus(b, tgt, 'freeze', 2);
    }
    return dealt;
  }

  /** 純粋なダメージ適用（バリア・反射・撃破処理を含む） */
  function applyRawDamage(b, tgt, amount, label, src, meta) {
    meta = meta || {};
    if (!alive(tgt)) return 0;
    var dmg = amount;
    if (tgt.flags) {
      if (tgt.flags.wardAll) dmg = Math.round(dmg * 0.85);
      if (tgt.flags.lastStand && tgt.hp / tgt.S.maxHp <= 0.50) dmg = Math.round(dmg * 0.75);
    }
    dmg = Math.max(1, dmg);
    if (tgt.barrier > 0) {
      var absorbed = Math.min(tgt.barrier, dmg);
      tgt.barrier -= absorbed; dmg -= absorbed;
      if (tgt.side === 'player') b.rec.barrierAbsorbed += absorbed;
      if (absorbed > 0 && !meta.silent) log(b, '🛡 バリアが ' + absorbed + ' ダメージを吸収した。');
      if (dmg <= 0) return 0;
    }
    /* endure */
    if (dmg >= tgt.hp && (tgt.flags && tgt.flags.endure || tgt.extraEndure) && !tgt.endureUsed) {
      tgt.endureUsed = true;
      dmg = tgt.hp - 1;
      log(b, '✨ ' + tgt.name + ' は不屈の力で持ちこたえた！(HP1)', 'good');
    }
    tgt.hp = Math.max(0, tgt.hp - dmg);

    if (!meta.silent) {
      var t = (label ? label + ' ' : '') + tgt.name + ' に ' + dmg + ' ダメージ';
      if (meta.el && meta.el !== 'phys') t = G.ELEMENTS[meta.el].icon + ' ' + t;
      if (meta.crit) t = '💥 会心！ ' + t;
      if (meta.aoe) t = '〈範囲〉' + t;
      log(b, t, meta.crit ? 'crit' : (meta.aoe ? 'aoe' : ''));
      fx(b, { t: 'dmg', i: tgt.idx, v: dmg, crit: !!meta.crit, aoe: !!meta.aoe, el: meta.el });
    }
    if (src && src.side === 'player') { b.rec.damageDealt += dmg; }
    if (tgt.side === 'player') { b.rec.damageTaken += dmg; b.rec.evadeStreak = 0; }

    /* 被弾時バリア獲得 */
    if (dmg > 0 && tgt.flags && tgt.flags.barrierOnHit && alive(tgt) && U.chance(0.20)) {
      tgt.barrier += Math.round(tgt.S.maxHp * 0.10);
      log(b, '🛡 ' + tgt.name + ' はバリアを展開した。', 'good');
    }

    /* 反射 */
    if (src && !meta.noReflect && dmg > 0 && (tgt.S.reflect || 0) > 0 && src !== tgt) {
      var rd = Math.round(dmg * tgt.S.reflect * (1 + (tgt.S.reflectPow || 0)));
      if (rd > 0) {
        log(b, '🪞 ' + tgt.name + ' の反射！ ' + src.name + ' に ' + rd + ' ダメージ', 'refl');
        reflectHit(b, tgt, src, rd);
        if (tgt.flags && tgt.flags.reflectAll) {
          var others = (src.side === 'enemy' ? b.enemies : [b.hero]).filter(function (x) { return x !== src && alive(x); });
          others.forEach(function (o2) {
            var rd2 = Math.round(rd * 0.6);
            log(b, '🪞 反射が波及！ ' + o2.name + ' に ' + rd2 + ' ダメージ', 'refl');
            reflectHit(b, tgt, o2, rd2);
          });
        }
        if (tgt.flags && tgt.flags.healOnReflect) heal(b, tgt, Math.round(rd * 0.30), '鏡の加護');
      }
    }
    if (tgt.hp <= 0) onDeath(b, tgt, src, meta);
    return dmg;
  }

  function reflectHit(b, reflector, target, rd) {
    if (!alive(target)) return;
    var before = target.hp;
    target.hp = Math.max(0, target.hp - rd);
    fx(b, { t: 'dmg', i: target.idx, v: Math.min(before, rd), reflect: true });
    if (reflector.side === 'player') {
      b.rec.reflectDmg += Math.min(before, rd);
      b.rec.damageDealt += Math.min(before, rd);
    }
    if (target.hp <= 0) onDeath(b, target, reflector, { byReflect: true });
  }

  function onDeath(b, u, src, meta) {
    if (u._dead) return;
    u._dead = true;
    log(b, '☠ ' + u.name + ' を倒した！', 'good');
    fx(b, { t: 'die', i: u.idx });
    if (u.side === 'enemy') {
      b.rec.kills++;
      b.state.run.stats.kills++;
      if (meta && meta.byReflect) { b.rec.reflectKills++; b.state.run.stats.reflectKills++; }
      if (meta && meta.aoe) { b.rec.aoeKills++; b.state.run.stats.aoeKills++; }
      if (meta && meta.el && (u.weak || []).indexOf(meta.el) >= 0) b.rec.weakKills++;
      if (src && src.side === 'player') {
        if (src.flags.stackAtkOnKill) src.killStacks = (src.killStacks || 0) + 1;
        if (src.flags.killHeal) heal(b, src, Math.round(src.S.maxHp * 0.08), '喰らい取り');
        if (src.flags.deathSpike) {
          aliveEnemies(b).filter(function (x) { return x !== u; }).forEach(function (x) {
            applyRawDamage(b, x, Math.round(src.S.maxHp * 0.05), '💥 爆散', src, { aoe: true, noReflect: true });
          });
        }
        if (src.flags.soulHarvest) {
          var mp = Math.round(src.S.maxMp * 0.15);
          src.mp = Math.min(src.S.maxMp, src.mp + mp);
          log(b, '🔮 魂を喰らいMPを ' + mp + ' 回復した。', 'good');
        }
      }
    }
  }

  function heal(b, u, amount, label) {
    if (!alive(u) || amount <= 0) return 0;
    var before = u.hp;
    u.hp = Math.min(u.S.maxHp, u.hp + amount);
    var got = u.hp - before;
    if (u.side === 'player') b.rec.healed += got;
    var over = amount - got;
    if (over > 0 && u.flags && u.flags.overheal) {
      u.barrier += Math.round(over * 0.5);
      log(b, '🛡 溢れた治癒がバリアに変わった（' + u.barrier + '）。', 'good');
    }
    if (got > 0) {
      log(b, '💚 ' + (label ? label + ': ' : '') + u.name + ' のHPが ' + got + ' 回復した。', 'good');
      fx(b, { t: 'heal', i: u.idx, v: got });
    }
    return got;
  }

  function addStatus(b, u, kind, turns, val) {
    if (!alive(u)) return;
    var ex = u.statuses.filter(function (s) { return s.k === kind; })[0];
    if (ex) { ex.t = Math.max(ex.t, turns); return; }
    if (u.side === 'enemy' && b.hero.flags.lingering) turns += 1;
    u.statuses.push({ k: kind, t: turns, v: val || 0.06 });
    if (u.side === 'enemy') {
      b.rec.statusPeak = Math.max(b.rec.statusPeak, u.statuses.length);
      b.state.run.stats.statusApplied = (b.state.run.stats.statusApplied || 0) + 1;
    }
    var nm = { burn: '🔥 火傷', poison: '☠ 毒', freeze: '❄ 凍結', shock: '⚡ 麻痺' }[kind] || kind;
    log(b, nm + ' を ' + u.name + ' に付与した。');
    refresh(u);
  }

  function addBuff(b, u, k, v, t, quiet) {
    u.buffs.push({ k: k, v: v, t: t + 1 });
    refresh(u);
    if (!quiet) {
      var mk = G.MODKEYS[k];
      var txt = mk ? (mk.label + ' ' + (mk.kind === 'pct' ? U.sgnp(v) : U.sgn(v))) : (k + ' ' + v);
      log(b, (v >= 0 ? '⬆ ' : '⬇ ') + u.name + ': ' + txt + '（' + t + 'ターン）', v >= 0 ? 'good' : 'bad');
    }
  }

  /* ===================== 行動: スキル ===================== */

  function targetsFor(b, src, skill, targetIdx) {
    var foes = (src.side === 'player') ? aliveEnemies(b) : [b.hero];
    if (skill.target === 'self' || skill.kind === 'heal' || skill.kind === 'buff' || skill.kind === 'util') return [src];
    if (skill.target === 'all') return foes;
    if (skill.target === 'random') return foes;
    var t = null;
    if (src.side === 'player' && targetIdx != null) t = b.enemies[targetIdx];
    if (!t || !alive(t)) t = foes[0];
    return t ? [t] : [];
  }

  function useSkill(b, src, skillId, targetIdx) {
    var sk = G.SKILLS[skillId];
    if (!sk) return;
    var cost = sk.mp || 0;
    if (src.side === 'player') {
      if (src.mp < cost) { log(b, 'MPが足りない。', 'bad'); return false; }
      src.mp -= cost;
      b.rec.mpSpent += cost;
      if (!b.rec.skillsUsed[skillId]) { b.rec.skillsUsed[skillId] = true; b.rec.skillKinds++; }
      if (skillId !== 'attack' && skillId !== 'guard') b.rec.onlyBasic = false;
    }
    var eff = sk.eff || {};

    if (eff.hpCost) {
      var c = Math.round(src.S.maxHp * eff.hpCost);
      src.hp = Math.max(1, src.hp - c);
      log(b, '🩸 ' + src.name + ' はHPを ' + c + ' 支払った。', 'bad');
    }
    log(b, '▶ ' + src.name + ' の【' + sk.name + '】', 'sys');
    fx(b, { t: 'act', i: src.idx });

    var targets = targetsFor(b, src, sk, targetIdx);
    var isAoe = (sk.target === 'all');

    /* --- ダメージ系 --- */
    if (sk.kind === 'phys' || sk.kind === 'mag') {
      var hits = sk.hits || 1;
      var power = sk.power;
      if (sk.kind === 'mag' && (sk.mp || 0) > 0 && src.flags && src.flags.doubleCast) {
        hits *= 2; power = Math.round(power * 0.60);
        log(b, '　✨ 二重詠唱！', 'good');
      }
      var opt = {
        kind: sk.kind, el: sk.el, isAoe: isAoe,
        critBonus: eff.critBonus || 0, critBonusDmg: eff.critBonusDmg || 0,
        alwaysCrit: !!eff.alwaysCrit, defIgnore: eff.defIgnore || 0,
        aoeBonus: eff.aoeBonus || 0, drain: eff.drain || 0, fullPierce: !!eff.fullPierce
      };

      /* 特殊計算 */
      if (sk.special === 'reflectScale') {
        opt.atkStat = Math.round(src.S.atk + src.S.def * 1.1);
        power = Math.round(power * (1 + (src.S.reflect || 0) * 2.4 + (src.S.reflectPow || 0)));
        log(b, '　（反射率に比例して威力 ' + power + '%）');
      } else if (sk.special === 'itemScale') {
        power = Math.round(power * (1 + (src.S.itemPower || 0)));
        log(b, '　（アイテム威力に比例して威力 ' + power + '%）');
      } else if (sk.special === 'hybrid') {
        opt.atkStat = Math.round((src.S.atk + src.S.mag) / 2 * 1.15);
        log(b, '　（物魔一体：攻撃力 ' + opt.atkStat + '）');
      } else if (sk.special === 'speedScale') {
        opt.atkStat = Math.round(src.S.atk + src.S.spd * 0.8);
        log(b, '　（素早さが乗る：攻撃力 ' + opt.atkStat + '）');
      } else if (sk.special === 'mythicScale') {
        var mc = src.side === 'player' ? G.Stats.rarityCount(src.hero, 'mythic') : 0;
        power = Math.round(power * (1 + 0.45 * mc));
        log(b, '　（ミシック ' + mc + '個 → 威力 ' + power + '%）');
      }

      if (sk.special === 'allElem') {
        G.MAGIC_ELEMENTS.forEach(function (el) {
          targets.filter(alive).forEach(function (t) {
            var o = JSON.parse(JSON.stringify(opt)); o.el = el; o.power = power;
            o.silent = false;
            strikeWrap(b, src, t, o, sk);
          });
        });
      } else {
        for (var h = 0; h < hits; h++) {
          var elNow = (eff.altElement && h % 2 === 1) ? eff.altElement : sk.el;
          var list = (sk.target === 'random') ? [U.pick(aliveEnemies(b) .length ? aliveEnemies(b) : targets)] : targets;
          list.filter(function (t) { return t && alive(t); }).forEach(function (t) {
            var o = {};
            for (var kk in opt) o[kk] = opt[kk];
            o.el = elNow; o.power = power;
            if (eff.execute && t.hp / t.S.maxHp <= eff.execute) {
              o.power = Math.round(power * 2.2);
              log(b, '　（処刑判定成功！ 威力 ' + o.power + '%）', 'crit');
            }
            strikeWrap(b, src, t, o, sk);
          });
          if (aliveEnemies(b).length === 0 && src.side === 'player') break;
        }
      }

      /* 単体攻撃の波及（範囲ビルド） */
      if (!isAoe && src.side === 'player') {
        var splash = (src.S.aoeRatio || 0) + (eff.splashBonus || 0);
        if (splash > 0 && targets.length === 1) {
          var others = aliveEnemies(b).filter(function (x) { return x !== targets[0]; });
          others.forEach(function (o2) {
            var o = { kind: sk.kind, el: sk.el, power: Math.round(power * splash), isAoe: true, tag: 'splash', trueHit: true };
            var d = strike(b, src, o2, o);
            if (d) log(b, '　↳ 波及 (' + Math.round(splash * 100) + '%)', 'aoe');
          });
        }
      }
      applySkillSideEffects(b, src, targets, eff);
    }

    /* --- 回復 --- */
    if (sk.kind === 'heal') {
      var p = sk.power || 100;
      if (sk.special === 'itemScale') p = Math.round(p * (1 + (src.S.itemPower || 0)));
      var amt = Math.round((src.S.mag || 10) * p / 100 + src.S.maxHp * 0.05);
      heal(b, src, amt, sk.name);
      if (eff.cleanse) { src.statuses = []; refresh(src); log(b, '✨ 状態異常が解除された。', 'good'); }
    }

    /* --- バフ・支援 --- */
    if (eff.buffs) eff.buffs.forEach(function (x) {
      var v = x.v;
      if (sk.id === 'guard' && x.k === 'reflect' && src.flags && src.flags.guardCounter) v += 0.60;
      addBuff(b, src, x.k, v, x.t);
    });
    if (eff.flagBuff) {
      src.flagBuffs.push({ f: eff.flagBuff.f, t: eff.flagBuff.t + 1 }); refresh(src);
      log(b, '✨ ' + src.name + ': ' + (G.FLAGS[eff.flagBuff.f] || eff.flagBuff.f), 'good');
    }
    if (eff.healMaxPct) heal(b, src, Math.round(src.S.maxHp * eff.healMaxPct), sk.name);
    if (eff.barrier) {
      src.barrier += Math.round(src.S.mag * eff.barrier + src.S.maxHp * 0.05);
      log(b, '🛡 バリアを展開した（' + src.barrier + '）。', 'good');
    }
    if (eff.mpGain && src.side === 'player') {
      src.mp = Math.min(src.S.maxMp, src.mp + eff.mpGain);
    }
    if (eff.healSelf) heal(b, src, Math.round(src.S.mag * eff.healSelf), sk.name);
    if (eff.makeItem && src.side === 'player') {
      for (var mi = 0; mi < eff.makeItem; mi++) {
        var got = U.pick(G.ITEMS.filter(function (i) { return i.tier <= 2; }));
        G.addItem(b.state.hero, got.id, 1);
        log(b, '🧪 〈' + got.name + '〉を錬成した。', 'good');
      }
    }
    if (sk.kind === 'buff' || sk.kind === 'util') {
      if (eff.debuff) applySkillSideEffects(b, src, targets, eff);
    }
    return true;
  }

  function strikeWrap(b, src, t, o, sk) {
    var hitsLeft = 1;
    if (sk.id === 'attack' && src.flags && src.flags.spellblade) {
      o.atkStat = Math.round((src.S.atk + src.S.mag) / 2 * 1.15);
    }
    if (sk.id === 'attack' && src.flags && src.flags.elementCycle) {
      o.el = G.MAGIC_ELEMENTS[(b.round - 1) % G.MAGIC_ELEMENTS.length];
    }
    /* doubleStrike: 通常攻撃が2回に分裂 */
    if (sk.id === 'attack' && src.flags && src.flags.doubleStrike) {
      o.power = Math.round(o.power * 0.6); hitsLeft = 2;
    }
    if (sk.id === 'attack' && src.flags && src.flags.allElemStrike) {
      var per = Math.round(o.power * 0.34);
      G.MAGIC_ELEMENTS.forEach(function (el) {
        var oo = {}; for (var k in o) oo[k] = o[k];
        oo.el = el; oo.power = per; oo.kind = 'mag';
        strike(b, src, t, oo);
      });
      return;
    }
    for (var i = 0; i < hitsLeft; i++) {
      if (!alive(t)) break;
      strike(b, src, t, o);
    }
    /* fireSplash: 炎ダメージが全体へ波及 */
    if (o.el === 'fire' && src.flags && src.flags.fireSplash && src.side === 'player') {
      aliveEnemies(b).filter(function (x) { return x !== t; }).forEach(function (x) {
        var oo = { kind: o.kind, el: 'fire', power: Math.round(o.power * 0.30), isAoe: true, trueHit: true };
        strike(b, src, x, oo);
      });
    }
  }

  function applySkillSideEffects(b, src, targets, eff) {
    /* 状態異常の伝播 */
    if (src.side === 'player' && src.flags && src.flags.spreadStatus) {
      var extra = aliveEnemies(b).filter(function (x) { return targets.indexOf(x) < 0; })
        .filter(function () { return U.chance(0.35); });
      targets = targets.concat(extra);
      if (extra.length) log(b, '☣ 状態異常が周囲へ伝播した。', 'aoe');
    }
    targets.filter(alive).forEach(function (t) {
      if (eff.burn && U.chance(eff.burn.c != null ? eff.burn.c : 1)) addStatus(b, t, 'burn', eff.burn.t, eff.burn.v);
      if (eff.poison && U.chance(eff.poison.c != null ? eff.poison.c : 1)) addStatus(b, t, 'poison', eff.poison.t, eff.poison.v);
      if (eff.freeze && U.chance(eff.freeze.c != null ? eff.freeze.c : 1)) addStatus(b, t, 'freeze', eff.freeze.t);
      if (eff.shock && U.chance(eff.shock.c != null ? eff.shock.c : 1)) addStatus(b, t, 'shock', eff.shock.t);
      if (eff.debuff) addBuff(b, t, eff.debuff.k, eff.debuff.v, eff.debuff.t);
    });
  }

  /* ===================== 行動: アイテム ===================== */

  function useItem(b, itemId, targetIdx) {
    var hero = b.state.hero, src = b.hero;
    if (!hero.items[itemId]) return false;
    var it = G.ITEM_BY_ID[itemId];
    var keep = U.chance(src.S.itemKeep || 0);
    if (!keep) G.addItem(hero, itemId, -1);
    b.rec.itemsUsed++;
    b.state.run.stats.itemsUsed++;
    fx(b, { t: 'act', i: src.idx });
    log(b, '▶ ' + src.name + ' は〈' + it.name + '〉を使った。' + (keep ? '（温存！消費しなかった）' : ''), 'sys');

    var repeat = (src.flags.itemEcho && U.chance(0.25)) ? 2 : 1;
    for (var r = 0; r < repeat; r++) {
      if (r === 1) log(b, '　✨ 触媒が共鳴し、効果がもう一度発動！', 'good');
      resolveItem(b, src, it, targetIdx);
    }
    return true;
  }

  function resolveItem(b, src, it, targetIdx) {
    var u = it.use, scale = 1 + (src.S.itemPower || 0), lvl = 1 + b.state.hero.level * 0.05;
    if (u.type === 'heal') { heal(b, src, Math.round(u.power * scale * lvl), it.name); return; }
    if (u.type === 'mp') { src.mp = Math.min(src.S.maxMp, src.mp + Math.round(u.power * scale)); log(b, '🔷 MPが回復した。', 'good'); return; }
    if (u.type === 'full') {
      src.hp = src.S.maxHp; src.mp = src.S.maxMp; src.statuses = []; refresh(src);
      log(b, '✨ HPとMPが全回復した！', 'good'); return;
    }
    if (u.type === 'cleanse') {
      src.statuses = []; refresh(src);
      heal(b, src, Math.round(u.power * scale * lvl), it.name);
      log(b, '✨ 状態異常が解除された。', 'good'); return;
    }
    if (u.type === 'buff') {
      (u.buffs || []).forEach(function (x) { addBuff(b, src, x.k, x.v, x.t); });
      if (u.endure) { src.extraEndure = true; src.endureUsed = false; log(b, '🕊 致死ダメージを1度耐える加護を得た。', 'good'); }
      return;
    }
    if (u.type === 'dmg' || u.type === 'dmgMulti') {
      var els = u.type === 'dmgMulti' ? u.els : [u.el];
      var list = (u.target === 'all') ? aliveEnemies(b) : [b.enemies[targetIdx] && alive(b.enemies[targetIdx]) ? b.enemies[targetIdx] : aliveEnemies(b)[0]];
      els.forEach(function (el) {
        list.filter(function (t) { return t && alive(t); }).forEach(function (t) {
          strike(b, src, t, {
            kind: 'mag', el: el, power: Math.round(u.power * scale * lvl),
            isAoe: u.target === 'all', trueHit: true, atkStat: Math.max(src.S.mag, 30)
          });
        });
      });
      if (u.freeze) list.filter(function (t) { return t && alive(t); }).forEach(function (t) { if (U.chance(u.freeze)) addStatus(b, t, 'freeze', 2); });
      if (u.shock) list.filter(function (t) { return t && alive(t); }).forEach(function (t) { if (U.chance(u.shock)) addStatus(b, t, 'shock', 2); });
      if (u.debuff) list.filter(function (t) { return t && alive(t); }).forEach(function (t) { addBuff(b, t, u.debuff.k, u.debuff.v, u.debuff.t); });
      if (u.healSelf) heal(b, src, Math.round(u.power * scale * u.healSelf), it.name);
    }
  }

  /* ===================== プレイヤー行動 ===================== */

  function playerAction(b, act) {
    if (b.over || !b.awaiting) return false;
    var src = b.hero;
    src._b = b;
    if (stunned(b, src)) { b.awaiting = false; b.qi++; advance(b); return true; }

    var ok = true;
    if (act.type === 'skill') ok = useSkill(b, src, act.id, act.target);
    else if (act.type === 'item') ok = useItem(b, act.id, act.target);
    if (!ok) return false;

    /* 撃破数（同時撃破の記録） */
    countMultiKill(b);
    b.state.hero.hp = src.hp; b.state.hero.mp = src.mp;
    b.awaiting = false;
    b.qi++;
    if (checkEnd(b)) return true;
    advance(b);
    b.state.hero.hp = src.hp; b.state.hero.mp = src.mp;
    return true;
  }

  function countMultiKill(b) {
    var deadNow = b.enemies.filter(function (e) { return e.hp <= 0 && !e._counted; });
    if (deadNow.length) {
      b.rec.maxMultiKill = Math.max(b.rec.maxMultiKill, deadNow.length);
      deadNow.forEach(function (e) { e._counted = true; });
    }
  }

  /* ===================== 敵の行動 ===================== */

  function takeEnemyTurn(b, u) {
    u._b = b;
    if (stunned(b, u)) return;
    var sks = u.ref.skills.slice();
    var hpRatio = u.hp / u.S.maxHp;
    var pick;
    if (hpRatio < 0.4 && sks.indexOf('e_heal') >= 0 && U.chance(0.5)) pick = 'e_heal';
    else if (u.isBoss && U.chance(0.35)) {
      var aoes = sks.filter(function (s) { return G.SKILLS[s].target === 'all'; });
      pick = aoes.length ? U.pick(aoes) : U.pick(sks);
    } else pick = U.pick(sks);
    useSkill(b, u, pick, null);
    b.state.hero.hp = b.hero.hp;
  }

  return {
    start: start, advance: advance, playerAction: playerAction, refresh: refresh,
    makeEnemyUnit: makeEnemyUnit, enemyScale: enemyScale, aliveEnemies: aliveEnemies,
    alive: alive, log: log, heal: heal
  };
})();
