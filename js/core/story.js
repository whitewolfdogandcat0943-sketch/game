/* story.js(core) - 物語モードの進行管理
 *
 * 進行は state.story に集約する。
 *   ch      : 現在の章番号
 *   phase   : 'open'(章頭の会話) → 'field'(町とダンジョンを行き来) → 'close'(章末の会話)
 *   cleared : クリア済みダンジョンID
 *   flags   : 会話などで立てた任意のフラグ
 *   dungeon : 潜入中のダンジョンの状態（null なら地上）
 *
 * 戦闘は塔モードと同じエンジンを使う。state.run.floor を
 * 「そのダンジョン相当の階層」に差し替えることで敵の強さを合わせる。
 */
G.Story = (function () {
  var U = G.U;

  function chapter(state) {
    return G.STORY.CHAPTERS.filter(function (c) { return c.id === state.story.ch; })[0];
  }

  /** 話者名などに含まれる {hero} を主人公の名前に差し替える */
  function fill(text, state) {
    return String(text).replace(/\{hero\}/g, state.hero ? state.hero.name : '主人公');
  }
  function fillLines(lines, state) {
    return (lines || []).map(function (l) {
      return { w: fill(l.w || '', state), t: fill(l.t, state) };
    });
  }

  /* ===================== 開始 ===================== */

  function begin(state, name) {
    var H = G.STORY.HERO;
    G.Run.newRun(state, H.classId, name || H.defaultName);
    state.mode = 'story';
    state.run.floor = 1;
    state.story = { ch: 1, phase: 'open', cleared: {}, flags: {}, dungeon: null, place: null, done: false };
    return state.story;
  }

  /* ===================== 場所 ===================== */

  /** 今の章で入れる場所の一覧 */
  function places(state) {
    var c = chapter(state);
    if (!c) return [];
    return c.places.map(function (p) {
      return { ref: p, cleared: !!state.story.cleared[p.id] };
    });
  }

  function place(id) { return G.STORY.PLACE_BY_ID[id]; }

  /* ===================== ダンジョン ===================== */

  /** ダンジョンに入る。depth 段の戦闘があり、最後がボス。 */
  function enterDungeon(state, id) {
    var d = place(id);
    if (!d || d.kind !== 'dungeon') return null;
    state.story.dungeon = {
      id: id, at: 0, depth: d.depth, cleared: false,
      /* 一度入ったら道中の会話は繰り返さない */
      introSeen: !!state.story.flags['intro_' + id]
    };
    state.story.place = id;
    return state.story.dungeon;
  }

  function leaveDungeon(state) {
    state.story.dungeon = null;
    state.story.place = null;
  }

  /** 次に戦う相手。最後の一戦はボス。 */
  function nextEncounter(state) {
    var dg = state.story.dungeon;
    if (!dg) return null;
    var d = place(dg.id);
    var isBoss = dg.at >= dg.depth - 1;
    state.run.floor = isBoss ? d.bossLv : d.lv;
    var units = [], i;
    if (isBoss) {
      var boss = G.ENEMY_BY_ID[d.boss];
      units.push(G.Battle.makeEnemyUnit(boss, d.bossLv, 0));
      var addN = d.bossLv >= 12 ? 2 : 1;
      for (i = 0; i < addN; i++) {
        units.push(G.Battle.makeEnemyUnit(G.ENEMY_BY_ID[U.pick(d.pool)], Math.max(1, d.bossLv - 2), i + 1));
      }
      return { units: units, isBoss: true, kind: 'boss' };
    }
    var n = d.lv <= 5 ? U.rint(2, 3) : U.rint(2, 4);
    /* 最後の一歩手前は少し歯応えを増やす */
    var elite = (dg.at === dg.depth - 2) && d.depth >= 4;
    if (elite) n = Math.max(2, n - 1);
    for (i = 0; i < n; i++) {
      var e = G.Battle.makeEnemyUnit(G.ENEMY_BY_ID[U.pick(d.pool)], elite ? d.lv + 1 : d.lv, i);
      if (elite) {
        e.base.maxHp = Math.round(e.base.maxHp * 1.3);
        G.Battle.refresh(e); e.hp = e.S.maxHp; e.name = '精鋭' + e.name;
      }
      units.push(e);
    }
    return { units: units, isBoss: false, kind: elite ? 'elite' : 'battle' };
  }

  /** 一戦勝った。ダンジョンを1歩進める。踏破したら true。 */
  function advanceDungeon(state) {
    var dg = state.story.dungeon;
    if (!dg) return false;
    dg.at++;
    if (dg.at >= dg.depth) {
      dg.cleared = true;
      state.story.cleared[dg.id] = true;
      return true;
    }
    return false;
  }

  /* ===================== 隠し場所 =====================
   * ダンジョンを一歩進むごとに、物陰や打ち捨てられた荷から
   * アイテムが見つかることがある。塔の宝物庫にあたるもの。 */

  /** 次の一歩で見つかるものを決める。見つからなければ null。 */
  function rollStash(state) {
    var dg = state.story.dungeon;
    if (!dg) return null;
    var d = place(dg.id);
    dg.stash = null;
    /* 同じ場所は一度きり。踏破済みのダンジョンでは出ない。 */
    var key = dg.id + '#' + dg.at;
    if (state.story.flags['stash_' + key]) return null;
    if (!U.chance(0.55)) return null;
    state.story.flags['stash_' + key] = true;

    var lv = d.lv, got = [];
    var n = U.rint(1, 2);
    for (var i = 0; i < n; i++) {
      var it = G.Run.rollItem(lv);
      G.addItem(state.hero, it.id, 1);
      got.push({ ref: it, rare: false });
    }
    if (U.chance(G.Run.rareItemChance(state, 'treasure'))) {
      var ri = G.Run.rollRareItem(lv);
      if (ri) { G.addItem(state.hero, ri.id, 1); got.push({ ref: ri, rare: true }); }
    }
    var gold = Math.round((25 + lv * 14) * U.rf(0.8, 1.3));
    state.hero.gold += gold;
    dg.stash = { items: got, gold: gold, place: U.pick(STASH_PLACES) };
    return dg.stash;
  }

  var STASH_PLACES = [
    '崩れた壁の裏', '打ち捨てられた荷', '朽ちた木箱', '倒れた冒険者の荷袋',
    '苔むした祭壇の窪み', 'water', '瓦礫の隙間'
  ].filter(function (x) { return x !== 'water'; });

  /* ===================== 章の進行 ===================== */

  /** 章の目標を達成しているか */
  function chapterDone(state) {
    var c = chapter(state);
    return !!(c && state.story.cleared[c.goal]);
  }

  /** 次の章へ。最終章を終えていたら done を立てる。 */
  function nextChapter(state) {
    var c = chapter(state);
    if (c && c.join) {
      var joined = G.Run.joinAlly(state, c.join);
      if (joined) state.story.flags['join_' + c.join] = true;
    }
    var idx = G.STORY.CHAPTERS.indexOf(c);
    if (idx < 0 || idx >= G.STORY.CHAPTERS.length - 1) {
      state.story.done = true;
      state.story.phase = 'field';
      return null;
    }
    state.story.ch = G.STORY.CHAPTERS[idx + 1].id;
    state.story.phase = 'open';
    state.story.dungeon = null;
    state.story.place = null;
    return chapter(state);
  }

  /** 章クリア時に仲間を加入させる（章末会話の直前に呼ぶ） */
  function joinForChapter(state) {
    var c = chapter(state);
    if (!c || !c.join) return null;
    if (state.story.flags['join_' + c.join]) return null;
    var a = G.Run.joinAlly(state, c.join);
    if (a) state.story.flags['join_' + c.join] = true;
    return a;
  }

  /* ===================== 宿 ===================== */

  function inn(state, cost) {
    if (state.hero.gold < cost) return false;
    state.hero.gold -= cost;
    G.Run.healParty(state, 1);
    return true;
  }

  return {
    begin: begin, chapter: chapter, places: places, place: place,
    fill: fill, fillLines: fillLines,
    enterDungeon: enterDungeon, leaveDungeon: leaveDungeon, rollStash: rollStash,
    nextEncounter: nextEncounter, advanceDungeon: advanceDungeon,
    chapterDone: chapterDone, nextChapter: nextChapter, joinForChapter: joinForChapter,
    inn: inn
  };
})();
