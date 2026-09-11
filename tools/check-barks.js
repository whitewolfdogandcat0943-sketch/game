/* check-barks.js - 戦闘中の掛け合いが、出るべきときに出て、出すぎないかを見る
 *
 * 台詞は仕様ではなく手触りなので、数で確かめるところと、目で読むところを分ける。
 *   - 数: 1戦あたりの発話数、喋らない戦闘の割合、台詞の使用率
 *   - 目: 実際に流れた戦闘ログを1戦ぶん、そのまま出す
 *
 * 使い方:
 *   node tools/check-barks.js            物語で50戦
 *   node tools/check-barks.js --realm norse
 *   node tools/check-barks.js --show     1戦ぶんのログを読む
 */
const { loadEngine, newState } = require('./load-data.js');

function ai(G, b) {
  const u = b.actor;
  const foes = G.Battle.aliveEnemies(b);
  const party = G.Battle.partyUnits(b);
  const sks = G.Stats.skillList(u.hero).map(id => G.SKILLS[id])
    .filter(s => (s.mp || 0) <= u.mp && (s.kind === 'phys' || s.kind === 'mag'));
  const use = sks.sort((x, y) => (y.power || 0) - (x.power || 0))[0] || G.SKILLS.attack;
  return { type: 'skill', id: use.id, target: { foe: b.enemies.indexOf(foes[0]) } };
}

function main() {
  const G = loadEngine();
  const ri = process.argv.indexOf('--realm');
  const realm = ri >= 0 ? process.argv[ri + 1] : 'mid';
  const show = process.argv.indexOf('--show') >= 0;

  const st = newState(G);
  G.Story.begin(st, 'カイ');
  /* 仲間を全員そろえる。掛け合いは相手が要る */
  for (let i = 0; i < 3; i++) { G.Story.joinForChapter(st); G.Story.nextChapter(st); }
  if (realm === 'norse') st.mode = 'tower';
  st.run.floor = realm === 'norse' ? 12 : 6;

  const N = 60;
  let spoke = 0, lines = 0, mostInOne = 0, sample = null;
  const seen = {};
  const perRound = {};

  for (let i = 0; i < N; i++) {
    /* 毎戦まっさらな状態から始める。傷を持ち越すと後半は倒れたまま戦うことになり、
     * 「喋る人が場に居ない」せいで台詞が出ない数字になってしまう */
    G.Run.healParty(st, 1, 1);
    const isBoss = i % 5 === 0;
    const enc = isBoss
      ? G.Run.makeEncounter(st, 'boss')
      : G.Run.makeEncounter(st, i % 3 === 0 ? 'elite' : 'normal');
    const b = G.Battle.start(st, enc.units, { isBoss: !!enc.isBoss });
    let guard = 0;
    while (!b.over && guard++ < 300) {
      if (!b.awaiting) { G.Battle.advance(b); continue; }
      G.Battle.playerAction(b, ai(G, b));
    }
    const said = b.log.filter(l => l.c === 'bark');
    if (said.length) spoke++;
    lines += said.length;
    said.forEach(l => { seen[l.t] = (seen[l.t] || 0) + 1; });
    /* 「1ラウンドに1回まで」を破っていないか、発話の塊で数える */
    const n = b._bk ? b._bk.n : 0;
    perRound[n] = (perRound[n] || 0) + 1;
    if (n > mostInOne) mostInOne = n;
    if (!sample && said.length >= 2) sample = b;
  }

  console.log('場:', realm === 'norse' ? '塔（北欧）' : '物語（相刻）');
  console.log('戦闘数:', N, '／ 誰かが喋った戦闘:', spoke, '(' + Math.round(spoke / N * 100) + '%)');
  console.log('台詞の総行数:', lines, '／ 1戦あたり', (lines / N).toFixed(1), '行');
  console.log('1戦の発話回数の分布:', JSON.stringify(perRound));
  console.log('使われた台詞の種類:', Object.keys(seen).length, '/', G.BARKS.length, '本（掛け合いは2行で1本）');

  const problems = [];
  if (mostInOne > 3) problems.push('1戦で ' + mostInOne + ' 回喋っている（上限3のはず）');
  if (spoke / N > 0.95) problems.push('ほぼ全戦で喋っている。黙る戦闘が無いと台詞が背景になる');
  if (spoke / N < 0.25) problems.push('喋らなさすぎ。掛け合いが目に入らない');
  if (lines / N > 4) problems.push('1戦あたりの行数が多い（' + (lines / N).toFixed(1) + '行）');

  if (show && sample) {
    console.log('\n--- 実際の戦闘ログ（1戦ぶん） ---');
    sample.log.forEach(l => console.log((l.c === 'bark' ? '  ' : '') + l.t.replace(/<[^>]+>/g, '')));
  }

  console.log('');
  if (problems.length) { problems.forEach(p => console.log('✗ ' + p)); process.exit(1); }
  console.log('掛け合いは出るべきときに出て、出すぎていない');
}
main();
