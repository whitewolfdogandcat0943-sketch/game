/* allies.js - 仲間キャラクター
 *
 * 主人公は戦い方で職業が変わるが、仲間は固定職。
 * そのぶん役割がはっきりし、物語上の人物像とも噛み合う。
 * 加入は物語の進行（chapter）で決まる。
 */
G.ALLIES = {};
(function () {
  function ally(o) { G.ALLIES[o.id] = o; return o; }

  ally({
    id: 'mina', name: 'ミナ', classId: 'priest', arch: 'robed', hue: 48, accent: 200,
    role: '癒し手',
    join: 1,
    desc: '灰都の施療院で育った治し手。誰かが倒れることを、理屈ではなく体で拒む。',
    weapon: 'w_mace', armor: 'a_robe', acc: ['n_wardearring'],
    skills: ['heal', 'sanctuary', 'smite', 'aid_mend', 'aid_shelter']
  });

  ally({
    id: 'garo', name: 'ガロ', classId: 'swordsman', arch: 'brute', hue: 12, accent: 35,
    role: '盾役',
    join: 2,
    desc: '元・城塞守備隊の大男。守るべき城が無くなってからも、守り方しか知らない。',
    weapon: 'w_thornmace', armor: 'a_chain', acc: ['n_ironcharm'],
    skills: ['slash', 'thornGuard', 'aid_cover', 'aid_rally', 'crushArmor']
  });

  ally({
    id: 'sera', name: 'セラ', classId: 'mage', arch: 'robed', hue: 275, accent: 190,
    role: '術師',
    join: 3,
    desc: '塔を追われた研究者。人の心には疎いが、世界の理屈には誰よりも近い。',
    weapon: 'w_oakstaff', armor: 'a_robe', acc: ['n_sagering'],
    skills: ['fireball', 'iceLance', 'boltStrike', 'aid_amplify', 'aid_siphon']
  });

  G.ALLY_LIST = Object.keys(G.ALLIES).map(function (k) { return G.ALLIES[k]; });
})();
