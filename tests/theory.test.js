'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const T=require('../src/theory.js');
let checks=0;
function test(name,fn){try{fn();checks++;console.log('PASS',name)}catch(e){console.error('FAIL',name);throw e}}
const close=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
test('A4 reference and middle C',()=>{close(T.frequency(0),440);close(T.frequency(-9),261.6255653005986);assert.equal(T.note(-9),'C4');assert.equal(T.note(0),'A4')});
test('Whole octaves plus Euclidean remainder, including negatives',()=>{for(let n=-100;n<=100;n++){const x=T.mixed(n);assert.ok(x.r>=0&&x.r<12);close(x.m+x.num/x.den,n/12);assert.equal(T.gcd(x.num,x.den),1)}assert.equal(T.mixed(-9).text,'-1 + 1/4');assert.equal(T.mixed(25).text,'2 + 1/12');assert.equal(T.mixed(24).text,'2')});
test('Note parsing round trips',()=>{for(let n=-57;n<=50;n++)assert.equal(T.parseNote(T.note(n)),n);assert.equal(T.parseNote('Bb4'),1);assert.equal(T.parseNote('F#4'),-3)});
test('Scale spelling preserves sounding octaves',()=>{for(let root=0;root<12;root++)for(const mode of Object.keys(T.scales)){const map=T.scaleSpellings(root,mode);for(let n=-20;n<=25;n++)assert.equal(T.parseNote(T.note(n,map)),n)}assert.equal(T.note(-10,{11:'C♭'}),'C♭4');assert.equal(T.note(-9,{0:'B♯'}),'B♯3')});
test('C and G scales differ by exactly one member',()=>{const a=T.scaleSet(0,'major'),b=T.scaleSet(7,'major');assert.equal(a.filter(x=>b.includes(x)).length,6);assert.deepEqual(a.filter(x=>!b.includes(x)),[5]);assert.deepEqual(b.filter(x=>!a.includes(x)),[6])});
test('Every root appears once across cycles',()=>{for(const step of [1,2,3,4,5,7]){const cs=T.cycles(step);assert.equal(cs.length,T.gcd(step,12));assert.equal(new Set(cs.flat()).size,12);cs.forEach(c=>c.forEach((v,i)=>assert.equal(c[(i+1)%c.length],T.mod(v+step))))}});
test('Tuning error uses log ratios, not divisor counts',()=>{close(T.temperament(12).errors[0].error,1.955000865387433,1e-8);assert.ok(T.temperament(19).mean<T.temperament(12).mean);assert.ok(T.temperament(53).errors[0].error<T.temperament(360).errors[0].error);assert.equal(T.temperament(360).divisors.length,24)});
test('Refinement contains original grid',()=>{for(const n of [12,24,36,72])for(let i=0;i<=n;i++)close(i/n,(i*(360/n))/360)});
test('Guitar C4 has five standard-fret positions',()=>{assert.deepEqual(T.positions(-9,T.tunings.guitar).map(p=>p.fret),[1,5,10,15,20])});
test('Fingerings preserve all notes; unplayable pitches flagged',()=>{const events=[{beat:0,duration:1,notes:[-9,-5,-2]},{beat:1,duration:1,notes:[-50]}];const out=T.fingerEvents(events,T.tunings.guitar,2);out[0].placements.forEach((p,i)=>assert.equal(T.tunings.guitar.open[p.string]+p.fret,out[0].notes[i]));assert.ok(out[1].unplayable);assert.equal(out[1].notes[0],-48)});
test('Repertoire validation rejects malformed and oversized note lists',()=>{const good={version:1,title:'Test',tuning:'guitar',tempo:90,events:[{beat:0,duration:1,notes:[-9]}]};assert.equal(T.validateTab(good).events[0].notes[0],-9);assert.throws(()=>T.validateTab({...good,events:[{beat:0,duration:0,notes:[0]}]}));assert.throws(()=>T.validateTab({...good,events:[{beat:0,duration:1,notes:[440]}]}))});
function signal(f,second=false){const data=new Float32Array(8192);for(let i=0;i<data.length;i++){const p=2*Math.PI*f*i/48000;data[i]=second?.12*Math.sin(p)+.7*Math.sin(2*p)+.15*Math.sin(3*p):.5*Math.sin(p)}return data}
test('Periodicity estimator tracks standard guitar and ukulele tones',()=>{for(const n of [-29,-24,-19,-14,-10,-9,-5,-2,0,12]){const f=T.frequency(n),out=T.detectPitch(signal(f),48000);assert.ok(out,`No pitch for ${f}`);assert.ok(Math.abs(1200*Math.log2(out.frequency/f))<2,`error ${out.frequency} vs ${f}`)}});
test('Fundamental differs from loudest second harmonic',()=>{const f=T.frequency(-29),out=T.detectPitch(signal(f,true),48000);assert.ok(out);assert.ok(Math.abs(1200*Math.log2(out.frequency/f))<2)});
test('Silence is not a note',()=>assert.equal(T.detectPitch(new Float32Array(8192),48000),null));
test('All built-in tabs validate and original fingerings agree with tuning',()=>{const sandbox={window:{HL:{T}}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/library.js'),'utf8'),sandbox);const tabs=sandbox.window.HL.library;assert.ok(tabs.length>=10);for(const tab of tabs){T.validateTab(tab);for(const e of tab.events)if(e.positions)e.positions.forEach((p,i)=>assert.equal(T.tunings[tab.tuning].open[p.string]+p.fret,e.notes[i]));}const score=tabs.find(t=>t.score);assert.equal(score.tuning,'uke');assert.equal(score.events[0].notes[0],0)});
console.log(`\n${checks} theory and DSP test groups passed.`);
