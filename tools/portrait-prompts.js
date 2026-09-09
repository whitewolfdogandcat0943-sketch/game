/* portrait-prompts.js - 立ち絵の外見設定から、画像生成用のプロンプトを書き出す
 *
 *   node tools/portrait-prompts.js > docs/portrait-prompts.md
 *
 * 外見は js/data/faces.js に数値で入っているので、そこから機械的に文章化する。
 * 色は実際にゲームが使っているHSLからHEXを出しているため、
 * 生成した絵をそのまま並べても パレットが揃う。
 */
const { load } = require('./load-data.js');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* faces.js は G.CLASSES などに依存するので、データ層のうえで評価する */
function loadFaces() {
  const G = load();
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'js/data/faces.js'), 'utf8');
  const sandbox = { G, console, Math, JSON, Object, Array, String, Number, Boolean };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'js/data/faces.js' });
  return G;
}

/* ---------- 色 ---------- */
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)) / 100; l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
          : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + t.map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}

/* ---------- 語彙 ---------- */
const BUILD = {
  slim:   { ja: '細身。肩幅は狭く、身のこなしが軽い',      en: 'slender build, narrow shoulders, light on their feet' },
  normal: { ja: '標準体型。鍛えてはいるが大きくはない',    en: 'average athletic build, trained but not bulky' },
  heavy:  { ja: '長身で肩幅が広い。頭ひとつ大きい',        en: 'tall and broad-shouldered, a head taller than the others' }
};
const HAIR = {
  short: { ja: '短髪。前髪を無造作に分けている',            en: 'short tousled hair, bangs parted messily' },
  crop:  { ja: '刈り上げた短髪。生え際が高い',              en: 'closely cropped short hair, high hairline' },
  long:  { ja: '長い髪。肩を越えて流れる',                  en: 'long straight hair flowing past the shoulders' },
  bob:   { ja: '切り揃えた髪。前髪は真っ直ぐ',              en: 'straight bob cut with blunt bangs' },
  tail:  { ja: '後ろで一つに括った髪',                      en: 'hair tied back in a single ponytail' },
  hood:  { ja: '目深にかぶった頭巾。顔は影に沈む',          en: 'deep hood pulled low, face sunk in shadow' }
};
const PROP = {
  sword:      { ja: '片手剣を腰に提げている',   en: 'a one-handed sword at the hip' },
  greatsword: { ja: '大剣を肩に担いでいる',     en: 'a greatsword resting on the shoulder' },
  staff:      { ja: '宝珠のついた杖を持つ',     en: 'a staff topped with a glowing orb' },
  mace:       { ja: '角のある鎚を持つ',         en: 'a flanged mace' },
  book:       { ja: '分厚い書物を抱えている',   en: 'a thick tome held against the chest' },
  none:       { ja: '得物は持たない',           en: 'no weapon' }
};

function outfit(s) {
  if (s.hair === 'hood') return { ja: '裾の長い法衣に頭巾', en: 'long hooded robe' };
  if (s.robe) return { ja: '裾の広がる法衣', en: 'flowing floor-length robe' };
  if (s.build === 'heavy' || s.pauldron) return { ja: '金属の肩当てを付けた軽装鎧', en: 'light armor with metal pauldrons' };
  return { ja: '動きやすい軽装', en: 'practical light traveling clothes' };
}

function colors(s) {
  return {
    cloth: hslToHex(s.hue, s.sat != null ? s.sat : 42, s.lum != null ? s.lum : 45),
    accent: hslToHex(s.accent, s.accentSat != null ? s.accentSat : 55, s.accentLum != null ? s.accentLum : 52),
    hair: hslToHex(s.hairHue, s.hairSat != null ? s.hairSat : 40, s.hairLum != null ? s.hairLum : 34),
    skin: hslToHex(s.skinHue != null ? s.skinHue : 26, s.skinSat != null ? s.skinSat : 40, s.skinLum != null ? s.skinLum : 68),
    cape: s.cape ? hslToHex(s.capeHue != null ? s.capeHue : s.accent, 46,
      Math.max(16, (s.lum != null ? s.lum : 45) * 0.58)) : null,
    eye: s.eye || '#2a2f3d'
  };
}

const STYLE_EN = 'JRPG character portrait, hand-painted digital illustration, clean lineart, '
  + 'soft cel shading with a single light source from the upper left, muted desaturated palette, '
  + 'transparent background, centered, front-facing three-quarter view';
const NEGATIVE_EN = 'no text, no watermark, no logo, no border, no frame, no background scenery, '
  + 'no extra limbs, no weapon in both hands, not photorealistic, no lens flare, no heavy bloom';

function describe(name, id, s, note) {
  const c = colors(s);
  const o = outfit(s);
  const b = BUILD[s.build] || BUILD.normal;
  const hr = HAIR[s.hair] || HAIR.short;
  const pr = PROP[s.prop] || PROP.none;

  const enParts = [
    note && note.en, b.en, hr.en + ' (' + c.hair + ')',
    'eyes ' + c.eye, o.en + ' in ' + c.cloth,
    c.cape ? 'cloak in ' + c.cape : null,
    'accent trim ' + c.accent, s.circlet ? 'a thin metal circlet' : null,
    s.beard ? 'a full beard' : null, pr.en
  ].filter(Boolean).join(', ');

  const jaParts = [
    note && note.ja, b.ja, hr.ja + '（' + c.hair + '）',
    '瞳は ' + c.eye, o.ja + '・基調色 ' + c.cloth,
    c.cape ? 'マント ' + c.cape : null,
    '差し色 ' + c.accent, s.circlet ? '細い金属の額飾り' : null,
    s.beard ? '顎髭' : null, pr.ja
  ].filter(Boolean).join('。') + '。';

  return { id, name, en: enParts, ja: jaParts, c };
}

function main() {
  const G = loadFaces();
  const F = G.FACES;
  const out = [];
  const p = (t) => out.push(t);

  p('# 立ち絵 生成用プロンプト');
  p('');
  p('`js/data/faces.js` の外見設定から `node tools/portrait-prompts.js > docs/portrait-prompts.md` で生成。');
  p('色はゲーム内で実際に使っているHSLからHEXに直したもの。この値を守れば、');
  p('生成した絵と手続き生成の絵を混ぜても パレットが揃う。');
  p('');
  p('生成した画像の置き方は `assets/portraits/README.md` を参照。');
  p('');
  p('## 共通の指定');
  p('');
  p('```');
  p('Style   : ' + STYLE_EN);
  p('Negative: ' + NEGATIVE_EN);
  p('```');
  p('');
  p('| 種類 | 構図 | 縦横比 | 推奨サイズ |');
  p('| --- | --- | --- | --- |');
  p('| `bust` | 胸から上。顔が主役 | 13:15 | 520×600 |');
  p('| `full` | 全身。足先まで入れる | 4:7 | 480×840 |');
  p('');

  const rows = [];
  const cast = [
    { name: 'カイ（主人公・剣士）', id: 'hero_swordsman', s: F.forHero({ classId: 'swordsman' }),
      note: { ja: '灰都の見習い衛士の青年。20歳前後', en: 'a young man in his early twenties, a trainee city guard' } },
    { name: 'ミナ', id: 'mina', s: F.CAST.mina,
      note: { ja: '施療院育ちの治し手の少女。主人公と同年代', en: 'a young woman raised in an infirmary, a healer, same age as the hero' } },
    { name: 'ガロ', id: 'garo', s: F.CAST.garo,
      note: { ja: '元城塞守備隊の青年。主人公と同い年だが体だけ大きい。髭は無い', en: 'a young man the same age as the hero, a former fortress guard, clean-shaven, simply much bigger' } },
    { name: 'セラ', id: 'sera', s: F.CAST.sera,
      note: { ja: '塔を追われた若い研究者。感情が表に出にくい', en: 'a young scholar exiled from her tower, reserved expression' } },
    { name: '衛士長', id: 'captain', s: F.NPC['衛士長'],
      note: { ja: '初老の衛士長。白髪まじり', en: 'a grizzled veteran guard captain, greying hair' } },
    { name: '枢機卿', id: 'cardinal', s: F.NPC['枢機卿'],
      note: { ja: '痩せた枢機卿。顔は頭巾の影に沈む', en: 'a gaunt cardinal, face lost in the shadow of his hood' } }
  ];

  p('## 主要人物');
  p('');
  cast.forEach(function (x) {
    const d = describe(x.name, x.id, x.s, x.note);
    rows.push(d);
    p('### ' + d.name + '  `' + d.id + '`');
    p('');
    p('' + d.ja);
    p('');
    p('```');
    p('bust: ' + d.en + ', bust-up portrait from the chest up, ' + STYLE_EN);
    p('');
    p('full: ' + d.en + ', full body standing pose, feet included, ' + STYLE_EN);
    p('```');
    p('');
  });

  p('## 主人公の職業別');
  p('');
  p('主人公は転職で姿が変わる。専用の絵を用意しない職業は `hero` が使われ、');
  p('それも無ければ手続き生成に戻る。');
  p('');
  p('| id | 職業 | 装い | 基調色 | 差し色 | 得物 |');
  p('| --- | --- | --- | --- | --- | --- |');
  Object.keys(F.CLASS_LOOK).forEach(function (cid) {
    const s = F.forHero({ classId: cid });
    const c = colors(s);
    const o = outfit(s);
    p('| `hero_' + cid + '` | ' + G.CLASSES[cid].name + ' | ' + o.ja + ' | `' + c.cloth + '` | `' + c.accent +
      '` | ' + (PROP[s.prop] || PROP.none).ja + ' |');
  });
  p('');
  p('英語のプロンプトが要る職業は、上の「主要人物」の書式に当てはめて作れる。');
  p('体型・髪型・得物の語彙は `tools/portrait-prompts.js` の BUILD / HAIR / PROP にある。');
  p('');

  console.log(out.join('\n'));
}
main();
