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
      '<li><b>5階ごとにボス。</b> 倒すと大きな報酬。倒れると冒険は終了しますが、発見したミシックと解放した職業の記録は残ります。</li>' +
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
        '<div class="cname" style="font-size:15px">' + c.icon + ' ' + c.name + '</div>' +
        '<div class="cdesc">' + c.desc + '<br><br>' +
        '<b>パッシブ:</b> ' + (UI.modsText(c.mods) || 'なし') + '<br>' +
        '<b>初期スキル:</b> ' + c.skills.map(function (s) { return G.SKILLS[s].name; }).join('・') + '</div></div>';
    });
    h += '</div>';
    h += '<div class="panel"><h3>到達しうる最上級職</h3><div class="grid g2">' +
      G.CLASS_LIST.filter(function (c) { return c.tier === 3; }).map(function (c) {
        return '<div class="card locked"><div class="cname r-mythic">' + c.icon + ' ' + c.name + '</div>' +
          '<div class="cdesc">' + c.desc + '</div></div>';
      }).join('') + '</div></div>';
    render(h);
  }

  /* ===================== マップ ===================== */
  function map(state) {
    var run = state.run, hero = state.hero, S = G.Stats.compute(hero).S;
    var h = '<h1>第 ' + run.floor + ' 階層' + (G.Run.isBossFloor(run.floor) ? ' <span class="r-mythic">― 主の間 ―</span>' : '') + '</h1>';
    h += '<p class="muted">進む道を選べ。' + (G.Run.isBossFloor(run.floor) ? '逃げ道はない。' : '同じ階層で複数の道は選べない。') + '</p>';
    h += '<div class="grid g3">';
    run.nodes.forEach(function (n, i) {
      h += '<div class="node" data-act="node:' + i + '"><div class="ico">' + n.icon + '</div>' +
        '<div class="nn">' + n.name + '</div><div class="nd">' + n.desc + '</div></div>';
    });
    h += '</div>';
    h += '<div class="panel"><div class="row" style="justify-content:space-between;align-items:center">' +
      '<h3 style="margin:0">現在のビルド</h3>' +
      '<div><button class="btn tiny" data-act="buildOpen">装備を組み替える</button> ' +
      '<button class="btn tiny" data-act="altarPreview">転職条件を見る</button></div></div>';
    h += '<div class="sep"></div>';
    h += '<div class="grid g2"><div>' + UI.bar(hero.hp, S.maxHp, 'hp', 'HP') + '<div style="height:6px"></div>' +
      UI.bar(hero.mp, S.maxMp, 'mp', 'MP') + '<div style="height:6px"></div>' +
      UI.bar(hero.exp, G.Stats.expToNext(hero.level), 'xp', '次のレベルまで') + '</div>';
    h += '<div>' + buildSummary(state) + '</div></div>';
    h += '</div>';
    render(h);
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
      { k: '堅守', v: S.dr * 200 + S.defPct * 40 }
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
      '<div class="kv"><span>アイテム威力</span><span>' + U.sgnp(S.itemPower) + '</span></div>';
  }

  /* ===================== 戦闘 ===================== */
  function battle(state) {
    var b = state.battle, hero = b.hero;
    var h = '<h1>戦闘 <span class="muted small">― ' + state.run.floor + 'F ― ラウンド ' + b.round + '</span></h1>';

    h += '<div class="enemies">';
    b.enemies.forEach(function (e, i) {
      var sel = (state.targetIdx === i) ? 'style="outline:2px solid var(--danger)"' : '';
      h += '<div class="unit ' + (e.hp > 0 ? 'target' : 'dead') + '" ' + sel + ' data-act="selectTarget:' + i + '">' +
        '<div class="un"><span>' + e.icon + ' ' + e.name + '</span>' +
        '<span class="lvtag">' + (e.isBoss ? 'BOSS' : '') + '</span></div>' +
        UI.bar(e.hp, e.S.maxHp, 'hp', '') +
        '<div class="tiny muted" style="margin-top:3px">弱点: ' + (e.weak.length ? e.weak.map(G.elSpan).join(' ') : 'なし') +
        '<br>耐性: ' + (e.resist.length ? e.resist.map(G.elSpan).join(' ') : 'なし') + '</div>' +
        '<div class="sts">' + statusChips(e) + '</div>' +
        '</div>';
    });
    h += '</div>';

    h += '<div class="grid g2" style="margin-top:10px"><div class="hero-panel">' +
      '<div class="un" style="font-size:13px"><span>' + G.CLASSES[state.hero.classId].icon + ' ' + U.esc(state.hero.name) +
      ' <span class="muted">Lv' + state.hero.level + ' ' + G.CLASSES[state.hero.classId].name + '</span></span>' +
      (hero.barrier > 0 ? '<span class="tag">🛡 ' + hero.barrier + '</span>' : '') + '</div>' +
      UI.bar(hero.hp, hero.S.maxHp, 'hp', 'HP') + '<div style="height:5px"></div>' +
      UI.bar(hero.mp, hero.S.maxMp, 'mp', 'MP') +
      '<div class="sts" style="margin-top:6px">' + statusChips(hero) + buffChips(hero) + '</div>' +
      '<div class="tiny muted" style="margin-top:6px">攻' + hero.S.atk + ' 魔' + hero.S.mag + ' 防' + hero.S.def +
      ' 速' + hero.S.spd + ' / 会心' + U.pct(hero.S.critRate) + ' 反射' + U.pct(hero.S.reflect) +
      ' 波及' + U.pct(hero.S.aoeRatio) + '</div>' +
      '</div>';
    h += '<div><div class="log" id="battleLog">' + b.log.slice(-60).map(function (l) {
      return '<div class="' + l.c + '">' + l.t + '</div>';
    }).join('') + '</div></div></div>';

    if (b.over) {
      h += '<div class="panel center"><button class="btn primary" data-act="battleEnd">' +
        (b.result === 'win' ? '戦利品を確認する' : '結果を見る') + '</button></div>';
    } else {
      h += '<div class="panel"><div class="row" style="gap:6px">' +
        tabBtn(state, 'skill', 'スキル') + tabBtn(state, 'item', 'アイテム') +
        '<span class="muted tiny" style="margin-left:auto;align-self:center">対象: ' +
        (b.enemies[state.targetIdx] && b.enemies[state.targetIdx].hp > 0 ? b.enemies[state.targetIdx].name : '自動') + '（敵をクリックで変更）</span>' +
        '</div><div class="actions">';
      if (state.battleTab === 'item') h += itemActions(state);
      else h += skillActions(state);
      h += '</div></div>';
    }
    render(h);
    var lg = document.getElementById('battleLog');
    if (lg) lg.scrollTop = lg.scrollHeight;
  }

  function tabBtn(state, id, label) {
    return '<button class="btn tiny' + (state.battleTab === id ? ' primary' : '') + '" data-act="tab:' + id + '">' + label + '</button>';
  }

  function statusChips(u) {
    return u.statuses.map(function (s) {
      var nm = { burn: '🔥火傷', poison: '☠毒', freeze: '❄凍結', shock: '⚡麻痺' }[s.k] || s.k;
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
    var b = state.battle, hero = b.hero;
    return G.Stats.skillList(state.hero).map(function (id) {
      var s = G.SKILLS[id];
      var lack = hero.mp < (s.mp || 0);
      var tgt = s.target === 'all' ? '全体' : (s.target === 'self' || s.kind === 'heal' || s.kind === 'buff' || s.kind === 'util' ? '自身' : (s.target === 'random' ? 'ランダム' : '単体'));
      return '<button class="abtn" ' + (lack ? 'disabled' : '') + ' data-act="skill:' + id + '">' +
        '<div class="an"><span>' + (s.el && s.el !== 'phys' && s.kind !== 'buff' && s.kind !== 'heal' ? G.ELEMENTS[s.el].icon : '') + s.name +
        '</span><span class="' + (lack ? 'r-common' : '') + '">' + (s.mp ? 'MP' + s.mp : '―') + '</span></div>' +
        '<div class="ad">[' + tgt + ']' + (s.power ? ' 威力' + s.power + (s.hits > 1 ? '×' + s.hits : '') : '') + ' ' + (s.desc || '') + '</div></button>';
    }).join('');
  }

  function itemActions(state) {
    var hero = state.hero;
    var ids = Object.keys(hero.items);
    if (!ids.length) return '<div class="muted small">アイテムを持っていない。</div>';
    return ids.map(function (id) {
      var it = G.ITEM_BY_ID[id];
      if (!it) return '';
      return '<button class="abtn" data-act="useitem:' + id + '">' +
        '<div class="an"><span>🧪 ' + it.name + '</span><span>×' + hero.items[id] + '</span></div>' +
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
          data.classes.map(function (c) {
            return '<div class="card"><div class="cname ' + (c.tier === 3 ? 'r-mythic' : 'r-legend') + '">' + c.icon + ' ' + c.name +
              ' <span class="tag">' + (c.tier === 3 ? '最上級職' : '上級職') + '</span></div>' +
              '<div class="cdesc">' + c.desc + '<br>「転職の祭壇」で転職できる。</div></div>';
          }).join('') + '</div></div>';
      }
      var mustChoose = data.choices && data.choices.length && !data.chosen;
      h += '<div class="panel center"><button class="btn primary" ' + (mustChoose ? 'disabled' : '') +
        ' data-act="afterReward">先へ進む</button> ' +
        '<button class="btn" data-act="buildOpen">装備を整える</button>' +
        (mustChoose ? '<div class="tiny muted" style="margin-top:6px">報酬を選ぶと先へ進める。</div>' : '') + '</div>';
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
      '<button class="btn primary" data-act="leaveNode">次の階層へ</button></div>';
    render(h);
  }

  /* ===================== 焚き火 ===================== */
  function rest(state) {
    var h = '<h1>🔥 焚き火</h1><p class="muted">束の間の休息。何をする？</p><div class="grid g3">';
    h += '<div class="node" data-act="rest:heal"><div class="ico">💤</div><div class="nn">休む</div><div class="nd">HP/MPを最大値の60%回復する。</div></div>';
    h += '<div class="node" data-act="rest:train"><div class="ico">📖</div><div class="nn">鍛錬する</div><div class="nd">次のレベルまでの経験値の70%を得る。</div></div>';
    h += '<div class="node" data-act="rest:forge"><div class="ico">⚒</div><div class="nn">装備を見直す</div><div class="nd">装備画面を開く（この後もう一度選べる）。</div></div>';
    h += '</div><div class="panel center"><button class="btn" data-act="leaveNode">先へ進む</button></div>';
    render(h);
  }

  /* ===================== 転職の祭壇 ===================== */
  function altar(state, standalone) {
    var checks = G.Unlock.availableClasses(state);
    var cur = G.CLASSES[state.hero.classId];
    var h = '<h1>⛩ 転職の祭壇</h1>';
    h += '<p class="muted">現在の職業: <b>' + cur.icon + ' ' + cur.name + '</b>（' +
      (cur.tier === 3 ? '最上級職' : cur.tier === 2 ? '上級職' : '初級職') + '）／ ' +
      'これまでの職業のスキルは全て使用できる。</p>';

    [3, 2, 1].forEach(function (tier) {
      var list = checks.filter(function (r) { return r.cls.tier === tier; });
      if (!list.length) return;
      var tname = tier === 3 ? '<span class="r-mythic">最上級職</span>' : tier === 2 ? '<span class="r-legend">上級職</span>' : '初級職';
      h += '<div class="panel"><h3>' + tname + '</h3><div class="grid g2">';
      list.forEach(function (r) {
        var c = r.cls;
        var isCur = state.hero.classId === c.id;
        h += '<div class="card ' + (r.ok ? '' : 'locked') + ' ' + (tier === 3 ? 'bd-mythic' : tier === 2 ? 'bd-legend' : '') + '" ' +
          (r.ok && !standalone ? 'data-act="changeClass:' + c.id + '"' : '') + '>' +
          '<div class="cname ' + (tier === 3 ? 'r-mythic' : tier === 2 ? 'r-legend' : '') + '">' + c.icon + ' ' + c.name +
          (isCur ? ' <span class="tag">現在</span>' : '') + (r.ok && !isCur ? ' <span class="tag legend">転職可能</span>' : '') + '</div>' +
          '<div class="cdesc">' + c.desc + '<br><b>パッシブ:</b> ' + (UI.modsText(c.mods) || 'なし') +
          (c.flags && c.flags.length ? '<br>' + UI.flagsText(c.flags) : '') +
          '<br><b>習得スキル:</b> ' + c.skills.map(function (s) { return G.SKILLS[s].name; }).join('・') + '</div>' +
          (c.tier > 1 ? '<div class="sep"></div>' + r.conds.map(function (cd) {
            return '<div class="cond ' + (cd.ok ? 'ok' : 'ng') + '">' + cd.label + '</div>';
          }).join('') : '') +
          '</div>';
      });
      h += '</div></div>';
    });
    h += '<div class="panel center"><button class="btn" data-act="buildOpen">装備を組み替えて条件を満たす</button> ' +
      (standalone ? '<button class="btn primary" data-act="closeOverlay">戻る</button>'
                  : '<button class="btn primary" data-act="leaveNode">先へ進む</button>') + '</div>';
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
    var hero = state.hero, c = G.Stats.compute(hero), S = c.S;
    var h = '<h2 style="color:var(--gold);margin-top:0">ビルド構成</h2>';
    h += '<div class="grid g2"><div>';
    h += '<h3 class="small">装備</h3>';
    h += '<div class="slots">' +
      slotBox('武器', hero.equip.weapon ? G.GEAR[hero.equip.weapon] : null, 'pickGear:weapon') +
      slotBox('防具', hero.equip.armor ? G.GEAR[hero.equip.armor] : null, 'pickGear:armor') +
      '</div>';
    h += '<h3 class="small" style="margin-top:12px">アクセサリ（4枠）</h3>' + UI.accSlots(hero, 'pickAcc');
    h += '<h3 class="small" style="margin-top:12px">所持アイテム</h3><div class="grid g3">';
    var ids = Object.keys(hero.items);
    h += ids.length ? ids.map(function (id) {
      var it = G.ITEM_BY_ID[id]; if (!it) return '';
      var usable = (it.use.type === 'heal' || it.use.type === 'mp' || it.use.type === 'full' || it.use.type === 'cleanse');
      return UI.itemCard(it, hero.items[id], usable ? { act: 'useOut:' + id, note: '<span class="r-legend">クリックで使用</span>' } : { cls: 'locked', note: '<span class="muted">戦闘中に使用</span>' });
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
    h += '<div class="sep"></div><div class="center"><button class="btn primary" data-act="closeModal">閉じる</button></div>';
    UI.modal(h);
  }

  function slotBox(label, g, act) {
    return '<div class="slot ' + (g ? '' : 'empty') + '" data-act="' + act + '">' +
      '<div class="sl">' + label + '</div>' +
      '<div class="sv ' + (g ? UI.rarityClass(g.rarity) : '') + '">' + (g ? g.name : '― 空き ―') + '</div>' +
      (g ? '<div class="tiny muted">' + UI.modsText(g.mods) + '</div>' : '') + '</div>';
  }

  /** アクセサリ選択 */
  function accPicker(state, slotIdx) {
    var hero = state.hero;
    var equipped = hero.equip.acc;
    var h = '<h2 style="margin-top:0">アクセサリ 枠' + (slotIdx + 1) + ' を選ぶ</h2>';
    h += '<p class="muted small">同じアクセサリを複数の枠に付けることはできない。</p>';
    h += '<div class="grid g2">';
    h += '<div class="card" data-act="setAcc:' + slotIdx + ':-1"><div class="cname muted">― 外す ―</div></div>';
    var counts = {};
    hero.bag.acc.forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
    Object.keys(counts).forEach(function (id) {
      var a = G.ACC_BY_ID[id];
      if (!a) return;
      var usedElsewhere = equipped.filter(function (x, i) { return x === id && i !== slotIdx; }).length;
      var free = counts[id] - usedElsewhere;
      var note = counts[id] > 1 ? '所持: ' + counts[id] : '';
      if (free <= 0) {
        h += UI.accCard(a, { cls: 'locked', note: '他の枠で装備中' });
      } else {
        h += UI.accCard(a, { act: 'setAcc:' + slotIdx + ':' + id, note: note });
      }
    });
    h += '</div><div class="sep"></div><div class="center"><button class="btn" data-act="buildOpen">戻る</button></div>';
    UI.modal(h);
  }

  /** 武器・防具選択 */
  function gearPicker(state, slot) {
    var hero = state.hero;
    var h = '<h2 style="margin-top:0">' + (slot === 'weapon' ? '武器' : '防具') + 'を選ぶ</h2><div class="grid g2">';
    h += '<div class="card" data-act="setGear:' + slot + ':-1"><div class="cname muted">― 外す ―</div></div>';
    var counts = {};
    hero.bag.gear.forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
    Object.keys(counts).forEach(function (id) {
      var g = G.GEAR[id];
      if (!g || g.slot !== slot) return;
      h += UI.gearCard(g, { act: 'setGear:' + slot + ':' + id, note: hero.equip[slot] === id ? '<span class="r-legend">装備中</span>' : (counts[id] > 1 ? '所持: ' + counts[id] : '') });
    });
    h += '</div><div class="sep"></div><div class="center"><button class="btn" data-act="buildOpen">戻る</button></div>';
    UI.modal(h);
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
      else h += '<div class="card locked bd-mythic"><div class="cname r-mythic">💍 ??????? <span class="tag mythic">ミシック</span></div>' +
        '<div class="cdesc"><span class="r-mythic">【取得条件】' + m.cond.label + '</span><br><span class="muted">ヒント: ' + m.cond.hint + '</span></div></div>';
    });
    h += '</div>';

    h += '<div class="sep"></div><h3 class="r-legend">職業ツリー</h3><div class="grid g2">';
    [1, 2, 3].forEach(function (t) {
      G.CLASS_LIST.filter(function (c) { return c.tier === t; }).forEach(function (c) {
        var seen = t === 1 || meta.classesSeen.indexOf(c.id) >= 0;
        h += '<div class="card ' + (seen ? '' : 'locked') + ' ' + (t === 3 ? 'bd-mythic' : t === 2 ? 'bd-legend' : '') + '">' +
          '<div class="cname ' + (t === 3 ? 'r-mythic' : t === 2 ? 'r-legend' : '') + '">' + c.icon + ' ' + c.name +
          ' <span class="tag">' + (t === 3 ? '最上級職' : t === 2 ? '上級職' : '初級職') + '</span></div>' +
          '<div class="cdesc">' + c.desc +
          (c.req ? '<br><b>解放条件:</b><br>' + c.req.map(function (r) { return '・' + r.label; }).join('<br>') +
            (c.from ? '<br>・前提職: ' + c.from.map(function (f) { return G.CLASSES[f].name; }).join(' / ') : '') : '') +
          '</div></div>';
      });
    });
    h += '</div>';

    h += '<div class="sep"></div><h3 class="r-legend">レジェンドアクセサリ</h3><div class="grid g2">' +
      G.LEGENDS.map(function (a) { return UI.accCard(a); }).join('') + '</div>';
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
    shop: shop, rest: rest, altar: altar, event: event,
    buildModal: buildModal, accPicker: accPicker, gearPicker: gearPicker, codex: codex, help: help,
    render: render
  };
})();
