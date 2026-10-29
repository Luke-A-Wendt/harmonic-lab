# Audio analysis and tuning

## Signal paths

```text
microphone or synthesized bus
  → raw analyzer
  → 16th-order high-pass filter (eight biquads)
  → optional 50/60 Hz notch
  → filtered analyzer
  → zero-gain analysis sink

synthesized bus
  → master volume
  → output compressor
  → speakers / headphones
```

The microphone has no audible monitoring path. It is analyzed in memory and is not recorded or transmitted. The synthesis output has a separate path so analysis filtering does not change the reference tone being heard.

Both analyzers use 8192 samples. FFT-bin spacing is `sample_rate / 8192`: approximately 5.38 Hz at 44.1 kHz or 5.86 Hz at 48 kHz. Interpolated peak locations are estimates between bins, not additional independent resolution. Periodicity estimation is performed on time-domain samples rather than snapped to FFT-bin centers.

## Filtering and input level

Automatic low-cut sets the cutoff to **0.85 × the lowest open-string frequency** of the selected tuning. Eight second-order sections form a 16th-order Butterworth high-pass. For order `N = 16`, section Q values are:

```text
Q_k = 1 / [2 cos((2k + 1)π / (2N))],  k = 0,…,7
```

Web Audio's high-pass Q parameter uses decibels; the implementation supplies `20 log10(Q_k)`. The optional notch uses the API's linear notch Q of 30. Manual cutoff is capped below 95% of the tuning’s lowest frequency. Bypass replaces the high-pass sections with all-pass sections; audible synthesis remains unaffected.

Native-browser transfer-function measurements for standard guitar and a cutoff near 70.046 Hz:

| Frequency | Gain |
| ---: | ---: |
| 50 Hz | −46.85 dB |
| 55 Hz | −33.61 dB |
| 60 Hz | −21.54 dB |
| Cutoff | −3.01 dB |
| E2, approximately 82.407 Hz | −0.024 dB |
| 110 Hz | Approximately 0 dB |

These characterize the filter, not pitch-detection accuracy in an arbitrary room. A steep filter has transient and phase behavior. It cannot remove background sound occupying the same frequencies as the string. The correct instrument preset is important: the open-string detector also rejects frequencies well outside the selected instrument’s expected range.

RMS level is measured after filtering. The initial gate is −62 dBFS. **Measure room noise** samples two seconds of filtered microphone level, takes the 80th percentile, adds 9 dB, and limits the result to −80…−28 dBFS. Strings should be muted during calibration. Clipping detection also checks raw input, so filtering cannot hide an overloaded microphone waveform.

All levels are relative digital measurements in dBFS, not calibrated sound-pressure levels.

## Fundamental estimation

The detector follows these stages:

1. Reject clipped input or a signal below the level gate.
2. Estimate periodicity using a YIN-style cumulative-mean normalized difference. A decimated search is refined at the original sample rate.
3. Compare interpolated trough depths when evaluating longer periods. This reduces false subharmonic choices from sampled minima.
4. Require adequate periodicity and a frequency within the selected tuning’s search range.
5. Compare the strongest spectral peak with the estimated fundamental and plausible integer multiples.
6. Require stable consecutive estimates before declaring the string in tune. Median smoothing and spread checks reduce attack-related jumps.
7. Compare against a locked peg or nearest open-string pitch without snapping the measured frequency to the target.

A stronger upper harmonic is not automatically a tuning error. When the fundamental is established, the diagnostic can report **“E2 in tune · 2nd harmonic is louder”**, show both frequencies, and distinguish pitch from spectral brightness.

A missing fundamental is different from an isolated overtone. Several consistent harmonics can establish a common lower period; a lone sine one octave above the selected string does not prove that the lower fundamental is present. The latter receives an octave/harmonic ambiguity diagnostic rather than an automatic divide-by-two correction. Automatic matching estimates the closest open-string pitch, not the identity of the physical source string.

## Sustained references and microphone lifecycle

Pressing **Hold target** starts a steady reference envelope. Pointer, touch, or keyboard release ends it with a short decay. Navigation, pointer cancellation, window blur, and global stop release held voices. Async audio initialization uses a generation guard to prevent a cancelled interaction from starting later.

While a target is held, microphone tuning judgments remain paused for the entire hold. After release, a 450 ms settling window allows the reference sound to decay. Brief app-generated tones also have a suppression interval. Headphones remain useful because room reverberation and speaker feedback can outlast any fixed delay.

Microphone permission is explicit. Stopping the input or leaving the tuner stops its media tracks. A delayed permission result is discarded and its tracks stopped if the workspace has already been left.

## Optional spectral-peak decomposition

The **Peaks** detail sheet is closed by default. The compact dominant-frequency overview analyzes the filtered FFT roughly twice per second; opening Peaks uses those snapshots for a complete paginated list. Closing the sheet stops detailed rendering, not the compact overview. Freeze preserves the shared measurements and spectrum display.

The main loudest-peak frequency uses a five-frame median while estimates stay within 45 cents of the same peak. The three compact frequency chips cluster recent measurements over approximately 850 ms. Fading peaks are marked as held rather than presented as new input. A stable fundamental may remain for up to 1.4 seconds during quiet/unclear decay, with a “Last stable reading” label. Clipping, inconsistent spectra, and other contradictory diagnoses clear it.

The scrolling spectrogram is the initial graph. Live is a toggle, not a second stacked panel. Axis, raw overlay, source routing, and filter settings are in the tuner settings sheet; detailed detection confidence and diagnostic text have their own view.

### Peak selection

The search spans 30 Hz to 12 kHz, bounded by the available Nyquist range. The default detection floor is the largest of:

```text
−96 dBFS
median spectral floor + 12 dB
strongest bin − 48 dB
```

Local maxima must have at least 6 dB prominence against nearby samples. Quadratic interpolation in logarithmic amplitude refines their frequencies and levels. Candidates closer than three FFT bins are suppressed to avoid displaying closely spaced leakage peaks as independent partials. At most 128 candidates are retained; the UI shows the selected 12, 24, or 48.

The default ordering is descending amplitude. A frequency-order option keeps the original amplitude rank visible so harmonic references stay unambiguous.

For each measured frequency `f`:

```text
n_measured = 12 log₂(f / 440)
n_nearest = round(n_measured)
cents_from_nearest = 100 × (n_measured − n_nearest)
```

### Harmonic relationships

Each peak is compared with lower measured peaks. A near-integer ratio from 2 through 16 is reported as a possible harmonic relationship. The tolerance is resolution-aware:

```text
tolerance = max(8, min(40, 1200 log₂(1 + bin_spacing / peak_frequency))) cents
```

Rows can reference several lower peaks. For example, a peak near 660 Hz can be both `3 × 220 Hz` and `2 × 330 Hz`. These are compatible mathematical relationships, not two proven sound sources. The first two candidate relationships are displayed; any additional matches are counted.

A peak without an established lower partner is labeled **No lower measured match**, not “fundamental.” A fundamental can be weak or absent, multiple instruments can share partials, room resonances can create peaks, and strings can have inharmonic partials. This panel is an inspectable decomposition into resolved spectral peaks and possible harmonic families—not polyphonic note transcription or source separation.

## Validation boundary

Regression tests cover 44.1 and 48 kHz, all five presets, deterministic noise, lower-frequency interference, stronger upper harmonics, missing fundamentals, isolated overtones, detuning, clipping, filter response, and asynchronous audio/microphone cleanup. Browser lifecycle tests use a native synthetic MediaStream.

No physical guitar, ukulele, or microphone was measured for this release. Device processing, reverberation, inharmonicity, very short attacks, and multiple sound sources can affect results. Uncertain readings are intentionally rejected. [TEST_REPORT.md](TEST_REPORT.md) describes the completed checks.

## Primary references

- [W3C Web Audio API](https://www.w3.org/TR/webaudio/) — analyzer, filtering, and automation semantics.
- [MDN: getFloatFrequencyData](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getFloatFrequencyData) — frequency-domain data and dB values.
- [MDN: AudioParam](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam) — scheduled parameter changes and envelopes.
- [MDN: getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) — permission and secure-context requirements.
- [de Cheveigné and Kawahara, YIN (2002)](https://pubmed.ncbi.nlm.nih.gov/12002874/) — time-domain fundamental-frequency estimation.
- [UNSW Music Acoustics: strings](https://www.phys.unsw.edu.au/jw/strings.html) — standing waves and ideal-string modes.
