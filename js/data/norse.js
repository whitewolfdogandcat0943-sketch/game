/* norse.js - 試練の塔の世界（北欧神話）
 *
 * 塔は世界樹ユグドラシルを登る場所として作ってある。
 * 物語モードの相刻とは別の神話で、敵・主・アクセサリを丸ごと分けた。
 * realm: 'norse' の札が付いたものは塔にだけ出る。物語側には一切出ない。
 *
 * 階層と世界の対応:
 *    1〜 5階  ミズガルズ（人の世の外れ）
 *    6〜10階  ニヴルヘイム（霧と氷）
 *   11〜15階  ムスペルヘイム（炎）
 *   16〜20階  ヨトゥンヘイム（巨人の国）
 *   21〜25階  アースガルズ（神々の座）
 *   26階〜    ラグナロク（終わりのあと）
 */
(function () {
  var E = G.ENEMIES, A = G.ACCESSORIES;
  function e(o) { o.realm = 'norse'; E.push(o); return o; }
  function n(o) { o.rarity = 'normal'; o.slot = 'acc'; o.kind = 'acc'; o.realm = 'norse'; A.push(o); return o; }
  function l(o) { o.rarity = 'legend'; o.slot = 'acc'; o.kind = 'acc'; o.realm = 'norse'; A.push(o); return o; }

  /* =============== 雑魚 =============== */

  /* --- tier1: ミズガルズの外れ --- */
  e({ id: 'nm_draugr', name: 'ドラウグル', icon: '🧟', tier: 1, hp: 54, atk: 17, mag: 5, def: 11, res: 5, spd: 9,
      exp: 10, gold: 11, weak: ['light'], resist: ['dark'], skills: ['e_bite', 'e_claw'],
      desc: '塚に眠るはずの屍が、剣を持ったまま起き上がったもの。' });
  e({ id: 'nm_ratatosk', name: 'ラタトスク', icon: '🐿', tier: 1, hp: 30, atk: 12, mag: 9, def: 4, res: 8, spd: 24,
      exp: 9, gold: 12, weak: ['wind'], resist: [], skills: ['e_bite'],
      desc: '世界樹を駆け上がり、悪口を運ぶ栗鼠。速い。' });
  e({ id: 'nm_hresvelgr', name: 'フレースヴェルグの雛', icon: '🦅', tier: 1, hp: 40, atk: 14, mag: 11, def: 6, res: 9, spd: 19,
      exp: 10, gold: 10, weak: ['thunder'], resist: ['wind'], skills: ['e_gust', 'e_claw'],
      desc: '羽ばたきが北風になるという鷲の、まだ小さいもの。' });

  /* --- tier2: ニヴルヘイムとムスペルヘイム --- */
  e({ id: 'nm_hrimthurs', name: 'フリムスルス', icon: '🧊', tier: 2, hp: 150, atk: 31, mag: 14, def: 26, res: 14, spd: 10,
      exp: 26, gold: 30, weak: ['fire'], resist: ['ice'], skills: ['e_slam', 'e_frost'],
      desc: '霜から生まれた者。触れたものから順に白く曇る。' });
  e({ id: 'nm_einherjar', name: 'エインヘリャル', icon: '⚔', tier: 2, hp: 124, atk: 34, mag: 10, def: 24, res: 16, spd: 18,
      exp: 28, gold: 34, weak: [], resist: ['phys'], skills: ['e_claw', 'e_roar'],
      desc: '戦って死に、また戦うために選ばれた者。毎晩よみがえる。' });
  e({ id: 'nm_muspelspark', name: 'ムスペルの火片', icon: '🔥', tier: 2, hp: 96, atk: 16, mag: 38, def: 12, res: 26, spd: 21,
      exp: 26, gold: 28, weak: ['ice'], resist: ['fire'], skills: ['e_fire', 'e_inferno'],
      desc: '炎の国から飛んだ欠片。落ちた先から世界が焦げる。' });
  e({ id: 'nm_nidhoggr_larva', name: 'ニーズヘッグの牙虫', icon: '🪱', tier: 2, hp: 138, atk: 26, mag: 22, def: 20, res: 20, spd: 13,
      exp: 27, gold: 26, weak: ['light'], resist: ['dark'], skills: ['e_bite', 'e_curse'],
      desc: '根を齧る竜の、口の周りに湧いたもの。齧る癖だけは同じ。' });

  /* --- tier3: ヨトゥンヘイムとアースガルズ --- */
  e({ id: 'nm_jotun', name: 'ヨトゥン', icon: '🗿', tier: 3, hp: 380, atk: 58, mag: 22, def: 44, res: 30, spd: 14,
      exp: 62, gold: 76, weak: ['thunder'], resist: ['ice'], skills: ['e_slam', 'e_quake', 'e_roar'],
      desc: '山と見分けがつかない大きさの者。歩くと谷ができる。' });
  e({ id: 'nm_valkyrie', name: 'ヴァルキュリア', icon: '🕊', tier: 3, hp: 310, atk: 52, mag: 48, def: 38, res: 44, spd: 30,
      exp: 64, gold: 84, weak: ['dark'], resist: ['light'], skills: ['e_ray', 'e_claw', 'e_heal'],
      desc: '誰が死ぬかを決めて回る乙女。決めた相手を迎えに来る。' });
  e({ id: 'nm_garmr', name: 'ガルム', icon: '🐕', tier: 3, hp: 340, atk: 56, mag: 18, def: 40, res: 28, spd: 26,
      exp: 62, gold: 74, weak: ['light'], resist: ['dark'], skills: ['e_bite', 'e_claw', 'e_roar'],
      desc: '冥府の門に繋がれた犬。鎖の長さだけは誰も測っていない。' });
  e({ id: 'nm_surtsguard', name: 'スルトの焔衛', icon: '🜂', tier: 3, hp: 300, atk: 44, mag: 64, def: 34, res: 46, spd: 24,
      exp: 66, gold: 80, weak: ['ice'], resist: ['fire', 'dark'], skills: ['e_fire', 'e_inferno', 'e_meteorfall'],
      desc: '炎の巨人の露払い。通った跡には灰も残らない。' });

  /* 上位の顔ぶれが硬い相手ばかりだと、低い階で精鋭として出たときに壁になる。
   * 打たれ弱い代わりに術が強い一体を混ぜて、引きの重さをならす。 */
  e({ id: 'nm_vafthrudnir', name: 'ヴァフスルーズニル', icon: '📜', tier: 3, hp: 258, atk: 22, mag: 70, def: 26, res: 48, spd: 22,
      exp: 60, gold: 86, weak: ['light'], resist: ['dark'], skills: ['e_curse', 'e_drain', 'e_frost'],
      desc: '知恵比べを挑んでは、負けた相手の首を賭けさせる巨人。' });

  /* =============== 主 =============== */

  /* 5階 ―― グレイプニルに縫い止められた「封印体」。
   * これは狼そのものではなく、紐に縛りつけられて形を保っているだけの体。
   * 削っていくと縛めが緩み、中身が少しだけ顔を出す。
   * 本体は塔の上、ラグナロクの側で待っている（nb_fenrir_true）。 */
  e({ id: 'nb_fenrir', name: '縛めのフェンリル', icon: '⛓', tier: 1, boss: true,
      hp: 330, atk: 40, mag: 12, def: 24, res: 14, spd: 20,
      exp: 95, gold: 170, weak: ['light'], resist: ['dark'],
      skills: ['e_bite', 'e_claw', 'e_roar'],
      desc: 'グレイプニルに縫い止められた封印体。狼の形をしているが、狼ではない。' +
            '神々はこれを解く日を知っていて、それでも解かずにいる。',
      gimmick: { kind: 'unbound', at: 0.55, weak: 0.55, rage: 1.2, follow: 0.4, word: 'グレイプニル' } });

  /* 10階 ―― 毒が満ちる。長引くほど効いてくる */
  e({ id: 'nb_jormungandr', name: 'ヨルムンガンド', icon: '🐍', tier: 2, boss: true,
      hp: 760, atk: 46, mag: 50, def: 38, res: 44, spd: 18,
      exp: 200, gold: 340, weak: ['thunder'], resist: ['ice', 'dark'],
      skills: ['e_bite', 'e_curse', 'e_frost'],
      desc: '世界をひと巻きし、自らの尾を咥えた蛇。放す日が終わりの日。',
      gimmick: { kind: 'venom', from: 1, everyN: 2, turns: 3, v: 0.06 } });

  /* 15階 ―― 削りきる速さそのものを問う */
  e({ id: 'nb_surtr', name: 'スルト', icon: '🗡', tier: 2, boss: true,
      hp: 1020, atk: 62, mag: 72, def: 44, res: 50, spd: 22,
      exp: 250, gold: 400, weak: ['ice'], resist: ['fire'],
      skills: ['e_inferno', 'e_meteorfall', 'e_roar'],
      desc: '炎の剣を提げて世界の南に立つ者。振り下ろせば九つの世界が燃える。',
      gimmick: { kind: 'conflagration', from: 2, base: 0.12, cap: 5, word: '業火' } });

  /* 20階 ―― 倒しても起き上がる */
  e({ id: 'nb_hel', name: 'ヘル', icon: '💀', tier: 3, boss: true,
      hp: 1560, atk: 70, mag: 92, def: 56, res: 64, spd: 24,
      exp: 420, gold: 640, weak: ['light'], resist: ['dark', 'ice'],
      skills: ['e_curse', 'e_drain', 'e_voidbeam'],
      desc: '半身は生ける者、半身は朽ちた者。冥府の主。',
      gimmick: { kind: 'reap', everyN: 2, n: 1, hp: 0.5, word: '死者の' } });

  /* 30階 ―― 封印体ではない、解き放たれた本体。
   * 5階で相手にしたのは縛られた形だけで、こちらが狼そのもの。
   * 縛めはもう無いので、開幕から本気で来る。 */
  e({ id: 'nb_fenrir_true', name: 'フェンリル', icon: '🐺', tier: 3, boss: true,
      hp: 1880, atk: 122, mag: 46, def: 78, res: 58, spd: 36,
      exp: 800, gold: 1150, weak: [], resist: ['dark', 'phys'],
      skills: ['e_bite', 'e_claw', 'e_quake', 'e_roar'],
      desc: '縛めを噛み切った狼。口は天と地に届き、目と鼻からは火が漏れている。' +
            'この日のために、神々は千年をかけて紐を編んだ。',
      gimmick: { kind: 'maw', from: 2, everyN: 3, turns: 2, crush: 0.07, pry: 0.04 },
      phases: [
        { at: 0.65, name: '牙の相', weak: ['light'], resist: ['dark', 'phys'],
          say: '——もう、縛るものはない。' },
        { at: 0.30, name: '顎の相', weak: ['light', 'thunder'], resist: ['dark'],
          say: '——月を追うのは、もう飽きた。' }
      ] });

  /* 25階 ―― 削っても戻る。蝕んでいるあいだだけ戻らない */
  e({ id: 'nb_nidhoggr', name: 'ニーズヘッグ', icon: '🐉', tier: 3, boss: true,
      hp: 1720, atk: 104, mag: 96, def: 74, res: 72, spd: 28,
      exp: 720, gold: 1040, weak: [], resist: ['dark', 'ice'],
      skills: ['e_voidbeam', 'e_meteorfall', 'e_drain', 'e_quake'],
      desc: '世界樹の根を齧り続ける竜。齧り終えた日に、すべてが倒れる。',
      gimmick: { kind: 'gnaw', heal: 0.06 },
      phases: [
        { at: 0.60, name: '根の相', weak: ['fire'], resist: ['dark', 'ice', 'phys'],
          say: '——根は、まだ甘い。' },
        { at: 0.25, name: '幹の相', weak: ['light', 'thunder'], resist: [],
          say: '——幹まで来たか。ならば、支えるものは無い。' }
      ] });

  /* =============== アクセサリ =============== */

  /* --- 通常 --- */
  n({ id: 'nn_runestone', name: 'ルーンの刻み石', tier: 1, price: 95, mods: { mag: 15, mp: 14 },
      desc: '刻まれた文字が、読めないのに意味だけ伝わってくる。' });
  n({ id: 'nn_wolffang', name: '狼の牙', tier: 1, price: 110, mods: { critRate: 0.10, atk: 8 },
      desc: '噛み千切られた鎖の、相手側の欠片。' });
  n({ id: 'nn_ravenfeather', name: '鴉の羽根', tier: 1, price: 100, mods: { spd: 17, evade: 0.05 },
      desc: '思考と記憶、どちらの鴉のものかは分からない。' });
  n({ id: 'nn_frostring', name: '霜の指輪', tier: 1, price: 105, mods: { el_ice: 0.14, res: 10 },
      desc: '嵌めた指だけ、いつまでも冷たい。' });
  n({ id: 'nn_valknut', name: 'ヴァルクヌートの護符', tier: 2, price: 200, mods: { def: 24, hp: 60, dr: 0.05 },
      desc: '三つの三角が絡んだ印。戦死者を縛めるものだという。' });
  n({ id: 'nn_goathide', name: '山羊の毛皮', tier: 2, price: 210, mods: { hp: 95, mpRegen: 0.06 },
      desc: '食べても翌朝には戻っている山羊の、抜けた毛。' });
  n({ id: 'nn_emberchip', name: '火の粉の欠片', tier: 2, price: 220, mods: { el_fire: 0.20, dotPower: 0.14 },
      desc: 'ムスペルから飛んできて、まだ消えていない。' });
  n({ id: 'nn_rootmoss', name: '根の苔', tier: 3, price: 340, mods: { dotPower: 0.20, mag: 22 },
      desc: '世界樹の根に生えた苔。齧られた跡から生える。' });

  /* --- レジェンド（11の軸をひととおり埋める） --- */
  l({ id: 'nl_mjolnir', name: 'ミョルニル', tier: 3, price: 700,
      mods: { critRate: 0.22, critDmg: 0.70, el_thunder: 0.22, atkPct: 0.14 },
      desc: '投げれば必ず手に返る槌。柄が短いのは、作りそこねたからだという。' });
  l({ id: 'nl_gungnir', name: 'グングニル', tier: 3, price: 690,
      mods: { pierce: 0.34, critRate: 0.12, atk: 34, dmgUp: 0.12 },
      desc: '狙いを違えぬ槍。これで刺すと決めたものは、もう決まっている。' });
  l({ id: 'nl_svalinn', name: 'スヴァリンの盾', tier: 3, price: 660,
      mods: { reflect: 0.42, reflectPow: 0.40, def: 28 },
      desc: '太陽の前に立てられた盾。これが無ければ海も山も燃えている。' });
  l({ id: 'nl_gjallarhorn', name: 'ギャラルホルン', tier: 3, price: 680,
      mods: { aoeRatio: 0.34, aoePower: 0.26, mag: 24 },
      desc: '終わりの日に吹かれる角笛。音は九つの世界に届く。' });
  l({ id: 'nl_bifrost', name: 'ビフレストの欠片', tier: 3, price: 720,
      mods: { el_fire: 0.20, el_ice: 0.20, el_thunder: 0.20, el_wind: 0.20,
              el_light: 0.20, el_dark: 0.20 },
      desc: '燃える虹の橋のひとかけら。七つの色が全部入っている。' });
  l({ id: 'nl_eldhrimnir', name: 'エルドフリムニルの鍋', tier: 3, price: 670,
      mods: { itemPower: 0.72, itemKeep: 0.30, mp: 30 },
      desc: '毎晩煮ても、朝には中身が戻っている鍋。' });
  l({ id: 'nl_idunn', name: 'イズンの林檎', tier: 3, price: 710,
      mods: { lifesteal: 0.36, hpPct: 0.20, mpRegen: 0.10 },
      desc: '齧ると齢が戻る林檎。齧りすぎた者の話は残っていない。' });
  l({ id: 'nl_valhollshield', name: 'ヴァルホルの盾屋根', tier: 3, price: 665,
      mods: { dr: 0.18, def: 40, res: 36, hpPct: 0.16 },
      desc: '五百四十の扉を持つ館の屋根。盾を並べて葺いてある。' });
  l({ id: 'nl_sleipnir', name: 'スレイプニルの蹄鉄', tier: 3, price: 675,
      mods: { spd: 44, evade: 0.14, dmgUp: 0.08 },
      desc: '八本の脚で駆ける馬の蹄鉄。どこへでも、何よりも早く着く。' });
  l({ id: 'nl_andvaranaut', name: 'アンドヴァラナウト', tier: 3, price: 700,
      mods: { dotPower: 0.80, dotTurns: 2, mag: 24, goldUp: 0.20 },
      desc: '持ち主を必ず滅ぼす指輪。滅びるまでは、よく富む。' });
  l({ id: 'nl_brisingamen', name: 'ブリーシンガメン', tier: 3, price: 705,
      mods: { buffPower: 0.80, buffTurns: 2, mag: 22, mp: 40 },
      desc: '四人の小人が打った首飾り。フレイヤが四夜を支払った。' });
  l({ id: 'nl_gleipnir', name: 'グレイプニル', tier: 3, price: 695,
      mods: { debuffPower: 0.80, debuffTurns: 2, mag: 20 },
      desc: '猫の足音と、女の髭と、山の根と、熊の腱と、魚の息と、鳥の唾で編んだ紐。' +
            '細いのに、千切れない。' });
  l({ id: 'nl_solmani', name: 'ソールとマーニ', tier: 3, price: 715,
      mods: { el_light: 0.30, el_dark: 0.30, mag: 20, spd: 16 },
      desc: '日を駆る姉と、月を駆る弟。二匹の狼に追われて、休まず空を回り続けている。' });
  l({ id: 'nl_draupnir', name: 'ドラウプニル', tier: 3, price: 690,
      mods: { goldUp: 0.45, dropUp: 0.18, itemKeep: 0.12 },
      desc: '九夜ごとに、同じ重さの腕輪が八つ滴り落ちる。' });
  l({ id: 'nl_huginmunin', name: 'フギンとムニン', tier: 3, price: 685,
      mods: { spd: 28, mp: 55, mpRegen: 0.16, magPct: 0.10 },
      desc: '思考と記憶。毎朝飛ばして、毎晩戻るのを待つ。' +
            '帰らない日が来るのを、いちばん恐れているという。' });

  /* --- 各軸をもう一枚ずつ ---
   *
   * 転職の条件は「4枠の合計」で見る。軸あたり一枚しか無いと、
   * どれだけ強い一枚でも合計が届かず、塔からは就けない職業が出てしまう
   * （最初に組んだときは8職が到達不可になった）。
   * どの軸も、レジェンド2枚＋上位の通常1枚で組めるように揃えてある。 */

  l({ id: 'nl_jarngreipr', name: 'ヤルングレイプル', tier: 3, price: 660,
      mods: { critRate: 0.24, critDmg: 0.60, atk: 22 },
      desc: '雷の槌を掴むための鉄の手甲。これが無ければ、柄は持てない。' });
  n({ id: 'nn_windfeather', name: 'フレースヴェルグの風切羽', tier: 3, price: 330,
      mods: { critRate: 0.18, critDmg: 0.44, spd: 10 },
      desc: '北風になる鷲の、いちばん外側の一枚。' });

  l({ id: 'nl_hildshield', name: 'ヒルドの盾', tier: 3, price: 655,
      mods: { reflect: 0.34, reflectPow: 0.28, def: 26 },
      desc: '戦さの乙女が掲げる盾。受けた分だけ、相手へ返す。' });
  n({ id: 'nn_svalinnshard', name: 'スヴァリンの破片', tier: 3, price: 325,
      mods: { reflect: 0.28, reflectPow: 0.16, def: 26 },
      desc: '太陽の前の盾が、欠けて落ちたもの。まだ熱い。' });

  l({ id: 'nl_hvergelmir', name: 'フヴェルゲルミルの渦', tier: 3, price: 670,
      mods: { aoeRatio: 0.32, aoePower: 0.28, mag: 20 },
      desc: '十一の川が湧き出す泉。落ちたものは、すべて巻き込まれる。' });
  n({ id: 'nn_ragnarokecho', name: 'ラグナロクの残響', tier: 3, price: 335,
      mods: { aoeRatio: 0.26, aoePower: 0.18 },
      desc: 'まだ来ていない終わりの音が、先に届いている。' });

  l({ id: 'nl_yggleaf', name: 'ユグドラシルの葉', tier: 3, price: 700,
      mods: { el_fire: 0.18, el_ice: 0.18, el_thunder: 0.18, el_wind: 0.18,
              el_light: 0.18, el_dark: 0.18 },
      desc: '九つの世界を貫く樹の、一枚の葉。九つ全部の色が混じっている。' });
  n({ id: 'nn_rainbowchip', name: '虹のかけら', tier: 3, price: 330,
      mods: { el_fire: 0.13, el_ice: 0.13, el_thunder: 0.13, el_wind: 0.13,
              el_light: 0.13, el_dark: 0.13 },
      desc: '橋から剥がれ落ちた色。触れると指が七色になる。' });

  l({ id: 'nl_alfheim', name: 'アルヴヘイムの秘薬', tier: 3, price: 665,
      mods: { itemPower: 0.66, itemKeep: 0.24 },
      desc: '光の妖精の国で調じられた薬。小瓶がいつまでも空にならない。' });
  n({ id: 'nn_dwarfcase', name: '小人の手箱', tier: 3, price: 330,
      mods: { itemPower: 0.58, itemKeep: 0.20 },
      desc: '打ち出しの名人が持ち歩いていた箱。中身より箱のほうが高い。' });

  l({ id: 'nl_saehrimnir', name: 'セーフリームニルの肉', tier: 3, price: 690,
      mods: { lifesteal: 0.34, hpPct: 0.10 },
      desc: '毎晩食べられ、毎朝また生えている猪。戦士たちの夕食。' });
  n({ id: 'nn_meadcup', name: '蜜酒の杯', tier: 3, price: 335,
      mods: { lifesteal: 0.26, hp: 70 },
      desc: '山羊の乳房から流れ続ける蜜酒を受ける杯。空にならない。' });

  l({ id: 'nl_jarnvidr', name: 'ヤルンヴィズの樹皮', tier: 3, price: 660,
      mods: { dr: 0.16, def: 38, res: 32, hpPct: 0.14 },
      desc: '鉄の森の樹の皮。狼を産む魔女たちが、この下で眠る。' });
  n({ id: 'nn_ironbough', name: '鉄の森の枝', tier: 3, price: 330,
      mods: { def: 40, res: 30, hp: 90, dr: 0.06 },
      desc: '折ろうとすると、こちらの手のほうが折れる。' });

  l({ id: 'nl_skidbladnir', name: 'スキーズブラズニルの帆', tier: 3, price: 665,
      mods: { spd: 38, evade: 0.12, dmgUp: 0.06 },
      desc: '畳めば懐に入り、開けば軍勢を乗せる船の帆。順風しか吹かない。' });
  n({ id: 'nn_windlace', name: '風の靴紐', tier: 3, price: 325,
      mods: { spd: 30, evade: 0.08 },
      desc: '結ぶと足が軽くなる。解くのを忘れると止まれない。' });

  l({ id: 'nl_lokisknot', name: 'ロキの結び目', tier: 3, price: 695,
      mods: { dotPower: 0.72, dotTurns: 1, mag: 22 },
      desc: 'どう解いても、解いた先がまた結ばれている。' });
  n({ id: 'nn_serpentfang', name: '毒蛇の牙', tier: 3, price: 335,
      mods: { dotPower: 0.50, dotTurns: 1 },
      desc: '縛められた者の顔の上で、いつまでも滴り続けている牙。' });

  l({ id: 'nl_odrerir', name: 'オーズレリルの蜜酒', tier: 3, price: 700,
      mods: { buffPower: 0.72, buffTurns: 1, mag: 20, mp: 36 },
      desc: '一口飲めば誰でも詩人になる蜜酒。返す言葉が、必ず韻を踏む。' });
  n({ id: 'nn_blessrune', name: '祝福のルーン', tier: 3, price: 335,
      mods: { buffPower: 0.50, buffTurns: 1, mp: 30 },
      desc: '刻んだ者の名前は残っていない。効き目だけが残っている。' });

  l({ id: 'nl_niflfetter', name: 'ニヴルの霧枷', tier: 3, price: 690,
      mods: { debuffPower: 0.72, debuffTurns: 1, mag: 18 },
      desc: '霧でできた枷。見えないので、外し方も分からない。' });
  n({ id: 'nn_bindknot', name: '縛めの結び目', tier: 3, price: 330,
      mods: { debuffPower: 0.50, debuffTurns: 1 },
      desc: '猫の足音で編んだ紐の、余ったところ。' });

  /* =============== 隠しのミシック =============== */

  /* 解き放たれた本体を倒した者だけが持ち帰るもの。
   * 「毛皮を剥いだ」ではなく「着られるようになった」ところが肝で、
   * これを着ると隠しの職業〈フェンリル〉に就ける（classes.js の fenrir）。 */
  A.push({
    id: 'y_fenrirsuit', name: 'フェンリルの着ぐるみ', tier: 4, price: 0,
    rarity: 'mythic', slot: 'acc', kind: 'acc', realm: 'norse',
    mods: { atkPct: 0.30, spd: 40, critRate: 0.20, critDmg: 0.50, lifesteal: 0.20, hpPct: 0.20 },
    flags: ['killHeal', 'stackAtkOnKill'],
    desc: '解き放たれた狼の、抜け殻。中はまだ温かい。' +
          '袖を通すと、自分の歯が尖っていくのが分かる。',
    cond: { when: 'battleEnd', code: 'slay_fenrir',
            label: '解き放たれたフェンリル（塔30階）を倒す',
            hint: '25階を越えて深淵へ。30階で待っているのは封印体ではない',
            test: function (c) {
              return !!(c.b && (c.b.bossIds || []).indexOf('nb_fenrir_true') >= 0);
            } }
  });

  /* --- 索引を組み直す --- */
  G.ENEMY_BY_ID = {};
  E.forEach(function (x) { G.ENEMY_BY_ID[x.id] = x; });
  G.BOSSES = E.filter(function (x) { return x.boss; });
  G.MOBS = E.filter(function (x) { return !x.boss; });

  G.ACC_BY_ID = {};
  A.forEach(function (a) { G.ACC_BY_ID[a.id] = a; });
  G.MYTHICS = A.filter(function (a) { return a.rarity === 'mythic'; });
  G.LEGENDS = A.filter(function (a) { return a.rarity === 'legend'; });
  G.NORMALS = A.filter(function (a) { return a.rarity === 'normal'; });

  /* 塔の主が出る順。5階ごとに一体ずつ。
   * 配列に入れた順ではなく、ここで明示する（データを足した順で塔の並びが
   * 変わってしまうのを避けるため）。
   * 30階の先（深淵）は、最上位の三体を順に回す。 */
  G.TOWER_BOSSES = [
    'nb_fenrir',        /*  5階 グレイプニルの封印体 */
    'nb_jormungandr',   /* 10階 */
    'nb_surtr',         /* 15階 */
    'nb_hel',           /* 20階 */
    'nb_nidhoggr',      /* 25階 ここが踏破の区切り */
    'nb_fenrir_true'    /* 30階 縛めを噛み切った本体 */
  ];
  G.TOWER_ABYSS = ['nb_nidhoggr', 'nb_fenrir_true', 'nb_hel'];

  /** その階の主。5階ごとに呼ばれる。 */
  G.towerBoss = function (floor) {
    var i = Math.floor(floor / 5) - 1;
    if (i < G.TOWER_BOSSES.length) return G.ENEMY_BY_ID[G.TOWER_BOSSES[Math.max(0, i)]];
    var j = (i - G.TOWER_BOSSES.length) % G.TOWER_ABYSS.length;
    return G.ENEMY_BY_ID[G.TOWER_ABYSS[j]];
  };

  /* 世界（realm）で絞るための索引。塔は 'norse' だけを見る。 */
  G.realmOf = function (state) {
    return (state && state.mode === 'story') ? 'mid' : 'norse';
  };
  G.inRealm = function (x, realm) {
    return realm === 'norse' ? x.realm === 'norse' : x.realm !== 'norse';
  };
})();
