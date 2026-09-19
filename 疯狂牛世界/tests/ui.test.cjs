const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=require('../js/core.js');
function boot(){
 const nodes=new Map(),listeners={},frames=[];let world,renderer,clock=0;
 class Node{
  constructor(id,dataset={}){this.id=id;this.dataset=dataset;this.hidden=false;this.disabled=false;this.style={};this.events={};this.children=[];this.scrollTop=0;this.classList={add(){},remove(){},toggle(){}};}
  addEventListener(type,fn){this.events[type]=fn;}setAttribute(){}focus(){}remove(){}appendChild(n){this.children.push(n);}getBoundingClientRect(){return {left:0,top:0,width:390,height:844};}
 }
 for(const m of fs.readFileSync(require.resolve('../index.html'),'utf8').matchAll(/id="([^"]+)"/g))nodes.set(m[1],new Node(m[1]));
 for(const k of Object.keys(core.RESOURCE_NAMES))nodes.set('res-'+k,new Node('res-'+k));
 const panels=['build','herd','book','tasks'].map(panel=>new Node(panel,{panel}));
 const tools=['expand','grass','remove'].map(tool=>new Node(tool,{tool}));
 const query=s=>s==='[data-panel]'?panels:s==='[data-tool]'?tools:[];
 const doc={hidden:false,activeElement:null,getElementById(id){assert.ok(nodes.has(id),`Missing element #${id}`);return nodes.get(id);},querySelectorAll:query,createElement:()=>new Node('toast'),addEventListener(){}};
 nodes.get('game').children=[...nodes.values()];nodes.get('modal').hidden=true;nodes.get('buildEditor').hidden=true;
 class World extends core.World{constructor(){super();world=this;this.s.resources.wood=500;this.s.resources.coin=500;}}
 class Renderer{constructor(){this.scale=1;renderer=this;}pickDeckCow(){return this.pickedCow||null;}unproject(x,z){return {x,z};}project(x,y,z){return [x,z];}resize(){}draw(){}shipPortrait(){}}
 const sandbox={document:doc,window:{addEventListener(type,fn){listeners[type]=fn;}},performance:{now:()=>clock},localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame(fn){frames.push(fn);},setTimeout(){},CowWorld:{...core,World},CowRenderer:Renderer};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../js/game.js'),'utf8'),sandbox);
 const action=name=>nodes.get('panelBody').events.click({target:{closest:()=>({dataset:{action:name}})}});
 const clickCell=(x,z)=>nodes.get('sea').events.pointerdown({clientX:x,clientY:z-.08});
 const tick=(count=1)=>{for(let i=0;i<count;i++){clock+=1000/60;for(const fn of frames.splice(0))fn(clock);}};
 return {nodes,world,renderer,tick,panels,tools,action,clickCell,listeners};
}
test('construction UI opens preview, places a selected cell and exits cleanly',()=>{
 const app=boot();app.panels[0].events.click();assert.match(app.nodes.get('panelBody').innerHTML,/海上方舟/);
 app.action('edit');assert.equal(app.nodes.get('modal').hidden,true);assert.equal(app.nodes.get('buildEditor').hidden,false);assert.equal(app.nodes.get('confirmBuild').disabled,true);
 app.clickCell(2,0);assert.equal(app.nodes.get('confirmBuild').disabled,false);app.nodes.get('confirmBuild').onclick();assert.ok(app.world.tileAt(2,0));assert.equal(app.nodes.get('confirmBuild').disabled,true);
 app.nodes.get('finishBuild').onclick();assert.equal(app.nodes.get('buildEditor').hidden,true);
});
test('new facility uses map placement; ascending closes sheet to reveal ship transformation',()=>{
 const app=boot();app.panels[0].events.click();app.action('build:shed');assert.equal(app.nodes.get('buildEditor').hidden,false);
 app.clickCell(1,1);app.nodes.get('confirmBuild').onclick();assert.equal(app.world.s.buildings.shed.x,1);assert.equal(app.world.s.buildings.shed.z,1);
 app.nodes.get('finishBuild').onclick();app.panels[0].events.click();app.action('tier');assert.equal(app.world.s.raftTier,2);assert.equal(app.nodes.get('modal').hidden,true);assert.equal(app.world.upgradeFX.age,0);
});

test('click movement reaches a cow-occupied destination through the real frame loop',()=>{
 const app=boot();app.world.drops=[];app.world.s.player={x:0,z:0};
 for(let i=0;i<40;i++)app.world.s.cows.push({type:5,x:0,z:.5,seed:i});
 app.renderer.pickedCow={x:1,z:1};app.clickCell(1,-2);
 app.tick(200);assert.ok(Math.hypot(app.world.s.player.x-1,app.world.s.player.z-1)<.1);
 assert.equal(app.renderer.destination,null);assert.equal(app.world.s.cows.length,41);
});
test('a second click replaces the destination while surrounded by cows',()=>{
 const app=boot();app.world.drops=[];app.world.s.player={x:0,z:0};
 for(let i=0;i<30;i++)app.world.s.cows.push({type:5,x:0,z:0,seed:i});
 app.clickCell(1,1);app.tick(20);app.clickCell(-1,1);app.tick(200);
 assert.ok(Math.hypot(app.world.s.player.x+1,app.world.s.player.z-1)<.1);
});
