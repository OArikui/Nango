# 開発ガイド（Nango-neo）

Nango-neo は、Nango v3.10 をもとに作り直した辞書アプリです。このドキュメントは、開発の進め方とバージョン管理のルールをまとめたものです。

## 開発環境

| 用途 | 必要なもの |
| ---- | ---------- |
| アプリの実行 | ブラウザー、または Python 3.9 以降（`run.py`）。ビルド工程はありません。 |
| テスト | Node.js 20、Python 3.9 以降、`jsonschema`（`pip install "jsonschema[format]"`。日時形式の検査に必要） |

## テスト

変更したら、リポジトリのルートで次を実行します。同じ内容が GitHub Actions（`.github/workflows/nango-smoke.yml`）でも動きます。

```text
node test_or_future/phase1_smoke.test.js
node test_or_future/docs_consistency.test.js
python -m unittest test_or_future.test_phase1_format -v
python -m py_compile run.py
```

- `phase1_smoke.test.js`: アプリのロジックと、HTML/CSS の構造を確認します。
- `docs_consistency.test.js`: HTML・`run.py`・README のバージョンとファイル名が一致していること、リリースノートがあること、Markdown の相対リンクが切れていないことを確認します。
- `test_phase1_format.py`: DT-FMT のスキーマ・テンプレート・AI 指示・`sample.json` を検証します。

## ブランチ・Pull Request・コミットメッセージ

- 作業用のブランチを作り、`NEO` ブランチへ Pull Request を出します。`NEO` への push で GitHub Pages に公開されます。
- コミットメッセージは、先頭に種類を付けた 1 行の要約にします。必要なら、空行をはさんで本文に理由と影響を書きます。

| 種類 | 使いどころ |
| ---- | ---------- |
| `feat` | 機能の追加 |
| `fix` | 不具合の修正 |
| `docs` | ドキュメントだけの変更 |
| `refactor` | 挙動を変えない整理 |
| `test` / `ci` | テスト・GitHub Actions の変更 |
| `chore` | 不要ファイルの削除、設定の整理など |
| `release` | バージョン更新 |

例: `docs: reorganize documentation layout`

## バージョン管理

### 何に番号を付けるか

| 対象 | ファイル名・場所 | 上げるタイミング |
| ---- | ---------------- | ---------------- |
| アプリ | `Nango-neo.vMM.m.p.html`（例: `v02.8.0`）、画面のバージョン表示、`README.md`、リリースノート | リリースごと |
| JavaScript | `Nango_main.vMM.m.p.js` | そのファイルの内容が変わったとき |
| CSS | `style.vMM.m.p.css` | そのファイルの内容が変わったとき |
| データ形式 | `DTformats.neo.vM.NN/`（中のファイルは `DF-FMT_schema.v01.NN.json`、`DT-FMT_instruction_AI.v01.NN.json`、`DT-FMT_template.v02.NN.json`） | 形式を変えたとき |

アプリのバージョンは HTML の番号と一致させます（例: アプリ v2.8.0 は `Nango-neo.v02.8.0.html`）。JavaScript と CSS は変更がなければ番号を据え置くため、HTML から読み込むファイル名が変わらない場合があります。

### 番号の意味

| 部分 | 意味 | 上げるタイミング |
| ---- | ---- | ---------------- |
| `MM`（メジャー） | 大きなレイアウト変更・データ構造の変更 | 互換性が崩れるとき |
| `m`（マイナー） | 互換性を保った機能追加や、中規模な変更 | 機能を足したとき |
| `p`（パッチ） | バグ修正・小さな改善 | 修正したとき |

例: `v02.7.3` → `v02.7.4`（小さな改善） / `v02.8.0`（整理を含むリリース） / `v03.00.0`（レイアウト刷新）

配布用 ZIP は、実際に使える状態のときだけバージョンを上げてください。

### 旧版ファイルは残さない

新しいバージョンを作ったら、古い HTML・JS・CSS・DT-FMT フォルダーは削除します。履歴は Git に残り、変遷は [neo-versions.md](neo-versions.md) に記録します。
フォルダーに複数のバージョンが並ぶと、README・ランチャー・CI がどれを指すのか分からなくなるためです。`docs_consistency.test.js` は、各ファイルが 1 つだけであることも確認します。

## リリース手順（チェックリスト）

1. 変更を入れる（JavaScript・CSS を変えたときは、ファイル名の番号も上げる）。
2. HTML のファイル名と、`<meta name="app-name">`・`html-version`・`json-version`・`javascript-version`、画面のバージョン表示、`<script>` / `<link>` の参照先を更新する。
3. `run.py` の説明文・`ENTRY`・`FORMAT_FILES` を更新する。
4. `test_or_future/phase1_smoke.test.js` の参照ファイル名と期待するバージョンを更新する。
5. [README.md](../README.md) の「現行版」と、使っている箇所のファイル名を更新する。
6. `docs/releases/RELEASE_NOTES_vX.Y.Z.md` を追加し、[neo-versions.md](neo-versions.md) の表に 1 行足す。
7. データ形式を変えたときは、[DT-FMT.md](DT-FMT.md) を更新し、`neo-versions.md` の「DT-FMT の変遷」に追記する。
8. 上のテストをすべて実行する。

## ドキュメントの置き場所

| 内容 | 書く場所 |
| ---- | -------- |
| 使い方・起動方法 | [README.md](../README.md)、[RUN_WITH_PYTHON.md](RUN_WITH_PYTHON.md) |
| データ形式の仕様 | [DT-FMT.md](DT-FMT.md) |
| バージョンごとの変更 | [releases/](releases/)、[neo-versions.md](neo-versions.md) |
| 今後の予定 | [ROADMAP.md](ROADMAP.md) |
| 過去の実装の記録・初期のメモ | [PHASE1_IMPLEMENTATION.md](PHASE1_IMPLEMENTATION.md)、[archive/](archive/) |

個人の PC のパス（例: `C:\Users\...`）はドキュメントに書かないでください。

## 開発の進捗

> 2026-10-13 更新: Phase 1（ブラウザー辞書機能）は実装済みです。実装の経緯は [PHASE1_IMPLEMENTATION.md](PHASE1_IMPLEMENTATION.md)、今後の予定は [ROADMAP.md](ROADMAP.md) を参照してください。サーバー構築は Phase 2 のため未着手です。

- [ ] server 構築 `with python`
  - [ ] データ管理システムの構築（server side）
    - [ ] JSON ファイルの import、DB との結合
      - [x] import したファイルの形式検査（クレンジング） with `json`, `jsonschema`
      - [ ] import したファイルの重複項目処理 with `DeepDiff`
        - [ ] [onetime] JSON 形式の root に `additional` を追加
      - [ ] 複数ファイル import への対応
    - [ ] JavaScript へのデータ送信 `fetch API`
- [ ] page の作成 `with JavaScript,HTML`
  - [ ] server とのやり取り `JavaScript` mod `Ajax`（Phase 2）
  - [x] 画面描画の作成 `JavaScript,HTML`（Phase 1）
  - [x] DT-FMT の読込・保存・エクスポート（現行は v5.16）
  - [x] 複数 JSON の取込、ID 再採番、重複マージ、競合時の確認
  - [x] 階層検索、タグ一括管理、意味単位の追加・コピー・貼り付け・複製・削除・順序変更
  - [x] JSON 貼り付けインポート、「今日の単語」表示
  - [x] JSON Schema 検証・JavaScript スモークテスト
