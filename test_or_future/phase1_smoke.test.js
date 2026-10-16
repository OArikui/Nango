/* Run from repository root: node test_or_future/phase1_smoke.test.js */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const jsPath = path.join(root, 'Nango-neo', 'Nango_main.v01.8.0.js');
const htmlPath = path.join(root, 'Nango-neo', 'Nango-neo.v02.9.0.html');
const cssPath = path.join(root, 'Nango-neo', 'style.v02.8.0.css');
const schemaPath = path.join(root, 'Nango-neo', 'DTformats.neo.v5.17', 'DF-FMT_schema.v01.17.json');
const instructionPath = path.join(root, 'Nango-neo', 'DTformats.neo.v5.17', 'DT-FMT_instruction_AI.v01.17.json');
const supabaseSqlPath = path.join(root, 'docs', 'supabase-setup.sql');
const supabaseGuidePath = path.join(root, 'docs', 'SUPABASE_AUTH.md');

let source = fs.readFileSync(jsPath, 'utf8');
source = source.replace(/\/\/ Expose small pure helpers for browser console\/manual tests\.[\s\S]*$/, '');
const api = new Function(source + '\nreturn { parseNangoDocument, serializeNangoDocument, normalizeWord, normalizeCategoryTags, normalizeMeaning, validateWord, findDuplicateIndex, mergeWord, reassignIds, getInitial, getWordListGroupLabel, buildAiPrompt, shouldUseLocalStorage };')();
const generatedPrompt = api.buildAiPrompt();
assert.ok(generatedPrompt.includes('\n'), 'AI prompt is separated with actual newlines');
assert.equal(generatedPrompt.includes('\\n'), false, 'AI prompt does not contain escaped newline text');

const supabaseSql = fs.readFileSync(supabaseSqlPath, 'utf8');
const supabaseGuide = fs.readFileSync(supabaseGuidePath, 'utf8');
const htmlSource = fs.readFileSync(htmlPath, 'utf8');
assert.equal(api.shouldUseLocalStorage(null, 'local'), true, 'anonymous sessions persist to localStorage');
assert.equal(api.shouldUseLocalStorage({ id: 'user-1' }, 'pending'), true, 'pending cloud sync preserves local persistence');
assert.equal(api.shouldUseLocalStorage({ id: 'user-1' }, 'cloud'), false, 'active authenticated sessions use cloud persistence');
assert.match(source, /supabase\.createClient/, 'browser client initializes Supabase without a server API');
assert.match(source, /from\(SUPABASE_TABLE\)[\s\S]*?upsert/, 'authenticated data saves through the Supabase Data API');
assert.match(htmlSource, /supabase-js@2/, 'Supabase JS v2 is loaded for GitHub Pages');
assert.match(htmlSource, /id="authPanelMode"/, 'account and login panel is included');
assert.match(supabaseSql, /enable row level security/i, 'RLS is enabled for the personal data table');
assert.match(supabaseSql, /auth\.uid\(\)[\s\S]*?user_id/i, 'policies scope row access to the authenticated user');
for (const action of ['select', 'insert', 'update', 'delete']) {
  assert.match(supabaseSql, new RegExp('for ' + action, 'i'), 'RLS policy is present for ' + action);
}
assert.match(supabaseGuide, /GitHub Pages/i, 'Supabase setup guide documents GitHub Pages');
assert.match(supabaseGuide, /service_role/i, 'setup guide warns against exposing service_role keys');

const canonical = {
  words: {
    'カスケード': {
      id: 90,
      datetime: '2026-10-09T10:00:00+09:00',
      category: '外来語',
      categoryTags: ['外来語', '専門用語'],
      eraTag: '現代',
      reading: 'かすけーど',
      kanji: '',
      english: 'cascade',
      pronunciation: '/ˈkæskeɪd/',
      column: '',
      memo: '',
      gemini_note: '',
      other_tags: ['IT'],
      meanings: [
        { definition: '意味A', background: '', nuance: '', fieldTag: ['IT'], examples: ['例1'], synonyms: ['連鎖'] },
        { definition: '意味B', background: '背景B', nuance: '', fieldTag: ['科学'], examples: [], synonyms: [] }
      ]
    }
  },
  additional_data: []
};

const parsed = api.parseNangoDocument(canonical);
assert.equal(parsed.words.length, 1, 'canonical words object is parsed');
assert.equal(parsed.words[0].meanings.length, 2, 'multiple meanings are retained');
assert.equal(parsed.words[0].id, 90, 'existing ID is read before reassignment');
assert.equal(parsed.words[0].categoryTags.length, 2, 'multiple classification tags are preserved');
assert.equal(parsed.words[0].pronunciation, '/ˈkæskeɪd/', 'pronunciation is kept as a separate property');

const migrated = api.parseNangoDocument({
  words: {
    '旧形式': {
      category: '大和言葉',
      meanings: [{ definition: '古い形式の定義', fieldTag: ['日本語史'] }]
    }
  }
});
assert.deepEqual(migrated.words[0].categoryTags, ['大和言葉'], 'legacy category becomes a classification-tag fallback');

const categoryList = api.normalizeCategoryTags('大和言葉, 専門用語、略語\n外来語');
assert.deepEqual(categoryList, ['大和言葉', '専門用語', '略語', '外来語'], 'classification tags split by commas and newlines');

const fieldTags = api.normalizeMeaning({
  definition: '定義',
  fieldTag: ['IT・科学', '法律'],
  antonyms: ['逆語'],
  similarWordsDifference: '似た語Aよりも範囲が広い。'
});
assert.deepEqual(fieldTags.fieldTag, ['IT', '科学', '法律'], 'legacy joined meaning-level tags normalize to independent entries');
assert.deepEqual(fieldTags.antonyms, ['逆語'], 'antonyms are retained');
assert.equal(fieldTags.similarWordsDifference, '似た語Aよりも範囲が広い。', 'similar-word distinction is retained');
assert.match(generatedPrompt, /すべての単語項目・意味項目を省略せず/, 'AI prompt preserves required schema keys');
assert.match(generatedPrompt, /memo はユーザー本人が後から記入する補足メモ欄なので、AI が内容を埋める必要はありません/, 'memo content is not required from AI');
assert.match(generatedPrompt, /値は必ず空文字にしてください/, 'AI prompt leaves memo empty');
assert.match(generatedPrompt, /対義語/, 'AI prompt explains antonyms');
assert.match(generatedPrompt, /似た言葉との違い/, 'AI prompt explains comparisons');
assert.match(generatedPrompt, /読み応えのある文章/, 'AI prompt asks for substantive explanations');

const legacyParentheses = api.parseNangoDocument({
  words: {
    'カスケード（かすけーど）': {
      category: '外来語',
      reading: 'かすけーど',
      english: 'cascade',
      meanings: [{ definition: '定義' }]
    },
    '啓蒙（けいもう）': {
      category: '漢語',
      reading: 'けいもう',
      kanji: '啓蒙',
      meanings: [{ definition: '定義' }]
    }
  }
});
assert.deepEqual(legacyParentheses.words.map(item => item.word), ['カスケード', '啓蒙'], 'legacy parenthetical readings are removed');

const exported = api.serializeNangoDocument(api.reassignIds(parsed.words));
assert.ok(exported.words['カスケード'], 'export remains keyed by headword');
assert.equal(exported.words['カスケード'].id, 1, 'export IDs are assigned in registration order');
assert.equal('word' in exported.words['カスケード'], false, 'headword is not duplicated inside entry');
assert.deepEqual(exported.words['カスケード'].categoryTags, ['外来語', '専門用語'], 'category tags survive round-trip');
assert.equal(exported.words['カスケード'].pronunciation, '/ˈkæskeɪd/', 'pronunciation survives round-trip');

const mergeCandidate = api.normalizeWord({
  word: 'カスケード',
  category: '略語',
  categoryTags: ['略語'],
  pronunciation: '/ˈkæskeɪd/',
  meanings: [{ definition: '意味A', fieldTag: ['工学'] }]
}, 'カスケード');
const merged = api.mergeWord(parsed.words[0], mergeCandidate);
assert.deepEqual(merged.categoryTags, ['外来語', '専門用語', '略語'], 'classification tags merge within the three-tag cap');
assert.deepEqual(merged.meanings[0].fieldTag, ['IT', '工学'], 'domain tags merge within the two-tag per-meaning cap');

assert.throws(() => api.parseNangoDocument({ words: { '未定義': { meanings: [{ background: '定義なし' }] } } }), /definition/, 'missing required definition is rejected');
assert.throws(() => api.parseNangoDocument({ words: { '日時不正': { datetime: 'yyyymmdd_HHMM', meanings: [{ definition: '定義' }] } } }), /RFC 3339/, 'invalid canonical date is rejected');

const html = fs.readFileSync(htmlPath, 'utf8');
const faviconPath = path.join(root, 'Nango-neo', 'nango-logo.svg');
const favicon = fs.readFileSync(faviconPath, 'utf8');
assert.ok(html.includes('href="nango-logo.svg"'), 'browser tab references the Nango favicon');
assert.ok(favicon.includes('<svg'), 'favicon is an SVG image');
const css = fs.readFileSync(cssPath, 'utf8');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const instructions = JSON.parse(fs.readFileSync(instructionPath, 'utf8'));
const template = JSON.parse(fs.readFileSync(path.join(root, 'Nango-neo', 'DTformats.neo.v5.17', 'DT-FMT_template.v02.17.json'), 'utf8'));
assert.match(html, /NANGO-NEO <strong>v2\.8\.2<\/strong>/, 'HTML version is updated');
assert.match(html, /Version 2\.8\.2"/, 'HTML app-name meta carries the app version');
assert.match(html, /Nango_main\.v01\.7\.5\.js/, 'HTML references the versioned JavaScript');
assert.match(html, /style\.v02\.7\.3\.css/, 'HTML references the versioned stylesheet');
assert.match(html, /id="wordListAlphabetJump"/, 'word list includes initial navigation');
assert.match(html, /id="formatPanelMode"/, 'read-only DT-FMT view is included');
assert.match(css, /\.section-block-ai/, 'AI note has a distinct style');
assert.equal(schema.$defs.word.properties.categoryTags.maxItems, 3, 'schema caps classification tags at three');
assert.equal(schema.$defs.meaning.properties.fieldTag.maxItems, 2, 'schema caps domain tags at two per meaning');
assert.match(instructions['//comment_classification'], /分類タグは/,'AI instructions define classification tags');
assert.match(instructions['//comment_classification'], /分野タグは/,'AI instructions separate domain tags');
assert.match(instructions['//comment_tags'], /ハッシュタグ/,'AI instructions separate other hashtag tags');

assert.equal(api.getInitial({ word: 'Alpha', reading: 'あるふぁ' }), 'A', 'Latin initials are grouped one letter at a time');
assert.equal(api.getInitial({ word: '２番' }), '2', 'full-width digits normalize to individual numeric groups');
assert.equal(api.getInitial({ word: 'あいう' }), 'あ', 'hiragana words group by the first character');
assert.equal(api.getInitial({ word: 'カタカナ' }), 'カ', 'katakana words group by the first character');
assert.equal(api.getInitial({ word: '漢字', reading: 'かんじ' }), '漢字', 'kanji words use the shared kanji group rather than their reading');
assert.equal(api.getInitial({ word: '#tag' }), '記号・その他', 'symbols share the symbol-and-other group');
assert.equal(api.getWordListGroupLabel({ word: '漢字' }, 'word'), '漢字', 'word-sort groups use headword character classes');
assert.match(source, /data-column-sort="fieldTags">分野タグ/, 'domain tags have their own word-list column');
assert.match(source, /data-column-sort="eraTag">時代タグ/, 'era tags have their own word-list column');
assert.match(source, /data-column-sort="other">その他タグ/, 'other tags remain separately visible');
assert.match(html, /onclick="showFormatPanel\(\)">DT-FMT定義を確認/, 'DT-FMT is accessible from settings');
assert.match(css, /\.toolbar::after \{ display: none; \}/, 'the redundant lower toolbar separator is removed');
assert.match(css, /--nango-sticky-group-top/, 'group headings stay visible during table scrolling');
assert.match(css, /\.sidebar-filter-zone/, 'sidebar tag search sits under the search box');

assert.match(source, /function toggleCategoryFilterPopup\(/, 'sidebar classification filtering is implemented');
assert.match(source, /function renderWordListCategoryFilters\(/, 'word list category filtering is implemented');
assert.match(source, /function renderFormatViewer\(/, 'read-only format viewer is implemented');
assert.match(source, /function saveDataPath\(/, 'save path settings are implemented');

assert.match(html, /id="wordListFiltersToggle"/, 'word-list filters are hidden behind a settings toggle');
assert.match(html, /id="wordListCategoryFilters"[^>]*style="display:none"/, 'word-list category filter starts hidden');
assert.match(html, /id="wordListGroupJumpMenu"/, 'group divider jump menu is available');
assert.match(source, /function getWordListGroupLabel\(/, 'word-list groups follow the active sort column');
assert.match(source, /function toggleWordListFilters\(/, 'word-list filters open only on demand');
assert.match(source, /data-jump-group/, 'group jump menu targets another group');
assert.match(source, /function setHierarchyStructure[\s\S]*setGroupDisplay\(true\)/, 'setting a hierarchy automatically enables grouping');
assert.match(css, /\.toolbar\s*\{[^}]*position:\s*sticky/s, 'toolbar remains visible while scrolling');
assert.match(css, /\.filter-popover\s*\{[^}]*position:\s*absolute/s, 'filter popovers do not shift page layout');
assert.match(html, /id="sidebarWordDisplayMode"/, 'display mode is controlled above the sidebar filters');
assert.doesNotMatch(html, /id="wordDisplayMode"/, 'detail toolbar display mode is removed');
assert.doesNotMatch(html, /id="wordListSort"|id="wordListDirection"/, 'duplicated sort controls are removed');
assert.match(html, /onclick="copyAiPrompt\(\)">AIに送るプロンプトをコピー/, 'AI prompt copy action is available');
assert.match(html, /id="pageBackBtn"[\s\S]*戻る/, 'back navigation is present with a label');
assert.match(html, /id="pageForwardBtn"[\s\S]*進む/, 'forward navigation is present with a label');
assert.match(source, /function setSidebarWordDisplayMode\(/, 'sidebar display mode is implemented');
assert.match(source, /function copyAiPrompt\(/, 'AI prompt copy action is implemented');
assert.match(source, /function readClipboardToPaste\(/, 'clipboard read action is implemented');
assert.match(html, /onclick="readClipboardToPaste\(\)">クリップボードから貼り付け/, 'clipboard read button is available');
assert.match(source, /input\.value = clipboardText;\s*await importPastedJSON\(\);/, 'clipboard read immediately imports the retrieved JSON');
assert.match(source, /function installKeyboardNavigation\(/, 'left/right keyboard navigation is implemented');
assert.match(source, /function showWordListForWord\(/, 'new entries open a filtered word list');
assert.match(source, /function showWordListForWords\(/, 'multiple imported entries can be filtered in the word list');
assert.match(source, /if \(savedFromNewEntry\) showWordListForWord\(currentWordId\)/, 'saving a new entry transitions to its filtered list');
assert.match(source, /if \(importedWordIds\.length\) showWordListForWords\(importedWordIds\)/, 'replace import shows the imported words');
assert.match(source, /if \(uniqueImportedWordIds\.length\) showWordListForWords\(uniqueImportedWordIds\)/, 'merge import shows imported and merged words');
assert.match(source, /filter\.type === 'wordIds'.*?filter\.wordIds\.includes\(Number\(word\.id\)\)/s, 'word list filter supports multiple imported word IDs');
assert.equal(Object.keys(schema.$defs.word.properties)[0], 'pronunciation', 'pronunciation leads word-level schema properties');
assert.equal(Object.keys(template.words['単語名'])[0], 'pronunciation', 'pronunciation leads template properties');
assert.equal(Object.keys(instructions.words['単語名（表記）'])[0], 'pronunciation', 'pronunciation leads AI example properties');
assert.ok('antonyms' in template.words['単語名'].meanings[0], 'template includes antonyms');
assert.ok('similarWordsDifference' in template.words['単語名'].meanings[0], 'template includes comparison field');
assert.ok('antonyms' in instructions.words['単語名（表記）'].meanings[0], 'AI instruction includes antonyms');
assert.ok('similarWordsDifference' in instructions.words['単語名（表記）'].meanings[0], 'AI instruction includes comparison field');
assert.ok(schema.$defs.meaning.required.includes('antonyms'), 'schema requires antonyms');
assert.ok(schema.$defs.meaning.required.includes('similarWordsDifference'), 'schema requires word distinctions');
assert.match(css, /\.word-list-open\s*\{[^}]*border:\s*0/s, 'headword buttons are borderless');
assert.match(css, /\.sidebar-control\s*\{[^}]*flex-direction:\s*column/s, 'sidebar popups use flow layout');
console.log('Nango-NEO v2.8.2 smoke tests passed.');
