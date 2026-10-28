"""Deterministic, synthetic-audio tests through actual browser filter nodes.
Development dependencies: playwright, numpy, Chromium. No microphone hardware.
"""
from pathlib import Path
from fixture import fixture
import json, math, os, shutil
import numpy as np
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 page=browser.new_page();page.set_content(fixture())
 page.evaluate('''() => {window.renderTest = async function(o){
   const sr=o.sr||48000,ctx=new OfflineAudioContext(1,sr,sr);
   const engine=new HL.audio.constructor();engine.context=ctx;
   const source=ctx.createBufferSource(),buffer=ctx.createBuffer(1,sr,sr),data=buffer.getChannelData(0);
   let seed=1;for(let i=0;i<data.length;i++){
     let x=0;for(const [f,a] of o.tones||[])x+=a*Math.sin(2*Math.PI*f*i/sr);
     seed=(Math.imul(seed,1664525)+1013904223)>>>0;
     x+=(o.noise||0)*(seed/4294967296*2-1);
     data[i]=o.clip?Math.max(-1,Math.min(1,x)):x;
   }
   source.buffer=buffer;const chain=engine.analysisChain(source);
   const config=HL.T.tuner.filterSettings(HL.T.tunings[o.tuning||'guitar'],o.mode||'auto',70,o.hum||0);
   engine.configureAnalysis(config);chain.notch.connect(ctx.destination);source.start();
   const response=Float32Array.from([50,55,60,70.046,82.406889,110,440]);
   const gain=new Float32Array(response.length).fill(1),mag=new Float32Array(response.length),phase=new Float32Array(response.length);
   // Use fixed values for analytic response; do not inspect scheduled setTarget parameters at t=0.
   for(const [j,f] of chain.filters.entries()){
     const reference=ctx.createBiquadFilter();reference.type=config.enabled?'highpass':'allpass';
     reference.frequency.value=config.enabled?config.cutoff:0;
     reference.Q.value=config.enabled?20*Math.log10(HL.T.tuner.lowcutQ[j]):1;
     reference.getFrequencyResponse(response,mag,phase);for(let i=0;i<gain.length;i++)gain[i]*=mag[i];
   }
   const rendered=await ctx.startRendering();
   return {samples:Array.from(rendered.getChannelData(0).slice(-8192)),response:Array.from(response).map((f,i)=>[f,20*Math.log10(gain[i])]),config};
 };}''')
 def run(name,tones,tuning='guitar',target=None,expected=None,reason=None,**kw):
  sr=kw.get('sr',48000)
  out=page.evaluate('o=>renderTest(o)',{'tones':tones,'tuning':tuning,**kw})
  samples=np.asarray(out['samples']);fft=np.abs(np.fft.rfft(samples*np.blackman(8192)))/8192
  spectrum=np.maximum(-160,20*np.log10(np.maximum(1e-12,fft[:4096]))).tolist()
  assessment=page.evaluate('''o=>{const r=HL.T.tuner.assess(Float32Array.from(o.samples),o.sr,Float32Array.from(o.spectrum),{tuning:HL.T.tunings[o.tuning],selected:o.target??-1,gate:o.gate??-62});return {frequency:r.frequency,reason:r.reason,confidence:r.confidence,dominant:r.harmonics?.dominant,delta:r.harmonics?.delta,ambiguity:r.ambiguity,input:r.input,peak:r.peak}}''',{'samples':out['samples'],'spectrum':spectrum,'sr':sr,'tuning':tuning,'target':target})
  assessment['name']=name
  if expected:
   assert assessment['frequency'],assessment
   error=1200*math.log2(assessment['frequency']/expected);assessment['error_cents']=error
   assert abs(error)<3,assessment
  if reason:assert assessment['reason'] in reason,assessment
  results.append(assessment)
  return assessment,out
 f=lambda n:440*2**(n/12)
 # All open strings at both common sample rates, with noise and different harmonic envelopes.
 tunes=page.evaluate('Object.fromEntries(Object.entries(HL.T.tunings).map(([k,t])=>[k,t.open]))')
 for sr in [44100,48000]:
  for name,notes in tunes.items():
   for i,n in enumerate(notes):
    ff=f(n)
    run(f'{name} string {i+1} @ {sr}',[[ff,.13],[ff*2,.06],[ff*3,.025]],name,expected=ff,sr=sr,noise=.001)
 _,response=run('filter-response',[[f(-29),.13]],expected=f(-29))
 measured=dict(response['response']);assert measured[50]<-23;assert measured[55]<-16;assert measured[82.40689086914062]>-.4,measured
 for hum in [50,55,60]:
  rr,_=run(f'low E + louder {hum} Hz rumble',[[f(-29),.08],[2*f(-29),.04],[hum,.22]],expected=f(-29),hum=60 if hum==60 else 0)
 run('A2 + sub-string rumble',[[110,.09],[220,.05],[52,.27]],expected=110)
 r,_=run('dominant second',[[f(-29),.025],[2*f(-29),.20],[3*f(-29),.035]],expected=f(-29))
 assert r['dominant']==2,r
 r,_=run('dominant third',[[f(-24),.025],[2*f(-24),.03],[3*f(-24),.18]],expected=f(-24))
 assert r['dominant']==3,r
 r,_=run('missing fundamental with harmonics 2,3,4',[[2*f(-29),.16],[3*f(-29),.07],[4*f(-29),.035]],expected=f(-29))
 for cents in [-38,27]:
  ff=f(-24)*2**(cents/1200);run(f'detuned {cents} cents',[[ff,.15],[ff*2,.05]],expected=ff)
 run('quiet',[],reason=['quiet'])
 run('sub-string rumble only',[[50,.3]],reason=['unclear','quiet','below-range','inconsistent'])
 run('broadband noise only',[],noise=.05,reason=['unclear','quiet','inconsistent'])
 r,_=run('isolated harmonic with low E locked',[[2*f(-29),.2]],target=5,expected=2*f(-29))
 assert r['ambiguity'],r
 run('clipping',[[110,1.2]],mode='off',clip=True,reason=['clipping'])
 # Low-cut bypass preserves low tone rather than silently filtering playback.
 _,bypass=run('filter bypass',[[110,.15]],mode='off',expected=110)
 assert all(abs(db)<.001 for _,db in bypass['response'])
 browser.close()
report={'cases':len(results),'filter_response_db':response['response'],'results':results,'hardware':'synthetic only; no physical microphone'}
(ROOT/'tests/audio-results.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'cases_passed':len(results),'filter_response_db':response['response'],'harmonic_cases':[r for r in results if 'dominant' in r['name'] or 'missing' in r['name']]},indent=2))
