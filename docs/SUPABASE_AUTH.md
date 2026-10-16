# Nango: Supabase Auth と RLS の設定

Nango は静的な GitHub Pages サイトから Supabase Auth と PostgreSQL Data API を呼び出します。Python サーバーや独自のバックエンド API は不要です。

## 1. Supabase のテーブルと RLS

1. Supabase でプロジェクトを作成します。
2. **SQL Editor** を開き、[`supabase-setup.sql`](supabase-setup.sql) の内容を実行します。
3. SQL の実行後、Table Editor で `public.nango_user_data` が作成されていることを確認します。

各ユーザーの辞書全体を 1 行の JSONB として格納します。主キー `user_id` は認証ユーザー ID です。RLS ポリシーは select / insert / update / delete のすべてで `auth.uid() = user_id` を要求します。

## 2. GitHub Pages の URL を Supabase Auth に登録

1. GitHub リポジトリの **Settings → Pages** で公開 URL を確認します。
2. Supabase の **Authentication → URL Configuration** を開きます。
3. **Site URL** に Nango の GitHub Pages URL を入力します。
4. **Redirect URLs** に、公開 URL の完全なパスを追加します。通常は `https://<owner>.github.io/<repository>/` の形式です。独自ドメインを使っている場合は、実際の公開 URL を指定してください。

メール確認を有効にした場合、登録確認リンクが許可した URL に戻る必要があります。デプロイ前に URL を設定してください。

## 3. Nango の接続設定

1. GitHub Pages 上で Nango を開き、**アカウント** を選択します。
2. Supabase の **Project URL** と公開用キーを貼り付け、**接続設定を保存** を押します。
3. **新規登録** でメールアドレスとパスワード（8 文字以上）を登録します。メール確認が必要な設定の場合は、確認メールを開いてからログインします。
4. 次回以降は同じ画面でログインします。

公開用キーは Supabase の publishable key、または legacy anon key を使用します。**service_role / secret key は絶対にブラウザーへ貼り付けず、HTML、JavaScript、GitHub リポジトリに保存しないでください。** 公開キーだけではデータを閲覧できないよう、RLS を必ず有効にしておく必要があります。

## 4. データの保存・移行

- **未ログイン:** これまでどおり `localStorage` を使用します。Python ランチャーから起動した場合は、従来のローカル JSON 保存も動作します。
- **ログイン済み:** 辞書データは Supabase に保存します。表示設定などのアプリ設定は、従来どおりこのブラウザーに保存されます。
- **既存のクラウド辞書がある:** ログイン時にクラウド辞書を読み込みます。ログイン前の localStorage データは自動で削除・上書きしません。
- **クラウド辞書がまだない:** 現在表示している辞書を、そのアカウントの初期クラウドデータとして保存します。
- **ローカル辞書をクラウドへ移したい:** ログイン後に **ローカル辞書でクラウドを置き換える** を押します。クラウド側の全データを置き換えるため、表示される確認を読んでから実行してください。
- **クラウド読込に失敗した:** 同期を保留して localStorage で動作します。エラーを解消し、**クラウド再接続** を実行するまでクラウドデータを自動上書きしません。
- **ログアウト:** localStorage に保持されているブラウザー内の辞書へ戻ります。クラウド上の辞書は削除されません。

ログイン中の編集はクラウド保存されますが、ネットワーク障害時は保存が失敗する場合があります。画面に保存エラーが出た場合は、ページを閉じる前に JSON エクスポートでバックアップしてください。

## 5. テストと制約

GitHub Actions は RLS SQL の構成とクライアント側の保存モードを検査します。実際のログイン・メール確認・クラウド保存には、各利用者の Supabase プロジェクト設定が必要です。プライバシーのため、認証情報をリポジトリのソースにハードコードしない設計です。
