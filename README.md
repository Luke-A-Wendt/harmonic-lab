# Harmonic Lab

**Music · Mathematics · Sound**

Harmonic Lab is an interactive, browser-based workspace for exploring pitch, scales, chords, instruments, tabs, and sound. The application runs from a standalone `index.html` file; no build step is required.

## Explore: pitch relationships

Choose a scale recipe and an optional compatible chord, then select a tonic on the key-relationship ring. Compare semitone steps, pitch coordinates, scale notes, and chord tones. The key ring arranges tonic choices by changes in their note sets.

Play notes on the **Scaleboard**, an adaptive keyboard with one key per scale note, or use the piano, guitar, ukulele, bass, mandolin, banjo, violin, viola, cello, kalimba, and accordion views. Cyan identifies scale notes and magenta identifies selected chord tones. Instrument views support note playback and horizontal navigation.

An **ideal harmonic spectroscope** at the bottom of Explore visualizes synthesized notes and their theoretical frequency components. It offers scrolling and live-spectrum views, logarithmic-octave or linear-Hz axes, and a freeze control. Cyan represents played signal components; white identifies the fundamental and harmonic markers.

## Spectrum & Tuner

The tuning workspace includes a visual instrument headstock with selectable reference strings, live pitch detection, a flat-to-sharp tuning meter, and microphone controls. Input cleanup and calibration options include low-frequency filtering, mains-hum rejection, and noise-gate settings.

Unlike the ideal displays in Explore and Tab Library, the tuner analyzes **measured audio**. It therefore shows real transients, noise, and spectral leakage rather than only the theoretical frequencies.

Microphone access requires browser permission and a secure context (HTTPS or localhost). Audio processing is local to the browser.

## Tab Library

Explore and play tab arrangements, examine their note and interval structures, and work with melody transformations between keys and scale recipes. The Tab Library also has an ideal harmonic spectroscope for notes played in the app.

## Math Lab

Investigate the mathematics of music, including exponential pitch-frequency relationships, semitone coordinates, scales, intervals, and harmonic series.

## Run locally

Open `index.html` in a modern browser. Some browser features, particularly microphone input, work best when the page is served from localhost or HTTPS.

To serve the folder locally with Python:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Notes

The educational spectroscopes show an **ideal harmonic model**, not a microphone recording. They are intended to explain the structure of synthesized notes; use Spectrum & Tuner for measured frequency analysis.
