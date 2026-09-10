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
  S({ id: 'heal', name: '治癒', mp: 8, kind: 'heal', target: 'ally', power: 150, desc: '味方1人のHPを魔法攻撃力に応じて回復。' });
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
  S({ id: 'panacea', name: '万能薬', mp: 8, kind: 'heal', target: 'ally', power: 120,
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

  S({ id: 'ult_paean', name: '天佑の凱歌', mp: 34, kind: 'buff', target: 'allies',
      desc: '【奥義】味方全体の物理・魔法攻撃+55%／被ダメ軽減+25%／素早さ+25（5ターン）。全員のMPを30回復。',
      eff: { buffs: [{ k: 'atkPct', v: 0.55, t: 5 }, { k: 'magPct', v: 0.55, t: 5 },
                     { k: 'dr', v: 0.25, t: 5 }, { k: 'spd', v: 25, t: 5 }], mpGive: 30 } });
  S({ id: 'ult_ruin', name: '零落の宣告', mp: 32, kind: 'mag', el: 'dark', power: 150, target: 'all',
      desc: '【奥義】敵全体の物理・魔法攻撃-45%／物理防御-40%／素早さ-30（4ターン）。強化も打ち消す。',
      eff: { dispel: true, debuffs: [{ k: 'atkPct', v: -0.45, t: 4 }, { k: 'magPct', v: -0.45, t: 4 },
                                     { k: 'defPct', v: -0.40, t: 4 }, { k: 'spd', v: -30, t: 4 }] } });

  /* ---------- 呪術師 / 疫災呪王 ---------- */
  S({ id: 'hexMist', name: '呪縛の霧', mp: 13, kind: 'mag', el: 'dark', power: 110, target: 'all',
      desc: '敵全体に闇ダメージ。40%で毒、30%で凍結。',
      eff: { poison: { t: 3, v: 0.06, c: 0.40 }, freeze: { t: 2, c: 0.30 } } });
  S({ id: 'plague', name: '疫病', mp: 10, kind: 'mag', el: 'dark', power: 135, target: 'one',
      desc: '猛毒（4ターン）と攻撃低下を付与する。',
      eff: { poison: { t: 4, v: 0.09 }, debuff: { k: 'atkPct', v: -0.25, t: 3 } } });
  S({ id: 'curseBurst', name: '崩呪', mp: 18, kind: 'mag', el: 'dark', power: 155, target: 'all',
      desc: '敵全体の防御を3ターン35%低下させる闇の奔流。',
      eff: { debuff: { k: 'defPct', v: -0.35, t: 3 } } });

  /* ---------- 吟遊詩人 / 天佑楽帝（支援） ----------
   * 支援は「自分が強くなる」のではなく「4人ぶんの数字を動かす」役。
   * 単体の火力では割に合わないので、全体化と持続で見返りを取る。 */
  S({ id: 'warSong', name: '進軍歌', mp: 10, kind: 'buff', target: 'allies',
      desc: '味方全体の物理攻撃+35%／素早さ+14（3ターン）。',
      eff: { buffs: [{ k: 'atkPct', v: 0.35, t: 3 }, { k: 'spd', v: 14, t: 3 }] } });
  S({ id: 'wardSong', name: '守りの詩', mp: 11, kind: 'buff', target: 'allies',
      desc: '味方全体の被ダメ軽減+22%／物理防御+30%（3ターン）。',
      eff: { buffs: [{ k: 'dr', v: 0.22, t: 3 }, { k: 'defPct', v: 0.30, t: 3 }] } });
  S({ id: 'resonance', name: '共鳴詠唱', mp: 12, kind: 'buff', target: 'allies',
      desc: '味方全体の魔法攻撃+35%。全員のMPを14回復する。',
      eff: { buffs: [{ k: 'magPct', v: 0.35, t: 3 }], mpGive: 14 } });
  S({ id: 'valorMarch', name: '凱旋行進', mp: 14, kind: 'buff', target: 'allies',
      desc: '味方全体の会心率+18%／与ダメージ+20%（3ターン）。',
      eff: { buffs: [{ k: 'critRate', v: 0.18, t: 3 }, { k: 'dmgUp', v: 0.20, t: 3 }] } });
  S({ id: 'encoreCall', name: 'アンコール', mp: 8, kind: 'buff', target: 'allies',
      desc: '味方全体にかかっている強化の残りターンを2延長する。',
      eff: { extendBuffs: 2 } });
  S({ id: 'lullaby', name: '子守唄', mp: 12, kind: 'buff', target: 'allies',
      desc: '味方全体を最大HPの22%回復し、状態異常を解除する。',
      eff: { healMaxPct: 0.22, cleanseAllies: true } });

  /* ---------- 呪縛士 / 零落呪帝（弱体） ----------
   * 呪詛（毒・麻痺）が「時間で削る」のに対し、弱体は「相手の数字そのものを下げる」。
   * ボスのように状態異常が入りにくい相手にも通るのが持ち味。 */
  S({ id: 'dullEdge', name: '刃鈍らせ', mp: 9, kind: 'mag', el: 'dark', power: 95, target: 'all',
      desc: '敵全体の物理攻撃を3ターン30%低下させる。',
      eff: { debuff: { k: 'atkPct', v: -0.30, t: 3 } } });
  S({ id: 'sapWill', name: '気力削ぎ', mp: 9, kind: 'mag', el: 'dark', power: 95, target: 'all',
      desc: '敵全体の魔法攻撃を3ターン30%低下させる。',
      eff: { debuff: { k: 'magPct', v: -0.30, t: 3 } } });
  S({ id: 'leadenChant', name: '鈍化の呪', mp: 10, kind: 'mag', el: 'dark', power: 90, target: 'all',
      desc: '敵全体の素早さを3ターン28低下させる。手番の順番を奪う。',
      eff: { debuff: { k: 'spd', v: -28, t: 3 } } });
  S({ id: 'frailty', name: '脆弱化', mp: 12, kind: 'mag', el: 'dark', power: 120, target: 'one',
      desc: '対象の魔法防御を3ターン35%下げ、被ダメージ+30%の刻印を刻む。',
      eff: { debuff: { k: 'resPct', v: -0.35, t: 3 }, mark: { v: 0.30, t: 3 } } });
  S({ id: 'witherAll', name: '万象衰え', mp: 18, kind: 'mag', el: 'dark', power: 130, target: 'all',
      desc: '敵全体の物理防御を3ターン32%低下させる。弱体の重ねがけの起点。',
      eff: { debuff: { k: 'defPct', v: -0.32, t: 3 } } });
  S({ id: 'bindingWord', name: '縛りの言葉', mp: 15, kind: 'util', target: 'all',
      desc: '敵全体の強化を打ち消し、素早さを3ターン20低下させる。',
      eff: { dispel: true, debuff: { k: 'spd', v: -20, t: 3 } } });

  /* ---------- 韋駄天 / 神速天翔 ---------- */
  S({ id: 'shukuchi', name: '縮地', mp: 9, kind: 'buff', target: 'self',
      desc: '3ターン、素早さ+60／回避+25%。',
      eff: { buffs: [{ k: 'spd', v: 60, t: 3 }, { k: 'evade', v: 0.25, t: 3 }] } });
  S({ id: 'galeFlurry', name: '疾風連打', mp: 13, kind: 'phys', el: 'wind', power: 50, target: 'one', hits: 5,
      desc: '風を纏った5連撃。' });

  /* ---------- 魔剣士 / 双極魔剣皇 ---------- */
  S({ id: 'spellEdge', name: '魔法剣', mp: 9, kind: 'phys', el: 'fire', power: 175, target: 'one',
      special: 'hybrid', desc: '物理攻撃力と魔法攻撃力の平均で斬る炎の刃。' });
  S({ id: 'dualPole', name: '双極斬', mp: 16, kind: 'phys', el: 'light', power: 130, target: 'one', hits: 2,
      special: 'hybrid', desc: '光と闇で二度斬る。', eff: { altElement: 'dark' } });

  /* ---------- 追加された最上級職の奥義 ---------- */
  S({ id: 'ult_thousandShadow', name: '神速・千影', mp: 28, kind: 'phys', el: 'wind', power: 72, target: 'one', hits: 6,
      desc: '【奥義】6連撃。素早さに応じて威力が上がる。', special: 'speedScale' });
  S({ id: 'ult_pandemic', name: '万呪爆散', mp: 32, kind: 'mag', el: 'dark', power: 205, target: 'all',
      desc: '【奥義】敵全体に闇の大爆発。火傷・毒・凍結・麻痺を同時に付与する。',
      eff: { poison: { t: 3, v: 0.08 }, burn: { t: 3, v: 0.07 }, freeze: { t: 2 }, shock: { t: 2 } } });
  S({ id: 'ult_duality', name: '双極崩天', mp: 30, kind: 'phys', el: 'light', power: 230, target: 'all', hits: 2,
      special: 'hybrid', desc: '【奥義】物魔一体の斬撃を敵全体へ二度。', eff: { altElement: 'dark' } });

  /* ---------- スキルツリーで習得するスキル ---------- */
  S({ id: 't_condemn', name: '断罪の型', mp: 14, kind: 'phys', el: 'phys', power: 200, target: 'one',
      desc: '会心率+50%／会心ダメージ+30%の一撃。', eff: { critBonus: 0.50, critBonusDmg: 0.30 } });
  S({ id: 't_retribution', name: '返報の誓い', mp: 14, kind: 'buff', target: 'self',
      desc: '3ターン、反射率+70%／被ダメ軽減+30%。',
      eff: { buffs: [{ k: 'reflect', v: 0.70, t: 3 }, { k: 'dr', v: 0.30, t: 3 }] } });
  S({ id: 't_scatterstrike', name: '拡散連撃', mp: 18, kind: 'phys', el: 'wind', power: 120, target: 'all', hits: 2,
      desc: '敵全体を2連続で薙ぎ払う。' });
  S({ id: 't_elemshift', name: '属性転変', mp: 16, kind: 'buff', target: 'self',
      desc: '3ターン、全属性+35%／耐性貫通+30%。',
      eff: { buffs: [{ k: 'el_fire', v: 0.35, t: 3 }, { k: 'el_ice', v: 0.35, t: 3 }, { k: 'el_thunder', v: 0.35, t: 3 },
                     { k: 'el_wind', v: 0.35, t: 3 }, { k: 'el_light', v: 0.35, t: 3 }, { k: 'el_dark', v: 0.35, t: 3 },
                     { k: 'pierce', v: 0.30, t: 3 }] } });
  S({ id: 't_quickbrew', name: '即席調合', mp: 12, kind: 'util', target: 'self',
      desc: 'アイテムを2個生成し、3ターン アイテム威力+60%。',
      eff: { makeItem: 2, buffs: [{ k: 'itemPower', v: 0.60, t: 3 }] } });
  S({ id: 't_immovable', name: '不動明王', mp: 16, kind: 'buff', target: 'self',
      desc: '最大HPの20%回復。3ターン、被ダメ軽減+45%／反射率+25%。',
      eff: { healMaxPct: 0.20, buffs: [{ k: 'dr', v: 0.45, t: 3 }, { k: 'reflect', v: 0.25, t: 3 }] } });
  S({ id: 't_afterimage', name: '残影', mp: 13, kind: 'buff', target: 'self',
      desc: '3ターン、回避+35%／素早さ+40。回避時に反撃するようになる。',
      eff: { buffs: [{ k: 'evade', v: 0.35, t: 3 }, { k: 'spd', v: 40, t: 3 }],
             flagBuff: { f: 'counterEvade', t: 3 } } });
  S({ id: 't_hexbloom', name: '呪いの華', mp: 15, kind: 'mag', el: 'dark', power: 145, target: 'all',
      desc: '敵全体に闇ダメージ。50%で毒、40%で麻痺を付与する。',
      eff: { poison: { t: 3, v: 0.07, c: 0.50 }, shock: { t: 2, c: 0.40 } } });
  S({ id: 't_lifeline', name: '生命線', mp: 15, kind: 'buff', target: 'self',
      desc: '最大HPの40%回復。3ターン、吸収+30%。',
      eff: { healMaxPct: 0.40, buffs: [{ k: 'lifesteal', v: 0.30, t: 3 }] } });
  S({ id: 't_anthem', name: '鼓舞の讃歌', mp: 15, kind: 'buff', target: 'allies',
      desc: '味方全体の物理・魔法攻撃+28%／被ダメ軽減+15%（3ターン）。',
      eff: { buffs: [{ k: 'atkPct', v: 0.28, t: 3 }, { k: 'magPct', v: 0.28, t: 3 },
                     { k: 'dr', v: 0.15, t: 3 }] } });
  S({ id: 't_unmake', name: '解体の呪', mp: 15, kind: 'mag', el: 'dark', power: 125, target: 'all',
      desc: '敵全体の物理攻撃と物理防御を3ターン25%ずつ低下させる。',
      eff: { debuffs: [{ k: 'atkPct', v: -0.25, t: 3 }, { k: 'defPct', v: -0.25, t: 3 }] } });


  /* ================= 追加の特殊攻撃・連携技 =================
   * 溜め(charge) / 反撃の構え(counter) / かばう(cover) / 刻印(mark)
   * 封印(seal) / 暗闇(blind) / 打ち消し(dispel) / 蘇生(revive) / 連携(linkStrike)
   */

  /* ---------- 汎用の構え ---------- */
  S({ id: 'focus', name: '集中', mp: 3, kind: 'util', target: 'self',
      desc: '力を溜める。次の攻撃の威力が+80%される。MPを8回復。',
      eff: { charge: 0.80, mpGain: 8 } });
  S({ id: 'coverStance', name: '庇護の構え', mp: 5, kind: 'util', target: 'ally',
      desc: '味方1人を3ターンかばう。その間、被ダメージ25%減。',
      eff: { cover: 3, buffs: [{ k: 'dr', v: 0.25, t: 3 }] } });

  /* ---------- 剣士系 ---------- */
  S({ id: 'bladeDance', name: '剣舞', mp: 10, kind: 'phys', el: 'phys', power: 78, target: 'one', hits: 3,
      desc: '三連の斬撃。手数で会心を狙う。' });
  S({ id: 'crossSlash', name: '十字斬', mp: 9, kind: 'phys', el: 'phys', power: 108, target: 'one', hits: 2,
      desc: '交差する二撃。会心率+12%。', eff: { critBonus: 0.12 } });
  S({ id: 'avengeStance', name: '迎撃の構え', mp: 8, kind: 'util', target: 'self',
      desc: '3ターン、攻撃を受けるたび威力170%で反撃する（最大3回）。',
      eff: { counter: { t: 3, n: 3, p: 170 } } });
  S({ id: 'shieldBash', name: '盾打ち', mp: 7, kind: 'phys', el: 'phys', power: 125, target: 'one',
      desc: '60%で敵を2ターン封印し、技を使えなくする。', eff: { seal: { t: 2, c: 0.60 } } });
  S({ id: 'earthSplitter', name: '大地割り', mp: 14, kind: 'phys', el: 'phys', power: 160, target: 'all',
      desc: '地を裂き敵全体を打ち、3ターン素早さを下げる。', eff: { debuff: { k: 'spd', v: -20, t: 3 } } });
  S({ id: 'unisonEdge', name: '共鳴斬', mp: 15, kind: 'phys', el: 'phys', power: 150, target: 'one',
      desc: '【連携】味方全員が呼応し、それぞれ威力60%で追撃する。', eff: { linkStrike: 0.60 } });

  /* ---------- 狂戦士系 ---------- */
  S({ id: 'berserkRush', name: '狂乱突撃', mp: 12, kind: 'phys', el: 'phys', power: 72, target: 'one', hits: 4,
      desc: '最大HPの8%を支払う四連撃。', eff: { hpCost: 0.08 } });
  S({ id: 'bloodOffering', name: '血の供物', mp: 4, kind: 'util', target: 'self',
      desc: '最大HPの18%を捧げ、次の攻撃の威力を+130%する。',
      eff: { hpCost: 0.18, charge: 1.30 } });
  S({ id: 'carnage', name: '殲滅の咆哮', mp: 20, kind: 'phys', el: 'phys', power: 185, target: 'all',
      desc: '最大HPの10%を支払い、敵全体を薙ぎ払って35%吸収する。',
      eff: { hpCost: 0.10, drain: 0.35 } });

  /* ---------- 盗賊 / 暗殺者系 ---------- */
  S({ id: 'smokeBomb', name: '煙玉', mp: 8, kind: 'util', target: 'all',
      desc: '敵全体を3ターン暗闇にし、攻撃を外れやすくする。', eff: { blind: { t: 3, c: 0.75 } } });
  S({ id: 'markTarget', name: '弱点看破', mp: 6, kind: 'util', target: 'one',
      desc: '敵1体に刻印を刻み、3ターン被ダメージを+35%する。', eff: { mark: { v: 0.35, t: 3 } } });
  S({ id: 'phantomBlades', name: '幻影刃', mp: 15, kind: 'phys', el: 'dark', power: 62, target: 'random', hits: 5,
      desc: 'ランダムな敵に5回、影の刃が走る。' });
  S({ id: 'pickpocket', name: '掠め取り', mp: 4, kind: 'phys', el: 'phys', power: 95, target: 'one',
      desc: '敵から魔力を掠め取る（MP+18）。', eff: { mpSteal: 18 } });

  /* ---------- 魔術士 / 元素使い系 ---------- */
  S({ id: 'arcaneSeal', name: '魔封じ', mp: 11, kind: 'mag', el: 'dark', power: 115, target: 'one',
      desc: '70%で敵を3ターン封印する。', eff: { seal: { t: 3, c: 0.70 } } });
  S({ id: 'manaBurn', name: '魔力喰らい', mp: 0, kind: 'mag', el: 'dark', power: 140, target: 'one',
      desc: 'MPを消費せず、敵から22の魔力を吸い上げる。', eff: { mpSteal: 22 } });
  S({ id: 'dispelWave', name: '解呪波', mp: 12, kind: 'util', target: 'all',
      desc: '敵全体の強化とバリアをすべて打ち消す。', eff: { dispel: true } });
  S({ id: 'frostNova', name: '氷結新星', mp: 16, kind: 'mag', el: 'ice', power: 165, target: 'all',
      desc: '敵全体を凍てつかせる。35%で凍結。', eff: { freeze: { t: 2, c: 0.35 } } });
  S({ id: 'flameWhirl', name: '火炎旋風', mp: 16, kind: 'mag', el: 'fire', power: 170, target: 'all',
      desc: '渦巻く炎。50%で火傷。', eff: { burn: { t: 3, v: 0.06, c: 0.50 } } });
  S({ id: 'overload', name: '魔力過装', mp: 6, kind: 'util', target: 'self',
      desc: '次の攻撃の威力+100%。3ターン魔法攻撃+25%。',
      eff: { charge: 1.00, buffs: [{ k: 'magPct', v: 0.25, t: 3 }] } });

  /* ---------- 神官 / 破魔僧系 ---------- */
  S({ id: 'resurrect', name: '蘇生', mp: 22, kind: 'util', target: 'downed',
      desc: '倒れた味方1人を最大HPの45%で復帰させる。', eff: { revive: 0.45 } });
  S({ id: 'groupHeal', name: '大治癒', mp: 16, kind: 'heal', target: 'allies', power: 115,
      desc: '味方全員のHPを回復する。' });
  S({ id: 'blessing', name: '祝福', mp: 12, kind: 'buff', target: 'allies',
      desc: '味方全員の攻撃+25%／被ダメ軽減+15%（3ターン）。',
      eff: { buffs: [{ k: 'atkPct', v: 0.25, t: 3 }, { k: 'magPct', v: 0.25, t: 3 }, { k: 'dr', v: 0.15, t: 3 }] } });
  S({ id: 'purify', name: '浄化', mp: 10, kind: 'heal', target: 'allies', power: 70,
      desc: '味方全員の状態異常を解除し、少しHPを回復する。', eff: { cleanse: true } });
  S({ id: 'holyChain', name: '聖鎖', mp: 18, kind: 'mag', el: 'light', power: 140, target: 'all',
      desc: '光の鎖が敵全体を縛る。45%で2ターン封印。', eff: { seal: { t: 2, c: 0.45 } } });
  S({ id: 'martyr', name: '献身', mp: 6, kind: 'util', target: 'ally',
      desc: '自分のHPの30%を味方1人に分け与える。', eff: { transferHp: 0.30 } });
  S({ id: 'guardianAngel', name: '守護天使', mp: 14, kind: 'buff', target: 'ally',
      desc: '味方1人に3ターン、致死ダメージを1度耐える加護を与える。',
      eff: { flagBuff: { f: 'endure', t: 3 }, buffs: [{ k: 'dr', v: 0.10, t: 3 }] } });

  /* ---------- 守護者系 ---------- */
  S({ id: 'bulwark', name: '守護陣', mp: 12, kind: 'util', target: 'ally',
      desc: '味方1人を4ターンかばい、自身の防御+50%／反射+20%。',
      eff: { cover: 4, buffs: [{ k: 'defPct', v: 0.50, t: 4 }, { k: 'reflect', v: 0.20, t: 4 }] } });
  S({ id: 'counterWall', name: '鉄壁反撃', mp: 13, kind: 'util', target: 'self',
      desc: '4ターン、受けた攻撃に威力200%で反撃する（最大4回）。防御+40%。',
      eff: { counter: { t: 4, n: 4, p: 200 }, buffs: [{ k: 'defPct', v: 0.40, t: 4 }] } });
  S({ id: 'tauntRoar', name: '威圧咆哮', mp: 9, kind: 'util', target: 'all',
      desc: '敵全体の狙いを引きつけ、攻撃力を3ターン25%下げる。',
      eff: { taunt: 3, debuff: { k: 'atkPct', v: -0.25, t: 3 } } });

  /* ---------- 嵐使い系 ---------- */
  S({ id: 'thunderJudge', name: '雷神の裁き', mp: 20, kind: 'mag', el: 'thunder', power: 195, target: 'all',
      desc: '敵全体に落雷。35%で麻痺。', eff: { shock: { t: 2, c: 0.35 } } });
  S({ id: 'cycloneCage', name: '旋風檻', mp: 17, kind: 'mag', el: 'wind', power: 135, target: 'all',
      desc: '敵全体を風の檻に閉じ込め、3ターン被ダメージ+25%。',
      eff: { mark: { v: 0.25, t: 3 } } });

  /* ---------- 錬金術士系 ---------- */
  S({ id: 'elixirRain', name: '霊薬の雨', mp: 18, kind: 'heal', target: 'allies', power: 105,
      special: 'itemScale', desc: 'アイテム威力に比例して味方全員を回復する。' });
  S({ id: 'bombArray', name: '爆弾陣', mp: 16, kind: 'mag', el: 'fire', power: 88, target: 'all', hits: 2,
      special: 'itemScale', desc: 'アイテム威力に比例する爆弾を2波、敵全体へ。' });
  S({ id: 'homunculus', name: '人造の盾', mp: 14, kind: 'buff', target: 'allies',
      desc: '味方全員にバリアを張る。', eff: { barrier: 0.9 } });

  /* ---------- 呪術師系 ---------- */
  S({ id: 'soulSeal', name: '魂縛', mp: 14, kind: 'mag', el: 'dark', power: 130, target: 'one',
      desc: '80%で3ターン封印し、毒を付与する。',
      eff: { seal: { t: 3, c: 0.80 }, poison: { t: 3, v: 0.06 } } });
  S({ id: 'plagueMark', name: '疫の刻印', mp: 16, kind: 'mag', el: 'dark', power: 120, target: 'all',
      desc: '敵全体に刻印と毒を刻む（被ダメージ+30%）。',
      eff: { mark: { v: 0.30, t: 3 }, poison: { t: 4, v: 0.07 } } });

  /* ---------- 韋駄天系 ---------- */
  S({ id: 'bladeStorm', name: '剣戟の嵐', mp: 16, kind: 'phys', el: 'wind', power: 58, target: 'one', hits: 4,
      special: 'speedScale', desc: '素早さが乗る四連撃。' });
  S({ id: 'afterimage', name: '残像', mp: 10, kind: 'util', target: 'self',
      desc: '3ターン、回避+30%。攻撃を受けるたび威力160%で反撃する。',
      eff: { counter: { t: 3, n: 3, p: 160 }, buffs: [{ k: 'evade', v: 0.30, t: 3 }] } });

  /* ---------- 魔剣士系 ---------- */
  S({ id: 'runeBlade', name: '魔紋剣', mp: 13, kind: 'phys', el: 'phys', power: 165, target: 'one',
      special: 'hybrid', desc: '物魔一体の斬撃。敵に3ターンの刻印を刻む。',
      eff: { mark: { v: 0.30, t: 3 } } });
  S({ id: 'spellChain', name: '呪剣連撃', mp: 17, kind: 'phys', el: 'fire', power: 82, target: 'one', hits: 3,
      special: 'hybrid', desc: '物魔一体の三連撃（2撃目は氷）。', eff: { altElement: 'ice' } });

  /* ---------- 最上級職の第二奥義 ---------- */
  S({ id: 'ult_shadowRequiem', name: '影送り・鎮魂', mp: 30, kind: 'phys', el: 'dark', power: 96, target: 'one', hits: 4,
      desc: '【奥義】必ず会心する四連撃。防御を40%無視。',
      eff: { alwaysCrit: true, defIgnore: 0.40 } });
  S({ id: 'ult_mirrorPrison', name: '鏡獄封陣', mp: 30, kind: 'util', target: 'all',
      desc: '【奥義】敵全体の強化を打ち消し封印。4ターン反射が全体に波及する。',
      eff: { dispel: true, seal: { t: 2, c: 0.60 }, flagBuff: { f: 'reflectAll', t: 4 },
             buffs: [{ k: 'reflect', v: 0.35, t: 4 }] } });
  S({ id: 'ult_stormThrone', name: '暴風王座', mp: 34, kind: 'mag', el: 'thunder', power: 215, target: 'all',
      desc: '【奥義】雷の嵐。範囲威力+45%、50%で麻痺。',
      eff: { aoeBonus: 0.45, shock: { t: 2, c: 0.50 } } });
  S({ id: 'ult_starfall', name: '星降ろし', mp: 34, kind: 'mag', el: 'light', power: 175, target: 'all', hits: 2,
      desc: '【奥義】星々が二度降り注ぐ。敵全体に刻印を刻む。',
      eff: { mark: { v: 0.35, t: 3 } } });
  S({ id: 'ult_philosopher', name: '賢者の霊薬', mp: 28, kind: 'heal', target: 'allies', power: 190,
      special: 'itemScale', desc: '【奥義】味方全員を大回復し、状態異常を解除。アイテムを2個錬成する。',
      eff: { cleanse: true, makeItem: 2 } });
  S({ id: 'ult_bloodFeast', name: '血宴', mp: 30, kind: 'phys', el: 'dark', power: 205, target: 'all',
      desc: '【奥義】最大HPの12%を支払い、敵全体から60%吸収する。',
      eff: { hpCost: 0.12, drain: 0.60 } });
  S({ id: 'ult_finalVerdict', name: '最終評決', mp: 36, kind: 'mag', el: 'light', power: 240, target: 'one',
      desc: '【奥義】HPが50%以下の敵には威力2.2倍。倒れた味方を1人蘇生する。',
      eff: { execute: 0.50, revive: 0.35 } });
  S({ id: 'ult_nullify', name: '虚無帰結', mp: 34, kind: 'mag', el: 'dark', power: 195, target: 'all',
      desc: '【奥義】敵全体の強化を消し去り、防御を70%無視して撃つ。',
      eff: { dispel: true, defIgnore: 0.70 } });
  S({ id: 'ult_godspeed', name: '神速・千手', mp: 32, kind: 'phys', el: 'wind', power: 52, target: 'random', hits: 8,
      special: 'speedScale', desc: '【奥義】素早さが乗る八連撃をランダムな敵へ。' });
  S({ id: 'ult_blackMiasma', name: '黒瘴', mp: 32, kind: 'mag', el: 'dark', power: 160, target: 'all',
      desc: '【奥義】敵全体を毒・封印・刻印で塗り潰す。',
      eff: { poison: { t: 4, v: 0.08 }, seal: { t: 2, c: 0.60 }, mark: { v: 0.35, t: 3 } } });
  S({ id: 'ult_twinPole', name: '双極・終焉', mp: 34, kind: 'phys', el: 'light', power: 130, target: 'one', hits: 3,
      special: 'hybrid', desc: '【奥義】物魔一体の三連撃（偶数撃は闇）。味方全員が追撃する。',
      eff: { altElement: 'dark', linkStrike: 0.45 } });

  /* ---------- 仲間だけが辿り着く奥義 ---------- */
  S({ id: 'ult_dawnbreak', name: '暁を告げる', mp: 34, kind: 'heal', target: 'allies', power: 260,
      desc: '【奥義】倒れた仲間を全員復帰させ、味方全体を大回復し、状態異常を解除する。',
      eff: { revive: 0.70, reviveAll: true, cleanse: true,
             buffs: [{ k: 'dr', v: 0.20, t: 3 }] } });
  S({ id: 'ult_undying', name: '不倒の誓い', mp: 30, kind: 'buff', target: 'allies',
      desc: '【奥義】味方全体にバリアを張り、4ターン致死ダメージを1度耐える加護と被ダメ35%減を与える。',
      eff: { barrier: 1.6, flagBuff: { f: 'endure', t: 4 },
             buffs: [{ k: 'dr', v: 0.35, t: 4 }, { k: 'reflect', v: 0.25, t: 4 }] } });
  S({ id: 'ult_bastion', name: '城塞たれ', mp: 30, kind: 'util', target: 'self',
      desc: '【奥義】5ターン、味方全員をかばい、受けた攻撃に威力240%で反撃する。防御+80%。',
      eff: { cover: 5, taunt: 5, counter: { t: 5, n: 9, p: 240 },
             buffs: [{ k: 'defPct', v: 0.80, t: 5 }, { k: 'reflect', v: 0.40, t: 5 }] } });
  S({ id: 'ult_wrathgate', name: '忿怒開門', mp: 26, kind: 'phys', el: 'phys', power: 150, target: 'all',
      special: 'reflectScale', desc: '【奥義】最大HPの15%を支払い、失った体力ぶん重くなる一撃を敵全体へ。60%吸収。',
      eff: { hpCost: 0.15, drain: 0.60, aoeBonus: 0.35 } });
  S({ id: 'ult_theorem', name: '万理を解く', mp: 36, kind: 'mag', el: 'phys', power: 145, target: 'all',
      special: 'allElem', desc: '【奥義】6属性で敵全体を撃ち、耐性を完全に無視する。',
      eff: { fullPierce: true, defIgnore: 0.50 } });
  S({ id: 'ult_stillness', name: '静かな災い', mp: 34, kind: 'mag', el: 'dark', power: 175, target: 'all',
      desc: '【奥義】敵全体の強化を打ち消し、封印・毒・刻印を同時に刻む。',
      eff: { dispel: true, seal: { t: 3, c: 0.75 }, poison: { t: 4, v: 0.09 },
             mark: { v: 0.40, t: 4 }, aoeBonus: 0.30 } });

  /* ---------- 仲間の固有技 ---------- */
  S({ id: 'aid_mend', name: '手当て', mp: 7, kind: 'heal', target: 'ally', power: 135,
      desc: '味方1人を回復し、状態異常を解除する。', eff: { cleanse: true } });
  S({ id: 'aid_shelter', name: '守りの祈り', mp: 13, kind: 'buff', target: 'allies',
      desc: '味方全員にバリアを張り、3ターン被ダメ20%減。',
      eff: { barrier: 0.8, buffs: [{ k: 'dr', v: 0.20, t: 3 }] } });
  S({ id: 'aid_cover', name: '盾となる', mp: 6, kind: 'util', target: 'ally',
      desc: '味方1人を3ターンかばい、自身の防御+45%。',
      eff: { cover: 3, buffs: [{ k: 'defPct', v: 0.45, t: 3 }] } });
  S({ id: 'aid_rally', name: '鼓舞', mp: 10, kind: 'buff', target: 'allies',
      desc: '敵の注意を引きつけつつ、味方全員の攻撃を20%上げる。',
      eff: { taunt: 2, buffs: [{ k: 'atkPct', v: 0.20, t: 3 }, { k: 'magPct', v: 0.20, t: 3 }] } });
  S({ id: 'aid_amplify', name: '増幅の術式', mp: 11, kind: 'buff', target: 'ally',
      desc: '味方1人の与ダメージを3ターン+40%、MPを12回復する。',
      eff: { buffs: [{ k: 'dmgUp', v: 0.40, t: 3 }], mpGive: 12 } });
  S({ id: 'aid_siphon', name: '魔力吸引', mp: 0, kind: 'mag', el: 'dark', power: 115, target: 'one',
      desc: 'MPを使わず敵を撃ち、魔力を16奪う。', eff: { mpSteal: 16 } });

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
  S({ id: 'e_heal', name: '自己修復', mp: 0, kind: 'heal', target: 'self', power: 95, desc: '' });
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
