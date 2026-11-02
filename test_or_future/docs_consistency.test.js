/* Run from repository root: node test_or_future/docs_consistency.test.js
 * Keeps documentation and launcher in step with the files that actually exist,
 * so README / run.py / HTML cannot drift apart again. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const appDir = path.join(root, 'Nango-neo');

// 1. Exactly one app HTML, one JS, one CSS, one DT-FMT folder are shipped.
const list = (dir, re) => fs.readdirSync(dir).filter((name) => re.test(name));
const htmlFiles = list(appDir, /^Nango-neo\.v\d+\.\d+\.\d+\.html$/);
const jsFiles = list(appDir, /^Nango_main\.v\d+\.\d+\.\d+\.js$/);
const cssFiles = list(appDir, /^style\.v\d+\.\d+\.\d+\.css$/);
const formatDirs = list(appDir, /^DTformats\.neo\.v\d+\.\d+$/);
assert.equal(htmlFiles.length, 1, `exactly one app HTML expected, found: ${htmlFiles}`);
assert.equal(jsFiles.length, 1, `exactly one app JS expected, found: ${jsFiles}`);
assert.ok(cssFiles.length >= 1, `at least one versioned app CSS expected, found: ${cssFiles}`);
assert.equal(formatDirs.length, 1, `exactly one DT-FMT folder expected, found: ${formatDirs}`);
const [html, js, format] = [htmlFiles[0], jsFiles[0], formatDirs[0]];

// 2. HTML, launcher and README all point at those files.
const htmlSource = read('Nango-neo', html);
const cssReference = htmlSource.match(/<link\\s+rel=["']stylesheet["']\\s+href=["'](style\\.v\\d+\\.\\d+\\.\\d+\\.css)["']/i);
assert.ok(cssReference, 'HTML references a versioned stylesheet');
const css = cssReference[1];
assert.ok(cssFiles.includes(css), 'HTML stylesheet exists in the app directory');
assert.ok(htmlSource.includes(js), 'HTML loads the shipped JavaScript');
assert.ok(htmlSource.includes(`content="${format}"`), 'HTML json-version meta matches the DT-FMT folder');
assert.ok(read('run.py').includes(`ENTRY = "/${html}"`), 'run.py serves the shipped HTML');
assert.ok(read('run.py').includes(format), 'run.py loads the shipped DT-FMT folder');

const appVersion = html.match(/\.v0*(\d+)\.(\d+)\.(\d+)\.html$/).slice(1).join('.');
assert.ok(htmlSource.includes(`NANGO-NEO <strong>v${appVersion}</strong>`), 'version chip matches the HTML file name');
assert.ok(fs.existsSync(path.join(root, 'docs', 'releases', `RELEASE_NOTES_v${appVersion}.md`)), `release notes exist for v${appVersion}`);

const readme = read('README.md');
for (const name of [html, js, css, format]) {
  assert.ok(readme.includes(name), `README mentions ${name}`);
}
assert.ok(readme.includes(`v${appVersion}`), 'README mentions the app version');

// 3. Every relative Markdown link in README.md and docs/ resolves.
const markdownFiles = [path.join(root, 'README.md')];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.md')) markdownFiles.push(full);
  }
};
walk(path.join(root, 'docs'));

const broken = [];
for (const file of markdownFiles) {
  const text = fs.readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const target = match[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target.split('#')[0]));
    if (!fs.existsSync(resolved)) broken.push(`${path.relative(root, file)} -> ${target}`);
  }
}
assert.deepEqual(broken, [], `broken relative links:\n${broken.join('\n')}`);

// 4. Every place that names the shipped files or the version agrees with them.
const verOf = (name) => name.match(/\.(v\d+\.\d+\.\d+)\.[a-z]+$/)[1];
const privacyPolicy = read('Nango-neo', 'privacy-policy.html');
assert.ok(privacyPolicy.includes(`href="${html}"`), 'privacy policy links back to the shipped app HTML');
assert.ok(read('run.py').includes(`Nango-neo v${appVersion} locally`), 'run.py docstring names the app version');

const jsSource = read('Nango-neo', js);
const formatFiles = fs.readdirSync(path.join(appDir, format));
assert.ok(jsSource.includes(`FORMAT_VERSION = '${format}'`), 'JavaScript FORMAT_VERSION matches the DT-FMT folder');
for (const file of formatFiles) {
  assert.ok(read('run.py').includes(file), `run.py serves ${file}`);
  assert.ok(jsSource.includes(`${format}/${file}`), `JavaScript static fallback lists ${file}`);
}

const history = read('docs', 'neo-versions.md');
assert.ok(history.includes(`| v${appVersion} |`), 'neo-versions.md has an app version row for the current release');
assert.ok(history.includes(`releases/RELEASE_NOTES_v${appVersion}.md`), 'neo-versions.md links the current release notes');
assert.ok(history.includes(`| v${appVersion} | \`${verOf(html)}\` | \`${verOf(js)}\` | \`${verOf(css)}\` |`), 'neo-versions.md maps the app version to the shipped file versions');

// CI only runs tests that exist, and README documents every one of them.
const workflow = read('.github', 'workflows', 'nango-smoke.yml');
const ciTests = [...workflow.matchAll(/test_or_future\/([\w.]+\.(?:js|py))/g)].map((m) => `test_or_future/${m[1]}`)
  .concat([...workflow.matchAll(/unittest (test_or_future\.\w+)/g)].map((m) => `${m[1].replace('.', '/')}.py`));
assert.ok(ciTests.length >= 4, `CI runs the test files, found: ${ciTests}`);
for (const testFile of ciTests) {
  assert.ok(fs.existsSync(path.join(root, testFile)), `CI references ${testFile}, which must exist`);
  assert.ok(readme.includes(path.basename(testFile, '.py')) || readme.includes(testFile), `README documents ${testFile}`);
}

// Backticked repository paths in current docs (not historical release notes or archive) must exist.
const staleRefs = [];
for (const file of markdownFiles) {
  const rel = path.relative(root, file);
  if (rel.startsWith(path.join('docs', 'releases')) || rel.startsWith(path.join('docs', 'archive'))) continue;
  for (const match of fs.readFileSync(file, 'utf8').matchAll(/`(Nango-neo\/[^`\s]+)`/g)) {
    if (!fs.existsSync(path.join(root, match[1].replace(/\/$/, '')))) staleRefs.push(`${rel} -> ${match[1]}`);
  }
}
assert.deepEqual(staleRefs, [], `docs mention paths that do not exist:\n${staleRefs.join('\n')}`);

console.log(`Documentation consistency checks passed for v${appVersion}.`);
