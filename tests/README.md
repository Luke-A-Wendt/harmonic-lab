# Validation suite

The runtime website has no package dependencies. The test tools are separate development utilities.

## Deterministic theory and repertoire checks

A recent Node.js installation runs the pure JavaScript tests:

```sh
node tests/theory.test.js
node tests/spectral.test.js
node tests/repertoire.test.js
```

These cover pitch-coordinate conversions, negative mixed fractions, enharmonic octave spelling, circles, tuning-grid error, guitar positions, all repertoire mappings, chord voicings, and spectral relationships.

## Browser and audio checks

Python tests require `playwright`, `beautifulsoup4`, and `numpy`, together with Chromium. `CHROMIUM_PATH` can specify the browser executable; otherwise the scripts find `chromium` on the local path.

```sh
python tests/browser.test.py
python tests/lifecycle.test.py
python tests/audio_regression.py
python tests/static.test.py
```

`fixture.py` loads the exact static JavaScript and CSS into an offline document with per-script CSP hashes. It does not change the runtime files. Browser interaction tests cover desktop, touch, keyboard, and responsive layouts. Lifecycle tests replace microphone permission with a native synthetic MediaStream; no real microphone is opened. The audio regression uses native browser filter nodes and deterministic samples at 44.1 and 48 kHz. The static audit verifies local asset paths and root/subpath HTTP delivery.

Results are written beside the tests, and UI screenshots are placed in `tests/screenshots/`. See the project’s `TEST_REPORT.md` for the recorded validation and remaining limits.

## Scoped Tabs workspace update

`TABS_TEST_REPORT.md` documents the current tab/player integration. Run the additional regression with:

```bash
python tests/tabs.test.py
```

`tabs-results.json` records those interaction checks. `tabs-scope-audit.json` records protected-source hashes, markup comparisons, and nine pixel-identical comparisons against the baseline application outside Tabs. The baseline snapshot is required to reproduce that source/visual comparison; it is not bundled into the website.
