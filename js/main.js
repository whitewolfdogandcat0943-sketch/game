/* main.js - ゲーム全体の状態管理と画面遷移 */
(function () {
  var U = G.U, S = G.Screens, UI = G.UI;

  var state = {
    hero: null, run: null, meta: G.Save.loadMeta(), battle: null,
    screen: 'title', targetIdx: 0, allyIdx: 0, battleTab: 'skill',
    nodeKind: null, rewardData: null, currentEvent: null
  };
  G.state = state;

  /* ===================== 画面遷移 ===================== */
  function go(screen) {
    state.screen = screen;
    draw();
  }

  function draw() {
    switch (state.screen) {
      case 'title': S.title(state, !!G.Save.loadRun()); break;
      case 'classSelect': S.classSelect(state); break;
      case 'map': S.map(state); break;
      case 'battle': S.battle(state); break;
      case 'reward': S.reward(state, state.rewardData); break;
      case 'shop': S.shop(state); break;
      case 'rest': S.rest(state); break;
      case 'altar': S.altar(state, false); break;
      case 'altarPreview': S.altar(state, true); break;
      case 'event': S.event(state, state.currentEvent, state.eventResult); break;
      default: S.title(state, !!G.Save.loadRun());
    }
  }

  /* ===================== ノード処理 ===================== */
  function enterNode(idx) {
    var node = state.run.nodes[idx];
    if (!node) return;
    state.nodeKind = node.kind;
    switch (node.kind) {
      case 'battle': case 'elite': case 'boss': startBattle(node.kind); break;
      case 'treasure': treasure(); break;
      case 'shop': state.run.shop = G.Run.makeShop(state); go('shop'); break;
      case 'rest': go('rest'); break;
      case 'altar': go('altar'); break;
      case 'event':
        state.currentEvent = G.Run.randomEvent(); state.eventResult = null; go('event'); break;
    }
    G.Save.saveRun(state);
  }

  function startBattle(kind) {
    var enc = G.Run.makeEncounter(state, kind);
    state.targetIdx = 0;
    state.allyIdx = 0;
    state.battleTab = 'skill';
    state.battle = G.Battle.start(state, enc.units, { isBoss: enc.isBoss });
    go('battle');
  }

  function treasure() {
    var hero = state.hero, f = state.run.floor;
    var Sx = G.Stats.compute(hero).S;
    var got = [];
    var a = G.Run.rollAcc(f, (Sx.dropUp || 0) + 0.2, U.chance(0.25 + (Sx.dropUp || 0) * 0.3));
    G.addAcc(hero, a.id); got.push({ type: 'acc', ref: a });
    if (U.chance(0.5 + (Sx.dropUp || 0))) {
      var g = G.Run.rollGear(f); G.addGear(hero, g.id); got.push({ type: 'gear', ref: g });
    }
    var n = U.rint(1, 2);
    for (var i = 0; i < n; i++) { var it = G.Run.rollItem(f); G.addItem(hero, it.id, 1); got.push({ type: 'item', ref: it }); }
    var gold = Math.round((40 + f * 22) * (1 + (Sx.goldUp || 0)) * U.rf(0.8, 1.3));
    hero.gold += gold;

    state.rewardData = { win: true, exp: 0, gold: gold, levels: 0, drops: got, mythics: [], classes: [],
                         treasure: true, choices: G.Run.makeChoices(state, 'treasure') };
    go('reward');
  }

  /* ===================== 戦闘終了処理 ===================== */
  function finishBattle() {
    var b = state.battle;
    G.Battle.syncParty(b);

    if (b.result === 'win') {
      var r = G.Run.grantVictory(state, b, state.nodeKind);
      var mys = G.Run.checkMythicUnlocks(state, b.rec, 'battleEnd');
      var cls = G.Run.checkClassUnlocks(state);
      /* 職業ツリーの段が新たに解放されたら知らせる */
      if (r.masteryTotal != null) {
        var before = r.masteryTotal - (r.mastery || 0);
        G.Mastery.NEED.forEach(function (need, i) {
          if (need > before && need <= r.masteryTotal) {
            UI.toast('⚔ ' + G.CLASSES[state.hero.classId].name + ' の職業ツリー 第' + (i + 1) + '段が解放された。', 'class');
          }
        });
      }
      mys.forEach(function (m) { UI.toast('✦ ミシック発見: <b>' + m.name + '</b><br>' + m.cond.label, 'mythic'); });
      cls.forEach(function (c) { UI.toast('☆ 転職条件達成: <b>' + c.name + '</b>（' + (c.tier === 3 ? '最上級職' : '上級職') + '）', 'class'); });
      var cleared = (state.nodeKind === 'boss' && state.run.floor >= 25 && !state.run.clearedGame);
      if (cleared) {
        state.run.clearedGame = true;
        state.meta.wins++;
        G.Save.saveMeta(state);
      }
      state.rewardData = { win: true, exp: r.exp, gold: r.gold, levels: r.levels, drops: r.drops,
                           mythics: mys, classes: cls, choices: r.choices, cleared: cleared };
      state.battle = null;
      G.Save.saveRun(state);
      go('reward');
    } else {
      state.meta.deaths++;
      G.Save.saveMeta(state);
      G.Save.clearRun();
      state.run.active = false;
      state.rewardData = { win: false };
      state.battle = null;
      go('reward');
    }
  }

  /** 報酬確認後 → 次の階層へ */
  function afterReward() {
    if (state.nodeKind === 'boss') {
      UI.toast('👑 階層の主を撃破した！', 'legend');
    }
    nextFloor();
  }

  function nextFloor() {
    G.Run.nextFloor(state);
    /* 塔を登るにつれ、同じ目的を持つ者が合流する */
    var TOWER_JOIN = { 1: 2, 2: 4, 3: 7 };
    (G.ALLY_LIST || []).forEach(function (a) {
      if (state.run.floor < (TOWER_JOIN[a.join] || 99)) return;
      var joined = G.Run.joinAlly(state, a.id);
      if (joined) UI.toast('🤝 <b>' + a.name + '</b>（' + a.role + '）が仲間になった！', 'class');
    });
    var mys = G.Run.checkMythicUnlocks(state, null, 'progress');
    mys.forEach(function (m) {
      UI.toast('✦ ミシック発見: <b>' + m.name + '</b><br>' + m.cond.label, 'mythic');
    });
    G.Run.checkClassUnlocks(state).forEach(function (c) {
      UI.toast('☆ 転職条件達成: <b>' + c.name + '</b>', 'class');
    });
    G.Save.saveRun(state);
    go('map');
  }

  /* ===================== アクション ===================== */
  function act(cmd) {
    var p = cmd.split(':');
    var a = p[0];

    switch (a) {
      /* --- タイトル --- */
      case 'newgame': go('classSelect'); break;
      case 'continue': {
        var d = G.Save.loadRun();
        if (!d) { UI.toast('保存された冒険がありません。'); go('title'); break; }
        state.hero = d.hero; state.run = d.run;
        state.party = d.party || [state.hero];
        if (!state.run.stats) state.run.stats = {};
        ['kills', 'crits', 'itemsUsed', 'reflectKills', 'aoeKills', 'elites', 'bosses', 'classChanges',
         'statusApplied', 'evades']
          .forEach(function (k) { if (state.run.stats[k] == null) state.run.stats[k] = 0; });
        if (!state.run.stats.style) state.run.stats.style = G.Style.newRecord();
        go('map');
        break;
      }
      case 'toTitle': state.hero = null; state.run = null; state.party = null; state.battle = null; go('title'); break;
      case 'start': {
        var nameEl = document.getElementById('heroName');
        var nm = (nameEl && nameEl.value.trim()) || '冒険者';
        G.Run.newRun(state, p[1], nm.slice(0, 12));
        G.Save.saveMeta(state); G.Save.saveRun(state);
        go('map');
        break;
      }

      /* --- マップ --- */
      case 'node': enterNode(parseInt(p[1], 10)); break;
      case 'leaveNode': nextFloor(); break;
      case 'afterReward':
        if (state.rewardData && state.rewardData.treasure) nextFloor(); else afterReward();
        break;

      /* --- 戦闘 --- */
      case 'selectTarget': {
        var i = parseInt(p[1], 10);
        if (state.battle && state.battle.enemies[i] && state.battle.enemies[i].hp > 0) state.targetIdx = i;
        draw(); break;
      }
      case 'selectAlly': {
        var ai = parseInt(p[1], 10);
        if (state.battle && G.Battle.partyUnits(state.battle)[ai]) state.allyIdx = ai;
        draw(); break;
      }
      case 'tab': state.battleTab = p[1]; draw(); break;
      case 'skill': doAction({ type: 'skill', id: p[1] }); break;
      case 'useitem': doAction({ type: 'item', id: p[1] }); break;
      case 'battleEnd': finishBattle(); break;

      case 'choose': {
        var rd = state.rewardData;
        if (!rd || !rd.choices || rd.chosen) break;
        var ch = rd.choices[parseInt(p[1], 10)];
        if (!ch) break;
        G.addAcc(state.hero, ch.ref.id);
        rd.chosen = ch.ref;
        UI.toast('〈' + ch.ref.name + '〉を手に入れた。', ch.ref.rarity === 'legend' ? 'legend' : '');
        G.Save.saveRun(state);
        draw(); break;
      }

      /* --- 店 --- */
      case 'buy': {
        var idx = parseInt(p[1], 10), st = state.run.shop.stock[idx];
        if (!st || st.sold) break;
        if (state.hero.gold < st.price) { UI.toast('ゴールドが足りない。'); break; }
        state.hero.gold -= st.price;
        st.sold = true;
        if (st.type === 'item') G.addItem(state.hero, st.id, 1);
        else if (st.type === 'acc') G.addAcc(state.hero, st.id);
        else G.addGear(state.hero, st.id);
        var nm2 = (st.type === 'item' ? G.ITEM_BY_ID[st.id] : st.type === 'acc' ? G.ACC_BY_ID[st.id] : G.GEAR[st.id]).name;
        UI.toast('〈' + nm2 + '〉を購入した。');
        G.Save.saveRun(state);
        draw(); break;
      }

      /* --- 焚き火 --- */
      case 'rest': {
        if (p[1] === 'heal') { UI.toast(G.Run.rest(state, 'heal')); nextFloor(); }
        else if (p[1] === 'train') {
          var e = Math.round(G.Stats.expToNext(state.hero.level) * 0.7);
          state.hero.exp += e;
          var lv = G.Run.applyLevelUps(state);
          UI.toast('経験値 +' + e + (lv ? ' / レベルが' + lv + '上がった！' : ''));
          G.Run.checkClassUnlocks(state).forEach(function (c) { UI.toast('☆ 転職条件達成: <b>' + c.name + '</b>', 'class'); });
          nextFloor();
        } else if (p[1] === 'forge') { S.buildModal(state); }
        break;
      }

      /* --- 転職 --- */
      case 'changeClass': {
        var cid = p[1];
        var chk = G.Unlock.classCheck(cid, G.Unlock.ctx(state));
        if (!chk.ok) { UI.toast('条件を満たしていない。'); break; }
        if (state.hero.classHistory.indexOf(state.hero.classId) < 0) state.hero.classHistory.push(state.hero.classId);
        state.hero.classId = cid;
        state.run.stats.classChanges = (state.run.stats.classChanges || 0) + 1;
        if (state.meta.classesSeen.indexOf(cid) < 0) state.meta.classesSeen.push(cid);
        G.Save.saveMeta(state);
        var newS = G.Stats.compute(state.hero).S;
        state.hero.hp = Math.min(newS.maxHp, state.hero.hp + Math.round(newS.maxHp * 0.4));
        state.hero.mp = newS.maxMp;
        var c2 = G.CLASSES[cid];
        UI.toast('⛩ <b>' + c2.name + '</b> に転職した！' + (c2.tier === 3 ? '（最上級職）' : ''), c2.tier === 3 ? 'mythic' : 'class');
        G.Save.saveRun(state);
        draw(); break;
      }
      case 'altarPreview': go('altarPreview'); break;
      case 'closeOverlay': go('map'); break;

      /* --- イベント --- */
      case 'event': {
        var ev = state.currentEvent, opt = ev.opts[parseInt(p[1], 10)];
        if (opt.cost) {
          if (state.hero.gold < opt.cost) { UI.toast('ゴールドが足りない。'); break; }
          state.hero.gold -= opt.cost;
        }
        if (opt.battle) { state.nodeKind = 'elite'; startBattle('elite'); break; }
        state.eventResult = opt.run(state) || '……何も起こらなかった。';
        G.Save.saveRun(state);
        draw(); break;
      }

      /* --- ビルド操作 --- */
      case 'buildOpen': S.buildModal(state); break;
      case 'closeModal': UI.closeModal(); draw(); break;
      case 'pickAcc': S.accPicker(state, parseInt(p[1], 10)); break;
      case 'setAcc': {
        var slot = parseInt(p[1], 10), id = p[2];
        state.hero.equip.acc[slot] = (id === '-1') ? null : id;
        G.Save.saveRun(state);
        S.buildModal(state); refreshBattleStats(); draw(); break;
      }
      case 'pickGear': S.gearPicker(state, p[1]); break;
      case 'setGear': {
        var sl = p[1], gid = p[2];
        state.hero.equip[sl] = (gid === '-1') ? null : gid;
        G.Save.saveRun(state);
        S.buildModal(state); refreshBattleStats(); draw(); break;
      }
      case 'useOut': {
        var it = G.ITEM_BY_ID[p[1]];
        if (!it || !state.hero.items[p[1]]) break;
        var st2 = G.Stats.compute(state.hero).S;
        var scale = 1 + (st2.itemPower || 0), lvl = 1 + state.hero.level * 0.05;
        if (it.use.type === 'heal' || it.use.type === 'cleanse') {
          state.hero.hp = Math.min(st2.maxHp, state.hero.hp + Math.round(it.use.power * scale * lvl));
        } else if (it.use.type === 'mp') {
          state.hero.mp = Math.min(st2.maxMp, state.hero.mp + Math.round(it.use.power * scale));
        } else if (it.use.type === 'full') {
          state.hero.hp = st2.maxHp; state.hero.mp = st2.maxMp;
        }
        G.addItem(state.hero, p[1], -1);
        state.run.stats.itemsUsed++;
        UI.toast('〈' + it.name + '〉を使った。');
        G.Save.saveRun(state);
        S.buildModal(state); draw(); break;
      }

      /* --- スキルツリー --- */
      case 'treeOpen': S.skillTree(state); break;
      case 'treeTab': state.treeTab = p[1]; S.skillTree(state); break;
      case 'treeTake': {
        var chk = G.Tree.check(state.hero, p[1]);
        if (!chk.ok) { UI.toast('まだ取得できない。'); break; }
        state.hero.tree[p[1]] = true;
        state.hero.sp -= chk.node.cost;
        refreshBattleStats();
        UI.toast('🌿 <b>' + chk.node.name + '</b> を習得した。', 'class');
        G.Run.checkClassUnlocks(state).forEach(function (c) {
          UI.toast('☆ 転職条件達成: <b>' + c.name + '</b>', 'class');
        });
        G.Save.saveRun(state);
        S.skillTree(state); draw(); break;
      }
      case 'treeRespec': {
        var rc = G.Tree.respecCost(state.hero);
        if (rc <= 0) break;
        if (state.hero.gold < rc) { UI.toast('ゴールドが足りない。'); break; }
        state.hero.gold -= rc;
        state.hero.sp = (state.hero.sp || 0) + G.Tree.totalSpent(state.hero);
        state.hero.tree = {};
        refreshBattleStats();
        UI.toast('🌿 スキルポイントを振り直した。');
        G.Save.saveRun(state);
        S.skillTree(state); draw(); break;
      }

      case 'treeMode': state.treeMode = p[1]; S.skillTree(state); break;
      case 'classPick': {
        var tier = parseInt(p[1], 10);
        if (!G.Mastery.pick(state.hero, state.hero.classId, tier, p[2])) { UI.toast('まだ選べない。'); break; }
        var picked = G.CLASSTREE[state.hero.classId][tier - 1][p[2]];
        refreshBattleStats();
        UI.toast('⚔ <b>' + picked.name + '</b> の道を選んだ。', 'class');
        G.Run.checkClassUnlocks(state).forEach(function (c) {
          UI.toast('☆ 転職条件達成: <b>' + c.name + '</b>', 'class');
        });
        G.Save.saveRun(state);
        S.skillTree(state); draw(); break;
      }
      case 'classRespec': {
        var mc = G.Mastery.respecCost(state.hero);
        if (mc <= 0) break;
        if (state.hero.gold < mc) { UI.toast('ゴールドが足りない。'); break; }
        state.hero.gold -= mc;
        G.Mastery.reset(state.hero);
        refreshBattleStats();
        UI.toast('⚔ 職業ツリーを選び直した。');
        G.Save.saveRun(state);
        S.skillTree(state); draw(); break;
      }

      /* --- 情報 --- */
      case 'codex': S.codex(state); break;
      case 'help': S.help(); break;
    }
  }

  /** 装備変更後のステータス反映（最大値が下がった場合の現在値の丸め込みを含む） */
  function refreshBattleStats() {
    var S = G.Stats.compute(state.hero).S;
    state.hero.hp = Math.min(state.hero.hp, S.maxHp);
    state.hero.mp = Math.min(state.hero.mp, S.maxMp);
    if (state.battle && !state.battle.over) {
      var hu = state.battle.hero;
      hu.hp = Math.min(hu.hp, S.maxHp); hu.mp = Math.min(hu.mp, S.maxMp);
      G.Battle.refresh(hu);
      G.Battle.syncParty(state.battle);
    }
  }

  function doAction(a) {
    var b = state.battle;
    if (!b || b.over || !b.awaiting) return;
    a.target = { foe: state.targetIdx, ally: state.allyIdx };
    var ok = G.Battle.playerAction(b, a);
    if (!ok) { draw(); return; }
    /* 対象が倒れていたら生存個体へ */
    if (b.enemies[state.targetIdx] && b.enemies[state.targetIdx].hp <= 0) {
      var aliveIdx = -1;
      b.enemies.forEach(function (e, i) { if (e.hp > 0 && aliveIdx < 0) aliveIdx = i; });
      state.targetIdx = aliveIdx < 0 ? 0 : aliveIdx;
    }
    G.Battle.syncParty(b);
    draw();
  }

  /* ===================== 起動 ===================== */
  U.delegate(document.getElementById('app'), 'data-act', function (cmd) { act(cmd); });
  U.delegate(document.getElementById('app'), 'data-open', function (cmd) {
    if (!state.hero && cmd !== 'codex' && cmd !== 'help') { UI.toast('冒険を始めてください。'); return; }
    if (cmd === 'build') S.buildModal(state);
    if (cmd === 'tree') S.skillTree(state);
    if (cmd === 'codex') S.codex(state);
    if (cmd === 'help') S.help();
  });
  document.getElementById('modalClose').addEventListener('click', function () { UI.closeModal(); draw(); });
  document.getElementById('modal').addEventListener('click', function (e) {
    if (e.target.id === 'modal') { UI.closeModal(); draw(); }
  });

  G.act = act;
  go('title');
})();
