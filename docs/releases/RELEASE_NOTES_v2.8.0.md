# Nango-NEO v2.8.0 — ドキュメント・構成の整理

アプリの機能は変更していません。ドキュメントの整合性とリポジトリ構成を整理したリリースです。

## 変更内容

### リポジトリ構成

- 置き換え済みの旧版ファイルを削除（履歴は Git に残ります）。
  - HTML: `v02.6.0` / `v02.7.1` / `v02.7.2` / `v02.7.3`
  - JavaScript: `v01.6.0` / `v01.7.1` / `v01.7.2`
  - CSS: `v02.6.0` / `v02.7.1` / `v02.7.2`
- DT-FMT `v5.14` / `v5.15` フォルダーを削除。現行の `v5.16` のみを残しました。
- `data/` の重複した辞書データ（v5.12 / v5.13）を削除。最新の `v5.14` のスナップショットだけを残しました。
- 旧スキーマ（v5.12）を対象にしていた `test_or_future/json_test.py` と `pre_JSON_schema.json` を削除。
- `.gitignore` に `user_data/`（ランチャーが自動保存する辞書）、`__pycache__/`、`_site/`、OS の一時ファイルを追加。
- `.vscode/settings.json` の `ruff.lineLength` を、Black と同じ 120 に統一。

### ドキュメント

- `docs/ReadME.md` を、リポジトリ直下の `README.md` に移動して全面改訂。現行版（v2.8.0 / DT-FMT v5.16）、起動方法 3 種、保存先、主な機能、テスト、構成図、ドキュメント一覧を記載。
- `docs/CONTRIBUTE.md` を `docs/CONTRIBUTING.md` に改名して全面改訂。実際のファイル名規則、リリース手順チェックリスト、コミットメッセージの書き方を追記。個人の PC のパスへのリンクを削除。
- 新規: `docs/DT-FMT.md`（DT-FMT v5.16 の項目・タグの使い分け・書き方のルール）。
- `docs/neo-versions.md` を再構成。アプリバージョン履歴、ファイルバージョンの対応、DT-FMT v5.12〜v5.16 の変遷を追加し、初期のデータ形式メモは付録に移動。存在しないファイルへのリンクを解消。
- `docs/RUN_WITH_PYTHON.md` と `docs/LOCAL_DATA_STORAGE.md` を統合。保存先の変更、`user_data/settings.json`、ポートの扱いを追記。
- `docs/PHASE1_IMPLEMENTATION.md` の古い参照（v5.13 フォルダー、削除したテスト）を更新し、`neo-versions.md` と重複していた末尾の記述を削除。
- `docs/Where am I drifting to.md` を `docs/ROADMAP.md` に改名。
- リリースノートを `docs/releases/` へ、`Gemini_first_talk.md` と `Nango.memo.md` を `docs/archive/` へ移動。

### テスト・CI

- 新規: `test_or_future/docs_consistency.test.js`。HTML・`run.py`・README のバージョンとファイル名の一致、各ファイルが 1 つだけであること、リリースノートの存在、Markdown の相対リンク切れを確認します。
- `test_phase1_format.py` の参照先が存在しない v5.13 フォルダーだったため、v5.16 に修正。
- GitHub Actions に、ドキュメント整合性テストとスキーマテスト（`jsonschema` をインストール）を追加。停止済みのブランチ（`neo.v2.7.1-ui-fixes`）のトリガーを削除。
- スモークテストに、`app-name` メタ情報のバージョン確認を追加。

### バージョン

- HTML: `Nango-neo.v02.8.0.html`（画面のバージョン表示とメタ情報も v2.8.0 に更新。`app-name` は v2.7.4 のまま残っていたため修正）。
- JavaScript `v01.7.3` と CSS `v02.7.3` は内容の変更がないため、番号を据え置き。
- DT-FMT は `v5.16` のまま変更なし。
- `run.py` の説明文と起動対象を v2.8.0 に更新。

## 互換性

- データ形式、保存データ（`user_data/nango_data.json`、`localStorage`）に変更はありません。
- HTML のファイル名が変わります。旧ファイル名をブックマークしている場合は、新しい名前で開き直してください。ランチャーと GitHub Pages は自動で新しいファイルを指します。
- 削除したファイルが必要な場合は、Git の履歴から取り出せます。

## 検証

GitHub Actions で、Node.js のスモークテスト、ドキュメント整合性テスト、DT-FMT スキーマテスト、Python ランチャーの構文チェック、DT-FMT JSON の妥当性を確認する。
