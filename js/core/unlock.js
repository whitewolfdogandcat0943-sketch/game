/* unlock.js - 職業解放条件 / ミシック取得条件の判定 */
G.Unlock = (function () {

  /** 判定に使う文脈を作る */
  function ctx(state, battle) {
    var hero = state.hero;
    var c = G.Stats.compute(hero);
    return {
      S: c.S, flags: c.flags, hero: hero, run: state.run, meta: state.meta,
      b: battle || null,
      mythicCount: G.Stats.rarityCount(hero, 'mythic'),
      legendCount: G.Stats.rarityCount(hero, 'legend'),
      normalCount: G.Stats.rarityCount(hero, 'normal')
    };
  }

  /** 職業への転職可否。理由付きで返す。 */
  function classCheck(clsId, c) {
    var cls = G.CLASSES[clsId];
    var res = { cls: cls, conds: [], ok: false, fromOk: true };
    if (cls.tier === 1) { res.ok = (c.hero.classId !== clsId); return res; }

    var held = (c.hero.classHistory || []).concat([c.hero.classId]);
    res.fromOk = !cls.from || cls.from.some(function (f) { return held.indexOf(f) >= 0; });
    res.conds.push({
      label: '前提職: ' + (cls.from || []).map(function (f) { return G.CLASSES[f].name; }).join(' / '),
      ok: res.fromOk
    });
    (cls.req || []).forEach(function (r) {
      res.conds.push({ label: r.label, ok: !!r.test(c) });
    });
    res.ok = res.conds.every(function (x) { return x.ok; }) && c.hero.classId !== clsId;
    return res;
  }

  /** 転職可能な職業一覧 */
  function availableClasses(state) {
    var c = ctx(state);
    return G.CLASS_LIST.map(function (cl) { return classCheck(cl.id, c); });
  }

  /** ミシック条件の判定。新規発見分を返す（メタ保存＋インベントリ付与は呼び出し側） */
  function checkMythics(state, battle, when) {
    var c = ctx(state, battle);
    var found = [];
    G.MYTHICS.forEach(function (my) {
      if (state.meta.mythics.indexOf(my.id) >= 0) return;
      if (my.cond.when !== when) return;
      if (when === 'battleEnd' && !battle) return;
      var ok = false;
      try { ok = !!my.cond.test(c); } catch (e) { ok = false; }
      if (ok) found.push(my);
    });
    return found;
  }

  /** 条件の達成状況を進捗テキストにする（図鑑用） */
  function mythicStatus(state, id) {
    return state.meta.mythics.indexOf(id) >= 0 ? '発見済' : '未発見';
  }

  return { ctx: ctx, classCheck: classCheck, availableClasses: availableClasses,
           checkMythics: checkMythics, mythicStatus: mythicStatus };
})();
