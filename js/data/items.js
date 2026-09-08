/* items.js - 消耗アイテム
 * アイテムの威力は「アイテム威力(itemPower)」とレベルでスケールする。
 * 「アイテム温存率(itemKeep)」の抽選に成功すると消費されない。
 */
(function () {
  var I = [];
  function it(o) { o.kind = 'item'; I.push(o); return o; }

  it({ id: 'i_herb', name: '薬草', tier: 1, price: 30, use: { type: 'heal', power: 70 }, desc: 'HPを回復する。' });
  it({ id: 'i_potion', name: 'ポーション', tier: 1, price: 70, use: { type: 'heal', power: 160 }, desc: 'HPを大きく回復する。' });
  it({ id: 'i_hipotion', name: 'ハイポーション', tier: 2, price: 160, use: { type: 'heal', power: 330 }, desc: 'HPを非常に大きく回復する。' });
  it({ id: 'i_ether', name: 'エーテル', tier: 1, price: 90, use: { type: 'mp', power: 45 }, desc: 'MPを回復する。' });
  it({ id: 'i_elixir', name: 'エリクサー', tier: 3, price: 400, use: { type: 'full' }, desc: 'HP/MPを全回復し状態異常を解除。' });
  it({ id: 'i_antidote', name: '解毒剤', tier: 1, price: 40, use: { type: 'cleanse', power: 40 }, desc: '状態異常を解除し少し回復。' });

  it({ id: 'i_fbomb', name: '炎の爆弾', tier: 1, price: 70, use: { type: 'dmg', el: 'fire', power: 130, target: 'one' }, desc: '単体に炎ダメージ。' });
  it({ id: 'i_ibomb', name: '氷結の瓶', tier: 1, price: 75, use: { type: 'dmg', el: 'ice', power: 105, target: 'all', freeze: 0.25 }, desc: '全体に氷ダメージ。25%で凍結。' });
  it({ id: 'i_tbomb', name: '雷の呪符', tier: 1, price: 75, use: { type: 'dmg', el: 'thunder', power: 115, target: 'all', shock: 0.2 }, desc: '全体に雷ダメージ。20%で麻痺。' });
  it({ id: 'i_wbomb', name: '風刃の瓶', tier: 1, price: 70, use: { type: 'dmg', el: 'wind', power: 120, target: 'all' }, desc: '全体に風ダメージ。' });
  it({ id: 'i_holywater', name: '聖水', tier: 2, price: 120, use: { type: 'dmg', el: 'light', power: 140, target: 'all', healSelf: 0.3 }, desc: '全体に光ダメージ、HPも少し回復。' });
  it({ id: 'i_darkflask', name: '闇の煙玉', tier: 2, price: 120, use: { type: 'dmg', el: 'dark', power: 130, target: 'all', debuff: { k: 'atkPct', v: -0.25, t: 3 } }, desc: '全体に闇ダメージと攻撃低下。' });
  it({ id: 'i_megabomb', name: '大爆弾', tier: 3, price: 260, use: { type: 'dmg', el: 'fire', power: 230, target: 'all' }, desc: '全体に大きな炎ダメージ。' });

  it({ id: 'i_powerdrug', name: '力の薬', tier: 1, price: 90, use: { type: 'buff', buffs: [{ k: 'atkPct', v: 0.40, t: 3 }, { k: 'magPct', v: 0.40, t: 3 }] }, desc: '3ターン攻撃+40%。' });
  it({ id: 'i_mirroroil', name: '鏡の油', tier: 2, price: 110, use: { type: 'buff', buffs: [{ k: 'reflect', v: 0.40, t: 3 }] }, desc: '3ターン反射+40%。' });
  it({ id: 'i_scatterdust', name: '拡散の粉', tier: 2, price: 110, use: { type: 'buff', buffs: [{ k: 'aoeRatio', v: 0.45, t: 3 }, { k: 'aoePower', v: 0.30, t: 3 }] }, desc: '3ターン波及+45%。' });
  it({ id: 'i_criteye', name: '鷹の目薬', tier: 2, price: 120, use: { type: 'buff', buffs: [{ k: 'critRate', v: 0.30, t: 3 }, { k: 'critDmg', v: 0.40, t: 3 }] }, desc: '3ターン会心率+30%。' });
  it({ id: 'i_phoenix', name: '不死鳥の羽', tier: 3, price: 300, use: { type: 'buff', endure: true, buffs: [{ k: 'dr', v: 0.25, t: 3 }] }, desc: '致死ダメージを1度耐える力を得る。' });
  it({ id: 'i_prismvial', name: '虹の小瓶', tier: 3, price: 300, use: { type: 'dmgMulti', els: ['fire', 'ice', 'thunder', 'wind', 'light', 'dark'], power: 62, target: 'all' }, desc: '6属性すべてで全体を攻撃する。' });

  G.ITEMS = I;
  G.ITEM_BY_ID = {};
  I.forEach(function (x) { G.ITEM_BY_ID[x.id] = x; });
})();
