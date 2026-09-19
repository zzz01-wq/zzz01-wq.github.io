const test=require('node:test');
const assert=require('node:assert/strict');
const {World,fresh,BUILDINGS}=require('../js/core.js');
const advance=(w,t)=>{for(let i=0;i<t*10;i++)w.update(.1);};
test('automatic pickup changes inventory once; net cooldown prevents duplicate rewards',()=>{const w=new World();w.drops=[{type:'wood',x:0,z:.5,age:0,life:100,seed:0}];const old=w.s.resources.wood;w.update(.1);assert.equal(w.s.resources.wood,old+4);assert.equal(w.s.stats.collected,1);w.salvage();assert.equal(w.salvage(),false);advance(w,6);assert.equal(w.s.cooldown,0);});
test('expansion costs, connected land, limits, grass and upgrade limits',()=>{const w=new World();w.s.resources.wood=10000;w.s.resources.coin=10000;while(w.s.tiles.length<81)assert.ok(w.expand());assert.equal(w.level,5);assert.equal(w.expand(),false);const seen=new Set(['0,0']);let changed=true;while(changed){changed=false;for(const t of w.s.tiles)if(!seen.has(t.x+','+t.z)&&[[1,0],[-1,0],[0,1],[0,-1]].some(([x,z])=>seen.has((t.x+x)+','+(t.z+z)))){seen.add(t.x+','+t.z);changed=true;}}assert.equal(seen.size,81);assert.ok(w.plant());for(let i=0;i<5;i++)assert.ok(w.build('milk'));assert.equal(w.build('milk'),false);});
test('unaffordable or locked construction does not debit resources',()=>{const w=new World();const r=JSON.stringify(w.s.resources);assert.equal(w.build('milk'),false);assert.equal(w.build('barn'),false);assert.equal(JSON.stringify(w.s.resources),r);});
test('full herd leaves cow in the sea; expansion permits rescue and discovery',()=>{const w=new World();w.s.cows=[...w.s.cows,...w.s.cows,...w.s.cows];const d={type:'cow',cowType:2,x:0,z:0};w.drops=[d];assert.equal(w.collect(d),false);assert.equal(w.drops.length,1);w.s.resources.wood=100;for(let i=0;i<3;i++)w.expand();assert.equal(w.collect(d),true);assert.equal(w.s.cows.length,4);assert.ok(w.s.discovered.includes(2));});
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
