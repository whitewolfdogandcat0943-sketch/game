/* check-classtrees.js - 職業ツリー37本の中身を機械的に点検する
 *
 *   node tools/check-classtrees.js        問題だけを出す
 *   node tools/check-classtrees.js -v     全職業の中身を並べる
 *
 * 「3段×2択」という形は守れていても、
 *   ・片方が空っぽ / 両方が同じ効果で選ぶ意味がない
 *   ・その職業と関係のない数値が伸びる
 *   ・文字化けや書きかけの説明が残っている
 * といった中身の問題は形だけ見ても分からないので、ここで潰す。 */
const { loadEngine } = require('./load-data.js');
const G = loadEngine();

const problems = [];
function ng(cls, msg) { problems.push('[' + (G.CLASSES[cls] ? G.CLASSES[cls].name : cls) + '] ' + msg); }

/* 職業の性格を、その職業自身の mods / flags / 解放条件から読む。
 * ここを手書きの対応表にすると、職業を足したときに更新を忘れる。 */
function axesOf(obj) {
  const s = G.Style.scoreOf({ mods: obj.mods || {}, flags: obj.flags || [] });
  return s;
}
function topAxes(score, n) {
  return G.Style.AXIS_IDS.slice()
    .filter(a => score[a] > 0)
    .sort((x, y) => score[y] - score[x])
    .slice(0, n);
}

/* 素の日本語かどうか（文字化け・書きかけの検出）。
 * キリル文字やハングルが混ざっていたら、まず書き間違い。 */
const BAD_CHARS = /[Ѐ-ӿ가-힯]/;

const verbose = process.argv.indexOf('-v') >= 0;

Object.keys(G.CLASSTREE).forEach(cid => {
  const cls = G.CLASSES[cid];
  const rows = G.CLASSTREE[cid];
  const clsAxes = topAxes(axesOf(cls), 4);
  const seenNames = {};
  const lines = [];

  if (rows.length !== 3) ng(cid, '段数が ' + rows.length + '（3であるべき）');

  rows.forEach((r, i) => {
    const tier = i + 1;
    [['a', r.a], ['b', r.b]].forEach(([side, n]) => {
      if (!n) { ng(cid, tier + '段目の' + side + '側が無い'); return; }
      if (!n.name) ng(cid, tier + '段目に名前が無い');
      if (!n.desc) ng(cid, tier + '段目「' + n.name + '」に説明が無い');
      if (BAD_CHARS.test(n.name + n.desc)) ng(cid, tier + '段目「' + n.name + '」に文字化けがある');
      if (seenNames[n.name]) ng(cid, '同じ名前のノードが2つある: ' + n.name);
      seenNames[n.name] = true;

      const hasMods = n.mods && Object.keys(n.mods).length;
      const hasFlags = n.flags && n.flags.length;
      if (!hasMods && !hasFlags && !n.skill) ng(cid, tier + '段目「' + n.name + '」が何もしない');

      Object.keys(n.mods || {}).forEach(k => {
        if (!G.MODKEYS[k]) ng(cid, tier + '段目「' + n.name + '」に未知の指標 ' + k);
      });
      (n.flags || []).forEach(f => {
        if (!G.FLAGS[f]) ng(cid, tier + '段目「' + n.name + '」に未知のフラグ ' + f);
      });
      if (n.skill && !G.SKILLS[n.skill]) ng(cid, tier + '段目「' + n.name + '」に未知のスキル ' + n.skill);
    });

    /* 2択が同じ内容だと、選ぶ意味がない */
    if (r.a && r.b) {
      const sig = x => JSON.stringify([x.mods || null, (x.flags || []).slice().sort(), x.skill || null]);
      if (sig(r.a) === sig(r.b)) ng(cid, tier + '段目の2択が同じ内容（選ぶ意味がない）');
    }

    /* 3段目はスキルを配る段。片方だけだと、選択が「スキルを取るか捨てるか」になる */
    if (tier === 3 && r.a && r.b) {
      const n1 = !!r.a.skill, n2 = !!r.b.skill;
      if (n1 !== n2) ng(cid, '3段目でスキルを配るのが片方だけ（' +
        (n1 ? r.a.name : r.b.name) + 'のみ）');
    }

    lines.push('   ' + tier + '段  ' +
      (r.a ? r.a.name : '—').padEnd(6) + ' / ' + (r.b ? r.b.name : '—'));
  });

  /* その職業の得意分野と、ツリーで伸びるものが噛み合っているか */
  const treeScore = G.Style.empty();
  rows.forEach(r => [r.a, r.b].forEach(n => {
    if (!n) return;
    const s = axesOf(n);
    G.Style.AXIS_IDS.forEach(a => { treeScore[a] += s[a]; });
  }));
  const treeAxes = topAxes(treeScore, 4);
  const shared = treeAxes.filter(a => clsAxes.indexOf(a) >= 0);
  if (clsAxes.length && treeAxes.length && !shared.length) {
    ng(cid, '職業の得意（' + clsAxes.map(G.Style.axisName).join('・') +
      '）とツリーで伸びるもの（' + treeAxes.map(G.Style.axisName).join('・') + '）が噛み合っていない');
  }

  if (verbose) {
    console.log('\n■ ' + cls.name + '（' + (cls.tier === 3 ? '最上級' : cls.tier === 2 ? '上級' : '初級') + '）' +
      (cls.ally ? ' ［' + G.ALLIES[cls.ally].name + '専用］' : ''));
    lines.forEach(l => console.log(l));
    console.log('   得意: ' + (clsAxes.map(G.Style.axisName).join('・') || '—') +
      ' ／ ツリー: ' + (treeAxes.map(G.Style.axisName).join('・') || '—'));
  }
});

/* --- 2択の重さが釣り合っているか（警告のみ） ---
 * 片方が明らかに強いと、選択が「正解を選ぶだけ」になって分岐の意味がなくなる。
 * 厳密な強さは測れないので、伸びる数値の量とフラグ・スキルの数で粗く見る。 */
const warns = [];
/* 「継続+1ターン」は数字としては1だが、実際の重みは効果量+25%くらいある。
 * 金策系は戦闘力ではないので割り引く。ここを素直に足すと、
 * 威力と持続の2択が全部「偏っている」と出てしまう。 */
const TURN_KEYS = { buffTurns: 1, debuffTurns: 1, dotTurns: 1 };
const UTILITY_KEYS = { goldUp: 0.25, dropUp: 0.25 };
function weight(n) {
  if (!n) return 0;
  let w = 0;
  Object.keys(n.mods || {}).forEach(k => {
    const v = Math.abs(n.mods[k]);
    if (TURN_KEYS[k]) { w += v * 25; return; }
    const util = UTILITY_KEYS[k];
    /* 割合(0.12)と実数(20)を同じ土俵に載せる */
    const base = (G.MODKEYS[k] && G.MODKEYS[k].kind === 'pct') ? v * 100 : v;
    w += util ? base * util : base;
  });
  w += (n.flags || []).length * 25;
  if (n.skill) w += 25;
  return w;
}
Object.keys(G.CLASSTREE).forEach(cid => {
  G.CLASSTREE[cid].forEach((r, i) => {
    const wa = weight(r.a), wb = weight(r.b);
    const hi = Math.max(wa, wb), lo = Math.min(wa, wb);
    if (lo > 0 && hi / lo >= 2.5) {
      warns.push('[' + G.CLASSES[cid].name + '] ' + (i + 1) + '段目が偏っている: ' +
        r.a.name + '(' + Math.round(wa) + ') 対 ' + r.b.name + '(' + Math.round(wb) + ')');
    }
  });
});

/* --- 使い回しの検出 --- */
const sigs = {};
Object.keys(G.CLASSTREE).forEach(cid => {
  const sig = JSON.stringify(G.CLASSTREE[cid].map(r =>
    [r.a && r.a.name, r.b && r.b.name, r.a && r.a.mods, r.b && r.b.mods]));
  if (sigs[sig]) ng(cid, 'ツリーが ' + G.CLASSES[sigs[sig]].name + ' とまったく同じ（使い回し）');
  else sigs[sig] = cid;
});

/* 全体の統計 */
let withSkill = 0, total = 0, flagN = 0, modN = 0;
Object.keys(G.CLASSTREE).forEach(cid => {
  G.CLASSTREE[cid].forEach(r => [r.a, r.b].forEach(n => {
    if (!n) return;
    total++;
    if (n.skill) withSkill++;
    if (n.flags && n.flags.length) flagN++;
    if (n.mods && Object.keys(n.mods).length) modN++;
  }));
});
console.log('\n職業ツリー ' + Object.keys(G.CLASSTREE).length + '本 ／ ノード ' + total +
  '（数値が伸びる ' + modN + ' ／ 特殊効果つき ' + flagN + ' ／ スキル習得 ' + withSkill + '）');
console.log('分岐の数: 3段×2択 = 1職業あたり ' + Math.pow(2, 3) + '通り、全体で ' +
  Object.keys(G.CLASSTREE).length * 8 + '通り');

if (warns.length) {
  console.log('\n△ 釣り合いが気になる段 ' + warns.length + ' 件（不具合ではない）');
  warns.forEach(w => console.log('  ' + w));
}

if (problems.length) {
  console.log('\n!! 問題 ' + problems.length + ' 件');
  problems.forEach(p => console.log('  ' + p));
  process.exit(1);
}
console.log('\n問題なし');
