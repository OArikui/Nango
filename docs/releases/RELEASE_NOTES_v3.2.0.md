# Nango-neo v3.2.0

## iOS Safari / PWA 対応

- PWA マニフェストを追加し、Nango のロゴ・アプリ名・テーマカラー・スタンドアロン起動設定を定義。
- iPhone / iPad の Safari でホーム画面へ追加する手順を画面内に案内。
- Service Worker で HTML / CSS / JavaScript / ロゴ / DT-FMT 定義をキャッシュし、アプリ画面をオフラインでも再表示可能に。
- Supabase、認証、辞書データの API 通信はキャッシュ対象外とし、機密性のある通信をアプリシェルのキャッシュに混在させない。
- iOS のセーフエリア、フォーム入力時の自動拡大、タッチ操作領域、スクロールを調整。
- クイズページの viewport をセーフエリア対応に更新。

## 互換性・制限

- 既存の Supabase Auth、RLS、localStorage、DT-FMT v5.17 のデータ形式は変更しない。
- オフライン時に利用できるのはキャッシュ済み画面とブラウザー内に保存済みのデータ。Supabase ログイン・クラウド同期には通信が必要。
- 本リリースは Safari のホーム画面 Web アプリ対応であり、App Store 配布用のネイティブ iOS アプリではない。
