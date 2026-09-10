/* difficulty.js - 難易度モード
 *
 * 数値の掛け算だけでなく「何体出るか」「どこを狙うか」「終盤に追撃してくるか」も変える。
 * 倍率だけを上げると、ただ長い戦闘になって手応えにならない。
 *
 * ここの倍率は塔の踏破率で較正してある（塔は敵の硬さがそのまま壁になるモードで、
 * ehp と edf をわずかに下げるだけで踏破率が倍近く動く）。
 * 物語側が長すぎる・短すぎるときは、この倍率ではなく章のデータで直すこと。 */
(function () {
  var D = [];
  function d(o) { D.push(o); return o; }

  d({
    id: 'gentle', name: 'やさしい', icon: '🌱',
    lead: '物語を追いたい人へ',
    desc: '敵は弱く、こちらの倒れにくさも上がる。ビルドを試しながら気楽に進める。',
    ehp: 0.78, epw: 0.70, edf: 0.88,          /* 雑魚のHP / 火力 / 防御 */
    bhp: 0.74, bpw: 0.70,                      /* ボスのHP / 火力 */
    adds: 0, mobPlus: 0,                       /* 増える取り巻き / 雑魚の数 */
    /* ボスの追撃が始まる残HP割合。0 なら追撃しない。
     * 全編を通して2回動かれると戦いが単に倍の長さになるので、
     * 「終盤だけ畳みかけてくる」形にしている。 */
    bossFollow: 0,
    rageFrom: 36,                              /* 激昂が始まるラウンド */
    rw: 1.00, drop: 0, aim: 0,                 /* 経験値金 / ドロップ率 / 狙いの鋭さ */
    playerDr: 0.12, fleeUp: 0.15,              /* こちらの被ダメ軽減 / 逃走のしやすさ */
    /* 物語モードで「世界がこちらの育ちにどこまで付いてくるか」。
     * 倍率だけを上げる難易度は、詰まったぶん余分に稼いだレベルで薄まってしまう。
     * 稼げば楽になる余地はやさしい側に厚く残し、上の難度では世界が追ってくる。
     * track: 道中が追う係数 / trackCap: 章の設計値からの上限
     * bossTrack: 章の主が追ってよい上限（0 なら設計どおりの相手のまま） */
    track: 0.60, trackCap: 5, bossTrack: 0
  });
  d({
    id: 'normal', name: '標準', icon: '⚔',
    lead: 'このゲームの基準',
    desc: '章の主とは正面から殴り合いになる。装備とアクセの相性を考えないと押し切られる。',
    ehp: 1.00, epw: 1.00, edf: 1.00,
    bhp: 1.00, bpw: 1.00,
    adds: 0, mobPlus: 0,
    bossFollow: 0,
    rageFrom: 32,
    rw: 1.00, drop: 0, aim: 0.25,
    playerDr: 0, fleeUp: 0,
    track: 0.68, trackCap: 8, bossTrack: 0
  });
  d({
    id: 'hard', name: '高難度', icon: '🔥',
    lead: '一度クリアした人へ',
    desc: '取り巻きが増え、敵は弱っている者から狙ってくる。' +
          '<b>ボスは残りHP3割から、ラウンドの終わりにもう一撃入れてくる。</b>' +
          'こちらが育てば、章の主もある程度まで付いてくる。',
    ehp: 1.15, epw: 1.10, edf: 1.07,
    bhp: 1.06, bpw: 1.03,
    adds: 1, mobPlus: 1,
    bossFollow: 0.30,
    rageFrom: 30,
    rw: 1.18, drop: 0.10, aim: 0.45,
    playerDr: 0, fleeUp: -0.10,
    track: 0.72, trackCap: 10, bossTrack: 1
  });
  d({
    id: 'brutal', name: '相剋', icon: '💀',
    lead: 'ビルドを詰めた人へ',
    desc: '事故ではなく構成で負ける難度。<b>ボスは残りHP6割から追撃を始める</b>。' +
          '狙いはほぼ確実にいちばん脆い者へ飛び、逃げ足も鈍る。' +
          '<b>稼いで格上になっても、世界がそこまで追ってくる。</b>',
    ehp: 1.22, epw: 1.16, edf: 1.12,
    /* 追撃を足した頃、ボスが強すぎたので倍率を下げてあった。
     * その結果、相剋のボスは高難度より弱いという逆転が残っていた
     * （bhp 1.00 < 1.06）。どの軸でも高難度を下回らないように直した。 */
    bhp: 1.08, bpw: 1.02,
    adds: 1, mobPlus: 1,
    bossFollow: 0.60,
    rageFrom: 28,
    rw: 1.40, drop: 0.20, aim: 0.80,
    playerDr: 0, fleeUp: -0.20,
    track: 0.76, trackCap: 12, bossTrack: 2
  });

  var byId = {};
  D.forEach(function (x) { byId[x.id] = x; });

  var cur = byId.normal;

  G.DIFFS = D;
  G.DIFF_BY_ID = byId;
  G.Diff = {
    list: function () { return D; },
    /** 今の難易度。設定前でも必ず何かを返す。 */
    get: function () { return cur; },
    id: function () { return cur.id; },
    set: function (id) { cur = byId[id] || byId.normal; return cur; },
    /** 敵1体への倍率。ボスと雑魚で別の数字を使う。 */
    scaleFor: function (def) {
      var c = cur;
      return def && def.boss
        ? { hp: c.bhp, pw: c.bpw, df: 1 + (c.edf - 1) * 0.6 }
        : { hp: c.ehp, pw: c.epw, df: c.edf };
    }
  };
})();
