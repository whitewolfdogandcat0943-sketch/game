/* enemies.js - 敵とボス（実際の数値は階層に応じてスケールする） */
(function () {
  var E = [];
  function e(o) { E.push(o); return o; }

  /* --- tier1 (1-5F) --- */
  e({ id: 'slime', name: 'スライム', icon: '🟢', tier: 1, hp: 46, atk: 12, mag: 8, def: 6, res: 8, spd: 8,
      exp: 9, gold: 10, weak: ['fire'], resist: ['phys'], skills: ['e_bite'] });
  e({ id: 'bat', name: 'ケイヴバット', icon: '🦇', tier: 1, hp: 34, atk: 13, mag: 6, def: 4, res: 5, spd: 20,
      exp: 9, gold: 9, weak: ['wind'], resist: [], skills: ['e_bite', 'e_claw'] });
  e({ id: 'goblin', name: 'ゴブリン', icon: '👺', tier: 1, hp: 52, atk: 16, mag: 5, def: 9, res: 4, spd: 12,
      exp: 11, gold: 14, weak: ['light'], resist: [], skills: ['e_claw', 'e_slam'] });
  e({ id: 'wisp', name: '火の玉', icon: '🔥', tier: 1, hp: 38, atk: 7, mag: 18, def: 4, res: 14, spd: 15,
      exp: 12, gold: 12, weak: ['ice'], resist: ['fire'], skills: ['e_fire'] });
  e({ id: 'skeleton', name: 'スケルトン', icon: '💀', tier: 1, hp: 58, atk: 18, mag: 6, def: 12, res: 6, spd: 10,
      exp: 12, gold: 13, weak: ['light'], resist: ['dark'], skills: ['e_claw', 'e_slam'] });

  /* --- tier2 (6-12F) --- */
  e({ id: 'orc', name: 'オーク戦士', icon: '🪓', tier: 2, hp: 128, atk: 30, mag: 8, def: 20, res: 10, spd: 11,
      exp: 26, gold: 30, weak: ['ice'], resist: [], skills: ['e_slam', 'e_roar', 'e_claw'] });
  e({ id: 'icewitch', name: '氷の魔女', icon: '🧊', tier: 2, hp: 104, atk: 12, mag: 34, def: 12, res: 24, spd: 16,
      exp: 30, gold: 34, weak: ['fire'], resist: ['ice'], skills: ['e_frost', 'e_curse'] });
  e({ id: 'thundhawk', name: '雷鷹', icon: '🦅', tier: 2, hp: 96, atk: 26, mag: 26, def: 12, res: 16, spd: 26,
      exp: 28, gold: 30, weak: ['wind'], resist: ['thunder'], skills: ['e_spark', 'e_claw'] });
  e({ id: 'treant', name: 'トレント', icon: '🌳', tier: 2, hp: 178, atk: 26, mag: 12, def: 30, res: 16, spd: 6,
      exp: 32, gold: 32, weak: ['fire'], resist: ['phys', 'wind'], skills: ['e_slam', 'e_thorn'] });
  e({ id: 'shade', name: '影喰い', icon: '👤', tier: 2, hp: 110, atk: 24, mag: 30, def: 14, res: 22, spd: 20,
      exp: 30, gold: 34, weak: ['light'], resist: ['dark', 'phys'], skills: ['e_drain', 'e_curse'] });
  e({ id: 'golem', name: 'ストーンゴーレム', icon: '🗿', tier: 2, hp: 210, atk: 32, mag: 6, def: 40, res: 20, spd: 5,
      exp: 36, gold: 40, weak: ['thunder'], resist: ['phys'], skills: ['e_slam', 'e_quake'] });
  e({ id: 'harpy', name: 'ハーピー', icon: '🪶', tier: 2, hp: 98, atk: 24, mag: 20, def: 12, res: 14, spd: 28,
      exp: 27, gold: 30, weak: ['thunder'], resist: ['wind'], skills: ['e_gust', 'e_claw'] });

  /* --- tier3 (13F+) --- */
  e({ id: 'demonknight', name: '魔騎士', icon: '⚔', tier: 3, hp: 340, atk: 58, mag: 30, def: 46, res: 32, spd: 20,
      exp: 70, gold: 85, weak: ['light'], resist: ['dark', 'phys'], skills: ['e_slam', 'e_curse', 'e_roar'] });
  e({ id: 'archlich', name: 'アークリッチ', icon: '☠', tier: 3, hp: 290, atk: 24, mag: 70, def: 30, res: 52, spd: 22,
      exp: 78, gold: 95, weak: ['light'], resist: ['dark', 'ice'], skills: ['e_drain', 'e_curse', 'e_heal'] });
  e({ id: 'salamander', name: 'サラマンダー', icon: '🦎', tier: 3, hp: 360, atk: 52, mag: 56, def: 38, res: 36, spd: 18,
      exp: 74, gold: 88, weak: ['ice'], resist: ['fire'], skills: ['e_inferno', 'e_fire', 'e_claw'] });
  e({ id: 'stormlord', name: '嵐の従者', icon: '🌩', tier: 3, hp: 300, atk: 46, mag: 60, def: 32, res: 40, spd: 30,
      exp: 76, gold: 90, weak: ['wind'], resist: ['thunder'], skills: ['e_spark', 'e_gust', 'e_quake'] });
  e({ id: 'mirrorknight', name: '鏡面騎士', icon: '🪞', tier: 3, hp: 330, atk: 50, mag: 34, def: 52, res: 44, spd: 16,
      exp: 80, gold: 100, weak: ['dark'], resist: ['light', 'phys'], skills: ['e_thorn', 'e_slam', 'e_ray'] });
  e({ id: 'seraph', name: '堕天使', icon: '🕊', tier: 3, hp: 320, atk: 44, mag: 66, def: 36, res: 48, spd: 26,
      exp: 82, gold: 100, weak: ['dark'], resist: ['light'], skills: ['e_ray', 'e_heal', 'e_curse'] });

  /* --- ボス --- */
  e({ id: 'b_ogre', name: '暴食のオーガ', icon: '👹', tier: 1, boss: true, hp: 318, atk: 33, mag: 11, def: 26, res: 13, spd: 12,
      exp: 90, gold: 160, weak: ['ice'], resist: ['dark'], skills: ['e_slam', 'e_quake', 'e_roar'] });
  e({ id: 'b_frostqueen', name: '氷獄の女王', icon: '❄', tier: 2, boss: true, hp: 672, atk: 32, mag: 55, def: 33, res: 48, spd: 22,
      exp: 190, gold: 320, weak: ['fire'], resist: ['ice', 'wind'], skills: ['e_frost', 'e_curse', 'e_blizzard'] });
  e({ id: 'b_thornbeast', name: '棘鎧の獣王', icon: '🦂', tier: 2, boss: true, hp: 912, atk: 59, mag: 23, def: 62, res: 33, spd: 14,
      exp: 220, gold: 360, weak: ['thunder'], resist: ['phys'], skills: ['e_thorn', 'e_slam', 'e_quake'] });
  e({ id: 'b_stormdrake', name: '天空竜', icon: '🐉', tier: 3, boss: true, hp: 1380, atk: 78, mag: 82, def: 57, res: 55, spd: 28,
      exp: 340, gold: 520, weak: ['ice'], resist: ['wind', 'thunder'], skills: ['e_gust', 'e_meteorfall', 'e_claw', 'e_roar'] });
  e({ id: 'b_voidlord', name: '虚無の王', icon: '🕳', tier: 3, boss: true, hp: 1920, atk: 93, mag: 98, def: 68, res: 68, spd: 30,
      exp: 500, gold: 760, weak: [], resist: ['dark', 'phys'], skills: ['e_voidbeam', 'e_drain', 'e_curse', 'e_meteorfall'] });
  /* 最終章の前段。物理だけで来た者に、一度だけ持ち替えを迫る。
   * 全体攻撃を持たないので、長引いても事故で終わらない。 */
  e({ id: 'b_mirrorself', name: '鏡写しの衛士', icon: '🛡', tier: 3, boss: true, hp: 1210, atk: 98, mag: 58, def: 72, res: 56, spd: 34,
      exp: 560, gold: 820, weak: ['light'], resist: ['phys'], skills: ['e_claw', 'e_slam', 'e_thorn', 'e_roar'] });

  /* 世界の鏡像は「相（そう）」を四つ持つ。
   * 残HPが下がるたびに弱点と耐性が入れ替わり、通る手段が入れ替わる。
   * 一枚岩の耐性にすると、噛み合わないビルドには越えられない壁、
   * 噛み合うビルドにはただの作業になる。相を回すことで、どのビルドにも
   * 「今なら通る」時間帯が一度は来るようにしてある。
   * 物理を弾くのは第二相だけ。自己回復は持たせない（長引くだけで難しくならないため）。 */
  e({ id: 'b_worldmirror', name: '世界の鏡像', icon: '🪟', tier: 3, boss: true, hp: 1650, atk: 122, mag: 122, def: 77, res: 77, spd: 32,
      exp: 700, gold: 1000, weak: [], resist: ['light', 'dark'],
      skills: ['e_thorn', 'e_voidbeam', 'e_meteorfall', 'e_curse'],
      phases: [
        { at: 0.72, name: '焔氷の相', weak: ['thunder'], resist: ['fire', 'ice', 'phys'],
          say: '——お前たちの刃を、写した。' },
        { at: 0.45, name: '雷風の相', weak: ['fire', 'ice'], resist: ['thunder', 'wind'],
          say: '——お前たちの速さを、写した。' },
        { at: 0.20, name: '相剋の相', weak: ['light', 'dark'], resist: [],
          say: '——もう、写すものがない。' }
      ] });

  G.ENEMIES = E;
  G.ENEMY_BY_ID = {};
  E.forEach(function (x) { G.ENEMY_BY_ID[x.id] = x; });
  G.BOSSES = E.filter(function (x) { return x.boss; });
  G.MOBS = E.filter(function (x) { return !x.boss; });
})();
