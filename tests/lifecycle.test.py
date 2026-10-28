"""Synthetic MediaStream and asynchronous playback lifecycle tests (no physical microphone)."""
from pathlib import Path
import json, os, shutil
from playwright.sync_api import sync_playwright
from fixture import fixture
ROOT=Path(__file__).resolve().parent.parent
checks=[]; errors=[]; measurements={}
def check(label,value):
 assert value,label
 checks.append(label);print("PASS",label,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1280,'height':950})
 page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(fixture(),wait_until='load')
 page.locator('#piano [data-pitch="-9"]').click();page.wait_for_timeout(350)
 page.click('[data-view=spectrum]')
 # Native browser media graph feeds a controlled string waveform to the real mic processing path.
 page.evaluate('''async()=>{
  await HL.audio.ensure(); const ctx=HL.audio.context, dest=ctx.createMediaStreamDestination();
  const osc=ctx.createOscillator(),gain=ctx.createGain(),hum=ctx.createOscillator(),hg=ctx.createGain();
  osc.frequency.value=HL.T.frequency(-29); gain.gain.value=.12;
  const r=new Float32Array(9),i=new Float32Array(9);i[1]=1;i[2]=.35;i[3]=.2;
  osc.setPeriodicWave(ctx.createPeriodicWave(r,i));osc.connect(gain);gain.connect(dest);osc.start();
  hum.frequency.value=50;hg.gain.value=.25;hum.connect(hg);hg.connect(dest);hum.start();
  window.testMic={ctx,dest,osc,gain,hum,hg,streams:[]};
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{const s=dest.stream.clone();testMic.streams.push(s);return s}}});
 }''')
 page.click('#mic-start');page.wait_for_timeout(1300)
 check('Native synthetic MediaStream activates real mic analysis',page.evaluate('!!HL.audio.stream&&HL.spectrumState.source==="mic"'))
 measurements['rumble_diagnostic']=page.locator('#diagnostic-title').inner_text()
 check('Low E is recognized above louder 50 Hz interference','E2 in tune' in measurements['rumble_diagnostic'])
 button=page.locator('#tuner-reference');button.scroll_into_view_if_needed();b=button.bounding_box()
 page.mouse.move(b['x']+b['width']/2,b['y']+b['height']/2);page.mouse.down();page.wait_for_timeout(3300)
 check('Mic judgment pauses for whole reference hold, beyond old timeout',page.locator('#diagnostic-title').inner_text()=='Reference tone is playing' and page.evaluate('HL.spectrumState.referenceHeld'))
 page.mouse.move(1,1);page.mouse.up();page.wait_for_timeout(1100)
 check('Mic judgment resumes after reference release','E2 in tune' in page.locator('#diagnostic-title').inner_text())
 page.evaluate('testMic.gain.gain.value=0;testMic.hg.gain.value=0');page.wait_for_timeout(500)
 page.click('#calibrate-noise');page.wait_for_timeout(2400)
 check('Room calibration ends with valid gate',page.locator('#calibrate-noise').inner_text()=='Measure room noise' and -80<=page.evaluate('HL.spectrumState.gate')<=-28)
 page.evaluate('testMic.gain.gain.value=.12;testMic.hg.gain.value=.25');page.wait_for_timeout(700)
 page.click('#mic-stop')
 check('Stop mic releases tracks and processing chain',page.evaluate('!HL.audio.stream&&!HL.audio.micAnalysis&&testMic.streams.at(-1).getTracks().every(t=>t.readyState==="ended")'))
 page.click('#mic-start');page.wait_for_timeout(200);page.click('[data-view=explore]');page.wait_for_timeout(100)
 check('Leaving tuner stops microphone access',page.evaluate('!HL.audio.stream&&testMic.streams.at(-1).getTracks().every(t=>t.readyState==="ended")'))
 page.click('[data-view=spectrum]')
 page.evaluate('()=>{navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>window.resolveMic=resolve)}');page.click('#mic-start');page.wait_for_timeout(100);page.click('[data-view=math]')
 page.evaluate('()=>{const s=testMic.dest.stream.clone();testMic.streams.push(s);resolveMic(s)}');page.wait_for_timeout(200)
 check('Late permission result cannot leave microphone running',page.evaluate('!HL.audio.stream&&testMic.streams.at(-1).getTracks().every(t=>t.readyState==="ended")'))
 page.click('[data-view=spectrum]');page.evaluate('()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException("Denied","NotAllowedError")}}');page.click('#mic-start');page.wait_for_timeout(100)
 check('Permission denial is recoverable and explained',not page.locator('#mic-start').is_disabled() and 'permission denied' in page.locator('#tuner-message').inner_text())
 page.click('[data-view=explore]');page.evaluate('()=>{window.ensureOriginal=HL.audio.ensure.bind(HL.audio);HL.audio.ensure=()=>new Promise(resolve=>window.resumeHold=resolve)}')
 key=page.locator('#piano [data-pitch="-9"]');key.scroll_into_view_if_needed();b=key.bounding_box();page.mouse.move(b['x']+b['width']/2,b['y']+b['height']*.85);page.mouse.down();page.wait_for_timeout(30)
 page.evaluate('HL.setView("math")');page.mouse.up();page.evaluate('resumeHold(HL.audio.context)');page.wait_for_timeout(220)
 check('Delayed audio resume cannot start a note after navigation',page.evaluate('HL.audio.active.size===0'))
 page.evaluate('HL.audio.ensure=ensureOriginal;HL.setView("explore")');key.scroll_into_view_if_needed();b=key.bounding_box();page.mouse.move(b['x']+b['width']/2,b['y']+b['height']*.85);page.mouse.down();page.wait_for_timeout(250)
 key.dispatch_event('pointercancel',{'pointerId':1});page.mouse.up();page.wait_for_timeout(200)
 check('Pointer cancellation releases voice',page.evaluate('HL.audio.active.size===0&&!HL.hasHeld()'))
 page.mouse.move(b['x']+b['width']/2,b['y']+b['height']*.85);page.mouse.down();page.wait_for_timeout(200);page.evaluate('window.dispatchEvent(new Event("blur"))');page.mouse.up();page.wait_for_timeout(200)
 check('Window blur releases voice',page.evaluate('HL.audio.active.size===0&&!HL.hasHeld()'))
 # Cancelling before AudioContext resumes must not ask for microphone permission later.
 page.evaluate('()=>{HL.setView("spectrum");window.micRequests=0;HL.audio.ensure=()=>new Promise(resolve=>window.resolveMicContext=resolve);navigator.mediaDevices.getUserMedia=async()=>{micRequests++;return testMic.dest.stream.clone()}}')
 page.click('#mic-start');page.wait_for_timeout(80);page.evaluate('HL.setView("math")');page.evaluate('resolveMicContext(HL.audio.context)');page.wait_for_timeout(120)
 check('Cancelled audio initialization does not request microphone permission',page.evaluate('micRequests===0&&!HL.audio.stream'))
 page.evaluate('()=>{HL.audio.ensure=ensureOriginal}')
 # No pitch analysis work is performed while its optional panel is off.
 page.evaluate('()=>{HL.setView("spectrum");window.peakCalls=0;window.analyzeOriginal=HL.spectral.analyze;HL.spectral.analyze=(...a)=>{peakCalls++;return analyzeOriginal(...a)}}');page.wait_for_timeout(600)
 check('Optional peak analysis performs no analysis while off',page.evaluate('peakCalls===0'))
 page.click('#peak-analysis-toggle');page.wait_for_timeout(600)
 check('Peak analysis runs only when enabled',page.evaluate('peakCalls>=2'))
 page.click('#peak-analysis-toggle');n=page.evaluate('peakCalls');page.wait_for_timeout(600)
 check('Turning off peak analysis stops further measurements',page.evaluate('peakCalls')==n)
 page.set_viewport_size({'width':320,'height':740})
 for view in ['explore','practice','stairway','spectrum','math']:
  page.evaluate('v=>HL.setView(v)',view);page.wait_for_timeout(100)
  check(view+' fits a 320px viewport',page.evaluate('document.documentElement.scrollWidth')<=320)
 check('No lifecycle exceptions',not errors)
 page.evaluate('()=>{testMic.osc.stop();testMic.hum.stop();testMic.dest.stream.getTracks().forEach(t=>t.stop());HL.stopAll();HL.audio.stopMic()}');browser.close()
result={'checks':len(checks),'passed':checks,'measurements':measurements,'browser_errors':errors,'input':'Native synthetic MediaStream only; no physical microphone'}
(ROOT/'tests/lifecycle-results.json').write_text(json.dumps(result,indent=2))
print(json.dumps({'checks':len(checks),'result':'passed'},indent=2))
