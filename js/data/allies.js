/* allies.js - 仲間キャラクター
 *
 * 仲間も主人公と同じく転職する。ただし進める先は「系統（line）」で限る。
 * 誰でも何にでもなれると人物像が崩れるので、
 * その人が選ぶに足る道だけを用意し、その中で自由に育てる。
 *
 * signature は系統に関わらず常に持つ固有技。転職しても失われない。
 * 「職業は変わっても、この人がやることは変わらない」という部分。
 *
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
    /* 守りと浄化の道。行き着く先は、この人にしかない2つ。 */
    line: ['priest', 'exorcist', 'guardian', 'dawnMother', 'undyingAegis'],
    signature: ['aid_mend', 'aid_shelter']
  });

  ally({
    id: 'garo', name: 'ガロ', classId: 'swordsman', arch: 'brute', hue: 12, accent: 35,
    role: '盾役',
    join: 2,
    desc: '元・城塞守備隊の大男。{hero}と同い年だが、体だけは頭ひとつ大きい。' +
          '守るべき城が無くなってからも、守り方しか知らない。',
    weapon: 'w_thornmace', armor: 'a_chain', acc: ['n_ironcharm'],
    /* 守るか、猛るか。どちらに転んでも前に立つことは変わらない。 */
    line: ['swordsman', 'guardian', 'berserker', 'ironBastion', 'wrathBulwark'],
    signature: ['aid_cover', 'aid_rally']
  });

  ally({
    id: 'sera', name: 'セラ', classId: 'mage', arch: 'robed', hue: 275, accent: 190,
    role: '術師',
    join: 3,
    desc: '塔を追われた研究者。人の心には疎いが、世界の理屈には誰よりも近い。',
    weapon: 'w_oakstaff', armor: 'a_robe', acc: ['n_sagering'],
    /* 元素・嵐・呪。世界の理屈へ寄る道ばかりで、剣を持つ道は無い。 */
    line: ['mage', 'elementalist', 'stormcaller', 'hexer', 'worldTheorem', 'stillCalamity'],
    signature: ['aid_amplify', 'aid_siphon']
  });

  G.ALLY_LIST = Object.keys(G.ALLIES).map(function (k) { return G.ALLIES[k]; });
})();
