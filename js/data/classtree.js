/* classtree.js - 職業専用ツリー（習熟による3段の二者択一）
 *
 * 各職業は「3段 × 2択」を持ち、どちらか一方しか選べない。
 * 同じ職業でも 2^3 = 8通りに分岐するため、職業の中で差分化できる。
 *
 * 解放は「その職業で戦った回数（習熟度）」による。
 *   段1: 習熟2 / 段2: 習熟5 / 段3: 習熟9
 *   習熟度は 通常戦闘+1 / 精鋭+2 / ボス+3。職業ごとに別々に蓄積される。
 *
 * 効果が有効なのは「現在就いている職業」のものだけ。
 * 過去の職業の選択は記録として残り、その職業に戻れば復活する。
 */
(function () {
  var T = {};
  var NEED = [2, 5, 9];

  /** ノード定義 */
  function n(name, desc, mods, flags, skill) {
    return { name: name, desc: desc, mods: mods || null, flags: flags || null, skill: skill || null };
  }
  /** 職業の3段を登録 */
  function tree(classId, rows) {
    T[classId] = rows.map(function (r, i) {
      return { tier: i + 1, need: NEED[i], a: r[0], b: r[1] };
    });
  }
  function elems(v) {
    var m = {};
    G.MAGIC_ELEMENTS.forEach(function (e) { m['el_' + e] = v; });
    return m;
  }

  /* ============================ 初級職 ============================ */
  tree('swordsman', [
    [n('剛剣', '真っ直ぐ強く振る', { atkPct: 0.12 }),
     n('堅陣', '構えを崩さない', { defPct: 0.18, dr: 0.05 })],
    [n('連撃', '手数で押す', null, ['doubleStrike']),
     n('必殺', '一撃に賭ける', { critRate: 0.10, critDmg: 0.30 })],
    [n('疾駆', '駆け抜けながら薙ぐ', { spd: 20, aoeRatio: 0.15 }, null, 'whirlwind'),
     n('不屈', '倒れない体を作る', { hpPct: 0.15 }, ['endure'], 'provoke')]
  ]);
  tree('mage', [
    [n('集束', '一点に威力を集める', { magPct: 0.12 }),
     n('拡散', '広く撒く', { aoeRatio: 0.18 })],
    [n('循環詠唱', 'MPを絶やさない', { mp: 30, mpRegen: 6 }),
     n('過剰詠唱', '同じ呪文を二度紡ぐ', null, ['doubleCast'])],
    [n('元素支配', '全属性を均等に高める', elems(0.10), null, 'elementalBurst'),
     n('貫通理論', '耐性を理屈で突き崩す', { pierce: 0.25 }, null, 'chainBolt')]
  ]);
  tree('rogue', [
    [n('隠密', '見つからなければ当たらない', { evade: 0.10, spd: 12 }),
     n('強奪', '実入りを最大化する', { goldUp: 0.40, dropUp: 0.30, atk: 10 })],
    [n('急所突き', '会心を安定させる', { critRate: 0.12 }),
     n('毒刃', '刃に毒を塗る', null, ['statusOnHit'])],
    [n('影分身', 'かわして斬り返す', { evade: 0.08 }, ['counterEvade'], 'thousandCuts'),
     n('首狩り', '弱った敵を逃さない', null, ['executeLow'], 'executioner')]
  ]);
  tree('priest', [
    [n('加護', '受けを固める', { dr: 0.08, res: 20 }),
     n('祈祷', '光の術を高める', { magPct: 0.12, 'el_light': 0.12 })],
    [n('慈雨', '溢れた治癒を捨てない', null, ['overheal']),
     n('断罪', '闇の術に手を伸ばす', { 'el_dark': 0.18, lifesteal: 0.08 })],
    [n('聖域', '被弾を守りに変える', { hpPct: 0.10 }, ['barrierOnHit'], 'holyNova'),
     n('献身', '倒すたびに癒される', { lifesteal: 0.12 }, ['killHeal'], 'darkPact')]
  ]);

  /* ============================ 上級職 ============================ */
  tree('berserker', [
    [n('血の渇き', '奪って戦う', { lifesteal: 0.12 }),
     n('剛力', '純粋な腕力', { atkPct: 0.18 })],
    [n('死線', '追い詰められて硬くなる', null, ['lastStand']),
     n('暴走', '振り回すほど当たる', { critRate: 0.12, critDmg: 0.40 })],
    [n('喰らい尽くす', '倒すほど強くなる', null, ['killHeal', 'stackAtkOnKill'], 'shockwave'),
     n('鬼力', '速さも力に変える', { atkPct: 0.22, spd: 10 }, null, 'executioner')]
  ]);
  tree('assassin', [
    [n('精密', '会心率を底上げする', { critRate: 0.12 }),
     n('疾影', '速さで先を取る', { spd: 18, evade: 0.08 })],
    [n('追撃', '会心が会心を呼ぶ', null, ['critChain']),
     n('処刑', '瀕死を確実に刈る', null, ['executeLow'])],
    [n('無音', '最初の一撃を必殺にする', { critDmg: 0.40 }, ['firstHitCrit'], 'galeFlurry'),
     n('毒刃', '斬るたび毒を残す', { 'el_dark': 0.15 }, ['statusOnHit'], 'plague')]
  ]);
  tree('elementalist', [
    [n('灼雷', '炎と雷を極める', { 'el_fire': 0.18, 'el_thunder': 0.18 }),
     n('氷嵐', '氷と風を極める', { 'el_ice': 0.18, 'el_wind': 0.18 })],
    [n('弱点看破', '弱点をさらに深く抉る', null, ['weakHunter']),
     n('耐性破壊', '耐性という前提を壊す', { pierce: 0.15 }, ['guardBreak'])],
    [n('元素循環', '通常攻撃すら属性にする', null, ['elementCycle'], 'meteor'),
     n('大魔法', '広く重く撃つ', { magPct: 0.20, aoePower: 0.20 }, null, 'blizzard')]
  ]);
  tree('guardian', [
    [n('鉄壁', '硬さを積む', { defPct: 0.20 }),
     n('棘壁', '硬さを刃に変える', { reflect: 0.15 })],
    [n('反射増幅', '返す威力を上げる', { reflectPow: 0.35 }),
     n('万象軽減', 'あらゆる一撃を薄める', null, ['wardAll'])],
    [n('鏡面拡散', '反射を全体に及ぼす', null, ['reflectAll'], 'mirrorField'),
     n('不落', '決して落ちない', { hpPct: 0.15 }, ['endure'], 'ironWall')]
  ]);
  tree('stormcaller', [
    [n('拡散', '単体技も面にする', { aoeRatio: 0.20 }),
     n('爆風', '範囲技の威力を上げる', { aoePower: 0.25 })],
    [n('連鎖', '余剰ダメージを流す', null, ['overkillChain']),
     n('群狩り', '数が多いほど強い', null, ['hordeSlayer'])],
    [n('天災', '倒れた敵が次を巻き込む', null, ['deathSpike'], 'meteor'),
     n('疾風', '速く、風を強く', { spd: 22, 'el_wind': 0.20 }, null, 'galeFlurry')]
  ]);
  tree('alchemist', [
    [n('増量', 'アイテムの威力を上げる', { itemPower: 0.30 }),
     n('倹約', 'アイテムを減らさない', { itemKeep: 0.20 })],
    [n('共鳴', '効果が二度出ることがある', null, ['itemEcho']),
     n('開幕調合', '戦闘開始時に補充する', null, ['itemRefill'])],
    [n('触媒装甲', '開幕からバリアを張る', { dr: 0.08 }, ['alchemyShield'], 'panacea'),
     n('劇薬', '当てるたびに蝕む', { 'el_dark': 0.18 }, ['statusOnHit'], 'acidFlask')]
  ]);
  tree('exorcist', [
    [n('聖光', '光を伸ばす', { 'el_light': 0.22 }),
     n('冥闇', '闇を伸ばす', { 'el_dark': 0.22 })],
    [n('浄化', '癒しを守りに変える', { dr: 0.06 }, ['overheal']),
     n('呪縛', '蝕まれた敵に強く出る', null, ['statusDamage'])],
    [n('二極', '光と闇を同時に高める', { 'el_light': 0.18, 'el_dark': 0.18, pierce: 0.12 }, null, 'judgement'),
     n('収穫', '倒すたびに満たされる', null, ['soulHarvest', 'killHeal'], 'hexMist')]
  ]);
  tree('windrunner', [
    [n('軽業', '避けることを選ぶ', { evade: 0.12 }),
     n('韋駄', '速さを選ぶ', { spd: 24 })],
    [n('先手', '最初の一撃を必殺に', null, ['firstHitCrit']),
     n('返し', 'かわしざまに斬る', null, ['counterEvade'])],
    [n('縮地', '速さがそのまま威力になる', null, ['speedPower'], 'thousandCuts'),
     n('幻影', '追い詰められるほど捉えられない', { evade: 0.15 }, ['lastStand'], 'shadowStep')]
  ]);
  tree('hexer', [
    [n('猛毒', '闇の術を強める', { 'el_dark': 0.18 }),
     n('衰弱', '耐性を削り取る', { pierce: 0.18 })],
    [n('執拗', '状態異常が長く残る', null, ['lingering']),
     n('伝染', '状態異常が周囲に移る', null, ['spreadStatus'])],
    [n('蝕み', '弱った敵ほど深く斬れる', { magPct: 0.12 }, ['statusDamage'], 'curseBurst'),
     n('撒種', '殴るだけで呪いが乗る', null, ['statusOnHit'], 'gravityWell')]
  ]);
  tree('bard', [
    [n('大声', '届く声で歌う', { buffPower: 0.18 }),
     n('長歌', '歌い終わらない', { buffTurns: 1 })],
    [n('唱和', '自分の加護を皆で分ける', null, ['boonShare']),
     n('緩衝', '加護が守りにもなる', null, ['boonGuard'])],
    [n('凱歌', '攻めの歌に振り切る', { buffPower: 0.20 }, null, 'valorMarch'),
     n('再演', 'もう一度鳴ることがある', null, ['encore'], 'wardSong')]
  ]);
  tree('binder', [
    [n('深呪', '弱体を深くする', { debuffPower: 0.18 }),
     n('長呪', '弱体を長引かせる', { debuffTurns: 1 })],
    [n('伝播', '呪いが隣へ移る', null, ['spreadHex']),
     n('打擲', '殴るだけで削れる', null, ['sapStrike'])],
    [n('烙印', '弱った敵ほど深く斬れる', { magPct: 0.12 }, ['hexBrand'], 'witherAll'),
     n('積弊', '重ねるほど脆くなる', null, ['doomToll'], 'bindingWord')]
  ]);
  tree('spellblade', [
    [n('剣気', '剣を選ぶ', { atkPct: 0.15 }),
     n('魔気', '魔を選ぶ', { magPct: 0.15 })],
    [n('炎剣', '弱点を焼き抜く', { 'el_fire': 0.22 }, ['weakHunter']),
     n('雷剣', '痺れさせて封じる', { 'el_thunder': 0.22 }, ['shockOnThunder'])],
    [n('双極', '両極を均等に伸ばす', { atkPct: 0.12, magPct: 0.12, critRate: 0.10 }, null, 'dualPole'),
     n('魔力刃', '残り魔力が威力になる', { mp: 40 }, ['manaPower'], 'elementalBurst')]
  ]);

  /* ============================ 最上級職 ============================ */
  tree('phantomSaint', [
    [n('断罪', '会心の重さを増す', { critDmg: 0.50 }),
     n('影走', '速さと回避を得る', { spd: 25, evade: 0.10 })],
    [n('連鎖斬', '会心が追撃を呼ぶ', null, ['critChain']),
     n('一閃', '会心率そのものを上げる', { critRate: 0.15 })],
    [n('無明', '初撃必殺かつ二分割', null, ['firstHitCrit', 'doubleStrike'], 't_condemn'),
     n('死告', '瀕死と強敵に強く出る', null, ['executeLow', 'bossSlayer'], 'executioner')]
  ]);
  tree('mirrorEmperor', [
    [n('増幅', '返す威力を上げる', { reflectPow: 0.40 }),
     n('堅牢', '土台を厚くする', { defPct: 0.25, hpPct: 0.10 })],
    [n('棘霧', '毎ラウンド棘を撒く', null, ['thornAura']),
     n('反照', '反射率そのものを上げる', { reflect: 0.20 })],
    [n('万象', 'あらゆる被弾を薄める', { dr: 0.10 }, ['wardAll'], 't_retribution'),
     n('破鏡', '砕けた敵が次を巻き込む', { aoePower: 0.25 }, ['deathSpike'], 'ult_mirrorEnd')]
  ]);
  tree('calamityKing', [
    [n('暴風', '範囲威力を上げる', { aoePower: 0.30 }),
     n('波及', '波及率を上げる', { aoeRatio: 0.25 })],
    [n('連鎖崩壊', '撃破が連鎖する', null, ['overkillChain', 'deathSpike']),
     n('数の暴力', '囲まれるほど強い', { atkPct: 0.12 }, ['hordeSlayer'])],
    [n('天雷', '雷で薙ぎ払う', { 'el_thunder': 0.30 }, ['shockOnThunder'], 'chainBolt'),
     n('極風', '風を極める', { 'el_wind': 0.30, spd: 20 }, null, 't_scatterstrike')]
  ]);
  tree('astralArchmage', [
    [n('星輝', '全属性を伸ばす', elems(0.10)),
     n('貫星', '耐性貫通を伸ばす', { pierce: 0.25 })],
    [n('二重詠唱', '魔法が二度発動する', null, ['doubleCast']),
     n('元素循環', '通常攻撃も属性になる', null, ['elementCycle'])],
    [n('星辰爆', '広く重く撃つ', { magPct: 0.22, aoePower: 0.25 }, null, 'meteor'),
     n('看破', '弱点も耐性も意味を成さない', null, ['weakHunter', 'guardBreak'], 't_elemshift')]
  ]);
  tree('alchemySovereign', [
    [n('極量', 'アイテム威力を極める', { itemPower: 0.50 }),
     n('永続', '在庫を減らさない', { itemKeep: 0.25 })],
    [n('二重反応', '効果が二度出る', null, ['itemEcho']),
     n('万象補充', '開幕に補充と守りを得る', null, ['itemRefill', 'alchemyShield'])],
    [n('劇薬散布', '呪いを撒き散らす', null, ['statusOnHit', 'spreadStatus'], 'curseBurst'),
     n('黄金律', '実入りごと威力に変える', { goldUp: 0.80, dropUp: 0.50, itemPower: 0.25 }, null, 't_quickbrew')]
  ]);
  tree('bloodfiend', [
    [n('渇望', '吸収を伸ばす', { lifesteal: 0.18 }),
     n('剛腕', '攻撃力を伸ばす', { atkPct: 0.20 })],
    [n('喰らい取り', '倒すたびに満ちる', null, ['killHeal', 'soulHarvest']),
     n('死線', '追い詰められて硬くなる', { hpPct: 0.12 }, ['lastStand'])],
    [n('累積', '倒すほど攻撃が積み上がる', { atkPct: 0.10 }, ['stackAtkOnKill'], 'ult_devourFang'),
     n('鬼哭', '瀕死を確実に葬る', { critDmg: 0.40 }, ['executeLow'], 't_lifeline')]
  ]);
  tree('finalArbiter', [
    [n('光審', '光を極める', { 'el_light': 0.28 }),
     n('闇断', '闇を極める', { 'el_dark': 0.28 })],
    [n('護法', '被弾を薄める', { dr: 0.08 }, ['wardAll']),
     n('呪罰', '蝕んだ敵を裁く', null, ['statusDamage', 'lingering'])],
    [n('審判', '威力と貫通を伸ばす', { magPct: 0.20, pierce: 0.18 }, null, 'ult_lastJudgement'),
     n('慈悲', '癒しを守りと力に変える', { lifesteal: 0.12 }, ['overheal', 'killHeal'], 't_immovable')]
  ]);
  tree('voidSovereign', [
    [n('虚無侵食', '攻めに寄せる', { atkPct: 0.12, magPct: 0.12 }),
     n('虚無防壁', '守りに寄せる', { defPct: 0.15, dr: 0.08 })],
    [n('深淵', '貫通と属性を伸ばす', (function () { var m = elems(0.08); m.pierce = 0.25; return m; })()),
     n('崩壊', '撃破が周囲を巻き込む', { aoePower: 0.25 }, ['deathSpike'])],
    [n('支配', '耐性も状態異常も思うまま', null, ['guardBreak', 'statusOnHit'], 'ult_voidCollapse'),
     n('終焉', '会心で全てを断つ', { critRate: 0.15, critDmg: 0.50 }, ['critChain'], 't_condemn')]
  ]);
  tree('skyrunner', [
    [n('神速', '速さを極める', { spd: 30 }),
     n('幻影', '回避を極める', { evade: 0.18 })],
    [n('千影', '通常攻撃が二分割される', null, ['doubleStrike']),
     n('迎撃', '避けて斬り、先手も取る', null, ['counterEvade', 'firstHitCrit'])],
    [n('速度支配', '速さがそのまま威力になる', { spd: 15 }, ['speedPower'], 'ult_thousandShadow'),
     n('空蝉', '追い詰められるほど捉えられない', { evade: 0.12, dr: 0.08 }, ['lastStand'], 't_afterimage')]
  ]);
  tree('plaguelord', [
    [n('疫毒', '闇を極める', { 'el_dark': 0.28 }),
     n('蝕み', '貫通を極める', { pierce: 0.25 })],
    [n('蔓延', '長く、広く効かせる', null, ['spreadStatus', 'lingering']),
     n('撒種', '殴るだけで呪う', { magPct: 0.12 }, ['statusOnHit'])],
    [n('災禍', '蝕んだ敵に致命を与える', { magPct: 0.18 }, ['statusDamage'], 'ult_pandemic'),
     n('収穫', '倒すたびに満ちる', { lifesteal: 0.15 }, ['soulHarvest', 'killHeal'], 't_hexbloom')]
  ]);
  tree('graceEmperor', [
    [n('天音', '加護そのものを強くする', { buffPower: 0.25 }),
     n('永唱', '加護が切れない', { buffTurns: 2 })],
    [n('斉唱', '自分の加護がそのまま隊の加護になる', null, ['boonShare', 'openingRally']),
     n('護歌', '加護を着た者は倒れない', { dr: 0.10 }, ['boonGuard'])],
    [n('凱旋', '攻めきる歌に振り切る', { buffPower: 0.20, magPct: 0.15 }, null, 'ult_paean'),
     n('鎮魂', '倒れた者を歌で戻す', { mp: 40 }, ['overheal'], 'resurrect')]
  ]);
  tree('ruinEmperor', [
    [n('極呪', '弱体を極める', { debuffPower: 0.25 }),
     n('久呪', '弱体を切らさない', { debuffTurns: 2 })],
    [n('万縛', '呪いが戦場に広がる', null, ['spreadHex', 'frailtyAura']),
     n('刻印', '呪われた敵に致命を与える', { magPct: 0.12 }, ['hexBrand', 'doomToll'])],
    [n('零落', '数字を根こそぎ削る', { debuffPower: 0.20 }, null, 'ult_ruin'),
     n('侵蝕', '弱体と毒を同時に撒く', { 'el_dark': 0.20 }, ['statusOnHit', 'lingering'], 'plagueMark')]
  ]);
  tree('poleEmperor', [
    [n('剣極', '物理に寄せる', { atkPct: 0.20 }),
     n('魔極', '魔法に寄せる', { magPct: 0.20 })],
    [n('双極斬', '会心を伸ばす', { critRate: 0.12, critDmg: 0.35 }),
     n('魔力刃', '残り魔力が威力になる', { mp: 50 }, ['manaPower'])],
    [n('万能', '全属性と貫通を得る', (function () { var m = elems(0.12); m.pierce = 0.15; return m; })(), null, 'ult_duality'),
     n('覇断', '強敵と瀕死に極端に強い', { critDmg: 0.30 }, ['bossSlayer', 'executeLow'], 't_condemn')]
  ]);

  /* ==================== 仲間だけの最上級職 ==================== */
  tree('dawnMother', [
    [n('灯し続ける', '光をさらに強くする', { 'el_light': 0.25 }),
     n('絶やさない', '回復の器を広げる', { mp: 50, mpRegen: 6 })],
    [n('溢れる分も', '過剰な癒しを盾に変える', null, ['overheal']),
     n('一人も', '倒れない体を全員に配る', { hpPct: 0.15 }, ['endure'])],
    [n('朝を呼ぶ', '光の一撃で味方を癒す', { 'el_light': 0.25, lifesteal: 0.15 }, ['weakHunter'], 'holyNova'),
     n('看取らない', '倒れた者を戻す術を極める', { magPct: 0.20 }, ['overheal'], 'resurrect')]
  ]);
  tree('undyingAegis', [
    [n('祈盾', '物理を弾く', { defPct: 0.25 }),
     n('祈衣', '魔を弾く', { res: 40 })],
    [n('身代わり', '被弾でバリアを張る', null, ['barrierOnHit']),
     n('万象の守り', '全属性を薄く軽減する', null, ['wardAll'])],
    [n('動かぬ誓い', '庇う力を極める', { dr: 0.12, hpPct: 0.12 }, ['lastStand'], 'bulwark'),
     n('癒しの壁', 'バリアと癒しを兼ねる', { magPct: 0.20 }, ['overheal'], 'homunculus')]
  ]);
  tree('ironBastion', [
    [n('据える', '防御を攻撃に変える', { defPct: 0.25 }, ['wallPower']),
     n('返す', '反射の威力を増す', { reflectPow: 0.40 })],
    [n('棘の霧', '立っているだけで削る', null, ['thornAura']),
     n('避けて斬る', '回避に反撃を乗せる', { evade: 0.12 }, ['counterEvade'])],
    [n('城になる', '動かないことを極める', { dr: 0.15, hpPct: 0.18 }, ['endure'], 'counterWall'),
     n('壁で殴る', '防御そのもので殴る', { defPct: 0.30 }, ['wallPower', 'guardBreak'], 'retaliate')]
  ]);
  tree('wrathBulwark', [
    [n('燃やす', '削れるほど強くなる', null, ['lowHpRage']),
     n('喰らう', '奪って立て直す', { lifesteal: 0.20 })],
    [n('背水', '半分を切ってから本気を出す', { hpPct: 0.15 }, ['lastStand']),
     n('屠る', '撃破で体力を取り戻す', null, ['killHeal'])],
    [n('忿怒', '怒りを火力に変え切る', { atkPct: 0.25, critDmg: 0.35 }, ['lowHpRage'], 'carnage'),
     n('盾鬼', '守りながら猛る', { defPct: 0.28 }, ['wallPower', 'endure'], 'tauntRoar')]
  ]);
  tree('worldTheorem', [
    [n('解式', '全属性を底上げする', elems(0.12)),
     n('貫式', '耐性を抜く', { pierce: 0.30 })],
    [n('二重詠唱', '同じ呪文が二度走る', null, ['doubleCast']),
     n('属性転変', '通常攻撃の属性が巡る', null, ['elementCycle'])],
    [n('万理', '弱点をさらに深く突く', elems(0.14), ['weakHunter'], 'ult_astralBurst'),
     n('全打', '通常攻撃を全属性にする', { magPct: 0.22 }, ['allElemStrike'], 'elementalBurst')]
  ]);
  tree('stillCalamity', [
    [n('広げる', '範囲の威力を上げる', { aoePower: 0.35 }),
     n('遺す', '状態異常を長く残す', null, ['lingering'])],
    [n('伝播', '呪いが周囲へ移る', null, ['spreadStatus']),
     n('蝕む', '状態異常の敵に強く出る', null, ['statusDamage'])],
    [n('静かな災い', '撒く力を極める', { aoeRatio: 0.30, 'el_dark': 0.20 }, ['overkillChain'], 'plagueMark'),
     n('枯らす', '毒と刻印で削り切る', { magPct: 0.22 }, ['spreadStatus', 'statusDamage'], 'soulSeal')]
  ]);

  G.CLASSTREE = T;

  /* ===================== 習熟の判定 ===================== */
  G.Mastery = {
    NEED: NEED,
    /** その職業の習熟度 */
    wins: function (hero, classId) {
      var m = hero.mastery && hero.mastery[classId];
      return m ? (m.wins || 0) : 0;
    },
    /** その職業の選択状況 { 1:'a', 2:'b', ... } */
    picks: function (hero, classId) {
      var m = hero.mastery && hero.mastery[classId];
      return (m && m.picks) || {};
    },
    /** 習熟度を加算する */
    gain: function (hero, classId, amount) {
      if (!hero.mastery) hero.mastery = {};
      if (!hero.mastery[classId]) hero.mastery[classId] = { wins: 0, picks: {} };
      hero.mastery[classId].wins += amount;
      return hero.mastery[classId].wins;
    },
    /** 段が解放されているか */
    unlocked: function (hero, classId, tier) {
      return G.Mastery.wins(hero, classId) >= NEED[tier - 1];
    },
    /** 選択する（同じ段は上書きできない） */
    pick: function (hero, classId, tier, which) {
      if (!G.CLASSTREE[classId]) return false;
      if (!G.Mastery.unlocked(hero, classId, tier)) return false;
      if (G.Mastery.picks(hero, classId)[tier]) return false;
      if (!hero.mastery) hero.mastery = {};
      if (!hero.mastery[classId]) hero.mastery[classId] = { wins: 0, picks: {} };
      hero.mastery[classId].picks[tier] = which;
      return true;
    },
    /** 現在の職業で選択中のノード一覧（効果が有効なのはこれだけ） */
    activeNodes: function (hero) {
      var rows = G.CLASSTREE[hero.classId];
      if (!rows) return [];
      var picks = G.Mastery.picks(hero, hero.classId);
      var out = [];
      rows.forEach(function (r) {
        var w = picks[r.tier];
        if (w) out.push(r[w]);
      });
      return out;
    },
    /** 選び直しの費用 */
    respecCost: function (hero) {
      var count = Object.keys(G.Mastery.picks(hero, hero.classId)).length;
      return count === 0 ? 0 : 120 + count * 90;
    },
    /** 現在の職業の選択を白紙に戻す */
    reset: function (hero) {
      if (hero.mastery && hero.mastery[hero.classId]) hero.mastery[hero.classId].picks = {};
    }
  };
})();
