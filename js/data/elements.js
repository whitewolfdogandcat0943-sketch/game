/* elements.js - 属性定義とビルド指標のキー定義 */
G.ELEMENTS = {
  phys:    { id: 'phys',    name: '物理', cls: 'e-phys',    icon: '⚔' },
  fire:    { id: 'fire',    name: '炎',   cls: 'e-fire',    icon: '🔥' },
  ice:     { id: 'ice',     name: '氷',   cls: 'e-ice',     icon: '❄' },
  thunder: { id: 'thunder', name: '雷',   cls: 'e-thunder', icon: '⚡' },
  wind:    { id: 'wind',    name: '風',   cls: 'e-wind',    icon: '🌪' },
  light:   { id: 'light',   name: '光',   cls: 'e-light',   icon: '✦' },
  dark:    { id: 'dark',    name: '闇',   cls: 'e-dark',    icon: '🌑' }
};
/* 「全属性」判定に使う6属性（物理は含まない） */
G.MAGIC_ELEMENTS = ['fire', 'ice', 'thunder', 'wind', 'light', 'dark'];
G.ALL_ELEMENTS = ['phys'].concat(G.MAGIC_ELEMENTS);

G.elName = function (e) { return (G.ELEMENTS[e] || G.ELEMENTS.phys).name; };
G.elSpan = function (e) {
  var d = G.ELEMENTS[e] || G.ELEMENTS.phys;
  return '<span class="' + d.cls + '">' + d.icon + d.name + '</span>';
};

/* 属性相性: 弱点は1.6倍 / 耐性は0.55倍（敵ごとに定義） */
G.WEAK_MULT = 1.6;
G.RESIST_MULT = 0.55;

/* ビルド指標（modキー）のラベルと表示形式
 * kind: 'flat' そのまま加算 / 'pct' 割合(0.1=10%) */
G.MODKEYS = {
  hp:        { label: '最大HP',        kind: 'flat' },
  hpPct:     { label: '最大HP',        kind: 'pct'  },
  mp:        { label: '最大MP',        kind: 'flat' },
  atk:       { label: '物理攻撃',      kind: 'flat' },
  atkPct:    { label: '物理攻撃',      kind: 'pct'  },
  mag:       { label: '魔法攻撃',      kind: 'flat' },
  magPct:    { label: '魔法攻撃',      kind: 'pct'  },
  def:       { label: '物理防御',      kind: 'flat' },
  defPct:    { label: '物理防御',      kind: 'pct'  },
  res:       { label: '魔法防御',      kind: 'flat' },
  spd:       { label: '素早さ',        kind: 'flat' },
  critRate:  { label: '会心率',        kind: 'pct'  },
  critDmg:   { label: '会心ダメージ',  kind: 'pct'  },
  reflect:   { label: '反射率',        kind: 'pct'  },
  reflectPow:{ label: '反射威力',      kind: 'pct'  },
  aoeRatio:  { label: '波及率',        kind: 'pct'  },
  aoePower:  { label: '範囲威力',      kind: 'pct'  },
  pierce:    { label: '耐性貫通',      kind: 'pct'  },
  itemPower: { label: 'アイテム威力',  kind: 'pct'  },
  itemKeep:  { label: 'アイテム温存率',kind: 'pct'  },
  lifesteal: { label: '吸収',          kind: 'pct'  },
  dr:        { label: '被ダメ軽減',    kind: 'pct'  },
  dmgUp:     { label: '与ダメージ',    kind: 'pct'  },
  mpRegen:   { label: 'MP自動回復',    kind: 'flat' },
  goldUp:    { label: '獲得ゴールド',  kind: 'pct'  },
  dropUp:    { label: 'ドロップ率',    kind: 'pct'  },
  evade:     { label: '回避率',        kind: 'pct'  }
};
G.MAGIC_ELEMENTS.concat(['phys']).forEach(function (e) {
  G.MODKEYS['el_' + e] = { label: G.ELEMENTS[e].name + '属性ダメージ', kind: 'pct' };
});

/* フラグ（特殊効果）の説明 */
G.FLAGS = {
  reflectAll:    '反射ダメージが敵全体に波及する',
  critPierce:    '会心時、敵の防御を50%無視する',
  doubleStrike:  '通常攻撃が2回に分裂する（1発あたり60%）',
  fireSplash:    '炎属性ダメージが敵全体に30%波及する',
  shockOnThunder:'雷属性ダメージ時、25%で麻痺を付与',
  freezeOnIce:   '氷属性ダメージ時、30%で凍結を付与',
  stackAtkOnKill:'敵を倒すたび攻撃+6%（戦闘中累積）',
  barrierOnHit:  '被弾時、20%でバリアを獲得',
  healOnReflect: '反射ダメージの30%だけHPを回復',
  itemRefill:    '戦闘開始時、ランダムなアイテムを1個補充',
  endure:        '戦闘中1回だけ致死ダメージをHP1で耐える',
  pristine:      '無傷の間、与ダメージ+40%',
  lowHpRage:     'HP30%以下で与ダメージ+60%',
  mythicScaling: '装備中のミシック1個につき与ダメージ+10%',
  overkillChain: '敵撃破時、余剰ダメージが他の敵へ波及',
  allElemStrike: '通常攻撃が全属性の複合攻撃になる',
  itemEcho:      'アイテム使用後、25%でもう一度同じ効果が発動',
  guardBreak:    '与ダメージが常に耐性の影響を25%緩和',
  soulHarvest:   '敵撃破時、最大MPの15%を回復',

  /* --- 追加フラグ --- */
  killHeal:      '敵撃破時、最大HPの8%を回復する',
  overheal:      '回復の超過分の50%がバリアになる',
  lastStand:     'HP50%以下のとき、被ダメージ25%減',
  executeLow:    'HP25%以下の敵への与ダメージ+60%',
  bossSlayer:    'ボスへの与ダメージ+25%',
  hordeSlayer:   '敵が3体以上いるとき与ダメージ+22%',
  soloFocus:     '敵が1体のみのとき与ダメージ+40%',
  statusDamage:  '状態異常の敵への与ダメージ+35%',
  speedPower:    '素早さの40%を物理攻撃力に加算する',
  wallPower:     '物理防御の35%を物理攻撃力に加算する',
  manaPower:     '残りMPの割合に応じて与ダメージ最大+30%',
  critChain:     '会心時、25%でもう一撃（威力50%）が入る',
  spreadStatus:  '状態異常を付与したとき、35%で他の敵にも伝播',
  firstHitCrit:  '各戦闘の最初の攻撃は必ず会心する',
  counterEvade:  '攻撃を回避したとき、反撃する（威力80%）',
  doubleCast:    '魔法スキルが2回発動する（1発あたり60%）',
  thornAura:     'ラウンド終了時、敵全体に棘のダメージ',
  deathSpike:    '敵撃破時、他の敵全体に最大HPの5%のダメージ',
  wardAll:       'あらゆる被ダメージを15%軽減する',
  elementCycle:  '通常攻撃の属性が毎ターン移り変わる',
  weakHunter:    '弱点を突いたときの与ダメージがさらに+30%',
  alchemyShield: '戦闘開始時、アイテム威力に比例したバリアを得る'
};
