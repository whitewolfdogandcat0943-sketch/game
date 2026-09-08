/* gear.js - 武器 / 防具（アクセサリは accessories.js） */
(function () {
  var W = [], A = [];
  function w(o) { o.slot = 'weapon'; o.kind = 'gear'; W.push(o); return o; }
  function a(o) { o.slot = 'armor'; o.kind = 'gear'; A.push(o); return o; }

  /* --------- 武器: el で通常攻撃の属性が変わる / grant でスキル追加 --------- */
  w({ id: 'w_shortsword', name: 'ショートソード', tier: 1, rarity: 'common', el: 'phys', price: 60,
      mods: { atk: 12, critRate: 0.02 }, desc: '扱いやすい片手剣。' });
  w({ id: 'w_dagger', name: 'ダガー', tier: 1, rarity: 'common', el: 'phys', price: 70,
      mods: { atk: 8, spd: 10, critRate: 0.08, critDmg: 0.10 }, desc: '速さと会心に優れる短剣。' });
  w({ id: 'w_oakstaff', name: 'オークの杖', tier: 1, rarity: 'common', el: 'phys', price: 65,
      mods: { mag: 14, mp: 12 }, desc: '初歩の魔導触媒。' });
  w({ id: 'w_mace', name: 'メイス', tier: 1, rarity: 'common', el: 'phys', price: 65,
      mods: { atk: 10, def: 8, reflect: 0.05 }, desc: '打撃と防御を兼ねる鈍器。' });

  w({ id: 'w_flameblade', name: '焔剣ロウガ', tier: 2, rarity: 'rare', el: 'fire', price: 220,
      mods: { atk: 24, 'el_fire': 0.25 }, grant: 'fireball', desc: '通常攻撃が炎属性になる。〈火球〉を習得。' });
  w({ id: 'w_frostfang', name: '氷牙刀', tier: 2, rarity: 'rare', el: 'ice', price: 220,
      mods: { atk: 22, 'el_ice': 0.25, spd: 6 }, grant: 'iceLance', desc: '通常攻撃が氷属性になる。〈氷槍〉を習得。' });
  w({ id: 'w_thunderspear', name: '雷鳴槍', tier: 2, rarity: 'rare', el: 'thunder', price: 230,
      mods: { atk: 23, 'el_thunder': 0.25, critRate: 0.05 }, grant: 'boltStrike', desc: '通常攻撃が雷属性に。〈雷撃〉を習得。' });
  w({ id: 'w_windedge', name: '疾風の双剣', tier: 2, rarity: 'rare', el: 'wind', price: 240,
      mods: { atk: 18, spd: 18, aoeRatio: 0.20, 'el_wind': 0.20 }, grant: 'whirlwind', desc: '通常攻撃が風属性に。〈旋風斬〉を習得。' });
  w({ id: 'w_thornmace', name: '棘鉄の戦槌', tier: 2, rarity: 'rare', el: 'phys', price: 235,
      mods: { atk: 20, def: 18, reflect: 0.18 }, grant: 'thornGuard', desc: '打ち返す棘を備えた戦槌。〈棘の構え〉を習得。' });
  w({ id: 'w_alchemyrod', name: '錬金杖', tier: 2, rarity: 'rare', el: 'phys', price: 235,
      mods: { mag: 22, itemPower: 0.30, itemKeep: 0.10 }, grant: 'throwBomb', desc: '薬品を増幅する触媒杖。〈投擲爆弾〉を習得。' });
  w({ id: 'w_holyrod', name: '聖銀の錫杖', tier: 2, rarity: 'rare', el: 'light', price: 230,
      mods: { mag: 24, 'el_light': 0.28, mpRegen: 3 }, grant: 'smite', desc: '通常攻撃が光属性に。〈裁きの光〉を習得。' });

  w({ id: 'w_ruinblade', name: '滅刃グラム', tier: 3, rarity: 'legend', el: 'phys', price: 700,
      mods: { atk: 46, critRate: 0.18, critDmg: 0.55 }, flags: ['critPierce'],
      grant: 'executioner', desc: '滅びを刻んだ刃。〈処刑宣告〉を習得。' });
  w({ id: 'w_stormaxis', name: '嵐軸の大鎌', tier: 3, rarity: 'legend', el: 'wind', price: 700,
      mods: { atk: 40, aoePower: 0.45, aoeRatio: 0.35, 'el_wind': 0.30 },
      grant: 'tempest', desc: '振るうたび嵐が渦を巻く。〈大嵐〉を習得。' });
  w({ id: 'w_mirrorlance', name: '万象反射槍', tier: 3, rarity: 'legend', el: 'light', price: 700,
      mods: { atk: 34, def: 30, reflect: 0.30, reflectPow: 0.30 }, flags: ['healOnReflect'],
      grant: 'retaliate', desc: '万象を映し返す槍。〈報復の刃〉を習得。' });
  w({ id: 'w_starcaller', name: '星呼びの杖', tier: 3, rarity: 'legend', el: 'phys', price: 720,
      mods: { mag: 48, pierce: 0.25, 'el_fire': 0.12, 'el_ice': 0.12, 'el_thunder': 0.12, 'el_wind': 0.12, 'el_light': 0.12, 'el_dark': 0.12 },
      grant: 'elementalBurst', desc: '星々を呼び降ろす杖。〈元素乱舞〉を習得。' });
  w({ id: 'w_panaceastaff', name: '賢者の万能杖', tier: 3, rarity: 'legend', el: 'phys', price: 700,
      mods: { mag: 36, itemPower: 0.75, itemKeep: 0.25 }, flags: ['itemEcho'],
      grant: 'panacea', desc: '賢者の知恵が染み込んだ万能の杖。' });

  /* --------- 防具 --------- */
  a({ id: 'a_leather', name: 'レザーアーマー', tier: 1, rarity: 'common', price: 55,
      mods: { def: 10, res: 8, hp: 20, spd: 3 }, desc: '軽く動きやすい革鎧。' });
  a({ id: 'a_robe', name: '魔導ローブ', tier: 1, rarity: 'common', price: 55,
      mods: { def: 6, res: 16, mp: 16, mag: 6 }, desc: '魔力を高める法衣。' });
  a({ id: 'a_chain', name: 'チェインメイル', tier: 1, rarity: 'common', price: 60,
      mods: { def: 18, res: 10, hp: 32, spd: -3 }, desc: '堅実な鎖帷子。' });

  a({ id: 'a_thornplate', name: '棘鎧', tier: 2, rarity: 'rare', price: 230,
      mods: { def: 30, res: 18, hp: 55, reflect: 0.20 }, desc: '受けた攻撃を刺し返す。' });
  a({ id: 'a_stormcloak', name: '嵐纏いの外套', tier: 2, rarity: 'rare', price: 230,
      mods: { def: 18, res: 18, spd: 14, aoeRatio: 0.18 }, desc: '嵐を纏う外套。' });
  a({ id: 'a_bloodmail', name: '血装鎧', tier: 2, rarity: 'rare', price: 235,
      mods: { def: 24, res: 16, hp: 70, lifesteal: 0.12, dr: -0.04 }, desc: '血を吸って強度を増す異形の鎧。' });
  a({ id: 'a_alchemycoat', name: '錬金外套', tier: 2, rarity: 'rare', price: 230,
      mods: { def: 20, res: 16, itemPower: 0.28, dropUp: 0.15 }, desc: '薬瓶と触媒を縫い込んだ外套。' });
  a({ id: 'a_shadowgarb', name: '影纏いの装束', tier: 2, rarity: 'rare', price: 240,
      mods: { def: 16, res: 14, spd: 20, critRate: 0.10, evade: 0.08 }, desc: '影に溶け込む暗殺者の装束。' });

  a({ id: 'a_aegis', name: '不壊のイージス', tier: 3, rarity: 'legend', price: 680,
      mods: { def: 62, res: 40, hp: 130, dr: 0.14, reflect: 0.22 }, flags: ['barrierOnHit'], desc: '被弾時20%でバリア獲得。' });
  a({ id: 'a_starmantle', name: '星霜のマント', tier: 3, rarity: 'legend', price: 690,
      mods: { def: 30, res: 50, mp: 46, pierce: 0.20, 'el_light': 0.15, 'el_dark': 0.15 }, desc: '星霜を織り込んだマント。' });
  a({ id: 'a_tempestveil', name: '天災の羽衣', tier: 3, rarity: 'legend', price: 690,
      mods: { def: 34, res: 30, spd: 28, aoePower: 0.40, aoeRatio: 0.30 }, flags: ['overkillChain'], desc: '撃破時の余剰ダメージが波及。' });

  G.WEAPONS = W; G.ARMORS = A;
  G.GEAR = {};
  W.concat(A).forEach(function (g) { G.GEAR[g.id] = g; });
})();
