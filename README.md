# [Harmonic Lab](https://luke-a-wendt.github.io/harmonic-lab/)

**Music, mathematics & sound.**

Harmonic Lab is an interactive music-learning website connecting a piano, guitar and ukulele fretboards, scales, chords, a live spectrum analyzer, an instrument tuner, playable tablature, and visual mathematics. One pitch coordinate links every workspace: **A4 is n = 0 at 440 Hz**.

Audio and calculations run in the browser. The website has no application server, accounts, remote data APIs, analytics, external libraries, or externally loaded fonts.

## Workspaces

| Workspace | Purpose |
| --- | --- |
| **Explore** | Connect a pitch to its piano key, fret positions, scale degree, chord membership, and frequency. |
| **Spectrum & tuner** | Examine partials, filter low-frequency noise, and tune an open string using its estimated fundamental. |
| **Tab library** | Browse 68 classical, traditional, harmony, and technique selections with one shared practice player. |
| **Stairway to Tuning** | A dedicated score workspace with the same playback and arrangement controls. |
| **Math lab** | Investigate pitch equations, sets, modular circles, vibrating strings, and equal-division tuning systems. |

## Explore

The piano displays one octave from the selected scale’s tonic. Changing the root shifts the visible keyboard; the frequency reference remains fixed. Each piano annotation shows its note, scale degree, integer **n**, and reduced mixed-form exponent.

The fretboard displays every note on every string as an **n** value. Identical values represent identical pitches, even on different strings. Hover or focus a position to highlight all occurrences of that pitch and identify its note and frequency. The instrument head is on the left, with treble strings above bass strings; the standard high-G ukulele preset retains its re-entrant tuning.

| Visual cue | Meaning |
| --- | --- |
| **Cyan fill** | The pitch belongs to the selected scale and can be played individually. |
| **Thick magenta outline** | The pitch class belongs to the selected chord. |
| **Bold yellow enclosure** | This part of the fretboard lies within the octave displayed on the piano, including both endpoints. |
| **White matching / held highlight** | Occurrences of the exact same pitch, not merely the same letter name. |
| **Grayscale marker** | Outside the selected scale; silent when played individually. |

The octave boundary surrounds the region instead of adding another ring to each note. It does not make out-of-scale pitches playable. Chord buttons play the complete chord, including any tones outside the current scale.

Eight scale patterns are available: major, natural minor, harmonic minor, Dorian, Mixolydian, major pentatonic, minor pentatonic, and chromatic. Chords include major, minor, diminished, augmented, sus2, sus4, sixth, dominant seventh, major seventh, and minor seventh.

Pitch-circle choices use steps of 1, 2, 3, 4, 5, or 7 modulo 12. Multi-cycle orderings display their distinct cycles. Previous and current scale membership can be compared without changing the absolute pitch reference.

### Sound and sustained notes

**Pure sine** isolates the fundamental. **Harmonics** adds a synthesized series of upper partials. This sound setting applies to the instruments, chord playback, reference tones, and tab player.

Press and hold a piano key, numbered piano button, or fret marker to sustain it. Release to stop. Space and Enter provide the same behavior when a note has keyboard focus. A brief tap produces a short tone. Pointer cancellation, focus loss, changing the workspace, or Escape releases held notes. **Stop sound** stops all playback.

Master volume starts at **100%** on first use. Later volume choices are saved locally. Output remains dependent on the device volume; begin with a comfortable listening level. Playback is synthesized rather than sampled from physical instruments.

## Spectrum & tuner

The tuner accepts microphone input or the app’s synthesized audio. Its live spectrum and scrolling spectrogram share the target fundamental and harmonic markers. Logarithmic and linear frequency axes, freeze, and optional raw-input overlay support comparison.

The tuning presets are standard guitar, drop-D guitar, high-G ukulele, low-G ukulele, and baritone ukulele. Select a tuning peg to lock a target, or use automatic nearest-open-string matching. **Hold to play target** sustains the reference tone until release. Microphone pitch judgment pauses throughout reference playback and briefly after release to avoid treating the app’s own tone as the instrument.

Input cleanup includes an automatic low-cut filter relative to the lowest string, manual cutoff, bypass, an optional 50/60 Hz notch, a noise gate, and a two-second room-noise measurement. The raw and filtered levels remain visible. These controls affect the analysis signal, not the audible synthesizer.

The fundamental estimate and loudest spectral peak are reported separately. A stronger second or third harmonic is identified when the lower fundamental is sufficiently established. Uncertain octave relationships, clipping, quiet input, and unstable estimates receive distinct diagnostics rather than a forced tuning result. Detection is monophonic and is not a calibrated acoustic measurement.

### Optional spectral-peak analysis

**Analyze peaks** opens a measurement table below the live spectrum. It is off by default. The table reports:

- Frequency and relative digital level in dBFS, sorted by amplitude or frequency.
- Nearest equal-tempered note, cents offset, continuous **n**, and nearest integer **n**.
- Possible integer-multiple relationships to lower measured peaks, with references to those rows.

The display can show 12, 24, or 48 peaks. Freeze captures the spectrum and table together. Weak or unresolved peaks can be omitted. Harmonic labels describe measured frequency relationships: they do not separate concurrent instruments or prove that a missing fundamental exists. Algorithm details and limits are documented in [TUNER_NOTES.md](TUNER_NOTES.md).

## Repertoire and practice

The general library contains **68 selections**: 17 classical themes and studies, 19 traditional and early popular melodies, 24 chord progressions, and 8 technique exercises. Search by title, composer, or musical concept; filter by collection and difficulty; sort; and save favorites. [CATALOG.md](CATALOG.md) lists every selection and its scope.

One player serves both the library and the featured score. **Play** becomes **Pause** during playback and **Resume** when paused. Stop, tempo, seeking, metronome, loop ranges, section jumps, page size, and follow-playback support practice. Individual tablature events are also playable.

Each piece is available on every instrument preset. Three arrangement operations remain distinct:

| Operation | Musical effect |
| --- | --- |
| **Key transposition** | Adds the same semitone offset to every pitch, preserving the melody’s intervals and rhythm. |
| **Whole-octave fit** | Moves the entire piece by an explicitly reported octave offset to fit the instrument. |
| **Compact chord voicing** | Preserves chord pitch classes while allowing different registers and inversions for a playable shape. |

The main controls show instrument, key, and tempo. **Arrangement & practice options** contains exact semitone shift, register, voicing, and loop-range controls. Unplayable exact pitches and wide fingering spans are flagged. Suggested fingerings are educational arrangements, not definitive performance editions. Tab importing is not part of the interface.

### Stairway to Tuning

This dedicated workspace contains an opening arrangement transcribed from the bundled four-line reference page: **16 printed bars with the written repeat represented as 32 played bars**. The source is interpreted as high-G ukulele tuning and re-fingered for the other presets. It does not include sections absent from that page. Hammer-ons use separate attacks; articulation and sustained voices are simplified.

The original reference image and attribution are available within the score workspace. See [CONTENT_NOTICE.md](CONTENT_NOTICE.md) for the distinction between the educational library and the credited reference material.

## Math lab

The primary equations are:

```text
f(n) = 440 × 2^(n/12)
n = 12 × log₂(f / 440)

n = 12m + r, where m = floor(n/12) and 0 ≤ r < 12
n/12 = m + r/12, with the remaining fraction reduced
```

Thus `n = 25` has exponent `2 + 1/12`, while middle C (`n = −9`) has exponent `−1 + 1/4`. The plus sign is explicit for negative mixed forms.

Interactive sections cover scale and chord sets, complements, scale degrees, interval names, transposition, modular circles, string modes, harmonic frequencies, logarithmic ratios, and nearest-grid tuning error. Equal-division comparisons include factorization, divisor counts, individual errors, and an explicitly weighted mean. Changing the compared ratios changes the metric; it is not a universal score of musical quality. Explore and playback remain in 12-tone equal temperament.

## Privacy

All synthesis, analysis, pitch detection, fingering, and music calculations run locally in the browser. The application uses **no remote compute resources or remote data sources**. No audio, pitch measurements, preferences, or repertoire queries are sent to an API.

Microphone access requires permission and is used only for in-memory analysis. Audio is not recorded, stored, uploaded, or monitored through the speakers. Stop mic and leaving the tuner release the input tracks. Settings and favorites use local browser storage; clearing the site’s data removes those preferences.

A static host supplies the website files and may keep normal access logs. This does not provide authentication or make a publicly hosted site private. External reference links open only when selected. There are no accounts, advertisements, tracking scripts, or cloud synchronization. The site’s content security policy disables network data connections.

## Browser and implementation

The application is a static HTML/CSS/JavaScript site with relative asset paths and hash-based workspace navigation. It needs no build process or runtime packages. Browser audio starts after interaction. Microphone access requires a secure context such as HTTPS or localhost, plus browser and operating-system permission.

| Path | Responsibility |
| --- | --- |
| `index.html`, `src/style.css` | Responsive workspaces and visual system. |
| `src/theory.js`, `src/math.js` | Pitch coordinates, music structures, fingering, and mathematical views. |
| `src/audio.js`, `src/hold.js` | Local synthesis, analysis routing, and sustained-note lifecycle. |
| `src/tuner-dsp.js`, `src/spectral-peaks.js`, `src/spectrum.js` | Periodicity estimation, filtering, peak relationships, and visual analysis. |
| `src/app.js`, `src/explore.js` | Shared state, navigation, and connected instrument controls. |
| `src/library.js`, `src/practice.js` | Bundled repertoire and the shared practice player. |
| `assets/` | Local reference material. |
| `tests/` | Theory, audio, repertoire, interaction, and lifecycle checks. |

[TEST_REPORT.md](TEST_REPORT.md) records the validation scope. Physical-instrument microphone behavior, browser processing, room acoustics, and device output vary; test results are not a universal accuracy guarantee.
