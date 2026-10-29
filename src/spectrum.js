(function(){
  'use strict';const H=window.HL,T=H.T,$=H.$,NS='http://www.w3.org/2000/svg';
  const S={tuning:'guitar',selected:-1,autoTarget:5,source:'synth',axis:'log',frozen:false,lastPitch:0,lastFrame:0,lastDetection:0,frequency:null,confidence:0,peak:null,history:[],polyUntil:0,filterMode:"auto",cutoff:70,hum:0,gate:-62,rawOverlay:false,calibratingUntil:0,calibration:[],stable:0,ignoreUntil:0,referenceHeld:false,peaksEnabled:false,peaksSort:"level",peaksCount:12,lastPeaks:0,peakSnapshot:null,plotMode:"waterfall",peaksPage:0,lastGood:0,peakHistory:[],lastPeakAt:0,lastDominant:0,dominantFrames:[]};
  const frequencyData=new Float32Array(4096),timeData=new Float32Array(8192);frequencyData.fill(-120);
  const rawTime=new Float32Array(8192);
  const rawFrequency=new Float32Array(4096);rawFrequency.fill(-120);
  const history=document.createElement('canvas');history.width=900;history.height=190;const hc=history.getContext('2d');hc.fillStyle='#141414';hc.fillRect(0,0,history.width,history.height);
  function targetN(){const t=T.tunings[S.tuning];return t.open[S.selected<0?Math.min(S.autoTarget,t.open.length-1):S.selected]}
  function svgEl(tag,attrs,parent){const el=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));if(parent)parent.appendChild(el);return el}
  function headstock(){
    stringStrip();
    const holder=$('tuning-headstock');holder.innerHTML='';const t=T.tunings[S.tuning],svg=svgEl('svg',{viewBox:'0 0 310 245',role:'group','aria-label':t.name+' tuning pegs'},holder);
    svgEl('path',{d:'M128 12 Q155 0 182 12 L189 155 L176 178 L176 242 L134 242 L134 178 L121 155 Z',fill:'#303030',stroke:'#7a7a7a','stroke-width':2},svg);
    for(let j=0;j<t.open.length;j++){const x=139+j*(32/Math.max(1,t.open.length-1));svgEl('line',{x1:x,x2:x,y1:22,y2:242,stroke:'#959595','stroke-width':1},svg)}
    svgEl('line',{x1:133,x2:177,y1:182,y2:182,stroke:'#c9c9c9','stroke-width':4},svg);
    const count=t.open.length/2;
    t.open.forEach((n,i)=>{
      const left=i>=count,slot=left?i-count:count-1-i,x=left?7:196,y=25+slot*(t.open.length===6?48:65),on=(S.selected<0?S.autoTarget:S.selected)===i;
      svgEl('line',{x1:left?108:185,x2:left?135:178,y1:y+15,y2:y+15,stroke:'#848484','stroke-width':5},svg);
      const g=svgEl('g',{class:'tuner-peg',role:'button',tabindex:'0','aria-label':`Tune string ${i+1}, ${t.labels[i]}, ${T.frequency(n).toFixed(2)} Hz`,'data-string':i},svg);
      svgEl('rect',{x,y,width:107,height:38,rx:8,fill:on?'#353535':'#272727',stroke:on?'#ed83d7':'#646464','stroke-width':on?2:1},g);
      let tx=svgEl('text',{x:x+12,y:y+16,fill:'#f2f2f2','font-size':12,'font-weight':600},g);tx.textContent=t.labels[i];
      tx=svgEl('text',{x:x+12,y:y+30,fill:'#a9a9a9','font-size':9},g);tx.textContent=`${T.frequency(n).toFixed(2)} Hz · n ${n}`;
      const select=()=>{S.selected=i;resetHistory();headstock();updateAuto();H.play([n],{duration:2});};g.addEventListener('click',select);g.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();select()}});
    });
  }
  function stringStrip(){
    const holder=$('tuner-strings'),t=T.tunings[S.tuning];holder.innerHTML='';
    t.open.forEach((n,i)=>{const b=document.createElement('button');b.type='button';b.className='tuner-string'+((S.selected<0?S.autoTarget:S.selected)===i?' active':'');b.dataset.string=i;
      b.innerHTML=`<strong>${T.note(n)}</strong><small>${T.frequency(n).toFixed(2)} Hz</small>`;
      b.setAttribute('aria-label',`Select string ${i+1}, ${t.labels[i]}, ${T.frequency(n).toFixed(2)} Hz`);
      b.addEventListener('click',()=>{S.selected=i;resetHistory();headstock();updateAuto();H.play([n],{duration:.8})});holder.appendChild(b);
    });
    $('tuner-target-label').textContent=`${T.note(targetN())} · ${T.frequency(targetN()).toFixed(2)} Hz`;
  }
  function updateAuto(){$('tuner-auto').classList.toggle('active',S.selected<0);$('tuner-auto').setAttribute('aria-pressed',String(S.selected<0))}
  function micUI(){const on=!!H.audio.stream;$('mic-status').textContent=on?'MIC LIVE · ON DEVICE':'MIC OFF';$('mic-status').classList.toggle('live',on);$('mic-stop').disabled=!on;$('mic-start').disabled=on;$('mic-start').textContent=on?'Mic live':'Start mic';}
  async function startMic(){
    $('mic-start').disabled=true;$('mic-start').textContent='Allow mic…';
    try{const ok=await H.audio.startMic();if(ok){S.source='mic';resetHistory();$('spectrum-source').value='mic';$('tuner-message').textContent='Listening locally. Pluck one open string. The microphone is not played back or recorded.';}}
    catch(e){const msg=e.name==='NotAllowedError'?'Microphone permission denied. You can still use the synthetic instruments.':e.message;H.toast(msg);$('tuner-message').textContent=msg;}
    finally{micUI()}
  }
  function cancelCalibration(){S.calibratingUntil=0;S.calibration=[];$('calibrate-noise').textContent='Measure room noise';}
  function stopMic(){H.audio.stopMic();cancelCalibration();resetHistory();S.source='synth';$('spectrum-source').value='synth';micUI();$('tuner-message').textContent='Microphone stopped. Displaying app instruments.';}
  function resetHistory(){S.history=[];S.frequency=null;S.stable=0;S.lastGood=0;}
  function configureFilter(){
    const config=T.tuner.filterSettings(T.tunings[S.tuning],S.filterMode,S.cutoff,S.hum);S.filter=config;
    H.audio.configureAnalysis(config);$('lowcut-hz').max=(config.lowest*.95).toFixed(1);$('lowcut-hz').disabled=S.filterMode!=='manual';$('lowcut-hz').value=config.cutoff.toFixed(1);if(S.filterMode==='manual')S.cutoff=config.cutoff;
    $('filter-summary').textContent=config.enabled?`Low-cut ${config.cutoff.toFixed(1)} Hz · 96 dB/octave · lowest string ${config.lowest.toFixed(2)} Hz`:'Low-cut bypassed · sub-string noise may dominate';
    resetHistory();S.calibration=[];S.calibratingUntil=0;$('calibrate-noise').textContent='Measure room noise';
    hc.fillStyle='#141414';hc.fillRect(0,0,900,190);
  }
  function diagnostic(kind,title,message){
    $('tuning-diagnostic').dataset.kind=kind;$('diagnostic-title').textContent=title;$('diagnostic-detail').textContent=message;
  }
  function canvasContext(id){const canvas=$(id),width=Math.max(200,Math.round(canvas.clientWidth)),height=Math.max(80,Math.round(canvas.clientHeight)),dpr=Math.min(2,window.devicePixelRatio||1);if(canvas.width!==width*dpr||canvas.height!==height*dpr){canvas.width=width*dpr;canvas.height=height*dpr}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return{ctx,w:width,h:height}}

  const range=()=>S.axis==='log'?[45,5000]:[0,5000];
  function fx(f,width){const [lo,hi]=range();return S.axis==='log'?Math.log(f/lo)/Math.log(hi/lo)*width:(f-lo)/(hi-lo)*width}
  function frequencyAt(x,width){const [lo,hi]=range();return S.axis==='log'?lo*(hi/lo)**(x/width):lo+(hi-lo)*x/width}
  function sampleDb(f,sr,data=frequencyData){const i=f/(sr/8192),idx=Math.floor(i),fraction=i-idx;return (Number.isFinite(data[idx])?data[idx]:-120)*(1-fraction)+(Number.isFinite(data[idx+1])?data[idx+1]:-120)*fraction}
  function frameAxes(ctx,w,h,water=false){
    const L=w<500?32:46,R=12,top=23,bottom=h-23,plotW=w-L-R,plotH=bottom-top;
    ctx.fillStyle='#141414';ctx.fillRect(0,0,w,h);ctx.font=(w<500?'8':'10')+'px ui-monospace,monospace';ctx.fillStyle='#9d9d9d';ctx.lineWidth=1;
    if(!water)for(const db of [-12,-36,-60,-84]){const y=top+(-db/100)*plotH;ctx.strokeStyle='#313131';ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(w-R,y);ctx.stroke();ctx.fillText(db+'',8,y+3)}
    const ticks=S.axis==='log'?(w<460?[55,220,880,3520]:[55,110,220,440,880,1760,3520]):(w<460?[0,2000,4000]:[0,1000,2000,3000,4000,5000]);
    for(const f of ticks){const x=L+fx(f,plotW);ctx.strokeStyle='#343434';ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();ctx.fillStyle='#a5a5a5';ctx.fillText(f>=1000?(f/1000).toFixed(f%1000?2:0)+'k':String(f),Math.max(2,Math.min(w-38,x-10)),h-10)}
    ctx.fillText('Hz',w-21,h-10);if(!water)ctx.fillText('dBFS',5,13);else{ctx.fillText('older',4,35);ctx.fillText('now',7,bottom-2)}return{L,R,top,bottom,plotW,plotH};
  }
  function markers(ctx,d,w){
    const fundamental=T.frequency(targetN()),label=T.note(targetN());
    for(let h=1;h<=8;h++){const f=fundamental*h,[lo,hi]=range();if(f<Math.max(1,lo)||f>hi)continue;const x=d.L+fx(f,d.plotW);ctx.strokeStyle=h===1?'#ed83d7':'#f4d36b';ctx.globalAlpha=h===1?.85:.35;ctx.setLineDash(h===1?[]:[3,4]);ctx.beginPath();ctx.moveTo(x,d.top);ctx.lineTo(x,d.bottom);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;if(h===1){ctx.fillStyle='#ed83d7';ctx.font='10px ui-monospace,monospace';ctx.fillText(`${label} · ${fundamental.toFixed(2)} Hz`,Math.min(w-160,Math.max(d.L,x+5)),14)}else{ctx.fillStyle='#d5bb70';ctx.font='9px monospace';ctx.fillText(`${h}f₀`,Math.min(w-26,x+3),d.top+12)}}
  }
  function drawSpectrum(sr){
    const {ctx,w,h}=canvasContext('spectrum-canvas'),d=frameAxes(ctx,w,h);
    if(S.filter?.enabled){const xx=d.L+Math.max(0,fx(S.filter.cutoff,d.plotW));ctx.fillStyle='#ffffff08';ctx.fillRect(d.L,d.top,Math.max(0,xx-d.L),d.plotH);ctx.strokeStyle='#8a8a8a';ctx.setLineDash([2,4]);ctx.beginPath();ctx.moveTo(xx,d.top);ctx.lineTo(xx,d.bottom);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#aaa';ctx.font='9px monospace';ctx.fillText('LOW CUT',Math.max(d.L,xx-48),d.bottom-6);}
    const trace=(data,color,line)=>{ctx.beginPath();for(let x=0;x<=d.plotW;x++){const f=frequencyAt(x,d.plotW),db=Math.max(-100,Math.min(0,sampleDb(f,sr,data))),y=d.top+(-db/100)*d.plotH;if(x===0)ctx.moveTo(d.L+x,y);else ctx.lineTo(d.L+x,y)}ctx.strokeStyle=color;ctx.lineWidth=line;ctx.stroke()};
    if(S.rawOverlay)trace(rawFrequency,'#8a8a8a',1);trace(frequencyData,'#50e3ed',1.5);markers(ctx,d,w);
  }
  function drawWaterfall(sr,advance){
    if(advance){hc.drawImage(history,0,1,900,189,0,0,900,189);const row=hc.createImageData(900,1);for(let x=0;x<900;x++){const f=frequencyAt(x,900),db=sampleDb(f,sr),v=Math.max(0,Math.min(1,(db+90)/65)),i=x*4;row.data[i]=17+Math.round(v*63);row.data[i+1]=20+Math.round(v*207);row.data[i+2]=22+Math.round(v*215);row.data[i+3]=255}hc.putImageData(row,0,189);}
    const {ctx,w,h}=canvasContext('waterfall-canvas'),d=frameAxes(ctx,w,h,true);ctx.drawImage(history,d.L,d.top,d.plotW,d.plotH);markers(ctx,d,w);
  }
  function clearDetection(message,hold=false){
    if(hold&&S.lastGood&&performance.now()-S.lastGood<1400){$('detected-frequency').dataset.held='true';$('detected-n').textContent='Last stable reading · waiting for next pluck';return;}
    $('detected-frequency').dataset.held='false';resetHistory();$('detected-note').textContent='—';$('detected-frequency').textContent=message;$('detected-n').textContent='n = 12 log₂(f / 440)';$('f0-readout').textContent='—';$('confidence-readout').textContent='Pluck one open string at a time';$('cents-readout').textContent='—';$('cents-readout').style.color='var(--text)';$('meter-needle').style.opacity='.2';
  }
  function updateDetection(sr,now){
    const rawLevel=T.tuner.levels(rawTime);const result=T.tuner.assess(timeData,sr,frequencyData,{tuning:T.tunings[S.tuning],selected:S.selected,gate:S.gate,rawPeak:rawLevel.peak});S.analysis=result;
    $('input-level').textContent=`Raw ${rawLevel.db.toFixed(1)} → filtered ${result.input.db.toFixed(1)} dBFS · gate ${S.gate.toFixed(0)} dBFS`;
    if(S.calibratingUntil){S.calibration.push(result.input.db);clearDetection('Measuring room noise…');
      diagnostic('waiting','Keep the strings quiet',`Measuring the filtered room level for ${Math.max(0,(S.calibratingUntil-now)/1000).toFixed(1)} more seconds.`);
      if(now>=S.calibratingUntil){const sorted=S.calibration.filter(Number.isFinite).sort((a,b)=>a-b),floor=sorted[Math.floor(sorted.length*.8)]??-75;S.gate=Math.max(-80,Math.min(-28,floor+9));$('noise-gate').value=Math.round(S.gate);S.calibratingUntil=0;$('calibrate-noise').textContent='Measure room noise';diagnostic('waiting','Noise floor measured',`Filtered room floor ${floor.toFixed(1)} dBFS; gate set 9 dB above it (${S.gate.toFixed(1)} dBFS). Pluck an open string.`);}return;
    }
    const peak=result.peak;S.peak=peak;
    if(peak&&peak.db>-80){
      if(S.peakHistory.length&&Math.abs(1200*Math.log2(peak.frequency/S.peakHistory.at(-1)))>45)S.peakHistory=[];
      S.peakHistory.push(peak.frequency);if(S.peakHistory.length>5)S.peakHistory.shift();
      const sorted=[...S.peakHistory].sort((a,b)=>a-b),pf=sorted[Math.floor(sorted.length/2)],pn=T.semitones(pf);
      $('peak-readout').textContent=pf.toFixed(2)+' Hz';$('peak-note').textContent=`${T.note(Math.round(pn))} · n ${pn.toFixed(2)} · ${peak.db.toFixed(0)} dBFS`;S.lastPeakAt=now;
    }else if(now-S.lastPeakAt<1200&&S.lastPeakAt){$('peak-note').textContent='Last peak · signal fading';}
    else{$('peak-readout').textContent='—';$('peak-note').textContent='No resolved peak';S.peakHistory=[];}
    if(S.source==='mic'&&(S.referenceHeld||now<S.ignoreUntil)){clearDetection('Waiting for reference tone to finish');diagnostic('waiting','Reference tone is playing','Pitch judgment pauses while the app plays a reference through your speakers. Let it stop, then pluck the real string.');return;}
    if(now<S.polyUntil){clearDetection('Use one string, not a chord');diagnostic('waiting','Monophonic tuning','Mute the other strings and pluck one open string.');return;}
    if(result.reason!=='pitch'){
      const labels={quiet:['Waiting for a pluck','Noise gate closed. Low-frequency rumble is filtered before pitch analysis.'],clipping:['Input is clipping','Reduce the microphone gain or move the instrument farther away.'],unclear:['No reliable pitch yet','Let the attack settle, move closer to the microphone, and mute other strings.'],inconsistent:['Spectrum does not agree','The strongest peak does not match the detected harmonic family. Try one clean open-string pluck.'],'below-range':['Below the tuning range','The remaining low band is outside this preset’s safe open-string range. Choose the correct tuning. A very flat string or a low room hum is not automatically treated as an in-tune note.']};
      const [title,message]=labels[result.reason]||labels.unclear;clearDetection(title,['quiet','unclear'].includes(result.reason));diagnostic('waiting',title,message);return;
    }
    const nf=result.frequency;
    if(S.history.length&&Math.abs(1200*Math.log2(nf/S.history.at(-1)))>65)S.history=[];
    S.history.push(nf);if(S.history.length>4)S.history.shift();
    const sorted=[...S.history].sort((a,b)=>a-b),f=sorted[Math.floor(sorted.length/2)],spread=1200*Math.log2(sorted.at(-1)/sorted[0]),stable=S.history.length>=3&&spread<16;S.stable=stable?S.history.length:0;
    const n=T.semitones(f),rounded=Math.round(n);S.frequency=f;S.confidence=result.confidence;
    if(stable)S.lastGood=now;$('detected-frequency').dataset.held='false';
    if(S.selected<0&&stable&&Math.abs(result.nearest.cents)<250&&S.autoTarget!==result.nearest.i){S.autoTarget=result.nearest.i;headstock();}
    const target=targetN(),cents=1200*Math.log2(f/T.frequency(target)),label=T.note(target),inTune=stable&&Math.abs(cents)<3&&!result.ambiguity;
    $('detected-note').textContent=T.note(rounded);$('detected-frequency').textContent=f.toFixed(2)+' Hz';$('detected-n').textContent=`n ${n.toFixed(3)} · nearest ${rounded}`;
    $('f0-readout').textContent=f.toFixed(2)+' Hz';$('confidence-readout').textContent=`Periodicity ${(result.confidence*100).toFixed(0)}% · ${stable?'stable':'settling'} · ${S.selected<0?'inferred':'locked'} ${label}`;
    $('cents-readout').textContent=`${cents>0?'+':''}${cents.toFixed(1)}¢ · ${label}`;$('cents-readout').style.color=inTune?'var(--cyan)':'var(--text)';$('meter-needle').style.opacity=stable?'1':'.45';$('meter-needle').style.left=Math.max(0,Math.min(100,50+cents))+'%';
    const h=result.harmonics.dominant;
    if(result.ambiguity){diagnostic('uncertain','Octave / harmonic ambiguity',result.ambiguity);return;}
    if(!stable){diagnostic('waiting','Let the pluck settle','Comparing consecutive pitch estimates before declaring the string in tune.');return;}
    if(h>1){const ordinal=h===2?'2nd':h===3?'3rd':h+'th',delta=result.harmonics.delta;
      diagnostic(inTune?'tuned':'harmonic',inTune?`${label} in tune · ${ordinal} harmonic is louder`:`${ordinal} harmonic is louder · tune the fundamental`,
       `Fundamental ${f.toFixed(2)} Hz (${cents>=0?'+':''}${cents.toFixed(1)}¢ from ${label}). Loudest peak ${peak.frequency.toFixed(2)} Hz ≈ ${h} × f₀${delta!==null?', '+delta.toFixed(1)+' dB above the fundamental peak':''}. ${inTune?'The string pitch is correct; do not retune to the louder harmonic.':'Follow the cents meter, not the loudest peak.'}`);
    }else if(inTune)diagnostic('tuned',`${label} in tune`,`${f.toFixed(2)} Hz · stable within ±3 cents. The fundamental is also the strongest measured peak.`);
    else diagnostic('adjust',Math.abs(cents)>250?'Check the selected string':cents<0?'Flat · tighten gently':'Sharp · loosen gently',`${f.toFixed(2)} Hz is ${Math.abs(cents).toFixed(1)} cents ${cents<0?'below':'above'} ${label}. Target ${T.frequency(target).toFixed(2)} Hz. No snapping or forced octave correction.`);
  }
  function renderPeaks() {
    const data=S.peakSnapshot;if(!data){$('peaks-summary').textContent='Waiting for audio.';return;}
    const all=[...data.peaks].sort(S.peaksSort==='frequency'?(a,b)=>a.frequency-b.frequency:(a,b)=>b.level-a.level).slice(0,S.peaksCount);
    const container=$('peaks-body'),columns=innerHeight<=540&&innerWidth>=600?2:1;
    const capacity=Math.max(columns,Math.floor((container.clientHeight||300)/86)*columns),pages=Math.max(1,Math.ceil(all.length/capacity));S.peaksPage=Math.max(0,Math.min(pages-1,S.peaksPage));
    const selected=all.slice(S.peaksPage*capacity,(S.peaksPage+1)*capacity);container.innerHTML='';
    for(const p of selected){
      const card=document.createElement('div');card.className='peak-card';card.dataset.peakRank=p.rank;
      const child=(cls,text)=>{const e=document.createElement('span');e.className=cls;e.textContent=text;card.appendChild(e);return e};
      child('peak-rank','#'+p.rank);child('peak-frequency',p.frequency.toFixed(2)+' Hz');child('peak-level',p.level.toFixed(1)+' dBFS');
      const meta=child('peak-meta','');const note=document.createElement('span');note.textContent=T.note(p.nearestN)+' · '+(p.cents>=0?'+':'')+p.cents.toFixed(1)+'¢';const n=document.createElement('span');n.textContent='n '+H.signed(p.n.toFixed(3))+' / '+H.signed(p.nearestN);meta.append(note,n);
      const text=p.harmonics.length?p.harmonics.slice(0,2).map(h=>`≈ ${h.harmonic} × #${h.rank} (${h.frequency.toFixed(1)} Hz)`).join(' · '):'No lower measured match';
      child('peak-relation',text);container.appendChild(card);
    }
    if(!selected.length){const p=document.createElement('p');p.className='micro';p.textContent='No peaks above the detection floor. Pluck a string or hold a reference tone.';container.appendChild(p)}
    $('peaks-summary').textContent=`${S.frozen?'Frozen':'Live'} · ${all.length} peaks · ${data.resolution.toFixed(2)} Hz/bin · floor ${data.threshold.toFixed(0)} dBFS`;
    $('peaks-page').textContent=`${S.peaksPage+1} / ${pages}`;$('peaks-prev').disabled=S.peaksPage===0;$('peaks-next').disabled=S.peaksPage>=pages-1;
  }
  function dominantReadout(data,now){
    const peaks=data.peaks.slice(0,8);S.dominantFrames.push({at:now,peaks});S.dominantFrames=S.dominantFrames.filter(f=>now-f.at<850);
    const clusters=[];
    for(const frame of S.dominantFrames)for(const p of frame.peaks){let c=clusters.find(c=>Math.abs(c.frequency-p.frequency)<=Math.max(data.resolution*1.2,p.frequency*.014));if(!c){c={frequency:p.frequency,values:[],levels:[],last:0};clusters.push(c)}c.values.push(p.frequency);c.levels.push(p.level);c.last=frame.at;}
    const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
    clusters.forEach(c=>{c.frequency=median(c.values);c.level=median(c.levels)});clusters.sort((a,b)=>b.level-a.level);
    const chosen=clusters.filter(c=>now-c.last<900).slice(0,3),holder=$('dominant-strip');holder.innerHTML='';
    if(!chosen.length){const empty=document.createElement('span');empty.textContent='Dominant frequencies · waiting for a note';holder.appendChild(empty);return;}
    chosen.forEach(c=>{const n=T.semitones(c.frequency),el=document.createElement('div');el.className='dominant-chip'+(now-c.last>350?' held':'');el.innerHTML=`<strong>${c.frequency.toFixed(1)} Hz</strong><span>${H.escape(T.note(Math.round(n)))} · n ${n.toFixed(1)}${now-c.last>350?' · held':''}</span>`;holder.appendChild(el)});
    H.emit('dominant',chosen);
  }
  function measurePeaks(sr,now=performance.now()){const snapshot=H.spectral.analyze(frequencyData,sr);S.peakSnapshot=snapshot;dominantReadout(snapshot,now);if(S.peaksEnabled)renderPeaks();}
  function setPlot(mode){S.plotMode=mode;$('spectrum-canvas').hidden=mode!=='live';$('waterfall-canvas').hidden=mode!=='waterfall';document.querySelectorAll('[data-tuner-plot]').forEach(b=>b.classList.toggle('active',b.dataset.tunerPlot===mode));$('plot-status').textContent=mode==='waterfall'?'Newest at bottom':'Level · dBFS';redraw();}
  function redraw(){const sr=H.audio.context?.sampleRate||48000;if(S.plotMode==='live')drawSpectrum(sr);else drawWaterfall(sr,false);}
  function toggleFreeze(){S.frozen=!S.frozen;$('freeze-spectrum').textContent=S.frozen?'Resume':'Freeze';$('peaks-freeze').textContent=S.frozen?'Resume':'Freeze';if(S.peaksEnabled)renderPeaks();}
  function animate(now) {
    requestAnimationFrame(animate);
    if(H.view!=='spectrum'||S.frozen||now-S.lastFrame<45) return;
    S.lastFrame=now;
    const analyser=S.source==='mic'?H.audio.micAnalyser:H.audio.tunerAnalyser,sr=H.audio.context?.sampleRate||48000;
    if(analyser) {
      analyser.getFloatFrequencyData(frequencyData);analyser.getFloatTimeDomainData(timeData);
      const raw=S.source==='mic'?H.audio.micAnalysis?.raw:H.audio.synthAnalysis?.raw;
      raw?.getFloatFrequencyData(rawFrequency);raw?.getFloatTimeDomainData(rawTime);
    } else {frequencyData.fill(-120);timeData.fill(0);rawFrequency.fill(-120);rawTime.fill(0)}
    if(now-S.lastDetection>160) {updateDetection(sr,now);S.lastDetection=now;}
    if(now-S.lastPeaks>480){measurePeaks(sr,now);S.lastPeaks=now;}
    if(S.plotMode==='live')drawSpectrum(sr);else drawWaterfall(sr,true);
    $('fft-info').textContent=`8192 samples · ${(sr/8192).toFixed(2)} Hz/bin · ${sr/1000} kHz`;
  }
  H.initSpectrum=()=>{
    H.tuningOptions($('tuner-tuning'));$('tuner-tuning').value=S.tuning;headstock();
    $('tuner-tuning').addEventListener('change',e=>{H.releaseHolds();S.tuning=e.target.value;S.selected=-1;S.autoTarget=T.tunings[S.tuning].open.length-1;configureFilter();headstock();updateAuto()});
    $('tuner-auto').addEventListener('click',()=>{H.releaseHolds();S.selected=-1;resetHistory();headstock();updateAuto()});H.bindHold($('tuner-reference'),()=>[targetN()],{group:'reference'});
    $('mic-start').addEventListener('click',startMic);$('mic-stop').addEventListener('click',stopMic);H.on('mic-stopped',()=>{cancelCalibration();resetHistory();S.source='synth';$('spectrum-source').value='synth';micUI()});
    $('spectrum-source').addEventListener('change',e=>{S.source=e.target.value;cancelCalibration();resetHistory();if(S.source==='mic'&&!H.audio.stream)H.toast('Press Start microphone to grant access.');});
    $('frequency-axis').addEventListener('change',e=>{S.axis=e.target.value;hc.fillStyle='#141414';hc.fillRect(0,0,900,190)});
    $('freeze-spectrum').addEventListener('click',toggleFreeze);$('peaks-freeze').addEventListener('click',toggleFreeze);
    $('lowcut-mode').addEventListener('change',e=>{if(e.target.value==='manual'&&S.filterMode!=='manual')S.cutoff=S.filter?.cutoff||70;S.filterMode=e.target.value;configureFilter()});
    $('lowcut-hz').addEventListener('change',e=>{S.cutoff=Number(e.target.value)||70;configureFilter()});
    $('hum-notch').addEventListener('change',e=>{S.hum=Number(e.target.value);configureFilter()});
    $('noise-gate').addEventListener('change',e=>{S.gate=Math.max(-80,Math.min(-28,Number(e.target.value)||-62));e.target.value=S.gate;resetHistory()});
    $('show-raw').addEventListener('change',e=>S.rawOverlay=e.target.checked);
    $('calibrate-noise').addEventListener('click',async()=>{if(S.source!=='mic'||!H.audio.stream){H.toast('Select Microphone and start it before measuring room noise.');return;}await H.audio.ensure();S.frozen=false;$('freeze-spectrum').textContent='Freeze';$('peaks-freeze').textContent='Freeze';H.audio.stop();S.calibration=[];S.calibratingUntil=performance.now()+2000;$('calibrate-noise').textContent='Keep quiet…';});
    $('peak-analysis-toggle').addEventListener('click',()=>{S.peaksEnabled=true;S.peaksPage=0;$('peak-analysis-toggle').setAttribute('aria-expanded','true');H.openDialog('peak-analysis-panel');measurePeaks(H.audio.context?.sampleRate||48000);});
    H.on('dialog-close',id=>{if(id==='peak-analysis-panel'){S.peaksEnabled=false;$('peak-analysis-toggle').setAttribute('aria-expanded','false');}});
    $('peaks-sort').addEventListener('change',e=>{S.peaksSort=e.target.value;S.peaksPage=0;renderPeaks()});$('peaks-count').addEventListener('change',e=>{S.peaksCount=Number(e.target.value);S.peaksPage=0;renderPeaks()});
    $('peaks-prev').addEventListener('click',()=>{S.peaksPage--;renderPeaks()});$('peaks-next').addEventListener('click',()=>{S.peaksPage++;renderPeaks()});
    document.querySelectorAll('[data-tuner-plot]').forEach(b=>b.addEventListener('click',()=>setPlot(b.dataset.tunerPlot)));
    H.on('resize',()=>{if(H.view==='spectrum'){redraw();if(S.peaksEnabled)renderPeaks()}});
    H.on('view',v=>{if(v==='spectrum')requestAnimationFrame(redraw)});
    H.on('held-change',sessions=>{
      const was=S.referenceHeld;S.referenceHeld=sessions.some(s=>s.group==='reference');
      if(was&&!S.referenceHeld&&S.source==='mic')S.ignoreUntil=performance.now()+450;
    });
    configureFilter();
    H.on('played' ,ns=>{S.polyUntil=ns.length>1?performance.now()+1300:0;if(S.source==='mic')S.ignoreUntil=performance.now()+2400;});requestAnimationFrame(animate);
    H.spectrumState=S;
  };
})();
