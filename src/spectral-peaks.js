/* Spectral peak measurements. Harmonic labels express possible ratios, not source separation. */
(function (global) {
  'use strict';
  const H=global.HL=global.HL||{};
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const cents=(a,b)=>1200*Math.log2(a/b);
  function analyze(data,sampleRate,options={}) {
    if(!data?.length||!Number.isFinite(sampleRate)||sampleRate<=0) return {peaks:[],resolution:0,threshold:-100};
    const fftSize=options.fftSize||data.length*2, resolution=sampleRate/fftSize;
    const minHz=Math.max(resolution,options.minHz??30),maxHz=Math.min(options.maxHz??12000,sampleRate/2-resolution*2);
    const low=Math.max(1,Math.ceil(minHz/resolution)),high=Math.min(data.length-2,Math.floor(maxHz/resolution));
    const db=i=>Number.isFinite(data[i])?clamp(data[i],-160,20):-160;
    const values=[];
    for(let i=low;i<=high;i++) values.push(db(i));
    values.sort((a,b)=>a-b);
    const noiseFloor=values[Math.floor(values.length*.5)]??-160;
    const loudest=values.at(-1)??-160;
    const threshold=Math.max(options.absoluteFloorDb??-96,noiseFloor+12,loudest-(options.relativeFloorDb??48));
    const candidates=[];
    for(let i=low;i<=high;i++) {
      const a=db(i-1),b=db(i),c=db(i+1);
      if(b<threshold||b<=a||b<c) continue;
      const left=Math.min(...Array.from({length:4},(_,j)=>db(Math.max(low,i-j-1))));
      const right=Math.min(...Array.from({length:4},(_,j)=>db(Math.min(high,i+j+1))));
      const prominence=b-Math.max(left,right);
      if(prominence<(options.minProminenceDb??6)) continue;
      const denominator=a-2*b+c;
      const offset=denominator?clamp(.5*(a-c)/denominator,-.5,.5):0;
      const frequency=(i+offset)*resolution,level=b-.25*(a-c)*offset;
      if(frequency<minHz||frequency>maxHz) continue;
      const n=12*Math.log2(frequency/440),nearestN=Math.round(n)||0;
      candidates.push({bin:i,frequency,level,n,nearestN,cents:100*(n-nearestN),prominence,harmonics:[]});
    }
    // Suppress sidelobes and peaks closer than the useful width of a Blackman FFT lobe.
    candidates.sort((a,b)=>b.level-a.level);
    const resolved=[];
    for(const p of candidates) {
      if(resolved.some(q=>Math.abs(q.bin-p.bin)<3)) continue;
      resolved.push(p);if(resolved.length>=128)break;
    }
    resolved.forEach((p,i)=>p.rank=i+1);
    const ascending=[...resolved].sort((a,b)=>a.frequency-b.frequency);
    for(let i=1;i<ascending.length;i++) {
      const peak=ascending[i];
      for(let j=0;j<i;j++) {
        const base=ascending[j],harmonic=Math.round(peak.frequency/base.frequency);
        if(harmonic<2||harmonic>16) continue;
        const error=cents(peak.frequency,harmonic*base.frequency);
        // Resolution-aware tolerance; close ratios are suggestive, never a physical identification.
        const tolerance=Math.max(8,Math.min(40,1200*Math.log2(1+resolution/peak.frequency)));
        if(Math.abs(error)<=tolerance) peak.harmonics.push({rank:base.rank,frequency:base.frequency,n:base.n,harmonic,error,tolerance});
      }
      peak.harmonics.sort((a,b)=>a.frequency-b.frequency);
    }
    return {peaks:resolved,resolution,threshold,noiseFloor,minHz,maxHz};
  }
  H.spectral={analyze};
  if(typeof module!=='undefined'&&module.exports) module.exports=H.spectral;
})(typeof window!=='undefined'?window:globalThis);
