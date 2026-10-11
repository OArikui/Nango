/* Run from repository root: node test_or_future/phase1_smoke.test.js */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const jsPath = path.join(root, 'Nango-neo', 'Nango_main.v01.7.2.js');
const htmlPath = path.join(root, 'Nango-neo', 'Nango-neo.v02.7.2.html');
const cssPath = path.join(root, 'Nango-neo', 'style.v02.7.2.css');
const schemaPath = path.join(root, 'Nango-neo', 'DTformats.neo.v5.15', 'DF-FMT_schema.v01.15.json');
const instructionPath = path.join(root, 'Nango-neo', 'DTformats.neo.v5.15', 'DT-FMT_instruction_AI.v01.15.json');

let source = fs.readFileSync(jsPath, 'utf8');
source = source.replace(/\/\/ Expose small pure helpers for browser console\/manual tests\.[\s\S]*$/, '');
const api = new Function(source + '\nreturn { parseNangoDocument, serializeNangoDocument, normalizeWord, normalizeCategoryTags, normalizeMeaning, validateWord, findDuplicateIndex, mergeWord, reassignIds, getInitial, getWordListGroupLabel };')();

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
  fieldTag: ['IT・科学', '法律']
});
assert.deepEqual(fieldTags.fieldTag, ['IT', '科学', '法律'], 'legacy joined meaning-level tags normalize to independent entries');

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
const css = fs.readFileSync(cssPath, 'utf8');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const instructions = JSON.parse(fs.readFileSync(instructionPath, 'utf8'));
assert.match(html, /NANGO-NEO <strong>v2\.7\.2<\/strong>/, 'HTML version is updated');
assert.match(html, /Nango_main\.v01\.7\.2\.js/, 'HTML references the versioned JavaScript');
assert.match(html, /style\.v02\.7\.2\.css/, 'HTML references the versioned stylesheet');
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
assert.match(html, /data-column-sort="fieldTags">分野タグ/, 'domain tags have their own word-list column');
assert.match(html, /data-column-sort="eraTag">時代タグ/, 'era tags have their own word-list column');
assert.match(html, /data-column-sort="other">その他タグ/, 'other tags remain separately visible');
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
console.log('Nango-NEO v2.7.2 smoke tests passed.');
