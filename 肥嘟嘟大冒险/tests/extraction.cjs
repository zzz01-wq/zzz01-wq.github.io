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
// Loot collection requires stopping at a chest, and pays once.
const c=chests[0];player.x=c.x;player.z=c.z;keys.KeyW=true;updateExtraction(2);assert.equal(openedCount,0);keys.KeyW=false;updateExtraction(1.3);assert(c.opened);assert.equal(openedCount,1);const value=cargo;updateExtraction(2);assert.equal(cargo,value);
// Each XP threshold gives a paused three-choice upgrade.
xp=10;for(const a of actors.slice(1)){a.alive=false;scene.remove(a.body)}update(0);assert.equal(phase,'skill');assert.equal(offeredSkills.length,3);const oldLevel=level;chooseSkill(0);assert.equal(phase,'play');assert.equal(level,oldLevel);
// Extraction locks for first 45s, resets on movement or leaving, settles only once.
player.x=exits[0].x;player.z=exits[0].z;elapsed=20;updateExtraction(7);assert.equal(extractProgress,0);assert.equal(phase,'play');elapsed=46;updateExtraction(3);assert.equal(extractProgress,3);keys.KeyD=true;updateExtraction(.1);assert.equal(extractProgress,0);keys.KeyD=false;updateExtraction(3);player.x+=4;updateExtraction(.1);assert.equal(extractProgress,0);player.x=exits[0].x;const expected=cargo+power(player)*8;updateExtraction(6);assert.equal(phase,'end');assert.equal(profile.coins,expected);finish(true);assert.equal(profile.coins,expected);
// Upgrades spend currency once, persist, and apply on next drop.
briefing();profile.coins=500;buyTraining('health');assert.equal(profile.health,1);assert.equal(profile.coins,380);assert.equal(JSON.parse(localStorage.getItem('fdd-extraction-v1')).health,1);reset();assert.equal(player.hp,4);updateDrop(2.4);cargo=200;const bank=profile.coins;finish(false);assert.equal(profile.coins,bank);
reset();updateDrop(2.4);elapsed=RUN_SECONDS-.01;update(.02);assert.equal(phase,'end');assert.equal(profile.coins,bank);
// Skill, chest and extraction state must never leak into the next run.
reset();assert.equal(cargo,0);assert.equal(openedCount,0);assert.equal(extractProgress,0);assert(chests.every(c=>!c.opened&&c.progress===0));assert.equal(runUpgrades.speed,0);updateDrop(2.4);
for(let i=0;i<2400&&phase==='play';i++){keys.KeyD=i%600<300;keys.KeyW=i%600>=300;update(1/60);if(phase==='skill')chooseSkill(0)}assert(Number.isFinite(player.x));assert(!blocked(player.x,player.z));
console.log('PASS: four drop zones, map collision, chest loot, skill selection, extraction lock/interruption, single settlement, failed-run loss, upgrades/persistence, timeout and simulated movement');
`,context);
