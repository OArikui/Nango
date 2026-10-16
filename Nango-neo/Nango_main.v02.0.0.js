/* Nango-neo Phase 1
 * Canonical file format: DTformats.neo.v5.17 (words object keyed by displayed word).
 * The UI uses an internal array; conversion happens only at load/import/export boundaries.
 */
'use strict';

const STORAGE_KEY = 'nango_data';
const SETTINGS_KEY = 'nango_settings_v272';
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
const FORMAT_VERSION = 'DTformats.neo.v5.17';
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
let groupDisplayEnabled = false;
let displaySettings = { ...SETTINGS_DEFAULTS };
let formatMode = 'readable';
const formatDataCache = {};

function currentScreenSnapshot(screen, extra = {}) {
    return {
        screen,
        wordId: currentWordId,
        tagFilter: wordListTagFilter ? { ...wordListTagFilter } : null,
        wordListSearch: $('wordListSearch')?.value || '',
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
    ['viewMode', 'editMode', 'managePanelMode', 'pastePanelMode', 'wordListMode', 'settingsPanelMode', 'toolsPanelMode', 'formatPanelMode','authPanelMode'].forEach(id => {
        if ($(id)) $(id).style.display = 'none';
    });
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
        renderWordListFilterBanner();
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
        synonyms: asStringArray(raw.synonyms),
        antonyms: asStringArray(raw.antonyms),
        similarWordsDifference: asString(raw.similarWordsDifference)
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
    } else if (item.meaning !== undefined || item.background !== undefined || item.nuance !== undefined || item.examples !== undefined || item.synonyms !== undefined || item.antonyms !== undefined || item.similarWordsDifference !== undefined) {
        meanings = [normalizeMeaning({
            definition: item.meaning, background: item.background, nuance: item.nuance,
            fieldTag: item.fieldTag, examples: item.examples, synonyms: item.synonyms,
            antonyms: item.antonyms, similarWordsDifference: item.similarWordsDifference
        })];
    } else {
        meanings = [];
    }
    if (!meanings.length) throw new Error(`「${word}」に meanings がありません。最低1つの意味を登録してください。`);

    const base = { ...item };
    ['word', 'word(any)', 'word_any', 'meaning', 'background', 'nuance', 'fieldTag', 'examples', 'synonyms', 'antonyms', 'similarWordsDifference'].forEach(keyName => delete base[keyName]);
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
        for (const field of ['background', 'nuance', 'similarWordsDifference']) {
            if (meaning[field] !== undefined && typeof meaning[field] !== 'string') throw new Error(`「${wordName}」の意味 ${index + 1}: ${field} は文字列である必要があります。`);
        }
        for (const field of ['fieldTag', 'examples', 'synonyms', 'antonyms']) {
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
        for (const key of ['fieldTag', 'examples', 'synonyms', 'antonyms']) {
            if (!Array.isArray(meaning[key]) || !meaning[key].every(value => typeof value === 'string')) {
                throw new Error(`「${word.word}」の意味 ${i + 1}: ${key} は文字列配列である必要があります。`);
            }
        }
        if (typeof meaning.similarWordsDifference !== 'string') throw new Error(`「${word.word}」の意味 ${i + 1}: similarWordsDifference は文字列である必要があります。`);
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
        const orderedPayload = { pronunciation: payload.pronunciation || '' };
        for (const [key, value] of Object.entries(payload)) {
            if (key !== 'pronunciation') orderedPayload[key] = value;
        }
        words[item.word] = orderedPayload;
    }
    return { words, additional_data: asStringArray(extra) };
}

function reassignIds(items, start = 1) {
    return items.map((item, index) => ({ ...item, id: start + index }));
}


function installKeyboardNavigation() {
    document.addEventListener('keydown', event => {
        if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        const target = event.target;
        if (target?.isContentEditable || target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
        if (event.key === 'ArrowLeft' && appNavigationIndex > 0) {
            event.preventDefault();
            navigateAppHistory(-1);
        } else if (event.key === 'ArrowRight' && appNavigationIndex >= 0 && appNavigationIndex < appNavigationHistory.length - 1) {
            event.preventDefault();
            navigateAppHistory(1);
        }
    });
}

async function initApp() {
    installKeyboardNavigation();
    await loadRepositorySupabaseConfig();
    initializeSupabaseClientFromStoredConfig();
    registerSupabaseAuthListener();
    const browserSavedData = localStorage.getItem(STORAGE_KEY);
    let savedData = browserSavedData, cloudLoaded = false;
    if (supabaseClient) {
        try {
            const sessionResult = await supabaseClient.auth.getSession();
            if (sessionResult.error) throw sessionResult.error;
            authUser = sessionResult.data && sessionResult.data.session ? sessionResult.data.session.user : null;
            if (authUser) {
                authSyncMode = 'pending';
                try {
                    const row = await fetchCloudRow(authUser.id);
                    if (row) {
                        parseNangoDocument(row.data);
                        savedData = JSON.stringify(row.data);
                        cloudLoaded = true;
                        authSyncMode = 'cloud';
                    } else {
                        authSyncMode = 'cloud';
                        savedData = browserSavedData;
                        if (!savedData && (location.hostname === '127.0.0.1' || location.hostname === 'localhost')) {
                            const serverData = await loadServerData();
                            if (serverData) savedData = JSON.stringify(serverData);
                        }
                    }
                } catch (cloudError) {
                    authSyncMode = 'pending'; savedData = browserSavedData;
                    setAuthStatus('クラウドデータを確認できなかったため、ローカル保存で起動します。クラウドデータは上書きしません。詳細: ' + cloudError.message);
                }
            } else authSyncMode = 'local';
        } catch (authError) {
            authUser = null; authSyncMode = 'local';
            setAuthStatus('ログイン状態を確認できなかったため、ローカル保存で起動します。詳細: ' + authError.message);
        }
    } else { authUser = null; authSyncMode = 'local'; }
    if (!authUser) {
        const serverData = await loadServerData();
        savedData = serverData ? JSON.stringify(serverData) : browserSavedData;
    }
    try {
        if (savedData) {
            const parsed = parseNangoDocument(JSON.parse(savedData));
            wordData = reassignIds(parsed.words.slice().sort((a, b) => (a.id || 0) - (b.id || 0)));
            additionalData = parsed.additional_data;
            if (!cloudLoaded) {
                try { saveToLocalStorage(); } catch (saveError) { console.warn('保存データを保存できませんでした:', saveError); }
            }
        } else {
            wordData = reassignIds(clone(defaultData).map(word => ({ ...word, categoryTags: normalizeCategoryTags(word.categoryTags, word.category) })));
            additionalData = [];
            saveToLocalStorage();
        }
    } catch (error) {
        console.error('Nangoデータの読み込みに失敗しました:', error);
        if (authUser) authSyncMode = 'pending';
        wordData = reassignIds(clone(defaultData).map(word => ({ ...word, categoryTags: normalizeCategoryTags(word.categoryTags, word.category) })));
        additionalData = [];
        try { saveToLocalStorage(); } catch (saveError) { console.error('初期データを保存できません:', saveError); }
        setAuthStatus('保存データを読み込めなかったため、初期データで起動しました。元データは上書きしていません。詳細: ' + error.message);
    }
    loadDisplaySettings(); refreshOpenState();
    currentWordId = wordData.length ? wordData[0].id : -1;
    renderSidebarTree();
    if (wordData.length) showTodaysWord(); else showViewMode();
    refreshAuthPanel();
    if (authUser && authSyncMode === 'cloud') showStorageStatus('Supabase クラウドに接続中');
    else if (authUser && authSyncMode === 'pending') showStorageStatus('クラウド同期を保留中（ローカル保存）', true);
    else if (serverStorageAvailable) showStorageStatus('ローカルファイル保存を使用中');
}
function saveToLocalStorage() {
    const serialized = JSON.stringify(serializeNangoDocument());
    const useLocalStorage = shouldUseLocalStorage(authUser, authSyncMode);
    if (useLocalStorage) localStorage.setItem(STORAGE_KEY, serialized);
    if (authUser && authSyncMode === 'cloud') {
        const userId = authUser.id;
        cloudSaveQueue = cloudSaveQueue.then(async () => {
            if (!authUser || authUser.id !== userId || authSyncMode !== 'cloud') return;
            const result = await writeCloudDocument(serialized, userId);
            showStorageStatus('Supabase クラウドに保存済み');
            setAuthStatus('辞書データをクラウドに保存しました。');
            return result;
        }).catch(error => {
            showStorageStatus('クラウド保存に失敗しました', true);
            setAuthStatus('クラウド保存に失敗しました。ページを閉じる前に JSON エクスポートでバックアップしてください。詳細: ' + error.message);
            console.error('Supabase への保存に失敗しました:', error);
        });
        return;
    }
    if (useLocalStorage && ((location.protocol === 'http:' && location.hostname === '127.0.0.1') || location.hostname === 'localhost')) {
        serverSaveQueue = serverSaveQueue.then(async () => {
            const response = await fetch(LOCAL_DATA_API, {
                method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: serialized
            });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            serverStorageAvailable = true; showStorageStatus('ローカルファイルに保存済み');
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
function getInitial(word, source = 'word') {
    const rawValue = source === 'reading' ? (word.reading || word.word) : word.word;
    const value = Array.from(asString(rawValue).trim().normalize('NFKC'))[0] || '';
    if (!value) return '記号・その他';
    if (/^[A-Za-z]$/.test(value)) return value.toLocaleUpperCase('en');
    if (/^\p{Decimal_Number}$/u.test(value)) return value;
    if (/^[\u3040-\u309F]$/u.test(value)) return value;
    if (/^[\u30A0-\u30FF\u31F0-\u31FF]$/u.test(value)) return value;
    if (/^\p{Script=Han}$/u.test(value)) return '漢字';
    return '記号・その他';
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
            m.definition, m.background, m.nuance, m.similarWordsDifference, ...m.fieldTag, ...m.examples, ...m.synonyms, ...(m.antonyms || [])
        ])].join(' ').toLocaleLowerCase('ja');
}

function getProcessedWords() {
    const detailVisible = $('viewMode')?.style.display === 'block';
    let result = wordData.filter(word => {
        if (searchQuery && !searchableText(word).includes(searchQuery)) return false;
        if (selectedCategoryFilters.length && !getWordCategoryTags(word).some(tag => selectedCategoryFilters.includes(tag))) return false;
        if (detailVisible && wordListTagFilter) {
            const filter = wordListTagFilter;
            if (filter.type === 'wordId' && word.id !== filter.wordId) return false;
            if (filter.type === 'wordIds' && !filter.wordIds.includes(word.id)) return false;
            if (filter.type === 'categoryTags' && !getWordCategoryTags(word).includes(filter.tag)) return false;
            if (filter.type === 'fieldTag' && !word.meanings.some(m => (m.fieldTag || []).includes(filter.tag))) return false;
            if (filter.type === 'eraTag' && word.eraTag !== filter.tag) return false;
            if (filter.type === 'other_tags' && !(word.other_tags || []).includes(filter.tag)) return false;
        }
        return true;
    });
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
        const sidebarMode = $('sidebarWordDisplayMode')?.value || displaySettings.defaultDisplayMode || 'word';
        const modeValue = ({ word: word.word, reading: word.reading, kanji: word.kanji, pronunciation: word.pronunciation })[sidebarMode];
        const displayWord = asString(modeValue).trim() || word.word;
        button.textContent = displayWord;
        button.title = displayWord === word.word ? word.word : word.word + ' — ' + displayWord;
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

function updateSidebarVisibility() {
    const sidebar = document.querySelector('.main-layout > .sidebar');
    if (!sidebar) return;
    const detailVisible = $('viewMode')?.style.display === 'block';
    const settingsVisible = $('settingsPanelMode')?.style.display === 'block';
    sidebar.style.display = detailVisible || settingsVisible ? '' : 'none';
}

function showViewMode(recordHistory = true) {
    if (recordHistory) recordAppNavigation('view');
    ['editMode','managePanelMode','pastePanelMode','wordListMode','settingsPanelMode','toolsPanelMode','formatPanelMode','authPanelMode'].forEach(id => { if ($(id)) $(id).style.display = 'none'; });
    $('viewMode').style.display = 'block';
    const current = wordData.find(item => item.id === currentWordId);
    $('editBtn').style.display = current ? 'inline-block' : 'none';
    $('deleteBtn').style.display = current ? 'inline-block' : 'none';
    renderCurrentWordDetails();
    updateSidebarVisibility();
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
    if (!current) { target.innerHTML = '<div class="empty-message">表示する単語がありません。JSONをインポートするか、新規単語を追加してください。</div>'; return; }
    const titleValue = current.word;
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
            (meaning.antonyms.length ? '<div class="section-title">対義語</div><div class="synonym-container">' + meaning.antonyms.map(term => '<span class="synonym-tag">' + escapeHtml(term) + '</span>').join('') + '</div>' : '') +
            (meaning.similarWordsDifference ? '<div class="section-title">似た言葉との違い</div>' + renderRichText(meaning.similarWordsDifference) : '') +
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
        <div class="form-group"><label>類義語（カンマ、読点、改行区切り）</label><textarea class="form-control meaning-synonyms">${escapeHtml(normalized.synonyms.join('\n'))}</textarea></div>
        <div class="form-group"><label>対義語（カンマ、読点、改行区切り。不明なら空欄）</label><textarea class="form-control meaning-antonyms">${escapeHtml(normalized.antonyms.join('\n'))}</textarea></div>
        <div class="form-group"><label>似た言葉との違い（意味・用法・ニュアンス・場面の違い）</label><textarea class="form-control meaning-similarWordsDifference" placeholder="例：Aは〜を強調し、Bは〜を表すため、使用される場面が異なる">${escapeHtml(normalized.similarWordsDifference)}</textarea></div>`;
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
        synonyms: splitList(card.querySelector('.meaning-synonyms').value),
        antonyms: splitList(card.querySelector('.meaning-antonyms').value),
        similarWordsDifference: card.querySelector('.meaning-similarWordsDifference').value.trim()
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
    const savedFromNewEntry = isNewWord;
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
        saveToLocalStorage(); refreshOpenState(); renderSidebarTree();
        if (savedFromNewEntry) showWordListForWord(currentWordId);
        else showViewMode();
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
            exact.antonyms = mergeList(exact.antonyms, incomingMeaning.antonyms);
            if (!exact.similarWordsDifference) exact.similarWordsDifference = incomingMeaning.similarWordsDifference;
            else if (incomingMeaning.similarWordsDifference && normalizeText(exact.similarWordsDifference) !== normalizeText(incomingMeaning.similarWordsDifference)) {
                conflicts.push({ field: `意味「${exact.definition}」の似た言葉との違い`, key: 'similarWordsDifference', oldValue: exact.similarWordsDifference, newValue: incomingMeaning.similarWordsDifference, meaning: exact });
            }
        } else meanings.push(clone(incomingMeaning));
    }
    merged.meanings = meanings;
    if (conflicts.length) {
        const details = conflicts.map((item, i) => `${i + 1}. ${item.field}\n現在: ${item.oldValue}\n取込: ${item.newValue}`).join('\n\n');
        const useImported = confirm(`「${existing.word}」のマージで競合があります。\n\n${details}\n\nOK: 競合する値は取り込みデータを採用\nキャンセル: 現在の値を維持`);
        if (useImported) conflicts.forEach(item => {
            if (item.meaning) item.meaning[item.key || item.field.split('の').pop()] = item.newValue;
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
        const importedWordIds = wordData.map(item => item.id);
        const first = wordData[0]; currentWordId = first ? first.id : -1;
        saveToLocalStorage(); refreshOpenState(); renderSidebarTree();
        if (importedWordIds.length) showWordListForWords(importedWordIds);
        else showViewMode();
        return { added: wordData.length, merged: 0, skipped, wordIds: importedWordIds };
    }
    const candidate = wordData.map(clone);
    const importedWordIds = [];
    let added = 0, mergedCount = 0, skipped = 0;
    for (const word of incoming) {
        const index = findDuplicateIndex(word, candidate);
        if (index < 0) {
            const imported = { ...clone(word), id: nextId(candidate) };
            candidate.push(imported);
            importedWordIds.push(imported.id);
            added++;
        } else {
            candidate[index] = mergeWord(candidate[index], word);
            importedWordIds.push(candidate[index].id);
            mergedCount++;
        }
    }
    wordData = candidate;
    additionalData = mergeList(additionalData, extra);
    const uniqueImportedWordIds = [...new Set(importedWordIds)];
    if (!wordData.some(item => item.id === currentWordId)) currentWordId = wordData[0]?.id ?? -1;
    saveToLocalStorage(); refreshOpenState(); renderSidebarTree();
    if (uniqueImportedWordIds.length) showWordListForWords(uniqueImportedWordIds);
    else showViewMode();
    return { added, merged: mergedCount, skipped, wordIds: uniqueImportedWordIds };
}

function exportJSON() {
    if (!wordData.length) { alert('エクスポートする単語がありません。'); return; }
    let blob;
    try { blob = new Blob([JSON.stringify(serializeNangoDocument(), null, 2)], { type: 'application/json;charset=utf-8' }); }
    catch (error) { alert(`エクスポートできません: ${error.message}`); return; }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'Nango-neo_DTformats.neo.v5.17.json';
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

function showManagePanel(recordHistory = true) {
    showAuxPanel('managePanelMode', 'manage', recordHistory);
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
    showAuxPanel('pastePanelMode', 'paste');
    $('jsonPasteInput').focus();
}

async function readClipboardToPaste() {
    const input = $('jsonPasteInput');
    if (!input) return;
    if (!navigator.clipboard || typeof navigator.clipboard.readText !== 'function') {
        input.focus();
        alert('このブラウザーではクリップボード読み取り機能を利用できません。テキスト欄で Ctrl+V を押してください。');
        return;
    }
    try {
        const clipboardText = await navigator.clipboard.readText();
        if (!clipboardText.trim()) {
            input.focus();
            alert('クリップボードは空です。コピーした JSON を確認してください。');
            return;
        }
        input.value = clipboardText;
        await importPastedJSON();
    } catch (error) {
        input.focus();
        alert('クリップボードへのアクセスが許可されませんでした。ブラウザーの権限を確認するか、テキスト欄で Ctrl+V を押してください。');
    }
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
    ['viewMode','editMode','managePanelMode','pastePanelMode','settingsPanelMode','toolsPanelMode','formatPanelMode','authPanelMode'].forEach(id => { if ($(id)) $(id).style.display = 'none'; });
    $('wordListMode').style.display = 'block';
    renderWordList();
}
function renderWordListFilterBanner() {
    const box = $('wordListTagFilter');
    if (!box) return;
    if (!wordListTagFilter) {
        box.style.display = 'none';
        box.replaceChildren();
        return;
    }
    const isSingleWord = wordListTagFilter.type === 'wordId';
    box.style.display = 'flex';
    const isImportedBatch = wordListTagFilter.type === 'wordIds';
    box.innerHTML = isImportedBatch
        ? '取り込み後の単語 ' + wordListTagFilter.wordIds.length + ' 件を表示中 <button type="button" class="btn-sm" id="clearWordListTagFilter">絞り込みを解除</button>'
        : isSingleWord
            ? '追加した単語「<strong>' + escapeHtml(wordListTagFilter.tag) + '</strong>」のみ表示中 <button type="button" class="btn-sm" id="clearWordListTagFilter">絞り込みを解除</button>'
            : 'タグ「<strong>' + escapeHtml(wordListTagFilter.tag) + '</strong>」で検索中 <button type="button" class="btn-sm" id="clearWordListTagFilter">タグ検索を解除</button>';
    $('clearWordListTagFilter').onclick = () => {
        wordListTagFilter = null;
        renderWordListFilterBanner();
        renderWordList();
        recordAppNavigation('wordList');
    };
}
function showWordListForWord(wordId) {
    const word = wordData.find(item => item.id === wordId);
    if (!word) { showViewMode(); return; }
    showWordListForWords([word.id], 'single');
}
function showWordListForWords(wordIds, mode = 'import') {
    const ids = [...new Set((wordIds || []).map(Number))]
        .filter(id => wordData.some(item => item.id === id));
    if (!ids.length) { showViewMode(); return; }
    const words = wordData.filter(item => ids.includes(item.id));
    currentWordId = ids[0];
    wordListTagFilter = mode === 'single' && words.length === 1
        ? { type: 'wordId', tag: words[0].word, wordId: words[0].id }
        : { type: 'wordIds', tag: String(ids.length), wordIds: ids };
    wordListSelectedCategories = [];
    $('wordListSearch').value = '';
    wordListFiltersOpen = false;
    $('wordListCategoryFilters').style.display = 'none';
    $('wordListFiltersToggle')?.setAttribute('aria-expanded', 'false');
    $('wordListGroupJumpMenu').hidden = true;
    wordListColumnSort = { key: null, direction: 'asc' };
    recordAppNavigation('wordList');
    ['viewMode','editMode','managePanelMode','pastePanelMode','settingsPanelMode','toolsPanelMode','formatPanelMode','authPanelMode'].forEach(id => { if ($(id)) $(id).style.display = 'none'; });
    $('wordListMode').style.display = 'block';
    renderWordListFilterBanner();
    renderWordList();
}
function showWordsForTag(type, tag) {
    wordListTagFilter = { type, tag };
    wordListSelectedCategories = [];
    $('wordListSearch').value = '';
    recordAppNavigation('tagWords');
    ['viewMode','editMode','managePanelMode','pastePanelMode','settingsPanelMode','toolsPanelMode','formatPanelMode','authPanelMode'].forEach(id => { if ($(id)) $(id).style.display = 'none'; });
    $('wordListMode').style.display = 'block';
    renderWordListFilterBanner();
    renderWordList();
}
function wordHasTag(word, filter) {
    if (!filter) return true;
    if (filter.type === 'wordId') return Number(word.id) === Number(filter.wordId);
    if (filter.type === 'wordIds') return filter.wordIds.includes(Number(word.id));
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
    heading.innerHTML = '<strong>分類タグで検索</strong> <button type="button" class="btn-sm" id="selectAllWordCategories">全選択</button> <button type="button" class="btn-sm" id="clearWordCategories">全選択解除</button>';
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
    if (sortKey === 'word') return getInitial(word, 'word');
    if (sortKey === 'reading' || sortKey === 'alpha') return getInitial(word, 'reading');
    if (sortKey === 'category') {
        const categories = getWordCategoryTags(word).slice().sort((a, b) => a.localeCompare(b, 'ja'));
        return categories[0] || '(分類なし)';
    }
    if (sortKey === 'fieldTags') {
        const tags = unique(word.meanings.flatMap(meaning => meaning.fieldTag || [])).sort((a, b) => a.localeCompare(b, 'ja'));
        return tags[0] || '(分野タグなし)';
    }
    if (sortKey === 'eraTag') return word.eraTag || '(時代タグなし)';
    if (sortKey === 'other') {
        const tags = unique(word.other_tags || []).sort((a, b) => a.localeCompare(b, 'ja'));
        return tags[0] || '(その他タグなし)';
    }
    if (sortKey === 'date') {
        const date = /^\d{4}-\d{2}-\d{2}/.exec(asString(word.datetime));
        return date ? '登録日 ' + date[0] : '登録日 (未設定)';
    }
    return '登録順';
}

function updateWordListStickyOffsets() {
    const toolbar = document.querySelector('.toolbar');
    if (!toolbar) return;
    const tableTop = Math.ceil(toolbar.getBoundingClientRect().height + 12);
    const header = document.querySelector('.word-list-table thead');
    const headerHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 40;
    document.documentElement.style.setProperty('--nango-sticky-table-top', tableTop + 'px');
    document.documentElement.style.setProperty('--nango-sticky-group-top', (tableTop + headerHeight) + 'px');
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
        else if (columnSort.key === 'fieldTags') {
            const tagsA = unique(a.meanings.flatMap(m => m.fieldTag || [])).sort((x, y) => x.localeCompare(y, 'ja')).join(' ');
            const tagsB = unique(b.meanings.flatMap(m => m.fieldTag || [])).sort((x, y) => x.localeCompare(y, 'ja')).join(' ');
            result = tagsA.localeCompare(tagsB, 'ja') || a.word.localeCompare(b.word, 'ja');
        } else if (columnSort.key === 'eraTag') result = asString(a.eraTag).localeCompare(asString(b.eraTag), 'ja') || a.word.localeCompare(b.word, 'ja');
        else if (columnSort.key === 'other') {
            result = (a.other_tags || []).join(' ').localeCompare((b.other_tags || []).join(' '), 'ja') || a.word.localeCompare(b.word, 'ja');
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
    const categoryTagsHtml = word => {
        const tags = getWordCategoryTags(word);
        const html = tags.map(tag => '<button type="button" class="custom-tag tag-link" data-tag-type="categoryTags" data-tag-value="' + escapeHtml(tag) + '">' + escapeHtml(tag) + '</button>').join('');
        return '<div class="word-list-tags">' + (html || '指定なし') + '</div>';
    };
    const fieldTagsHtml = word => {
        const tags = unique(word.meanings.flatMap(meaning => meaning.fieldTag || []));
        const html = tags.map(tag => '<button type="button" class="custom-tag tag-field tag-link" data-tag-type="fieldTag" data-tag-value="' + escapeHtml(tag) + '">' + escapeHtml(tag) + '</button>').join('');
        return '<div class="word-list-tags">' + (html || '—') + '</div>';
    };
    const eraTagHtml = word => {
        if (!word.eraTag) return '—';
        return '<div class="word-list-tags"><button type="button" class="custom-tag tag-era tag-link" data-tag-type="eraTag" data-tag-value="' + escapeHtml(word.eraTag) + '">' + escapeHtml(word.eraTag) + '</button></div>';
    };
    const otherTagsHtml = word => {
        const html = (word.other_tags || []).map(tag => '<span class="hashtag">#' + escapeHtml(tag) + '</span>').join('');
        return '<div class="word-list-tags">' + (html || '—') + '</div>';
    };
    let rows = '';
    groupEntries.forEach((group, groupIndex) => {
        rows += '<tr class="alphabet-divider" id="word-group-' + groupIndex + '"><td colspan="7">' +
            '<button type="button" class="group-divider-trigger" data-group-index="' + groupIndex + '" aria-expanded="false">' +
            '<span>' + escapeHtml(group.label) + '</span><span class="group-divider-hint">移動先を選択 ▾</span></button></td></tr>';
        for (const word of group.words) {
            rows += '<tr>' +
                '<td><button class="word-list-open" type="button" data-word-id="' + word.id + '">' + escapeHtml(word.word) + '</button></td>' +
                '<td>' + escapeHtml(word.reading || '—') + '</td>' +
                '<td>' + categoryTagsHtml(word) + '</td>' +
                '<td>' + fieldTagsHtml(word) + '</td>' +
                '<td>' + eraTagHtml(word) + '</td>' +
                '<td>' + otherTagsHtml(word) + '</td>' +
                '<td class="word-list-date">' + escapeHtml(formatDate(word.datetime)) + '</td></tr>';
        }
    });
    container.innerHTML = '<div class="word-list-table-wrap"><table class="word-list-table"><thead><tr>' +
        '<th><button type="button" class="table-sort-button" data-column-sort="word">単語</button></th>' +
        '<th><button type="button" class="table-sort-button" data-column-sort="reading">読み</button></th>' +
        '<th><button type="button" class="table-sort-button" data-column-sort="category">分類</button></th>' +
        '<th><button type="button" class="table-sort-button" data-column-sort="fieldTags">分野タグ</button></th>' +
        '<th><button type="button" class="table-sort-button" data-column-sort="eraTag">時代タグ</button></th>' +
        '<th><button type="button" class="table-sort-button" data-column-sort="other">その他タグ</button></th>' +
        '<th><button type="button" class="table-sort-button" data-column-sort="date">登録日</button></th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    updateWordListStickyOffsets();
    if (!document.documentElement.dataset.nangoStickyResizeBound) {
        window.addEventListener('resize', updateWordListStickyOffsets, { passive: true });
        document.documentElement.dataset.nangoStickyResizeBound = 'true';
    }
    container.querySelectorAll('[data-column-sort]').forEach(button => {
        const key = button.dataset.columnSort;
        button.textContent = ({word:'単語',reading:'読み',category:'分類',fieldTags:'分野タグ',eraTag:'時代タグ',other:'その他タグ',date:'登録日'})[key] + (columnSort.key === key ? (columnSort.direction === 'asc' ? ' ▲' : ' ▼') : ' ↕');
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
    const sidebarMode = $('sidebarWordDisplayMode');
    if (sidebarMode) sidebarMode.value = displaySettings.defaultDisplayMode || 'word';
}
function saveDisplaySettings() {
    displaySettings = {
        showGeminiNote: $('showGeminiNoteToggle') ? $('showGeminiNoteToggle').checked : displaySettings.showGeminiNote,
        defaultDisplayMode: $('defaultWordDisplayMode') ? $('defaultWordDisplayMode').value : displaySettings.defaultDisplayMode
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(displaySettings));
    const sidebarMode = $('sidebarWordDisplayMode');
    if (sidebarMode) sidebarMode.value = displaySettings.defaultDisplayMode;
    renderCurrentWordDetails();
    renderSidebarTree();
}
function setSidebarWordDisplayMode(mode) {
    const allowed = ['word', 'reading', 'kanji', 'pronunciation'];
    displaySettings.defaultDisplayMode = allowed.includes(mode) ? mode : 'word';
    const settingSelect = $('defaultWordDisplayMode');
    if (settingSelect) settingSelect.value = displaySettings.defaultDisplayMode;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(displaySettings));
    renderSidebarTree();
}
function showAuxPanel(panelId, screen, recordHistory = true) {
    if (recordHistory) recordAppNavigation(screen);
    ['viewMode','editMode','managePanelMode','pastePanelMode','wordListMode','settingsPanelMode','toolsPanelMode','formatPanelMode','authPanelMode'].forEach(id => {
        if ($(id)) $(id).style.display = 'none';
    });
    $(panelId).style.display = 'block';
    updateSidebarVisibility();
}
async function showSettingsPanel(recordHistory = true) {
    showAuxPanel('settingsPanelMode', 'settings', recordHistory);
    loadDisplaySettings();
    const tagContext = $('tagPromptContext');
    if (tagContext) tagContext.value = buildTagPromptContext();
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
function buildAiPrompt() {
    return [
        'あなたは、信頼できる情報をもとに言葉の理解を深める辞書編集者です。対象語の意味だけでなく、背景・由来・用法・文化的／専門的文脈も調べ、学習者がその言葉を正確に理解し、使い分けられる資料を作成してください。',
        '出力はDT-FMT v5.17に準拠する有効なJSONのみです。Markdownコードフェンス、前置き、JSON外の解説は付けないでください。',
        'トップレベルは {"words": {"単語名": {"pronunciation": "", "id": 1, "datetime": "RFC 3339日時", "category": "", "eraTag": "", "reading": "", "kanji": "", "english": "", "column": "", "memo": "", "gemini_note": "", "other_tags": [], "meanings": [{"definition": "", "background": "", "nuance": "", "fieldTag": [], "examples": [], "synonyms": [], "antonyms": [], "similarWordsDifference": ""}], "categoryTags": []}}, "additional_data": []} の形にしてください。',
        '必須ルール: 例示したすべての単語項目・意味項目を省略せず出力してください。情報が不明、確認できない、または該当しないときもキーを省略せず、文字列は空文字、配列は空配列にします。ただし memo はユーザー本人が後から記入する補足メモ欄なので、AI が内容を埋める必要はありません。形式維持のためキーは残し、値は必ず空文字にしてください。definition だけは空欄にせず、確認できる意味を必ず記載してください。id は正の整数、datetime は現在のRFC 3339日時にしてください。',
        'meanings は1件以上です。対象語に定着した異なる意味・用法が複数あれば、意味ごとに項目を分けて説明してください。意味の数を無理に増やしたり、同じ内容を言い換えて重複登録したりしないでください。各定義は簡素すぎる一言で終わらせず、対象や範囲、成立条件、典型的な使われ方が分かる程度に具体化してください。',
        'background には、判明する範囲で語源・語の成り立ち・歴史的変化・文化的背景・専門分野での発展を説明してください。根拠が弱い語源説は事実と断定せず、必要に応じて異説と不確実性を明記します。nuance には、丁寧さ、硬さ、感情的な含み、評価、使用場面、誤解しやすい点などを書きます。',
        'examples は意味・文体・使い方が伝わる自然な例文を挙げてください。synonyms は同義・近義の語、antonyms は意味上対照をなす対義語を挙げます。「似た言葉との違い」（similarWordsDifference）には、似た言葉を具体的に取り上げ、意味の範囲、強調点、語感、文体、使われる状況などの違いを説明してください。適切な対義語や比較対象が見つからない場合は、それぞれ空配列／空文字にします。',
        '知識を拡充することが目的です。冗長な繰り返しは避けつつ、定義・背景・ニュアンス・比較説明は、理解に必要な具体例や理由を含む読み応えのある文章にしてください。column には、関連する文化・歴史・科学・社会・文学の話題、意外な用法、関連概念など、対象語の理解につながる余談を歓迎します。memo はユーザーが後から記入する個人用メモ欄なので、AI は内容を作成せず空文字にします。gemini_note は要点を親しみやすくまとめた短い一言にします。根拠のない作り話や架空の引用は書かないでください。',
        'pronunciation は単語オブジェクト直下の独立項目です。meanings 内には入れません。単語名には読みを括弧書きで付けず、読みは reading、漢字表記は kanji、原語・スペルは english、発音記号は pronunciation に分けます。',
        'categoryTags は単語そのものの種類・形式・由来（最大3個）、fieldTag は各意味が使われる領域・場面（意味あたり最大2個）、eraTag は単語全体の時代区分、other_tags は表示用ハッシュタグです。相互に代用せず、既存タグを優先して再利用してください。category は互換用に categoryTags の先頭と一致させてください。',
        '',
        buildTagPromptContext(),
        '',
        '対象語: （ここに単語名を入力）'
    ].join('\n');
}
async function copyAiPrompt() {
    const promptText = buildAiPrompt();
    try {
        await navigator.clipboard.writeText(promptText);
        alert('AIに送るプロンプトをコピーしました。');
    } catch (_) {
        const temporary = document.createElement('textarea');
        temporary.value = promptText;
        temporary.setAttribute('readonly', '');
        temporary.style.position = 'fixed';
        temporary.style.opacity = '0';
        document.body.appendChild(temporary);
        temporary.select();
        const copied = document.execCommand('copy');
        temporary.remove();
        alert(copied ? 'AIに送るプロンプトをコピーしました。' : 'コピーできませんでした。ブラウザーの権限を確認してください。');
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


const SUPABASE_CONFIG_KEY = 'nango_supabase_config_v1';
const SUPABASE_TABLE = 'nango_user_data';
let supabaseClient = null, supabaseClientConfigSignature = '', supabaseAuthSubscription = null;
let authUser = null, authSyncMode = 'local', authStatusMessage = '';
let cloudSaveQueue = Promise.resolve(), authActivationPromise = null, authActivationUserId = null;
function shouldUseLocalStorage(user, mode) { return !user || mode !== 'cloud'; }
let repositorySupabaseConfig = { url: '', publicKey: '' };
async function loadRepositorySupabaseConfig() {
    try {
        const response = await fetch(new URL('supabase-config.json', document.baseURI), { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const parsed = await response.json();
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('JSON のルートはオブジェクトにしてください。');
        const url = typeof parsed.url === 'string' ? parsed.url.trim() : '';
        const publicKey = typeof parsed.publicKey === 'string' ? parsed.publicKey.trim() : '';
        if (/service_role|sb_secret_/i.test(publicKey)) throw new Error('秘密鍵は設定ファイルに記述できません。');
        repositorySupabaseConfig = { url, publicKey };
    } catch (error) {
        repositorySupabaseConfig = { url: '', publicKey: '' };
        console.warn('supabase-config.json を読み込めませんでした。アカウント画面から設定できます。', error.message);
    }
}
function readSupabaseConfig() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(SUPABASE_CONFIG_KEY) || '{}'); }
    catch (_) { saved = {}; }
    const repositoryConfig = repositorySupabaseConfig && typeof repositorySupabaseConfig === 'object'
        ? repositorySupabaseConfig
        : {};
    const url = (typeof saved.url === 'string' && saved.url.trim()) || repositoryConfig.url || '';
    const key = (typeof saved.key === 'string' && saved.key.trim()) || repositoryConfig.publicKey || '';
    return {
        url: typeof url === 'string' ? url.trim().replace(/\/+$/, '') : '',
        key: typeof key === 'string' ? key.trim() : ''
    };
}
function initializeSupabaseClientFromStoredConfig() {
    const config = readSupabaseConfig();
    if (!config.url || !config.key) { supabaseClient = null; supabaseClientConfigSignature = ''; return null; }
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        setAuthStatus('Supabase のライブラリを読み込めません。ネットワーク接続を確認してページを再読み込みしてください。');
        return null;
    }
    const signature = config.url + '|' + config.key;
    if (supabaseClient && supabaseClientConfigSignature === signature) return supabaseClient;
    if (supabaseAuthSubscription && typeof supabaseAuthSubscription.unsubscribe === 'function') supabaseAuthSubscription.unsubscribe();
    supabaseAuthSubscription = null;
    try {
        supabaseClient = window.supabase.createClient(config.url, config.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
        supabaseClientConfigSignature = signature;
        return supabaseClient;
    } catch (error) {
        supabaseClient = null; supabaseClientConfigSignature = '';
        setAuthStatus('Supabase の接続設定を確認してください: ' + error.message);
        return null;
    }
}
function ensureSupabaseClient() {
    const client = initializeSupabaseClientFromStoredConfig();
    if (!client) throw new Error('Supabase のプロジェクト URL と公開用キーを先に設定してください。');
    return client;
}
function registerSupabaseAuthListener() {
    if (!supabaseClient || supabaseAuthSubscription) return;
    const result = supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') return;
        if (event === 'SIGNED_OUT') { if (authUser) handleSignedOut(); return; }
        if (session && session.user && (!authUser || authUser.id !== session.user.id)) Promise.resolve().then(() => activateAuthenticatedUser(session.user));
    });
    supabaseAuthSubscription = result && result.data ? result.data.subscription : null;
}
function setAuthStatus(message) {
    authStatusMessage = String(message || '');
    const status = document.getElementById('authStatus');
    if (status) status.textContent = authStatusMessage;
}
function getSupabaseRedirectUrl() { return window.location.origin + window.location.pathname; }
async function fetchCloudRow(userId) {
    const result = await ensureSupabaseClient().from(SUPABASE_TABLE).select('user_id, data, updated_at').eq('user_id', userId).maybeSingle();
    if (result.error) throw result.error;
    return result.data || null;
}
async function writeCloudDocument(document, userId = authUser && authUser.id) {
    if (!userId) throw new Error('ログイン状態を確認できません。');
    const result = await ensureSupabaseClient().from(SUPABASE_TABLE).upsert({
        user_id: userId,
        data: typeof document === 'string' ? JSON.parse(document) : document,
        updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (result.error) throw result.error;
}
function applyParsedDocument(parsed) {
    wordData = reassignIds(parsed.words.slice().sort((a, b) => (a.id || 0) - (b.id || 0)));
    additionalData = parsed.additional_data;
    refreshOpenState();
    currentWordId = wordData.length ? wordData[0].id : -1;
    renderSidebarTree();
    if (wordData.length) showTodaysWord(); else showViewMode();
}
function applyDocumentValue(value) { applyParsedDocument(parseNangoDocument(value)); }
function loadLocalDocumentIntoMemory() {
    const localSaved = localStorage.getItem(STORAGE_KEY);
    if (localSaved) applyDocumentValue(JSON.parse(localSaved));
    else {
        wordData = reassignIds(clone(defaultData).map(word => ({ ...word, categoryTags: normalizeCategoryTags(word.categoryTags, word.category) })));
        additionalData = [];
        refreshOpenState();
        currentWordId = wordData.length ? wordData[0].id : -1;
        renderSidebarTree();
        if (wordData.length) showTodaysWord(); else showViewMode();
    }
}
async function activateAuthenticatedUser(user, forceRetry = false) {
    if (!user || !user.id) return;
    if (!forceRetry && authUser && authUser.id === user.id && authSyncMode === 'cloud') { refreshAuthPanel(); return; }
    if (authActivationPromise && authActivationUserId === user.id) return authActivationPromise;
    authActivationUserId = user.id;
    authActivationPromise = (async () => {
        const priorUser = authUser;
        if (priorUser && priorUser.id !== user.id) {
            try { loadLocalDocumentIntoMemory(); } catch (error) { console.warn('ローカルデータを読み込めませんでした:', error); }
        }
        authUser = user; authSyncMode = 'pending';
        setAuthStatus('アカウントとクラウドデータを確認しています…');
        refreshAuthPanel();
        try {
            const row = await fetchCloudRow(user.id);
            if (row) {
                const parsed = parseNangoDocument(row.data);
                authSyncMode = 'cloud';
                applyParsedDocument(parsed);
                showStorageStatus('Supabase クラウドに接続中');
                setAuthStatus('クラウド上の辞書を読み込みました。ログイン前の localStorage データは上書きせず残しています。');
            } else {
                authSyncMode = 'cloud';
                await writeCloudDocument(serializeNangoDocument(), user.id);
                showStorageStatus('Supabase クラウドに保存済み');
                setAuthStatus('このアカウントにクラウド辞書を作成しました。現在の辞書データを初回保存しました。');
            }
        } catch (error) {
            authSyncMode = 'pending';
            showStorageStatus('クラウド同期を保留中（ローカル保存）', true);
            setAuthStatus('クラウドを読み込めないため、ローカル保存に切り替えました。クラウド側のデータは上書きしていません。設定と RLS を確認し「クラウド再接続」を実行してください。詳細: ' + error.message);
            try { saveToLocalStorage(); } catch (saveError) { console.error('ローカルへの退避保存に失敗しました:', saveError); }
        } finally { refreshAuthPanel(); }
    })();
    try { await authActivationPromise; }
    finally { authActivationPromise = null; authActivationUserId = null; }
}
function handleSignedOut() {
    authUser = null; authSyncMode = 'local'; authStatusMessage = '';
    try {
        loadLocalDocumentIntoMemory();
        if (!localStorage.getItem(STORAGE_KEY)) saveToLocalStorage();
    } catch (error) {
        console.error('ログアウト後にローカルデータを読み込めませんでした:', error);
        wordData = reassignIds(clone(defaultData)); additionalData = [];
        try { saveToLocalStorage(); } catch (_) {}
        showViewMode();
    }
    showStorageStatus('ブラウザー内のローカル保存を使用中');
    setAuthStatus('ログアウトしました。ローカル保存データを表示しています。');
    refreshAuthPanel();
}
async function signInToNango() {
    try {
        const client = ensureSupabaseClient(); registerSupabaseAuthListener();
        const email = document.getElementById('authEmail').value.trim(), password = document.getElementById('authPassword').value;
        if (!email || !password) throw new Error('メールアドレスとパスワードを入力してください。');
        setAuthStatus('ログインしています…');
        const result = await client.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        if (result.data && result.data.user) await activateAuthenticatedUser(result.data.user);
        setAuthStatus(result.data && result.data.user ? 'ログインしました。' : 'ログイン状態を確認できませんでした。');
    } catch (error) { setAuthStatus('ログインできませんでした: ' + error.message); }
}
async function signUpToNango() {
    try {
        const client = ensureSupabaseClient(); registerSupabaseAuthListener();
        const email = document.getElementById('authEmail').value.trim(), password = document.getElementById('authPassword').value;
        if (!email || !password) throw new Error('メールアドレスとパスワードを入力してください。');
        if (password.length < 8) throw new Error('パスワードは8文字以上にしてください。');
        const consent = document.getElementById('privacyPolicyConsent');
        if (!consent || !consent.checked) throw new Error('プライバシーポリシーを読み、同意欄にチェックしてください。');
        setAuthStatus('アカウントを作成しています…');
        const result = await client.auth.signUp({ email, password, options: { emailRedirectTo: getSupabaseRedirectUrl() } });
        if (result.error) throw result.error;
        if (result.data && result.data.session && result.data.user) {
            await activateAuthenticatedUser(result.data.user);
            setAuthStatus('アカウントを作成し、ログインしました。');
        } else setAuthStatus('登録を受け付けました。メール確認を有効にしている場合は確認メールを開いてください。');
    } catch (error) { setAuthStatus('アカウントを作成できませんでした: ' + error.message); }
}
async function signOutOfNango() {
    try {
        const client = ensureSupabaseClient();
        setAuthStatus('ログアウトしています…');
        await cloudSaveQueue;
        const result = await client.auth.signOut();
        if (result.error) throw result.error;
        if (authUser) handleSignedOut();
    } catch (error) { setAuthStatus('ログアウトできませんでした: ' + error.message); }
}
async function saveSupabaseConfig() {
    try {
        if (authUser) throw new Error('接続先の変更は、先にログアウトしてから行ってください。');
        const url = document.getElementById('supabaseProjectUrl').value.trim().replace(/\/+$/, '');
        const key = document.getElementById('supabasePublicKey').value.trim();
        if (!/^https:\/\/[^/]+$/.test(url)) throw new Error('Supabase URL は https:// から始まるプロジェクト URL を入力してください。');
        if (!key) throw new Error('Supabase の公開用キーを入力してください。service_role キーは使用しないでください。');
        if (/service_role|sb_secret_/i.test(key)) throw new Error('service_role / secret key はブラウザーで使用できません。公開用 publishable / anon キーを入力してください。');
        localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify({ url, key }));
        if (supabaseAuthSubscription && typeof supabaseAuthSubscription.unsubscribe === 'function') supabaseAuthSubscription.unsubscribe();
        supabaseClient = null; supabaseClientConfigSignature = ''; supabaseAuthSubscription = null;
        const client = initializeSupabaseClientFromStoredConfig();
        if (!client) throw new Error('Supabase クライアントを初期化できませんでした。');
        registerSupabaseAuthListener();
        const sessionResult = await client.auth.getSession();
        if (sessionResult.error) throw sessionResult.error;
        if (sessionResult.data && sessionResult.data.session && sessionResult.data.session.user) await activateAuthenticatedUser(sessionResult.data.session.user);
        else setAuthStatus('接続設定を保存しました。メールアドレスとパスワードでログインするか、新規登録してください。');
        refreshAuthPanel();
    } catch (error) { setAuthStatus('接続設定を保存できませんでした: ' + error.message); }
}
function clearSupabaseConfig() {
    if (authUser) { setAuthStatus('接続設定を削除する前にログアウトしてください。'); return; }
    if (!confirm('このブラウザーの Supabase 上書き設定を削除しますか？辞書データや Supabase 側のアカウントは削除されません。リポジトリ既定値が設定されている場合は、その値に戻ります。')) return;
    localStorage.removeItem(SUPABASE_CONFIG_KEY);
    if (supabaseAuthSubscription && typeof supabaseAuthSubscription.unsubscribe === 'function') supabaseAuthSubscription.unsubscribe();
    supabaseAuthSubscription = null; supabaseClient = null; supabaseClientConfigSignature = '';
    setAuthStatus('ブラウザーの上書き設定を削除しました。リポジトリ既定値がある場合は、その値を使用します。');
    refreshAuthPanel();
}
function refreshAuthPanel() {
    const loggedOut = document.getElementById('authLoggedOutControls'), loggedIn = document.getElementById('authLoggedInControls');
    const cloudActions = document.getElementById('authCloudActions'), accountLabel = document.getElementById('authAccountLabel');
    const retryButton = document.getElementById('retryCloudConnectionBtn'), config = readSupabaseConfig();
    const urlInput = document.getElementById('supabaseProjectUrl'), keyInput = document.getElementById('supabasePublicKey');
    if (urlInput && !urlInput.value && config.url) urlInput.value = config.url;
    if (keyInput && !keyInput.value && config.key) keyInput.value = config.key;
    if (loggedOut) loggedOut.style.display = authUser ? 'none' : 'block';
    if (loggedIn) loggedIn.style.display = authUser ? 'block' : 'none';
    if (cloudActions) cloudActions.style.display = authUser ? 'block' : 'none';
    if (accountLabel) accountLabel.textContent = authUser ? (authUser.email || 'ログイン中') : '未ログイン';
    if (retryButton) retryButton.style.display = authUser && authSyncMode !== 'cloud' ? 'inline-flex' : 'none';
    if (!authStatusMessage) {
        if (!config.url || !config.key) setAuthStatus('未設定です。Supabase プロジェクト URL と公開用キーを設定してください。');
        else if (!supabaseClient) setAuthStatus('Supabase クライアントを初期化できません。公開 URL・キーとネットワークを確認してください。');
        else if (authUser && authSyncMode === 'cloud') setAuthStatus('ログイン中です。辞書データを Supabase に保存します。');
        else if (authUser && authSyncMode === 'pending') setAuthStatus('クラウド同期が保留中です。確認が完了するまでローカル保存を使用します。');
        else setAuthStatus('設定済みです。ログインすると辞書をクラウドに保存できます。');
    }
}
function showAuthPanel() {
    showAuxPanel('authPanelMode', 'auth', false);
    const config = readSupabaseConfig();
    const urlInput = document.getElementById('supabaseProjectUrl'), keyInput = document.getElementById('supabasePublicKey');
    if (urlInput) urlInput.value = config.url;
    if (keyInput) keyInput.value = config.key;
    refreshAuthPanel();
}
async function retryCloudConnection() {
    if (!authUser) { setAuthStatus('先にログインしてください。'); return; }
    await activateAuthenticatedUser(authUser, true);
}
async function reloadCloudDocument() {
    if (!authUser) return;
    if (!confirm('現在の画面上の辞書を、クラウド上の辞書で置き換えますか？保存済みのクラウドデータを再読み込みします。')) return;
    try {
        const row = await fetchCloudRow(authUser.id);
        if (!row) throw new Error('このアカウントにはまだクラウド辞書がありません。');
        const parsed = parseNangoDocument(row.data);
        authSyncMode = 'cloud'; applyParsedDocument(parsed);
        setAuthStatus('クラウド辞書を再読み込みしました。');
        showStorageStatus('Supabase クラウドに接続中'); refreshAuthPanel();
    } catch (error) { setAuthStatus('クラウド辞書を読み込めませんでした: ' + error.message); }
}
async function copyLocalDocumentToCloud() {
    if (!authUser) return;
    const localRaw = localStorage.getItem(STORAGE_KEY);
    if (!localRaw) { setAuthStatus('このブラウザーにコピー元の localStorage データがありません。'); return; }
    let parsed;
    try { parsed = parseNangoDocument(JSON.parse(localRaw)); }
    catch (error) { setAuthStatus('localStorage のデータを読み込めませんでした: ' + error.message); return; }
    if (!confirm('このブラウザーに保存されているローカル辞書 ' + parsed.words.length + ' 件で、アカウント「' + (authUser.email || authUser.id) + '」のクラウド辞書を置き換えます。クラウドの現在の内容は上書きされます。続行しますか？')) return;
    try {
        authSyncMode = 'pending';
        await writeCloudDocument(JSON.parse(localRaw), authUser.id);
        authSyncMode = 'cloud'; applyParsedDocument(parsed);
        setAuthStatus('ローカル辞書をクラウドへコピーしました。以後の変更は Supabase に保存されます。');
        showStorageStatus('Supabase クラウドに保存済み'); refreshAuthPanel();
    } catch (error) {
        authSyncMode = 'pending';
        setAuthStatus('クラウドへのコピーに失敗しました。ローカルデータは変更していません。詳細: ' + error.message);
        refreshAuthPanel();
    }
}


// Expose small pure helpers for browser console/manual tests.
window.NangoPhase1 = { parseNangoDocument, serializeNangoDocument, normalizeWord, validateWord, findDuplicateIndex, mergeWord, shouldUseLocalStorage, get data() { return clone(wordData); } };
initApp();
