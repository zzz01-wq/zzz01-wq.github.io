'use strict';
// Presentation-only event catalogue. IDs mirror existing events, never stored in saves.
(()=>{
 const beats=['notes','day-door','clock','cat-bowl','night-door','living','wardrobe','cat-bedroom','cat-bowl','day-door','window','radio','radio','notes','mirror','cat-bowl','night-door','bed','clock','bed','window','white-light','wardrobe','notes','bed','night-door','radio','clock','night-door','clock'];
 const ambient={
  'living-damp':'living','kitchen-cup':'kitchen','bedroom-pillow':'bed','door-lamp':'night-door','mirror-lamp':'mirror','window-fog':'window','cat-extra-fur':'cat-bowl','wardrobe-scratch':'wardrobe',
  'living-cushion':'living','kitchen-date':'kitchen','bedroom-prints':'bed','door-number':'day-door','mirror-light':'mirror','window-shadow':'window','cat-second-shadow':'cat-bowl','wardrobe-blue-thread':'wardrobe',
  'living-shift':'living','kitchen-hand':'kitchen','bedroom-slept':'bed','door-eye-close':'day-door','mirror-extra':'mirror','window-fingerprint':'window','cat-silent-mouth':'cat-bedroom','wardrobe-thread':'wardrobe'
 };
 const catalog={beat:Object.fromEntries(beats.map((key,i)=>[i+1,key])),ambient,event:{2:'day-door',5:'night-door',8:'cat-bedroom',12:'radio',17:'neighbor',22:'white-light',27:'mother'},special:{escape:'escape',arrival:'day-door'},ending:{wait:'home',escape:'stairs',lost:'clock',catfall:'cat-bedroom',falsemother:'mother'}};
 const resolve=entry=>entry&&catalog[entry.group]?.[entry.id];
 const path=key=>'assets/events/'+key+'.jpg';
 const root=document.querySelector('.game'),scene=document.querySelector('#scene');
 const figure=document.createElement('figure');figure.className='event-illustration';figure.hidden=true;
 const img=document.createElement('img');img.className='event-image';img.alt='';img.decoding='async';
 const caption=document.createElement('figcaption');caption.className='event-art-caption';
 const label=document.createElement('span');label.className='event-art-title';
 const close=document.createElement('button');close.className='event-art-close';close.textContent='返回房间';close.setAttribute('aria-label','收起事件插画，返回房间画面');
 caption.append(label,close);figure.append(img,caption);scene.append(figure);
 let current=null;
 function clear(){current=null;figure.hidden=true;root.classList.remove('event-art-active');}
 function show(entry){const key=resolve(entry);if(!key){clear();return;}const same=current===key;current=key;figure.hidden=false;root.classList.add('event-art-active');label.textContent=entry.title||'此刻';img.alt=entry.title?entry.title+' · 事件主题插画':'事件主题插画';if(!same){img.src=path(key);}}
 // A missing image cannot cover or disable the room or the decision buttons.
 img.addEventListener('error',clear);close.onclick=clear;
 function html(entry){const key=resolve(entry);return key?`<figure class="ending-illustration"><img src="${path(key)}" alt="结局主题插画" width="1536" height="1024" decoding="async"></figure>`:'';}
 window.EventArt={show,clear,html,resolve,catalog};
})();
