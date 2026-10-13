# Nango-neo

日常で出会った難しい言葉、文化や学問の背景を持つ言葉を保存・整理・検索するための、個人用の辞書アプリです。
ブラウザーだけで動作し、辞書データは JSON（DT-FMT）で読み書きします。

> 「忘れたくないな」「もう一度使いたいな」と思う言葉が、Nango です。

## 現行版

| 項目 | ファイル / バージョン |
| ---- | ---------------------- |
| アプリ | v2.8.1 |
| 画面 (HTML) | `Nango-neo/Nango-neo.v02.8.1.html` |
| JavaScript | `Nango-neo/Nango_main.v01.7.4.js` |
| CSS | `Nango-neo/style.v02.7.3.css` |
| データ形式 (DT-FMT) | `Nango-neo/DTformats.neo.v5.17/`（[仕様](docs/DT-FMT.md)） |
| ローカルランチャー | `run.py` / `RUN_NANGO.bat`（Python 3.9 以降、標準ライブラリのみ） |

JavaScript と CSS は、内容が変わったときだけ番号が上がります。そのためアプリのバージョンとファイル番号は一致しません。
バージョンの付け方は [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)、変更履歴は [docs/neo-versions.md](docs/neo-versions.md) と [docs/releases/](docs/releases/) を参照してください。

## 起動方法

### 1. Python ランチャー（推奨）

1. リポジトリ（または配布 ZIP）を展開します。
2. Windows では `RUN_NANGO.bat` をダブルクリックします。それ以外の環境では `python run.py` を実行します。
3. ブラウザーで Nango-neo が開きます。終了するときは、起動したウィンドウで `Ctrl+C` を押します。

```text
python run.py --port 9000     # ポートを指定（既定: 8765）
python run.py --no-browser    # ブラウザーを自動で開かない
```

アプリは `127.0.0.1`（自分の PC）だけで待ち受け、外部ネットワークには公開されません。
この方法で起動すると、辞書は `user_data/nango_data.json` にも自動保存されます。詳しくは [docs/RUN_WITH_PYTHON.md](docs/RUN_WITH_PYTHON.md) を参照してください。

### 2. HTML を直接開く

`Nango-neo/Nango-neo.v02.8.1.html` をブラウザーで開いても使えます。この場合の保存先はブラウザーの `localStorage` だけで、
同じブラウザー・同じオリジンでしかデータを使えません。ファイルへの自動保存は動作しません。

### 3. GitHub Pages

`NEO` ブランチへの push で、`.github/workflows/pages.yml` が最新の `Nango-neo.v*.html` を `index.html` として公開します。
この場合の保存先も、アクセスしているブラウザーの `localStorage` です。

## データの保存とバックアップ

| 起動方法 | 保存先 |
| -------- | ------ |
| Python ランチャー | `user_data/nango_data.json`（ブラウザーの `localStorage` にも予備として保存） |
| HTML 直接 / GitHub Pages | ブラウザーの `localStorage` のみ |

- バックアップや別環境への移行には、ツールの「JSONエクスポート」を使ってください。出力は `Nango-neo_DTformats.neo.v5.17.json` です。
- Python ランチャーを使う場合は、`user_data` フォルダーもバックアップしてください。
- 保存先ファイルは、設定の「ファイル保存先」から変更できます（ランチャー利用時のみ）。
- `user_data/` と `data/` は個人の辞書データのため、`.gitignore` で管理対象外にしています。
- アカウント同期やサーバー保存は未提供です（[ROADMAP](docs/ROADMAP.md) の Phase 2）。

## 主な機能

- **今日の単語**: 日付に基づいて、毎日同じ語を提示します。
- **単語一覧**: 単語・読み・分類・分野タグ・時代タグ・その他タグ・登録日の列で並び替えできます。並び替えた列に連動したグループ表示（頭文字など）、一覧内検索、分類フィルターがあります。
- **タグ一覧**: タグ名から該当する単語一覧へ移動できます。タグの一括改名・削除に対応します。
- **検索・階層表示**: 意味・背景・ニュアンス・例文・類義語・タグを横断して全文検索できます。サイドバーは分類・時代・分野で切り替えられます。
- **意味単位の編集**: 1 つの語に複数の意味を持たせ、意味ごとに追加・コピー・貼り付け・複製・削除・順序変更ができます。
- **インポート / エクスポート**: 複数 JSON の一括取り込み、JSON の貼り付け取り込み、重複単語のマージと競合確認に対応します（次節）。
- **AI 入力支援**: 設定の「AIに送るプロンプトをコピー」で、DT-FMT の形式規則と登録済みタグ一覧をまとめてコピーできます。「DT-FMT定義を確認」で形式を画面上でも確認できます。
- **画面履歴**: 画面上部の「戻る」「進む」でアプリ内の画面を移動できます。

## データ形式（DT-FMT v5.17）

JSON Schema Draft 2020-12 に基づく形式です。単語名を `words` オブジェクトのキーにし、1 つの語の中に `meanings` 配列を置いて、意味ごとに定義・背景・ニュアンス・分野タグ・例文・類義語を保存します。
全項目の説明は [docs/DT-FMT.md](docs/DT-FMT.md) にあります。最小の例は次のとおりです。

```json
{
  "words": {
    "カスケード": {
      "pronunciation": "",
      "id": 1,
      "datetime": "2026-10-09T10:00:00+09:00",
      "category": "外来語",
      "categoryTags": ["外来語"],
      "reading": "かすけーど",
      "english": "cascade",
      "meanings": [
        {
          "definition": "必須の意味・定義",
          "fieldTag": ["IT"],
          "examples": [],
          "synonyms": [],
          "antonyms": [],
          "similarWordsDifference": ""
        }
      ]
    }
  },
  "additional_data": []
}
```

### 表示名の表記ルール

- 単語名（`words` のキー）には見出し語だけを書き、読みを括弧で付けません。
- 読みは `reading`、原語・正式名称は `english`、発音記号は `pronunciation` に保存します。
- 例: `カスケード` + `reading: かすけーど` + `english: cascade`（`カスケード（かすけーど）` とは書きません）。

### インポート時の扱い

- DT-FMT の `words` オブジェクト形式を読み込みます。旧版アプリの単語配列 JSON も、移行用として受け付けます。
- 複数の JSON ファイルを一度に選択できます。いずれかが不正な場合は、現在のデータを変更せずに取り込み全体を中止します。
- 既存の辞書へ追加する場合は、単語名の重複を判定してマージします。タグ・例文・類義語などのリストは自動で統合し、テキスト項目が競合するときは採用する値を選択します。
- ID は取り込み時に登録順で採番し直します。
- 取り込みは JSON 貼り付け欄からも同じ処理で行えます。

## テスト

```text
node test_or_future/phase1_smoke.test.js            # アプリのロジック・HTML/CSS の構造
node test_or_future/docs_consistency.test.js        # README・ランチャー・HTML のバージョン整合とリンク切れ
python -m unittest test_or_future.test_phase1_format -v   # DT-FMT のスキーマ検証（pip install "jsonschema[format]" が必要）
python -m py_compile run.py                         # ランチャーの構文確認
```

Node.js 20 と Python 3.9 以降を想定しています。上記は GitHub Actions（`.github/workflows/nango-smoke.yml`）でも実行されます。

## リポジトリ構成

```text
.
├── README.md                 このファイル
├── run.py / RUN_NANGO.bat    ローカルランチャー（標準ライブラリのみ）
├── Nango-neo/                アプリ本体（HTML / JS / CSS / ロゴ）
│   └── DTformats.neo.v5.17/  DT-FMT のスキーマ・AI 指示・テンプレート
├── docs/                     ドキュメント
│   ├── CONTRIBUTING.md       開発ルール・バージョン管理・リリース手順
│   ├── DT-FMT.md             データ形式の仕様
│   ├── RUN_WITH_PYTHON.md    ランチャーとローカル保存
│   ├── PHASE1_IMPLEMENTATION.md  Phase 1 の実装記録
│   ├── ROADMAP.md            開発ロードマップ
│   ├── neo-versions.md       バージョン履歴・データ形式の変遷
│   ├── releases/             リリースノート
│   └── archive/              過去のメモ・初期の会話ログ
├── test_or_future/           テストとサンプル
├── data/                     個人の辞書データ（Git 管理外の想定）
└── .github/workflows/        スモークテスト / GitHub Pages
```

## ドキュメント

| 目的 | ドキュメント |
| ---- | ------------ |
| 使い始める | このファイル、[RUN_WITH_PYTHON.md](docs/RUN_WITH_PYTHON.md) |
| データ形式を知る | [DT-FMT.md](docs/DT-FMT.md) |
| 開発に参加する | [CONTRIBUTING.md](docs/CONTRIBUTING.md) |
| 変更履歴を見る | [neo-versions.md](docs/neo-versions.md)、[releases/](docs/releases/) |
| 今後の予定を見る | [ROADMAP.md](docs/ROADMAP.md) |
| 実装の経緯を見る | [PHASE1_IMPLEMENTATION.md](docs/PHASE1_IMPLEMENTATION.md)、[archive/](docs/archive/) |
