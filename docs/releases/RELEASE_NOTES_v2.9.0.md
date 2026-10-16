# Nango-neo v2.9.0

日付: 2026-10-16

## 変更内容

- Supabase Auth のメールアドレス・パスワードによる新規登録、ログイン、ログアウトを追加。
- ログイン時の辞書データ保存先を Supabase PostgreSQL に切り替え、`nango_user_data` テーブルの RLS でユーザーごとに分離。
- 未ログイン時は従来どおり `localStorage` へ保存。Python ランチャー利用時のローカル JSON 自動保存も維持。
- クラウドデータ読み込み失敗時は同期を保留し、クラウドを自動上書きしないよう変更。
- ログイン前に使っていた localStorage データを自動削除しない。ローカル辞書をクラウドにコピーする場合は、明示操作と上書き確認を必須にした。
- GitHub Pages での使用に必要な Supabase 設定 UI、リポジトリ既定設定ファイル、RLS SQL、セットアップ手順を追加。
- アプリを v2.9.0、JavaScript を v01.8.0、CSS を v02.8.0 に更新。DT-FMT v5.17 は変更なし。

## 設定

1. `docs/supabase-setup.sql` を Supabase SQL Editor で実行する。
2. Supabase Auth の URL Configuration に公開中の GitHub Pages URL を登録する。
3. `Nango-neo/supabase-config.js` に Project URL と公開用 publishable キーを設定してコミットする（アカウント画面からブラウザー単位で上書きすることも可能）。
4. メールアドレスとパスワードで登録・ログインする。

公開用 publishable / anon キーは公開前提であり、リポジトリに配置できます。`service_role` / `sb_secret_...` はブラウザーやリポジトリに配置しないこと。

## 検証

- Node.js スモークテストで、ローカル／クラウド保存モードの分岐と RLS SQL の基本構成を検査。
- GitHub Actions にてドキュメント整合性、DT-FMT スキーマ、Python 構文、JSON の検証を実行。
- Supabase プロジェクトの実際の URL・キーを用いた接続試験は、プロジェクト設定が未提供のため実施していない。
