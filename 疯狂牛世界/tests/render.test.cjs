const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const CowWorld=require('../js/core.js');
const sandbox={window:{devicePixelRatio:1},CowWorld};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../js/render.js'),'utf8'),sandbox);
function canvas(width,height){
 let operations=0;const points=[];
 const draw=(...args)=>{operations++;for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),'Non-finite drawing coordinate');};
 const ctx=new Proxy({
  createLinearGradient(){return {addColorStop(){}};},measureText(t){return {width:t.length*6};},
  moveTo(x,y){draw(x,y);points.push([x,y]);},lineTo(x,y){draw(x,y);points.push([x,y]);}
 },{get(t,k){return k in t?t[k]:draw;}});
 return {width,height,getBoundingClientRect:()=>({width,height}),getContext:()=>ctx,get operations(){return operations;},points};
}
test('five ship silhouettes render inside their preview canvases',()=>{
 const counts=[];
 for(const tier of [1,2,3,5,8]){
  const c=canvas(145,100),r=new sandbox.window.CowRenderer(c,new CowWorld.World());r.shipPortrait(c,tier);counts.push(c.operations);
  assert.ok(c.points.every(([x,y])=>x>=0&&y>=0&&x<=145&&y<=100),`Ship ${tier} preview is clipped`);
 }
 assert.equal(new Set(counts).size,5);
});
test('custom shaped ship, upgrade effect and editor grid render at phone and desktop sizes',()=>{
 for(const [width,height]of [[390,844],[320,568],[1440,900]]){
  const w=new CowWorld.World();w.s.resources.wood=100000;w.s.resources.coin=100000;
  for(const [x,z]of [[2,0],[3,0],[3,1],[3,2]])w.expand(x,z);
  for(const tier of [1,2,3,5,8]){
   w.s.raftTier=tier;const c=canvas(width,height),r=new sandbox.window.CowRenderer(c,w);r.draw();assert.ok(c.operations>0);
   r.editMode='expand';r.selection={x:3,z:3};r.draw();const point=r.project(3,.08,3),hit=r.unproject(point[0],point[1]+.08*r.scale);assert.ok(Math.abs(hit.x-3)<1e-8&&Math.abs(hit.z-3)<1e-8);
  }
  w.upgradeRaft();for(const age of [.1,.8,1.3,2]){w.upgradeFX.age=age;new sandbox.window.CowRenderer(canvas(width,height),w).draw();}
 }
});


test('clicking a giant body resolves to its feet and player remains visible above a crowd',()=>{
 const w=new CowWorld.World();w.drops=[];w.s.player={x:0,z:0};w.s.cows.push({type:5,x:.4,z:.4,seed:1});
 const c=canvas(390,844),r=new sandbox.window.CowRenderer(c,w),draws=[];const cow=r.cow.bind(r);
 r.cow=(...args)=>{draws.push({player:args[5]===true,alpha:c.getContext().globalAlpha});return cow(...args);};r.draw();
 const hit=r.project(.4,1.8,.4),point=r.pickDeckCow(...hit);assert.ok(point);assert.equal(point.x,.4);assert.equal(point.z,.4);
 assert.ok(draws.some(d=>!d.player&&d.alpha<1));assert.equal(draws.at(-1).player,true);assert.equal(draws.at(-1).alpha,1);
 assert.equal(r.pickDeckCow(0,0),null);
});


test('cow geometry rotates about its feet for all headings, without transforming other scene meshes',()=>{
 const r=new sandbox.window.CowRenderer(canvas(390,844),new CowWorld.World());
 r.box(3,0,3,1,1,1,'#aaaaaa');const stationary=JSON.stringify(r.faces);const offset=r.faces.length;
 r.cow(1,0,2,0,0,true,0);const original=r.faces.slice(offset).map(f=>f.points.map(p=>[...p]));
 r.faces=r.faces.slice(0,offset);r.cow(1,0,2,0,0,true,Math.PI/2);assert.equal(JSON.stringify(r.faces.slice(0,offset)),stationary);
 r.faces.slice(offset).forEach((f,i)=>f.points.forEach(([x,y,z],j)=>{const [a,b,c]=original[i][j];assert.ok(Math.abs(x-(1+c-2))<1e-9);assert.equal(y,b);assert.ok(Math.abs(z-(2-(a-1)))<1e-9);}));
});
