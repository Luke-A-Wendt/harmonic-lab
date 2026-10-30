"""Tab-only integration: unified repertoire, transposition, dynamics and lifecycle.
Uses the local, CSP-hashed fixture. No external services or physical microphone.
"""
from pathlib import Path
import json, shutil, os
from playwright.sync_api import sync_playwright
from fixture import fixture
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'tests/screenshots';OUT.mkdir(exist_ok=True)
checks=[];errors=[];console=[]
def check(label,value):
 assert value,label
 checks.append(label);print('PASS',label,flush=True)
def change(page,selector,value):
 page.locator(selector).fill(str(value));page.locator(selector).dispatch_event('change')
def settings(page,section):
 page.click('[data-dialog=practice-options]');page.click('[data-sheet-tab='+section+']')
def close_settings(page):page.click('#practice-options [data-close]')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(8000)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda e:console.append(e.text) if e.type=='error' else None)
 page.set_content(fixture(),wait_until='load');page.click('[data-view=practice]');page.wait_for_timeout(150)
 check('Four workspace buttons with no dedicated Stairway view',page.locator('.main-nav [data-view]').count()==4 and page.locator('[data-view=stairway]').count()==0)
 check('One alphabetized repertoire includes all 69 entries',page.evaluate('HL.library.length')==69 and page.evaluate("HL.library.every(t=>t.category==='Songs')"))
 page.click('[data-dialog=song-library]')
 for group,num in [('songs',37),('chords',24),('theory',8),('all',69)]:
  page.click('[data-library-kind='+group+']')
  check('Visible '+group+' filter returns '+str(num),str(num)+' selections' in page.locator('#library-count').inner_text())
 page.click('#library-next');check('Library has functional next-page navigation','2 /' in page.locator('#library-count').inner_text())
 page.fill('#library-search','fur elise')
 check('Search is accent-insensitive and resets to the first page',page.locator('.library-item').count()==1 and '1 / 1' in page.locator('#library-count').inner_text())
 page.click('[data-tab-id=classical-elise]')
 check('Selecting a song closes the library and updates the shared player',not page.locator('#song-library').is_visible() and 'Für Elise' in page.locator('#tab-title').inner_text())
 check('Arranged melody contains simultaneous notes and per-voice durations',page.evaluate('HL.practiceState.source.some(e=>e.notes.length>1)') and page.evaluate('HL.practiceState.source.some(e=>e.noteDurations?.length>1)'))
 settings(page,'arrange');page.select_option('#tab-texture','melody')
 check('Melody-only mode uses the preserved source melody',page.evaluate('HL.practiceState.source===HL.practiceState.tab.melodyEvents') and page.evaluate('HL.practiceState.source.every(e=>e.notes.length<=1)'))
 page.select_option('#tab-texture','arranged');page.uncheck('#tab-fit');page.select_option('#tab-register','0');close_settings(page)
 page.click('[data-song-pane=pattern]')
 for tuning in ['guitar','dropD','uke','lowG','baritone']:
  page.select_option('#tab-tuning',tuning)
  for key in ['0','2','9']:
   page.select_option('#tab-key',key)
   check('Exact interval path stays invariant in '+tuning+' / root '+key,page.evaluate('HL.patternSnapshot.invariant && HL.patternSnapshot.original.every((p,i)=>HL.patternSnapshot.current[i].n-p.n===HL.patternSnapshot.totalShift)'))
 page.select_option('#tab-tuning','guitar');page.select_option('#tab-key','2');page.wait_for_timeout(120)
 page.screenshot(path=str(OUT/'tabs-delta-desktop.png'),full_page=True)
 page.click('[data-dialog=tabs-interval-dialog]')
 check('Accessible interval table shows original/current pitches and gaps',page.locator('#interval-table-body tr').count()>0 and page.locator('#interval-table-body tr').first.locator('td').count()==6)
 check('Tab interval dialog does not replace Math interval table',page.locator('div#interval-table').count()==1 and page.locator('dialog#tabs-interval-dialog').count()==1)
 page.click('#tabs-interval-dialog [data-close]');page.select_option('#pattern-voice','bass')
 check('Lowest-voice path remains an explicit separate analysis','Lowest attacked voice' in page.locator('#pattern-invariant').inner_text())
 page.select_option('#pattern-voice','melody');page.click('[data-song-pane=tab]')
 settings(page,'reading')
 for val in ['n','degrees','rhythm','gaps']:
  page.select_option('#tab-annotation',val)
  check('Tab supports '+val+' annotation',page.evaluate('HL.practiceState.annotation')==val)
 page.select_option('#tab-page-size','2');close_settings(page)
 old=page.locator('#tab-page-label').inner_text();page.click('#tab-page-next')
 check('Score paging updates both tab and interval scope',page.evaluate('HL.practiceState.page')==1 and page.locator('#tab-page-label').inner_text()!=old)
 page.click('#tab-page-prev')
 # A chord study labels revoicing rather than falsely claiming exact transposition.
 page.evaluate('HL.selectTab("prog-ii-v-i")');page.click('[data-song-pane=pattern]')
 check('Compact chord voicing is distinguished from exact transposition',page.evaluate('HL.patternSnapshot.revoiced') and 'can change' in page.locator('#transposition-badge').inner_text())
 settings(page,'arrange');page.uncheck('#tab-voicing');page.uncheck('#tab-fit');page.select_option('#tab-register','0');change(page,'#tab-transpose',5);close_settings(page)
 check('Disabling revoicing restores the fixed-interval guarantee',page.evaluate('!HL.patternSnapshot.revoiced&&HL.patternSnapshot.invariant&&HL.patternSnapshot.totalShift===5'))
 page.click('[data-song-pane=tab]');page.evaluate('HL.selectTab("g-ode")')
 settings(page,'arrange');page.check('#tab-fit');close_settings(page)
 page.click('#tab-play');page.wait_for_timeout(450)
 check('Enriched playback schedules multiple simultaneous oscillators',page.evaluate('HL.audio.active.size')>1)
 check('Per-note dynamics do not change shared volume',page.evaluate('HL.audio.volume')==1 and page.evaluate('[...HL.audio.active].some(v=>v.group==="practice"&&v.amp<.3)'))
 page.click('#tab-play');frozen=page.evaluate('HL.practiceState.beat');page.wait_for_timeout(150)
 check('Pause retains the current beat',not page.evaluate('HL.practiceState.playing') and page.evaluate('HL.practiceState.beat')==frozen)
 page.click('#tab-play');page.wait_for_timeout(200)
 check('Resume continues rather than resetting',page.evaluate('HL.practiceState.anchorBeat')==frozen)
 page.click('#tab-stop');page.wait_for_timeout(150)
 check('Stop releases all tab voices',page.evaluate('HL.audio.active.size')==0)
 # Loop/metronome options share the same transport.
 settings(page,'play');change(page,'#loop-from',1);change(page,'#loop-to',3);page.check('#tab-loop');page.check('#tab-metronome');close_settings(page)
 change(page,'#tab-tempo',240);page.click('#tab-play');page.wait_for_timeout(1300)
 check('Selected loop range repeats without leaving the bounds',page.evaluate('HL.practiceState.playing&&HL.practiceState.anchorBeat===1&&HL.practiceState.from===1&&HL.practiceState.to===3'))
 page.click('[data-view=explore]');page.wait_for_timeout(180)
 check('Navigation stops the player and metronome',page.evaluate('!HL.practiceState.playing&&HL.audio.active.size===0'))
 page.click('[data-view=practice]');page.evaluate('HL.selectTab("g-ode")')
 # Delayed AudioContext must not play after a workspace switch.
 page.evaluate('()=>{window.realEnsure=HL.audio.ensure.bind(HL.audio);HL.audio.ensure=()=>new Promise(resolve=>window.releaseResume=resolve)}')
 page.click('#tab-play');page.wait_for_timeout(50);page.click('[data-view=math]');page.evaluate('releaseResume(HL.audio.context)');page.wait_for_timeout(160)
 check('Delayed Play cannot start after navigation',page.evaluate('!HL.practiceState.playing&&!HL.practiceState.starting&&HL.audio.active.size===0'))
 page.evaluate('HL.audio.ensure=realEnsure;HL.setView("practice")');page.wait_for_timeout(80)
 page.evaluate('()=>{HL.audio.ensure=()=>new Promise(resolve=>window.releasePreview=resolve)}');page.locator('.tab-event .event-bg').first.click();page.click('[data-view=explore]');page.evaluate('releasePreview(HL.audio.context)');page.wait_for_timeout(150)
 check('Delayed preview cannot leak into Explore',page.evaluate('HL.audio.active.size===0'))
 page.evaluate('HL.audio.ensure=realEnsure;HL.setView("stairway")');page.wait_for_timeout(150)
 check('Legacy Stairway route opens the normal song player',page.evaluate('HL.view==="practice"&&HL.practiceState.tab.id==="stairway-to-tuning"') and page.locator('#tab-play').count()==1)
 check('Source-score image is no longer in the page',page.locator('#score-image,img[src*="stairway"]').count()==0)
 # Each dialog can be opened, operated, and dismissed in both orientations.
 for w,h,label in [(412,850,'portrait'),(844,390,'landscape'),(320,740,'small')]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(200)
  page.click('[data-song-pane=tab]');check(label+' tab fits viewport width',page.evaluate('document.documentElement.scrollWidth')<=w)
  page.click('[data-dialog=song-library]');page.wait_for_timeout(100)
  r=page.locator('#song-library').bounding_box()
  check(label+' library stays within viewport',r['x']>=0 and r['y']>=0 and r['x']+r['width']<=w+1 and r['y']+r['height']<=h+1)
  page.fill('#library-search','Ode');page.locator('[data-tab-id=g-ode]').click()
  page.screenshot(path=str(OUT/f'tabs-{label}.png'),full_page=True)
  page.click('[data-song-pane=pattern]');page.select_option('#tab-key','2');page.wait_for_timeout(150)
  check(label+' comparison has legible separate lanes',page.locator('#pattern-canvas').bounding_box()['height']>=170)
  page.click('[data-dialog=tabs-interval-dialog]');page.click('#tabs-interval-dialog [data-close]')
  page.screenshot(path=str(OUT/f'tabs-delta-{label}.png'),full_page=True)
  page.click('[data-song-pane=tab]')
 check('No JavaScript exceptions in tab regression',not errors)
 check('No CSP or console errors in tab regression',not console)
 browser.close()
result={'checks':len(checks),'passed':checks,'browser_errors':errors,'console_errors':console,'scope':'Tabs plus unchanged-workspace navigation; offline Chromium fixture, not a physical phone'}
(ROOT/'tests/tabs-results.json').write_text(json.dumps(result,indent=2,ensure_ascii=False))
print(json.dumps({'checks':len(checks),'result':'passed'},indent=2))
