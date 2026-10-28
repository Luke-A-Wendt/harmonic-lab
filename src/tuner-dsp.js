/* Monophonic tuning diagnostics. No target-dependent pitch snapping or octave folding. */
(function(global){
 'use strict';const H=global.HL,T=H.T;
 const lowcutOrder=16,lowcutQ=Array.from({length:8},(_,k)=>1/(2*Math.cos((2*k+1)*Math.PI/32)));
 const db=x=>20*Math.log10(Math.max(1e-9,x));
 function levels(data){let energy=0,mean=0,peak=0;for(const x of data){mean+=x;peak=Math.max(peak,Math.abs(x));}mean/=data.length;for(const x of data)energy+=(x-mean)**2;return{rms:Math.sqrt(energy/data.length),db:db(Math.sqrt(energy/data.length)),peak};}
 function filterSettings(tuning,mode='auto',manual=70,hum=0){const lowest=Math.min(...tuning.open.map(T.frequency));return {enabled:mode!=='off',cutoff:mode==='manual'?Math.max(20,Math.min(lowest*.95,manual)):lowest*.85,lowest,hum:Number(hum)||0};}
 function spectralPeaks(spectrum,sr,min=35,max=6000){
  const bin=sr/(spectrum.length*2),out=[];for(let i=Math.max(1,Math.ceil(min/bin));i<Math.min(spectrum.length-1,max/bin);i++){
   const a=spectrum[i-1],b=spectrum[i],c=spectrum[i+1];if(!Number.isFinite(b)||b<-95||b<a||b<=c)continue;
   const den=a-2*b+c,offset=Number.isFinite(den)&&den?Math.max(-.5,Math.min(.5,.5*(a-c)/den)):0;
   out.push({frequency:(i+offset)*bin,db:b,bin:i});
  }return out.sort((a,b)=>b.db-a.db);
 }
 function harmonicEvidence(f,peaks,sr,fftSize){
  const bin=sr/fftSize,near=(target)=>peaks.filter(p=>Math.abs(p.frequency-target)<Math.max(bin*1.6,target*.014)).sort((a,b)=>b.db-a.db)[0];
  const components=Array.from({length:8},(_,i)=>{const h=i+1,p=near(h*f);return p?{h,...p}:null}).filter(Boolean),peak=peaks[0];
  const dominant=peak?Math.round(peak.frequency/f):0;
  const fits=peak&&dominant>=1&&dominant<=8&&Math.abs(peak.frequency-dominant*f)<Math.max(bin*1.6,peak.frequency*.018);
  const fundamental=components.find(p=>p.h===1),delta=peak&&fundamental?peak.db-fundamental.db:null;
  return {components,dominant:fits?dominant:0,fundamental,delta};
 }
 function assess(samples,sr,spectrum,opts={}){
  const tuning=opts.tuning||T.tunings.guitar,low=Math.min(...tuning.open.map(T.frequency)),input=levels(samples),gate=opts.gate??-62;
  const peaks=spectralPeaks(spectrum,sr,Math.max(35,low*.75)),peak=peaks[0]||null;
  const result={input,peaks,peak,frequency:null,reason:'quiet',harmonics:null};
  if(input.peak>.985||opts.rawPeak>.985)return {...result,reason:'clipping'};
  if(input.db<gate)return result;
  const estimate=T.detectPitch(samples,sr,Math.max(35,low*.78),1400);
  if(!estimate||estimate.confidence<.86)return {...result,reason:'unclear'};
  const f=estimate.frequency;if(f<low*.86)return {...result,reason:'below-range'};
  if(!peak||peak.db<-85)return {...result,reason:'quiet'};
  const evidence=harmonicEvidence(f,peaks,sr,samples.length);
  // Broadband/polyphonic input should not produce a confident green "in tune" badge.
  if(evidence.dominant===0)return {...result,reason:'inconsistent'};
  const nearest=tuning.open.map((n,i)=>({n,i,cents:1200*Math.log2(f/T.frequency(n))})).sort((a,b)=>Math.abs(a.cents)-Math.abs(b.cents))[0];
  let ambiguity=null;
  if(Number.isInteger(opts.selected)&&opts.selected>=0){const target=T.frequency(tuning.open[opts.selected]),h=Math.round(f/target);
   if(h>=2&&h<=4&&Math.abs(1200*Math.log2(f/(h*target)))<55)ambiguity=`The measured periodic pitch is near ${h}× the locked string. It may be an isolated harmonic or a different note; the lower fundamental is not established. Pluck the open string normally. No automatic octave correction was applied.`;
  }
  return {...result,frequency:f,confidence:estimate.confidence,reason:'pitch',harmonics:evidence,nearest,ambiguity};
 }
 T.tuner={lowcutOrder,lowcutQ,levels,filterSettings,spectralPeaks,harmonicEvidence,assess};
 if(typeof module!=='undefined'&&module.exports)module.exports=T.tuner;
})(typeof window!=='undefined'?window:globalThis);
