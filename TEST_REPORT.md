# Validation report · Harmonic Lab 0.4

## Completed suites

The recorded results apply to the bundled static sources. Development tests use Chromium, native Web Audio, deterministic synthetic signals, and offline HTML fixtures. They do not certify a physical instrument, microphone, or phone.

| Suite | Successful checks |
|---|---:|
| Theory and basic DSP | 15 groups |
| Spectral-peak analysis | 8 groups |
| Repertoire and transposition | 8 groups; 345 piece/tuning mappings; 59,400 progression-voicing cases |
| Native-browser audio | 64 deterministic signal cases |
| UI, playback, and touch | 97 checks |
| Microphone and asynchronous lifecycle | 21 checks |
| Viewport, settings, and mathematical pages | 297 checks |
| Static HTTP delivery | 34 file responses, root and nested paths |

All source JavaScript passed syntax checking. The document contains 195 unique IDs and 16 relative linked assets. The runtime fixture recorded no JavaScript exceptions, CSP violations, or remote data requests.

## Responsive workspaces

The layout suite examined 360×640, 390×700, 412×850, 844×390, 915×412, and 1440×900 CSS-pixel viewports. The UI suite also covered 1365×900. Lifecycle checks included 320-pixel document width.

Primary workspaces fit without document scrolling in the tested layouts. Piano, fretboard, harmonic, and circle surfaces were checked separately for content clipping. Controls, canvases, page navigation, and active workspaces were checked after orientation changes. Every mathematical chapter page was traversed; settings-sheet tabs were inspected in small portrait and landscape viewports.

Fret windows, score pages, library pages, peak pages, and chapter/table-column pagination expose content beyond the active view. Portrait and landscape use different layouts rather than simply shrinking one desktop page. Large text scaling, alternative fonts, mobile browser chrome, and real operating-system audio routing remain outside this emulation-based validation.

## Instruments and harmonic comparison

Tests verified A4-based pitch values, mixed exponents, one-octave piano range, individually restricted scale notes, complete chord tones, matching fret pitches, magenta chord highlighting, and yellow octave enclosure.

Pointer, keyboard, and native emulated touch holds produced sustained sound. Release outside the control, Escape, cancellation, navigation, and blur stopped held notes. Delayed audio initialization did not start a cancelled note later.

Explore's live, scrolling, and modeled-partial views remained selectable. Pinning C4 and comparing G4 produced the expected near coincidence between the third C partial and second G partial, approximately 1.955 cents and 0.886 Hz apart. The model preserved the selected absolute pitches and labeled its theoretical amplitudes separately from measured audio.

## Song content and transposition

All 69 entries have unique identifiers and source/scope/learning metadata, appear in the single alphabetized Songs library, and map to all five tuning presets with an explicit whole-octave choice: 345 piece/tuning mappings. No source-score image is included or referenced by the application.

The 36 enriched classical/traditional entries preserve their source melody notes, event positions, and durations. Their arrangements contain simultaneous notes and valid per-voice duration/level data; rests are retained. Progressions have rhythmic and block alternatives.

Constant shifts preserve every note's relative displacement and all event times. The live Δn view was checked against the source path after changing key. Compact progression revoicing is explicitly labeled and not represented as exact interval preservation. Across 59,400 voicing cases, distinct pitch classes were preserved, placements used distinct strings, and the defined fretted-span constraint held.

The source-derived Stairway arrangement retains 128 quarter-note beats: the existing 16 printed bars and their repeat. Pitches and durations repeat consistently. This checks the supplied page's encoded structure, not a full-song transcription or professional engraving.

One shared player was exercised for start, pause, resume, seeking, loops, tempo-independent pitch mapping, melody-only playback, page following, and tuning/key changes. Calculated fingerings remain suggestions. Per-event placement does not guarantee that every overlapping synthesized voice can remain physically sustained on a string instrument.

## Tuning and spectral analysis

The 64 audio cases cover common 44.1/48 kHz sample rates, all open-string presets, detuning, lower-band interference, stronger second/third harmonics, missing fundamentals, isolated-overtone ambiguity, noise, silence, clipping, filter bypass, and notch behavior.

The unchanged automatic standard-guitar filter measured −46.85 dB at 50 Hz, −33.61 dB at 55 Hz, and approximately −0.024 dB at the E2 fundamental. Those numbers characterize a digital filter response, not real-room tuning accuracy.

Synthetic native MediaStreams tested the actual microphone processing path: low E above louder low-frequency interference, held-reference suppression, release recovery, bounded noise calibration, track shutdown, leaving the tuner, permission denial, late permission results, and cancellation before permission request.

The compact dominant-frequency display populated separately from the fundamental. A stronger second harmonic retained the low-E tuning target and produced the appropriate diagnostic. The detailed peak sheet preserved frequency, amplitude ranking, note/n, and harmonic relationships; freeze and sorting operated on the shared snapshot. Closing the sheet left the compact overview active without keeping the full table open.

## Static delivery and privacy checks

All linked local assets were fetched and byte-compared at a root path and a nested project path. Asset URLs remain relative and navigation uses hash-based workspaces; server-side route rewriting is not required.

The Content Security Policy includes `connect-src 'none'`. There are no runtime fetch, telemetry, audio upload, account, or remote-processing endpoints. Tests verified microphone track cleanup. Static-host access logs are outside the application's control.

## Evidence

The `tests/` directory includes the executable suites, machine-readable results, and captured layouts:

- `browser-results.json`, `lifecycle-results.json`, `layout-results.json`
- `audio-results.json`, `static-results.json`
- `theory-results.txt`, `spectral-results.txt`, `repertoire-results.txt`
- `screenshots/`

Test dependencies and commands are in `tests/README.md`.

## Remaining limits

No physical Pixel 9, guitar, ukulele, or microphone was used. Safari, Firefox, mobile OS permission dialogs, Bluetooth latency, real acoustic noise, reverberation, and hardware processing were not independently verified. Monophonic pitch detection can be ambiguous. Spectral relationships do not identify every source or infer absent fundamentals without evidence. The layouts are not a formal accessibility certification; very large accessibility text may require contained sheet scrolling.
