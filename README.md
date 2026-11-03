# [Harmonic Lab](https://luke-a-wendt.github.io/harmonic-lab/)

Harmonic Lab is an interactive, browser-based music workbench for exploring pitch, scale and chord structures, playable instruments, tuning, harmonic spectra, and the mathematical patterns underlying melody and transposition.

## Explore

Explore musical relationships through pitch circles, semitone-step recipes, and a pitch-coordinate comparison. Choose a chord to constrain scale recipes to compatible structures. Play notes and chords using the on-screen piano and guitar/ukulele fretboards, with scale tones and chord tones visually distinguished. The keyboard supports a full range of complete octaves, and the fretboard includes a 48-fret option.

Independent scale and chord reference windows provide focused explanations and examples.

## Tab library and Transform

The Tab library includes songs, chord progressions, and theory studies. Transform is a unified workspace for studying a melody's key-independent pitch offsets, consecutive semitone gaps, and its relationship to a scale's degree pattern. Compare exact transposition with degree-based remapping between different scale recipes, including major-to-minor changes. Chromatic notes that do not have an unambiguous degree mapping are identified explicitly.

## Spectrum and tuner

The instrument tuner uses local microphone input, filtering, and pitch estimation. Live frequency spectra, a scrolling spectrogram, and input-cleanup controls help visualize fundamentals and harmonics. Microphone access requires permission.

## Math lab

Mathematical explanations connect semitone indices, equal temperament, frequency ratios, and harmonic relationships.

## Privacy and architecture

The application is a self-contained static website. Its music synthesis, microphone analysis, and interactive computations run in the browser. It does not require an application server, account, or remote audio-processing service. Reference links may lead to external educational websites if followed.

Browser permissions and local storage remain under the user's control. The tuner is an educational tool, not a certified measurement instrument.

## License

MIT. See [LICENSE](LICENSE).
