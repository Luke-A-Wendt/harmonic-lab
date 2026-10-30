# Tabs workspace validation

## Build scope

This build retains the original application layout. The runtime update is confined to the Tab library, its navigation, and its repertoire. The shared audio engine, Explore, Spectrum & tuner, Math, and global stylesheet are unchanged.

`tabs-scope-audit.json` records SHA-256 equality for 13 protected files, including `README.md` and `LICENSE`. The Explore, Spectrum & tuner, Math, shared audio bar, footer, and privacy markup are unchanged. The header differs only by removal of the dedicated Stairway navigation button. All selectors in `src/practice.css` are scoped to the Tabs workspace or its own dialogs.

Nine baseline/current image comparisons were pixel-identical: Explore, the tuner headstock, and the first Math section at 1440 × 1000, 412 × 850, and 844 × 390. The inherited header and page-scrolling behavior remain in place; this is not the later site-wide compact-layout release.

## Executed checks

| Suite | Result |
|---|---|
| `node tests/theory.test.js` | 15 groups passed |
| `node tests/spectral.test.js` | 8 groups passed |
| `node tests/repertoire.test.js` | 8 groups passed; 69 entries; 345 piece/tuning mappings; 59,400 progression-event/key/tuning voicing checks |
| `python tests/browser.test.py` | 60 checks passed |
| `python tests/lifecycle.test.py` | 22 checks passed, including the synthetic microphone path and sustained-note release |
| `python tests/tabs.test.py` | 58 checks passed |
| `python tests/static.test.py` | 30 root/subpath HTTP checks passed; unique element IDs; relative asset paths; CSP retained |

The tab suite checks the discoverable Songs/Chords/Theory filters, search and pagination, richer arrangements and melody-only playback, exact transposition across all five tuning presets, delta-n visualization and its accessible numeric table, annotations, revoicing warnings, dynamics, pause/resume, looping, metronome, legacy Stairway routing, and cancellation of delayed audio after navigation. Mobile-size checks cover both portrait and landscape and include 320-pixel width.

The existing theory test now locates the Stairway arrangement by its stable ID rather than by an image field. Browser assertions concerning the removed dedicated workspace and older library controls were updated. The offline fixture supports the new cache-versioned local asset URLs.

## Test conditions and limitations

Browser tests use Chromium with a CSP-hashed, local-source fixture because direct browser URL navigation is restricted in the test environment. HTTP asset delivery was checked separately at root and nested paths. The application itself still uses external local script and stylesheet files; the fixture does not modify the distributed application.

Audio tests use synthesized tones and a synthetic MediaStream. No physical guitar, ukulele, microphone, or phone was tested. Fingerings are suggestions; exact pitches may require wide spans or a different register. Compact chord voicing is labeled separately from exact transposition. The delta-n path represents a named or selected voice, not all simultaneous voices.

The original `TEST_REPORT.md` documents the earlier baseline. This report and the `tabs-*.json` results document the scoped Tabs update.
