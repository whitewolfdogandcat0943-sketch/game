/* paths.js - ダンジョンの分かれ道
 *
 * 「奥へ進む」を一度押すだけの場所は、地図ではなく廊下になる。
 * 廊下でも戦闘の中身は同じだが、どこを通ったか覚えていないので、
 * 三つ目のダンジョンには入った記憶すら残らない。
 *
 * そこで一歩ごとに道を選ばせる。ただし分岐そのものを目的にはしない。
 * 選択肢が増えても、正解が一つなら選んでいることにはならないので、
 * どの道にも「代わりに失うもの」を置く。
 *   本道     … 何も起きない。迷わない。
 *   脇道     … 敵は少ないが、その先は行き止まり（拾い物は確実）
 *   広間     … 精鋭が待つ。見返りは重い
 *   淀み     … 入るだけで傷を負う。代わりに良い物が眠る
 *   静区     … 戦わずに一歩進める。ただし一度きり
 *   隠し扉   … 稀にしか現れない。アクセサリが出る
 *
 * once を持つ道は「そのダンジョンで一度だけ」。
 * これが無いと、静かな区画を選び続けて戦わずに踏破できてしまう。
 */
G.PATHS = [];
(function () {
  var P = G.PATHS;
  function path(o) { P.push(o); return o; }

  path({
    id: 'main', name: '本道', icon: '🚶', w: 100,
    desc: '踏み固められた道。何が出るかは分かるが、避けようもない。',
    after: 'いつもどおりの道だった。'
  });

  path({
    id: 'side', name: '狭い脇道', icon: '🕯', w: 62,
    desc: '人ひとりぶんの隙間。数は来られない。奥に何か置いてある。',
    mobs: -1, find: 1.0,
    after: '通り抜けた先に、誰かの置き土産があった。'
  });

  path({
    id: 'hall', name: '崩れた広間', icon: '🏚', w: 52,
    desc: '天井の抜けた広い部屋。身を隠す場所がない代わりに、荷が残っている。',
    /* 精鋭は一体が重い。数まで並べると、難しくなるのではなく長くなるだけ。 */
    elite: true, mobs: -1, find: 0.85, findBonus: 1.5,
    when: function (c) { return c.at >= 1; },
    after: '広間の隅に、運び出せなかったものが積んであった。'
  });

  path({
    id: 'mire', name: '淀んだ底', icon: '🌫', w: 38,
    desc: '空気が重い。長く居るだけで体が削れる。だから誰も取りに来ていない。',
    toll: 0.09, find: 1.0, findBonus: 1.8, rare: 0.35,
    when: function (c) { return c.at >= 1; },
    after: '誰も踏み込まなかったぶん、そのまま残っていた。'
  });

  path({
    id: 'hush', name: '静まった区画', icon: '🤫', w: 34,
    desc: '物音がしない。急げば、何とも会わずに抜けられる。',
    skip: true, once: 'hush',
    when: function (c) { return c.at >= 1 && c.at < c.depth - 2; },
    after: '足音を殺して通り抜けた。何も得ず、何も失わなかった。'
  });

  path({
    id: 'door', name: '塗り込められた扉', icon: '🚪', w: 9,
    desc: '壁と同じ色で塗られた扉。隠したかった側にも、理由があったのだろう。',
    mobs: -1, find: 1.0, acc: true, once: 'door',
    when: function (c) { return c.at >= 1; },
    after: '扉の向こうは小部屋だった。誰かが、最後に隠した物がある。'
  });

  /* ===================== 組み立て ===================== */

  /** 今の一歩で選べる道を作る。
   *  同じ場所で何度描き直しても同じ顔ぶれになるよう、結果は dg に残す。 */
  G.rollPaths = function (state) {
    var U = G.U, dg = state.story && state.story.dungeon;
    if (!dg) return [];
    if (dg.paths && dg.pathsAt === dg.at) return dg.paths;
    var d = G.STORY.PLACE_BY_ID[dg.id];
    var ctx = { at: dg.at, depth: dg.depth, lv: d ? d.lv : 1, dg: dg, state: state };

    var pool = P.filter(function (p) {
      if (p.id === 'main') return false;
      if (p.when && !p.when(ctx)) return false;
      if (p.once && dg.usedPaths && dg.usedPaths[p.once]) return false;
      return true;
    });
    /* 本道は必ず一つ。迷うのが嫌な人に、迷わない道を残しておく。 */
    var out = [P[0]];
    var n = Math.min(2, pool.length);
    for (var i = 0; i < n; i++) {
      var got = U.weighted(pool.map(function (p) { return { ref: p, w: p.w }; })).ref;
      out.push(got);
      pool = pool.filter(function (p) { return p !== got; });
    }
    dg.paths = out.map(function (p) { return p.id; });
    dg.pathsAt = dg.at;
    return dg.paths;
  };

  G.PATH_BY_ID = {};
  P.forEach(function (p) { G.PATH_BY_ID[p.id] = p; });
})();
