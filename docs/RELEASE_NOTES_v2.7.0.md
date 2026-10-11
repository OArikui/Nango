# Nango-NEO v2.7.0

## Review-driven changes

- Split word classification tags (categoryTags) from meaning-level domain tags (meanings[].fieldTag), era tags (eraTag), and display-only hashtag tags (other_tags).
- Limit new classification assignments to three per word and domain assignments to two per meaning.
- Add a compact clickable tag-name overview and separate management tables for classification, domain, and era tags.
- Add classification filters to the sidebar (up to three selections) and the word list (unlimited selections).
- Remove classification as a sidebar grouping criterion; provide domain, era, and initial grouping. Groups are collapsed by default, with expand/collapse-all and a grouping toggle.
- Show registration dates in the sidebar and word list; split the word list by initial and add jump links.
- Add display modes for headword, reading, kanji, and pronunciation transcription.
- Render a Markdown subset in definitions and notes, and link registered words found in text.
- Separate meaning cards, column, memo, and AI note presentation. Add a setting to hide the AI note.
- Add settings for display behavior and the local JSON save path, a statistics/tools page, and a read-only DT-FMT viewer with raw and readable modes.
- Move low-frequency JSON file operations into a menu while retaining direct JSON paste.
- Set the initial home view to today's word.

## Data format

- HTML: Nango-neo.v02.7.0.html
- JavaScript: Nango_main.v01.7.0.js
- CSS: style.v02.7.0.css
- Data format: DTformats.neo.v5.15
- Backward compatibility: existing category is migrated as a single-item classification list when categoryTags is absent. The legacy category field is maintained as the first classification tag. pronunciation is an optional new field.
- Existing other_tags remain in the data but are no longer part of the tag-management tables; they are displayed as hashtags on the word detail/list.

## Verification

- JavaScript source syntax checked.
- Core data parsing, category-tag normalization, legacy-category fallback, multiple meanings, pronunciation, and serialization round-trip checked.
- test_or_future/phase1_smoke.test.js updated for the v2.7.0 filenames and format.
- Browser end-to-end interactions and Windows file-path behavior still require verification in the target environment.
