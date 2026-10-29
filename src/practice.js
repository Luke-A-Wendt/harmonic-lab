(function(){
  'use strict';const H=window.HL,T=H.T,$=H.$,NS='http://www.w3.org/2000/svg';
  const S={family:'guitar',tab:null,tuning:'guitar',transpose:0,tempo:90,mapped:[],playing:false,paused:false,beat:0,anchorBeat:0,anchorTime:0,next:0,nextClick:0,end:16,total:16,from:0,to:16,loop:false,metronome:false,timer:null,active:-1,category:"all",difficulty:"all",sort:"recommended",octaveFit:0,fit:true,page:0,pageBars:8,follow:true,voicing:true};
  let favorites=new Set();try{favorites=new Set(JSON.parse(localStorage.getItem('harmonic-lab-favorites-v1')||'[]'))}catch{}
  const groups=['Classical','Traditional & early popular','Chord progressions','Technique'];
  const STAIRWAY='stairway-to-tuning';
  let lastLibraryId=H.library.find(t=>t.id!==STAIRWAY).id, activeRoute=null, playGeneration=0;
  function allTabs(){return H.library.filter(t=>t.id!==STAIRWAY)}
  H.getFavorites=()=>[...favorites];
  function currentBeat(){if(!S.playing)return S.beat;return S.anchorBeat+(H.audio.context.currentTime-S.anchorTime)*S.tempo/60}
  function duration(){return Math.max(...S.tab.events.map(e=>e.beat+e.duration))}
  function stop(reset=true){
    playGeneration++;S.starting=false;
    if(S.playing)S.beat=Math.max(S.from,Math.min(S.to,currentBeat()));S.playing=false;S.paused=!reset;clearInterval(S.timer);H.audio.stop('practice');H.audio.stop('click');if(reset)S.beat=S.from;
    $('tab-play').disabled=false;$('tab-play').textContent=S.paused?'▶ Resume':'▶ Play';$('tab-play').setAttribute('aria-label',S.paused?'Resume playback':'Play');$('tab-play').setAttribute('aria-pressed','false');updateTransport();highlight(-1);
  }
  async function play(){
    if(S.starting)return;S.starting=true;const generation=++playGeneration;
    try{
      await H.audio.ensure();if(generation!==playGeneration)return;S.starting=false;H.audio.stop('practice');H.audio.stop('click');clearInterval(S.timer);
      if(S.beat>=S.to-.001||S.beat<S.from)S.beat=S.from;
      S.anchorBeat=S.beat;S.anchorTime=H.audio.context.currentTime+.06;S.next=S.mapped.findIndex(e=>e.beat>=S.beat-.0001);if(S.next<0)S.next=S.mapped.length;S.nextClick=Math.ceil(S.beat);S.playing=true;S.paused=false;$('tab-play').disabled=false;$('tab-play').textContent='Ⅱ Pause';$('tab-play').setAttribute('aria-label','Pause playback');$('tab-play').setAttribute('aria-pressed','true');
      S.timer=setInterval(schedule,25);schedule();
    }catch(error){H.toast(error.message);stop(false)}
  }
  function schedule(){
    if(!S.playing)return;const now=H.audio.context.currentTime,seconds=60/S.tempo,b=currentBeat(),horizon=now+.12;
    while(S.next<S.mapped.length){const e=S.mapped[S.next],when=S.anchorTime+(e.beat-S.anchorBeat)*seconds;if(e.beat>=S.to||when>horizon)break;if(e.notes.length)H.audio.schedule(e.notes,{when,duration:Math.max(.06,e.duration*seconds*.85),timbre:H.state.harmonics?'pluck':'sine',group:'practice'});S.next++;}
    while(S.metronome&&S.nextClick<S.to){const when=S.anchorTime+(S.nextClick-S.anchorBeat)*seconds;if(when>horizon)break;H.audio.schedule([S.nextClick%S.tab.meter===0?24:19],{when,duration:.025,timbre:'sine',group:'click'});S.nextClick++;}
    if(b>=S.to){if(S.loop){H.audio.stop('practice');H.audio.stop('click');S.beat=S.from;S.anchorBeat=S.from;S.anchorTime=now+.015;S.next=S.mapped.findIndex(e=>e.beat>=S.from-.0001);if(S.next<0)S.next=S.mapped.length;S.nextClick=Math.ceil(S.from);}else stop(true)}
  }
  function highlight(index){if(S.active===index)return;document.querySelectorAll('.tab-event.playing').forEach(e=>e.classList.remove('playing'));S.active=index;document.querySelectorAll(`.tab-event[data-index="${index}"]`).forEach(e=>e.classList.add('playing'));
    if(index>=0&&S.playing&&S.mapped[index]){H.emit('played',S.mapped[index].notes);if(S.follow){const page=Math.floor(S.mapped[index].beat/(S.pageBars*S.tab.meter));if(page!==S.page){S.page=page;drawSheet();document.querySelector(`[data-index="${index}"]`)?.classList.add('playing');}}}
  }
  function formatTime(beats){const seconds=Math.max(0,Math.round(beats*60/S.tempo));return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')}
  function updateTransport(){const b=Math.max(0,Math.min(S.total,currentBeat()));$('tab-seek').value=b;$('tab-time').textContent=`${formatTime(b)} / ${formatTime(S.total)}`;}
  function animate(){requestAnimationFrame(animate);if(!S.playing||!['practice','stairway'].includes(H.view))return;updateTransport();const b=currentBeat();let active=-1;for(let i=0;i<S.mapped.length;i++){if(S.mapped[i].beat>b+.02)break;if(b<S.mapped[i].beat+S.mapped[i].duration)active=i}highlight(active)}
  function favoriteToggle(){
    if(favorites.has(S.tab.id))favorites.delete(S.tab.id);else favorites.add(S.tab.id);
    try{localStorage.setItem('harmonic-lab-favorites-v1',JSON.stringify([...favorites]))}catch{}
    $('tab-favorite').textContent=favorites.has(S.tab.id)?'★ Saved':'☆ Save';$('tab-favorite').setAttribute('aria-pressed',String(favorites.has(S.tab.id)));renderLibrary();
  }
  function categoryOf(tab){return tab.category||'Technique';}
  function renderLibrary(){
    const fold=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const query=fold($('library-search').value),holder=$('tab-library');holder.innerHTML='';
    let tabs=allTabs().filter(t=>(S.category==='all'||categoryOf(t)===S.category)&&(S.difficulty==='all'||t.difficulty===S.difficulty)&&(!$('library-favorites').checked||favorites.has(t.id))&&fold([t.title,t.description,t.composer,t.learning,t.progression,...(t.tags||[])].join(' ')).includes(query));
    if(S.sort==='title')tabs.sort((a,b)=>a.title.localeCompare(b.title));
    if(S.sort==='composer')tabs.sort((a,b)=>(a.composer||'').localeCompare(b.composer||'')||a.title.localeCompare(b.title));
    if(S.sort==='short')tabs.sort((a,b)=>Math.max(...a.events.map(e=>e.beat+e.duration))/a.tempo-Math.max(...b.events.map(e=>e.beat+e.duration))/b.tempo);
    $('library-count').textContent=`${tabs.length} / ${allTabs().length} selections · every tuning`;
    tabs.forEach(tab=>{
      const b=document.createElement('button');b.className='library-item'+(S.tab?.id===tab.id?' active':'');b.dataset.tabId=tab.id;
      const title=document.createElement('strong');title.textContent=(favorites.has(tab.id)?'★ ':'')+tab.title;
      const detail=document.createElement('small');detail.textContent=[tab.composer,tab.difficulty||'Study',`${tab.tempo} BPM`].filter(Boolean).join(' · ');
      const scope=document.createElement('span');scope.className='library-scope';scope.textContent=tab.scope||categoryOf(tab);
      b.append(title,detail,scope);b.setAttribute('aria-current',S.tab?.id===tab.id?'true':'false');b.addEventListener('click',()=>select(tab));holder.appendChild(b);
    });
    if(!tabs.length){const text=document.createElement('p');text.className='micro';text.textContent='No matches. Clear the search or choose All collections.';holder.appendChild(text)}
    $('repertoire-total').textContent=allTabs().length+' library selections';
  }
  function select(tab){
    if(S.tab)stop(true);S.tab=tab;S.transpose=0;S.octaveFit=0;S.tempo=tab.tempo;S.beat=0;S.from=0;S.total=duration();S.to=S.total;S.page=0;
    $('tab-tempo').value=S.tempo;$('tab-transpose').value=0;$('tab-tuning').value=S.tuning;$('tab-key').value=tab.key;$('loop-from').value=0;$('loop-to').value=S.total;$('loop-to').max=S.total;$('loop-from').max=S.total;$('tab-seek').max=S.total;
    $('tab-category').textContent=tab.id===STAIRWAY?'ARRANGEMENT / FOUR SECTIONS':categoryOf(tab).toUpperCase();$('tab-title').textContent=tab.id===STAIRWAY?'Opening arrangement':tab.title;$('tab-description').textContent=tab.description;$('tab-source').textContent=tab.source;$('score-panel').hidden=!tab.score;
    $('tab-credit').textContent=[tab.composer,tab.scope,`${tab.meter} quarter-note beats / bar`].filter(Boolean).join(' · ');
    $('tab-favorite').hidden=tab.id===STAIRWAY;
    $('tab-learning').textContent=tab.learning||'Follow the interval shape, compare notes on the fretboard, then try an exact key change.';
    $('tab-favorite').textContent=favorites.has(tab.id)?'★ Saved':'☆ Save';$('tab-favorite').setAttribute('aria-pressed',String(favorites.has(tab.id)));
    const sections=$('tab-sections');sections.innerHTML='';(tab.sections||[{beat:0,label:'Start'}]).forEach(sec=>{
      const b=document.createElement('button');b.className='small ghost';b.textContent=sec.label;b.title='Beat '+sec.beat;
      b.addEventListener('click',()=>{const was=S.playing;stop(false);S.from=0;S.to=S.total;$('loop-from').value=0;$('loop-to').value=S.total;S.beat=Math.min(S.total,sec.beat);S.page=Math.floor(S.beat/(S.pageBars*S.tab.meter));drawSheet();updateTransport();if(was)play();});sections.appendChild(b);
    });
    rebuild(false);renderLibrary();updateTransport();
  }
  function rebuild(resume=true){
    const wasPlaying=S.playing;if(wasPlaying)stop(false);
    if(S.fit){const original=T.fingerEvents(S.tab.events,T.tunings[S.tuning],S.transpose,24);if(S.tab.score&&!original.some(e=>e.unplayable))S.octaveFit=0;else S.octaveFit=T.fitOctave(S.tab.events,T.tunings[S.tuning],S.transpose,24).shift;}
    const shift=S.transpose+S.octaveFit;const adapted=S.tab.voicing&&S.voicing;S.mapped=adapted?S.tab.events.map(e=>T.voiceEvent(e,T.tunings[S.tuning],S.transpose)):T.fingerEvents(S.tab.events,T.tunings[S.tuning],shift,24);
    $('voicing-control').hidden=!S.tab.voicing;$('tab-fit').disabled=!!adapted;$('tab-register').disabled=!!adapted;$('tab-register').value=String(S.octaveFit);
    const bad=S.mapped.filter(e=>e.unplayable).length;
    const description=`Key shift ${S.transpose>=0?'+':''}${S.transpose}; register ${S.octaveFit>=0?'+':''}${S.octaveFit} semitones. Total pitch shift ${shift>=0?'+':''}${shift}.`;
    $('fingering-status').textContent=bad?`${bad} event(s) cannot be fingered exactly in frets 0–24. × marks these; audio preserves the requested pitches. ${description} Try Fit octave or another key.`:`All pitches mapped to frets 0–24. ${description} A register fit moves the whole piece by octaves, never individual notes.`;
    if(adapted)$('fingering-status').textContent='Compact chord voicings for this tuning: every chord pitch class is retained, but octaves and inversions may change. Fretted hand span is at most four frets where a compact voicing exists. Turn this off for exact source pitches.';
    const wide=S.mapped.filter(e=>{const f=e.placements.filter(Boolean).filter(p=>p.fret>0).map(p=>p.fret);return f.length>1&&Math.max(...f)-Math.min(...f)>5}).length;if(wide)$('fingering-status').textContent+=` ${wide} wide-span chord(s) need fingering review; the exact pitches are preserved.`;
    const silent=S.mapped.flatMap(e=>e.notes).filter(n=>T.frequency(n)<15||T.frequency(n)>=(H.audio.context?.sampleRate||44100)*.45).length;
    if(silent)$('fingering-status').textContent+=` ${silent} notes are outside the synthesizer bandwidth.`;
    $('fingering-status').classList.toggle('error-text',bad>0||silent>0);$('tab-key').value=T.mod(S.tab.key+S.transpose);drawSheet();S.active=-1;if(wasPlaying&&resume)play();
  }
  function se(tag,attrs,parent){const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(parent)parent.appendChild(e);return e}
  function drawSheet(){
    const holder=$('tab-sheet');holder.innerHTML='';const tuning=T.tunings[S.tuning],strings=tuning.open.length,perRow=S.tab.meter*2,rowH=100+strings*22,pageBeats=S.pageBars*S.tab.meter,pages=Math.max(1,Math.ceil(S.total/pageBeats));S.page=Math.max(0,Math.min(pages-1,S.page));const pageStart=S.page*pageBeats,remaining=Math.min(pageBeats,S.total-pageStart),rows=Math.ceil(remaining/perRow),width=1000,height=rows*rowH+12;
    $('tab-page-label').textContent=`Bars ${S.page*S.pageBars+1}–${Math.ceil((pageStart+remaining)/S.tab.meter)} · page ${S.page+1} of ${pages}`;$('tab-page-prev').disabled=S.page<=0;$('tab-page-next').disabled=S.page>=pages-1;
    const svg=se('svg',{viewBox:`0 0 ${width} ${height}`,role:'group','aria-label':`${S.tab.title} playable tablature`},holder),L=55,R=20,usable=width-L-R;
    const spell=T.scaleSpellings(T.mod(S.tab.key+S.transpose),S.tab.mode);
    for(let row=0;row<rows;row++){
      const y=row*rowH+55,first=pageStart+row*perRow;
      for(let st=0;st<strings;st++){
        const yy=y+st*22;se('line',{x1:L-5,x2:width-R,y1:yy,y2:yy,stroke:'#717171','stroke-width':1},svg);const tx=se('text',{x:9,y:yy+4,fill:'#b2b2b2','font-size':10,'font-family':'monospace'},svg);tx.textContent=tuning.labels[st];
      }
      for(let beat=first;beat<=Math.min(S.total,first+perRow);beat++){
        const x=L+(beat-first)/perRow*usable;
        if(beat===first+perRow)continue;
        if(beat%S.tab.meter===0){se('line',{x1:x,x2:x,y1:y-8,y2:y+(strings-1)*22+8,stroke:'#afafaf','stroke-width':1.2},svg);const num=se('text',{x:x+5,y:y-28,fill:'#909090','font-size':10},svg);num.textContent=`BAR ${Math.floor(beat/S.tab.meter)+1}`;}
      }
      S.mapped.forEach((event,index)=>{
        if(event.beat<first||event.beat>=first+perRow)return;const x=L+(event.beat-first)/perRow*usable+14,group=se('g',{class:'tab-event',role:'button',tabindex:'0','data-index':index,'aria-label':`Beat ${event.beat}, ${event.notes.length?event.notes.map(n=>T.note(n,spell)).join(', '):'rest'}, duration ${event.duration} beats`},svg);
        if(event.label){const lab=se('text',{x:x-6,y:y-37,fill:'#f4d36b','font-size':11,'font-weight':600},group);lab.textContent=event.label;}
        se('rect',{class:'event-bg',x:x-13,y:y-14,width:29,height:strings*22+30,rx:5,fill:'transparent'},group);
        const dur=se('text',{x,y:y-13,'text-anchor':'middle',fill:'#8a8a8a','font-size':9},group);dur.textContent=event.duration===.5?'½':event.duration===.25?'¼':event.duration;
        if(event.notes.length===0){const rest=se('text',{x,y:y+strings*8,'text-anchor':'middle',fill:'#b1b1b1','font-size':14},group);rest.textContent='·';}
        event.notes.forEach((n,j)=>{
          const placement=event.placements[j];if(!placement){const tx=se('text',{x,y:y+j*22+4,'text-anchor':'middle',fill:'#ed83d7','font-size':13},group);tx.textContent='×';return;}
          se('rect',{x:x-9,y:y+placement.string*22-9,width:20,height:17,rx:2,fill:'#1b1b1b'},group);const tx=se('text',{x,y:y+placement.string*22+4,'text-anchor':'middle',fill:'#ededed','font-size':13,'font-weight':600,'font-family':'monospace'},group);tx.textContent=placement.fret;
        });
        const audible=()=>{if(event.notes.length){H.play(event.notes,{duration:event.duration*60/S.tempo});highlight(index)}else H.toast('Rest: '+event.duration+' beat(s).')};group.addEventListener('click',audible);group.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();audible()}});
      });
    }
  }
  function readRegion(){const from=Number($('loop-from').value),to=Number($('loop-to').value);if(!Number.isFinite(from)||!Number.isFinite(to)||from<0||to>S.total||to<=from){H.toast(`Use 0 ≤ From < To ≤ ${S.total}.`);$('loop-from').value=S.from;$('loop-to').value=S.to;return}const was=S.playing;stop(false);S.from=from;S.to=to;S.beat=from;updateTransport();if(was)play();}
  function route(view){
    if(!['practice','stairway'].includes(view)){if(S.playing||S.starting)stop(false);return;}
    const featured=view==='stairway';
    $('view-practice').classList.toggle('featured-score',featured);
    $('library-browser').hidden=featured;
    $('repertoire-total').hidden=featured;
    $('tab-favorite').hidden=featured;
    $('practice-heading').textContent=featured?'Stairway to Tuning':'Music worth exploring.';
    $('practice-eyebrow').textContent=featured?'FEATURED / PLAYABLE SCORE':'LIBRARY / PLAY & DISCOVER';
    $('practice-subheading').textContent=featured?'Descending bass, connected harmonies, and an arpeggio worth studying.':'Classical themes, traditional melodies, chord progressions, and focused technique.';
    if(activeRoute!==view){
      if(activeRoute==='practice'&&S.tab)lastLibraryId=S.tab.id;
      if(S.playing||S.starting)stop(false);
      const desired=featured?STAIRWAY:lastLibraryId;
      const tab=H.library.find(t=>t.id===desired)||allTabs()[0];
      if(S.tab?.id!==tab.id)select(tab);
      activeRoute=view;
    }
  }
  H.initPractice=()=>{
    H.tuningOptions($('tab-tuning'));
    H.options($('tab-key'),T.roots.map((r,i)=>[i,r]));
    $('library-search').addEventListener('input',renderLibrary);
    $('tab-play').addEventListener('click',()=>S.playing?stop(false):play());
    $('tab-stop').addEventListener('click',()=>stop(true));
    $('tab-tempo').addEventListener('change',e=>{const was=S.playing;if(was)stop(false);S.tempo=Math.max(30,Math.min(240,Number(e.target.value)||90));e.target.value=S.tempo;updateTransport();if(was)play()});
    $('tab-loop').addEventListener('change',e=>S.loop=e.target.checked);
    $('tab-metronome').addEventListener('change',e=>{S.metronome=e.target.checked;S.nextClick=Math.ceil(currentBeat());if(!S.metronome)H.audio.stop('click')});
    $('tab-seek').addEventListener('input',e=>{const requested=Number(e.target.value),was=S.playing;if(was)stop(false);S.beat=Math.max(S.from,Math.min(S.to,requested));S.page=Math.floor(S.beat/(S.pageBars*S.tab.meter));drawSheet();updateTransport();if(was)play()});
    $('tab-transpose').addEventListener('change',e=>{S.transpose=Math.max(-24,Math.min(24,Math.round(Number(e.target.value)||0)));e.target.value=S.transpose;rebuild()});
    $('tab-key').addEventListener('change',e=>{let delta=T.mod(Number(e.target.value)-T.mod(S.tab.key+S.transpose));if(delta>6)delta-=12;S.transpose=Math.max(-24,Math.min(24,S.transpose+delta));$('tab-transpose').value=S.transpose;rebuild()});
    $('tab-tuning').addEventListener('change',e=>{S.tuning=e.target.value;S.family=T.tunings[S.tuning].family;rebuild()});
    $('loop-from').addEventListener('change',readRegion);$('loop-to').addEventListener('change',readRegion);
    $('tab-to-explore').addEventListener('click',()=>{H.update({root:T.mod(S.tab.key+S.transpose),mode:S.tab.mode,tuning:S.tuning,octave:0});H.setView('explore');window.scrollTo(0,0)});
    H.options($('library-category'),[['all','All collections'],...groups.map(g=>[g,g])]);
    $('library-category').addEventListener('change',e=>{S.category=e.target.value;renderLibrary()});
    $('library-difficulty').addEventListener('change',e=>{S.difficulty=e.target.value;renderLibrary()});
    $('library-sort').addEventListener('change',e=>{S.sort=e.target.value;renderLibrary()});
    $('library-favorites').addEventListener('change',renderLibrary);
    $('tab-favorite').addEventListener('click',favoriteToggle);
    $('library-reset').addEventListener('click',()=>{S.category='all';S.difficulty='all';S.sort='recommended';$('library-category').value='all';$('library-difficulty').value='all';$('library-sort').value='recommended';$('library-search').value='';$('library-favorites').checked=false;renderLibrary()});
    $('tab-voicing').addEventListener('change',e=>{S.voicing=e.target.checked;rebuild()});
    $('tab-fit').addEventListener('change',e=>{S.fit=e.target.checked;rebuild()});
    $('tab-register').addEventListener('change',e=>{S.octaveFit=Number(e.target.value);S.fit=false;$('tab-fit').checked=false;rebuild()});
    $('tab-page-prev').addEventListener('click',()=>{S.page--;drawSheet()});
    $('tab-page-next').addEventListener('click',()=>{S.page++;drawSheet()});
    $('tab-page-size').addEventListener('change',e=>{S.pageBars=Number(e.target.value);S.page=0;drawSheet()});
    $('tab-follow').addEventListener('change',e=>S.follow=e.target.checked);
    H.selectTab=id=>{const tab=H.library.find(t=>t.id===id);if(tab)select(tab)};
    H.on('view',route);H.on('panic',()=>stop(true));H.practiceState=S;
    select(allTabs()[0]);requestAnimationFrame(animate);
  };
})();
