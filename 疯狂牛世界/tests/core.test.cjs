const test=require('node:test');
const assert=require('node:assert/strict');
const {World,fresh,BUILDINGS}=require('../js/core.js');
const advance=(w,t)=>{for(let i=0;i<t*10;i++)w.update(.1);};
test('automatic pickup changes inventory once; net cooldown prevents duplicate rewards',()=>{const w=new World();w.drops=[{type:'wood',x:0,z:.5,age:0,life:100,seed:0}];const old=w.s.resources.wood;w.update(.1);assert.equal(w.s.resources.wood,old+4);assert.equal(w.s.stats.collected,1);w.salvage();assert.equal(w.salvage(),false);advance(w,6);assert.equal(w.s.cooldown,0);});
test('expansion costs, connected land, limits, grass and upgrade limits',()=>{const w=new World();w.s.resources.wood=10000;w.s.resources.coin=10000;while(w.s.tiles.length<81)assert.ok(w.expand());assert.equal(w.level,5);assert.equal(w.expand(),false);const seen=new Set(['0,0']);let changed=true;while(changed){changed=false;for(const t of w.s.tiles)if(!seen.has(t.x+','+t.z)&&[[1,0],[-1,0],[0,1],[0,-1]].some(([x,z])=>seen.has((t.x+x)+','+(t.z+z)))){seen.add(t.x+','+t.z);changed=true;}}assert.equal(seen.size,81);assert.ok(w.plant());for(let i=0;i<5;i++)assert.ok(w.build('milk'));assert.equal(w.build('milk'),false);});
test('unaffordable or locked construction does not debit resources',()=>{const w=new World();const r=JSON.stringify(w.s.resources);assert.equal(w.build('milk'),false);assert.equal(w.build('barn'),false);assert.equal(JSON.stringify(w.s.resources),r);});
test('full deck rescues join reserve, keep producing and cannot be collected twice',()=>{
 const w=new World();w.s.cows=[...w.s.cows,...w.s.cows,...w.s.cows];
 const d={type:'cow',cowType:2,rank:3,x:0,z:0};w.drops=[d];
 assert.ok(w.collect(d));assert.equal(w.drops.length,0);assert.equal(w.s.cows.length,3);
 assert.equal(w.s.reserve[2],1);assert.equal(w.herdSize,4);assert.equal(w.s.breedRanks[2],3);
 assert.equal(w.collect(d),false);assert.equal(w.s.stats.rescued,1);
 const before=w.s.resources.milk;w.produce();assert.equal(w.s.resources.milk-before,9);
});
test('production consumes only available inputs and generates tea revenue',()=>{const w=new World();w.s.buildings={milk:{level:2,x:0,z:-1},tea:{level:2,x:-1,z:0}};w.s.resources={wood:0,grass:0,feed:1,milk:0,coin:0};w.produce();assert.equal(w.s.resources.feed,0);assert.equal(w.s.resources.milk,8);assert.equal(w.s.resources.coin,16);w.produce();assert.equal(w.s.resources.feed,0);assert.equal(w.s.resources.milk,6);assert.equal(w.s.resources.coin,32);});
test('pause, mute and progression survive serialization; malformed save is rejected',()=>{const w=new World();w.s.paused=true;w.s.muted=true;const snapshot=JSON.stringify(w.s);advance(w,10);assert.equal(JSON.stringify(w.s),snapshot);const restored=new World(JSON.parse(snapshot));assert.equal(restored.s.paused,true);assert.equal(restored.s.muted,true);const broken=fresh();broken.cows[0].type=999;const recovered=new World(broken);assert.equal(recovered.s.cows[0].type,0);assert.ok(recovered.notices.length);});
test('movement stays on raft under arbitrary input and delta',()=>{const w=new World();for(let i=0;i<100;i++){w.move(Math.sin(i)*3,Math.cos(i)*3,.1);const p=w.s.player;assert.ok(w.s.tiles.some(t=>Math.abs(t.x-p.x)<=.500001&&Math.abs(t.z-p.z)<=.500001));}});
test('full playable progression can reach giant, all tasks and repeatable contracts without injected resources',()=>{const w=new World();let seed=8241;w.rng=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);for(let second=0;second<2100;second++){
 // A player walks toward a nearby item and uses the same net action as the UI.
 const d=w.drops.find(d=>d.type!=='cow'||w.s.cows.length<w.capacity);if(d){const p=w.nearest(d.x,d.z);for(let i=0;i<10;i++){let dx=p.x-w.s.player.x,dz=p.z-w.s.player.z,len=Math.max(1,Math.hypot(dx,dz));w.move(dx/len,dz/len,.1);w.update(.1);}}else advance(w,1);if(w.s.cooldown===0)w.salvage();if(w.taskProgress>=w.task.goal)w.claim();
 const q=w.s.quest;
 if(q===1||q===7||w.s.cows.length>=w.capacity||q>=8&&w.level<5){if(w.canPay(w.expandCost()))w.expand();}
 if(q===3&&w.canPay(w.buildingCost('shed')))w.build('shed');
 if(q===5||q===6){if(w.level<2){if(w.canPay(w.expandCost()))w.expand();}else{const id=q===5?'milk':'tea';if(w.canPay(w.buildingCost(id)))w.build(id);}}
 if(w.s.quest===10&&w.s.contracts>=1)break;
 }assert.equal(w.s.quest,10,`stuck on task ${w.s.quest}, ${JSON.stringify(w.s.resources)}`);assert.ok(w.s.discovered.includes(5));assert.ok(w.s.contracts>=1);assert.ok(Object.values(w.s.resources).every(n=>n>=0));console.log('Full progression:',Math.round(w.s.time),'simulated seconds;',w.s.tiles.length,'tiles;',w.s.cows.length,'cows');});

test('movement crosses existing and newly expanded tile seams at 30/60/120 FPS, including slow joystick input',()=>{
 for(const fps of [30,60,120])for(const speed of [1,.2]){
  const w=new World();w.s.resources.wood=10000;
  function walk(from,to){
   w.s.player={x:from.x,z:from.z};
   for(let frame=0;frame<fps*12/speed;frame++){
    const p=w.s.player,dx=to.x-p.x,dz=to.z-p.z,length=Math.hypot(dx,dz);
    if(length<.025)return;
    w.move(dx/Math.max(1,length)*speed,dz/Math.max(1,length)*speed,1/fps);
   }
   assert.fail(`Blocked at ${JSON.stringify(w.s.player)} walking to ${JSON.stringify(to)} at ${fps} FPS, speed ${speed}`);
  }
  walk({x:0,z:0},{x:1,z:0});
  while(w.s.tiles.length<81){
   w.expand();
   const added=w.s.tiles.at(-1);
   const neighbor=w.s.tiles.find(t=>Math.abs(t.x-added.x)+Math.abs(t.z-added.z)===1);
   walk(neighbor,added);
   walk(added,neighbor);
  }
 }
});


test('coastline remains inset while interior seams are continuous after save restoration',()=>{
 const w=new World();
 assert.deepEqual(w.nearest(.49,0),{x:.49,z:0});
 assert.deepEqual(w.nearest(100,0),{x:1.43,z:0});
 assert.deepEqual(w.nearest(-100,0),{x:-1.43,z:0});
 assert.deepEqual(w.nearest(0,100),{x:0,z:1.43});
 assert.deepEqual(w.nearest(0,-100),{x:0,z:-1.43});
 w.s.resources.wood=100;w.expand();
 const added=w.s.tiles.at(-1),neighbor=w.s.tiles.find(t=>Math.abs(t.x-added.x)+Math.abs(t.z-added.z)===1);
 const restored=new World(JSON.parse(JSON.stringify(w.s)));
 restored.s.player={x:neighbor.x,z:neighbor.z};
 for(let i=0;i<120;i++)restored.move((added.x-neighbor.x)*.5,(added.z-neighbor.z)*.5,1/120);
 assert.ok(Math.hypot(restored.s.player.x-added.x,restored.s.player.z-added.z)<.25);
});


test('version 1 saves migrate without losing resources, cows, land, tasks or sound settings',()=>{
 const old=fresh();old.version=1;delete old.sea;delete old.raftTier;delete old.reserve;delete old.breedRanks;delete old.voyage;delete old.stats.builds;
 old.stats.collected=97;old.stats.rescued=6;old.quest=3;old.muted=true;old.resources.wood=456;
 const w=new World(old);assert.equal(w.s.version,2);assert.equal(w.s.resources.wood,456);assert.equal(w.s.quest,3);assert.equal(w.s.muted,true);assert.deepEqual(w.s.tiles,old.tiles);assert.deepEqual(w.s.cows,old.cows);assert.equal(w.s.voyage.collected,97);assert.equal(w.s.sea,1);
 const reload=new World(JSON.parse(JSON.stringify(w.s)));assert.deepEqual(reload.s,w.s);
});
test('raft ascension lifts facility cap and boosts yield without consuming land or cows',()=>{
 const w=new World();w.s.resources.wood=10000;w.s.resources.coin=10000;
 while(w.s.tiles.length<15)w.expand();for(let i=0;i<5;i++)w.build('milk');
 assert.equal(w.build('milk'),false);const tiles=JSON.stringify(w.s.tiles),cows=JSON.stringify(w.s.cows),cost=w.tierCost(),wood=w.s.resources.wood;
 assert.ok(w.upgradeRaft());assert.equal(w.s.resources.wood,wood-cost.wood);assert.equal(w.buildingCap,7);assert.ok(w.build('milk'));assert.equal(w.s.buildings.milk.level,6);assert.equal(JSON.stringify(w.s.tiles),tiles);assert.equal(JSON.stringify(w.s.cows),cows);assert.ok(w.productionInterval<10);assert.ok(w.netRange>4.6);
});
test('sailing requires fresh goals each sea, retains home and scales themed loot',()=>{
 const w=new World();assert.equal(w.sail(),false);w.s.resources.wood=10000;w.s.resources.coin=10000;
 while(w.s.tiles.length<25)w.expand();w.upgradeRaft();w.build('shed');w.s.stats.collected=24;w.s.stats.rescued=2;
 const before=JSON.stringify({tiles:w.s.tiles,cows:w.s.cows,buildings:w.s.buildings,resources:w.s.resources,quest:w.s.quest});assert.ok(w.sail());assert.equal(w.s.sea,2);assert.equal(w.sail(),false);assert.equal(JSON.stringify({tiles:w.s.tiles,cows:w.s.cows,buildings:w.s.buildings,resources:w.s.resources,quest:w.s.quest}),before);
 assert.equal(w.seaTheme.bonus,'wood');const wood=w.s.resources.wood;const d={type:'wood',x:0,z:0};w.drops.push(d);w.collect(d);assert.equal(w.s.resources.wood-wood,16);w.spawnCow(2,true);assert.equal(w.drops.at(-1).rank,2);
 const reload=new World(JSON.parse(JSON.stringify(w.s)));assert.deepEqual(reload.s,w.s);
});
test('large reserve is aggregated, resources remain finite and late-sea saves remain valid',()=>{
 const w=new World();w.s.sea=10000;w.s.raftTier=10001;w.s.reserve=[1000000,1000000,1000000,1000000,1000000,1000000];w.s.breedRanks.fill(10000);
 for(let i=0;i<20;i++)w.produce();assert.ok(Object.values(w.s.resources).every(n=>Number.isFinite(n)&&n>=0&&n<=1e12));assert.equal(w.s.cows.length,1);assert.equal(w.s.reserve.length,6);assert.ok(w.netRange<=6.6);assert.ok(w.productionInterval>=5);const reload=new World(JSON.parse(JSON.stringify(w.s)));assert.equal(reload.s.sea,10000);assert.equal(reload.herdSize,6000001);
});
test('autoplay can sail through twelve seas without injected currency or replacing home',()=>{
 const w=new World();let seed=7301;w.rng=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(let second=0;second<12000&&w.s.sea<13;second++){
  const d=w.drops[0];if(d){const p=w.nearest(d.x,d.z);for(let i=0;i<10;i++){const dx=p.x-w.s.player.x,dz=p.z-w.s.player.z,len=Math.max(1,Math.hypot(dx,dz));w.move(dx/len,dz/len,.1);w.update(.1);}}else advance(w,1);
  if(w.s.cooldown===0)w.salvage();if(w.taskProgress>=w.task.goal)w.claim();
  if(w.s.tiles.length<33&&w.canPay(w.expandCost()))w.expand();
  if(w.s.raftTier<=w.s.sea&&w.canPay(w.tierCost()))w.upgradeRaft();
  // Keep a useful production chain; one affordable construction per sea.
  let id=BUILDINGS.find(b=>!w.s.buildings[b.id]&&b.unlock<=w.level)?.id;
  if(!id&&w.s.stats.builds===w.s.voyage.builds)id='tea';
  if(id&&w.canPay(w.buildingCost(id)))w.build(id);
  if(w.canSail)w.sail();
  w.notices=[];
 }
 assert.equal(w.s.sea,13,`stuck on sea ${w.s.sea}, ${JSON.stringify(w.voyageGoals)}, ${JSON.stringify(w.s.resources)}`);
 assert.equal(w.s.tiles.length,33);assert.ok(w.herdSize>12);assert.ok(w.s.raftTier>=13);assert.ok(w.s.buildings.tea.level>5);assert.ok(Object.values(w.s.resources).every(n=>n>=0));console.log('Endless voyage:',Math.round(w.s.time),'simulated seconds, sea',w.s.sea,',',w.herdSize,'cows');
});

test('custom expansion validates location before charging and preserves chosen shape on reload',()=>{
 const w=new World();w.s.resources.wood=500;const before=w.s.resources.wood;
 for(const [x,z]of [[4,4],[0,0],[5,1],[2.5,0]])assert.equal(w.expand(x,z),false);
 assert.equal(w.s.resources.wood,before);
 assert.ok(w.expand(2,0));assert.ok(w.expand(3,0));assert.ok(w.expand(4,0));
 assert.ok(w.expand(4,1));assert.equal(w.tileAt(3,1),undefined);
 const reload=new World(JSON.parse(JSON.stringify(w.s)));assert.deepEqual(reload.s.tiles,w.s.tiles);
 assert.equal(reload.s.resources.wood,w.s.resources.wood);
});
test('removing a tile protects central keel, occupied deck and narrow bridges; refunds cannot mint wood',()=>{
 const w=new World();w.s.resources.wood=500;w.s.resources.coin=500;
 w.expand(2,0);w.expand(3,0);w.expand(4,0);
 const money=w.s.resources.wood;assert.equal(w.removeTile(2,0),false);assert.equal(w.s.resources.wood,money);
 assert.equal(w.removeTile(0,0),false);w.s.player={x:4,z:0};assert.equal(w.removeTile(4,0),false);
 w.s.player={x:0,z:0};assert.ok(w.build('shed',{x:4,z:0}));assert.equal(w.removeTile(4,0),false);
 w.expand(3,1);const cost=w.tileAt(3,1).cost,wood=w.s.resources.wood;assert.ok(w.removeTile(3,1));assert.equal(w.s.resources.wood,wood+Math.floor(cost/2));assert.equal(w.removeTile(3,1),false);
 const w2=new World();assert.equal(w2.removeTile(1,1),false);
});
test('grass and facilities use selected cells; illegal placement costs nothing',()=>{
 const w=new World();w.s.resources.wood=500;w.s.resources.coin=500;const grass=w.s.resources.grass;
 assert.ok(w.plant(1,1));assert.equal(w.s.resources.grass,grass-4);assert.equal(w.tileAt(1,1).grass,true);
 const before=JSON.stringify(w.s.resources);assert.equal(w.build('barn',{x:4,z:4}),false);assert.equal(w.build('barn',{x:0,z:0}),false);assert.equal(JSON.stringify(w.s.resources),before);
 assert.ok(w.build('barn',{x:1,z:1}));assert.deepEqual(w.s.buildings.barn,{level:1,x:1,z:1});assert.equal(w.build('shed',{x:1,z:1}),false);
});
test('tap-to-move path goes around missing cells and stays connected at 120 FPS',()=>{
 const w=new World();w.s.resources.wood=500;
 for(const [x,z]of [[2,0],[3,0],[4,0],[4,1],[4,2],[4,3],[3,3],[2,3]])assert.ok(w.expand(x,z));
 w.s.player={x:0,z:0};const path=w.pathTo(2,3);assert.ok(path.length>1);assert.equal(w.canWalkLine(w.s.player,{x:2,z:3}),false);
 let from=w.s.player;for(const to of path){assert.ok(w.canWalkLine(from,to));from=to;}
 for(let i=0;i<1500&&path.length;i++){w.followPath(path,1/120);assert.ok(w.s.tiles.some(t=>Math.abs(t.x-w.s.player.x)<=.50001&&Math.abs(t.z-w.s.player.z)<=.50001));}
 assert.equal(path.length,0);assert.ok(Math.hypot(w.s.player.x-2,w.s.player.z-3)<.001);
});
test('visible ship evolution follows tier milestones, plays upgrade progress and retains deck shape',()=>{
 const w=new World();w.s.resources.wood=100000;w.s.resources.coin=100000;w.expand(2,0);const shape=JSON.stringify(w.s.tiles);
 const names=['漂流木排','加固木筏','牧场帆船','牧场帆船','远航避难船','远航避难船','远航避难船','海上方舟'];
 for(let tier=1;tier<=8;tier++){assert.equal(w.shipStage.name,names[tier-1]);if(tier<8){assert.ok(w.upgradeRaft());assert.equal(w.upgradeFX.from,tier);assert.equal(w.upgradeFX.to,tier+1);}}
 assert.equal(JSON.stringify(w.s.tiles),shape);advance(w,4);assert.equal(w.upgradeFX,null);const reload=new World(JSON.parse(JSON.stringify(w.s)));assert.equal(reload.shipStage.name,'海上方舟');assert.equal(reload.upgradeFX,undefined);
});


test('a dense giant herd cannot block player travel and moves aside without leaving the raft',()=>{
 const w=new World();w.drops=[];w.s.player={x:0,z:0};
 for(let i=0;i<59;i++)w.s.cows.push({type:5,x:0,z:0,seed:i});
 const start=JSON.stringify(w.s.player);for(let i=1;i<w.s.cows.length;i++)w.yieldToPlayer(w.s.cows[i],.1);
 assert.equal(JSON.stringify(w.s.player),start);assert.ok(w.s.cows.slice(1).every(c=>Math.hypot(c.x,c.z)>0));
 for(let i=0;i<180;i++){w.move((1-w.s.player.x),0,1/60);w.update(1/60);}
 assert.ok(w.s.player.x>.98);assert.equal(w.s.cows.length,60);
 assert.ok(w.s.cows.every(c=>w.s.tiles.some(t=>Math.abs(c.x-t.x)<=.5001&&Math.abs(c.z-t.z)<=.5001)));
});


test('open-deck clicks take a direct line without stepping back to the cell centre',()=>{
 const w=new World();w.s.player={x:.39,z:.23};const path=w.pathTo(1.2,1.1);assert.equal(path.length,1);
 const start={...w.s.player};w.followPath(path,1/60);assert.ok(w.s.player.x>start.x&&w.s.player.z>start.z);assert.ok(Math.abs(Math.hypot(w.s.player.x-start.x,w.s.player.z-start.z)-2.4/60)<1e-9);
});
test('click movement maintains keyboard speed across waypoints and arrives exactly at all frame rates',()=>{
 for(const fps of [30,60,120]){
  const w=new World();w.s.player={x:0,z:0};const path=[{x:.1,z:0},{x:.2,z:0},{x:1,z:0}];
  let travelled=0,frames=0;while(path.length&&frames<fps){const x=w.s.player.x;w.followPath(path,1/fps);const d=w.s.player.x-x;if(path.length)assert.ok(Math.abs(d-2.4/fps)<1e-8);travelled+=d;frames++;}
  assert.equal(path.length,0);assert.equal(w.s.player.x,1);assert.ok(Math.abs(travelled-1)<1e-8);assert.ok(Math.abs(frames/fps-1/2.4)<=1/fps);
 }
});
test('player and wandering cows turn smoothly and keep facing after stopping',()=>{
 const w=new World();w.s.player={x:0,z:0};w.move(1,0,1/60);assert.ok(w.s.player.heading>0&&w.s.player.heading<Math.PI/2);
 for(let i=0;i<15;i++)w.move(1,0,1/60);assert.ok(Math.abs(w.s.player.heading-Math.PI/2)<1e-8);
 const before=w.s.player.heading;w.move(0,0,.1);assert.equal(w.s.player.heading,before);
 w.s.cows.push({type:1,x:0,z:-1,seed:1});w.update(.1);assert.ok(Number.isFinite(w.visibleWorkers[0].heading));
 const restored=new World(JSON.parse(JSON.stringify(w.s)));assert.equal(restored.s.player.heading,w.s.player.heading);
});

test('jobs aggregate a million workers into at most six representatives and survive old-save migration',()=>{
 const w=new World();w.s.reserve=[1,2,3,4,5,1000000];
 const ids=['salvager','farmer','feeder','milker','merchant','builder'];
 ids.forEach((id,type)=>assert.ok(w.assignJob(type,id)));
 assert.equal(w.visibleWorkers.length,6);assert.equal(new Set(w.visibleWorkers.map(c=>c.job)).size,6);
 assert.equal(w.workerTeams.reduce((n,t)=>n+t.count,0),w.herdSize-1);
 assert.ok(w.assignJob(5,'milker'));assert.equal(w.visibleWorkers.length,5);
 assert.equal(w.workerTeams.find(t=>t.id==='milker').count,1000004);
 const saved=JSON.parse(JSON.stringify(w.s)),restored=new World(saved);
 assert.deepEqual(restored.s.jobs,w.s.jobs);assert.equal(restored.herdSize,w.herdSize);
 delete saved.jobs;const migrated=new World(saved);assert.equal(migrated.herdSize,w.herdSize);assert.equal(migrated.s.resources.wood,w.s.resources.wood);assert.equal(migrated.s.jobs[5],'milker');
 const freshWorld=new World();assert.equal(freshWorld.assignJob(0,'builder'),false);assert.equal(w.assignJob(2,'invalid'),false);
});
test('changing profession replaces output instead of double-producing and discounts actual construction',()=>{
 const w=new World();w.drops=[];w.s.reserve[1]=10;
 const before={...w.s.resources};w.assignJob(1,'builder');w.produce();
 assert.equal(w.s.resources.wood-before.wood,10);assert.equal(w.s.resources.milk,before.milk);
 assert.equal(w.buildDiscount,.3);assert.equal(w.tierCost().wood,42);
 w.s.resources.wood=1000;const cost=w.expandCost().wood;assert.ok(w.expand(2,0));assert.equal(w.s.resources.wood,1000-cost);assert.equal(w.tileAt(2,0).cost,cost);
 for(const [job,key,amount]of [['farmer','grass',23],['feeder','feed',20],['merchant','coin',50],['milker','milk',20]]){
  w.assignJob(1,job);w.s.resources.grass=100;const old={...w.s.resources};w.produce();assert.equal(w.s.resources[key]-old[key],amount);assert.equal(w.s.resources.wood,old.wood);
 }
 assert.equal(w.buildDiscount,0);
});
test('salvagers collect real drifting resources and rescue cows once, capped at three each cycle',()=>{
 const w=new World();w.drops=[];w.s.reserve[0]=10;w.assignJob(0,'salvager');
 w.spawnDrop(0);w.spawnCow(1,true);w.spawnDrop(4);w.spawnDrop(0);
 const drops=[...w.drops],before=w.herdSize;w.produce();
 assert.equal(w.s.stats.collected,2);assert.equal(w.s.stats.rescued,1);assert.equal(w.herdSize,before+1);assert.equal(w.drops.length,1);
 assert.equal(w.collect(drops[0]),false);w.produce();assert.equal(w.s.stats.collected,3);assert.equal(w.drops.length,0);
 w.produce();assert.equal(w.s.stats.collected,3);
});
