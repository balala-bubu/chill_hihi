/* ---------- toys: the cabinet's bottom row ("物品") ----------
   Items in a slot with "tool":true (models/wardrobe/slots.json) are not worn. Tap one on the shelf to pick it, then click empty space to use it.
   First toy: the apple. It drops from the click, bounces on the floor like jelly (its own little matter-js world: apples pile up, roll and squash on every hit) and waits. The dog runs over and eats it; with no dog around it fades away after 6 seconds.
   Adding another toy = a new .dae in the "toy" slot + a case in toyUse(); eating is only for the apple. */
const TOY={sel:null,apples:[],mats:{},H:.78,R:.3,LIFE:6,MAX:12,EAT:1.5,acc:0,key:'',statics:[],eng:null,sndT:0,chipEl:$id('toyChip'),chipKey:'',err:0};
const toyIs=id=>{const it=W.items[id],sl=it&&W.slotById[it.slot];return !!(sl&&sl.tool);};
function toyChip(){const k=TOY.sel||'';if(k===TOY.chipKey)return;TOY.chipKey=k;TOY.chipEl.hidden=!k;if(k)TOY.chipEl.firstChild.textContent=(W.items[k]?W.items[k].name:'')+'　點空白處放下';}
function toySelect(id){TOY.sel=TOY.sel===id?null:id;Au.ensure();Au.click(TOY.sel?1.5:1.1,.45);buzz(8);toyChip();}
TOY.chipEl.addEventListener('click',()=>{TOY.sel=null;toyChip();});
addEventListener('keydown',e=>{if(e.key==='Escape'&&TOY.sel){TOY.sel=null;toyChip();}});
const toyDogCan=()=>dog.ready&&dogAnyOn()&&!PET.perch&&!PET.mini;
/* is this pointer position empty space (not the player, an album, the CD, headphones, the dog, the cabinet or the album shelf)? */
function toyBlank(e){
  if(!TOY.sel||!PHYS||PET.mini||busy||pd||W.drag||W.sd||(state!=='home'&&state!=='stage'))return false;
  setNDC(e);
  if(pick()||wPick(e.clientX,e.clientY)||onShelf()||dogHit(e.clientX,e.clientY)||jobHit(e)||chairHit(e)||ballAt(e))return false;
  const q=planeHit(0);if(W.vis>.3&&q&&q.x>W.root.position.x-W.Wc/2)return false;
  return true;
}
function toyPlace(e){
  if(!toyBlank(e))return false;
  const it=W.items[TOY.sel];if(!it)return false;
  if(it.id==='t_pikmin')return pkRelease();   // 03-pikmin.js: the pikmin hanging from the pointer lets go
  const q=planeHit(FLOOR_Z);if(!q)return false;
  toySpawn(it,q.x,q.y);return true;
}
cvs.addEventListener('pointermove',e=>{if(TOY.sel&&toyBlank(e))cvs.style.cursor='crosshair';});   // registered after the other pointermove handlers, so it has the last word on the cursor
/* apples live in their own small matter-js world (same units as the main one: x*100, y*-100): rounded blocks (so they can be stacked) that pile up and bounce a little.
   every hit also sets a spring (a.j) that squashes the apple along the hit direction and wobbles back: the jelly feel */
if(PHYS){TOY.eng=Engine.create({positionIterations:10,velocityIterations:8});TOY.eng.gravity.x=0;TOY.eng.gravity.y=1;TOY.eng.gravity.scale=.0026;
  Events.on(TOY.eng,'collisionStart',ev=>{
    for(const p of ev.pairs){
      const A=p.bodyA,B=p.bodyB,n=p.collision.normal,vn=Math.abs((A.velocity.x-B.velocity.x)*n.x+(A.velocity.y-B.velocity.y)*n.y)*120/PXU;   // closing speed in world units per second
      if(vn<1)continue;
      for(const b of [A,B])if(b.apple){const a=b.apple;a.jv+=Math.min(vn*.55,4.2);a.jn.x=Math.abs(n.x);a.jn.y=Math.abs(n.y);}
      
    }});}
function toyBounds(){   // floor and side walls follow the screen
  const key=FLOOR_Y.toFixed(2)+'/'+L.hw.toFixed(2);if(key===TOY.key)return;TOY.key=key;
  TOY.statics.forEach(b=>Composite.remove(TOY.eng.world,b));
  const W=L.hw-.15,f={isStatic:true,friction:1,restitution:.25};
  TOY.statics=[Bodies.rectangle(0,myp(FLOOR_Y+.02)+250,mxp(W)*2+4000,500,f),Bodies.rectangle(-mxp(W)-250,0,500,24000,f),Bodies.rectangle(mxp(W)+250,0,500,24000,f)];
  Composite.add(TOY.eng.world,TOY.statics);
  for(const a of TOY.apples)if(a.body)Body.setPosition(a.body,{x:clamp(a.body.position.x,-mxp(W)+40,mxp(W)-40),y:Math.min(a.body.position.y,myp(FLOOR_Y+.02+TOY.R))});
}
function toyBodyAdd(a,x,y){
  const d=TOY.R*2*PXU;   // a rounded block as wide and tall as the fruit: round apples would roll off each other, these pile up like crates (the picture on top is still the round apple)
  const b=Bodies.rectangle(mxp(x),myp(y),d,d*.98,{chamfer:{radius:d*.2},restitution:.25,friction:1,frictionStatic:1.2,frictionAir:.02,density:.0012,slop:.02});
  Body.setInertia(b,b.inertia*25);   // hardly turns at all: they land, wobble (the jelly spring below) and stay
  b.apple=a;a.body=b;Composite.add(TOY.eng.world,b);return b;
}
function toySpawn(it,x,y){
  if(it.id==='t_ball'){ballSpawn(it,x,y);return;}   // the ball (15-wardrobe/04-ball.js)
  if(it.id==='t_chair'){if(chairSpawn(x,y)){TOY.sel=null;toyChip();}return;}   // the froggy chair (15-wardrobe/05-chair.js)
  if(it.id==='t_job'){if(jobSpawn(x,y)){TOY.sel=null;toyChip();}return;}   // the part-time job set (15-wardrobe/03-job.js): not an apple
  const g=it.geo;if(!g.boundingBox)g.computeBoundingBox();const b=g.boundingBox,k=TOY.H/(b.max.y-b.min.y);
  const mat=TOY.mats[it.id]||(TOY.mats[it.id]=(()=>{const m=it.mat.clone();m.transparent=false;m.depthWrite=true;m.alphaTest=.02;return m;})());   // the texture is fully opaque: no sorting trouble
  const m=new T.Mesh(g,mat);m.scale.setScalar(k);
  m.position.set(-(b.min.x+b.max.x)/2*k,-(b.min.y+(b.max.x-b.min.x)/2)*k,-(b.min.z+b.max.z)/2*k);   // pivot = the middle of the round fruit (leaf and stem stick out above it)
  const rot=new T.Group(),out=new T.Group();rot.add(m);out.add(rot);out.scale.setScalar(.001);scene.add(out);
  const sh=new T.Mesh(wSoftGeo,wMat.soft.clone());sh.renderOrder=1;scene.add(sh);
  const lim=Math.max(1,L.hw-2.4);   // keeps room at the screen edge for the dog's head when it bends down to eat
  if(TOY.apples.length>=TOY.MAX)toyRemove(TOY.apples[0]);
  const a={it,g:out,rot,sh,x:clamp(x,-lim,lim),y:Math.max(y,FLOOR_Y+1.2),z:FLOOR_Z,ang:0,va:0,att:0,st:'live',t:0,calm:0,wait:0,left:TOY.LIFE,r:1,j:0,jv:0,jn:{x:0,y:1},body:null};
  toyBodyAdd(a,a.x,a.y);Body.setVelocity(a.body,{x:(Math.random()-.5)*.6,y:0});
  TOY.apples.push(a);Au.click(1.8,.4);
}
function toyRemove(a){if(a.body){Composite.remove(TOY.eng.world,a.body);a.body=null;}scene.remove(a.g);scene.remove(a.sh);a.sh.material.dispose();const i=TOY.apples.indexOf(a);if(i>=0)TOY.apples.splice(i,1);if(dog.eat&&dog.eat.a===a)dog.eat=null;}
const toyOnFloor=a=>a.y-TOY.R-FLOOR_Y<.5;   // the dog can only reach an apple that lies on the floor, not one on top of a pile
/* the apple the dog should go for: the nearest one (an apple on the floor counts before one on a pile) that is not already being eaten */
function toyTarget(){
  if(!toyDogCan())return null;
  if(dog.eat)return dog.eat.a;
  let best=null,bd=1e9;const bu=dogBuddy();
  for(const a of TOY.apples)if(a.st==='live'){if(bu&&Math.abs(a.x-bu.x)<Math.abs(a.x-dog.x)-.01)continue;   /* the other puppy is nearer to this apple: it is its */
    const d=Math.abs(a.x-dog.x)+(toyOnFloor(a)?0:4);if(d<bd){bd=d;best=a;}}
  return best;
}
function toyEatCancel(){if(dog.eat){const a=dog.eat.a;dog.eat=null;if(a.st==='eat'){a.st='live';a.r=1;a.att=0;a.calm=0;toyBodyAdd(a,a.x,a.y);}}}   // it drops back into the world where it is
/* called by dogFrame while mode==='eat': start the meal once the apple lies in front of the lips, then bow, take it into the mouth and chew it down in three bites. returns {bow,jaw} */
function toyEat(dt,moving,tz,a0){
  let E=dog.eat;
  if(!E&&a0&&a0.st==='live'&&a0.calm>.2&&toyOnFloor(a0)&&!moving&&Math.abs(dog.z-tz)<.25){const f=(a0.x-dog.x)*dog.fd;if(f<=DOG_BITE.stand+.25&&f>-.3){
    E=dog.eat={a:a0,t:0,n:0,x0:a0.x,y0:a0.y,z0:a0.z};a0.st='eat';if(a0.body){Composite.remove(TOY.eng.world,a0.body);a0.body=null;}}}   // the apple leaves the physics world: from here on it is carried by the mouth
  if(!E)return {bow:0,jaw:0};
  const a=E.a;E.t+=dt;const p=E.t/TOY.EAT,ss=(u)=>{u=clamp(u,0,1);return u*u*(3-2*u);};
  const bow=Math.sin(Math.min(1,p)*Math.PI);
  const att=ss((p-.22)/.2);                                  // the apple travels from the floor into the mouth
  a.att=att;a.r=1-.96*ss((p-.42)/.5);                        // upright in the mouth, shrinking as it is chewed
  const thr=[.5,.67,.84];while(E.n<3&&p>=thr[E.n]){E.n++;buzz(6);a.jv+=3;a.jn.x=a.jn.y=.7;}   // every bite squashes it
  let jaw=0;if(p>.24&&p<.95)jaw=.38*Math.abs(Math.sin((p-.24)/.7*Math.PI*3));
  if(dog.mouthL&&dog.bones[dog.biteBone]){
    DOGX.mw.copy(dog.mouthL);dog.bones[dog.biteBone].o.localToWorld(DOGX.mw);
    const mx=DOGX.mw.x+Math.sin(dog.ry)*.4,my=DOGX.mw.y+.08,mz=DOGX.mw.z+.95;   // held out in front of the lips and toward the camera (the dog is seen from the side, its cheek and ear would hide it otherwise)
    a.x=lerp(E.x0,mx,att);a.y=lerp(E.y0,my,att);a.z=lerp(E.z0,mz,att);}
  if(p>=1){toyRemove(a);dog.eat=null;}
  return {bow,jaw};
}
function toyFrame(dt,time){
  toyChip();
  try{pkFrame(dt);}catch(e){if(!PK.err){PK.err=1;console.warn('pikmin',e);}}
  if(!PHYS||!TOY.eng)return;
  const can=toyDogCan();toyBounds();
  if(TOY.apples.some(a=>a.body)||BALL.list.length){TOY.acc+=Math.min(dt,.05);let n=0;while(TOY.acc>=1/120&&n<6){Engine.update(TOY.eng,1000/120);TOY.acc-=1/120;n++;}}else TOY.acc=0;
  for(let i=TOY.apples.length-1;i>=0;i--){
    const a=TOY.apples[i];a.t+=dt;
    if(a.body){
      const b=a.body;a.x=b.position.x/PXU;a.y=-b.position.y/PXU;a.ang=-b.angle;{const q=Math.PI/4,tg=a.ang-Math.round(a.ang/q)*q;a.va+=(tg-a.va)*(1-Math.exp(-dt*16));}   // drawn upright: only the wobble between the flat sides shows, not the 45 degree steps
      if(b.speed<.3&&Math.abs(b.angularVelocity)<.03)a.calm+=dt;else a.calm=0;
      if(a.calm>.35){   // lying still
        if(can){a.wait+=dt;if(a.wait>25){toyRemove(a);continue;}}   // safety: the dog is around but busy for too long
        else{a.left-=dt;if(a.left<=0){toyRemove(a);continue;}}       // nobody to eat it: gone after 6 seconds
      }
    }
    /* jelly: a damped spring on the squash amount. positive = squashed along the hit direction (and a little fatter across it) */
    for(let k=0;k<2;k++){const h=dt/2;a.jv+=(-300*a.j-9*a.jv)*h;a.j+=a.jv*h;}
    a.j=clamp(a.j,-.3,.34);
    const jx=a.j*(a.jn.y*.55-a.jn.x),jy=a.j*(a.jn.x*.55-a.jn.y);
    const fade=a.body&&a.calm>.35&&!can?clamp(a.left/.7,0,1):1,appear=Math.min(1,a.t/.11),f=Math.max(.001,appear*a.r*fade);
    a.g.position.set(a.x,a.y,a.z);a.g.scale.set(f*(1+jx),f*(1+jy),f*(1+a.j*.25));
    a.rot.rotation.z=a.va*(1-a.att);
    const h=Math.max(0,a.y-TOY.R-FLOOR_Y),lift=a.st==='eat'?clamp(h/1.5,0,1):0,sz=TOY.H*1.35/(1+h*.22)*(1-lift)*fade*appear*a.r;
    a.sh.visible=sz>.01&&h<3;a.sh.position.set(a.x,FLOOR_Y+.012,a.z);a.sh.scale.set(Math.max(.001,sz),1,Math.max(.001,sz*.55));
  }
  try{ballFrame(dt,time);}catch(e){if(!BALL.err){BALL.err=1;console.warn('ball',e);}}
}
