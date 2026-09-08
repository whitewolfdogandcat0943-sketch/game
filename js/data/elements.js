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
  soulHarvest:   '敵撃破時、最大MPの15%を回復'
};
