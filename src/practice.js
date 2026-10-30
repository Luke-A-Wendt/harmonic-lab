/* A single repertoire, exact transposition, adaptive tablature, and invariant voice paths. */
(function(){
 'use strict';const H=window.HL,T=H.T,$=H.$,NS='http://www.w3.org/2000/svg';
 const S={tab:null,tuning:'guitar',transpose:0,tempo:90,mapped:[],source:[],playing:false,starting:false,paused:false,beat:0,anchorBeat:0,anchorTime:0,next:0,nextClick:0,total:16,from:0,to:16,loop:false,metronome:false,timer:null,active:-1,octaveFit:0,fit:true,page:0,pageBars:1,pageChoice:'auto',follow:true,voicing:true,texture:'arranged',pane:'tab',annotation:'gaps',voice:'melody',libraryPage:0,libraryKind:'all',difficulty:'all',path:[],originalPath:[],invariant:true};
 let playGeneration=0,auditionGeneration=0,favorites=new Set();try{favorites=new Set(JSON.parse(localStorage.getItem('harmonic-lab-favorites-v1')||'[]'))}catch{}
 const tabs=[...H.library].sort((a,b)=>a.title.localeCompare(b.title,'en',{sensitivity:'base'}));
 const libraryKind=t=>t.kind==='Chord progressions'?'chords':t.kind==='Technique'?'theory':'songs';
 const sources=()=>S.texture==='melody'?(S.tab.melodyEvents||S.tab.blockEvents||S.tab.events):S.tab.events;
 const secs=()=>60/S.tempo;
 const currentBeat=()=>S.playing?S.anchorBeat+(H.audio.context.currentTime-S.anchorTime)/secs():S.beat;
 const totalOf=events=>Math.max(...events.map(e=>e.beat+e.duration));
 const formatTime=b=>{const s=Math.round(Math.max(0,b)*secs());return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
 const signed=n=>(n>0?'+':'')+H.signed(n);
 function stop(reset=true){
  playGeneration++;auditionGeneration++;H.audio.stop('practice-audition');S.starting=false;if(S.playing)S.beat=Math.max(S.from,Math.min(S.to,currentBeat()));S.playing=false;S.paused=!reset;clearInterval(S.timer);H.audio.stop('practice');H.audio.stop('click');if(reset)S.beat=S.from;
  $('tab-play').textContent=S.paused?'▶ Resume':'▶ Play';$('tab-play').disabled=false;$('tab-play').setAttribute('aria-pressed','false');updateTransport();highlight(-1);
 }
 async function play(){
  if(S.starting)return;S.starting=true;const gen=++playGeneration;
  try{await H.audio.ensure();if(gen!==playGeneration)return;S.starting=false;H.audio.stop('practice');H.audio.stop('click');clearInterval(S.timer);if(S.beat>=S.to-.001||S.beat<S.from)S.beat=S.from;
   S.anchorBeat=S.beat;S.anchorTime=H.audio.context.currentTime+.05;S.next=S.mapped.findIndex(e=>e.beat>=S.beat-.0001);if(S.next<0)S.next=S.mapped.length;S.nextClick=Math.ceil(S.beat);S.playing=true;S.paused=false;$('tab-play').textContent='Ⅱ Pause';$('tab-play').setAttribute('aria-pressed','true');S.timer=setInterval(schedule,25);schedule();
  }catch(e){H.toast(e.message);stop(false)}
 }
 // Adapter for tab-specific dynamics; the shared synthesis engine is unchanged.
 function scheduleTabNotes(ns,options={}){
  const {level=1,...audioOptions}=options,voices=H.audio.schedule(ns,audioOptions);
  const scale=Math.max(.01,Math.min(1,Number(level)||1));
  if(scale!==1)for(const voice of voices){
   const amp=voice.amp*scale,start=voice.start,param=voice.gain.gain;
   param.cancelScheduledValues(start);param.setValueAtTime(.00001,start);
   param.exponentialRampToValueAtTime(amp,start+.012);
   if(!voice.sustain)param.exponentialRampToValueAtTime(.00001,voice.end-.03);
   voice.amp=amp;
  }
  return voices;
 }
 function soundEvent(e,when,group='practice'){
  if(!e.notes.length)return;const timbre=H.state.harmonics?'pluck':'sine';
  if(e.noteDurations?.length===e.notes.length){
   e.notes.forEach((n,i)=>scheduleTabNotes([n],{when,duration:Math.max(.05,e.noteDurations[i]*secs()*.92),level:(e.velocities?.[i]||1)/Math.sqrt(e.notes.length),timbre,group}));
  }else scheduleTabNotes(e.notes,{when,duration:Math.max(.06,e.duration*secs()*.9),level:e.accent||1,timbre,group});
 }
 function schedule(){
  if(!S.playing)return;const now=H.audio.context.currentTime,b=currentBeat(),horizon=now+.12;
  while(S.next<S.mapped.length){const e=S.mapped[S.next],when=S.anchorTime+(e.beat-S.anchorBeat)*secs();if(e.beat>=S.to||when>horizon)break;soundEvent(e,when);S.next++;}
  while(S.metronome&&S.nextClick<S.to){const when=S.anchorTime+(S.nextClick-S.anchorBeat)*secs();if(when>horizon)break;scheduleTabNotes([S.nextClick%S.tab.meter===0?24:19],{when,duration:.025,level:.5,timbre:'sine',group:'click'});S.nextClick++;}
  if(b>=S.to){if(S.loop){H.audio.stop('practice');H.audio.stop('click');S.beat=S.from;S.anchorBeat=S.from;S.anchorTime=now+.015;S.next=S.mapped.findIndex(e=>e.beat>=S.from-.0001);if(S.next<0)S.next=S.mapped.length;S.nextClick=Math.ceil(S.from);}else stop(true)}
 }
 function updateTransport(){const b=Math.max(0,Math.min(S.total,currentBeat()));$('tab-seek').value=b;$('tab-time').textContent=`${formatTime(b)} / ${formatTime(S.total)}`;}
 function highlight(i){
  if(S.active===i)return;document.querySelectorAll('.tab-event.playing').forEach(e=>e.classList.remove('playing'));S.active=i;
  if(i>=0&&S.mapped[i]){
   if(S.playing&&S.follow){const page=Math.floor(S.mapped[i].beat/(S.pageBars*S.tab.meter));if(page!==S.page){S.page=page;drawSheet()}}
   document.querySelectorAll(`.tab-event[data-index="${i}"]`).forEach(e=>e.classList.add('playing'));
   if(S.playing)H.emit('played',S.mapped[i].notes);
  }
  if(S.pane==='pattern')drawPattern();
 }
 function animate(){requestAnimationFrame(animate);if(!S.playing||H.view!=='practice')return;updateTransport();const beat=currentBeat();let active=-1;for(let i=0;i<S.mapped.length;i++){if(S.mapped[i].beat>beat+.02)break;if(beat<S.mapped[i].beat+S.mapped[i].duration)active=i}highlight(active);}
 function pageCapacity(){const available=$('tab-library').clientHeight||360,columns=innerHeight<=550&&innerWidth>=701?2:1;return Math.max(columns,Math.floor((available+5)/(columns===2?72:79))*columns);}
 function renderLibrary(){
  const fold=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),query=fold($('library-search').value);
  const list=tabs.filter(t=>(S.libraryKind==='all'||libraryKind(t)===S.libraryKind)&&(S.difficulty==='all'||t.difficulty===S.difficulty)&&(!$('library-favorites').checked||favorites.has(t.id))&&fold([t.title,t.description,t.composer,t.learning,t.progression,t.kind,...(t.tags||[])].join(' ')).includes(query));
  const size=pageCapacity(),pages=Math.max(1,Math.ceil(list.length/size));S.libraryPage=Math.max(0,Math.min(pages-1,S.libraryPage));const holder=$('tab-library');holder.innerHTML='';
  list.slice(S.libraryPage*size,(S.libraryPage+1)*size).forEach(t=>{
   const b=document.createElement('button');b.className='library-item'+(S.tab?.id===t.id?' active':'');b.dataset.tabId=t.id;b.setAttribute('aria-current',String(S.tab?.id===t.id));
   const title=document.createElement('strong');title.textContent=(favorites.has(t.id)?'★ ':'')+t.title;const small=document.createElement('small');small.textContent=[t.composer||t.kind,t.difficulty,`${t.tempo} BPM`].filter(Boolean).join(' · ');const scope=document.createElement('span');scope.className='library-scope';scope.textContent=t.scope||'Teaching arrangement';b.append(title,small,scope);b.addEventListener('click',()=>{select(t);$('song-library').close()});holder.appendChild(b);
  });
  if(!list.length){const p=document.createElement('p');p.className='micro';p.textContent='No matches. Try another title, composer, or concept.';holder.appendChild(p)}
  $('library-count').textContent=`${list.length} selections · ${S.libraryPage+1} / ${pages}`;$('library-prev').disabled=S.libraryPage===0;$('library-next').disabled=S.libraryPage>=pages-1;
 }
 function favorite(){if(favorites.has(S.tab.id))favorites.delete(S.tab.id);else favorites.add(S.tab.id);try{localStorage.setItem('harmonic-lab-favorites-v1',JSON.stringify([...favorites]))}catch{}updateFavorite();renderLibrary();}
 function updateFavorite(){$('tab-favorite').textContent=favorites.has(S.tab.id)?'★':'☆';$('tab-favorite').setAttribute('aria-pressed',String(favorites.has(S.tab.id)));$('tab-favorite').setAttribute('aria-label',favorites.has(S.tab.id)?'Remove from favorites':'Save favorite');}
 function select(tab){
  if(S.tab)stop(true);S.tab=tab;S.transpose=0;S.octaveFit=0;S.tempo=tab.tempo;S.beat=0;S.from=0;S.texture='arranged';S.source=sources();S.total=totalOf(S.source);S.to=S.total;S.page=0;
  $('tab-title').textContent=tab.title;$('tab-credit').textContent=[tab.composer||tab.kind,tab.scope].filter(Boolean).join(' · ');$('tab-category').textContent=tab.kind==='Chord progressions'?'CHORD STUDY':tab.kind==='Technique'?'THEORY & TECHNIQUE':'SONGS';$('tab-description').textContent=tab.description+(tab.arrangementNote?' '+tab.arrangementNote:'');$('tab-learning').textContent=tab.learning||'Move the starting pitch; preserve the intervals and timing.';$('tab-source').textContent=tab.source;
  $('tab-tempo').value=S.tempo;$('tab-transpose').value=0;$('tab-tuning').value=S.tuning;$('tab-key').value=tab.key;$('loop-from').value=0;$('loop-to').value=S.total;$('loop-to').max=S.total;$('loop-from').max=S.total;$('tab-seek').max=S.total;
  H.options($('tab-texture'),[['arranged',tab.blockEvents?'Rhythmic chords':'Arranged · melody + harmony'],['melody',tab.blockEvents?'Block chords':'Melody only']],'arranged');$('tab-texture').disabled=!tab.melodyEvents&&!tab.blockEvents;
  const sections=$('tab-sections');sections.innerHTML='';(tab.sections||[{beat:0,label:'Start'}]).forEach(sec=>{const b=document.createElement('button');b.className='small ghost';b.textContent=sec.label;b.addEventListener('click',()=>{const was=S.playing;stop(false);S.from=0;S.to=S.total;$('loop-from').value=0;$('loop-to').value=S.total;S.beat=Math.min(S.total,sec.beat);S.page=Math.floor(S.beat/(S.pageBars*S.tab.meter));drawSheet();updateTransport();$('practice-options').close();if(was)play();});sections.appendChild(b)});
  updateFavorite();rebuild(false);renderLibrary();updateTransport();
 }
 function voicePath(events,voice='melody'){
  const explicit=voice==='melody'&&events.some(e=>Number.isFinite(e.melody));const path=[];
  events.forEach((e,index)=>{if(!e.notes.length)return;let n;if(voice==='bass')n=Math.min(...e.notes);else if(explicit){if(!Number.isFinite(e.melody))return;n=e.melody}else n=Math.max(...e.notes);
   const prev=path.at(-1);path.push({index,beat:e.beat,duration:e.duration,n,delta:prev?n-prev.n:null,offset:n-(path[0]?.n??n)});
  });return path;
 }
 function pathData(){
  S.originalPath=voicePath(S.source,S.voice);const total=S.transpose+S.octaveFit,adapted=!!(S.tab.voicing&&S.voicing);
  if(adapted)S.path=voicePath(S.mapped,S.voice);else S.path=S.originalPath.map(p=>({...p,n:p.n+total}));
  S.invariant=S.path.length===S.originalPath.length&&S.path.every((p,i)=>p.delta===S.originalPath[i].delta&&p.beat===S.originalPath[i].beat&&p.duration===S.originalPath[i].duration);
  $('transposition-badge').textContent=adapted?'Compact voicing · intervals can change':`k = ${signed(total)} · gaps unchanged`;
  const pathName=S.voice==='bass'?'Lowest attacked voice':S.source.some(e=>Number.isFinite(e.melody))?'Melody line':'Highest attacked voice';
  $('pattern-invariant').textContent=adapted?`${pathName} · revoiced, not one fixed shift`:`${pathName} · same gaps + same rhythm`;
  $('pattern-formula').textContent=adapted?'Revoicing can change a melodic path. Turn off compact voicings for exact interval preservation.':'n′ᵢ = nᵢ + k → Δn′ᵢ = Δnᵢ. Same beat positions, durations, and gaps.';
  H.patternSnapshot={original:S.originalPath,current:S.path,invariant:S.invariant,totalShift:total,revoiced:adapted};
 }
 function rebuild(resume=true){
  const was=S.playing;if(was||S.starting)stop(false);auditionGeneration++;H.audio.stop('practice-audition');S.source=sources();S.total=totalOf(S.source);$('tab-seek').max=S.total;S.to=Math.min(S.to,S.total);if(S.from>=S.to){S.from=0;S.to=S.total;$('loop-from').value=0;}S.beat=Math.max(S.from,Math.min(S.to,S.beat));$('loop-to').value=S.to;$('loop-to').max=S.total;$('loop-from').max=S.total;
  if(S.fit){const original=T.fingerEvents(S.source,T.tunings[S.tuning],S.transpose,24);S.octaveFit=S.tab.preserveRegister&&!original.some(e=>e.unplayable)?0:T.fitOctave(S.source,T.tunings[S.tuning],S.transpose,24).shift;}
  const shift=S.transpose+S.octaveFit,adapted=!!(S.tab.voicing&&S.voicing);
  S.mapped=adapted?S.source.map(e=>T.voiceEvent(e,T.tunings[S.tuning],S.transpose)):T.fingerEvents(S.source,T.tunings[S.tuning],shift,24);
  if(!adapted)S.mapped=S.mapped.map(e=>Number.isFinite(e.melody)?{...e,melody:e.melody+shift}:e);
  $('voicing-control').hidden=!S.tab.voicing;$('tab-fit').disabled=adapted;$('tab-register').disabled=adapted;if(![...$('tab-register').options].some(o=>Number(o.value)===S.octaveFit)){const o=document.createElement('option');o.value=S.octaveFit;o.textContent=signed(S.octaveFit/12)+' octaves';$('tab-register').appendChild(o);}$('tab-register').value=String(S.octaveFit);$('tab-key').value=T.mod(S.tab.key+S.transpose);
  const bad=S.mapped.filter(e=>e.unplayable).length,wide=S.mapped.filter(e=>{const f=e.placements.filter(Boolean).filter(p=>p.fret>0).map(p=>p.fret);return f.length>1&&Math.max(...f)-Math.min(...f)>5}).length;
  const description=adapted?'Compact progression voicings preserve pitch classes but may change inversions and octaves.':`Key shift ${signed(S.transpose)}; register shift ${signed(S.octaveFit)}. Total ${signed(shift)} semitones, applied to every note.`;
  $('fingering-status').textContent=(bad?`${bad} events cannot be fingered exactly in frets 0–24. × marks them; audio preserves their pitches. `:'All pitches mapped to frets 0–24. ')+description+(wide?` ${wide} wide-span chords need fingering review.`:'');$('fingering-status').classList.toggle('error-text',bad>0);
  $('song-texture').textContent=S.texture==='melody'?(S.tab.blockEvents?'Block chords':'Melody only'):'Arranged score';pathData();S.active=-1;drawSheet();if(was&&resume)play();
 }
 const se=(tag,attrs,parent)=>{const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(parent)parent.appendChild(e);return e};
 function layout(){
  const stage=$('song-stage')||document.querySelector('.song-stage'),rect=stage.getBoundingClientRect(),w=Math.max(300,rect.width-18),h=Math.max(100,rect.height-16);
  const counts=new Map();S.source.forEach(e=>{const bar=Math.floor(e.beat/S.tab.meter);counts.set(bar,(counts.get(bar)||0)+1)});const dense=Math.max(1,...counts.values());
  let perRow=w<600?1:w<1080?2:4;if(dense>12)perRow=Math.min(perRow,2);
  const rowHeight=T.tunings[S.tuning].open.length*23+75,autoRows=Math.max(1,Math.floor(h/rowHeight));
  if(S.pageChoice==='auto')S.pageBars=Math.min(8,perRow*autoRows);else S.pageBars=Number(S.pageChoice);
  perRow=Math.min(perRow,S.pageBars);return{w,h,perRow,rows:Math.ceil(S.pageBars/perRow)};
 }
 function drawSheet(){
  if(!S.tab)return;const holder=$('tab-sheet');holder.innerHTML='';const tune=T.tunings[S.tuning],count=tune.open.length,geom=layout(),pageBeats=S.pageBars*S.tab.meter,pages=Math.max(1,Math.ceil(S.total/pageBeats));S.page=Math.max(0,Math.min(pages-1,S.page));
  const pageStart=S.page*pageBeats,pageEnd=Math.min(S.total,pageStart+pageBeats),rows=Math.ceil((pageEnd-pageStart)/(geom.perRow*S.tab.meter));
  $('tab-page-label').textContent=`Bars ${S.page*S.pageBars+1}–${Math.ceil(pageEnd/S.tab.meter)} · ${S.page+1}/${pages}`;$('tab-page-prev').disabled=S.page===0;$('tab-page-next').disabled=S.page>=pages-1;
  const width=Math.max(280,geom.w),rowHeight=Math.max(count*13+52,geom.h/rows),height=Math.max(geom.h,rows*rowHeight),gap=Math.max(13,Math.min(27,(rowHeight-60)/count)),topPad=Math.min(47,Math.max(32,rowHeight-count*gap-12)),svg=se('svg',{viewBox:`0 0 ${width} ${height}`,preserveAspectRatio:'xMidYMid meet',role:'group','aria-label':`${S.tab.title} tablature, ${S.annotation} annotation`},holder);
  const L=32,R=16,W=width-L-R,beatWidth=W/(geom.perRow*S.tab.meter),spell=T.scaleSpellings(T.mod(S.tab.key+S.transpose),S.tab.mode);
  const melodyMap=new Map(S.path.map(p=>[p.index,p]));
  for(let row=0;row<rows;row++){
   const y=row*rowHeight+topPad,first=pageStart+row*geom.perRow*S.tab.meter,last=Math.min(S.total,first+geom.perRow*S.tab.meter);
   for(let st=0;st<count;st++){const yy=y+st*gap;se('line',{x1:L,x2:width-R,y1:yy,y2:yy,stroke:'#656565','stroke-width':1},svg);se('text',{x:2,y:yy+4,fill:'#b6b6b6','font-size':10,'font-family':'monospace'},svg).textContent=tune.labels[st];}
   for(let b=first;b<=last+.00001;b+=.5){const x=L+(b-first)*beatWidth,bar=Math.abs(b/S.tab.meter-Math.round(b/S.tab.meter))<.001;if(bar){se('line',{x1:x,x2:x,y1:y-10,y2:y+(count-1)*gap+12,stroke:'#aaa','stroke-width':1},svg);if(b<last){se('text',{x:x+5,y:y-29,fill:'#9a9a9a','font-size':9},svg).textContent='BAR '+(Math.floor(b/S.tab.meter)+1);}}else if(Number.isInteger(b)){se('line',{x1:x,x2:x,y1:y-10,y2:y+(count-1)*gap+12,stroke:'#333','stroke-dasharray':'2 5'},svg);}}
   S.mapped.forEach((e,index)=>{
    if(e.beat<first-.00001||e.beat>=first+geom.perRow*S.tab.meter-.00001)return;
    const x=L+(e.beat-first)*beatWidth+Math.min(12,beatWidth*.17),g=se('g',{class:'tab-event'+(index===S.active?' playing':''),role:'button',tabindex:'0','data-index':index,'aria-label':`Beat ${e.beat}, ${e.notes.map(n=>T.note(n,spell)).join(', ')||'rest'}, duration ${e.duration} beats`},svg),path=melodyMap.get(index);
    se('rect',{class:'event-bg',x:x-10,y:y-25,width:20,height:count*gap+30,rx:5,fill:'transparent'},g);
    let annotation='';if(S.annotation==='rhythm')annotation=durationLabel(e.duration);else if(path){if(S.annotation==='gaps')annotation=path.delta===null?'start':signed(path.delta);else if(S.annotation==='n')annotation=path.n;else annotation=T.degree(path.n,T.mod(S.tab.key+S.transpose),S.tab.mode)||'·';}
    if(annotation!=='')se('text',{x,y:y-18,'text-anchor':'middle',fill:S.annotation==='gaps'?'#f4d36b':'#b5b5b5','font-size':9,'font-family':'monospace'},g).textContent=annotation;
    if(e.label)se('text',{x:x+45,y:y-29,fill:'#ed83d7','font-size':10},g).textContent=e.label;
    if(!e.notes.length)se('text',{x,y:y+count*9,'text-anchor':'middle',fill:'#aaa','font-size':15},g).textContent='𝄽';
    e.notes.forEach((n,j)=>{const p=e.placements[j];if(!p){se('text',{x,y:y+j*gap+4,'text-anchor':'middle',fill:'#ed83d7','font-size':14},g).textContent='×';return;}
     const isMelody=Number.isFinite(e.melody)?n===e.melody:path&&n===path.n;
     const duration=e.noteDurations?.[j]||e.duration,endX=Math.min(width-R,x+duration*beatWidth-4);
     if(endX>x+10)se('line',{x1:x+8,x2:endX,y1:y+p.string*gap-4,y2:y+p.string*gap-4,stroke:isMelody?'#50e3ed55':'#8b8b8b55','stroke-width':2},g);
     se('rect',{x:x-8,y:y+p.string*gap-9,width:16,height:18,rx:2,fill:'#202020'},g);se('text',{x,y:y+p.string*gap+4,'text-anchor':'middle',fill:isMelody?'#50e3ed':'#eee','font-size':12,'font-weight':600,'font-family':'monospace'},g).textContent=p.fret;
    });
    const playEvent=()=>audition(e.notes,index,e);
    g.addEventListener('click',playEvent);g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();playEvent()}});
   });
   se('text',{x:L+4,y:y+(count-1)*gap+24,fill:'#8c8c8c','font-size':9,'font-family':'monospace'},svg).textContent=S.annotation==='gaps'?'Δn: melody steps · horizontal strokes: duration':S.annotation==='n'?'n: semitones from A4 · simultaneous notes share a column':S.annotation==='degrees'?'Degree: position in the current scale · chromatic notes = ·':'Durations in quarter-note beats · time runs left → right';
  }
  if(S.pane==='pattern')drawPattern();
 }
 function durationLabel(d){const v=Math.round(d*1000)/1000;return({.25:'¼',.5:'½',.75:'¾',1.5:'1½',.333:'⅓',.667:'⅔'})[v]||String(v)}
 function drawPattern(){
  const canvas=$('pattern-canvas');if(!canvas.clientWidth||!canvas.clientHeight||!S.originalPath.length)return;
  const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#1e1e1e';ctx.fillRect(0,0,w,h);
  const from=S.page*S.pageBars*S.tab.meter,to=Math.min(S.total,from+S.pageBars*S.tab.meter),a=S.originalPath.filter(p=>p.beat>=from&&p.beat<to),b=S.path.filter(p=>p.beat>=from&&p.beat<to);if(!a.length){$('pattern-detail').textContent='No attacks from the selected voice on this page.';canvas.onclick=null;drawIntervalTable();return;}
  const L=34,R=14,top=25,bottom=h-31,W=w-L-R,offsets=[...a.map(p=>p.n-S.originalPath[0].n),...b.map(p=>p.n-S.path[0].n)],min=Math.min(...offsets),max=Math.max(min+3,...offsets),rowH=(bottom-top)/2;
  const x=p=>L+(p.beat-from)/(to-from)*W+7,y=(p,first,row)=>top+row*rowH+13+(1-(p.n-first-min)/(max-min))*Math.max(20,rowH-50);
  ctx.font='10px ui-monospace,monospace';ctx.fillStyle='#ed83d7';ctx.fillText('ORIGINAL',L,12);ctx.fillStyle='#50e3ed';ctx.fillText('THIS KEY',L,top+rowH+3);
  const draw=(points,first,row,color)=>{ctx.strokeStyle='#414141';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(L,top+(row+1)*rowH-6);ctx.lineTo(w-R,top+(row+1)*rowH-6);ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();points.forEach((p,i)=>{if(!i)ctx.moveTo(x(p),y(p,first,row));else ctx.lineTo(x(p),y(p,first,row))});ctx.stroke();points.forEach(p=>{const xx=x(p),yy=y(p,first,row);ctx.fillStyle=color;ctx.beginPath();ctx.arc(xx,yy,p.index===S.active?5:3,0,Math.PI*2);ctx.fill();ctx.font='10px monospace';ctx.fillText(H.signed(p.n),Math.min(w-27,xx-6),yy-8);});};
  draw(a,S.originalPath[0].n,0,'#ed83d7');draw(b,S.path[0].n,1,'#50e3ed');
  b.forEach(p=>{ctx.fillStyle='#f4d36b';ctx.font='10px monospace';ctx.fillText(p.delta===null?'start':signed(p.delta),Math.min(w-25,x(p)-7),h-10)});
  ctx.fillStyle='#aaa';ctx.font='9px monospace';ctx.fillText('Δn',2,h-10);
  $('pattern-detail').innerHTML=`<span>Anchor <b>${H.signed(S.originalPath[0].n)}</b> → <b>${H.signed(S.path[0].n)}</b></span><span>${S.invariant?'Identical interval path':'Revoiced path differs'}</span><span>Timing ${S.originalPath.every((p,i)=>p.beat===S.path[i]?.beat)?'unchanged':'changed'}</span>`;
  drawIntervalTable();
  canvas.onclick=e=>{const r=canvas.getBoundingClientRect(),xx=e.clientX-r.left,nearest=b.reduce((best,p)=>Math.abs(x(p)-xx)<Math.abs(x(best)-xx)?p:best,b[0]);if(nearest){audition([nearest.n],nearest.index)}};
 }
 function setPane(pane){S.pane=pane;$('view-practice').classList.toggle('show-pattern',pane==='pattern');$('tab-sheet').hidden=pane!=='tab';$('pattern-view').hidden=pane!=='pattern';document.querySelectorAll('#view-practice [data-song-pane]').forEach(b=>{b.classList.toggle('active',b.dataset.songPane===pane);b.setAttribute('aria-pressed',String(b.dataset.songPane===pane));});requestAnimationFrame(()=>drawSheet());}
 function region(){const from=Number($('loop-from').value),to=Number($('loop-to').value);if(!Number.isFinite(from)||!Number.isFinite(to)||from<0||to>S.total||to<=from){H.toast(`Use 0 ≤ From < To ≤ ${S.total}.`);$('loop-from').value=S.from;$('loop-to').value=S.to;return;}const was=S.playing;stop(false);S.from=from;S.to=to;S.beat=from;S.page=Math.floor(from/(S.pageBars*S.tab.meter));drawSheet();updateTransport();if(was)play();}
 async function audition(ns,index,event=null){
  if(event&&!ns.length){H.toast('Rest · '+durationLabel(event.duration)+' beats');return;}
  if(S.playing||S.starting)stop(false);const gen=++auditionGeneration;
  H.audio.stop('practice-audition');
  try{await H.audio.ensure();if(gen!==auditionGeneration||H.view!=='practice')return;
   if(event)soundEvent(event,H.audio.context.currentTime,'practice-audition');
   else scheduleTabNotes(ns,{duration:.7,timbre:H.state.harmonics?'pluck':'sine',group:'practice-audition'});
   H.emit('played',ns);highlight(index);
  }catch(e){H.toast(e.message);}
 }
 function drawIntervalTable(){
  if(!S.tab)return;const from=S.page*S.pageBars*S.tab.meter,to=Math.min(S.total,from+S.pageBars*S.tab.meter);
  const rows=S.originalPath.map((p,i)=>({a:p,b:S.path[i]})).filter(p=>p.a.beat>=from&&p.a.beat<to);
  const body=$('interval-table-body');body.replaceChildren();
  for(const {a,b} of rows){const tr=document.createElement('tr');
   [a.beat,H.signed(a.n),b?H.signed(b.n):'—',a.delta===null?'start':signed(a.delta),b?(b.delta===null?'start':signed(b.delta)):'—',durationLabel(a.duration)].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.appendChild(td);});body.appendChild(tr);
  }
  $('interval-table-caption').textContent=`${S.tab.title} · beats ${from}–${to} · ${S.voice==='bass'?'lowest attacked voice':'melody / highest attacked voice'}. `+(S.invariant?'Same signed gaps and timing.':'Compact revoicing can change these gaps.');
 }
 let resizeTimer=null,resizeFrame=null;
 function updateTabSize(){
  const panel=$('view-practice');if(H.view!=='practice'||panel.hidden)return;
  const vh=window.visualViewport?.height||innerHeight,top=panel.getBoundingClientRect().top+window.scrollY;
  panel.style.setProperty('--tabs-height',Math.max(innerWidth<=700?540:470,Math.min(900,vh-top-26))+'px');
 }
 function resized(){
  clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{
   if(H.view==='practice'){
    const oldStart=S.page*S.pageBars*S.tab.meter;updateTabSize();layout();
    S.page=Math.floor((S.playing?currentBeat():oldStart)/(S.pageBars*S.tab.meter));drawSheet();
    if($('song-library').open)renderLibrary();if($('tabs-interval-dialog').open)drawIntervalTable();
   }
  },80);
 }
 function initTabUI(){
  const dialogs=[...document.querySelectorAll('dialog[data-tabs-dialog]')];
  document.querySelectorAll('#view-practice [data-dialog]').forEach(button=>button.addEventListener('click',()=>{
   const dialog=$(button.dataset.dialog);if(!dialog?.matches('[data-tabs-dialog]'))return;
   if(dialog.id==='tabs-interval-dialog')drawIntervalTable();dialog.showModal();
   if(dialog.id==='song-library')requestAnimationFrame(()=>{renderLibrary();$('library-search').focus();});
  }));
  dialogs.forEach(dialog=>{
   dialog.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>dialog.close()));
   dialog.querySelectorAll('[data-sheet-tab]').forEach(b=>b.addEventListener('click',()=>{
    dialog.querySelectorAll('[data-sheet-tab]').forEach(t=>{const on=t===b;t.classList.toggle('active',on);t.setAttribute('aria-pressed',String(on));});
    dialog.querySelectorAll('[data-sheet-content]').forEach(c=>c.hidden=c.dataset.sheetContent!==b.dataset.sheetTab);
   }));
  });
  document.querySelectorAll('#song-library [data-library-kind]').forEach(button=>button.addEventListener('click',()=>{
   S.libraryKind=button.dataset.libraryKind;S.libraryPage=0;
   document.querySelectorAll('#song-library [data-library-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderLibrary();
  }));
  window.addEventListener('resize',resized);window.visualViewport?.addEventListener('resize',resized);
  const observer=new ResizeObserver(()=>{if(H.view!=='practice')return;cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>drawSheet());});observer.observe($('song-stage'));
 }
 H.initPractice=()=>{initTabUI();
  H.tuningOptions($('tab-tuning'));H.options($('tab-key'),T.roots.map((n,i)=>[i,n]));
  $('library-search').addEventListener('input',()=>{S.libraryPage=0;renderLibrary()});$('library-difficulty').addEventListener('change',e=>{S.difficulty=e.target.value;S.libraryPage=0;renderLibrary()});$('library-favorites').addEventListener('change',()=>{S.libraryPage=0;renderLibrary()});$('library-reset').addEventListener('click',()=>{$('library-search').value='';$('library-difficulty').value='all';$('library-favorites').checked=false;S.difficulty='all';S.libraryKind='all';document.querySelectorAll('#song-library [data-library-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.libraryKind==='all')));S.libraryPage=0;renderLibrary()});$('library-prev').addEventListener('click',()=>{S.libraryPage--;renderLibrary()});$('library-next').addEventListener('click',()=>{S.libraryPage++;renderLibrary()});$('tab-favorite').addEventListener('click',favorite);
  $('tab-play').addEventListener('click',()=>S.playing?stop(false):play());$('tab-stop').addEventListener('click',()=>{stop(true);S.page=Math.floor(S.from/(S.pageBars*S.tab.meter));drawSheet()});
  $('tab-tempo').addEventListener('change',e=>{const was=S.playing;if(was)stop(false);S.tempo=Math.max(30,Math.min(240,Number(e.target.value)||90));e.target.value=S.tempo;updateTransport();if(was)play()});
  $('tab-loop').addEventListener('change',e=>S.loop=e.target.checked);$('tab-metronome').addEventListener('change',e=>{S.metronome=e.target.checked;S.nextClick=Math.ceil(currentBeat());if(!S.metronome)H.audio.stop('click')});
  $('tab-seek').addEventListener('input',e=>{const value=Number(e.target.value),was=S.playing;if(was)stop(false);S.beat=Math.max(S.from,Math.min(S.to,value));S.page=Math.floor(S.beat/(S.pageBars*S.tab.meter));drawSheet();updateTransport();if(was)play()});
  $('tab-transpose').addEventListener('change',e=>{S.transpose=Math.max(-24,Math.min(24,Math.round(Number(e.target.value)||0)));e.target.value=S.transpose;rebuild()});
  $('tab-key').addEventListener('change',e=>{let delta=T.mod(Number(e.target.value)-T.mod(S.tab.key+S.transpose));if(delta>6)delta-=12;S.transpose=Math.max(-24,Math.min(24,S.transpose+delta));$('tab-transpose').value=S.transpose;rebuild()});
  $('tab-tuning').addEventListener('change',e=>{S.tuning=e.target.value;rebuild()});$('tab-texture').addEventListener('change',e=>{S.texture=e.target.value;S.page=0;rebuild()});
  $('tab-voicing').addEventListener('change',e=>{S.voicing=e.target.checked;rebuild()});$('tab-fit').addEventListener('change',e=>{S.fit=e.target.checked;rebuild()});$('tab-register').addEventListener('change',e=>{S.octaveFit=Number(e.target.value);S.fit=false;$('tab-fit').checked=false;rebuild()});
  $('loop-from').addEventListener('change',region);$('loop-to').addEventListener('change',region);
  $('tab-page-prev').addEventListener('click',()=>{S.page--;drawSheet()});$('tab-page-next').addEventListener('click',()=>{S.page++;drawSheet()});$('tab-page-size').addEventListener('change',e=>{S.pageChoice=e.target.value;S.page=0;drawSheet()});$('tab-follow').addEventListener('change',e=>S.follow=e.target.checked);$('tab-annotation').addEventListener('change',e=>{S.annotation=e.target.value;drawSheet()});$('pattern-voice').addEventListener('change',e=>{S.voice=e.target.value;pathData();drawSheet()});
  document.querySelectorAll('[data-song-pane]').forEach(b=>b.addEventListener('click',()=>setPane(b.dataset.songPane)));
  $('tab-to-explore').addEventListener('click',()=>{H.update({root:T.mod(S.tab.key+S.transpose),mode:S.tab.mode,tuning:S.tuning,octave:0});H.setView('explore')});
  H.on('view',v=>{if(v!=='practice'){auditionGeneration++;H.audio.stop('practice-audition');if(S.playing||S.starting)stop(false);document.querySelectorAll('dialog[data-tabs-dialog][open]').forEach(d=>d.close());}else requestAnimationFrame(()=>{updateTabSize();drawSheet();})});
  H.on('resize',()=>{if(H.view==='practice'){const oldStart=S.page*S.pageBars*S.tab.meter;layout();S.page=Math.floor((S.playing?currentBeat():oldStart)/(S.pageBars*S.tab.meter));drawSheet();if($('song-library').open)renderLibrary()}});H.on('panic',()=>stop(true));
  H.selectTab=id=>{const tab=tabs.find(t=>t.id===id);if(tab)select(tab)};H.getFavorites=()=>[...favorites];H.practiceState=S;H.voicePath=voicePath;H.practiceSchedule=scheduleTabNotes;
  select(tabs.find(t=>t.id==='g-ode')||tabs[0]);requestAnimationFrame(animate);
 };
})();
