/* save.js - localStorage への永続化（メタ進行とラン途中経過） */
G.Save = (function () {
  var META_KEY = 'buildsaga.meta.v1';
  var RUN_KEY = 'buildsaga.run.v1';

  function defaultMeta() {
    return { mythics: [], classesSeen: [], bestFloor: 1, runs: 0, wins: 0, deaths: 0,
             portraitStyle: 'anime', diff: 'normal' };
  }

  function safeGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, val) {
    try { window.localStorage.setItem(key, val); return true; } catch (e) { return false; }
  }
  function safeDel(key) {
    try { window.localStorage.removeItem(key); } catch (e) {}
  }

  function loadMeta() {
    var raw = safeGet(META_KEY);
    if (!raw) return defaultMeta();
    try {
      var m = JSON.parse(raw), d = defaultMeta();
      for (var k in d) if (!(k in m)) m[k] = d[k];
      /* 存在しないIDを掃除 */
      m.mythics = (m.mythics || []).filter(function (id) { return !!G.ACC_BY_ID[id]; });
      m.classesSeen = (m.classesSeen || []).filter(function (id) { return !!G.CLASSES[id]; });
      return m;
    } catch (e) { return defaultMeta(); }
  }

  function saveMeta(state) { safeSet(META_KEY, JSON.stringify(state.meta)); }

  function saveRun(state) {
    if (!state.run || !state.run.active) { safeDel(RUN_KEY); return; }
    /* パーティは主人公＋仲間。主人公は hero として別に保存するので、
     * 仲間だけを保存して読み込み時に組み直す。 */
    var allies = (state.party || []).filter(function (m) { return m !== state.hero; });
    var data = { hero: state.hero, run: state.run, allies: allies,
                 mode: state.mode || 'tower', story: state.story || null,
                 /* 町のどこに立っていたか。次に開いたとき、同じ場所から続ける。 */
                 field: state.field || null,
                 diff: state.diff || 'normal' };
    safeSet(RUN_KEY, JSON.stringify(data));
  }

  function loadRun() {
    var raw = safeGet(RUN_KEY);
    if (!raw) return null;
    try {
      var d = JSON.parse(raw);
      if (!d.hero || !d.run || !G.CLASSES[d.hero.classId]) return null;
      /* データ更新で消えたIDを掃除 */
      d.hero.bag.gear = d.hero.bag.gear.filter(function (id) { return !!G.GEAR[id]; });
      d.hero.bag.acc = d.hero.bag.acc.filter(function (id) { return !!G.ACC_BY_ID[id]; });
      d.hero.equip.acc = (d.hero.equip.acc || []).map(function (id) { return G.ACC_BY_ID[id] ? id : null; });
      while (d.hero.equip.acc.length < 4) d.hero.equip.acc.push(null);
      if (d.hero.sp == null) d.hero.sp = 0;
      if (!d.hero.mastery) d.hero.mastery = {};
      Object.keys(d.hero.mastery).forEach(function (cid) {
        if (!G.CLASSTREE[cid]) delete d.hero.mastery[cid];
      });
      if (!d.hero.style) d.hero.style = G.Style.newRecord();
      if (!d.hero.tree) d.hero.tree = {};
      Object.keys(d.hero.tree).forEach(function (id) {
        if (!G.TREE.byId[id]) delete d.hero.tree[id];
      });
      if (d.hero.equip.weapon && !G.GEAR[d.hero.equip.weapon]) d.hero.equip.weapon = null;
      if (d.hero.equip.armor && !G.GEAR[d.hero.equip.armor]) d.hero.equip.armor = null;
      /* 仲間を復元する。主人公と同じ参照になるよう party を組み直す。 */
      d.allies = (d.allies || []).filter(function (m) {
        return m && G.CLASSES[m.classId] && G.ALLIES[m.allyId];
      });
      d.allies.forEach(function (m) {
        var def = G.ALLIES[m.allyId];
        /* 固有技。旧データの fixedSkills からも拾う。 */
        if (!m.signature) m.signature = (m.fixedSkills || def.signature || []).slice();
        delete m.fixedSkills;
        m.signature = m.signature.filter(function (id) { return !!G.SKILLS[id]; });
        if (!m.tree) m.tree = {};
        if (!m.mastery) m.mastery = {};
        if (!m.items) m.items = {};
        if (!m.bag) m.bag = { gear: [], acc: [] };
        if (m.sp == null) m.sp = 0;
        if (!m.style) m.style = G.Style.newRecord();
        if (!m.classHistory) m.classHistory = [];
        /* 系統の外に出ている職業は初期職へ戻す（データ更新で系統が変わった場合） */
        if (!G.CLASSES[m.classId] || (def.line || []).indexOf(m.classId) < 0) m.classId = def.classId;
        Object.keys(m.mastery).forEach(function (cid) { if (!G.CLASSTREE[cid]) delete m.mastery[cid]; });
        Object.keys(m.tree).forEach(function (id) { if (!G.TREE.byId[id]) delete m.tree[id]; });
        m.equip.acc = (m.equip.acc || []).map(function (id) { return G.ACC_BY_ID[id] ? id : null; });
        while (m.equip.acc.length < 4) m.equip.acc.push(null);
        if (m.equip.weapon && !G.GEAR[m.equip.weapon]) m.equip.weapon = null;
        if (m.equip.armor && !G.GEAR[m.equip.armor]) m.equip.armor = null;
      });
      d.party = [d.hero].concat(d.allies);
      if (!G.DIFF_BY_ID[d.diff]) d.diff = 'normal';
      /* 物語の進行。章や場所が消えていたら塔モードとして読む。 */
      d.mode = d.mode === 'story' ? 'story' : 'tower';
      if (d.mode === 'story') {
        var st = d.story;
        var okCh = st && G.STORY.CHAPTERS.some(function (c) { return c.id === st.ch; });
        if (!okCh) { d.mode = 'tower'; d.story = null; }
        else {
          if (!st.cleared) st.cleared = {};
          if (!st.flags) st.flags = {};
          if (st.place && !G.STORY.PLACE_BY_ID[st.place]) st.place = null;
          if (st.dungeon && !G.STORY.PLACE_BY_ID[st.dungeon.id]) st.dungeon = null;
          /* 分かれ道と頼まれごとは後から足したもの。古い保存には無い。 */
          if (!st.errands) st.errands = { taken: {}, done: {} };
          if (!st.errands.taken) st.errands.taken = {};
          if (!st.errands.done) st.errands.done = {};
          if (st.dungeon) {
            /* 保存時に無かった道が選ばれていることにならないよう、選び直しから始める */
            if (!st.dungeon.paths || st.dungeon.pathsAt !== st.dungeon.at) {
              st.dungeon.path = null; st.dungeon.paths = null; st.dungeon.pathsAt = -1;
            }
          }
          /* 地図が消えている／作り替えられた場合は、町の入口からやり直す */
          if (d.field && !(G.MAPS || {})[d.field.map]) d.field = null;
          if (d.field) { d.field.walking = false; d.field.ox = 0; d.field.oy = 0; }
          /* データから消えた用事は、受けたままにしない */
          [st.errands.taken, st.errands.done].forEach(function (m) {
            Object.keys(m).forEach(function (k) {
              if (!(G.ERRAND_BY_ID || {})[k]) delete m[k];
            });
          });
        }
      } else { d.story = null; d.field = null; }
      return d;
    } catch (e) { return null; }
  }

  function clearRun() { safeDel(RUN_KEY); }
  function clearAll() { safeDel(RUN_KEY); safeDel(META_KEY); }

  return { defaultMeta: defaultMeta, loadMeta: loadMeta, saveMeta: saveMeta,
           saveRun: saveRun, loadRun: loadRun, clearRun: clearRun, clearAll: clearAll };
})();
