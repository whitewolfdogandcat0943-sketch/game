# 開発環境のセットアップ（PC）

このリポジトリには次のものが入っています。

| | 場所 | 必要なもの |
| --- | --- | --- |
| **Web版（本体・ターン制RPG）** | リポジトリ直下 | **ブラウザだけ** |
| データ書き出しツール | `tools/` | Node.js 18 以降 |
| 試作のGodot版（アーカイブ） | `experimental/godot-action/` | Godot 4.3 以降 |

---

## 1. 本体を動かす

`index.html` をブラウザで開くだけです。**ビルドもサーバーもインストールも要りません。**

これが本体です。職業25種、アクセサリ142種、スキルツリー204ノード、
25階層の踏破まで実装されています。

## 2. 取得

```bash
git clone https://github.com/whitewolfdogandcat0943-sketch/game.git
cd game
git checkout claude/game-build-system-design-pxolal
```

## 3. データを書き換えるとき

ゲームのデータは `js/data/*.js` にあります。ここを直接編集してください。
ブラウザを再読み込みすれば反映されます。

Godot版（アーカイブ）へ書き出す場合のみ、Node.js が必要です。

```bash
npm install                       # 初回のみ
npx playwright install chromium   # スプライト書き出しに使う場合のみ

npm run export                    # データを書き出して検証
npm run validate                  # 検証だけ
```

## 4. 試作のGodot版を見る場合

`experimental/godot-action/project.godot` を Godot 4.3以降で開いてください
（初回は必ずエディタで開く。PNGのインポートが走ります）。
現在は使っていない実装です。詳細は同フォルダの README を参照してください。

## 5. Windowsでnpmが動かないとき

PowerShellでスクリプト実行がブロックされている場合、次のどちらかで回避できます。

```powershell
npm.cmd install                                          # 設定を変えない方法
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned      # 恒久的に許可（管理者権限不要）
```

`RemoteSigned` は「自分で書いたスクリプトは実行可、ダウンロードしたものは署名が必要」
という開発機の標準的な設定です。システムの安全設定を変更する操作なので、
内容に納得したうえで実行してください。

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

## 7. 現状

本体のWeb版は一通り遊べる状態です。ルートの README に、
ビルドシステム・職業の解放条件・スキルツリーの設計をまとめてあります。
