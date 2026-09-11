/* barks.js - 戦闘中の掛け合い
 *
 * 数字だけが動く画面は、強くはなってもRPGにはならない。
 * 戦いのあいだに短い言葉が挟まると、同じ戦闘が「この一行の出来事」になる。
 *
 * 方針は3つ。
 *  1) 出しすぎない。1ラウンドに1回、1戦に数回まで。台詞は薄めるほど効く。
 *  2) 掛け合いにする。独り言より、誰かが受けたほうが人物が立つ。
 *  3) 場に紐づける。倒れた・追い込まれた・あの相手が出た、に反応させる。
 *
 * who / to は仲間ID（hero は主人公）。その人が戦線に居ないなら台詞は出ない。
 * if は場面の条件。realm は 'mid'（物語）/'norse'（塔）の出し分け。
 */
G.BARKS = [];
(function () {
  var B = G.BARKS;
  function bark(o) { B.push(o); return o; }

  /* 相手の種類を見るための小道具。rec.foeIds に敵の定義IDが入っている */
  function foe(b, frag) {
    return (b.rec.foeIds || []).some(function (id) { return id.indexOf(frag) >= 0; });
  }
  function bossIs(b, id) { return (b.rec.bossIds || []).indexOf(id) >= 0; }
  G.BARK_FOE = foe;

  /* ===================== 戦闘の入り口 ===================== */

  bark({ on: 'start', who: 'garo', t: '前は俺が塞ぐ。抜かれたら、そのとき謝る。',
         to: 'sera', r: '謝られても死人は戻らないのだけど。' });
  bark({ on: 'start', who: 'sera', t: '数は三、体温はばらばら。……群れじゃないわね、これ。',
         to: 'hero', r: 'なら、崩すのは易い。' });
  bark({ on: 'start', who: 'mina', t: '無理はしないで。治すのは、無理をしなかった人のほうが早いんです。',
         to: 'garo', r: '覚えとく。たぶん忘れる。' });
  bark({ on: 'start', who: 'hero', t: '……手順どおりでいい。焦ると、順番を間違える。' });
  bark({ on: 'start', who: 'garo', t: 'よし。', to: 'sera', r: 'それだけ？' });
  bark({ on: 'start', who: 'sera', t: '観察は済んだわ。あとは、当てるだけ。' });
  bark({ on: 'start', who: 'mina', t: '……四人。ちゃんと四人で、帰りますからね。',
         if: function (b) { return (b.party || []).filter(function (u) { return u.hero; }).length >= 4; } });
  bark({ on: 'start', who: 'hero', t: '衛士長なら、ここで何て言うかな。',
         to: 'garo', r: '「行け」だ。それしか言わん。' });

  /* 相手の顔ぶれに反応する。同じ「戦闘開始」でも、見えているものが違う */
  bark({ on: 'start', who: 'mina', t: '……人だったものが、まだ立ってる。せめて、止めてあげましょう。',
         if: function (b) { return foe(b, 'ghoul') || foe(b, 'wraith') || foe(b, 'revenant') || foe(b, 'skel'); } });
  bark({ on: 'start', who: 'sera', t: '獣ね。理屈は無いけれど、速い。読み違えないで。',
         if: function (b) { return foe(b, 'wolf') || foe(b, 'beast') || foe(b, 'hound'); } });
  bark({ on: 'start', who: 'garo', t: '硬い相手だ。俺が張り付く。削るのは任せた。',
         if: function (b) { return foe(b, 'golem') || foe(b, 'armor') || foe(b, 'stone'); } });
  bark({ on: 'start', who: 'sera', t: '術を使う。先に黙らせるのが早いわ。',
         if: function (b) { return foe(b, 'mage') || foe(b, 'sorcer') || foe(b, 'seer') || foe(b, 'priest'); } });

  /* 塔（北欧）の側。ここは世界がひとつ違うので、言い方も変える */
  bark({ on: 'start', realm: 'norse', who: 'sera', t: 'この階の空気、外の理屈が通ってない。詠唱が半拍ずれる。',
         to: 'hero', r: 'なら、半拍ぶん早く動く。' });
  bark({ on: 'start', realm: 'norse', who: 'garo', t: '塔の連中は、死んでも痛がらん。嫌な戦い方だ。' });
  bark({ on: 'start', realm: 'norse', who: 'mina', t: '……この子たち、誰かに呼ばれて来てる気がします。' });
  bark({ on: 'start', realm: 'norse', who: 'hero', t: '神話の続きを、こっちが引き受ける義理はないんだがな。',
         to: 'sera', r: '引き受けたのは、あなたが階段を上ったからよ。' });

  /* ===================== 主戦（ボス） ===================== */

  bark({ on: 'boss', who: 'garo', t: '……でかいな。',
         to: 'sera', r: '大きさは的の大きさよ。悪い話ばかりじゃないわ。' });
  bark({ on: 'boss', who: 'mina', t: '倒れても、私が起こします。だから、前を見ていて。',
         to: 'garo', r: '起こされる前提で立つのはやめとく。' });
  bark({ on: 'boss', who: 'hero', t: '退けない。退いたら、後ろが全部そうなる。' });
  bark({ on: 'boss', who: 'sera', t: '一手目で流れが決まる型よ。……任せていい？',
         to: 'hero', r: '任せろとは言わない。合わせろ。' });
  bark({ on: 'boss', who: 'garo', t: '俺の後ろ、三歩。そこから出るな。',
         to: 'mina', r: '三歩ですね。覚えました。' });

  bark({ on: 'boss', realm: 'norse', who: 'sera', t: '記録にある姿と違う。……語られるうちに、育ったのね。' });
  bark({ on: 'boss', realm: 'norse', who: 'mina', t: '縛られてる。痛そうな縛られ方です。',
         if: function (b) { return bossIs(b, 'nb_fenrir'); },
         to: 'garo', r: 'それでも噛むぞ。縄は同情しない。' });
  bark({ on: 'boss', realm: 'norse', who: 'garo', t: '今度は縄が無い。……そういうことか。',
         if: function (b) { return bossIs(b, 'nb_fenrir_true'); },
         to: 'hero', r: 'ああ。ここからが本物だ。' });
  bark({ on: 'boss', realm: 'norse', who: 'sera', t: '熱で空気が歪んでる。視界を信じないで。',
         if: function (b) { return bossIs(b, 'nb_surtr'); } });
  bark({ on: 'boss', realm: 'norse', who: 'mina', t: '……この方は、迎えに来ただけなのかもしれません。',
         if: function (b) { return bossIs(b, 'nb_hel'); },
         to: 'hero', r: '迎えは断る。まだ用がある。' });

  /* ===================== 窮地 ===================== */

  bark({ on: 'pinch', who: 'mina', t: 'まだ立てます。手は、まだ動きます。' });
  bark({ on: 'pinch', who: 'garo', t: 'この程度で倒れたら、盾の名が泣く。',
         to: 'mina', r: '名前より、あなたが泣かないでください。' });
  bark({ on: 'pinch', who: 'sera', t: '……詠唱が、続かない。誰か、一拍だけ稼いで。',
         to: 'garo', r: '一拍だな。十数えてやる。' });
  bark({ on: 'pinch', who: 'hero', t: '見習いのまま終わるのは、格好がつかない。' });

  bark({ on: 'down', who: 'mina', t: '起きて。まだ終わってない。……お願い、起きて。' });
  bark({ on: 'down', who: 'garo', t: '俺が前に居て、これか。……次はない。' });
  bark({ on: 'down', who: 'sera', t: '計算が甘かった。……謝罪は後で、まとめてする。' });
  bark({ on: 'down', who: 'hero', t: '下がれ。ここからは、こっちが受ける。' });
  bark({ on: 'down', who: 'garo', t: 'ミナ！ ……くそ、前に出るなと言ったろうが。',
         if: function (b, c) { return c.who === 'mina'; } });
  bark({ on: 'down', who: 'sera', t: 'ガロが落ちた。……壁が無いなら、こちらが壁になるしかないわね。',
         if: function (b, c) { return c.who === 'garo'; } });
  bark({ on: 'down', who: 'mina', t: 'セラさん！ 息はあります、まだ間に合う！',
         if: function (b, c) { return c.who === 'sera'; } });
  bark({ on: 'down', who: 'garo', t: '隊長が落ちた前線は、崩れるのが早い。……崩さんぞ。',
         if: function (b, c) { return c.who === 'hero'; } });

  bark({ on: 'revive', who: 'mina', t: 'おかえりなさい。……次は、倒れる前に言ってください。' });
  bark({ on: 'revive', who: 'garo', t: '立てるか。立てるなら、それでいい。' });
  bark({ on: 'revive', who: 'sera', t: '生き返る手順って、何度見ても理屈に合わないわ。' });

  /* ===================== 決着 ===================== */

  bark({ on: 'win', who: 'garo', t: '……よし。次だ。' });
  bark({ on: 'win', who: 'sera', t: '想定より二手、多かった。詰めておくわ。' });
  bark({ on: 'win', who: 'mina', t: '全員ぶん、手当てします。座って。' });
  bark({ on: 'win', who: 'hero', t: '……息を整える。走るのは、それからだ。' });
  bark({ on: 'win', who: 'garo', t: '無傷だな。',
         to: 'sera', r: '無傷のときほど、何かを見落としてるものよ。',
         if: function (b) { return b.rec.damageTaken === 0; } });
  bark({ on: 'win', who: 'sera', t: '……長かった。私の魔力の話ではなく、みんなの膝の話。',
         if: function (b) { return b.round >= 8; } });

  bark({ on: 'bosswin', who: 'mina', t: '終わりました。……終わった、でいいんですよね。' });
  bark({ on: 'bosswin', who: 'garo', t: 'こいつを越えた。次は、もっとでかいのが来る。',
         to: 'hero', r: '分かってる。だから、今のうちに整える。' });
  bark({ on: 'bosswin', who: 'sera', t: '記録しておくわ。次に同じものと会ったとき、二手で終わらせたい。' });
  bark({ on: 'bosswin', realm: 'norse', who: 'sera', t: '一段ぶん、神話が短くなった。……いい気分ではないわね。' });
  bark({ on: 'bosswin', realm: 'norse', who: 'mina', t: '塔が、少し静かになりました。' });
})();

/* ===================== 発火まわり =====================
 *
 * 台詞は「出す」より「出さない」ほうが難しい。
 * 毎戦・毎ラウンド喋る仲間はうるさいだけで、3戦目には読み飛ばされる。
 * ここで絞る条件は次のとおり。
 *   - 1ラウンドに1回まで
 *   - 同じ場面（on＋対象）は1戦に1回まで。出すか黙るかもそこで一度だけ決める
 *     （長引く戦いは同じ条件を何度も満たすので、都度ふるいに掛けると結局必ず喋る）
 *   - 通常戦は合計2回、主戦は3回まで
 *   - そもそも喋らない戦いが3割ほどある。静かな戦闘が無いと、台詞が背景になる
 */
G.Barks = (function () {
  /* 場面ごとの「喋る確率」。決着は流れの締めなので通しやすく、
   * 何度でも起きうる窮地や脱落は絞る。 */
  var GATE = { start: 0.55, boss: 0.85, pinch: 0.45, down: 0.60, revive: 0.40,
               win: 0.45, bosswin: 0.90 };

  function heroIdOf(u) { return u.hero ? (u.hero.allyId || 'hero') : null; }

  /** 戦線に居て、まだ立っている仲間のID集合 */
  function onField(b) {
    var m = {};
    (b.party || []).forEach(function (u) {
      if (!u.hero || u.hp <= 0) return;
      m[heroIdOf(u)] = u;
    });
    return m;
  }

  function realm(b) {
    return (G.realmOf ? G.realmOf(b.state) : 'mid');
  }

  function say(b, unit, text) {
    b.log.push({ t: '💬 ' + unit.name + '「' + text + '」', c: 'bark' });
  }

  function fire(b, on, ctx) {
    if (!b || b.over && on !== 'win' && on !== 'bosswin') return false;
    ctx = ctx || {};
    if (!b._bk) b._bk = { round: -1, n: 0, used: {}, mute: !G.U.chance(0.70) };
    var st = b._bk;
    if (st.mute) return false;
    var cap = b.isBoss ? 3 : 2;
    if (st.n >= cap) return false;
    if (st.round === b.round && on !== 'bosswin' && on !== 'win') return false;
    var key = on + '|' + (ctx.who || '');
    if (st.used[key]) return false;
    /* 場面ごとのふるい。落ちた場合も「この場面は済み」として閉じる。
     * そうしないと、同じ窮地が続くあいだ毎回振り直して必ず当たる。 */
    var gate = GATE[on];
    if (gate != null && !G.U.chance(gate)) { st.used[key] = true; return false; }

    var here = onField(b);
    var rl = realm(b);
    var pool = G.BARKS.filter(function (e) {
      if (e.on !== on) return false;
      if (e.realm && e.realm !== rl) return false;
      if (!here[e.who]) return false;
      if (e.to && !here[e.to]) return false;
      if (e.if) { try { if (!e.if(b, ctx)) return false; } catch (err) { return false; } }
      /* 倒れた本人が自分の脱落を実況することはない */
      if (on === 'down' && e.who === ctx.who) return false;
      return true;
    });
    if (!pool.length) return false;

    /* 条件つきの台詞（その相手・その状況を名指ししているもの）を優先する。
     * 汎用と同じ確率で引くと、せっかく書いた固有の反応がまず出ない。 */
    var special = pool.filter(function (e) { return !!e.if || !!e.realm; });
    var e = (special.length && Math.random() < 0.75) ? pick(special) : pick(pool);

    say(b, here[e.who], e.t);
    if (e.to && e.r) say(b, here[e.to], e.r);
    st.used[key] = true;
    st.round = b.round;
    st.n++;
    return true;
  }

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  return { fire: fire };
})();
