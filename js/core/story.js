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

  /** その場所が属する章。地続きの世界では「今の章」と一致しないことがある。 */
  function chapterOf(placeId) {
    return G.STORY.CHAPTERS.filter(function (c) {
      return c.places.some(function (p) { return p.id === placeId; });
    })[0] || null;
  }

  /** その町の「その後」が始まっているか。
   *  今いる章ではなく、その町が属する章の主を倒したかで決める。
   *  先に遠くの土地を片づけて戻ってきても、町の反応が巻き戻らない。 */
  function placeMoved(state, placeId) {
    var c = chapterOf(placeId);
    return !!(c && state.story && state.story.cleared && state.story.cleared[c.goal]);
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
      return { ref: p, cleared: !!state.story.cleared[p.id], locked: !placeOpen(state, p) };
    });
  }

  /* need を持つ場所は、指定の場所を踏破するまで開かない。
   * 章のなかに順番を作るための鍵。最終章を一段の崖ではなく階段にするために使う。 */
  function placeOpen(state, p) {
    if (!p || !p.need) return true;
    return !!state.story.cleared[p.need];
  }

  function place(id) { return G.STORY.PLACE_BY_ID[id]; }

  /* ===================== ダンジョン ===================== */

  /** ダンジョンに入る。depth 段の戦闘があり、最後がボス。 */
  /* ===================== 残響（踏破済みへの再挑戦） =====================
   * 踏破したダンジョンには、別の主が現れることがある。
   *
   * もともと再入場は素通しで、同じ主が満額の報酬を落とし続けていた。
   * 周回できること自体は残したいので、次の形に作り直した:
   *   ・道中は無し。主に直行する（周回のだるさを消す）
   *   ・主は毎回ランダム。挑むたびに格が上がる
   *   ・経験値と金は回数ごとに減る（レベルで殴り倒せなくする）
   *   ・報酬の3択だけは毎回そのまま（ビルドを進める場所として残す）
   */
  function echoCount(state, id) {
    return (state.story.echo && state.story.echo[id]) || 0;
  }
  /** 残響で出る主を決める。挑む格に見合ったボスから選ぶ。 */
  function echoBoss(state, d, n) {
    var lv = Math.max(d.bossLv, effLv(state, d.bossLv)) + n * 2;
    /* 相刻の側の主だけを呼ぶ。塔の北欧の主が物語に出てくると、
     * 世界がひとつ混ざってしまう。 */
    var mine = G.BOSSES.filter(function (b) { return G.inRealm(b, 'mid'); });
    if (!mine.length) mine = G.BOSSES;
    var pool = mine.filter(function (b) {
      var home = { 1: 5, 2: 10, 3: 15 }[b.tier] || 5;
      return home <= lv + 4;
    });
    if (!pool.length) pool = mine;
    return U.pick(pool);
  }
  /** 残響の報酬倍率。挑むほど実入りが減る。
   * 一定にすると、レベルと金だけを稼いで本編を殴り倒せてしまう。
   * 3択の報酬（ビルドの前進）は減らさない。周回する理由をそこに残すため。 */
  function echoReward(state, id) {
    return Math.max(0.20, Math.pow(0.55, echoCount(state, id)));
  }

  function enterDungeon(state, id, echo) {
    var d = place(id);
    if (!d || d.kind !== 'dungeon') return null;
    if (echo) {
      var n = echoCount(state, id);
      state.story.dungeon = {
        id: id, at: 0, depth: 1, cleared: false, introSeen: true,
        echo: n + 1, echoBoss: echoBoss(state, d, n).id
      };
    } else {
      state.story.dungeon = {
        id: id, at: 0, depth: d.depth, cleared: false,
        /* 一度入ったら道中の会話は繰り返さない */
        introSeen: !!state.story.flags['intro_' + id]
      };
    }
    state.story.place = id;
    return state.story.dungeon;
  }

  function leaveDungeon(state) {
    state.story.dungeon = null;
    state.story.place = null;
  }

  /* ===================== 分かれ道 ===================== */

  /** 今の一歩で選べる道。中身は paths.js（G.PATHS）が持つ。 */
  function paths(state) {
    if (!G.rollPaths) return [];
    return G.rollPaths(state).map(function (id) { return G.PATH_BY_ID[id]; })
      .filter(function (p) { return !!p; });
  }

  /** 今どの道を通っているか。選ぶ前は本道あつかい。 */
  function curPath(state) {
    var dg = state.story && state.story.dungeon;
    var p = dg && dg.path && G.PATH_BY_ID ? G.PATH_BY_ID[dg.path] : null;
    return p || (G.PATHS ? G.PATHS[0] : null);
  }

  /** 道を選ぶ。入るだけで払うもの（淀んだ底の消耗）はここで払う。
   *  戦わずに抜ける道なら { skipped: true } を返す。 */
  function takePath(state, id) {
    var dg = state.story && state.story.dungeon;
    if (!dg) return null;
    var p = G.PATH_BY_ID && G.PATH_BY_ID[id];
    if (!p) return null;
    /* 選べる顔ぶれに無い道は通らせない（保存データの持ち回しで壊れないように） */
    if ((dg.paths || []).indexOf(id) < 0) return null;
    dg.path = id;
    if (p.once) {
      if (!dg.usedPaths) dg.usedPaths = {};
      dg.usedPaths[p.once] = true;
    }
    var hurt = 0;
    if (p.toll) {
      /* 通行料は最大HPの割合で、倒れることはない。
       * 道を選んだだけで全滅が決まる作りにはしない。 */
      (state.party || [state.hero]).forEach(function (m) {
        var mx = G.Stats.compute(m).S.maxHp;
        var cut = Math.round(mx * p.toll);
        var before = m.hp;
        m.hp = Math.max(1, m.hp - cut);
        hurt += before - m.hp;
      });
    }
    if (p.skip) {
      /* 戦わずに一歩。拾い物の判定だけは通す。 */
      var st = rollStash(state);
      var done = advanceDungeon(state);
      return { skipped: true, cleared: done, stash: st, toll: hurt, path: p };
    }
    return { skipped: false, toll: hurt, path: p };
  }

  /* 章の想定レベルを大きく超えて育っていると、中盤が素通りになり
   * 最終章だけが壁になる。育ったぶんは敵の格も上げて、道中に手応えを残す。
   * 章の設計値を下回ることはなく、上限も +8 までに留める。 */
  function effLv(state, base) {
    var lv = (state.hero && state.hero.level) || 1;
    var dm = G.Diff.get();
    return Math.max(base, Math.min(base + (dm.trackCap || 8), Math.round(lv * (dm.track || 0.68))));
  }

  /** 次に戦う相手。最後の一戦はボス。 */
  function nextEncounter(state) {
    var dg = state.story.dungeon;
    if (!dg) return null;
    var d = place(dg.id);
    var isBoss = dg.at >= dg.depth - 1;
    /* 道中だけを育ちに合わせて引き上げる。章の主は設計どおりの相手のままにして、
     * 強さの上乗せは難易度モードに任せる。ボスまで追随させると最終章だけが崖になる。 */
    /* 道中は育ちに合わせて引き上げるが、その章の主を追い越させない。
     * 追い越すと、道中一戦の総HPが主より多くなり、
     * 「難しい」ではなく「長い」だけの戦いが並ぶ。飽きはそこから来る。 */
    var lvN = Math.min(effLv(state, d.lv), Math.max(d.lv, d.bossLv - 1)), bossN = d.bossLv;
    /* 高い難度では、章の主もこちらの育ちに一定まで付いてくる。
     * 標準では bossTrack が 0 なので、主は設計どおりの相手のまま。 */
    var bt = G.Diff.get().bossTrack || 0;
    if (bt > 0) bossN = Math.min(d.bossLv + bt, effLv(state, d.bossLv));
    /* 残響の主は、育ち具合に追いついたうえで、挑むたびに格が上がる。
     * 章の設計値だけを基準にすると、レベル40で第1章の残響に行っても
     * 相手が弱すぎて腕試しにならない。 */
    if (dg.echo) {
      var base = Math.max(d.bossLv, effLv(state, d.bossLv));
      bossN = Math.min(base + 14, base + (dg.echo - 1) * 2);
    }
    state.run.floor = isBoss ? bossN : lvN;
    var units = [], i;
    if (isBoss) {
      var boss = G.ENEMY_BY_ID[dg.echo ? dg.echoBoss : d.boss] || G.ENEMY_BY_ID[d.boss];
      units.push(G.Battle.makeEnemyUnit(boss, bossN, 0));
      /* 難易度による取り巻きの上乗せは、こちらに手札が揃ってから。
       * 第一章は主人公ひとり・アクセ0・技も数えるほどで、
       * ここで数を増やすと「難しい」ではなく「どうしようもない」になる。
       * 一番手詰まりになりやすい場所を一番きつくするのは、いちばん人が離れる作り。 */
      var addN = (bossN >= 9 ? 2 : 1) + (bossN >= 8 ? G.Diff.get().adds : 0);
      /* 自分で頭数を増やす主は、最初の取り巻きを減らす。
       * 仕掛けと難易度の取り巻きが二重に乗ると、難しくなるのではなく
       * ただ長くなる（写し身の一戦が31ラウンドになった）。 */
      if (boss.gimmick && (boss.gimmick.kind === 'clones' || boss.gimmick.kind === 'summon')) {
        addN = Math.max(0, addN - 2);
      }
      for (i = 0; i < addN; i++) {
        units.push(G.Battle.makeEnemyUnit(G.ENEMY_BY_ID[U.pick(d.pool)], Math.max(1, bossN - 2), i + 1));
      }
      return { units: units, isBoss: true, kind: 'boss' };
    }
    /* 敵が上位ティアに入ると一体あたりのHPが跳ね上がる。
     * そこで数まで増やすと戦闘が延びるだけなので、後半はむしろ絞る。 */
    var n = lvN <= 5 ? U.rint(2, 3)
      : (lvN <= 11 ? U.rint(3, 4)
      : (lvN <= 17 ? U.rint(3, 5) : U.rint(3, 4)));
    n += (lvN >= 4 ? G.Diff.get().mobPlus : 0);
    /* 最後の一歩手前は少し歯応えを増やす */
    var elite = (dg.at === dg.depth - 2) && d.depth >= 4;
    /* 選んだ道の中身。狭ければ数が減り、広間なら精鋭が待つ。 */
    var pth = curPath(state);
    if (pth) {
      if (pth.mobs) n = Math.max(1, n + pth.mobs);
      if (pth.elite) elite = true;
    }
    /* 精鋭は一体ずつが重い。数を増やすと難しくなるのではなく長くなるだけなので、
     * 数は絞って、一体あたりの手応えで見せる。 */
    if (elite) n = Math.min(3, Math.max(2, n - 1));
    for (i = 0; i < n; i++) {
      var e = G.Battle.makeEnemyUnit(G.ENEMY_BY_ID[U.pick(d.pool)], elite ? lvN + 1 : lvN, i);
      if (elite) {
        e.base.maxHp = Math.round(e.base.maxHp * 1.42);
        e.base.atk = Math.round(e.base.atk * 1.15); e.base.mag = Math.round(e.base.mag * 1.15);
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
    /* 一歩進んだら、道の選び直し。次の顔ぶれは踏み込むときに引く。 */
    dg.path = null; dg.paths = null; dg.pathsAt = -1;
    if (dg.at >= dg.depth) {
      dg.cleared = true;
      state.story.cleared[dg.id] = true;
      if (dg.echo) {
        if (!state.story.echo) state.story.echo = {};
        state.story.echo[dg.id] = dg.echo;
      }
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
    /* 選んだ道で、見つかるかどうかも、量も変わる。
     * 拾い物が道と無関係だと、道を選んだ意味が「戦闘の形」だけになる。 */
    var pth = curPath(state);
    var chance = (pth && pth.find != null) ? pth.find : 0.40;
    var bonus = (pth && pth.findBonus) || 1;
    if (!U.chance(chance)) return null;
    state.story.flags['stash_' + key] = true;

    var lv = d.lv, got = [];
    var n = U.rint(1, 2) + (bonus >= 1.5 ? 1 : 0);
    for (var i = 0; i < n; i++) {
      var it = G.Run.rollItem(lv);
      G.addItem(state.hero, it.id, 1);
      got.push({ ref: it, rare: false });
    }
    if (U.chance(Math.max((pth && pth.rare) || 0, G.Run.rareItemChance(state, 'treasure')))) {
      var ri = G.Run.rollRareItem(lv);
      if (ri) { G.addItem(state.hero, ri.id, 1); got.push({ ref: ri, rare: true }); }
    }
    /* 隠し扉の先だけはアクセサリが出る。道中で装備が増える唯一の場所。 */
    var acc = null;
    if (pth && pth.acc) {
      acc = G.Run.rollAcc(Math.max(1, lv), 0.2, U.chance(0.35), 'mid');
      if (acc) G.addAcc(state.hero, acc.id);
    }
    var gold = Math.round((25 + lv * 14) * U.rf(0.8, 1.3) * bonus);
    state.hero.gold += gold;
    dg.stash = {
      items: got, gold: gold, acc: acc,
      place: (pth && pth.after) ? pth.after : U.pick(STASH_PLACES)
    };
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
    /* 道具屋の品を入れ替える。ここで捨てないと、
     * 最初の町で並んだ4個を最終章まで売り続けることになる。 */
    if (state.run) state.run.shop = null;
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

  /* ===================== 旅の会話 =====================
   * 町で交わされる仲間どうしのやりとり。本筋には絡まないが、
   * 誰が誰を見ているかは、こちらに書いてある。 */

  /** 今の章と加入状況で読める会話を返す */
  function partyTalks(state) {
    var c = chapter(state);
    if (!c || !c.party) return [];
    var joined = (state.party || []).map(function (m) { return m.allyId; })
      .filter(function (x) { return !!x; });
    return c.party.filter(function (t) {
      return (t.by || []).every(function (id) { return joined.indexOf(id) >= 0; });
    }).map(function (t) {
      return { by: t.by, lines: fillLines(t.lines, state) };
    });
  }

  /* ===================== 頼まれごと =====================
   *
   * 町の人が持ちかける小さな用事。本筋には関わらない。
   * 受けるのも断るのも自由で、断っても何も減らない。
   * 「やってもやらなくてもいいことがある」のが、町が町に見える最小の条件。 */

  function qbook(state) {
    if (!state.story.errands) state.story.errands = { taken: {}, done: {} };
    return state.story.errands;
  }

  /** この町で、今かかっている用事を返す（受ける前のものも含む） */
  function errandsAt(state, townId) {
    var q = qbook(state), ch = state.story.ch;
    return (G.ERRANDS || []).filter(function (x) {
      if (x.town !== townId) return false;
      if (q.done[x.id]) return false;
      /* 章が進んでも、取り逃した用事は残す。町を素通りした人を罰しない。 */
      return x.ch <= ch;
    });
  }

  function errandTaken(state, id) { return !!qbook(state).taken[id]; }
  function errandDone(state, id) { return !!qbook(state).done[id]; }

  function takeErrand(state, id) {
    var q = qbook(state);
    if (q.taken[id] || q.done[id]) return false;
    q.taken[id] = { n: 0 };
    return true;
  }

  /** 進み具合。{ have, need, ok } */
  function errandProgress(state, id) {
    var q = qbook(state), x = G.ERRAND_BY_ID && G.ERRAND_BY_ID[id];
    if (!x) return { have: 0, need: 1, ok: false };
    var have = 0;
    if (x.kind === 'kill') have = (q.taken[id] && q.taken[id].n) || 0;
    else if (x.kind === 'bring') have = (state.hero.items && state.hero.items[x.item]) || 0;
    return { have: Math.min(have, x.n), need: x.n, ok: have >= x.n };
  }

  /** 報告する。品を求める用事は、ここで手持ちから引く。 */
  function finishErrand(state, id) {
    var q = qbook(state), x = G.ERRAND_BY_ID && G.ERRAND_BY_ID[id];
    if (!x || !q.taken[id] || q.done[id]) return null;
    var pr = errandProgress(state, id);
    if (!pr.ok) return null;
    if (x.kind === 'bring') G.addItem(state.hero, x.item, -x.n);
    q.done[id] = true; delete q.taken[id];

    var got = { gold: 0, items: [], acc: null };
    var r = x.reward || {};
    if (r.gold) { state.hero.gold += r.gold; got.gold = r.gold; }
    (r.items || []).forEach(function (pair) {
      G.addItem(state.hero, pair[0], pair[1]);
      got.items.push({ ref: G.ITEM_BY_ID[pair[0]], n: pair[1] });
    });
    if (r.acc && G.ACC_BY_ID[r.acc]) {
      G.addAcc(state.hero, r.acc);
      got.acc = G.ACC_BY_ID[r.acc];
    }
    return got;
  }

  /** 戦闘のあとに呼ぶ。倒した相手を、受けている用事に数える。 */
  function noteKills(state, killIds) {
    if (!killIds) return [];
    var q = qbook(state), hit = [];
    Object.keys(q.taken).forEach(function (id) {
      var x = G.ERRAND_BY_ID && G.ERRAND_BY_ID[id];
      if (!x || x.kind !== 'kill') return;
      var n = killIds[x.target] || 0;
      if (!n) return;
      var before = q.taken[id].n;
      q.taken[id].n = Math.min(x.n, before + n);
      if (q.taken[id].n !== before) hit.push({ errand: x, n: q.taken[id].n });
    });
    return hit;
  }

  /* ===================== 宿 ===================== */

  function inn(state, cost) {
    if (state.hero.gold < cost) return false;
    state.hero.gold -= cost;
    G.Run.healParty(state, 1);
    return true;
  }

  /** 宿の夜に一つだけ流れる話。無ければ null。
   *  同じ話は二度出さず、その場に居ない仲間の話は出さない。 */
  function innTalk(state) {
    if (!G.INN_TALKS) return null;
    if (!state.story.flags) state.story.flags = {};
    var here = {};
    (state.party || [state.hero]).forEach(function (m) { if (m.allyId) here[m.allyId] = true; });
    var pool = G.INN_TALKS.filter(function (x) {
      if (state.story.flags['inn_' + x.id]) return false;
      if (x.ch > state.story.ch) return false;
      return (x.need || []).every(function (id) { return here[id]; });
    });
    if (!pool.length) return null;
    /* 今いる章にいちばん近い話から出す。
     * 古い話から順に消化すると、第六章の宿で第一章の世間話をすることになる。 */
    pool.sort(function (a, b) {
      return (b.ch - a.ch) || ((b.need || []).length - (a.need || []).length);
    });
    var got = pool[0];
    state.story.flags['inn_' + got.id] = true;
    return { id: got.id, lines: fillLines(got.lines, state) };
  }

  return {
    begin: begin, chapter: chapter, chapterOf: chapterOf, placeMoved: placeMoved,
    places: places, place: place, placeOpen: placeOpen,
    fill: fill, fillLines: fillLines,
    enterDungeon: enterDungeon, leaveDungeon: leaveDungeon, rollStash: rollStash,
    paths: paths, curPath: curPath, takePath: takePath,
    nextEncounter: nextEncounter, advanceDungeon: advanceDungeon,
    echoCount: echoCount, echoReward: echoReward,
    chapterDone: chapterDone, nextChapter: nextChapter, joinForChapter: joinForChapter,
    partyTalks: partyTalks,
    errandsAt: errandsAt, errandTaken: errandTaken, errandDone: errandDone,
    takeErrand: takeErrand, errandProgress: errandProgress,
    finishErrand: finishErrand, noteKills: noteKills,
    inn: inn, innTalk: innTalk
  };
})();
