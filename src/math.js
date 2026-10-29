(function(){
  'use strict';const H=window.HL,T=H.T,$=H.$;
  function table(headers,rows,classes=[]){return `<table><thead><tr>${headers.map(h=>`<th>${H.escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r,i)=>`<tr class="${classes[i]||''}">${r.map(c=>`<td>${H.escape(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`}
  function coordinate(){const n=Number($('math-n').value),m=T.mixed(n);$('mixed-example').innerHTML=`${H.escape(T.note(n))} · n = ${H.signed(n)}<br>${H.signed(n)}/12 = ${H.signed(m.text)}<br>f = ${T.frequency(n).toFixed(4)} Hz`;}
  function prepareTables(){
    const ns=[-25,-13,-12,-9,-1,0,12,24,25];$('mixed-table').innerHTML=table(['n','n/12','Reduced exponent'],ns.map(n=>[H.signed(n),H.signed(n)+'/12',H.signed(T.mixed(n).text)]));
    $('interval-table').innerHTML=table(['Degree','C major','Offset','Interval from C'],[0,2,4,5,7,9,11].map((o,i)=>[i+1,T.note(o-9),o,['Unison','Major 2nd','Major 3rd','Perfect 4th','Perfect 5th','Major 6th','Major 7th'][i]]));
    $('cycle-math-table').innerHTML=table(['Step d','Cycle count','Roots/cycle'],[1,2,3,4,5,7].map(d=>[d,T.gcd(d,12),12/T.gcd(d,12)]));
    $('harmonics-table').innerHTML=table(['h','Frequency (f₀=100)','Octave ratio','log₂ ratio'],Array.from({length:8},(_,i)=>{const h=i+1,p=2**Math.floor(Math.log2(h)),g=T.gcd(h,p);return[h,h*100+' Hz',h/g+'/'+p/g,Math.log2(h/p).toFixed(6)]}));
  }
  function canvas(id,height){const c=$(id);height=Math.min(height,c.clientHeight||height);const w=Math.max(260,c.clientWidth),dpr=Math.min(2,devicePixelRatio||1);if(c.width!==Math.round(w*dpr)||c.height!==height*dpr){c.width=Math.round(w*dpr);c.height=height*dpr}const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return{ctx,w,h:height}}
  function drawWave(time){if(H.view!=='math'||!$('string-wave').getClientRects().length)return;if(matchMedia('(prefers-reduced-motion: reduce)').matches)time=0;const mode=Number($('harmonic-mode').value),{ctx,w,h}=canvas('string-wave',165),L=26,R=w-26,Y=80;
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#161616';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#565656';ctx.beginPath();ctx.moveTo(L,Y);ctx.lineTo(R,Y);ctx.stroke();
    ctx.beginPath();for(let i=0;i<=500;i++){const x=i/500,y=Y-45*Math.sin(mode*Math.PI*x)*Math.cos(time/480);if(i===0)ctx.moveTo(L+x*(R-L),y);else ctx.lineTo(L+x*(R-L),y)}ctx.strokeStyle='#50e3ed';ctx.lineWidth=2;ctx.stroke();
    for(let j=0;j<=mode;j++){const x=L+(R-L)*j/mode;ctx.fillStyle='#f4d36b';ctx.beginPath();ctx.arc(x,Y,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#a3a3a3';ctx.font='9px monospace';ctx.fillText(j===0?'0':j===mode?'L':`${j}/${mode} L`,x-10,145)}
    $('mode-caption').textContent=`h = ${mode}: ${mode-1} internal node${mode===2?'':'s'}, wavelength 2L/${mode}, frequency ${mode}f₀. Animation is slowed down; yellow dots are stationary nodes.`;
  }
  function ratioData(){const id=$('ratio-set').value;if(id==='three')return[{r:1.5,name:'3/2'},{r:1.25,name:'5/4'},{r:1.2,name:'6/5'}];if(id==='harmonic')return[3,5,7,9,11,13,15].map(h=>({r:h/2**Math.floor(Math.log2(h)),name:`${h}/${2**Math.floor(Math.log2(h))}`}));return[{r:1.5,name:'3/2'},{r:1.25,name:'5/4'},{r:1.2,name:'6/5'},{r:1.75,name:'7/4'}]}
  function edo(){
    const N=Math.round(Math.max(2,Math.min(720,Number($('edo-N').value)||12)));$('edo-N').value=N;const ratios=ratioData(),result=T.temperament(N,ratios.map(x=>x.r));
    const factors=T.factors(N).map(([p,k])=>k===1?String(p):`${p}^${k}`).join(' × ');
    $('edo-summary').innerHTML=`N = ${N} = ${factors}<br>${result.divisors.length} divisors · ${ (1200/N).toFixed(3)} cents/step<br>Mean error: ${result.mean.toFixed(3)} cents`;
    $('edo-detail').innerHTML=table(['Ratio','Nearest step','Signed error (¢)'],result.errors.map((e,i)=>[ratios[i].name,e.step+'/'+N,(e.signed>0?'+':'')+e.signed.toFixed(3)]));
    const candidates=[...new Set([12,19,24,31,36,53,72,360,N])].sort((a,b)=>a-b),rows=candidates.map(n=>{const r=T.temperament(n,ratios.map(x=>x.r));return[n,T.factors(n).map(([p,k])=>k===1?p:p+'^'+k).join(' × '),r.divisors.length,...r.errors.map(e=>e.error.toFixed(2)),r.mean.toFixed(2)]});
    $('edo-table').innerHTML=table(['N','Factorization','Divisors',...ratios.map(x=>x.name+' error ¢'),'Mean ¢'],rows,candidates.map(n=>n===N?'selected':''));
    if(H.view==='math')drawEdo(N,ratios,result);H.refreshMathPages?.();
  }
  function drawEdo(N,ratios,result){
    const {ctx,w,h}=canvas('edo-plot',220),L=48,R=w-20,W=R-L;ctx.fillStyle='#161616';ctx.fillRect(0,0,w,h);ctx.font='10px monospace';
    for(let i=0;i<=N;i++){const x=L+W*i/N;ctx.strokeStyle='#50e3ed';ctx.globalAlpha=Math.min(.35,50/N);ctx.beginPath();ctx.moveTo(x,23);ctx.lineTo(x,h-32);ctx.stroke()}ctx.globalAlpha=1;
    ratios.forEach((ratio,i)=>{const y=36+i*((h-80)/Math.max(1,ratios.length-1)),tx=L+W*Math.log2(ratio.r),gx=L+W*result.errors[i].step/N;ctx.fillStyle='#bcbcbc';ctx.fillText(ratio.name,5,y+4);ctx.strokeStyle='#5e5e5e';ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(R,y);ctx.stroke();ctx.strokeStyle='#ed83d7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(tx,y-9);ctx.lineTo(tx,y+9);ctx.stroke();ctx.fillStyle='#f4d36b';ctx.beginPath();ctx.arc(gx,y,4,0,Math.PI*2);ctx.fill();ctx.lineWidth=1;});
    ctx.fillStyle='#9d9d9d';for(const frac of [0,.25,.5,.75,1])ctx.fillText(String(frac),L+W*frac-5,h-12);
  }
  H.initMath=()=>{
    prepareTables();coordinate();edo();$('math-n').addEventListener('input',coordinate);$('math-play-n').addEventListener('click',()=>H.play([Number($('math-n').value)]));
    $('hear-major').addEventListener('click',()=>H.playSequence([0,4,7].map((o,i)=>({beat:i,notes:[-9+o],duration:1}))));$('hear-minor').addEventListener('click',()=>H.playSequence([0,3,7].map((o,i)=>({beat:i,notes:[-9+o],duration:1}))));
    $('edo-N').addEventListener('change',edo);$('ratio-set').addEventListener('change',edo);
    H.on('math-page',()=>{if($('edo-plot').getClientRects().length){const N=Number($('edo-N').value),rs=ratioData();drawEdo(N,rs,T.temperament(N,rs.map(x=>x.r)));}});
    H.on('view',view=>{if(view==='math')requestAnimationFrame(edo)});window.addEventListener('resize',()=>{if(H.view==='math')edo()});
    const animation=t=>{requestAnimationFrame(animation);drawWave(t)};requestAnimationFrame(animation);
  };
})();
