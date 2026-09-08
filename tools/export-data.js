/* export-data.js - ブラウザ用データ層を、エンジン非依存のJSONへ書き出す
 *
 *   node tools/export-data.js
 *
 * 関数（条件の判定など）は落とし、代わりに記述子（d / code）を書き出す。
 * Godot 側はこのJSONを読むだけでよく、データの二重管理が起きない。
 */
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('./load-data.js');

const OUT = path.join(ROOT, 'godot', 'data');
fs.mkdirSync(OUT, { recursive: true });

const G = load();

/** 関数を落として素のデータにする */
function clean(v) {
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) {
      if (typeof v[k] === 'function') continue;
      if (k === 'branchRef') continue;          /* 循環参照 */
      const c = clean(v[k]);
      if (c !== undefined) o[k] = c;
    }
    return o;
  }
  if (typeof v === 'function') return undefined;
  return v;
}

function write(name, obj) {
  const p = path.join(OUT, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 1));
  const kb = (fs.statSync(p).size / 1024).toFixed(1);
  console.log(`  ${name.padEnd(20)} ${kb} KB`);
}

console.log('書き出し先:', path.relative(ROOT, OUT));

write('elements.json', {
  elements: G.ELEMENTS,
  magic_elements: G.MAGIC_ELEMENTS,
  all_elements: G.ALL_ELEMENTS,
  weak_mult: G.WEAK_MULT,
  resist_mult: G.RESIST_MULT,
  modkeys: G.MODKEYS,
  flags: G.FLAGS
});

write('skills.json', clean(G.SKILLS));
write('classes.json', clean(G.CLASSES));
write('gear.json', { weapons: clean(G.WEAPONS), armors: clean(G.ARMORS) });
write('accessories.json', clean(G.ACCESSORIES));
write('items.json', clean(G.ITEMS));
write('enemies.json', clean(G.ENEMIES));
write('skilltree.json', clean(G.TREE.branches));
write('classtree.json', clean(G.CLASSTREE));

/* 目次（Godot側の読み込み順と件数の確認用） */
write('index.json', {
  generated_from: 'js/data/*.js',
  counts: {
    skills: Object.keys(G.SKILLS).length,
    classes: Object.keys(G.CLASSES).length,
    weapons: G.WEAPONS.length,
    armors: G.ARMORS.length,
    accessories: G.ACCESSORIES.length,
    accessories_normal: G.NORMALS.length,
    accessories_legend: G.LEGENDS.length,
    accessories_mythic: G.MYTHICS.length,
    items: G.ITEMS.length,
    enemies: G.ENEMIES.length,
    tree_branches: G.TREE.branches.length,
    tree_nodes: G.TREE.branches.reduce((a, b) => a + b.nodes.length, 0),
    classtree_classes: Object.keys(G.CLASSTREE).length,
    classtree_nodes: Object.keys(G.CLASSTREE).reduce((a, k) => a + G.CLASSTREE[k].length * 2, 0),
    flags: Object.keys(G.FLAGS).length
  }
});
console.log('完了');
