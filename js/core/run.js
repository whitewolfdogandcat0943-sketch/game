/* run.js - 冒険（ラン）の進行・報酬・ノード生成 */

/* --- インベントリ操作（グローバルヘルパー） --- */
G.addItem = function (hero, id, n) {
  hero.items[id] = (hero.items[id] || 0) + n;
  if (hero.items[id] <= 0) delete hero.items[id];
};
G.addGear = function (hero, id) { hero.bag.gear.push(id); };
G.addAcc = function (hero, id) { hero.bag.acc.push(id); };

G.Run = (function () {
  var U = G.U;

  /* ===================== 主人公生成 ===================== */
  function newHero(classId, name) {
    var hero = {
      name: name || '冒険者', classId: classId, classHistory: [], level: 1, exp: 0,
      hp: 1, mp: 1, gold: 120, sp: 2, tree: {}, mastery: {},
      style: G.Style.newRecord(),
      equip: { weapon: null, armor: null, acc: [null, null, null, null] },
      bag: { gear: [], acc: [] },
      items: {}
    };
    /* 初期装備 */
    var starter = {
      swordsman: ['w_shortsword', 'a_chain'],
      mage: ['w_oakstaff', 'a_robe'],
      rogue: ['w_dagger', 'a_leather'],
      priest: ['w_mace', 'a_leather']
    }[classId] || ['w_shortsword', 'a_leather'];
    G.addGear(hero, starter[0]); G.addGear(hero, starter[1]);
    hero.equip.weapon = starter[0]; hero.equip.armor = starter[1];
    G.addAcc(hero, 'n_luckcoin');
    hero.equip.acc[0] = 'n_luckcoin';
    G.addItem(hero, 'i_potion', 3);
    G.addItem(hero, 'i_herb', 2);
    G.addItem(hero, 'i_fbomb', 1);
    var S = G.Stats.compute(hero).S;
    hero.hp = S.maxHp; hero.mp = S.maxMp;
    return hero;
  }

  /* ===================== 仲間 ===================== */
  /** 仲間データからパーティメンバーを作る。主人公と同じ形にしておく。 */
  function makeAlly(def, level) {
    var a = {
      allyId: def.id, name: def.name, classId: def.classId, classHistory: [],
      level: Math.max(1, level || 1), exp: 0, hp: 1, mp: 1, gold: 0, sp: 2,
      tree: {}, mastery: {}, style: G.Style.newRecord(),
      equip: {
        weapon: def.weapon || null, armor: def.armor || null,
        acc: (def.acc || []).concat([null, null, null, null]).slice(0, 4)
      },
      bag: { gear: [], acc: [] }, items: {},
      /* 転職しても失われない固有技。「職業は変わっても、この人がやること」 */
      signature: (def.signature || []).slice(), isAlly: true,
      arch: def.arch, hue: def.hue, accent: def.accent, role: def.role
    };
    var S = G.Stats.compute(a).S;
    a.hp = S.maxHp; a.mp = S.maxMp;
    return a;
  }

  /** 仲間を加入させる。既にいる場合は何もしない。 */
  function joinAlly(state, id) {
    var def = G.ALLIES && G.ALLIES[id];
    if (!def) return null;
    if (!state.party) state.party = [state.hero];
    if (state.party.some(function (m) { return m.allyId === id; })) return null;
    var a = makeAlly(def, state.hero.level);
    /* 初期装備は共有の持ち物に登録する。
     * これをやらないと「誰が何を持っているか」の勘定が合わなくなる。 */
    if (a.equip.weapon) G.addGear(state.hero, a.equip.weapon);
    if (a.equip.armor) G.addGear(state.hero, a.equip.armor);
    (a.equip.acc || []).forEach(function (id) { if (id) G.addAcc(state.hero, id); });
    state.party.push(a);
    return a;
  }

  /* ===================== 共有の持ち物 =====================
   * 装備は1つのカバンをパーティで分け合う。
   * 同じ指輪を2人が同時に着けられてはいけないので、
   * 「持っている数」から「誰かが装備している数」を引いた残りで判定する。 */

  function members(state) { return state.party || [state.hero]; }

  function ownedCount(state, id, kind) {
    var bag = (state.hero && state.hero.bag) || { gear: [], acc: [] };
    var list = (kind === 'acc') ? bag.acc : bag.gear;
    return list.filter(function (x) { return x === id; }).length;
  }

  /** その id を今いくつ装備されているか。exceptSlot は「これから外す枠」。 */
  function equippedCount(state, id, kind, exceptMember, exceptSlot) {
    var n = 0;
    members(state).forEach(function (m) {
      if (!m.equip) return;
      if (kind === 'acc') {
        (m.equip.acc || []).forEach(function (x, i) {
          if (x !== id) return;
          if (m === exceptMember && i === exceptSlot) return;
          n++;
        });
      } else if (m.equip[kind] === id) {
        if (m === exceptMember && exceptSlot === kind) return;
        n++;
      }
    });
    return n;
  }

  /** その人が今その id を装備できるか（残りの数） */
  function freeCount(state, id, kind, exceptMember, exceptSlot) {
    return ownedCount(state, id, kind) - equippedCount(state, id, kind, exceptMember, exceptSlot);
  }

  /** 仲間は主人公と同じレベルで戦う（置いていかれないように） */
  function syncAllies(state) {
    if (!state.party) return;
    state.party.forEach(function (m) {
      if (!m.isAlly) return;
      if (m.level < state.hero.level) {
        var beforeMax = G.Stats.compute(m).S.maxHp;
        m.level = state.hero.level;
        var S = G.Stats.compute(m).S;
        m.hp = Math.min(S.maxHp, m.hp + (S.maxHp - beforeMax));
        m.mp = Math.min(S.maxMp, m.mp);
        if (m.hp <= 0) m.hp = 0;
      }
    });
  }

  /** 全員を割合回復する（戦闘不能の仲間も少しだけ戻る） */
  function healParty(state, pct, mpPct) {
    (state.party || [state.hero]).forEach(function (m) {
      var S = G.Stats.compute(m).S;
      if (m.hp <= 0) m.hp = Math.max(1, Math.round(S.maxHp * 0.3));
      m.hp = Math.min(S.maxHp, m.hp + Math.round(S.maxHp * pct));
      m.mp = Math.min(S.maxMp, m.mp + Math.round(S.maxMp * (mpPct == null ? pct : mpPct)));
    });
  }

  function newRun(state, classId, name) {
    state.hero = newHero(classId, name);
    state.party = [state.hero];
    state.run = {
      floor: 1, nodes: [], current: null, active: true, cleared: 0,
      /* 戦い方の記録は run ではなく各メンバーが持つ（誰がどう戦ったかを分けるため） */
      stats: { kills: 0, crits: 0, itemsUsed: 0, reflectKills: 0, aoeKills: 0, elites: 0, bosses: 0,
               classChanges: 0, statusApplied: 0, evades: 0 },
      notifiedClasses: {}, shop: null, pendingRewards: null
    };
    state.meta.runs++;
    generateNodes(state);
    return state;
  }

  /* ===================== ノード ===================== */
  function isBossFloor(f) { return f % 5 === 0; }

  function generateNodes(state) {
    var f = state.run.floor;
    if (isBossFloor(f)) {
      state.run.nodes = [{ kind: 'boss', name: '階層の主', icon: '👑', desc: 'この階層の支配者との決戦。豊富な報酬。' }];
      return;
    }
    var pool = [
      { kind: 'battle', name: '魔物の群れ', icon: '⚔', desc: '通常戦闘。経験値とゴールド。', w: 30 },
      { kind: 'elite', name: '精鋭の巣', icon: '💀', desc: '強敵。レジェンド装備の期待大。', w: f >= 4 ? 15 : 0 },
      { kind: 'treasure', name: '宝物庫', icon: '🎁', desc: '装備かアイテムを獲得。', w: 14 },
      { kind: 'shop', name: '行商人', icon: '🏪', desc: '装備・アイテムを購入できる。', w: 12 },
      { kind: 'rest', name: '焚き火', icon: '🔥', desc: 'HP/MP回復、または経験値の獲得。', w: 17 },
      { kind: 'altar', name: '転職の祭壇', icon: '⛩', desc: 'ビルド条件を満たす職業に転職できる。', w: 12 },
      { kind: 'event', name: '奇妙な出会い', icon: '❓', desc: '何が起きるかは分からない。', w: 12 }
    ];
    var picked = [], guard = 0;
    while (picked.length < 3 && guard++ < 60) {
      var p = U.weighted(pool);
      if (picked.some(function (x) { return x.kind === p.kind; })) continue;
      picked.push({ kind: p.kind, name: p.name, icon: p.icon, desc: p.desc });
    }
    state.run.nodes = picked;
  }

  /* ===================== 遭遇生成 ===================== */
  function enemyPool(floor, tierBias) {
    var t = floor <= 5 ? 1 : (floor <= 12 ? 2 : 3);
    t = Math.min(3, t + (tierBias || 0));
    var list = G.MOBS.filter(function (e) { return e.tier === t; });
    return list.length ? list : G.MOBS;
  }

  function makeEncounter(state, kind) {
    var f = state.run.floor, units = [], i;
    if (kind === 'boss') {
      var bossList = G.BOSSES.filter(function (b) { return b.tier <= (f <= 5 ? 1 : (f <= 12 ? 2 : 3)); });
      var idx = Math.floor((f / 5) - 1);
      var boss = bossList[Math.min(idx, bossList.length - 1)] || U.pick(G.BOSSES);
      if (f >= 25) boss = G.ENEMY_BY_ID.b_worldmirror;
      units.push(G.Battle.makeEnemyUnit(boss, f, 0));
      var addN = (f >= 8 ? 2 : 1) + G.Diff.get().adds;
      for (i = 0; i < addN; i++) units.push(G.Battle.makeEnemyUnit(U.pick(enemyPool(f)), Math.max(1, f - 2), i + 1));
      return { units: units, isBoss: true };
    }
    var pool = enemyPool(f, (kind === 'elite' && f >= 6) ? 1 : 0);
    var n;
    if (f <= 3) n = U.rint(2, 3);
    else if (f <= 9) n = U.rint(3, 4);
    else n = U.rint(3, 5);
    if (kind === 'elite') n = Math.max(2, n - 1);
    n += (f >= 4 ? G.Diff.get().mobPlus : 0);
    for (i = 0; i < n; i++) {
      var e = G.Battle.makeEnemyUnit(U.pick(pool), kind === 'elite' ? f + 1 : f, i);
      if (kind === 'elite') {
        e.base.maxHp = Math.round(e.base.maxHp * 1.45);
        e.base.atk = Math.round(e.base.atk * 1.15); e.base.mag = Math.round(e.base.mag * 1.15);
        G.Battle.refresh(e); e.hp = e.S.maxHp; e.name = '精鋭' + e.name;
      }
      units.push(e);
    }
    return { units: units, isBoss: false };
  }

  /* ===================== 報酬 ===================== */
  function rollGear(floor, luckyRarity) {
    var tier = floor <= 4 ? 1 : (floor <= 11 ? 2 : 3);
    var pool = G.WEAPONS.concat(G.ARMORS).filter(function (g) {
      if (luckyRarity === 'legend') return g.rarity === 'legend';
      return g.tier <= tier;
    });
    if (!pool.length) pool = G.WEAPONS;
    return U.pick(pool);
  }

  function rollAcc(floor, dropUp, forceLegend) {
    var legendChance = U.clamp(0.06 + floor * 0.018 + (dropUp || 0) * 0.5 +
                                G.Diff.get().drop * 0.6, 0, 0.6);
    if (forceLegend || U.chance(legendChance)) return U.pick(G.LEGENDS);
    var pool = G.NORMALS.filter(function (a) { return a.tier <= (floor <= 6 ? 1 : (floor <= 12 ? 2 : 3)); });
    return U.pick(pool.length ? pool : G.NORMALS);
  }

  /** 通常アイテムの抽選。深いほど上位ティアが出やすくなる。 */
  function rollItem(floor) {
    var tier = floor <= 5 ? 1 : (floor <= 12 ? 2 : 3);
    var pool = (G.COMMON_ITEMS || G.ITEMS).filter(function (i) { return i.tier <= tier; });
    if (!pool.length) pool = G.COMMON_ITEMS || G.ITEMS;
    /* ティアが高いほど重くする。そうしないと薬草ばかりになる。 */
    var weighted = pool.map(function (i) {
      return { ref: i, w: 1 + (tier - i.tier === 0 ? 2 : (tier - i.tier === 1 ? 0.8 : 0)) };
    });
    return U.weighted(weighted).ref;
  }

  /** レアアイテムの抽選。深いほど上位ティアまで出る。 */
  function rollRareItem(floor) {
    var pool = (G.RARE_ITEMS || []).filter(function (i) {
      return i.tier <= (floor <= 8 ? 2 : 3);
    });
    if (!pool.length) pool = G.RARE_ITEMS || [];
    return pool.length ? U.pick(pool) : null;
  }

  /** レアアイテムが出る確率。塔（登るほど濃い）が主な入手源。 */
  function rareItemChance(state, kind) {
    var f = state.run.floor;
    var base = { boss: 0.85, elite: 0.35, treasure: 0.40, battle: 0.06 }[kind] || 0.06;
    var deep = Math.min(0.25, Math.max(0, f - 3) * 0.012);
    var dropUp = (G.Stats.compute(state.hero).S.dropUp || 0) * 0.3;
    /* 物語モードは塔より控えめ。レアを集めるなら塔、という差を残す。 */
    var modeMult = (state.mode === 'story') ? 0.35 : 1;
    return U.clamp((base + deep + dropUp + G.Diff.get().drop) * modeMult, 0, 0.95);
  }

  /** 3択の報酬（ビルドを狙って伸ばすための選択肢） */
  /* 報酬の3択。
   *
   * ただ抽選すると、母数の多い軸（属性）ばかりが並び、
   * 支援や弱体のアクセはほとんど見ないまま冒険が終わる。
   * 実測では自分の軸が3択に入る確率が、属性70%に対してアイテム12%だった。
   * 「良いものが出る」ことと「ビルドが偏らない」ことを両立させるため、
   * 3つの軸を意図的に散らす:
   *   1つ目 … 今のビルドの主軸（深める選択肢。必ず使えるものが出る）
   *   2つ目 … まだ薄い軸（乗り換える選択肢。ここが無いと一本道になる）
   *   3つ目 … 残りからランダム（意外性）
   * 主軸がまだ無い序盤は、3つとも別の軸からランダムに選ぶ。 */
  function makeChoices(state, kind) {
    var f = state.run.floor, S = G.Stats.compute(state.hero).S;
    var out = [], used = {}, usedAxis = {};
    function push(o) {
      if (!o || used[o.id]) return false;
      used[o.id] = true;
      var ax = G.Style.topAxis(o);
      if (ax) usedAxis[ax] = true;
      out.push({ type: 'acc', ref: o });
      return true;
    }
    var legendsLeft = kind === 'boss' ? 2
      : (kind === 'elite' ? 1 : (U.chance(0.35 + (S.dropUp || 0) * 0.4) ? 1 : 0));
    var tier = f <= 6 ? 1 : (f <= 12 ? 2 : 3);

    /* その軸で、今の階層に見合うアクセを1つ引く */
    function drawFor(axis) {
      var wantLegend = legendsLeft > 0;
      var pool = (wantLegend ? G.LEGENDS : G.NORMALS).filter(function (a) {
        return !used[a.id] && G.Style.topAxis(a) === axis && (wantLegend || a.tier <= tier);
      });
      /* レジェンドに該当が無ければ通常から、通常に無ければレジェンドから */
      if (!pool.length) {
        pool = (wantLegend ? G.NORMALS.filter(function (a) { return a.tier <= tier; }) : G.LEGENDS)
          .filter(function (a) { return !used[a.id] && G.Style.topAxis(a) === axis; });
        wantLegend = !wantLegend;
      }
      if (!pool.length) return false;
      var got = U.pick(pool);
      if (got.rarity === 'legend') legendsLeft--;
      return push(got);
    }

    /* 今の軸の順位。装備しているものと、実際の戦い方の両方を見る。 */
    var acc = G.Style.accShares(state.hero);
    var rec = G.Style.behaviourOf(state.hero);
    var rank = G.Style.AXIS_IDS.map(function (a) {
      return { a: a, v: (acc.score[a] || 0) + (rec[a] || 0) * 4 };
    }).sort(function (x, y) { return y.v - x.v; });
    /* 初期装備の幸運のコイン（会心率+5%）だけで「会心ビルド」と見なされると、
     * 最初の報酬から会心へ誘導してしまう。はっきり寄せていると言える量に達するまでは
     * 主軸なしとして扱い、3つとも別々の軸から選ぶ。 */
    var hot = rank[0].v >= 30 ? rank[0].a : null;
    var cold = rank.filter(function (x) { return x.v <= rank[0].v * 0.25; }).map(function (x) { return x.a; });
    if (!cold.length) cold = rank.slice(-4).map(function (x) { return x.a; });

    if (hot) drawFor(hot);
    var coldPick = cold.filter(function (a) { return !usedAxis[a]; });
    if (coldPick.length) drawFor(U.pick(coldPick));

    /* 残りは、まだ出ていない軸からランダムに */
    var guard = 0;
    while (out.length < 3 && guard++ < 40) {
      var rest = G.Style.AXIS_IDS.filter(function (a) { return !usedAxis[a]; });
      if (!rest.length) break;
      drawFor(U.pick(rest));
    }
    /* それでも埋まらなければ従来どおり抽選で埋める */
    guard = 0;
    while (out.length < 3 && guard++ < 60) push(rollAcc(f, S.dropUp || 0, legendsLeft-- > 0));
    return out;
  }

  /** 勝利報酬を計算して付与し、表示用データを返す */
  function grantVictory(state, battle, kind) {
    var hero = state.hero;
    var S = G.Stats.compute(hero).S;
    var exp = 0, gold = 0;
    battle.enemies.forEach(function (e) { exp += e.exp; gold += e.gold; });
    exp = Math.round(exp * 2.6);
    gold = Math.round(gold * (1 + (S.goldUp || 0)));
    if (kind === 'elite') { exp = Math.round(exp * 1.3); gold = Math.round(gold * 1.4); }
    if (kind === 'boss') { exp = Math.round(exp * 1.6); gold = Math.round(gold * 1.8); }

    hero.exp += exp; hero.gold += gold;
    /* 勝利の余韻: 最大HPの8%を回復 */
    var Sv = G.Stats.compute(hero).S;
    hero.hp = Math.min(Sv.maxHp, hero.hp + Math.round(Sv.maxHp * 0.15));
    var levels = applyLevelUps(state);

    var drops = [];
    var dropUp = S.dropUp || 0;
    var accChance = (kind === 'boss' ? 1.0 : kind === 'elite' ? 0.75 : 0.28) + dropUp * 0.4;
    if (U.chance(accChance)) {
      var a = rollAcc(state.run.floor, dropUp, kind === 'boss' && U.chance(0.55));
      G.addAcc(hero, a.id); drops.push({ type: 'acc', ref: a });
    }
    var gearChance = (kind === 'boss' ? 0.85 : kind === 'elite' ? 0.5 : 0.18) + dropUp * 0.3;
    if (U.chance(gearChance)) {
      var g = rollGear(state.run.floor, kind === 'boss' && U.chance(0.4) ? 'legend' : null);
      G.addGear(hero, g.id); drops.push({ type: 'gear', ref: g });
    }
    var nItems = kind === 'boss' ? 3 : (kind === 'elite' ? 2 : (U.chance(0.45 + dropUp) ? 2 : 1));
    for (var i = 0; i < nItems; i++) {
      var it = rollItem(state.run.floor);
      G.addItem(hero, it.id, 1); drops.push({ type: 'item', ref: it });
    }
    /* レアアイテム枠。ボスはほぼ確定、精鋭でもそれなりに出る。 */
    if (U.chance(rareItemChance(state, kind))) {
      var ri = rollRareItem(state.run.floor);
      if (ri) { G.addItem(hero, ri.id, 1); drops.push({ type: 'item', ref: ri, rare: true }); }
    }
    if (kind === 'elite') { state.run.stats.elites++; hero.sp = (hero.sp || 0) + 1; }
    if (kind === 'boss') { state.run.stats.bosses++; hero.sp = (hero.sp || 0) + 2; }

    var choices = (kind === 'elite' || kind === 'boss') ? makeChoices(state, kind) : null;
    /* その職業での実戦経験＝習熟度。仲間もそれぞれの職業で積む。 */
    var mGain = kind === 'boss' ? 3 : (kind === 'elite' ? 2 : 1);
    members(state).forEach(function (m) { G.Mastery.gain(m, m.classId, mGain); });
    /* SPは全員に同じだけ配る。仲間だけ育たない状況を作らない。 */
    var spGain = levels + (kind === 'boss' ? 2 : (kind === 'elite' ? 1 : 0));
    members(state).forEach(function (m) {
      if (m !== hero) m.sp = (m.sp || 0) + (kind === 'boss' ? 2 : (kind === 'elite' ? 1 : 0));
    });
    return { exp: exp, gold: gold, levels: levels, drops: drops, choices: choices,
             sp: spGain, mastery: mGain, masteryTotal: G.Mastery.wins(hero, hero.classId) };
  }

  function applyLevelUps(state) {
    var hero = state.hero, gained = 0;
    while (hero.exp >= G.Stats.expToNext(hero.level)) {
      hero.exp -= G.Stats.expToNext(hero.level);
      hero.level++; gained++;
    }
    if (gained) {
      hero.sp = (hero.sp || 0) + gained;   /* レベルアップ1回につき1SP */
      var S = G.Stats.compute(hero).S;
      hero.hp = Math.min(S.maxHp, hero.hp + Math.round(S.maxHp * 0.5 * gained));
      hero.mp = Math.min(S.maxMp, hero.mp + Math.round(S.maxMp * 0.5 * gained));
      syncAllies(state);
      members(state).forEach(function (m) {
        if (m !== hero) m.sp = (m.sp || 0) + gained;
      });
    }
    return gained;
  }

  /* ===================== ミシック / 職業チェック ===================== */
  function checkMythicUnlocks(state, battleRec, when) {
    var found = G.Unlock.checkMythics(state, battleRec, when);
    found.forEach(function (my) {
      state.meta.mythics.push(my.id);
      G.addAcc(state.hero, my.id);
      G.Save.saveMeta(state);
    });
    return found;
  }

  /** 新たに転職可能になった上級/最上級職を返す（通知用に一度だけ）
   * 仲間もそれぞれの戦い方で解放されるので、全員ぶん見る。 */
  function checkClassUnlocks(state) {
    var out = [];
    members(state).forEach(function (m) {
      G.Unlock.availableClasses(state, m).forEach(function (r) {
        if (r.cls.tier === 1 || !r.ok) return;
        var key = (m.allyId || 'hero') + ':' + r.cls.id;
        if (state.run.notifiedClasses[key]) return;
        state.run.notifiedClasses[key] = true;
        if (state.meta.classesSeen.indexOf(r.cls.id) < 0) {
          state.meta.classesSeen.push(r.cls.id); G.Save.saveMeta(state);
        }
        out.push({ cls: r.cls, who: m });
      });
    });
    return out;
  }

  /* ===================== 店 ===================== */
  function makeShop(state) {
    var f = state.run.floor;
    var stock = [];
    var i;
    for (i = 0; i < 4; i++) {
      var a = rollAcc(f, 0.1, U.chance(0.22));
      stock.push({ type: 'acc', id: a.id, price: Math.round((a.price || 200) * U.rf(0.9, 1.15)) });
    }
    for (i = 0; i < 2; i++) {
      var g = rollGear(f, U.chance(0.15) ? 'legend' : null);
      stock.push({ type: 'gear', id: g.id, price: Math.round((g.price || 200) * U.rf(0.9, 1.15)) });
    }
    /* 同じ品が並ぶと選ぶ楽しみが減るので、重複は引き直す */
    for (i = 0; i < 4; i++) {
      var it = null;
      for (var tryN = 0; tryN < 8; tryN++) {
        it = rollItem(f);
        if (!stock.some(function (x) { return x.id === it.id; })) break;
      }
      stock.push({ type: 'item', id: it.id, price: Math.round(it.price * U.rf(0.9, 1.1)) });
    }
    /* レアアイテムの特別枠。序盤は1つ、深く進むと2つ並ぶ。 */
    var rareSlots = f >= 10 ? 2 : 1;
    for (i = 0; i < rareSlots; i++) {
      var ri = rollRareItem(f);
      if (!ri) break;
      if (stock.some(function (x) { return x.id === ri.id; })) continue;
      stock.push({ type: 'item', id: ri.id, price: Math.round(ri.price * U.rf(0.95, 1.15)), rare: true });
    }
    /* 発見済みミシックの再入荷（高額） */
    var owned = state.hero.bag.acc;
    var missing = state.meta.mythics.filter(function (id) { return owned.indexOf(id) < 0; });
    if (missing.length && f >= 6) {
      var mid = U.pick(missing);
      stock.push({ type: 'acc', id: mid, price: 1500 + f * 60, mythic: true });
    }
    return { stock: stock, rerolls: 0 };
  }

  /* ===================== 焚き火・イベント ===================== */
  function rest(state, mode) {
    if (mode === 'heal') {
      healParty(state, 0.6);
      return 'パーティ全員のHPとMPを最大値の60%回復した。';
    }
    if (mode === 'full') { healParty(state, 1); return 'パーティ全員のHPとMPが全回復した。'; }
    return '';
  }

  var EVENTS = [
    { id: 'ev_shrine', name: '古びた祠', text: '祠に祈りを捧げると、体の奥から力が湧いてきた。',
      opts: [
        { label: '祈る（HP/MP全回復）', run: function (s) { rest(s, 'full'); return 'HP/MPが全回復した。'; } },
        { label: '供物を捧げる（100G→ランダムなアクセ）', cost: 100, run: function (s) {
            var a = rollAcc(s.run.floor, 0.3, U.chance(0.3)); G.addAcc(s.hero, a.id);
            return '〈' + a.name + '〉を授かった。'; } }
      ] },
    { id: 'ev_merchant', name: '怪しい薬売り', text: '「良い品があるよ。試してみるかい？」',
      opts: [
        { label: '買う（80G→アイテム3個）', cost: 80, run: function (s) {
            var names = [];
            for (var i = 0; i < 3; i++) { var it = rollItem(s.run.floor); G.addItem(s.hero, it.id, 1); names.push(it.name); }
            return names.join('・') + ' を手に入れた。'; } },
        { label: '立ち去る', run: function () { return '何も起こらなかった。'; } }
      ] },
    { id: 'ev_forge', name: '無人の鍛冶場', text: '炉にはまだ火が残っている。装備を打ち直せそうだ。',
      opts: [
        { label: '武器を鍛える（150G→武器を1つ獲得）', cost: 150, run: function (s) {
            var g = U.pick(G.WEAPONS.filter(function (w) { return w.tier <= (s.run.floor <= 10 ? 2 : 3); }));
            G.addGear(s.hero, g.id); return '〈' + g.name + '〉を鍛え上げた。'; } },
        { label: '防具を鍛える（150G→防具を1つ獲得）', cost: 150, run: function (s) {
            var g = U.pick(G.ARMORS.filter(function (w) { return w.tier <= (s.run.floor <= 10 ? 2 : 3); }));
            G.addGear(s.hero, g.id); return '〈' + g.name + '〉を鍛え上げた。'; } },
        { label: '素通りする', run: function () { return '鍛冶場を後にした。'; } }
      ] },
    { id: 'ev_gamble', name: '賭博師の招き', text: '「運を試さないか。倍か無か、だ」',
      opts: [
        { label: '賭ける（所持金の30%）', run: function (s) {
            var bet = Math.round(s.hero.gold * 0.3);
            if (U.chance(0.5)) { s.hero.gold += bet; return bet + 'G の勝ち！'; }
            s.hero.gold -= bet; return bet + 'G を失った……'; } },
        { label: '断る', run: function () { return '賢明な判断だ。'; } }
      ] },
    { id: 'ev_mirror', name: '曇った鏡', text: '鏡に映る自分が、こちらを見てにやりと笑った。',
      opts: [
        { label: '鏡に触れる（戦闘：鏡像との戦い）', battle: 'mirror', run: function () { return ''; } },
        { label: '無視する', run: function () { return '鏡は静かに砕けた。'; } }
      ] },
    { id: 'ev_scholar', name: '放浪の学者', text: '「面白いビルドだね。少し知恵を貸そうか」',
      opts: [
        { label: '教えを乞う（経験値を獲得）', run: function (s) {
            var e = Math.round(G.Stats.expToNext(s.hero.level) * 0.6);
            s.hero.exp += e; var lv = applyLevelUps(s);
            return e + ' の経験値を得た。' + (lv ? ' レベルが ' + lv + ' 上がった！' : ''); } },
        { label: '路銀を分けてもらう（200G）', run: function (s) { s.hero.gold += 200; return '200G を受け取った。'; } }
      ] }
  ];

  function randomEvent() { return U.pick(EVENTS); }

  /* ===================== 階層進行 ===================== */
  function nextFloor(state) {
    state.run.floor++;
    state.run.cleared++;
    if (state.run.floor > state.meta.bestFloor) { state.meta.bestFloor = state.run.floor; G.Save.saveMeta(state); }
    generateNodes(state);
  }

  return {
    makeChoices: makeChoices, newHero: newHero, newRun: newRun, generateNodes: generateNodes, isBossFloor: isBossFloor,
    makeAlly: makeAlly, joinAlly: joinAlly, syncAllies: syncAllies, healParty: healParty,
    members: members, ownedCount: ownedCount, equippedCount: equippedCount, freeCount: freeCount,
    makeEncounter: makeEncounter, grantVictory: grantVictory, applyLevelUps: applyLevelUps,
    checkMythicUnlocks: checkMythicUnlocks, checkClassUnlocks: checkClassUnlocks,
    makeShop: makeShop, rest: rest, randomEvent: randomEvent, nextFloor: nextFloor,
    rollAcc: rollAcc, rollGear: rollGear, rollItem: rollItem,
    rollRareItem: rollRareItem, rareItemChance: rareItemChance, EVENTS: EVENTS
  };
})();
