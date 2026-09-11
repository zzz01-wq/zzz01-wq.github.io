'use strict';
// Presentation-only adapter. Read rendered HUD values; never mutate game state.
(()=>{
 const root=document.querySelector('.game');
 const byId=id=>document.getElementById(id);
 function compact(id,value){const el=byId(id);if(!el)return;el.dataset.compact=value;el.setAttribute('aria-label',el.textContent);}
 function refresh(){
  const cat=byId('cat').textContent;
  compact('cat',/脱|掉|失控/.test(cat)?'异常':/蜷|安心/.test(cat)?'安心':/安静/.test(cat)?'安静':cat.slice(0,6));
  compact('care',byId('care').textContent.includes('尚未')?'未喂食':'已喂食');
  compact('focus',byId('focus').textContent.replace('注意力 ','专注 '));
  compact('time',byId('time').textContent.split('·').pop().trim());
  const sanity=parseInt(byId('sanity').textContent,10);
  root.dataset.visualState=sanity<15?'critical':sanity<35?'danger':root.classList.contains('eroded')?'strange':byId('scene').classList.contains('night')?'night':'normal';
 }
 const observer=new MutationObserver(refresh);
 for(const id of ['cat','care','focus','time','sanity'])observer.observe(byId(id),{childList:true,subtree:true,characterData:true});
 refresh();
})();
