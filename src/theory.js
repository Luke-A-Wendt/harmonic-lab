/* Pure, dependency-free theory functions. The only absolute pitch index is n: A4=0. */
(function (global) {
  'use strict';
  const H = global.HL = global.HL || {};
  const mod = (a, b=12) => ((a % b) + b) % b;
  const gcd = (a,b) => b ? gcd(b,a%b) : Math.abs(a);
  const frequency = n => 440 * 2 ** (n/12);
  const semitones = f => 12 * Math.log2(f/440);
  const pc = n => mod(n+9);
  const sharp = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
  const flat = ['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
  const roots = ['C','D♭','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
  const letters = ['C','D','E','F','G','A','B'];
  const natural = [0,2,4,5,7,9,11];
  const scales = {
    major: {name:'Major', offsets:[0,2,4,5,7,9,11]},
    minor: {name:'Natural minor', offsets:[0,2,3,5,7,8,10]},
    harmonic: {name:'Harmonic minor', offsets:[0,2,3,5,7,8,11]},
    dorian: {name:'Dorian', offsets:[0,2,3,5,7,9,10]},
    mixolydian: {name:'Mixolydian', offsets:[0,2,4,5,7,9,10]},
    pentatonic: {name:'Major pentatonic', offsets:[0,2,4,7,9], degrees:[1,2,3,5,6]},
    minorpent: {name:'Minor pentatonic', offsets:[0,3,5,7,10], degrees:[1,3,4,5,7]},
    chromatic: {name:'Chromatic', offsets:Array.from({length:12},(_,i)=>i), degrees:null}
  };
  const chords = {
    major:{name:'Major',symbol:'', offsets:[0,4,7],degrees:[0,2,4]},
    minor:{name:'Minor',symbol:'m', offsets:[0,3,7],degrees:[0,2,4]},
    dim:{name:'Diminished',symbol:'dim', offsets:[0,3,6],degrees:[0,2,4]},
    aug:{name:'Augmented',symbol:'aug', offsets:[0,4,8],degrees:[0,2,4]},
    sus2:{name:'Sus2',symbol:'sus2', offsets:[0,2,7],degrees:[0,1,4]},
    sus4:{name:'Sus4',symbol:'sus4', offsets:[0,5,7],degrees:[0,3,4]},
    sixth:{name:'6',symbol:'6',offsets:[0,4,7,9],degrees:[0,2,4,5]},
    dominant:{name:'7',symbol:'7', offsets:[0,4,7,10],degrees:[0,2,4,6]},
    maj7:{name:'Maj7',symbol:'maj7', offsets:[0,4,7,11],degrees:[0,2,4,6]},
    min7:{name:'Min7',symbol:'m7', offsets:[0,3,7,10],degrees:[0,2,4,6]}
  };
  const tunings = {
    guitar:{name:'Guitar · standard',family:'guitar',labels:['E4','B3','G3','D3','A2','E2'],open:[-5,-10,-14,-19,-24,-29]},
    dropD:{name:'Guitar · drop D',family:'guitar',labels:['E4','B3','G3','D3','A2','D2'],open:[-5,-10,-14,-19,-24,-31]},
    uke:{name:'Ukulele · high G',family:'uke',labels:['A4','E4','C4','G4'],open:[0,-5,-9,-2]},
    lowG:{name:'Ukulele · low G',family:'uke',labels:['A4','E4','C4','G3'],open:[0,-5,-9,-14]},
    baritone:{name:'Ukulele · baritone',family:'uke',labels:['E4','B3','G3','D3'],open:[-5,-10,-14,-19]}
  };
  function mixed(n){
    if(!Number.isInteger(n)) throw new TypeError('n must be an integer');
    const m=Math.floor(n/12), r=n-12*m, g=r?gcd(r,12):12;
    return {n,m,r,num:r/g,den:12/g,text:r===0?String(m):m===0?`${r/g}/${12/g}`:`${m} + ${r/g}/${12/g}`};
  }
  function rootName(root,mode='major') {
    if(['minor','harmonic','minorpent'].includes(mode)&&[1,8].includes(root)) return sharp[root];
    return roots[root];
  }
  function spellPitch(targetPC, letterIndex){
    let d=mod(targetPC-natural[mod(letterIndex,7)]); if(d>6)d-=12;
    const accidental=d<0?'♭'.repeat(-d):'♯'.repeat(d);
    return letters[mod(letterIndex,7)]+accidental;
  }
  function scaleSpellings(root,mode){
    const s=scales[mode], rootLabel=rootName(root,mode), first=letters.indexOf(rootLabel[0]), result={};
    if(mode==='chromatic')return result;
    s.offsets.forEach((offset,j)=>{let deg=s.degrees?s.degrees[j]-1:j;result[mod(root+offset)]=spellPitch(mod(root+offset),first+deg)});
    return result;
  }
  function note(n, spellings={}) {
    const pitch=pc(n), name=spellings[pitch]||sharp[pitch];
    const li=letters.indexOf(name[0]);
    const accidental=[...name].filter(c=>c==='♯').length-[...name].filter(c=>c==='♭').length;
    const octave=(n+57-natural[li]-accidental)/12;
    return name+Math.round(octave);
  }
  function parseNote(value){
    const match=String(value).match(/^([A-Ga-g])([#b♯♭]*)(-?\d+)$/);
    if(!match)throw new Error('Use a note such as C4, F#3, or Bb4.');
    const li=letters.indexOf(match[1].toUpperCase());
    const acc=[...match[2]].reduce((s,c)=>s+(['#','♯'].includes(c)?1:-1),0);
    return Number(match[3])*12+natural[li]+acc-57;
  }
  const scaleSet=(root,mode)=>scales[mode].offsets.map(x=>mod(root+x));
  function degree(n,root,mode){
    const i=scales[mode].offsets.indexOf(mod(pc(n)-root));
    return i<0?null:mode==='chromatic'?null:scales[mode].degrees?scales[mode].degrees[i]:i+1;
  }
  function chordSpellings(root,mode,type){
    const c=chords[type], first=letters.indexOf(rootName(root,mode)[0]), out={};
    c.offsets.forEach((o,i)=>out[mod(root+o)]=spellPitch(mod(root+o),first+c.degrees[i]));return out;
  }
  function cycles(step){
    const seen=new Set(),out=[];
    for(let p=0;p<12;p++){if(seen.has(p))continue;const seq=[];let x=p;do{seq.push(x);seen.add(x);x=mod(x+step)}while(x!==p);out.push(seq)}return out;
  }
  function temperament(N, ratios=[1.5,1.25,1.2,1.75]){
    if(!Number.isInteger(N)||N<1||N>10000)throw new Error('N must be 1–10000.');
    const errors=ratios.map(r=>{const target=Math.log2(r),step=Math.round(N*target),signed=1200*(step/N-target);return {ratio:r,target,step,signed,error:Math.abs(signed)}});
    const divisors=Array.from({length:N},(_,i)=>i+1).filter(i=>N%i===0);
    return {N,errors,divisors,mean:errors.reduce((s,e)=>s+e.error,0)/errors.length,max:Math.max(...errors.map(e=>e.error))};
  }
  function factors(n){let v=n,out=[];for(let p=2;p*p<=v;p++){let k=0;while(v%p===0){v/=p;k++}if(k)out.push([p,k])}if(v>1)out.push([v,1]);return out}
  function positions(n,tuning,maxFret=24){return tuning.open.flatMap((open,string)=>{const fret=n-open;return fret>=0&&fret<=maxFret?[{string,fret}]:[]})}
  /* Greedy fingering with simultaneous-note matching. No pitch/octave is silently altered. */
  function fingerEvents(events,tuning,transpose=0,maxFret=24){
    let last=3;
    return events.map(e=>{
      const ns=e.notes.map(n=>n+transpose),lists=ns.map((n,i)=>positions(n,tuning,maxFret).map(p=>({...p,cost:Math.max(0,Math.abs(p.fret-last)+p.fret*.12+(p.fret===0?-1:0))})).sort((a,b)=>a.cost-b.cost));
      let best=null;
      function search(i,used,result,cost){if(best&&cost>=best.cost)return;if(i===ns.length){const fretted=result.filter(p=>p.fret>0).map(p=>p.fret);const span=fretted.length?Math.max(...fretted)-Math.min(...fretted):0;const total=cost+Math.max(0,span-3)**2*4;if(!best||total<best.cost)best={result:[...result],cost:total};return}for(const p of lists[i]){if(used.has(p.string))continue;used.add(p.string);result.push(p);search(i+1,used,result,cost+p.cost);result.pop();used.delete(p.string)}}
      if(ns.length<=tuning.open.length)search(0,new Set(),[],0);
      let placements=best?best.result:ns.map(()=>null);
      if(transpose===0&&e.positions&&e.positions.length===ns.length&&new Set(e.positions.map(p=>p.string)).size===ns.length&&e.positions.every((p,i)=>tuning.open[p.string]+p.fret===ns[i]&&p.fret>=0&&p.fret<=maxFret))placements=e.positions;
      const found=placements.filter(Boolean);if(found.length)last=found.reduce((s,p)=>s+p.fret,0)/found.length;
      return {...e,notes:ns,placements,unplayable:placements.some(p=>!p)};
    });
  }
  // Compact chord voicing: preserve each chord pitch class, allow explicit
  // octave/inversion changes, one tone per string, fretted hand span <= 4.
  const voicingCache=new Map();
  function voiceEvent(event,tuning,transpose=0){
    const classes=[...new Set(event.notes.map(n=>pc(n+transpose)))];
    if(classes.length<2)return fingerEvents([event],tuning,transpose)[0];
    const key=tuning.open.join(',')+'|'+classes.join(',');let best=voicingCache.get(key);
    if(!best){
      const lists=classes.map(p=>tuning.open.flatMap((open,string)=>Array.from({length:16},(_,fret)=>({string,fret,n:open+fret})).filter(x=>pc(x.n)===p)));
      function find(i,used,result){
        if(i===classes.length){const frets=result.filter(p=>p.fret>0).map(p=>p.fret),span=frets.length?Math.max(...frets)-Math.min(...frets):0;if(span>4)return;
          const low=Math.min(...result.map(p=>p.n)),rootPenalty=pc(low)===classes[0]?0:1.5;
          const cost=span*span*.6+result.reduce((a,p)=>a+p.fret*.35+(p.fret===0?-.4:0),0)+rootPenalty;
          if(!best||cost<best.cost)best={positions:result.map(p=>({...p})),cost};return;
        }
        for(const p of lists[i]){if(used.has(p.string))continue;const f=[...result,p].filter(x=>x.fret>0).map(x=>x.fret);if(f.length&&Math.max(...f)-Math.min(...f)>4)continue;used.add(p.string);result.push(p);find(i+1,used,result);result.pop();used.delete(p.string)}
      }find(0,new Set(),[]);if(best)voicingCache.set(key,best);
    }
    if(!best)return fingerEvents([event],tuning,transpose)[0];
    return {...event,notes:best.positions.map(p=>p.n),placements:best.positions.map(p=>({string:p.string,fret:p.fret})),unplayable:false,revoiced:true};
  }
  function fitOctave(events,tuning,transpose=0,maxFret=24){
    const candidates=[0,-12,12,-24,24].map(shift=>{
      const mapped=fingerEvents(events,tuning,transpose+shift,maxFret);
      const bad=mapped.filter(e=>e.unplayable).length,frets=mapped.flatMap(e=>e.placements).filter(Boolean).map(p=>p.fret);
      const average=frets.length?frets.reduce((a,b)=>a+b,0)/frets.length:99;
      return {shift,bad,cost:bad*10000+average+Math.abs(shift)*.08,mapped};
    });
    candidates.sort((a,b)=>a.cost-b.cost);return candidates[0];
  }
  function validateTab(input){
    if(!input||input.version!==1||typeof input.title!=='string'||!input.title.trim())throw new Error('Expected version: 1 and a non-empty title.');
    if(input.title.length>180)throw new Error('Title must be at most 180 characters.');
    if(!tunings[input.tuning])throw new Error('Unknown tuning preset.');
    if(!Number.isFinite(input.tempo)||input.tempo<30||input.tempo>240)throw new Error('Tempo must be 30–240 BPM.');
    if(!Array.isArray(input.events)||input.events.length===0||input.events.length>2000)throw new Error('Provide 1–2000 events.');
    const events=input.events.map((e,i)=>{
      if(!Number.isFinite(e.beat)||e.beat<0||e.beat>4096||!Number.isFinite(e.duration)||e.duration<=0||e.duration>32)throw new Error(`Event ${i+1}: invalid beat or duration.`);
      if(!Array.isArray(e.notes)||e.notes.length>6||!e.notes.every(n=>Number.isInteger(n)&&n>=-57&&n<=50))throw new Error(`Event ${i+1}: notes must be an array of at most 6 integer n values (−57 to 50).`);
      const out={beat:e.beat,duration:e.duration,notes:[...e.notes]};
      if(typeof e.label==='string')out.label=e.label.slice(0,100);
      if(e.positions) {if(!Array.isArray(e.positions)||e.positions.length!==e.notes.length||!e.positions.every(p=>Number.isInteger(p.string)&&p.string>=0&&p.string<tunings[input.tuning].open.length&&Number.isInteger(p.fret)&&p.fret>=0&&p.fret<=36))throw new Error(`Event ${i+1}: invalid positions.`);out.positions=e.positions.map(p=>({string:p.string,fret:p.fret}))}
      return out;
    }).sort((a,b)=>a.beat-b.beat);
    for(let i=1;i<events.length;i++)if(events[i].beat===events[i-1].beat)throw new Error('Combine notes at the same beat into one event.');
    const key=Number.isInteger(input.key)&&input.key>=0&&input.key<12?input.key:0;
    const out={version:1,id:typeof input.id==='string'?input.id.slice(0,80):'piece-'+Date.now(),title:input.title,tuning:input.tuning,tempo:input.tempo,key,mode:scales[input.mode]?input.mode:'major',meter:Number.isInteger(input.meter)&&input.meter>=2&&input.meter<=12?input.meter:4,description:String(input.description||'Teaching arrangement').slice(0,2000),source:String(input.source||'Bundled repertoire').slice(0,1200),events};
    for(const field of ['category','composer','difficulty','scope','learning','progression'])if(typeof input[field]==='string')out[field]=input[field].slice(0,1000);
    out.tags=Array.isArray(input.tags)?input.tags.filter(x=>typeof x==='string').slice(0,24).map(x=>x.slice(0,50)):[];
    out.universal=input.universal===true;out.score=input.score===true;out.voicing=input.voicing===true;
    if(Array.isArray(input.sections))out.sections=input.sections.filter(s=>s&&Number.isFinite(s.beat)&&s.beat>=0&&typeof s.label==='string').slice(0,100).map(s=>({beat:s.beat,label:s.label.slice(0,120)}));
    return out;
  }
  /* YIN-style cumulative mean normalized difference. Monophonic only. */
  function detectPitch(data,sampleRate,minF=55,maxF=1400){
    const stride=Math.max(1,Math.floor(sampleRate/12000)),fs=sampleRate/stride,len=Math.min(2048,Math.floor(data.length/stride));
    const x=new Float32Array(len);let mean=0;for(let i=0;i<len;i++){let a=0;for(let j=0;j<stride;j++)a+=data[i*stride+j];x[i]=a/stride;mean+=x[i]};mean/=len;
    let energy=0;for(let i=0;i<len;i++){x[i]-=mean;energy+=x[i]*x[i]}const rms=Math.sqrt(energy/len);if(rms<.00015)return null;
    const maxTau=Math.min(Math.floor(fs/minF),Math.floor(len/2)-1),minTau=Math.max(2,Math.floor(fs/maxF)),window=len-maxTau;
    const d=new Float32Array(maxTau+1);d[0]=1;let run=0;
    for(let tau=1;tau<=maxTau;tau++){let sum=0;for(let j=0;j<window;j++){const dx=x[j]-x[j+tau];sum+=dx*dx}run+=sum;d[tau]=run>0?sum*tau/run:1;}
    let tau=-1;for(let i=minTau;i<maxTau;i++){if(d[i]<.14){while(i+1<=maxTau&&d[i+1]<d[i])i++;tau=i;break}}
    if(tau<0){let v=1;for(let i=minTau;i<maxTau;i++)if(d[i]<v){v=d[i];tau=i}if(v>.25)return null;}
    if(tau<=0)return null;
    // Compare interpolated trough depths, not raw sampled minima: the latter
    // can prefer a multiple of a short pure-sine period solely due to grid error.
    const trough=p=>{const a=d[p-1],b=d[p],c=d[p+1];if(!Number.isFinite(a+c))return b;const den=a-2*b+c,offset=den?.5*(a-c)/den:0;return Math.max(0,b-.25*(a-c)*offset)};
    if(trough(tau)>.001){const first=tau,initial=trough(tau);for(const multiple of [2,3,4]){let candidate=-1,value=1;for(let p=first*multiple-3;p<=Math.min(maxTau-1,first*multiple+3);p++){if(p>0&&d[p]<=d[p-1]&&d[p]<=d[p+1]&&trough(p)<value){value=trough(p);candidate=p}}if(candidate>0&&value<.02&&value<initial*.15){tau=candidate;break}}}
    const y1=d[tau-1],y2=d[tau],y3=d[tau+1]??y2,den=y1-2*y2+y3,offset=den?Math.max(-1,Math.min(1,.5*(y1-y3)/den)):0;
    // Refine the selected period at original sample resolution. This avoids the
    // interpolation bias of short, decimated periods (notably high ukulele notes).
    const center=Math.round((tau+offset)*stride),windowFull=Math.min(4096,data.length-center-4);
    const rawDifference=period=>{let sum=0;for(let j=0;j<windowFull;j++){const d=data[j]-data[j+period];sum+=d*d}return sum};
    let refined=center,best=Infinity;
    for(let p=Math.max(2,center-2);p<=center+2;p++){const value=rawDifference(p);if(value<best){best=value;refined=p}}
    const ra=rawDifference(refined-1),rb=best,rc=rawDifference(refined+1),rd=ra-2*rb+rc;
    const shift=rd?Math.max(-1,Math.min(1,.5*(ra-rc)/rd)):0;
    return {frequency:sampleRate/(refined+shift),confidence:Math.max(0,1-y2),rms};
  }
  H.T={mod,gcd,frequency,semitones,pc,sharp,flat,roots,rootName,natural,scales,chords,tunings,mixed,note,parseNote,scaleSet,scaleSpellings,chordSpellings,degree,cycles,temperament,factors,positions,fingerEvents,voiceEvent,fitOctave,validateTab,detectPitch};
  if(typeof module!=='undefined'&&module.exports)module.exports=H.T;
})(typeof window!=='undefined'?window:globalThis);
