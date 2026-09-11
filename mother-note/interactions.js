'use strict';
// One semantic vocabulary for scene hints. Activation stays with game.js.
(()=>{
 const types={
  inspect:'M2 12s3-6 10-6 10 6 10 6-3 6-10 6S2 12 2 12Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  interact:'M8 13V5a2 2 0 0 1 4 0v7-3a2 2 0 0 1 4 0v3-1a2 2 0 0 1 4 0v5c0 4-3 6-6 6h-2c-2 0-3-1-4-3l-4-5a2 2 0 0 1 3-2l3 3',
  read:'M5 3h10l4 4v14H5V3Z M14 3v5h5 M8 12h8 M8 16h6',
  move:'M5 21V3h12v5 M3 21h9 M11 13h10 M17 9l4 4-4 4',
  open:'M4 21V4h14v17 M7 21V6l8-2v17 M11 13h1 M2 21h19',
  special:'M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12 M12 4v6 M12 14v1 M5 3l2 2 M18 19l2 2'
 };
 const root=document.querySelector('.game');
 const caption=document.createElement('div');caption.className='interaction-caption';caption.hidden=true;caption.setAttribute('aria-hidden','true');root.append(caption);
 let current=null,timer;
 const icon=type=>`<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${types[type]||types.inspect}"/></svg>`;
 function position(){if(!current)return;const r=current.getBoundingClientRect(),g=root.getBoundingClientRect();const width=caption.getBoundingClientRect().width;caption.style.left=Math.max(8,Math.min(g.width-width-8,r.left-g.left+r.width/2-width/2))+'px';caption.style.top=Math.max(8,r.top-g.top-34)+'px';}
 function hide(){clearTimeout(timer);current=null;caption.hidden=true;delete root.dataset.investigate;}
 function show(button,touch=false){clearTimeout(timer);current=button;root.dataset.investigate=button.dataset.act;caption.innerHTML=icon(button.dataset.interaction)+`<span>${button.getAttribute('aria-label')}</span>`;caption.hidden=false;position();if(touch)timer=setTimeout(hide,1200);}
 document.querySelectorAll('.hotspot[data-interaction]').forEach(button=>{
  button.innerHTML=icon(button.dataset.interaction);
  button.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')show(button);});
  button.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&current===button)hide();});
  button.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')show(button,true);});
  button.addEventListener('pointercancel',hide);
  button.addEventListener('focus',()=>show(button));
  button.addEventListener('blur',()=>{if(current===button)hide();});
  button.addEventListener('click',e=>{if(e.detail!==0)show(button,true);});
 });
 window.addEventListener('resize',hide);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();});
})();
