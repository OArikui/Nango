# Nango-neo v2.10.0

日付: 2026-10-16

## 変更内容

- Supabase の公開設定を実行コード形式の JavaScript から、標準的な JSON 設定ファイル Nango-neo/supabase-config.json に変更。
- アプリ起動時に JSON 設定を読み込み、ブラウザーごとの localStorage 上書き設定を優先する構成へ整理。
- アプリのフッターから利用者向けプライバシーポリシーを開けるように変更。
- プライバシーポリシーに、ローカル保存・Supabase のアカウント認証とクラウド保存・ホスティング/CDN・保存期間・問い合わせ時の注意を記載。
- アプリを v2.10.0、JavaScript を v01.9.0 に更新。CSS と DT-FMT v5.17 は変更なし。

## 設定

1. Nango-neo/supabase-config.json の url と publicKey に値を設定する。
2. 公開用 sb_publishable_ キー（または旧形式の anon キー）のみを使用し、service_role / sb_secret_ は設定しない。
3. Supabase 側で nango_user_data テーブルの RLS と Auth の Site URL / Redirect URLs を設定する。
4. プライバシーポリシーの運営者・問い合わせ窓口が実際の運用と一致するか、公開前に確認する。

公開設定ファイルの Project URL と publishable キーはブラウザーへ配布されます。RLS は必須です。値はまだ空欄のままなので、実際の Supabase プロジェクトが設定されるまではアカウント同期は利用できません。

## 検証

- スモークテストを JSON 設定ファイルの読み込み、プライバシーポリシーの存在・内容、アプリからのリンクに対応。
- ドキュメント整合性テストで HTML / JavaScript / run.py / README / リリースノートのバージョン整合性を検査。
- 実際の Supabase プロジェクトを用いたログイン・クラウド保存試験は、Project URL とキーが未設定のため未実施。
