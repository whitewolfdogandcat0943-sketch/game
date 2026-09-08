/* export-sprites.js - 手続き生成しているドット絵を、16x16のPNGとして書き出す
 *
 *   node tools/export-sprites.js
 *
 * ブラウザ上の描画関数をそのまま使うので、Web版と完全に同じ絵が出る。
 * Godot 側では「フィルタなし（Nearest）」で読み込んで拡大する。
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'godot', 'assets', 'sprites');

function save(dir, name, dataUrl) {
  const d = path.join(OUT, dir);
  fs.mkdirSync(d, { recursive: true });
  const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(path.join(d, name + '.png'), Buffer.from(b64, 'base64'));
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.join(ROOT, 'index.html'));

  const out = await page.evaluate(() => {
    const src = html => (html.match(/src="([^"]+)"/) || [])[1];
    const r = { enemies: {}, classes: {}, accessories: {}, gear: {}, items: {}, nodes: {} };
    G.ENEMIES.forEach(e => { r.enemies[e.id] = src(G.Gfx.enemyImg(e.id, 1)); });
    G.CLASS_LIST.forEach(c => { r.classes[c.id] = src(G.Gfx.classImg(c.id, 1)); });
    G.ACCESSORIES.forEach(a => {
      r.accessories[a.id] = src(G.Gfx.img(G.Gfx.iconSpec('acc', a.rarity, G.UI.accHue(a)), 1));
    });
    G.WEAPONS.concat(G.ARMORS).forEach(g => {
      r.gear[g.id] = src(G.Gfx.img(G.Gfx.iconSpec(g.slot === 'weapon' ? 'weapon' : 'armor', g.rarity), 1));
    });
    G.ITEMS.forEach(it => {
      r.items[it.id] = src(G.Gfx.img(G.Gfx.iconSpec('item', it.tier >= 3 ? 'legend' : 'normal'), 1));
    });
    ['battle', 'elite', 'treasure', 'shop', 'rest', 'altar', 'event', 'boss'].forEach(k => {
      r.nodes[k] = src(G.Gfx.nodeImg(k, 1));
    });
    return r;
  });

  let total = 0;
  for (const [dir, map] of Object.entries(out)) {
    for (const [id, url] of Object.entries(map)) {
      if (!url) { console.log('  !! 生成失敗:', dir, id); continue; }
      save(dir, id, url);
      total++;
    }
    console.log(`  ${dir.padEnd(12)} ${Object.keys(map).length} 枚`);
  }
  console.log('合計', total, '枚 →', path.relative(ROOT, OUT));
  if (errors.length) console.log('PAGE ERRORS', errors);
  await browser.close();
})();
