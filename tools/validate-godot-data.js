/* validate-godot-data.js - Godot側スクリプトが読むキーが、JSONに実在するか検証する
 *
 *   node tools/validate-godot-data.js
 *
 * GDScript はここで実行できないので、せめて「データ契約」だけは自動で守る。
 */
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..', 'godot', 'data');

const problems = [];
const read = n => JSON.parse(fs.readFileSync(path.join(DIR, n), 'utf8'));

function need(cond, msg) { if (!cond) problems.push(msg); }

const el = read('elements.json');
need(el.magic_elements && el.magic_elements.length === 6, 'elements: magic_elements が6件でない');
need(typeof el.weak_mult === 'number' && typeof el.resist_mult === 'number', 'elements: 倍率が数値でない');
need(el.flags && Object.keys(el.flags).length > 0, 'elements: flags が空');
need(el.modkeys && el.modkeys.critRate, 'elements: modkeys が不足');

const classes = read('classes.json');
const classIds = Object.keys(classes);
need(classIds.length === 25, `classes: 25件でなく ${classIds.length}件`);
for (const [id, c] of Object.entries(classes)) {
  for (const k of ['name', 'tier', 'base', 'grow', 'skills']) {
    need(c[k] !== undefined, `classes.${id}: ${k} がない`);
  }
  for (const k of ['hp', 'mp', 'str', 'int', 'vit', 'agi', 'luk']) {
    need(typeof c.base[k] === 'number', `classes.${id}.base: ${k} がない`);
    need(typeof c.grow[k] === 'number', `classes.${id}.grow: ${k} がない`);
  }
  (c.req || []).forEach((r, i) => need(r.d && r.d.t, `classes.${id}.req[${i}]: 記述子 d がない`));
  (c.from || []).forEach(f => need(classes[f], `classes.${id}: 前提職 ${f} が存在しない`));
}

const skills = read('skills.json');
for (const [id, c] of Object.entries(classes)) {
  (c.skills || []).forEach(s => need(skills[s], `classes.${id}: スキル ${s} が存在しない`));
}

const enemies = read('enemies.json');
need(enemies.length > 0, 'enemies: 空');
enemies.forEach(e => {
  for (const k of ['id', 'name', 'tier', 'hp', 'atk', 'mag', 'def', 'res', 'spd', 'exp', 'gold']) {
    need(e[k] !== undefined, `enemies.${e.id}: ${k} がない`);
  }
  need(Array.isArray(e.weak) && Array.isArray(e.resist), `enemies.${e.id}: weak/resist が配列でない`);
});

const accs = read('accessories.json');
need(accs.length === 138, `accessories: 138件でなく ${accs.length}件`);
const myth = accs.filter(a => a.rarity === 'mythic');
need(myth.length === 24, `ミシックが24件でなく ${myth.length}件`);
myth.forEach(a => {
  need(a.cond && a.cond.code, `accessories.${a.id}: cond.code がない`);
  need(a.cond && a.cond.when, `accessories.${a.id}: cond.when がない`);
});

const gear = read('gear.json');
need(gear.weapons.length + gear.armors.length === 27, 'gear: 27件でない');
gear.weapons.forEach(w => need(w.el !== undefined, `gear.${w.id}: el がない（通常攻撃の属性に使う）`));

const tree = read('skilltree.json');
need(tree.length === 9, `skilltree: 9系統でなく ${tree.length}`);
let nodeCount = 0;
const nodeIds = new Set();
tree.forEach(br => {
  need(br.id && br.name, 'skilltree: 系統に id/name がない');
  (br.nodes || []).forEach(n => {
    nodeCount++; nodeIds.add(n.id);
    need(n.id && n.name && n.cost, `skilltree: ノード ${n.id} の必須項目がない`);
    (n.classes || []).forEach(c => need(classes[c], `skilltree.${n.id}: 職業 ${c} が存在しない`));
    if (n.skill) need(skills[n.skill], `skilltree.${n.id}: スキル ${n.skill} が存在しない`);
  });
});
tree.forEach(br => (br.nodes || []).forEach(n =>
  (n.req || []).forEach(r => need(nodeIds.has(r), `skilltree.${n.id}: 前提ノード ${r} が存在しない`))));
need(nodeCount === 54, `skilltree: 54ノードでなく ${nodeCount}`);

const ct = read('classtree.json');
need(Object.keys(ct).length === 25, `classtree: 25職でなく ${Object.keys(ct).length}`);
for (const [cid, rows] of Object.entries(ct)) {
  need(classes[cid], `classtree: 職業 ${cid} が存在しない`);
  need(rows.length === 3, `classtree.${cid}: 3段でない`);
  rows.forEach(r => {
    need(typeof r.tier === 'number' && typeof r.need === 'number', `classtree.${cid}: tier/need がない`);
    ['a', 'b'].forEach(w => {
      need(r[w] && r[w].name, `classtree.${cid} 段${r.tier}: ${w} がない`);
      if (r[w] && r[w].skill) need(skills[r[w].skill], `classtree.${cid}: スキル ${r[w].skill} が存在しない`);
    });
  });
}

/* SkillRunner（Godot側）が解釈できる形かの検証 */
const KNOWN_KINDS = ['phys', 'mag', 'heal', 'buff', 'util'];
const KNOWN_TARGETS = ['one', 'all', 'random', 'self'];
const KNOWN_SPECIALS = ['hybrid', 'speedScale', 'reflectScale', 'itemScale', 'mythicScale', 'allElem'];
/* SkillRunner が実際に処理している eff キー。ここに無いものは黙って無視されるので、
 * 取りこぼしに気づけるよう一覧で出す。 */
const HANDLED_EFF = new Set([
  'critBonus', 'critBonusDmg', 'alwaysCrit', 'defIgnore', 'aoeBonus', 'drain', 'execute',
  'altElement', 'burn', 'poison', 'freeze', 'shock',
  'buffs', 'healMaxPct', 'healSelf', 'mpGain', 'barrier', 'hpCost', 'cleanse',
  'flagBuff', 'fullPierce', 'splashBonus', 'debuff',
]);

const playerSkillIds = new Set();
for (const c of Object.values(classes)) (c.skills || []).forEach(s => playerSkillIds.add(s));
tree.forEach(br => (br.nodes || []).forEach(n => { if (n.skill) playerSkillIds.add(n.skill); }));
for (const rows of Object.values(ct)) rows.forEach(r => ['a', 'b'].forEach(w => {
  if (r[w] && r[w].skill) playerSkillIds.add(r[w].skill);
}));

const unhandled = new Map();
for (const id of playerSkillIds) {
  const sk = skills[id];
  if (!sk) { problems.push(`skill ${id} が存在しない`); continue; }
  need(KNOWN_KINDS.includes(sk.kind), `skills.${id}: 未知の kind "${sk.kind}"`);
  if (sk.kind === 'phys' || sk.kind === 'mag') {
    need(typeof sk.power === 'number', `skills.${id}: power がない（攻撃スキル）`);
    need(typeof sk.el === 'string', `skills.${id}: el がない（攻撃スキル）`);
  }
  if (sk.target) need(KNOWN_TARGETS.includes(sk.target), `skills.${id}: 未知の target "${sk.target}"`);
  if (sk.special) need(KNOWN_SPECIALS.includes(sk.special), `skills.${id}: 未知の special "${sk.special}"`);
  for (const k of Object.keys(sk.eff || {})) {
    if (!HANDLED_EFF.has(k)) unhandled.set(k, (unhandled.get(k) || 0) + 1);
  }
}

/* スプライトの実在チェック */
const SPR = path.resolve(__dirname, '..', 'godot', 'assets', 'sprites');
const checkSprite = (dir, id) => {
  if (!fs.existsSync(path.join(SPR, dir, id + '.png'))) problems.push(`sprite: ${dir}/${id}.png がない`);
};
classIds.forEach(id => checkSprite('classes', id));
enemies.forEach(e => checkSprite('enemies', e.id));
accs.forEach(a => checkSprite('accessories', a.id));
gear.weapons.concat(gear.armors).forEach(g => checkSprite('gear', g.id));

/* null が残っていないか（GDScriptの型付き変数に入ると実行時エラーになる） */
function scanNull(obj, path) {
  if (Array.isArray(obj)) return obj.forEach((v, i) => scanNull(v, `${path}[${i}]`));
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (v === null) problems.push(`null が残っている: ${path}.${k}`);
      else scanNull(v, `${path}.${k}`);
    }
  }
}
for (const f of fs.readdirSync(DIR)) scanNull(read(f), f);

if (problems.length) {
  console.log('検証NG:', problems.length, '件');
  problems.slice(0, 40).forEach(p => console.log('  -', p));
  process.exit(1);
}
console.log('検証OK — Godot側が読むキーはすべて揃っている');
if (unhandled.size) {
  console.log('  ※ Godot側でまだ処理していない効果キー（無視される）:');
  [...unhandled.entries()].sort((a, b) => b[1] - a[1])
    .forEach(([k, n]) => console.log(`     ${k} (${n}件)`));
}
console.log(`  職業 ${classIds.length} / スキル ${Object.keys(skills).length} / 敵 ${enemies.length} / アクセ ${accs.length}`);
console.log(`  共通ツリー ${tree.length}系統 ${nodeCount}ノード / 職業ツリー ${Object.keys(ct).length}職`);
