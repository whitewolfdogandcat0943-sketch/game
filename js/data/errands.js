/* errands.js - 町の頼まれごと
 *
 * 町が「宿・店・祭壇」の three buttons だけだと、
 * そこは町ではなく設備の並んだ画面になる。人が住んでいる感じがしない。
 *
 * 大げさな依頼は要らない。世界を救う片手間に、
 * 「水路の鼠を減らしてくれ」「薬草を分けてくれ」と言われるくらいでいい。
 * 本筋を止めず、断っても何も失わず、やれば少し楽になる。それだけの用事。
 *
 * kind:
 *   kill  … 指定の相手を n 体。道中で勝手に達成されることが多い
 *   bring … 手持ちの品を n 個ゆずる。買って納めてもいい
 *
 * 報酬は金と品のほかに、章に一つだけアクセサリを置いてある。
 * 拾い物でも主戦のドロップでもない「人からもらった装備」を作るため。
 */
G.ERRANDS = [];
(function () {
  var E = G.ERRANDS;
  function e(o) { E.push(o); return o; }

  /* --- 第一章 灰都ルヴィナ --- */
  e({
    id: 'q_rats', ch: 1, town: 'luvina', who: '水路番の老人',
    ask: '水路の下でスライムが増えてな。あれは石の色を舐め取る。3匹でいい、減らしてくれんか。',
    kind: 'kill', target: 'slime', n: 3,
    mid: 'まだ居るだろう。あれは湧く。',
    done: '助かった。……礼といっては何だが、息子の形見でな。もう、使う者がおらん。',
    reward: { gold: 120, items: [['i_potion', 3]], acc: 'n_ironcharm' }
  });
  e({
    id: 'q_herb', ch: 1, town: 'luvina', who: '施療院の看護人',
    ask: '薬草が足りません。東区の畑が灰になってしまって。3つ、分けてもらえませんか。',
    kind: 'bring', item: 'i_herb', n: 3,
    mid: 'あと少しなんです。……いえ、急かしてはいません。',
    done: 'ありがとうございます。ミナさんの言うとおりの人でした。',
    reward: { gold: 60, items: [['i_hipotion', 2]] }
  });

  /* --- 第二章 宿場ロウ --- */
  e({
    id: 'q_bones', ch: 2, town: 'row', who: '隊商の護衛',
    ask: '城塞跡から骨が街道まで出てきやがる。3体ばかり片づけてくれ。荷が動かん。',
    kind: 'kill', target: 'skeleton', n: 3,
    mid: 'まだ道が開かん。焦るな、とは言えんが。',
    done: '道が通った。あんた、見習いにしちゃ話が早いな。',
    reward: { gold: 200, items: [['i_hipotion', 2]] }
  });
  e({
    id: 'q_ether', ch: 2, town: 'row', who: '逃げてきた術士',
    ask: '杖を折られた。……エーテルを2つ、譲ってもらえないか。自分で言っていて情けないが。',
    kind: 'bring', item: 'i_ether', n: 2,
    mid: '急がなくていい。どうせ、もう行く場所もない。',
    done: '助かった。これは城塞で拾ったものだ。私には、もう重い。',
    reward: { gold: 120, acc: 'n_manaloop' }
  });

  /* --- 第三章 学都アイル --- */
  e({
    id: 'q_witch', ch: 3, town: 'ile', who: '学舎の司書',
    ask: '氷の魔女が書庫に入り込んでいます。本が凍る前に、3体。……本のほうが大事か、と言われると困りますが。',
    kind: 'kill', target: 'icewitch', n: 3,
    mid: '書架の三列目まで凍りました。まだ、間に合います。',
    done: '書庫が守れました。これは凍った棚から出てきたものです。読めないので、あなたに。',
    reward: { gold: 320, items: [['i_ether', 3]], acc: 'n_archmagepin' }
  });
  e({
    id: 'q_holy', ch: 3, town: 'ile', who: '湖畔の祈祷師',
    ask: '聖水を2つ。湖の縁に、上がってこられないものが沈んでいる。せめて濁りだけでも払いたい。',
    kind: 'bring', item: 'i_holywater', n: 2,
    mid: '湖はまだ黙っています。',
    done: '濁りが引きました。……沈んでいたものは、そのままです。それでいいのです。',
    reward: { gold: 240, items: [['i_elixir', 1]] }
  });

  /* --- 第四章 風の里サイ --- */
  e({
    id: 'q_hawk', ch: 4, town: 'sai', who: '風車守り',
    ask: '雷鷹が羽根車に巣を作った。4羽だ。落とすのは気が進まんが、里が止まっている。',
    kind: 'kill', target: 'thundhawk', n: 4,
    mid: 'まだ回らん。風はあるのにな。',
    done: '風車が回った。久しぶりに、里の音がした。これは初代の風読みの形見だ。持っていけ。',
    reward: { gold: 480, items: [['i_hipotion', 3]], acc: 'n_swiftboots' }
  });
  e({
    id: 'q_bomb', ch: 4, town: 'sai', who: '鍛冶の娘',
    ask: '雷の呪符を3枚ゆずって。父さんの炉が、風がないと火が起きないの。',
    kind: 'bring', item: 'i_tbomb', n: 3,
    mid: '炉はまだ冷たいまま。',
    done: '火が入った。父さん、久しぶりに鎚を持ったよ。……ありがとう。',
    reward: { gold: 360, items: [['i_powerdrug', 2]] }
  });

  /* --- 第五章 王都ヴェルド --- */
  e({
    id: 'q_knight', ch: 5, town: 'veld', who: '城門の老兵',
    ask: '城の下に魔騎士が4騎。誰も居ないことになっている。……居ないものは、倒しても記録に残らん。',
    kind: 'kill', target: 'demonknight', n: 4,
    mid: '数は減っている。誰も気づいていないがな。',
    done: '居ないものが、居なくなった。これは、記録に残らなかった連中の分だ。',
    reward: { gold: 700, items: [['i_elixir', 2]], acc: 'n_bulwark' }
  });
  e({
    id: 'q_elixir', ch: 5, town: 'veld', who: '笑わない給仕',
    ask: 'エリクサーを1つ、こっそり。……誰にも言わないで。この街では、具合が悪いのは無かったことになるから。',
    kind: 'bring', item: 'i_elixir', n: 1,
    mid: 'まだ大丈夫。大丈夫ということにしています。',
    done: '……初めて、誰かに言えました。それだけで、少し楽です。',
    reward: { gold: 560, items: [['i_hipotion', 4]] }
  });

  /* --- 第六章 最果ての野営地 --- */
  e({
    id: 'q_mirror', ch: 6, town: 'camp', who: '帰らない斥候',
    ask: '鏡面騎士を2騎。……あれは倒すと、こちらの顔をして崩れる。見たくないなら、断ってくれていい。',
    kind: 'kill', target: 'mirrorknight', n: 2,
    mid: '見たか。……そうか。すまん。',
    done: 'よく戻った。これは、俺の顔で崩れた奴が落としていった。俺が持つ物じゃない。',
    reward: { gold: 1100, items: [['i_elixir', 3]], acc: 'n_luckcoin' }
  });
  e({
    id: 'q_last', ch: 6, town: 'camp', who: '焚き火の番人',
    ask: '大爆弾を2つ。……縁の向こうへ降りる連中に、いつも一つずつ持たせている。帰ってきた者は、まだいない。',
    kind: 'bring', item: 'i_megabomb', n: 2,
    mid: '火は絶やさない。それが私の仕事だ。',
    done: '受け取った。……あんたには、持たせない。持たせると、置いていく側になる。',
    reward: { gold: 900, items: [['i_elixir', 2]] }
  });

  G.ERRAND_BY_ID = {};
  E.forEach(function (x) { G.ERRAND_BY_ID[x.id] = x; });
})();
