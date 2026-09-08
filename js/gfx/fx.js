/* fx.js - 控えめな戦闘演出とビジュアル
 *
 * 戦闘の解決は同期的に行われ、その後に画面が再構築される。
 * そこで battle.fx に積まれたイベントを、描画後に少しずつ再生する。
 * 読みやすさを最優先し、画面全体を揺らすような強い演出は使わない。
 */
G.Fx = (function () {
  var U = G.U;

  var reduce = false;
  try {
    reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { reduce = false; }

  var timers = [];
  function clearTimers() {
    timers.forEach(function (t) { clearTimeout(t); });
    timers = [];
  }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  /** 対象ユニットのDOM要素 */
  function unitEl(idx) { return document.querySelector('[data-unit="' + idx + '"]'); }

  /** 浮かび上がる数字 */
  function popup(idx, text, cls) {
    var el = unitEl(idx);
    if (!el) return;
    var host = el.querySelector('.sprwrap') || el;
    var d = document.createElement('div');
    d.className = 'pop ' + (cls || '');
    d.textContent = text;
    d.style.marginLeft = U.rint(-20, 20) + 'px';
    host.appendChild(d);
    later(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 900);
  }

  function flash(idx, cls) {
    var el = unitEl(idx);
    if (!el) return;
    var spr = el.querySelector('.spr');
    if (!spr) return;
    spr.classList.remove('hit', 'act');
    void spr.offsetWidth;           /* アニメーションの再起動 */
    spr.classList.add(cls || 'hit');
    later(function () { spr.classList.remove(cls || 'hit'); }, 400);
  }

  /** battle.fx を順に再生して空にする */
  function play(b) {
    clearTimers();
    if (!b || !b.fx || !b.fx.length) return;
    var evs = b.fx.slice(0, 22);
    b.fx = [];
    if (reduce) return;

    var t = 0;
    evs.forEach(function (e) {
      later(function () {
        if (e.t === 'act') { flash(e.i, 'act'); return; }
        if (e.t === 'dmg') {
          var cls = e.crit ? 'crit' : (e.reflect ? 'refl' : (e.aoe ? 'aoe' : ''));
          var txt = (e.crit ? '' : '') + e.v;
          popup(e.i, txt, cls);
          flash(e.i, 'hit');
          return;
        }
        if (e.t === 'heal') { popup(e.i, '+' + e.v, 'heal'); return; }
        if (e.t === 'miss') { popup(e.i, 'MISS', 'miss'); return; }
        if (e.t === 'die') {
          var el = unitEl(e.i);
          if (el) { var s = el.querySelector('.spr'); if (s) s.classList.add('fall'); }
          return;
        }
      }, t);
      t += (e.t === 'act' ? 60 : 85);
    });
  }

  /* ===================== 背景 ===================== */
  /* 階層帯ごとの雰囲気（CSSカスタムプロパティを差し替えるだけの控えめな実装） */
  var BANDS = [
    { max: 5,   name: '苔むした坑道', a: '#16223a', b: '#0b0e18', tint: '#2a4a3a' },
    { max: 12,  name: '凍てつく回廊', a: '#132a3d', b: '#0a0f1a', tint: '#1f4a5e' },
    { max: 19,  name: '燃える大聖堂', a: '#2a1728', b: '#100a16', tint: '#5e2440' },
    { max: 24,  name: '星のない深層', a: '#1b1636', b: '#0a0912', tint: '#3a2a6a' },
    { max: 999, name: '深淵',         a: '#241033', b: '#08060f', tint: '#5a1f66' }
  ];

  function band(floor) {
    for (var i = 0; i < BANDS.length; i++) if (floor <= BANDS[i].max) return BANDS[i];
    return BANDS[BANDS.length - 1];
  }

  /** 階層に応じて背景と縁の色味を切り替える */
  function applyBackground(floor) {
    var bd = band(floor || 1);
    var root = document.documentElement;
    root.style.setProperty('--bgA', bd.a);
    root.style.setProperty('--bgB', bd.b);
    root.style.setProperty('--tint', bd.tint);
    return bd;
  }

  function bandName(floor) { return band(floor || 1).name; }

  return { play: play, popup: popup, flash: flash, applyBackground: applyBackground, bandName: bandName, band: band };
})();
