# 立ち絵 生成用プロンプト

`js/data/faces.js` の外見設定から `node tools/portrait-prompts.js > docs/portrait-prompts.md` で生成。
色はゲーム内で実際に使っているHSLからHEXに直したもの。この値を守れば、
生成した絵と手続き生成の絵を混ぜても パレットが揃う。

生成した画像の置き方は `assets/portraits/README.md` を参照。

## 共通の指定

```
Style   : JRPG character portrait, hand-painted digital illustration, clean lineart, soft cel shading with a single light source from the upper left, muted desaturated palette, transparent background, centered, front-facing three-quarter view
Negative: no text, no watermark, no logo, no border, no frame, no background scenery, no extra limbs, no weapon in both hands, not photorealistic, no lens flare, no heavy bloom
```

| 種類 | 構図 | 縦横比 | 推奨サイズ |
| --- | --- | --- | --- |
| `bust` | 胸から上。顔が主役 | 13:15 | 520×600 |
| `full` | 全身。足先まで入れる | 4:7 | 480×840 |

## 主要人物

### カイ（主人公・剣士）  `hero_swordsman`

灰都の見習い衛士の青年。20歳前後。標準体型。鍛えてはいるが大きくはない。短髪。前髪を無造作に分けている（#593e2c）。瞳は #2b3550。金属の肩当てを付けた軽装鎧・基調色 #4a6b96。差し色 #c8a641。片手剣を腰に提げている。

```
bust: a young man in his early twenties, a trainee city guard, average athletic build, trained but not bulky, short tousled hair, bangs parted messily (#593e2c), eyes #2b3550, light armor with metal pauldrons in #4a6b96, accent trim #c8a641, a one-handed sword at the hip, bust-up portrait from the chest up, JRPG character portrait, hand-painted digital illustration, clean lineart, soft cel shading with a single light source from the upper left, muted desaturated palette, transparent background, centered, front-facing three-quarter view

full: a young man in his early twenties, a trainee city guard, average athletic build, trained but not bulky, short tousled hair, bangs parted messily (#593e2c), eyes #2b3550, light armor with metal pauldrons in #4a6b96, accent trim #c8a641, a one-handed sword at the hip, full body standing pose, feet included, JRPG character portrait, hand-painted digital illustration, clean lineart, soft cel shading with a single light source from the upper left, muted desaturated palette, transparent background, centered, front-facing three-quarter view
```

### ミナ  `mina`

施療院育ちの治し手の少女。主人公と同年代。細身。肩幅は狭く、身のこなしが軽い。長い髪。肩を越えて流れる（#cbb372）。瞳は #3a6b7a。裾の広がる法衣・基調色 #d1c9a9。差し色 #61acd1。細い金属の額飾り。角のある鎚を持つ。

```
bust: a young woman raised in an infirmary, a healer, same age as the hero, slender build, narrow shoulders, light on their feet, long straight hair flowing past the shoulders (#cbb372), eyes #3a6b7a, flowing floor-length robe in #d1c9a9, accent trim #61acd1, a thin metal circlet, a flanged mace, bust-up portrait from the chest up, JRPG character portrait, hand-painted digital illustration, clean lineart, soft cel shading with a single light source from the upper left, muted desaturated palette, transparent background, centered, front-facing three-quarter view

full: a young woman raised in an infirmary, a healer, same age as the hero, slender build, narrow shoulders, light on their feet, long straight hair flowing past the shoulders (#cbb372), eyes #3a6b7a, flowing floor-length robe in #d1c9a9, accent trim #61acd1, a thin metal circlet, a flanged mace, full body standing pose, feet included, JRPG character portrait, hand-painted digital illustration, clean lineart, soft cel shading with a single light source from the upper left, muted desaturated palette, transparent background, centered, front-facing three-quarter view
```

### ガロ  `garo`

元城塞守備隊の青年。主人公と同い年だが体だけ大きい。髭は無い。長身で肩幅が広い。頭ひとつ大きい。刈り上げた短髪。生え際が高い（#5e3226）。瞳は #5a3a24。金属の肩当てを付けた軽装鎧・基調色 #804e42。マント #52251e。差し色 #c89041。大剣を肩に担いでいる。

```
bust: a young man the same age as the hero, a former fortress guard, clean-shaven, simply much bigger, tall and broad-shouldered, a head taller than the others, closely cropped short hair, high hairline (#5e3226), eyes #5a3a24, light armor with metal pauldrons in #804e42, cloak in #52251e, accent trim #c89041, a greatsword resting on the shoulder, bust-up portrait from the chest up, JRPG character portrait, hand-painted digital illustration, clean lineart, soft cel shading with a single light source from the upper left, muted desaturated palette, transparent background, centered, front-facing three-quarter view

full: a young man the same age as the hero, a former fortress guard, clean-shaven, simply much bigger, tall and broad-shouldered, a head taller than the others, closely cropped short hair, high hairline (#5e3226), eyes #5a3a24, light armor with metal pauldrons in #804e42, cloak in #52251e, accent trim #c89041, a greatsword resting on the shoulder, full body standing pose, feet included, JRPG character portrait, hand-painted digital illustration, clean lineart, soft cel shading with a single light source from the upper left, muted desaturated palette, transparent background, centered, front-facing three-quarter view
```

### セラ  `sera`

塔を追われた若い研究者。感情が表に出にくい。細身。肩幅は狭く、身のこなしが軽い。切り揃えた髪。前髪は真っ直ぐ（#503663）。瞳は #6a4b9a。裾の広がる法衣・基調色 #664082。マント #361e52。差し色 #59bbcf。宝珠のついた杖を持つ。

```
bust: a young scholar exiled from her tower, reserved expression, slender build, narrow shoulders, light on their feet, straight bob cut with blunt bangs (#503663), eyes #6a4b9a, flowing floor-length robe in #664082, cloak in #361e52, accent trim #59bbcf, a staff topped with a glowing orb, bust-up portrait from the chest up, JRPG character portrait, hand-painted digital illustration, clean lineart, soft cel shading with a single light source from the upper left, muted desaturated palette, transparent background, centered, front-facing three-quarter view

full: a young scholar exiled from her tower, reserved expression, slender build, narrow shoulders, light on their feet, straight bob cut with blunt bangs (#503663), eyes #6a4b9a, flowing floor-length robe in #664082, cloak in #361e52, accent trim #59bbcf, a staff topped with a glowing orb, full body standing pose, feet included, JRPG character portrait, hand-painted digital illustration, clean lineart, soft cel shading with a single light source from the upper left, muted desaturated palette, transparent background, centered, front-facing three-quarter view
```

### 衛士長  `captain`

初老の衛士長。白髪まじり。長身で肩幅が広い。頭ひとつ大きい。刈り上げた短髪。生え際が高い（#7b858e）。瞳は #4a4f5e。金属の肩当てを付けた軽装鎧・基調色 #546578。差し色 #c8a641。顎髭。片手剣を腰に提げている。

```
bust: a grizzled veteran guard captain, greying hair, tall and broad-shouldered, a head taller than the others, closely cropped short hair, high hairline (#7b858e), eyes #4a4f5e, light armor with metal pauldrons in #546578, accent trim #c8a641, a full beard, a one-handed sword at the hip, bust-up portrait from the chest up, JRPG character portrait, hand-painted digital illustration, clean lineart, soft cel shading with a single light source from the upper left, muted desaturated palette, transparent background, centered, front-facing three-quarter view

full: a grizzled veteran guard captain, greying hair, tall and broad-shouldered, a head taller than the others, closely cropped short hair, high hairline (#7b858e), eyes #4a4f5e, light armor with metal pauldrons in #546578, accent trim #c8a641, a full beard, a one-handed sword at the hip, full body standing pose, feet included, JRPG character portrait, hand-painted digital illustration, clean lineart, soft cel shading with a single light source from the upper left, muted desaturated palette, transparent background, centered, front-facing three-quarter view
```

### 枢機卿  `cardinal`

痩せた枢機卿。顔は頭巾の影に沈む。細身。肩幅は狭く、身のこなしが軽い。目深にかぶった頭巾。顔は影に沈む（#666666）。瞳は #2a2f3d。裾の長い法衣に頭巾・基調色 #60393f。マント #41181f。差し色 #c8a641。得物は持たない。

```
bust: a gaunt cardinal, face lost in the shadow of his hood, slender build, narrow shoulders, light on their feet, deep hood pulled low, face sunk in shadow (#666666), eyes #2a2f3d, long hooded robe in #60393f, cloak in #41181f, accent trim #c8a641, no weapon, bust-up portrait from the chest up, JRPG character portrait, hand-painted digital illustration, clean lineart, soft cel shading with a single light source from the upper left, muted desaturated palette, transparent background, centered, front-facing three-quarter view

full: a gaunt cardinal, face lost in the shadow of his hood, slender build, narrow shoulders, light on their feet, deep hood pulled low, face sunk in shadow (#666666), eyes #2a2f3d, long hooded robe in #60393f, cloak in #41181f, accent trim #c8a641, no weapon, full body standing pose, feet included, JRPG character portrait, hand-painted digital illustration, clean lineart, soft cel shading with a single light source from the upper left, muted desaturated palette, transparent background, centered, front-facing three-quarter view
```

## 主人公の職業別

主人公は転職で姿が変わる。専用の絵を用意しない職業は `hero` が使われ、
それも無ければ手続き生成に戻る。

| id | 職業 | 装い | 基調色 | 差し色 | 得物 |
| --- | --- | --- | --- | --- | --- |
| `hero_swordsman` | 剣士 | 金属の肩当てを付けた軽装鎧 | `#4a6b96` | `#c8a641` | 片手剣を腰に提げている |
| `hero_mage` | 魔術士 | 裾の広がる法衣 | `#644096` | `#41b1c8` | 宝珠のついた杖を持つ |
| `hero_rogue` | 盗賊 | 動きやすい軽装 | `#395a60` | `#41c885` | 片手剣を腰に提げている |
| `hero_priest` | 神官 | 裾の広がる法衣 | `#c6bc9f` | `#4190c8` | 角のある鎚を持つ |
| `hero_berserker` | 狂戦士 | 金属の肩当てを付けた軽装鎧 | `#843b33` | `#c88541` | 大剣を肩に担いでいる |
| `hero_assassin` | 暗殺者 | 金属の肩当てを付けた軽装鎧 | `#312749` | `#c8419b` | 片手剣を腰に提げている |
| `hero_elementalist` | 元素使い | 裾の広がる法衣 | `#ab633f` | `#41a6c8` | 宝珠のついた杖を持つ |
| `hero_guardian` | 守護者 | 金属の肩当てを付けた軽装鎧 | `#5b7a8f` | `#c8ad41` | 片手剣を腰に提げている |
| `hero_stormcaller` | 嵐使い | 裾の広がる法衣 | `#4287a9` | `#c8bd41` | 宝珠のついた杖を持つ |
| `hero_alchemist` | 錬金術士 | 金属の肩当てを付けた軽装鎧 | `#648d49` | `#c8c841` | 分厚い書物を抱えている |
| `hero_exorcist` | 破魔僧 | 裾の広がる法衣 | `#c2b68e` | `#9b41c8` | 角のある鎚を持つ |
| `hero_windrunner` | 韋駄天 | 金属の肩当てを付けた軽装鎧 | `#469b7e` | `#c8c841` | 片手剣を腰に提げている |
| `hero_hexer` | 呪術師 | 裾の長い法衣に頭巾 | `#4e2c59` | `#41c841` | 宝珠のついた杖を持つ |
| `hero_spellblade` | 魔剣士 | 金属の肩当てを付けた軽装鎧 | `#3f468d` | `#c86341` | 片手剣を腰に提げている |
| `hero_phantomSaint` | 絶影剣聖 | 金属の肩当てを付けた軽装鎧 | `#393451` | `#c8b141` | 片手剣を腰に提げている |
| `hero_mirrorEmperor` | 鏡獄天帝 | 金属の肩当てを付けた軽装鎧 | `#7e9ba9` | `#c8419b` | 大剣を肩に担いでいる |
| `hero_calamityKing` | 天災嵐王 | 裾の広がる法衣 | `#376e95` | `#c8bd41` | 宝珠のついた杖を持つ |
| `hero_astralArchmage` | 星辰術皇 | 裾の広がる法衣 | `#633b91` | `#c8ad41` | 宝珠のついた杖を持つ |
| `hero_alchemySovereign` | 万象錬成王 | 金属の肩当てを付けた軽装鎧 | `#63964a` | `#c8ad41` | 分厚い書物を抱えている |
| `hero_bloodfiend` | 血喰鬼神 | 金属の肩当てを付けた軽装鎧 | `#772c36` | `#c85c41` | 大剣を肩に担いでいる |
| `hero_finalArbiter` | 終焉審判者 | 裾の広がる法衣 | `#c8bd93` | `#a641c8` | 角のある鎚を持つ |
| `hero_voidSovereign` | 虚無帝 | 裾の長い法衣に頭巾 | `#40244c` | `#c841c8` | 宝珠のついた杖を持つ |
| `hero_skyrunner` | 神速天翔 | 金属の肩当てを付けた軽装鎧 | `#49ab98` | `#c8bd41` | 片手剣を腰に提げている |
| `hero_plaguelord` | 疫災呪王 | 裾の長い法衣に頭巾 | `#4c2753` | `#41c841` | 宝珠のついた杖を持つ |
| `hero_poleEmperor` | 双極魔剣皇 | 金属の肩当てを付けた軽装鎧 | `#3a3a88` | `#c86e41` | 片手剣を腰に提げている |

英語のプロンプトが要る職業は、上の「主要人物」の書式に当てはめて作れる。
体型・髪型・得物の語彙は `tools/portrait-prompts.js` の BUILD / HAIR / PROP にある。

