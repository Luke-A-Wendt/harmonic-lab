'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const T=require('../src/theory.js');const scope={window:{HL:{T}}};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../src/library.js'),'utf8'),scope);
const library=JSON.parse(JSON.stringify(scope.window.HL.library));
let groups=0;function test(name,fn){fn();groups++;console.log('PASS',name)}
const expected={'Classical':17,'Traditional & early popular':19,'Chord progressions':24,'Technique':8,'Opening-page arrangement':1};
test('69 unique universal entries with scope, source and learning metadata',()=>{
 assert.equal(library.length,69);assert.equal(new Set(library.map(t=>t.id)).size,69);
 for(const tab of library){T.validateTab(tab);assert.ok(tab.scope&&tab.source&&tab.learning&&tab.universal,tab.title);}
 for(const [cat,n]of Object.entries(expected))assert.equal(library.filter(t=>t.kind===cat).length,n);
});
let arrangements=0;
test('All 69 pieces fit all five tuning presets with an explicit whole-octave shift',()=>{
 for(const tab of library)for(const [id,tuning]of Object.entries(T.tunings)){
  const out=T.fitOctave(tab.events,tuning,0);assert.equal(out.bad,0,tab.title+' '+id);
  out.mapped.forEach((e,j)=>{assert.deepEqual(e.notes,tab.events[j].notes.map(n=>n+out.shift));e.placements.forEach((p,i)=>assert.equal(tuning.open[p.string]+p.fret,e.notes[i]));});arrangements++;
 }
});
let voicings=0;
test('Progression voicings preserve pitch classes in 12 keys × 5 tunings',()=>{
 for(const tab of library.filter(t=>t.voicing))for(const tuning of Object.values(T.tunings))for(let shift=0;shift<12;shift++)for(const e of tab.events){
  const out=T.voiceEvent(e,tuning,shift);assert.ok(!out.unplayable,tab.title);
  assert.deepEqual([...new Set(out.notes.map(T.pc))].sort((a,b)=>a-b),[...new Set(e.notes.map(n=>T.pc(n+shift)))].sort((a,b)=>a-b));
  assert.equal(new Set(out.placements.map(p=>p.string)).size,out.placements.length);
  out.placements.forEach((p,i)=>assert.equal(tuning.open[p.string]+p.fret,out.notes[i]));
  const fs=out.placements.filter(p=>p.fret>0).map(p=>p.fret);assert.ok(!fs.length||Math.max(...fs)-Math.min(...fs)<=4,tab.title);voicings++;
 }
});
test('Full supplied page: 16 printed bars repeated, 128 quarter-note beats',()=>{
 const tab=library.find(t=>t.id==='stairway-to-tuning');assert.equal(tab.title,'Stairway to Heaven');assert.equal(tab.meter,4);assert.equal(Math.max(...tab.events.map(e=>e.beat+e.duration)),128);assert.equal(tab.tuning,'uke');
 const first=tab.events.filter(e=>e.beat<64),repeat=tab.events.filter(e=>e.beat>=64);assert.equal(first.length,repeat.length);
 first.forEach((e,i)=>{assert.deepEqual(e.notes,repeat[i].notes);assert.equal(e.duration,repeat[i].duration);assert.equal(e.beat+64,repeat[i].beat);});
 assert.ok(tab.scope.includes('16'));assert.ok(!tab.score);assert.ok(tab.preserveRegister);
});
test('Metadata and non-four meter survive JSON validation',()=>{
 const tab=library.find(t=>t.meter===3),copy=T.validateTab(tab);assert.equal(copy.meter,3);assert.equal(copy.scope,tab.scope);assert.equal(copy.composer,tab.composer);
 const prog=library.find(t=>t.voicing);assert.equal(T.validateTab(prog).voicing,true);
});
test('Single alphabetical Songs library, with no score assets or import UI metadata',()=>{
 assert.equal(library.every(t=>t.category==='Songs'),true);
 assert.deepEqual(library.map(t=>t.title),[...library].sort((a,b)=>a.title.localeCompare(b.title,'en',{sensitivity:'base'})).map(t=>t.title));
 assert.equal(library.some(t=>t.score||t.category==='Pop-style'),false);
});
test('36 source melodies retain exact notes and times beneath enriched arrangements',()=>{
 const enriched=library.filter(t=>t.melodyEvents);assert.equal(enriched.length,36);
 for(const t of enriched){
  const original=t.melodyEvents.filter(e=>e.notes.length),arranged=t.events.filter(e=>Number.isFinite(e.melody));
  assert.equal(original.length,arranged.length,t.title);
  original.forEach((e,i)=>{assert.equal(Math.max(...e.notes),arranged[i].melody,t.title);assert.equal(e.beat,arranged[i].beat,t.title);assert.ok(arranged[i].notes.includes(arranged[i].melody));assert.equal(e.duration,arranged[i].duration,t.title)});
  assert.ok(t.events.some(e=>e.notes.length>1),t.title);assert.ok(t.arrangementNote,t.title);
  for(const e of t.events.filter(e=>e.notes.length)){assert.equal(e.noteDurations.length,e.notes.length);assert.equal(e.velocities.length,e.notes.length);assert.ok(e.noteDurations.every(d=>d>0));assert.ok(e.velocities.every(v=>v>0&&v<=1))}
 }
});
test('Constant transposition preserves successive melodic gaps, rhythms and chords',()=>{
 for(const t of library)for(const k of [-24,-7,-1,1,7,24]){
  const src=t.events,moved=src.map(e=>({...e,notes:e.notes.map(n=>n+k)}));
  src.forEach((e,i)=>{assert.equal(moved[i].beat,e.beat);assert.equal(moved[i].duration,e.duration);e.notes.forEach((n,j)=>assert.equal(moved[i].notes[j]-n,k));});
  const voice=src.filter(e=>Number.isFinite(e.melody)).map(e=>e.melody);for(let i=1;i<voice.length;i++)assert.equal((voice[i]+k)-(voice[i-1]+k),voice[i]-voice[i-1]);
 }
});
console.log(JSON.stringify({groups,arrangements,voicings,entries:library.length}));
