'use strict';

const STORAGE_KEY = 'nango_data';
const SESSION_KEY = 'nango_quiz_session_data';
const $ = (id) => document.getElementById(id);
let wordPool = [];
let questions = [];
let questionIndex = 0;
let score = 0;
let answered = false;

const asText = (value) => typeof value === 'string'
    ? value.trim()
    : (value == null ? '' : String(value).trim());
const normalize = (value) => asText(value).normalize('NFKC')
    .replace(/[\s　]+/g, ' ').toLocaleLowerCase('ja');

function shuffle(values) {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
function uniqueTexts(values) {
    const seen = new Set();
    return values.filter((value) => {
        const key = normalize(value);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
function readStoredDocument() {
    for (const [storage, key] of [
        [window.sessionStorage, SESSION_KEY],
        [window.localStorage, STORAGE_KEY]
    ]) {
        try {
            const raw = storage.getItem(key);
            if (!raw) continue;
            const data = JSON.parse(raw);
            if (data && typeof data === 'object') return data;
        } catch (error) {
            console.warn('辞書データを読み込めませんでした:', error);
        }
    }
    return null;
}
function entriesFromDocument(data) {
    if (!data || typeof data !== 'object') return [];
    if (Array.isArray(data)) return data.map((word) => [asText(word && word.word), word]);
    if (Array.isArray(data.words)) return data.words.map((word) => [asText(word && word.word), word]);
    if (data.words && typeof data.words === 'object') return Object.entries(data.words);
    return [];
}
function createWordPool(data) {
    const entries = entriesFromDocument(data).flatMap(([key, raw]) => {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
        const word = asText(raw.word || key || raw.name);
        if (!word) return [];
        const meanings = Array.isArray(raw.meanings) ? raw.meanings : [];
        return meanings.map((meaning) => ({
            word,
            definition: asText(meaning && (meaning.definition || meaning.meaning)),
            background: asText(meaning && meaning.background)
        })).filter((entry) => entry.definition);
    });
    const usedWords = new Set();
    // 1セット内で同じ見出し語を重ねず、意味をひとつずつ出題する。
    return shuffle(entries).filter((entry) => {
        const key = normalize(entry.word);
        if (!key || usedWords.has(key)) return false;
        usedWords.add(key);
        return true;
    });
}
function distractorsFor(target, type) {
    const correct = type === 'word_to_meaning' ? target.definition : target.word;
    const candidateValues = wordPool
        .filter((entry) => normalize(entry.word) !== normalize(target.word))
        .map((entry) => type === 'word_to_meaning' ? entry.definition : entry.word);
    return uniqueTexts(candidateValues).filter((value) => normalize(value) !== normalize(correct));
}
function canAsk(target, type) {
    return distractorsFor(target, type).length > 0;
}
function targetsFor(mode) {
    if (mode === 'mixed') {
        return wordPool.filter((entry) => canAsk(entry, 'word_to_meaning') || canAsk(entry, 'meaning_to_word'));
    }
    return wordPool.filter((entry) => canAsk(entry, mode));
}
function renderSetupSummary() {
    const mode = $('quizDirection').value;
    const targets = targetsFor(mode);
    $('bankCount').textContent = wordPool.length + '語';
    $('bankSummary').textContent =
        '登録語から ' + wordPool.length + ' 語を読み込みました。選択した形式で ' + targets.length + ' 問出題できます。';
    $('startQuizButton').disabled = targets.length === 0;
    $('setupStatus').textContent = targets.length
        ? ''
        : '異なる単語を2語以上登録し、それぞれに意味・定義を追加してください。';
}
function makeQuestion(target, type) {
    const wordPrompt = type === 'word_to_meaning';
    const correct = wordPrompt ? target.definition : target.word;
    const options = shuffle([
        correct,
        ...shuffle(distractorsFor(target, type)).slice(0, 3)
    ]);
    return {
        type,
        kind: wordPrompt ? '単語から意味を選ぶ' : '意味から単語を選ぶ',
        prompt: wordPrompt
            ? '「' + target.word + '」の意味として最も適切なものは？'
            : '次の説明に当てはまる単語は？\n' + target.definition,
        options,
        correct,
        background: target.background
    };
}
function startQuiz() {
    const mode = $('quizDirection').value;
    const targets = shuffle(targetsFor(mode));
    if (!targets.length) {
        renderSetupSummary();
        return;
    }
    const requested = $('quizCount').value;
    const count = requested === 'all' ? targets.length : Math.min(Number(requested) || 5, targets.length);
    questions = targets.slice(0, count).map((target) => {
        let type = mode;
        if (mode === 'mixed') {
            const usableTypes = ['word_to_meaning', 'meaning_to_word']
                .filter((candidate) => canAsk(target, candidate));
            type = usableTypes[Math.floor(Math.random() * usableTypes.length)];
        }
        return makeQuestion(target, type);
    });
    questionIndex = 0;
    score = 0;
    answered = false;
    $('setupScreen').hidden = true;
    $('resultScreen').hidden = true;
    $('quizScreen').hidden = false;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    renderQuestion();
}
function renderQuestion() {
    const question = questions[questionIndex];
    if (!question) {
        showResults();
        return;
    }
    answered = false;
    $('progressLabel').textContent = (questionIndex + 1) + ' / ' + questions.length;
    $('progressBar').style.width = ((questionIndex + 1) / questions.length * 100) + '%';
    $('questionKind').textContent = question.kind;
    $('questionPrompt').textContent = question.prompt;
    $('optionList').replaceChildren();

    question.options.forEach((value, optionIndex) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'quiz-option';

        const marker = document.createElement('span');
        marker.className = 'option-marker';
        marker.textContent = String.fromCharCode(65 + optionIndex);

        const label = document.createElement('span');
        label.textContent = value;
        button.append(marker, label);
        button.addEventListener('click', () => selectAnswer(optionIndex));
        $('optionList').appendChild(button);
    });

    $('answerFeedback').hidden = true;
    $('answerFeedback').className = 'answer-feedback';
    $('answerFeedback').textContent = '';
    $('nextQuestionButton').disabled = true;
    $('nextQuestionButton').textContent = '回答を選択';
}
function selectAnswer(optionIndex) {
    if (answered) return;
    answered = true;
    const question = questions[questionIndex];
    const selected = question.options[optionIndex];
    const isCorrect = selected === question.correct;
    if (isCorrect) score++;

    [...$('optionList').querySelectorAll('button')].forEach((button, index) => {
        button.disabled = true;
        if (question.options[index] === question.correct) button.classList.add('is-correct');
        else if (index === optionIndex) button.classList.add('is-incorrect');
    });

    const feedback = $('answerFeedback');
    feedback.hidden = false;
    feedback.classList.add(isCorrect ? 'is-correct' : 'is-incorrect');
    feedback.textContent = (isCorrect ? '正解です。' : '不正解です。') + '\n'
        + (question.type === 'word_to_meaning' ? '正解の意味: ' : '正解の単語: ')
        + question.correct
        + (question.background ? '\n\n背景・補足: ' + question.background : '');
    $('nextQuestionButton').disabled = false;
    $('nextQuestionButton').textContent = questionIndex === questions.length - 1 ? '結果を見る' : '次の問題へ';
}
function nextQuestion() {
    if (!answered) return;
    if (questionIndex + 1 >= questions.length) {
        showResults();
        return;
    }
    questionIndex++;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    renderQuestion();
}
function showResults() {
    $('setupScreen').hidden = true;
    $('quizScreen').hidden = true;
    $('resultScreen').hidden = false;
    $('resultScore').textContent = score + ' / ' + questions.length;
    $('resultSummary').textContent =
        '正答率 ' + Math.round(score / questions.length * 100) + '%。解答した ' + questions.length + ' 問を集計しました。';
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}
function showSetup() {
    $('resultScreen').hidden = true;
    $('quizScreen').hidden = true;
    $('setupScreen').hidden = false;
    renderSetupSummary();
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}
function returnToNango() {
    if (document.referrer) {
        try {
            if (new URL(document.referrer).origin === location.origin && history.length > 1) {
                history.back();
                return;
            }
        } catch (_) { /* Use the app URL if the referrer is unavailable. */ }
    }
    location.assign(new URL('Nango-neo.v03.1.0.html', document.baseURI).href);
}
function quitQuiz() {
    if (confirm('現在のクイズを終了してNangoへ戻りますか？')) returnToNango();
}
document.addEventListener('DOMContentLoaded', () => {
    wordPool = createWordPool(readStoredDocument());
    $('quizDirection').addEventListener('change', renderSetupSummary);
    $('quizCount').addEventListener('change', renderSetupSummary);
    renderSetupSummary();
    document.addEventListener('keydown', (event) => {
        if ($('quizScreen').hidden) return;
        if (!answered && /^[1-4]$/.test(event.key)) {
            $('optionList').querySelectorAll('button')[Number(event.key) - 1]?.click();
        } else if (answered && event.key === 'Enter' && !$('nextQuestionButton').disabled) {
            $('nextQuestionButton').click();
        }
    });
});
