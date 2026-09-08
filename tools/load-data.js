/* load-data.js - ブラウザ用のデータ層を Node 上で読み込む（DOM非依存）
 * エクスポートや検証ツールから require して使う。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const FILES = [
  'js/util.js',
  'js/data/elements.js',
  'js/core/style.js',
  'js/data/skills.js',
  'js/data/classes.js',
  'js/data/gear.js',
  'js/data/accessories.js',
  'js/data/items.js',
  'js/data/enemies.js',
  'js/data/skilltree.js',
  'js/data/classtree.js'
];

function load() {
  const sandbox = { console, Math, JSON, Object, Array, String, Number, Boolean, Date };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of FILES) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    vm.runInContext(src, sandbox, { filename: f });
  }
  return sandbox.G;
}

module.exports = { load, FILES, ROOT };
