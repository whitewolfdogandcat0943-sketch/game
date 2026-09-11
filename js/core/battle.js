/* battle.js - 戦闘エンジン（ターン制・速度順） */
G.Battle = (function () {
  var U = G.U;

  /* ===================== ユニット生成 ===================== */

  /** パーティの1人をユニット化する。主人公も仲間も同じ形。 */
  function makeMemberUnit(state, member, idx) {
    var u = {
      side: 'player', id: member.id || ('m' + idx), name: member.name,
      icon: G.CLASSES[member.classId].icon, isLeader: idx === 0,
      hero: member, state: state, buffs: [], flagBuffs: [], statuses: [],
      barrier: 0, endureUsed: false, killStacks: 0, extraEndure: false,
      coverFor: null, coveredBy: null, counterStance: 0, charge: 0, mark: null,
      weak: [], resist: []
    };
    refresh(u);
    u.hp = member.hp; u.mp = member.mp;
    if (u.hp == null) u.hp = u.S.maxHp;
    if (u.mp == null) u.mp = u.S.maxMp;
    return u;
  }

  /** state.party（無ければ主人公だけ）をユニット配列にする */
  function makePartyUnits(state) {
    var members = state.party && state.party.length ? state.party : [state.hero];
    return members.map(function (m, i) { return makeMemberUnit(state, m, i); });
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
      exp: Math.round(def.exp * s.rw), gold: Math.round(def.gold * s.rw),
      /* ボスが追撃を始める残HP割合。0 なら追撃しない。難易度で変わる。 */
      follow: def.boss ? (G.Diff ? G.Diff.get().bossFollow : 0) : 0, raged: false,
      /* 相（そう）の切り替え。残HPが下がるたびに弱点と耐性が入れ替わる。 */
      phases: (def.phases || []).slice(), phase: 0,
      /* ボス固有の仕掛け。中身は gimmick.js（G.Gimmick）が解釈する。 */
      gim: def.gimmick ? JSON.parse(JSON.stringify(def.gimmick)) : null, gimState: {}
    };
    refresh(u);
    u.hp = u.S.maxHp; u.mp = 999;
    return u;
  }

  /* 敵の「適正階層」。ここからの差分でスケールするので、
   * 上位ティアの敵が登場した瞬間に極端な数値にならない。 */
  var HOME_FLOOR = { mob: { 1: 1, 2: 6, 3: 13 }, boss: { 1: 5, 2: 10, 3: 15 } };

  /** 階層に応じた敵スケーリング。最後に難易度の倍率を掛ける。 */
  function enemyScale(floor, def) {
    var home = (def && def.boss ? HOME_FLOOR.boss : HOME_FLOOR.mob)[(def && def.tier) || 1] || 1;
    var rel = Math.max(-1, floor - home);
    var abs = Math.max(0, floor - 1);
    var dm = G.Diff ? G.Diff.scaleFor(def) : { hp: 1, pw: 1, df: 1 };
    return {
      hp: (def && def.boss ? 1 : 1.30) *
          Math.max(0.6, 1 + rel * 0.24 + Math.pow(Math.max(0, rel), 1.45) * 0.024) * dm.hp,
      /* 雑魚は数で攻めるため、1体あたりの火力はボスより控えめにする */
      pw: (def && def.boss ? 1.10 : 1.12) *
          Math.max(0.7, 1 + rel * 0.115 + Math.pow(Math.max(0, rel), 1.30) * 0.007) * dm.pw,
      df: Math.max(0.7, 1 + rel * 0.12) * dm.df,
      /* 難しくするほど見返りも増やす */
      rw: (1 + abs * 0.26) * (G.Diff ? G.Diff.get().rw : 1)
    };
  }

  /* ===================== ステータス再計算 ===================== */

  function refresh(u) {
    /* 味方でも hero を持たないもの（召喚体）は、敵と同じ base から組み立てる。
     * 側ではなく「素性を持っているか」で分ける。 */
    if (u.side === 'player' && u.hero) {
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
      /* 弱体は重ねがけできるので、下限を切らないと攻撃力が負になる。
       * 7割減までは通し、そこから先は何を重ねても効かない。 */
      S.atk = Math.max(1, Math.round(S.atk * (1 + G.PCT_FLOOR(pctAcc.atkPct))));
      S.mag = Math.max(1, Math.round(S.mag * (1 + G.PCT_FLOOR(pctAcc.magPct))));
      S.def = Math.max(0, Math.round(S.def * (1 + G.PCT_FLOOR(pctAcc.defPct))));
      S.res = Math.max(0, Math.round(S.res * (1 + G.PCT_FLOOR(pctAcc.resPct))));
      S.maxHp = Math.max(1, Math.round(S.maxHp * (1 + G.PCT_FLOOR(pctAcc.hpPct))));
      /* 状態異常の影響 */
      if (hasStatus(u, 'freeze')) S.spd = Math.round(S.spd * 0.4);
      /* 素早さ低下も重ねがけできる。0以下になると手番の並びが壊れる */
      S.spd = Math.max(1, S.spd);
      S.dr = U.clamp(S.dr, -1, 0.85);
      u.S = S;
      u.flags = {};
      u.flagBuffs.forEach(function (f) { u.flags[f.f] = true; });
    }
    if (u.side === 'player' && hasStatus(u, 'freeze')) u.S.spd = Math.round(u.S.spd * 0.5);
    u.S.spd = Math.max(1, u.S.spd);
    return u.S;
  }

  function hasStatus(u, k) { return u.statuses.some(function (s) { return s.k === k; }); }

  /* ===================== 戦闘開始 ===================== */

  function start(state, enemyUnits, opts) {
    opts = opts || {};
    var party = makePartyUnits(state);
    var hero = party[0];
    var b = {
      state: state, hero: hero, party: party, actor: null,
      enemies: enemyUnits, units: party.concat(enemyUnits),
      round: 0, queue: [], qi: 0, log: [], over: false, result: null, rage: 0,
      awaiting: false, isBoss: !!opts.isBoss, floor: state.run.floor,
      rec: {
        critStreak: 0, critStreakMax: 0, reflectDmg: 0, reflectKills: 0, elementsUsed: {},
        itemsUsed: 0, damageTaken: 0, maxMultiKill: 0, kills: 0, aoeKills: 0, isBoss: !!opts.isBoss,
        damageDealt: 0, turns: 0,
        /* ミシック条件の判定に使う記録 */
        mpSpent: 0, skillsUsed: {}, skillKinds: 0, onlyBasic: true, statusPeak: 0,
        boonsCast: 0, hexesCast: 0, hexPeak: 0, rotKills: 0,
        barrierAbsorbed: 0, evadeStreak: 0, evadeStreakMax: 0, healed: 0,
        weakKills: 0, maxHitDamage: 0, firstHitDone: false,
        /* 誰と戦ったか。「あの相手を倒した」を条件にできるようにする */
        foeIds: enemyUnits.map(function (e) { return e.ref.id; }),
        bossIds: enemyUnits.filter(function (e) { return e.isBoss; })
          .map(function (e) { return e.ref.id; })
      }
    };
    b.units.forEach(function (u, i) { u.idx = i; });
    b.fx = [];
    log(b, '⚔ 戦闘開始！ ' + enemyUnits.map(function (e) { return e.name; }).join('・') + ' が現れた。', 'sys');
    if (G.Gimmick) b.enemies.slice().forEach(function (e) { G.Gimmick.onStart(b, e); });

    /* itemRefill: 戦闘開始時にアイテム補充 */
    party.forEach(function (m) {
      if (m.flags.itemRefill) {
        var pool = G.ITEMS.filter(function (i) { return i.tier <= 2; });
        var got = U.pick(pool);
        G.addItem(state.hero, got.id, 1);
        log(b, '🧪 ' + m.name + ' の錬成術が働き〈' + got.name + '〉を1個 補充した。', 'good');
      }
      if (m.flags.openingRally) {
        party.filter(alive).forEach(function (t) {
          addBuff(b, t, 'atkPct', 0.18, 3, true, m);
          addBuff(b, t, 'magPct', 0.18, 3, true, m);
        });
        log(b, '🎺 ' + m.name + ' の号令が響き、味方全体の攻撃が高まった。', 'good');
      }
      if (m.flags.alchemyShield) {
        m.barrier += Math.round(m.S.maxHp * 0.12 * (1 + (m.S.itemPower || 0)));
        log(b, '⚗ 触媒が反応し、' + m.name + ' にバリア（' + m.barrier + '）を展開した。', 'good');
      }
    });
    bark(b, opts.isBoss ? 'boss' : 'start');
    newRound(b);
    advance(b);
    return b;
  }

  /** 掛け合いを1つ流す。出すか黙るかの判断は barks.js 側でまとめて持つ。 */
  function bark(b, on, ctx) {
    if (G.Barks) G.Barks.fire(b, on, ctx);
  }

  function log(b, text, cls) { b.log.push({ t: text, c: cls || '' }); }

  /** 描画後に再生する演出イベントを積む（fx.js が消費する） */
  function fx(b, o) { if (b && b.fx && o.i != null) b.fx.push(o); }

  /** 戦闘スタイルの実績を積む（上級職の解放条件に使う）
   *
   * 軸ごとに発生頻度が大きく違う（範囲は敵の数だけ、アイテムは使用時だけ）ため、
   * そのまま数えると低頻度の軸が絶対に比率で勝てなくなる。
   * また敵の手番はプレイヤーの手番より多いため、手番単位だと堅守・反射が構造的に
   * 膨らむ。そこで「1ラウンドにつき各軸1回まで」に正規化して比較可能にする。
   *
   * 記録は行動した本人に付ける。仲間もそれぞれの戦い方で上級職が解放されるので、
   * 「誰が会心を出したか」まで分けないと、全員が同じ職に開いてしまう。 */
  function sty(b, u, axis, n) {
    if (!u || u.side !== 'player' || !u.hero) return;
    if (!b.styGate) b.styGate = {};
    var key = (u.hero.allyId || 'hero') + '|' + axis;
    if (b.styGate[key]) return;
    b.styGate[key] = true;
    G.Style.addTo(u.hero, axis, n == null ? 1 : n);
  }

  /** 手番の切り替わりでスタイルの計上枠をリセットする */
  function resetSty(b) { b.styGate = {}; }

  function alive(u) { return u.hp > 0; }
  function aliveEnemies(b) { return b.enemies.filter(alive); }

  /** 戦闘の途中で敵を足す。idx は fx の宛先なので、足すたびに振り直す。 */
  function addEnemy(b, u) {
    b.enemies.push(u);
    b.units.push(u);
    b.units.forEach(function (x, i) { x.idx = i; });
    /* すでに始まっているラウンドにも並ばせる。手番が回るのは次の巡から */
    if (b.queue && b.queue.indexOf(u) < 0) b.queue.push(u);
    return u;
  }
  function partyUnits(b) { return b.party || [b.hero]; }
  function aliveParty(b) { return partyUnits(b).filter(alive); }
  /* 召喚体は頭数には入るが、パーティそのものではない。
   * 全員倒れて召喚体だけが残った盤面を「まだ負けていない」にすると、
   * 呼び直すだけで延々と粘れてしまう。 */
  function realParty(b) { return partyUnits(b).filter(function (u) { return !!u.hero; }); }
  function aliveRealParty(b) { return realParty(b).filter(alive); }

  /** 召喚体を場に出す。術者の魔力を元に強さを決める。 */
  function addSummon(b, caster, spec, nth) {
    var cap = spec.cap || 1;
    /* 同時に出せる数は cap まで。溢れたぶんは古いものから還す。
     * 技ごとに cap が違うので、超えている数だけまとめて処理する
     * （一体だけ還すと、cap 1 の技で cap 2 の顔ぶれが残ってしまう）。 */
    var live = partyUnits(b).filter(function (u) { return u.summon && alive(u); });
    while (live.length >= cap) {
      var old = live.shift();
      old.hp = 0; old._dead = true;
      log(b, '✨ ' + old.name + ' が霧に還った。');
    }
    var mag = caster.S.mag || 0, atk = caster.S.atk || 0;
    /* 呼ぶものの強さは術者から決まる。summonPower を積めば呼ぶ側ごと伸びる。 */
    var pw = Math.max(mag, atk) * (1 + (caster.S.summonPower || 0));
    var extraT = Math.round(caster.S.summonTurns || 0);
    var u = {
      side: 'player', id: 'sum' + b.units.length,
      /* 複数まとめて呼ぶものは、一体ずつ名前を分ける（フギンとムニン のように）。 */
      name: (spec.names && spec.names[nth || 0]) || spec.name, icon: spec.icon || '✨',
      hero: null, state: b.state, buffs: [], flagBuffs: [], statuses: [],
      barrier: 0, endureUsed: false, killStacks: 0, extraEndure: false,
      coverFor: null, coveredBy: null, counterStance: 0, charge: 0, mark: null,
      weak: spec.weak || [], resist: spec.resist || [],
      summon: true, summonTurns: (spec.turns || 3) + extraT + 1,
      summonSkill: spec.skill || 'attack',
      ref: { id: spec.sprite || 'summon' },
      base: {
        maxHp: Math.max(1, Math.round(pw * (spec.hp || 3.0))),
        atk: Math.round(pw * (spec.pw || 0.9)), mag: Math.round(pw * (spec.pw || 0.9)),
        def: Math.round(pw * 0.25), res: Math.round(pw * 0.25),
        spd: Math.round((caster.S.spd || 10) * (spec.spd || 0.9))
      },
      flags: {}, S: null
    };
    refresh(u);
    /* 召喚体はMPの心配をしない。上限を 0 のままにすると画面に NaN が出て、
     * 小さくすると自分の技をMP不足で撃てなくなる（実機で「MPが足りない」が並んだ）。 */
    u.S.maxMp = 999;
    u.hp = u.S.maxHp; u.mp = u.S.maxMp;
    b.party.push(u);
    b.units.push(u);
    b.units.forEach(function (x, i) { x.idx = i; });
    if (b.queue.indexOf(u) < 0) b.queue.push(u);
    log(b, '✨ ' + caster.name + ' が ' + u.name + ' を呼び出した！（' +
      ((spec.turns || 3) + extraT) + 'ターン）', 'good');
    fx(b, { t: 'heal', i: u.idx, v: 0 });
    return u;
  }

  /** 召喚体の手番。呼んだ技だけを使う、単純な動き。 */
  function takeSummonTurn(b, u) {
    if (stunned(b, u)) return;
    var foes = aliveEnemies(b);
    if (!foes.length) return;
    var sk = G.SKILLS[u.summonSkill] || G.SKILLS.attack;
    var foe = foes.slice().sort(function (x, y) { return x.hp - y.hp; })[0];
    useSkill(b, u, sk.id, { foe: b.enemies.indexOf(foe) });
  }
  /** 各ユニットのHP/MPをパーティデータへ書き戻す */
  function syncParty(b) {
    partyUnits(b).forEach(function (u) {
      if (!u.hero) return;
      u.hero.hp = U.clamp(u.hp, 0, u.S.maxHp);
      u.hero.mp = U.clamp(u.mp, 0, u.S.maxMp);
    });
  }
  /** 味方対象の解決。指定が無ければ自分。 */
  function allyOf(b, src, targetIdx) {
    var mates = alliesOf(b, src);
    var i = (targetIdx != null && typeof targetIdx === 'object') ? targetIdx.ally : null;
    var a = (i != null) ? mates[i] : null;
    return (a && alive(a)) ? a : src;
  }
  /** そのユニットから見た味方 */
  function alliesOf(b, u) { return u.side === 'player' ? partyUnits(b) : b.enemies; }
  /** そのユニットから見た敵 */
  function foesOf(b, u) { return u.side === 'player' ? aliveEnemies(b) : aliveParty(b); }
  /** プレイヤーが操作するユニット。主人公が倒れたら次の生存者へ移る。
   * これが無いと主人公の戦闘不能で入力手段が消え、戦闘が終わらなくなる。 */
  function controller(b) {
    var p = partyUnits(b);
    if (p[0] && alive(p[0])) return p[0];
    return p.filter(alive)[0] || null;
  }

  /** 敵が狙う相手。かばう・挑発を考慮する */
  function pickTarget(b, attacker) {
    var cands = aliveParty(b).filter(function (x) { return !(x.mawed > 0); });
    if (!cands.length) cands = aliveParty(b);
    if (!cands.length) return null;
    var taunters = cands.filter(function (x) { return (x.tauntTurns || 0) > 0; });
    if (taunters.length) cands = taunters;
    var t;
    /* 難易度が上がるほど「落とせる相手」を正確に狙ってくる。
     * 挑発は難易度に関わらず優先されるので、盾役の仕事は残る。 */
    var aim = (G.Diff ? G.Diff.get().aim : 0);
    if (cands.length > 1 && aim > 0 && U.chance(aim)) {
      t = cands.slice().sort(function (x, y) {
        var dx = x.hp + (x.barrier || 0) + x.S.def * 2 + x.S.maxHp * 0.15;
        var dy = y.hp + (y.barrier || 0) + y.S.def * 2 + y.S.maxHp * 0.15;
        return dx - dy;
      })[0];
    } else t = U.pick(cands);
    /* かばわれている相手なら、かばっている側が受ける */
    if (t.coveredBy && alive(t.coveredBy)) return t.coveredBy;
    return t;
  }

  function newRound(b) {
    b.round++;
    b.rec.turns++;
    resetSty(b);
    b.queue = b.units.filter(alive).slice().sort(function (x, y) {
      var d = y.S.spd - x.S.spd;
      return d !== 0 ? d : (Math.random() - 0.5);
    });
    /* ボスの追加手番。列の最後に差し込むので、
     * 「先手を取られ、締めにもう一度殴られる」形になる。
     * 2度目は追撃あつかいで威力を落とす。等倍で2回動かれると
     * 立て直す隙がなく、ビルドの差ではなく事故で決まる戦いになる。 */
    b.units.forEach(function (u) { u._actNo = 0; });
    /* 召喚体の期限。切れたら静かに消える */
    partyUnits(b).forEach(function (u) {
      if (!u.summon || !alive(u)) return;
      u.summonTurns--;
      if (u.summonTurns <= 0) {
        u.hp = 0; u._dead = true;
        log(b, '✨ ' + u.name + ' は役目を終えて消えた。');
      }
    });
    aliveEnemies(b).forEach(function (u) { checkPhase(b, u); });
    if (G.Gimmick) b.enemies.slice().forEach(function (u) { G.Gimmick.onRound(b, u); });
    aliveEnemies(b).forEach(function (u) {
      if (!u.isBoss || !u.follow) return;
      if (u.hp > u.S.maxHp * u.follow) return;
      if (!u.raged) {
        u.raged = true;
        log(b, '💢 ' + u.name + ' が牙を剥いた！ ここからはラウンドの終わりにもう一撃来る。', 'bad');
      }
      b.queue.push(u);
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
      if (u.side === 'player') {
        if (u === controller(b)) { b.actor = u; u._b = b; b.awaiting = true; return; }
        /* 操作しないメンバーは自動で動く */
        b.actor = u; u._b = b;
        if (u.summon) takeSummonTurn(b, u); else takeAllyTurn(b, u);
        b.qi++;
        if (checkEnd(b)) return;
        continue;
      }
      b.actor = null;
      takeEnemyTurn(b, u);
      b.qi++;
      if (checkEnd(b)) return;
    }
    /* 保険: 何らかの理由で手番が回らなかった場合も入力を受け付ける */
    var c = controller(b);
    if (c) { b.actor = c; c._b = b; b.awaiting = true; }
  }

  /** ターン開始時の行動不能判定 */
  function stunned(b, u) {
    if ((u.mawed || 0) > 0) { log(b, '🐺 ' + u.name + ' は牙に咥えられていて動けない！', 'bad'); return true; }
    if (hasStatus(u, 'shock') && U.chance(0.35)) { log(b, '⚡ ' + u.name + ' は麻痺して動けない！', 'bad'); return true; }
    if (hasStatus(u, 'freeze') && U.chance(0.20)) { log(b, '❄ ' + u.name + ' は凍りついて動けない！', 'bad'); return true; }
    return false;
  }

  /* 決着がつかない盤面を作らないための「激昂」。
   * 回復量が敵の火力を上回ると、勝てないが負けもしない膠着が起きる。
   * 一定ラウンドを過ぎたら敵の火力が増え続け、必ず決着がつくようにする。 */
  var RAGE_STEP = 0.12;
  /* ボスの2度目の手番（追撃）の威力 */
  var FOLLOWUP_POWER = 0.5;

  function updateRage(b) {
    var over = b.round - (G.Diff ? G.Diff.get().rageFrom : 25);
    if (over <= 0) return;
    if (!b.rage) log(b, '🔥 敵が激昂した！ これ以上長引くほど、敵の攻撃は激しくなる。', 'bad');
    b.rage = over * RAGE_STEP;
  }

  function endRound(b) {
    updateRage(b);
    aliveParty(b).forEach(function (m) {
      if (!m.flags.frailtyAura) return;
      aliveEnemies(b).forEach(function (x) {
        if (!(x.buffs || []).some(function (y) { return y.v < 0; })) return;
        addBuff(b, x, 'defPct', -0.08, 2, true, m);
        addBuff(b, x, 'resPct', -0.08, 2, true, m);
      });
    });
    aliveParty(b).forEach(function (m) {
      if (!m.flags.thornAura) return;
      var td = Math.max(1, Math.round(m.S.maxHp * 0.012 * (1 + (m.S.reflect || 0) * 2)));
      aliveEnemies(b).forEach(function (x) {
        applyRawDamage(b, x, td, '🌵 棘の霧', m, { aoe: true, noReflect: true });
      });
    });
    b.units.forEach(function (u) {
      if (!alive(u)) return;
      /* DOT（毒・火傷）
       * 基本は「相手の最大HPの割合」。ここを術者側で大きく伸ばせるようにすると、
       * HPの高いボスに対して一撃で数千という数字になってしまうので、
       * 伸びしろの大半は「術者の魔力に比例する固定分」に置いてある。
       * 割合のほうも伸びるが、上限を設けて頭打ちにする。 */
      var rotting = u.statuses.filter(function (s) { return s.k === 'burn' || s.k === 'poison'; });
      var both = rotting.length >= 2;
      rotting.forEach(function (s) {
        var pw = s.pw || 0;
        var owner = s.by ? b.units.filter(function (x) { return x.id === s.by; })[0] : null;
        var f = (owner && owner.flags) || {};
        /* 割合部分は技が決める。ここはビルドでは動かさない */
        var pct = u.S.maxHp * s.v * G.DOT_BASE;
        /* 固定部分だけがビルドで伸びる。化膿・深蝕もこちらに掛かる */
        var flat = (s.mag || 0) * (G.DOT_MAG_BASE + G.DOT_MAG_RATE * pw);
        if (f.festering && both) flat *= G.DOT_FESTER;
        if (f.deepRot) {
          s.rot = Math.min(G.DOT_ROT_CAP, (s.rot || 0) + 0.12);
          flat *= (1 + s.rot);
        }
        var d = Math.max(1, Math.round(pct) + Math.round(flat));
        var alive0 = alive(u);
        applyRawDamage(b, u, d, s.k === 'burn' ? '🔥 火傷' : '☠ 毒', null);
        if (alive0 && !alive(u) && u.side === 'enemy') b.rec.rotKills++;
        /* 持続ダメージで倒したときの見返り */
        if (alive0 && !alive(u) && owner && alive(owner)) {
          if (f.rotFeast) heal(b, owner, Math.round(owner.S.maxHp * 0.10), '腐食の宴');
          if (f.plagueBurst && u.side === 'enemy') {
            aliveEnemies(b).forEach(function (x) {
              addStatus(b, x, s.k, Math.max(2, s.t), s.v, owner);
            });
            log(b, '☣ ' + u.name + ' の内から疫が飛び散った。', 'aoe');
          }
        }
      });
      /* 継続時間の減少 */
      u.statuses = u.statuses.filter(function (s) { return (--s.t) > 0; });
      if (u.counter && --u.counter.t <= 0) u.counter = null;
      if (u.mark && --u.mark.t <= 0) u.mark = null;
      if (u.tauntTurns > 0) u.tauntTurns--;
      if (u.coverTurns > 0 && --u.coverTurns <= 0) clearCover(u);
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
    if (aliveRealParty(b).length === 0) {
      b.over = true; b.result = 'lose'; log(b, '💀 全滅した……', 'bad'); return true;
    }
    if (aliveEnemies(b).length === 0) {
      b.over = true; b.result = 'win'; log(b, '🏆 戦闘に勝利した！', 'good');
      bark(b, b.isBoss ? 'bosswin' : 'win');
      return true;
    }
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
      /* 弱体ビルドの見返り。敵に乗せた「マイナスの強化」の数を見る */
      if (f.hexBrand || f.doomToll) {
        var hex = (tgt.buffs || []).filter(function (x) { return x.v < 0; }).length;
        if (f.hexBrand && hex) extra += 0.30;
        if (f.doomToll) extra += 0.08 * hex;
      }
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
    /* 空にいる相手には、地上からの得物が届かない。
     * 属性を乗せた一撃や術は届くので、飛ばれているあいだは手を持ち替える。 */
    if (tgt.aloft && (o.el || 'phys') === 'phys' && o.kind !== 'mag') {
      if (!o.silent) { log(b, '🌪 ' + tgt.name + ' は空にいる。届かない！'); fx(b, { t: 'miss', i: tgt.idx }); }
      return 0;
    }
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
        sty(b, tgt, 'speed', 1);
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
    if (src.side === 'player') {
      if (el !== 'phys') sty(b, src, 'elem', 1);
      if (el === 'light') sty(b, src, 'light', 1);
      if (el === 'dark') sty(b, src, 'dark', 1);
      sty(b, src, kind === 'mag' ? 'mag' : 'phys', 1);
    }
    dmg *= eMult;
    dmg *= (1 + (S.dmgUp || 0) + damageMods(src, tgt, b));
    if (src.side === 'enemy' && b.rage) dmg *= (1 + b.rage);
    if (src.followUp) dmg *= FOLLOWUP_POWER;
    /* やさしい難易度では、こちらへの被ダメージを一律で削る */
    if (tgt.side === 'player' && G.Diff && G.Diff.get().playerDr) {
      dmg *= (1 - G.Diff.get().playerDr);
    }
    if (tgt.mark && tgt.mark.t > 0) dmg *= (1 + tgt.mark.v);
    if (hasStatus(src, 'blind') && !o.trueHit && U.chance(0.30)) {
      if (!o.silent) log(b, '🌑 ' + src.name + ' の攻撃は外れた。');
      return 0;
    }
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
        sty(b, src, 'crit', 1);
      } else b.rec.critStreak = 0;
      b.rec.elementsUsed[el] = true;
    }

    var dealt = applyRawDamage(b, tgt, out, null, src, {
      crit: isCrit, el: el, silent: o.silent, tag: o.tag, aoe: !!o.isAoe, noReflect: o.noReflect,
      kind: kind, isCounter: !!o.isCounter
    });

    /* 吸収 */
    var steal = (S.lifesteal || 0) + (o.drain || 0);
    if (steal > 0 && dealt > 0) {
      heal(b, src, Math.round(dealt * steal), '吸収');
      sty(b, src, 'life', 1);
    }

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
      addStatus(b, tgt, U.pick(['burn', 'poison', 'freeze', 'shock']), 2, null, src);
    }
    /* 殴りながら毒を積む。持続ダメージビルドが「撒く手番」を減らせる */
    if (dealt > 0 && src.flags && src.flags.venomEdge && alive(tgt) && U.chance(0.35)) {
      addStatus(b, tgt, 'poison', 3, 0.06, src);
    }
    /* 攻撃時の弱体付与。殴りながら削っていくビルドが成立する */
    if (dealt > 0 && src.flags && src.flags.sapStrike && alive(tgt) && U.chance(0.25)) {
      addBuff(b, tgt, 'atkPct', -0.20, 3, false, src);
    }

    /* 属性付随効果 */
    if (src.flags) {
      if (src.flags.shockOnThunder && el === 'thunder' && alive(tgt) && U.chance(0.25)) addStatus(b, tgt, 'shock', 2, null, src);
      if (src.flags.freezeOnIce && el === 'ice' && alive(tgt) && U.chance(0.30)) addStatus(b, tgt, 'freeze', 2, null, src);
    }
    return dealt;
  }

  /** 純粋なダメージ適用（バリア・反射・撃破処理を含む） */
  /* ボスの「相」を進める。
   * 一本調子の耐性を持つボスは、噛み合わないビルドにとってただの壁になり、
   * 噛み合うビルドにとっては作業になる。残HPで弱点と耐性を入れ替えると、
   * 同じ一戦のなかに、どのビルドにも通る時間帯が必ず一度は来る。 */
  function checkPhase(b, u) {
    if (!u.phases || !u.phases.length || u.hp <= 0) return;
    while (u.phase < u.phases.length) {
      var ph = u.phases[u.phase];
      if (u.hp > u.S.maxHp * ph.at) return;
      u.phase++;
      u.weak = (ph.weak || []).slice();
      u.resist = (ph.resist || []).slice();
      log(b, '🪞 ' + u.name + ' の相が変わった —— 《' + ph.name + '》', 'bad');
      if (ph.say) log(b, ph.say);
      var lines = [];
      if (u.weak.length) {
        lines.push('弱点: ' + u.weak.map(function (e) {
          return G.ELEMENTS[e] ? G.ELEMENTS[e].icon + G.ELEMENTS[e].name : e;
        }).join('・'));
      }
      lines.push(u.resist.length ? '耐性: ' + u.resist.map(function (e) {
        return e === 'phys' ? '⚔物理' : (G.ELEMENTS[e] ? G.ELEMENTS[e].icon + G.ELEMENTS[e].name : e);
      }).join('・') : '耐性: なし');
      log(b, '　' + lines.join(' ／ '), 'good');
      fx(b, { t: 'phase', i: u.idx });
    }
  }

  function applyRawDamage(b, tgt, amount, label, src, meta) {
    meta = meta || {};
    if (!alive(tgt)) return 0;
    var dmg = amount;
    if (tgt.flags) {
      if (tgt.flags.wardAll) dmg = Math.round(dmg * 0.85);
      if (tgt.flags.lastStand && tgt.hp / tgt.S.maxHp <= 0.50) dmg = Math.round(dmg * 0.75);
      /* boonGuard: 強化が乗っている味方は硬くなる。支援を「守り」に変える */
      if (tgt.flags.boonGuard && (tgt.buffs || []).some(function (x) { return x.v > 0; })) {
        dmg = Math.round(dmg * 0.86);
      }
    }
    dmg = Math.max(1, dmg);

    /* 鎧（shell）: 剥がすまで本体に届かない。
     * 刃で削ると手間がかかり、術なら速く剥がせる。
     * 「効かない」ではなく「先に剥がす」なので、物理のビルドでも越えられる。 */
    if (tgt.shellOn && tgt.gimState && tgt.gimState.shell > 0 && dmg > 0) {
      var gsh = tgt.gim || {};
      var bite = Math.round(dmg * (meta.kind === 'mag' ? (gsh.magBite || 2.0) : 1));
      tgt.gimState.shell -= bite;
      var through = Math.round(dmg * (gsh.through || 0.25));
      if (tgt.gimState.shell <= 0) {
        tgt.gimState.shell = 0; tgt.shellOn = false;
        log(b, '💥 ' + tgt.name + ' の' + (gsh.word || '棘鎧') + 'が砕けた！ ここからは素通しだ。', 'good');
      } else if (!meta.silent) {
        log(b, '🛡 ' + (gsh.word || '棘鎧') + ' が受け止めた（残り ' + tgt.gimState.shell + '）');
      }
      dmg = Math.max(1, through);
    }

    if (tgt.barrier > 0) {
      var absorbed = Math.min(tgt.barrier, dmg);
      tgt.barrier -= absorbed; dmg -= absorbed;
      if (tgt.side === 'player') { b.rec.barrierAbsorbed += absorbed; sty(b, tgt, 'guard', 2); }
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
    if (src && src.side === 'player') {
      b.rec.damageDealt += dmg;
      if (meta.aoe) sty(b, src, 'aoe', 1);
    }
    if (tgt.side === 'player') {
      b.rec.damageTaken += dmg;
      b.rec.evadeStreak = 0;
      if ((tgt.S.dr || 0) >= 0.15 || (tgt.S.reflect || 0) >= 0.20) sty(b, tgt, 'guard', 1);
      /* 追い込まれた瞬間に一言。倒れてからでは遅い場面のほうが、声は効く */
      if (tgt.hero && alive(tgt) && tgt.hp <= tgt.S.maxHp * 0.25) {
        bark(b, 'pinch', { who: tgt.hero.allyId || 'hero' });
      }
    }

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
          var others = alliesOf(b, src).filter(function (x) { return x !== src && alive(x); });
          others.forEach(function (o2) {
            var rd2 = Math.round(rd * 0.6);
            log(b, '🪞 反射が波及！ ' + o2.name + ' に ' + rd2 + ' ダメージ', 'refl');
            reflectHit(b, tgt, o2, rd2);
          });
        }
        if (tgt.flags && tgt.flags.healOnReflect) heal(b, tgt, Math.round(rd * 0.30), '鏡の加護');
      }
    }
    /* 反撃の構え */
    if (src && dmg > 0 && alive(tgt) && alive(src) && src !== tgt && !meta.isCounter
        && tgt.counter && tgt.counter.t > 0 && tgt.counter.n > 0) {
      tgt.counter.n--;
      log(b, '⚔ ' + tgt.name + ' の反撃！', tgt.side === 'player' ? 'good' : 'bad');
      strike(b, tgt, src, {
        kind: 'phys', el: tgt.counter.el || 'phys', power: tgt.counter.p || 150,
        isCounter: true, trueHit: true, critBonus: 0.20
      });
      sty(b, tgt, 'reflect', 1);
    }
    if (tgt.hp <= 0) onDeath(b, tgt, src, meta);
    else { checkPhase(b, tgt); if (G.Gimmick) G.Gimmick.onDamage(b, tgt); }
    /* 顎をこじ開ける。大きな一撃が入れば、咥えられた仲間が放り出される。
     * 「待てば戻る」だけにすると、こちらに打てる手が無い仕掛けになる。 */
    if (tgt.gim && tgt.gim.kind === 'maw' && dmg >= tgt.S.maxHp * (tgt.gim.pry || 0.07)) {
      var freed = 0;
      partyUnits(b).forEach(function (m) { if (m.mawed > 0) { m.mawed = 0; freed++; } });
      if (freed) log(b, '💥 渾身の一撃が顎をこじ開けた！ ' + freed + '人が放り出された。', 'good');
    }
    return dmg;
  }

  function reflectHit(b, reflector, target, rd) {
    if (!alive(target)) return;
    var before = target.hp;
    target.hp = Math.max(0, target.hp - rd);
    fx(b, { t: 'dmg', i: target.idx, v: Math.min(before, rd), reflect: true });
    if (reflector.side === 'player') {
      sty(b, reflector, 'reflect', 1);
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
    if (G.Gimmick) G.Gimmick.onDeath(b, u);
    if (u.side === 'player' && u.hero) bark(b, 'down', { who: u.hero.allyId || 'hero' });
    if (u.side === 'enemy') {
      b.rec.kills++;
      b.state.run.stats.kills++;
      if (meta && meta.byReflect) {
        b.rec.reflectKills++; b.state.run.stats.reflectKills++; sty(b, src, 'reflect', 3);
      }
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

  /** 戦闘不能から復帰させる */
  function revive(b, u, pct) {
    if (alive(u)) return false;
    u.hp = Math.max(1, Math.round(u.S.maxHp * (pct || 0.3)));
    u.statuses = []; u.endureUsed = false; refresh(u);
    log(b, '🕊 ' + u.name + ' が立ち上がった！（HP ' + u.hp + '）', 'good');
    fx(b, { t: 'heal', i: u.idx, v: u.hp });
    /* 復帰したユニットはこのラウンドの残り手番に間に合うよう列へ戻す */
    if (b.queue.indexOf(u) < 0) b.queue.push(u);
    if (u.hero) bark(b, 'revive', { who: u.hero.allyId || 'hero' });
    return true;
  }

  /** src が ally をかばう。以後 ally への単体攻撃は src が受ける。 */
  function setCover(b, src, ally, turns) {
    if (!ally || ally === src || !alive(src)) return;
    if (src.coverFor && src.coverFor.coveredBy === src) src.coverFor.coveredBy = null;
    src.coverFor = ally; ally.coveredBy = src; src.coverTurns = turns + 1;
    log(b, '🛡 ' + src.name + ' は ' + ally.name + ' をかばっている。', 'good');
  }
  function clearCover(u) {
    if (u.coverFor && u.coverFor.coveredBy === u) u.coverFor.coveredBy = null;
    u.coverFor = null; u.coverTurns = 0;
  }

  /** 敵から強化効果を剥がす */
  function dispel(b, t, by) {
    var before = t.buffs.length + t.flagBuffs.length;
    var taken = t.buffs.filter(function (x) { return x.v > 0; });
    t.buffs = t.buffs.filter(function (x) { return x.v < 0; });
    t.flagBuffs = [];
    t.barrier = 0;
    refresh(t);
    if (before > t.buffs.length) log(b, '🌀 ' + t.name + ' の強化を打ち消した。', 'good');
    /* boonSteal: 剥がした強化をそのまま自分が着る */
    if (by && alive(by) && by.flags && by.flags.boonSteal && taken.length) {
      taken.forEach(function (x) { by.buffs.push({ k: x.k, v: x.v, t: x.t }); });
      refresh(by);
      log(b, '🎭 ' + by.name + ' は奪った加護を身にまとった。', 'good');
    }
  }

  function addStatus(b, u, kind, turns, val, by) {
    if (!alive(u)) return;
    /* 持続ダメージは「かけた人の性能」で決まるので、付与時に写し取っておく。
     * あとから術者が転職しても、すでに乗っている毒の強さは変わらない。 */
    var pw = (by && by.S && by.S.dotPower) || 0;
    var mg = (by && by.S && by.S.mag) || 0;
    var byId = by ? by.id : null;
    if (by && by.side === 'player') turns += (by.S.dotTurns || 0);
    var ex = u.statuses.filter(function (s) { return s.k === kind; })[0];
    if (ex) {
      ex.t = Math.max(ex.t, turns);
      /* 掛け直しで弱くはならない。強い術者が上書きしたときだけ乗り換える */
      if (pw > (ex.pw || 0)) { ex.pw = pw; ex.mag = mg; ex.by = byId; }
      return;
    }
    if (u.side === 'enemy' && aliveParty(b).some(function (m) { return m.flags.lingering; })) turns += 1;
    u.statuses.push({ k: kind, t: turns, v: val || 0.06, pw: pw, mag: mg, by: byId, rot: 0 });
    if (u.side === 'enemy') {
      b.rec.statusPeak = Math.max(b.rec.statusPeak, u.statuses.length);
      b.state.run.stats.statusApplied = (b.state.run.stats.statusApplied || 0) + 1;
      sty(b, by, 'status', 1);
    }
    var nm = { burn: '🔥 火傷', poison: '☠ 毒', freeze: '❄ 凍結', shock: '⚡ 麻痺',
      seal: '🔒 封印', blind: '🌑 暗闇', slow: '🐌 鈍足' }[kind] || kind;
    log(b, nm + ' を ' + u.name + ' に付与した。');
    refresh(u);
  }

  /** 強化・弱体を付ける。src を渡すと、その人の強化倍率・継続延長が乗る。
   * 「かける側の性能」なので、受け手ではなく必ず術者の値を見る。 */
  function addBuff(b, u, k, v, t, quiet, src) {
    if (src && src.S) {
      /* 味方に掛けたものは「強化」、敵に掛けたものは「弱体」。
       * 鬨の声の被ダメ-10%のように、強化技に混じる自分への不利は
       * どちらの倍率でも伸ばさない。伸ばすと支援ビルドが自分の首を絞める。 */
      var boon = (u.side === src.side);
      var pw = boon ? (src.S.buffPower || 0) : (src.S.debuffPower || 0);
      var ex = boon ? (src.S.buffTurns || 0) : (src.S.debuffTurns || 0);
      /* 1ターンだけの構え（防御など）は伸ばさない。
       * その場しのぎの一手まで支援ビルドの倍率で伸びると、
       * 「防御を押すだけで硬くなる」という別のゲームになってしまう。 */
      var counts = (boon ? (v > 0) : (v < 0)) && t >= 2;
      if (pw && counts) v = v * (1 + pw);
      if (ex && counts) t += ex;
      if (src.side === 'player' && counts && b && b.rec) {
        if (boon) { b.rec.boonsCast++; sty(b, src, 'buff', 1); }
        else { b.rec.hexesCast++; sty(b, src, 'debuff', 1); }
      }
    }
    if (Math.abs(v) > 0.0001 && G.MODKEYS[k] && G.MODKEYS[k].kind === 'pct') {
      v = Math.round(v * 1000) / 1000;
    } else v = Math.round(v * 10) / 10;
    u.buffs.push({ k: k, v: v, t: t + 1 });
    refresh(u);
    if (b && b.rec && u.side === 'enemy') {
      var hexN = u.buffs.filter(function (x) { return x.v < 0; }).length;
      b.rec.hexPeak = Math.max(b.rec.hexPeak, hexN);
    }
    if (!quiet) {
      var mk = G.MODKEYS[k];
      var txt = mk ? (mk.label + ' ' + (mk.kind === 'pct' ? U.sgnp(v) : U.sgn(v))) : (k + ' ' + v);
      log(b, (v >= 0 ? '⬆ ' : '⬇ ') + u.name + ': ' + txt + '（' + t + 'ターン）', v >= 0 ? 'good' : 'bad');
    }
  }

  /* ===================== 行動: スキル ===================== */

  function targetsFor(b, src, skill, targetIdx) {
    var mode = skill.target || 'one';
    var mates = alliesOf(b, src);

    if (mode === 'self') return [src];
    if (mode === 'allies') return mates.filter(alive);
    if (mode === 'ally') {
      var a = null;
      if (src.side === 'player' && targetIdx != null && targetIdx.ally != null) a = mates[targetIdx.ally];
      if (!a || !alive(a)) {
        /* 指定が無ければ一番傷ついている味方 */
        var living = mates.filter(alive);
        living.sort(function (x, y) { return (x.hp / x.S.maxHp) - (y.hp / y.S.maxHp); });
        a = living[0];
      }
      return a ? [a] : [];
    }
    if (mode === 'downed') {
      var down = mates.filter(function (x) { return !alive(x); });
      if (src.side === 'player' && targetIdx != null && targetIdx.ally != null && mates[targetIdx.ally]
          && !alive(mates[targetIdx.ally])) return [mates[targetIdx.ally]];
      return down.length ? [down[0]] : [];
    }
    /* 補助・回復で対象指定が無いものは自分に返す。
     * ただし target が敵を指しているもの（all / random / one）は、kind が util でも敵に向ける。
     * ここで util をひとまとめに自分へ返していたせいで、〈煙玉〉〈解呪波〉〈弱点看破〉
     * のような「敵に効く補助技」が、使っても何も起きない状態になっていた。 */
    if (skill.kind === 'heal' || skill.kind === 'buff') return [src];
    if (skill.kind === 'util' && mode !== 'all' && mode !== 'random' && mode !== 'one') return [src];

    var foes = foesOf(b, src);
    if (mode === 'all' || mode === 'random') return foes;
    var t = null;
    if (src.side === 'player' && targetIdx != null) {
      var idx = (typeof targetIdx === 'object') ? targetIdx.foe : targetIdx;
      if (idx != null) t = b.enemies[idx];
    }
    if (!t || !alive(t)) {
      t = (src.side === 'enemy' && b.currentFoeTarget && alive(b.currentFoeTarget))
        ? b.currentFoeTarget : foes[0];
    }
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

    if (hasStatus(src, 'seal') && skillId !== 'attack' && skillId !== 'guard') {
      log(b, '🔒 ' + src.name + ' は封印されていて技を使えない！', 'bad');
      if (src.side === 'player') { src.mp += cost; b.rec.mpSpent -= cost; }
      skillId = 'attack'; sk = G.SKILLS.attack; cost = 0; eff = sk.eff || {};
    }

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
      /* 溜めた力を上乗せして消費する */
      if (src.charge > 0) {
        power = Math.round(power * (1 + src.charge));
        log(b, '　⚡ 溜めた力が解き放たれる！（威力 ' + power + '%）', 'crit');
        src.charge = 0;
      }
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
      /* 連携攻撃: 生存している味方が追撃に加わる */
      if (eff.linkStrike) {
        alliesOf(b, src).filter(function (x) { return x !== src && alive(x); }).forEach(function (m) {
          targets.filter(alive).forEach(function (t) {
            log(b, '　🤝 ' + m.name + ' が呼応した！', 'good');
            strike(b, m, t, {
              kind: m.S.atk >= m.S.mag ? 'phys' : 'mag', el: sk.el,
              power: Math.round(eff.linkStrike * 100), trueHit: true, isAoe: isAoe
            });
          });
        });
      }
      applySkillSideEffects(b, src, targets, eff);
      /* 胞子散布: すでに毒か火傷を受けている敵には、そのぶん深く入る */
      if (eff.rotBonus) {
        targets.filter(function (t) {
          return alive(t) && t.statuses.some(function (x) { return x.k === 'burn' || x.k === 'poison'; });
        }).forEach(function (t) {
          strike(b, src, t, { kind: 'mag', el: sk.el || 'dark',
            power: Math.round((sk.power || 100) * eff.rotBonus), trueHit: true, isAoe: true });
        });
      }
    }

    /* --- 回復 --- */
    if (sk.kind === 'heal') {
      var p = sk.power || 100;
      if (sk.special === 'itemScale') p = Math.round(p * (1 + (src.S.itemPower || 0)));
      if (sk.special === 'missingHp') {
        var lack = 1 - (src.hp / src.S.maxHp);
        p = Math.round(p * (1 + lack * 1.2));
      }
      var amt = Math.round((src.S.mag || 10) * p / 100 + src.S.maxHp * 0.05);
      var hts = targets.filter(alive);
      if (!hts.length) hts = [src];
      hts.forEach(function (t) {
        heal(b, t, amt, sk.name);
        if (eff.cleanse) { t.statuses = []; refresh(t); log(b, '✨ ' + t.name + ' の状態異常が解除された。', 'good'); }
      });
    }

    /* --- バフ・支援 --- */
    /* 味方対象の技はその味方に、それ以外は自分に掛かる */
    var toAlly = (sk.target === 'ally' || sk.target === 'allies' || sk.target === 'downed');
    var boons = toAlly ? targets.filter(alive) : [src];
    if (!boons.length) boons = [src];

    if (eff.buffs) {
      /* boonShare: 自分だけに掛けた強化を、味方全体へ半分の強さで配る */
      var share = (src.flags && src.flags.boonShare && boons.length === 1 && boons[0] === src)
        ? alliesOf(b, src).filter(alive).filter(function (x) { return x !== src; }) : [];
      boons.forEach(function (t) {
        eff.buffs.forEach(function (x) {
          var v = x.v;
          if (sk.id === 'guard' && x.k === 'reflect' && t.flags && t.flags.guardCounter) v += 0.60;
          addBuff(b, t, x.k, v, x.t, false, src);
        });
      });
      if (share.length) {
        share.forEach(function (t) {
          eff.buffs.forEach(function (x) { addBuff(b, t, x.k, x.v * 0.5, x.t, true, src); });
        });
        log(b, '🎼 ' + src.name + ' の加護が味方全体へ広がった。', 'good');
      }
    }
    if (eff.flagBuff) boons.forEach(function (t) {
      t.flagBuffs.push({ f: eff.flagBuff.f, t: eff.flagBuff.t + 1 }); refresh(t);
      log(b, '✨ ' + t.name + ': ' + (G.FLAGS[eff.flagBuff.f] || eff.flagBuff.f), 'good');
    });
    if (eff.healMaxPct) boons.forEach(function (t) { heal(b, t, Math.round(t.S.maxHp * eff.healMaxPct), sk.name); });
    if (eff.cleanseAllies) boons.forEach(function (t) {
      if (!t.statuses.length) return;
      t.statuses = []; refresh(t);
      log(b, '✨ ' + t.name + ' の状態異常が解除された。', 'good');
    });
    /* 強化の延長。支援ビルドは「掛け直す手番」が一番の負担なので、そこを減らす技。 */
    if (eff.extendBuffs) {
      var ext = eff.extendBuffs + (src.S.buffTurns || 0);
      var moved = 0;
      boons.forEach(function (t) {
        t.buffs.forEach(function (x) { if (x.v > 0) { x.t += ext; moved++; } });
        t.flagBuffs.forEach(function (x) { x.t += ext; moved++; });
      });
      if (moved) {
        sty(b, src, 'buff', 1);
        log(b, '🎵 味方の加護が ' + ext + 'ターン 延びた。', 'good');
      }
    }
    if (eff.barrier) boons.forEach(function (t) {
      t.barrier += Math.round(src.S.mag * eff.barrier + t.S.maxHp * 0.05);
      log(b, '🛡 ' + t.name + ' にバリアを展開した（' + t.barrier + '）。', 'good');
    });
    if (eff.mpGain && src.side === 'player') {
      src.mp = Math.min(src.S.maxMp, src.mp + eff.mpGain);
    }
    if (eff.mpGive) boons.forEach(function (t) {
      if (t.side !== 'player') return;
      t.mp = Math.min(t.S.maxMp, t.mp + eff.mpGive);
      log(b, '🔷 ' + t.name + ' のMPが ' + eff.mpGive + ' 回復した。', 'good');
    });
    if (eff.healSelf) heal(b, src, Math.round(src.S.mag * eff.healSelf), sk.name);

    /* --- 蘇生 --- */
    /* --- 召喚: 場に味方を増やす ---
     * 強さは術者の魔力（か攻撃力の高いほう）から決まるので、
     * 召喚士を伸ばせば呼ぶものも一緒に伸びる。 */
    if (eff.summon && src.side === 'player') {
      /* count があれば、その数だけまとめて呼ぶ。
       * cap も一緒に見るので「2体同時に出て、2体まで並ぶ」が表せる。 */
      var sn = eff.summon.count || 1;
      for (var si = 0; si < sn; si++) addSummon(b, src, eff.summon, si);
      sty(b, src, 'summon', 3);
    }
    if (eff.revive) {
      var downs = toAlly ? targets : alliesOf(b, src).filter(function (x) { return !alive(x); });
      var did = false;
      downs.forEach(function (t) {
        if (!eff.reviveAll && did) return;
        if (revive(b, t, eff.revive)) did = true;
      });
      if (!did) log(b, '　（倒れている仲間がいない）');
    }

    /* --- かばう --- */
    if (eff.cover) {
      var ward = targets.filter(function (x) { return x !== src && alive(x); })[0];
      if (!ward) {
        var others = alliesOf(b, src).filter(function (x) { return x !== src && alive(x); });
        others.sort(function (x, y) { return (x.hp / x.S.maxHp) - (y.hp / y.S.maxHp); });
        ward = others[0];
      }
      if (ward) setCover(b, src, ward, eff.cover);
      else log(b, '　（かばう相手がいない）');
    }

    /* --- 反撃の構え --- */
    if (eff.counter) {
      src.counter = { t: eff.counter.t + 1, n: eff.counter.n || 99, p: eff.counter.p || 150, el: eff.counter.el };
      log(b, '⚔ ' + src.name + ' は反撃の構えを取った。', 'good');
    }

    /* --- 溜め --- */
    if (eff.charge) {
      src.charge = (src.charge || 0) + eff.charge;
      log(b, '⚡ ' + src.name + ' は力を溜めている（次の攻撃 +' + Math.round(src.charge * 100) + '%）。', 'good');
    }

    /* --- 挑発 --- */
    if (eff.taunt) {
      src.tauntTurns = eff.taunt + 1;
      log(b, '📢 ' + src.name + ' は敵の注意を引きつけた。', 'good');
    }

    /* 潜伏: すでに乗っている毒・火傷の残りを延ばす。撒き直す手番を減らす技 */
    if (eff.extendRot) {
      var ext2 = eff.extendRot + (src.S.dotTurns || 0);
      var moved2 = 0;
      targets.filter(function (t) { return t.side !== src.side && alive(t); }).forEach(function (t) {
        t.statuses.forEach(function (st2) {
          if (st2.k === 'burn' || st2.k === 'poison') { st2.t += ext2; moved2++; }
        });
      });
      if (moved2) {
        sty(b, src, 'status', 1);
        log(b, '☣ 蝕みが ' + ext2 + 'ターン 長引いた。', 'good');
      }
    }

    /* --- 刻印・打ち消し・MP奪取・封印 --- */
    var foeTargets = targets.filter(function (t) { return t.side !== src.side && alive(t); });
    if (eff.mark) foeTargets.forEach(function (t) {
      t.mark = { t: eff.mark.t + 1, v: eff.mark.v };
      log(b, '🎯 ' + t.name + ' に刻印を刻んだ（被ダメ +' + Math.round(eff.mark.v * 100) + '%）。', 'good');
    });
    if (eff.dispel) foeTargets.forEach(function (t) { dispel(b, t, src); });
    if (eff.seal) foeTargets.forEach(function (t) {
      if (U.chance(eff.seal.c != null ? eff.seal.c : 1)) addStatus(b, t, 'seal', eff.seal.t, null, src);
    });
    if (eff.blind) foeTargets.forEach(function (t) {
      if (U.chance(eff.blind.c != null ? eff.blind.c : 1)) addStatus(b, t, 'blind', eff.blind.t, null, src);
    });
    if (eff.mpSteal && src.side === 'player' && foeTargets.length) {
      var gain = Math.min(src.S.maxMp - src.mp, eff.mpSteal);
      src.mp += gain;
      log(b, '🔮 敵から魔力を吸い上げた（MP +' + gain + '）。', 'good');
    }
    /* --- 身代わり: 味方のHPを自分に移す --- */
    if (eff.transferHp) {
      var recv = targets.filter(function (x) { return x !== src && alive(x); })[0];
      if (recv) {
        var give = Math.round(src.hp * eff.transferHp);
        give = Math.min(give, src.hp - 1);
        if (give > 0) { src.hp -= give; heal(b, recv, give, sk.name); }
      }
    }
    if (eff.makeItem && src.side === 'player') {
      for (var mi = 0; mi < eff.makeItem; mi++) {
        var got = U.pick(G.ITEMS.filter(function (i) { return i.tier <= 2; }));
        G.addItem(b.state.hero, got.id, 1);
        log(b, '🧪 〈' + got.name + '〉を錬成した。', 'good');
      }
    }
    if (sk.kind === 'buff' || sk.kind === 'util') {
      if (eff.debuff || eff.debuffs) applySkillSideEffects(b, src, targets, eff);
    }
    /* encore: 支援がもう一度鳴る。アイテムの itemEcho と対になる仕組み。
     * 攻撃技には乗らないので、支援に寄せたビルドだけが得をする。 */
    /* MPを払う支援だけが再演の対象。防御のような基本行動は対象外 */
    var supportive = (sk.mp || 0) > 0 &&
                     ((sk.kind === 'heal' || sk.kind === 'buff') ||
                      !!(eff.buffs || eff.flagBuff || eff.barrier));
    if (supportive && !b._encore && src.flags && src.flags.encore &&
        src.side === 'player' && U.chance(0.30)) {
      b._encore = true;
      log(b, '🎵 アンコール！ ' + sk.name + ' がもう一度響いた。', 'good');
      useSkill(b, src, skillId, targetIdx);
      b._encore = false;
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
    /* 弱体は単発(debuff)でも複数(debuffs)でも書けるようにして、同じ経路で処理する */
    var hexes = (eff.debuffs || []).concat(eff.debuff ? [eff.debuff] : []);
    /* 状態異常の伝播 */
    if (src.side === 'player' && src.flags && src.flags.spreadStatus) {
      var extra = aliveEnemies(b).filter(function (x) { return targets.indexOf(x) < 0; })
        .filter(function () { return U.chance(0.35); });
      targets = targets.concat(extra);
      if (extra.length) log(b, '☣ 状態異常が周囲へ伝播した。', 'aoe');
    }
    targets.filter(alive).forEach(function (t) {
      if (eff.burn && U.chance(eff.burn.c != null ? eff.burn.c : 1)) addStatus(b, t, 'burn', eff.burn.t, eff.burn.v, src);
      if (eff.poison && U.chance(eff.poison.c != null ? eff.poison.c : 1)) addStatus(b, t, 'poison', eff.poison.t, eff.poison.v, src);
      if (eff.freeze && U.chance(eff.freeze.c != null ? eff.freeze.c : 1)) addStatus(b, t, 'freeze', eff.freeze.t, null, src);
      if (eff.shock && U.chance(eff.shock.c != null ? eff.shock.c : 1)) addStatus(b, t, 'shock', eff.shock.t, null, src);
      hexes.forEach(function (d) { addBuff(b, t, d.k, d.v, d.t, false, src); });
    });
    /* spreadHex: 弱体が周囲へ広がる。状態異常の spreadStatus と対になる。 */
    if (hexes.length && src.side === 'player' && src.flags && src.flags.spreadHex) {
      aliveEnemies(b).filter(function (x) { return targets.indexOf(x) < 0; })
        .filter(function () { return U.chance(0.40); })
        .forEach(function (t) {
          hexes.forEach(function (d) { addBuff(b, t, d.k, d.v, d.t, true, src); });
        });
    }
  }

  /* ===================== 行動: アイテム ===================== */

  function useItem(b, itemId, targetIdx) {
    var hero = b.state.hero, src = b.actor || b.hero;
    if (!hero.items[itemId]) return false;
    var it = G.ITEM_BY_ID[itemId];
    var keep = U.chance(src.S.itemKeep || 0);
    if (!keep) G.addItem(hero, itemId, -1);
    b.rec.itemsUsed++;
    b.state.run.stats.itemsUsed++;
    sty(b, src, 'item', 2);
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
    var mates = alliesOf(b, src);
    var idxAlly = (targetIdx != null && typeof targetIdx === 'object') ? targetIdx.ally : null;
    var idxFoe = (targetIdx != null && typeof targetIdx === 'object') ? targetIdx.foe : targetIdx;
    /* 効果の受け手。target:'allies' ならパーティ全体。 */
    var bens = (u.target === 'allies') ? mates.filter(alive) : [allyOf(b, src, targetIdx)];
    if (!bens.length) bens = [src];

    /* --- 蘇生 --- */
    if (u.revive) {
      var downs = mates.filter(function (x) { return !alive(x); });
      if (idxAlly != null && mates[idxAlly] && !alive(mates[idxAlly])) downs = [mates[idxAlly]];
      var revived = 0;
      downs.forEach(function (t) {
        if (!u.reviveAll && revived) return;
        if (revive(b, t, u.revive)) revived++;
      });
      if (!revived) log(b, '　（倒れている仲間がいない）');
      /* 蘇生だけのアイテムはここで終わり。回復も持つものは続ける。 */
      if (!u.type) return;
      bens = mates.filter(alive);
    }

    if (u.type === 'heal') {
      bens.forEach(function (t) { heal(b, t, Math.round(u.power * scale * lvl), it.name); });
      return;
    }
    if (u.type === 'mp') {
      bens.forEach(function (t) {
        t.mp = Math.min(t.S.maxMp, t.mp + Math.round(u.power * scale));
        log(b, '🔷 ' + t.name + ' のMPが回復した。', 'good');
      });
      return;
    }
    if (u.type === 'full') {
      bens.forEach(function (t) {
        t.hp = t.S.maxHp; t.mp = t.S.maxMp; t.statuses = []; refresh(t);
        log(b, '✨ ' + t.name + ' のHPとMPが全回復した！', 'good');
      });
      return;
    }
    if (u.type === 'cleanse') {
      bens.forEach(function (t) {
        t.statuses = []; refresh(t);
        heal(b, t, Math.round(u.power * scale * lvl), it.name);
      });
      log(b, '✨ 状態異常が解除された。', 'good');
      return;
    }
    if (u.type === 'buff') {
      bens.forEach(function (t) {
        (u.buffs || []).forEach(function (x) { addBuff(b, t, x.k, x.v, x.t, false, src); });
        if (u.endure) {
          t.extraEndure = true; t.endureUsed = false;
          log(b, '🕊 ' + t.name + ' は致死ダメージを1度耐える加護を得た。', 'good');
        }
      });
      return;
    }

    /* --- 敵に作用するもの --- */
    function foeList() {
      if (u.target === 'all') return aliveEnemies(b);
      var t = (idxFoe != null) ? b.enemies[idxFoe] : null;
      if (!t || !alive(t)) t = aliveEnemies(b)[0];
      return t ? [t] : [];
    }

    if (u.type === 'util') {
      foeList().forEach(function (t) {
        if (u.dispel) dispel(b, t, src);
        if (u.seal && U.chance(u.seal.c != null ? u.seal.c : 1)) addStatus(b, t, 'seal', u.seal.t, null, src);
        if (u.blind && U.chance(u.blind.c != null ? u.blind.c : 1)) addStatus(b, t, 'blind', u.blind.t, null, src);
        if (u.mark) {
          t.mark = { t: u.mark.t + 1, v: u.mark.v };
          log(b, '🎯 ' + t.name + ' に刻印を刻んだ（被ダメ +' + Math.round(u.mark.v * 100) + '%）。', 'good');
        }
        if (u.debuff) addBuff(b, t, u.debuff.k, u.debuff.v, u.debuff.t, false, src);
      });
      return;
    }

    if (u.type === 'dmg' || u.type === 'dmgMulti') {
      var els = u.type === 'dmgMulti' ? u.els : [u.el];
      var list = foeList();
      els.forEach(function (el) {
        list.filter(function (t) { return t && alive(t); }).forEach(function (t) {
          strike(b, src, t, {
            kind: 'mag', el: el, power: Math.round(u.power * scale * lvl),
            isAoe: u.target === 'all', trueHit: true, defIgnore: u.defIgnore || 0,
            atkStat: Math.max(src.S.mag, src.S.atk, 30)
          });
        });
      });
      function living() { return list.filter(function (t) { return t && alive(t); }); }
      if (u.freeze) living().forEach(function (t) { if (U.chance(u.freeze)) addStatus(b, t, 'freeze', 2, null, src); });
      if (u.shock) living().forEach(function (t) { if (U.chance(u.shock)) addStatus(b, t, 'shock', 2, null, src); });
      if (u.debuff) living().forEach(function (t) { addBuff(b, t, u.debuff.k, u.debuff.v, u.debuff.t, false, src); });
      if (u.mark) living().forEach(function (t) {
        t.mark = { t: u.mark.t + 1, v: u.mark.v };
        log(b, '🎯 ' + t.name + ' に刻印を刻んだ（被ダメ +' + Math.round(u.mark.v * 100) + '%）。', 'good');
      });
      if (u.healSelf) heal(b, src, Math.round(u.power * scale * u.healSelf), it.name);
    }
  }

  /* ===================== プレイヤー行動 ===================== */

  /** 逃走できるか。ボス戦からは逃げられない。 */
  function canFlee(b) { return !b.isBoss; }

  /** 逃走の成功率。素早さの差で決まる。 */
  function fleeChance(b) {
    var mine = aliveParty(b), foes = aliveEnemies(b);
    if (!mine.length || !foes.length) return 1;
    function avg(list) {
      return list.reduce(function (a, u) { return a + u.S.spd; }, 0) / list.length;
    }
    var up = G.Diff ? G.Diff.get().fleeUp : 0;
    return U.clamp(0.45 + up + (avg(mine) - avg(foes)) * 0.012, 0.10, 0.92);
  }

  /** 逃走を試みる。失敗すると手番を1つ失う。 */
  function tryFlee(b) {
    if (!canFlee(b)) { log(b, 'この相手からは逃げられない！', 'bad'); return false; }
    if (U.chance(fleeChance(b))) {
      b.over = true; b.result = 'flee';
      log(b, '🏃 逃げ出した。', 'sys');
      return true;
    }
    log(b, '🏃 逃げられなかった！', 'bad');
    return true;   /* 手番は消費する */
  }

  function playerAction(b, act) {
    if (b.over || !b.awaiting) return false;
    var src = b.actor || b.hero;
    src._b = b;
    if (act.type === 'flee' && !canFlee(b)) { log(b, 'この相手からは逃げられない！', 'bad'); return false; }
    if (stunned(b, src)) { b.awaiting = false; b.qi++; advance(b); return true; }

    var ok = true;
    if (act.type === 'skill') ok = useSkill(b, src, act.id, act.target);
    else if (act.type === 'item') ok = useItem(b, act.id, act.target);
    else if (act.type === 'flee') {
      ok = tryFlee(b);
      if (ok && b.over) { syncParty(b); b.awaiting = false; return true; }
    }
    if (!ok) return false;

    /* 撃破数（同時撃破の記録） */
    countMultiKill(b);
    syncParty(b);
    b.awaiting = false;
    b.qi++;
    if (checkEnd(b)) return true;
    advance(b);
    syncParty(b);
    return true;
  }

  function countMultiKill(b) {
    var deadNow = b.enemies.filter(function (e) { return e.hp <= 0 && !e._counted; });
    if (deadNow.length) {
      b.rec.maxMultiKill = Math.max(b.rec.maxMultiKill, deadNow.length);
      deadNow.forEach(function (e) { e._counted = true; });
    }
  }

  /* ===================== 仲間の行動（自動） ===================== */

  /** 仲間が使える技のうち、MPが足りるものだけを返す */
  function usableSkills(b, u) {
    return G.Stats.skillList(u.hero).filter(function (id) {
      var sk = G.SKILLS[id];
      return sk && (sk.mp || 0) <= u.mp;
    }).map(function (id) { return G.SKILLS[id]; });
  }

  /** 仲間の行動決定。役割（回復役・盾役・術師）が自然に出るよう順に判定する。 */
  function takeAllyTurn(b, u) {
    if (stunned(b, u)) return;
    var mates = aliveParty(b);
    var down = partyUnits(b).filter(function (x) { return !alive(x); });
    var sks = usableSkills(b, u);
    var foes = aliveEnemies(b);
    if (!foes.length) return;

    function have(pred) { return sks.filter(pred)[0]; }
    function idxOf(m) { return partyUnits(b).indexOf(m); }
    function weakest() {
      var l = mates.slice().sort(function (x, y) { return (x.hp / x.S.maxHp) - (y.hp / y.S.maxHp); });
      return l[0];
    }
    function target(sk, allyUnit, foeUnit) {
      return { ally: allyUnit ? idxOf(allyUnit) : null, foe: foeUnit ? b.enemies.indexOf(foeUnit) : null };
    }

    /* 1. 倒れた仲間がいれば蘇生 */
    if (down.length) {
      var rev = have(function (s) { return s.eff && s.eff.revive; });
      if (rev) { useSkill(b, u, rev.id, target(rev, down[0], null)); return; }
    }
    /* 2. 瀕死の味方がいれば回復 */
    var hurt = weakest();
    var lowCount = mates.filter(function (m) { return m.hp / m.S.maxHp < 0.55; }).length;
    if (hurt && hurt.hp / hurt.S.maxHp < 0.45) {
      var grp = lowCount >= 2 ? have(function (s) { return s.kind === 'heal' && s.target === 'allies'; }) : null;
      var one = have(function (s) { return s.kind === 'heal'; });
      var pick = grp || one;
      if (pick) { useSkill(b, u, pick.id, target(pick, hurt, null)); return; }
    }
    /* 3. 主人公が危なければかばう */
    var lead = partyUnits(b)[0];
    if (alive(lead) && lead !== u && lead.hp / lead.S.maxHp < 0.5 && !u.coverFor) {
      var cov = have(function (s) { return s.eff && s.eff.cover; });
      if (cov) { useSkill(b, u, cov.id, target(cov, lead, null)); return; }
    }
    /* 4. 状態異常が溜まっていれば浄化 */
    var sick = mates.filter(function (m) { return m.statuses.length >= 1; });
    if (sick.length >= 2) {
      var cl = have(function (s) { return s.eff && s.eff.cleanse; });
      if (cl) { useSkill(b, u, cl.id, target(cl, sick[0], null)); return; }
    }
    /* 5. 支援を掛ける（同じバフの重ね掛けはしない）。
     * ふだんは序盤だけだが、支援に寄せたビルドの人は切れたら掛け直す。
     * そうしないと、強化を伸ばす装備を着けた意味が無くなる。 */
    if (b.round <= 2 || (u.S.buffPower || 0) >= 0.20) {
      var sup = have(function (s) {
        if (s.kind !== 'buff' && s.kind !== 'util') return false;
        if (s.eff && (s.eff.revive || s.eff.cover)) return false;
        if (!s.eff || !s.eff.buffs) return false;
        return !s.eff.buffs.every(function (x) {
          return u.buffs.some(function (bf) { return bf.k === x.k; });
        });
      });
      if (sup) {
        var to = (sup.target === 'ally') ? (hurt || lead) : null;
        useSkill(b, u, sup.id, target(sup, to, null));
        return;
      }
    }
    /* 5a. 持続ダメージに寄せたビルドの人は、まだ腐っていない敵に先に毒を撒く。
     * 威力で選ぶと持続系の技は素の火力が低いので、いつまでも使われない。 */
    if ((u.S.dotPower || 0) >= 0.20) {
      var clean = foes.filter(function (x) {
        return !x.statuses.some(function (st3) { return st3.k === 'burn' || st3.k === 'poison'; });
      });
      if (clean.length) {
        var rotSk = have(function (s) {
          var e = s.eff || {};
          if (!e.poison && !e.burn) return false;
          /* 全体技は敵が2体以上いるときだけ。1体なら単体技のほうが濃い */
          return s.target !== 'all' || clean.length >= 2;
        });
        if (rotSk) {
          var rotTo = rotSk.target === 'all' ? null
            : clean.slice().sort(function (x, y) { return y.S.maxHp - x.S.maxHp; })[0];
          useSkill(b, u, rotSk.id, target(rotSk, null, rotTo));
          return;
        }
      }
    }

    /* 5b. 弱体に寄せたビルドの人は、まだ乗っていない弱体を優先して掛ける。
     * 威力で選ぶと弱体技は素の火力が低いので、いつまでも使われない。 */
    if ((u.S.debuffPower || 0) >= 0.20) {
      var hexTarget = foes.slice().sort(function (x, y) { return y.S.maxHp - x.S.maxHp; })[0];
      var hexSk = have(function (s) {
        var ds = (s.eff && (s.eff.debuffs || (s.eff.debuff ? [s.eff.debuff] : []))) || [];
        if (!ds.length) return false;
        return !ds.every(function (d) {
          return hexTarget.buffs.some(function (bf) { return bf.k === d.k && bf.v < 0; });
        });
      });
      if (hexSk) { useSkill(b, u, hexSk.id, target(hexSk, null, hexTarget)); return; }
    }

    /* 6. 攻撃。敵が多いときは範囲、単体なら威力の高いものを選ぶ */
    var wantAoe = foes.length >= 3;
    var atks = sks.filter(function (s) { return s.kind === 'phys' || s.kind === 'mag'; });
    if (wantAoe) {
      var aoe = atks.filter(function (s) { return s.target === 'all' || s.target === 'random'; });
      if (aoe.length) atks = aoe;
    }
    /* MPを使い切らないよう、余裕が無いときは基本攻撃に戻す */
    if (u.mp < u.S.maxMp * 0.25) atks = atks.filter(function (s) { return (s.mp || 0) === 0; });
    atks.sort(function (x, y) {
      return ((y.power || 0) * (y.hits || 1)) - ((x.power || 0) * (x.hits || 1));
    });
    var use = atks[0] || G.SKILLS.attack;
    var foe = foes.slice().sort(function (x, y) { return x.hp - y.hp; })[0];
    useSkill(b, u, use.id, target(use, null, foe));
  }

  /* ===================== 敵の行動 ===================== */

  function takeEnemyTurn(b, u) {
    u._b = b;
    u._actNo = (u._actNo || 0) + 1;
    u.followUp = u._actNo >= 2;
    b.currentFoeTarget = pickTarget(b, u);
    if (stunned(b, u)) { u.followUp = false; return; }
    var sks = u.ref.skills.slice();
    /* 追撃は「もう一撃入れてくる」だけにする。
     * 全体技や状態異常まで2回撒かれると、盤面を立て直す手が無くなる。
     * 回復も外す。削っても戻る戦いになるだけで、うまくやった感じがしない。 */
    if (u.followUp) {
      var atk = sks.filter(function (x) {
        var sk = G.SKILLS[x];
        return sk.kind !== 'heal' && sk.target !== 'all' && sk.target !== 'random';
      });
      if (atk.length) {
        atk.sort(function (x, y) { return (G.SKILLS[x].power || 0) - (G.SKILLS[y].power || 0); });
        sks = [atk[0]];
      } else sks = ['attack'];
    }
    var hpRatio = u.hp / u.S.maxHp;
    var pick;
    var aim = G.Diff ? G.Diff.get().aim : 0;
    if (hpRatio < 0.4 && sks.indexOf('e_heal') >= 0 && U.chance(0.5)) pick = 'e_heal';
    else if (u.isBoss && U.chance(0.38 + aim * 0.22)) {
      var aoes = sks.filter(function (s) { return G.SKILLS[s].target === 'all'; });
      pick = aoes.length ? U.pick(aoes) : U.pick(sks);
    } else if (aim > 0 && U.chance(aim * 0.5)) {
      /* 難易度が上がると、雑魚も手なりではなく強い技を選ぶ */
      var strong = sks.slice().sort(function (x, y) {
        var sx = G.SKILLS[x], sy = G.SKILLS[y];
        return ((sy.power || 0) * (sy.hits || 1)) - ((sx.power || 0) * (sx.hits || 1));
      });
      pick = strong[0];
    } else pick = U.pick(sks);
    useSkill(b, u, pick, null);
    /* 反撃やカウンターまで追撃あつかいにならないよう、手番の終わりで下ろす */
    u.followUp = false;
    syncParty(b);
  }

  return {
    start: start, advance: advance, playerAction: playerAction, refresh: refresh,
    makeEnemyUnit: makeEnemyUnit, enemyScale: enemyScale, aliveEnemies: aliveEnemies,
    addEnemy: addEnemy, applyRawDamage: applyRawDamage, addBuff: addBuff, refresh: refresh,
    addStatus: addStatus, hasStatus: hasStatus,
    partyUnits: partyUnits, aliveParty: aliveParty, realParty: realParty,
    aliveRealParty: aliveRealParty, addSummon: addSummon,
    syncParty: syncParty, revive: revive,
    canFlee: canFlee, fleeChance: fleeChance, controller: controller,
    alive: alive, log: log, heal: heal
  };
})();
