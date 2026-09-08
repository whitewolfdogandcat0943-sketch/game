# 開発環境のセットアップ（PC）

このリポジトリには2つのものが入っています。

| | 場所 | 必要なもの |
| --- | --- | --- |
| **Web版**（ターン制・完成している） | リポジトリ直下 | ブラウザだけ |
| **Godot版**（2Dアクション・開発中） | `godot/` | Godot 4.3 以降 |
| データ書き出しツール | `tools/` | Node.js 18 以降 |

---

## 1. 用意するもの

| ソフト | 用途 | 入手先 |
| --- | --- | --- |
| **Godot 4.3 以降**（標準版でよい） | Godot版の実行・編集 | godotengine.org からダウンロード。インストール不要の単体実行ファイル |
| **Node.js 18 以降** | データとスプライトの書き出し・検証 | nodejs.org |
| **Git** | リポジトリの取得 | git-scm.com |

**Godotは「.NET版」ではなく標準版**を選んでください。このプロジェクトはGDScriptだけで書いてあり、
.NET版は不要です（C#用の追加ランタイムが要るぶん手間が増えます）。

## 2. 取得

```bash
git clone https://github.com/whitewolfdogandcat0943-sketch/game.git
cd game
git checkout claude/game-build-system-design-pxolal
```

## 3. Web版を動かす

`index.html` をブラウザで開くだけです。ビルドもサーバーも要りません。

## 4. Godot版を動かす

1. Godot を起動する
2. 「インポート」→ `game/godot/project.godot` を選ぶ
3. **初回は必ずエディタで開くこと**（PNG 245枚のインポートが走ります）
4. **F5** で実行

> Godot 4.4 や 4.5 でも開けます。バージョン差の警告が出たら、そのまま進めて構いません。

### 最初に確認してほしいこと

デバッグ実行すると **自己診断（SelfTest）** が自動で走ります。
Godotエディタ下部の「出力」に、次のどちらかが出ます。

```
[SelfTest] 全項目パス（職業 25 / アクセ 142 / 敵 24）
```

```
[SelfTest] 5 件の問題
  - ...
```

**この出力をそのまま貼ってもらえれば、こちらで直せます。**
問題があれば画面の下部にも表示されます。

### エディタを開かずに確認したい場合

コマンドラインからでも実行できます（`godot` にパスが通っている前提）。

```bash
# アセットのインポートだけ行う
godot --headless --path godot --import

# 起動して数秒で終了し、自己診断の出力を取る
godot --headless --path godot --quit-after 120 2>&1 | tee selftest.log
```

`--import` が使えないバージョンなら `godot --headless --path godot --editor --quit` を試してください。
（この2つのコマンドは、開発環境の制約でこちらでは実行確認ができていません。
うまくいかなければエディタから起動してください。）

## 5. データを書き換えたとき

**Godot側の `godot/data/*.json` と `godot/assets/sprites/` は手で編集しないでください。**
Web版の `js/data/*.js` を唯一の出どころとして自動生成しています。

```bash
npm install                 # 初回のみ（スプライト書き出し用のPlaywright）
npx playwright install chromium   # 初回のみ

npm run export              # データを書き出して検証まで行う
npm run export:sprites      # ドット絵を書き換えたときだけ
npm run validate            # 検証だけ
```

`npm run validate` は、Godot側のスクリプトが読むキーが揃っているか、
未知の条件型が混ざっていないか、JSONにnullが残っていないか、
スプライトが実在するかまで確認します。**データを触ったら必ず通してください。**

データを触らないなら Node.js は不要です。

## 6. Claudeに手伝わせる

いまのセッションはクラウド上で動いていて、**あなたのマシンには触れません**。
PCで直接手伝わせるには、そちらに Claude Code を入れて、このリポジトリの中で起動してください。

```bash
npm install -g @anthropic-ai/claude-code
cd game
claude
```

そうすると Godot の実行・エラーの確認・修正までその場で回せるようになります。
このクラウド側のセッションで進めた内容はすべてブランチに入っているので、
`git pull` すれば続きから作業できます。

## 7. 現状と次の作業

`godot/README.md` に、いま動くことと未実装のものをまとめてあります。
次にやる予定なのは **階層ノードの選択・報酬3択・行商人・転職の祭壇** です。
転職手段がまだ無いため、いまは初級4職しか遊べません。
