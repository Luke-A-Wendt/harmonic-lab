/* Application state, navigation, and shared instrument feedback. */
(function () {
  'use strict';
  const H = window.HL, T = H.T;
  const STORAGE_KEY = 'harmonic-lab-settings-v3';
  const views = ['explore', 'spectrum', 'practice', 'stairway', 'math'];
  H.$ = id => document.getElementById(id);
  H.escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  H.signed = n => String(n).replace(/-/g, '−');
  H.state = {root:0, mode:'major', octave:0, tuning:'guitar', frets:24, chord:null, step:7, harmonics:false, volume:1};
  H.previous = null;
  H.view = 'explore';
  H.events = new EventTarget();
  H.emit = (name, detail) => H.events.dispatchEvent(new CustomEvent(name, {detail}));
  H.on = (name, fn) => H.events.addEventListener(name, e => fn(e.detail));
  H.toast = message => {
    const el = H.$('toast');
    el.textContent = message; el.classList.add('show');
    clearTimeout(H.toastTimer);
    H.toastTimer = setTimeout(() => el.classList.remove('show'), 4300);
  };
  H.save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(H.state)); } catch {} };
  H.validateState = raw => {
    const out = {...H.state};
    if (Number.isInteger(raw.root) && raw.root >= 0 && raw.root < 12) out.root = raw.root;
    if (T.scales[raw.mode]) out.mode = raw.mode;
    if (Number.isInteger(raw.octave) && raw.octave >= -3 && raw.octave <= 3) out.octave = raw.octave;
    if (T.tunings[raw.tuning]) out.tuning = raw.tuning;
    if ([24,36,48].includes(raw.frets)) out.frets = raw.frets;
    if ([1,2,3,4,5,7].includes(raw.step)) out.step = raw.step;
    if (raw.chord === null || T.chords[raw.chord]) out.chord = raw.chord;
    if (typeof raw.harmonics === 'boolean') out.harmonics = raw.harmonics;
    if (Number.isFinite(raw.volume)) out.volume = Math.max(0, Math.min(1, raw.volume));
    return out;
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) H.state = H.validateState(saved);
    else {
      const legacy = JSON.parse(localStorage.getItem('harmonic-lab-state-v1'));
      if (legacy) H.state = H.validateState({...legacy, volume:1});
    }
  } catch {}
  H.update = patch => {
    if (['root','mode','octave','tuning','frets','chord','harmonics'].some(k => k in patch)) H.releaseHolds?.();
    if (('root' in patch && patch.root !== H.state.root) || ('mode' in patch && patch.mode !== H.state.mode)) {
      H.previous = {root:H.state.root, mode:H.state.mode};
    }
    Object.assign(H.state, patch); H.save(); H.emit('state', patch);
  };
  H.startN = () => H.state.root - 9 + 12 * H.state.octave;
  H.noteName = n => {
    const s=H.state,scale=T.scaleSpellings(s.root,s.mode);
    const chords=s.chord?T.chordSpellings(s.root,s.mode,s.chord):{};
    return T.note(n,{...chords,...scale});
  };
  H.options = (el, entries, value) => {
    el.innerHTML = '';
    for (const [v,label] of entries) {
      const option = document.createElement('option'); option.value = v; option.textContent = label; el.appendChild(option);
    }
    if (value !== undefined) el.value = value;
  };
  H.tuningOptions = el => H.options(el, Object.entries(T.tunings).map(([k,v]) => [k,v.name]));
  H.match = n => {
    document.querySelectorAll('.match').forEach(el => el.classList.remove('match'));
    if (n !== null) document.querySelectorAll(`[data-pitch="${n}"]`).forEach(el => el.classList.add('match'));
  };
  H.registerPitch = (el,n) => {
    el.dataset.pitch = n;
    const enter = () => {
      H.match(n);
      const s = H.state, included = T.scaleSet(s.root,s.mode).includes(T.pc(n));
      const chord = s.chord && T.chords[s.chord].offsets.some(o => T.mod(s.root+o) === T.pc(n));
      const inOctave = n >= H.startN() && n <= H.startN()+12;
      H.$('selected-note-info').textContent = `${H.noteName(n)} · n = ${H.signed(n)} · ${T.frequency(n).toFixed(2)} Hz`;
      H.$('neck-pitch-info')?.replaceChildren(document.createTextNode(`${H.noteName(n)} · ${included?'playable':'outside scale'}${chord?' · chord tone':''} · ${inOctave?'inside':'outside'} displayed octave`));
    };
    el.addEventListener('pointerenter', enter); el.addEventListener('pointerleave', () => H.match(null));
    el.addEventListener('focus', enter); el.addEventListener('blur', () => H.match(null));
  };
  H.play = async (ns, options={}) => {
    try {
      await H.audio.play(ns, {timbre:H.state.harmonics?'pluck':'sine', ...options}); H.emit('played', ns); return true;
    } catch (e) { H.toast(e.message); return false; }
  };
  H.playSequence = async (events, secondsPerBeat=.4) => {
    try {
      await H.audio.ensure(); H.audio.stop('sequence');
      const t = H.audio.context.currentTime+.04;
      events.forEach(e => H.audio.schedule(e.notes, {when:t+e.beat*secondsPerBeat, duration:e.duration*secondsPerBeat, timbre:H.state.harmonics?'pluck':'sine', group:'sequence'}));
    } catch (e) { H.toast(e.message); }
  };
  H.stopAll = () => { H.releaseHolds?.(); H.audio.stop(); H.emit('panic'); };
  H.setView = view => {
    if (!views.includes(view)) return;
    const old = H.view;
    if (old !== view) H.releaseHolds?.();
    if (old === 'spectrum' && view !== 'spectrum') {
      if (H.audio.stream) { H.audio.stopMic(); H.emit('mic-stopped'); }
      else H.audio.cancelMicRequest?.();
    }
    H.view = view;
    clearTimeout(H.toastTimer); H.$('toast').classList.remove('show');
    const surface = view === 'stairway' ? 'practice' : view;
    document.querySelectorAll('.view').forEach(el => { el.hidden = el.id !== `view-${surface}`; el.classList.toggle('active', !el.hidden); });
    document.querySelectorAll('.main-nav button').forEach(b => {
      const on = b.dataset.view === view; b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
    });
    if (location.hash !== `#${view}`) history.replaceState(null,'',`#${view}`);
    H.emit('view', view);
  };
  function soundControls() {
    H.$('harmonics').setAttribute('aria-pressed', String(H.state.harmonics));
    H.$('sine-mode').setAttribute('aria-pressed', String(!H.state.harmonics));
    H.$('volume').value = H.state.volume;
    H.$('volume-value').value = Math.round(H.state.volume*100)+'%';
  }
  H.initApp = () => {
    soundControls(); H.audio.setVolume(H.state.volume);
    document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => H.setView(b.dataset.view)));
    document.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => { H.setView(b.dataset.goto); window.scrollTo({top:0,behavior:'smooth'}); }));
    H.$('harmonics').addEventListener('click', () => H.update({harmonics:true}));
    H.$('sine-mode').addEventListener('click', () => H.update({harmonics:false}));
    H.$('volume').addEventListener('input', e => { H.audio.setVolume(e.target.value); H.update({volume:Number(e.target.value)}); });
    H.on('state', soundControls);
    H.$('panic').addEventListener('click', () => { H.stopAll(); H.toast('Playback stopped.'); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') H.stopAll(); });
    const guide = () => H.$('help-dialog').showModal();
    H.$('help-open').addEventListener('click', guide); H.$('guide-open').addEventListener('click', guide);
    H.$('privacy-open').addEventListener('click', () => H.$('privacy-dialog').showModal());
    // No server-side session, data fetch, account, or telemetry is used.
    window.addEventListener('beforeunload', () => { H.stopAll(); H.audio.stopMic(); });
    window.addEventListener('hashchange', () => { const v=location.hash.slice(1); if (views.includes(v)) H.setView(v); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { H.stopAll(); if (H.audio.stream) { H.audio.stopMic(); H.emit('mic-stopped'); } else H.audio.cancelMicRequest?.(); }
    });
    H.on('played', ns => {
      document.querySelectorAll('.playing-note').forEach(el => el.classList.remove('playing-note'));
      ns.forEach(n => document.querySelectorAll(`[data-pitch="${n}"]`).forEach(el => el.classList.add('playing-note')));
      clearTimeout(H.playedTimer);
      H.playedTimer = setTimeout(() => document.querySelectorAll('.playing-note').forEach(el => el.classList.remove('playing-note')), 450);
    });
    const initial = location.hash.slice(1); H.setView(views.includes(initial)?initial:'explore');
  };
})();
