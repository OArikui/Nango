# From neo.01.0.0 based Nango v3.10

## appversion

### 1. neo.01.0.0

#### **files**

    - Nango-neo.v01.1.0.html
    - Nango_main.v01.0.0.js
    - Nango-neo_template.v01.json

## HTML version

### 1. v01.0.0

#### 変更

        - javascript inline ->  import

## JavaScript version

## Json version

* 辞書のキーは　```*`"key"`*```と書く

### 0. [base(v03.10)](Nango_templates\template_v03_10_v04_xx.json)

#### **文書形式**

    例+雛形

#### **項目一覧**

    - 語彙
    - 意味
    - 言葉の背景・由来
    - ニュアンス
    - 例文
    - 類義語
    - 管理用ID（自動採番されるので省略可）
    - カテゴリー（ツリー大分類）
    - よみがな（五十音ソートに使用）
    - 漢字表記
    - 英語・原語表記
    - 分野タグ（ツリー軸の切り替えに使用）
    - 時代タグ（同上）

#### **構造**

```
list  
    dict  
        - *`"id"`* (int)
        - *`"word"`* ~ *`"nuance"`* (str)  
        - *`"examples"`* (list[str...])  
        - *`"synoyms"`* (list[str...])
```

---

### 1. [v01](Nango_templates\Nango-neo_template.v01.json)

#### **文書形式**

    例

#### **構造**

```
dict
    - *`"words"`* (list)
        list  
            dict  
                - *`"id"`* (int)
                - *`"word"`* ~ *`"english"`* (str)  
                - *`"other_tags"`* (list[str...])
                - *`"meanings"`* (list[dict...])
                    list
                        dict
                            - *`"definition"`* ~ *`"nuance"`* (str)
                            - *`"examples"`* (list[str...])  
                            - *`"synoyms"`* (list[str...])
                - *`"memo"`* (str)
                - *`"gemini_note"`* (str)
```

* 拡張性を持たせるために全体をdictにいれての *`"words"`*の値として再定義  
`words以外の情報や、より大きなword分類に対応`

#### **新規項目**

* *`"meaning"`* (list)  
ひとつの単語が複数の意味合いを持っている場合にそれぞれdictを作成し、羅列する。  
以下を内包するdictのリスト *`meaning, background, nuance, examples, >synonyms`*

* *`"other_tags"`*（list）
    分野や時代だけでなく、「ステータス」「アクセシビリティ」などの細かい複数の関連タグ

* *`"memo"`* (str)  
    後述の特殊な符号,また、userのメモ、自由記述欄`言葉を知ったきっかけなど`

* *`"gemini_note"`* (str)  
    Geminiの一言。Frashmodeだとmemoに自分の一言を書き始めるので追加したが、存外悪くないので維持

---

### 2. [v02](Nango_templates\Nango-neo_template.v02.json)

#### **構造**

```
dict
    - *`"\\"`* (str)  $words全体指示
    - *`"words"`* (list[dict...])
        list  
            dict  
                - *`"id"`* (int)
                - *`"word"`* ~ *`"english"`* (str)  
                - *`"other_tags"`* (list[str...])
                - *`"meanings"`* (list[str,dict...])
                    list
                        dict
                            - *`"\\"`* (str)  $meaningsの条件指示
                            - *`"definition"`* ~ *`"nuance"`* (str)
                            - *`"examples"`* (list[str...])  
                            - *`"synoyms"`* (list[str...])
                - *`"column"`* (str)
                - *`"memo"`* (str)
                - *`"\\"`* (str)  $memoの条件指示
                - *`"gemini_note"`* (str)
```

* 拡張性を持たせるために全体をdictにいれての *`"words"`*の値として再定義  
`words以外の情報や、より大きなword分類に対応`

#### **文書形式**

    雛形

#### **新規項目**

* *`"column"`* (str)  
言葉にまつわる豆知識や、さらに深掘りしたエピソード

* *`"\\"`* (str)  
AIへの指示文。単語の性質による条件分岐やJavaScriptでは`"\\"`で始まるキーを無視する。

>## v02.01
>
>* idの次に *`"datetime"`*=`"yyyymmdd_HHMM"`　登録日時の項目を追加
>* *`"memo"`* 条件指示 `記号、文字の説明ならunicodeとjiscodeの記載`を追加

### 3.[v03.00](Nango_templates\Nango-neo_template.v03.00.json)

Javascript内で形式確認用に使うための変更

#### **構造**

```
dict
    - *`"\\"`* (str)  $words全体指示
    - *`"words"`* (list[dict...])
        list  
            dict  
                - *`"id"`* (int)
                - *`"word$"`* ~ *`"english"`* (str)  
                - *`"column"`* (str)
                - *`"memo"`* (str)
                - *`"\\"`* (str)  $memoの条件指示
                - *`"gemini_note"`* (str)
                - *`"other_tags"`* (list[str...])
                - *`"meanings"`* (list[str,dict...])
                    list
                        dict
                            - *`"\\"`* (str)  $meaningsの条件指示
                            - *`"definition$"`* ~ *`"nuance"`* (str)
                            - *`"examples"`* (list[str...])  
                            - *`"synoyms"`* (list[str...])
```

* `str型`の値を持つkeyを初めに寄せて、そのあとに`list型`を持つものを集めた。

Jsの形式確認のfor文中で、特別処理が必要な *`"meanigs"`* を最後に行う。

* 必須項目の目印として,該当keyに *`"$"`* を付けた。

Jsでの処理で条件分岐する際に用いほか、手動で単語情報を作製する際にも有用である。

#### **文章形式**

    雛形

#### **新規項目**

なし


## Phase 1実装更新（2026-10-09）

### Nango-neo v02.0.0 — DTformats.neo.v5.12対応

- HTMLからJavaScriptを読み込むよう修正し、単体ブラウザーアプリとして起動可能にした。
- `words` オブジェクトを単語名キーとして扱うv5.12形式へ読込・保存・エクスポートを統一。
- 複数 `meanings`、配列形式の `fieldTag`、`other_tags`、コラム・メモ・AIコメントに対応。
- 旧配列形式からの移行、必須項目検査、RFC 3339日時検査、ID再採番を追加。
- 複数ファイルのインポート、括弧内表記の重複判定、リスト項目マージ、競合確認を追加。
- タグ検索と階層表示、タグ一括改名、意味単位の追加・コピー・貼り付け・複製・削除・順序変更を実装。
- JSON貼り付け取り込みと「今日の単語」を追加。
- JSON Schema Draft 2020-12、Node.jsスモークテスト、Chromium上のUI操作テストを追加。


### 分野タグの複数化修正（2026-10-09）

- `fieldTag` の中点連結値を独立した複数タグへ正規化。
- 分野タグ編集欄で中点を区切り文字として利用可能に変更。
- AI指示・スキーマ説明・テンプレートを更新し、タグ1件につき配列要素1つを明記。
- `other_tags` の固有名詞（例: `チーム・バチスタ`）と `category` は自動分割せず、名称を保持。


### 単語一覧機能（2026-10-09）

- Nango-neo v02.1.0 / JavaScript v01.1.0 / CSS v02.1.0。
- ツールバーから単語一覧を開き、登録順・五十音順で表示可能。
- 単語名・読み・分類・タグを一覧化し、一覧内検索と単語詳細への移動に対応。


## v02.2.0 / DTformats.neo.v5.13: 表示名の読み表記統一

- 外来語・外国語・略語・記号や難読漢字の表示名は、必要に応じて `見出し語（読み）` に統一する。
- 括弧は全角 `（ ）`、括弧内は `reading` と一致する日本語の読みとする。
- 原語・正式名称は `english` に保持し、表示名の括弧内へ混在させない。
- インポート、ローカル保存データ読み込み、新規登録時に既存の括弧表記を正規化する。


## v02.3.0 / DTformats.neo.v5.14
- 単語名から読みを括弧で付ける形式を廃止し、reading フィールドに分離。原語は english に保存。
- タグ一覧のタグ名から該当単語一覧へ移動できる機能を追加。単語詳細・単語一覧のタグもクリック可能。
- 単語一覧に昇順・降順切替を追加。


### Nango-NEO v2.6.0 — モダンUI刷新（2026-10-10）

- アプリヘッダーをブランド表示付きに更新し、v2.6.0を明示。
- CSSを再設計し、統一されたカラートークン、角丸、余白、影、フォーカス表示を導入。
- サイドバー、階層ツリー、検索欄、操作ボタン、フォーム、テーブルを刷新。
- モバイル幅を含むレスポンシブレイアウトと、OSの動き軽減設定への対応を追加。
- 内部ファイル名をHTML `v02.6.0`、JavaScript `v01.6.0`、CSS `v02.6.0`へ更新。
- データ形式DTformats.neo.v5.14と既存の保存・インポート機能は維持。
