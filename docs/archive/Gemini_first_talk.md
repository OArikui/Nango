# 始めにGeminiと行った会話です

> アーカイブ: Nango の原型を作ったときの会話ログです。現行の仕様ではありません。

整形しました。2026.06.30

>Gemini
>難語データビューアー作成
><https://gemini.google.com/share/0129ee8e437b>
>3.5 Flash で作成 2026年6月21日 14:54 公開日時: 2026年6月26日 03:56
>
## こんな感じのデータのビューアーを作って

## JSONデータの詳細（単語、意味、背景、ニュアンス、例文、類義語）をきれいに整理して表示し、複数の単語を切り替えて見られるようなWebビューアー（HTML/CSS/JavaScript）を作成しました

>以下のコードを1つのHTMLファイル（例: viewer.html）として保存し、ブラウザで開くだけで動かすことができます。
>HTML
>
>```html
><!DOCTYPE html>
><html lang="ja">
><head>
>    <meta charset="UTF-8">
>    <meta name="viewport" content="width=device-width, initial-scale=index">
>    <title>難語ビューアー</title>
>    <style>
>        :root {
>            --primary-color: #2c3e50;
>            --accent-color: #3498db;
>            --bg-color: #f8f9fa;
>            --card-bg: #ffffff;
>            --text-color: #333333;
>            --muted-color: #7f8c8d;
>        }
>
>        body {
>            font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
>            background-color: var(--bg-color);
>            color: var(--text-color);
>            line-height: 1.6;
>            margin: 0;
>            padding: 20px;
>        }
>
>        .container {
>            max-width: 800px;
>            margin: 0 auto;
>        }
>
>        header {
>            text-align: center;
>            margin-bottom: 30px;
>        }
>
>        h1 {
>            color: var(--primary-color);
>            font-size: 24px;
>            margin-bottom: 5px;
>        }
>
>        /* セレクター（切り替え部分） */
>        .selector-container {
>            display: flex;
>            justify-content: center;
>            gap: 10px;
>            margin-bottom: 20px;
>            flex-wrap: wrap;
>        }
>
>        .word-btn {
>            background-color: var(--card-bg);
>            border: 1px solid #ddd;
>            padding: 10px 20px;
>            border-radius: 20px;
>            cursor: pointer;
>            font-size: 14px;
>            transition: all 0.2s ease;
>        }
>
>        .word-btn:hover {
>            background-color: #eee;
>        }
>
>        .word-btn.active {
>            background-color: var(--primary-color);
>            color: white;
>            border-color: var(--primary-color);
>        }
>
>        /* メインカード */
>        .card {
>            background: var(--card-bg);
>            border-radius: 12px;
>            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
>            padding: 30px;
>            margin-bottom: 20px;
>        }
>
>        .word-title {
>            font-size: 28px;
>            font-weight: bold;
>            color: var(--primary-color);
>            margin-top: 0;
>            margin-bottom: 15px;
>            border-bottom: 2px solid var(--accent-color);
>            padding-bottom: 10px;
>        }
>
>        .section-title {
>            font-size: 16px;
>            font-weight: bold;
>            color: var(--accent-color);
>            margin-top: 25px;
>            margin-bottom: 8px;
>            display: flex;
>            align-items: center;
>        }
>
>        .section-title::before {
>            content: "◆";
>            margin-right: 6px;
>            font-size: 12px;
>        }
>
>        .meaning-box {
>            background-color: #eef7fc;
>            border-left: 4px solid var(--accent-color);
>            padding: 15px;
>            border-radius: 0 8px 8px 0;
>            font-size: 16px;
>            font-weight: 500;
>        }
>
>        .text-content {
>            font-size: 15px;
>            color: #444;
>            text-align: justify;
>        }
>
>        /* 例文リスト */
>        .example-list {
>            list-style: none;
>            padding-left: 0;
>            margin: 0;
>        }
>
>        .example-list li {
>            position: relative;
>            padding-left: 20px;
>            margin-bottom: 10px;
>            font-size: 15px;
>        }
>
>        .example-list li::before {
>            content: "「";
>            position: absolute;
>            left: 0;
>            color: var(--muted-color);
>        }
>        .example-list li::after {
>            content: "」";
>            color: var(--muted-color);
>        }
>
>        /* 類義語タグ */
>        .synonym-container {
>            display: flex;
>            flex-wrap: wrap;
>            gap: 8px;
>            margin-top: 5px;
>        }
>
>        .synonym-tag {
>            background-color: #f1f3f5;
>            color: #495057;
>            padding: 4px 12px;
>            border-radius: 15px;
>            font-size: 14px;
>        }
>    </style>
></head>
><body>
>
><div class="container">
>    <header>
>        <h1>難語データビューアー</h1>
>    </header>
>
>    <div class="selector-container" id="selectorContainer"></div>
>
>    <div class="card" id="wordCard">
>        </div>
></div>
>
>
><script>
>// アップロードされたJSONデータ
>const wordData = [
>  {
>    "word": "カスケード（cascade）",
>    "meaning": "連鎖的に物事が起きること。または、上から下へ階段状に流れ落ちる滝や、そのように連なるものを指す。",
>    "background": "原語はイタリア語の「cascata（滝）」やラテン語の「cadere（落ちる）」に由来し、元々は「小さな連なった滝」を意味していました。そこから派生して、現代ではIT、ビジネ>ス、科学など様々な分野で「一つの事象が次の事象を芋づる式に引き起こす仕組みや現象」を指す言葉として広く使われています。",
>    "nuance": "単に物事が連続するだけでなく、「上流から下流へ」「1つが引き金となって次々と自動的・不可避的に」伝播していくという、力強い連鎖のニュアンスを含みます。IT分野では機能の>連鎖、ビジネスでは方針の浸透、医療では拒絶反応の連鎖など、文脈によってポジティブにもネガティブにも使われます。",
>    "examples": [
>      "経営陣が決定した経営戦略を、各部門へカスケードダウン（一貫して浸透）させる。",
>      "システムの1ヶ所で発生したバグが、カスケード障害を引き起こしてサーバー全体がダウンした。",
>      "CSS（Cascading Style Sheets）は、スタイルの優先順位が上から下へと連鎖的に適用される仕組みに基づいている。"
>    ],
>    "synonyms": [
>      "連鎖",
>      "ドミノ倒し",
>      "波及",
>      "芋づる式",
>      "数珠繋ぎ"
>    ]
>  },
>  {
>    "word": "かしずく（傅く）",
>    "meaning": "人に仕えて 大事に世話をする。また、子供を大切に養い育てる。",
>    "background": "古語の「かしづく」に由来する言葉です。平安時代の貴族社会において、身分の高い人に仕えて身の回りの世話をすることや、親が大切な我が子をいつくしみ、手を尽くして育てる>ことを指す言葉として広く使われていました。現代では主に前者の「仕える」という意味合いが強く残っています。",
>    "nuance": "単にお世話をするだけでなく、相手に対して「深い敬意」や「愛情」を持って、至れり尽くせりでもてなすというニュアンスが含まれます。現代の日常会話で使われることは稀で、小説>や漫画などの創作物、あるいは格式高い表現の中で、主従関係や献身的な態度を強調する際によく用いられます。",
>    "examples": [
>      "若き女王の周りには、彼女に傅く大勢の侍従たちが控えていた。",
>      "主人の一言で、使用人たちは一斉に傅いて命令に従った。",
>      "両親から蝶よ花よと傅かれて育ったため、彼女は世間知らずなところがある。"
>    ],
>    "synonyms": [
>      "仕える（つかえる）",
>      "かしずき奉る",
>      "お世話する",
>      "奉公する",
>      "傅育する（ふいくする）"
>    ]
>  }
>];
>
>const selectorContainer = document.getElementById('selectorContainer');
>const wordCard = document.getElementById('wordCard');
>
>// ビューアーの初期化
>function initViewer() {
>    // 選択ボタンを動的に生成
>    wordData.forEach((data, index) => {
>        const button = document.createElement('button');
>        button.className = `word-btn ${index === 0 ? 'active' : ''}`;
>        button.textContent = data.word.split['（'](0); // ボタン文字はシンプルに
>        button.addEventListener('click', () => {
>            // アクティブクラスの切り替え
>            document.querySelectorAll('.word-btn').forEach(btn => btn.classList.remove('active'));
>            button.classList.add('active');
>            // データの表示
>            renderWord(index);
>        });
>        selectorContainer.appendChild(button);
>    });
>
>    // 最初の単語を表示
>    renderWord(0);
>}
>
>// 指定されたインデックスの単語を表示する関数
>function renderWord(index) {
>    const data = wordData[index];
>
>    // 例文のリスト項目を作成
>    const examplesHtml = data.examples.map(ex => `<li>${ex}</li>`).join('');
>
>    // 類義語のタグを作成
>    const synonymsHtml = data.synonyms.map(syn => `<span class="synonym-tag">${syn}</span>`).join('');
>
>    // カードのHTMLを組み立て
>    wordCard.innerHTML = `
>        <h2 class="word-title">${data.word}</h2>
>
>        <div class="section-title">意味</div>
>        <div class="meaning-box">${data.meaning}</div>
>
>        <div class="section-title">言葉の背景 / 由来</div>
>        <div class="text-content">${data.background}</div>
>
>        <div class="section-title">ニュアンス</div>
>        <div class="text-content">${data.nuance}</div>
>
>        <div class="section-title">例文</div>
>        <ul class="example-list">${examplesHtml}</ul>
>
>        <div class="section-title">類義語</div>
>        <div class="synonym-container">${synonymsHtml}</div>
>    `;
>}
>
>// 起動
>initViewer();
></script>
>
></body>
></html>
>```
>
>### 💡 このビューアーの特徴
>
> - すっきりしたデザイン: 意味、背景、例文などが視覚的に整理されており、辞書アプリのように直感的に読めます。
>
> - ボタンで簡単切り替え: 上部にある単語ボタンを押すだけで、画面をリロードせずに表示が切り替わります。
>
> - データ拡張も簡単: 今後新しい単語が増えた場合も、JavaScript内の wordData = [...] の配列の中に同じ形式のJSONを追加していくだけで自動的にボタンとカードが増える仕組みになっていま>す。
>
## jsonのimportとexport、リセットと編集機能を追加してください

>## ご提示いただいた機能（JSONのインポート・エクスポート、データの編集、リセット）を追加し、アプリ内でシームレスに単語データの管理・閲覧ができる完全なHTMLコードを作成しました
>
>このコードを1つのHTMLファイル（例: viewer_v2.html）として保存し、ブラウザで開くだけでそのままご利用いただけます。
>HTML
>
>```html
><!DOCTYPE html>
><html lang="ja">
><head>
>    <meta charset="UTF-8">
>    <meta name="viewport" content="width=device-width, initial-scale=1.0">
>    <title>高度な難語データビューアー</title>
>    <style>
>        :root {
>            --primary-color: #2c3e50;
>            --accent-color: #3498db;
>            --bg-color: #f8f9fa;
>            --card-bg: #ffffff;
>            --text-color: #333333;
>            --muted-color: #7f8c8d;
>            --success-color: #2ecc71;
>            --danger-color: #e74c3c;
>        }
>
>        body {
>            font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
>            background-color: var(--bg-color);
>            color: var(--text-color);
>            line-height: 1.6;
>            margin: 0;
>            padding: 20px;
>        }
>
>        .container {
>            max-width: 900px;
>            margin: 0 auto;
>        }
>
>        header {
>            text-align: center;
>            margin-bottom: 25px;
>        }
>
>        h1 {
>            color: var(--primary-color);
>            font-size: 26px;
>            margin-bottom: 5px;
>        }
>
>        /* ツールバー（インポート・エクスポートなど） */
>        .toolbar {
>            background: var(--card-bg);
>            padding: 15px 20px;
>            border-radius: 8px;
>            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
>            margin-bottom: 20px;
>            display: flex;
>            justify-content: space-between;
>            align-items: center;
>            flex-wrap: wrap;
>            gap: 10px;
>        }
>
>        .btn {
>            padding: 8px 16px;
>            border: none;
>            border-radius: 4px;
>            cursor: pointer;
>            font-size: 14px;
>            font-weight: bold;
>            transition: background 0.2s;
>        }
>        .btn-primary { background: var(--accent-color); color: white; }
>        .btn-primary:hover { background: #2980b9; }
>        .btn-success { background: var(--success-color); color: white; }
>        .btn-success:hover { background: #27ae60; }
>        .btn-danger { background: var(--danger-color); color: white; }
>        .btn-danger:hover { background: #c0392b; }
>        .btn-secondary { background: #95a5a6; color: white; }
>        .btn-secondary:hover { background: #7f8c8d; }
>
>        #fileInput { display: none; }
>
>        /* セレクター（切り替え部分） */
>        .selector-container {
>            display: flex;
>            justify-content: flex-start;
>            gap: 10px;
>            margin-bottom: 20px;
>            flex-wrap: wrap;
>            padding-bottom: 10px;
>            border-bottom: 1px solid #ddd;
>        }
>
>        .word-btn {
>            background-color: var(--card-bg);
>            border: 1px solid #ddd;
>            padding: 8px 16px;
>            border-radius: 20px;
>            cursor: pointer;
>            font-size: 14px;
>            transition: all 0.2s ease;
>        }
>        .word-btn:hover { background-color: #eee; }
>        .word-btn.active {
>            background-color: var(--primary-color);
>            color: white;
>            border-color: var(--primary-color);
>        }
>
>        /* メインエリア（ビュー・編集） */
>        .main-content {
>            background: var(--card-bg);
>            border-radius: 12px;
>            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
>            padding: 30px;
>            margin-bottom: 20px;
>            position: relative;
>        }
>
>        .word-title {
>            font-size: 28px;
>            font-weight: bold;
>            color: var(--primary-color);
>            margin-top: 0;
>            margin-bottom: 15px;
>            border-bottom: 2px solid var(--accent-color);
>            padding-bottom: 10px;
>        }
>
>        .section-title {
>            font-size: 16px;
>            font-weight: bold;
>            color: var(--accent-color);
>            margin-top: 25px;
>            margin-bottom: 8px;
>            display: flex;
>            align-items: center;
>        }
>        .section-title::before {
>            content: "◆";
>            margin-right: 6px;
>            font-size: 12px;
>        }
>
>        .meaning-box {
>            background-color: #eef7fc;
>            border-left: 4px solid var(--accent-color);
>            padding: 15px;
>            border-radius: 0 8px 8px 0;
>            font-size: 16px;
>            font-weight: 500;
>        }
>
>        .text-content {
>            font-size: 15px;
>            color: #444;
>            text-align: justify;
>            white-space: pre-wrap;
>        }
>
>        .example-list {
>            list-style: none;
>            padding-left: 0;
>            margin: 0;
>        }
>        .example-list li {
>            position: relative;
>            padding-left: 20px;
>            margin-bottom: 10px;
>            font-size: 15px;
>        }
>        .example-list li::before { content: "「"; position: absolute; left: 0; color: var(--muted-color); }
>        .example-list li::after { content: "」"; color: var(--muted-color); }
>
>        .synonym-container { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px; }
>        .synonym-tag { background-color: #f1f3f5; color: #495057; padding: 4px 12px; border-radius: 15px; font-size: 14px; }
>
>        /* 編集フォームスタイル */
>        .edit-form { display: none; }
>        .form-group { margin-bottom: 15px; }
>        .form-group label { display: block; font-weight: bold; margin-bottom: 5px; color: var(--primary-color); }
>        .form-control {
>            width: 100%;
>            padding: 10px;
>            border: 1px solid #ccc;
>            border-radius: 4px;
>            box-sizing: border-box;
>            font-size: 15px;
>            font-family: inherit;
>        }
>        textarea.form-control { resize: vertical; min-height: 80px; }
>        .form-actions { display: flex; gap: 10px; margin-top: 20px; }
>
>        /* 空の状態 */
>        .empty-message { text-align: center; color: var(--muted-color); padding: 4px 0; font-size: 16px; }
>    </style>
></head>
><body>
>
><div class="container">
>    <header>
>        <h1>難語データビューアー Pro</h1>
>    </header>
>
>    <div class="toolbar">
>        <div>
>            <button class="btn btn-primary" onclick="triggerImport()">JSONインポート</button>
>            <input type="file" id="fileInput" accept=".json" onchange="importJSON(event)">
>            <button class="btn btn-success" id="exportBtn" onclick="exportJSON()">JSONエクスポート</button>
>        </div>
>        <div>
>            <button class="btn btn-primary" onclick="showNewForm()">＋ 新規単語追加</button>
>            <button class="btn btn-danger" onclick="resetToDefault()">初期状態にリセット</button>
>        </div>
>    </div>
>
>    <div class="selector-container" id="selectorContainer"></div>
>
>    <div class="main-content">
>        <div id="viewMode">
>            <div style="float: right;">
>                <button class="btn btn-secondary" id="editBtn" onclick="showEditForm()">この単語を編集</button>
>                <button class="btn btn-danger" id="deleteBtn" style="padding: 8px 12px;" onclick="deleteCurrentWord()">削除</button>
>            </div>
>            <div id="viewTarget"></div>
>        </div>
>
>        <div id="editMode" class="edit-form">
>            <h2 id="formTitle" style="margin-top:0; color: var(--primary-color);">単語の編集</h2>
>            <div class="form-group">
>                <label for="editWord">単語（表記）</label>
>                <input type="text" id="editWord" class="form-control" placeholder="例: カスケード（cascade）">
>            </div>
>            <div class="form-group">
>                <label for="editMeaning">意味</label>
>                <textarea id="editMeaning" class="form-control" placeholder="言葉の意味を入力"></textarea>
>            </div>
>            <div class="form-group">
>                <label for="editBackground">背景 / 由来</label>
>                <textarea id="editBackground" class="form-control" placeholder="言葉の背景や歴史、由来を入力"></textarea>
>            </div>
>            <div class="form-group">
>                <label for="editNuance">ニュアンス</label>
>                <textarea id="editNuance" class="form-control" placeholder="使われる際の細かいニュアンスを入力"></textarea>
>            </div>
>            <div class="form-group">
>                <label for="editExamples">例文（1行に1文ずつ入力してください）</label>
>                <textarea id="editExamples" class="form-control" style="min-height: 100px;" placeholder="例文1&#10;例文2&#10;例文3"></textarea>
>            </div>
>            <div class="form-group">
>                <label for="editSynonyms">類義語（カンマ「,」区切り、または改行で入力してください）</label>
>                <textarea id="editSynonyms" class="form-control" placeholder="連鎖, 波及, ドミノ倒し"></textarea>
>            </div>
>            <div class="form-actions">
>                <button class="btn btn-success" onclick="saveWord()">保存</button>
>                <button class="btn btn-secondary" onclick="cancelEdit()">キャンセル</button>
>            </div>
>        </div>
>    </div>
></div>
>
><script>
>// デフォルトの初期データ
>const defaultData = [
>  {
>    "word": "カスケード（cascade）",
>    "meaning": "連鎖的に物事が起きること。または、上から下へ階段状に流れ落ちる滝や、そのように連なるものを指す。",
>    "background": "原語はイタリア語の「cascata（滝）」やラテン語の「cadere（落ちる）」に由来し、元々は「小さな連なった滝」を意味していました。そこから派生して、現代ではIT、ビジネ>ス、科学など様々な分野で「一つの事象が次の事象を芋づる式に引き起こす仕組みや現象」を指す言葉として広く使われています。",
>    "nuance": "単に物事が連続するだけでなく、「上流から下流へ」「1つが引き金となって次々と自動的・不可避的に」伝播していくという、力強い連鎖のニュアンスを含みます。IT分野では機能の>連鎖、ビジネスでは方針の浸透、医療では拒絶反応の連鎖など、文脈によってポジティブにもネガティブにも使われます。",
>    "examples": [
>      "経営陣が決定した経営戦略を、各部門へカスケードダウン（一貫して浸透）させる。",
>      "システムの1ヶ所で発生したバグが、カスケード障害を引き起こしてサーバー全体がダウンした。",
>      "CSS（Cascading Style Sheets）は、スタイルの優先順位が上から下へと連鎖的に適用される仕組みに基づいている。"
>    ],
>    "synonyms": ["連鎖", "ドミノ倒し", "波及", "芋づる式", "数珠繋ぎ"]
>  },
>  {
>    "word": "かしずく（傅く）",
>    "meaning": "人に仕えて 大事に世話をする。また、子供を大切に養い育てる。",
>    "background": "古語の「かしづく」に由来する言葉です。平安時代の貴族社会において、身分の高い人に仕えて身の回りの世話をすることや、親が大切な我が子をいつくしみ、手を尽くして育てる>ことを指す言葉として広く使われていました。現代では主に前者の「仕える」という意味合いが強く残っています。",
>    "nuance": "単にお世話をするだけでなく、相手に対して「深い敬意」や「愛情」を持って、至れり尽くせりでもてなすというニュアンスが含まれます。現代の日常会話で使われることは稀で、小説>や漫画などの創作物、あるいは格式高い表現の中で、主従関係や献身的な態度を強調する際によく用いられます。",
>    "examples": [
>      "若き女王の周りには、彼女に傅く大勢の侍従たちが控えていた。",
>      "主人の一言で、使用人たちは一斉に傅いて命令に従った。",
>      "両親から蝶よ花よと傅かれて育ったため、彼女は世間知らずなところがある。"
>    ],
>    "synonyms": ["仕える（つかえる）", "かしずき奉る", "お世話する", "奉公する", "傅育する（ふいくする）"]
>  }
>];
>
>// アプリケーションの状態管理
>let wordData = [];
>let currentIndex = 0;
>let isNewWord = false; // 新規追加モードかどうかのフラグ
>
>// 1. 初期化処理 (ブラウザのLocalStorageに保存して状態を維持)
>function initApp() {
>    const savedData = localStorage.getItem('nango_data');
>    if (savedData) {
>        try {
>            wordData = JSON.parse(savedData);
>        } catch(e) {
>            wordData = [...defaultData];
>        }
>    } else {
>        wordData = [...defaultData];
>        saveToLocalStorage();
>    }
>
>    currentIndex = wordData.length > 0 ? 0 : -1;
>    renderSelector();
>    showViewMode();
>}
>
>function saveToLocalStorage() {
>    localStorage.setItem('nango_data', JSON.stringify(wordData));
>}
>
>// 2. 描画処理
>function renderSelector() {
>    const container = document.getElementById('selectorContainer');
>    container.innerHTML = '';
>
>    wordData.forEach((data, index) => {
>        const button = document.createElement('button');
>        button.className = `word-btn ${index === currentIndex ? 'active' : ''}`;
>        // ボタンに表示する文字をすっきりさせる
>        button.textContent = data.word ? data.word.split['（'](0).split('['](0) : '無題';
>        button.addEventListener('click', () => {
>            currentIndex = index;
>            document.querySelectorAll('.word-btn').forEach(btn => btn.classList.remove('active'));
>            button.classList.add('active');
>            showViewMode();
>        });
>        container.appendChild(button);
>    });
>
>    // エクスポートボタンの有効/無効化
>    document.getElementById('exportBtn').disabled = wordData.length === 0;
>}
>
>function showViewMode() {
>    document.getElementById('editMode').style.display = 'none';
>    document.getElementById('viewMode').style.display = 'block';
>
>    const target = document.getElementById('viewTarget');
>    const editBtn = document.getElementById('editBtn');
>    const deleteBtn = document.getElementById('deleteBtn');
>
>    if (currentIndex === -1 || wordData.length === 0) {
>        target.innerHTML = '<div class="empty-message">データがありません。「新規単語追加」または「JSONインポート」からデータを登録してください。</div>';
>        editBtn.style.display = 'none';
>        deleteBtn.style.display = 'none';
>        return;
>    }
>
>    editBtn.style.display = 'inline-block';
>    deleteBtn.style.display = 'inline-block';
>
>    const data = wordData[currentIndex];
>    const examplesHtml = (data.examples || []).map(ex => `<li>${ex}</li>`).join('');
>    const synonymsHtml = (data.synonyms || []).map(syn => `<span class="synonym-tag">${syn}</span>`).join('');
>
>    target.innerHTML = `
>        <h2 class="word-title">${data.word || ''}</h2>
>
>        <div class="section-title">意味</div>
>        <div class="meaning-box">${data.meaning || ''}</div>
>
>        <div class="section-title">言葉の背景 / 由来</div>
>        <div class="text-content">${data.background || ''}</div>
>
>        <div class="section-title">ニュアンス</div>
>        <div class="text-content">${data.nuance || ''}</div>
>
>        <div class="section-title">例文</div>
>        <ul class="example-list">${examplesHtml || '<li>（登録なし）</li>'}</ul>
>
>        <div class="section-title">類義語</div>
>        <div class="synonym-container">${synonymsHtml || '<span style="color:var(--muted-color); font-size:14px;">（登録なし）</span>'}</div>
>    `;
>}
>
>// 3. 編集・新規追加機能
>function showEditForm() {
>    isNewWord = false;
>    document.getElementById('formTitle').textContent = "単語の編集";
>    document.getElementById('viewMode').style.display = 'none';
>    document.getElementById('editMode').style.display = 'block';
>
>    const data = wordData[currentIndex];
>    document.getElementById('editWord').value = data.word || '';
>    document.getElementById('editMeaning').value = data.meaning || '';
>    document.getElementById('editBackground').value = data.background || '';
>    document.getElementById('editNuance').value = data.nuance || '';
>    document.getElementById('editExamples').value = (data.examples || []).join('\n');
>    document.getElementById('editSynonyms').value = (data.synonyms || []).join(', ');
>}
>
>function showNewForm() {
>    isNewWord = true;
>    document.getElementById('formTitle').textContent = "新規単語追加";
>    document.getElementById('viewMode').style.display = 'none';
>    document.getElementById('editMode').style.display = 'block';
>
>    // フォームをクリア
>    document.getElementById('editWord').value = '';
>    document.getElementById('editMeaning').value = '';
>    document.getElementById('editBackground').value = '';
>    document.getElementById('editNuance').value = '';
>    document.getElementById('editExamples').value = '';
>    document.getElementById('editSynonyms').value = '';
>}
>
>function cancelEdit() {
>    showViewMode();
>}
>
>function saveWord() {
>    const word = document.getElementById('editWord').value.trim();
>    if (!word) {
>        alert('単語（表記）は必須入力です。');
>        return;
>    }
>
>    // 例文と類義語のテキストを配列に変換
>    const examplesText = document.getElementById('editExamples').value;
>    const examples = examplesText.split('\n').map(line => line.trim()).filter(line => line !== '');
>
>    const synonymsText = document.getElementById('editSynonyms').value;
>    // カンマ、読点、改行のいずれでも区切れるように正規表現で分割
>    const synonyms = synonymsText.split(/[,，、\n]/).map(item => item.trim()).filter(item => item !== '');
>
>    const newWordData = {
>        "word": word,
>        "meaning": document.getElementById('editMeaning').value.trim(),
>        "background": document.getElementById('editBackground').value.trim(),
>        "nuance": document.getElementById('editNuance').value.trim(),
>        "examples": examples,
>        "synonyms": synonyms
>    };
>
>    if (isNewWord) {
>        wordData.push(newWordData);
>        currentIndex = wordData.length - 1;
>    } else {
>        wordData[currentIndex] = newWordData;
>    }
>
>    saveToLocalStorage();
>    renderSelector();
>    showViewMode();
>}
>
>function deleteCurrentWord() {
>    if (currentIndex === -1) return;
>    if (!confirm(`「${wordData[currentIndex].word}」を削除してもよろしいですか？`)) return;
>
>    wordData.splice(currentIndex, 1);
>
>    if (wordData.length === 0) {
>        currentIndex = -1;
>    } else if (currentIndex >= wordData.length) {
>        currentIndex = wordData.length - 1;
>    }
>
>    saveToLocalStorage();
>    renderSelector();
>    showViewMode();
>}
>
>// 4. インポート・エクスポート・リセット機能
>function triggerImport() {
>    document.getElementById('fileInput').click();
>}
>
>function importJSON(event) {
>    const file = event.target.files[0];
>    if (!file) return;
>
>    const reader = new FileReader();
>    reader.onload = function(e) {
>        try {
>            const imported = JSON.parse(e.target.result);
>
>            // 単一オブジェクトが来た場合は配列にラップ
>            const dataArray = Array.isArray(imported) ? imported : [imported];
>
>            if (dataArray.length === 0 || !dataArray[0].word) {
>                throw new Error('正しい難語JSONデータフォーマットではありません。');
>            }
>
>            if (confirm(`JSONデータから ${dataArray.length} 件の単語を読み込みます。現在のリストに追加しますか？\n(「キャンセル」を選ぶと上書きします)`)) {
>                wordData = [...wordData, ...dataArray];
>            } else {
>                wordData = dataArray;
>            }
>
>            currentIndex = wordData.length > 0 ? 0 : -1;
>            saveToLocalStorage();
>            renderSelector();
>            showViewMode();
>            alert('インポートが完了しました。');
>        } catch (err) {
>            alert('JSONファイルの読み込みに失敗しました。フォーマットを確認してください。\nエラー詳細: ' + err.message);
>        }
>    };
>    reader.readAsText(file);
>    // 同じファイルを再度選択できるようにリセット
>    event.target.value = '';
>}
>
>function exportJSON() {
>    if (wordData.length === 0) return;
>
>    const jsonString = JSON.stringify(wordData, null, 2);
>    const blob = new Blob([jsonString], { type: 'application/json' });
>    const url = URL.createObjectURL(blob);
>
>    const a = document.createElement('a');
>    a.href = url;
>    a.download = '難語データ_export.json';
>    document.body.appendChild(a);
>    a.click();
>    document.body.removeChild(a);
>    URL.revokeObjectURL(url);
>}
>
>function resetToDefault() {
>    if (!confirm('データを最初の初期状態（カスケード、かしずく の2語のみ）に戻しますか？\n自分で追加・編集したデータは消去されます。')) return;
>
>    wordData = [...defaultData];
>    currentIndex = 0;
>    saveToLocalStorage();
>    renderSelector();
>    showViewMode();
>}
>
>// 起動
>initApp();
></script>
>
></body>
></html>
>```
>
>### 🛠 追加・強化された機能
>
>#### JSONインポート
>
> - 手持ちの .json ファイルを読み込めます。配列形式 [...] でも、単一のデータ形式 {...} でも自動で判別します。既存のリストに「追加（マージ）」するか「上書き」するか選べます。
>
> JSONエクスポート:
>
> - 画面上で編集・追加した最新の単語リスト全体のデータを、いつでもキレイなインデント付きの 難語データ_export.json ファイルとしてローカルにダウンロードできます。
>
> リセット機能:
>
> - 色々いじりすぎてデータがおかしくなった時など、ワンクリックで最初の2単語（初期状態）に戻すことができます。
>
>#### 編集＆新規登録機能
>
> - 各単語の「この単語を編集」から中身の書き換え（例文や類義語の追加・修正）がフォームで簡単に行えます。
>
> - 「＋ 新規単語追加」から完全に新しい単語を辞書に登録していくこともできます。不要になった単語の削除も可能です。
>
> 永続化（LocalStorage対応）:
>
> - 編集やインポートした内容はブラウザの記憶領域に自動保存されるため、ブラウザを閉じたり、ページを再読み込み（リロード）してもデータが消えることはありません。
>
## import機能について、機能の互換性を保ったまま、jsonの複数選択importをかのうにして
>
>## 複数のJSONファイルを同時に選択して、一気にインポート（一括追加または一括上書き）できるように機能を拡張しました
>
>従来のコードの <input type="file" ...> 部分と、JavaScriptの importJSON(event) 関数を以下のように書き換える（あるいはファイル全体を差し替える）ことで、複数選択に対応できます。
>
>既存の「単一ファイルのインポート」との互換性も完全に維持しています。
>
>### 🛠️ 修正・差し替え箇所
>
>HTML内の該当する箇所を、以下のコードにアップデートしてください。
>
>1. HTML部分の修正
>
>multiple 属性を追加し、複数ファイルを選択できるようにします。
>HTML
>
>```html
><input type="file" id="fileInput" accept=".json" onchange="importJSON(event)">
>
><input type="file" id="fileInput" accept=".json" multipart onchange="importJSON(event)" multiple>
>
>1. JavaScript部分（importJSON 関数）の差し替え
>
>複数のファイルを非同期で同時に読み込み、すべて解析が終わったあとに結合して処理する形に進化させます。
>JavaScript
>
>function importJSON(event) {
> const files = event.target.files;
> if (!files || files.length === 0) return;
>
> // 全てのファイル読み込み（Promise）を配列に格納
> const filePromises = Array.from(files).map(file => {
> return new Promise((resolve, reject) => {
> const reader = new FileReader();
> reader.onload = (e) => {
> try {
> const imported = JSON.parse(e.target.result);
> // 単一オブジェクトの場合は配列に変換して返す
> const dataArray = Array.isArray(imported) ? imported : [imported];
> resolve(dataArray);
> } catch (err) {
> reject(new Error(`ファイル「${file.name}」の解析に失敗しました。フォーマットを確認してください。`));
> }
> };
> reader.onerror = () => reject(new Error(`ファイル「${file.name}」の読み込みに失敗しました。`));
> reader.readAsText(file);
> });
> });
>
> // 全てのファイルが読み終わったら処理を実行
> Promise.all(filePromises)
> .then(results => {
> // 複数ファイルから得られた配列を1つの配列にフラット化（結合）
> let combinedData = results.flat();
>
>            if (combinedData.length === 0 || !combinedData[0].word) {
>                alert('正しい難語JSONデータフォーマットではありません。');
>                return;
>            }
>
>            const isAppend = confirm(
>                `合計 ${files.length} 個のファイルから ${combinedData.length} 件の単語を読み込みました。\n\n` +
>                `現在のリストに「追加」しますか？\n` +
>                `（「キャンセル」を選ぶと現在のリストを消去して「上書き」します）`
>            );
>
>            if (isAppend) {
>                wordData = [...wordData, ...combinedData];
>            } else {
>                wordData = combinedData;
>            }
>
>            // 状態を更新して再描画
>            currentIndex = wordData.length > 0 ? 0 : -1;
>            saveToLocalStorage();
>            renderSelector();
>            showViewMode();
>            alert('一括インポートが完了しました！');
>        })
>        .catch(error => {
>            // いずれかのファイルでエラーが起きた場合
>            alert(error.message);
>        })
>        .finally(() => {
>            // 同じファイルを再度選択できるようにリセット
>            event.target.value = '';
>        });
>}
>```
>
>### ✨ パワーアップしたポイント
>
> - 複数選択のサポート: ファイル選択ダイアログを開いた際、Ctrl キーや Shift キー（Macの場合は Command キー）を押しながら複数のJSONファイルを同時に選択してインポートできるようになり>ました。
>
> - 互換性の維持: もちろん、これまで通り1つだけのファイルをインポートすることも全く同じ挙動で可能です。
>
> - スマートなデータ結合: ファイルA（単一オブジェクト {}）とファイルB（配列形式 []）を混ぜて同時に複数選択しても、JavaScript側で自動的に平坦な1つの配列に結合して処理します。
>
> - エラーハンドリング: 選択した複数のファイルの中に1つでも破損したJSON（記述ミスのファイルなど）が混ざっていた場合は、どのファイルが原因かをアラートで教えて処理を安全に中断します。
>
## 既存の機能は変更せずに、単語のソート機能,単語分類(外来語、熟語、…etc)機能を追加してください
>
>## ご要望に基づき、既存のインポート（複数選択対応）・エクスポート・編集・追加・リセット・永続化（LocalStorage）のすべての機能を完全に維持したまま、以下の2つの新機能を追加しました
>
>### 単語分類機能
>
> - 各単語に「分類（外来語、熟語、慣用句など）」を設定・編集できるようにしました。
>
> - 分類ごとにボタンで絞り込み表示（フィルタリング）が可能です。
>
> 単語のソート（並び替え）機能
>
> - 「登録順」「五十音順（単語の先頭文字基準）」でボタンの並び順をいつでも切り替えられます。
>
>以下のコードをそのまま新しいHTMLファイルとして保存、または上書きしてブラウザで開くだけでご利用いただけます。
>HTML
>
>``` html
><!DOCTYPE html>
><html lang="ja">
><head>
>    <meta charset="UTF-8">
>    <meta name="viewport" content="width=device-width, initial-scale=1.0">
>    <title>高度な難語データビューアー Pro</title>
>    <style>
>        :root {
>            --primary-color: #2c3e50;
>            --accent-color: #3498db;
>            --bg-color: #f8f9fa;
>            --card-bg: #ffffff;
>            --text-color: #333333;
>            --muted-color: #7f8c8d;
>            --success-color: #2ecc71;
>            --danger-color: #e74c3c;
>            --warning-color: #f1c40f;
>        }
>
>        body {
>            font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
>            background-color: var(--bg-color);
>            color: var(--text-color);
>            line-height: 1.6;
>            margin: 0;
>            padding: 20px;
>        }
>
>        .container {
>            max-width: 900px;
>            margin: 0 auto;
>        }
>
>        header {
>            text-align: center;
>            margin-bottom: 25px;
>        }
>
>        h1 {
>            color: var(--primary-color);
>            font-size: 26px;
>            margin-bottom: 5px;
>        }
>
>        /* ツールバー（インポート・エクスポートなど） */
>        .toolbar {
>            background: var(--card-bg);
>            padding: 15px 20px;
>            border-radius: 8px;
>            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
>            margin-bottom: 15px;
>            display: flex;
>            justify-content: space-between;
>            align-items: center;
>            flex-wrap: wrap;
>            gap: 10px;
>        }
>
>        /* コントロールバー（ソート・フィルター） */
>        .control-bar {
>            background: #edf2f7;
>            padding: 12px 20px;
>            border-radius: 8px;
>            margin-bottom: 20px;
>            display: flex;
>            flex-direction: column;
>            gap: 10px;
>            font-size: 14px;
>        }
>        .control-group {
>            display: flex;
>            align-items: center;
>            flex-wrap: wrap;
>            gap: 8px;
>        }
>        .control-label {
>            font-weight: bold;
>            color: var(--primary-color);
>            min-width: 80px;
>        }
>
>        .btn {
>            padding: 8px 16px;
>            border: none;
>            border-radius: 4px;
>            cursor: pointer;
>            font-size: 14px;
>            font-weight: bold;
>            transition: background 0.2s;
>        }
>        .btn-primary { background: var(--accent-color); color: white; }
>        .btn-primary:hover { background: #2980b9; }
>        .btn-success { background: var(--success-color); color: white; }
>        .btn-success:hover { background: #27ae60; }
>        .btn-danger { background: var(--danger-color); color: white; }
>        .btn-danger:hover { background: #c0392b; }
>        .btn-secondary { background: #95a5a6; color: white; }
>        .btn-secondary:hover { background: #7f8c8d; }
>        
>        /* トグル用小ボタン（ソート・フィルター用） */
>        .btn-sm {
>            padding: 4px 12px;
>            border-radius: 15px;
>            background: white;
>            border: 1px solid #cbd5e0;
>            color: #4a5568;
>            font-size: 13px;
>        }
>        .btn-sm:hover { background: #f7fafc; }
>        .btn-sm.active {
>            background: var(--primary-color);
>            color: white;
>            border-color: var(--primary-color);
>        }
>
>        #fileInput { display: none; }
>
>        /* セレクター（切り替え部分） */
>        .selector-container {
>            display: flex;
>            justify-content: flex-start;
>            gap: 10px;
>            margin-bottom: 20px;
>            flex-wrap: wrap;
>            padding-bottom: 10px;
>            border-bottom: 1px solid #ddd;
>        }
>
>        .word-btn {
>            background-color: var(--card-bg);
>            border: 1px solid #ddd;
>            padding: 8px 16px;
>            border-radius: 20px;
>            cursor: pointer;
>            font-size: 14px;
>            transition: all 0.2s ease;
>        }
>        .word-btn:hover { background-color: #eee; }
>        .word-btn.active {
>            background-color: var(--accent-color);
>            color: white;
>            border-color: var(--accent-color);
>        }
>
>        /* メインエリア（ビュー・編集） */
>        .main-content {
>            background: var(--card-bg);
>            border-radius: 12px;
>            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
>            padding: 30px;
>            margin-bottom: 20px;
>            position: relative;
>        }
>
>        .word-header-container {
>            display: flex;
>            align-items: center;
>            gap: 12px;
>            border-bottom: 2px solid var(--accent-color);
>            padding-bottom: 10px;
>            margin-bottom: 15px;
>            flex-wrap: wrap;
>        }
>
>        .word-title {
>            font-size: 28px;
>            font-weight: bold;
>            color: var(--primary-color);
>            margin: 0;
>        }
>
>        /* 分類バッジ */
>        .category-badge {
>            background-color: #e2e8f0;
>            color: #4a5568;
>            padding: 3px 10px;
>            border-radius: 4px;
>            font-size: 12px;
>            font-weight: bold;
>        }
>
>        .section-title {
>            font-size: 16px;
>            font-weight: bold;
>            color: var(--accent-color);
>            margin-top: 25px;
>            margin-bottom: 8px;
>            display: flex;
>            align-items: center;
>        }
>        .section-title::before {
>            content: "◆";
>            margin-right: 6px;
>            font-size: 12px;
>        }
>
>        .meaning-box {
>            background-color: #eef7fc;
>            border-left: 4px solid var(--accent-color);
>            padding: 15px;
>            border-radius: 0 8px 8px 0;
>            font-size: 16px;
>            font-weight: 500;
>        }
>
>        .text-content {
>            font-size: 15px;
>            color: #444;
>            text-align: justify;
>            white-space: pre-wrap;
>        }
>
>        .example-list {
>            list-style: none;
>            padding-left: 0;
>            margin: 0;
>        }
>        .example-list li {
>            position: relative;
>            padding-left: 20px;
>            margin-bottom: 10px;
>            font-size: 15px;
>        }
>        .example-list li::before { content: "「"; position: absolute; left: 0; color: var(--muted-color); }
>        .example-list li::after { content: "」"; color: var(--muted-color); }
>
>        .synonym-container { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px; }
>        .synonym-tag { background-color: #f1f3f5; color: #495057; padding: 4px 12px; border-radius: 15px; font-size: 14px; }
>
>        /* 編集フォームスタイル */
>        .edit-form { display: none; }
>        .form-group { margin-bottom: 15px; }
>        .form-group label { display: block; font-weight: bold; margin-bottom: 5px; color: var(--primary-color); }
>        .form-control {
>            width: 100%;
>            padding: 10px;
>            border: 1px solid #ccc;
>            border-radius: 4px;
>            box-sizing: border-box;
>            font-size: 15px;
>            font-family: inherit;
>        }
>        textarea.form-control { resize: vertical; min-height: 80px; }
>        .form-actions { display: flex; gap: 10px; margin-top: 20px; }
>
>        /* 空の状態 */
>        .empty-message { text-align: center; color: var(--muted-color); padding: 4px 0; font-size: 16px; }
>    </style>
></head>
><body>
>
><div class="container">
>    <header>
>        <h1>難語データビューアー Pro</h1>
>    </header>
>
>    <div class="toolbar">
>        <div>
>            <button class="btn btn-primary" onclick="triggerImport()">JSONインポート</button>
>            <input type="file" id="fileInput" accept=".json" onchange="importJSON(event)" multiple>
>            <button class="btn btn-success" id="exportBtn" onclick="exportJSON()">JSONエクスポート</button>
>        </div>
>        <div>
>            <button class="btn btn-primary" onclick="showNewForm()">＋ 新規単語追加</button>
>            <button class="btn btn-danger" onclick="resetToDefault()">初期状態にリセット</button>
>        </div>
>    </div>
>
>    <div class="control-bar">
>        <div class="control-group">
>            <span class="control-label">並び替え:</span>
>            <button class="btn btn-sm active" id="sort-id" onclick="setSort('id')">登録順</button>
>            <button class="btn btn-sm" id="sort-alpha" onclick="setSort('alpha')">五十音順</button>
>        </div>
>        <div class="control-group">
>            <span class="control-label">分類で絞り込み:</span>
>            <div id="filterContainer" style="display: flex; flex-wrap: wrap; gap: 6px;">
>                </div>
>        </div>
>    </div>
>
>    <div class="selector-container" id="selectorContainer"></div>
>
>    <div class="main-content">
>        <div id="viewMode">
>            <div style="float: right;">
>                <button class="btn btn-secondary" id="editBtn" onclick="showEditForm()">この単語を編集</button>
>                <button class="btn btn-danger" id="deleteBtn" style="padding: 8px 12px;" onclick="deleteCurrentWord()">削除</button>
>            </div>
>            <div id="viewTarget"></div>
>        </div>
>
>        <div id="editMode" class="edit-form">
>            <h2 id="formTitle" style="margin-top:0; color: var(--primary-color);">単語の編集</h2>
>            <div class="form-group">
>                <label for="editWord">単語（表記）</label>
>                <input type="text" id="editWord" class="form-control" placeholder="例: カスケード（cascade）">
>            </div>
>            <div class="form-group">
>                <label for="editCategory">単語分類</label>
>                <select id="editCategory" class="form-control">
>                    <option value="指定なし">指定なし</option>
>                    <option value="外来語">外来語</option>
>                    <option value="熟語">熟語</option>
>                    <option value="慣用句">慣用句</option>
>                    <option value="古語・大和言葉">古語・大和言葉</option>
>                    <option value="その他">その他</option>
>                </select>
>            </div>
>            <div class="form-group">
>                <label for="editMeaning">意味</label>
>                <textarea id="editMeaning" class="form-control" placeholder="言葉の意味を入力"></textarea>
>            </div>
>            <div class="form-group">
>                <label for="editBackground">背景 / 由来</label>
>                <textarea id="editBackground" class="form-control" placeholder="言葉の背景や歴史、由来を入力"></textarea>
>            </div>
>            <div class="form-group">
>                <label for="editNuance">ニュアンス</label>
>                <textarea id="editNuance" class="form-control" placeholder="使われる際の細かいニュアンスを入力"></textarea>
>            </div>
>            <div class="form-group">
>                <label for="editExamples">例文（1行に1文ずつ入力してください）</label>
>                <textarea id="editExamples" class="form-control" style="min-height: 100px;" placeholder="例文1&#10;例文2&#10;例文3"></textarea>
>            </div>
>            <div class="form-group">
>                <label for="editSynonyms">類義語（カンマ「,」区切り、または改行で入力してください）</label>
>                <textarea id="editSynonyms" class="form-control" placeholder="連鎖, 波及, ドミノ倒し"></textarea>
>            </div>
>            <div class="form-actions">
>                <button class="btn btn-success" onclick="saveWord()">保存</button>
>                <button class="btn btn-secondary" onclick="cancelEdit()">キャンセル</button>
>            </div>
>        </div>
>    </div>
></div>
>
><script>
>// デフォルトの初期データ（categoryフィールドを追加）
>const defaultData = [
>  {
>    "id": 1,
>    "word": "カスケード（cascade）",
>    "category": "外来語",
>    "meaning": "連鎖的に物事が起きること。または、上から下へ階段状に流れ落ちる滝や、そのように連なるものを指す。",
>    "background": "原語はイタリア語の「cascata（滝）」やラテン語の「cadere（落ちる）」に由来し、元々は「小さな連なった滝」を意味していました。そこから派生して、現代ではIT、ビジネ>ス、科学など様々な分野で「一つの事象が次の事象を芋づる式に引き起こす仕組みや現象」を指す言葉として広く使われています。",
>    "nuance": "単に物事が連続するだけでなく、「上流から下流へ」「1つが引き金となって次々と自動的・不可避的に」伝播していくという、力強い連鎖のニュアンスを含みます。IT分野では機能の>連鎖、ビジネスでは方針の浸透、医療では拒絶反応の連鎖など、文脈によってポジティブにもネガティブにも使われます。",
>    "examples": [
>      "経営陣が決定した経営戦略を、各部門へカスケードダウン（一貫して浸透）させる。",
>      "システムの1ヶ所で発生したバグが、カスケード障害を引き起こしてサーバー全体がダウンした。",
>      "CSS（Cascading Style Sheets）は、スタイルの優先順位が上から下へと連鎖的に適用される仕組みに基づいている。"
>    ],
>    "synonyms": ["連鎖", "ドミノ倒し", "波及", "芋づる式", "数珠繋ぎ"]
>  },
>  {
>    "id": 2,
>    "word": "かしずく（傅く）",
>    "category": "古語・大和言葉",
>    "meaning": "人に仕えて 大事に世話をする。また、子供を大切に養い育てる。",
>    "background": "古語の「かしづく」に由来する言葉です。平安時代の貴族社会において、身分の高い人に仕えて身の回りの世話をすることや、親が大切な我が子をいつくしみ、手を尽くして育てる>ことを指す言葉として広く使われていました。現代では主に前者の「仕える」という意味合いが強く残っています。",
>    "nuance": "単にお世話をするだけでなく、相手に対して「深い敬意」や「愛情」を持って、至れり尽くせりでもてなすというニュアンスが含まれます。現代の日常会話で使われることは稀で、小説>や漫画などの創作物、あるいは格式高い表現の中で、主従関係や献身的な態度を強調する際によく用いられます。",
>    "examples": [
>      "若き女王の周りには、彼女に傅く大勢の侍従たちが控えていた。",
>      "主人の一言で、使用人たちは一斉に傅いて命令に従った。",
>      "両親から蝶よ花よと傅かれて育ったため、彼女は世間知らずなところがある。"
>    ],
>    "synonyms": ["仕える（つかえる）", "かしずき奉る", "お世話する", "奉公する", "傅育する（ふいくする）"]
>  }
>];
>
>// 内部状態
>let wordData = [];
>let currentWordId = -1; // インデックスではなく、一意のIDで管理することでソート・フィルタの影響を防ぐ
>let isNewWord = false;
>
>// ソート・フィルター状態
>let currentSort = 'id'; // 'id' または 'alpha'
>let currentFilter = 'ALL'; // 'ALL' または 各カテゴリ名
>
>// 1. 初期化処理
>function initApp() {
>    const savedData = localStorage.getItem('nango_data');
>    if (savedData) {
>        try {
>            wordData = JSON.parse(savedData);
>            // 互換性担保: 古いデータにIDやカテゴリがない場合は補完
>            wordData.forEach((item, index) => {
>                if (!item.id) item.id = Date.now() + index;
>                if (!item.category) item.category = "指定なし";
>            });
>        } catch(e) {
>            wordData = JSON.parse(JSON.stringify(defaultData));
>        }
>    } else {
>        wordData = JSON.parse(JSON.stringify(defaultData));
>        saveToLocalStorage();
>    }
>
>    currentWordId = wordData.length > 0 ? wordData[0].id : -1;
>    updateFiltersDisplay();
>    renderSelector();
>    showViewMode();
>}
>
>function saveToLocalStorage() {
>    localStorage.setItem('nango_data', JSON.stringify(wordData));
>}
>
>// 2. ソート & フィルターロジック
>function setSort(type) {
>    currentSort = type;
>    document.getElementById('sort-id').classList.toggle('active', type === 'id');
>    document.getElementById('sort-alpha').classList.toggle('active', type === 'alpha');
>    renderSelector();
>}
>
>function setFilter(category) {
>    currentFilter = category;
>    updateFiltersDisplay();
>
>    // フィルターを切り替えた際、現在選ばれている単語が表示対象外になった場合は先頭の単語を選択
>    const displayedWords = getProcessedWords();
>    if (displayedWords.length > 0) {
>        const isStillVisible = displayedWords.some(w => w.id === currentWordId);
>        if (!isStillVisible) {
>            currentWordId = displayedWords[0].id;
>        }
>    } else {
>        currentWordId = -1;
>    }
>
>    renderSelector();
>    showViewMode();
>}
>
>// データ処理（フィルター → ソート）
>function getProcessedWords() {
>    // 1. フィルター適用
>    let result = [...wordData];
>    if (currentFilter !== 'ALL') {
>        result = result.filter(w => w.category === currentFilter);
>    }
>
>    // 2. ソート適用
>    if (currentSort === 'alpha') {
>        result.sort((a, b) => (a.word || '').localeCompare(b.word || '', 'ja'));
>    } else {
>        result.sort((a, b) => (a.id || 0) - (b.id || 0));
>    }
>
>    return result;
>}
>
>// フィルターボタン群の動的生成
>function updateFiltersDisplay() {
>    const container = document.getElementById('filterContainer');
>    container.innerHTML = '';
>
>    // 定義されている基本カテゴリー + 現在データに存在する独自のカテゴリー
>    const baseCategories = ['ALL', '指定なし', '外来語', '熟語', '慣用句', '古語・大和言葉', 'その他'];
>    const activeCategoriesInData = [...new Set(wordData.map(w => w.category).filter(Boolean))];
>    const allCategories = [...new Set([...baseCategories, ...activeCategoriesInData])];
>
>    allCategories.forEach(cat => {
>        // 各カテゴリの該当件数を計算
>        let count = 0;
>        if (cat === 'ALL') {
>            count = wordData.length;
>        } else {
>            count = wordData.filter(w => w.category === cat).length;
>        }
>
>        // 0件のカテゴリはALL以外非表示にする（ただし選択中の場合は残す）
>        if (count === 0 && cat !== 'ALL' && currentFilter !== cat) return;
>
>        const btn = document.createElement('button');
>        btn.className = `btn-sm ${currentFilter === cat ? 'active' : ''}`;
>        btn.textContent = cat === 'ALL' ? `すべて (${count})` : `${cat} (${count})`;
>        btn.onclick = () => setFilter(cat);
>        container.appendChild(btn);
>    });
>}
>
>// 3. 描画処理
>function renderSelector() {
>    const container = document.getElementById('selectorContainer');
>    container.innerHTML = '';
>
>    const displayedWords = getProcessedWords();
>
>    displayedWords.forEach((data) => {
>        const button = document.createElement('button');
>        button.className = `word-btn ${data.id === currentWordId ? 'active' : ''}`;
>        button.textContent = data.word ? data.word.split['（'](0).split('['](0) : '無題';
>        button.addEventListener('click', () => {
>            currentWordId = data.id;
>            document.querySelectorAll('.word-btn').forEach(btn => btn.classList.remove('active'));
>            button.classList.add('active');
>            showViewMode();
>        });
>        container.appendChild(button);
>    });
>
>    document.getElementById('exportBtn').disabled = wordData.length === 0;
>}
>
>function showViewMode() {
>    document.getElementById('editMode').style.display = 'none';
>    document.getElementById('viewMode').style.display = 'block';
>
>    const target = document.getElementById('viewTarget');
>    const editBtn = document.getElementById('editBtn');
>    const deleteBtn = document.getElementById('deleteBtn');
>
>    const currentWord = wordData.find(w => w.id === currentWordId);
>
>    if (!currentWord || wordData.length === 0) {
>        target.innerHTML = '<div class="empty-message">表示できるデータがありません。条件を変えるか、「新規単語追加」を行ってください。</div>';
>        editBtn.style.display = 'none';
>        deleteBtn.style.display = 'none';
>        return;
>    }
>
>    editBtn.style.display = 'inline-block';
>    deleteBtn.style.display = 'inline-block';
>
>    const data = currentWord;
>    const examplesHtml = (data.examples || []).map(ex => `<li>${ex}</li>`).join('');
>    const synonymsHtml = (data.synonyms || []).map(syn => `<span class="synonym-tag">${syn}</span>`).join('');
>
>    target.innerHTML = `
>        <div class="word-header-container">
>            <h2 class="word-title">${data.word || ''}</h2>
>            <span class="category-badge">${data.category || '指定なし'}</span>
>        </div>
>
>        <div class="section-title">意味</div>
>        <div class="meaning-box">${data.meaning || ''}</div>
>
>        <div class="section-title">言葉の背景 / 由来</div>
>        <div class="text-content">${data.background || ''}</div>
>
>        <div class="section-title">ニュアンス</div>
>        <div class="text-content">${data.nuance || ''}</div>
>
>        <div class="section-title">例文</div>
>        <ul class="example-list">${examplesHtml || '<li>（登録なし）</li>'}</ul>
>
>        <div class="section-title">類義語</div>
>        <div class="synonym-container">${synonymsHtml || '<span style="color:var(--muted-color); font-size:14px;">（登録なし）</span>'}</div>
>    `;
>}
>
>// 4. 編集・新規追加機能
>function showEditForm() {
>    isNewWord = false;
>    document.getElementById('formTitle').textContent = "単語の編集";
>    document.getElementById('viewMode').style.display = 'none';
>    document.getElementById('editMode').style.display = 'block';
>
>    const data = wordData.find(w => w.id === currentWordId);
>    document.getElementById('editWord').value = data.word || '';
>    document.getElementById('editCategory').value = data.category || '指定なし';
>    document.getElementById('editMeaning').value = data.meaning || '';
>    document.getElementById('editBackground').value = data.background || '';
>    document.getElementById('editNuance').value = data.nuance || '';
>    document.getElementById('editExamples').value = (data.examples || []).join('\n');
>    document.getElementById('editSynonyms').value = (data.synonyms || []).join(', ');
>}
>
>function showNewForm() {
>    isNewWord = true;
>    document.getElementById('formTitle').textContent = "新規単語追加";
>    document.getElementById('viewMode').style.display = 'none';
>    document.getElementById('editMode').style.display = 'block';
>
>    document.getElementById('editWord').value = '';
>    document.getElementById('editCategory').value = currentFilter !== 'ALL' ? currentFilter : '指定なし';
>    document.getElementById('editMeaning').value = '';
>    document.getElementById('editBackground').value = '';
>    document.getElementById('editNuance').value = '';
>    document.getElementById('editExamples').value = '';
>    document.getElementById('editSynonyms').value = '';
>}
>
>function cancelEdit() {
>    showViewMode();
>}
>
>function saveWord() {
>    const word = document.getElementById('editWord').value.trim();
>    if (!word) {
>        alert('単語（表記）は必須入力です。');
>        return;
>    }
>
>    const examplesText = document.getElementById('editExamples').value;
>    const examples = examplesText.split('\n').map(line => line.trim()).filter(line => line !== '');
>
>    const synonymsText = document.getElementById('editSynonyms').value;
>    const synonyms = synonymsText.split(/[,，、\n]/).map(item => item.trim()).filter(item => item !== '');
>
>    if (isNewWord) {
>        const newId = Date.now();
>        const newWordData = {
>            "id": newId,
>            "word": word,
>            "category": document.getElementById('editCategory').value,
>            "meaning": document.getElementById('editMeaning').value.trim(),
>            "background": document.getElementById('editBackground').value.trim(),
>            "nuance": document.getElementById('editNuance').value.trim(),
>            "examples": examples,
>            "synonyms": synonyms
>        };
>        wordData.push(newWordData);
>        currentWordId = newId;
>    } else {
>        const targetWord = wordData.find(w => w.id === currentWordId);
>        targetWord.word = word;
>        targetWord.category = document.getElementById('editCategory').value;
>        targetWord.meaning = document.getElementById('editMeaning').value.trim();
>        targetWord.background = document.getElementById('editBackground').value.trim();
>        targetWord.nuance = document.getElementById('editNuance').value.trim();
>        targetWord.examples = examples;
>        targetWord.synonyms = synonyms;
>    }
>
>    saveToLocalStorage();
>    updateFiltersDisplay();
>    renderSelector();
>    showViewMode();
>}
>
>function deleteCurrentWord() {
>    if (currentWordId === -1) return;
>    const targetWord = wordData.find(w => w.id === currentWordId);
>    if (!confirm(`「${targetWord.word}」を削除してもよろしいですか？`)) return;
>
>    const displayedWords = getProcessedWords();
>    const targetIndex = displayedWords.findIndex(w => w.id === currentWordId);
>
>    wordData = wordData.filter(w => w.id !== currentWordId);
>
>    // 次に選択する単語の決定
>    const nextDisplayedWords = getProcessedWords();
>    if (nextDisplayedWords.length === 0) {
>        currentWordId = -1;
>    } else if (targetIndex >= nextDisplayedWords.length) {
>        currentWordId = nextDisplayedWords[nextDisplayedWords.length - 1].id;
>    } else {
>        currentWordId = nextDisplayedWords[targetIndex].id;
>    }
>
>    saveToLocalStorage();
>    updateFiltersDisplay();
>    renderSelector();
>    showViewMode();
>}
>
>// 5. インポート・エクスポート・リセット機能 (複数選択対応)
>function triggerImport() {
>    document.getElementById('fileInput').click();
>}
>
>function importJSON(event) {
>    const files = event.target.files;
>    if (!files || files.length === 0) return;
>
>    const filePromises = Array.from(files).map(file => {
>        return new Promise((resolve, reject) => {
>            const reader = new FileReader();
>            reader.onload = (e) => {
>                try {
>                    const imported = JSON.parse(e.target.result);
>                    const dataArray = Array.isArray(imported) ? imported : [imported];
>                    resolve(dataArray);
>                } catch (err) {
>                    reject(new Error(`ファイル「${file.name}」の解析に失敗しました。`));
>                }
>            };
>            reader.onerror = () => reject(new Error(`ファイル「${file.name}」の読み込みに失敗しました。`));
>            reader.readAsText(file);
>        });
>    });
>
>    Promise.all(filePromises)
>        .then(results => {
>            let combinedData = results.flat();
>
>            if (combinedData.length === 0 || !combinedData[0].word) {
>                alert('正しい難語JSONデータフォーマットではありません。');
>                return;
>            }
>
>            // インポートデータへのID・カテゴリ補完
>            combinedData.forEach((item, index) => {
>                if (!item.id) item.id = Date.now() + index;
>                if (!item.category) item.category = "指定なし";
>            });
>
>            const isAppend = confirm(
>                `合計 ${files.length} 個のファイルから ${combinedData.length} 件の単語を読み込みました。\n\n` +
>                `現在のリストに「追加」しますか？\n` +
>                `（「キャンセル」を選ぶと現在のリストを消去して「上書き」します）`
>            );
>
>            if (isAppend) {
>                wordData = [...wordData, ...combinedData];
>            } else {
>                wordData = combinedData;
>            }
>
>            currentWordId = wordData.length > 0 ? wordData[0].id : -1;
>            saveToLocalStorage();
>            updateFiltersDisplay();
>            renderSelector();
>            showViewMode();
>            alert('一括インポートが完了しました！');
>        })
>        .catch(error => {
>            alert(error.message);
>        })
>        .finally(() => {
>            event.target.value = '';
>        });
>}
>
>function exportJSON() {
>    if (wordData.length === 0) return;
>
>    const jsonString = JSON.stringify(wordData, null, 2);
>    const blob = new Blob([jsonString], { type: 'application/json' });
>    const url = URL.createObjectURL(blob);
>
>    const a = document.createElement('a');
>    a.href = url;
>    a.download = '難語データ_export.json';
>    document.body.appendChild(a);
>    a.click();
>    document.body.removeChild(a);
>    URL.revokeObjectURL(url);
>}
>
>function resetToDefault() {
>    if (!confirm('データを最初の初期状態に戻しますか？\n自分で追加・編集したデータは消去されます。')) return;
>
>    wordData = JSON.parse(JSON.stringify(defaultData));
>    currentWordId = wordData[0].id;
>    currentSort = 'id';
>    currentFilter = 'ALL';
>
>    document.getElementById('sort-id').classList.add('active');
>    document.getElementById('sort-alpha').classList.remove('active');
>
>    saveToLocalStorage();
>    updateFiltersDisplay();
>    renderSelector();
>    showViewMode();
>}
>
>// 起動
>initApp();
></script>
>
></body>
></html>
>```
>
>### 💡 変更点と仕組みの解説
>
> - データ構造のアップグレード
>
>各単語データに内部管理用の id と、分類を保持する category プロパティを追加しました。これにより、並び替えや絞り込みを行っても、「現在どの単語を見ているか」がバグることなく正確に>追跡できます。
>
> - ボタン並び順の「五十音順」切り替え:
>
> JavaScriptの localeCompare('ja') を利用し、単語の日本語表記（カスケード、かしずく等）をベースにした五十音順のソートに対応しました。
>
> - スムーズな連携:
>
> 新規追加時やインポート時にも、自動で「指定なし」などの分類マークが付与され、エクスポートするJSONにもこの分類データが一緒に保存されるため、データの持ち運びも安全です。
>
## 単語一覧を、単語分類についての展開可能な階層構造でサイドバー形式の表示にしてください。また、発音(ひらがな),スペル(外来語、英語)，漢字、登録文字などによる検索機能を追加してください
>
>## 既存のインポート（複数選択対応）、エクスポート、編集、新規追加、リセット、永続化（LocalStorage）といったすべての機能を完全に維持したまま、ご要望の「サイドバー形式の階層構造（アコーディオン）」および「高度な検索機能（ひらがな、スペル、漢字などに対応）」を実装しました
>
>検索の精度をより高めるため、編集フォームに新しく「よみがな（ひらがな）」「漢字表記」「英語・スペル」の個別入力欄を追加し、それらすべてを横断して一発で検索できる仕組みに進化させていま>す。
>
>以下のコードをそのままHTMLファイルとして保存、または上書きしてブラウザで開くだけでご利用いただけます。
>HTML
>
>```html
><!DOCTYPE html>
><html lang="ja">
><head>
>    <meta charset="UTF-8">
>    <meta name="viewport" content="width=device-width, initial-scale=1.0">
>    <title>超高度な難語データビューアー Pro</title>
>    <style>
>        :root {
>            --primary-color: #2c3e50;
>            --accent-color: #3498db;
>            --bg-color: #f8f9fa;
>            --card-bg: #ffffff;
>            --text-color: #333333;
>            --muted-color: #7f8c8d;
>            --success-color: #2ecc71;
>            --danger-color: #e74c3c;
>            --border-color: #cbd5e0;
>        }
>
>        body {
>            font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
>            background-color: var(--bg-color);
>            color: var(--text-color);
>            line-height: 1.6;
>            margin: 0;
>            padding: 20px;
>        }
>
>        .container {
>            max-width: 1200px;
>            margin: 0 auto;
>        }
>
>        header {
>            text-align: center;
>            margin-bottom: 20px;
>        }
>
>        h1 {
>            color: var(--primary-color);
>            font-size: 26px;
>            margin: 0;
>        }
>
>        /* ツールバー */
>        .toolbar {
>            background: var(--card-bg);
>            padding: 15px 20px;
>            border-radius: 8px;
>            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
>            margin-bottom: 20px;
>            display: flex;
>            justify-content: space-between;
>            align-items: center;
>            flex-wrap: wrap;
>            gap: 10px;
>        }
>
>        .btn {
>            padding: 8px 16px;
>            border: none;
>            border-radius: 4px;
>            cursor: pointer;
>            font-size: 14px;
>            font-weight: bold;
>            transition: background 0.2s;
>        }
>        .btn-primary { background: var(--accent-color); color: white; }
>        .btn-primary:hover { background: #2980b9; }
>        .btn-success { background: var(--success-color); color: white; }
>        .btn-success:hover { background: #27ae60; }
>        .btn-danger { background: var(--danger-color); color: white; }
>        .btn-danger:hover { background: #c0392b; }
>        .btn-secondary { background: #95a5a6; color: white; }
>        .btn-secondary:hover { background: #7f8c8d; }
>        
>        .btn-sm {
>            padding: 4px 10px;
>            border-radius: 4px;
>            background: white;
>            border: 1px solid var(--border-color);
>            color: #4a5568;
>            font-size: 12px;
>        }
>        .btn-sm.active {
>            background: var(--primary-color);
>            color: white;
>            border-color: var(--primary-color);
>        }
>
>        #fileInput { display: none; }
>
>        /* メインレイアウト（左右分割） */
>        .main-layout {
>            display: flex;
>            gap: 20px;
>            align-items: flex-start;
>        }
>
>        /* サイドバー（左側） */
>        .sidebar {
>            width: 320px;
>            min-width: 320px;
>            background: var(--card-bg);
>            border-radius: 8px;
>            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
>            padding: 15px;
>            box-sizing: border-box;
>        }
>
>        /* 検索・ソートエリア */
>        .search-box {
>            margin-bottom: 15px;
>        }
>        .search-input {
>            width: 100%;
>            padding: 8px 12px;
>            border: 1px solid var(--border-color);
>            border-radius: 4px;
>            box-sizing: border-box;
>            font-size: 14px;
>            margin-bottom: 10px;
>        }
>        .sort-group {
>            display: flex;
>            align-items: center;
>            gap: 6px;
>            font-size: 12px;
>            color: var(--muted-color);
>        }
>
>        /* 階層構造（アコーディオン）ツリー */
>        .tree-container {
>            max-height: 550px;
>            overflow-y: auto;
>            border-top: 1px solid #edf2f7;
>            padding-top: 10px;
>        }
>        
>        /* カテゴリー（親ノード） */
>        .tree-category {
>            margin-bottom: 5px;
>        }
>        .tree-category-header {
>            display: flex;
>            justify-content: space-between;
>            align-items: center;
>            padding: 8px 10px;
>            background: #f7fafc;
>            border-radius: 4px;
>            cursor: pointer;
>            font-weight: bold;
>            font-size: 14px;
>            user-select: none;
>            transition: background 0.2s;
>        }
>        .tree-category-header:hover { background: #edf2f7; }
>        .tree-category-title {
>            display: flex;
>            align-items: center;
>            gap: 6px;
>        }
>        .tree-toggle-icon {
>            font-size: 10px;
>            transition: transform 0.2s;
>        }
>        .tree-category.open .tree-toggle-icon {
>            transform: rotate(90deg);
>        }
>        
>        /* 単語リスト（子ノード） */
>        .tree-word-list {
>            display: none;
>            padding-left: 15px;
>            margin: 4px 0;
>        }
>        .tree-category.open .tree-word-list {
>            display: block;
>        }
>        
>        .tree-word-item {
>            width: 100%;
>            text-align: left;
>            background: none;
>            border: none;
>            padding: 6px 10px;
>            margin: 2px 0;
>            border-radius: 4px;
>            cursor: pointer;
>            font-size: 13.5px;
>            color: #4a5568;
>            white-space: nowrap;
>            overflow: hidden;
>            text-overflow: ellipsis;
>            display: block;
>        }
>        .tree-word-item:hover { background: #f1f5f9; color: var(--accent-color); }
>        .tree-word-item.active {
>            background-color: #eef7fc;
>            color: var(--accent-color);
>            font-weight: bold;
>        }
>
>        /* メインコンテンツ（右側） */
>        .main-content {
>            flex-grow: 1;
>            background: var(--card-bg);
>            border-radius: 8px;
>            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
>            padding: 30px;
>            min-height: 400px;
>            box-sizing: border-box;
>        }
>
>        .word-header-container {
>            border-bottom: 2px solid var(--accent-color);
>            padding-bottom: 10px;
>            margin-bottom: 15px;
>        }
>        .word-title-row {
>            display: flex;
>            align-items: center;
>            gap: 12px;
>            flex-wrap: wrap;
>        }
>        .word-title {
>            font-size: 28px;
>            font-weight: bold;
>            color: var(--primary-color);
>            margin: 0;
>        }
>        .category-badge {
>            background-color: #e2e8f0;
>            color: #4a5568;
>            padding: 3px 10px;
>            border-radius: 4px;
>            font-size: 12px;
>            font-weight: bold;
>        }
>        .word-sub-info {
>            font-size: 13px;
>            color: var(--muted-color);
>            margin-top: 4px;
>        }
>
>        .section-title {
>            font-size: 16px;
>            font-weight: bold;
>            color: var(--accent-color);
>            margin-top: 25px;
>            margin-bottom: 8px;
>            display: flex;
>            align-items: center;
>        }
>        .section-title::before { content: "◆"; margin-right: 6px; font-size: 12px; }
>
>        .meaning-box {
>            background-color: #eef7fc;
>            border-left: 4px solid var(--accent-color);
>            padding: 15px;
>            border-radius: 0 8px 8px 0;
>            font-size: 16px;
>            font-weight: 500;
>        }
>
>        .text-content { font-size: 15px; color: #444; text-align: justify; white-space: pre-wrap; }
>
>        .example-list { list-style: none; padding-left: 0; margin: 0; }
>        .example-list li { position: relative; padding-left: 20px; margin-bottom: 10px; font-size: 15px; }
>        .example-list li::before { content: "「"; position: absolute; left: 0; color: var(--muted-color); }
>        .example-list li::after { content: "」"; color: var(--muted-color); }
>
>        .synonym-container { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px; }
>        .synonym-tag { background-color: #f1f3f5; color: #495057; padding: 4px 12px; border-radius: 15px; font-size: 14px; }
>
>        /* 編集フォーム */
>        .edit-form { display: none; }
>        .form-row { display: flex; gap: 15px; margin-bottom: 15px; }
>        .form-group { margin-bottom: 15px; flex-grow: 1; }
>        .form-group label { display: block; font-weight: bold; margin-bottom: 5px; color: var(--primary-color); font-size: 14px; }
>        .form-control {
>            width: 100%;
>            padding: 10px;
>            border: 1px solid #ccc;
>            border-radius: 4px;
>            box-sizing: border-box;
>            font-size: 15px;
>            font-family: inherit;
>        }
>        textarea.form-control { resize: vertical; min-height: 80px; }
>        .form-actions { display: flex; gap: 10px; margin-top: 20px; }
>
>        .empty-message { text-align: center; color: var(--muted-color); padding: 40px 0; font-size: 16px; }
>    </style>
></head>
><body>
>
><div class="container">
>    <header>
>        <h1>難語データビューアー Pro</h1>
>    </header>
>
>    <div class="toolbar">
>        <div>
>            <button class="btn btn-primary" onclick="triggerImport()">JSONインポート</button>
>            <input type="file" id="fileInput" accept=".json" onchange="importJSON(event)" multiple>
>            <button class="btn btn-success" id="exportBtn" onclick="exportJSON()">JSONエクスポート</button>
>        </div>
>        <div>
>            <button class="btn btn-primary" onclick="showNewForm()">＋ 新規単語追加</button>
>            <button class="btn btn-danger" onclick="resetToDefault()">初期状態にリセット</button>
>        </div>
>    </div>
>
>    <div class="main-layout">
>
>        <div class="sidebar">
>            <div class="search-box">
>                <input type="text" id="searchInput" class="search-input" placeholder="検索 (かな, 漢字, スペル, 本文...)" oninput="handleSearch()">
>                <div class="sort-group">
>                    <span>並び替え:</span>
>                    <button class="btn-sm active" id="sort-id" onclick="setSort('id')">登録順</button>
>                    <button class="btn-sm" id="sort-alpha" onclick="setSort('alpha')">五十音順</button>
>                </div>
>            </div>
>            
>            <div class="tree-container" id="treeContainer">
>                </div>
>        </div>
>
>        <div class="main-content">
>            <div id="viewMode">
>                <div style="float: right;">
>                    <button class="btn btn-secondary" id="editBtn" onclick="showEditForm()">この単語を編集</button>
>                    <button class="btn btn-danger" id="deleteBtn" style="padding: 8px 12px;" onclick="deleteCurrentWord()">削除</button>
>                </div>
>                <div id="viewTarget"></div>
>            </div>
>
>            <div id="editMode" class="edit-form">
>                <h2 id="formTitle" style="margin-top:0; color: var(--primary-color);">単語の編集</h2>
>                
>                <div class="form-row">
>                    <div class="form-group" style="flex: 2;">
>                        <label for="editWord">単語（表示名）*必須</label>
>                        <input type="text" id="editWord" class="form-control" placeholder="例: カスケード（cascade）">
>                    </div>
>                    <div class="form-group" style="flex: 1;">
>                        <label for="editCategory">単語分類</label>
>                        <select id="editCategory" class="form-control">
>                            <option value="指定なし">指定なし</option>
>                            <option value="外来語">外来語</option>
>                            <option value="熟語">熟語</option>
>                            <option value="慣用句">慣用句</option>
>                            <option value="古語・大和言葉">古語・大和言葉</option>
>                            <option value="その他">その他</option>
>                        </select>
>                    </div>
>                </div>
>
>                <div class="form-row" style="background: #f7fafc; padding: 10px; border-radius: 6px; border: 1px dashed var(--border-color);">
>                    <div class="form-group">
>                        <label for="editReading">よみがな (ひらがな) 【検索用】</label>
>                        <input type="text" id="editReading" class="form-control" placeholder="例: かすけーど">
>                    </div>
>                    <div class="form-group">
>                        <label for="editKanji">漢字表記 【検索用】</label>
>                        <input type="text" id="editKanji" class="form-control" placeholder="例: 傅く">
>                    </div>
>                    <div class="form-group">
>                        <label for="editEnglish">英語・スペル 【検索用】</label>
>                        <input type="text" id="editEnglish" class="form-control" placeholder="例: cascade">
>                    </div>
>                </div>
>
>                <div class="form-group">
>                    <label for="editMeaning">意味</label>
>                    <textarea id="editMeaning" class="form-control" placeholder="言葉の意味を入力"></textarea>
>                </div>
>                <div class="form-group">
>                    <label for="editBackground">背景 / 由来</label>
>                    <textarea id="editBackground" class="form-control" placeholder="言葉の背景や歴史、由来を入力"></textarea>
>                </div>
>                <div class="form-group">
>                    <label for="editNuance">ニュアンス</label>
>                    <textarea id="editNuance" class="form-control" placeholder="使われる際の細かいニュアンスを入力"></textarea>
>                </div>
>                <div class="form-group">
>                    <label for="editExamples">例文（1行に1文ずつ入力してください）</label>
>                    <textarea id="editExamples" class="form-control" style="min-height: 100px;" placeholder="例文1&#10;例文2&#10;例文3"></textarea>
>                </div>
>                <div class="form-group">
>                    <label for="editSynonyms">類義語（カンマ「,」区切り、または改行で入力してください）</label>
>                    <textarea id="editSynonyms" class="form-control" placeholder="連鎖, 波及, ドミノ倒し"></textarea>
>                </div>
>                <div class="form-actions">
>                    <button class="btn btn-success" onclick="saveWord()">保存</button>
>                    <button class="btn btn-secondary" onclick="cancelEdit()">キャンセル</button>
>                </div>
>            </div>
>        </div>
>
>    </div>
></div>
>
><script>
>// デフォルト初期データ（検索用属性補完）
>const defaultData = [
>  {
>    "id": 1,
>    "word": "カスケード（cascade）",
>    "category": "外来語",
>    "reading": "かすけーど",
>    "kanji": "",
>    "english": "cascade",
>    "meaning": "連鎖的に物事が起きること。または、上から下へ階段状に流れ落ちる滝や、そのように連なるものを指す。",
>    "background": "原語はイタリア語の「cascata（滝）」やラテン語の「cadere（落ちる）」に由来し、元々は「小さな連なった滝」を意味していました。そこから派生して、現代ではIT、ビジネ>ス、科学など様々な分野で「一つの事象が次の事象を芋づる式に引き起こす仕組みや現象」を指す言葉として広く使われています。",
>    "nuance": "単に物事が連続するだけでなく、「上流から下流へ」「1つが引き金となって次々と自動的・不可避的に」伝播していくという、力強い連鎖のニュアンスを含みます。IT分野では機能の>連鎖、ビジネスでは方針の浸透、医療では拒絶反応の連鎖など、文脈によってポジティブにもネガティブにも使われます。",
>    "examples": [
>      "経営陣が決定した経営戦略を、各部門へカスケードダウン（一貫して浸透）させる。",
>      "システムの1ヶ所で発生したバグが、カスケード障害を引き起こしてサーバー全体がダウンした。",
>      "CSS（Cascading Style Sheets）は、スタイルの優先順位が上から下へと連鎖的に適用される仕組みに基づいている。"
>    ],
>    "synonyms": ["連鎖", "ドミノ倒し", "波及", "芋づる式", "数珠繋ぎ"]
>  },
>  {
>    "id": 2,
>    "word": "かしずく（傅く）",
>    "category": "古語・大和言葉",
>    "reading": "かしづく",
>    "kanji": "傅く",
>    "english": "",
>    "meaning": "人に仕えて 大事に世話をする。また、子供を大切に養い育てる。",
>    "background": "古語の「かしづく」に由来する言葉です。平安時代の貴族社会において、身分の高い人に仕えて身の回りの世話をすることや、親が大切な我が子をいつくしみ、手を尽くして育てる>ことを指す言葉として広く使われています。現代では主に前者の「仕える」という意味合いが強く残っています。",
>    "nuance": "単にお世話をするだけでなく、相手に対して「深い敬意」や「愛情」を持って、至れり尽くせりでもてなすというニュアンスが含まれます。現代の日常会話で使われることは稀で、小説>や漫画などの創作物、あるいは格式高い表現の中で、主従関係や献身的な態度を強調する際によく用いられます。",
>    "examples": [
>      "若き女王の周りには、彼女に傅く大勢の侍従たちが控えていた。",
>      "主人の一言で、使用人たちは一斉に傅いて命令に従った。",
>      "両親から蝶よ花よと傅かれて育ったため、彼女は世間知らずなところがある。"
>    ],
>    "synonyms": ["仕える（つかえる）", "かしずき奉る", "お世話する", "奉公する", "傅育する（ふいくする）"]
>  }
>];
>
>// アプリケーション状態
>let wordData = [];
>let currentWordId = -1;
>let isNewWord = false;
>
>// 検索・ソート・展開状態
>let searchQuery = '';
>let currentSort = 'id'; // 'id' または 'alpha'
>let openCategories = {}; // どのカテゴリーが展開されているかの状態を保持
>
>// 1. 初期化処理
>function initApp() {
>    const savedData = localStorage.getItem('nango_data');
>    if (savedData) {
>        try {
>            wordData = JSON.parse(savedData);
>            // 互換性補完
>            wordData.forEach((item, index) => {
>                if (!item.id) item.id = Date.now() + index;
>                if (!item.category) item.category = "指定なし";
>                if (item.reading === undefined) item.reading = "";
>                if (item.kanji === undefined) item.kanji = "";
>                if (item.english === undefined) item.english = "";
>            });
>        } catch(e) {
>            wordData = JSON.parse(JSON.stringify(defaultData));
>        }
>    } else {
>        wordData = JSON.parse(JSON.stringify(defaultData));
>        saveToLocalStorage();
>    }
>
>    // 最初期は全てのカテゴリを開いておく
>    const categories = [...new Set(wordData.map(w => w.category))];
>    categories.forEach(cat => { openCategories[cat] = true; });
>
>    currentWordId = wordData.length > 0 ? wordData[0].id : -1;
>    renderSidebarTree();
>    showViewMode();
>}
>
>function saveToLocalStorage() {
>    localStorage.setItem('nango_data', JSON.stringify(wordData));
>}
>
>// 2. 検索・ソート処理
>function handleSearch() {
>    searchQuery = document.getElementById('searchInput').value.trim().toLowerCase();
>    renderSidebarTree();
>}
>
>function setSort(type) {
>    currentSort = type;
>    document.getElementById('sort-id').classList.toggle('active', type === 'id');
>    document.getElementById('sort-alpha').classList.toggle('active', type === 'alpha');
>    renderSidebarTree();
>}
>
>// 検索＆ソート条件に沿って単語を処理
>function getProcessedWords() {
>    let result = [...wordData];
>
>    // 🔍 超強力・横断多重検索 (表記、読み、漢字、英語、意味、類義語)
>    if (searchQuery) {
>        result = result.filter(w => {
>            return (w.word && w.word.toLowerCase().includes(searchQuery)) ||
>                   (w.reading && w.reading.toLowerCase().includes(searchQuery)) ||
>                   (w.kanji && w.kanji.toLowerCase().includes(searchQuery)) ||
>                   (w.english && w.english.toLowerCase().includes(searchQuery)) ||
>                   (w.meaning && w.meaning.toLowerCase().includes(searchQuery)) ||
>                   (w.synonyms && w.synonyms.some(s => s.toLowerCase().includes(searchQuery)));
>        });
>    }
>
>    // ソート処理
>    if (currentSort === 'alpha') {
>        result.sort((a, b) => {
>            const keyA = a.reading || a.word || '';
>            const keyB = b.reading || b.word || '';
>            return keyA.localeCompare(keyB, 'ja');
>        });
>    } else {
>        result.sort((a, b) => (a.id || 0) - (b.id || 0));
>    }
>
>    return result;
>}
>
>// 3. サイドバーの階層構造（ツリー構造）生成
>function renderSidebarTree() {
>    const container = document.getElementById('treeContainer');
>    container.innerHTML = '';
>
>    const processedWords = getProcessedWords();
>
>    if (processedWords.length === 0) {
>        container.innerHTML = '<div style="font-size:12px; color:var(--muted-color); text-align:center; padding:20px 0;">該当する単語はありません</div>';
>        return;
>    }
>
>    // データのカテゴリー分け
>    const categorized = {};
>    processedWords.forEach(word => {
>        const cat = word.category || "指定なし";
>        if (!categorized[cat]) categorized[cat] = [];
>        categorized[cat].push(word);
>    });
>
>    // カテゴリーごとにアコーディオン要素を構築
>    Object.keys(categorized).sort().forEach(catName => {
>        const words = categorized[catName];
>
>        // カテゴリー別コンテナ
>        const categoryDiv = document.createElement('div');
>        categoryDiv.className = `tree-category ${openCategories[catName] ? 'open' : ''}`;
>
>        // ヘッダー（クリックで開閉）
>        const header = document.createElement('div');
>        header.className = 'tree-category-header';
>        header.onclick = () => {
>            categoryDiv.classList.toggle('open');
>            openCategories[catName] = categoryDiv.classList.contains('open');
>        };
>
>        const titleSpan = document.createElement('span');
>        titleSpan.className = 'tree-category-title';
>        titleSpan.innerHTML = `<span class="tree-toggle-icon">▶</span> ${catName} (${words.length})`;
>
>        header.appendChild(titleSpan);
>        categoryDiv.appendChild(header);
>
>        // 単語リスト（子ノード）
>        const wordListDiv = document.createElement('div');
>        wordListDiv.className = 'tree-word-list';
>
>        words.forEach(word => {
>            const wordBtn = document.createElement('button');
>            wordBtn.className = `tree-word-item ${word.id === currentWordId ? 'active' : ''}`;
>            wordBtn.textContent = word.word ? word.word.split['（'](0).split('['](0) : '無題';
>            wordBtn.title = word.word; // ホバー時にフルテキストを表示
>
>            wordBtn.onclick = () => {
>                currentWordId = word.id;
>                document.querySelectorAll('.tree-word-item').forEach(btn => btn.classList.remove('active'));
>                wordBtn.classList.add('active');
>                showViewMode();
>            };
>            wordListDiv.appendChild(wordBtn);
>        });
>
>        categoryDiv.appendChild(wordListDiv);
>        container.appendChild(categoryDiv);
>    });
>
>    document.getElementById('exportBtn').disabled = wordData.length === 0;
>}
>
>// 4. 右側メインコンテンツの描画
>function showViewMode() {
>    document.getElementById('editMode').style.display = 'none';
>    document.getElementById('viewMode').style.display = 'block';
>
>    const target = document.getElementById('viewTarget');
>    const editBtn = document.getElementById('editBtn');
>    const deleteBtn = document.getElementById('deleteBtn');
>
>    const currentWord = wordData.find(w => w.id === currentWordId);
>
>    if (!currentWord || wordData.length === 0) {
>        target.innerHTML = '<div class="empty-message">表示する単語が選択されていないか、データが存在しません。左のサイドバーから単語を選択してください。</div>';
>        editBtn.style.display = 'none';
>        deleteBtn.style.display = 'none';
>        return;
>    }
>
>    editBtn.style.display = 'inline-block';
>    deleteBtn.style.display = 'inline-block';
>
>    const data = currentWord;
>    const examplesHtml = (data.examples || []).map(ex => `<li>${ex}</li>`).join('');
>    const synonymsHtml = (data.synonyms || []).map(syn => `<span class="synonym-tag">${syn}</span>`).join('');
>
>    // 各個別検索タグ情報を表示用に整理
>    const extraTags = [
>        data.reading ? `よみがな: ${data.reading}` : '',
>        data.kanji ? `漢字: ${data.kanji}` : '',
>        data.english ? `スペル: ${data.english}` : ''
>    ].filter(Boolean).join(' | ');
>
>    target.innerHTML = `
>        <div class="word-header-container">
>            <div class="word-title-row">
>                <h2 class="word-title">${data.word || ''}</h2>
>                <span class="category-badge">${data.category || '指定なし'}</span>
>            </div>
>            ${extraTags ? `<div class="word-sub-info">${extraTags}</div>` : ''}
>        </div>
>
>        <div class="section-title">意味</div>
>        <div class="meaning-box">${data.meaning || ''}</div>
>
>        <div class="section-title">言葉の背景 / 由来</div>
>        <div class="text-content">${data.background || ''}</div>
>
>        <div class="section-title">ニュアンス</div>
>        <div class="text-content">${data.nuance || ''}</div>
>
>        <div class="section-title">例文</div>
>        <ul class="example-list">${examplesHtml || '<li>（登録なし）</li>'}</ul>
>
>        <div class="section-title">類義語</div>
>        <div class="synonym-container">${synonymsHtml || '<span style="color:var(--muted-color); font-size:14px;">（登録なし）</span>'}</div>
>    `;
>}
>
>// 5. 編集・追加機能
>function showEditForm() {
>    isNewWord = false;
>    document.getElementById('formTitle').textContent = "単語の編集";
>    document.getElementById('viewMode').style.display = 'none';
>    document.getElementById('editMode').style.display = 'block';
>
>    const data = wordData.find(w => w.id === currentWordId);
>    document.getElementById('editWord').value = data.word || '';
>    document.getElementById('editCategory').value = data.category || '指定なし';
>    document.getElementById('editReading').value = data.reading || '';
>    document.getElementById('editKanji').value = data.kanji || '';
>    document.getElementById('editEnglish').value = data.english || '';
>    document.getElementById('editMeaning').value = data.meaning || '';
>    document.getElementById('editBackground').value = data.background || '';
>    document.getElementById('editNuance').value = data.nuance || '';
>    document.getElementById('editExamples').value = (data.examples || []).join('\n');
>    document.getElementById('editSynonyms').value = (data.synonyms || []).join(', ');
>}
>
>function showNewForm() {
>    isNewWord = true;
>    document.getElementById('formTitle').textContent = "新規単語追加";
>    document.getElementById('viewMode').style.display = 'none';
>    document.getElementById('editMode').style.display = 'block';
>
>    document.getElementById('editWord').value = '';
>    document.getElementById('editCategory').value = '指定なし';
>    document.getElementById('editReading').value = '';
>    document.getElementById('editKanji').value = '';
>    document.getElementById('editEnglish').value = '';
>    document.getElementById('editMeaning').value = '';
>    document.getElementById('editBackground').value = '';
>    document.getElementById('editNuance').value = '';
>    document.getElementById('editExamples').value = '';
>    document.getElementById('editSynonyms').value = '';
>}
>
>function cancelEdit() {
>    showViewMode();
>}
>
>function saveWord() {
>    const word = document.getElementById('editWord').value.trim();
>    if (!word) {
>        alert('単語（表記）は必須入力です。');
>        return;
>    }
>
>    const examplesText = document.getElementById('editExamples').value;
>    const examples = examplesText.split('\n').map(line => line.trim()).filter(line => line !== '');
>
>    const synonymsText = document.getElementById('editSynonyms').value;
>    const synonyms = synonymsText.split(/[,，、\n]/).map(item => item.trim()).filter(item => item !== '');
>
>    const category = document.getElementById('editCategory').value;
>
>    if (isNewWord) {
>        const newId = Date.now();
>        const newWordData = {
>            "id": newId,
>            "word": word,
>            "category": category,
>            "reading": document.getElementById('editReading').value.trim(),
>            "kanji": document.getElementById('editKanji').value.trim(),
>            "english": document.getElementById('editEnglish').value.trim(),
>            "meaning": document.getElementById('editMeaning').value.trim(),
>            "background": document.getElementById('editBackground').value.trim(),
>            "nuance": document.getElementById('editNuance').value.trim(),
>            "examples": examples,
>            "synonyms": synonyms
>        };
>        wordData.push(newWordData);
>        currentWordId = newId;
>    } else {
>        const targetWord = wordData.find(w => w.id === currentWordId);
>        targetWord.word = word;
>        targetWord.category = category;
>        targetWord.reading = document.getElementById('editReading').value.trim();
>        targetWord.kanji = document.getElementById('editKanji').value.trim();
>        targetWord.english = document.getElementById('editEnglish').value.trim();
>        targetWord.meaning = document.getElementById('editMeaning').value.trim();
>        targetWord.background = document.getElementById('editBackground').value.trim();
>        targetWord.nuance = document.getElementById('editNuance').value.trim();
>        targetWord.examples = examples;
>        targetWord.synonyms = synonyms;
>    }
>
>    // 新しいカテゴリーが追加された場合は開いた状態にする
>    if (openCategories[category] === undefined) {
>        openCategories[category] = true;
>    }
>
>    saveToLocalStorage();
>    renderSidebarTree();
>    showViewMode();
>}
>
>function deleteCurrentWord() {
>    if (currentWordId === -1) return;
>    const targetWord = wordData.find(w => w.id === currentWordId);
>    if (!confirm(`「${targetWord.word}」を削除してもよろしいですか？`)) return;
>
>    const processed = getProcessedWords();
>    const targetIndex = processed.findIndex(w => w.id === currentWordId);
>
>    wordData = wordData.filter(w => w.id !== currentWordId);
>
>    const nextProcessed = getProcessedWords();
>    if (nextProcessed.length === 0) {
>        currentWordId = -1;
>    } else if (targetIndex >= nextProcessed.length) {
>        currentWordId = nextProcessed[nextProcessed.length - 1].id;
>    } else {
>        currentWordId = nextProcessed[targetIndex].id;
>    }
>
>    saveToLocalStorage();
>    renderSidebarTree();
>    showViewMode();
>}
>
>// 6. インポート・エクスポート・リセット (機能互換性維持)
>function triggerImport() { document.getElementById('fileInput').click(); }
>
>function importJSON(event) {
>    const files = event.target.files;
>    if (!files || files.length === 0) return;
>
>    const filePromises = Array.from(files).map(file => {
>        return new Promise((resolve, reject) => {
>            const reader = new FileReader();
>            reader.onload = (e) => {
>                try {
>                    const imported = JSON.parse(e.target.result);
>                    const dataArray = Array.isArray(imported) ? imported : [imported];
>                    resolve(dataArray);
>                } catch (err) { reject(new Error(`ファイル「${file.name}」の解析に失敗しました。`)); }
>            };
>            reader.onerror = () => reject(new Error(`ファイル「${file.name}」の読み込みに失敗しました。`));
>            reader.readAsText(file);
>        });
>    });
>
>    Promise.all(filePromises)
>        .then(results => {
>            let combinedData = results.flat();
>            if (combinedData.length === 0 || !combinedData[0].word) {
>                alert('正しい難語JSONデータフォーマットではありません。');
>                return;
>            }
>
>            combinedData.forEach((item, index) => {
>                if (!item.id) item.id = Date.now() + index;
>                if (!item.category) item.category = "指定なし";
>                if (item.reading === undefined) item.reading = "";
>                if (item.kanji === undefined) item.kanji = "";
>                if (item.english === undefined) item.english = "";
>            });
>
>            const isAppend = confirm(`合計 ${files.length} 個のファイルから ${combinedData.length} 件の単語を読み込みました。\n\n現在のリストに追加しますか？ (キャンセルで上書>き)`);
>
>            if (isAppend) { wordData = [...wordData, ...combinedData]; }
>            else { wordData = combinedData; }
>
>            // 新規読み込みしたカテゴリーを展開状態にする
>            wordData.forEach(w => { if(openCategories[w.category] === undefined) openCategories[w.category] = true; });
>
>            currentWordId = wordData.length > 0 ? wordData[0].id : -1;
>            saveToLocalStorage();
>            renderSidebarTree();
>            showViewMode();
>            alert('一括インポートが完了しました！');
>        })
>        .catch(error => { alert(error.message); })
>        .finally(() => { event.target.value = ''; });
>}
>
>function exportJSON() {
>    if (wordData.length === 0) return;
>    const jsonString = JSON.stringify(wordData, null, 2);
>    const blob = new Blob([jsonString], { type: 'application/json' });
>    const url = URL.createObjectURL(blob);
>    const a = document.createElement('a');
>    a.href = url; a.download = '難語データ_export.json';
>    document.body.appendChild(a); a.click(); document.body.removeChild(a);
>    URL.revokeObjectURL(url);
>}
>
>function resetToDefault() {
>    if (!confirm('データを最初の初期状態に戻しますか？\n自分で追加・編集したデータは消去されます。')) return;
>    wordData = JSON.parse(JSON.stringify(defaultData));
>    currentWordId = wordData[0].id;
>    currentSort = 'id';
>    searchQuery = '';
>    document.getElementById('searchInput').value = '';
>    document.getElementById('sort-id').classList.add('active');
>    document.getElementById('sort-alpha').classList.remove('active');
>
>    // 全展開
>    openCategories = {};
>    wordData.forEach(w => { openCategories[w.category] = true; });
>
>    saveToLocalStorage();
>    renderSidebarTree();
>    showViewMode();
>}
>
>// 起動
>initApp();
></script>
>
></body>
></html>
>```
>
>### ✨ 今回追加・アップデートされたポイント
>
>#### 展開・折りたたみ可能な階層型サイドバー
>
> - 画面左側に専用のサイドバーを設け、「外来語」「熟語」「古語・大和言葉」といった分類名ごとにアコーディオン形式で単語がまとまるようにしました。
>
> - カテゴリー行（例: 外来語 (1) ▶）をクリックするだけで、該当する単語の一覧をサッと展開・収納できます。
>
>#### 多面的な高度検索機能（ひらがな・スペル・漢字等に対応）
>
> - 検索窓に入力すると、単語名だけでなく、設定した「よみがな（ひらがな）」「漢字」「英語・スペル」に加え、「意味」や「類義語」のテキストまでリアルタイムに横断部分一致検索を行います。
>
> - 入力するだけで左側のツリー構造が条件に合うものだけにシュッと絞り込まれます。
>
>#### 編集フォームに検索特化フィールドを設置
>
> - 「新規単語追加」や「この単語を編集」を開くと、中央部分に点線で囲まれた【検索用】の属性入力欄（よみがな、漢字表記、英語・スペル）が出現します。ここにデータを登録しておくこと>で、よりスマートに検索にヒットさせることができるようになります。
>
