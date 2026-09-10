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
  'js/data/allies.js',
  'js/data/enemies.js',
  'js/data/difficulty.js',
  'js/data/skilltree.js',
  'js/data/classtree.js',
  'js/data/story.js'
];

/* 戦闘まで含めたエンジン一式（DOMに触れないファイルのみ） */
const CORE_FILES = [
  'js/core/stats.js',
  'js/core/unlock.js',
  'js/core/battle.js',
  'js/core/run.js',
  'js/core/story.js'
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

/** データ＋戦闘エンジンを読み込み、シミュレーション用の state も作れるようにする */
function loadEngine() {
  const sandbox = { console, Math, JSON, Object, Array, String, Number, Boolean, Date };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of FILES.concat(CORE_FILES)) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    vm.runInContext(src, sandbox, { filename: f });
  }
  const G = sandbox.G;
  /* save.js は localStorage を触るので、ここでは何もしないスタブを入れる */
  G.Save = { saveMeta() {}, saveRun() {}, loadMeta() { return null; }, clearRun() {} };
  return G;
}

/** 新規 state（メタデータ込み）を作る */
function newState(G) {
  return { meta: { mythics: [], classesSeen: [], runs: 0, bestFloor: 0 }, hero: null, party: null, run: null };
}

module.exports = { load, loadEngine, newState, FILES, CORE_FILES, ROOT };
