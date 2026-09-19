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
const JOBS=[
 {id:'salvager',name:'打捞员',icon:'net',color:'#7c9baf',desc:'每轮自动打捞最多 3 份物资（含救牛）；人数提升数量。'},
 {id:'farmer',name:'种植员',icon:'grass',color:'#9bad69',desc:'每位成员每轮生产 2 青草。'},
 {id:'feeder',name:'饲料员',icon:'feed',color:'#c3aa71',desc:'每位成员每轮生产 2 饲料。'},
 {id:'milker',name:'挤奶员',icon:'milk',color:'#d4e1d7',desc:'每位成员每轮消耗 1 青草产奶，牛种和品阶影响奶量。'},
 {id:'merchant',name:'店员',icon:'tea',color:'#a98a9b',desc:'每位成员每轮经营收入 5 金币。'},
 {id:'builder',name:'建造员',icon:'build',color:'#d2ad58',desc:'每位成员每轮备料 1 木材；建造木材费用降低，最高 30%。'}
];
const DEFAULT_JOBS=['farmer','milker','milker','feeder','merchant','milker'];
const BUILDINGS=[
 {id:'shed',name:'青草棚',icon:'grass',desc:'每轮生产 4 青草 / 级',wood:12,coin:8,unlock:1},
 {id:'barn',name:'暖暖牛棚',icon:'barn',desc:'每级牛群基础产出 +5%',wood:20,coin:15,unlock:1},
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
const SHIPS=[{tier:1,name:'漂流木排',desc:'木板与绳索，托起第一块草地。'},{tier:2,name:'加固木筏',desc:'加厚浮筒、金属包边与安全护栏。'},{tier:3,name:'牧场帆船',desc:'完整船壳、尖船头与扬起的布帆。'},{tier:5,name:'远航避难船',desc:'船舷舷窗、驾驶舱与遮雨上层结构。'},{tier:8,name:'海上方舟',desc:'双层船楼、灯塔、太阳能顶棚与救生设备。'}];
const SEAS=[{name:'青草微风海',colors:['#a5cbc4','#83babc','#63a2ad'],bonus:'grass',desc:'青草随风漂来，青草打捞翻倍。'},{name:'落日沉船湾',colors:['#dbccb0','#b9bba9','#819eaa'],bonus:'wood',desc:'古老船骸的馈赠，木材打捞翻倍。'},{name:'星乳梦境海',colors:['#b9bfce','#94afc0','#768eae'],bonus:'milk',desc:'月色落进奶桶，牛奶打捞翻倍。'},{name:'金潮宝藏洋',colors:['#bad1b4','#88bcb1','#619ea1'],bonus:'coin',desc:'商船曾驶过这里，宝箱金币翻倍。'}];
const RESOURCE_NAMES={wood:'木材',grass:'青草',coin:'金币',milk:'牛奶',feed:'饲料'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function fresh(){let tiles=[];for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)tiles.push({x,z,grass:x===0||z===0});return {version:2,jobs:[...DEFAULT_JOBS],sea:1,raftTier:1,reserve:[0,0,0,0,0,0],breedRanks:[1,1,1,1,1,1],voyage:{collected:0,rescued:0,builds:0},time:0,resources:{coin:20,wood:8,grass:12,milk:0,feed:3},tiles,cows:[{type:0,x:0,z:0,seed:1}],buildings:{},discovered:[0],player:{x:0,z:.5},stats:{collected:0,rescued:0,builds:0},quest:0,contracts:0,contractBase:0,production:0,spawnClock:0,cowClock:0,eventClock:0,cooldown:0,muted:false,paused:false};}
class World {
 constructor(saved){this.s=fresh();this.drops=[];this.effects=[];this.notices=[];this.rng=Math.random;this.serial=0;this.spawnCount=0;
 if(saved&&(saved.version===1||saved.version===2)){try{const data=JSON.parse(JSON.stringify(saved));if(data.version===1){Object.assign(data,{version:2,sea:1,raftTier:1,reserve:[0,0,0,0,0,0],breedRanks:[1,1,1,1,1,1]});data.stats.builds=0;data.voyage={collected:data.stats.collected,rescued:data.stats.rescued,builds:0};}if(data.jobs===undefined)data.jobs=[...DEFAULT_JOBS];this.validate(data);this.s=data;}catch{this.notices.push({text:'存档无法读取，已开始新的漂流。'});}}
 for(let i=0;i<14;i++)this.spawnDrop(i%5, true);this.spawnCow(1,true);
 }
 validate(s){if(!Array.isArray(s.jobs)||s.jobs.length!==6||s.jobs.some(id=>!JOBS.some(j=>j.id===id)))throw Error('jobs');const finite=(n)=>typeof n==='number'&&Number.isFinite(n);if(!s.resources||!s.player||!s.stats||!s.buildings||!Array.isArray(s.tiles)||s.tiles.length<9||s.tiles.length>81||!Array.isArray(s.cows)||s.cows.length<1||s.cows.length>100||!Array.isArray(s.discovered))throw Error('shape');for(const k of Object.keys(RESOURCE_NAMES))if(!finite(s.resources[k])||s.resources[k]<0||s.resources[k]>1e12)throw Error('resources');for(const k of ['time','quest','contracts','contractBase','production','spawnClock','cowClock','eventClock','cooldown'])if(!finite(s[k])||s[k]<0)throw Error('clock');if(!Number.isInteger(s.quest)||s.quest>QUESTS.length)throw Error('quest');if(!finite(s.stats.collected)||!finite(s.stats.rescued))throw Error('stats');if(!finite(s.player.x)||!finite(s.player.z)||(s.player.heading!==undefined&&!finite(s.player.heading)))throw Error('player');for(const t of s.tiles)if(!Number.isInteger(t.x)||!Number.isInteger(t.z)||Math.abs(t.x)>4||Math.abs(t.z)>4)throw Error('tile');for(const t of s.tiles)if(t.cost!==undefined&&(!Number.isInteger(t.cost)||t.cost<0||t.cost>21))throw Error('tile cost');if(new Set(s.tiles.map(t=>t.x+','+t.z)).size!==s.tiles.length)throw Error('duplicate');for(const c of s.cows)if(!COWS[c.type]||!finite(c.x)||!finite(c.z)||!finite(c.seed)||(c.heading!==undefined&&!finite(c.heading)))throw Error('cow');if(s.discovered.some(t=>!COWS[t]))throw Error('book');for(const [id,b]of Object.entries(s.buildings))if(!BUILDINGS.some(v=>v.id===id)||!Number.isInteger(b.level)||b.level<1||b.level>5+2*(s.raftTier-1)||!finite(b.x)||!finite(b.z))throw Error('building');for(const key of ['sea','raftTier'])if(!Number.isSafeInteger(s[key])||s[key]<1)throw Error('voyage');for(const key of ['reserve','breedRanks'])if(!Array.isArray(s[key])||s[key].length!==6||s[key].some(n=>!Number.isSafeInteger(n)||n<(key==='reserve'?0:1)))throw Error('herd');for(const key of ['collected','rescued','builds'])if(!Number.isSafeInteger(s.voyage?.[key])||s.voyage[key]<0||!Number.isSafeInteger(s.stats[key])||s.stats[key]<s.voyage[key])throw Error('voyage stats');}
 get level(){return Math.min(5,1+Math.floor((this.s.tiles.length-9)/6));}
 get capacity(){return Math.min(60,3+Math.floor((this.s.tiles.length-9)/3)+(this.s.buildings.barn?.level||0)*4);}
 get herdSize(){return this.s.cows.length+this.s.reserve.reduce((a,b)=>a+b,0);}
 get workerCounts(){const n=[...this.s.reserve];for(let i=1;i<this.s.cows.length;i++)n[this.s.cows[i].type]++;return n;}
 get workerTeams(){
  const counts=this.workerCounts;
  return JOBS.map((job,index)=>{const types=counts.map((n,type)=>({type,n})).filter(a=>a.n>0&&this.s.jobs[a.type]===job.id);const count=types.reduce((sum,t)=>sum+t.n,0),power=types.reduce((sum,t)=>sum+t.n*this.s.breedRanks[t.type],0);const type=types.sort((a,b)=>this.s.breedRanks[b.type]-this.s.breedRanks[a.type]||b.type-a.type)[0]?.type||0;return {...job,index,types,count,power,type};});
 }
 assignJob(type,id){if(!Number.isInteger(type)||type<0||type>=6||!JOBS.some(j=>j.id===id)||this.workerCounts[type]<=0)return false;this.s.jobs[type]=id;this.notice(`${COWS[type].name}小队已调任${JOBS.find(j=>j.id===id).name}。`,'build');return true;}
 get buildDiscount(){const power=this.workerTeams.find(j=>j.id==='builder').power;return Math.min(.3,power*.03);}
 woodCost(n){return Math.max(1,Math.ceil(n*(1-this.buildDiscount)));}
 get visibleWorkers(){
  if(this.workerState!==this.s){this.workerState=this.s;this.workerActors={};}
  return this.workerTeams.filter(t=>t.count>0).map(t=>{
   const anchors=[{x:1,z:1},{x:-1,z:1},{x:-1,z:-1},{x:1,z:-1},{x:1,z:0},{x:0,z:1}];
   const facility={farmer:'shed',feeder:'barn',milker:'milk',merchant:'tea'}[t.id],base=this.s.buildings[facility]||anchors[t.index];
   const station=this.nearest(base.x+.25,base.z+.3);
   const actor=this.workerActors[t.id]||(this.workerActors[t.id]={...station,seed:51+t.index,heading:0});
   Object.assign(actor,{type:t.type,job:t.id,count:t.count,station});return actor;
  });
 }
 get seaTheme(){return SEAS[(this.s.sea-1)%SEAS.length];}
 get shipStage(){return [...SHIPS].reverse().find(stage=>stage.tier<=this.s.raftTier);}
 get nextShipStage(){return SHIPS.find(stage=>stage.tier>this.s.raftTier);}
 get buildingCap(){return 5+2*(this.s.raftTier-1);}
 get yieldBoost(){return 1+(this.s.raftTier-1)*.15;}
 get netRange(){return 4.6+Math.min(2,(this.s.raftTier-1)*.12);}
 get productionInterval(){return Math.max(5,10-(this.s.raftTier-1)*.2);}
 tierCost(){return {wood:this.woodCost(60*this.s.raftTier),coin:45*this.s.raftTier};}
 upgradeRaft(){if(!this.pay(this.tierCost()))return false;const from=this.s.raftTier;this.s.raftTier++;this.upgradeFX={from,to:this.s.raftTier,age:0};this.notice(`${this.shipStage.name} · ${this.s.raftTier} 阶！船体正在改造。`,'build');return true;}
 get voyageGoals(){const v=this.s.voyage;return [{name:'铺出 25 块木筏',value:this.s.tiles.length,goal:25},{name:`木筏升至 ${this.s.sea+1} 阶`,value:this.s.raftTier,goal:this.s.sea+1},{name:'本海域打捞物资',value:this.s.stats.collected-v.collected,goal:24+6*((this.s.sea-1)%4)},{name:'本海域救援牛伙伴',value:this.s.stats.rescued-v.rescued,goal:2},{name:'本海域建造或升级设施',value:this.s.stats.builds-v.builds,goal:1}];}
 get canSail(){return this.voyageGoals.every(g=>g.value>=g.goal);}
 sail(){if(!this.canSail){this.notice('完成本海域的航行准备，就能继续远航。');return false;}this.s.sea++;this.s.voyage={...this.s.stats};this.s.spawnClock=0;this.s.cowClock=0;this.s.eventClock=0;this.bonus=0;this.drops=[];this.effects=[];for(let i=0;i<14;i++)this.spawnDrop(i%5);this.spawnCow(undefined,true);this.notice(`驶入第 ${this.s.sea} 海域 · ${this.seaTheme.name}！家园与伙伴全部随行。`,'reward');return true;}
 get radius(){return Math.max(...this.s.tiles.map(t=>Math.max(Math.abs(t.x),Math.abs(t.z))))+.5;}
 notice(text,kind='normal'){this.notices.push({text,kind});}
 amount(key){if(key==='tiles')return this.s.tiles.length;if(key==='cows')return this.herdSize;if(key==='discovered')return this.s.discovered.length;if(key==='giant')return this.s.discovered.includes(5)?1:0;if(key in this.s.buildings)return this.s.buildings[key].level;return this.s.stats[key]||0;}
 get task(){if(this.s.quest<QUESTS.length)return QUESTS[this.s.quest];return {name:'漂流委托 · 再打捞 20 份物资',key:'collected',goal:this.s.contractBase+20,reward:{coin:50*this.s.sea,wood:30*this.s.sea}};}
 get taskProgress(){const q=this.task;return Math.min(q.goal,this.amount(q.key));}
 claim(){const q=this.task;if(this.amount(q.key)<q.goal){this.notice('慢慢来，靠近漂流物就能自动收集。');return false;}this.add(q.reward);if(this.s.quest<QUESTS.length)this.s.quest++;else this.s.contracts++;if(this.s.quest===QUESTS.length)this.s.contractBase=this.s.stats.collected;this.notice('任务完成！'+this.costText(q.reward),'reward');return true;}
 add(r){for(const [k,v]of Object.entries(r))this.s.resources[k]=Math.min(1e12,this.s.resources[k]+v);}
 canPay(r){return Object.entries(r).every(([k,v])=>this.s.resources[k]>=v);}
 pay(r){if(!this.canPay(r)){this.notice('物资还不够，再去海边打捞一些吧。');return false;}for(const[k,v]of Object.entries(r))this.s.resources[k]-=v;return true;}
 costText(r){return Object.entries(r).map(([k,v])=>`${v} ${RESOURCE_NAMES[k]}`).join(' · ');}
 expandCost(){return {wood:this.woodCost(5+Math.floor((this.s.tiles.length-9)/9)*2)};}
 tileAt(x,z){return this.s.tiles.find(t=>t.x===x&&t.z===z);}
 expansionSites(){const out=[];for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++)if(!this.tileAt(x,z)&&this.s.tiles.some(t=>Math.abs(t.x-x)+Math.abs(t.z-z)===1))out.push({x,z});return out;}
 expand(x,z){
  if(this.s.tiles.length>=81){this.notice('甲板已铺满，可以继续升阶、改造船形并远航。');return false;}
  let site;
  if(x!==undefined||z!==undefined){site=this.expansionSites().find(t=>t.x===x&&t.z===z);if(!site){this.notice('请选择与现有甲板共边相邻的空格。');return false;}}
  else {const candidates=this.expansionSites();candidates.sort((a,b)=>Math.max(Math.abs(a.x),Math.abs(a.z))-Math.max(Math.abs(b.x),Math.abs(b.z))||(a.x*a.x+a.z*a.z)-(b.x*b.x+b.z*b.z)||b.z-a.z);site=candidates[0];}
  const cost=this.expandCost();if(!site||!this.pay(cost))return false;
  this.s.tiles.push({...site,grass:false,cost:cost.wood});this.effects.push({...site,text:'甲板搭建完成',life:1.6});this.notice('新甲板已接好，可以走过去了。','build');return true;
 }
 plant(x,z){const t=x===undefined?this.s.tiles.find(t=>!t.grass):this.tileAt(x,z);if(!t||t.grass){this.notice('请选择尚未铺草的甲板。');return false;}if(!this.pay({grass:4}))return false;t.grass=true;this.notice('青草长好了，产草速度提升。','build');return true;}
 removalProblem(x,z){
  const t=this.tileAt(x,z);if(!t)return '只能拆除现有甲板。';
  if(this.s.tiles.length<=9)return '家园至少保留 9 块甲板。';
  if(x===0&&z===0)return '中央龙骨需要保留。';
  if(Object.values(this.s.buildings).some(b=>b.x===x&&b.z===z))return '这块甲板上有设施，暂时不能拆除。';
  if(Math.abs(this.s.player.x-x)<=.5&&Math.abs(this.s.player.z-z)<=.5)return '小牛正站在这里，先退出搭建模式走开。';
  const rest=this.s.tiles.filter(a=>a!==t),seen=new Set(),queue=[rest[0]];
  for(let i=0;i<queue.length;i++){const a=queue[i],key=`${a.x},${a.z}`;if(seen.has(key))continue;seen.add(key);for(const n of rest)if(Math.abs(a.x-n.x)+Math.abs(a.z-n.z)===1&&!seen.has(`${n.x},${n.z}`))queue.push(n);}
  return seen.size===rest.length?'':'拆除后会断开家园，请先搭好另一条通路。';
 }
 removeTile(x,z){const issue=this.removalProblem(x,z);if(issue){this.notice(issue);return false;}const t=this.tileAt(x,z);this.s.tiles=this.s.tiles.filter(a=>a!==t);this.add({wood:Math.floor((t.cost||0)/2)});for(const c of this.s.cows)Object.assign(c,this.nearest(c.x,c.z));this.notice('甲板已拆除，回收一半原建造木材。','build');return true;}
 // Clip a segment against the union of walkable rectangles, so shortcuts never cross water.
 canWalkLine(a,b){
  const intervals=[],dx=b.x-a.x,dz=b.z-a.z;
  for(const r of this.walkableBounds()){
   let lo=0,hi=1;
   for(const [origin,delta,min,max] of [[a.x,dx,r.minX,r.maxX],[a.z,dz,r.minZ,r.maxZ]]){
    if(Math.abs(delta)<1e-12){if(origin<min-1e-9||origin>max+1e-9){hi=-1;break;}}
    else {const t1=(min-origin)/delta,t2=(max-origin)/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));}
   }
   if(lo<=hi+1e-9)intervals.push([lo,hi]);
  }
  intervals.sort((x,y)=>x[0]-y[0]);let reach=0;
  for(const [lo,hi] of intervals){if(lo>reach+1e-8)return false;reach=Math.max(reach,hi);if(reach>=1-1e-8)return true;}
  return false;
 }
 faceMovement(actor,dx,dz,dt){
  if(Math.hypot(dx,dz)<1e-6)return;
  const old=actor.heading||0,wanted=Math.atan2(dx,dz),diff=Math.atan2(Math.sin(wanted-old),Math.cos(wanted-old));
  actor.heading=old+clamp(diff,-12*dt,12*dt);
 }
 followPath(path,dt){
  let budget=2.4*dt;const start={...this.s.player};
  while(path.length&&budget>1e-9){
   const p=this.s.player,goal=path[0],dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz);
   if(d<1e-8){path.shift();continue;}
   const distance=Math.min(d,budget),before={...p};this.move(dx/d,dz/d,distance/2.4);budget-=distance;
   if(Math.hypot(goal.x-p.x,goal.z-p.z)<1e-7)path.shift();
   if(Math.hypot(p.x-before.x,p.z-before.z)<1e-9)break;
  }
  return Math.hypot(this.s.player.x-start.x,this.s.player.z-start.z)>1e-6;
 }
 pathTo(x,z){
  const end=this.nearest(x,z),start=this.nearest(this.s.player.x,this.s.player.z);
  if(this.canWalkLine(start,end))return [end];
  const closest=p=>this.s.tiles.reduce((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)<=Math.hypot(b.x-p.x,b.z-p.z)?a:b);
  const a=closest(start),b=closest(end),key=t=>`${t.x},${t.z}`,queue=[a],parents=new Map([[key(a),null]]);
  for(let i=0;i<queue.length;i++){const t=queue[i];if(key(t)===key(b))break;for(const n of this.s.tiles)if(Math.abs(t.x-n.x)+Math.abs(t.z-n.z)===1&&!parents.has(key(n))){parents.set(key(n),t);queue.push(n);}}
  if(!parents.has(key(b)))return [];
  const path=[];let cur=b;while(key(cur)!==key(a)){path.unshift({x:cur.x,z:cur.z});cur=parents.get(key(cur));}
  if(path.length)path.unshift({x:a.x,z:a.z});path.push(end);
  const smooth=[];let anchor=start,index=0;
  while(index<path.length){let furthest=index;for(let j=path.length-1;j>=index;j--)if(this.canWalkLine(anchor,path[j])){furthest=j;break;}
   smooth.push(path[furthest]);anchor=path[furthest];index=furthest+1;
  }
  return smooth;
 }

 buildingCost(id){const b=BUILDINGS.find(b=>b.id===id);const n=(this.s.buildings[id]?.level||0)+1;return {wood:this.woodCost(b.wood*n),coin:b.coin*n};}
 build(id,position){const d=BUILDINGS.find(b=>b.id===id);if(!d)return false;if(this.level<d.unlock){this.notice(`扩建到 Lv.${d.unlock} 后解锁。`);return false;}let old=this.s.buildings[id];if(old?.level>=this.buildingCap){this.notice('先升阶木筏，解锁更高设施等级。');return false;}let free=this.s.tiles.filter(t=>!Object.values(this.s.buildings).some(b=>b.x===t.x&&b.z===t.z)&&!(t.x===0&&t.z===0));free.sort((a,b)=>(a.x+a.z)-(b.x+b.z));if(!old&&!free.length){this.notice('先扩建一块木筏，给设施留个位置。');return false;}if(!old&&position){const tile=free.find(t=>t.x===position.x&&t.z===position.z);if(!tile){this.notice('请选择空闲甲板，中央龙骨位置需要留出。');return false;}free=[tile];}if(!this.pay(this.buildingCost(id)))return false;if(old)old.level++;else this.s.buildings[id]={level:1,x:free[0].x,z:free[0].z};this.s.stats.builds++;this.notice(`${d.name} ${old?'升级':'建成'}了！`,'build');return true;}
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
 // Herd members yield visually; they never constrain the player's movement.
 yieldToPlayer(c,dt){
  const p=this.s.player;let dx=c.x-p.x,dz=c.z-p.z,d=Math.hypot(dx,dz);
  const space=.55+COWS[c.type].scale*.24;if(d>=space)return;
  if(d<.001){const a=c.seed*2.399;dx=Math.cos(a);dz=Math.sin(a);d=1;}
  const step=Math.min(space,dt*1.8),ux=dx/d,uz=dz/d;
  const candidates=[[ux,uz],[-uz,ux],[uz,-ux]].map(([x,z])=>this.nearest(c.x+x*step,c.z+z*step));
  const best=candidates.sort((a,b)=>Math.hypot(b.x-p.x,b.z-p.z)-Math.hypot(a.x-p.x,a.z-p.z))[0];
  if(Math.hypot(best.x-p.x,best.z-p.z)>Math.hypot(c.x-p.x,c.z-p.z)){c.x=best.x;c.z=best.z;}
 }
 move(dx,dz,dt){const p=this.s.player;const n=this.nearest(p.x+dx*dt*2.4,p.z+dz*dt*2.4);this.faceMovement(p,n.x-p.x,n.z-p.z,dt);p.x=n.x;p.z=n.z;}
 spawnDrop(type,initial=false){if(this.drops.length>38)return;const kinds=['wood','grass','feed','milk','chest'];const r=this.radius;let a=this.rng()*Math.PI*2;const x=Math.cos(a)*(r+1.3+this.rng()*2),z=Math.sin(a)*(r+1.3+this.rng()*2);this.drops.push({id:++this.serial,type:kinds[type??Math.floor(this.rng()*5)],x,z,age:0,seed:this.rng()*10,life:100});}
 spawnCow(type,initial=false){if(this.drops.filter(d=>d.type==='cow').length>=3)return;let eligible=COWS.map((c,i)=>i).filter(i=>COWS[i].level<=this.level);let unknown=eligible.filter(i=>!this.s.discovered.includes(i));type=type??(unknown.length&&this.spawnCount++%2===0?unknown[unknown.length-1]:eligible[Math.floor(this.rng()*eligible.length)]);let a=this.rng()*6.28,r=this.radius+1.4;this.drops.push({id:++this.serial,type:'cow',cowType:type,rank:this.s.sea,x:Math.cos(a)*r,z:Math.sin(a)*r,seed:this.rng()*10,age:0,life:150});if(type>=4&&!initial)this.notice(COWS[type].name,'rare');else if(!initial)this.notice('海上漂来一位新伙伴，靠近它救援！');}
 collect(drop){if(!this.drops.includes(drop))return false;
  if(drop.type==='cow'){
   const type=drop.cowType,rank=drop.rank||1;
   this.s.breedRanks[type]=Math.max(this.s.breedRanks[type],rank);
   if(this.s.cows.length>=this.capacity){this.s.reserve[type]++;this.notice(`${COWS[type].name}加入工作小队！人数与产出增长，甲板只显示工种代表。`,'rescue');}
   else {const pos=this.nearest(drop.x,drop.z);this.s.cows.push({type,...pos,seed:this.rng()*100});this.notice(`${COWS[type].name}加入了你的牛群！`,'rescue');}
   if(!this.s.discovered.includes(type))this.s.discovered.push(type);this.s.stats.rescued++;
  }else{
   const gain=drop.type==='chest'?{coin:8,wood:3,feed:2}:{[drop.type]:drop.type==='wood'?4:drop.type==='grass'?4:2};
   for(const k in gain)gain[k]*=this.s.sea*(this.bonus>0?2:1)*(this.seaTheme.bonus===k?2:1);
   this.add(gain);this.s.stats.collected++;this.effects.push({x:drop.x,z:drop.z,text:'+'+this.costText(gain),life:1.6});
  }
  this.drops=this.drops.filter(d=>d!==drop);return true;
 }
 salvage(){if(this.s.cooldown>0)return false;this.s.cooldown=5;let n=0;for(const d of [...this.drops])if(Math.hypot(d.x-this.s.player.x,d.z-this.s.player.z)<this.netRange)if(this.collect(d))n++;if(!n)this.notice('靠近漂流物再撒网，会有更多收获。');this.effects.push({x:this.s.player.x,z:this.s.player.z,ring:true,life:.8});return true;}
 produce(){
  const s=this.s,r=s.resources,boost=this.yieldBoost;
  r.grass+=Math.ceil((Math.max(1,Math.floor(s.tiles.filter(t=>t.grass).length/3))+(s.buildings.shed?.level||0)*4)*boost);
  // The playable calf stays captain; every other cow works in exactly one team.
  const counts=this.workerCounts,barn=1+(s.buildings.barn?.level||0)*.05;
  r.grass+=Math.ceil(2*boost*barn);
  for(let type=0;type<counts.length;type++){
   const n=counts[type],power=s.breedRanks[type]*boost*barn,job=s.jobs[type];if(!n)continue;
   if(job==='farmer')r.grass+=Math.ceil(2*n*power);
   if(job==='feeder')r.feed+=Math.ceil(2*n*power);
   if(job==='merchant')r.coin+=Math.ceil(5*n*power);
   if(job==='builder')r.wood+=Math.ceil(n*power);
   if(job==='milker'){const fed=Math.min(n,Math.floor(r.grass));r.grass-=fed;r.milk+=Math.ceil(fed*(type===5?10:type===2?3:2)*power);}
  }
  const salvage=this.workerTeams.find(t=>t.id==='salvager');
  if(salvage.count){let caught=0;for(const drop of [...this.drops].sort((a,b)=>a.age-b.age)){if(caught>=Math.min(3,salvage.count))break;if(this.collect(drop))caught++;}}
  if(s.buildings.milk&&r.feed>=1){r.feed--;r.milk+=Math.ceil(5*s.buildings.milk.level*boost);}
  if(s.buildings.tea&&r.milk>=2){r.milk-=2;r.coin+=Math.ceil(8*s.buildings.tea.level*boost);}
  for(const k of Object.keys(r))r[k]=Math.min(1e12,r[k]);
  this.effects.push({x:0,z:0,text:'牛群在认真生活  + 收获',life:2});
 }
 update(dt){dt=Math.min(.1,Math.max(0,dt));const s=this.s;if(s.paused)return;s.time+=dt;if(this.upgradeFX){this.upgradeFX.age+=dt;if(this.upgradeFX.age>=3)this.upgradeFX=null;}s.cooldown=Math.max(0,s.cooldown-dt);s.spawnClock+=dt;s.cowClock+=dt;s.production+=dt;s.eventClock+=dt;this.bonus=Math.max(0,(this.bonus||0)-dt);if(s.spawnClock>2.3){s.spawnClock=0;this.spawnDrop();}if(s.cowClock>23){s.cowClock=0;this.spawnCow();}if(s.production>=this.productionInterval){s.production-=this.productionInterval;this.produce();}if(s.eventClock>=65){s.eventClock=0;const event=Math.floor(this.rng()*3);if(event===0){this.bonus=20;this.notice('丰收暖流 · 20 秒内打捞资源翻倍！','weather');}else if(event===1){this.add({grass:12*s.sea,feed:4*s.sea});this.notice(`云雀送来礼物：${12*s.sea} 青草、${4*s.sea} 饲料。`,'weather');}else{for(let i=0;i<5;i++)this.spawnDrop(4);this.notice('梦境宝箱潮！海上漂来了许多宝箱。','weather');}}
 for(const d of [...this.drops]){d.age+=dt;const angle=Math.atan2(d.z,d.x)+dt*.032;let radius=Math.hypot(d.x,d.z);const target=this.radius+.9+Math.sin(d.seed)*.3;radius+=(target-radius)*dt*.07;d.x=Math.cos(angle)*radius;d.z=Math.sin(angle)*radius;if(Math.hypot(d.x-s.player.x,d.z-s.player.z)<1.85)this.collect(d);if(d.age>d.life)this.drops=this.drops.filter(o=>o!==d);}
 for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0);
 for(const c of this.visibleWorkers){const oldX=c.x,oldZ=c.z;
  const nearestDrop=c.job==='salvager'?this.drops.find(d=>d.type!=='cow'):null;
  const target=nearestDrop?this.nearest(nearestDrop.x,nearestDrop.z):c.station;
  const dx=target.x-c.x,dz=target.z-c.z;const n=this.nearest(c.x+dx*dt*.7,c.z+dz*dt*.7);c.x=n.x;c.z=n.z;this.yieldToPlayer(c,dt);this.faceMovement(c,c.x-oldX,c.z-oldZ,dt);
 }

 }
}
root.CowWorld={World,COWS,JOBS,BUILDINGS,QUESTS,SEAS,SHIPS,RESOURCE_NAMES,fresh};if(typeof module!=='undefined')module.exports=root.CowWorld;
})(typeof window!=='undefined'?window:globalThis);
