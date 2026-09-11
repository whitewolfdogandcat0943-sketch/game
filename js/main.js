/* main.js - ゲーム全体の状態管理と画面遷移 */
(function () {
  var U = G.U, S = G.Screens, UI = G.UI;

  var state = {
    hero: null, run: null, party: null, meta: G.Save.loadMeta(), battle: null,
    screen: 'title', targetIdx: 0, allyIdx: 0, battleTab: 'skill', buildIdx: 0,
    mode: 'tower', story: null, scene: null, diff: 'normal', field: null,
    nodeKind: null, rewardData: null, currentEvent: null
  };
  G.state = state;
  /* 前回選んだ難易度を初期値にする */
  state.diff = G.Diff.set(state.meta.diff || 'normal').id;

  /* ===================== 画面遷移 ===================== */
  function go(screen) {
    /* 歩く画面は毎フレーム動いているので、離れるときは必ず止める。
     * 止め忘れると、戦闘中も裏で町の人が歩き続けることになる。 */
    if (state.screen === 'field' && screen !== 'field' && G.FieldView) G.FieldView.stop();
    state.screen = screen;
    draw();
  }

  function draw() {
    switch (state.screen) {
      case 'title': S.modeSelect(state, !!G.Save.loadRun()); break;
      case 'classSelect': S.classSelect(state); break;
      case 'storyIntro': S.storyIntro(state); break;
      case 'scene': S.scene(state); break;
      case 'world': S.world(state); break;
      case 'town': S.town(state); break;
      case 'field': openField(); break;
      case 'dungeon': S.dungeon(state); break;
      case 'map': S.map(state); break;
      case 'battle': S.battle(state); break;
      case 'reward': S.reward(state, state.rewardData); break;
      case 'shop': S.shop(state); break;
      case 'rest': S.rest(state); break;
      case 'altar': S.altar(state, false); break;
      case 'altarPreview': S.altar(state, true); break;
      case 'event': S.event(state, state.currentEvent, state.eventResult); break;
      default: S.modeSelect(state, !!G.Save.loadRun());
    }
  }

  /** 店・祭壇などから元の画面へ戻る。物語モードなら町か地図へ。 */
  function backToField(stay) {
    if (state.mode !== 'story' || !state.story) {
      if (stay) go('map'); else nextFloor();
      return;
    }
    if (state.story.dungeon) { go('dungeon'); return; }
    /* 町を歩いている最中なら、立っていた場所に戻す。
     * 店から出るたびに入口へ飛ばされると、町が広く感じられない。 */
    if (state.field) { go('field'); return; }
    if (state.story.place && G.Story.place(state.story.place)) go('town');
    else go('world');
  }

  /* ===================== 物語モード ===================== */

  /** 会話を再生する。読み終えたら then を呼ぶ。 */
  function playScene(lines, opts) {
    opts = opts || {};
    state.scene = {
      lines: G.Story.fillLines(lines, state), i: 0,
      title: opts.title || '', endLabel: opts.endLabel || '進む', then: opts.then || null
    };
    go('scene');
  }

  function sceneDone() {
    var then = state.scene && state.scene.then;
    state.scene = null;
    if (typeof then === 'function') then();
    else go('world');
  }

  /** 章の頭の会話 → 地図へ */
  function chapterOpen() {
    var c = G.Story.chapter(state);
    if (!c) { go('world'); return; }
    if (state.story.phase !== 'open') { go('world'); return; }
    state.story.phase = 'field';
    G.Save.saveRun(state);
    playScene(c.open, { title: '第' + c.id + '章　' + c.title, endLabel: '旅を続ける',
                        then: function () { go('world'); } });
  }

  /** 章の目標を達成した → 仲間加入 → 章末会話 → 次章 */
  function chapterNext() {
    var c = G.Story.chapter(state);
    /* 通常はダンジョン踏破時に加入済み。取りこぼしがあればここで拾う。 */
    var joined = G.Story.joinForChapter(state);
    if (joined) UI.toast('🤝 <b>' + joined.name + '</b>（' + joined.role + '）が仲間になった！', 'class');
    playScene(c.close, { title: '第' + c.id + '章　' + c.title, endLabel: '次の章へ', then: function () {
      var nx = G.Story.nextChapter(state);
      G.Save.saveRun(state);
      if (!nx) { go('world'); return; }
      chapterOpen();
    } });
  }

  /* ===================== 歩くマップ ===================== */

  function mapOfPlace(id) {
    var list = G.MAP_LIST || [];
    for (var i = 0; i < list.length; i++) if (list[i].place === id) return list[i];
    return null;
  }

  /** 歩く画面を開く（描画と入力は FieldView が持つ） */
  function openField() {
    if (!state.field) { go('world'); return; }
    G.FieldView.open(state, { act: fieldTalk, step: fieldStep });
  }

  /** 一歩ごとに呼ばれる。出口を踏んだら外へ。 */
  function fieldStep(what) {
    if (what === 'exit') {
      /* 第一段階では、町の外は従来の行き先一覧。
       * 地続きのフィールドに差し替えるのは次の段階。 */
      G.Field.leave(state);
      state.story.place = null;
      G.Save.saveRun(state);
      go('world');
    }
  }

  /** 目の前の相手に話しかける。台詞を読み終えてから、その人の用件へ進む。 */
  function fieldTalk() {
    var n = G.Field.facing(state);
    if (!n) { UI.toast('……誰もいない。'); return; }
    var lines = G.Field.linesOf(state, n);
    var after = G.Field.actOf(state, n);
    if (!lines.length) { if (after) act(after); return; }
    playScene(lines, {
      title: '', endLabel: after ? '…' : '閉じる',
      then: function () {
        /* 話し終えたら、既定では立っていた場所へ戻る。
         * 用件が別の画面へ移るなら、そちらが勝つ。
         * ここで戻り先を決めておかないと、用件が失敗したとき
         * （所持金が足りない等）会話の画面から出られなくなる。 */
        state.scene = null;
        state.screen = 'field';
        if (after) act(after); else go('field');
      }
    });
  }

  function enterPlace(id) {
    var p = G.Story.place(id);
    if (!p) return;
    if (!G.Story.placeOpen(state, p)) { UI.toast('🔒 まだ、そこへの道は開いていない。'); return; }
    if (p.kind === 'town') {
      state.story.place = id; state.story.dungeon = null;
      /* 歩ける地図があるなら、そちらへ入る。無い町は従来の一覧のまま。 */
      if (G.MAPS && mapOfPlace(id)) { G.Field.enter(state, mapOfPlace(id).id); go('field'); return; }
      go('town'); return;
    }
    /* 踏破済みなら「残響」。道中は無く、別の主に直行する。 */
    G.Story.enterDungeon(state, id, !!state.story.cleared[id]);
    G.Save.saveRun(state);
    go('dungeon');
  }

  /** ダンジョンで一歩踏み込む。道中・ボス前の会話はここで挟む。 */
  /** 道を選んで一歩踏み込む。pathId 無しなら本道あつかい（主戦はここを通る）。 */
  function dungeonGo(pathId) {
    var dg = state.story.dungeon;
    if (!dg) { go('world'); return; }
    var d = G.Story.place(dg.id);
    var isBoss = dg.at >= dg.depth - 1;
    if (dg.at === 0 && d.intro && !state.story.flags['intro_' + dg.id]) {
      state.story.flags['intro_' + dg.id] = true;
      playScene(d.intro, { title: d.name, endLabel: '奥へ進む', then: function () { dungeonGo(pathId); } });
      return;
    }
    if (isBoss && d.bossIntro && !state.story.flags['bi_' + dg.id]) {
      state.story.flags['bi_' + dg.id] = true;
      playScene(d.bossIntro, { title: d.name, endLabel: '戦う', then: function () { dungeonGo(pathId); } });
      return;
    }
    if (!isBoss && pathId) {
      var took = G.Story.takePath(state, pathId);
      if (took && took.toll) UI.toast('🩸 ' + took.path.name + 'を抜けるあいだに、体力を削られた。', 'bad');
      if (took && took.skipped) {
        /* 戦わずに一歩進んだ。拾い物だけは通る。 */
        UI.toast('🤫 ' + took.path.after, '');
        if (took.stash) showStash(took.stash);
        if (took.cleared) { /* 静区は主の手前までしか出ないので、ここは通らない */ }
        G.Save.saveRun(state);
        go('dungeon'); return;
      }
    }
    var enc = G.Story.nextEncounter(state);
    if (!enc) { go('world'); return; }
    state.nodeKind = enc.kind;
    state.targetIdx = 0; state.allyIdx = 0; state.battleTab = 'skill';
    state.battle = G.Battle.start(state, enc.units, { isBoss: enc.isBoss });
    go('battle');
  }

  /** 拾い物を知らせる */
  function showStash(stash) {
    UI.toast('🎁 ' + stash.place + (stash.gold ? '（' + stash.gold + 'G）' : ''), 'legend');
    stash.items.filter(function (x) { return x.rare; }).forEach(function (x) {
      UI.toast('✦ レアアイテム: <b>' + x.ref.name + '</b>', 'mythic');
    });
    if (stash.acc) UI.toast('💍 <b>' + stash.acc.name + '</b> を見つけた。', 'legend');
  }

  /** 物語モードで戦闘に勝ったあと */
  function storyAfterBattle() {
    /* 倒した相手を、受けている頼まれごとに数える */
    var hits = G.Story.noteKills(state, state.battle && state.battle.rec && state.battle.rec.killIds);
    hits.forEach(function (x) {
      UI.toast('📜 ' + x.errand.who + 'の頼まれごと: ' + x.n + ' / ' + x.errand.n, '');
    });
    var dg = state.story.dungeon;
    if (!dg) { go('world'); return; }
    var d = G.Story.place(dg.id);
    /* 拾い物は「今通った道」のもの。進めてしまうと道の情報が消えるので、
     * 一歩進める前に引く。 */
    var stash = (dg.at < dg.depth - 1) ? G.Story.rollStash(state) : null;
    var done = G.Story.advanceDungeon(state);
    if (!done) {
      if (stash) showStash(stash);
      G.Save.saveRun(state);
      go('dungeon'); return;
    }
    G.Save.saveRun(state);
    /* 残響は章の進行に関わらない。踏破の演出も章クリアの流れも通さない。 */
    if (dg.echo) {
      UI.toast('🌀 残響を鎮めた。（' + d.name + ' 残響 ' + dg.echo + '回目）', 'legend');
      G.Story.leaveDungeon(state);
      G.Save.saveRun(state);
      go('world');
      return;
    }
    UI.toast('👑 ' + d.name + ' を踏破した！', 'legend');
    G.Story.leaveDungeon(state);
    var isGoal = (G.Story.chapter(state) || {}).goal === d.id;
    playScene(d.clear || [], { title: d.name, endLabel: '地上へ戻る', then: function () {
      if (isGoal && G.Story.chapter(state).id === G.STORY.CHAPTERS[G.STORY.CHAPTERS.length - 1].id) {
        /* 最終章のクリア。エンディングまで一気に流す。 */
        chapterNext();
        return;
      }
      if (isGoal) {
        /* 仲間は「ついていく」と言った場面で加わる。
         * 章を跨ぐ前に加入させることで、その章の町で旅の話が聞ける。 */
        var joined = G.Story.joinForChapter(state);
        if (joined) UI.toast('🤝 <b>' + joined.name + '</b>（' + joined.role + '）が仲間になった！', 'class');
      }
      G.Save.saveRun(state);
      go('world');
    } });
  }

  /** 物語モードの全滅。所持金の半分を失い、章の町から立て直す。 */
  function storyRecover() {
    /* 誰かが宿まで運んでくれた、という体。全快で立て直せる。 */
    G.Run.healParty(state, 1);
    G.Story.leaveDungeon(state);
    var c = G.Story.chapter(state);
    var town = (c.places.filter(function (p) { return p.kind === 'town'; })[0] || {}).id;
    state.rewardData = null;
    state.battle = null;
    state.run.active = true;
    G.Save.saveRun(state);
    /* 宿の寝台で目を覚ます、という体。歩ける町があるなら、宿の前に立たせる。 */
    if (town) {
      state.story.place = town;
      var mp = mapOfPlace(town);
      if (mp) {
        G.Field.enter(state, mp.id);
        var inn = (mp.npcs || []).filter(function (n) { return n.act === 'inn'; })[0];
        if (inn) {
          var spot = [[0, 1, 'up'], [0, -1, 'down'], [1, 0, 'left'], [-1, 0, 'right']]
            .map(function (d) { return { x: inn.x + d[0], y: inn.y + d[1], dir: d[2] }; })
            .filter(function (sp) { return G.Field.passable(state, mp, sp.x, sp.y); })[0];
          if (spot) { state.field.x = spot.x; state.field.y = spot.y; state.field.dir = spot.dir; }
        }
        G.Save.saveRun(state);
        go('field'); return;
      }
      go('town');
    } else go('world');
  }

  /** 物語で育てたパーティのまま、試練の塔へ移る */
  function towerFromStory() {
    state.mode = 'tower';
    G.Field.leave(state);
    state.run.floor = 1;
    state.run.active = true;
    state.run.cleared = 0;
    state.run.shop = null;
    state.nodeKind = null;
    G.Run.healParty(state, 1);
    G.Run.generateNodes(state);
    G.Save.saveRun(state);
    UI.toast('🗼 試練の塔に足を踏み入れた。', 'class');
    go('map');
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
    var a = G.Run.rollAcc(f, (Sx.dropUp || 0) + 0.2, U.chance(0.25 + (Sx.dropUp || 0) * 0.3), G.realmOf(state));
    G.addAcc(hero, a.id); got.push({ type: 'acc', ref: a });
    if (U.chance(0.5 + (Sx.dropUp || 0))) {
      var g = G.Run.rollGear(f); G.addGear(hero, g.id); got.push({ type: 'gear', ref: g });
    }
    var n = U.rint(2, 3);
    for (var i = 0; i < n; i++) { var it = G.Run.rollItem(f); G.addItem(hero, it.id, 1); got.push({ type: 'item', ref: it }); }
    /* 宝物庫はレアアイテムの主要な入手源 */
    if (U.chance(G.Run.rareItemChance(state, 'treasure'))) {
      var ri = G.Run.rollRareItem(f);
      if (ri) { G.addItem(hero, ri.id, 1); got.push({ type: 'item', ref: ri, rare: true }); }
    }
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

    if (b.result === 'flee') {
      state.battle = null;
      state.rewardData = null;
      if (state.mode === 'story' && state.story && state.story.dungeon) {
        /* 逃げると、そのダンジョンは入口からやり直しになる */
        G.Story.enterDungeon(state, state.story.dungeon.id);
        UI.toast('🏃 入口まで引き返した。');
        G.Save.saveRun(state);
        go('dungeon');
      } else {
        UI.toast('🏃 その場を離れた。');
        G.Save.saveRun(state);
        backToField(true);
      }
      return;
    }

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
      cls.forEach(function (c) {
        UI.toast('☆ ' + U.esc(c.who.name) + ' が <b>' + c.cls.name + '</b>（' +
          (c.cls.tier === 3 ? '最上級職' : '上級職') + '）の条件を満たした。', 'class');
      });
      var cleared = (state.nodeKind === 'boss' && state.run.floor >= 25 && !state.run.clearedGame);
      if (cleared) {
        state.run.clearedGame = true;
        state.meta.wins++;
        G.Save.saveMeta(state);
      }
      state.rewardData = { win: true, exp: r.exp, gold: r.gold, levels: r.levels, drops: r.drops,
                           mythics: mys, classes: cls, choices: r.choices, cleared: cleared,
                           sp: r.sp, mastery: r.mastery, masteryTotal: r.masteryTotal,
                           story: state.mode === 'story' };
      state.battle = null;
      G.Save.saveRun(state);
      go('reward');
    } else if (state.mode === 'story') {
      /* 物語モードでは全滅しても終わらない。代償は所持金の半分。 */
      var lost = Math.floor(state.hero.gold / 2);
      state.hero.gold -= lost;
      state.meta.deaths++;
      G.Save.saveMeta(state);
      state.rewardData = { win: false, story: true, lostGold: lost };
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
    if (state.mode === 'story') { storyAfterBattle(); return; }
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
      UI.toast('☆ ' + U.esc(c.who.name) + ' が <b>' + c.cls.name + '</b> の条件を満たした。', 'class');
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
      case 'towerStart': state.mode = 'tower'; state.story = null; go('classSelect'); break;
      case 'setDiff': {
        var did = p[1];
        if (!G.DIFF_BY_ID[did]) break;
        state.diff = G.Diff.set(did).id;
        state.meta.diff = state.diff; G.Save.saveMeta(state);
        if (state.run && state.run.active) {
          G.Save.saveRun(state);
          UI.toast('難易度を <b>' + G.Diff.get().name + '</b> にした。次の戦闘から変わる。');
        }
        /* 名前を入力しかけている画面では、描き直しで消えないように持ち越す */
        var nmEl = document.getElementById('heroName');
        var keep = nmEl ? nmEl.value : null;
        draw();
        if (keep != null) {
          var nm2 = document.getElementById('heroName');
          if (nm2) nm2.value = keep;
        }
        break;
      }
      case 'storyStart': go('storyIntro'); break;
      case 'storyBegin': {
        var snEl = document.getElementById('heroName');
        var snm = (snEl && snEl.value.trim()) || G.STORY.HERO.defaultName;
        G.Story.begin(state, snm);
        G.Save.saveRun(state);
        chapterOpen();
        break;
      }
      case 'sceneNext': {
        if (!state.scene) { go('world'); break; }
        if (state.scene.i < state.scene.lines.length - 1) { state.scene.i++; draw(); }
        else sceneDone();
        break;
      }
      case 'sceneSkip':
        if (state.scene) { state.scene.i = state.scene.lines.length - 1; draw(); }
        break;
      case 'place': enterPlace(p[1]); break;
      case 'toWorld': state.story.place = null; go('world'); break;
      case 'town': go('town'); break;
      case 'inn': {
        var cost = parseInt(p[1], 10);
        if (G.Story.inn(state, cost)) {
          UI.toast('🛏 ひと晩休み、全員が回復した。');
          G.Save.saveRun(state);
          /* 泊まった夜に、一つだけ話が転がる。無ければ黙って朝になる。 */
          var night = G.Story.innTalk(state);
          if (night) {
            G.Save.saveRun(state);
            playScene(night.lines, { title: '宿の夜', endLabel: '朝を待つ', then: function () { backToField(true); } });
            break;
          }
        } else UI.toast('所持金が足りない。');
        draw(); break;
      }
      case 'townShop':
        if (!state.run.shop) state.run.shop = G.Run.makeShop(state);
        go('shop'); break;
      /* 町の祭壇。受け口が無く、押しても何も起きていなかった。 */
      case 'altar': go('altar'); break;
      case 'dungeonGo': dungeonGo(p[1]); break;
      case 'fieldTalk': fieldTalk(); break;
      case 'fieldMenu': S.buildModal(state); break;
      /* 地図の上で話しかけて受ける版。受けたあとも同じ場所に立ったまま。 */
      case 'errandAsk': {
        var qa = G.ERRAND_BY_ID[p[1]];
        if (G.Story.takeErrand(state, p[1])) {
          UI.toast('📜 ' + qa.who + 'の頼まれごとを引き受けた。', '');
          G.Save.saveRun(state);
        }
        backToField(true); break;
      }
      case 'errandTake':
        if (G.Story.takeErrand(state, p[1])) {
          UI.toast('📜 頼まれごとを引き受けた。', '');
          G.Save.saveRun(state);
        }
        draw(); break;
      case 'errandDone': {
        var qx = G.ERRAND_BY_ID[p[1]];
        var got = G.Story.finishErrand(state, p[1]);
        if (got) {
          /* 報告は台詞で返す。数字だけ増えて終わると、用事ではなく作業になる。 */
          playScene([{ w: qx.who, t: qx.done }], { title: '頼まれごと', endLabel: '受け取る', then: function () {
            if (got.gold) UI.toast('💰 ' + got.gold + 'G を受け取った。', 'legend');
            got.items.forEach(function (it) {
              UI.toast('🧪 <b>' + it.ref.name + '</b> ×' + it.n, '');
            });
            if (got.acc) UI.toast('💍 <b>' + got.acc.name + '</b> を譲り受けた。', 'legend');
            G.Save.saveRun(state);
            backToField(true);
          } });
        } else draw();
        break;
      }
      case 'dungeonLeave': G.Story.leaveDungeon(state); G.Save.saveRun(state); go('world'); break;
      case 'chapterNext': chapterNext(); break;
      case 'storyRecover': storyRecover(); break;
      case 'towerFromStory': towerFromStory(); break;
      case 'continue': {
        var d = G.Save.loadRun();
        if (!d) { UI.toast('保存された冒険がありません。'); go('title'); break; }
        state.hero = d.hero; state.run = d.run;
        state.party = d.party || [state.hero];
        state.mode = d.mode || 'tower';
        state.story = d.story || null;
        state.field = d.field || null;
        state.diff = G.Diff.set(d.diff || state.meta.diff || 'normal').id;
        if (!state.run.stats) state.run.stats = {};
        ['kills', 'crits', 'itemsUsed', 'reflectKills', 'aoeKills', 'elites', 'bosses', 'classChanges',
         'statusApplied', 'evades']
          .forEach(function (k) { if (state.run.stats[k] == null) state.run.stats[k] = 0; });
        /* 旧データの移行: run にあった戦い方の記録は主人公のものとして引き継ぐ */
        if (state.run.stats.style) {
          if (!state.hero.style) state.hero.style = state.run.stats.style;
          delete state.run.stats.style;
        }
        (state.party || [state.hero]).forEach(function (m) {
          if (!m.style) m.style = G.Style.newRecord();
          if (m.sp == null) m.sp = 0;
          if (!m.tree) m.tree = {};
          if (!m.mastery) m.mastery = {};
        });
        if (state.mode === 'story' && state.story) {
          if (state.story.phase === 'open') chapterOpen();
          else if (state.story.dungeon) go('dungeon');
          else if (state.field) go('field');
          else if (state.story.place && G.Story.place(state.story.place)) go('town');
          else go('world');
        } else go('map');
        break;
      }
      case 'toTitle':
        state.hero = null; state.run = null; state.party = null; state.battle = null;
        state.story = null; state.scene = null; state.mode = 'tower'; state.field = null;
        go('title'); break;
      case 'start': {
        var nameEl = document.getElementById('heroName');
        var nm = (nameEl && nameEl.value.trim()) || '冒険者';
        G.Run.newRun(state, p[1], nm.slice(0, 12));
        state.mode = 'tower'; state.story = null;
        G.Save.saveMeta(state); G.Save.saveRun(state);
        go('map');
        break;
      }

      /* --- マップ --- */
      case 'node': enterNode(parseInt(p[1], 10)); break;
      case 'leaveNode': backToField(); break;
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
      case 'pstyle': G.Portraits.setStyle(p[1]); S.codex(state); break;
      case 'tab': state.battleTab = p[1]; draw(); break;
      case 'skill': doAction({ type: 'skill', id: p[1] }); break;
      case 'flee': doAction({ type: 'flee' }); break;
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
          G.Run.checkClassUnlocks(state).forEach(function (c) { UI.toast('☆ ' + U.esc(c.who.name) + ' が <b>' + c.cls.name + '</b> の条件を満たした。', 'class'); });
          nextFloor();
        } else if (p[1] === 'forge') { S.buildModal(state); }
        break;
      }

      /* --- 転職 --- */
      case 'changeClass': {
        var cid = p[1], who = buildTarget();
        /* 仲間は自分の系統の外へは行けない */
        if (G.Unlock.classLine(who).indexOf(cid) < 0) { UI.toast(who.name + ' はその道へは進めない。'); break; }
        var chk = G.Unlock.classCheck(cid, G.Unlock.ctx(state, null, who));
        if (!chk.ok) { UI.toast('条件を満たしていない。'); break; }
        if (who.classHistory.indexOf(who.classId) < 0) who.classHistory.push(who.classId);
        who.classId = cid;
        state.run.stats.classChanges = (state.run.stats.classChanges || 0) + 1;
        if (state.meta.classesSeen.indexOf(cid) < 0) state.meta.classesSeen.push(cid);
        G.Save.saveMeta(state);
        var newS = G.Stats.compute(who).S;
        who.hp = Math.min(newS.maxHp, who.hp + Math.round(newS.maxHp * 0.4));
        who.mp = newS.maxMp;
        var c2 = G.CLASSES[cid];
        UI.toast('⛩ ' + U.esc(who.name) + ' が <b>' + c2.name + '</b> に転職した！' +
          (c2.tier === 3 ? '（最上級職）' : ''), c2.tier === 3 ? 'mythic' : 'class');
        G.Save.saveRun(state);
        draw(); break;
      }
      case 'altarPreview': go('altarPreview'); break;
      case 'closeOverlay': backToField(true); break;

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
      case 'buildWho': {
        state.buildIdx = parseInt(p[1], 10) || 0;
        if (state.screen === 'altar' || state.screen === 'altarPreview') { draw(); break; }
        if (document.getElementById('modal') &&
            document.getElementById('modal').classList.contains('on')) {
          if (state.treeOpenNow) S.skillTree(state); else S.buildModal(state);
        } else draw();
        break;
      }
      case 'buildOpen': state.treeOpenNow = false; S.buildModal(state); break;
      case 'closeModal': UI.closeModal(); draw(); break;
      case 'pickAcc': S.accPicker(state, parseInt(p[1], 10)); break;
      case 'setAcc': {
        var slot = parseInt(p[1], 10), id = p[2], wa = buildTarget();
        if (id !== '-1' && G.Run.freeCount(state, id, 'acc', wa, slot) <= 0) {
          UI.toast('それは他のメンバーが装備している。'); break;
        }
        wa.equip.acc[slot] = (id === '-1') ? null : id;
        G.Save.saveRun(state);
        S.buildModal(state); refreshBattleStats(); draw(); break;
      }
      case 'pickGear': S.gearPicker(state, p[1]); break;
      case 'setGear': {
        var sl = p[1], gid = p[2], wg = buildTarget();
        if (gid !== '-1' && G.Run.freeCount(state, gid, sl, wg, sl) <= 0) {
          UI.toast('それは他のメンバーが装備している。'); break;
        }
        wg.equip[sl] = (gid === '-1') ? null : gid;
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
      case 'treeOpen': state.treeOpenNow = true; S.skillTree(state); break;
      case 'treeTab': state.treeTab = p[1]; S.skillTree(state); break;
      case 'treeTake': {
        var wt = buildTarget();
        var chk = G.Tree.check(wt, p[1]);
        if (!chk.ok) { UI.toast('まだ取得できない。'); break; }
        wt.tree[p[1]] = true;
        wt.sp -= chk.node.cost;
        refreshBattleStats();
        UI.toast('🌿 <b>' + chk.node.name + '</b> を習得した。', 'class');
        G.Run.checkClassUnlocks(state).forEach(function (c) {
          UI.toast('☆ ' + U.esc(c.who.name) + ' が <b>' + c.cls.name + '</b> の条件を満たした。', 'class');
        });
        G.Save.saveRun(state);
        S.skillTree(state); draw(); break;
      }
      case 'treeRespec': {
        var wr = buildTarget();
        var rc = G.Tree.respecCost(wr);
        if (rc <= 0) break;
        if (state.hero.gold < rc) { UI.toast('ゴールドが足りない。'); break; }
        state.hero.gold -= rc;              /* 財布はパーティ共有 */
        wr.sp = (wr.sp || 0) + G.Tree.totalSpent(wr);
        wr.tree = {};
        refreshBattleStats();
        UI.toast('🌿 スキルポイントを振り直した。');
        G.Save.saveRun(state);
        S.skillTree(state); draw(); break;
      }

      case 'treeMode': state.treeMode = p[1]; S.skillTree(state); break;
      case 'classPick': {
        var tier = parseInt(p[1], 10), wp = buildTarget();
        if (!G.Mastery.pick(wp, wp.classId, tier, p[2])) { UI.toast('まだ選べない。'); break; }
        var picked = G.CLASSTREE[wp.classId][tier - 1][p[2]];
        refreshBattleStats();
        UI.toast('⚔ <b>' + picked.name + '</b> の道を選んだ。', 'class');
        G.Run.checkClassUnlocks(state).forEach(function (c) {
          UI.toast('☆ ' + U.esc(c.who.name) + ' が <b>' + c.cls.name + '</b> の条件を満たした。', 'class');
        });
        G.Save.saveRun(state);
        S.skillTree(state); draw(); break;
      }
      case 'classRespec': {
        var wm = buildTarget();
        var mc = G.Mastery.respecCost(wm);
        if (mc <= 0) break;
        if (state.hero.gold < mc) { UI.toast('ゴールドが足りない。'); break; }
        state.hero.gold -= mc;              /* 財布はパーティ共有 */
        G.Mastery.reset(wm);
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

  /** ビルド画面・祭壇・ツリーで今編集している相手 */
  function buildTarget() {
    var list = state.party || [state.hero];
    var i = Math.min(state.buildIdx || 0, list.length - 1);
    return list[Math.max(0, i)] || state.hero;
  }

  /** 装備変更後のステータス反映（最大値が下がった場合の現在値の丸め込みを含む） */
  function refreshBattleStats() {
    /* 装備の付け替えで最大値が下がることがあるので、全員ぶん丸める */
    (state.party || [state.hero]).forEach(function (m) {
      var S = G.Stats.compute(m).S;
      m.hp = Math.min(m.hp, S.maxHp);
      m.mp = Math.min(m.mp, S.maxMp);
    });
    if (state.battle && !state.battle.over) {
      G.Battle.partyUnits(state.battle).forEach(function (u) {
        G.Battle.refresh(u);
        u.hp = Math.min(u.hp, u.S.maxHp); u.mp = Math.min(u.mp, u.S.maxMp);
      });
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

  /* 差し替え用の立ち絵が置かれていれば読み込み、あれば描き直す。
   * 見つからなければ何も起きず、手続き生成のまま。 */
  G.Portraits.preload(function (n) {
    if (n > 0) draw();
  });
})();
