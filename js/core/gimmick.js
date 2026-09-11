/* gimmick.js - ボス固有の仕掛け
 *
 * ボスが「HPと攻撃力が大きいだけの雑魚」になるのを避けるための層。
 * 数値をいくら盛っても、やることが同じなら手応えは増えず、戦闘が伸びるだけになる。
 * ここでは「戦い方そのものを変えさせる」仕掛けを、ボスのデータ側に持たせる。
 *
 * 敵データに gimmick: { kind: '...', ... } と書くと、この層が解釈する。
 * エンジン（battle.js）から呼ばれる口は3つだけ。
 *   onStart  戦闘開始時（写し身を並べる など）
 *   onRound  ラウンドの頭（呼び寄せる・飛ぶ・甦る など）
 *   onDeath  撃破時（本体が落ちたら写し身も砕ける など）
 *
 * どの仕掛けも「気づけば必ず崩せる」ようにしてある。
 * 崩し方が無い仕掛けは、噛み合わないビルドにとってただの壁になるため。
 */
G.Gimmick = (function () {
  var B = null;                       /* battle.js は後から読み込まれるので遅延で掴む */
  function api() { return B || (B = G.Battle); }

  function log(b, t, c) { api().log(b, t, c); }
  function alive(u) { return u.hp > 0; }

  /* ===================== 共通の道具 ===================== */

  /** 同じ見た目の随伴を1体作る。強さは本体からの割合で決める。 */
  function spawn(b, boss, o) {
    var u = api().makeEnemyUnit(boss.ref, Math.max(1, b.floor - (o.lvDown || 0)), b.enemies.length);
    u.name = o.name || u.name;
    u.isBoss = false;
    u.follow = 0;
    u.phases = []; u.gim = null;
    u.base.maxHp = Math.max(1, Math.round(u.base.maxHp * (o.hp != null ? o.hp : 0.25)));
    u.base.atk = Math.round(u.base.atk * (o.pw != null ? o.pw : 0.7));
    u.base.mag = Math.round(u.base.mag * (o.pw != null ? o.pw : 0.7));
    /* 随伴で稼がれると本体を無視して周回できてしまうので、実入りは落とす */
    u.exp = Math.round(u.exp * (o.rw != null ? o.rw : 0.15));
    u.gold = Math.round(u.gold * (o.rw != null ? o.rw : 0.15));
    api().refresh(u); u.hp = u.S.maxHp;
    u.bornOf = boss;
    return api().addEnemy(b, u);
  }

  /** 雑魚を1体呼ぶ。プールから選ぶので、場所ごとに顔ぶれが変わる。 */
  function spawnMob(b, boss, o) {
    var pool = (o.pool || []).map(function (id) { return G.ENEMY_BY_ID[id]; }).filter(Boolean);
    if (!pool.length) pool = G.ENEMIES.filter(function (e) { return !e.boss; });
    var def = pool[Math.floor(Math.random() * pool.length)];
    var u = api().makeEnemyUnit(def, Math.max(1, b.floor - (o.lvDown || 2)), b.enemies.length);
    u.exp = Math.round(u.exp * 0.5); u.gold = Math.round(u.gold * 0.5);
    u.summoned = true; u.bornOf = boss;
    return api().addEnemy(b, u);
  }

  function every(u, key, n) {
    var s = u.gimState;
    s[key] = (s[key] || 0) + 1;
    if (s[key] < n) return false;
    s[key] = 0;
    return true;
  }

  /* ===================== 仕掛けごとの中身 ===================== */

  var KINDS = {

    /* --- 写し身: 本体を落とすまで、倒しても甦る --- */
    clones: {
      onStart: function (b, u, g) {
        u.gimState.clones = [];
        for (var i = 0; i < (g.n || 3); i++) {
          u.gimState.clones.push(spawn(b, u, {
            name: u.name + 'の' + (g.word || '写し身'), hp: g.hp || 0.22, pw: g.pw || 0.65
          }));
        }
        log(b, '🪞 ' + u.name + ' が ' + (g.n || 3) + '体に分かれた！ ' +
          '本体を落とさないかぎり、' + (g.word || '写し身') + 'は甦る。', 'bad');
      },
      onRound: function (b, u, g) {
        if (!alive(u)) return;
        var back = (u.gimState.clones || []).filter(function (c) { return !alive(c); });
        if (!back.length) return;
        if (!every(u, 'reviveT', g.revive || 2)) return;
        back.forEach(function (c) {
          c.hp = Math.max(1, Math.round(c.S.maxHp * (g.reviveHp || 0.6)));
          c._dead = false;
          if (b.queue.indexOf(c) < 0) b.queue.push(c);
        });
        log(b, '🪞 砕けた' + (g.word || '写し身') + ' が ' + back.length + '体 立ち上がった。', 'bad');
      },
      onDeath: function (b, u, g) {
        /* 本体が落ちれば、写し身は寄る辺を失う */
        (u.gimState.clones || []).forEach(function (c) {
          if (!alive(c)) return;
          c.hp = 0; c._dead = true;
          log(b, '🪞 ' + c.name + ' が音もなく崩れた。', 'good');
        });
      }
    },

    /* --- 呼び寄せ: 数でこちらの手番を削ってくる --- */
    summon: {
      onRound: function (b, u, g) {
        if (!alive(u) || b.round < (g.from || 2)) return;
        if (!every(u, 'sumT', g.everyN || 3)) return;
        var mine = b.enemies.filter(function (e) { return e.summoned && alive(e); }).length;
        var room = Math.max(0, (g.cap || 4) - mine);
        var n = Math.min(g.n || 2, room);
        if (n <= 0) return;
        for (var i = 0; i < n; i++) spawnMob(b, u, g);
        log(b, '📣 ' + u.name + ' の呼び声。' + (g.word || '手勢') + ' が ' + n + '体 現れた！', 'bad');
      }
    },

    /* --- 喰らう: 取り巻きを食べて回復する。雑魚を残すと押し負ける --- */
    devour: {
      onRound: function (b, u, g) {
        if (!alive(u)) return;
        if (u.hp > u.S.maxHp * (g.from || 0.75)) return;
        var prey = b.enemies.filter(function (e) { return e !== u && alive(e); })
          .sort(function (x, y) { return x.hp - y.hp; })[0];
        if (!prey) return;
        prey.hp = 0; prey._dead = true;
        var got = Math.round(u.S.maxHp * (g.heal || 0.12));
        u.hp = Math.min(u.S.maxHp, u.hp + got);
        api().addBuff(b, u, 'atkPct', g.atk || 0.15, 99, true);
        log(b, '🍖 ' + u.name + ' が ' + prey.name + ' を喰らった！ HPが ' + got +
          ' 戻り、力が増した。', 'bad');
      }
    },

    /* --- 鎧: 剥がすまで刃が通らない。剥がす手段は「魔法」か「防御無視」 --- */
    shell: {
      onStart: function (b, u, g) {
        u.gimState.shell = Math.round(u.S.maxHp * (g.hp || 0.30));
        u.shellOn = true;
        log(b, '🛡 ' + u.name + ' は' + (g.word || '棘鎧') + 'を纏っている。' +
          'まとっているあいだ、刃は通りにくい。', 'bad');
      },
      onRound: function (b, u, g) {
        if (!alive(u) || u.shellOn) return;
        if (!every(u, 'shellT', g.regrow || 4)) return;
        u.gimState.shell = Math.round(u.S.maxHp * (g.hp || 0.30));
        u.shellOn = true;
        log(b, '🛡 ' + u.name + ' の' + (g.word || '棘鎧') + 'が再び閉じた。', 'bad');
      }
    },

    /* --- 飛翔: 空にいるあいだ物理が届かず、降りぎわに薙ぎ払う --- */
    aloft: {
      onRound: function (b, u, g) {
        if (!alive(u)) return;
        if (u.aloft) {
          u.aloft = false;
          log(b, '🌪 ' + u.name + ' が舞い降りる！', 'bad');
          var dmg = Math.round(u.S.mag * (g.land || 1.6));
          api().partyUnits(b).filter(alive).forEach(function (m) {
            api().applyRawDamage(b, m, dmg, '💥 ' + (g.word || '落着'), u, { aoe: true, noReflect: true });
          });
          return;
        }
        if (b.round < (g.from || 3)) return;
        if (!every(u, 'aloftT', g.everyN || 4)) return;
        u.aloft = true;
        log(b, '🌪 ' + u.name + ' が空へ舞い上がった！ 地上の得物は届かない。', 'bad');
      },
      onDeath: function (b, u) { u.aloft = false; }
    },

    /* --- 縛め: 鎖に繋がれているあいだは本気を出さない（フェンリル） ---
     *
     * 「開幕から強い」より「途中で顔が変わる」ほうが記憶に残る。
     * 縛られているあいだは弱いので、そこで削りきれるかを試される。 */
    unbound: {
      onStart: function (b, u, g) {
        u.gimState.bound = true;
        u.base.atk = Math.round(u.base.atk * (g.weak || 0.55));
        u.base.spd = Math.round(u.base.spd * (g.weak || 0.55));
        api().refresh(u);
        log(b, '⛓ ' + u.name + ' は' + (g.word || 'グレイプニル') + 'に縛められている。' +
          'この鎖が保つうちに決めろ。', 'bad');
      },
      /* 縛めが切れるのは残HPで決まるので、ラウンドの頭を待たずに、
       * 削った瞬間に見せる。短い戦いだと、待っているうちに終わってしまう
       * （封印体は2ラウンドで片が付くので、一度も解けずに終わっていた）。 */
      onDamage: function (b, u, g) { KINDS.unbound.onRound(b, u, g); },
      onRound: function (b, u, g) {
        if (!alive(u) || !u.gimState.bound) return;
        if (u.hp > u.S.maxHp * (g.at || 0.55)) return;
        u.gimState.bound = false;
        u.base.atk = Math.round(u.base.atk / (g.weak || 0.55) * (g.rage || 1.25));
        u.base.spd = Math.round(u.base.spd / (g.weak || 0.55));
        api().refresh(u);
        u.follow = Math.max(u.follow || 0, g.follow || 0.5);
        u.raged = false;
        log(b, '⛓💥 ' + (g.word || 'グレイプニル') + ' が千切れた！ ' + u.name + ' が解き放たれた。', 'bad');
      }
    },

    /* --- 顎: 咥え込んで場から外す（解き放たれたフェンリル） ---
     *
     * 一番弱っている者を咥える。咥えられた者は動けず、狙われもしない。
     * 待てば放されるが、それだけだと打てる手が無いので、
     * 大きな一撃を入れれば顎をこじ開けて引き剥がせる（battle.js 側）。 */
    maw: {
      onRound: function (b, u, g) {
        if (!alive(u)) return;
        var held = api().partyUnits(b).filter(function (m) { return m.mawed > 0; });
        held.forEach(function (m) {
          m.mawed--;
          if (m.mawed <= 0) { log(b, '🐺 ' + m.name + ' が牙から逃れた。', 'good'); return; }
          var crush = Math.round(m.S.maxHp * (g.crush || 0.08));
          api().applyRawDamage(b, m, crush, '🦷 牙', u, { noReflect: true });
        });
        if (held.length) return;
        if (b.round < (g.from || 2)) return;
        if (!every(u, 'mawT', g.everyN || 3)) return;
        var prey = api().partyUnits(b).filter(alive)
          .sort(function (x, y) { return x.hp / x.S.maxHp - y.hp / y.S.maxHp; })[0];
        if (!prey) return;
        prey.mawed = (g.turns || 2) + 1;
        log(b, '🐺 ' + u.name + ' が ' + prey.name + ' を咥え込んだ！ ' +
          '強く殴れば顎をこじ開けられる。', 'bad');
      },
      onDeath: function (b, u) {
        api().partyUnits(b).forEach(function (m) {
          if (m.mawed > 0) { m.mawed = 0; log(b, '🐺 顎が緩み、' + m.name + ' が落ちた。', 'good'); }
        });
      }
    },

    /* --- 毒の海: 世界を一巻きする蛇の吐息（ヨルムンガンド） --- */
    venom: {
      onRound: function (b, u, g) {
        if (!alive(u) || b.round < (g.from || 2)) return;
        if (!every(u, 'venT', g.everyN || 2)) return;
        var n = 0;
        api().partyUnits(b).filter(alive).forEach(function (m) {
          api().addStatus(b, m, 'poison', g.turns || 3, g.v || 0.05, u);
          n++;
        });
        if (n) log(b, '🐍 ' + u.name + ' の吐息が満ちる。パーティ全体が毒に侵された。', 'bad');
      }
    },

    /* --- 業火: 燃え広がり、長引くほど熱くなる（スルト） ---
     *
     * 削りきる速さそのものを問う仕掛け。ただし際限なく上がると
     * 「間に合わなければ必敗」になるので、上がり幅には天井を置く。 */
    conflagration: {
      onRound: function (b, u, g) {
        if (!alive(u) || b.round < (g.from || 2)) return;
        var step = Math.min((g.cap || 6), b.round - (g.from || 2) + 1);
        var dmg = Math.round(u.S.mag * (g.base || 0.30) * step);
        api().partyUnits(b).filter(alive).forEach(function (m) {
          api().applyRawDamage(b, m, dmg, '🔥 ' + (g.word || '業火'), u, { aoe: true, noReflect: true });
        });
        log(b, '🔥 ' + (g.word || '業火') + ' が燃え広がる（' + step + '段目）。', 'bad');
      }
    },

    /* --- 死者の招き: 倒した取り巻きが、一度だけ死者として起き上がる（ヘル） --- */
    reap: {
      onRound: function (b, u, g) {
        if (!alive(u)) return;
        var fallen = b.enemies.filter(function (e) {
          return e !== u && !alive(e) && !e.reaped;
        });
        if (!fallen.length) return;
        if (!every(u, 'reapT', g.everyN || 2)) return;
        var n = Math.min(g.n || 1, fallen.length);
        for (var i = 0; i < n; i++) {
          var e = fallen[i];
          e.reaped = true; e._dead = false;
          e.hp = Math.max(1, Math.round(e.S.maxHp * (g.hp || 0.5)));
          e.name = (g.word || '死者の') + e.name;
          e.exp = 0; e.gold = 0;
          if (b.queue.indexOf(e) < 0) b.queue.push(e);
        }
        log(b, '💀 ' + u.name + ' が招く。倒れた者が ' + n + '体 起き上がった。', 'bad');
      }
    },

    /* --- 根喰らい: 削っても戻る。継続ダメージを乗せているあいだは戻らない（ニーズヘッグ） ---
     *
     * 持続ダメージのビルドにだけ、はっきり答えが用意されている仕掛け。
     * 他のビルドは「戻る量を上回る速さ」で殴れば越えられる。 */
    gnaw: {
      onRound: function (b, u, g) {
        if (!alive(u)) return;
        if (api().hasStatus(u, 'poison') || api().hasStatus(u, 'burn')) {
          log(b, '🩸 ' + u.name + ' は蝕まれていて、根を啜れない。', 'good');
          return;
        }
        var got = Math.round(u.S.maxHp * (g.heal || 0.06));
        if (u.hp >= u.S.maxHp) return;
        u.hp = Math.min(u.S.maxHp, u.hp + got);
        log(b, '🌳 ' + u.name + ' が世界樹の根を啜り、HPが ' + got + ' 戻った。', 'bad');
      }
    },

    /* --- 吸魂: こちらの加護を「ひとつだけ」吸い取って自分のものにする ---
     *
     * 最初は全員の強化を根こそぎ剥がす形にしていたが、支援を積むビルドが
     * 立ち行かなくなり、第5章だけで全滅751回という壁になった。
     * 一番効いている一枚だけを持っていく形にすると、
     * 「掛け直す手番を取られる」痛みは残したまま、戦いが成立する。 */
    siphon: {
      onRound: function (b, u, g) {
        if (!alive(u) || b.round < (g.from || 2)) return;
        if (!every(u, 'sipT', g.everyN || 3)) return;
        var best = null, owner = null;
        api().partyUnits(b).filter(alive).forEach(function (m) {
          (m.buffs || []).filter(function (x) { return x.v > 0 && x.t > 0; }).forEach(function (x) {
            if (!best || x.v > best.v) { best = x; owner = m; }
          });
        });
        if (best) {
          api().addBuff(b, u, best.k, best.v * (g.rate || 0.4), 3, true);
          best.t = 0;
          log(b, '🕳 ' + u.name + ' が ' + owner.name + ' の' + (g.word || '加護') +
            'をひとつ吸い取った。', 'bad');
          return;
        }
        /* 奪う加護が無ければ、術の元を奪う。
         * 支援を積まないビルドに対して「何も起きない主」にならないようにするため。 */
        var lost = 0;
        api().partyUnits(b).filter(alive).forEach(function (m) {
          var take = Math.round(m.S.maxMp * (g.mp || 0.12));
          take = Math.min(take, m.mp);
          if (take > 0) { m.mp -= take; lost += take; }
        });
        if (lost) log(b, '🕳 ' + u.name + ' が虚へ吸い込む。パーティのMPが ' + lost + ' 失われた。', 'bad');
      }
    }
  };

  /* ===================== エンジンからの口 ===================== */

  function run(hook, b, u) {
    if (!u || !u.gim) return;
    var k = KINDS[u.gim.kind];
    if (!k || !k[hook]) return;
    k[hook](b, u, u.gim);
  }

  return {
    onStart: function (b, u) { run('onStart', b, u); },
    onRound: function (b, u) { run('onRound', b, u); },
    onDamage: function (b, u) { run('onDamage', b, u); },
    onDeath: function (b, u) { run('onDeath', b, u); },
    KINDS: KINDS
  };
})();
