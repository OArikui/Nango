# Nango_v3.10-neo

## 開発手順,進捗

> 2026-10-09更新: Nango-neo Phase 1のブラウザー辞書機能を実装。形式・テストの詳細は [`PHASE1_IMPLEMENTATION.md`](PHASE1_IMPLEMENTATION.md) を参照。サーバー構築はPhase 2のため未着手。

- [ ] server構築 `with python`
  - [ ] データ管理システムの構築 server side
    - [ ] jsonfileのimport,dbとの結合
      - [x] imported fileの形式検査(クレンジング) with mod(`json`,`jsonschema`)
      - [ ] imported fileの重複項目処理 with mod `DeepDiff`
        - [ ] [onetime] jsonFMT>rootに`additional`を追加
      - [ ] 複数ファイルimportへの対応
    - [ ] JavaScriptとへのデータ送信`fetch API`
- [ ] pageの作成 `with JavaScript,HTML`
  - [ ] serverとのやり取り `JavaScript` mod `Ajax`（Phase 2）
  - [x] 画面描画の作成 `JavaScript,HTML`（Phase 1）
  - [x] DTformats.neo.v5.13形式の読込・保存・エクスポート
  - [x] 複数JSONの取込、ID再採番、重複マージ、競合時の確認
  - [x] 階層検索、タグ一括管理、意味単位の追加・コピー・貼り付け・複製・削除・順序変更
  - [x] JSON貼り付けインポート、「今日の単語」表示
  - [x] JSON Schema検証・JavaScriptスモークテスト

## 開発ルール

### バージョン

#### 命名規則

| 種類 | ファイル名                      |
| ---- | ------------------------------- |
| HTML | `Nango-neo.vMM_m_P.html`        |
| JS   | `Nango_main.vMM.m.p.js`         |
| Json | `Nango-neo_template.vMM.p.json` |
| Pack | `Nango_v3.10-neo.MM.m.p.zip`    |

ただし、使用可能でない場合はPackのバージョンを上げないでください

| 部分 | 意味               | 上げるタイミング                             |
| ---- | ------------------ | -------------------------------------------- |
| `MM` | メジャーバージョン | 大きなレイアウト変更・データ構造の変更       |
| `m`  | マイナーバージョン | 互換性を保ったままでの機能追加や中規模な変更 |
| `P`  | パッチバージョン   | バグ修正・小機能追加                         |

例: `v03_10` → `v03_11`（バグ修正） / `v04_00`（レイアウト刷新）

#### version変更記録の形式

毎回必須ではありません。パック更新時はお願いします。

[neo-versions.md](C:\Users\Ariku\OneDrive\Documents\Nango\neo-versions.md)
に記録します。

> ## ファイルの種類はh2
>
> ### ファイルのメジャーバージョンはh3
>
> #### 構造,変更など
>
> > ## マイナーバージョンはクオーテーション内h2
> >
> > ### パッチバージョンはh3


## v02.3.0 / DTformats.neo.v5.14
- 単語名から読みを括弧で付ける形式を廃止し、reading フィールドに分離。原語は english に保存。
- タグ一覧のタグ名から該当単語一覧へ移動できる機能を追加。単語詳細・単語一覧のタグもクリック可能。
- 単語一覧に昇順・降順切替を追加。
