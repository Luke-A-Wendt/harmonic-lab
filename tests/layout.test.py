"""Viewport containment, chapter pagination, and settings-sheet inspection."""
from pathlib import Path
import json,os,shutil
from playwright.sync_api import sync_playwright
from fixture import fixture
ROOT=Path(__file__).resolve().parent.parent
checks=[];errors=[]
def check(label,value):
 assert value,label
 checks.append(label)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 pg=b.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.set_content(fixture());pg.wait_for_timeout(180)
 for w,h in [(360,640),(390,700),(412,850),(844,390),(915,412),(1440,900)]:
  pg.set_viewport_size({'width':w,'height':h});pg.wait_for_timeout(200)
  for view in ['explore','spectrum','practice','math']:
   pg.evaluate('v=>HL.setView(v)',view);pg.wait_for_timeout(60)
   panes=['keys','strings','harmonics','circles'] if view=='explore' else [None]
   for pane in panes:
    if pane:pg.evaluate('p=>HL.setExplorePane(p)',pane);pg.wait_for_timeout(60)
    result=pg.evaluate('''()=>{const root=document.querySelector('#view-'+HL.view);return {w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,overflow:[...root.querySelectorAll('*')].filter(e=>e.clientHeight>30&&e.getClientRects().length&&e.scrollHeight>e.clientHeight+4&&getComputedStyle(e).position!=='absolute').map(e=>e.id||e.className)}}''')
    check(f'{w}×{h} {view} {pane or ""} document contained',result['w']<=w and result['h']<=h)
    check(f'{w}×{h} {view} {pane or ""} content not clipped',not result['overflow'])
  pg.evaluate('HL.setView("math")');pg.wait_for_timeout(60)
  for chapter in pg.locator('#math-chapter option').evaluate_all('(es)=>es.map(e=>e.value)'):
   pg.select_option('#math-chapter',chapter);pg.wait_for_timeout(100)
   for idx in range(50):
    d=pg.locator('#math-reader').evaluate('e=>({h:e.clientHeight,s:e.scrollHeight,w:e.clientWidth,sw:e.scrollWidth})')
    check(f'{w}×{h} {chapter} page {idx+1} fits',d['s']<=d['h']+4 and d['sw']<=d['w']+4)
    if pg.locator('#math-next').is_disabled():break
    pg.click('#math-next');pg.wait_for_timeout(10)
   else:raise AssertionError('Chapter did not finish in 50 pages')
  if w in [360,412,844]:
   for did in pg.locator('dialog').evaluate_all('(ds)=>ds.map(d=>d.id)'):
    pg.evaluate('id=>HL.openDialog(id)',did);pg.wait_for_timeout(40)
    tabs=pg.locator('#'+did+' [data-sheet-tab]');total=tabs.count() or 1
    for i in range(total):
     if tabs.count():tabs.nth(i).click()
     body=pg.locator('#'+did+' .sheet-body')
     if body.count():
      d=body.evaluate('e=>({h:e.clientHeight,s:e.scrollHeight,w:e.clientWidth,sw:e.scrollWidth})')
      check(f'{w}×{h} {did} panel {i+1} fits',d['s']<=d['h']+4 and d['sw']<=d['w']+4)
    pg.evaluate('id=>document.getElementById(id).close()',did)
 check('No layout exceptions',not errors);b.close()
result={'checks':len(checks),'passed':checks,'viewports':[[360,640],[390,700],[412,850],[844,390],[915,412],[1440,900]],'browser_errors':errors,'physical_devices':False}
(ROOT/'tests/layout-results.json').write_text(json.dumps(result,indent=2))
print(json.dumps({'checks':len(checks),'result':'passed'},indent=2))
