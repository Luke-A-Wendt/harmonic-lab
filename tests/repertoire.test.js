'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const T=require('../src/theory.js');const scope={window:{HL:{T}}};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../src/library.js'),'utf8'),scope);
const library=JSON.parse(JSON.stringify(scope.window.HL.library));
let groups=0;function test(name,fn){fn();groups++;console.log('PASS',name)}
const expected={'Classical':17,'Traditional & early popular':19,'Chord progressions':24,'Technique':8,'Stairway to Tuning':1};
test('69 unique universal entries with scope, source and learning metadata',()=>{
 assert.equal(library.length,69);assert.equal(new Set(library.map(t=>t.id)).size,69);
 for(const tab of library){T.validateTab(tab);assert.ok(tab.scope&&tab.source&&tab.learning&&tab.universal,tab.title);}
 for(const [cat,n]of Object.entries(expected))assert.equal(library.filter(t=>t.category===cat).length,n);
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
 const tab=library.find(t=>t.id==='stairway-to-tuning');assert.equal(tab.title,'Stairway to Tuning');assert.equal(tab.meter,4);assert.equal(Math.max(...tab.events.map(e=>e.beat+e.duration)),128);assert.equal(tab.tuning,'uke');
 const first=tab.events.filter(e=>e.beat<64),repeat=tab.events.filter(e=>e.beat>=64);assert.equal(first.length,repeat.length);
 first.forEach((e,i)=>{assert.deepEqual(e.notes,repeat[i].notes);assert.equal(e.duration,repeat[i].duration);assert.equal(e.beat+64,repeat[i].beat);});
 assert.ok(tab.scope.includes('16 bars'));assert.ok(tab.source.includes('Reference:'));
});
test('Metadata and non-four meter survive JSON validation',()=>{
 const tab=library.find(t=>t.meter===3),copy=T.validateTab(tab);assert.equal(copy.meter,3);assert.equal(copy.scope,tab.scope);assert.equal(copy.composer,tab.composer);
 const prog=library.find(t=>t.voicing);assert.equal(T.validateTab(prog).voicing,true);
});
console.log(JSON.stringify({groups,arrangements,voicings,entries:library.length}));
