/* Run from repository root: node test_or_future/phase1_smoke.test.js */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
// Shipped file names are discovered from disk so a release only has to rename files, not edit this test.
const appDir = path.join(root, 'Nango-neo');
const pick = (dir, pattern) => {
  const found = fs.readdirSync(dir).filter((name) => pattern.test(name));
  assert.equal(found.length, 1, `exactly one file matching ${pattern} expected in ${dir}, found: ${found}`);
  return found[0];
};
const htmlName = pick(appDir, /^Nango-neo\.v\d+\.\d+\.\d+\.html$/);
const jsName = pick(appDir, /^Nango_main\.v\d+\.\d+\.\d+\.js$/);
const cssName = pick(appDir, /^style\.v\d+\.\d+\.\d+\.css$/);
const formatDirName = pick(appDir, /^DTformats\.neo\.v\d+\.\d+$/);
const formatDir = path.join(appDir, formatDirName);
const appVersion = htmlName.match(/\.v0*(\d+)\.(\d+)\.(\d+)\.html$/).slice(1).join('.');
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const jsPath = path.join(appDir, jsName);
const htmlPath = path.join(appDir, htmlName);
const cssPath = path.join(appDir, cssName);
const schemaPath = path.join(formatDir, pick(formatDir, /^DF-FMT_schema\.v\d+\.\d+\.json$/));
const instructionPath = path.join(formatDir, pick(formatDir, /^DT-FMT_instruction_AI\.v\d+\.\d+\.json$/));
const templatePath = path.join(formatDir, pick(formatDir, /^DT-FMT_template\.v\d+\.\d+\.json$/));
const supabaseSqlPath = path.join(root, 'docs', 'supabase-setup.sql');
const supabaseGuidePath = path.join(root, 'docs', 'SUPABASE_AUTH.md');
const supabaseConfigPath = path.join(root, 'Nango-neo', 'supabase-config.json');

let source = fs.readFileSync(jsPath, 'utf8');
source = source.replace(/\/\/ Expose small pure helpers for browser console\/manual tests\.[\s\S]*$/, '');
const api = new Function(source + '\nreturn { parseNangoDocument, serializeNangoDocument, normalizeWord, normalizeCategoryTags, normalizeMeaning, validateWord, findDuplicateIndex, mergeWord, reassignIds, getInitial, getWordListGroupLabel, buildAiPrompt, shouldUseLocalStorage, findLimitViolations };')();
const generatedPrompt = api.buildAiPrompt();
assert.ok(generatedPrompt.includes('\n'), 'AI prompt is separated with actual newlines');
assert.equal(generatedPrompt.includes('\\n'), false, 'AI prompt does not contain escaped newline text');

const supabaseSql = fs.readFileSync(supabaseSqlPath, 'utf8');
const supabaseGuide = fs.readFileSync(supabaseGuidePath, 'utf8');
const supabaseConfig = JSON.parse(fs.readFileSync(supabaseConfigPath, 'utf8'));
const privacyPolicyPath = path.join(root, 'Nango-neo', 'privacy-policy.html');
const privacyPolicy = fs.readFileSync(privacyPolicyPath, 'utf8');
const htmlSource = fs.readFileSync(htmlPath, 'utf8');
assert.equal(api.shouldUseLocalStorage(null, 'local'), true, 'anonymous sessions persist to localStorage');
assert.equal(api.shouldUseLocalStorage({ id: 'user-1' }, 'pending'), true, 'pending cloud sync preserves local persistence');
assert.equal(api.shouldUseLocalStorage({ id: 'user-1' }, 'cloud'), false, 'active authenticated sessions use cloud persistence');
assert.match(source, /supabase\.createClient/, 'browser client initializes Supabase without a server API');
assert.match(source, /from\(SUPABASE_TABLE\)[\s\S]*?upsert/, 'authenticated data saves through the Supabase Data API');
assert.match(source, /supabase-config\.json/, 'client fetches the repository JSON config');
assert.match(source, /loadRepositorySupabaseConfig/, 'repository config is loaded before Supabase initialization');
assert.match(source, /response\.json\(\)/, 'repository config is parsed as JSON');
assert.equal(typeof supabaseConfig.url, 'string', 'repository config exposes a string Project URL');
assert.equal(typeof supabaseConfig.publicKey, 'string', 'repository config exposes a string public key');
assert.doesNotMatch(htmlSource, /<script[^>]+supabase-config\.json/, 'JSON config is fetched rather than loaded as a script');
assert.match(htmlSource, /supabase-js@2/, 'Supabase JS v2 is loaded for GitHub Pages');
assert.match(htmlSource, /href="privacy-policy\.html"/, 'app links to the privacy policy');
assert.match(privacyPolicy, /プライバシーポリシー/, 'published privacy policy page exists');
assert.match(privacyPolicy, /localStorage/, 'privacy policy describes local storage');
assert.match(privacyPolicy, /Supabase/, 'privacy policy describes cloud processing');
assert.match(htmlSource, /id="authPanelMode"/, 'account and login panel is included');
assert.match(htmlSource, /id="signUpPageMode"/, 'standalone sign-up page is included');
assert.match(htmlSource, /id="emailVerificationPanelMode"/, 'email verification result page is included');
assert.match(htmlSource, /onclick="showSignUpPage\(\)"/, 'account panel links to the sign-up page');
assert.match(htmlSource, /id="authEmailVerificationStatus" class="auth-verification-badge"/, 'account panel shows email verification as a compact badge');
assert.match(htmlSource, /id="headerAccountStatus"/, 'header exposes account status');
assert.match(htmlSource, /id="headerAccountEmail"/, 'header has an email slot for signed-in users');
assert.match(htmlSource, /id="headerLoginButton"[^>]*onclick="showAuthPanel\(\)"/, 'header login button opens the account/login panel');
assert.match(source, /function updateHeaderAccountStatus\(/, 'header account state is synchronized with authentication');
assert.match(source, /accountEmail\.hidden = !loggedIn/, 'header email is visible only for signed-in users');
assert.match(source, /loginButton\.hidden = loggedIn/, 'header login button is visible only for signed-out users');
const headerStatusCss = fs.readFileSync(cssPath, 'utf8');
assert.match(headerStatusCss, /\.header-account-status/, 'header account status is styled');
assert.match(headerStatusCss, /\.auth-verification-badge\.is-success/, 'verified email uses compact badge styling');
assert.match(htmlSource, /id="privacyPolicyConsent"[^>]*type="checkbox"/, 'sign-up UI includes privacy policy consent');
assert.match(htmlSource, /href="privacy-policy\.html"[^>]*>プライバシーポリシー/, 'consent links to the privacy policy');
assert.match(source, /const consent = document\.getElementById\('privacyPolicyConsent'\);\s*if \(!consent \|\| !consent\.checked\) throw new Error\('プライバシーポリシーを読み、同意欄にチェックしてください。'\)/, 'sign-up is blocked without privacy policy consent');
assert.match(source, /signUpPasswordConfirm/, 'sign-up validates password confirmation');
assert.match(source, /email_confirmed_at/, 'email verification status uses Supabase confirmation timestamp');
assert.match(source, /auth\.resend\(\s*\{\s*type: 'signup'/, 'signup confirmation email can be resent');
assert.match(source, /SIGNUP_PENDING_EMAIL_KEY/, 'pending signup email is retained until verification');
assert.match(supabaseSql, /enable row level security/i, 'RLS is enabled for the personal data table');
assert.match(supabaseSql, /auth\.uid\(\)[\s\S]*?user_id/i, 'policies scope row access to the authenticated user');
for (const action of ['select', 'insert', 'update', 'delete']) {
  assert.match(supabaseSql, new RegExp('for ' + action, 'i'), 'RLS policy is present for ' + action);
}
assert.match(supabaseGuide, /GitHub Pages/i, 'Supabase setup guide documents GitHub Pages');
assert.match(supabaseGuide, /service_role/i, 'setup guide warns against exposing service_role keys');
assert.match(supabaseGuide, /supabase-config\.json/, 'setup guide documents repository configuration');

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
const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
assert.match(html, new RegExp(`NANGO-NEO <strong>v${escapeRegExp(appVersion)}</strong>`), 'HTML version chip matches the HTML file name');
assert.match(html, new RegExp(`Version ${escapeRegExp(appVersion)}"`), 'HTML app-name meta carries the app version');
assert.match(html, new RegExp(`name="html-version" content="neo\\.${escapeRegExp(htmlName.match(/\.(v\d+\.\d+\.\d+)\.html$/)[1])}"`), 'HTML html-version meta matches the file name');
assert.ok(html.includes(`src="${jsName}"`), 'HTML references the shipped JavaScript');
assert.ok(html.includes(`name="javascript-version" content="${jsName.match(/\.(v\d+\.\d+\.\d+)\.js$/)[1]}"`), 'HTML javascript-version meta matches the file name');
assert.ok(html.includes(`href="${cssName}"`), 'HTML references the shipped stylesheet');
assert.match(html, /supabase-js@\d+\.\d+\.\d+\/dist\/umd\/supabase\.js"[^>]*integrity="sha384-[A-Za-z0-9+/=]+"[^>]*crossorigin="anonymous"/, 'Supabase library is pinned to an exact version with a Subresource Integrity hash');
assert.match(html, /id="wordListAlphabetJump"/, 'word list includes initial navigation');
assert.match(html, /id="backToTop"/, 'a back-to-top control is present');
assert.match(source, /previous\.scrollY = currentScrollY/, 'outgoing view scroll position is saved');
assert.match(source, /current\.scrollY = Math\.max\(0, window\.scrollY \|\| 0\)/, 'active screen scroll position is saved before history navigation');
assert.match(source, /scrollWindowTo\(0\)/, 'new detail views start at the top');
assert.match(source, /showViewMode\(true, \{ preserveScroll: true \}\)/, 'sidebar word switches preserve scroll position');
assert.match(source, /id="editBtn"[^>]*>この単語を編集/, 'edit action is rendered with the detail title');
assert.match(source, /id="deleteBtn"[^>]*>削除/, 'delete action is rendered with the detail title');
assert.match(css, /\.back-to-top\s*\{/, 'back-to-top button is styled');
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
assert.match(css, /\.sidebar-filter-controls\s*\{[^}]*display:flex/s, 'sidebar filtering and sorting controls share a horizontal row');

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
assert.doesNotMatch(source, /function setHierarchyStructure|function toggleHierarchyPopup/, 'sidebar hierarchy controls are removed');
assert.match(css, /\.toolbar\s*\{[^}]*position:\s*sticky/s, 'toolbar remains visible while scrolling');
assert.match(css, /\.filter-popover\s*\{[^}]*position:\s*absolute/s, 'filter popovers do not shift page layout');
assert.match(css, /\.sidebar-filter-controls \.sidebar-sort-control #sortPopup\s*\{[^}]*position:absolute/s, 'sort menu opens as an absolute overlay rather than shifting the sidebar');
assert.match(css, /\.sidebar-filter-controls \.sidebar-sort-control #sortPopup\s*\{[^}]*z-index:50/s, 'sort menu overlays nearby sidebar controls');
assert.match(html, /id="headerWordDisplayMode"/, 'word display mode control is in the header toolbar');
assert.doesNotMatch(html, /id="searchInput"|class="search-box"/, 'sidebar text search input is removed');
assert.doesNotMatch(html, /id="sidebarWordDisplayMode"|class="sidebar-display-mode"/, 'display mode selector is no longer in the sidebar');
assert.ok(html.indexOf('id="categoryFilterTrigger"') < html.indexOf('id="sortTrigger"') && html.indexOf('id="sortTrigger"') < html.indexOf('id="treeContainer"'), 'classification filter and sort controls are grouped above the word list');
assert.doesNotMatch(html, /groupDisplayToggle|sidebar-group-controls|sidebar-group-buttons|hierarchyTrigger|hierarchyPopup|setHierarchyStructure/, 'sidebar grouping controls and hierarchy selectors are removed');
assert.doesNotMatch(source, /groupDisplayEnabled|currentHierarchy|openCategories|function setGroupDisplay|function toggleAllGroups|function setHierarchyStructure|function getGroupingValues/, 'sidebar grouping logic is removed');
assert.doesNotMatch(css, /\.sidebar-group-controls|\.sidebar-group-buttons|\.tree-category|\.tree-word-list/, 'sidebar grouping styles are removed');
assert.match(source, /function renderSidebarTree\([\s\S]*?for \(const word of processed\)[\s\S]*?container\.appendChild\(entry\)/, 'sidebar renders a flat word list');
assert.match(source, /function updateSidebarVisibility/, 'sidebar visibility is controlled by screen state');
assert.match(source, /function getFilteredWordListItems/, 'word-list filtering is shared with sidebar context');
assert.match(source, /function openWordFromWordList/, 'opening a word captures the current list filter');
assert.ok(source.includes('sidebarContextWordIds = items.map(word => Number(word.id))'), 'sidebar captures all words in the filtered list');
assert.ok(source.includes('sidebarContextWordIds.includes(Number(word.id))'), 'sidebar respects the captured context');
assert.doesNotMatch(html, /id="wordDisplayMode"/, 'detail toolbar display mode is removed');
assert.doesNotMatch(html, /id="wordListSort"|id="wordListDirection"/, 'duplicated sort controls are removed');
assert.match(html, /onclick="copyAiPrompt\(\)">AIに送るプロンプトをコピー/, 'AI prompt copy action is available');
assert.match(html, /id="pageBackBtn"[\s\S]*戻る/, 'back navigation is present with a label');
assert.match(html, /id="pageForwardBtn"[\s\S]*進む/, 'forward navigation is present with a label');
assert.match(source, /function setWordDisplayMode\(/, 'header display mode is implemented');
assert.doesNotMatch(source, /searchQuery|searchInput|function handleSearch\(/, 'sidebar text search logic is removed');
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
// Regression checks for the v3.0.2 fixes.
const htmlPanelIds = [...html.matchAll(/id="([A-Za-z]+Mode)"/g)].map((match) => match[1]).filter((id) => !/DisplayMode$/.test(id)).sort();
const panelIds = [...source.match(/const PANEL_IDS = \[([^\]]*)\]/)[1].matchAll(/'(\w+)'/g)].map((match) => match[1]).sort();
assert.deepEqual(panelIds, htmlPanelIds, 'PANEL_IDS lists every screen panel in the HTML, so no screen can stay visible behind another');
assert.doesNotMatch(source, /(?<!PANEL_IDS = )\['(?:view|edit)Mode'/, 'screens are hidden through hideAllPanels() instead of ad-hoc id lists');
assert.match(source, /state\.screen === 'auth'/, 'the account screen is restored by back/forward navigation');
assert.match(source, /showAuxPanel\('authPanelMode', 'auth', recordHistory\)/, 'the account screen is recorded in the navigation history');
assert.doesNotMatch(source, /\\\\n/, 'no string contains a literal backslash-n sequence');
assert.match(source, /anchor\.download = 'Nango-neo_' \+ FORMAT_VERSION/, 'export file name follows the DT-FMT version');
assert.match(source, /cancelled: true/, 'declining to replace the dictionary aborts the import');
assert.match(source, /async function loadFormatDefinition\(/, 'DT-FMT viewer falls back to the static files outside the launcher');

const confirmMessages = [];
globalThis.confirm = (message) => { confirmMessages.push(message); return true; };
const crowdedTags = api.normalizeWord({ word: 'タグ過多', categoryTags: ['甲', '乙', '丙'], meanings: [{ definition: '定義' }] }, 'タグ過多');
const extraTag = api.normalizeWord({ word: 'タグ過多', categoryTags: ['丁'], meanings: [{ definition: '定義' }] }, 'タグ過多');
api.mergeWord(crowdedTags, extraTag);
assert.equal(confirmMessages.length, 1, 'exceeding the tag cap asks which tags to keep');
assert.ok(confirmMessages[0].includes('超えています。\n\n候補: 甲、乙、丙、丁\n\nOK:'), 'merge prompt is split across real lines');
assert.equal(confirmMessages[0].includes('\\n'), false, 'merge prompt has no literal backslash-n text');
delete globalThis.confirm;

assert.deepEqual(
  api.findLimitViolations([api.normalizeWord({ word: '上限超過', categoryTags: ['a', 'b', 'c', 'd'], meanings: [{ definition: '一', fieldTag: ['1', '2', '3'] }, { definition: '二', fieldTag: ['1'] }] }, '上限超過')]),
  { categoryTags: 1, fieldTag: 1 },
  'imports that exceed the DT-FMT tag caps are detected'
);
assert.deepEqual(api.findLimitViolations(parsed.words), { categoryTags: 0, fieldTag: 0 }, 'conforming data reports no violations');

console.log(`Nango-NEO v${appVersion} smoke tests passed.`);
