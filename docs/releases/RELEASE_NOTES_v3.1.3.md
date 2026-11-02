# Nango-neo v3.1.3

リリース日: 2026-11-02

## UI・ナビゲーション

- ヘッダーの「今日の単語」ボタンを削除し、サイドバー上部に今日の単語と詳細画面へのリンクを配置。
- 設定画面を開いている間はサイドバーを非表示に変更。
- 「アカウント」を設定画面内のサブページへ移動。ヘッダーの未ログイン時「ログイン」ボタンも「設定 > アカウント」を開く。
- アカウントページから設定の一般ページへ戻る操作と、戻る／進む履歴に対応。

## 単語詳細表示

- 類義語を複数表示する際、各単語の間に縦棒（`|`）を追加。

## バージョン

- HTML: `Nango-neo.v03.1.3.html`
- JavaScript: `Nango_main.v02.0.6.js`
- CSS: `style.v02.8.4.css`
- DT-FMT: v5.17（変更なし）

## 確認

- `node test_or_future/phase1_smoke.test.js`
- `node test_or_future/quiz_smoke.test.js`
- `node test_or_future/docs_consistency.test.js`
- `python -m py_compile run.py`
