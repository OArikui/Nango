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
assert.equal(cssFiles.length, 1, `exactly one app CSS expected, found: ${cssFiles}`);
assert.equal(formatDirs.length, 1, `exactly one DT-FMT folder expected, found: ${formatDirs}`);
const [html, js, css, format] = [htmlFiles[0], jsFiles[0], cssFiles[0], formatDirs[0]];

// 2. HTML, launcher and README all point at those files.
const htmlSource = read('Nango-neo', html);
assert.ok(htmlSource.includes(js), 'HTML loads the shipped JavaScript');
assert.ok(htmlSource.includes(css), 'HTML loads the shipped stylesheet');
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

console.log(`Documentation consistency checks passed for v${appVersion}.`);
