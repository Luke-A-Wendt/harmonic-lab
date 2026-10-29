"""Inline the static sources in a CSP-hashed, offline browser fixture.
The test environment prohibits URL navigation. No runtime website assets are changed.
"""
from pathlib import Path
from bs4 import BeautifulSoup
import hashlib, base64
ROOT=Path(__file__).resolve().parent.parent
def fixture(root=ROOT):
 s=BeautifulSoup((root/'index.html').read_text(),'html.parser');hashes=[]
 for script in s.find_all('script',src=True):
  text=(root/script['src'].split('?')[0]).read_text();del script['src'];script.string=text
  hashes.append("'sha256-"+base64.b64encode(hashlib.sha256(text.encode()).digest()).decode()+"'")
 for link in s.find_all('link',rel='stylesheet'):
  style=s.new_tag('style');style.string=(root/link['href'].split('?')[0]).read_text();link.replace_with(style)
 for img in s.find_all('img',src=True):
  p=root/img['src']
  if p.exists():img['src']='data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode()
 c=s.find('meta',attrs={'http-equiv':'Content-Security-Policy'})
 c['content']=c['content'].replace("script-src 'self'", 'script-src '+' '.join(hashes))
 for icon in s.select('link[rel=icon]'):
  p=root/icon['href']
  if p.exists(): icon['href']='data:image/svg+xml;base64,'+base64.b64encode(p.read_bytes()).decode()
 return str(s)
