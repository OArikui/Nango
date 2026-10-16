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

## 3. リポジトリに公開用設定を置く

1. `Nango-neo/supabase-config.js` を開き、`url` に Supabase Project URL、`publicKey` に公開用 publishable key を記入します。
2. このファイルを GitHub リポジトリにコミットし、`NEO` ブランチへ取り込みます。GitHub Pages にデプロイされると、利用者は URL とキーを毎回入力せずに接続できます。
3. Supabase の **Authentication → URL Configuration** で Site URL と Redirect URLs を登録しておきます。

公開用キーはブラウザーへ配布することを前提にした値なので、公開リポジトリに保存しても問題ありません。推奨は `sb_publishable_...` 形式です。旧形式の `anon` キーも利用できます。**`service_role` / `sb_secret_...` などの秘密鍵は絶対に記述しないでください。** 詳細は [Supabase API Keys](https://supabase.com/docs/guides/getting-started/api-keys) を参照してください。

画面の「アカウント」から URL と公開用キーを入力して「接続設定を保存」することもできます。この場合は入力した値がそのブラウザーの `localStorage` に上書き設定として保存され、リポジトリ設定より優先されます。「ブラウザーの上書き設定をリセット」を使うと、リポジトリ既定値に戻せます。

## 4. アカウント作成

1. **新規登録** でメールアドレスとパスワード（8 文字以上）を登録します。メール確認が有効な場合は確認メールを開きます。
2. 同じ画面でログインします。
3. 次回以降は保存されたセッションを利用します。

## 5. データの保存・移行

- **未ログイン:** これまでどおり `localStorage` を使用します。Python ランチャーから起動した場合は、従来のローカル JSON 保存も動作します。
- **ログイン済み:** 辞書データは Supabase に保存します。表示設定などのアプリ設定は、従来どおりこのブラウザーに保存されます。
- **既存のクラウド辞書がある:** ログイン時にクラウド辞書を読み込みます。ログイン前の localStorage データは自動で削除・上書きしません。
- **クラウド辞書がまだない:** 現在表示している辞書を、そのアカウントの初期クラウドデータとして保存します。
- **ローカル辞書をクラウドへ移したい:** ログイン後に **ローカル辞書でクラウドを置き換える** を押します。クラウド側の全データを置き換えるため、表示される確認を読んでから実行してください。
- **クラウド読込に失敗した:** 同期を保留して localStorage で動作します。エラーを解消し、**クラウド再接続** を実行するまでクラウドデータを自動上書きしません。
- **ログアウト:** localStorage に保持されているブラウザー内の辞書へ戻ります。クラウド上の辞書は削除されません。

ログイン中の編集はクラウド保存されますが、ネットワーク障害時は保存が失敗する場合があります。画面に保存エラーが出た場合は、ページを閉じる前に JSON エクスポートでバックアップしてください。

## 6. テストと制約

GitHub Actions は RLS SQL の構成とクライアント側の保存モードを検査します。実際のログイン・メール確認・クラウド保存には、各利用者の Supabase プロジェクト設定が必要です。公開用設定ファイルには Project URL と publishable キーだけを含めてください。秘密鍵をリポジトリに保存する構成ではありません。
