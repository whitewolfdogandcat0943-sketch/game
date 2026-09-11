/* screens.js - 画面描画 */
G.Screens = (function () {
  var U = G.U, UI = G.UI;
  function $screen() { return document.getElementById('screen'); }
  function render(html) { $screen().innerHTML = html; UI.runInfo(G.state); }

  /* ===================== タイトル ===================== */
  function title(state, hasSave) {
    var m = state.meta;
    var h = '<div class="title-hero"><h1>相剋のビルドサーガ</h1>' +
      '<p class="muted">アクセサリ4枠・属性・会心・反射・範囲・アイテム —— 組み合わせが職業を拓く</p></div>';
    h += '<div class="panel center">';
    if (hasSave) h += '<button class="btn primary" data-act="continue">冒険を再開する</button> ';
    h += '<button class="btn" data-act="newgame">新しい冒険をはじめる</button> ';
    h += '<button class="btn" data-act="codex">図鑑を見る</button>';
    h += '</div>';
    h += '<div class="panel"><h3>記録</h3><div class="grid g4">' +
      kv('到達最深階層', m.bestFloor + 'F') + kv('挑戦回数', m.runs + '回') +
      kv('発見したミシック', m.mythics.length + ' / ' + G.MYTHICS.length) +
      kv('到達した職業', m.classesSeen.length + ' / ' + G.CLASS_LIST.filter(function (c) { return c.tier > 1; }).length) +
      '</div></div>';
    h += '<div class="panel"><h3>このゲームの遊び方</h3>' + helpHtml() + '</div>';
    render(h);
  }
  function kv(k, v) { return '<div class="kv"><span>' + k + '</span><span>' + v + '</span></div>'; }

  function helpHtml() {
    return '<ul class="tips">' +
      '<li><b>ビルドが全て。</b> 装備・アクセサリ4枠・職業パッシブの組み合わせで、会心／反射／範囲／属性／アイテムなど戦い方が根本から変わります。</li>' +
      '<li><b>職業は条件解放。</b> 初級職からはじめ、ビルドの数値条件（例: 会心率35%以上）を満たすと<span class="r-legend">上級職</span>へ、さらに厳しい条件で<span class="r-mythic">最上級職</span>へ転職できます。転職は「転職の祭壇」で行います。</li>' +
      '<li><b>スキルは引き継がれます。</b> 一度就いた職業のスキルは転職後も使えます（前職の基礎能力も15%引き継ぎ）。</li>' +
      '<li><b>アクセサリは3階級。</b> <span class="r-normal">通常</span>＝素直な強化、<span class="r-legend">レジェンド</span>＝クセの強い特殊効果、<span class="r-mythic">ミシック</span>＝戦闘中の特殊条件を満たすと「発見」され、以後の冒険にも永続的に引き継がれます。</li>' +
      '<li><b>パーティで戦う。</b> 主人公のほかに最大3人の仲間が加わります。仲間は自動で動き、回復・かばう・蘇生など役割どおりに振る舞います。操作するのは主人公だけ。</li>' +
      '<li><b>特殊攻撃が戦術になる。</b> 溜め・反撃の構え・かばう・刻印・封印・打ち消し・蘇生・連携追撃など、数値ではなく「仕掛け」で状況を動かす技が多数あります。</li>' +
      '<li><b>2つのモード。</b> <b>物語</b>は全6章、町とダンジョンを行き来しながら進みます（全滅しても所持金を半分失うだけで再開できます）。<b>試練の塔</b>は25階の登り切り勝負で、倒れればそこで終わりです。</li>' +
      '<li><b>記録は残ります。</b> 発見したミシックと解放した職業は、どちらのモードでも永続的に記録されます。</li>' +
      '</ul>';
  }

  /* ===================== 職業選択 ===================== */
  function classSelect(state) {
    var h = '<h1>はじまりの職を選ぶ</h1><p class="muted">どの初級職から始めても、ビルド次第で全ての上級職・最上級職へ到達できます。</p>';
    h += '<div class="panel"><h3>名前</h3><input id="heroName" class="btn wide" style="cursor:text" maxlength="12" placeholder="冒険者" value="冒険者"></div>';
    h += '<div class="grid g2">';
    G.STARTER_CLASSES.forEach(function (id) {
      var c = G.CLASSES[id];
      h += '<div class="card" data-act="start:' + id + '">' +
        '<div class="row" style="gap:10px;align-items:flex-start">' +
        '<div class="class-face">' + G.Portraits.img(G.FACES.forHero({ classId: id }), 2) + '</div>' +
        '<div style="flex:1;min-width:0"><div class="cname" style="font-size:15px">' + c.name + '</div>' +
        '<div class="cdesc">' + c.desc + '<br><br>' +
        '<b>パッシブ:</b> ' + (UI.modsText(c.mods) || 'なし') + '<br>' +
        '<b>初期スキル:</b> ' + c.skills.map(function (s) { return G.SKILLS[s].name; }).join('・') + '</div></div></div></div>';
    });
    h += '</div>';
    h += '<div class="panel"><h3>到達しうる最上級職</h3><div class="grid g2">' +
      G.CLASS_LIST.filter(function (c) { return c.tier === 3; }).map(function (c) {
        return '<div class="card locked"><div class="classcard-head">' + G.Gfx.classImg(c.id, 3) +
          '<div class="cname r-mythic">' + c.name + '</div></div>' +
          '<div class="cdesc">' + c.desc + '</div></div>';
      }).join('') + '</div></div>';
    h += diffRow(state);
    render(h);
  }


  /* ===================== 物語モード ===================== */

  /** 難易度の選択。カード表示（開始前）と一行表示（冒険中）の2形態。 */
  function diffCards(state) {
    var cur = state.diff || 'normal';
    var h = '<div class="panel"><h3>難易度</h3>' +
      '<p class="tiny muted">敵の強さだけでなく、取り巻きの数・狙われ方・終盤のボスの動きまで変わる。' +
      'あとから町（塔なら焚き火）でいつでも変えられる。</p><div class="sep"></div><div class="grid g4">';
    G.DIFFS.forEach(function (d) {
      h += '<div class="card' + (d.id === cur ? ' sel' : '') + '" data-act="setDiff:' + d.id + '">' +
        '<div class="classcard-head"><div class="modeico">' + d.icon + '</div>' +
        '<div><div class="cname" style="font-size:15px">' + d.name +
        (d.id === cur ? ' <span class="tag">選択中</span>' : '') + '</div>' +
        '<div class="tiny muted">' + d.lead + '</div></div></div>' +
        '<div class="cdesc">' + d.desc + '</div>' +
        '<div class="diffnote">' + diffNumbers(d) + '</div></div>';
    });
    h += '</div><p class="tiny muted" style="margin-top:8px">' +
      '「追撃」はボスの残りHPがその割合を切ってから、ラウンドの終わりにもう一撃入れてくるもの。' +
      '威力5割の単体攻撃だけで、全体技や自己回復には使わない。' +
      '相剋のボス倍率が標準より低いのは、追撃で受ける総ダメージのぶんを差し引いているため。</p>';
    return h + '</div>';
  }

  /** 難易度の中身を数字で見せる。何が変わるのか分からないまま選ばせない。 */
  function diffNumbers(d) {
    function pct(v) { return (v >= 1 ? '+' : '') + Math.round((v - 1) * 100) + '%'; }
    var acts = d.bossFollow ? '残りHP' + Math.round(d.bossFollow * 100) + '%から' : 'なし';
    var out = ['敵HP ' + pct(d.ehp) + ' / 敵の火力 ' + pct(d.epw),
               'ボスHP ' + pct(d.bhp) + ' / ボスの火力 ' + pct(d.bpw),
               'ボスの追撃 ' + acts,
               '経験値・金 ' + pct(d.rw) + (d.drop ? ' / レア率 +' + Math.round(d.drop * 100) + '%' : '')];
    if (d.playerDr) out.push('こちらの被ダメージ -' + Math.round(d.playerDr * 100) + '%');
    return out.join('<br>');
  }

  /** 冒険中に難易度を切り替える一行。町から呼ぶ。 */
  function diffRow(state) {
    var cur = state.diff || 'normal';
    var h = '<div class="panel"><div class="row" style="justify-content:space-between;align-items:center">' +
      '<h3 style="margin:0">難易度</h3>' +
      '<span class="tiny muted">次の戦闘から変わる</span></div><div class="sep"></div>' +
      '<div class="diffbar">';
    G.DIFFS.forEach(function (d) {
      h += '<button class="btn tiny' + (d.id === cur ? ' sel' : '') + '" data-act="setDiff:' + d.id + '">' +
        d.icon + ' ' + d.name + '</button>';
    });
    h += '</div><div class="diffnote">' + diffNumbers(G.DIFF_BY_ID[cur]) + '</div></div>';
    return h;
  }

  /** 見出しに出す難易度の札 */
  function diffTag(state) {
    var d = G.DIFF_BY_ID[state.diff || 'normal'];
    return '<span class="tag">' + d.icon + ' ' + d.name + '</span>';
  }

  /** 遊び方の入口。物語と試練の塔を選ぶ。 */
  function modeSelect(state, hasSave) {
    var m = state.meta;
    var h = '<div class="title-hero"><h1>相剋のビルドサーガ</h1>' +
      '<p class="muted">褪せていく世界を、組み上げたビルドで刻み直す</p></div>';
    if (hasSave) {
      h += '<div class="panel center"><button class="btn primary" data-act="continue">冒険を再開する</button></div>';
    }
    h += '<div class="grid g2">';
    h += '<div class="card" data-act="storyStart">' +
      '<div class="classcard-head"><div class="modeico">📖</div><div class="cname" style="font-size:16px">物語をはじめる</div></div>' +
      '<div class="cdesc">全6章。仲間と旅をしながら、褪せの原因を追う。' +
      '町で装備を整え、ダンジョンに潜り、章の主を討つ。<br><br>' +
      '<b>主人公:</b> ' + G.STORY.HERO.title + '（剣士）／ <b>仲間:</b> 最大3人<br>' +
      '<b>推奨:</b> はじめての人はこちら。</div></div>';
    h += '<div class="card" data-act="towerStart">' +
      '<div class="classcard-head"><div class="modeico">🗼</div><div class="cname" style="font-size:16px">試練の塔</div></div>' +
      '<div class="cdesc"><b>世界樹ユグドラシルを登る。</b>' +
      '九つの世界を抜け、25階の登り切り勝負。道は毎回変わり、倒れればそこで終わり。' +
      '物語とは別の神話で、敵も主もアクセサリも丸ごと違う。<br>' +
      '<span class="muted small">ミズガルズ → ニヴルヘイム → ムスペルヘイム → ' +
      'ヨトゥンヘイム → アースガルズ → ラグナロク</span><br><br>' +
      '<b>到達最深:</b> ' + m.bestFloor + 'F ／ <b>挑戦:</b> ' + m.runs + '回</div></div>';
    h += '</div>';
    h += diffCards(state);
    h += '<div class="panel center"><button class="btn" data-act="codex">図鑑を見る</button></div>';
    h += '<div class="panel"><h3>記録</h3><div class="grid g4">' +
      kv('到達最深階層', m.bestFloor + 'F') + kv('挑戦回数', m.runs + '回') +
      kv('発見したミシック', m.mythics.length + ' / ' + G.MYTHICS.length) +
      kv('到達した職業', m.classesSeen.length + ' / ' + G.CLASS_LIST.filter(function (c) { return c.tier > 1; }).length) +
      '</div></div>';
    h += '<div class="panel"><h3>このゲームの遊び方</h3>' + helpHtml() + '</div>';
    render(h);
  }

  /** 主人公の名前を決める（物語モード） */
  function storyIntro(state) {
    var H = G.STORY.HERO;
    var h = '<h1>物語のはじまり</h1>';
    h += '<div class="panel"><div class="row" style="gap:16px;align-items:flex-start">' +
      G.Portraits.img(G.FACES.forHero({ classId: H.classId }), 3) +
      '<div style="flex:1"><div class="cname" style="font-size:16px">' + H.title + '</div>' +
      '<div class="muted small">' + H.intro + '</div></div></div>';
    h += '<div class="sep"></div><h3>名前</h3>' +
      '<input id="heroName" class="btn wide" style="cursor:text" maxlength="12" placeholder="' +
      H.defaultName + '" value="' + H.defaultName + '">' +
      '<div class="sep"></div>' +
      '<button class="btn primary wide" data-act="storyBegin">旅に出る</button></div>';
    h += diffRow(state);
    h += '<div class="panel"><h3>この世界のこと</h3>' +
      G.STORY.LORE.map(function (l) {
        return '<div class="kv"><span>' + l.t + '</span><span class="muted" style="text-align:right;max-width:70%">' + l.d + '</span></div>';
      }).join('') + '</div>';
    render(h);
  }

  /** 会話。1行ずつ送る。 */
  function scene(state) {
    var sc = state.scene;
    if (!sc) { render('<div class="panel">…</div>'); return; }
    var shown = sc.lines.slice(0, sc.i + 1);
    var h = '<div class="scene">';
    h += '<div class="scene-head"><span class="muted small">' + (sc.title || '') + '</span></div>';

    /* 立ち絵。直近に喋った二人を並べ、今喋っていない側を沈ませる。
     * 会話の相手が消えないので、掛け合いが読みやすい。 */
    var speaker = null, recent = [];
    for (var si = sc.i; si >= 0 && recent.length < 2; si--) {
      var w = sc.lines[si].w;
      if (w && recent.indexOf(w) < 0) recent.push(w);
    }
    speaker = recent[0] || null;
    var silent = !sc.lines[sc.i].w;
    /* 左に相手、右に話者。並び順を固定して視線が飛ばないようにする。 */
    var cast = recent.slice().reverse()
      .map(function (n) { return { name: n, face: G.FACES.byName(n, state) }; })
      .filter(function (x) { return !!x.face; });
    h += '<div class="scene-stage">';
    if (cast.length) {
      h += '<div class="scene-cast">';
      cast.forEach(function (c) {
        var active = (c.name === speaker) && !silent;
        /* 会話は顔が読めることが全て。ここだけバストアップを使う。 */
        h += '<div class="scene-portrait' + (active ? ' active' : ' quiet') + '">' +
          G.Portraits.dialogImg(c.face, 196) +
          '<div class="pname">' + U.esc(c.name) + '</div></div>';
      });
      h += '</div>';
    }
    h += '<div class="scene-body">';
    shown.forEach(function (l, i) {
      var last = (i === shown.length - 1);
      if (!l.w) {
        h += '<p class="narration' + (last ? ' now' : '') + '">' + U.esc(l.t) + '</p>';
      } else {
        h += '<p class="line' + (last ? ' now' : '') + '"><b class="who">' + U.esc(l.w) + '</b>' +
          '<span class="say">' + U.esc(l.t) + '</span></p>';
      }
    });
    h += '</div></div>';
    var more = sc.i < sc.lines.length - 1;
    h += '<div class="scene-foot">' +
      '<button class="btn primary" data-act="sceneNext">' + (more ? '▼ つづける' : '▶ ' + (sc.endLabel || '進む')) + '</button>' +
      (more ? ' <button class="btn tiny" data-act="sceneSkip">最後まで読む</button>' : '') +
      '</div></div>';
    render(h);
  }

  /* ボスの仕掛けの「今の状態」を出す。
   * 鎧が張られているのか、空にいるのか、写し身なのかが見えないと、
   * 手を持ち替える判断ができず、ただの理不尽になる。 */
  function gimChips(e) {
    var out = [];
    if (e.shellOn) {
      var w = (e.gim && e.gim.word) || '鎧';
      out.push('<span class="tag" style="background:#3a2a12;color:#e8b552">🛡 ' + w +
        ' ' + (e.gimState.shell || 0) + '</span>');
    }
    if (e.aloft) out.push('<span class="tag" style="background:#12283a;color:#6fc3f5">🌪 飛翔中（物理が届かない）</span>');
    if (e.bornOf) out.push('<span class="tag muted">写し身</span>');
    if (e.gim && e.gim.kind === 'clones' && e.hp > 0) {
      out.push('<span class="tag" style="background:#2a1235;color:#d08bf5">🪞 本体</span>');
    }
    return out.length ? '<div class="tiny" style="margin-top:3px">' + out.join(' ') + '</div>' : '';
  }

  /** 章の地図。町とダンジョンを選ぶ。 */
  function world(state) {
    var c = G.Story.chapter(state);
    var st = state.story;
    G.Fx.applyBackground(c ? c.lv : 1);
    var h = '<h1>第' + c.id + '章 <span class="muted small">' + c.title + '</span>' +
      (st.done ? ' <span class="r-mythic">― 旅の終わりのあとで ―</span>' : '') +
      ' ' + diffTag(state) + '</h1>';
    h += '<p class="muted">' + (G.Story.chapterDone(state)
      ? 'この章でやるべきことは終わった。先へ進める。'
      : '行き先を選べ。町では備え、ダンジョンでは戦う。') + '</p>';

    h += '<div class="grid g3">';
    G.Story.places(state).forEach(function (p) {
      var r = p.ref;
      var echo = p.cleared && r.kind === 'dungeon' ? G.Story.echoCount(state, r.id) : 0;
      var isEcho = p.cleared && r.kind === 'dungeon';
      if (p.locked) {
        var gate = G.Story.place(r.need);
        h += '<div class="node locked">' +
          '<div class="node-ico big-ico">🔒</div>' +
          '<div class="nn">' + r.name + ' <span class="tag">閉じている</span></div>' +
          '<div class="nd">' + (gate ? gate.name + ' を抜けるまで、ここへの道は開かない。' : 'まだ行けない。') +
          '</div></div>';
        return;
      }
      h += '<div class="node' + (p.cleared ? ' done' : '') + '" data-act="place:' + r.id + '">' +
        '<div class="node-ico big-ico">' + r.icon + '</div>' +
        '<div class="nn">' + r.name +
        (isEcho ? ' <span class="tag r-mythic">残響' + (echo ? ' ×' + echo : '') + '</span>'
                : (p.cleared ? ' <span class="tag">踏破</span>' : '')) + '</div>' +
        '<div class="nd">' + (isEcho
          ? '踏破した場所に、別の主が現れている。道中は無く、いきなり主と戦う。' +
            '挑むほど相手は強くなり、経験値と金は減る（今 ' +
            Math.round(G.Story.echoReward(state, r.id) * 100) + '%）。報酬の3択はそのまま。'
          : r.desc) + '</div></div>';
    });
    h += '</div>';

    if (G.Story.chapterDone(state) && !st.done) {
      h += '<div class="panel center"><button class="btn primary" data-act="chapterNext">次の章へ進む</button></div>';
    }
    if (st.done) {
      h += '<div class="panel center"><p class="muted">物語は終わった。鍛えたビルドのまま、試練の塔に挑める。</p>' +
        '<button class="btn primary" data-act="towerFromStory">試練の塔へ挑む</button></div>';
    }
    h += partyPanel(state);
    h += '<div class="panel"><div class="row" style="justify-content:space-between;align-items:center">' +
      '<h3 style="margin:0">現在のビルド</h3>' +
      '<div><button class="btn tiny" data-act="buildOpen">装備を組み替える</button> ' +
      '<button class="btn tiny" data-act="treeOpen">スキルツリー' +
      (state.hero.sp ? ' <span class="r-legend">+' + state.hero.sp + '</span>' : '') + '</button> ' +
      '<button class="btn tiny" data-act="altarPreview">転職条件を見る</button></div></div>';
    h += '<div class="sep"></div>' + stylePanel(state) + '</div>';
    render(h);
  }

  /** パーティの状態一覧（地上用） */
  function partyPanel(state) {
    var party = state.party || [state.hero];
    var h = '<div class="panel"><h3>パーティ</h3><div class="grid g2">';
    party.forEach(function (m) {
      var S = G.Stats.compute(m).S;
      h += '<div class="card member-card" style="cursor:default">' +
        '<div class="row" style="gap:10px;align-items:flex-start">' +
        '<div class="member-face">' + G.Portraits.img(G.FACES.forMember(m), 2) + '</div>' +
        '<div style="flex:1;min-width:0">' +
        '<div class="cname">' + U.esc(m.name) + '</div>' +
        '<div class="muted tiny">Lv' + m.level + ' ' + G.CLASSES[m.classId].name +
        (m.role ? ' / ' + m.role : '') + '</div>' +
        '<div style="margin-top:6px">' + UI.bar(m.hp, S.maxHp, 'hp', 'HP') +
        '<div style="height:4px"></div>' + UI.bar(m.mp, S.maxMp, 'mp', 'MP') + '</div>' +
        '</div></div></div>';
    });
    h += '</div></div>';
    return h;
  }

  /** 町。宿・店・祭壇・立ち話。 */
  function town(state) {
    var t = G.Story.place(state.story.place);
    var h = '<h1>' + t.icon + ' ' + t.name + '</h1><p class="muted">' + t.desc + '</p>';
    h += '<div class="panel"><div class="row" style="gap:8px;flex-wrap:wrap">';
    if (t.inn) h += '<button class="btn primary" data-act="inn:' + t.inn + '">宿に泊まる（' + t.inn + 'G・全員全回復）</button>';
    if (t.shop) h += '<button class="btn" data-act="townShop">道具屋</button>';
    if (t.altar) h += '<button class="btn" data-act="altar">転職の祭壇</button>';
    h += '<button class="btn" data-act="buildOpen">装備を組み替える</button>';
    h += '<button class="btn" data-act="treeOpen">スキルツリー' +
      (state.hero.sp ? ' <span class="r-legend">+' + state.hero.sp + '</span>' : '') + '</button>';
    if (t.tower) h += '<button class="btn" data-act="towerFromStory">試練の塔へ</button>';
    h += '<button class="btn" data-act="toWorld" style="margin-left:auto">町を出る</button>';
    h += '</div></div>';
    h += '<div class="panel"><h3>街の声</h3>' +
      (t.talks || []).map(function (x) {
        return '<p class="line"><b class="who">' + U.esc(x.who) + '</b><span class="say">' +
          U.esc(G.Story.fill(x.t, state)) + '</span></p>';
      }).join('') + '</div>';

    /* 仲間どうしのやりとり。町でだけ聞ける。 */
    var pt = G.Story.partyTalks(state);
    if (pt.length) {
      h += '<div class="panel"><h3>旅の話</h3>' +
        '<p class="tiny muted">道中で交わされた、本筋とは関係のないやりとり。</p>';
      pt.forEach(function (conv, i) {
        h += '<div class="talk' + (i ? ' sep-top' : '') + '">' +
          conv.lines.map(function (l) {
            if (!l.w) return '<p class="narration">' + U.esc(l.t) + '</p>';
            return '<p class="line"><b class="who">' + U.esc(l.w) + '</b>' +
              '<span class="say">' + U.esc(l.t) + '</span></p>';
          }).join('') + '</div>';
      });
      h += '</div>';
    }
    h += diffRow(state);
    h += partyPanel(state);
    render(h);
  }

  /** ダンジョン内の進行画面 */
  function dungeon(state) {
    var dg = state.story.dungeon;
    var d = G.Story.place(dg.id);
    G.Fx.applyBackground(d.lv);
    var last = dg.at >= dg.depth - 1;
    var h = '<h1>' + d.icon + ' ' + d.name +
      (dg.echo
        ? ' <span class="r-mythic small">― 残響 ' + dg.echo + '回目 ―</span>'
        : ' <span class="muted small">― ' + Math.min(dg.at + 1, dg.depth) + ' / ' + dg.depth + ' ―</span>') +
      '</h1>';
    h += '<p class="muted">' + (dg.echo
      ? '踏破したはずの場所に、別の主が立っている。何が出るかは踏み込むまで分からない。'
      : d.desc) + '</p>';
    h += '<div class="panel"><div class="depth">';
    for (var i = 0; i < dg.depth; i++) {
      var cls = i < dg.at ? 'done' : (i === dg.at ? 'now' : '');
      h += '<span class="depth-dot ' + cls + '">' + (i === dg.depth - 1 ? '👑' : '·') + '</span>';
    }
    h += '</div>';
    h += '<div class="center" style="margin-top:12px">' +
      '<button class="btn primary" data-act="dungeonGo">' +
      (dg.echo ? '⚔ 残響の主に挑む' : (last ? '⚔ 主に挑む' : '⚔ 奥へ進む')) + '</button> ' +
      '<button class="btn" data-act="dungeonLeave">引き返す</button></div></div>';
    if (dg.stash) {
      h += '<div class="panel"><h3>🎁 ' + dg.stash.place + '</h3>' +
        '<p class="muted small">物資が残されていた。' +
        (dg.stash.gold ? '（' + dg.stash.gold + 'G）' : '') + '</p><div class="grid g3">' +
        dg.stash.items.map(function (x) {
          return UI.itemCard(x.ref, null, x.rare
            ? { note: '<span class="r-legend">✦ レアアイテム</span>', cls: 'bd-legend' } : null);
        }).join('') + '</div></div>';
    }
    h += partyPanel(state);
    render(h);
  }

  /* ===================== マップ ===================== */
  function map(state) {
    var run = state.run, hero = state.hero, S = G.Stats.compute(hero).S;
    G.Fx.applyBackground(run.floor);
    var h = '<h1>第 ' + run.floor + ' 階層 <span class="muted small">' + G.Fx.bandName(run.floor) + '</span>' +
      (G.Run.isBossFloor(run.floor) ? ' <span class="r-mythic">― 主の間 ―</span>' : '') +
      ' ' + diffTag(state) + '</h1>';
    h += '<p class="muted">進む道を選べ。' + (G.Run.isBossFloor(run.floor) ? '逃げ道はない。' : '同じ階層で複数の道は選べない。') + '</p>';
    h += '<div class="grid g3">';
    run.nodes.forEach(function (n, i) {
      h += '<div class="node" data-act="node:' + i + '">' + G.Gfx.nodeImg(n.kind, 3) +
        '<div class="nn">' + n.name + '</div><div class="nd">' + n.desc + '</div></div>';
    });
    h += '</div>';
    h += '<div class="panel"><div class="row" style="justify-content:space-between;align-items:center">' +
      '<h3 style="margin:0">現在のビルド</h3>' +
      '<div><button class="btn tiny" data-act="buildOpen">装備を組み替える</button> ' +
      '<button class="btn tiny" data-act="treeOpen">スキルツリー' +
      (hero.sp ? ' <span class="r-legend">+' + hero.sp + '</span>' : '') + '</button> ' +
      '<button class="btn tiny" data-act="altarPreview">転職条件を見る</button></div></div>';
    h += '<div class="sep"></div>';
    h += '<div class="grid g2"><div>' + UI.bar(hero.hp, S.maxHp, 'hp', 'HP') + '<div style="height:6px"></div>' +
      UI.bar(hero.mp, S.maxMp, 'mp', 'MP') + '<div style="height:6px"></div>' +
      UI.bar(hero.exp, G.Stats.expToNext(hero.level), 'xp', '次のレベルまで') + '</div>';
    h += '<div>' + buildSummary(state) + '</div></div>';
    h += '<div class="sep"></div>' + stylePanel(state);
    h += '</div>';
    render(h);
  }

  /* ===================== メンバー切替 =====================
   * 装備・祭壇・スキルツリーは「誰のビルドを見ているか」を持つ。
   * 仲間も転職して装備を組むので、主人公と同じ画面をそのまま使う。 */

  /** その装備を誰が着けているかを一言で返す */
  function whoHas(state, id, kind, exceptMember, exceptSlot) {
    var names = [];
    (state.party || [state.hero]).forEach(function (m) {
      if (!m.equip) return;
      if (kind === 'acc') {
        (m.equip.acc || []).forEach(function (x, i) {
          if (x !== id) return;
          if (m === exceptMember && i === exceptSlot) return;
          if (names.indexOf(m.name) < 0) names.push(m.name);
        });
      } else if (m.equip[kind] === id) {
        if (m === exceptMember && exceptSlot === kind) return;
        if (names.indexOf(m.name) < 0) names.push(m.name);
      }
    });
    return names.length ? '<span class="muted">' + U.esc(names.join('・')) + ' が装備中</span>'
                        : '<span class="muted">装備中</span>';
  }

  /** 今ビルドを編集している相手 */
  function target(state) {
    var list = state.party || [state.hero];
    var i = Math.min(state.buildIdx || 0, list.length - 1);
    return list[Math.max(0, i)] || state.hero;
  }

  /** メンバーを選ぶ帯。1人しかいないときは出さない。 */
  function memberTabs(state) {
    var list = state.party || [state.hero];
    if (list.length < 2) return '';
    var cur = target(state);
    return '<div class="row memtabs" style="gap:6px;margin-bottom:10px;flex-wrap:wrap">' +
      list.map(function (m, i) {
        var on = (m === cur);
        return '<button class="btn tiny' + (on ? ' primary' : '') + '" data-act="buildWho:' + i + '">' +
          U.esc(m.name) + ' <span class="muted">' + G.CLASSES[m.classId].name + '</span>' +
          (m.sp ? ' <span class="r-legend">+' + m.sp + '</span>' : '') + '</button>';
      }).join('') + '</div>';
  }

  /** 戦い方（行動の実績）と、アクセ構成のスタイルを並べて見せる */
  function stylePanel(state, who) {
    var m = who || target(state);
    var rec = G.Style.behaviourOf(m), sh = G.Style.shares(rec);
    var acc = G.Style.accShares(m);
    var rows = G.Style.AXIS_IDS.map(function (ax) {
      return { ax: ax, b: rec[ax] || 0, bs: sh.share[ax], a: acc.score[ax], as: acc.share[ax] };
    }).sort(function (x, y) { return (y.b + y.a) - (x.b + x.a); });

    var h = '<div class="grid g2"><div><h3 class="small">戦い方（上級職の解放条件）</h3>' +
      '<div class="tiny muted" style="margin-bottom:6px">実際にどう戦ったかが積み上がる。</div>';
    rows.forEach(function (r) {
      if (r.b <= 0) return;
      h += '<div class="kv"><span class="' + G.Style.axisClass(r.ax) + '">' + G.Style.axisName(r.ax) +
        '</span><span>' + r.b + '　<span class="muted">' + Math.round(r.bs * 100) + '%</span></span></div>';
    });
    if (sh.total <= 0) h += '<div class="muted small">まだ戦っていない。</div>';
    h += '</div><div><h3 class="small">アクセサリ構成（最上級職の解放条件）</h3>' +
      '<div class="tiny muted" style="margin-bottom:6px">装備中の4枠だけを見た構成。</div>';
    rows.forEach(function (r) {
      if (r.a <= 0) return;
      h += '<div class="kv"><span class="' + G.Style.axisClass(r.ax) + '">' + G.Style.axisName(r.ax) +
        '</span><span>' + Math.round(r.a) + '　<span class="muted">' + Math.round(r.as * 100) + '%</span></span></div>';
    });
    if (acc.total <= 0) h += '<div class="muted small">アクセサリを装備していない。</div>';
    h += '</div></div>';
    return h;
  }

  /** ビルドの特徴を一行で要約 */
  function buildSummary(state) {
    var c = G.Stats.compute(state.hero), S = c.S;
    var axes = [
      { k: '会心', v: S.critRate * 100 + (S.critDmg - 1.5) * 40 },
      { k: '反射', v: S.reflect * 160 + S.reflectPow * 60 },
      { k: '範囲', v: S.aoeRatio * 130 + S.aoePower * 90 },
      { k: '属性', v: G.MAGIC_ELEMENTS.reduce(function (a, e) { return a + S['el_' + e]; }, 0) * 90 + S.pierce * 60 },
      { k: 'アイテム', v: S.itemPower * 110 + S.itemKeep * 90 },
      { k: '吸収', v: S.lifesteal * 200 },
      { k: '堅守', v: S.dr * 200 + S.defPct * 40 },
      { k: '速攻', v: S.spd * 1.2 + S.evade * 200 },
      { k: '支援', v: S.buffPower * 130 + S.buffTurns * 45 },
      { k: '弱体', v: S.debuffPower * 130 + S.debuffTurns * 45 },
      { k: '呪詛', v: S.dotPower * 130 + S.dotTurns * 45 }
    ].sort(function (a, b) { return b.v - a.v; });
    var top = axes.filter(function (a) { return a.v > 6; }).slice(0, 3).map(function (a) { return a.k; });
    var accs = G.Stats.equippedAccs(state.hero);
    return '<div class="kv"><span>ビルド傾向</span><span>' + (top.length ? top.join(' × ') : '未確立') + '</span></div>' +
      '<div class="kv"><span>アクセサリ</span><span>' +
      '<span class="r-normal">通常' + accs.filter(function (a) { return a.rarity === 'normal'; }).length + '</span> / ' +
      '<span class="r-legend">伝説' + accs.filter(function (a) { return a.rarity === 'legend'; }).length + '</span> / ' +
      '<span class="r-mythic">神話' + accs.filter(function (a) { return a.rarity === 'mythic'; }).length + '</span></span></div>' +
      '<div class="kv"><span>会心 / 反射</span><span>' + U.pct(S.critRate) + ' / ' + U.pct(S.reflect) + '</span></div>' +
      '<div class="kv"><span>波及 / 範囲威力</span><span>' + U.pct(S.aoeRatio) + ' / ' + U.sgnp(S.aoePower) + '</span></div>' +
      '<div class="kv"><span>アイテム威力</span><span>' + U.sgnp(S.itemPower) + '</span></div>' +
      ((S.buffPower || S.debuffPower)
        ? '<div class="kv"><span>強化 / 弱体の効果量</span><span>' +
          U.sgnp(S.buffPower) + ' / ' + U.sgnp(S.debuffPower) + '</span></div>' : '') +
      (S.dotPower
        ? '<div class="kv"><span>持続ダメージ</span><span>' + U.sgnp(S.dotPower) + '</span></div>' : '');
  }

  /* ===================== 戦闘 ===================== */
  function battle(state) {
    var b = state.battle;
    var where = state.run.floor + 'F';
    if (state.mode === 'story' && state.story && state.story.dungeon) {
      var dgp = G.Story.place(state.story.dungeon.id);
      if (dgp) where = dgp.name + ' ' + Math.min(state.story.dungeon.at + 1, state.story.dungeon.depth) +
        '/' + state.story.dungeon.depth;
    }
    var h = '<h1>戦闘 <span class="muted small">― ' + where + ' ― ラウンド ' + b.round + '</span>' +
      (b.rage ? ' <span class="r-mythic small">🔥 激昂 +' + Math.round(b.rage * 100) + '%</span>' : '') + '</h1>';

    h += '<div class="enemies">';
    b.enemies.forEach(function (e, i) {
      var sel = (state.targetIdx === i) ? 'style="outline:2px solid var(--danger)"' : '';
      h += '<div class="unit ' + (e.hp > 0 ? 'target' : 'dead') + '" ' + sel +
        ' data-unit="' + e.idx + '" data-act="selectTarget:' + i + '">' +
        '<div class="un"><span>' + e.name + '</span>' +
        '<span class="lvtag">' + (e.isBoss ? 'BOSS' : '') + '</span></div>' +
        '<div class="sprwrap">' + G.Gfx.enemyImg(e.ref.id, e.isBoss ? 5 : 4, e.hp > 0 ? (e.isBoss ? 'boss' : 'idle') : '') + '</div>' +
        UI.bar(e.hp, e.S.maxHp, 'hp', '') +
        '<div class="tiny muted" style="margin-top:3px">弱点: ' + (e.weak.length ? e.weak.map(G.elSpan).join(' ') : 'なし') +
        '<br>耐性: ' + (e.resist.length ? e.resist.map(G.elSpan).join(' ') : 'なし') + '</div>' +
        gimChips(e) +
        '<div class="sts">' + statusChips(e) + '</div>' +
        '</div>';
    });
    h += '</div>';

    h += '<div class="grid g2" style="margin-top:10px"><div class="party">';
    G.Battle.partyUnits(b).forEach(function (m, mi) {
      var isActor = (b.actor === m);
      var cls = 'unit member' + (m.hp > 0 ? '' : ' dead') + (isActor ? ' acting' : '') +
        (state.allyIdx === mi ? ' picked' : '');
      h += '<div class="' + cls + '" data-unit="' + m.idx + '" data-act="selectAlly:' + mi + '">' +
        '<div class="un" style="font-size:12px"><span>' + U.esc(m.name) +
        ' <span class="muted">Lv' + m.hero.level + ' ' + G.CLASSES[m.hero.classId].name + '</span></span>' +
        (m.coveredBy ? '<span class="tag">🛡かばわれ</span>' : '') +
        (m.coverFor ? '<span class="tag">🛡かばう</span>' : '') +
        (m.counter ? '<span class="tag">⚔構え</span>' : '') +
        (m.charge > 0 ? '<span class="tag">⚡溜め</span>' : '') +
        (m.barrier > 0 ? '<span class="tag">🛡 ' + m.barrier + '</span>' : '') + '</div>' +
        '<div class="row" style="gap:8px;align-items:center">' +
        '<div class="sprwrap tiny-spr">' + G.Gfx.memberImg(m.hero, 3, m.hp > 0 ? 'idle' : '') + '</div>' +
        '<div style="flex:1;min-width:0">' +
        UI.bar(m.hp, m.S.maxHp, 'hp', 'HP') + '<div style="height:4px"></div>' +
        UI.bar(m.mp, m.S.maxMp, 'mp', 'MP') +
        '<div class="sts" style="margin-top:4px">' + statusChips(m) + buffChips(m) + '</div>' +
        '</div></div>' +
        (mi === 0 ? '<div class="tiny muted" style="margin-top:5px">攻' + m.S.atk + ' 魔' + m.S.mag +
          ' 防' + m.S.def + ' 速' + m.S.spd + ' / 会心' + U.pct(m.S.critRate) +
          ' 反射' + U.pct(m.S.reflect) + ' 波及' + U.pct(m.S.aoeRatio) + '</div>' : '') +
        '</div>';
    });
    h += '</div>';
    h += '<div><div class="log" id="battleLog">' + b.log.slice(-60).map(function (l) {
      return '<div class="' + l.c + '">' + l.t + '</div>';
    }).join('') + '</div></div></div>';

    if (b.over) {
      h += '<div class="panel center"><button class="btn primary" data-act="battleEnd">' +
        (b.result === 'win' ? '戦利品を確認する' : (b.result === 'flee' ? '引き返す' : '結果を見る')) + '</button></div>';
    } else {
      var actorName = (b.actor && b.actor !== b.hero)
        ? '<span class="r-legend tiny" style="align-self:center">' + U.esc(b.actor.name) + ' の手番</span>' : '';
      h += '<div class="panel"><div class="row" style="gap:6px">' +
        actorName + tabBtn(state, 'skill', 'スキル') + tabBtn(state, 'item', 'アイテム') +
        (G.Battle.canFlee(b)
          ? '<button class="btn tiny" data-act="flee">逃げる（' +
            Math.round(G.Battle.fleeChance(b) * 100) + '%）</button>'
          : '<span class="muted tiny" style="align-self:center">逃走不可</span>') +
        '<span class="muted tiny" style="margin-left:auto;align-self:center">敵: ' +
        (b.enemies[state.targetIdx] && b.enemies[state.targetIdx].hp > 0 ? b.enemies[state.targetIdx].name : '自動') +
        ' ／ 味方: ' + (G.Battle.partyUnits(b)[state.allyIdx || 0] || { name: '自身' }).name +
        '（それぞれクリックで変更）</span>' +
        '</div><div class="actions">';
      if (state.battleTab === 'item') h += itemActions(state);
      else h += skillActions(state);
      h += '</div></div>';
    }
    G.Fx.applyBackground(state.run.floor);
    render(h);
    var lg = document.getElementById('battleLog');
    if (lg) lg.scrollTop = lg.scrollHeight;
    G.Fx.play(b);
  }

  function tabBtn(state, id, label) {
    return '<button class="btn tiny' + (state.battleTab === id ? ' primary' : '') + '" data-act="tab:' + id + '">' + label + '</button>';
  }

  function statusChips(u) {
    return u.statuses.map(function (s) {
      var nm = { burn: '🔥火傷', poison: '☠毒', freeze: '❄凍結', shock: '⚡麻痺',
                 seal: '🔒封印', blind: '🌑暗闇' }[s.k] || s.k;
      return '<span class="st debuff">' + nm + ' ' + s.t + '</span>';
    }).join('');
  }
  function buffChips(u) {
    return u.buffs.map(function (b) {
      var mk = G.MODKEYS[b.k];
      var t = mk ? mk.label + (mk.kind === 'pct' ? U.sgnp(b.v) : U.sgn(b.v)) : b.k;
      return '<span class="st ' + (b.v >= 0 ? 'buff' : 'debuff') + '">' + t + '</span>';
    }).join('') + u.flagBuffs.map(function (f) {
      return '<span class="st buff">' + (G.FLAGS[f.f] || f.f) + '</span>';
    }).join('');
  }

  function skillActions(state) {
    var b = state.battle, hero = b.actor || b.hero;
    return G.Stats.skillList(hero.hero).map(function (id) {
      var s = G.SKILLS[id];
      var lack = hero.mp < (s.mp || 0);
      var tgt = { all: '敵全体', random: 'ランダム', allies: '味方全体', ally: '味方単体',
                  downed: '戦闘不能の味方', self: '自身' }[s.target] ||
                ((s.kind === 'heal' || s.kind === 'buff' || s.kind === 'util') ? '自身' : '敵単体');
      return '<button class="abtn" ' + (lack ? 'disabled' : '') + ' data-act="skill:' + id + '">' +
        '<div class="an"><span>' + (s.el && s.el !== 'phys' && s.kind !== 'buff' && s.kind !== 'heal' ? G.ELEMENTS[s.el].icon : '') + s.name +
        '</span><span class="' + (lack ? 'r-common' : '') + '">' + (s.mp ? 'MP' + s.mp : '―') + '</span></div>' +
        '<div class="ad">[' + tgt + ']' + (s.power ? ' 威力' + s.power + (s.hits > 1 ? '×' + s.hits : '') : '') + ' ' + (s.desc || '') + '</div></button>';
    }).join('');
  }

  function itemActions(state) {
    var hero = state.hero;
    var ids = Object.keys(hero.items).filter(function (id) { return !!G.ITEM_BY_ID[id]; });
    if (!ids.length) return '<div class="muted small">アイテムを持っていない。</div>';
    /* レアアイテムは数が限られるので、探さずに済むよう先頭に出す */
    ids.sort(function (a2, b2) {
      var ra = G.ITEM_BY_ID[a2].rarity === 'rare' ? 0 : 1;
      var rb = G.ITEM_BY_ID[b2].rarity === 'rare' ? 0 : 1;
      return ra - rb;
    });
    return ids.map(function (id) {
      var it = G.ITEM_BY_ID[id];
      var isRare = it.rarity === 'rare';
      return '<button class="abtn' + (isRare ? ' rare' : '') + '" data-act="useitem:' + id + '">' +
        '<div class="an"><span' + (isRare ? ' class="r-legend"' : '') + '>' +
        (isRare ? '✦ ' : '🧪 ') + it.name + '</span><span>×' + hero.items[id] + '</span></div>' +
        '<div class="ad">' + it.desc + '</div></button>';
    }).join('');
  }

  /* ===================== 戦闘結果 ===================== */
  function reward(state, data) {
    var h = '<h1>' + (data.win ? (data.cleared ? '踏破' : '勝利') : '敗北') + '</h1>';
    if (data.cleared) {
      h += '<div class="panel bd-mythic center"><h3 class="r-mythic">✦ 世界の鏡像を打ち砕いた ✦</h3>' +
        '<p>25階層の踏破を達成した。ここから先は「深淵」―― 際限なく強くなる敵と、際限なく尖らせるビルドの領域だ。</p>' +
        '<div class="kv"><span>到達職業</span><span>' + G.CLASSES[state.hero.classId].name + '</span></div>' +
        '<div class="kv"><span>発見ミシック</span><span>' + state.meta.mythics.length + ' / ' + G.MYTHICS.length + '</span></div>' +
        '<div class="kv"><span>撃破数</span><span>' + state.run.stats.kills + '</span></div>' +
        '</div>';
    }
    if (data.win) {
      h += '<div class="panel"><h3>戦利品</h3>' +
        '<div class="kv"><span>経験値</span><span>+' + data.exp + '</span></div>' +
        '<div class="kv"><span>ゴールド</span><span>+' + data.gold + '</span></div>' +
        (data.levels ? '<div class="kv"><span class="r-legend">レベルアップ</span><span class="r-legend">+' + data.levels + '</span></div>' : '') +
        (data.sp ? '<div class="kv"><span style="color:var(--xp)">スキルポイント</span><span style="color:var(--xp)">+' + data.sp + '</span></div>' : '') +
        (data.mastery ? '<div class="kv"><span>' + G.CLASSES[state.hero.classId].name + ' 習熟度</span><span>+' +
          data.mastery + '（計 ' + data.masteryTotal + '）</span></div>' : '') +
        '</div>';
      if (data.drops.length) {
        h += '<div class="panel"><h3>ドロップ</h3><div class="grid g3">' + data.drops.map(function (d) {
          if (d.type === 'acc') return UI.accCard(d.ref);
          if (d.type === 'gear') return UI.gearCard(d.ref);
          return UI.itemCard(d.ref, null);
        }).join('') + '</div></div>';
      }
      if (data.choices && data.choices.length) {
        if (!data.chosen) {
          h += '<div class="panel"><h3>報酬を1つ選ぶ</h3><p class="tiny muted">ビルドの方向を決める一手。慎重に。</p><div class="grid g3">' +
            data.choices.map(function (c, i) { return UI.accCard(c.ref, { act: 'choose:' + i, note: '<span class="r-legend">選択する</span>' }); }).join('') +
            '</div></div>';
        } else {
          h += '<div class="panel"><h3>選択した報酬</h3><div class="grid g3">' + UI.accCard(data.chosen) + '</div></div>';
        }
      }
      if (data.mythics && data.mythics.length) {
        h += '<div class="panel bd-mythic"><h3 class="r-mythic">✦ ミシック発見 ✦</h3><div class="grid g2">' +
          data.mythics.map(function (m) { return UI.accCard(m, { note: '✦ 条件を達成し、この力を手にした ✦', noteCls: 'r-mythic' }); }).join('') +
          '</div><p class="tiny muted">ミシックは記録に残り、次回以降の冒険でも行商人から入手できるようになる。</p></div>';
      }
      if (data.classes && data.classes.length) {
        h += '<div class="panel"><h3 class="r-legend">☆ 転職条件を満たした職業</h3><div class="grid g2">' +
          data.classes.map(function (x) {
            var c = x.cls;
            return '<div class="card"><div class="cname ' + (c.tier === 3 ? 'r-mythic' : 'r-legend') + '">' +
              G.Gfx.classImg(c.id, 2, '', 'style="display:inline-block;vertical-align:-8px"') + c.name +
              ' <span class="tag">' + (c.tier === 3 ? '最上級職' : '上級職') + '</span></div>' +
              '<div class="cdesc"><b>' + U.esc(x.who.name) + '</b> が条件を満たした。<br>' +
              c.desc + '<br>「転職の祭壇」で転職できる。</div></div>';
          }).join('') + '</div></div>';
      }
      var mustChoose = data.choices && data.choices.length && !data.chosen;
      h += '<div class="panel center"><button class="btn primary" ' + (mustChoose ? 'disabled' : '') +
        ' data-act="afterReward">先へ進む</button> ' +
        '<button class="btn" data-act="buildOpen">装備を整える</button>' +
        (mustChoose ? '<div class="tiny muted" style="margin-top:6px">報酬を選ぶと先へ進める。</div>' : '') + '</div>';
    } else if (data.story) {
      h += '<div class="panel"><h3>全滅</h3>' +
        '<p>気づけば、宿の寝台の上だった。誰かが運んでくれたらしい。</p>' +
        '<p class="muted small">物語モードでは全滅しても冒険は終わらない。所持金の半分を失い、直前の町から再開する。</p>' +
        '<div class="kv"><span>撃破数</span><span>' + state.run.stats.kills + '</span></div>' +
        '<div class="kv"><span>失った所持金</span><span>-' + (data.lostGold || 0) + 'G</span></div>' +
        '</div>';
      h += '<div class="panel center"><button class="btn primary" data-act="storyRecover">町から立て直す</button></div>';
    } else {
      h += '<div class="panel"><p>あなたの冒険はここで潰えた。</p>' +
        '<div class="kv"><span>到達階層</span><span>' + state.run.floor + 'F</span></div>' +
        '<div class="kv"><span>撃破数</span><span>' + state.run.stats.kills + '</span></div>' +
        '<div class="kv"><span>会心発生</span><span>' + state.run.stats.crits + '</span></div>' +
        '<div class="kv"><span>反射撃破</span><span>' + state.run.stats.reflectKills + '</span></div>' +
        '<div class="kv"><span>アイテム使用</span><span>' + state.run.stats.itemsUsed + '</span></div>' +
        '<p class="muted small">発見したミシックと到達した職業の記録は永続的に残る。</p></div>';
      h += '<div class="panel center"><button class="btn primary" data-act="toTitle">タイトルへ戻る</button></div>';
    }
    render(h);
  }

  /* ===================== 店 ===================== */
  function shop(state) {
    var shop = state.run.shop, hero = state.hero;
    var h = '<h1>🏪 行商人</h1><p class="muted">「どれも良い品だよ。ビルドに合うものを選びな」　所持金 <b>' + hero.gold + 'G</b></p>';
    h += '<div class="grid g3">';
    shop.stock.forEach(function (s, i) {
      if (s.sold) { h += '<div class="card locked"><div class="cname muted">売り切れ</div></div>'; return; }
      var ref = s.type === 'item' ? G.ITEM_BY_ID[s.id] : (s.type === 'acc' ? G.ACC_BY_ID[s.id] : G.GEAR[s.id]);
      var afford = hero.gold >= s.price;
      var note = '<b class="' + (afford ? 'r-legend' : 'r-common') + '">' + s.price + 'G</b>';
      var opt = { act: 'buy:' + i, note: note, cls: afford ? '' : 'locked' };
      h += s.type === 'item' ? UI.itemCard(ref, null, opt) : (s.type === 'acc' ? UI.accCard(ref, opt) : UI.gearCard(ref, opt));
    });
    h += '</div>';
    h += '<div class="panel center"><button class="btn" data-act="buildOpen">装備を組み替える</button> ' +
      '<button class="btn primary" data-act="leaveNode">' +
      (state.mode === 'story' ? '町へ戻る' : '次の階層へ') + '</button></div>';
    render(h);
  }

  /* ===================== 焚き火 ===================== */
  function rest(state) {
    var h = '<h1>🔥 焚き火</h1><p class="muted">束の間の休息。何をする？</p><div class="grid g3">';
    h += '<div class="node" data-act="rest:heal">' + G.Gfx.nodeImg('rest', 3) + '<div class="nn">休む</div><div class="nd">HP/MPを最大値の60%回復する。</div></div>';
    h += '<div class="node" data-act="rest:train">' + G.Gfx.nodeImg('event', 3) + '<div class="nn">鍛錬する</div><div class="nd">次のレベルまでの経験値の70%を得る。</div></div>';
    h += '<div class="node" data-act="rest:forge">' + G.Gfx.iconImg('weapon', 'legend', 3) + '<div class="nn">装備を見直す</div><div class="nd">装備画面を開く（この後もう一度選べる）。</div></div>';
    h += '</div>';
    h += diffRow(state);
    h += '<div class="panel center"><button class="btn" data-act="leaveNode">先へ進む</button></div>';
    render(h);
  }

  /* ===================== 転職の祭壇 ===================== */
  function altar(state, standalone) {
    var who = target(state);
    var checks = G.Unlock.availableClasses(state, who);
    var cur = G.CLASSES[who.classId];
    var h = '<h1>⛩ 転職の祭壇</h1>';
    h += memberTabs(state);
    h += '<div class="panel">' + stylePanel(state, who) + '</div>';
    h += '<p class="muted">' + U.esc(who.name) + ' の現在の職業: <b>' + cur.name + '</b>（' +
      (cur.tier === 3 ? '最上級職' : cur.tier === 2 ? '上級職' : '初級職') + '）／ ' +
      'これまでの職業のスキルは全て使用できる。' +
      (who.allyId ? '<br><span class="tiny">仲間は自分の系統の中でだけ転職できる。</span>' : '') + '</p>';

    [3, 2, 1].forEach(function (tier) {
      var list = checks.filter(function (r) { return r.cls.tier === tier; });
      if (!list.length) return;
      var tname = tier === 3 ? '<span class="r-mythic">最上級職</span>' : tier === 2 ? '<span class="r-legend">上級職</span>' : '初級職';
      h += '<div class="panel"><h3>' + tname + '</h3><div class="grid g2">';
      list.forEach(function (r) {
        var c = r.cls;
        var isCur = who.classId === c.id;
        h += '<div class="card ' + (r.ok ? '' : 'locked') + ' ' + (tier === 3 ? 'bd-mythic' : tier === 2 ? 'bd-legend' : '') + '" ' +
          (r.ok && !standalone ? 'data-act="changeClass:' + c.id + '"' : '') + '>' +
          '<div class="row" style="gap:10px;align-items:flex-start">' +
          '<div class="class-face">' + G.Portraits.img(
            who.allyId ? G.FACES.forAllyClass(who.allyId, c.id) : G.FACES.forHero({ classId: c.id }),
            2, r.ok ? '' : 'locked-face') + '</div>' +
          '<div style="flex:1;min-width:0">' +
          '<div class="cname ' + (tier === 3 ? 'r-mythic' : tier === 2 ? 'r-legend' : '') + '">' + c.name +
          (isCur ? ' <span class="tag">現在</span>' : '') + (r.ok && !isCur ? ' <span class="tag legend">転職可能</span>' : '') + '</div>' +
          '<div class="cdesc">' + c.desc + '<br><b>パッシブ:</b> ' + (UI.modsText(c.mods) || 'なし') +
          (c.flags && c.flags.length ? '<br>' + UI.flagsText(c.flags) : '') +
          '<br><b>習得スキル:</b> ' + c.skills.map(function (s) { return G.SKILLS[s].name; }).join('・') + '</div>' +
          '</div></div>' +
          (c.tier > 1 ? '<div class="sep"></div>' + r.conds.map(function (cd) {
            return '<div class="cond ' + (cd.ok ? 'ok' : 'ng') + '">' + cd.label +
              (cd.prog ? ' <span class="muted">[' + cd.prog + ']</span>' : '') + '</div>';
          }).join('') : '') +
          '</div>';
      });
      h += '</div></div>';
    });
    h += '<div class="panel center"><button class="btn" data-act="buildOpen">装備を組み替えて条件を満たす</button> ' +
      (standalone ? '<button class="btn primary" data-act="closeOverlay">戻る</button>'
                  : '<button class="btn primary" data-act="leaveNode">' +
                    (state.mode === 'story' ? '町へ戻る' : '先へ進む') + '</button>') + '</div>';
    render(h);
  }

  /* ===================== イベント ===================== */
  function event(state, ev, resultText) {
    var h = '<h1>❓ ' + ev.name + '</h1><div class="panel"><p>' + ev.text + '</p>';
    if (resultText) h += '<div class="sep"></div><p class="r-legend">' + resultText + '</p>';
    h += '</div>';
    if (!resultText) {
      h += '<div class="grid g3">';
      ev.opts.forEach(function (o, i) {
        var afford = !o.cost || state.hero.gold >= o.cost;
        h += '<div class="node ' + (afford ? '' : 'locked') + '" ' + (afford ? 'data-act="event:' + i + '"' : '') + '>' +
          '<div class="nn">' + o.label + '</div>' + (o.cost ? '<div class="nd">' + o.cost + 'G 必要</div>' : '') + '</div>';
      });
      h += '</div>';
    } else {
      h += '<div class="panel center"><button class="btn primary" data-act="leaveNode">先へ進む</button></div>';
    }
    render(h);
  }

  /* ===================== ビルド（装備）画面 ===================== */
  function buildModal(state) {
    var hero = target(state), c = G.Stats.compute(hero), S = c.S;
    var h = '<h2 style="color:var(--gold);margin-top:0">ビルド構成' +
      '<span class="muted small"> ― ' + U.esc(hero.name) + '（' + G.CLASSES[hero.classId].name + '）</span></h2>';
    h += memberTabs(state);
    h += '<div class="grid g2"><div>';
    h += '<h3 class="small">装備</h3>';
    h += '<div class="slots">' +
      slotBox('武器', hero.equip.weapon ? G.GEAR[hero.equip.weapon] : null, 'pickGear:weapon') +
      slotBox('防具', hero.equip.armor ? G.GEAR[hero.equip.armor] : null, 'pickGear:armor') +
      '</div>';
    h += '<h3 class="small" style="margin-top:12px">アクセサリ（4枠）</h3>' + UI.accSlots(hero, 'pickAcc');
    h += '<h3 class="small" style="margin-top:12px">所持アイテム</h3><div class="grid g3">';
    var ids = Object.keys(state.hero.items);
    h += ids.length ? ids.map(function (id) {
      var it = G.ITEM_BY_ID[id]; if (!it) return '';
      var usable = (it.use.type === 'heal' || it.use.type === 'mp' || it.use.type === 'full' || it.use.type === 'cleanse');
      return UI.itemCard(it, state.hero.items[id], usable ? { act: 'useOut:' + id, note: '<span class="r-legend">クリックで使用</span>' } : { cls: 'locked', note: '<span class="muted">戦闘中に使用</span>' });
    }).join('') : '<div class="muted small">なし</div>';
    h += '</div>';
    h += '</div><div>';
    h += '<h3 class="small">ステータス</h3>' + UI.statTable(S);
    h += '<h3 class="small" style="margin-top:10px">属性ダメージ</h3>' + UI.elemTable(S);
    var flagKeys = Object.keys(c.flags);
    h += '<h3 class="small" style="margin-top:10px">特殊効果</h3>' +
      (flagKeys.length ? '<div class="small">' + flagKeys.map(function (f) { return '◆ ' + (G.FLAGS[f] || f); }).join('<br>') + '</div>'
                       : '<div class="muted small">なし</div>');
    h += '</div></div>';
    h += '<div class="sep"></div>' + stylePanel(state, hero);
    h += '<div class="sep"></div><div class="center"><button class="btn primary" data-act="closeModal">閉じる</button></div>';
    UI.modal(h);
  }

  function slotBox(label, g, act) {
    return '<div class="slot ' + (g ? '' : 'empty') + '" data-act="' + act + '">' +
      '<div class="sl">' + label + '</div>' +
      '<div class="sv ' + (g ? UI.rarityClass(g.rarity) : '') + '">' + (g ? UI.gearIcon(g) + g.name : '― 空き ―') + '</div>' +
      (g ? '<div class="tiny muted">' + UI.modsText(g.mods) + '</div>' : '') + '</div>';
  }

  /** アクセサリ選択 */
  function accPicker(state, slotIdx) {
    var hero = target(state);
    var h = '<h2 style="margin-top:0">' + U.esc(hero.name) + ' ― アクセサリ 枠' + (slotIdx + 1) + ' を選ぶ</h2>';
    h += '<p class="muted small">持ち物はパーティ共有。誰かが装備しているものは選べない。</p>';
    h += '<div class="grid g2">';
    h += '<div class="card" data-act="setAcc:' + slotIdx + ':-1"><div class="cname muted">― 外す ―</div></div>';
    var counts = {};
    state.hero.bag.acc.forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
    Object.keys(counts).forEach(function (id) {
      var a = G.ACC_BY_ID[id];
      if (!a) return;
      var free = G.Run.freeCount(state, id, 'acc', hero, slotIdx);
      var note = counts[id] > 1 ? '所持: ' + counts[id] : '';
      if (free <= 0) {
        h += UI.accCard(a, { cls: 'locked', note: whoHas(state, id, 'acc', hero, slotIdx) });
      } else {
        h += UI.accCard(a, { act: 'setAcc:' + slotIdx + ':' + id, note: note });
      }
    });
    h += '</div><div class="sep"></div><div class="center"><button class="btn" data-act="buildOpen">戻る</button></div>';
    UI.modal(h);
  }

  /** 武器・防具選択 */
  function gearPicker(state, slot) {
    var hero = target(state);
    var h = '<h2 style="margin-top:0">' + U.esc(hero.name) + ' ― ' +
      (slot === 'weapon' ? '武器' : '防具') + 'を選ぶ</h2>';
    h += '<p class="muted small">持ち物はパーティ共有。誰かが装備しているものは選べない。</p><div class="grid g2">';
    h += '<div class="card" data-act="setGear:' + slot + ':-1"><div class="cname muted">― 外す ―</div></div>';
    var counts = {};
    state.hero.bag.gear.forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
    Object.keys(counts).forEach(function (id) {
      var g = G.GEAR[id];
      if (!g || g.slot !== slot) return;
      if (hero.equip[slot] === id) {
        h += UI.gearCard(g, { note: '<span class="r-legend">装備中</span>' });
        return;
      }
      var free = G.Run.freeCount(state, id, slot, hero, slot);
      if (free <= 0) { h += UI.gearCard(g, { cls: 'locked', note: whoHas(state, id, slot, hero, slot) }); return; }
      h += UI.gearCard(g, { act: 'setGear:' + slot + ':' + id, note: counts[id] > 1 ? '所持: ' + counts[id] : '' });
    });
    h += '</div><div class="sep"></div><div class="center"><button class="btn" data-act="buildOpen">戻る</button></div>';
    UI.modal(h);
  }


  /* ===================== スキルツリー ===================== */
  function skillTree(state) {
    if ((state.treeMode || 'common') === 'class') return classTree(state);
    var hero = target(state);
    var tabId = state.treeTab || G.TREE.branches[0].id;
    var br = G.TREE.branches.filter(function (x) { return x.id === tabId; })[0] || G.TREE.branches[0];
    var spent = G.Tree.totalSpent(hero), cost = G.Tree.respecCost(hero);

    var h = treeHeader(state, 'common');
    h += '<div class="row" style="justify-content:space-between;align-items:center">' +
      '<div class="small">残りSP <b style="color:var(--xp);font-size:16px">' + (hero.sp || 0) + '</b>' +
      ' <span class="muted">／ 使用済み ' + spent + 'SP</span></div>' +
      '<button class="btn tiny" ' + (spent > 0 && state.hero.gold >= cost ? '' : 'disabled') + ' data-act="treeRespec">' +
      '振り直す（' + cost + 'G）</button></div>';
    h += '<p class="tiny muted">SPはレベルアップで1、精鋭撃破で1、ボス撃破で2 手に入る。' +
      'ここで伸ばした数値はそのまま職業の解放条件に反映される。</p>';

    /* 系統タブ */
    h += '<div class="treetabs">';
    G.TREE.branches.forEach(function (b2) {
      var inv = G.Tree.branchSpent(hero, b2.id);
      h += '<button class="btn tiny' + (b2.id === br.id ? ' primary' : '') + '" data-act="treeTab:' + b2.id + '">' +
        b2.name + (inv ? ' <span class="r-legend">' + inv + '</span>' : '') + '</button>';
    });
    h += '</div>';

    h += '<div class="panel" style="margin-top:10px"><h3 style="margin-bottom:4px">' + br.name + '</h3>' +
      '<div class="tiny muted" style="margin-bottom:10px">' + br.desc + '</div>';

    [1, 2, 3, 4].forEach(function (row) {
      var nodes = br.nodes.filter(function (n) { return n.row === row; });
      if (!nodes.length) return;
      if (row > 1) h += '<div class="treelink"></div>';
      h += '<div class="treerow">' + nodes.map(function (n) { return treeNode(state, n); }).join('') + '</div>';
    });
    h += '</div>';
    h += '<div class="center"><button class="btn primary" data-act="closeModal">閉じる</button></div>';
    UI.modal(h);
  }

  /** 共通／職業ツリーの切り替えヘッダ */
  function treeHeader(state, mode) {
    var who = target(state);
    return '<h2 style="color:var(--gold);margin-top:0">スキルツリー' +
      '<span class="muted small"> ― ' + U.esc(who.name) + '</span></h2>' +
      memberTabs(state) +
      '<div class="treetabs" style="margin-bottom:8px">' +
      '<button class="btn tiny' + (mode === 'common' ? ' primary' : '') + '" data-act="treeMode:common">共通ツリー</button>' +
      '<button class="btn tiny' + (mode === 'class' ? ' primary' : '') + '" data-act="treeMode:class">職業ツリー</button>' +
      '</div>';
  }

  /* ===================== 職業ツリー ===================== */
  function classTree(state) {
    var hero = target(state), cls = G.CLASSES[hero.classId];
    var rows = G.CLASSTREE[hero.classId] || [];
    var wins = G.Mastery.wins(hero, hero.classId);
    var picks = G.Mastery.picks(hero, hero.classId);
    var cost = G.Mastery.respecCost(hero);

    var h = treeHeader(state, 'class');
    h += '<div class="row" style="justify-content:space-between;align-items:center">' +
      '<div class="classcard-head">' + G.Gfx.classImg(hero.classId, 3) +
      '<div><div style="font-weight:700">' + cls.name + '</div>' +
      '<div class="tiny muted">習熟度 <b style="color:var(--xp)">' + wins + '</b></div></div></div>' +
      '<button class="btn tiny" ' + (cost > 0 && state.hero.gold >= cost ? '' : 'disabled') + ' data-act="classRespec">' +
      '選び直す（' + cost + 'G）</button></div>';
    h += '<p class="tiny muted">習熟度はこの職業で戦うと貯まる（通常+1／精鋭+2／ボス+3）。' +
      '各段は<b>どちらか一方しか選べない</b>。効果が有効なのは<b>今就いている職業</b>の選択だけで、' +
      '過去の職業の選択は記録として残り、その職業に戻れば復活する。</p>';

    h += '<div class="panel" style="margin-top:8px">';
    rows.forEach(function (r) {
      var open = wins >= r.need;
      var chosen = picks[r.tier];
      if (r.tier > 1) h += '<div class="treelink"></div>';
      h += '<div class="tiny muted" style="margin:6px 0 4px">第' + r.tier + '段' +
        (open ? '' : '　<span class="r-common">習熟 ' + r.need + ' で解放（あと ' + (r.need - wins) + '）</span>') +
        (open && !chosen ? '　<span class="r-legend">どちらか一方を選択</span>' : '') + '</div>';
      h += '<div class="treerow">' +
        ['a', 'b'].map(function (w) { return classNode(state, r, w, open, chosen); }).join('') + '</div>';
    });
    h += '</div>';

    /* 他の職業で眠っている選択 */
    var others = Object.keys(hero.mastery || {}).filter(function (cid) {
      return cid !== hero.classId && Object.keys(G.Mastery.picks(hero, cid)).length;
    });
    if (others.length) {
      h += '<div class="panel"><h3>他の職業の習熟（現在は効果なし）</h3>' + others.map(function (cid) {
        var ps = G.Mastery.picks(hero, cid), rw = G.CLASSTREE[cid] || [];
        var names = rw.filter(function (r) { return ps[r.tier]; })
          .map(function (r) { return r[ps[r.tier]].name; }).join('・');
        return '<div class="kv"><span>' + G.CLASSES[cid].name + '（習熟' + G.Mastery.wins(hero, cid) + '）</span>' +
          '<span>' + names + '</span></div>';
      }).join('') + '</div>';
    }

    h += '<div class="center"><button class="btn primary" data-act="closeModal">閉じる</button></div>';
    UI.modal(h);
  }

  function classNode(state, row, which, open, chosen) {
    var n = row[which];
    var isChosen = chosen === which;
    var isRejected = chosen && chosen !== which;
    var cls = isChosen ? 'owned' : ((!open || isRejected) ? 'locked' : '');
    var body = '<div class="cdesc">' + n.desc + '</div>';
    if (n.mods) body += '<div class="cdesc">' + UI.modsText(n.mods) + '</div>';
    if (n.flags) body += '<div class="cdesc">' + UI.flagsText(n.flags) + '</div>';
    if (n.skill) body += '<div class="cdesc r-legend">スキル習得: 【' + G.SKILLS[n.skill].name + '】</div>';
    if (isRejected) body += '<div class="cond ng">選ばなかった道</div>';
    return '<div class="card treenode ' + cls + '" ' +
      (open && !chosen ? 'data-act="classPick:' + row.tier + ':' + which + '"' : '') + '>' +
      '<div class="cname">' + (isChosen ? '<span class="r-legend">✔ </span>' : '') + n.name + '</div>' +
      body + '</div>';
  }

  function treeNode(state, n) {
    var hero = target(state);
    var chk = G.Tree.check(hero, n.id);
    var cls = chk.owned ? 'owned' : (chk.ok ? '' : 'locked');
    var body = '';
    if (n.mods) body += '<div class="cdesc">' + UI.modsText(n.mods) + '</div>';
    if (n.flags) body += '<div class="cdesc">' + UI.flagsText(n.flags) + '</div>';
    if (n.skill) body += '<div class="cdesc r-legend">スキル習得: 【' + G.SKILLS[n.skill].name + '】<br>' +
      '<span class="muted">' + G.SKILLS[n.skill].desc + '</span></div>';
    if (!chk.owned) {
      body += chk.reasons.filter(function (r) { return !r.ok; })
        .map(function (r) { return '<div class="cond ng">' + r.label + '</div>'; }).join('');
    }
    return '<div class="card treenode ' + cls + '" ' + (chk.ok ? 'data-act="treeTake:' + n.id + '"' : '') + '>' +
      '<div class="cname">' + (chk.owned ? '<span class="r-legend">✔ </span>' : '') + n.name +
      (n.row === 4 ? ' <span class="tag mythic">奥義</span>' : '') +
      ' <span class="tag">' + n.cost + 'SP</span></div>' + body + '</div>';
  }

  /* ===================== 図鑑 ===================== */
  function codex(state) {
    var meta = state.meta;
    var h = '<h2 style="margin-top:0;color:var(--gold)">図鑑</h2>';
    h += '<h3 class="r-mythic">ミシックアクセサリ（' + meta.mythics.length + ' / ' + G.MYTHICS.length + '）</h3>';
    h += '<p class="tiny muted">戦闘中に特殊条件を満たすと「発見」される。一度発見すれば以後の冒険に永続的に引き継がれる。</p>';
    h += '<div class="grid g2">';
    G.MYTHICS.forEach(function (m) {
      var found = meta.mythics.indexOf(m.id) >= 0;
      if (found) h += UI.accCard(m, { note: '<span class="r-mythic">発見済</span>' });
      else h += '<div class="card locked bd-mythic"><div class="cname r-mythic">' + G.Gfx.iconImg('acc', 'mythic', 2) + '??????? <span class="tag mythic">ミシック</span></div>' +
        '<div class="cdesc"><span class="r-mythic">【取得条件】' + m.cond.label + '</span><br><span class="muted">ヒント: ' + m.cond.hint + '</span></div></div>';
    });
    h += '</div>';

    var pstyle = G.Portraits.style();
    h += '<div class="sep"></div><h3 class="r-legend">人物</h3>';
    h += '<p class="tiny muted">立ち絵はすべてコードで組み立てている。画像ファイルは1枚も持たない。</p>';
    h += '<div class="row" style="gap:6px;margin-bottom:8px;align-items:center">' +
      '<span class="tiny muted">会話の絵柄:</span>' +
      '<button class="btn tiny' + (pstyle === 'anime' ? ' primary' : '') + '" data-act="pstyle:anime">アニメ調</button>' +
      '<button class="btn tiny' + (pstyle === 'pixel' ? ' primary' : '') + '" data-act="pstyle:pixel">ドット絵</button>' +
      '</div>';
    h += '<div class="cast-row">';
    [{ n: G.STORY.HERO.defaultName + '（主人公）', f: G.FACES.forHero(state.hero || { classId: 'swordsman' }), d: G.STORY.HERO.intro }]
      .concat((G.ALLY_LIST || []).map(function (a) {
        return { n: a.name, f: G.FACES.forMember({ allyId: a.id }), d: a.desc, role: a.role };
      }))
      .forEach(function (c) {
        h += '<div class="cast-card">' + G.Portraits.dialogImg(c.f, 150) +
          G.Portraits.img(c.f, 2, 'cast-full') +
          '<div class="cname" style="margin-top:6px">' + U.esc(c.n) + '</div>' +
          (c.role ? '<div class="tiny muted">' + c.role + '</div>' : '') +
          '<div class="cdesc">' + U.esc(G.Story.fill(c.d || '', state)) + '</div></div>';
      });
    h += '</div>';

    h += '<div class="sep"></div><h3 class="r-legend">レアアイテム（' + G.RARE_ITEMS.length + '種）</h3>';
    h += '<p class="tiny muted">通常の抽選には出ない特別な消耗品。' +
      '<b>試練の塔</b>の精鋭・ボス・宝物庫が主な入手源で、' +
      '物語のダンジョンでは隠し場所やボスから、より控えめな確率で見つかる。店の特別枠にも並ぶ。</p>';
    h += '<div class="grid g2">' +
      G.RARE_ITEMS.map(function (it) {
        return UI.itemCard(it, null, { note: '<span class="muted">相場 ' + it.price + 'G</span>' });
      }).join('') + '</div>';

    h += '<div class="sep"></div><h3 class="r-legend">職業ツリー</h3><div class="grid g2">';
    [1, 2, 3].forEach(function (t) {
      G.CLASS_LIST.filter(function (c) { return c.tier === t; }).forEach(function (c) {
        var seen = t === 1 || meta.classesSeen.indexOf(c.id) >= 0;
        h += '<div class="card ' + (seen ? '' : 'locked') + ' ' + (t === 3 ? 'bd-mythic' : t === 2 ? 'bd-legend' : '') + '">' +
          '<div class="classcard-head">' + G.Gfx.classImg(c.id, 3, seen ? '' : 'dim') +
          '<div class="cname ' + (t === 3 ? 'r-mythic' : t === 2 ? 'r-legend' : '') + '">' + c.name +
          ' <span class="tag">' + (t === 3 ? '最上級職' : t === 2 ? '上級職' : '初級職') + '</span></div></div>' +
          '<div class="cdesc">' + c.desc +
          (c.req ? '<br><b>解放条件:</b><br>' + c.req.map(function (r) { return '・' + r.label; }).join('<br>') +
            (c.from ? '<br>・前提職: ' + c.from.map(function (f) { return G.CLASSES[f].name; }).join(' / ') : '') : '') +
          '</div></div>';
      });
    });
    h += '</div>';

    h += '<div class="sep"></div><h3 class="r-legend">レジェンドアクセサリ（' + G.LEGENDS.length + '種）</h3><div class="grid g2">' +
      G.LEGENDS.map(function (a) { return UI.accCard(a); }).join('') + '</div>';
    h += '<div class="sep"></div><h3 class="r-normal">通常アクセサリ（' + G.NORMALS.length + '種）</h3><div class="grid g2">' +
      G.NORMALS.map(function (a) { return UI.accCard(a); }).join('') + '</div>';
    h += '<div class="sep"></div><div class="center"><button class="btn primary" data-act="closeModal">閉じる</button></div>';
    UI.modal(h);
  }

  function help() {
    UI.modal('<h2 style="margin-top:0;color:var(--gold)">遊び方</h2>' + helpHtml() +
      '<div class="sep"></div><h3>ビルド指標</h3><div class="small muted">' +
      '会心率／会心ダメージ・反射率／反射威力・波及率（単体攻撃が他の敵にも及ぶ）／範囲威力・各属性ダメージ／耐性貫通・アイテム威力／温存率・吸収・被ダメ軽減 ―― ' +
      'これらを装備とアクセサリ4枠で伸ばし、閾値を超えると上級職・最上級職が解放される。</div>' +
      '<div class="sep"></div><div class="center"><button class="btn primary" data-act="closeModal">閉じる</button></div>');
  }

  return {
    title: title, classSelect: classSelect, map: map, battle: battle, reward: reward,
    modeSelect: modeSelect, storyIntro: storyIntro, scene: scene, world: world, town: town, dungeon: dungeon,
    shop: shop, rest: rest, altar: altar, event: event,
    buildModal: buildModal, accPicker: accPicker, gearPicker: gearPicker, codex: codex, help: help,
    skillTree: skillTree, diffCards: diffCards, diffRow: diffRow, diffTag: diffTag,
    render: render
  };
})();
