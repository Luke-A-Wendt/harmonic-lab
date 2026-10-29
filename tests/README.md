# Development tests

The application has no runtime dependencies. These tests use development-only tools:

- Node.js for theory, spectral-peak, and repertoire assertions.
- Python 3, Playwright, NumPy, and Beautiful Soup for browser/audio/static tests.
- Chromium, available on PATH or selected with `CHROMIUM_PATH`.

Run from the project root:

```sh
node tests/theory.test.js
node tests/spectral.test.js
node tests/repertoire.test.js
python3 tests/audio_regression.py
python3 tests/browser.test.py
python3 tests/lifecycle.test.py
python3 tests/layout.test.py
python3 tests/static.test.py
```

`fixture.py` builds an offline, CSP-hashed in-memory page from the same source files. It does not modify the production website. The static test separately checks actual HTTP delivery at both a root path and a nested path.

The browser suite tests a clean preference store, pointer/keyboard/touch sustain, cancellation, pitch mapping, octave enclosure, spectrum toggles, partial comparison, spectral analysis, search, song playback, transposition, loops, paginated layouts, and privacy/no-network behavior. Screenshots are local test outputs.

Audio tests use deterministic synthetic samples through actual Web Audio filter nodes. Lifecycle tests use a native synthetic MediaStream, not a physical microphone. No test asserts universal accuracy for acoustic instruments, microphones, or phones.
