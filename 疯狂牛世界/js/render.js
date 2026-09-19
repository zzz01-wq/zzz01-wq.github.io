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
 box(x,y,z,w,h,d,color){const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2],aa=[a[0],y+h,a[2]],bb=[b[0],y+h,b[2]],cc=[c[0],y+h,c[2]],ee=[e[0],y+h,e[2]];this.poly([b,c,cc,bb],shade(color,-18));this.poly([c,e,ee,cc],shade(color,-6));this.poly([aa,bb,cc,ee],shade(color,14));}
 ellipsoid(x,y,z,rx,ry,rz,color,segments=7,rings=4){const v=[];for(let j=0;j<=rings;j++){let a=Math.PI*j/rings;v[j]=[];for(let i=0;i<segments;i++){let b=TAU*i/segments;v[j][i]=[x+Math.sin(a)*Math.cos(b)*rx,y+Math.cos(a)*ry,z+Math.sin(a)*Math.sin(b)*rz];}}for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const k=(i+1)%segments;const p=[v[j][i],v[j+1][i],v[j+1][k],v[j][k]];const a=TAU*(i+.5)/segments;this.poly(p,shade(color,Math.round(Math.cos(a+2)*12+Math.cos(Math.PI*(j+.5)/rings)*15)));}}
 cone(x,y,z,r,h,color){for(let i=0;i<6;i++){const a=i*TAU/6,b=(i+1)*TAU/6;this.poly([[x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(b)*r,y,z+Math.sin(b)*r],[x,y+h,z]],shade(color,i*4-12));}}
 flush(){const ctx=this.ctx;this.faces.sort((a,b)=>a.depth-b.depth);for(const f of this.faces){ctx.beginPath();for(let i=0;i<f.points.length;i++){const p=this.project(...f.points[i]);if(!i)ctx.moveTo(...p);else ctx.lineTo(...p);}ctx.closePath();ctx.fillStyle=f.color;ctx.fill();}this.faces=[];}
 ellipse(x,y,z,rx,rz,color){const p=this.project(x,y,z),c=this.ctx;c.fillStyle=color;c.beginPath();c.ellipse(p[0],p[1],rx*this.scale,rz*this.scale,0,0,TAU);c.fill();}
 line3(points,color,width=1){const c=this.ctx;c.beginPath();points.forEach((p,i)=>{const q=this.project(...p);i?c.lineTo(...q):c.moveTo(...q);});c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 cow(x,y,z,type=0,phase=0,player=false){const def=CowWorld.COWS[type],s=def.scale*(player?1.2:1),col=def.color;const bob=Math.sin(phase*2)*.018;const E=(a,b,c,rx,ry,rz,color)=>this.ellipsoid(x+a*s,y+(b+bob)*s,z+c*s,rx*s,ry*s,rz*s,color);const B=(a,b,c,w,h,d,color)=>this.box(x+a*s,y+b*s,z+c*s,w*s,h*s,d*s,color);
 // Slightly awkward upright posture, narrow legs, long snout and heavy eyelids.
 for(const side of [-1,1]){const step=Math.sin(phase+side)*.035;B(side*.14,.04,step,.12,.35,.15,col);B(side*.14,.015,.055+step,.15,.09,.22,'#655b4c');E(side*.30,.63,.015,.085,.28,.095,col);E(side*.32,.41,.07,.095,.09,.11,'#b29a79');}
 E(0,.59,0,.29,.39,.24,col);E(0,.84,-.02,.19,.22,.19,col);E(0,1.07,.055,.255,.285,.245,col);E(0,.98,.26,.215,.13,.19,'#cfb794');E(0,.935,.30,.185,.038,.125,'#b89c80');
 for(const side of [-1,1]){E(side*.30,1.18,.03,.15,.065,.075,col);E(side*.32,1.18,.07,.09,.036,.04,'#b49a80');this.cone(x+side*.17*s,y+1.30*s,z+.02*s,.051*s,.20*s,'#ddd6b7');E(side*.122,1.15,.251,.069,.046,.021,'#eee8d4');E(side*.12,1.138,.271,.022,.027,.013,'#394334');B(side*.12,1.182,.258,.145,.034,.03,col);E(side*.083,1.005,.418,.017,.016,.009,'#675c4c');}
 if(player){B(0,.825,.215,.30,.055,.06,'#6a8c75');B(.12,.72,.21,.07,.13,.05,'#6a8c75');}
 if(type===3){this.cone(x,y+1.41*s,z,.29*s,.15*s,'#a46656');E(0,1.4,0,.30,.08,.23,'#b6785f');}
 if(type===4){B(0,.72,.245,.09,.13,.02,'#e8d694');}
 if(type===5){for(let i=-1;i<=1;i++)this.cone(x+i*.11*s,y+1.42*s,z+.035*s,.05*s,.16*s,'#e7cc71');}
 }
 tile(t){const {x,z}=t;for(let i=0;i<4;i++)this.box(x-.365+i*.245,-.18,z,.23,.16,.96,i%2?'#b99a67':'#c6a475');this.box(x,-.23,z-.32,.98,.09,.105,'#95754f');this.box(x,-.23,z+.32,.98,.09,.105,'#95754f');if(t.grass){this.box(x,-.018,z,.91,.085,.91,'#9aaa6b');for(let i=0;i<8;i++){const gx=x+Math.sin(i*13+x*23+z*5)*.35,gz=z+Math.cos(i*8+x*2-z*32)*.35;this.poly([[gx-.045,.07,gz],[gx+.025,.06,gz],[gx+.01+Math.sin(this.time+i)*.012,.18,gz]],i%2?'#aabb78':'#879d61');}}
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
 ocean(){const c=this.ctx,w=this.w,h=this.h,t=this.time;let g=c.createLinearGradient(0,0,w*.4,h);g.addColorStop(0,'#a5cbc4');g.addColorStop(.45,'#83babc');g.addColorStop(1,'#63a2ad');c.fillStyle=g;c.fillRect(0,0,w,h);
 // Large quiet geometric currents, then small broken foam lines.
 for(let i=0;i<22;i++){let x=((i*317.23+t*3)%(w+350))-170,y=(Math.sin(i*2.4)*.5+.5)*h;c.beginPath();c.moveTo(x,y);c.lineTo(x+170,y-60);c.lineTo(x+360,y-30);c.lineTo(x+180,y+70);c.closePath();c.fillStyle=i%2?'#d0dfcf0a':'#306d7f06';c.fill();}
 c.lineCap='round';for(let i=0;i<95;i++){let x=((Math.sin(i*132.1)*.5+.5)*w+t*(2+i%3))%(w+60)-30,y=(Math.cos(i*32.9)*.5+.5)*h;let len=8+i%5*6;c.strokeStyle=i%4===0?'#e2ead663':'#d9e9d831';c.lineWidth=i%3===0?1.5:1;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+len*.3,y-2,x+len*.65,y+2,x+len,y);c.stroke();}
 // Dream islands dissolve in the distance.
 for(let k=0;k<3;k++){const x=w*(.43+k*.24),y=h*(.19+k%2*.07);c.fillStyle='#6d999313';c.beginPath();c.moveTo(x-65,y);c.lineTo(x-36,y-14);c.lineTo(x-18,y-8);c.lineTo(x+12,y-23);c.lineTo(x+67,y);c.closePath();c.fill();}
 }
 draw(){const w=this.world,s=w.s;this.time=s.time;const small=this.w<650;const desired=small?Math.min(this.w*.136,53):Math.min(this.w*.068,89);this.scale=desired*Math.min(1,3.9/(w.radius*2));this.cx=this.w*.5+(small?0:25);this.cy=this.h*(small?.565:.56);this.ocean();const c=this.ctx;
 this.ellipse(0,-.35,0,w.radius*1.39,w.radius*.62,'#285f7029');this.ellipse(.25,-.38,.25,w.radius*1.48,w.radius*.68,'#33738517');
 for(const d of w.drops)this.ellipse(d.x,-.17,d.z,d.type==='cow'?.46:.24,.085,'#2d6a7528');
 const objects=[];for(const tile of s.tiles)objects.push({depth:tile.x+tile.z-2,fn:()=>this.tile(tile)});objects.sort((a,b)=>a.depth-b.depth);for(const o of objects)o.fn();this.flush();
 // Hand-lashed edge fence, small gaps to keep the water approachable.
 for(const tile of s.tiles){const edge=!s.tiles.some(t=>t.x===tile.x&&t.z===tile.z-1);if(edge&&tile.x%2===0){this.box(tile.x-.42,.05,tile.z-.45,.07,.43,.07,'#aa8e62');this.box(tile.x+.42,.05,tile.z-.45,.07,.43,.07,'#aa8e62');this.flush();this.line3([[tile.x-.42,.4,tile.z-.45],[tile.x,.3,tile.z-.45],[tile.x+.42,.4,tile.z-.45]],'#d7c498',1.5);}}
 // A cloth flag marks the first little patch of home.
 const flag=s.tiles[0];this.box(flag.x-.3,.02,flag.z-.30,.055,1.65,.055,'#8c7858');this.poly([[flag.x-.27,1.66,flag.z-.3],[flag.x+.32,1.60+Math.sin(this.time*2)*.03,flag.z-.3],[flag.x+.32,1.24,flag.z-.3],[flag.x-.27,1.3,flag.z-.3]],'#eee2b5');this.flush();const fp=this.project(flag.x+.015,1.39,flag.z-.3);c.save();c.fillStyle='#647b54';c.font=`bold ${Math.max(10,this.scale*.20)}px serif`;c.textAlign='center';c.fillText('牛',fp[0],fp[1]);c.restore();
 const entities=[];for(const [id,b]of Object.entries(s.buildings))entities.push({depth:b.x+b.z,fn:()=>this.building(id,b)});for(let i=1;i<s.cows.length;i++){const cow=s.cows[i];entities.push({depth:cow.x+cow.z+.1,fn:()=>this.cow(cow.x,.08,cow.z,cow.type,this.time*.7+cow.seed)});}
 const p=s.player;this.ellipse(p.x,.08,p.z,.30,.12,'#405a4438');entities.push({depth:p.x+p.z+.2,fn:()=>this.cow(p.x,.08,p.z,0,this.time*(this.moving?6:1),true)});for(const d of w.drops)entities.push({depth:d.x+d.z,fn:()=>this.drop(d)});entities.sort((a,b)=>a.depth-b.depth);for(const e of entities){e.fn();this.flush();}
 // Player indicator and rescue labels are screen-space, legible on phones.
 const pp=this.project(p.x,1.52,p.z);c.fillStyle='#fff8d8';c.beginPath();c.moveTo(pp[0]-4,pp[1]-8);c.lineTo(pp[0]+4,pp[1]-8);c.lineTo(pp[0],pp[1]-2);c.fill();
 for(const d of w.drops){if(d.type==='cow'){const q=this.project(d.x,CowWorld.COWS[d.cowType].scale*1.55,d.z);this.label(q[0],q[1],s.cows.length>=w.capacity?'扩建后接我回家':'救救牛！',d.cowType>=4?'#8c7445':'#527568');}}
 for(const e of w.effects){if(e.ring){const q=this.project(e.x,0,e.z);c.strokeStyle=`rgba(255,244,195,${e.life})`;c.lineWidth=2;c.beginPath();c.ellipse(q[0],q[1],(1-e.life)*this.scale*4,(1-e.life)*this.scale*2,0,0,TAU);c.stroke();}else{const q=this.project(e.x,.6+(2-e.life)*.35,e.z);c.globalAlpha=Math.min(1,e.life);this.label(q[0],q[1],e.text,'#416d55');c.globalAlpha=1;}}
 this.birds();
 }
 label(x,y,text,color){const c=this.ctx;c.font='10px "PingFang SC",sans-serif';const width=c.measureText(text).width+16;c.fillStyle='#fffbeaeb';c.beginPath();c.roundRect(x-width/2,y-12,width,21,9);c.fill();c.fillStyle=color;c.textAlign='center';c.fillText(text,x,y+2);}
 birds(){const c=this.ctx;for(let i=0;i<4;i++){let x=this.w*(.25+i*.18)+Math.sin(this.time*.17+i)*35,y=this.h*.31+Math.cos(this.time*.25+i*2)*23;let wing=Math.sin(this.time*4+i)*5;c.beginPath();c.moveTo(x-9,y+wing);c.quadraticCurveTo(x-3,y-4,x,y);c.quadraticCurveTo(x+4,y-4,x+9,y+wing);c.strokeStyle=i%2?'#f6efdb':'#587c76';c.lineWidth=1.8;c.stroke();}}
 portrait(canvas,type){const r=new Renderer(canvas,this.world);r.ctx.clearRect(0,0,r.w,r.h);r.ctx.fillStyle='#eaeedc';r.ctx.fillRect(0,0,r.w,r.h);r.cx=r.w/2;r.cy=r.h*.89;r.scale=type===5?39:66;r.cow(0,0,0,type,0);r.flush();}
}
root.CowRenderer=Renderer;
})(window);
