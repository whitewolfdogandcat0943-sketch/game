/* skilltree.js - スキルツリー（ビルド軸の共通ツリー＋職業限定の奥義枝）
 *
 * 8系統 × 6ノード = 48ノード。
 *   row1 (1SP) … 入口。前提なし
 *   row2 (2SP) … row1の指定ノードが前提
 *   row3 (3SP) … その系統に3SP以上振っていることが前提。スキルを習得する
 *   row4 (3SP) … row3が前提＋職業限定の奥義ノード
 *
 * ノードで得た数値はそのまま職業の解放条件に反映されるので、
 * 「装備だけでは届かない閾値をSPで越える」という選択が生まれる。
 */
(function () {
  var B = [];
  function branch(o) { o.nodes = []; B.push(o); return o; }
  function node(br, o) { o.branch = br.id; br.nodes.push(o); return o; }

  function allElem(v) {
    var m = {};
    G.MAGIC_ELEMENTS.forEach(function (e) { m['el_' + e] = v; });
    return m;
  }

  /* ===================== 会心の道 ===================== */
  var crit = branch({ id: 'crit', name: '会心の道', hue: 45, icon: 'weapon',
    desc: '急所を見抜き、一撃の質を極める。' });
  node(crit, { id: 'ct_eye', name: '鋭い目', row: 1, cost: 1, mods: { critRate: 0.06 } });
  node(crit, { id: 'ct_weak', name: '弱点感知', row: 1, cost: 1, mods: { critDmg: 0.25 } });
  node(crit, { id: 'ct_blood', name: '血の匂い', row: 2, cost: 2, req: ['ct_eye'], flags: ['executeLow'] });
  node(crit, { id: 'ct_breath', name: '二段の呼吸', row: 2, cost: 2, req: ['ct_weak'], flags: ['critChain'] });
  node(crit, { id: 'ct_form', name: '必中の型', row: 3, cost: 3, branchSpent: 3,
    mods: { critRate: 0.12, critDmg: 0.40 }, skill: 't_condemn' });
  node(crit, { id: 'ct_ult', name: '絶影の境地', row: 4, cost: 3, req: ['ct_form'],
    classes: ['assassin', 'phantomSaint', 'berserker', 'bloodfiend'],
    mods: { critRate: 0.15, critDmg: 0.60 }, flags: ['critPierce', 'firstHitCrit'] });

  /* ===================== 反射の道 ===================== */
  var refl = branch({ id: 'reflect', name: '反射の道', hue: 300, icon: 'armor',
    desc: '受けた痛みを、そのまま返す。' });
  node(refl, { id: 'rf_thorn', name: '棘皮', row: 1, cost: 1, mods: { reflect: 0.10 } });
  node(refl, { id: 'rf_hard', name: '硬化', row: 1, cost: 1, mods: { def: 20, dr: 0.04 } });
  node(refl, { id: 'rf_mirror', name: '鏡面', row: 2, cost: 2, req: ['rf_thorn'], mods: { reflectPow: 0.30 } });
  node(refl, { id: 'rf_aura', name: '棘の霧', row: 2, cost: 2, req: ['rf_hard'], flags: ['thornAura'] });
  node(refl, { id: 'rf_vow', name: '返報の誓い', row: 3, cost: 3, branchSpent: 3,
    mods: { reflect: 0.20 }, skill: 't_retribution' });
  node(refl, { id: 'rf_ult', name: '鏡獄の理', row: 4, cost: 3, req: ['rf_vow'],
    classes: ['guardian', 'mirrorEmperor'],
    mods: { reflect: 0.25 }, flags: ['reflectAll', 'healOnReflect'] });

  /* ===================== 範囲の道 ===================== */
  var aoe = branch({ id: 'aoe', name: '範囲の道', hue: 140, icon: 'weapon',
    desc: '一点を面に変え、戦場ごと薙ぎ払う。' });
  node(aoe, { id: 'ao_spread', name: '拡散', row: 1, cost: 1, mods: { aoeRatio: 0.12 } });
  node(aoe, { id: 'ao_blast', name: '爆風', row: 1, cost: 1, mods: { aoePower: 0.15 } });
  node(aoe, { id: 'ao_chain', name: '連鎖', row: 2, cost: 2, req: ['ao_spread'], flags: ['overkillChain'] });
  node(aoe, { id: 'ao_horde', name: '群狩り', row: 2, cost: 2, req: ['ao_blast'], flags: ['hordeSlayer'] });
  node(aoe, { id: 'ao_storm', name: '嵐の型', row: 3, cost: 3, branchSpent: 3,
    mods: { aoeRatio: 0.20, aoePower: 0.25 }, skill: 't_scatterstrike' });
  node(aoe, { id: 'ao_ult', name: '天災の眼', row: 4, cost: 3, req: ['ao_storm'],
    classes: ['stormcaller', 'calamityKing'],
    mods: { aoePower: 0.35, aoeRatio: 0.25 }, flags: ['deathSpike'] });

  /* ===================== 属性の道 ===================== */
  var elem = branch({ id: 'elem', name: '属性の道', hue: 200, icon: 'acc',
    desc: '六属性を操り、あらゆる耐性を無意味にする。' });
  node(elem, { id: 'el_attune', name: '元素親和', row: 1, cost: 1, mods: allElem(0.05) });
  node(elem, { id: 'el_pierce', name: '貫通理論', row: 1, cost: 1, mods: { pierce: 0.12 } });
  node(elem, { id: 'el_hunt', name: '弱点狩り', row: 2, cost: 2, req: ['el_attune'], flags: ['weakHunter'] });
  node(elem, { id: 'el_cycle', name: '循環詠唱', row: 2, cost: 2, req: ['el_pierce'], flags: ['elementCycle'] });
  node(elem, { id: 'el_shift', name: '属性転変', row: 3, cost: 3, branchSpent: 3,
    mods: (function () { var m = allElem(0.10); m.pierce = 0.12; return m; })(), skill: 't_elemshift' });
  node(elem, { id: 'el_ult', name: '星辰の理', row: 4, cost: 3, req: ['el_shift'],
    classes: ['elementalist', 'astralArchmage', 'exorcist', 'finalArbiter'],
    mods: (function () { var m = allElem(0.15); m.pierce = 0.20; return m; })(),
    flags: ['guardBreak', 'doubleCast'] });

  /* ===================== アイテムの道 ===================== */
  var item = branch({ id: 'item', name: 'アイテムの道', hue: 30, icon: 'item',
    desc: '消耗品を兵器に変え、しかも減らさない。' });
  node(item, { id: 'it_pouch', name: '薬袋', row: 1, cost: 1, mods: { itemPower: 0.18 } });
  node(item, { id: 'it_thrift', name: '倹約', row: 1, cost: 1, mods: { itemKeep: 0.10 } });
  node(item, { id: 'it_shield', name: '錬金の守り', row: 2, cost: 2, req: ['it_pouch'], flags: ['alchemyShield'] });
  node(item, { id: 'it_echo', name: '共鳴', row: 2, cost: 2, req: ['it_thrift'], flags: ['itemEcho'] });
  node(item, { id: 'it_brew', name: '即席調合', row: 3, cost: 3, branchSpent: 3,
    mods: { itemPower: 0.30 }, skill: 't_quickbrew' });
  node(item, { id: 'it_ult', name: '万象錬成', row: 4, cost: 3, req: ['it_brew'],
    classes: ['alchemist', 'alchemySovereign'],
    mods: { itemPower: 0.45, itemKeep: 0.20 }, flags: ['itemRefill'] });

  /* ===================== 堅守の道 ===================== */
  var guard = branch({ id: 'guard', name: '堅守の道', hue: 210, icon: 'armor',
    desc: '倒れないことは、それだけで勝ち筋になる。' });
  node(guard, { id: 'gd_skin', name: '頑健', row: 1, cost: 1, mods: { hp: 60, def: 12 } });
  node(guard, { id: 'gd_ward', name: '魔除け', row: 1, cost: 1, mods: { res: 20, dr: 0.04 } });
  node(guard, { id: 'gd_stand', name: '背水', row: 2, cost: 2, req: ['gd_skin'], flags: ['lastStand'] });
  node(guard, { id: 'gd_all', name: '万象の護り', row: 2, cost: 2, req: ['gd_ward'], flags: ['wardAll'] });
  node(guard, { id: 'gd_wall', name: '不動の構え', row: 3, cost: 3, branchSpent: 3,
    mods: { defPct: 0.20, hpPct: 0.10 }, skill: 't_immovable' });
  node(guard, { id: 'gd_ult', name: '不壊の証明', row: 4, cost: 3, req: ['gd_wall'],
    classes: ['guardian', 'mirrorEmperor', 'finalArbiter'],
    mods: { dr: 0.12, hpPct: 0.15 }, flags: ['endure', 'barrierOnHit'] });

  /* ===================== 速攻の道 ===================== */
  var speed = branch({ id: 'speed', name: '速攻の道', hue: 170, icon: 'acc',
    desc: '当たらなければ意味がなく、速ければ二度打てる。' });
  node(speed, { id: 'sp_light', name: '軽身', row: 1, cost: 1, mods: { spd: 12 } });
  node(speed, { id: 'sp_dodge', name: '見切り', row: 1, cost: 1, mods: { evade: 0.06 } });
  node(speed, { id: 'sp_first', name: '先制', row: 2, cost: 2, req: ['sp_light'], flags: ['firstHitCrit'] });
  node(speed, { id: 'sp_counter', name: '返し技', row: 2, cost: 2, req: ['sp_dodge'], flags: ['counterEvade'] });
  node(speed, { id: 'sp_after', name: '残影', row: 3, cost: 3, branchSpent: 3,
    mods: { spd: 20, evade: 0.10 }, skill: 't_afterimage' });
  node(speed, { id: 'sp_ult', name: '神速の域', row: 4, cost: 3, req: ['sp_after'],
    classes: ['assassin', 'phantomSaint', 'stormcaller', 'calamityKing'],
    mods: { spd: 25, evade: 0.12 }, flags: ['speedPower'] });

  /* ===================== 生命の道 ===================== */
  var life = branch({ id: 'life', name: '生命の道', hue: 350, icon: 'item',
    desc: '奪い、溢れさせ、決して尽きさせない。' });
  node(life, { id: 'lf_vital', name: '活力', row: 1, cost: 1, mods: { hpPct: 0.08 } });
  node(life, { id: 'lf_drain', name: '吸血', row: 1, cost: 1, mods: { lifesteal: 0.10 } });
  node(life, { id: 'lf_feast', name: '喰らい取り', row: 2, cost: 2, req: ['lf_drain'], flags: ['killHeal'] });
  node(life, { id: 'lf_over', name: '溢れる癒し', row: 2, cost: 2, req: ['lf_vital'], flags: ['overheal'] });
  node(life, { id: 'lf_line', name: '生命線', row: 3, cost: 3, branchSpent: 3,
    mods: { hpPct: 0.12, lifesteal: 0.10 }, skill: 't_lifeline' });
  node(life, { id: 'lf_ult', name: '不死の理', row: 4, cost: 3, req: ['lf_line'],
    classes: ['berserker', 'bloodfiend', 'priest', 'exorcist', 'finalArbiter'],
    mods: { lifesteal: 0.20, hpPct: 0.15 }, flags: ['soulHarvest', 'lastStand'] });

  var byId = {};
  B.forEach(function (br) { br.nodes.forEach(function (n) { n.branchRef = br; byId[n.id] = n; }); });

  G.TREE = { branches: B, byId: byId };

  /* ===================== 判定ヘルパー ===================== */
  G.Tree = {
    /** 系統に投じたSPの合計 */
    branchSpent: function (hero, branchId) {
      var sum = 0;
      B.forEach(function (br) {
        if (br.id !== branchId) return;
        br.nodes.forEach(function (n) { if (hero.tree && hero.tree[n.id]) sum += n.cost; });
      });
      return sum;
    },
    /** 使用済みSPの総量 */
    totalSpent: function (hero) {
      var sum = 0;
      B.forEach(function (br) {
        br.nodes.forEach(function (n) { if (hero.tree && hero.tree[n.id]) sum += n.cost; });
      });
      return sum;
    },
    /** 取得済みノードの一覧 */
    taken: function (hero) {
      return Object.keys(hero.tree || {}).filter(function (id) { return byId[id]; }).map(function (id) { return byId[id]; });
    },
    /** ノードの取得可否を理由付きで返す */
    check: function (hero, id) {
      var n = byId[id];
      if (!n) return { ok: false, reasons: [] };
      var reasons = [];
      var owned = !!(hero.tree && hero.tree[id]);
      (n.req || []).forEach(function (r) {
        reasons.push({ label: '「' + byId[r].name + '」を取得している', ok: !!(hero.tree && hero.tree[r]) });
      });
      if (n.branchSpent) {
        reasons.push({ label: 'この系統に ' + n.branchSpent + 'SP 以上振っている',
                       ok: G.Tree.branchSpent(hero, n.branch) >= n.branchSpent });
      }
      if (n.classes) {
        var held = (hero.classHistory || []).concat([hero.classId]);
        reasons.push({
          label: '職業: ' + n.classes.map(function (c) { return G.CLASSES[c].name; }).join(' / '),
          ok: n.classes.some(function (c) { return held.indexOf(c) >= 0; })
        });
      }
      reasons.push({ label: 'SP ' + n.cost + ' が残っている', ok: (hero.sp || 0) >= n.cost });
      return { ok: !owned && reasons.every(function (r) { return r.ok; }), owned: owned, reasons: reasons, node: n };
    },
    /** 振り直しにかかるゴールド */
    respecCost: function (hero) {
      var spent = G.Tree.totalSpent(hero);
      return spent === 0 ? 0 : 60 + spent * 25;
    }
  };
})();
