# [Harmonic Lab](https://luke-a-wendt.github.io/harmonic-lab/)

A browser-based music workbench for exploring pitch, scales, chords, string instruments, harmonics, tuning, and transposition. Version 0.4 uses compact, viewport-sized workspaces for portrait phones, landscape phones, tablets, and desktops.

The application is a static website. There is no build step, application server, account system, external library, remote audio processor, or runtime data service.

## Four workspaces

### Explore

Choose a root and scale, then use **Piano**, **Fretboard**, **Harmonics**, or **Circles**. Controls stay in the same workspace while the main instrument surface changes.

- A root-aligned piano shows exactly one octave, including the repeated tonic.
- Each piano button displays `n`, its reduced mixed exponent, the note name, and scale degree.
- Guitar and ukulele fretboards show `n` at every position. Previous/next windows expose the whole neck without horizontal scrolling. Find octave moves the window to the current range.
- Cyan fills indicate individually playable scale notes. Thick magenta outlines indicate chord pitch classes. A yellow perimeter encloses positions in the piano's displayed octave.
- Press and hold keys, fret markers, mini keys, or Hold chord to sustain sound. Pointer, touch, Space, and Enter are supported. Release, navigation, cancellation, window blur, and Stop terminate held voices.
- Chords can contain pitches outside the scale; individual out-of-scale notes remain silent.
- Circle orderings include fifths, fourths, chromatic steps, whole tones, major thirds, and minor thirds. Non-coprime steps produce separate cycles, not repeated copies of one cycle. Previous/current scale differences remain available in Circles.
- Five tuning presets: standard guitar, drop-D guitar, high-G ukulele, low-G ukulele, and baritone ukulele.

### Harmonics within Explore

Explore's Harmonics surface offers **Scroll**, **Live**, and **Partials** views plus a playable mini keyboard. It analyzes app-generated sound only; it never opens the microphone.

Live and Scroll show the measured app audio. Partials shows a labeled mathematical model of the selected pitches. Enable the global Harmonics control to include upper partials. Pin A stores a note or chord for comparison with the next selection B. Near-partial guides and Details identify pairs within 12 cents, their frequencies, and their separation in hertz.

The partial model uses integer multiples of each fundamental and a relative amplitude envelope. It is not an instrument-separation algorithm. Near alignment is one useful way to study intervals; it is not a universal consonance or musical-quality score. Real string inharmonicity, timbre, level, bandwidth, and musical context also matter.

### Tuner

The compact tuner combines a tuning strip, pitch and cents meter, diagnosis, dominant-frequency readouts, and one graph. **Scroll** is the default; **Live** selects the instantaneous spectrum. The same layout adapts to portrait and landscape.

- Explicit microphone permission, with app-generated audio as an alternative input.
- Automatic string targeting or a selected target. Hold target plays its reference continuously until released.
- Automatic/manual/bypassed low-cut, 50/60 Hz hum notch, noise gate, and room-noise measurement.
- Fundamental estimation is separate from the strongest spectral peak. A louder upper harmonic is identified when the signal supports a lower fundamental; uncertain octave cases remain uncertain.
- Five-frame median smoothing for the loudest-peak readout and an approximately 850 ms dominant-peak overview improve readability. A recently stable fundamental may remain for up to 1.4 seconds while a pluck fades, explicitly labeled as a last reading.
- Freeze, logarithmic/linear axes, target fundamental and harmonic markers, raw overlay in Live, input levels, and filter details remain available.
- **Peaks** opens the optional detailed, paginated analysis: frequency, level, note, cents, measured `n`, nearest integer `n`, and possible harmonic relations to lower measured peaks. Sort by level or frequency and display up to 48 peaks.

Tuning is monophonic and approximate. The display uses relative digital levels in dBFS, not calibrated sound pressure. Browser processing, microphones, room noise, polyphony, and clipping can affect results. Headphones avoid feeding reference tones into the microphone. No physical microphone or phone is certified by the included synthetic tests.

### Songs

One **Songs** library contains **69 entries in alphabetical order**. Search by title, composer, or concept; filter difficulty or favorites. Stairway to Heaven is a normal library entry, not a separate navigation destination. No source-score image is distributed.

- 36 classical/traditional source melodies have educational harmonic arrangements with dyads or chords, independently timed voices, and accompaniment figures where the melody leaves space. **Melody only** keeps the original monophonic source available.
- 24 progression studies include rhythmic attacks, with a Block chords alternative.
- Eight technique studies and the source-derived Stairway opening-page arrangement are retained.
- A single player provides Play/Pause/Resume, Stop, seeking, tempo, metronome, loop regions, section jumps, and following the current tab page.
- Adaptive tab pages show fewer bars on a small screen. Optional 4/8/16-bar overview sizes remain available; larger overviews trade readability for density.
- Frets at the same horizontal position sound together. Horizontal position represents time; strokes extending from notes indicate duration. The melody is distinguished from accompaniment.
- Key transposition, whole-octave register fitting, manual register choice, and optional compact progression voicings are separate operations.
- Fingerings are suggestions, not engraved performance editions. Wide spans and unplayable events are flagged. Overlapping synthesized voices need not correspond to a physically sustained fingering on one string.

Classical entries specify their actual extent, such as a theme, first strain, or opening pattern. Added harmonizations are educational arrangements, not claims to reproduce the composer's complete original score. The Stairway entry covers the existing 16 printed bars with their repeat (32 played bars), not the whole commercial song. Its four-line source is interpreted as high-G ukulele and re-fingered for other tunings. Articulation is simplified. See `CATALOG.md` and `CONTENT_NOTICE.md`.

#### Transposition as a visible invariant

The **Δn pattern** view compares a source voice and its transposed version. Each lane is normalized to its first pitch, so its shape remains aligned. Raw `n` labels move; signed gaps and rhythmic positions do not. The Tab view can annotate melody gaps, absolute `n`, scale degrees, or durations.

```text
n′ᵢ = nᵢ + k
Δnᵢ = nᵢ₊₁ − nᵢ
Δn′ᵢ = (nᵢ₊₁ + k) − (nᵢ + k) = Δnᵢ
```

For exact transposition, the same `k` applies to every voice, including simultaneous chord notes. The visual path follows an explicitly identified melody where available; otherwise it uses the highest attacked voice. A lowest-voice path is also available. A path is not a complete representation of polyphony.

Degree remapping into a different kind of scale can change semitone gaps. Compact chord revoicing can change octaves and inversions; the interface labels it as revoicing rather than claiming one fixed shift.

### Math

Six paginated chapters cover pitch coordinates and reduced fractions, scale sets and modular circles, melody and transposition, string harmonics, equal-division tuning comparisons, and a learning path. Interactive calculations, tables, standing-wave animation, and audition controls are preserved. Dense comparison tables page their columns on small screens.

## One pitch reference

```text
A4: n = 0
f(n) = 440 × 2^(n/12) Hz
n(f) = 12 × log₂(f/440)
```

The reduced exponent uses Euclidean division:

```text
n = 12m + r, with 0 ≤ r < 12
n/12 = m + r/12
```

Examples: `25/12 = 2 + 1/12`, `−9/12 = −1 + 1/4`, and `24/12 = 2`. The explicit plus sign avoids ambiguity for negative values. This fraction is an exponent, not itself a frequency ratio.

## Mobile interaction

The primary workspaces fit the available viewport without document scrolling. Subviews, focused settings sheets, tab pages, fret windows, and mathematical pages replace long stacked sections. Browser chrome and rotation are handled through the dynamic visual viewport. Fullscreen is optional where supported.

The piano and scores benefit from landscape; the tuner works in either orientation. All functions remain available without fullscreen. Long explanatory text and unusually large accessibility text can still use contained sheet scrolling rather than clipping information.

## Audio

The global **Pure sine / Harmonics** switch changes the synthesized timbre. Volume starts at 100% and subsequent choices are stored locally. A master compressor limits extreme sums; output loudness still depends on the device, so adjust headphones and system volume appropriately. Playback is synthesized, not a sampled guitar or ukulele.

## Privacy

All application computation and audio processing run locally in the browser. There are no remote compute resources, data APIs, analytics, accounts, cloud synchronization, recording, or uploads. Microphone samples are analyzed in memory and are not saved. Microphone access requires a user gesture, permission, and HTTPS or localhost; leaving the tuner stops its tracks.

Preferences and favorites use browser-local storage. A static web host necessarily receives requests for the website files and may keep its ordinary access logs. That hosting traffic is separate from app audio and settings, which are not sent to the host.

## Project structure

```text
index.html                 Application shell and accessible settings sheets
assets/icon.svg            Local application icon
src/theory.js              Pitch, scales, chords, tuning, and fingering mathematics
src/audio.js               Web Audio synthesis and local analysis routing
src/tuner-dsp.js            Monophonic tuning assessment and filter configuration
src/spectral-peaks.js       FFT peak measurement and harmonic relations
src/explore.js              Piano, circle, chord, and fretboard surfaces
src/explore-spectrum.js     Live app spectra and partial comparison
src/practice.js             Shared song player, tab paging, and interval paths
src/library.js              Built-in arrangements and attribution metadata
src/math.js                 Mathematical calculators and plots
src/layout.js               Viewport, settings sheets, and chapter pagination
src/hold.js                 Shared sustain/release lifecycle
src/app.js, src/boot.js     State, preferences, navigation, initialization
src/style.css              Responsive grayscale/cyan/magenta/yellow interface
tests/                     Theory, data, audio, UI, and static-delivery tests
```

## Compatibility and validation

A current browser with JavaScript, Canvas, SVG, and Web Audio is required. Microphone access depends on browser permissions and secure context. The website uses relative asset paths and a restrictive Content Security Policy; it has no runtime dependency on a package registry or CDN.

See `TEST_REPORT.md` for the tested viewport sizes, synthesis/DSP cases, lifecycle checks, and limitations. See `tests/README.md` for development-only test dependencies and commands.

## Content and licensing

Original application code is intended for the repository's MIT license. Musical compositions, third-party transcriptions, and other source material retain their own rights; the code license does not license that music. See `CONTENT_NOTICE.md`. The release archive does not replace an existing repository `LICENSE` file.
