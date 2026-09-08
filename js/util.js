/* ============================================================
 *  相剋のビルドサーガ / BUILD SAGA
 *  util.js - 共通ユーティリティ
 * ============================================================ */
var G = window.G || {};
window.G = G;

G.U = (function () {
  /** 0以上max未満の整数 */
  function ri(max) { return Math.floor(Math.random() * max); }
  /** min以上max以下の整数 */
  function rint(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
  function rf(min, max) { return min + Math.random() * (max - min); }
  function chance(p) { return Math.random() < p; }
  function pick(arr) { return arr[ri(arr.length)]; }

  /** 重複なしでn件抽出（配列は破壊しない） */
  function sample(arr, n) {
    var c = arr.slice(), out = [];
    while (c.length && out.length < n) out.push(c.splice(ri(c.length), 1)[0]);
    return out;
  }

  /** [{w:重み,...}] から重み付き抽選 */
  function weighted(list) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += (list[i].w || 1);
    var r = Math.random() * total;
    for (i = 0; i < list.length; i++) {
      r -= (list[i].w || 1);
      if (r <= 0) return list[i];
    }
    return list[list.length - 1];
  }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function pct(v) { return Math.round(v * 100) + '%'; }
  function sgn(v) { return (v >= 0 ? '+' : '') + v; }
  function sgnp(v) { return (v >= 0 ? '+' : '') + Math.round(v * 100) + '%'; }
  function uid() { return 'u' + (uid._n = (uid._n || 0) + 1) + '_' + ri(9999); }

  /** HTMLエスケープ（データ由来文字列の埋め込み用） */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function el(sel, root) { return (root || document).querySelector(sel); }
  function els(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /** data-act 属性によるイベント委譲 */
  function delegate(root, attr, handler) {
    root.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== root) {
        if (t.hasAttribute && t.hasAttribute(attr)) { handler(t.getAttribute(attr), t, e); return; }
        t = t.parentNode;
      }
    });
  }

  function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }

  return {
    ri: ri, rint: rint, rf: rf, chance: chance, pick: pick, sample: sample,
    weighted: weighted, clamp: clamp, pct: pct, sgn: sgn, sgnp: sgnp,
    uid: uid, esc: esc, el: el, els: els, delegate: delegate, deepCopy: deepCopy
  };
})();
