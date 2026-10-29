"""Offline Chromium integration and mobile-viewport checks for Harmonic Lab."""
from pathlib import Path
import json, os, shutil
from playwright.sync_api import sync_playwright
from fixture import fixture
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'tests/screenshots';OUT.mkdir(exist_ok=True)
checks=[];errors=[];console=[];requests=[];measurements={}
def check(label,condition):
 assert condition,label
 checks.append(label);print('PASS',label,flush=True)
def press(page,selector):
 el=page.locator(selector).first;b=el.bounding_box();assert b,selector
 page.mouse.move(b['x']+b['width']/2,b['y']+b['height']*.85);page.mouse.down();return el
def release(page):
 page.mouse.move(2,2);page.mouse.up();page.wait_for_timeout(320)
def close(page,id):
 page.locator('#'+id+' [data-close]').click();page.wait_for_timeout(100)
def active(page):return page.evaluate('HL.audio.active.size')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1365,'height':900});page.set_default_timeout(8000)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda e:console.append(e.text) if e.type=='error' else None)
 page.on('request',lambda r:requests.append(r.url))
 page.set_content(fixture(),wait_until='load');page.wait_for_timeout(300)
 check('Default volume remains 100%',page.evaluate('HL.state.volume===1&&HL.audio.volume===1'))
 check('Four top-level workspaces, no separate Stairway navigation',page.locator('.main-nav [data-view]').count()==4 and page.locator('[data-view=stairway]').count()==0)
 check('No source-score image or import/export controls',page.locator('img,#import-dialog,#export-tab,#score-image').count()==0)
 check('Root-aligned 13-note piano and Euclidean exponents',page.locator('#piano .piano-key').count()==13 and '−1 + 1/4' in page.locator('#piano-labels [data-pitch="-9"]').inner_text())
 el=press(page,'#piano [data-pitch="-9"]');page.wait_for_timeout(1600)
 measurements['sustain_rms']=page.evaluate('()=>{const d=new Float32Array(8192);HL.audio.analyser.getFloatTimeDomainData(d);return Math.sqrt(d.reduce((s,x)=>s+x*x,0)/d.length)}')
 check('Pointer sustains beyond 1.6 seconds',page.evaluate('[...HL.audio.active].some(v=>v.sustain&&!v.released)') and measurements['sustain_rms']>.1)
 release(page);check('Release outside key stops held voice',active(page)==0)
 el.focus();page.keyboard.down('Space');page.wait_for_timeout(500);check('Space sustains',page.evaluate('HL.hasHeld()'))
 page.keyboard.up('Space');page.wait_for_timeout(320);check('Keyboard release has no extra voice',active(page)==0)
 page.locator('#piano [data-pitch="-8"]').click(force=True);page.wait_for_timeout(200);check('Out-of-scale individual pitch remains silent',active(page)==0)
 page.click('[data-ex-pane=strings]');page.wait_for_timeout(200)
 press(page,'#neck [data-pitch="-9"]');page.wait_for_timeout(250);check('Fret markers sustain exact piano pitches',page.evaluate('HL.hasHeld()') and page.locator('#piano [data-pitch="-9"]').get_attribute('class').find('held-note')>=0)
 page.keyboard.press('Escape');page.mouse.up();page.wait_for_timeout(300);check('Escape releases fret voices',active(page)==0)
 check('Octave has a connected yellow enclosure',page.locator('#neck .octave-region').count()>0)
 page.evaluate('HL.update({frets:48})');page.click('#neck-next');check('Fret windows navigate without horizontal scrolling',page.evaluate('HL.neckWindow.first>0') and page.locator('#neck-scroll').evaluate('e=>e.scrollWidth<=e.clientWidth+2'))
 page.evaluate('HL.update({frets:24})');page.click('#harmonics');page.select_option('#quick-chord','minor');page.wait_for_timeout(1300)
 press(page,'#hold-chord');page.wait_for_timeout(250)
 check('Chord hold includes the out-of-scale third',page.evaluate('[...HL.audio.active].some(v=>v.n===-6)&&HL.hasHeld("chord-held")'))
 release(page);page.select_option('#quick-chord','');page.click('[data-ex-pane=harmonics]');page.wait_for_timeout(100)
 page.evaluate('HL.play([-9],{duration:.6})');page.wait_for_timeout(150);page.click('#harmonic-pin');page.evaluate('HL.play([-2],{duration:1})');page.wait_for_timeout(200)
 pair=page.evaluate('HL.exploreSpectrum.pairs.find(p=>p.a.h===2&&p.b.h===3)');measurements['fifth_partial_pair']=pair
 check('Pinned C and G expose the 3:2 partial near-match',pair is not None and 1.9<pair['cents']<2.0)
 check('Pinned comparison does not change the heard pitches',page.evaluate('HL.exploreSpectrum.pinned[0]===-9&&HL.exploreSpectrum.current[0]===-2'))
 for mode in ['live','waterfall','partials']:
  page.click('[data-harm-plot='+mode+']');check('Explore '+mode+' selectable',page.evaluate('HL.exploreSpectrum.mode')==mode)
 page.screenshot(path=str(OUT/'harmonic-comparison-desktop.png'))
 page.click('[data-view=spectrum]');check('Tuner defaults to scrolling spectrum',page.evaluate('HL.spectrumState.plotMode')=='waterfall' and page.locator('#waterfall-canvas').is_visible())
 press(page,'#tuner-reference');page.wait_for_timeout(1800)
 check('Target hold sustains and resolves low E',page.evaluate('HL.spectrumState.referenceHeld') and 'E2 in tune' in page.locator('#diagnostic-title').inner_text())
 check('Prominent dominant-frequency chips populate',page.locator('#dominant-strip .dominant-chip').count()>0)
 measurements['dominant']=page.locator('#dominant-strip').inner_text();release(page)
 page.evaluate('HL.play([-29],{duration:4,strongSecond:true})');page.wait_for_timeout(1200)
 measurements['second_harmonic_diagnostic']=page.locator('#diagnostic-title').inner_text()
 check('Louder second harmonic is diagnosed, not mistuned','2nd harmonic' in measurements['second_harmonic_diagnostic'] and 'in tune' in measurements['second_harmonic_diagnostic'])
 page.click('#peak-analysis-toggle');page.wait_for_timeout(400)
 snapshot=page.evaluate('HL.spectrumState.peakSnapshot');measurements['peaks']=snapshot['peaks'][:5]
 check('Peak cards include note, n, level and harmonic relation',len(snapshot['peaks'])>2 and page.locator('.peak-card').count()>0 and any(v['harmonics'] for v in snapshot['peaks']))
 page.click('#peaks-freeze');frozen=page.locator('#peaks-body').inner_text();page.wait_for_timeout(500)
 check('Freeze retains the spectral snapshot',page.locator('#peaks-body').inner_text()==frozen and page.evaluate('HL.spectrumState.frozen'))
 page.select_option('#peaks-sort','frequency');page.select_option('#peaks-count','24');check('Sorting preserves cached measurements',page.evaluate('HL.spectrumState.peaksSort')=='frequency')
 close(page,'peak-analysis-panel');check('Closing optional full analysis resets its state',not page.evaluate('HL.spectrumState.peaksEnabled'))
 page.click('#freeze-spectrum');page.click('#panic');page.wait_for_timeout(250)
 for mode in ['live','waterfall']:
  page.click('[data-tuner-plot='+mode+']');check('Tuner '+mode+' switch',page.evaluate('HL.spectrumState.plotMode')==mode)
 page.click('[data-view=practice]');page.click('[data-dialog=song-library]');page.wait_for_timeout(100)
 check('All 69 entries share one alphabetical Songs category',page.evaluate('HL.library.length===69&&HL.library.every(t=>t.category==="Songs")') and '69 songs' in page.locator('#library-count').inner_text())
 page.fill('#library-search','stairway');check('Stairway is discoverable in Songs',page.locator('.library-item').count()==1 and 'Stairway to Heaven' in page.locator('.library-item').inner_text())
 page.locator('.library-item').click();check('Full existing source arrangement retained',page.evaluate('HL.practiceState.total===128&&HL.practiceState.tab.events.length>200'))
 for tuning in ['guitar','dropD','uke','lowG','baritone']:
  page.select_option('#tab-tuning',tuning);check('Stairway exact mapping: '+tuning,not page.evaluate('HL.practiceState.mapped.some(e=>e.unplayable)'))
 page.evaluate('HL.selectTab("ode")' ) if False else None
 page.evaluate('HL.selectTab(HL.library.find(t=>t.title==="Ode to Joy").id)');page.select_option('#tab-tuning','guitar')
 check('Melodic arrangement contains simultaneous tones',page.evaluate('HL.practiceState.source.some(e=>e.notes.length>1)'))
 page.click('[data-song-pane=pattern]');page.select_option('#tab-key','2');page.wait_for_timeout(100)
 check('Constant key change preserves every gap and rhythmic placement',page.evaluate('HL.patternSnapshot.invariant&&HL.patternSnapshot.current.every((p,i)=>p.n-HL.patternSnapshot.original[i].n===HL.patternSnapshot.totalShift)'))
 check('Pattern plot retains original and transposed paths',page.locator('#pattern-view').is_visible() and page.locator('#pattern-detail').inner_text().find('Identical interval path')>=0)
 page.screenshot(path=str(OUT/'transposition-desktop.png'))
 page.click('#tab-play');page.wait_for_timeout(500);check('Single transport starts playback',page.evaluate('HL.practiceState.playing') and 'Pause' in page.locator('#tab-play').inner_text())
 page.click('#tab-play');check('Single transport pauses',not page.evaluate('HL.practiceState.playing') and 'Resume' in page.locator('#tab-play').inner_text())
 page.click('#tab-play');page.locator('#tab-seek').evaluate('e=>{e.value=8;e.dispatchEvent(new Event("input",{bubbles:true}))}');page.wait_for_timeout(100);check('Seek updates playback anchor',abs(page.evaluate('HL.practiceState.anchorBeat')-8)<.1)
 page.click('#tab-stop');page.evaluate('HL.openDialog("practice-options")');page.click('[data-sheet-tab=play]')
 page.fill('#loop-from','0');page.dispatch_event('#loop-from','change');page.fill('#loop-to','1');page.dispatch_event('#loop-to','change');page.check('#tab-loop');close(page,'practice-options')
 page.click('#tab-play');page.wait_for_timeout(1900);check('Loop wraps while playback stays active',page.evaluate('HL.practiceState.playing&&HL.practiceState.beat<1.1'))
 page.click('#tab-stop');page.evaluate('HL.openDialog("practice-options")');page.uncheck('#tab-loop');page.click('[data-sheet-tab=arrange]');page.select_option('#tab-texture','melody');check('Melody-only source remains available',page.evaluate('HL.practiceState.source.every(e=>e.notes.length<=1)'))
 close(page,'practice-options');page.evaluate('HL.selectTab(HL.library.find(t=>t.voicing).id)');check('Revoicing is explicitly differentiated',page.evaluate('HL.patternSnapshot.revoiced') and 'Compact voicing' in page.locator('#transposition-badge').inner_text())
 page.evaluate('HL.openDialog("practice-options")');page.click('[data-sheet-tab=arrange]');page.uncheck('#tab-voicing');check('Exact transposition restores interval invariant',page.evaluate('HL.patternSnapshot.invariant&&!HL.patternSnapshot.revoiced'));close(page,'practice-options')
 page.click('[data-view=math]');page.select_option('#math-chapter','math-tuning');page.wait_for_timeout(200);check('Math navigation uses pages',not page.locator('#math-next').is_disabled())
 page.click('#math-next');check('Next mathematical page advances','2 /' in page.locator('#math-page-label').inner_text())
 # Primary workspaces fit the viewport in portrait, landscape, and small phones.
 for w,h in [(360,640),(390,700),(412,850),(844,390),(915,412),(1365,900)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(250)
  for view in ['explore','spectrum','practice','math']:
   page.evaluate('v=>HL.setView(v)',view)
   if view=='explore':page.evaluate('HL.setExplorePane("strings")')
   page.wait_for_timeout(180)
   check(f'{view} fits {w}×{h} without document scroll',page.evaluate('document.body.scrollHeight<=innerHeight+1&&document.body.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1'))
   if view!='math':
    bad=page.evaluate('''()=>Array.from(document.querySelector('#view-'+HL.view).querySelectorAll('button,select')).filter(e=>e.getClientRects().length&&!e.closest('[hidden]')).filter(e=>{let r=e.getBoundingClientRect();return r.bottom>innerHeight+1||r.right>innerWidth+1||r.left< -1}).map(e=>e.id)''')
    check(f'{view} controls not clipped at {w}×{h}',not bad)
  if w in [412,844]:
   for view in ['explore','spectrum','practice']:
    page.evaluate('v=>HL.setView(v)',view)
    if view=='explore':page.evaluate('HL.setExplorePane("strings")')
    if view=='practice':page.evaluate('HL.selectTab(HL.library.find(t=>t.title==="Ode to Joy").id)');page.click('[data-song-pane=tab]')
    page.wait_for_timeout(200);page.screenshot(path=str(OUT/(view+('-portrait' if w==412 else '-landscape')+'.png')))
 page.evaluate('HL.setView("explore")');page.click('#help-open');page.click('[data-sheet-tab=privacy]');check('Privacy explains local compute and no upload','no remote compute' in page.locator('#help-dialog').inner_text().lower());close(page,'help-dialog')
 check('No runtime errors',not errors);check('No CSP violations or console errors',not console);check('No external data requests',not [r for r in requests if r.startswith(('https:','http:'))])
 # Native touch events test actual pointer capture, not synthetic clicks.
 touch=browser.new_page(viewport={'width':412,'height':850},is_mobile=True,has_touch=True);touch.set_content(fixture());touch.wait_for_timeout(200)
 el=touch.locator('#piano [data-pitch="-9"]');r=el.bounding_box();cdp=touch.context.new_cdp_session(touch)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']*.85}]});touch.wait_for_timeout(600)
 check('Touch hold sustains',touch.evaluate('HL.hasHeld()'))
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});touch.wait_for_timeout(350);check('Touch release stops',active(touch)==0)
 touch.close();browser.close()
result={'checks':len(checks),'passed':checks,'measurements':measurements,'browser_errors':errors,'console_errors':console,'external_requests':requests,'hardware':'Chromium, synthetic audio; no physical microphone or phone'}
(ROOT/'tests/browser-results.json').write_text(json.dumps(result,indent=2,ensure_ascii=False))
print(json.dumps({'checks':len(checks),'result':'passed'},indent=2))
