/* portrait-assets.js - 描いた立ち絵に差し替えるための宣言
 *
 * 既定ではすべて手続き生成（コードで描いたドット絵）を使う。
 * 用意した画像に差し替えたいときは、下の PORTRAITS に1行足すだけでよい。
 *
 *   1. 画像を assets/portraits/ に置く
 *   2. 下の表のコメントを外し、パスを書く
 *   3. リロードすると、その人物だけ画像に切り替わる
 *
 * 画像が見つからなければ黙って手続き生成へ戻るので、
 * 一部だけ差し替えた状態でも破綻しない。
 *
 * bust : 会話用のバストアップ。縦横比 13:15 前後（例 520×600）
 * full : 一覧・祭壇用の全身。 縦横比  4:7 前後（例 480×840）
 *
 * id の一覧は tools/portrait-prompts.js が出力する docs/portrait-prompts.md にある。
 * 主人公は職業ごとに hero_swordsman / hero_mage … と分かれ、
 * 見つからない場合は hero に、それも無ければ手続き生成に落ちる。
 */
G.PORTRAIT_ASSETS = {
  /* 例:
  garo:  { bust: 'assets/portraits/garo_bust.png',  full: 'assets/portraits/garo_full.png' },
  mina:  { bust: 'assets/portraits/mina_bust.png' },
  hero_swordsman: { bust: 'assets/portraits/hero_swordsman_bust.png' },
  */
};
