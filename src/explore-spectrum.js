/* App-only live spectra and labeled partial models. No microphone is used in Explore. */
(function(){
 'use strict';const H=window.HL,T=H.T,$=H.$;
 const S={mode:'waterfall',current:[-9],pinned:null,last:0,frame:0,pairs:[],notesKey:'',held:false};
 const bins=new Float32Array(4096);bins.fill(-120);
 const history=document.createElement('canvas');history.width=700;history.height=160;const hist=history.getContext('2d');
 hist.fillStyle='#141414';hist.fillRect(0,0,700,160);
 const low=30,high=8000,px=(f,w)=>Math.log(f/low)/Math.log(high/low)*w,fromX=(x,w)=>low*(high/low)**(x/w);
 function name(n){return H.noteName(n)}
 function names(ns){return ns.map(n=>`${name(n)} (${n})`).join(' · ')}
 function partials(ns,kind){const out=[];for(const n of ns)for(let h=1;h<=(H.state.harmonics?12:1);h++){const f=T.frequency(n)*h;if(f<=high)out.push({n,h,f,kind,amp:1/(h**1.45)})}return out;}
 function pairs(){
  const current=partials(S.current,'B'),reference=S.pinned?partials(S.pinned,'A'):[],out=[];
  const compare=(a,b)=>{if(a.n===b.n&&!reference.length)return;const cents=Math.abs(1200*Math.log2(a.f/b.f));if(cents<=12)out.push({a,b,cents,hz:Math.abs(a.f-b.f)})};
  if(reference.length)current.forEach(a=>reference.forEach(b=>compare(a,b)));
  else current.forEach((a,i)=>current.slice(i+1).forEach(b=>{if(a.n!==b.n)compare(a,b)}));
  return out.sort((a,b)=>a.cents-b.cents||(a.a.h+a.b.h)-(b.a.h+b.b.h));
 }
 function update(){
  S.pairs=pairs();$('harmonic-current').textContent='B · '+names(S.current);$('harmonic-pinned').textContent=S.pinned?'A · '+names(S.pinned):'A not pinned';
  $('piano-harmony-notes').textContent=S.current.map(name).join(' · ')+(H.state.harmonics?' · fundamental + upper partials':' · fundamental only');
  const text=!H.state.harmonics?'Pure sine: only fundamentals. Turn on Harmonics to compare upper partials.':S.pairs.length?`${S.pairs.length} near partial pairs within 12¢ · closest ${S.pairs[0].cents.toFixed(2)}¢ / ${S.pairs[0].hz.toFixed(2)} Hz apart.`:'No partial pairs within 12¢ in the modeled range. Pin A or hold a chord to compare.';
  $('harmonic-overlap-summary').textContent=text;
  const list=$('harmonic-pair-list');list.innerHTML='';
  const make=text=>{const p=document.createElement('div');p.className='partial-pair';p.textContent=text;list.appendChild(p)};
  make('B: '+names(S.current));if(S.pinned)make('A: '+names(S.pinned));
  if(!S.pairs.length)make(text);
  S.pairs.slice(0,20).forEach(({a,b,cents,hz})=>make(`${a.kind} ${name(a.n)} × ${a.h} ↔ ${b.kind} ${name(b.n)} × ${b.h} · ${a.f.toFixed(2)} / ${b.f.toFixed(2)} Hz · Δ ${cents.toFixed(2)}¢ (${hz.toFixed(2)} Hz)`));
 }
 function keys(){
  const holder=$('harmonic-keys');holder.innerHTML='';const set=T.scaleSet(H.state.root,H.state.mode);
  for(let n=H.startN();n<=H.startN()+12;n++){
   const on=set.includes(T.pc(n)),chord=H.state.chord&&T.chords[H.state.chord].offsets.some(o=>T.mod(H.state.root+o)===T.pc(n));const b=document.createElement('button');b.className=(on?'scale':'outside')+(chord?' chord':'');b.type='button';b.innerHTML=`${H.signed(n)}<span>${H.escape(name(n))}</span>`;b.setAttribute('aria-label',`${name(n)}, n ${n}, ${on?'hold to play':'outside scale'}`);b.setAttribute('aria-disabled',String(!on));H.registerPitch(b,n);H.bindHold(b,()=>[n],{allowed:()=>on,onBlocked:()=>H.toast('This pitch is outside the selected scale.')});holder.appendChild(b);
  }
 }
 function axes(ctx,w,h){const left=38,right=12,top=22,bottom=h-24,W=w-left-right,Hh=bottom-top;ctx.fillStyle='#141414';ctx.fillRect(0,0,w,h);ctx.font='9px ui-monospace,monospace';ctx.lineWidth=1;for(const f of [55,110,220,440,880,1760,3520,7040]){const x=left+px(f,W);ctx.strokeStyle='#323232';ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();ctx.fillStyle='#999';ctx.fillText(f>1000?(f/1000).toFixed(1)+'k':f,x-9,h-7);}ctx.fillText('Hz',w-16,h-7);return{left,right,top,bottom,W,H:Hh};}
 function db(f,sr){const index=f*8192/sr,i=Math.floor(index),part=index-i;return (Number.isFinite(bins[i])?bins[i]:-120)*(1-part)+(Number.isFinite(bins[i+1])?bins[i+1]:-120)*part;}
 function draw(advance=true){
  const c=$('explore-spectrum-canvas');if(!c||!c.clientWidth||!c.clientHeight)return;
  const w=c.clientWidth,h=c.clientHeight,dpr=Math.min(2,devicePixelRatio||1);if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);const d=axes(ctx,w,h),sr=H.audio.context?.sampleRate||48000;
  if(H.audio.analyser)H.audio.analyser.getFloatFrequencyData(bins);else bins.fill(-120);
  if(S.mode==='waterfall'){
   if(advance){hist.drawImage(history,0,1,700,159,0,0,700,159);const line=hist.createImageData(700,1);for(let x=0;x<700;x++){const v=Math.max(0,Math.min(1,(db(fromX(x,700),sr)+90)/65)),p=x*4;line.data[p]=18+v*62;line.data[p+1]=20+v*207;line.data[p+2]=20+v*217;line.data[p+3]=255;}hist.putImageData(line,0,159);}ctx.drawImage(history,d.left,d.top,d.W,d.H);
   ctx.fillStyle='#999';ctx.font='8px monospace';ctx.fillText('older',3,d.top+8);ctx.fillText('now',7,d.bottom);
  }else if(S.mode==='live'){
   for(const level of [-20,-50,-80]){const y=d.top+(-level/100)*d.H;ctx.fillStyle='#999';ctx.fillText(level,4,y+3);ctx.strokeStyle='#343434';ctx.beginPath();ctx.moveTo(d.left,y);ctx.lineTo(w-d.right,y);ctx.stroke();}
   ctx.beginPath();for(let x=0;x<=d.W;x++){const y=d.top+Math.max(0,Math.min(100,-db(fromX(x,d.W),sr)))/100*d.H;if(x)ctx.lineTo(d.left+x,y);else ctx.moveTo(d.left+x,y);}ctx.strokeStyle='#50e3ed';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#aaa';ctx.font='8px monospace';ctx.fillText('dBFS',2,11);
  }
  const all=[...partials(S.current,'B'),...(S.pinned?partials(S.pinned,'A'):[])];
  if(S.mode==='partials'){
   const families=[...S.current.map(n=>({n,kind:'B'})),...(S.pinned?S.pinned.map(n=>({n,kind:'A'})):[])];
   const rowH=d.H/Math.max(1,families.length);
   families.forEach((v,i)=>{
    const baseline=d.top+(i+1)*rowH-2;ctx.strokeStyle='#343434';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(d.left,baseline);ctx.lineTo(w-d.right,baseline);ctx.stroke();
    const color=v.kind==='A'?'#ed83d7':'#50e3ed';ctx.fillStyle=color;ctx.font='9px monospace';ctx.fillText(v.kind+' '+name(v.n),d.left+4,d.top+i*rowH+11);
    partials([v.n],v.kind).forEach(p=>{const x=d.left+px(p.f,d.W),height=Math.max(4,p.amp*(rowH-18));ctx.strokeStyle=color;ctx.lineWidth=p.h===1?2:1.3;ctx.beginPath();ctx.moveTo(x,baseline);ctx.lineTo(x,baseline-height);ctx.stroke();if(p.h<=6&&rowH>38){ctx.font='8px monospace';ctx.fillText(p.h+'',x+3,baseline-height-2);}});
   });
   S.pairs.slice(0,20).forEach(({a,b})=>{const x=d.left+px(Math.sqrt(a.f*b.f),d.W);ctx.strokeStyle='#f4d36b66';ctx.setLineDash([2,4]);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,d.top);ctx.lineTo(x,d.bottom);ctx.stroke();ctx.setLineDash([])});
   ctx.fillStyle='#aaa';ctx.font='9px monospace';ctx.fillText('MODEL · relative partial amplitudes',d.left,12);
  }else{
   all.forEach(p=>{const x=d.left+px(p.f,d.W);ctx.strokeStyle=p.kind==='A'?'#ed83d7':'#50e3ed';ctx.globalAlpha=p.h===1?.8:.20;ctx.setLineDash(p.kind==='A'?[4,3]:p.h===1?[]:[2,5]);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,d.top);ctx.lineTo(x,d.bottom);ctx.stroke();ctx.globalAlpha=1;ctx.setLineDash([]);if(p.h===1){ctx.fillStyle=p.kind==='A'?'#ed83d7':'#50e3ed';ctx.font='9px monospace';const offset=p.kind==='A'?9:0;ctx.fillText(name(p.n),Math.max(d.left,Math.min(w-50,x+3)),12+offset)}});
  }
 }
 function setMode(mode){S.mode=mode;document.querySelectorAll('[data-harm-plot]').forEach(b=>b.classList.toggle('active',b.dataset.harmPlot===mode));draw(false);}
 H.initExploreSpectrum=()=>{
  keys();update();
  document.querySelectorAll('[data-harm-plot]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.harmPlot)));
  $('harmonic-pin').addEventListener('click',()=>{S.pinned=[...S.current];setMode('partials');update()});$('harmonic-clear').addEventListener('click',()=>{S.pinned=null;update();draw(false)});
  H.on('played',notes=>{if(H.view==='explore'&&notes.length){S.current=[...new Set(notes)];update()}});
  H.on('held-change',sessions=>{if(H.view!=='explore')return;const notes=[...new Set(sessions.flatMap(s=>s.notes))];S.held=!!notes.length;if(notes.length){S.current=notes;update()}});
  H.on('state',patch=>{if(Object.keys(patch).every(k=>k==='volume'))return;const s=H.state;if(Object.keys(patch).some(k=>['root','mode','octave','chord'].includes(k)))S.current=(s.chord?T.chords[s.chord].offsets:[0]).map(o=>H.startN()+o);if(Object.keys(patch).some(k=>k!=='harmonics'))keys();update();});
  H.on('ex-pane',p=>{if(p==='harmonics'){keys();draw(false)}});H.on('resize',()=>{if(H.view==='explore'&&H.exPane==='harmonics')draw(false)});
  const animate=now=>{requestAnimationFrame(animate);if(H.view!=='explore'||H.exPane!=='harmonics'||document.hidden||now-S.last<50)return;S.last=now;const time=H.audio.context?.currentTime||0,sequence=[...H.audio.active].filter(v=>v.group==='sequence'&&!v.released&&v.start<=time&&v.end>time).map(v=>v.n);if(sequence.length&&sequence.join(',')!==S.current.join(',')){S.current=[...new Set(sequence)];update()}draw()};requestAnimationFrame(animate);H.exploreSpectrum=S;
 };
})();
