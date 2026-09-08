/* accessories.js - アクセサリ（4枠）
 * rarity: normal(通常) / legend(レジェンド) / mythic(ミシック)
 * ミシックは戦闘中の特殊条件を満たすと「発見」され、以後の冒険にも引き継がれる。
 */
(function () {
  var ACC = [];
  function n(o) { o.rarity = 'normal'; o.slot = 'acc'; o.kind = 'acc'; ACC.push(o); return o; }
  function l(o) { o.rarity = 'legend'; o.slot = 'acc'; o.kind = 'acc'; ACC.push(o); return o; }
  function m(o) { o.rarity = 'mythic'; o.slot = 'acc'; o.kind = 'acc'; ACC.push(o); return o; }

  /* =============== 通常アクセサリ =============== */
  n({ id: 'n_powerring', name: '力の指輪', tier: 1, price: 90, mods: { atk: 14, atkPct: 0.05 }, desc: '物理攻撃を高める。' });
  n({ id: 'n_sagering', name: '賢者の指輪', tier: 1, price: 90, mods: { mag: 14, mp: 15 }, desc: '魔法攻撃とMPを高める。' });
  n({ id: 'n_swiftboots', name: '疾風の靴', tier: 1, price: 90, mods: { spd: 16, evade: 0.05 }, desc: '素早さと回避を高める。' });
  n({ id: 'n_ironcharm', name: '鋼の護符', tier: 1, price: 90, mods: { def: 18, hp: 40 }, desc: '防御と体力を高める。' });
  n({ id: 'n_critfang', name: '会心の牙', tier: 1, price: 110, mods: { critRate: 0.10, critDmg: 0.20 }, desc: '会心ビルドの基礎。' });
  n({ id: 'n_thornband', name: '棘の腕輪', tier: 1, price: 110, mods: { reflect: 0.14, def: 10 }, desc: '反射ビルドの基礎。' });
  n({ id: 'n_prismlens', name: '拡散のレンズ', tier: 1, price: 110, mods: { aoeRatio: 0.18, aoePower: 0.12 }, desc: '範囲ビルドの基礎。' });
  n({ id: 'n_medicbelt', name: '薬師の帯', tier: 1, price: 110, mods: { itemPower: 0.25, itemKeep: 0.08 }, desc: 'アイテムビルドの基礎。' });
  n({ id: 'n_vampfang', name: '吸血の牙', tier: 1, price: 120, mods: { lifesteal: 0.12, atk: 6 }, desc: '与ダメージの一部を吸収。' });
  n({ id: 'n_luckcoin', name: '幸運のコイン', tier: 1, price: 100, mods: { critRate: 0.05, goldUp: 0.30, dropUp: 0.20 }, desc: '実入りが良くなる。' });
  n({ id: 'n_lifependant', name: '命の首飾り', tier: 1, price: 100, mods: { hp: 70, hpPct: 0.06 }, desc: '最大HPを大きく伸ばす。' });
  n({ id: 'n_wardearring', name: '守護の耳飾り', tier: 1, price: 100, mods: { res: 22, dr: 0.06 }, desc: '魔法防御と被ダメ軽減。' });
  n({ id: 'n_manaloop', name: '循環の輪', tier: 1, price: 100, mods: { mp: 28, mpRegen: 4 }, desc: '毎ターンMPが回復する。' });
  n({ id: 'n_orb_fire', name: '炎の宝珠', tier: 1, price: 105, mods: { 'el_fire': 0.22 }, desc: '揺らめく紅の宝珠。' });
  n({ id: 'n_orb_ice', name: '氷の宝珠', tier: 1, price: 105, mods: { 'el_ice': 0.22 }, desc: '冷気を放つ蒼の宝珠。' });
  n({ id: 'n_orb_thunder', name: '雷の宝珠', tier: 1, price: 105, mods: { 'el_thunder': 0.22 }, desc: '帯電した黄の宝珠。' });
  n({ id: 'n_orb_wind', name: '風の宝珠', tier: 1, price: 105, mods: { 'el_wind': 0.22 }, desc: '渦を巻く翠の宝珠。' });
  n({ id: 'n_orb_light', name: '光の聖印', tier: 1, price: 105, mods: { 'el_light': 0.22 }, desc: '暖かな光を宿す聖印。' });
  n({ id: 'n_orb_dark', name: '闇の呪印', tier: 1, price: 105, mods: { 'el_dark': 0.22 }, desc: '底なしの闇を封じた呪印。' });
  n({ id: 'n_piercering', name: '貫通の指輪', tier: 2, price: 150, mods: { pierce: 0.22 }, desc: '敵の属性耐性を貫通する。' });
  n({ id: 'n_giantband', name: '巨人の腕輪', tier: 2, price: 160, mods: { atk: 26, def: 12, spd: -6 }, desc: '重いが力強い。' });
  n({ id: 'n_archmagepin', name: '大魔導の徽章', tier: 2, price: 160, mods: { magPct: 0.14, pierce: 0.10 }, desc: '魔法攻撃+14%。' });
  n({ id: 'n_assassinmark', name: '暗殺者の刻印', tier: 2, price: 170, mods: { critRate: 0.14, critDmg: 0.35, spd: 8 }, desc: '会心を大きく伸ばす。' });
  n({ id: 'n_bulwark', name: '城塞の紋', tier: 2, price: 165, mods: { defPct: 0.22, hpPct: 0.10, reflect: 0.08 }, desc: '防御を22%上昇。' });

  /* =============== レジェンドアクセサリ =============== */
  l({ id: 'l_judgeoath', name: '断罪者の血盟', tier: 3, price: 620,
      mods: { critRate: 0.25, critDmg: 0.65, hpPct: -0.18 },
      desc: '断罪者と交わす血の誓い。命を削って必殺を得る。' });
  l({ id: 'l_mirrorplate', name: '万象反射盤', tier: 3, price: 620,
      mods: { reflect: 0.32, reflectPow: 0.25, def: 24 }, flags: ['reflectAll'],
      desc: '受けた痛みを世界そのものへ跳ね返す盤。' });
  l({ id: 'l_thunderscepter', name: '天雷の王笏', tier: 3, price: 620,
      mods: { 'el_thunder': 0.45, mag: 20 }, flags: ['shockOnThunder'],
      desc: '雷雲を統べる王の笏。' });
  l({ id: 'l_hexastar', name: '六星の環', tier: 3, price: 660,
      mods: { 'el_fire': 0.14, 'el_ice': 0.14, 'el_thunder': 0.14, 'el_wind': 0.14, 'el_light': 0.14, 'el_dark': 0.14, pierce: 0.12 },
      desc: '六つの星をかたどった環。星辰術皇への道標。' });
  l({ id: 'l_abysscore', name: '深淵の心臓', tier: 3, price: 620,
      mods: { 'el_dark': 0.50, lifesteal: 0.18, hp: 60 },
      desc: '今も脈打つ深淵の心臓。' });
  l({ id: 'l_tyrantcore', name: '灼熱の暴君核', tier: 3, price: 620,
      mods: { 'el_fire': 0.42, atkPct: 0.10 }, flags: ['fireSplash'],
      desc: '暴君の体内で燃え続けた核。' });
  l({ id: 'l_sagecase', name: '賢者の秘薬箱', tier: 3, price: 640,
      mods: { itemPower: 0.65, itemKeep: 0.22 }, flags: ['itemRefill'],
      desc: '尽きることのない秘薬を収めた箱。' });
  l({ id: 'l_galerobe', name: '颶風の羽衣', tier: 3, price: 640,
      mods: { aoeRatio: 0.35, aoePower: 0.25, spd: 22 },
      desc: '颶風を織り上げた薄衣。' });
  l({ id: 'l_adamantbase', name: '金剛不壊の礎', tier: 3, price: 640,
      mods: { defPct: 0.55, dr: 0.15, hpPct: 0.15, spd: -12 },
      desc: '揺るがぬ金剛の礎。重さと引き換えの絶対防御。' });
  l({ id: 'l_holycross', name: '聖十字の紋章', tier: 3, price: 620,
      mods: { 'el_light': 0.45, dr: 0.08 }, flags: ['barrierOnHit'],
      desc: '聖十字を刻んだ紋章。' });
  l({ id: 'l_twinfang', name: '双牙の刻印', tier: 3, price: 640,
      mods: { atkPct: -0.20, critRate: 0.12, spd: 14 }, flags: ['doubleStrike'],
      desc: '双頭の獣の牙を模した刻印。' });
  l({ id: 'l_gluttoncrown', name: '貪食の王冠', tier: 3, price: 660,
      mods: { atk: 18, lifesteal: 0.10 }, flags: ['stackAtkOnKill', 'soulHarvest'],
      desc: '喰らうほどに肥え太る王の冠。' });
  l({ id: 'l_stormheart', name: '雷雲の心臓', tier: 3, price: 640,
      mods: { 'el_thunder': 0.30, aoePower: 0.30, spd: 12 }, flags: ['overkillChain'],
      desc: '雷雲そのものを閉じ込めた心臓。' });
  l({ id: 'l_frostcrown', name: '氷結の女王冠', tier: 3, price: 620,
      mods: { 'el_ice': 0.44, res: 26 }, flags: ['freezeOnIce'],
      desc: '氷獄の女王が戴いていた冠。' });

  /* =============== ミシックアクセサリ ===============
   * cond.test(c) : c = { b:今回の戦闘記録, run, hero, S, meta }
   * cond.when : 'battleEnd'(勝利時判定) / 'progress'(常時判定)
   */
  m({ id: 'y_eye', name: '断罪の魔眼', tier: 4, price: 0,
      mods: { critRate: 0.30, critDmg: 1.20 }, flags: ['critPierce'],
      desc: '全てを裁く眼。急所だけが見える。',
      cond: { when: 'battleEnd', label: '1回の戦闘で会心を8回連続で発生させて勝利する',
              hint: '会心率を上げ、多段攻撃で連続会心を狙え',
              test: function (c) { return c.b.critStreakMax >= 8; } } });

  m({ id: 'y_mirrorcore', name: '鏡獄の心核', tier: 4, price: 0,
      mods: { reflect: 0.50, reflectPow: 0.45, dr: 0.10 }, flags: ['reflectAll', 'healOnReflect'],
      desc: '無数の鏡が閉じ込められた核。攻撃という概念を反転させる。',
      cond: { when: 'battleEnd', label: '1回の戦闘で反射ダメージだけで敵を3体撃破する',
              hint: '反射率を高めて殴られながら勝て',
              test: function (c) { return c.b.reflectKills >= 3; } } });

  m({ id: 'y_annihilorder', name: '殲滅の号令', tier: 4, price: 0,
      mods: { aoePower: 0.70, aoeRatio: 0.60 }, flags: ['overkillChain'],
      desc: '一声で戦場を薙ぎ払う号令。',
      cond: { when: 'battleEnd', label: '1回の攻撃で敵を4体同時に撃破する',
              hint: '全体攻撃と範囲威力を積み上げろ',
              test: function (c) { return c.b.maxMultiKill >= 4; } } });

  m({ id: 'y_astralring', name: '星霜の輪環', tier: 4, price: 0,
      mods: { 'el_fire': 0.25, 'el_ice': 0.25, 'el_thunder': 0.25, 'el_wind': 0.25, 'el_light': 0.25, 'el_dark': 0.25, pierce: 0.40 },
      flags: ['guardBreak'],
      desc: '星々の巡りを閉じ込めた輪。あらゆる耐性が意味を失う。',
      cond: { when: 'battleEnd', label: '1回の戦闘で6属性すべてのダメージを与えて勝利する',
              hint: '属性武器・属性スキル・属性アイテムを組み合わせよ',
              test: function (c) { return G.MAGIC_ELEMENTS.every(function (e) { return c.b.elementsUsed[e]; }); } } });

  m({ id: 'y_flask', name: '賢者の万能瓶', tier: 4, price: 0,
      mods: { itemPower: 1.20, itemKeep: 0.30 }, flags: ['itemRefill', 'itemEcho'],
      desc: '中身が減らない賢者の瓶。',
      cond: { when: 'battleEnd', label: '1回の戦闘でアイテムを6回使用して勝利する',
              hint: 'アイテムを溜め込んで一戦で使い切れ',
              test: function (c) { return c.b.itemsUsed >= 6; } } });

  m({ id: 'y_unbroken', name: '不屈の刻印', tier: 4, price: 0,
      mods: { hpPct: 0.30, atkPct: 0.10 }, flags: ['endure', 'lowHpRage'],
      desc: '折れなかった者だけに現れる刻印。',
      cond: { when: 'battleEnd', label: '残りHP5%以下の状態で戦闘に勝利する',
              hint: '瀕死のまま勝ち切れ',
              test: function (c) { return c.hero.hp > 0 && c.hero.hp <= Math.max(1, Math.floor(c.S.maxHp * 0.05)); } } });

  m({ id: 'y_pristine', name: '無傷の証', tier: 4, price: 0,
      mods: { dr: 0.20, hpPct: 0.10 }, flags: ['pristine'],
      desc: '一度も触れられなかった証。',
      cond: { when: 'battleEnd', label: 'ボスを一度もダメージを受けずに撃破する',
              hint: '先手必勝、あるいは完全回避',
              test: function (c) { return c.b.isBoss && c.b.damageTaken <= 0; } } });

  m({ id: 'y_voidshard', name: '虚無の欠片', tier: 4, price: 0,
      mods: { atkPct: 0.12, magPct: 0.12, defPct: 0.12, hpPct: 0.12, spd: 10 }, flags: ['mythicScaling'],
      desc: '何もない場所から拾い上げた欠片。',
      cond: { when: 'progress', label: '第20階層に到達する',
              hint: '深く潜れ',
              test: function (c) { return c.run.floor >= 20; } } });

  G.ACCESSORIES = ACC;
  G.ACC_BY_ID = {};
  ACC.forEach(function (a) { G.ACC_BY_ID[a.id] = a; });
  G.MYTHICS = ACC.filter(function (a) { return a.rarity === 'mythic'; });
  G.LEGENDS = ACC.filter(function (a) { return a.rarity === 'legend'; });
  G.NORMALS = ACC.filter(function (a) { return a.rarity === 'normal'; });
})();
