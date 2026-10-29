# Validation report · Harmonic Lab 0.3

## Scope

Validation covers the bundled static source, mathematical functions, repertoire mapping, native browser audio processing, interaction behavior, privacy-related lifecycle handling, and responsive layouts. All checks below passed against this release.

| Suite | Completed checks |
| --- | ---: |
| Theory and basic DSP | 15 test groups |
| Spectral-peak analysis | 8 test groups |
| Repertoire | 5 groups, including 345 piece/tuning mappings and 13,200 chord voicings |
| Native-browser audio regression | 64 deterministic audio cases |
| Browser interactions | 60 checks |
| Microphone and playback lifecycle | 22 checks |
| Static delivery | 30 HTTP file checks at root and project-subpath locations |

JavaScript syntax checks passed for all source files. The static document has 155 unique element IDs and 14 local linked assets. No runtime package installation or build artifact is required.

## Interface and playback

Chromium interaction tests verify:

- Five main workspaces, including a dedicated Stairway to Tuning route and one shared tablature player.
- Maximum default volume, visible Pure sine / Harmonics selection, and no tab import/export controls or pop-study collection.
- Root-aligned piano keys, A4-based n values, reduced negative exponents, and correct scale/chord note spelling.
- All standard-fretboard positions, magenta chord borders, and the yellow enclosed octave region.
- Matching exact pitches across instruments without confusing octave-equivalent pitches.
- Sustained mouse, keyboard, fretboard, and mobile touch playback; release outside the control; Escape; cancellation; navigation; and window blur.
- Held tuner reference playback, fundamental recognition, stronger second-harmonic diagnostics, optional peak analysis, freeze, frequency sorting, and displayed row count.
- Library collection filters, favorites, one-button play/pause/resume, seeking during playback, exact transposition, pagination, and all five tuning presets for the featured arrangement.
- Guide and privacy dialogs.
- No browser JavaScript exceptions, application CSP violations, or remote data requests in the interaction fixture.

All five workspaces fit 390-pixel and 320-pixel viewports without document-level horizontal overflow. Piano, fretboard, and wide data tables retain intentional internal scrolling. The spectrum, library, featured score, and Explore layouts were also captured at a 1440-pixel desktop width.

## Sustained audio and microphone lifecycle

The hold test measured a non-decaying synthesized tone beyond 1.7 seconds; releasing the pointer outside the key stopped the active voice. Keyboard release did not create a duplicate click tone. Touch input was exercised using Chromium’s native touch event interface.

Microphone tests feed a native synthetic MediaStream into the real microphone processing path. They verify low-E identification in the presence of a louder 50 Hz tone, suppression of tuning judgments throughout a reference hold longer than the old timeout, and recovery after release.

Room calibration completes with a bounded gate. Stop mic and leaving the tuner end the media tracks. Permission denial is recoverable. A delayed permission result cannot leave the microphone running, and cancelling audio initialization before permission is requested prevents a later permission request. Cancelled audio initialization likewise cannot start a held note after navigation.

Peak-analysis instrumentation confirms that its extra measurement function is not called while the panel is off, runs while enabled, and stops when disabled.

## Numerical and repertoire checks

Theory tests cover frequency/n conversion, Euclidean mixed fractions for negative and positive n, note parsing, enharmonic octave spelling, circle cycle counts, scale intersections, equal-division error, and fret positions.

All **69 entries** have unique IDs, source/scope/learning metadata, and valid event structures. Every entry maps to each of the five tuning presets with an explicitly selected whole-octave shift: **345 mappings**. The **13,200 progression-voicing cases** span all 12 keys and five tunings; each preserves distinct chord pitch classes, assigns distinct strings, and respects the specified fretted-span limit.

The featured reference arrangement has 128 quarter-note beats: 16 printed 4/4 bars, repeated for 32 played bars. The repeat preserves pitches and event durations. This verifies internal consistency and page extent, not a full-song transcription or professional engraving accuracy.

## Spectrum and tuning checks

The 64 native-browser audio cases cover 44.1 and 48 kHz, the open strings of all presets, detuning, low-frequency interference, stronger upper harmonics, missing fundamentals, isolated-harmonic ambiguity, silence, broadband noise, clipping, bypass, and notch behavior.

For the automatic standard-guitar low-cut filter, measured transfer gains include **−46.85 dB at 50 Hz**, **−33.61 dB at 55 Hz**, and **−0.024 dB at the E2 fundamental**. These characterize the filter; they are not real-room pitch-error bounds.

Spectral unit tests cover amplitude ranking, sub-bin peak estimation, A4 n = 0, simultaneous candidate harmonic relationships, rejection of unrelated ratios, adaptive thresholding, and common sample rates. An absent lower peak is not manufactured into a measured fundamental.

## Static website checks

Each local asset was fetched and byte-compared against its source at both a root URL and a nested project URL: **30 successful HTTP responses**. Application asset paths are relative. Workspace navigation uses hashes and does not require server-side route rewriting. The content security policy uses `connect-src 'none'`; the application has no fetch, analytics, or remote-compute endpoint.

Browser UI tests use the exact HTML, CSS, and JavaScript loaded into an offline fixture with per-script CSP hashes. The test environment disallows normal browser URL navigation, so static HTTP delivery was checked independently. This is not a live hosting-provider deployment test.

## Evidence

Machine-readable results and screenshots are included in `tests/`:

- `browser-results.json`, `lifecycle-results.json`
- `audio-results.json`, `static-results.json`
- `theory-results.txt`, `spectral-results.txt`, `repertoire-results.txt`
- `screenshots/`

The test source and reproduction commands are documented in `tests/README.md`.

## Remaining limits

No physical guitar, ukulele, or microphone was used. Safari, Firefox, mobile operating-system audio routing, and real permission dialogs were not independently validated. Synthetic MediaStreams verify the application path, not a particular microphone’s hardware or driver behavior.

The tuner is monophonic. Room acoustics, multiple sources, inharmonicity, noisy attacks, and weak fundamentals can produce ambiguity. Spectral relationships are not source separation. The tab arrangements simplify articulation and sustain, and calculated fingerings are not professional performance editions. Visual and keyboard checks do not constitute a formal accessibility certification.
