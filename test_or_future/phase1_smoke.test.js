/* Run from repository root: node test_or_future/phase1_smoke.test.js */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sourcePath = path.join(__dirname, '..', 'Nango-neo', 'Nango_main.v01.3.0.js');
let source = fs.readFileSync(sourcePath, 'utf8');
source = source.replace(/\/\/ Expose small pure helpers for browser console\/manual tests\.[\s\S]*$/, '');
const api = new Function(`${source}\nreturn { parseNangoDocument, serializeNangoDocument, normalizeWord, validateWord, findDuplicateIndex, mergeWord, reassignIds };`)();

const canonical = {
  words: {
    'カスケード': {
      id: 90,
      datetime: '2026-10-09T10:00:00+09:00',
      category: '外来語', eraTag: '現代', reading: 'かすけーど', kanji: '', english: 'cascade',
      column: '', memo: '', gemini_note: '', other_tags: ['IT'],
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
assert.equal(parsed.words[0].word, 'カスケード', 'foreign word display name omits parenthetical reading');
const legacyParentheses = api.parseNangoDocument({ words: { 'カスケード（かすけーど）': { category: '外来語', reading: 'かすけーど', english: 'cascade', meanings: [{ definition: '定義' }] }, '啓蒙（けいもう）': { category: '漢語', reading: 'けいもう', kanji: '啓蒙', meanings: [{ definition: '定義' }] } } });
assert.deepEqual(legacyParentheses.words.map(item => item.word), ['カスケード', '啓蒙'], 'legacy parenthetical reading suffixes are removed');

const joinedTags = api.parseNangoDocument({ words: { 'タグ移行': { meanings: [{ definition: '定義', fieldTag: ['IT・美容・ライフスタイル', '工学'] }] } } });
assert.deepEqual(joinedTags.words[0].meanings[0].fieldTag, ['IT', '美容', 'ライフスタイル', '工学'], 'middle-dot joined field tags are migrated into independent tags');
const properNameTag = api.parseNangoDocument({ words: { '固有名詞タグ': { other_tags: ['チーム・バチスタ'], meanings: [{ definition: '定義', fieldTag: ['IT・Web'] }] } } });
assert.deepEqual(properNameTag.words[0].other_tags, ['チーム・バチスタ'], 'middle dot inside a proper-name other tag is preserved');
assert.deepEqual(properNameTag.words[0].meanings[0].fieldTag, ['IT', 'Web'], 'middle-dot domain separator is split in fieldTag');

const exported = api.serializeNangoDocument(api.reassignIds(parsed.words));
assert.ok(exported.words['カスケード'], 'export is keyed by headword only');
assert.equal(exported.words['カスケード'].id, 1, 'export IDs follow registration order after reassignment');
assert.equal('word' in exported.words['カスケード'], false, 'word name is not redundantly stored inside the entry');
assert.equal(exported.words['カスケード'].meanings.length, 2, 'export retains each meaning');

const oldArray = api.parseNangoDocument([
  { id: 44, word: '旧形式', category: 'その他', meaning: '旧定義', background: '旧背景', nuance: '', fieldTag: '旧タグ', examples: ['旧例'], synonyms: ['旧語'] }
]);
assert.equal(oldArray.words[0].meanings[0].definition, '旧定義', 'old array format is migrated');
assert.deepEqual(oldArray.words[0].meanings[0].fieldTag, ['旧タグ'], 'old single fieldTag is migrated to a list');

const markedRequired = api.parseNangoDocument({ words: { 'マーカー': { meanings: [{ 'definition$': '必須キー末尾マーカーを移行' }] } } });
assert.equal(markedRequired.words[0].meanings[0].definition, '必須キー末尾マーカーを移行', 'legacy $ field markers are normalized');
assert.throws(() => api.parseNangoDocument({ words: { '未定義': { meanings: [{ background: '定義なし' }] } } }), /definition/, 'missing required definition is rejected');
assert.throws(() => api.parseNangoDocument({ words: { '日時不正': { datetime: 'yyyymmdd_HHMM', meanings: [{ definition: '定義' }] } } }), /RFC 3339/, 'invalid canonical date is rejected');

const duplicateCandidate = api.normalizeWord({ word: 'カスケード', meanings: [{ definition: '別定義' }] }, 'カスケード');
assert.equal(api.findDuplicateIndex(duplicateCandidate, parsed.words), 0, 'parenthesized spelling variants are treated as duplicates');
const merged = api.mergeWord(parsed.words[0], api.normalizeWord({ word: 'カスケード', category: '外来語', meanings: [{ definition: '意味A', fieldTag: ['工学'], examples: ['例2'], synonyms: ['波及'] }] }, 'カスケード'));
assert.ok(merged.meanings[0].fieldTag.includes('工学'), 'list tags merge without removing existing values');
assert.ok(merged.meanings[0].examples.includes('例2'), 'examples merge without removing existing values');
assert.ok(merged.meanings[0].synonyms.includes('波及'), 'synonyms merge without removing existing values');

assert.match(source, /function showWordList\(\)/, 'word list view is implemented');
assert.match(source, /function renderWordList\(\)/, 'word list rendering and filtering are implemented');
const hardKanji = api.parseNangoDocument({ words: { '啓蒙': { category: '漢語', reading: 'けいもう', kanji: '啓蒙', meanings: [{ definition: '定義' }] } } });
assert.equal(hardKanji.words[0].word, '啓蒙', 'kanji display name omits parenthetical reading');
const foreignKey = api.parseNangoDocument({ words: { 'URI': { category: '外来語・略語', reading: 'ゆーあーるあい', english: 'Uniform Resource Identifier', meanings: [{ definition: '定義' }] } } });
assert.equal(foreignKey.words[0].word, 'URI', 'original language remains in english and display name omits parentheses');
assert.match(source, /function showWordsForTag\(type, tag\)/, 'tag links open matching words');
assert.match(source, /wordListDirection/, 'word list supports ascending and descending order');
console.log('Phase 1 JavaScript smoke tests: updated assertions passed.');
