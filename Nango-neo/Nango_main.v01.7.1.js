/* Nango-neo Phase 1
 * Canonical file format: DTformats.neo.v5.15 (words object keyed by displayed word).
 * The UI uses an internal array; conversion happens only at load/import/export boundaries.
 */
'use strict';

const STORAGE_KEY = 'nango_data';
const SETTINGS_KEY = 'nango_settings_v271';
const SETTINGS_DEFAULTS = { showGeminiNote: true, defaultDisplayMode: 'word' };
const LOCAL_DATA_API = '/api/data';
let serverSaveQueue = Promise.resolve();
let serverStorageAvailable = false;

function showStorageStatus(message, isError = false) {
    let status = document.getElementById('localStorageStatus');
    if (!status) {
        status = document.createElement('span');
        status.id = 'localStorageStatus';
        status.style.cssText = 'font-size:0.85em;margin-left:0.75em;color:var(--muted-color, #666);';
        const nav = document.querySelector('.top-bar, .app-header, header');
        (nav || document.body).appendChild(status);
    }
    status.textContent = message;
    status.style.color = isError ? '#b42318' : '';
}

async function loadServerData() {
    try {
        const response = await fetch(LOCAL_DATA_API, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        serverStorageAvailable = true;
        return result && result.exists ? result.data : null;
    } catch (error) {
        serverStorageAvailable = false;
        console.warn('ローカルファイル保存APIに接続できません。ブラウザー保存を使用します。', error);
        return null;
    }
}
const FORMAT_VERSION = 'DTformats.neo.v5.15';
const nowIso = () => new Date().toISOString();

const defaultData = [
    {
        word: 'カスケード', id: 1, datetime: '2026-10-09T00:00:00+09:00',
        category: '外来語', eraTag: '現代', reading: 'かすけーど', kanji: '', english: 'cascade',
        column: '上流から下流へとつながっていく様子を表す語。', memo: '', gemini_note: '', other_tags: ['IT'],
        meanings: [{
            definition: '連鎖的に物事が起きること。または、階段状に流れ落ちる滝や、そのように連なるもの。',
            background: '英語 cascade は、滝を意味する語に由来する。IT、ビジネス、科学などで、一つの事象が次々と別の事象を引き起こす現象を表す。',
            nuance: '単に連続するだけでなく、上流から下流へ、ある事象をきっかけに次々と波及する印象がある。',
            fieldTag: ['エンジニアリング'],
            examples: [
                '小さな設定ミスがカスケード障害を引き起こした。',
                'CSSではスタイルが優先順位に従ってカスケードする。'
            ], synonyms: ['連鎖', '波及', 'ドミノ倒し']
        }]
    },
    {
        word: '傅く', id: 2, datetime: '2026-10-09T00:00:00+09:00',
        category: '古語・大和言葉', eraTag: '中世', reading: 'かしづく', kanji: '傅く', english: '',
        column: '', memo: '', gemini_note: '', other_tags: [],
        meanings: [{
            definition: '人に仕えて大切に世話をする。また、子供を大切に養い育てる。',
            background: '古語「かしづく」に由来し、貴人に仕えることや、子どもを慈しみ育てることを指した。',
            nuance: '深い敬意や愛情をこめて世話をするニュアンスがあり、現代では文学的な表現として見られる。',
            fieldTag: ['日常', '日本語史'],
            examples: ['若き女王に傅く侍従たちが控えていた。'], synonyms: ['仕える', 'お世話する', '奉公する']
        }]
    }
];

let wordData = [];
let additionalData = [];
let currentWordId = -1;
let isNewWord = false;
let searchQuery = '';
let currentSort = 'id';
let currentHierarchy = 'fieldTag';
let openCategories = {};
let pastePanelOpen = false;
let meaningClipboard = null;
let wordListTagFilter = null;
let appNavigationHistory = [];
let appNavigationIndex = -1;
let restoringNavigation = false;
const tagTableSortState = {};
let wordListColumnSort = { key: null, direction: 'asc' };
let selectedCategoryFilters = [];
let wordListSelectedCategories = [];
let wordListFiltersOpen = false;
let groupDisplayEnabled = true;
let displaySettings = { ...SETTINGS_DEFAULTS };
let formatMode = 'readable';
const formatDataCache = {};

function currentScreenSnapshot(screen, extra = {}) {
    return {
        screen,
        wordId: currentWordId,
        tagFilter: wordListTagFilter ? { ...wordListTagFilter } : null,
        wordListSearch: $('wordListSearch')?.value || '',
        wordListSort: $('wordListSort')?.value || 'id',
        wordListDirection: $('wordListDirection')?.value || 'asc',
        pasteText: $('jsonPasteInput')?.value || '',
        ...extra
    };
}
function recordAppNavigation(screen, extra = {}) {
    if (restoringNavigation) return;
    const snapshot = currentScreenSnapshot(screen, extra);
    const previous = appNavigationHistory[appNavigationIndex];
    if (previous && JSON.stringify(previous) === JSON.stringify(snapshot)) return;
    appNavigationHistory = appNavigationHistory.slice(0, appNavigationIndex + 1);
    appNavigationHistory.push(snapshot);
    if (appNavigationHistory.length > 100) appNavigationHistory.shift();
    appNavigationIndex = appNavigationHistory.length - 1;
    updateAppNavigationButtons();
}
function updateAppNavigationButtons() {
    const back = $('pageBackBtn'), forward = $('pageForwardBtn');
    if (back) back.disabled = appNavigationIndex <= 0;
    if (forward) forward.disabled = appNavigationIndex < 0 || appNavigationIndex >= appNavigationHistory.length - 1;
}
function navigateAppHistory(delta) {
    const next = appNavigationIndex + delta;
    if (next < 0 || next >= appNavigationHistory.length) return;
    appNavigationIndex = next;
    restoreAppNavigation(appNavigationHistory[appNavigationIndex]);
    updateAppNavigationButtons();
}
function restoreAppNavigation(state) {
    restoringNavigation = true;
    currentWordId = state.wordId;
    wordListTagFilter = state.tagFilter ? { ...state.tagFilter } : null;
    $('viewMode').style.display = 'none';
    $('editMode').style.display = 'none';
    $('managePanelMode').style.display = 'none';
    $('pastePanelMode').style.display = 'none';
    $('wordListMode').style.display = 'none';
    if (state.screen === 'edit') {
        const word = wordData.find(item => item.id === currentWordId);
        if (word) { isNewWord = false; $('formTitle').textContent = '単語の編集'; populateEditor(word); }
        $('editMode').style.display = 'block';
    } else if (state.screen === 'new') {
        isNewWord = true; $('formTitle').textContent = '新規単語追加';
        populateEditor({ word: '', category: '指定なし', categoryTags: ['指定なし'], eraTag: '', reading: '', kanji: '', english: '', pronunciation: '', column: '', memo: '', gemini_note: '', other_tags: [], meanings: [{}] });
        $('editMode').style.display = 'block';
    } else if (state.screen === 'manage') {
        $('managePanelMode').style.display = 'block'; renderTagManagementTables();
    } else if (state.screen === 'paste') {
        $('pastePanelMode').style.display = 'block'; $('jsonPasteInput').value = state.pasteText || '';
    } else if (state.screen === 'settings') {
        showSettingsPanel(false);
    } else if (state.screen === 'tools') {
        showToolsPanel(false);
    } else if (state.screen === 'format') {
        showFormatPanel(false);
    } else if (state.screen === 'wordList' || state.screen === 'tagWords') {
        $('wordListMode').style.display = 'block';
        $('wordListSearch').value = state.wordListSearch || '';
        $('wordListSort').value = state.wordListSort || 'id';
        $('wordListDirection').value = state.wordListDirection || 'asc';
        const filterBox = $('wordListTagFilter');
        if (wordListTagFilter) {
            filterBox.style.display = 'flex';
            filterBox.innerHTML = `タグ「<strong>${escapeHtml(wordListTagFilter.tag)}</strong>」が付いた単語 <button type="button" class="btn-sm" id="clearWordListTagFilter">タグ絞り込み解除</button>`;
            $('clearWordListTagFilter').onclick = () => { wordListTagFilter = null; filterBox.style.display = 'none'; renderWordList(); recordAppNavigation('wordList'); };
        } else { filterBox.style.display = 'none'; filterBox.textContent = ''; }
        renderWordList();
    } else {
        $('viewMode').style.display = 'block'; showViewMode(false);
    }
    renderSidebarTree();
    restoringNavigation = false;
    updateAppNavigationButtons();
}


const $ = (id) => document.getElementById(id);
const clone = (value) => JSON.parse(JSON.stringify(value));
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const asString = (value) => typeof value === 'string' ? value : (value == null ? '' : String(value));
const asStringArray = (value) => Array.isArray(value) ? value.map(asString).map(s => s.trim()).filter(Boolean) : (typeof value === 'string' && value.trim() ? [value.trim()] : []);
const normalizeText = (value) => asString(value).normalize('NFKC').toLocaleLowerCase('ja').replace(/[\s　]+/g, ' ').trim();
const unique = (values) => [...new Set(values.map(v => asString(v).trim()).filter(Boolean))];

function normalizeLegacyKeys(value) {
    if (Array.isArray(value)) return value.map(normalizeLegacyKeys);
    if (!value || typeof value !== 'object') return value;
    const out = {};
    for (const [key, item] of Object.entries(value)) {
        if (key.startsWith('//')) continue;
        const cleanKey = key.endsWith('$') ? key.slice(0, -1) : key;
        if (Object.prototype.hasOwnProperty.call(out, cleanKey) && JSON.stringify(out[cleanKey]) !== JSON.stringify(item)) {
            throw new Error(`必須項目マーカー除去後にキーが重複しました: ${cleanKey}`);
        }
        out[cleanKey] = normalizeLegacyKeys(item);
    }
    return out;
}

function isRfc3339DateTime(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
    return Number.isFinite(Date.parse(value));
}

function normalizeFieldTags(value) {
    // Older AI-generated records sometimes packed several domain tags into one
    // string with a middle dot (e.g. 'IT・美容・ライフスタイル'). Normalize
    // those into independent tags while keeping other tag fields untouched.
    const source = Array.isArray(value) ? value : (typeof value === 'string' ? [value] : []);
    return unique(source.flatMap(item => asString(item).split(/[・,，、\n]/)));
}

function normalizeCategoryTags(value, fallback = '') {
    const candidate = Array.isArray(value) ? value : (typeof value === 'string' && value.trim() ? value.split(/[,，、\n]/) : []);
    const normalized = unique(candidate.map(asString));
    return normalized.length ? normalized : (asString(fallback).trim() ? [asString(fallback).trim()] : []);
}

function normalizeMeaning(raw = {}) {
    return {
        definition: asString(raw.definition),
        background: asString(raw.background),
        nuance: asString(raw.nuance),
        fieldTag: normalizeFieldTags(raw.fieldTag),
        examples: asStringArray(raw.examples),
        synonyms: asStringArray(raw.synonyms)
    };
}

function normalizeDisplayName(item, rawWord) {
    const word = asString(rawWord).trim();
    const match = /^(.*?)\s*[（(]([^（）()]*)[）)]$/.exec(word);
    if (!match || !match[1].trim()) return word;
    const base = match[1].trim();
    const inner = match[2].trim();
    const reading = asString(item.reading).trim();
    const category = asString(item.category);
    const foreignOrSpecial = Boolean(asString(item.english).trim()) ||
        /外来語|外国語|略語|記号|原語|英語/.test(category);

    // Display names no longer append readings in parentheses. Keep reading in
    // the dedicated reading field, and preserve legacy foreign spellings in english.
    if (reading && normalizeText(inner) === normalizeText(reading)) return base;
    const kanji = asString(item.kanji).trim();
    if (kanji && inner === kanji && /^[ぁ-ゖァ-ヺー]+$/.test(base)) return kanji;
    if (foreignOrSpecial) {
        if (!asString(item.english).trim() && inner) item.english = inner;
        return base;
    }
    return word;
}

function normalizeWord(raw = {}, key = '') {
    const item = { ...raw };
    const word = normalizeDisplayName(item, asString(item.word || key).trim());
    if (!word) throw new Error('単語名（wordsオブジェクトのキー）が空です。');

    let meanings;
    if (Array.isArray(item.meanings)) {
        meanings = item.meanings.map(normalizeMeaning);
    } else if (item.meaning !== undefined || item.background !== undefined || item.nuance !== undefined || item.examples !== undefined || item.synonyms !== undefined) {
        meanings = [normalizeMeaning({
            definition: item.meaning, background: item.background, nuance: item.nuance,
            fieldTag: item.fieldTag, examples: item.examples, synonyms: item.synonyms
        })];
    } else {
        meanings = [];
    }
    if (!meanings.length) throw new Error(`「${word}」に meanings がありません。最低1つの意味を登録してください。`);

    const base = { ...item };
    ['word', 'word(any)', 'word_any', 'meaning', 'background', 'nuance', 'fieldTag', 'examples', 'synonyms'].forEach(keyName => delete base[keyName]);
    return {
        ...base,
        id: Number.isInteger(item.id) && item.id > 0 ? item.id : 0,
        datetime: isRfc3339DateTime(item.datetime) ? asString(item.datetime) : nowIso(),
        word,
        category: normalizeCategoryTags(item.categoryTags, item.category)[0] || '指定なし',
        categoryTags: normalizeCategoryTags(item.categoryTags, item.category),
        eraTag: asString(item.eraTag),
        reading: asString(item.reading),
        kanji: asString(item.kanji),
        english: asString(item.english),
        pronunciation: asString(item.pronunciation),
        column: asString(item.column),
        memo: asString(item.memo),
        gemini_note: asString(item.gemini_note),
        other_tags: asStringArray(item.other_tags),
        meanings
    };
}

function parseNangoDocument(documentValue) {
    const source = normalizeLegacyKeys(documentValue);
    let entries = [];
    let extra = [];
    if (Array.isArray(source)) {
        // Compatibility with old app exports (array of records).
        entries = source.map((item, i) => normalizeWord(item, item.word || `legacy-${i + 1}`));
    } else if (source && typeof source === 'object' && source.words && !Array.isArray(source.words) && typeof source.words === 'object') {
        entries = Object.entries(source.words).map(([key, value]) => {
            validateCanonicalWord(key, value);
            return normalizeWord(value, key);
        });
        if (source.additional_data !== undefined && (!Array.isArray(source.additional_data) || !source.additional_data.every(value => typeof value === 'string'))) {
            throw new Error('additional_data は文字列の配列である必要があります。');
        }
        extra = asStringArray(source.additional_data);
    } else if (source && typeof source === 'object' && Array.isArray(source.words)) {
        // A short-lived historical shape used a list under words.
        entries = source.words.map((item, i) => normalizeWord(item, item.word || `legacy-${i + 1}`));
        extra = asStringArray(source.additional_data);
    } else {
        throw new Error('Nango形式ではありません。トップレベルに words オブジェクトが必要です。');
    }

    const seen = new Set();
    for (const item of entries) {
        const key = normalizeText(item.word);
        if (seen.has(key)) throw new Error(`同じファイル内に同一の単語名があります: 「${item.word}」`);
        seen.add(key);
        validateWord(item);
    }
    return { words: entries, additional_data: extra };
}

function validateCanonicalWord(wordName, raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`「${wordName}」のデータはオブジェクトである必要があります。`);
    const stringFields = ['datetime', 'category', 'eraTag', 'reading', 'kanji', 'english', 'pronunciation', 'column', 'memo', 'gemini_note'];
    for (const field of stringFields) {
        if (raw[field] !== undefined && typeof raw[field] !== 'string') throw new Error(`「${wordName}」の ${field} は文字列である必要があります。`);
    }
    if (raw.id !== undefined && (!Number.isInteger(raw.id) || raw.id < 1)) throw new Error(`「${wordName}」の id は1以上の整数である必要があります。`);
    if (raw.datetime !== undefined && !isRfc3339DateTime(raw.datetime)) throw new Error(`「${wordName}」の datetime は RFC 3339形式である必要があります。`);
    if (raw.categoryTags !== undefined && (!Array.isArray(raw.categoryTags) || !raw.categoryTags.every(value => typeof value === 'string'))) throw new Error(`「${wordName}」の categoryTags は文字列配列である必要があります。`);
    if (raw.other_tags !== undefined && (!Array.isArray(raw.other_tags) || !raw.other_tags.every(value => typeof value === 'string'))) {
        throw new Error(`「${wordName}」の other_tags は文字列配列である必要があります。`);
    }
    if (!Array.isArray(raw.meanings) || raw.meanings.length === 0) throw new Error(`「${wordName}」には meanings が1つ以上必要です。`);
    raw.meanings.forEach((meaning, index) => {
        if (!meaning || typeof meaning !== 'object' || Array.isArray(meaning)) throw new Error(`「${wordName}」の meanings[${index}] はオブジェクトである必要があります。`);
        if (typeof meaning.definition !== 'string' || !meaning.definition.trim()) throw new Error(`「${wordName}」の意味 ${index + 1}: definition は必須の文字列です。`);
        for (const field of ['background', 'nuance']) {
            if (meaning[field] !== undefined && typeof meaning[field] !== 'string') throw new Error(`「${wordName}」の意味 ${index + 1}: ${field} は文字列である必要があります。`);
        }
        for (const field of ['fieldTag', 'examples', 'synonyms']) {
            if (meaning[field] !== undefined && (!Array.isArray(meaning[field]) || !meaning[field].every(value => typeof value === 'string'))) {
                throw new Error(`「${wordName}」の意味 ${index + 1}: ${field} は文字列配列である必要があります。`);
            }
        }
    });
}

function validateWord(word) {
    if (!Array.isArray(word.categoryTags || []) || !(word.categoryTags || []).every(value => typeof value === 'string')) throw new Error(`「${word.word}」の分類タグは文字列配列である必要があります。`);
    if (!word.word.trim()) throw new Error('単語名は必須です。');
    if (!Array.isArray(word.meanings) || word.meanings.length === 0) throw new Error(`「${word.word}」には意味が1つ以上必要です。`);
    for (let i = 0; i < word.meanings.length; i++) {
        const meaning = word.meanings[i];
        if (!meaning.definition.trim()) throw new Error(`「${word.word}」の意味 ${i + 1}: definition は必須です。`);
        for (const key of ['fieldTag', 'examples', 'synonyms']) {
            if (!Array.isArray(meaning[key]) || !meaning[key].every(value => typeof value === 'string')) {
                throw new Error(`「${word.word}」の意味 ${i + 1}: ${key} は文字列配列である必要があります。`);
            }
        }
    }
}

function serializeNangoDocument(items = wordData, extra = additionalData) {
    const words = {};
    const seenNames = new Set();
    const sorted = [...items].sort((a, b) => a.id - b.id);
    for (const source of sorted) {
        const item = normalizeWord(source, source.word);
        validateWord(item);
        const uniqueName = normalizeText(item.word);
        if (seenNames.has(uniqueName)) throw new Error(`辞書形式では同じ単語名を重複登録できません: 「${item.word}」`);
        seenNames.add(uniqueName);
        const payload = { ...item };
        delete payload.word;
        words[item.word] = payload;
    }
    return { words, additional_data: asStringArray(extra) };
}

function reassignIds(items, start = 1) {
    return items.map((item, index) => ({ ...item, id: start + index }));
}

async function initApp() {
    try {
        const serverData = await loadServerData();
        const browserSavedData = localStorage.getItem(STORAGE_KEY);
        const savedData = serverData ? JSON.stringify(serverData) : browserSavedData;
        if (savedData) {
            const parsed = parseNangoDocument(JSON.parse(savedData));
            wordData = reassignIds(parsed.words.slice().sort((a, b) => (a.id || 0) - (b.id || 0)));
            additionalData = parsed.additional_data;
            try { saveToLocalStorage(); } catch (saveError) { console.warn('保存データの形式変換を保存できませんでした:', saveError); }
        } else {
            wordData = reassignIds(clone(defaultData).map(word => ({ ...word, categoryTags: normalizeCategoryTags(word.categoryTags, word.category) })));
            additionalData = [];
            saveToLocalStorage();
        }
    } catch (error) {
        console.error('Nangoデータの読み込みに失敗しました:', error);
        wordData = reassignIds(clone(defaultData).map(word => ({ ...word, categoryTags: normalizeCategoryTags(word.categoryTags, word.category) })));
        additionalData = [];
        try { saveToLocalStorage(); } catch (saveError) { console.error('初期データを保存できません:', saveError); }
        alert(`保存データを読み込めなかったため、初期データで起動しました。
${error.message}
必要であれば、保存ファイルをバックアップしてください。`);
    }
    loadDisplaySettings();
    refreshOpenState();
    currentWordId = wordData.length ? wordData[0].id : -1;
    renderSidebarTree();
    if (wordData.length) showTodaysWord(); else showViewMode();
    if (serverStorageAvailable) showStorageStatus('ローカルファイル保存を使用中');
}

function saveToLocalStorage() {
    const serialized = JSON.stringify(serializeNangoDocument());
    // Browser storage remains a fallback; the Python launcher also writes this data to a local JSON file.
    localStorage.setItem(STORAGE_KEY, serialized);
    if ((location.protocol === 'http:' && location.hostname === '127.0.0.1') || location.hostname === 'localhost') {
        serverSaveQueue = serverSaveQueue.then(async () => {
            const response = await fetch(LOCAL_DATA_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: serialized
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            serverStorageAvailable = true;
            showStorageStatus('ローカルファイルに保存済み');
        }).catch(error => {
            serverStorageAvailable = false;
            showStorageStatus('ファイル保存に失敗（ブラウザー内には保存）', true);
            console.error('ローカルJSONファイルへの保存に失敗しました:', error);
        });
    }
}

function refreshOpenState() {
    openCategories = {};
    wordData.forEach(word => getGroupingValues(word).forEach(key => {
        if (!(key in openCategories)) openCategories[key] = false;
    }));
}
function getWordCategoryTags(word) { return normalizeCategoryTags(word.categoryTags, word.category); }
function getInitial(word) {
    let value = asString(word.reading || word.word).trim();
    if (!value) return '#';
    value = value[0].normalize('NFKC').toLocaleUpperCase('ja');
    const code = value.codePointAt(0) || 0;
    if (code >= 0x30A1 && code <= 0x30F6) value = String.fromCodePoint(code - 0x60);
    return value;
}
function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? asString(value).slice(0, 10) : new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
function getGroupingValues(word) {
    if (currentHierarchy === 'initial') return [getInitial(word)];
    if (currentHierarchy === 'fieldTag') {
        const tags = unique(word.meanings.flatMap(meaning => meaning.fieldTag || []));
        return tags.length ? tags : ['(未設定)'];
    }
    if (currentHierarchy === 'eraTag') return word.eraTag ? [word.eraTag] : ['(未設定)'];
    return ['すべて'];
}

function setSort(type) {
    currentSort = type;
    $('sort-id')?.classList.toggle('active', type === 'id');
    $('sort-alpha')?.classList.toggle('active', type === 'alpha');
    if ($('sortCurrentLabel')) $('sortCurrentLabel').textContent = type === 'alpha' ? '五十音順' : '登録順';
    $('sortPopup').style.display = 'none';
    $('sortTrigger')?.setAttribute('aria-expanded', 'false');
    renderSidebarTree();
}
function setHierarchyStructure(type) {
    if (!['fieldTag', 'eraTag', 'initial'].includes(type)) type = 'fieldTag';
    currentHierarchy = type;
    $('struct-field')?.classList.toggle('active', type === 'fieldTag');
    $('struct-era')?.classList.toggle('active', type === 'eraTag');
    $('struct-initial')?.classList.toggle('active', type === 'initial');
    const labels = { fieldTag: '分野', eraTag: '時代', initial: '頭文字' };
    if ($('hierarchyCurrentLabel')) $('hierarchyCurrentLabel').textContent = labels[type];
    $('hierarchyPopup').style.display = 'none';
    $('hierarchyTrigger')?.setAttribute('aria-expanded', 'false');
    setGroupDisplay(true);
    refreshOpenState();
    renderSidebarTree();
}
function toggleHierarchyPopup() {
    const box = $('hierarchyPopup');
    box.style.display = box.style.display === 'none' ? 'flex' : 'none';
    $('hierarchyTrigger')?.setAttribute('aria-expanded', String(box.style.display !== 'none'));
    $('sortPopup').style.display = 'none';
    $('categoryFilterPopover').style.display = 'none';
}
function toggleSortPopup() {
    const box = $('sortPopup');
    box.style.display = box.style.display === 'none' ? 'flex' : 'none';
    $('sortTrigger')?.setAttribute('aria-expanded', String(box.style.display !== 'none'));
    $('hierarchyPopup').style.display = 'none';
    $('categoryFilterPopover').style.display = 'none';
}
function toggleCategoryFilterPopup() {
    const box = $('categoryFilterPopover');
    const opening = box.style.display === 'none';
    if (opening) renderCategoryFilterPopup();
    box.style.display = opening ? 'block' : 'none';
    $('categoryFilterTrigger')?.setAttribute('aria-expanded', String(opening));
    $('hierarchyPopup').style.display = 'none';
    $('sortPopup').style.display = 'none';
}
function renderCategoryFilterPopup() {
    const box = $('categoryFilterPopover');
    const all = unique(wordData.flatMap(getWordCategoryTags)).sort((a, b) => a.localeCompare(b, 'ja'));
    box.innerHTML = '<div class="filter-note">サイドバーで表示する分類タグ（最大3個）。「全選択」は先頭から最大3個を選びます。</div><div class="filter-actions"><button type="button" class="btn-sm" id="selectSomeCategories">全選択</button><button type="button" class="btn-sm" id="clearSidebarCategories">全選択解除</button></div><div class="filter-options"></div>';
    const options = box.querySelector('.filter-options');
    all.forEach(category => {
        const label = document.createElement('label');
        label.className = 'filter-option';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = selectedCategoryFilters.includes(category);
        input.addEventListener('change', () => {
            if (input.checked) {
                if (selectedCategoryFilters.length >= 3) { input.checked = false; alert('分類フィルターは最大3個まで選択できます。'); return; }
                selectedCategoryFilters = unique([...selectedCategoryFilters, category]);
            } else selectedCategoryFilters = selectedCategoryFilters.filter(value => value !== category);
            renderCategoryFilterPopup(); updateCategoryFilterBadge(); renderSidebarTree();
        });
        label.append(input, document.createTextNode(category));
        options.appendChild(label);
    });
    $('selectSomeCategories').onclick = () => { selectedCategoryFilters = all.slice(0, 3); renderCategoryFilterPopup(); updateCategoryFilterBadge(); renderSidebarTree(); };
    $('clearSidebarCategories').onclick = () => { selectedCategoryFilters = []; renderCategoryFilterPopup(); updateCategoryFilterBadge(); renderSidebarTree(); };
}
function updateCategoryFilterBadge() {
    if ($('categoryFilterBadge')) $('categoryFilterBadge').textContent = String(selectedCategoryFilters.length);
}
function setGroupDisplay(enabled) {
    groupDisplayEnabled = Boolean(enabled);
    if ($('groupDisplayToggle')) $('groupDisplayToggle').checked = groupDisplayEnabled;
    const controls = document.querySelector('.sidebar-group-buttons');
    if (controls) controls.style.display = groupDisplayEnabled ? 'flex' : 'none';
    renderSidebarTree();
}
function toggleAllGroups(expand) {
    for (const word of wordData) getGroupingValues(word).forEach(key => { openCategories[key] = Boolean(expand); });
    renderSidebarTree();
}

function handleSearch() {
    searchQuery = $('searchInput').value.trim().toLocaleLowerCase('ja');
    renderSidebarTree();
}

function searchableText(word) {
    return [word.word, word.reading, word.kanji, word.english, word.category, ...(word.categoryTags || []), word.eraTag, word.column,
        word.memo, word.gemini_note, ...(word.other_tags || []), ...word.meanings.flatMap(m => [
            m.definition, m.background, m.nuance, ...m.fieldTag, ...m.examples, ...m.synonyms
        ])].join(' ').toLocaleLowerCase('ja');
}

function getProcessedWords() {
    let result = wordData.filter(word => (!searchQuery || searchableText(word).includes(searchQuery)) && (!selectedCategoryFilters.length || getWordCategoryTags(word).some(tag => selectedCategoryFilters.includes(tag))));
    result = [...result];
    if (currentSort === 'alpha') result.sort((a, b) => (a.reading || a.word).localeCompare(b.reading || b.word, 'ja'));
    else result.sort((a, b) => a.id - b.id);
    return result;
}

function renderSidebarTree() {
    const container = $('treeContainer');
    if (!container) return;
    container.replaceChildren();
    const processed = getProcessedWords();
    if (!processed.length) {
        container.innerHTML = '<div class="empty-message">該当する単語はありません</div>';
        if ($('exportBtn')) $('exportBtn').disabled = wordData.length === 0;
        return;
    }
    const appendWord = (parent, word) => {
        const entry = document.createElement('div');
        entry.className = 'tree-word-entry';
        const button = document.createElement('button');
        button.className = 'tree-word-item' + (word.id === currentWordId ? ' active' : '');
        button.textContent = word.word;
        button.title = word.word;
        button.onclick = () => { currentWordId = word.id; renderSidebarTree(); showViewMode(); };
        const date = document.createElement('span');
        date.className = 'tree-word-date';
        date.textContent = formatDate(word.datetime);
        entry.append(button, date);
        parent.appendChild(entry);
    };
    if (!groupDisplayEnabled) {
        processed.forEach(word => appendWord(container, word));
    } else {
        const groups = new Map();
        for (const word of processed) for (const key of getGroupingValues(word)) {
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(word);
        }
        for (const groupName of [...groups.keys()].sort((a, b) => a.localeCompare(b, 'ja'))) {
            const section = document.createElement('div');
            section.className = 'tree-category' + (openCategories[groupName] ? ' open' : '');
            const header = document.createElement('button');
            header.type = 'button';
            header.className = 'tree-category-header';
            header.setAttribute('aria-expanded', String(Boolean(openCategories[groupName])));
            header.innerHTML = '<span class="tree-category-title"><span class="tree-toggle-icon">▶</span> ' + escapeHtml(groupName) + ' (' + groups.get(groupName).length + ')</span>';
            header.onclick = () => { openCategories[groupName] = !openCategories[groupName]; renderSidebarTree(); };
            const list = document.createElement('div');
            list.className = 'tree-word-list';
            list.style.display = openCategories[groupName] ? 'block' : 'none';
            groups.get(groupName).forEach(word => appendWord(list, word));
            section.append(header, list);
            container.appendChild(section);
        }
    }
    $('exportBtn').disabled = wordData.length === 0;
    updateCategoryFilterBadge();
}

function showViewMode(recordHistory = true) {
    if (recordHistory) recordAppNavigation('view');
    ['editMode','managePanelMode','pastePanelMode','wordListMode','settingsPanelMode','toolsPanelMode','formatPanelMode'].forEach(id => { if ($(id)) $(id).style.display = 'none'; });
    $('viewMode').style.display = 'block';
    const current = wordData.find(item => item.id === currentWordId);
    $('editBtn').style.display = current ? 'inline-block' : 'none';
    $('deleteBtn').style.display = current ? 'inline-block' : 'none';
    renderCurrentWordDetails();
}
function escapeRegex(value) {
    return value.split('').map(ch => /[.*+?^{}()|[\]\\$]/.test(ch) ? '\\' + ch : ch).join('');
}
function linkifyRegisteredWords(html) {
    const terms = [...wordData].filter(word => word.word && word.word.length > 1).sort((a, b) => b.word.length - a.word.length);
    if (!terms.length) return html;
    const expressions = terms.map(word => escapeRegex(escapeHtml(word.word)));
    const pattern = new RegExp(expressions.join('|'), 'g');
    const byRenderedName = new Map(terms.map(word => [escapeHtml(word.word), word]));
    return html.replace(/(<code>[\s\S]*?<\/code>|<[^>]+>|[^<]+)/g, part => {
        if (part.startsWith('<')) return part;
        return part.replace(pattern, match => {
            const word = byRenderedName.get(match);
            return word ? '<button type="button" class="word-reference" data-word-id="' + word.id + '">' + match + '</button>' : match;
        });
    });
}

function markdownInline(value) {
    let textValue = escapeHtml(asString(value));
    textValue = textValue.replace(/\x60([^\x60]+)\x60/g, '<code>$1</code>');
    textValue = textValue.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>');
    textValue = textValue.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>').replace(/(^|_)_([^_]+)_(?!_)/g, '$1<em>$2</em>');
    return linkifyRegisteredWords(textValue);
}
function renderRichText(value) {
    const lines = asString(value).replace(/\r\n?/g, '\n').split('\n');
    const output = [];
    let listType = null;
    const closeList = () => { if (listType) { output.push(listType === 'ul' ? '</ul>' : '</ol>'); listType = null; } };
    for (const rawLine of lines) {
        if (!rawLine.trim()) { closeList(); continue; }
        const leading = (rawLine.match(/^[ \t]+/) || [''])[0].replace(/\t/g, '    ').length;
        const line = rawLine.trim();
        const heading = /^(#{1,4})\s+(.+)$/.exec(line);
        if (heading) { closeList(); const level = Math.min(5, heading[1].length + 1); output.push('<h' + level + '>' + markdownInline(heading[2]) + '</h' + level + '>'); continue; }
        const bullet = /^[-*+]\s+(.+)$/.exec(line);
        const numbered = /^\d+[.)]\s+(.+)$/.exec(line);
        if (bullet || numbered) {
            const nextType = bullet ? 'ul' : 'ol';
            if (listType && listType !== nextType) closeList();
            if (!listType) { output.push(nextType === 'ul' ? '<ul>' : '<ol>'); listType = nextType; }
            output.push('<li>' + markdownInline((bullet || numbered)[1]) + '</li>');
            continue;
        }
        closeList();
        if (line.startsWith('>')) { output.push('<blockquote>' + markdownInline(line.replace(/^>\s?/, '')) + '</blockquote>'); continue; }
        const rendered = markdownInline(line);
        output.push(leading ? '<div class="markdown-indent" style="--indent-level:' + Math.min(8, Math.floor(leading / 2)) + '">' + rendered + '</div>' : '<p>' + rendered + '</p>');
    }
    closeList();
    return '<div class="rich-text">' + output.join('') + '</div>';
}
function renderCurrentWordDetails() {
    const target = $('viewTarget');
    if (!target) return;
    const current = wordData.find(item => item.id === currentWordId);
    const selector = $('wordDisplayMode');
    if (selector && selector.dataset.ready !== 'true') {
        selector.value = displaySettings.defaultDisplayMode || 'word';
        selector.dataset.ready = 'true';
    }
    if (!current) { target.innerHTML = '<div class="empty-message">表示する単語がありません。JSONをインポートするか、新規単語を追加してください。</div>'; return; }
    const mode = selector ? selector.value : (displaySettings.defaultDisplayMode || 'word');
    const titleValue = ({ word: current.word, reading: current.reading, kanji: current.kanji, pronunciation: current.pronunciation })[mode] || current.word;
    const categoryTags = getWordCategoryTags(current);
    const badges = categoryTags.map(tag => '<button type="button" class="custom-tag tag-link" data-tag-type="categoryTags" data-tag-value="' + escapeHtml(tag) + '">' + escapeHtml(tag) + '</button>').join('') +
        (current.eraTag ? '<button type="button" class="custom-tag tag-era tag-link" data-tag-type="eraTag" data-tag-value="' + escapeHtml(current.eraTag) + '">時代: ' + escapeHtml(current.eraTag) + '</button>' : '');
    const hashtags = (current.other_tags || []).map(tag => '<span class="hashtag">#' + escapeHtml(tag) + '</span>').join('');
    const meaningsHtml = current.meanings.map((meaning, index) => {
        const fieldTags = unique(meaning.fieldTag || []);
        return '<section class="meaning-card"><h3 class="meaning-number">意味 ' + (index + 1) + '</h3>' +
            '<div class="section-title">意味・定義</div><div class="meaning-box">' + renderRichText(meaning.definition) + '</div>' +
            (meaning.background ? '<div class="section-title">背景 / 由来</div>' + renderRichText(meaning.background) : '') +
            (meaning.nuance ? '<div class="section-title">ニュアンス</div>' + renderRichText(meaning.nuance) : '') +
            (meaning.examples.length ? '<div class="section-title">例文</div><ul class="example-list">' + meaning.examples.map(example => '<li>' + renderRichText(example) + '</li>').join('') + '</ul>' : '') +
            (meaning.synonyms.length ? '<div class="section-title">類義語</div><div class="synonym-container">' + meaning.synonyms.map(term => '<span class="synonym-tag">' + escapeHtml(term) + '</span>').join('') + '</div>' : '') +
            (fieldTags.length ? '<div class="section-title">分野タグ（この意味）</div><div class="tag-container">' + fieldTags.map(tag => '<button type="button" class="custom-tag tag-field tag-link" data-tag-type="fieldTag" data-tag-value="' + escapeHtml(tag) + '">' + escapeHtml(tag) + '</button>').join('') + '</div>' : '') +
            '</section>';
    }).join('');
    const metadata = [
        current.reading ? '読み: ' + current.reading : '',
        current.kanji ? '漢字: ' + current.kanji : '',
        current.english ? '原語・スペル: ' + current.english : '',
        current.pronunciation ? '発音記号: ' + current.pronunciation : '',
        '登録日: ' + formatDate(current.datetime), 'ID: ' + current.id
    ].filter(Boolean).join(' | ');
    target.innerHTML = '<div class="word-header-container"><div class="word-title-row"><h2 class="word-title">' + escapeHtml(titleValue || '（未登録）') + '</h2><span class="category-badge">' + escapeHtml(current.category || '指定なし') + '</span></div>' +
        (badges ? '<div class="tag-container">' + badges + '</div>' : '') + (hashtags ? '<div class="hashtag-list" aria-label="ハッシュタグ">' + hashtags + '</div>' : '') +
        (metadata ? '<div class="word-sub-info">' + escapeHtml(metadata) + '</div>' : '') + '</div>' + meaningsHtml +
        (current.column ? '<section class="section-block section-block-column"><div class="section-title">コラム</div>' + renderRichText(current.column) + '</section>' : '') +
        (current.memo ? '<section class="section-block section-block-memo"><div class="section-title">メモ</div>' + renderRichText(current.memo) + '</section>' : '') +
        (current.gemini_note && displaySettings.showGeminiNote ? '<section class="section-block section-block-ai"><div class="section-title">AIからの一言</div>' + renderRichText(current.gemini_note) + '</section>' : '') +
        '<div class="word-sub-info">登録日時: ' + escapeHtml(current.datetime) + '</div>';
    target.querySelectorAll('[data-tag-type][data-tag-value]').forEach(button => button.addEventListener('click', () => showWordsForTag(button.dataset.tagType, button.dataset.tagValue)));
    target.querySelectorAll('[data-word-id]').forEach(button => button.addEventListener('click', () => { currentWordId = Number(button.dataset.wordId); renderSidebarTree(); showViewMode(); }));
}

function renderMeaningEditor(meaning = {}, index = 0) {
    const normalized = normalizeMeaning(meaning);
    const section = document.createElement('section');
    section.className = 'meaning-editor-card';
    section.dataset.meaningIndex = String(index);
    section.innerHTML = `
        <div class="meaning-editor-header"><h3>意味 ${index + 1}</h3><div class="meaning-actions">
          <button type="button" class="btn-sm" data-action="copy">コピー</button>
          <button type="button" class="btn-sm" data-action="duplicate">複製</button>
          <button type="button" class="btn-sm" data-action="up">↑</button>
          <button type="button" class="btn-sm" data-action="down">↓</button>
          <button type="button" class="btn-sm btn-danger-sm" data-action="delete">削除</button>
        </div></div>
        <div class="form-group"><label>意味・定義 *必須</label><textarea class="form-control meaning-definition" required>${escapeHtml(normalized.definition)}</textarea></div>
        <div class="form-group"><label>背景 / 由来</label><textarea class="form-control meaning-background">${escapeHtml(normalized.background)}</textarea></div>
        <div class="form-group"><label>ニュアンス</label><textarea class="form-control meaning-nuance">${escapeHtml(normalized.nuance)}</textarea></div>
        <div class="form-group"><label>分野タグ（この意味に最大2個。カンマ・中点「・」・改行で区切り）</label><input class="form-control meaning-fieldTag" value="${escapeHtml(normalized.fieldTag.join(', '))}"></div>
        <div class="form-group"><label>例文（1行に1文）</label><textarea class="form-control meaning-examples">${escapeHtml(normalized.examples.join('\n'))}</textarea></div>
        <div class="form-group"><label>類義語（カンマ、読点、改行区切り）</label><textarea class="form-control meaning-synonyms">${escapeHtml(normalized.synonyms.join('\n'))}</textarea></div>`;
    section.querySelectorAll('[data-action]').forEach(button => {
        button.onclick = () => handleMeaningAction(section, button.dataset.action);
    });
    return section;
}

function splitList(value) { return unique(asString(value).split(/[,，、\n]/)); }
function splitTagList(value) { return normalizeFieldTags(value); }
function readMeaningEditors() {
    return [...$('meaningsEditor').querySelectorAll('.meaning-editor-card')].map(card => ({
        definition: card.querySelector('.meaning-definition').value.trim(),
        background: card.querySelector('.meaning-background').value.trim(),
        nuance: card.querySelector('.meaning-nuance').value.trim(),
        fieldTag: splitTagList(card.querySelector('.meaning-fieldTag').value),
        examples: asStringArray(card.querySelector('.meaning-examples').value.split('\n')),
        synonyms: splitList(card.querySelector('.meaning-synonyms').value)
    }));
}
function refreshMeaningEditorTitles() {
    [...$('meaningsEditor').querySelectorAll('.meaning-editor-card')].forEach((card, index) => {
        card.dataset.meaningIndex = String(index);
        card.querySelector('h3').textContent = `意味 ${index + 1}`;
    });
}
function addMeaningEditor(data = {}) {
    $('meaningsEditor').appendChild(renderMeaningEditor(data, $('meaningsEditor').children.length));
    refreshMeaningEditorTitles();
}
function pasteMeaningEditor() {
    if (!meaningClipboard) { alert('コピーした意味がありません。各意味の「コピー」を押してください。'); return; }
    addMeaningEditor(clone(meaningClipboard));
}
function handleMeaningAction(card, action) {
    const cards = [...$('meaningsEditor').querySelectorAll('.meaning-editor-card')];
    const index = cards.indexOf(card);
    if (action === 'copy') {
        meaningClipboard = clone(readMeaningEditors()[index]);
        $('pasteMeaningBtn').disabled = false;
        alert('意味をコピーしました。「意味を貼り付け」から追加できます。');
    }
    if (action === 'duplicate') $('meaningsEditor').insertBefore(renderMeaningEditor(readMeaningEditors()[index], index + 1), card.nextSibling);
    if (action === 'delete') {
        if (cards.length === 1) { alert('意味は最低1つ必要です。'); return; }
        card.remove();
    }
    if (action === 'up' && index > 0) $('meaningsEditor').insertBefore(card, cards[index - 1]);
    if (action === 'down' && index < cards.length - 1) $('meaningsEditor').insertBefore(cards[index + 1], card);
    refreshMeaningEditorTitles();
}

function populateEditor(word) {
    $('editWord').value = word.word || '';
    $('editCategory').value = getWordCategoryTags(word).join(', ') || '指定なし';
    $('editEraTag').value = word.eraTag || '';
    $('editReading').value = word.reading || '';
    $('editKanji').value = word.kanji || '';
    $('editEnglish').value = word.english || '';
    $('editPronunciation').value = word.pronunciation || '';
    $('editColumn').value = word.column || '';
    $('editMemo').value = word.memo || '';
    $('editGeminiNote').value = word.gemini_note || '';
    $('editOtherTags').value = (word.other_tags || []).join(', ');
    $('meaningsEditor').replaceChildren();
    (word.meanings && word.meanings.length ? word.meanings : [{}]).forEach(addMeaningEditor);
}
function showEditForm() {
    recordAppNavigation('edit');
    const word = wordData.find(item => item.id === currentWordId);
    if (!word) return;
    isNewWord = false;
    $('formTitle').textContent = '単語の編集';
    $('viewMode').style.display = 'none'; $('managePanelMode').style.display = 'none'; $('pastePanelMode').style.display = 'none'; $('wordListMode').style.display = 'none'; $('settingsPanelMode').style.display = 'none'; $('toolsPanelMode').style.display = 'none'; $('formatPanelMode').style.display = 'none'; $('editMode').style.display = 'block';
    populateEditor(word);
}
function showNewForm() {
    recordAppNavigation('new');
    isNewWord = true;
    $('formTitle').textContent = '新規単語追加';
    $('viewMode').style.display = 'none'; $('managePanelMode').style.display = 'none'; $('pastePanelMode').style.display = 'none'; $('wordListMode').style.display = 'none'; $('settingsPanelMode').style.display = 'none'; $('toolsPanelMode').style.display = 'none'; $('formatPanelMode').style.display = 'none'; $('editMode').style.display = 'block';
    populateEditor({ word: '', category: '指定なし', categoryTags: ['指定なし'], eraTag: '', reading: '', kanji: '', english: '', pronunciation: '', column: '', memo: '', gemini_note: '', other_tags: [], meanings: [{}] });
}
function cancelEdit() { showViewMode(); }

function collectEditorWord() {
    const wordName = $('editWord').value.trim();
    if (!wordName) throw new Error('単語（表記）は必須入力です。');
    const meanings = readMeaningEditors();
    if (!meanings.length || meanings.some(meaning => !meaning.definition)) throw new Error('各意味の「意味・定義」は必須入力です。');
    const categoryTags = normalizeCategoryTags($('editCategory').value, '指定なし');
    if (categoryTags.length > 3) throw new Error('分類タグは単語ごとに最大3個までです。');
    if (meanings.some(meaning => meaning.fieldTag.length > 2)) throw new Error('分野タグは意味ごとに最大2個までです。');
    const collected = {
        word: wordName, id: 0, datetime: nowIso(), category: categoryTags[0] || '指定なし', categoryTags,
        eraTag: $('editEraTag').value.trim(), reading: $('editReading').value.trim(),
        kanji: $('editKanji').value.trim(), english: $('editEnglish').value.trim(), pronunciation: $('editPronunciation').value.trim(),
        column: $('editColumn').value.trim(), memo: $('editMemo').value.trim(),
        gemini_note: $('editGeminiNote').value.trim(), other_tags: splitList($('editOtherTags').value), meanings
    };
    collected.word = normalizeDisplayName(collected, wordName);
    return collected;
}
function saveWord() {
    try {
        const collected = collectEditorWord();
        if (isNewWord) {
            const duplicateIndex = findDuplicateIndex(collected, wordData);
            if (duplicateIndex >= 0) {
                const existing = wordData[duplicateIndex];
                if (!confirm(`「${collected.word}」は「${existing.word}」と同じ単語として扱われます。既存の単語にマージしますか？\n\nOK: 既存データに追加・マージ\nキャンセル: 登録を中止`)) return;
                wordData[duplicateIndex] = mergeWord(existing, collected);
                currentWordId = existing.id;
            } else {
                collected.id = nextId(wordData);
                wordData.push(collected);
                currentWordId = collected.id;
            }
        } else {
            const index = wordData.findIndex(item => item.id === currentWordId);
            if (index < 0) throw new Error('編集対象の単語が見つかりません。');
            const duplicateIndex = findDuplicateIndex(collected, wordData.filter(item => item.id !== currentWordId));
            if (duplicateIndex >= 0) throw new Error('同じ単語名または原語表記の単語が既にあります。単語名を変更するか、JSONインポートのマージ機能を使用してください。');
            collected.id = wordData[index].id;
            collected.datetime = wordData[index].datetime;
            wordData[index] = collected;
        }
        saveToLocalStorage(); refreshOpenState(); renderSidebarTree(); showViewMode();
    } catch (error) { alert(error.message); }
}
function nextId(items) { return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1; }

function deleteCurrentWord() {
    const current = wordData.find(item => item.id === currentWordId);
    if (!current || !confirm(`「${current.word}」を削除してもよろしいですか？`)) return;
    wordData = wordData.filter(item => item.id !== currentWordId);
    currentWordId = wordData.length ? wordData[0].id : -1;
    saveToLocalStorage(); refreshOpenState(); renderSidebarTree(); showViewMode();
}

function baseWordIdentity(value) {
    return normalizeText(value)
        .replace(/[（(][^（）()]*[）)]/g, '')
        .replace(/[「」『』【】\[\]{}]/g, '')
        .trim();
}
function wordIdentities(word) {
    const identities = new Set([baseWordIdentity(word.word), normalizeText(word.word)]);
    // Parenthesized Latin spelling is considered an alias of the displayed name.
    const spellings = asString(word.word).match(/[（(]([^（）()]*)[）)]/g) || [];
    spellings.forEach(text => identities.add(normalizeText(text.replace(/[（）()]/g, ''))));
    identities.delete('');
    return identities;
}
function findDuplicateIndex(incoming, existing) {
    const incomingIds = wordIdentities(incoming);
    return existing.findIndex(word => [...wordIdentities(word)].some(identity => incomingIds.has(identity)));
}
function mergeList(target, incoming) { return unique([...asStringArray(target), ...asStringArray(incoming)]); }
function mergeLimitedTags(existing, incoming, limit, label) {
    const current = mergeList(existing, []);
    const added = mergeList([], incoming);
    const combined = mergeList(current, added);
    if (combined.length <= limit) return combined;
    const preferIncoming = confirm(label + ' のマージ候補が上限 ' + limit + ' 個を超えています。\\n\\n候補: ' + combined.join('、') + '\\n\\nOK: 取込データのタグを優先\\nキャンセル: 現在のタグを優先');
    return (preferIncoming ? mergeList(added, current) : mergeList(current, added)).slice(0, limit);
}
function mergeWord(existing, incoming) {
    const merged = { ...existing };
    const conflicts = [];
    for (const field of ['eraTag', 'reading', 'kanji', 'english', 'pronunciation', 'column', 'memo', 'gemini_note']) {
        const oldValue = asString(existing[field]);
        const newValue = asString(incoming[field]);
        if (!newValue || newValue === oldValue) continue;
        if (!oldValue) merged[field] = newValue;
        else conflicts.push({ field, oldValue, newValue });
    }
    // Classification tags are independent of meaning-level domain tags.
    const mergedCategories = mergeLimitedTags(getWordCategoryTags(existing), getWordCategoryTags(incoming), 3, '分類タグ');
    merged.categoryTags = mergedCategories;
    merged.category = mergedCategories[0] || '指定なし';
    // Word name variants are useful: preserve the existing display title and add incoming spelling to other_tags.
    if (normalizeText(existing.word) !== normalizeText(incoming.word)) merged.other_tags = mergeList(merged.other_tags, [incoming.word]);
    merged.other_tags = mergeList(merged.other_tags, incoming.other_tags);
    const meanings = [...existing.meanings.map(clone)];
    for (const incomingMeaning of incoming.meanings) {
        const exact = meanings.find(meaning => normalizeText(meaning.definition) === normalizeText(incomingMeaning.definition));
        if (exact) {
            for (const field of ['background', 'nuance']) {
                if (!exact[field]) exact[field] = incomingMeaning[field];
                else if (incomingMeaning[field] && normalizeText(exact[field]) !== normalizeText(incomingMeaning[field])) conflicts.push({ field: `意味「${exact.definition}」の${field}`, oldValue: exact[field], newValue: incomingMeaning[field], meaning: exact });
            }
            exact.fieldTag = mergeLimitedTags(exact.fieldTag, incomingMeaning.fieldTag, 2, '意味「' + exact.definition + '」の分野タグ');
            exact.examples = mergeList(exact.examples, incomingMeaning.examples);
            exact.synonyms = mergeList(exact.synonyms, incomingMeaning.synonyms);
        } else meanings.push(clone(incomingMeaning));
    }
    merged.meanings = meanings;
    if (conflicts.length) {
        const details = conflicts.map((item, i) => `${i + 1}. ${item.field}\n現在: ${item.oldValue}\n取込: ${item.newValue}`).join('\n\n');
        const useImported = confirm(`「${existing.word}」のマージで競合があります。\n\n${details}\n\nOK: 競合する値は取り込みデータを採用\nキャンセル: 現在の値を維持`);
        if (useImported) conflicts.forEach(item => {
            if (item.meaning) item.meaning[item.field.split('の').pop()] = item.newValue;
            else merged[item.field] = item.newValue;
        });
    }
    return merged;
}

async function readJsonFiles(files) {
    return Promise.all([...files].map(async file => {
        let parsed;
        try { parsed = JSON.parse(await file.text()); }
        catch (error) { throw new Error(`ファイル「${file.name}」のJSON解析に失敗しました: ${error.message}`); }
        try { return { name: file.name, ...parseNangoDocument(parsed) }; }
        catch (error) { throw new Error(`ファイル「${file.name}」: ${error.message}`); }
    }));
}
function triggerImport() { $('fileInput').click(); }
async function importJSON(event) {
    const files = event.target.files;
    if (!files || !files.length) return;
    try {
        const documents = await readJsonFiles(files);
        const incoming = documents.flatMap(doc => doc.words);
        const added = await applyImportedWords(incoming, documents.flatMap(doc => doc.additional_data));
        alert(`インポートが完了しました。\nファイル数: ${documents.length}\n追加: ${added.added}件\nマージ: ${added.merged}件\nスキップ: ${added.skipped}件`);
    } catch (error) { alert(`インポートを中止しました。現在のデータは変更していません。\n${error.message}`); }
    finally { event.target.value = ''; }
}
async function applyImportedWords(incoming, extra = []) {
    // Validate all inputs before mutating current state (transaction-like behavior).
    incoming.forEach(validateWord);
    const strategy = confirm('取り込み方法を選択してください。\n\nOK: 現在の辞書に追加・重複マージ\nキャンセル: 取り込み内容で辞書を置き換え');
    if (!strategy) {
        const replacement = incoming.map(clone);
        const deduped = [];
        let skipped = 0;
        for (const word of replacement) {
            const existingIndex = findDuplicateIndex(word, deduped);
            if (existingIndex < 0) deduped.push(word);
            else { deduped[existingIndex] = mergeWord(deduped[existingIndex], word); skipped++; }
        }
        wordData = reassignIds(deduped);
        additionalData = mergeList(extra, []);
        const first = wordData[0]; currentWordId = first ? first.id : -1;
        saveToLocalStorage(); refreshOpenState(); renderSidebarTree(); showViewMode();
        return { added: wordData.length, merged: 0, skipped };
    }
    const candidate = wordData.map(clone);
    let added = 0, mergedCount = 0, skipped = 0;
    for (const word of incoming) {
        const index = findDuplicateIndex(word, candidate);
        if (index < 0) { candidate.push({ ...clone(word), id: nextId(candidate) }); added++; }
        else { candidate[index] = mergeWord(candidate[index], word); mergedCount++; }
    }
    wordData = candidate;
    additionalData = mergeList(additionalData, extra);
    if (!wordData.some(item => item.id === currentWordId)) currentWordId = wordData[0]?.id ?? -1;
    saveToLocalStorage(); refreshOpenState(); renderSidebarTree(); showViewMode();
    return { added, merged: mergedCount, skipped };
}

function exportJSON() {
    if (!wordData.length) { alert('エクスポートする単語がありません。'); return; }
    let blob;
    try { blob = new Blob([JSON.stringify(serializeNangoDocument(), null, 2)], { type: 'application/json;charset=utf-8' }); }
    catch (error) { alert(`エクスポートできません: ${error.message}`); return; }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'Nango-neo_DTformats.neo.v5.14.json';
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}
function resetToDefault() {
    if (!confirm('辞書を初期データに戻しますか？\n追加・編集したデータは失われます。先にエクスポートしてください。')) return;
    wordData = reassignIds(clone(defaultData)); additionalData = []; currentWordId = wordData[0]?.id ?? -1;
    currentSort = 'id'; currentHierarchy = 'fieldTag'; searchQuery = ''; selectedCategoryFilters = []; $('searchInput').value = '';
    $('sort-id').classList.add('active'); $('sort-alpha').classList.remove('active');
    $('struct-field')?.classList.add('active'); $('struct-era')?.classList.remove('active'); $('struct-initial')?.classList.remove('active');
    saveToLocalStorage(); refreshOpenState(); renderSidebarTree(); if (wordData.length) showTodaysWord(); else showViewMode();
}

function showManagePanel() {
    recordAppNavigation('manage');
    $('viewMode').style.display = 'none'; $('editMode').style.display = 'none'; $('pastePanelMode').style.display = 'none'; $('wordListMode').style.display = 'none'; $('managePanelMode').style.display = 'block';
    renderTagManagementTables();
}
function closeManagePanel() { showViewMode(); }
function renderTagManagementTables() {
    const categoryMap = new Map(), fieldMap = new Map(), eraMap = new Map();
    for (const word of wordData) {
        for (const tag of getWordCategoryTags(word)) categoryMap.set(tag, (categoryMap.get(tag) || 0) + 1);
        for (const tag of unique(word.meanings.flatMap(meaning => meaning.fieldTag || []))) fieldMap.set(tag, (fieldMap.get(tag) || 0) + 1);
        if (word.eraTag) eraMap.set(word.eraTag, (eraMap.get(word.eraTag) || 0) + 1);
    }
    renderTagOverview(categoryMap, fieldMap, eraMap);
    renderTagTable('categoryTagsTableContainer', categoryMap, 'categoryTags');
    renderTagTable('fieldTagsTableContainer', fieldMap, 'fieldTag');
    renderTagTable('eraTagsTableContainer', eraMap, 'eraTag');
}
function renderTagOverview(categoryMap, fieldMap, eraMap) {
    const box = $('tagOverview');
    if (!box) return;
    box.replaceChildren();
    const groups = [
        ['分類', 'categoryTags', categoryMap],
        ['分野', 'fieldTag', fieldMap],
        ['時代', 'eraTag', eraMap]
    ];
    for (const [label, type, map] of groups) {
        const heading = document.createElement('div');
        heading.className = 'tag-overview-group';
        heading.textContent = label;
        box.appendChild(heading);
        for (const tag of [...map.keys()].sort((a, b) => a.localeCompare(b, 'ja'))) {
            const link = document.createElement('button');
            link.type = 'button'; link.className = 'tag-overview-link'; link.textContent = tag;
            link.title = 'このタグが付いた単語を表示';
            link.addEventListener('click', () => showWordsForTag(type, tag));
            box.appendChild(link);
        }
        if (!map.size) {
            const empty = document.createElement('span'); empty.className = 'form-help'; empty.textContent = 'なし'; box.appendChild(empty);
        }
    }
}
function renderTagTable(containerId, tagMap, type) {
    const container = $(containerId);
    if (!container) return;
    const sort = tagTableSortState[type] || { key: 'tag', direction: 'asc' };
    const direction = sort.direction === 'desc' ? -1 : 1;
    const entries = [...tagMap.entries()].sort(([tagA, countA], [tagB, countB]) => {
        const primary = sort.key === 'count' ? countA - countB : tagA.localeCompare(tagB, 'ja');
        return primary * direction || tagA.localeCompare(tagB, 'ja');
    });
    container.replaceChildren();
    const table = document.createElement('table'); table.className = 'tag-table';
    table.innerHTML = '<thead><tr><th><button type="button" class="table-sort-button" data-sort="tag">タグ名</button></th><th><button type="button" class="table-sort-button" data-sort="count">該当単語数</button></th><th>操作</th></tr></thead>';
    table.querySelectorAll('[data-sort]').forEach(button => {
        const key = button.dataset.sort;
        button.textContent = (key === 'tag' ? 'タグ名' : '該当単語数') + (sort.key === key ? (sort.direction === 'asc' ? ' ▲' : ' ▼') : ' ↕');
        button.addEventListener('click', () => {
            const old = tagTableSortState[type] || { key: 'tag', direction: 'asc' };
            tagTableSortState[type] = { key, direction: old.key === key && old.direction === 'asc' ? 'desc' : 'asc' };
            renderTagTable(containerId, tagMap, type);
        });
    });
    const tbody = document.createElement('tbody');
    if (!entries.length) {
        tbody.innerHTML = '<tr><td colspan="3">登録されているタグはありません</td></tr>';
    } else entries.forEach(([tag, count]) => {
        const row = document.createElement('tr');
        row.innerHTML = '<td><button type="button" class="tag-table-link">' + escapeHtml(tag) + '</button></td><td>' + count + ' 件</td><td><button class="btn-sm" type="button">名称一括変更</button></td>';
        row.querySelector('.tag-table-link').onclick = () => showWordsForTag(type, tag);
        row.querySelector('.btn-sm').onclick = () => renameTag(type, tag);
        tbody.appendChild(row);
    });
    table.appendChild(tbody); container.appendChild(table);
}
function renameTag(type, oldTag) {
    const label = type === 'categoryTags' ? '分類タグ' : type === 'fieldTag' ? '分野タグ' : '時代タグ';
    const newName = prompt('現在の' + label + ': 「' + oldTag + '」\n新しい名前（空欄なら削除）', oldTag);
    if (newName === null) return;
    const value = newName.trim();
    for (const word of wordData) {
        if (type === 'categoryTags') {
            word.categoryTags = unique(getWordCategoryTags(word).map(tag => tag === oldTag ? value : tag).filter(Boolean));
            word.category = word.categoryTags[0] || '指定なし';
        } else if (type === 'fieldTag') {
            word.meanings.forEach(meaning => { meaning.fieldTag = unique((meaning.fieldTag || []).map(tag => tag === oldTag ? value : tag).filter(Boolean)); });
        } else if (type === 'eraTag' && word.eraTag === oldTag) word.eraTag = value;
    }
    saveToLocalStorage(); refreshOpenState(); renderSidebarTree(); renderTagManagementTables();
}

function togglePastePanel() {
    const isVisible = $('pastePanelMode').style.display === 'block';
    if (isVisible) { showViewMode(); return; }
    recordAppNavigation('paste');
    $('viewMode').style.display = 'none'; $('editMode').style.display = 'none'; $('managePanelMode').style.display = 'none'; $('wordListMode').style.display = 'none'; $('pastePanelMode').style.display = 'block';
    $('jsonPasteInput').focus();
}
async function importPastedJSON() {
    try {
        const raw = $('jsonPasteInput').value.trim();
        if (!raw) throw new Error('JSONを貼り付けてください。');
        const parsed = parseNangoDocument(JSON.parse(raw));
        const result = await applyImportedWords(parsed.words, parsed.additional_data);
        $('jsonPasteInput').value = '';
        alert(`貼り付けデータを取り込みました。追加: ${result.added}件、マージ: ${result.merged}件`);
    } catch (error) { alert(`貼り付けデータを取り込めませんでした。\n${error.message}`); }
}
function showWordList() {
    wordListTagFilter = null;
    wordListSelectedCategories = [];
    $('wordListSearch').value = '';
    $('wordListTagFilter').textContent = '';
    $('wordListTagFilter').style.display = 'none';
    wordListFiltersOpen = false;
    $('wordListCategoryFilters').style.display = 'none';
    $('wordListFiltersToggle')?.setAttribute('aria-expanded', 'false');
    $('wordListGroupJumpMenu').hidden = true;
    wordListColumnSort = { key: null, direction: 'asc' };
    recordAppNavigation('wordList');
    ['viewMode','editMode','managePanelMode','pastePanelMode','settingsPanelMode','toolsPanelMode','formatPanelMode'].forEach(id => { if ($(id)) $(id).style.display = 'none'; });
    $('wordListMode').style.display = 'block';
    renderWordList();
}
function showWordsForTag(type, tag) {
    wordListTagFilter = { type, tag };
    wordListSelectedCategories = [];
    $('wordListSearch').value = '';
    recordAppNavigation('tagWords');
    ['viewMode','editMode','managePanelMode','pastePanelMode','settingsPanelMode','toolsPanelMode','formatPanelMode'].forEach(id => { if ($(id)) $(id).style.display = 'none'; });
    $('wordListMode').style.display = 'block';
    $('wordListTagFilter').style.display = 'flex';
    $('wordListTagFilter').innerHTML = 'タグ「<strong>' + escapeHtml(tag) + '</strong>」が付いた単語 <button type="button" class="btn-sm" id="clearWordListTagFilter">タグ絞り込み解除</button>';
    $('clearWordListTagFilter').onclick = () => { wordListTagFilter = null; $('wordListTagFilter').style.display = 'none'; renderWordList(); };
    renderWordList();
}
function wordHasTag(word, filter) {
    if (!filter) return true;
    if (filter.type === 'categoryTags' || filter.type === 'category') return getWordCategoryTags(word).includes(filter.tag);
    if (filter.type === 'fieldTag') return word.meanings.some(meaning => (meaning.fieldTag || []).includes(filter.tag));
    if (filter.type === 'eraTag') return word.eraTag === filter.tag;
    return true;
}
function setWordListSort() { wordListColumnSort = { key: null, direction: 'asc' }; renderWordList(); }
function toggleWordListFilters() {
    wordListFiltersOpen = !wordListFiltersOpen;
    $('wordListCategoryFilters').style.display = wordListFiltersOpen ? 'block' : 'none';
    $('wordListFiltersToggle')?.setAttribute('aria-expanded', String(wordListFiltersOpen));
}
function renderWordListCategoryFilters() {
    const box = $('wordListCategoryFilters');
    if (!box) return;
    const all = unique(wordData.flatMap(getWordCategoryTags)).sort((a, b) => a.localeCompare(b, 'ja'));
    box.replaceChildren();
    if ($('wordListFilterBadge')) $('wordListFilterBadge').textContent = String(wordListSelectedCategories.length);
    const heading = document.createElement('div'); heading.className = 'filter-actions';
    heading.innerHTML = '<strong>分類タグで絞り込み</strong> <button type="button" class="btn-sm" id="selectAllWordCategories">全選択</button> <button type="button" class="btn-sm" id="clearWordCategories">全選択解除</button>';
    box.appendChild(heading);
    const options = document.createElement('div'); options.className = 'filter-options';
    for (const category of all) {
        const label = document.createElement('label'); label.className = 'filter-option';
        const input = document.createElement('input'); input.type = 'checkbox';
        input.checked = wordListSelectedCategories.includes(category);
        input.addEventListener('change', () => {
            if (input.checked) wordListSelectedCategories = unique([...wordListSelectedCategories, category]);
            else wordListSelectedCategories = wordListSelectedCategories.filter(value => value !== category);
            renderWordList();
        });
        label.append(input, document.createTextNode(category)); options.appendChild(label);
    }
    box.appendChild(options);
    $('selectAllWordCategories').onclick = () => { wordListSelectedCategories = [...all]; renderWordList(); };
    $('clearWordCategories').onclick = () => { wordListSelectedCategories = []; renderWordList(); };
}
function getWordListGroupLabel(word, sortKey) {
    if (sortKey === 'word') return getInitial({ word: word.word, reading: word.word });
    if (sortKey === 'reading' || sortKey === 'alpha') return getInitial(word);
    if (sortKey === 'category') {
        const categories = getWordCategoryTags(word).slice().sort((a, b) => a.localeCompare(b, 'ja'));
        return categories[0] || '(分類なし)';
    }
    if (sortKey === 'tags') {
        const tags = unique([...word.meanings.flatMap(meaning => meaning.fieldTag || []), word.eraTag || ''].filter(Boolean))
            .sort((a, b) => a.localeCompare(b, 'ja'));
        return tags[0] || '(タグなし)';
    }
    const month = /^\d{4}-\d{2}/.exec(asString(word.datetime));
    return month ? '登録月 ' + month[0] : '登録月 (未設定)';
}

function renderWordList() {
    const container = $('wordListContainer');
    if (!container) return;
    renderWordListCategoryFilters();
    const query = normalizeText($('wordListSearch')?.value || '');
    const sort = $('wordListSort')?.value || 'id';
    const direction = $('wordListDirection')?.value || 'asc';
    const multiplier = direction === 'desc' ? -1 : 1;
    const columnSort = wordListColumnSort;
    let items = wordData.filter(word =>
        (!query || normalizeText(searchableText(word)).includes(query)) &&
        wordHasTag(word, wordListTagFilter) &&
        (!wordListSelectedCategories.length || getWordCategoryTags(word).some(tag => wordListSelectedCategories.includes(tag)))
    );
    const activeGroupSort = columnSort.key || sort;
    const selectedCompare = (a, b) => {
        let result = 0;
        if (columnSort.key === 'reading') result = (a.reading || '').localeCompare(b.reading || '', 'ja') || a.word.localeCompare(b.word, 'ja');
        else if (columnSort.key === 'category') result = getWordCategoryTags(a).join(' ').localeCompare(getWordCategoryTags(b).join(' '), 'ja') || a.word.localeCompare(b.word, 'ja');
        else if (columnSort.key === 'tags') {
            const tagsA = [...unique(a.meanings.flatMap(m => m.fieldTag || [])), a.eraTag].filter(Boolean).sort((x,y)=>x.localeCompare(y,'ja')).join(' ');
            const tagsB = [...unique(b.meanings.flatMap(m => m.fieldTag || [])), b.eraTag].filter(Boolean).sort((x,y)=>x.localeCompare(y,'ja')).join(' ');
            result = tagsA.localeCompare(tagsB, 'ja') || a.word.localeCompare(b.word, 'ja');
        } else if (columnSort.key === 'word') result = a.word.localeCompare(b.word, 'ja');
        else if (columnSort.key === 'date') result = asString(a.datetime).localeCompare(asString(b.datetime));
        else result = sort === 'alpha' ? (a.reading || a.word).localeCompare(b.reading || b.word, 'ja') || a.word.localeCompare(b.word, 'ja') : a.id - b.id;
        return result * (columnSort.key ? (columnSort.direction === 'desc' ? -1 : 1) : multiplier);
    };
    const groupMultiplier = columnSort.key ? (columnSort.direction === 'desc' ? -1 : 1) : multiplier;
    items = [...items].sort((a, b) => {
        const groupComparison = getWordListGroupLabel(a, activeGroupSort).localeCompare(getWordListGroupLabel(b, activeGroupSort), 'ja');
        return (groupComparison * groupMultiplier) || selectedCompare(a, b);
    });
    $('wordListCount').textContent = items.length + '件 / 登録総数 ' + wordData.length + '件';
    if (!items.length) { container.innerHTML = '<div class="empty-message">条件に一致する単語はありません。</div>'; $('wordListAlphabetJump').replaceChildren(); $('wordListGroupJumpMenu').hidden = true; return; }
    const groupEntries = [];
    for (const word of items) {
        const label = getWordListGroupLabel(word, activeGroupSort);
        let group = groupEntries[groupEntries.length - 1];
        if (!group || group.label !== label) {
            group = { label, words: [] };
            groupEntries.push(group);
        }
        group.words.push(word);
    }
    const jump = $('wordListAlphabetJump');
    jump.replaceChildren();
    const showInitialJump = ['word', 'reading', 'alpha'].includes(activeGroupSort);
    jump.style.display = showInitialJump ? 'flex' : 'none';
    if (showInitialJump) {
        groupEntries.forEach((group, index) => {
            const link = document.createElement('a');
            link.href = '#word-group-' + index;
            link.textContent = group.label;
            link.title = group.label;
            jump.appendChild(link);
        });
    }
    const tagsHtml = word => {
        const classification = getWordCategoryTags(word).map(tag => '<button type="button" class="custom-tag tag-link" data-tag-type="categoryTags" data-tag-value="' + escapeHtml(tag) + '">' + escapeHtml(tag) + '</button>').join('');
        const field = unique(word.meanings.flatMap(m => m.fieldTag || [])).map(tag => '<button type="button" class="custom-tag tag-field tag-link" data-tag-type="fieldTag" data-tag-value="' + escapeHtml(tag) + '">' + escapeHtml(tag) + '</button>').join('');
        const era = word.eraTag ? '<button type="button" class="custom-tag tag-era tag-link" data-tag-type="eraTag" data-tag-value="' + escapeHtml(word.eraTag) + '">' + escapeHtml(word.eraTag) + '</button>' : '';
        const other = (word.other_tags || []).map(tag => '<span class="hashtag">#' + escapeHtml(tag) + '</span>').join('');
        return '<div class="word-list-tags">' + (classification + field + era + other || '—') + '</div>';
    };
    let rows = '';
    groupEntries.forEach((group, groupIndex) => {
        rows += '<tr class="alphabet-divider" id="word-group-' + groupIndex + '"><td colspan="5">' +
            '<button type="button" class="group-divider-trigger" data-group-index="' + groupIndex + '" aria-expanded="false">' +
            '<span>' + escapeHtml(group.label) + '</span><span class="group-divider-hint">移動先を選択 ▾</span></button></td></tr>';
        for (const word of group.words) {
            rows += '<tr>' +
                '<td><button class="word-list-open" type="button" data-word-id="' + word.id + '">' + escapeHtml(word.word) + '</button></td>' +
                '<td>' + escapeHtml(word.reading || '—') + '</td>' +
                '<td>' + escapeHtml(getWordCategoryTags(word).join(' / ') || '指定なし') + '</td>' +
                '<td>' + tagsHtml(word) + '</td>' +
                '<td class="word-list-date">' + escapeHtml(formatDate(word.datetime)) + '</td></tr>';
        }
    });
    container.innerHTML = '<div class="word-list-table-wrap"><table class="word-list-table"><thead><tr>' +
        '<th><button type="button" class="table-sort-button" data-column-sort="word">単語</button></th>' +
        '<th><button type="button" class="table-sort-button" data-column-sort="reading">読み</button></th>' +
        '<th><button type="button" class="table-sort-button" data-column-sort="category">分類</button></th>' +
        '<th><button type="button" class="table-sort-button" data-column-sort="tags">分野・時代タグ</button></th>' +
        '<th><button type="button" class="table-sort-button" data-column-sort="date">登録日</button></th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    container.querySelectorAll('[data-column-sort]').forEach(button => {
        const key = button.dataset.columnSort;
        button.textContent = ({word:'単語',reading:'読み',category:'分類',tags:'分野・時代タグ',date:'登録日'})[key] + (columnSort.key === key ? (columnSort.direction === 'asc' ? ' ▲' : ' ▼') : ' ↕');
        button.addEventListener('click', () => {
            wordListColumnSort = { key, direction: wordListColumnSort.key === key && wordListColumnSort.direction === 'asc' ? 'desc' : 'asc' };
            renderWordList();
        });
    });
    container.querySelectorAll('[data-word-id]').forEach(button => button.addEventListener('click', () => {
        currentWordId = Number(button.dataset.wordId); renderSidebarTree(); showViewMode();
    }));
    container.querySelectorAll('[data-tag-type][data-tag-value]').forEach(button => button.addEventListener('click', () => showWordsForTag(button.dataset.tagType, button.dataset.tagValue)));
    const jumpMenu = $('wordListGroupJumpMenu');
    const closeGroupJumpMenu = () => {
        jumpMenu.hidden = true;
        container.querySelectorAll('.group-divider-trigger').forEach(button => button.setAttribute('aria-expanded', 'false'));
    };
    if (jumpMenu && !jumpMenu.dataset.bound) {
        jumpMenu.dataset.bound = 'true';
        jumpMenu.addEventListener('click', event => {
            const targetButton = event.target.closest('[data-jump-group]');
            if (!targetButton) return;
            const target = document.getElementById('word-group-' + targetButton.dataset.jumpGroup);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            jumpMenu.hidden = true;
        });
        document.addEventListener('click', event => {
            if (!event.target.closest('.group-divider-trigger, #wordListGroupJumpMenu')) {
                jumpMenu.hidden = true;
                document.querySelectorAll('.group-divider-trigger').forEach(button => button.setAttribute('aria-expanded', 'false'));
            }
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                jumpMenu.hidden = true;
                document.querySelectorAll('.group-divider-trigger').forEach(button => button.setAttribute('aria-expanded', 'false'));
            }
        });
    }
    container.querySelectorAll('.group-divider-trigger').forEach(button => button.addEventListener('click', () => {
        if (!jumpMenu) return;
        const groupIndex = button.dataset.groupIndex;
        if (!jumpMenu.hidden && jumpMenu.dataset.fromGroup === groupIndex) {
            closeGroupJumpMenu();
            return;
        }
        container.querySelectorAll('.group-divider-trigger').forEach(item => item.setAttribute('aria-expanded', 'false'));
        jumpMenu.innerHTML = groupEntries.map((entry, index) =>
            '<button type="button" role="menuitem" data-jump-group="' + index + '">' + escapeHtml(entry.label) + '</button>'
        ).join('');
        jumpMenu.dataset.fromGroup = groupIndex;
        jumpMenu.hidden = false;
        button.setAttribute('aria-expanded', 'true');
        const rect = button.getBoundingClientRect();
        const menuWidth = Math.max(160, Math.min(300, window.innerWidth - 16));
        jumpMenu.style.width = menuWidth + 'px';
        jumpMenu.style.maxHeight = Math.max(140, Math.min(360, window.innerHeight - 16)) + 'px';
        const top = (window.innerHeight - rect.bottom) > 200 ? rect.bottom + 4 : Math.max(8, rect.top - 300);
        jumpMenu.style.top = top + 'px';
        jumpMenu.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8)) + 'px';
    }));
}

function showTodaysWord() {
    if (!wordData.length) { alert('辞書に単語がありません。'); return; }
    const day = new Date();
    const dateSeed = Number(`${day.getFullYear()}${String(day.getMonth() + 1).padStart(2, '0')}${String(day.getDate()).padStart(2, '0')}`);
    const sorted = [...wordData].sort((a, b) => a.id - b.id);
    const selected = sorted[dateSeed % sorted.length];
    currentWordId = selected.id;
    renderSidebarTree(); showViewMode();
    $('todaysWordBanner').innerHTML = `<strong>今日の単語:</strong> ${escapeHtml(selected.word)} <span>（日付に基づいて毎日同じ単語を表示します）</span>`;
}

function loadDisplaySettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        displaySettings = { ...SETTINGS_DEFAULTS, ...(saved && typeof saved === 'object' ? saved : {}) };
    } catch (_) { displaySettings = { ...SETTINGS_DEFAULTS }; }
    const aiToggle = $('showGeminiNoteToggle');
    const modeSelect = $('defaultWordDisplayMode');
    if (aiToggle) aiToggle.checked = Boolean(displaySettings.showGeminiNote);
    if (modeSelect) modeSelect.value = displaySettings.defaultDisplayMode || 'word';
    const detailMode = $('wordDisplayMode');
    if (detailMode) { detailMode.value = displaySettings.defaultDisplayMode || 'word'; detailMode.dataset.ready = 'true'; }
}
function saveDisplaySettings() {
    displaySettings = {
        showGeminiNote: $('showGeminiNoteToggle') ? $('showGeminiNoteToggle').checked : displaySettings.showGeminiNote,
        defaultDisplayMode: $('defaultWordDisplayMode') ? $('defaultWordDisplayMode').value : displaySettings.defaultDisplayMode
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(displaySettings));
    const detailMode = $('wordDisplayMode');
    if (detailMode) { detailMode.value = displaySettings.defaultDisplayMode; detailMode.dataset.ready = 'true'; }
    renderCurrentWordDetails();
}
function showAuxPanel(panelId, screen, recordHistory = true) {
    if (recordHistory) recordAppNavigation(screen);
    ['viewMode','editMode','managePanelMode','pastePanelMode','wordListMode','settingsPanelMode','toolsPanelMode','formatPanelMode'].forEach(id => {
        if ($(id)) $(id).style.display = 'none';
    });
    $(panelId).style.display = 'block';
}
async function showSettingsPanel(recordHistory = true) {
    showAuxPanel('settingsPanelMode', 'settings', recordHistory);
    loadDisplaySettings();
    const input = $('dataSavePath'), status = $('dataPathStatus');
    if (!input) return;
    try {
        const response = await fetch('/api/data-path', { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        input.value = data.path || '';
        if (status) status.textContent = data.path ? '現在の保存先を読み込みました。' : '標準の保存先を使用中です。';
    } catch (_) {
        if (status) status.textContent = '保存先変更は Python ランチャーで起動した場合に利用できます。';
    }
}
async function saveDataPath() {
    const input = $('dataSavePath'), status = $('dataPathStatus');
    const path = input ? input.value.trim() : '';
    if (!path) { if (status) status.textContent = '保存先の絶対パスを入力してください。'; return; }
    if (status) status.textContent = '保存先を変更しています…';
    try {
        const response = await fetch('/api/data-path', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ path, data: serializeNangoDocument() })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || ('HTTP ' + response.status));
        if (status) status.textContent = '保存先を変更しました: ' + result.path;
        showStorageStatus('指定した JSON ファイルに保存', false);
    } catch (error) {
        if (status) status.textContent = '変更できませんでした: ' + error.message;
    }
}
function buildTagPromptContext() {
    const categoryTags = unique(wordData.flatMap(getWordCategoryTags)).sort((a,b)=>a.localeCompare(b,'ja'));
    const fieldTags = unique(wordData.flatMap(word => word.meanings.flatMap(meaning => meaning.fieldTag || []))).sort((a,b)=>a.localeCompare(b,'ja'));
    const eraTags = unique(wordData.map(word => word.eraTag).filter(Boolean)).sort((a,b)=>a.localeCompare(b,'ja'));
    return [
        'タグ運用規則',
        '分類タグ: 言葉そのものの種類・由来・形式を表す。個々の意味がどの分野で使われるかとは独立して判断する。単語ごとに最大3個。',
        '分野タグ: その単語の特定の意味が使われる状況・領域を表し、単語全体ではなく meanings の各要素に付与する。意味あたり最大2個。',
        '時代タグ: 主に成立・使用される時代区分を単語単位で表す。',
        'その他タグ: 単語に表示するハッシュタグ。分類・分野・時代タグの代用にしない。',
        '',
        '既存の分類タグ: ' + (categoryTags.join('、') || '（なし）'),
        '既存の分野タグ: ' + (fieldTags.join('、') || '（なし）'),
        '既存の時代タグ: ' + (eraTags.join('、') || '（なし）'),
        '',
        'まず既存タグが適合するか確認する。新しい語で既存分類が合わない場合のみ、新しいタグ候補を提案する。似たタグを安易に増やさず、意味が異なる場合は既存タグの範囲を無理に広げない。'
    ].join('\n');
}
function showToolsPanel(recordHistory = true) {
    showAuxPanel('toolsPanelMode', 'tools', recordHistory);
    const meanings = wordData.reduce((count, word) => count + word.meanings.length, 0);
    const categories = unique(wordData.flatMap(getWordCategoryTags)).length;
    const fields = unique(wordData.flatMap(word => word.meanings.flatMap(meaning => meaning.fieldTag || []))).length;
    const eras = unique(wordData.map(word => word.eraTag).filter(Boolean)).length;
    $('toolsStats').innerHTML = [
        ['単語数', wordData.length], ['意味の数', meanings], ['分類タグ', categories], ['分野タグ', fields], ['時代タグ', eras]
    ].map(([label,value]) => '<div class="stat-card"><span class="stat-value">' + value + '</span><span class="stat-label">' + label + '</span></div>').join('');
    $('tagPromptContext').value = buildTagPromptContext();
}
async function copyTagPromptContext() {
    const input = $('tagPromptContext');
    if (!input) return;
    input.value = buildTagPromptContext();
    try {
        await navigator.clipboard.writeText(input.value);
        alert('タグ運用規則と既存タグ一覧をコピーしました。');
    } catch (_) {
        input.focus(); input.select();
        const ok = document.execCommand('copy');
        alert(ok ? 'タグ運用規則と既存タグ一覧をコピーしました。' : 'テキストを選択しました。手動でコピーしてください。');
    }
}
function showFormatPanel(recordHistory = true) {
    showAuxPanel('formatPanelMode', 'format', recordHistory);
    renderFormatViewer();
}
function setFormatMode(mode) {
    formatMode = mode === 'raw' ? 'raw' : 'readable';
    $('formatRawBtn')?.classList.toggle('active', formatMode === 'raw');
    $('formatReadableBtn')?.classList.toggle('active', formatMode === 'readable');
    renderFormatViewer();
}
function appendJsonTree(parent, key, value) {
    const node = document.createElement('div'); node.className = 'json-node';
    const label = document.createElement('span'); label.className = 'json-key'; label.textContent = key;
    node.appendChild(label);
    if (value && typeof value === 'object') {
        const child = document.createElement('div'); child.className = 'json-children';
        const entries = Array.isArray(value) ? value.map((item,index)=>[String(index),item]) : Object.entries(value);
        if (!entries.length) { const empty = document.createElement('span'); empty.className='json-scalar'; empty.textContent=Array.isArray(value)?' []':' {}'; node.appendChild(empty); }
        for (const [childKey, childValue] of entries) appendJsonTree(child, childKey, childValue);
        node.appendChild(child);
    } else {
        const scalar = document.createElement('span'); scalar.className = 'json-scalar';
        scalar.textContent = ': ' + (typeof value === 'string' ? JSON.stringify(value) : String(value));
        node.appendChild(scalar);
    }
    parent.appendChild(node);
}
async function renderFormatViewer() {
    const selected = $('dtFormatSelect') ? $('dtFormatSelect').value : 'schema';
    const status = $('dtFormatStatus'), raw = $('dtFormatRaw'), readable = $('dtFormatReadable');
    try {
        let value;
        if (selected === 'current') value = serializeNangoDocument();
        else if (Object.prototype.hasOwnProperty.call(formatDataCache, selected)) value = formatDataCache[selected];
        else {
            const response = await fetch('/api/format?name=' + encodeURIComponent(selected), { cache: 'no-store' });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            value = await response.json();
            formatDataCache[selected] = value;
        }
        const textValue = JSON.stringify(value, null, 2);
        raw.textContent = textValue;
        readable.replaceChildren();
        appendJsonTree(readable, selected === 'current' ? '現在のデータ' : selected, value);
        raw.style.display = formatMode === 'raw' ? 'block' : 'none';
        readable.style.display = formatMode === 'readable' ? 'block' : 'none';
        if (status) status.textContent = '読み取り専用です。表示中: ' + ({schema:'JSON Schema',instruction:'AI指示',template:'テンプレート',current:'現在のデータ'}[selected] || selected);
    } catch (error) {
        raw.style.display = 'none'; readable.style.display = 'block'; readable.textContent = '';
        const message = document.createElement('p'); message.textContent = 'DT-FMT の読み込みに失敗しました: ' + error.message; readable.appendChild(message);
        if (status) status.textContent = 'Pythonランチャー経由のローカル起動を確認してください。';
    }
}

// Expose small pure helpers for browser console/manual tests.
window.NangoPhase1 = { parseNangoDocument, serializeNangoDocument, normalizeWord, validateWord, findDuplicateIndex, mergeWord, get data() { return clone(wordData); } };
initApp();
