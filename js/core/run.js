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
      hp: 1, mp: 1, gold: 120,
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

  function newRun(state, classId, name) {
    state.hero = newHero(classId, name);
    state.run = {
      floor: 1, nodes: [], current: null, active: true, cleared: 0,
      stats: { kills: 0, crits: 0, itemsUsed: 0, reflectKills: 0, aoeKills: 0, elites: 0, bosses: 0, classChanges: 0 },
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
      var addN = f >= 10 ? 2 : 1;
      for (i = 0; i < addN; i++) units.push(G.Battle.makeEnemyUnit(U.pick(enemyPool(f)), Math.max(1, f - 2), i + 1));
      return { units: units, isBoss: true };
    }
    var pool = enemyPool(f, (kind === 'elite' && f >= 6) ? 1 : 0);
    var n;
    if (f <= 3) n = U.rint(2, 3);
    else if (f <= 9) n = U.rint(2, 4);
    else n = U.rint(3, 4);
    if (kind === 'elite') n = Math.max(2, n - 1);
    for (i = 0; i < n; i++) {
      var e = G.Battle.makeEnemyUnit(U.pick(pool), kind === 'elite' ? f + 1 : f, i);
      if (kind === 'elite') { e.base.maxHp = Math.round(e.base.maxHp * 1.35); G.Battle.refresh(e); e.hp = e.S.maxHp; e.name = '精鋭' + e.name; }
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
    var legendChance = U.clamp(0.06 + floor * 0.018 + (dropUp || 0) * 0.5, 0, 0.6);
    if (forceLegend || U.chance(legendChance)) return U.pick(G.LEGENDS);
    var pool = G.NORMALS.filter(function (a) { return a.tier <= (floor <= 6 ? 1 : (floor <= 12 ? 2 : 3)); });
    return U.pick(pool.length ? pool : G.NORMALS);
  }

  function rollItem(floor) {
    var tier = floor <= 5 ? 1 : (floor <= 12 ? 2 : 3);
    var pool = G.ITEMS.filter(function (i) { return i.tier <= tier; });
    return U.pick(pool);
  }

  /** 3択の報酬（ビルドを狙って伸ばすための選択肢） */
  function makeChoices(state, kind) {
    var f = state.run.floor, S = G.Stats.compute(state.hero).S;
    var out = [], used = {};
    function push(o) { if (o && !used[o.id]) { used[o.id] = true; out.push({ type: 'acc', ref: o }); } }
    var legends = kind === 'boss' ? 2 : (kind === 'elite' ? 1 : (U.chance(0.35 + (S.dropUp || 0) * 0.4) ? 1 : 0));
    var guard = 0;
    while (out.length < legends && guard++ < 40) push(U.pick(G.LEGENDS));
    guard = 0;
    while (out.length < 3 && guard++ < 60) push(rollAcc(f, S.dropUp || 0, false));
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
    if (kind === 'elite') state.run.stats.elites++;
    if (kind === 'boss') state.run.stats.bosses++;

    var choices = (kind === 'elite' || kind === 'boss') ? makeChoices(state, kind) : null;
    return { exp: exp, gold: gold, levels: levels, drops: drops, choices: choices };
  }

  function applyLevelUps(state) {
    var hero = state.hero, gained = 0;
    while (hero.exp >= G.Stats.expToNext(hero.level)) {
      hero.exp -= G.Stats.expToNext(hero.level);
      hero.level++; gained++;
    }
    if (gained) {
      var S = G.Stats.compute(hero).S;
      hero.hp = Math.min(S.maxHp, hero.hp + Math.round(S.maxHp * 0.5 * gained));
      hero.mp = Math.min(S.maxMp, hero.mp + Math.round(S.maxMp * 0.5 * gained));
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

  /** 新たに転職可能になった上級/最上級職を返す（通知用に一度だけ） */
  function checkClassUnlocks(state) {
    var out = [];
    G.Unlock.availableClasses(state).forEach(function (r) {
      if (r.cls.tier === 1 || !r.ok) return;
      if (state.run.notifiedClasses[r.cls.id]) return;
      state.run.notifiedClasses[r.cls.id] = true;
      if (state.meta.classesSeen.indexOf(r.cls.id) < 0) { state.meta.classesSeen.push(r.cls.id); G.Save.saveMeta(state); }
      out.push(r.cls);
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
    for (i = 0; i < 4; i++) {
      var it = rollItem(f);
      stock.push({ type: 'item', id: it.id, price: Math.round(it.price * U.rf(0.9, 1.1)) });
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
    var hero = state.hero, S = G.Stats.compute(hero).S;
    if (mode === 'heal') {
      hero.hp = Math.min(S.maxHp, hero.hp + Math.round(S.maxHp * 0.6));
      hero.mp = Math.min(S.maxMp, hero.mp + Math.round(S.maxMp * 0.6));
      return 'HPとMPを最大値の60%回復した。';
    }
    if (mode === 'full') { hero.hp = S.maxHp; hero.mp = S.maxMp; return 'HPとMPが全回復した。'; }
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
    makeEncounter: makeEncounter, grantVictory: grantVictory, applyLevelUps: applyLevelUps,
    checkMythicUnlocks: checkMythicUnlocks, checkClassUnlocks: checkClassUnlocks,
    makeShop: makeShop, rest: rest, randomEvent: randomEvent, nextFloor: nextFloor,
    rollAcc: rollAcc, rollGear: rollGear, rollItem: rollItem, EVENTS: EVENTS
  };
})();
