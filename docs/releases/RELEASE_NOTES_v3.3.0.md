# Nango-neo v3.3.0

## ユーザー別表示設定のクラウド保存

- 「AIからの一言を表示する」「既定の単語表示モード」をログイン中アカウントに紐付けて Supabase の `nango_user_settings.settings` に保存。
- 辞書データの `nango_user_data.data` とは別テーブルに分離し、表示設定が DT-FMT や JSON エクスポートへ混入しない構成に変更。
- Supabase に有効な設定がある場合はクラウド側を優先して復元。
- クラウド設定が未作成または空の場合は、従来の `nango_settings_v272` を初期値として一度だけ移行。
- 未ログイン時は従来どおり localStorage に保存し、ログイン中も localStorage をキャッシュとして保持。
- 通信失敗時はユーザー ID ごとの同期保留情報を残し、オンライン復帰・次回ログイン・クラウド再接続時に再送。
- 再送時は保留設定とクラウド行の更新日時を比較し、より新しい設定を維持。

## Supabase セットアップ

- `docs/supabase-setup.sql` に `nango_user_settings` と、本人のみ select / insert / update / delete できる RLS ポリシーを追加。
- 既存 Supabase プロジェクトでは、更新後の SQL を Supabase SQL Editor で実行してください。

## 互換性・検証

- 既存の辞書データ、DT-FMT v5.17、JSON エクスポート形式、未ログイン時の localStorage 保存は変更しません。
- HTML: `Nango-neo.v03.3.0.html`
- JavaScript: `Nango_main.v02.0.7.js`
- CSS: `style.v02.9.1.css`（変更なし）
- アプリ／クイズのスモークテスト、JavaScript 構文、ドキュメント整合性、DT-FMT、ランチャー API、Python 構文を検証します。
