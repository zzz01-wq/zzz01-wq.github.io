const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const nodes={},events={},storage={};const draw=new Proxy({}, {get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
const node=()=>({style:{},classList:{add(){},remove(){}},appendChild(){},querySelectorAll(){return []},getContext(){return draw},textContent:'',innerHTML:''});
const context={console,assert,performance,innerWidth:1280,innerHeight:800,devicePixelRatio:1,navigator:{maxTouchPoints:2},requestAnimationFrame(){},atob,Uint8Array,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v},document:{getElementById:id=>nodes[id]??=node(),createElement:()=>node(),addEventListener(){}},window:{addEventListener(){}}};
vm.createContext(context);vm.runInContext(scripts[0],context);
context.THREE.WebGLRenderer=class{constructor(){this.shadowMap={};this.domElement={addEventListener(k,f){events[k]=f},setPointerCapture(){}}}setPixelRatio(){}setSize(){}setClearColor(){}render(){}};
vm.runInContext(scripts[1],context);
vm.runInContext(`
muted=true;
assert.equal(chests.length,32);assert.equal(obstacles.length,16);assert.equal(exits.length,3);
for(let zone=0;zone<4;zone++){chosenDistrict=zone;reset();assert.equal(phase,'drop');assert.equal(player.x,districts[zone].x);assert(!blocked(player.x,player.z));assert.equal(player.items.length,3);assert(actors.slice(1).every(a=>!blocked(a.x,a.z)));updateDrop(2.4);assert.equal(phase,'play');assert.equal(parachute,null)}
// Walls, rectangular edges, and valid loot locations.
const wall=obstacles[0];player.x=wall.x-wall.w-1;player.z=wall.z;const oldX=player.x;moveActor(player,1,0);assert.equal(player.x,oldX);assert(blocked(73,0));assert(!blocked(65,45));assert(loot.every(l=>!blocked(l.x,l.z,.3)));
// Chests reveal one slot per search interval, keep contents across reopening, and pay nothing until taken.
const c=chests[0];player.x=c.x;player.z=c.z;updateExtraction(0);assert.equal(nearestChest,c);assert(c.contents.length>=CHEST_SLOT_RANGES[c.tier-1][0]&&c.contents.length<=CHEST_SLOT_RANGES[c.tier-1][1]);
const originalIds=c.contents.map(slot=>slot.item.id).join(',');assert(openInventory(c));assert.equal(openedCount,1);selectInventory('chest',0);assert(!inventoryAction('take'));assert(!inventoryAction('equip'));const cashBefore=bagValue();updateInventory(searchDuration(c.contents[0]));assert.equal(c.contents.filter(slot=>slot.revealed).length,1);assert.equal(bagValue(),cashBefore);closeInventory();assert(openInventory(c));assert.equal(c.contents.map(slot=>slot.item.id).join(','),originalIds);assert.equal(openedCount,1);
selectInventory('chest',0);const chestValue=itemValue(c.contents[0].item);assert(inventoryAction('take'));assert.equal(bagValue(),cashBefore+chestValue);assert(c.contents[0].taken);assert(!inventoryAction('take'));closeInventory();
// Each XP threshold gives a paused three-choice upgrade.
xp=10;for(const a of actors.slice(1)){a.alive=false;scene.remove(a.body)}update(0);assert.equal(phase,'skill');assert.equal(offeredSkills.length,3);const oldLevel=level;chooseSkill(0);assert.equal(phase,'play');assert.equal(level,oldLevel);
// Extraction locks for first 45s, resets on movement or leaving, settles only once.
player.x=exits[0].x;player.z=exits[0].z;elapsed=20;updateExtraction(7);assert.equal(extractProgress,0);assert.equal(phase,'play');elapsed=46;updateExtraction(3);assert.equal(extractProgress,3);keys.KeyD=true;updateExtraction(.1);assert.equal(extractProgress,0);keys.KeyD=false;updateExtraction(3);player.x+=4;updateExtraction(.1);assert.equal(extractProgress,0);player.x=exits[0].x;const expected=carriedValue();updateExtraction(6);assert.equal(phase,'end');assert.equal(profile.coins,expected);finish(true);assert.equal(profile.coins,expected);
// Upgrades spend currency once, persist, and apply on next drop.
briefing();profile.coins=500;buyTraining('health');assert.equal(profile.health,1);assert.equal(profile.coins,380);assert.equal(JSON.parse(localStorage.getItem('fdd-extraction-v1')).health,1);reset();assert.equal(player.hp,4);updateDrop(2.4);cargo=200;const bank=profile.coins;finish(false);assert.equal(profile.coins,bank);
reset();updateDrop(2.4);elapsed=RUN_SECONDS-.01;update(.02);assert.equal(phase,'end');assert.equal(profile.coins,bank);
// Skill, chest and extraction state must never leak into the next run.
reset();assert.equal(cargo,0);assert.equal(openedCount,0);assert.equal(extractProgress,0);assert(chests.every(c=>!c.opened&&c.progress===0));assert.equal(runUpgrades.speed,0);updateDrop(2.4);
for(let i=0;i<2400&&phase==='play';i++){keys.KeyD=i%600<300;keys.KeyW=i%600>=300;update(1/60);if(phase==='skill')chooseSkill(0)}assert(Number.isFinite(player.x));assert(!blocked(player.x,player.z));


// Five rarities, arbitrary crate quantities, and both item categories.
const seenLevels=new Set(),seenCounts=new Set(),seenKinds=new Set();for(let i=0;i<400;i++){const slots=generateChest(3,1+i%5);seenCounts.add(slots.length);for(const slot of slots){seenLevels.add(slot.item.lv);seenKinds.add(slot.item.kind);assert(slot.item.lv>=1&&slot.item.lv<=5)}}assert.equal(seenLevels.size,5);assert.equal(seenKinds.size,2);assert(seenCounts.size>3);
assert.equal(RARITIES.map(r=>r.name).join(','),'普通,稀有,史诗,传说,罕见');assert.equal(RARITIES.map(r=>r.hex).join(','),'16777215,4692223,11758335,16752939,16731221');
clearRun();player=createActor(0,0,0,'test',0);player.maxHp=3;phase='play';elapsed=10;
assert(addItem(player,0,4));assert(addItem(player,0,4));assert.equal(player.items[0].lv,5);assert(addItem(player,0,5));assert.equal(player.items.length,2);assert(player.items.every(f=>f.lv<=5));
// Full equipment cannot silently upgrade an unrelated item or eat an incoming food.
while(player.items.length<12)addItem(player,1,5,false);const equipmentBefore=player.items.map(f=>f.lv).join(',');assert(!addItem(player,2,1));assert.equal(player.items.map(f=>f.lv).join(','),equipmentBefore);
const chest=chests[0];player.x=chest.x;player.z=chest.z;chest.contents=[{item:weaponItem(2,3),revealed:true,taken:false,progress:0},{item:valuableItem(5),revealed:true,taken:false,progress:0}];
for(let i=0;i<BAG_CAPACITY;i++)assert(bagPut(valuableItem(1)));assert(!bagPut(valuableItem(1)));openInventory(chest);selectInventory('chest',0);assert(!inventoryAction('take'));assert(!chest.contents[0].taken);assert(!inventoryAction('equip'));assert(!chest.contents[0].taken);
selectInventory('chest',1);assert(!inventoryAction('equip'));assert(!chest.contents[1].taken);
selectInventory('bag',0);const bagItem=backpack[0];assert(inventoryAction('discard'));assert.equal(backpack.length,15);assert(loot.some(l=>l.item.id===bagItem.id&&l.noPickupUntil===elapsed+2));
selectInventory('chest',1);assert(inventoryAction('take'));assert.equal(backpack.length,16);assert(chest.contents[1].taken);selectInventory('equipped',0);assert(!inventoryAction('unequip'));assert.equal(player.items.length,12);
selectInventory('bag',0);assert(inventoryAction('discard'));selectInventory('equipped',0);assert(inventoryAction('unequip'));assert.equal(player.items.length,11);selectInventory('chest',0);assert(inventoryAction('equip'));assert.equal(player.items.length,12);assert(chest.contents[0].taken);closeInventory();
// Search cancels when out of range; unfinished slots reset, revealed slots remain.
chest.contents=[{item:valuableItem(2),revealed:true,taken:false,progress:1},{item:weaponItem(1,3),revealed:false,taken:false,progress:0}];openInventory(chest);updateInventory(.2);assert(chest.contents[1].progress>0);player.x+=5;updateInventory(.1);assert(!inventoryOpen);assert.equal(chest.contents[1].progress,0);assert(chest.contents[0].revealed);
console.log('PASS: five rarity colors and cap, variable mixed chests, sequential reveal, capacity, item transfer, no hidden-item collection, equipment full rejection, valuables, drop and interrupted search');

// Desktop double-click and mobile two-tap shortcuts survive grid rerenders.
clearRun();player=createActor(0,chests[0].x,chests[0].z,'shortcut',0);player.maxHp=3;phase='play';
const shortcutChest=chests[0];shortcutChest.contents=[{item:weaponItem(0,2),revealed:true,taken:false,progress:0},{item:valuableItem(3),revealed:true,taken:false,progress:0}];openInventory(shortcutChest);
assert(!inventoryCellClick('chest',0,{detail:1},100));assert.equal(player.items.length,0);assert(inventoryCellClick('chest',0,{detail:2},250));assert.equal(player.items[0].lv,2);assert(shortcutChest.contents[0].taken);
// Mobile click events may both have detail=1.
assert(!inventoryCellClick('chest',1,{detail:1},500));assert(inventoryCellClick('chest',1,{detail:1},650));assert.equal(backpack.length,1);assert.equal(backpack[0].kind,'valuable');
assert(!inventoryCellClick('equipped',0,{detail:1},800));assert(inventoryCellClick('equipped',0,{detail:1},950));assert.equal(player.items.length,0);assert.equal(backpack.length,2);
assert(!inventoryCellClick('bag',1,{detail:1},1100));assert(inventoryCellClick('bag',1,{detail:1},1250));assert.equal(player.items.length,1);assert.equal(backpack.length,1);
// Valuable items already in the bag are never dropped by this shortcut.
const groundCount=loot.length;inventoryCellClick('bag',0,{detail:1},1400);assert(!inventoryCellClick('bag',0,{detail:1},1550));assert.equal(backpack.length,1);assert.equal(loot.length,groundCount);
// Slow clicks, keyboard clicks and taps on distinct items do not trigger shortcuts.
bagPut(weaponItem(1,1));inventoryCellClick('bag',1,{detail:1},1800);assert(!inventoryCellClick('bag',1,{detail:1},2300));assert.equal(backpack.length,2);
assert(!inventoryCellClick('bag',1,{detail:0},2400));assert(!inventoryCellClick('bag',1,{detail:0},2450));assert.equal(backpack.length,2);
inventoryCellClick('bag',0,{detail:1},2600);assert(!inventoryCellClick('bag',1,{detail:1},2700));assert.equal(backpack.length,2);
// Full bag rejects quick unequip without removing the equipped weapon.
while(backpack.length<BAG_CAPACITY)bagPut(valuableItem(1));inventoryCellClick('equipped',0,{detail:1},3000);assert(!inventoryCellClick('equipped',0,{detail:1},3150));assert.equal(player.items.length,1);assert.equal(backpack.length,BAG_CAPACITY);
closeInventory();assert.equal(lastInventoryTap,null);
console.log('PASS: double-click weapon equip, two-tap valuables transfer, unequip, bag equip, no accidental discard, timing and capacity guards');

// Ground food equips/merges first, preserving fallback capacity and dropped-item cooldown.
clearRun();player=createActor(0,0,0,'ground',0);player.maxHp=3;phase='play';elapsed=20;xp=0;level=1;spawnTimer=0;for(const k in keys)keys[k]=false;
drop(0,0,0,1);update(0);assert.equal(player.items.length,1);assert.equal(backpack.length,0);assert.equal(loot.length,0);
drop(0,0,0,1);update(0);assert.equal(player.items[0].lv,2);assert.equal(player.items.length,1);assert.equal(backpack.length,0);
while(player.items.length<12)addItem(player,1,5,false);
drop(0,0,0,2);update(0);assert.equal(player.items[0].lv,3);assert.equal(backpack.length,0);
drop(0,0,2,1);update(0);assert.equal(backpack.length,1);assert.equal(backpack[0].type,2);assert.equal(loot.length,0);
while(backpack.length<BAG_CAPACITY)bagPut(valuableItem(1));drop(0,0,3,1);const xpBeforeFull=xp;update(0);assert.equal(loot.length,1);assert.equal(xp,xpBeforeFull);
// Dropped valuables never become weapons, and manual drops are not immediately recaptured.
clearRun();player=createActor(0,0,0,'ground2',0);player.maxHp=3;phase='play';xp=0;level=1;elapsed=20;
dropInventoryItem(0,0,valuableItem(4));update(0);assert.equal(backpack[0].kind,'valuable');assert.equal(player.items.length,0);
dropInventoryItem(0,0,weaponItem(2,1),2);update(0);assert.equal(loot.length,1);assert.equal(player.items.length,0);elapsed+=2;update(0);assert.equal(loot.length,0);assert.equal(player.items.length,1);
console.log('PASS: ground auto-equip, auto-merge with full equipment, bag fallback, full-capacity retention, valuable routing and manual-drop cooldown');

// Chest silhouettes/tiers are present on the map and high-tier contents are meaningful.
assert.equal(new Set(chests.map(c=>c.tier)).size,5);
for(let tier=1;tier<=5;tier++){
 const model=createChestModel(tier);assert.equal(model.model.name,RARITIES[tier-1].name+'补给箱');assert(model.model.children.length>=5);
 for(let i=0;i<30;i++){const slots=generateChest(3,tier);assert(slots.some(slot=>slot.item.lv===tier));assert(slots.every(slot=>slot.item.lv>=1&&slot.item.lv<=5))}
}

// Every container tier has an independent capacity range, with no inversions.
assert.equal(JSON.stringify(CHEST_SLOT_RANGES),'[[2,3],[4,5],[6,7],[8,10],[11,14]]');
const originalRandom=Math.random;
try{for(let tier=1;tier<=5;tier++){
 const [min,max]=CHEST_SLOT_RANGES[tier-1];
 Math.random=()=>0;assert.equal(generateChest(3,tier).length,min);
 Math.random=()=>.999999;assert.equal(generateChest(3,tier).length,max);
 Math.random=originalRandom;
 for(let i=0;i<80;i++){const slots=generateChest(3,tier);assert(slots.length>=min&&slots.length<=max)}
 if(tier<5)assert(max<CHEST_SLOT_RANGES[tier][0]);
}}finally{Math.random=originalRandom}
console.log('PASS: all five capacity ranges, minimum/maximum boundaries and strict cross-tier ordering');
assert.equal(SEARCH_SECONDS.join(','),'0.65,1.6,3.5,6,10');assert(searchDuration({item:{lv:5}})>searchDuration({item:{lv:1}})*10);
// XP and multiple pending skill choices cannot interrupt a live chest search.
clearRun();player=createActor(0,chests[0].x,chests[0].z,'queued skills',0);player.maxHp=3;phase='play';elapsed=20;xp=9;level=1;spawnTimer=0;
const queueChest=chests[0];queueChest.contents=[{item:valuableItem(1),revealed:false,taken:false,progress:0},{item:valuableItem(5),revealed:false,taken:false,progress:0}];
openInventory(queueChest);update(.65);assert.equal(level,2);assert.equal(phase,'play');assert(inventoryOpen);assert.equal(activeChest,queueChest);assert.equal(pendingSkillLevels.length,1);assert(queueChest.contents[0].revealed);
update(1);assert.equal(queueChest.contents[1].progress,1);assert(!queueChest.contents[1].revealed);assert(inventoryOpen);assert.equal(offeredSkills.length,0);
xp=25;update(0);assert.equal(level,3);assert.equal(pendingSkillLevels.length,2);assert.equal(queueChest.contents[1].progress,1);assert(!offerSkills());assert(inventoryOpen);
closeInventory();update(0);assert.equal(phase,'skill');assert.equal(currentSkillLevel,2);assert.equal(pendingSkillLevels.length,1);chooseSkill(0);assert.equal(phase,'skill');assert.equal(currentSkillLevel,3);assert.equal(pendingSkillLevels.length,0);chooseSkill(0);assert.equal(phase,'play');
// Long searches reveal only upon their own duration, without an early high-grade reveal.
openInventory(queueChest);updateInventory(9.9);assert(!queueChest.contents[1].revealed);updateInventory(.11);assert(queueChest.contents[1].revealed);closeInventory();
console.log('PASS: five chest designs, chest-grade loot, distinct search times, uninterrupted searching with queued multiple upgrades, and ordered skill selection after closing');

// Old saves gain new default fields without losing their coins or previous upgrades.
const retainedProfile={...profile};const migrated=normalizeProfile({coins:798,health:2,kit:1,speed:3});assert.equal(migrated.coins,798);assert.equal(migrated.health,2);assert.equal(migrated.kit,1);assert.equal(migrated.speed,3);assert.equal(migrated.bag,0);assert.equal(migrated.search,0);assert.equal(migrated.trade,0);assert.equal(migrated.radar,0);
const bounded=normalizeProfile({coins:-1,bag:99,search:99,trade:-2,radar:'invalid'});assert.equal(bounded.coins,0);assert.equal(bounded.bag,5);assert.equal(bounded.search,3);assert.equal(bounded.trade,0);assert.equal(bounded.radar,0);
clearRun();profile=normalizeProfile(null);phase='briefing';profile.coins=149;buyTraining('bag');assert.equal(profile.bag,0);assert.equal(profile.coins,149);
profile.coins=100000;const bagUpgrade=training.find(t=>t.key==='bag');
for(let rank=1;rank<=5;rank++){const before=profile.coins,price=trainingPrice(bagUpgrade);buyTraining('bag');assert.equal(profile.bag,rank);assert.equal(bagCapacity(),16+rank*4);assert.equal(profile.coins,before-price)}const maxedCoins=profile.coins;buyTraining('bag');assert.equal(profile.coins,maxedCoins);assert.equal(bagCapacity(),36);
// Expanded slots appear and the capacity guard uses the new value, not the old 16.
player=createActor(0,0,0,'upgrades',0);player.maxHp=3;phase='play';openInventory();assert.equal(($('bagGrid').innerHTML.match(/item-cell empty/g)||[]).length,36);closeInventory();
for(let i=0;i<36;i++)assert(bagPut(valuableItem(1)));assert(!bagPut(valuableItem(1)));assert.equal(backpack.length,36);
const frozenCoins=profile.coins;buyTraining('search');assert.equal(profile.search,0);assert.equal(profile.coins,frozenCoins);
phase='briefing';for(const key of ['search','radar','trade'])for(let rank=1;rank<=3;rank++){buyTraining(key);assert.equal(profile[key],rank)}
assert(Math.abs(searchDuration({item:{lv:5}})-7.6)<1e-9);assert(Math.abs(searchDuration({item:{lv:1}})-.494)<1e-9);assert(searchDuration({item:{lv:5}})>10*searchDuration({item:{lv:1}}));
assert.equal(radarRange(),36);assert(radarCanSee({x:36,z:0,alive:true}));assert(!radarCanSee({x:37,z:0,alive:true}));assert(!radarCanSee({x:3,z:0,alive:false}));assert(!radarCanSee(player));
const reloaded=normalizeProfile(JSON.parse(localStorage.getItem('fdd-extraction-v1')));assert.equal(reloaded.bag,5);assert.equal(reloaded.search,3);assert.equal(reloaded.radar,3);assert.equal(reloaded.trade,3);
// Successful extraction adds a floored bonus exactly once; failure adds nothing.
const payoutBase=carriedValue();assert.equal(extractionPayout(),payoutBase+Math.floor(payoutBase*.15));const bankBefore=profile.coins;phase='play';finish(true);assert.equal(profile.coins,bankBefore+payoutBase+Math.floor(payoutBase*.15));const paid=profile.coins;finish(true);assert.equal(profile.coins,paid);phase='play';finish(false);assert.equal(profile.coins,paid);
profile=retainedProfile;saveProfile();
console.log('PASS: save migration, per-upgrade caps/prices, bag expansion and rendered slots, full-bag protection, in-run purchase rejection, search/radar effects, persistence and one-time sale bonus');
// All-vs-all AI: same-kind NPCs target each other, not a distant player.
clearRun();player=createActor(0,50,0,'player',0);phase='play';elapsed=50;xp=0;level=1;player.maxHp=3;
const npcA=createActor(1,0,0,'A',0),npcB=createActor(1,3.67,0,'B',0);
addItem(npcA,0,1,false);addItem(npcB,1,1,false);aiIntent(npcA);assert.equal(npcA.target,npcB);assert.equal(npcA.intent,'attack');aiIntent(npcB);assert.equal(npcB.target,npcA);
// Same-level enemy food cancels against enemy food.
npcA.angle=0;npcB.angle=Math.PI;update(0);assert.equal(npcA.items.length,0);assert.equal(npcB.items.length,0);
// Enemies kill enemies, get their own kill credit, and can take the loot.
addItem(npcA,0,3,false);npcA.items[0].hit=0;npcB.x=1.835;npcB.z=0;npcB.hp=1;npcB.inv=0;npcA.angle=0;const playerKills=kills;update(0);assert.equal(npcB.alive,false);assert.equal(npcA.kills,1);assert.equal(kills,playerKills);assert(loot.length>=3);
const dropped=loot[0];npcA.x=dropped.x;npcA.z=dropped.z;const beforeLoot=loot.length;update(0);assert(loot.length<beforeLoot);
// Different character kinds are equally hostile, and weak actors flee any strong rival.
const npcC=createActor(2,npcA.x+3,npcA.z,'C',5);npcA.hp=1;aiIntent(npcA);assert.equal(npcA.target,npcC);assert.equal(npcA.intent,'flee');
// Physical bodies do not stack; food world positions follow any separation.
npcA.x=0;npcA.z=0;npcC.x=0;npcC.z=0;separateBodies([npcA,npcC]);assert(Math.hypot(npcA.x-npcC.x,npcA.z-npcC.z)>=1.45);
// Getting hit during extraction clears the timer before settlement.
clearRun();player=createActor(0,-66,0,'player',0);player.maxHp=3;const attacker=createActor(2,-67.835,0,'attacker',0);addItem(attacker,0,1,false);attacker.angle=0;phase='play';elapsed=50;xp=0;level=1;extractProgress=5.9;update(0);assert.equal(player.hp,2);assert.equal(extractProgress,0);assert.equal(phase,'play');
console.log('PASS: free-for-all target selection, same-kind food collision, NPC kill credit and looting, flee behavior, body separation and damage-interrupted extraction');
console.log('PASS: four drop zones, map collision, chest loot, skill selection, extraction lock/interruption, single settlement, failed-run loss, upgrades/persistence, timeout and simulated movement');
`,context);
