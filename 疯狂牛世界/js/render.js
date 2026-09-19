/* Tiny orthographic software 3D renderer. Every character is an original mesh. */
(function(root){
'use strict';
const TAU=Math.PI*2;
function shade(hex,n){const c=parseInt(hex.slice(1),16);return `rgb(${Math.max(0,Math.min(255,(c>>16)+n))},${Math.max(0,Math.min(255,((c>>8)&255)+n))},${Math.max(0,Math.min(255,(c&255)+n))})`;}
class Renderer{
 constructor(canvas,world){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.world=world;this.w=0;this.h=0;this.faces=[];this.time=0;this.scale=75;this.cx=0;this.cy=0;this.resize();}
 resize(){const r=this.canvas.getBoundingClientRect();this.w=r.width;this.h=r.height;const d=Math.min(root.devicePixelRatio||1,2);this.canvas.width=Math.round(this.w*d);this.canvas.height=Math.round(this.h*d);this.ctx.setTransform(d,0,0,d,0,0);}
 project(x,y,z){return [this.cx+(x-z)*this.scale*.87,this.cy+(x+z)*this.scale*.43-y*this.scale];}
 unproject(sx,sy){const a=(sx-this.cx)/(this.scale*.87),b=(sy-this.cy)/(this.scale*.43);return {x:(a+b)/2,z:(b-a)/2};}
 poly(points,color,depthBias=0){this.faces.push({points,color,depth:points.reduce((s,p)=>s+p[0]+p[2]+p[1]*.08,0)/points.length+depthBias});}
 box(x,y,z,w,h,d,color){const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2],aa=[a[0],y+h,a[2]],bb=[b[0],y+h,b[2]],cc=[c[0],y+h,c[2]],ee=[e[0],y+h,e[2]];this.poly([b,c,cc,bb],shade(color,-18));this.poly([c,e,ee,cc],shade(color,-6));this.poly([aa,bb,cc,ee],shade(color,14));if(this.rotatingCow){this.poly([a,b,bb,aa],shade(color,-12));this.poly([e,a,aa,ee],shade(color,-5));this.poly([a,e,c,b],shade(color,-20));}}
 ellipsoid(x,y,z,rx,ry,rz,color,segments=7,rings=4){const v=[];for(let j=0;j<=rings;j++){let a=Math.PI*j/rings;v[j]=[];for(let i=0;i<segments;i++){let b=TAU*i/segments;v[j][i]=[x+Math.sin(a)*Math.cos(b)*rx,y+Math.cos(a)*ry,z+Math.sin(a)*Math.sin(b)*rz];}}for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const k=(i+1)%segments;const p=[v[j][i],v[j+1][i],v[j+1][k],v[j][k]];const a=TAU*(i+.5)/segments;this.poly(p,shade(color,Math.round(Math.cos(a+2)*12+Math.cos(Math.PI*(j+.5)/rings)*15)));}}
 cone(x,y,z,r,h,color){for(let i=0;i<6;i++){const a=i*TAU/6,b=(i+1)*TAU/6;this.poly([[x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(b)*r,y,z+Math.sin(b)*r],[x,y+h,z]],shade(color,i*4-12));}}
 flush(){const ctx=this.ctx;this.faces.sort((a,b)=>a.depth-b.depth);for(const f of this.faces){ctx.beginPath();for(let i=0;i<f.points.length;i++){const p=this.project(...f.points[i]);if(!i)ctx.moveTo(...p);else ctx.lineTo(...p);}ctx.closePath();ctx.fillStyle=f.color;ctx.fill();}this.faces=[];}
 ellipse(x,y,z,rx,rz,color){const p=this.project(x,y,z),c=this.ctx;c.fillStyle=color;c.beginPath();c.ellipse(p[0],p[1],rx*this.scale,rz*this.scale,0,0,TAU);c.fill();}
 line3(points,color,width=1){const c=this.ctx;c.beginPath();points.forEach((p,i)=>{const q=this.project(...p);i?c.lineTo(...q):c.moveTo(...q);});c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 cow(x,y,z,type=0,phase=0,player=false,heading=0,job=null){const begin=this.faces.length;this.rotatingCow=true;const def=CowWorld.COWS[type],s=def.scale*(player?1.2:1),col=def.color;const bob=Math.sin(phase*2)*.018;const E=(a,b,c,rx,ry,rz,color)=>this.ellipsoid(x+a*s,y+(b+bob)*s,z+c*s,rx*s,ry*s,rz*s,color);const B=(a,b,c,w,h,d,color)=>this.box(x+a*s,y+b*s,z+c*s,w*s,h*s,d*s,color);
 // Slightly awkward upright posture, narrow legs, long snout and heavy eyelids.
 for(const side of [-1,1]){const step=Math.sin(phase+side)*.035;B(side*.14,.04,step,.12,.35,.15,col);B(side*.14,.015,.055+step,.15,.09,.22,'#655b4c');E(side*.30,.63,.015,.085,.28,.095,col);E(side*.32,.41,.07,.095,.09,.11,'#b29a79');}
 E(0,.59,0,.29,.39,.24,col);E(0,.84,-.02,.19,.22,.19,col);E(0,1.07,.055,.255,.285,.245,col);E(0,.98,.26,.215,.13,.19,'#cfb794');E(0,.935,.30,.185,.038,.125,'#b89c80');
 for(const side of [-1,1]){E(side*.30,1.18,.03,.15,.065,.075,col);E(side*.32,1.18,.07,.09,.036,.04,'#b49a80');this.cone(x+side*.17*s,y+1.30*s,z+.02*s,.051*s,.20*s,'#ddd6b7');E(side*.122,1.15,.251,.069,.046,.021,'#eee8d4');E(side*.12,1.138,.271,.022,.027,.013,'#394334');B(side*.12,1.182,.258,.145,.034,.03,col);E(side*.083,1.005,.418,.017,.016,.009,'#675c4c');}
 if(player){B(0,.825,.215,.30,.055,.06,'#6a8c75');B(.12,.72,.21,.07,.13,.05,'#6a8c75');}
 if(type===3){this.cone(x,y+1.41*s,z,.29*s,.15*s,'#a46656');E(0,1.4,0,.30,.08,.23,'#b6785f');}
 if(type===4){B(0,.72,.245,.09,.13,.02,'#e8d694');}
 if(type===5){for(let i=-1;i<=1;i++)this.cone(x+i*.11*s,y+1.42*s,z+.035*s,.05*s,.16*s,'#e7cc71');}
 if(job){const role=CowWorld.JOBS.find(j=>j.id===job);if(role){
  B(0,.68,.23,.33,.30,.04,role.color);
  if(job==='builder'||job==='farmer'){E(0,1.34,.04,.32,.07,.27,role.color);B(0,1.35,.04,.26,.09,.22,role.color);}
  if(job==='salvager'){B(.40,.26,.12,.035,.58,.035,'#a18c61');E(.40,.85,.12,.16,.12,.025,role.color);}
 }}
 this.rotatingCow=false;
 if(heading){const cos=Math.cos(heading),sin=Math.sin(heading);for(let i=begin;i<this.faces.length;i++){
  const face=this.faces[i];face.points=face.points.map(([px,py,pz])=>[x+(px-x)*cos+(pz-z)*sin,py,z-(px-x)*sin+(pz-z)*cos]);
  face.depth=face.points.reduce((sum,p)=>sum+p[0]+p[2]+p[1]*.08,0)/face.points.length;
 }}
 }
 tile(t){const {x,z}=t;for(let i=0;i<4;i++)this.box(x-.365+i*.245,-.18,z,.23,.16,.96,i%2?'#b99a67':'#c6a475');this.box(x,-.23,z-.32,.98,.09,.105,'#95754f');this.box(x,-.23,z+.32,.98,.09,.105,'#95754f');if(t.grass){this.box(x,-.018,z,.91,.085,.91,'#9aaa6b');for(let i=0;i<8;i++){const gx=x+Math.sin(i*13+x*23+z*5)*.35,gz=z+Math.cos(i*8+x*2-z*32)*.35;this.poly([[gx-.045,.07,gz],[gx+.025,.06,gz],[gx+.01+Math.sin(this.time+i)*.012,.18,gz]],i%2?'#aabb78':'#879d61');}}
 }
 shipTier(){const fx=this.world.upgradeFX;return fx&&fx.age<.65?fx.from:this.world.s.raftTier;}
 shipHull(){
  const s=this.world.s,tier=this.shipTier();if(tier<2)return;
  const occupied=new Set(s.tiles.map(t=>`${t.x},${t.z}`)),deep=tier>=5?.64:tier>=3?.45:.29;
  const col=tier>=8?'#476d70':tier>=5?'#638587':tier>=3?'#a37f58':'#a59573';
  for(const t of s.tiles){
   this.box(t.x,-deep,t.z,.98,deep-.14,.98,col);
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])if(!occupied.has(`${t.x+dx},${t.z+dz}`)){
    const x=t.x+dx*.49,z=t.z+dz*.49;
    this.box(x,-.14,z,dx?.055:.99,.16,dz?.055:.99,tier>=5?'#eee3bb':'#b6a780');
    if(tier>=5)this.box(x+dx*.012,-.4,z+dz*.012,dx?.035:.25,.14,dz?.035:.25,'#b7d7ce');
   }
  }
  if(tier>=3){
   const bow=[...s.tiles].sort((a,b)=>b.z-a.z||Math.abs(a.x)-Math.abs(b.x))[0],x=bow.x,z=bow.z+.49;
   this.poly([[x-.48,-.03,z],[x+.48,-.03,z],[x,-.03,z+1.0]],'#c9b384');
   this.poly([[x-.48,-.03,z],[x,-.03,z+1.0],[x,-deep*.8,z+.8],[x-.35,-deep,z]],col);
   this.poly([[x,-.03,z+1.0],[x+.48,-.03,z],[x+.35,-deep,z],[x,-deep*.8,z+.8]],shade(col,-17));
   this.box(x,.0,z+.3,.08,.36,.08,'#e4d3a6');
  }
 }
 shipAnchor(){const s=this.world.s;return [...s.tiles].filter(t=>!(t.x===0&&t.z===0)&&!Object.values(s.buildings).some(b=>b.x===t.x&&b.z===t.z)).sort((a,b)=>a.x+a.z-b.x-b.z)[0]||s.tiles[0];}
 shipStructures(){
  const s=this.world.s,tier=this.shipTier(),anchor=this.shipAnchor(),x=anchor.x,z=anchor.z;
  const fx=this.world.upgradeFX;if(tier<3||fx&&fx.age<1.15&&fx.from<3)return;
  if(tier<5){
   this.box(x,.02,z,.09,2.45,.09,'#806d4c');this.box(x+.12,1.90,z,1.48,.07,.07,'#a19369');
   this.poly([[x+.06,2.24,z],[x+1.0,1.03,z+.07],[x+.06,1.02,z+.12]],'#f1e2b4');
   this.poly([[x-.06,2.18,z],[x-.60,1.18,z],[x-.06,1.18,z-.08]],'#d3c797');
  }else{
   // A raised shelter follows a real deck tile; irregular decks are never filled in.
   this.box(x,.06,z,.80,.75,.80,'#e2d4ae');this.box(x,.79,z,.96,.12,.96,'#6c8d80');
   this.box(x,.38,z+.407,.54,.25,.035,'#689c9c');this.box(x+.407,.38,z,.035,.25,.54,'#83b4ab');
   this.box(x,.38,z+.43,.04,.25,.035,'#eee0b4');
   this.box(x,.89,z,.07,1.10,.07,'#aa9872');
   this.poly([[x+.04,1.95,z],[x+.60,1.81,z],[x+.04,1.58,z]],'#e9c772');
   if(tier>=8&&(!fx||fx.age>=1.8||fx.from>=8)){
    this.box(x,.90,z,.57,.50,.57,'#e9dec0');this.box(x,1.42,z,.70,.10,.70,'#526f73');
    this.box(x,1.1,z+.29,.38,.16,.025,'#9bcac3');
    this.box(x-.28,1.54,z-.22,.08,.57,.08,'#cbbe8e');this.ellipsoid(x-.28,2.15,z-.22,.17,.20,.17,'#f5db8b',6,3);
    for(const side of [-1,1]){this.box(x+side*.64,.12,z,.06,1.06,.06,'#859886');this.box(x+side*.60,1.18,z,.47,.06,.96,'#466979');for(let j=-1;j<=1;j++)this.box(x+side*.60,1.243,z+j*.25,.43,.015,.016,'#92b5b5');}
   }
  }
 }
 shipRails(){
  const s=this.world.s,tier=this.shipTier();if(tier<2)return;
  const occupied=new Set(s.tiles.map(t=>`${t.x},${t.z}`)),col=tier>=5?'#e3dabd':'#a49b7c';
  for(const t of s.tiles)for(const [dx,dz]of [[1,0],[0,1],[-1,0],[0,-1]])if(!occupied.has(`${t.x+dx},${t.z+dz}`)){
   // Low railings leave the collection range and player silhouette readable.
   const x=t.x+dx*.46,z=t.z+dz*.46;
   for(const end of [-.4,.4])this.box(x+(dz?end:0),.03,z+(dx?end:0),.04,.27,.04,col);
   this.box(x,.26,z,dx?.045:.87,.045,dz?.045:.87,col);
   if(tier>=5&&(t.x+t.z)%3===0&&dz===1)this.ellipsoid(x,.14,z+.055,.13,.14,.04,'#d3a267',8,3);
  }
 }
 drawBuildGrid(){
  if(!this.editMode)return;
  const c=this.ctx,sites=this.world.expansionSites(),selected=this.selection;
  for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++){
   const tile=this.world.tileAt(x,z),available=sites.some(t=>t.x===x&&t.z===z),sel=selected&&selected.x===x&&selected.z===z;
   if(!tile&&!available&&!sel)continue;
   const points=[[x-.48,.10,z-.48],[x+.48,.10,z-.48],[x+.48,.10,z+.48],[x-.48,.10,z+.48]].map(p=>this.project(...p));
   c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();
   c.fillStyle=sel?'#f6d27599':tile?'#f3f4da12':available?'#d8f3d83b':'#d8916d44';c.fill();c.strokeStyle=sel?'#fff5b1':available?'#e7f8dca6':'#e1ecda77';c.lineWidth=sel?2.5:1;c.setLineDash(tile||sel?[]:[4,4]);c.stroke();c.setLineDash([]);
   if(available&&!tile){const p=this.project(x,.11,z);c.fillStyle='#f4f8df';c.font='18px sans-serif';c.textAlign='center';c.fillText('+',p[0],p[1]+5);}
  }
 }
 shipPortrait(canvas,tier){
  const world=Object.create(this.world);world.s={...this.world.s,raftTier:tier,tiles:CowWorld.fresh().tiles,buildings:{}};world.upgradeFX=null;
  const r=new Renderer(canvas,world);r.ctx.fillStyle='#e7ecdc';r.ctx.fillRect(0,0,r.w,r.h);r.scale=Math.min(r.w/6.4,r.h/6);r.cx=r.w*.54;r.cy=r.h*.64;
  r.shipHull();for(const t of world.s.tiles)r.tile(t);r.flush();r.shipStructures();r.shipRails();r.flush();
 }
 building(id,b){const x=b.x,z=b.z;const y=.08;if(id==='shed'||id==='barn'){const col=id==='barn'?'#a57855':'#baaa72';this.box(x,y,z,.65,.53,.64,col);this.box(x,y,z+.325,.26,.40,.02,'#655e45');const h=.87;this.poly([[x-.44,y+.49,z+.4],[x+.44,y+.49,z+.4],[x,y+h,z+.4]],'#c9b677');this.poly([[x-.44,y+.49,z-.4],[x,y+h,z-.4],[x,y+h,z+.4],[x-.44,y+.49,z+.4]],'#d7c18a');this.poly([[x,y+h,z-.4],[x+.44,y+.49,z-.4],[x+.44,y+.49,z+.4],[x,y+h,z+.4]],'#bba06b');for(let j=-1;j<=1;j++)this.box(x+j*.12,y+.1,z+.41,.09,.12,.18,'#9baf68');}
 if(id==='milk'){this.box(x,y,z,.65,.12,.6,'#877962');this.ellipsoid(x,y+.37,z,.24,.29,.24,'#c4d0c1');this.box(x,y+.66,z,.38,.08,.32,'#6b9185');this.box(x+.3,y+.25,z,.14,.31,.12,'#a6b8a9');this.box(x,y+.25,z+.25,.18,.2,.04,'#f0e9cf');}
 if(id==='tea'){this.box(x,y,z,.73,.4,.52,'#b59269');for(const side of [-1,1])this.box(x+side*.32,y+.4,z,.055,.47,.055,'#7c7b57');for(let i=0;i<5;i++)this.box(x-.32+i*.16,y+.84,z,.16,.06,.72,i%2?'#e5d3a2':'#648c73');this.box(x,y+.27,z+.27,.52,.16,.02,'#e8dbb7');for(let i=0;i<3;i++)this.box(x-.2+i*.2,y+.4,z+.1,.08,.15,.09,'#e5dcb9');}
 }
 drop(d){let y=-.1+Math.sin(this.time*1.9+d.seed)*.065;const {x,z}=d;if(d.type==='cow'){this.box(x,-.20,z,.75,.1,.67,'#a88e68');this.cow(x,y,z,d.cowType,this.time);return;}
 if(d.type==='wood'){this.box(x,y,z,.58,.085,.16,'#c3a174');this.box(x+.06,y+.075,z+.045,.42,.07,.12,'#d3b182');}
 if(d.type==='grass'){this.box(x,y-.04,z,.4,.07,.37,'#998263');for(let i=0;i<5;i++)this.cone(x+Math.sin(i*3)*.15,y,z+Math.cos(i*3)*.12,.095,.3,'#a2b571');}
 if(d.type==='milk'){this.ellipsoid(x,y+.11,z,.16,.23,.16,'#d3ddcf',6,3);this.box(x,y+.3,z,.2,.06,.2,'#8ba89c');this.box(x,y+.04,z+.15,.15,.14,.02,'#faf0d6');}
 if(d.type==='feed'){this.ellipsoid(x,y+.1,z,.20,.26,.15,'#c3b683',6,3);this.box(x,y+.28,z,.17,.06,.11,'#867c59');this.box(x,y+.06,z+.14,.17,.12,.02,'#e0d4b1');}
 if(d.type==='chest'){this.box(x,y,z,.4,.25,.3,'#99744b');this.box(x,y+.23,z,.43,.08,.34,'#b78c4f');for(const a of [-.12,.12])this.box(x+a,y,z,.045,.31,.34,'#d0b45f');this.box(x,y+.11,z+.16,.07,.09,.03,'#e7ce73');}
 }
 ocean(){const c=this.ctx,w=this.w,h=this.h,t=this.time;let g=c.createLinearGradient(0,0,w*.4,h);const colors=this.world.seaTheme.colors;g.addColorStop(0,colors[0]);g.addColorStop(.45,colors[1]);g.addColorStop(1,colors[2]);c.fillStyle=g;c.fillRect(0,0,w,h);
 // Large quiet geometric currents, then small broken foam lines.
 for(let i=0;i<22;i++){let x=((i*317.23+t*3)%(w+350))-170,y=(Math.sin(i*2.4)*.5+.5)*h;c.beginPath();c.moveTo(x,y);c.lineTo(x+170,y-60);c.lineTo(x+360,y-30);c.lineTo(x+180,y+70);c.closePath();c.fillStyle=i%2?'#d0dfcf0a':'#306d7f06';c.fill();}
 c.lineCap='round';for(let i=0;i<95;i++){let x=((Math.sin(i*132.1)*.5+.5)*w+t*(2+i%3))%(w+60)-30,y=(Math.cos(i*32.9)*.5+.5)*h;let len=8+i%5*6;c.strokeStyle=i%4===0?'#e2ead663':'#d9e9d831';c.lineWidth=i%3===0?1.5:1;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+len*.3,y-2,x+len*.65,y+2,x+len,y);c.stroke();}
 // Dream islands dissolve in the distance.
 for(let k=0;k<3;k++){const x=w*(.43+k*.24),y=h*(.19+k%2*.07);c.fillStyle='#6d999313';c.beginPath();c.moveTo(x-65,y);c.lineTo(x-36,y-14);c.lineTo(x-18,y-8);c.lineTo(x+12,y-23);c.lineTo(x+67,y);c.closePath();c.fill();}
 }
 objectBounds(x,z,height=1.5,radius=.45){
  const corners=[];for(const dx of [-radius,radius])for(const dz of [-radius,radius])for(const y of [.08,height])corners.push(this.project(x+dx,y,z+dz));
  return {left:Math.min(...corners.map(p=>p[0])),right:Math.max(...corners.map(p=>p[0])),top:Math.min(...corners.map(p=>p[1])),bottom:Math.max(...corners.map(p=>p[1]))};
 }
 blocksPlayer(x,z,height=1.5,radius=.45){
  const p=this.world.s.player;if(x+z<p.x+p.z-.2)return false;
  const a=this.objectBounds(x,z,height,radius),b=this.objectBounds(p.x,p.z,1.24,.22);
  return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
 }
 pickDeckCow(sx,sy){
  // A click on a tall cow should target its feet, not a distant tile behind its head.
  const cows=this.world.visibleWorkers.map(c=>({...c,player:false}));
  cows.push({...this.world.s.player,type:0,player:true});
  cows.sort((a,b)=>(b.x+b.z)-(a.x+a.z));
  for(const cow of cows){const size=CowWorld.COWS[cow.type].scale*(cow.player?1.2:1),b=this.objectBounds(cow.x,cow.z,1.55*size,.32*size);
   if(sx>=b.left&&sx<=b.right&&sy>=b.top&&sy<=b.bottom)return {x:cow.x,z:cow.z};
  }
  return null;
 }
 drawPlayer(){
  const p=this.world.s.player,c=this.ctx,foot=this.project(p.x,.10,p.z);
  c.globalAlpha=1;c.strokeStyle='#fff2b0';c.lineWidth=2.2;c.beginPath();c.ellipse(foot[0],foot[1],Math.max(8,this.scale*.30),Math.max(4,this.scale*.13),0,0,TAU);c.stroke();
  // Draw last as a visibility pass, including behind giants, cabins and railings.
  this.cow(p.x,.08,p.z,0,this.time*(this.moving?6:1),true,p.heading||0);this.flush();
  const head=this.project(p.x,1.50,p.z);this.label(head[0],head[1]-4,'你','#355f4d');
 }
 draw(){const w=this.world,s=w.s;this.time=s.time;const small=this.w<650;const desired=small?Math.min(this.w*.136,53):Math.min(this.w*.068,89);this.scale=this.editMode?Math.min((this.w-40)/(9*1.74),(this.h-230)/(9*.86),55):desired*Math.min(1,3.9/(w.radius*2));this.cx=this.w*.5+(small?0:25);this.cy=this.h*(this.editMode?.47:small?.565:.56);this.ocean();const c=this.ctx;
 this.ellipse(0,-.35,0,w.radius*1.39,w.radius*.62,'#285f7029');this.ellipse(.25,-.38,.25,w.radius*1.48,w.radius*.68,'#33738517');
 for(const d of w.drops)this.ellipse(d.x,-.17,d.z,d.type==='cow'?.46:.24,.085,'#2d6a7528');
 this.shipHull();this.flush();const objects=[];for(const tile of s.tiles)objects.push({depth:tile.x+tile.z-2,fn:()=>this.tile(tile)});objects.sort((a,b)=>a.depth-b.depth);for(const o of objects)o.fn();this.flush();
 // Hand-lashed edge fence, small gaps to keep the water approachable.
 if(this.shipTier()<2)for(const tile of s.tiles){const edge=!s.tiles.some(t=>t.x===tile.x&&t.z===tile.z-1);if(edge&&tile.x%2===0){this.box(tile.x-.42,.05,tile.z-.45,.07,.43,.07,'#aa8e62');this.box(tile.x+.42,.05,tile.z-.45,.07,.43,.07,'#aa8e62');this.flush();this.line3([[tile.x-.42,.4,tile.z-.45],[tile.x,.3,tile.z-.45],[tile.x+.42,.4,tile.z-.45]],'#d7c498',1.5);}}
 // A cloth flag marks the first little patch of home.
 const flag=s.tiles[0];this.box(flag.x-.3,.02,flag.z-.30,.055,1.65,.055,'#8c7858');this.poly([[flag.x-.27,1.66,flag.z-.3],[flag.x+.32,1.60+Math.sin(this.time*2)*.03,flag.z-.3],[flag.x+.32,1.24,flag.z-.3],[flag.x-.27,1.3,flag.z-.3]],'#eee2b5');this.flush();const fp=this.project(flag.x+.015,1.39,flag.z-.3);c.save();c.fillStyle='#647b54';c.font=`bold ${Math.max(10,this.scale*.20)}px serif`;c.textAlign='center';c.fillText('牛',fp[0],fp[1]);c.restore();
 const anchor=this.shipAnchor();const entities=[{depth:anchor.x+anchor.z,fade:this.blocksPlayer(anchor.x,anchor.z,2.5,.9),fn:()=>this.shipStructures()}];
 for(const [id,b]of Object.entries(s.buildings))entities.push({depth:b.x+b.z,fade:this.blocksPlayer(b.x,b.z,1,.5),fn:()=>this.building(id,b)});
 for(const cow of w.visibleWorkers){const size=CowWorld.COWS[cow.type].scale;entities.push({depth:cow.x+cow.z+.1,fade:this.blocksPlayer(cow.x,cow.z,size*1.6,size*.45),fn:()=>this.cow(cow.x,.08,cow.z,cow.type,this.time*.7+cow.seed,false,cow.heading||0,cow.job)});}
 const p=s.player;this.ellipse(p.x,.08,p.z,.30,.12,'#405a4438');
 for(const d of w.drops)entities.push({depth:d.x+d.z,fade:d.type==='cow'&&this.blocksPlayer(d.x,d.z,CowWorld.COWS[d.cowType].scale*1.6,.65),fn:()=>this.drop(d)});
 entities.sort((a,b)=>a.depth-b.depth);for(const e of entities){c.globalAlpha=e.fade?.32:1;e.fn();this.flush();}c.globalAlpha=1;
 this.shipRails();this.flush();
 if(this.destination&&!this.editMode){const q=this.project(this.destination.x,.10,this.destination.z);c.strokeStyle='#fff2b0';c.lineWidth=2;c.beginPath();c.ellipse(q[0],q[1],9,5,0,0,TAU);c.stroke();}
 for(const d of w.drops){if(d.type==='cow'){const q=this.project(d.x,CowWorld.COWS[d.cowType].scale*1.55,d.z);this.label(q[0],q[1],s.cows.length>=w.capacity?'加入工作小队':`${d.rank||1} 阶 · 救救牛！`,d.cowType>=4?'#8c7445':'#527568');}}
 for(const e of w.effects){if(e.ring){const q=this.project(e.x,0,e.z);c.strokeStyle=`rgba(255,244,195,${e.life})`;c.lineWidth=2;c.beginPath();c.ellipse(q[0],q[1],(1-e.life)*this.scale*w.netRange,(1-e.life)*this.scale*w.netRange*.5,0,0,TAU);c.stroke();}else{const q=this.project(e.x,.6+(2-e.life)*.35,e.z);c.globalAlpha=Math.min(1,e.life);this.label(q[0],q[1],e.text,'#416d55');c.globalAlpha=1;}}
 for(const worker of w.visibleWorkers){const q=this.project(worker.x,CowWorld.COWS[worker.type].scale*1.6,worker.z);this.label(q[0],q[1],CowWorld.JOBS.find(j=>j.id===worker.job).name+' ×'+worker.count,'#536e58');}
 this.birds();this.drawPlayer();this.drawBuildGrid();
 if(w.upgradeFX){const fx=w.upgradeFX;const progress=Math.min(1,fx.age/3);this.label(this.w/2,this.h*.29,`船体改造 · ${Math.round(progress*100)}%`,'#5a795b');c.strokeStyle=`rgba(250,222,148,${1-progress})`;c.lineWidth=3;const p=this.project(0,0,0);c.beginPath();c.ellipse(p[0],p[1],this.scale*(w.radius+progress),this.scale*(w.radius+progress)*.45,0,0,TAU);c.stroke();}
 }
 label(x,y,text,color){const c=this.ctx;c.font='10px "PingFang SC",sans-serif';const width=c.measureText(text).width+16;c.fillStyle='#fffbeaeb';c.beginPath();c.roundRect(x-width/2,y-12,width,21,9);c.fill();c.fillStyle=color;c.textAlign='center';c.fillText(text,x,y+2);}
 birds(){const c=this.ctx;for(let i=0;i<4;i++){let x=this.w*(.25+i*.18)+Math.sin(this.time*.17+i)*35,y=this.h*.31+Math.cos(this.time*.25+i*2)*23;let wing=Math.sin(this.time*4+i)*5;c.beginPath();c.moveTo(x-9,y+wing);c.quadraticCurveTo(x-3,y-4,x,y);c.quadraticCurveTo(x+4,y-4,x+9,y+wing);c.strokeStyle=i%2?'#f6efdb':'#587c76';c.lineWidth=1.8;c.stroke();}}
 portrait(canvas,type){const r=new Renderer(canvas,this.world);r.ctx.clearRect(0,0,r.w,r.h);r.ctx.fillStyle='#eaeedc';r.ctx.fillRect(0,0,r.w,r.h);r.cx=r.w/2;r.cy=r.h*.89;r.scale=type===5?39:66;r.cow(0,0,0,type,0);r.flush();}
}
root.CowRenderer=Renderer;
})(window);
