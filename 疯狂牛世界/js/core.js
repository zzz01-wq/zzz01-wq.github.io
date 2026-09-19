/* Pure simulation: no DOM, network, dependencies or wall-clock progression. */
(function (root) {
'use strict';
const COWS=[
 {name:'初生小牛',tag:'最初的伙伴',color:'#bd8b4b',scale:.72,level:1,desc:'腿有点细，梦有点大。',yield:'每轮 +2 青草'},
 {name:'踏浪黄牛',tag:'普通',color:'#b17a39',scale:1,level:1,desc:'漂了很远，终于有了家。',yield:'每轮 1 青草 → 2 牛奶'},
 {name:'云朵白牛',tag:'少见',color:'#e1ddbf',scale:.95,level:2,desc:'据说是从一朵云上掉下来的。',yield:'每轮 1 青草 → 3 牛奶'},
 {name:'蘑菇怪牛',tag:'奇异',color:'#897f6b',scale:.86,level:3,desc:'头上长蘑菇，也算一种天赋。',yield:'每轮 +2 饲料'},
 {name:'星夜蓝牛',tag:'稀有',color:'#7b929c',scale:1.05,level:4,desc:'白天发呆，夜里收藏星星。',yield:'每轮 +5 金币'},
 {name:'梦境巨型牛',tag:'传说',color:'#d1b370',scale:1.65,level:5,desc:'牛很大，脾气很小。整个海都听见它来了。',yield:'每轮 1 青草 → 10 牛奶'}
];
const BUILDINGS=[
 {id:'shed',name:'青草棚',icon:'grass',desc:'每轮生产 4 青草 / 级',wood:12,coin:8,unlock:1},
 {id:'barn',name:'暖暖牛棚',icon:'barn',desc:'每级增加 4 个牛群位置',wood:20,coin:15,unlock:1},
 {id:'milk',name:'挤奶机',icon:'milk',desc:'每轮 1 饲料 → 5 牛奶 / 级',wood:28,coin:25,unlock:2},
 {id:'tea',name:'海风奶茶摊',icon:'tea',desc:'每轮 2 牛奶 → 8 金币 / 级',wood:35,coin:30,unlock:2}
];
const QUESTS=[
 {name:'打捞 5 份漂流物',key:'collected',goal:5,reward:{wood:12,coin:10}},
 {name:'把木筏扩建到 12 块',key:'tiles',goal:12,reward:{grass:12,coin:15}},
 {name:'救下第一位牛伙伴',key:'rescued',goal:1,reward:{wood:18,coin:20}},
 {name:'建造一座青草棚',key:'shed',goal:1,reward:{wood:20,coin:20}},
 {name:'让牛群达到 4 头',key:'cows',goal:4,reward:{wood:25,coin:25}},
 {name:'建造一台挤奶机',key:'milk',goal:1,reward:{feed:15,coin:30}},
 {name:'开一家海风奶茶摊',key:'tea',goal:1,reward:{wood:35,coin:40}},
 {name:'把木筏扩建到 25 块',key:'tiles',goal:25,reward:{wood:35,coin:60}},
 {name:'发现 5 种不同的牛',key:'discovered',goal:5,reward:{wood:50,coin:80}},
 {name:'迎接梦境巨型牛',key:'giant',goal:1,reward:{wood:80,coin:120}}
];
const RESOURCE_NAMES={wood:'木材',grass:'青草',coin:'金币',milk:'牛奶',feed:'饲料'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function fresh(){let tiles=[];for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)tiles.push({x,z,grass:x===0||z===0});return {version:1,time:0,resources:{coin:20,wood:8,grass:12,milk:0,feed:3},tiles,cows:[{type:0,x:0,z:0,seed:1}],buildings:{},discovered:[0],player:{x:0,z:.5},stats:{collected:0,rescued:0},quest:0,contracts:0,contractBase:0,production:0,spawnClock:0,cowClock:0,eventClock:0,cooldown:0,muted:false,paused:false};}
class World {
 constructor(saved){this.s=fresh();this.drops=[];this.effects=[];this.notices=[];this.rng=Math.random;this.serial=0;this.spawnCount=0;
 if(saved&&saved.version===1){try{this.validate(saved);this.s=JSON.parse(JSON.stringify(saved));}catch{this.notices.push({text:'存档无法读取，已开始新的漂流。'});}}
 for(let i=0;i<14;i++)this.spawnDrop(i%5, true);this.spawnCow(1,true);
 }
 validate(s){const finite=(n)=>typeof n==='number'&&Number.isFinite(n);if(!s.resources||!s.player||!s.stats||!s.buildings||!Array.isArray(s.tiles)||s.tiles.length<9||s.tiles.length>81||!Array.isArray(s.cows)||s.cows.length<1||s.cows.length>100||!Array.isArray(s.discovered))throw Error('shape');for(const k of Object.keys(RESOURCE_NAMES))if(!finite(s.resources[k])||s.resources[k]<0||s.resources[k]>1e12)throw Error('resources');for(const k of ['time','quest','contracts','contractBase','production','spawnClock','cowClock','eventClock','cooldown'])if(!finite(s[k])||s[k]<0)throw Error('clock');if(!Number.isInteger(s.quest)||s.quest>QUESTS.length)throw Error('quest');if(!finite(s.stats.collected)||!finite(s.stats.rescued))throw Error('stats');if(!finite(s.player.x)||!finite(s.player.z))throw Error('player');for(const t of s.tiles)if(!Number.isInteger(t.x)||!Number.isInteger(t.z)||Math.abs(t.x)>4||Math.abs(t.z)>4)throw Error('tile');if(new Set(s.tiles.map(t=>t.x+','+t.z)).size!==s.tiles.length)throw Error('duplicate');for(const c of s.cows)if(!COWS[c.type]||!finite(c.x)||!finite(c.z)||!finite(c.seed))throw Error('cow');if(s.discovered.some(t=>!COWS[t]))throw Error('book');for(const [id,b]of Object.entries(s.buildings))if(!BUILDINGS.some(v=>v.id===id)||!Number.isInteger(b.level)||b.level<1||b.level>5||!finite(b.x)||!finite(b.z))throw Error('building');}
 get level(){return Math.min(5,1+Math.floor((this.s.tiles.length-9)/6));}
 get capacity(){return 3+Math.floor((this.s.tiles.length-9)/3)+(this.s.buildings.barn?.level||0)*4;}
 get radius(){return Math.max(...this.s.tiles.map(t=>Math.max(Math.abs(t.x),Math.abs(t.z))))+.5;}
 notice(text,kind='normal'){this.notices.push({text,kind});}
 amount(key){if(key==='tiles')return this.s.tiles.length;if(key==='cows')return this.s.cows.length;if(key==='discovered')return this.s.discovered.length;if(key==='giant')return this.s.discovered.includes(5)?1:0;if(key in this.s.buildings)return this.s.buildings[key].level;return this.s.stats[key]||0;}
 get task(){if(this.s.quest<QUESTS.length)return QUESTS[this.s.quest];return {name:'漂流委托 · 再打捞 20 份物资',key:'collected',goal:this.s.contractBase+20,reward:{coin:50,wood:30}};}
 get taskProgress(){const q=this.task;return Math.min(q.goal,this.amount(q.key));}
 claim(){const q=this.task;if(this.amount(q.key)<q.goal){this.notice('慢慢来，靠近漂流物就能自动收集。');return false;}this.add(q.reward);if(this.s.quest<QUESTS.length)this.s.quest++;else this.s.contracts++;if(this.s.quest===QUESTS.length)this.s.contractBase=this.s.stats.collected;this.notice('任务完成！'+this.costText(q.reward),'reward');return true;}
 add(r){for(const [k,v]of Object.entries(r))this.s.resources[k]+=v;}
 canPay(r){return Object.entries(r).every(([k,v])=>this.s.resources[k]>=v);}
 pay(r){if(!this.canPay(r)){this.notice('物资还不够，再去海边打捞一些吧。');return false;}for(const[k,v]of Object.entries(r))this.s.resources[k]-=v;return true;}
 costText(r){return Object.entries(r).map(([k,v])=>`${v} ${RESOURCE_NAMES[k]}`).join(' · ');}
 expandCost(){return {wood:5+Math.floor((this.s.tiles.length-9)/9)*2};}
 expand(){if(this.s.tiles.length>=81){this.notice('这片海上家园已经扩建到最大。');return false;}if(!this.pay(this.expandCost()))return false;let candidates=[];for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++)if(!this.s.tiles.some(t=>t.x===x&&t.z===z)&&this.s.tiles.some(t=>Math.abs(t.x-x)+Math.abs(t.z-z)===1))candidates.push({x,z,grass:false});candidates.sort((a,b)=>Math.max(Math.abs(a.x),Math.abs(a.z))-Math.max(Math.abs(b.x),Math.abs(b.z))||(a.x*a.x+a.z*a.z)-(b.x*b.x+b.z*b.z)||b.z-a.z);this.s.tiles.push(candidates[0]);this.notice('又多了一块可以做梦的地方。','build');return true;}
 plant(){let t=this.s.tiles.find(t=>!t.grass);if(!t){this.notice('每一块木筏都已经铺上青草了。');return false;}if(!this.pay({grass:4}))return false;t.grass=true;this.notice('青草长好了，产草速度提升。','build');return true;}
 buildingCost(id){const b=BUILDINGS.find(b=>b.id===id);const n=(this.s.buildings[id]?.level||0)+1;return {wood:b.wood*n,coin:b.coin*n};}
 build(id){const d=BUILDINGS.find(b=>b.id===id);if(!d)return false;if(this.level<d.unlock){this.notice(`扩建到 Lv.${d.unlock} 后解锁。`);return false;}let old=this.s.buildings[id];if(old?.level>=5)return false;let free=this.s.tiles.filter(t=>!Object.values(this.s.buildings).some(b=>b.x===t.x&&b.z===t.z)&&!(t.x===0&&t.z===0));free.sort((a,b)=>(a.x+a.z)-(b.x+b.z));if(!old&&!free.length){this.notice('先扩建一块木筏，给设施留个位置。');return false;}if(!this.pay(this.buildingCost(id)))return false;if(old)old.level++;else this.s.buildings[id]={level:1,x:free[0].x,z:free[0].z};this.notice(`${d.name} ${old?'升级':'建成'}了！`,'build');return true;}
 // Shared edges must meet exactly: only coastlines need a safety inset.
 // Cache geometry, rebuilding immediately after expansion or replacing a save.
 walkableBounds(){
  const tiles=this.s.tiles;
  if(this.walkTiles!==tiles||this.walkCount!==tiles.length){
   const occupied=new Set(tiles.map(t=>`${t.x},${t.z}`));
   const edge=(x,z)=>occupied.has(`${x},${z}`)?.5:.43;
   this.walkBounds=tiles.map(t=>({minX:t.x-edge(t.x-1,t.z),maxX:t.x+edge(t.x+1,t.z),minZ:t.z-edge(t.x,t.z-1),maxZ:t.z+edge(t.x,t.z+1)}));
   this.walkTiles=tiles;this.walkCount=tiles.length;
  }
  return this.walkBounds;
 }
 nearest(x,z){
  let best,dist=Infinity;
  for(const b of this.walkableBounds()){
   const p={x:clamp(x,b.minX,b.maxX),z:clamp(z,b.minZ,b.maxZ)};
   const d=(p.x-x)**2+(p.z-z)**2;
   if(d===0)return p;
   if(d<dist){best=p;dist=d;}
  }
  return best;
 }
 move(dx,dz,dt){const p=this.s.player;const n=this.nearest(p.x+dx*dt*2.4,p.z+dz*dt*2.4);p.x=n.x;p.z=n.z;}
 spawnDrop(type,initial=false){if(this.drops.length>38)return;const kinds=['wood','grass','feed','milk','chest'];const r=this.radius;let a=this.rng()*Math.PI*2;const x=Math.cos(a)*(r+1.3+this.rng()*2),z=Math.sin(a)*(r+1.3+this.rng()*2);this.drops.push({id:++this.serial,type:kinds[type??Math.floor(this.rng()*5)],x,z,age:0,seed:this.rng()*10,life:100});}
 spawnCow(type,initial=false){if(this.drops.filter(d=>d.type==='cow').length>=3)return;let eligible=COWS.map((c,i)=>i).filter(i=>COWS[i].level<=this.level);let unknown=eligible.filter(i=>!this.s.discovered.includes(i));type=type??(unknown.length&&this.spawnCount++%2===0?unknown[unknown.length-1]:eligible[Math.floor(this.rng()*eligible.length)]);let a=this.rng()*6.28,r=this.radius+1.4;this.drops.push({id:++this.serial,type:'cow',cowType:type,x:Math.cos(a)*r,z:Math.sin(a)*r,seed:this.rng()*10,age:0,life:150});if(type>=4&&!initial)this.notice(COWS[type].name,'rare');else if(!initial)this.notice('海上漂来一位新伙伴，靠近它救援！');}
 collect(drop){if(drop.type==='cow'){if(this.s.cows.length>=this.capacity){if(!drop.warned){this.notice('牛群住满啦，扩建木筏或建造牛棚再来接它。');drop.warned=true;}return false;}const pos=this.nearest(drop.x,drop.z);this.s.cows.push({type:drop.cowType,...pos,seed:this.rng()*100});if(!this.s.discovered.includes(drop.cowType))this.s.discovered.push(drop.cowType);this.s.stats.rescued++;this.notice(`${COWS[drop.cowType].name}加入了你的牛群！`,'rescue');}
 else {let gain=drop.type==='chest'?{coin:8,wood:3,feed:2}:{[drop.type]:drop.type==='wood'?4:drop.type==='grass'?4:2};if(this.bonus>0)for(const k in gain)gain[k]*=2;this.add(gain);this.s.stats.collected++;this.effects.push({x:drop.x,z:drop.z,text:'+'+this.costText(gain),life:1.6});}this.drops=this.drops.filter(d=>d!==drop);return true;}
 salvage(){if(this.s.cooldown>0)return false;this.s.cooldown=5;let n=0;for(const d of [...this.drops])if(Math.hypot(d.x-this.s.player.x,d.z-this.s.player.z)<4.6)if(this.collect(d))n++;if(!n)this.notice('靠近漂流物再撒网，会有更多收获。');this.effects.push({x:this.s.player.x,z:this.s.player.z,ring:true,life:.8});return true;}
 produce(){const s=this.s,r=s.resources;let grass=Math.max(1,Math.floor(s.tiles.filter(t=>t.grass).length/3));grass+=(s.buildings.shed?.level||0)*4;r.grass+=grass;for(const c of s.cows){if(c.type===0)r.grass+=2;else if(c.type===3)r.feed+=2;else if(c.type===4)r.coin+=5;else if(r.grass>=1){r.grass--;r.milk+=c.type===5?10:c.type===2?3:2;}}if(s.buildings.milk&&r.feed>=1){r.feed--;r.milk+=5*s.buildings.milk.level;}if(s.buildings.tea&&r.milk>=2){r.milk-=2;r.coin+=8*s.buildings.tea.level;}this.effects.push({x:0,z:0,text:'牛群在认真生活  + 收获',life:2});}
 update(dt){dt=Math.min(.1,Math.max(0,dt));const s=this.s;if(s.paused)return;s.time+=dt;s.cooldown=Math.max(0,s.cooldown-dt);s.spawnClock+=dt;s.cowClock+=dt;s.production+=dt;s.eventClock+=dt;this.bonus=Math.max(0,(this.bonus||0)-dt);if(s.spawnClock>2.3){s.spawnClock=0;this.spawnDrop();}if(s.cowClock>23){s.cowClock=0;this.spawnCow();}if(s.production>=10){s.production-=10;this.produce();}if(s.eventClock>=65){s.eventClock=0;const event=Math.floor(this.rng()*3);if(event===0){this.bonus=20;this.notice('丰收暖流 · 20 秒内打捞资源翻倍！','weather');}else if(event===1){this.add({grass:12,feed:4});this.notice('云雀送来礼物：12 青草、4 饲料。','weather');}else{for(let i=0;i<5;i++)this.spawnDrop(4);this.notice('梦境宝箱潮！海上漂来了许多宝箱。','weather');}}
 for(const d of [...this.drops]){d.age+=dt;const angle=Math.atan2(d.z,d.x)+dt*.032;let radius=Math.hypot(d.x,d.z);const target=this.radius+.9+Math.sin(d.seed)*.3;radius+=(target-radius)*dt*.07;d.x=Math.cos(angle)*radius;d.z=Math.sin(angle)*radius;if(Math.hypot(d.x-s.player.x,d.z-s.player.z)<1.85)this.collect(d);if(d.age>d.life)this.drops=this.drops.filter(o=>o!==d);}
 for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0);
 for(let i=1;i<s.cows.length;i++){const c=s.cows[i];const tx=Math.sin(s.time*.12+c.seed)*(this.radius-.6),tz=Math.cos(s.time*.13+c.seed*2)*(this.radius-.6);const n=this.nearest(c.x+(tx-c.x)*dt*.25,c.z+(tz-c.z)*dt*.25);c.x=n.x;c.z=n.z;}
 }
}
root.CowWorld={World,COWS,BUILDINGS,QUESTS,RESOURCE_NAMES,fresh};if(typeof module!=='undefined')module.exports=root.CowWorld;
})(typeof window!=='undefined'?window:globalThis);
