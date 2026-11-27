# AGENTS.md - Nango-neo Repository

## Commands

### Run the local launcher

```text
python run.py                    # Start launcher on port 8765 (default)
python run.py --port 9000        # Custom port
python run.py --no-browser       # Don't auto-open browser
```

### Run tests

```text
# Phase 1 smoke test (app logic + HTML/CSS structure)
node test_or_future/phase1_smoke.test.js

# Quiz smoke test (standalone quiz page)
node test_or_future/quiz_smoke.test.js

# Documentation consistency (README/launcher/HTML version links)
node test_or_future/docs_consistency.test.js

# DT-FMT schema validation (needs jsonschema[format])
python -m pip install "jsonschema[format]"
python -m unittest test_or_future.test_phase1_format -v

# Launcher API tests
python -m unittest test_or_future.test_run_api -v

# Compile launcher syntax check
python -m py_compile run.py
```

**Test order matters:** `lint -> typecheck -> test` (as documented in CONTRIBUTING.md)

### CI runs (from `.github/workflows/nango-smoke.yml`)

```text
node test_or_future/phase1_smoke.test.js
node test_or_future/quiz_smoke.test.js
node --check Nango-neo/Nango-quiz.v01.0.0.js
node test_or_future/docs_consistency.test.js
python -m pip install "jsonschema[format]"
python -m unittest test_or_future.test_phase1_format -v
python -m unittest test_or_future.test_run_api -v
python -m py_compile run.py
```

### Build / deploy

```text
# GitHub Pages deploy (push to NEO branch)
# - Builds site: mkdir -p _site && cp -r Nango-neo/* _site/
# - Copies latest HTML: LATEST=$(ls Nango-neo/Nango-neo.v*.html | sort -V | tail -1)
# - Artifact upload: _site directory
```

## Architecture

### Directory layout (root)

```
.
├── README.md                     This file (updated by agent)
├── run.py / RUN_NANGO.bat        Python launcher (stdlib only)
├── Nango-neo/                    App body (HTML / JS / CSS / schemas)
│   ├── DTformats.neo.v5.17/      DT-FMT schemas & templates
│   ├── Nango-neo.v03.3.1.html    Current app HTML
│   ├── Nango_main.v02.0.7.js     Main JS file
│   ├── style.v02.9.1.css         CSS file (single version only)
│   ├── Nango-quiz.v01.0.0.*      Quiz page files
│   └── privacy-policy.html
├── test_or_future/               Tests & samples
├── docs/                         Documentation
├── data/                         Personal dictionary data (gitignored)
└── .github/workflows/            CI workflows
```

### Key boundaries

- **`Nango-neo/`** = shipped app artifacts (HTML/JS/CSS/DT-FMT). Version numbers are in filenames; bumping a file requires renaming it.
- **`run.py`** = local launcher server. Serves `Nango-neo/` files over HTTP with API endpoints (`/api/data`, `/api/format`, `/api/data-path`).
- **`test_or_future/`** = test suite. All CI tests reference files here; new test files must be reflected in CI and README.
- **`docs/`** = markdown reference docs. `CONTRIBUTING.md` has development rules; `DT-FMT.md` has data format spec.
- **`data/` and `user_data/`** = gitignored personal data. Do not add to repo.

### Version numbering (from CONTRIBUTING.md)

| Target | File pattern | When to bump |
|--------|-------------|--------------|
| App | `Nango-neo.vMM.m.p.html` | Release |
| JS | `Nango_main.vMM.m.p.js` | Content changes |
| CSS | `style.vMM.m.p.css` | Content changes |
| DT-FMT | `DTformats.neo.vM.NN/` | Schema changes |

`MM` = major (incompatible changes), `m` = minor (features), `p` = patch (bug fixes).

**Never have multiple version folders coexist** - deleting old files is part of the release process (CONTRIBUTING.md §"旧版ファイルは残さない"). After the fix, only `style.v02.9.1.css` remains in `Nango-neo/`.

### DT-FMT schema caps (enforced by tests)

- `categoryTags` max 3 per word (schema: `$defs.word.properties.categoryTags.maxItems === 3`)
- `fieldTag` max 2 per meaning (schema: `$defs.meaning.properties.fieldTag.maxItems === 2`)
- `definition` is required on every meaning
- `antonyms` and `similarWordsDifference` are required on every meaning

### API security (run.py)

- `/api/data` and `/api/data-path` require **trusted origin**: request `Host` must be `127.0.0.1:<port>` and `Origin` must match
- Foreign origins (different host/DNS rebinding) get `403 Forbidden`
- `Content-Type` must be `application/json`; `text/plain` gets `415 Unsupported Media Type`
- Data API validates payload has `words` dict; rejects malformed JSON

## Conventions

### Git commits (from CONTRIBUTING.md)

- Use conventional commit prefixes: `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `chore`, `release`
- Format: single-line summary, optional blank line + body
- Example: `docs: reorganize documentation layout`

### Branch & PR workflow (from CONTRIBUTING.md)

- Work on a feature branch, then open PR targeting `NEO` branch
- `NEO` pushes trigger GitHub Pages deployment
- Before merging: run all tests locally (see test commands above)

### Documentation links (from README.md and CONTRIBUTING.md)

- `RUN_WITH_PYTHON.md` = launcher and local storage details
- `DT-FMT.md` = data format specification
- `neo-versions.md` = version history / DT-FMT evolution
- `releases/` = release notes
- `PHASE1_IMPLEMENTATION.md` / `archive/` = implementation history

### Links in README.md must stay in sync

The "現行版" table and test commands in README.md must reference the actual file names that exist on disk. The `docs_consistency.test.js` test verifies this - it checks that README mentions every shipped file and every CI test file.

## Gotchas & Quirks

- **No build step**: The app ships static HTML/JS/CSS; no bundler or compilation is needed beyond `python -m py_compile run.py`
- **Port binding**: Launcher probes 20 ports starting from the requested one (`find_port`); if all fail, throws `RuntimeError`
- **CORS / origin check**: The launcher API strictly validates `Host` and `Origin` headers. Running tests from `file://` or different hosts will get `403`
- **Quiz page is standalone**: `Nango-quiz.v01.0.0.html` excludes the app header/sidebar (`doesNotMatch` quizHtml checks for those)
- **Tag caps enforced in schema**: Importing >3 categoryTags or >2 fieldTags per meaning will pass file write but fail schema validation
- **`data/` and `user_data/` are gitignored**: Personal dictionary data; backup via JSON export tool, not git
- **Supabase config in `Nango-neo/supabase-config.json`**: Only public values (`url`, `publicKey`) should be committed; never secrets or service_role keys
- **Privacy policy links to shipped HTML**: `privacy-policy.html` must link back to the current app HTML filename (verified by `docs_consistency.test.js`)
- **Version cleanup**: When updating app files (HTML/JS/CSS), old versioned files must be deleted. Having multiple versions in a directory (e.g. `style.v02.9.0.css` + `style.v02.9.1.css`) causes README/launcher/CI to become uncertain which to reference. The `docs_consistency.test.js` test enforces exactly one app HTML, one JS, and one CSS file.