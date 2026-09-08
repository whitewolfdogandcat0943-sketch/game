/* skills.js - スキル定義
 * kind   : phys(物理) / mag(魔法) / heal / buff / util
 * target : one(単体) / all(全体) / random(ランダム) / self / dead
 * power  : 100 = 攻撃力等倍
 * eff    : 付随効果 (下記 battle.js が解釈)
 * special: 特殊計算 reflectScale / itemScale / allElem / mythicScale / hpCostRage
 */
G.SKILLS = {};
(function () {
  function S(o) { G.SKILLS[o.id] = o; return o; }

  /* ---------- 汎用 ---------- */
  S({ id: 'attack', name: '通常攻撃', mp: 0, kind: 'phys', el: 'phys', power: 100, target: 'one',
      desc: '武器による基本攻撃。MPを4回復する。', eff: { mpGain: 4 } });
  S({ id: 'guard', name: '防御', mp: 0, kind: 'buff', target: 'self',
      desc: '1ターン被ダメージ60%減。反射率+20%。MPを10回復。',
      eff: { buffs: [{ k: 'dr', v: 0.60, t: 1 }, { k: 'reflect', v: 0.20, t: 1 }], mpGain: 10 } });

  /* ---------- 剣士 / 狂戦士 ---------- */
  S({ id: 'slash', name: '斬撃', mp: 3, kind: 'phys', el: 'phys', power: 150, target: 'one', desc: '鋭い一撃。' });
  S({ id: 'heavyBlow', name: '剛撃', mp: 8, kind: 'phys', el: 'phys', power: 245, target: 'one',
      desc: '重い一撃。会心率+15%。', eff: { critBonus: 0.15 } });
  S({ id: 'whirlwind', name: '旋風斬', mp: 11, kind: 'phys', el: 'wind', power: 135, target: 'all',
      desc: '敵全体を薙ぎ払う風属性の斬撃。' });
  S({ id: 'warcry', name: '鬨の声', mp: 7, kind: 'buff', target: 'self',
      desc: '3ターン、物理攻撃+40%／被ダメ軽減-10%。',
      eff: { buffs: [{ k: 'atkPct', v: 0.40, t: 3 }, { k: 'dr', v: -0.10, t: 3 }] } });
  S({ id: 'bloodRage', name: '血の激昂', mp: 6, kind: 'buff', target: 'self',
      desc: '最大HPの12%を支払い、3ターン与ダメ+55%／吸収+25%。',
      eff: { hpCost: 0.12, buffs: [{ k: 'dmgUp', v: 0.55, t: 3 }, { k: 'lifesteal', v: 0.25, t: 3 }] } });
  S({ id: 'crushArmor', name: '鎧砕き', mp: 9, kind: 'phys', el: 'phys', power: 170, target: 'one',
      desc: '敵の防御を3ターン35%低下させる。', eff: { debuff: { k: 'defPct', v: -0.35, t: 3 } } });

  /* ---------- 盗賊 / 暗殺者 ---------- */
  S({ id: 'backstab', name: '背刺し', mp: 5, kind: 'phys', el: 'phys', power: 165, target: 'one',
      desc: '会心率+35%の刺突。', eff: { critBonus: 0.35 } });
  S({ id: 'venomFang', name: '毒牙', mp: 6, kind: 'phys', el: 'dark', power: 120, target: 'one',
      desc: '猛毒を付与（3ターン）。', eff: { poison: { t: 3, v: 0.07 } } });
  S({ id: 'thousandCuts', name: '千裂斬', mp: 12, kind: 'phys', el: 'phys', power: 52, target: 'one', hits: 5,
      desc: '5連撃。各ヒットで会心判定を行う。' });
  S({ id: 'shadowStep', name: '影渡り', mp: 8, kind: 'buff', target: 'self',
      desc: '3ターン、会心率+25%／回避+20%／素早さ+25。',
      eff: { buffs: [{ k: 'critRate', v: 0.25, t: 3 }, { k: 'evade', v: 0.20, t: 3 }, { k: 'spd', v: 25, t: 3 }] } });
  S({ id: 'executioner', name: '処刑宣告', mp: 14, kind: 'phys', el: 'dark', power: 210, target: 'one',
      desc: '敵のHPが40%以下なら威力2.2倍。', eff: { execute: 0.40 } });

  /* ---------- 魔術士 / 元素使い ---------- */
  S({ id: 'fireball', name: '火球', mp: 6, kind: 'mag', el: 'fire', power: 160, target: 'one',
      desc: '炎の弾。30%で火傷。', eff: { burn: { t: 3, v: 0.06, c: 0.30 } } });
  S({ id: 'iceLance', name: '氷槍', mp: 6, kind: 'mag', el: 'ice', power: 160, target: 'one',
      desc: '氷の槍。30%で凍結（素早さ大幅低下）。', eff: { freeze: { t: 2, c: 0.30 } } });
  S({ id: 'boltStrike', name: '雷撃', mp: 6, kind: 'mag', el: 'thunder', power: 160, target: 'one',
      desc: '雷の一撃。25%で麻痺。', eff: { shock: { t: 2, c: 0.25 } } });
  S({ id: 'galeEdge', name: '風刃', mp: 6, kind: 'mag', el: 'wind', power: 145, target: 'one',
      desc: '風の刃。波及率が+25%される。', eff: { splashBonus: 0.25 } });
  S({ id: 'meteor', name: 'メテオ', mp: 20, kind: 'mag', el: 'fire', power: 205, target: 'all', desc: '敵全体に隕石を落とす。' });
  S({ id: 'blizzard', name: 'ブリザード', mp: 18, kind: 'mag', el: 'ice', power: 180, target: 'all',
      desc: '敵全体を凍てつかせる。25%で凍結。', eff: { freeze: { t: 2, c: 0.25 } } });
  S({ id: 'chainBolt', name: '連鎖雷', mp: 16, kind: 'mag', el: 'thunder', power: 85, target: 'random', hits: 4,
      desc: 'ランダムな敵に4回落雷。', eff: { shock: { t: 2, c: 0.18 } } });
  S({ id: 'manaSurge', name: '魔力奔流', mp: 0, kind: 'buff', target: 'self',
      desc: 'MPを28回復し、3ターン魔法攻撃+30%。',
      eff: { mpGain: 28, buffs: [{ k: 'magPct', v: 0.30, t: 3 }] } });
  S({ id: 'elementalBurst', name: '元素乱舞', mp: 22, kind: 'mag', el: 'phys', power: 68, target: 'one',
      special: 'allElem', desc: '6属性すべてで連続攻撃する（各属性1ヒット）。' });

  /* ---------- 神官 / 破魔僧 ---------- */
  S({ id: 'heal', name: '治癒', mp: 8, kind: 'heal', target: 'self', power: 150, desc: '魔法攻撃力に応じてHPを回復。' });
  S({ id: 'smite', name: '裁きの光', mp: 7, kind: 'mag', el: 'light', power: 165, target: 'one', desc: '聖なる光で撃つ。' });
  S({ id: 'sanctuary', name: '聖障壁', mp: 10, kind: 'buff', target: 'self',
      desc: 'バリアを張り、3ターン被ダメ25%減。',
      eff: { barrier: 1.2, buffs: [{ k: 'dr', v: 0.25, t: 3 }] } });
  S({ id: 'holyNova', name: 'ホーリーノヴァ', mp: 19, kind: 'mag', el: 'light', power: 175, target: 'all',
      desc: '敵全体を浄化の光で焼き、自身のHPを回復。', eff: { healSelf: 0.35 } });
  S({ id: 'darkPact', name: '闇の契約', mp: 9, kind: 'mag', el: 'dark', power: 175, target: 'one',
      desc: '与えたダメージの45%を吸収する。', eff: { drain: 0.45 } });
  S({ id: 'judgement', name: '断罪', mp: 24, kind: 'mag', el: 'light', power: 150, target: 'one', hits: 2,
      desc: '光と闇の二連撃（2ヒット目は闇属性）。', eff: { altElement: 'dark' } });

  /* ---------- 守護者 / 反射 ---------- */
  S({ id: 'thornGuard', name: '棘の構え', mp: 8, kind: 'buff', target: 'self',
      desc: '3ターン、反射率+45%／被ダメ軽減+20%。',
      eff: { buffs: [{ k: 'reflect', v: 0.45, t: 3 }, { k: 'dr', v: 0.20, t: 3 }] } });
  S({ id: 'ironWall', name: '鉄壁', mp: 10, kind: 'buff', target: 'self',
      desc: '3ターン、物理防御+70%／魔法防御+40。',
      eff: { buffs: [{ k: 'defPct', v: 0.70, t: 3 }, { k: 'res', v: 40, t: 3 }] } });
  S({ id: 'retaliate', name: '報復の刃', mp: 9, kind: 'phys', el: 'phys', power: 90, target: 'one',
      special: 'reflectScale', desc: '反射率に比例して威力が跳ね上がる一撃。' });
  S({ id: 'mirrorField', name: '鏡界展開', mp: 16, kind: 'buff', target: 'self',
      desc: '3ターン、反射が敵全体に波及するようになる。反射率+25%。',
      eff: { buffs: [{ k: 'reflect', v: 0.25, t: 3 }], flagBuff: { f: 'reflectAll', t: 3 } } });
  S({ id: 'provoke', name: '挑発', mp: 4, kind: 'buff', target: 'self',
      desc: '敵の狙いを集める。2ターン被ダメ軽減+15%、反射率+15%。',
      eff: { taunt: 2, buffs: [{ k: 'dr', v: 0.15, t: 2 }, { k: 'reflect', v: 0.15, t: 2 }] } });

  /* ---------- 嵐使い / 範囲 ---------- */
  S({ id: 'tempest', name: '大嵐', mp: 17, kind: 'mag', el: 'wind', power: 190, target: 'all', desc: '暴風が敵全体を切り刻む。' });
  S({ id: 'shockwave', name: '衝撃波', mp: 12, kind: 'phys', el: 'phys', power: 150, target: 'all', desc: '地を割る衝撃で敵全体を打つ。' });
  S({ id: 'gravityWell', name: '重力場', mp: 14, kind: 'mag', el: 'dark', power: 120, target: 'all',
      desc: '敵全体の素早さを3ターン低下させる。', eff: { debuff: { k: 'spd', v: -25, t: 3 } } });
  S({ id: 'stormCall', name: '嵐招来', mp: 9, kind: 'buff', target: 'self',
      desc: '3ターン、範囲威力+50%／波及率+35%。',
      eff: { buffs: [{ k: 'aoePower', v: 0.50, t: 3 }, { k: 'aoeRatio', v: 0.35, t: 3 }] } });

  /* ---------- 錬金術士 / アイテム ---------- */
  S({ id: 'throwBomb', name: '投擲爆弾', mp: 6, kind: 'mag', el: 'fire', power: 130, target: 'all',
      special: 'itemScale', desc: 'アイテム威力に比例する爆弾を敵全体に投げる。' });
  S({ id: 'panacea', name: '万能薬', mp: 8, kind: 'heal', target: 'self', power: 120,
      special: 'itemScale', desc: 'アイテム威力に比例してHPを回復し、状態異常を解除。', eff: { cleanse: true } });
  S({ id: 'transmute', name: '錬成', mp: 5, kind: 'util', target: 'self',
      desc: 'ランダムなアイテムを1個生成する。', eff: { makeItem: 1 } });
  S({ id: 'catalyst', name: '触媒強化', mp: 10, kind: 'buff', target: 'self',
      desc: '3ターン、アイテム威力+80%／温存率+25%。',
      eff: { buffs: [{ k: 'itemPower', v: 0.80, t: 3 }, { k: 'itemKeep', v: 0.25, t: 3 }] } });
  S({ id: 'acidFlask', name: '酸の瓶', mp: 7, kind: 'mag', el: 'dark', power: 110, target: 'one',
      special: 'itemScale', desc: '敵の防御・魔防を3ターン40%低下させる。',
      eff: { debuff: { k: 'defPct', v: -0.40, t: 3 } } });

  /* ---------- 最上級職の奥義 ---------- */
  S({ id: 'ult_phantomEdge', name: '一閃・無明', mp: 26, kind: 'phys', el: 'phys', power: 300, target: 'one',
      desc: '【奥義】必ず会心する。会心ダメージ+80%、防御を50%無視。',
      eff: { alwaysCrit: true, critBonusDmg: 0.80, defIgnore: 0.5 } });
  S({ id: 'ult_mirrorEnd', name: '万象返し', mp: 28, kind: 'phys', el: 'light', power: 140, target: 'all',
      special: 'reflectScale', desc: '【奥義】反射率に比例した反撃を敵全体へ叩き込む。' });
  S({ id: 'ult_calamity', name: '終焉の渦', mp: 30, kind: 'mag', el: 'wind', power: 265, target: 'all',
      desc: '【奥義】範囲威力がさらに+60%される破滅の嵐。', eff: { aoeBonus: 0.60 } });
  S({ id: 'ult_astralBurst', name: '星辰爆', mp: 32, kind: 'mag', el: 'phys', power: 120, target: 'all',
      special: 'allElem', desc: '【奥義】6属性の光弾を敵全体に叩き込む。' });
  S({ id: 'ult_grandElixir', name: '賢者の一投', mp: 26, kind: 'mag', el: 'fire', power: 210, target: 'all',
      special: 'itemScale', desc: '【奥義】アイテム威力に比例する大爆発。使用後アイテムを1個生成。',
      eff: { makeItem: 1 } });
  S({ id: 'ult_devourFang', name: '貪食の顎', mp: 24, kind: 'phys', el: 'dark', power: 290, target: 'one',
      desc: '【奥義】与ダメージの80%を吸収する。', eff: { drain: 0.80 } });
  S({ id: 'ult_lastJudgement', name: '最後の審判', mp: 34, kind: 'mag', el: 'light', power: 165, target: 'all', hits: 2,
      desc: '【奥義】光と闇で敵全体を二度裁く。', eff: { altElement: 'dark' } });
  S({ id: 'ult_voidCollapse', name: '虚無崩壊', mp: 30, kind: 'mag', el: 'dark', power: 230, target: 'all',
      special: 'mythicScale', desc: '【奥義】装備中のミシック1個につき威力+45%。耐性を完全に無視。',
      eff: { fullPierce: true } });

  /* ---------- 敵専用 ---------- */
  S({ id: 'e_bite', name: '噛みつき', mp: 0, kind: 'phys', el: 'phys', power: 105, target: 'one', desc: '' });
  S({ id: 'e_claw', name: '爪撃', mp: 0, kind: 'phys', el: 'phys', power: 125, target: 'one', desc: '' });
  S({ id: 'e_slam', name: '叩きつけ', mp: 0, kind: 'phys', el: 'phys', power: 150, target: 'one', desc: '' });
  S({ id: 'e_fire', name: '火炎息', mp: 0, kind: 'mag', el: 'fire', power: 130, target: 'one', desc: '' });
  S({ id: 'e_frost', name: '氷結波', mp: 0, kind: 'mag', el: 'ice', power: 130, target: 'one', desc: '' });
  S({ id: 'e_spark', name: '放電', mp: 0, kind: 'mag', el: 'thunder', power: 125, target: 'one', desc: '' });
  S({ id: 'e_gust', name: '突風', mp: 0, kind: 'mag', el: 'wind', power: 120, target: 'one', desc: '' });
  S({ id: 'e_ray', name: '聖光線', mp: 0, kind: 'mag', el: 'light', power: 135, target: 'one', desc: '' });
  S({ id: 'e_curse', name: '呪詛', mp: 0, kind: 'mag', el: 'dark', power: 130, target: 'one',
      desc: '', eff: { debuff: { k: 'atkPct', v: -0.20, t: 3 } } });
  S({ id: 'e_quake', name: '大地震', mp: 0, kind: 'phys', el: 'phys', power: 145, target: 'all', desc: '' });
  S({ id: 'e_inferno', name: '獄炎', mp: 0, kind: 'mag', el: 'fire', power: 160, target: 'all',
      desc: '', eff: { burn: { t: 3, v: 0.05, c: 0.5 } } });
  S({ id: 'e_heal', name: '自己修復', mp: 0, kind: 'heal', target: 'self', power: 130, desc: '' });
  S({ id: 'e_roar', name: '咆哮', mp: 0, kind: 'buff', target: 'self', desc: '',
      eff: { buffs: [{ k: 'atkPct', v: 0.35, t: 3 }] } });
  S({ id: 'e_thorn', name: '棘鎧', mp: 0, kind: 'buff', target: 'self', desc: '',
      eff: { buffs: [{ k: 'reflect', v: 0.35, t: 3 }] } });
  S({ id: 'e_drain', name: '生命吸収', mp: 0, kind: 'mag', el: 'dark', power: 140, target: 'one',
      desc: '', eff: { drain: 0.6 } });
  S({ id: 'e_meteorfall', name: '滅びの流星', mp: 0, kind: 'mag', el: 'fire', power: 200, target: 'all', desc: '' });
  S({ id: 'e_voidbeam', name: '虚無の光', mp: 0, kind: 'mag', el: 'dark', power: 210, target: 'all',
      desc: '', eff: { fullPierce: true } });
})();
