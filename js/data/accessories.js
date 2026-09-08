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
      cond: { when: 'battleEnd', code: 'crit_streak', v: 8, label: '1回の戦闘で会心を8回連続で発生させて勝利する',
              hint: '会心率を上げ、多段攻撃で連続会心を狙え',
              test: function (c) { return c.b.critStreakMax >= 8; } } });

  m({ id: 'y_mirrorcore', name: '鏡獄の心核', tier: 4, price: 0,
      mods: { reflect: 0.50, reflectPow: 0.45, dr: 0.10 }, flags: ['reflectAll', 'healOnReflect'],
      desc: '無数の鏡が閉じ込められた核。攻撃という概念を反転させる。',
      cond: { when: 'battleEnd', code: 'reflect_kills', v: 3, label: '1回の戦闘で反射ダメージだけで敵を3体撃破する',
              hint: '反射率を高めて殴られながら勝て',
              test: function (c) { return c.b.reflectKills >= 3; } } });

  m({ id: 'y_annihilorder', name: '殲滅の号令', tier: 4, price: 0,
      mods: { aoePower: 0.70, aoeRatio: 0.60 }, flags: ['overkillChain'],
      desc: '一声で戦場を薙ぎ払う号令。',
      cond: { when: 'battleEnd', code: 'multi_kill', v: 4, label: '1回の攻撃で敵を4体同時に撃破する',
              hint: '全体攻撃と範囲威力を積み上げろ',
              test: function (c) { return c.b.maxMultiKill >= 4; } } });

  m({ id: 'y_astralring', name: '星霜の輪環', tier: 4, price: 0,
      mods: { 'el_fire': 0.25, 'el_ice': 0.25, 'el_thunder': 0.25, 'el_wind': 0.25, 'el_light': 0.25, 'el_dark': 0.25, pierce: 0.40 },
      flags: ['guardBreak'],
      desc: '星々の巡りを閉じ込めた輪。あらゆる耐性が意味を失う。',
      cond: { when: 'battleEnd', code: 'all_elements', label: '1回の戦闘で6属性すべてのダメージを与えて勝利する',
              hint: '属性武器・属性スキル・属性アイテムを組み合わせよ',
              test: function (c) { return G.MAGIC_ELEMENTS.every(function (e) { return c.b.elementsUsed[e]; }); } } });

  m({ id: 'y_flask', name: '賢者の万能瓶', tier: 4, price: 0,
      mods: { itemPower: 1.20, itemKeep: 0.30 }, flags: ['itemRefill', 'itemEcho'],
      desc: '中身が減らない賢者の瓶。',
      cond: { when: 'battleEnd', code: 'items_used', v: 6, label: '1回の戦闘でアイテムを6回使用して勝利する',
              hint: 'アイテムを溜め込んで一戦で使い切れ',
              test: function (c) { return c.b.itemsUsed >= 6; } } });

  m({ id: 'y_unbroken', name: '不屈の刻印', tier: 4, price: 0,
      mods: { hpPct: 0.30, atkPct: 0.10 }, flags: ['endure', 'lowHpRage'],
      desc: '折れなかった者だけに現れる刻印。',
      cond: { when: 'battleEnd', code: 'low_hp_win', v: 0.05, label: '残りHP5%以下の状態で戦闘に勝利する',
              hint: '瀕死のまま勝ち切れ',
              test: function (c) { return c.hero.hp > 0 && c.hero.hp <= Math.max(1, Math.floor(c.S.maxHp * 0.05)); } } });

  m({ id: 'y_pristine', name: '無傷の証', tier: 4, price: 0,
      mods: { dr: 0.20, hpPct: 0.10 }, flags: ['pristine'],
      desc: '一度も触れられなかった証。',
      cond: { when: 'battleEnd', code: 'boss_no_damage', label: 'ボスを一度もダメージを受けずに撃破する',
              hint: '先手必勝、あるいは完全回避',
              test: function (c) { return c.b.isBoss && c.b.damageTaken <= 0; } } });

  m({ id: 'y_voidshard', name: '虚無の欠片', tier: 4, price: 0,
      mods: { atkPct: 0.12, magPct: 0.12, defPct: 0.12, hpPct: 0.12, spd: 10 }, flags: ['mythicScaling'],
      desc: '何もない場所から拾い上げた欠片。',
      cond: { when: 'progress', code: 'floor', v: 20, label: '第20階層に到達する',
              hint: '深く潜れ',
              test: function (c) { return c.run.floor >= 20; } } });


  /* --- 通常: 単一軸の上位品 --- */
  n({ id: 'n_steelring', name: '鋼腕の指輪', tier: 2, price: 165, mods: { atk: 30, atkPct: 0.06 }, desc: '鍛え上げられた鋼の輪。' });
  n({ id: 'n_dominion', name: '覇力の指輪', tier: 3, price: 330, mods: { atk: 44, atkPct: 0.10 }, desc: '覇者だけが嵌められる指輪。' });
  n({ id: 'n_deepcharm', name: '深智の護符', tier: 2, price: 165, mods: { mag: 30, mp: 20 }, desc: '深い思索を助ける護符。' });
  n({ id: 'n_sagecrown', name: '叡智の宝冠', tier: 3, price: 330, mods: { mag: 46, magPct: 0.08 }, desc: '叡智そのものを戴く冠。' });
  n({ id: 'n_swiftshoes', name: '韋駄天の靴', tier: 2, price: 165, mods: { spd: 26, evade: 0.08 }, desc: '風より速く駆ける靴。' });
  n({ id: 'n_godspeed', name: '神速の足環', tier: 3, price: 330, mods: { spd: 36, evade: 0.12 }, desc: '踏み出す前に到着している。' });
  n({ id: 'n_ironward', name: '鉄壁の護符', tier: 2, price: 165, mods: { def: 34, hp: 60 }, desc: '硬く冷たい守りの札。' });
  n({ id: 'n_castleward', name: '城壁の護符', tier: 3, price: 330, mods: { def: 50, hp: 110, defPct: 0.10 }, desc: '一人で城塞に等しい。' });
  n({ id: 'n_magishield', name: '魔盾の耳飾り', tier: 2, price: 165, mods: { res: 36, dr: 0.06 }, desc: '魔を弾く銀の耳飾り。' });
  n({ id: 'n_soulshield', name: '霊盾の耳飾り', tier: 3, price: 330, mods: { res: 52, dr: 0.10 }, desc: '魂に届く一撃すら遮る。' });
  n({ id: 'n_critclaw', name: '会心の爪', tier: 2, price: 175, mods: { critRate: 0.14, critDmg: 0.30 }, desc: '急所を探り当てる爪。' });
  n({ id: 'n_critcrown', name: '会心の宝冠', tier: 3, price: 345, mods: { critRate: 0.20, critDmg: 0.50 }, desc: '見た全てに急所が見える。' });
  n({ id: 'n_thorncollar', name: '棘の首輪', tier: 2, price: 175, mods: { reflect: 0.20, def: 16 }, desc: '内向きにも棘がある。' });
  n({ id: 'n_thornplate', name: '棘の胸当て', tier: 3, price: 345, mods: { reflect: 0.28, reflectPow: 0.15, def: 28 }, desc: '触れるもの全てを刺す。' });
  n({ id: 'n_scatterlens', name: '散華のレンズ', tier: 2, price: 175, mods: { aoeRatio: 0.26, aoePower: 0.18 }, desc: '一点を面に変えるレンズ。' });
  n({ id: 'n_bloomlens', name: '大散華のレンズ', tier: 3, price: 345, mods: { aoeRatio: 0.34, aoePower: 0.28 }, desc: '戦場全体が一つの的になる。' });
  n({ id: 'n_medicbag', name: '薬師の鞄', tier: 2, price: 175, mods: { itemPower: 0.40, itemKeep: 0.12 }, desc: '整然と薬瓶が並ぶ鞄。' });
  n({ id: 'n_alchembag', name: '錬金の鞄', tier: 3, price: 345, mods: { itemPower: 0.58, itemKeep: 0.20 }, desc: '中で薬が勝手に増えている。' });
  n({ id: 'n_vampring', name: '吸血の指輪', tier: 2, price: 175, mods: { lifesteal: 0.18, atk: 10 }, desc: '傷口から生命を啜る。' });
  n({ id: 'n_vamprod', name: '吸血の王笏', tier: 3, price: 345, mods: { lifesteal: 0.26, atk: 18 }, desc: '奪うことに特化した笏。' });
  n({ id: 'n_pierceemblem', name: '貫きの徽章', tier: 2, price: 170, mods: { pierce: 0.30 }, desc: '耐性という言い訳を許さない。' });
  n({ id: 'n_banemblem', name: '破魔の徽章', tier: 3, price: 340, mods: { pierce: 0.42 }, desc: 'あらゆる守りは紙に等しい。' });
  n({ id: 'n_lifechain', name: '命脈の首飾り', tier: 2, price: 170, mods: { hp: 130, hpPct: 0.08 }, desc: '鼓動が力強くなる。' });
  n({ id: 'n_dragonheart', name: '竜血の首飾り', tier: 3, price: 340, mods: { hp: 200, hpPct: 0.14 }, desc: '竜の血が巡る首飾り。' });

  /* --- 通常: 属性輝石（上位の宝珠） --- */
  n({ id: 'n_gem_fire', name: '炎の輝石', tier: 2, price: 180, mods: { 'el_fire': 0.34 }, desc: '芯まで燃えている石。' });
  n({ id: 'n_gem_ice', name: '氷の輝石', tier: 2, price: 180, mods: { 'el_ice': 0.34 }, desc: '融けることのない石。' });
  n({ id: 'n_gem_thunder', name: '雷の輝石', tier: 2, price: 180, mods: { 'el_thunder': 0.34 }, desc: '触れると痺れる石。' });
  n({ id: 'n_gem_wind', name: '風の輝石', tier: 2, price: 180, mods: { 'el_wind': 0.34 }, desc: '常に微かに震えている石。' });
  n({ id: 'n_gem_light', name: '光の輝石', tier: 2, price: 180, mods: { 'el_light': 0.34 }, desc: '闇の中でも影を作る石。' });
  n({ id: 'n_gem_dark', name: '闇の輝石', tier: 2, price: 180, mods: { 'el_dark': 0.34 }, desc: '光を飲み込む石。' });

  /* --- 通常: 二軸ハイブリッド --- */
  n({ id: 'n_clashring', name: '相剋の指輪', tier: 2, price: 185, mods: { critRate: 0.08, reflect: 0.12 }, desc: '攻と守、噛み合わぬ二つを繋ぐ。' });
  n({ id: 'n_stormcrit', name: '嵐撃の護符', tier: 2, price: 185, mods: { aoeRatio: 0.16, critRate: 0.08 }, desc: '広く、そして深く斬る。' });
  n({ id: 'n_alchemybelt', name: '錬撃の帯', tier: 2, price: 185, mods: { itemPower: 0.25, atk: 16 }, desc: '薬瓶を鈍器としても使う者へ。' });
  n({ id: 'n_hexmark', name: '呪撃の刻印', tier: 2, price: 185, mods: { 'el_dark': 0.18, lifesteal: 0.10 }, desc: '呪いは奪うためにある。' });
  n({ id: 'n_holyward', name: '聖盾の紋', tier: 2, price: 185, mods: { 'el_light': 0.18, dr: 0.07 }, desc: '光は守りでもある。' });
  n({ id: 'n_shadowear', name: '疾影の耳飾り', tier: 2, price: 185, mods: { spd: 18, critDmg: 0.30 }, desc: '速さがそのまま鋭さになる。' });
  n({ id: 'n_heavyshell', name: '重殻の腕輪', tier: 2, price: 185, mods: { def: 26, reflect: 0.12 }, desc: '厚い殻は反撃の道具でもある。' });
  n({ id: 'n_frostfire', name: '霜炎の対珠', tier: 2, price: 195, mods: { 'el_fire': 0.18, 'el_ice': 0.18 }, desc: '相反する二つが同じ器に。' });
  n({ id: 'n_stormpair', name: '雷風の対珠', tier: 2, price: 195, mods: { 'el_thunder': 0.18, 'el_wind': 0.18 }, desc: '荒れ狂う二つが手を組む。' });
  n({ id: 'n_duskpair', name: '光闇の対珠', tier: 2, price: 195, mods: { 'el_light': 0.18, 'el_dark': 0.18 }, desc: '昼と夜は隣り合っている。' });
  n({ id: 'n_sagelens', name: '賢者の眼鏡', tier: 2, price: 185, mods: { mag: 20, itemPower: 0.22 }, desc: '調合の失敗が減る眼鏡。' });
  n({ id: 'n_hunterbelt', name: '猟兵の帯', tier: 2, price: 185, mods: { atk: 18, goldUp: 0.25, dropUp: 0.25 }, desc: '獲物を余さず持ち帰る。' });

  /* --- 通常: 呪詛（状態異常）系 --- */
  n({ id: 'n_venomband', name: '毒牙の腕輪', tier: 2, price: 175, mods: { 'el_dark': 0.12 },
      flags: ['statusOnHit'], desc: '牙に毒を仕込んだ腕輪。' });
  n({ id: 'n_frostneedle', name: '霜針の護符', tier: 2, price: 175, mods: { 'el_ice': 0.15 },
      flags: ['freezeOnIce'], desc: '刺すような冷気を宿した針。' });
  n({ id: 'n_hexcharm', name: '呪符の護符', tier: 2, price: 175, mods: { pierce: 0.10 },
      flags: ['lingering'], desc: '書かれた呪いが消えない護符。' });

  /* --- 通常: 序盤・補助 --- */
  n({ id: 'n_noviceward', name: '見習いの護符', tier: 1, price: 80, mods: { atk: 8, mag: 8, def: 8, hp: 30 }, desc: '万遍なく、ほんの少しだけ。' });
  n({ id: 'n_travelboots', name: '旅人の靴', tier: 1, price: 85, mods: { spd: 10, goldUp: 0.15 }, desc: '履き慣らされた靴。' });
  n({ id: 'n_manaspring', name: '魔力の泉', tier: 2, price: 170, mods: { mp: 44, mpRegen: 7 }, desc: '常に湧き続ける小さな泉。' });
  n({ id: 'n_focusband', name: '集中の鉢巻', tier: 2, price: 170, mods: { critDmg: 0.45 }, desc: '一点だけを見る。' });
  n({ id: 'n_patiencering', name: '忍耐の腕輪', tier: 2, price: 170, mods: { dr: 0.10, hp: 70 }, desc: '耐える者に報いる。' });
  n({ id: 'n_riposteglove', name: '反攻の小手', tier: 2, price: 170, mods: { reflect: 0.16, atk: 14 }, desc: '受けた分だけ返す小手。' });

  /* --- 追加レジェンド --- */
  l({ id: 'l_reaperclaw', name: '首刈りの鎌爪', tier: 3, price: 640, mods: { critRate: 0.12, atk: 22 }, flags: ['executeLow'],
      desc: '弱った獲物を逃さない鎌。' });
  l({ id: 'l_titanhorn', name: '巨獣狩りの角笛', tier: 3, price: 640, mods: { atk: 24, hp: 70 }, flags: ['bossSlayer'],
      desc: '大物を狩る者へ受け継がれる角笛。' });
  l({ id: 'l_wolffang', name: '群狼の牙飾り', tier: 3, price: 640, mods: { aoeRatio: 0.15, spd: 12 }, flags: ['hordeSlayer'],
      desc: '数に囲まれるほど牙が冴える。' });
  l({ id: 'l_duelmark', name: '一騎討ちの証', tier: 3, price: 640, mods: { critDmg: 0.40 }, flags: ['soloFocus'],
      desc: '一対一の場でのみ輝く紋。' });
  l({ id: 'l_plaguemask', name: '疫病医の面', tier: 3, price: 660, mods: { 'el_dark': 0.20 }, flags: ['statusDamage', 'spreadStatus'],
      desc: '病を運ぶ者の面。' });
  l({ id: 'l_swiftsoul', name: '韋駄天の魂', tier: 3, price: 650, mods: { spd: 24 }, flags: ['speedPower'],
      desc: '速さそのものが刃になる。' });
  l({ id: 'l_bastionheart', name: '城塞の心臓', tier: 3, price: 650, mods: { def: 40, hp: 80 }, flags: ['wallPower'],
      desc: '守りを攻めに変換する機構。' });
  l({ id: 'l_manacycler', name: '魔力循環器', tier: 3, price: 650, mods: { mp: 60, mpRegen: 6 }, flags: ['manaPower'],
      desc: '満ちた魔力がそのまま威力になる。' });
  l({ id: 'l_chainring', name: '連撃の指輪', tier: 3, price: 660, mods: { critRate: 0.10 }, flags: ['critChain'],
      desc: '一度当たれば、二度目が来る。' });
  l({ id: 'l_preemptwatch', name: '先制の懐中時計', tier: 3, price: 650, mods: { spd: 18 }, flags: ['firstHitCrit'],
      desc: '常に相手より一拍早い。' });
  l({ id: 'l_phantomcloak', name: '幻影の外套', tier: 3, price: 660, mods: { evade: 0.15, spd: 14 }, flags: ['counterEvade'],
      desc: 'すり抜けざまに斬り返す。' });
  l({ id: 'l_twincodex', name: '双詠の魔導書', tier: 3, price: 680, mods: { magPct: 0.10, mp: 40 }, flags: ['doubleCast'],
      desc: '同じ呪文が二度紡がれる。' });
  l({ id: 'l_thorncenser', name: '棘霧の香炉', tier: 3, price: 650, mods: { reflect: 0.15, res: 20 }, flags: ['thornAura'],
      desc: '漂う霧そのものが棘。' });
  l({ id: 'l_burstpendant', name: '爆散の首飾り', tier: 3, price: 650, mods: { aoePower: 0.20 }, flags: ['deathSpike'],
      desc: '倒れた者が次を巻き込む。' });
  l({ id: 'l_allward', name: '万象の護り', tier: 3, price: 660, mods: { res: 30, def: 20 }, flags: ['wardAll'],
      desc: 'あらゆる方向からの一撃を薄める。' });
  l({ id: 'l_sixturn', name: '六転の環', tier: 3, price: 680,
      mods: { 'el_fire': 0.08, 'el_ice': 0.08, 'el_thunder': 0.08, 'el_wind': 0.08, 'el_light': 0.08, 'el_dark': 0.08 },
      flags: ['elementCycle'], desc: '握るたびに属性が移り変わる環。' });
  l({ id: 'l_huntcompass', name: '狩人の羅針盤', tier: 3, price: 650, mods: { pierce: 0.15 }, flags: ['weakHunter'],
      desc: '弱点の方角を指し示す。' });
  l({ id: 'l_alchemheart', name: '錬金の心臓', tier: 3, price: 660, mods: { itemPower: 0.45 }, flags: ['alchemyShield'],
      desc: '開幕から薬が身を守る。' });
  l({ id: 'l_undauntedhelm', name: '不撓の兜', tier: 3, price: 650, mods: { hp: 120, def: 18 }, flags: ['lastStand'],
      desc: '追い詰められてから硬くなる。' });
  l({ id: 'l_devourfang', name: '喰らい狼の牙', tier: 3, price: 650, mods: { lifesteal: 0.12, atk: 16 }, flags: ['killHeal'],
      desc: '倒すたびに傷が塞がる。' });
  l({ id: 'l_graingrail', name: '慈雨の聖杯', tier: 3, price: 650, mods: { mag: 22, hp: 60 }, flags: ['overheal'],
      desc: '溢れた慈悲は捨てられない。' });
  l({ id: 'l_bloodriver', name: '血河の指輪', tier: 3, price: 660, mods: { lifesteal: 0.35, hpPct: -0.10 },
      desc: '血の河を渡る者の指輪。奪えなければ死ぬ。' });
  l({ id: 'l_galeheart', name: '暴風の心臓', tier: 3, price: 660, mods: { aoePower: 0.55, spd: 18 },
      desc: '心臓そのものが風の渦。' });
  l({ id: 'l_stardust', name: '星屑の首飾り', tier: 3, price: 680,
      mods: { 'el_fire': 0.20, 'el_ice': 0.20, 'el_thunder': 0.20, 'el_wind': 0.20, 'el_light': 0.20, 'el_dark': 0.20, spd: -10 },
      desc: '砕けた星の欠片を繋いだ首飾り。重い。' });
  l({ id: 'l_twinmirror', name: '鏡合わせの双盾', tier: 3, price: 660, mods: { reflect: 0.30, dr: 0.10, spd: -14 },
      desc: '二枚の鏡が無限に映し合う。' });
  l({ id: 'l_curseheart', name: '呪詛の心臓', tier: 3, price: 660, mods: { 'el_dark': 0.40 }, flags: ['statusDamage'],
      desc: '呪われた者ほど深く斬れる。' });
  l({ id: 'l_dawncrown', name: '白光の冠', tier: 3, price: 660, mods: { 'el_light': 0.38, mag: 16 }, flags: ['overheal'],
      desc: '夜明けを閉じ込めた冠。' });
  l({ id: 'l_thunderbrace', name: '雷神の腕輪', tier: 3, price: 660, mods: { 'el_thunder': 0.40, critRate: 0.08 },
      flags: ['shockOnThunder'], desc: '雷神が身につけていたという腕輪。' });

  l({ id: 'l_epidemic', name: '疫禍の香炉', tier: 3, price: 660, mods: { 'el_dark': 0.25 },
      flags: ['spreadStatus', 'lingering'], desc: '焚くほどに病が広がる香炉。' });

  /* --- 追加ミシック --- */
  m({ id: 'y_flashmoment', name: '電光石火の刻', tier: 4, price: 0,
      mods: { spd: 40, critRate: 0.10 }, flags: ['firstHitCrit', 'speedPower'],
      desc: '素早さ+40。素早さの40%が攻撃力になり、各戦闘の初撃は必ず会心。',
      cond: { when: 'battleEnd', code: 'fast_win', v: 2, label: '2ターン以内に戦闘に勝利する',
              hint: '先制と火力を極めて一瞬で終わらせろ',
              test: function (c) { return c.b.turns <= 2 && c.b.kills >= 2; } } });

  m({ id: 'y_emptymind', name: '無心の数珠', tier: 4, price: 0,
      mods: { mp: 70, mpRegen: 12, magPct: 0.25 }, flags: ['manaPower'],
      desc: 'MP+70／毎ターン12回復。残りMPの割合に応じて与ダメージ最大+30%。',
      cond: { when: 'battleEnd', code: 'no_mp', v: 2, label: 'MPを一切消費せずに戦闘に勝利する',
              hint: '通常攻撃・防御・アイテムだけで勝て',
              test: function (c) { return c.b.mpSpent === 0 && c.b.kills >= 2; } } });

  m({ id: 'y_barehand', name: '徒手空拳の証', tier: 4, price: 0,
      mods: { atkPct: 0.35, critDmg: 0.40 }, flags: ['doubleStrike'],
      desc: '物理攻撃+35%／会心ダメージ+40%。通常攻撃が2回に分裂する。',
      cond: { when: 'battleEnd', code: 'basic_only', v: 3, label: '通常攻撃と防御だけで戦闘に勝利する',
              hint: 'スキルを一切使わず3体以上倒せ',
              test: function (c) { return c.b.onlyBasic && c.b.kills >= 3; } } });

  m({ id: 'y_plaguetalisman', name: '万病の呪符', tier: 4, price: 0,
      mods: { 'el_dark': 0.30, pierce: 0.20 }, flags: ['spreadStatus', 'statusDamage'],
      desc: '闇+30%。状態異常が周囲に伝播し、状態異常の敵への与ダメージ+35%。',
      cond: { when: 'battleEnd', code: 'status_peak', v: 4, label: '1体の敵に4種類の状態異常を同時に付与する',
              hint: '火傷・毒・凍結・麻痺を1体へ',
              test: function (c) { return c.b.statusPeak >= 4; } } });

  m({ id: 'y_grimoire', name: '万技の書', tier: 4, price: 0,
      mods: { atkPct: 0.20, magPct: 0.20, mp: 60 }, flags: ['doubleCast'],
      desc: '物理・魔法攻撃+20%／MP+60。魔法スキルが2回発動する。',
      cond: { when: 'battleEnd', code: 'skill_kinds', v: 7, label: '1回の戦闘で7種類以上のスキルを使って勝利する',
              hint: '手数の多い職ほど狙いやすい',
              test: function (c) { return c.b.skillKinds >= 7; } } });

  m({ id: 'y_absolutebarrier', name: '絶対障壁の核', tier: 4, price: 0,
      mods: { dr: 0.12, res: 40 }, flags: ['alchemyShield', 'overheal', 'barrierOnHit'],
      desc: '開幕バリア／回復の超過分がバリアに／被弾時にもバリア。被ダメ-12%。',
      cond: { when: 'battleEnd', code: 'barrier_absorb', v: 1, label: 'バリアで最大HP以上のダメージを吸収して勝利する',
              hint: '聖障壁や錬金の守りを重ねろ',
              test: function (c) { return c.b.barrierAbsorbed >= c.S.maxHp; } } });

  m({ id: 'y_phantommask', name: '幻影の面', tier: 4, price: 0,
      mods: { evade: 0.28, spd: 26 }, flags: ['counterEvade'],
      desc: '回避率+28%／素早さ+26。回避したとき必ず反撃する。',
      cond: { when: 'battleEnd', code: 'evade_streak', v: 5, label: '敵の攻撃を5回連続で回避する',
              hint: '回避率を積み上げて避け続けろ',
              test: function (c) { return c.b.evadeStreakMax >= 5; } } });

  m({ id: 'y_instantblade', name: '瞬滅の刃', tier: 4, price: 0,
      mods: { critDmg: 0.70, atkPct: 0.15 }, flags: ['executeLow', 'bossSlayer'],
      desc: '会心ダメージ+70%。瀕死の敵へ+60%、ボスへ+25%の与ダメージ。',
      cond: { when: 'battleEnd', code: 'boss_fast', v: 1, label: 'ボスを1ターンで撃破する',
              hint: '開幕の一撃に全てを乗せろ',
              test: function (c) { return c.b.isBoss && c.b.turns <= 1; } } });

  m({ id: 'y_immortalspring', name: '不死の泉', tier: 4, price: 0,
      mods: { lifesteal: 0.25, hpPct: 0.15 }, flags: ['overheal', 'killHeal'],
      desc: '吸収+25%／最大HP+15%。撃破時に回復し、超過分はバリアになる。',
      cond: { when: 'battleEnd', code: 'heal_total', v: 2, label: '1回の戦闘で最大HPの2倍を回復して勝利する',
              hint: '削られながら癒し続けろ',
              test: function (c) { return c.b.healed >= c.S.maxHp * 2; } } });

  m({ id: 'y_trueeye', name: '看破の瞳', tier: 4, price: 0,
      mods: { pierce: 0.45, 'el_fire': 0.12, 'el_ice': 0.12, 'el_thunder': 0.12, 'el_wind': 0.12, 'el_light': 0.12, 'el_dark': 0.12 },
      flags: ['weakHunter'],
      desc: '耐性貫通+45%／全属性+12%。弱点を突いたときの与ダメージがさらに+30%。',
      cond: { when: 'battleEnd', code: 'all_weak_kills', v: 3, label: '撃破した敵をすべて弱点属性で倒す（3体以上）',
              hint: '属性を選び分けて狩れ',
              test: function (c) { return c.b.kills >= 3 && c.b.weakKills >= c.b.kills; } } });

  m({ id: 'y_skybreaker', name: '天砕の一撃', tier: 4, price: 0,
      mods: { critDmg: 1.00 }, flags: ['critChain', 'soloFocus'],
      desc: '会心ダメージ+100%。会心時に追撃が発生し、敵が1体なら与ダメージ+40%。',
      cond: { when: 'battleEnd', code: 'big_hit', v: 3, label: '1回の攻撃で自分の最大HPの3倍のダメージを与える',
              hint: '会心と属性弱点を一撃に束ねろ',
              test: function (c) { return c.b.maxHitDamage >= c.S.maxHp * 3; } } });

  m({ id: 'y_enduranceshell', name: '忍耐の甲殻', tier: 4, price: 0,
      mods: { hpPct: 0.35, reflect: 0.20 }, flags: ['wardAll', 'lastStand'],
      desc: '最大HP+35%／反射+20%。被ダメージ-15%、HP50%以下でさらに-25%。',
      cond: { when: 'battleEnd', code: 'endure_damage', v: 3, label: '最大HPの3倍を超えるダメージを受けて勝利する',
              hint: '殴られ続けて、それでも立て',
              test: function (c) { return c.b.damageTaken >= c.S.maxHp * 3; } } });

  m({ id: 'y_abysscrown', name: '深淵の王冠', tier: 4, price: 0,
      mods: { atkPct: 0.15, magPct: 0.15, defPct: 0.15, hpPct: 0.15, spd: 12 }, flags: ['mythicScaling'],
      desc: '主要ステータス+15%。装備中のミシック1個につき与ダメージ+10%。',
      cond: { when: 'progress', code: 'floor', v: 30, label: '第30階層に到達する', hint: '深淵の底を目指せ',
              test: function (c) { return c.run.floor >= 30; } } });

  m({ id: 'y_masterproof', name: '大成の証', tier: 4, price: 0,
      mods: { atkPct: 0.18, magPct: 0.18, defPct: 0.18, hpPct: 0.18 },
      desc: '物理・魔法攻撃・防御・最大HPを18%上昇させる。',
      cond: { when: 'progress', code: 'level', v: 25, label: 'レベル25に到達する', hint: '深く潜り、戦い続けろ',
              test: function (c) { return c.hero.level >= 25; } } });

  m({ id: 'y_protean', name: '変幻自在の印', tier: 4, price: 0,
      mods: { critRate: 0.12, reflect: 0.15, aoeRatio: 0.20, itemPower: 0.40,
              'el_fire': 0.10, 'el_ice': 0.10, 'el_thunder': 0.10, 'el_wind': 0.10, 'el_light': 0.10, 'el_dark': 0.10 },
      desc: '会心・反射・波及・アイテム・全属性を同時に押し上げる万能の印。',
      cond: { when: 'progress', code: 'run_stat', k: 'classChanges', v: 3, label: '1回の冒険で3回転職する', hint: '祭壇を巡り、職を渡り歩け',
              test: function (c) { return (c.run.stats.classChanges || 0) >= 3; } } });

  m({ id: 'y_fortunecoin', name: '富貴の金貨', tier: 4, price: 0,
      mods: { goldUp: 1.00, dropUp: 0.60, itemPower: 0.50 }, flags: ['hordeSlayer'],
      desc: '獲得ゴールド2倍／ドロップ率+60%／アイテム威力+50%。敵が3体以上で与ダメ+22%。',
      cond: { when: 'progress', code: 'gold', v: 6000, label: '6000ゴールドを所持する', hint: '使わず貯め込め',
              test: function (c) { return c.hero.gold >= 6000; } } });

  G.ACCESSORIES = ACC;
  G.ACC_BY_ID = {};
  ACC.forEach(function (a) { G.ACC_BY_ID[a.id] = a; });
  G.MYTHICS = ACC.filter(function (a) { return a.rarity === 'mythic'; });
  G.LEGENDS = ACC.filter(function (a) { return a.rarity === 'legend'; });
  G.NORMALS = ACC.filter(function (a) { return a.rarity === 'normal'; });
})();
