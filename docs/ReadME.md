# Nango-neo

## 目的
第2言語、母語関わらず、言葉の文化的背景を含む意味と体験
をパーソナライズされた辞書に保存すること。また、そのサービス。

きっかけ:[ゆるコンピューター科学ラジオ](https://www.youtube.com/@yurucom)
## ファイル構造

```powershell
Nango
├─.venv
│  ├─Include
│  ├─Lib
│  │  └─...
│  └─Scripts
├─.vscode
│      settings.json
│
├─docs
│      CONTRIBUTE.md
│      Gemini_first_talk.md
│      Nango.memo.md
│      neo-versions.md
│      ReadME.md
│      Where am I drifting to.md
│
├─Nango-neo  \\main
│  │  Nango-neo.v02.0.0.html
│  │  style.v01.0.0.css
│  │  Nango_main.v01.0.0.js
│  │
│  └─DTformats.neo.v5.12
│          DF-FMT_schema.v01.12.json
│          DT-FMT_instruction_AI.v01.12.json
│          DT-FMT_template.v02.12.json
│
└─test_or_future  \\試験的,原則 new branch
        json_test.py
        pre_JSON_schema.json
        sample.json

```

## DB

保存形式:`JSON`
形式設定:`JSON schema Draft 2020-12`
保存場所:未決定 `flask`によるpythonサーバーの作成をしながら決めます。

詳細なFMTは`Nango-neo\DTformats\`を確認してください。

### 操作

python module

|用途|module名|備考|
|---|---|---|
|jsonの読み込み|json(標準)||
|FMTチェック|jsonschema|Draft2020-12に対応しているv4.0.0以降|
|差分抽出(重複時)|DeepDiff||

### `additional data`について

本プロジェクトにおいて、JSONのデータファイルに規定されていない項目を保存することは認めています。そしてそれは、`JSON>root`の`"additional":iterable`内に`list[string]`で収納してください。

これは、`DeepDiff module`の仕様によって、重複処理をする際に`words`のデータの`key`が大きく変わることは避ける必要があるためです。
