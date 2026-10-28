"""Audit static asset paths, CSP, and root/subpath HTTP delivery."""
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen
from bs4 import BeautifulSoup
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import functools, threading, tempfile, shutil, json
ROOT=Path(__file__).resolve().parent.parent
soup=BeautifulSoup((ROOT/'index.html').read_text(),'html.parser')
assets=[]
for tag,attr in [('script','src'),('link','href'),('img','src')]:
 for el in soup.find_all(tag):
  value=el.get(attr,'')
  if not value or value.startswith('data:'):continue
  assert not urlparse(value).scheme and not value.startswith('/'),value
  assert (ROOT/value).is_file(),value
  assets.append(value)
ids=[el['id'] for el in soup.find_all(id=True)];assert len(ids)==len(set(ids))
csp=soup.find('meta',attrs={'http-equiv':'Content-Security-Policy'})['content'];assert "connect-src 'none'" in csp
assert soup.find('input',id='volume')['value']=='1'
assert not soup.select('#import-dialog, #import-open, #export-library')
assert len(soup.select('.main-nav [data-view]'))==5
assert (ROOT/'.nojekyll').exists()
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
responses=[]
with tempfile.TemporaryDirectory() as tmp:
 prefix=Path(tmp)/'project';shutil.copytree(ROOT,prefix,ignore=shutil.ignore_patterns('tests','__pycache__'))
 for served,prefix_url in [(ROOT,''),(Path(tmp),'project/')]:
  handler=functools.partial(Quiet,directory=str(served));server=ThreadingHTTPServer(('127.0.0.1',0),handler)
  thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  try:
   for asset in ['index.html',*assets]:
    with urlopen(f'http://127.0.0.1:{server.server_port}/{prefix_url}{asset}',timeout=5) as response:
     assert response.status==200 and response.read()==(ROOT/asset).read_bytes(),asset
     responses.append({'path':prefix_url+asset,'status':response.status})
  finally:server.shutdown();server.server_close();thread.join()
result={'assets':len(assets),'http_checks':len(responses),'unique_element_ids':len(ids),'paths':'relative, root and subpath verified','csp_network_data_connections':'disabled','result':'passed'}
(ROOT/'tests/static-results.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
