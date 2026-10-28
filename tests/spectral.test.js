'use strict';
const assert=require('node:assert/strict');
const {analyze}=require('../src/spectral-peaks.js');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS',name)}
function spectrum(tones,{sr=48000,size=8192}={}) {
 const data=new Float32Array(size/2).fill(-130),bin=sr/size;
 for(let i=0;i<data.length;i++)for(const [f,level]of tones){const v=level-12*((i-f/bin)/1.1)**2;if(v>data[i])data[i]=v;}
 return data;
}
test('Silence and non-finite inputs have no peaks',()=>{
 assert.equal(analyze(new Float32Array(4096).fill(-Infinity),48000).peaks.length,0);
 assert.equal(analyze(new Float32Array(4096).fill(-120),48000).peaks.length,0);
 assert.equal(analyze(null,48000).peaks.length,0);
});
test('A4 has n=0 and a sub-bin frequency estimate',()=>{
 const r=analyze(spectrum([[440,-20]]),48000);assert.equal(r.peaks.length,1);const p=r.peaks[0];
 assert.ok(Math.abs(p.frequency-440)<.02);assert.ok(Math.abs(p.n)<.001);assert.equal(p.nearestN,0);
});
test('Peaks are ranked by level, not frequency',()=>{
 const p=analyze(spectrum([[110,-35],[220,-15],[330,-28],[440,-30]]),48000).peaks;
 assert.equal(p.length,4);assert.ok(Math.abs(p[0].frequency-220)<.02);
 assert.equal(p[0].harmonics[0].harmonic,2);assert.ok(Math.abs(p[0].harmonics[0].frequency-110)<.02);
 assert.equal(p[0].harmonics[0].rank,4);
});
test('Several lower-frequency relationships can be retained',()=>{
 const p=analyze(spectrum([[110,-25],[220,-26],[330,-27],[660,-28]]),48000).peaks;
 const hi=p.find(p=>Math.abs(p.frequency-660)<.1);
 assert.deepEqual(hi.harmonics.map(h=>h.harmonic),[6,3,2]);
});
test('No unmeasured fundamental is invented',()=>{
 const p=analyze(spectrum([[220,-20],[330,-30],[440,-34]]),48000).peaks;
 assert.equal(p.length,3);assert.ok(p.every(p=>p.frequency>200));
 assert.ok(p.every(p=>p.harmonics.every(h=>h.frequency>200)));
 assert.equal(p[0].harmonics.length,0);
});
test('Non-harmonic tones are not labeled as members of one family',()=>{
 const p=analyze(spectrum([[220,-20],[311.13,-22],[498.72,-25]]),48000).peaks;
 assert.ok(p.every(p=>p.harmonics.length===0));
});
test('Weak sidelobes below the adaptive threshold are excluded',()=>{
 const r=analyze(spectrum([[440,-20],[890,-90],[1200,-92]]),48000);
 assert.equal(r.peaks.length,1);assert.ok(r.threshold>=-68.1);
});
test('The decomposition works at common audio sample rates',()=>{
 for(const sr of [44100,48000,96000]){
  const r=analyze(spectrum([[220,-20],[440,-25],[660,-30]],{sr}),sr);
  assert.equal(r.peaks.length,3);assert.ok(r.peaks[1].harmonics.some(h=>h.harmonic===2));
 }
});
console.log(`${checks} spectral analysis test groups passed.`);
