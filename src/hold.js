/* Shared press-to-sustain behavior for pointer, touch, keyboard, and assistive clicks. */
(function () {
  'use strict';
  const H = window.HL;
  const sessions = new Set();
  let serial = 0, generation = 0;
  const updateVisuals = () => {
    document.querySelectorAll('.held-note').forEach(el => el.classList.remove('held-note'));
    for (const token of sessions) if (!token.released && !token.cancelled) {
      token.notes.forEach(n => document.querySelectorAll(`[data-pitch="${n}"]`).forEach(el => el.classList.add('held-note')));
      token.element.classList.add('held-note');
    }
  };
  const notify = () => { updateVisuals(); H.emit('held-change', [...sessions].filter(s => !s.released && !s.cancelled).map(s => ({notes:s.notes, group:s.group}))); };
  function release(token, cancel=false) {
    if (!token || token.released) return;
    token.released = true; token.cancelled = cancel;
    if (token.voices) H.audio.release(token.voices, {immediate:cancel});
    sessions.delete(token); notify();
  }
  H.releaseHolds = () => { generation++; [...sessions].forEach(token => release(token,true)); };
  H.hasHeld = group => [...sessions].some(s => !s.released && (!group || s.group === group));
  H.bindHold = (element, getNotes, {allowed=()=>true, onBlocked=()=>{}, group='held', before=()=>{}}={}) => {
    let token = null, key = null;
    const begin = () => {
      if (token && !token.released) return;
      if (!allowed()) { onBlocked(); return; }
      before();
      const notes = [...getNotes()];
      if (!notes.length) return;
      const current = {id:++serial, generation, element, notes, group, released:false, cancelled:false, voices:null};
      token = current; sessions.add(current); notify();
      H.audio.ensure().then(() => {
        // A pointer-up before resume is a short tap. Navigation/cancel must never start late audio.
        if (current.cancelled || current.generation !== generation) return;
        current.voices = H.audio.schedule(notes, {sustain:true, timbre:H.state.harmonics?'pluck':'sine', group});
        H.emit('played', notes);
        if (current.released) H.audio.release(current.voices);
      }).catch(e => { release(current,true); H.toast(e.message); });
    };
    const end = cancel => { release(token, cancel); key=null; };
    element.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.pointerType !== 'touch') return;
      if (!allowed()) { onBlocked(); return; }
      // Pointer capture guarantees release even outside the key. Touch can still scroll; cancel releases.
      element.focus({preventScroll:true});
      try { element.setPointerCapture(e.pointerId); } catch {}
      begin();
    });
    element.addEventListener('pointerup', () => end(false));
    element.addEventListener('pointercancel', () => end(true));
    element.addEventListener('lostpointercapture', () => end(false));
    element.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (e.repeat || key) return;
      key=e.key; begin();
    });
    element.addEventListener('keyup', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); end(false); }
    });
    element.addEventListener('blur', () => end(false));
    element.addEventListener('contextmenu', e => e.preventDefault());
    // Screen readers may dispatch a click without pointerdown/keydown.
    element.addEventListener('click', e => {
      if (e.detail !== 0 || key) return;
      // Native synthetic click following a keyboard keyup is already handled above.
      if (token && Date.now() - (token.clickedAt||0) < 300) return;
      if (token && token.voices && H.audio.context.currentTime - token.voices[0]?.start < .3) return;
      if (!allowed()) { onBlocked(); return; }
      before(); H.play([...getNotes()], {duration:.5, group});
    });
    element.addEventListener('keyup', () => { if (token) token.clickedAt=Date.now(); });
    return () => end(true);
  };
  window.addEventListener('blur', H.releaseHolds);
  H.on('panic', H.releaseHolds);
})();
