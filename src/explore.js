/* Connected pitch circles, piano, and fretboard. */
(function () {
  'use strict';
  const H=window.HL, T=H.T, $=H.$, NS='http://www.w3.org/2000/svg';
  const NECK={label:42,open:44,fret:44,row:44,header:24};
  let firstFret=0, visibleFrets=8;
  function se(tag,attrs,parent) {
    const el=document.createElementNS(NS,tag);
    Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));
    if(parent) parent.appendChild(el); return el;
  }
  function drawCircles() {
    const {root,step,mode}=H.state, holder=$('circle-holder'), cycles=T.cycles(step);
    holder.innerHTML=''; holder.classList.toggle('multi',cycles.length>1);
    cycles.forEach((seq,ci)=>{
      const svg=se('svg',{viewBox:'0 0 300 260',role:'group','aria-label':`Root cycle ${ci+1}`},holder),cx=150,cy=130,rad=cycles.length===1?100:85;
      se('circle',{cx,cy,r:rad,stroke:'#545454','stroke-width':1,fill:'none'},svg);
      if(cycles.length===1) {
        se('text',{x:cx,y:cy-8,'text-anchor':'middle',fill:'#e6e6e6','font-size':16},svg).textContent=T.rootName(root,mode);
        se('text',{x:cx,y:cy+13,'text-anchor':'middle',fill:'#9b9b9b','font-size':9},svg).textContent=`+${step} MOD 12`;
      }
      seq.forEach((p,j)=>{
        const angle=-Math.PI/2+j*2*Math.PI/seq.length,x=cx+rad*Math.cos(angle),y=cy+rad*Math.sin(angle);
        const g=se('g',{class:'circle-button',role:'button',tabindex:'0','aria-label':`Select ${T.rootName(p,mode)} ${T.scales[mode].name}`,'aria-pressed':String(root===p),'data-root':p},svg);
        const prev=H.previous?.root===p;
        se('circle',{cx:x,cy:y,r:cycles.length===1?19:23,fill:root===p?'#50e3ed':'#2c2c2c',stroke:root===p?'#a2f4fa':prev?'#b9b9b9':'#626262','stroke-width':root===p||prev?2:1,'stroke-dasharray':prev&&p!==root?'3 2':''},g);
        se('text',{x,y:y+4,'text-anchor':'middle',fill:root===p?'#202020':'#e6e6e6','font-size':12,'font-weight':550},g).textContent=T.rootName(p,mode);
        const choose=()=>H.update({root:p});g.addEventListener('click',choose);
        g.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();choose()}});
      });
    });
    $('cycle-description').textContent=cycles.length===1?'One 12-root cycle. Select a root to change the scale.':`${cycles.length} separate cycles of ${cycles[0].length} roots.`;
  }
  function summary() {
    const s=H.state, spellings=T.scaleSpellings(s.root,s.mode), set=T.scaleSet(s.root,s.mode),rootLabel=T.rootName(s.root,s.mode);
    $('scale-title').textContent=`${rootLabel} ${T.scales[s.mode].name.toLowerCase()}`;
    $('scale-note-chips').innerHTML='';
    T.scales[s.mode].offsets.forEach((offset,i)=>{
      const chip=document.createElement('div');chip.className='scale-note-chip';const pitch=T.mod(s.root+offset);
      chip.textContent=spellings[pitch]||T.sharp[pitch];const small=document.createElement('small');
      small.textContent=s.mode==='chromatic'?`${offset} st`:`deg ${T.scales[s.mode].degrees?.[i]||i+1}`;
      chip.appendChild(small);$('scale-note-chips').appendChild(chip);
    });
    $('scale-offsets').textContent='{ '+T.scales[s.mode].offsets.join(', ')+' }';
    if(H.previous) {
      const old=T.scaleSet(H.previous.root,H.previous.mode),oldSpell=T.scaleSpellings(H.previous.root,H.previous.mode);
      const added=set.filter(p=>!old.includes(p)),removed=old.filter(p=>!set.includes(p));
      $('comparison-title').textContent=`${T.rootName(H.previous.root,H.previous.mode)} ${T.scales[H.previous.mode].name} → ${rootLabel} ${T.scales[s.mode].name}`;
      $('comparison-diff').textContent=`− ${removed.length?removed.map(p=>oldSpell[p]||T.sharp[p]).join(', '):'none'}   /   + ${added.length?added.map(p=>spellings[p]||T.sharp[p]).join(', '):'none'}   /   ${set.filter(p=>old.includes(p)).length} shared`;
    }
    if(s.chord) {
      const c=T.chords[s.chord],ns=c.offsets.map(o=>H.startN()+o),names=T.chordSpellings(s.root,s.mode,s.chord);
      $('chord-description').textContent=`${rootLabel}${c.symbol} · ${ns.map(n=>T.note(n,names)).join(' · ')} · offsets {${c.offsets.join(', ')}}. Magenta outlines mark these pitch classes in every octave.`;
    } else $('chord-description').textContent='Magenta outlines identify chord tones. Only cyan scale notes play individually.';
    document.querySelectorAll('#chord-buttons button').forEach(b=>{
      b.classList.toggle('active',b.dataset.chord===s.chord);b.setAttribute('aria-pressed',String(b.dataset.chord===s.chord));
    });
  }
  const positions=[0,.5,1,1.5,2,3,3.5,4,4.5,5,5.5,6];
  const xOf=n=>7*Math.floor((n+9)/12)+positions[T.pc(n)];
  const white=n=>T.natural.includes(T.pc(n));
  function flags(n) {
    const s=H.state;
    return {scale:T.scaleSet(s.root,s.mode).includes(T.pc(n)),octave:n>=H.startN()&&n<=H.startN()+12,chord:!!(s.chord&&T.chords[s.chord].offsets.some(o=>T.mod(s.root+o)===T.pc(n)))};
  }
  function playable(el,n) {
    H.registerPitch(el,n);
    H.bindHold(el,()=>[n],{allowed:()=>flags(n).scale,onBlocked:()=>H.toast(`${H.noteName(n)} is outside this scale. Chord buttons can play out-of-scale tones.`)});
  }
  function piano() {
    const a=H.startN(),b=a+12,board=$('piano'),labels=$('piano-labels');board.innerHTML='';labels.innerHTML='';
    const left=xOf(a)-(white(a)?.5:.34),right=xOf(b)+(white(b)?.5:.34),range=right-left;
    const ns=Array.from({length:13},(_,i)=>a+i),ordered=[...ns.filter(white),...ns.filter(n=>!white(n))];
    ordered.forEach(n=>{
      const f=flags(n),el=document.createElement('button'),w=white(n)?1:.68;el.type='button';
      el.className=`piano-key ${white(n)?'white-key':'black-key'} ${f.scale?'scale':'outside'} ${f.chord?'chord':''}`;
      el.style.left=((xOf(n)-w/2-left)/range*100)+'%';el.style.width=(w/range*100)+'%';
      el.innerHTML=`<span class="key-caption">${H.escape(H.noteName(n))}</span>`;
      el.setAttribute('aria-disabled',String(!f.scale));el.setAttribute('aria-label',`${H.noteName(n)}, n ${n}${f.scale?', hold to play':', outside scale'}${f.chord?', chord tone':''}`);
      playable(el,n);board.appendChild(el);
    });
    ns.forEach(n=>{
      const f=flags(n),mixed=T.mixed(n),deg=T.degree(n,H.state.root,H.state.mode),el=document.createElement('button');el.type='button';
      el.className=`pitch-label ${f.scale?'scale':'outside'} ${f.chord?'chord':''}`;
      el.title=`${n}/12 = ${mixed.text}. ${T.frequency(n).toFixed(3)} Hz.`;
      const old=H.previous?T.scaleSet(H.previous.root,H.previous.mode):null,was=old?.includes(T.pc(n));
      const change=old&&f.scale!==was?(f.scale?'+':'−'):'';
      el.innerHTML=`<span class="n-value">${H.signed(n)}</span><span class="fraction">${H.signed(mixed.text)}</span><span class="note-small">${H.escape(H.noteName(n))}${deg?' · deg '+deg:''}</span>${change?`<span class="change-symbol" title="${f.scale?'Added to':'Removed from'} scale">${change}</span>`:''}`;
      el.setAttribute('aria-label',`${H.noteName(n)}, n equals ${n}, exponent ${mixed.text}${deg?', degree '+deg:''}`);
      el.setAttribute('aria-disabled',String(!f.scale));playable(el,n);labels.appendChild(el);
    });
    $('piano-range').textContent=`${H.noteName(a)} → ${H.noteName(b)}`;
    $('octave-legend-range').textContent=`${H.noteName(a)}–${H.noteName(b)}`;
    $('octave-down').disabled=H.state.octave<=-3;$('octave-up').disabled=H.state.octave>=3;
  }
  function neckRegion(neck,bands,strings,count) {
    const width=NECK.label+NECK.fret*count,height=NECK.header+strings*NECK.row;
    const svg=se('svg',{class:'octave-enclosure',width,height,viewBox:`0 0 ${width} ${height}`,'aria-hidden':'true'},neck);
    const x=col=>NECK.label+col*NECK.fret;
    const regions=[];
    for(const band of bands){const last=regions.at(-1),prev=last?.at(-1);if(prev&&band.row===prev.row+1&&band.lo<=prev.hi&&band.hi>=prev.lo)last.push(band);else regions.push([band]);}
    for(const group of regions){
      const first=group[0],last=group.at(-1),points=[];
      const l=b=>x(b.lo)+2.5,r=b=>x(b.hi+1)-2.5,top=b=>NECK.header+b.row*NECK.row+2.5,bottom=b=>NECK.header+(b.row+1)*NECK.row-2.5;
      points.push([l(first),top(first)],[r(first),top(first)]);
      group.forEach((b,i)=>{const y=i===group.length-1?bottom(b):NECK.header+(b.row+1)*NECK.row;points.push([r(b),y]);if(i<group.length-1)points.push([r(group[i+1]),y]);});
      points.push([l(last),bottom(last)]);
      for(let i=group.length-1;i>=0;i--){const b=group[i],y=i===0?top(b):NECK.header+b.row*NECK.row;points.push([l(b),y]);if(i>0)points.push([l(group[i-1]),y]);}
      se('path',{d:'M'+points.map(p=>p.join(',')).join(' L')+' Z',class:'octave-region'},svg);
    }
  }
  function neck() {
    const el=$('neck'),vp=$('neck-scroll'),s=H.state,t=T.tunings[s.tuning];el.innerHTML='';$('neck-title').textContent=t.name;
    const width=vp.clientWidth||Math.min(innerWidth-50,1000),height=vp.clientHeight||310;
    visibleFrets=Math.min(s.frets+1,Math.max(5,Math.floor((width-NECK.label)/44)));
    firstFret=Math.max(0,Math.min(s.frets+1-visibleFrets,firstFret));
    NECK.fret=(width-NECK.label)/visibleFrets;NECK.open=NECK.fret;NECK.row=Math.max(20,Math.min(66,(height-NECK.header)/t.open.length));
    function row(label,header=false){const div=document.createElement('div');div.className='fret-row'+(header?' fret-header':'');const name=document.createElement('div');name.className='string-name';name.textContent=label;name.style.width=NECK.label+'px';name.style.height=(header?NECK.header:NECK.row)+'px';div.appendChild(name);el.appendChild(div);return div;}
    const top=row('FRET',true);
    for(let j=0;j<visibleFrets;j++){const f=firstFret+j,cell=document.createElement('div');cell.className=`fret-cell header ${f===0?'open':''} ${[3,5,7,9,12,15,17,19,21,24].includes(f)?'mark':''}`;cell.textContent=f===0?'0':f;cell.style.width=NECK.fret+'px';cell.style.height=NECK.header+'px';top.appendChild(cell);}
    const bands=[];
    t.open.forEach((open,i)=>{
      const line=row(t.labels[i]),lo=Math.max(firstFret,H.startN()-open),hi=Math.min(firstFret+visibleFrets-1,H.startN()+12-open);
      if(lo<=hi)bands.push({row:i,lo:lo-firstFret,hi:hi-firstFret});
      for(let j=0;j<visibleFrets;j++){
        const f=firstFret+j,n=open+f,status=flags(n),cell=document.createElement('div');cell.className=`fret-cell ${f===0?'open':''} ${f>24?'extended':''} ${status.octave?'octave-cell':''}`;cell.style.width=NECK.fret+'px';cell.style.height=NECK.row+'px';
        const button=document.createElement('button');button.type='button';button.className=`fret-note ${status.scale?'scale':'outside'} ${status.octave?'in-octave':'out-of-octave'} ${status.chord?'chord':''}`;button.textContent=H.signed(n);button.dataset.fret=f;button.dataset.string=i;
        const size=Math.min(36,NECK.row-6);button.style.width=size+'px';button.style.height=size+'px';button.style.minHeight=size+'px';
        button.setAttribute('aria-disabled',String(!status.scale));button.setAttribute('aria-label',`${H.noteName(n)}, n ${n}; string ${i+1}, fret ${f}; ${status.scale?'hold to play':'outside scale'}; ${status.octave?'inside':'outside'} displayed octave${status.chord?'; chord tone':''}`);button.title=`${H.noteName(n)} · ${T.frequency(n).toFixed(2)} Hz`;playable(button,n);cell.appendChild(button);line.appendChild(cell);
      }
    });
    neckRegion(el,bands,t.open.length,visibleFrets);
    $('neck-page-label').textContent=`Frets ${firstFret}–${firstFret+visibleFrets-1} / ${s.frets}`;$('neck-prev').disabled=firstFret===0;$('neck-next').disabled=firstFret+visibleFrets>s.frets;
    $('neck-note').textContent=s.tuning==='uke'?'Reentrant G4 · same n = same pitch.':'Headstock ← · string 1 on top.';
    if(s.frets>24)$('neck-note').textContent+=' 25+ theoretical.';
    H.neckWindow={first:firstFret,count:visibleFrets};
  }
  function render() {
    drawCircles();summary();piano();neck();
    $('explore-root').value=H.state.root;$('quick-chord').value=H.state.chord||'';
    $('hold-chord').textContent=H.state.chord?'Hold '+T.rootName(H.state.root,H.state.mode)+T.chords[H.state.chord].symbol:'Hold chord';
    $('scale-mode').value=H.state.mode;$('circle-step').value=H.state.step;$('explore-tuning').value=H.state.tuning;$('fret-count').value=H.state.frets;
  }
  H.initExplore=()=>{
    H.options($('explore-root'),T.roots.map((v,i)=>[i,v]),H.state.root);
    H.options($('quick-chord'),[['','None'],...Object.entries(T.chords).map(([k,v])=>[k,v.name])],H.state.chord||'');
    $('explore-root').addEventListener('change',e=>H.update({root:Number(e.target.value)}));
    $('quick-chord').addEventListener('change',e=>{const c=e.target.value||null;H.update({chord:c});if(c)H.play(T.chords[c].offsets.map(o=>H.startN()+o),{duration:1});});
    H.bindHold($('hold-chord'),()=>T.chords[H.state.chord||'major'].offsets.map(o=>H.startN()+o),{before:()=>{if(!H.state.chord)H.update({chord:'major'})},group:'chord-held'});
    $('neck-prev').addEventListener('click',()=>{H.releaseHolds();firstFret=Math.max(0,firstFret-visibleFrets+1);neck()});
    $('neck-next').addEventListener('click',()=>{H.releaseHolds();firstFret=Math.min(H.state.frets+1-visibleFrets,firstFret+visibleFrets-1);neck()});
    $('neck-find').addEventListener('click',()=>{firstFret=Math.max(0,H.startN()-T.tunings[H.state.tuning].open[0]-1);neck()});
    H.on('resize',()=>{if(H.view==='explore'&&H.exPane==='strings'){H.releaseHolds();neck()}});
    H.on('ex-pane',pane=>{if(pane==='strings')neck()});
    H.options($('scale-mode'),Object.entries(T.scales).map(([k,v])=>[k,v.name]),H.state.mode);H.tuningOptions($('explore-tuning'));
    Object.entries(T.chords).forEach(([type,c])=>{
      const b=document.createElement('button');b.textContent=c.name;b.dataset.chord=type;
      b.addEventListener('click',()=>{H.update({chord:type});H.play(c.offsets.map(o=>H.startN()+o),{duration:1.2})});$('chord-buttons').appendChild(b);
    });
    $('clear-chord').addEventListener('click',()=>H.update({chord:null}));
    $('circle-step').addEventListener('change',e=>H.update({step:Number(e.target.value)}));
    $('scale-mode').addEventListener('change',e=>H.update({mode:e.target.value}));
    $('explore-tuning').addEventListener('change',e=>H.update({tuning:e.target.value}));
    $('fret-count').addEventListener('change',e=>H.update({frets:Number(e.target.value)}));
    $('octave-down').addEventListener('click',()=>{if(H.state.octave>-3)H.update({octave:H.state.octave-1})});
    $('octave-up').addEventListener('click',()=>{if(H.state.octave<3)H.update({octave:H.state.octave+1})});
    $('play-scale').addEventListener('click',()=>H.playSequence([...T.scales[H.state.mode].offsets,12].map((o,i)=>({notes:[H.startN()+o],beat:i,duration:.8})),.35));
    H.on('state',patch=>{if(Object.keys(patch).some(k=>!['volume','harmonics'].includes(k)))render()});
    render();
  };
})();
