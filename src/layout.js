/* Viewport shell, focused sheets, orientation-aware pagination. No external services. */
(function(){
 'use strict';const H=window.HL,$=H.$;
 H.openDialog=id=>{const d=$(id);if(!d)return;H.releaseHolds?.();if(!d.open)d.showModal();H.emit('dialog',id);};
 H.setExplorePane=key=>{
  if(!['keys','strings','harmonics','circles'].includes(key))return;
  H.releaseHolds?.();H.exPane=key;
  document.querySelectorAll('[data-ex-content]').forEach(e=>e.hidden=e.dataset.exContent!==key);
  document.querySelectorAll('[data-ex-pane]').forEach(b=>{b.classList.toggle('active',b.dataset.exPane===key);b.setAttribute('aria-pressed',String(b.dataset.exPane===key))});
  requestAnimationFrame(()=>H.emit('ex-pane',key));
 };
 let resizeTimer=null;
 function resized(){
  // Dynamic browser chrome and rotation change the available space, not the document length.
  const height=Math.round(window.visualViewport?.height||innerHeight);
  document.documentElement.style.setProperty('--app-height',height+'px');
  clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{H.emit('resize');if(H.view==='math')paginateMath(true)},120);
 }
 let mathChapter='math-pitch',mathPage=0,mathPages=[],mathBlocks=new Map();
 function flattenMath(){
  document.querySelectorAll('.math-section').forEach(section=>{
   // Keep interactive elements themselves, including their listeners; only remove layout wrappers.
   section.querySelectorAll(':scope > .math-two').forEach(w=>{const parts=[...w.children].flatMap(c=>[...c.children]);w.replaceWith(...parts)});
   section.querySelectorAll(':scope > details').forEach(d=>{const summary=d.querySelector('summary');const h=document.createElement('h3');h.textContent=summary?.textContent.trim()||'More detail';summary?.remove();d.replaceWith(h,...d.children)});
   section.querySelectorAll(':scope > .roadmap').forEach(w=>w.replaceWith(...w.children));
   mathBlocks.set(section.id,[...section.children]);
  });
 }
 function mathTableColumns(){
  document.querySelectorAll('.math-section .table-scroll').forEach(w=>{
   const table=w.querySelector('table');if(!table)return;
   const cells=[...table.rows[0].cells],columns=cells.length;
   if(columns<=4)return;
   const chunk=innerWidth<700?3:innerWidth<1050?5:9,pages=Math.ceil((columns-1)/chunk);
   let state=w._columnPager;
   if(!state||state.table!==table){
    w.querySelector('.math-table-controls')?.remove();
    state=w._columnPager={table,page:0};const bar=document.createElement('div');bar.className='math-table-controls';
    const prev=document.createElement('button'),next=document.createElement('button'),text=document.createElement('span');prev.type=next.type='button';prev.textContent='← Columns';next.textContent='Columns →';bar.append(prev,text,next);w.appendChild(bar);state.prev=prev;state.next=next;state.text=text;
    prev.addEventListener('click',()=>{state.page--;mathTableColumns()});next.addEventListener('click',()=>{state.page++;mathTableColumns()});
   }
   state.page=Math.max(0,Math.min(pages-1,state.page));
   [...table.rows].forEach(row=>[...row.cells].forEach((cell,i)=>cell.hidden=i>0&&(i<1+state.page*chunk||i>=(state.page+1)*chunk+1)));
   state.prev.disabled=state.page===0;state.next.disabled=state.page===pages-1;state.text.textContent='Columns '+(state.page+1)+' / '+pages;state.prev.parentElement.hidden=pages===1;
  });
 }
 function paginateMath(keep=false){
  if(H.view!=='math')return;
  mathTableColumns();
  document.querySelectorAll('.math-section').forEach(s=>s.classList.toggle('math-visible',s.id===mathChapter));
  const reader=$('math-reader'),section=$(mathChapter),blocks=mathBlocks.get(mathChapter)||[];
  if(!blocks.length)return;
  const max=Math.max(100,reader.clientHeight-58);
  blocks.forEach(b=>b.classList.remove('reading-hidden'));
  mathPages=[];let page=[],height=0;
  blocks.forEach(block=>{const style=getComputedStyle(block),h=block.getBoundingClientRect().height+parseFloat(style.marginTop||0)+parseFloat(style.marginBottom||0)+6;
    if(page.length&&height+h>max){mathPages.push(page);page=[];height=0;}
    page.push(block);height+=h;
  });
  if(page.length)mathPages.push(page);mathPage=Math.min(keep?mathPage:0,Math.max(0,mathPages.length-1));showMathPage();
 }
 function showMathPage(){const blocks=mathBlocks.get(mathChapter)||[],visible=mathPages[mathPage]||[];blocks.forEach(b=>b.classList.toggle('reading-hidden',!visible.includes(b)));$('math-page-label').textContent=`${mathPage+1} / ${mathPages.length} · ${$('math-chapter').selectedOptions[0].textContent}`;$('math-prev').disabled=mathPage===0;$('math-next').disabled=mathPage>=mathPages.length-1;$('math-reader').scrollTop=0;H.emit('math-page',mathChapter);}
 H.refreshMathPages=()=>{if(H.view==='math')requestAnimationFrame(()=>paginateMath(true));};
 H.initLayout=()=>{
  document.querySelectorAll('[data-dialog]').forEach(b=>b.addEventListener('click',()=>H.openDialog(b.dataset.dialog)));
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(d=>{
   d.addEventListener('click',e=>{if(e.target===d){const box=d.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)d.close()}});
   d.addEventListener('close',()=>H.emit('dialog-close',d.id));
   d.querySelectorAll('[data-sheet-tab]').forEach(b=>b.addEventListener('click',()=>{d.querySelectorAll('[data-sheet-tab]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});d.querySelectorAll('[data-sheet-content]').forEach(x=>x.hidden=x.dataset.sheetContent!==b.dataset.sheetTab);H.emit('sheet-tab',{id:d.id,tab:b.dataset.sheetTab});}));
  });
  document.querySelectorAll('[data-ex-pane]').forEach(b=>b.addEventListener('click',()=>H.setExplorePane(b.dataset.exPane)));
  $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else H.toast('Fullscreen is unavailable here. Landscape orientation gives the instruments more space.');}catch{H.toast('This browser does not allow fullscreen. The layout still adapts to rotation.');}});
  window.addEventListener('resize',resized);window.visualViewport?.addEventListener('resize',resized);document.addEventListener('fullscreenchange',resized);
  flattenMath();$('math-chapter').addEventListener('change',e=>{mathChapter=e.target.value;paginateMath()});
  $('math-prev').addEventListener('click',()=>{if(mathPage>0){mathPage--;showMathPage()}});$('math-next').addEventListener('click',()=>{if(mathPage<mathPages.length-1){mathPage++;showMathPage()}});
  H.on('view',view=>{if(view==='math')requestAnimationFrame(()=>paginateMath(true));if(view==='explore')requestAnimationFrame(()=>H.emit('ex-pane',H.exPane));});
  resized();
 };
})();
