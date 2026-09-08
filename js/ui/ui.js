/* ui.js - 描画ヘルパー */
G.UI = (function () {
  var U = G.U;

  /* ---------- トースト ---------- */
  function toast(text, cls) {
    var box = document.getElementById('toaster');
    var d = document.createElement('div');
    d.className = 'toast ' + (cls || '');
    d.innerHTML = text;
    box.appendChild(d);
    setTimeout(function () {
      d.style.transition = 'opacity .4s'; d.style.opacity = '0';
      setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 420);
    }, 4200);
  }

  /* ---------- モーダル ---------- */
  function modal(html) {
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
  }
  function closeModal() { document.getElementById('modal').classList.add('hidden'); }

  /* ---------- 小物 ---------- */
  function bar(cur, max, cls, label) {
    var p = max > 0 ? U.clamp(cur / max, 0, 1) * 100 : 0;
    return '<div class="barlabel"><span>' + (label || '') + '</span><span>' + Math.max(0, Math.round(cur)) + ' / ' + Math.round(max) + '</span></div>' +
      '<div class="bar ' + cls + '"><i style="width:' + p + '%"></i></div>';
  }

  function rarityLabel(r) {
    return { normal: '通常', legend: 'レジェンド', mythic: 'ミシック', common: '一般', rare: 'レア' }[r] || r;
  }
  function rarityClass(r) {
    return { normal: 'r-normal', legend: 'r-legend', mythic: 'r-mythic', rare: 'r-normal', common: 'r-common' }[r] || '';
  }

  /** modsオブジェクトを日本語の一覧に */
  function modsText(mods, sep) {
    if (!mods) return '';
    var out = [];
    for (var k in mods) {
      if (!mods.hasOwnProperty(k)) continue;
      var mk = G.MODKEYS[k];
      if (!mk) { out.push(k + ' ' + mods[k]); continue; }
      out.push(mk.label + ' ' + (mk.kind === 'pct' ? U.sgnp(mods[k]) : U.sgn(Math.round(mods[k] * 10) / 10)));
    }
    return out.join(sep || ' / ');
  }

  function flagsText(flags) {
    return (flags || []).map(function (f) { return '◆ ' + (G.FLAGS[f] || f); }).join('<br>');
  }

  /* ---------- ドット絵アイコン ---------- */
  var ELEM_HUE = { fire: 18, ice: 195, thunder: 48, wind: 140, light: 50, dark: 285 };

  /** アクセサリの属性modから色相を決める（属性系は宝石の色が変わる） */
  function accHue(a) {
    var best = null, bv = 0;
    G.MAGIC_ELEMENTS.forEach(function (e) {
      var v = (a.mods && a.mods['el_' + e]) || 0;
      if (v > bv) { bv = v; best = e; }
    });
    return best ? ELEM_HUE[best] : null;
  }
  function accIcon(a, px) { return G.Gfx.iconImg('acc', a.rarity, px || 2, accHue(a)); }
  function gearIcon(g, px) { return G.Gfx.iconImg(g.slot === 'weapon' ? 'weapon' : 'armor', g.rarity, px || 2); }
  function itemIcon(it, px) { return G.Gfx.iconImg('item', it && it.tier >= 3 ? 'legend' : 'normal', px || 2); }

  /* ---------- 装備・アイテムのカード ---------- */
  function gearCard(g, extra) {
    if (!g) return '';
    return '<div class="card ' + (extra && extra.cls || '') + '" ' + (extra && extra.act ? 'data-act="' + extra.act + '"' : '') + '>' +
      '<div class="cname ' + rarityClass(g.rarity) + '">' + gearIcon(g) + g.name +
      ' <span class="tag">' + rarityLabel(g.rarity) + '</span></div>' +
      '<div class="cdesc">' + modsText(g.mods) + (g.el && g.el !== 'phys' ? '<br>通常攻撃属性: ' + G.elSpan(g.el) : '') +
      (g.desc ? '<br>' + g.desc : '') + (g.flags ? '<br>' + flagsText(g.flags) : '') +
      (extra && extra.note ? '<br><span class="' + (extra.noteCls || '') + '">' + extra.note + '</span>' : '') +
      '</div></div>';
  }

  function accCard(a, extra) {
    if (!a) return '';
    var cond = '';
    if (a.rarity === 'mythic' && a.cond) {
      cond = '<br><span class="r-mythic tiny">【取得条件】' + a.cond.label + '</span>';
    }
    return '<div class="card bd-' + a.rarity + ' ' + (extra && extra.cls || '') + '" ' +
      (extra && extra.act ? 'data-act="' + extra.act + '"' : '') + '>' +
      '<div class="cname ' + rarityClass(a.rarity) + '">' + accIcon(a) + a.name +
      ' <span class="tag ' + a.rarity + '">' + rarityLabel(a.rarity) + '</span></div>' +
      '<div class="cdesc">' + modsText(a.mods) + (a.flags ? '<br>' + flagsText(a.flags) : '') +
      (a.desc ? '<br>' + a.desc : '') + cond +
      (extra && extra.note ? '<br><span class="' + (extra.noteCls || '') + '">' + extra.note + '</span>' : '') +
      '</div></div>';
  }

  function itemCard(it, count, extra) {
    return '<div class="card ' + (extra && extra.cls || '') + '" ' + (extra && extra.act ? 'data-act="' + extra.act + '"' : '') + '>' +
      '<div class="cname">' + itemIcon(it) + it.name + (count != null ? ' <span class="muted">×' + count + '</span>' : '') + '</div>' +
      '<div class="cdesc">' + it.desc + (extra && extra.note ? '<br>' + extra.note : '') + '</div></div>';
  }

  /* ---------- ステータス表 ---------- */
  function statTable(S) {
    function row(l, v) { return '<tr><td>' + l + '</td><td>' + v + '</td></tr>'; }
    var h = '<table class="stt">';
    h += row('最大HP', S.maxHp) + row('最大MP', S.maxMp);
    h += row('物理攻撃', S.atk) + row('魔法攻撃', S.mag);
    h += row('物理防御', S.def) + row('魔法防御', S.res) + row('素早さ', S.spd);
    h += row('会心率', U.pct(S.critRate)) + row('会心ダメージ', U.pct(S.critDmg));
    h += row('反射率', U.pct(S.reflect)) + row('反射威力', U.sgnp(S.reflectPow));
    h += row('波及率', U.pct(S.aoeRatio)) + row('範囲威力', U.sgnp(S.aoePower));
    h += row('耐性貫通', U.pct(S.pierce));
    h += row('アイテム威力', U.sgnp(S.itemPower)) + row('アイテム温存率', U.pct(S.itemKeep));
    h += row('吸収', U.pct(S.lifesteal)) + row('被ダメ軽減', U.pct(S.dr)) + row('回避率', U.pct(S.evade));
    h += '</table>';
    return h;
  }

  function elemTable(S) {
    var h = '<table class="stt">';
    G.ALL_ELEMENTS.forEach(function (e) {
      h += '<tr><td>' + G.elSpan(e) + '</td><td>' + U.sgnp(S['el_' + e] || 0) + '</td></tr>';
    });
    h += '</table>';
    return h;
  }

  /* ---------- アクセ4枠 ---------- */
  function accSlots(hero, actPrefix) {
    var h = '<div class="slots">';
    for (var i = 0; i < 4; i++) {
      var id = hero.equip.acc[i];
      var a = id ? G.ACC_BY_ID[id] : null;
      h += '<div class="slot ' + (a ? 'bd-' + a.rarity : 'empty') + '" data-act="' + actPrefix + ':' + i + '">' +
        '<div class="sl">アクセサリ ' + (i + 1) + '</div>' +
        '<div class="sv ' + (a ? rarityClass(a.rarity) : '') + '">' + (a ? accIcon(a) + a.name : '― 空き ―') + '</div>' +
        (a ? '<div class="tiny muted">' + modsText(a.mods) + '</div>' : '') +
        '</div>';
    }
    h += '</div>';
    return h;
  }

  /* ---------- ヘッダー ---------- */
  function runInfo(state) {
    var el = document.getElementById('runinfo');
    if (!state.hero) { el.innerHTML = ''; return; }
    var hero = state.hero, S = G.Stats.compute(hero).S, cls = G.CLASSES[hero.classId];
    el.innerHTML =
      '<span>' + G.Gfx.classImg(hero.classId, 2, '', 'style="display:inline-block;vertical-align:-6px;margin-right:4px"') +
      '<b>' + U.esc(hero.name) + '</b> / ' + cls.name +
      (cls.tier === 3 ? '<span class="r-mythic"> ★最上級</span>' : cls.tier === 2 ? '<span class="r-legend"> ☆上級</span>' : '') + '</span>' +
      '<span>Lv <b>' + hero.level + '</b></span>' +
      '<span>HP <b>' + Math.max(0, hero.hp) + '</b>/' + S.maxHp + '</span>' +
      '<span>MP <b>' + hero.mp + '</b>/' + S.maxMp + '</span>' +
      '<span>💰 <b>' + hero.gold + '</b></span>' +
      '<span>階層 <b>' + state.run.floor + '</b>F</span>';
  }

  return {
    toast: toast, modal: modal, closeModal: closeModal, bar: bar,
    rarityLabel: rarityLabel, rarityClass: rarityClass, modsText: modsText, flagsText: flagsText,
    gearCard: gearCard, accCard: accCard, itemCard: itemCard,
    accIcon: accIcon, gearIcon: gearIcon, itemIcon: itemIcon, accHue: accHue,
    statTable: statTable, elemTable: elemTable, accSlots: accSlots, runInfo: runInfo
  };
})();
