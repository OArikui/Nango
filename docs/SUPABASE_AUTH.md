# Nango: Supabase Auth と RLS の設定

Nango は静的な GitHub Pages サイトから Supabase Auth と PostgreSQL Data API を呼び出します。Python サーバーや独自のバックエンド API は不要です。

## 1. Supabase のテーブルと RLS

1. Supabase でプロジェクトを作成します。
2. **SQL Editor** を開き、[`supabase-setup.sql`](supabase-setup.sql) の内容を実行します。
3. SQL の実行後、Table Editor で `public.nango_user_data`、`public.nango_user_settings`、`public.nango_user_view_events` が作成されていることを確認します。

辞書全体は `nango_user_data.data`、表示設定は `nango_user_settings.settings` に、それぞれ別の JSONB として格納します。単語詳細の閲覧イベントは `nango_user_view_events` に1閲覧1行で記録します。辞書・設定の行は本人のみ select / insert / update / delete、閲覧イベントは本人のみ select / insert できるRLSポリシーを設定します。いずれも `auth.uid() = user_id` を要求し、統計を辞書JSONに混ぜることはありません。

## 2. GitHub Pages の URL を Supabase Auth に登録

1. GitHub リポジトリの **Settings → Pages** で公開 URL を確認します。
2. Supabase の **Authentication → URL Configuration** を開きます。
3. **Site URL** に Nango の GitHub Pages URL を入力します。
4. **Redirect URLs** に、公開 URL の完全なパスを追加します。通常は `https://<owner>.github.io/<repository>/` の形式です。独自ドメインを使っている場合は、実際の公開 URL を指定してください。

メール確認を有効にした場合、登録確認リンクが許可した URL に戻る必要があります。デプロイ前に URL を設定してください。

## 3. リポジトリに公開用設定を置く

1. `Nango-neo/supabase-config.json` を開き、`url` に Supabase Project URL、`publicKey` に公開用 publishable key を記入します。JSON 形式なので、値を引用符で囲み、カンマなどの構文を壊さないようにしてください。
2. このファイルを GitHub リポジトリにコミットし、`NEO` ブランチへ取り込みます。GitHub Pages にデプロイされると、利用者は URL とキーを毎回入力せずに接続できます。
3. Supabase の **Authentication → URL Configuration** で Site URL と Redirect URLs を登録しておきます。

公開用キーはブラウザーへ配布することを前提にした値なので、公開リポジトリに保存しても問題ありません。推奨は `sb_publishable_...` 形式です。旧形式の `anon` キーも利用できます。**`service_role` / `sb_secret_...` などの秘密鍵は絶対に記述しないでください。** 詳細は [Supabase API Keys](https://supabase.com/docs/guides/getting-started/api-keys) を参照してください。

画面の「アカウント」から URL と公開用キーを入力して「接続設定を保存」することもできます。この場合は入力した値がそのブラウザーの `localStorage` に上書き設定として保存され、リポジトリ設定より優先されます。「ブラウザーの上書き設定をリセット」を使うと、リポジトリ既定値に戻せます。

## 4. アカウント作成とメール認証

1. Nango の「アカウント」を開き、「新規登録はこちら」から独立した登録ページへ進みます。
2. メールアドレス、8 文字以上のパスワード、確認用パスワードを入力し、プライバシーポリシーに同意して登録します。
3. Supabase の Email Confirmations が有効な場合は、受信した確認メールのリンクを開きます。確認リンクの戻り先は `getSupabaseRedirectUrl()` で現在の Nango ページに設定されます。
4. Nango に戻ると「メール認証結果」ページに認証結果を表示します。結果は Supabase Auth の `email_confirmed_at` を基準に判定します。未認証の場合は同じページから確認メールを再送できます。
5. 認証済みになったら「アカウント画面へ」進み、メールアドレスとパスワードでログインします。次回以降は保存されたセッションを利用します。

Supabase 側で Email Confirmations を無効にしている場合は、確認メールを使わずに登録・ログインできる構成になります。

## 5. データの保存・移行

- **未ログイン:** 辞書データと表示設定は、これまでどおり `localStorage` を使用します。Python ランチャーから起動した場合は、従来のローカル JSON 保存も動作します。
- **ログイン済み:** 辞書データは `nango_user_data.data`、表示設定（`showGeminiNote` と `defaultDisplayMode`）は `nango_user_settings.settings` にユーザー単位で保存します。単語詳細の閲覧イベントは `nango_user_view_events` にユーザー単位で保存します。表示設定・閲覧統計の `localStorage` はキャッシュ／同期保留用として使い、辞書JSONには含めません。
- **既存のクラウド辞書がある:** ログイン時にクラウド辞書を読み込みます。ログイン前の localStorage データは自動で削除・上書きしません。
- **クラウド辞書がまだない:** 現在表示している辞書を、そのアカウントの初期クラウドデータとして保存します。
- **クラウド表示設定がある:** ログイン時はクラウド側の表示設定を正として読み込み、ブラウザーのキャッシュを更新します。
- **クラウド表示設定がない／空:** 既存の `nango_settings_v272` にある表示設定を、そのアカウントの初期設定として `nango_user_settings` に移行します。
- **表示設定の保存に失敗した:** 表示設定はメモリと localStorage のキャッシュに保持し、ユーザー ID 付きの同期保留情報を残します。通信回復時または次回ログイン・クラウド再接続時に再送します。別ユーザーの保留設定を他のアカウントへ送ることはありません。
- **ローカル辞書をクラウドへ移したい:** ログイン後に **ローカル辞書でクラウドを置き換える** を押します。クラウド側の全データを置き換えるため、表示される確認を読んでから実行してください。
- **クラウド読込に失敗した:** 同期を保留して localStorage で動作します。エラーを解消し、**クラウド再接続** を実行するまでクラウドデータを自動上書きしません。
- **閲覧統計:** 登録数は既存の各単語のRFC 3339 `datetime` から集計するため、新しい登録日時データは追加しません。閲覧数は単語詳細を表示するたびにイベントとして記録し、未ログイン時はlocalStorage、ログイン時は `nango_user_view_events` に保存します。通信に失敗したイベントはユーザーIDごとに保留し、オンライン復帰時に再送します。以前は閲覧イベントを記録していなかったため、導入前の閲覧数は復元できません。
- **ログアウト:** localStorage に保持されているブラウザー内の辞書へ戻ります。クラウド上の辞書・表示設定・閲覧統計は削除されません。

ログイン中の辞書編集と表示設定は、それぞれ専用の Supabase テーブルへ保存されます。表示設定の保存に失敗してもアプリの操作は継続でき、同期保留情報を利用して再送します。辞書データの保存に失敗した場合は、画面に保存エラーが出たときにページを閉じる前に JSON エクスポートでバックアップしてください。

## 6. テストと制約

GitHub Actions は辞書・表示設定・閲覧イベントの各テーブルとRLS SQL、およびクライアント側の保存・同期処理を検査します。実際のログイン・メール確認・クラウド保存には、各利用者の Supabase プロジェクト設定が必要です。公開用設定ファイルには Project URL と publishable キーだけを含めてください。秘密鍵をリポジトリに保存する構成ではありません。

## 7. プライバシーポリシー

公開サイトには [プライバシーポリシー](../Nango-neo/privacy-policy.html) を掲載しています。運営主体、問い合わせ窓口、実際の保存方法が運用実態に合っているかを、公開前に確認してください。
