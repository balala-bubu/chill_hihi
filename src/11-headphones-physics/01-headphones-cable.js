/* ---------- headphones + cable + plug ---------- */
/* the cable has no length limit: it starts with NR0 nodes and the segment next to the plug pays out more cable whenever the line goes taut (payOut), so stretching can never pull the plug out */
const NR0=22,NMAX=140,SEG=.28;
const HOV_K=Math.pow(2*Math.PI*.75/1000,2),HOV_C=.0008;   // headphones float on a soft spring (0.75 Hz); air drag already supplies most of the damping
const hpState={s:'none',body:null,org:{x:0,y:0},att:{x:0,y:0},scale:1,rope:[],cons:[],segC:[],hov:{x:0,y:0},pin:null,drive:null,seek:0,plugAmt:0,aim:0,flash:0,grab:false,worn:false,dragNear:0};
const endB=()=>hpState.rope[hpState.rope.length-1];   // the plug end of the cable
/* Cable nodes only collide with the floor: other props can rest over the cable without being pushed or snagged. */
 const newRopeNode=()=>Bodies.circle(0,0,5,{density:.006,frictionAir:.05,friction:.4,restitution:0,collisionFilter:{category:CAT.rope,mask:CAT.floor}});
const hpRoot=new T.Group();hpRoot.visible=false;scene.add(hpRoot);
hpRoot.add(hp);hp.position.set(0,0,0);hp.visible=true;
hp.traverse(o=>{if(o.isMesh)o.userData.phys='hp';});
const hpHit=[];hp.traverse(o=>{if(o.isMesh)hpHit.push(o);});
/* A forgiving invisible grab target spans the ear cups and band; worn headphones can be small. */
const hpGrabTarget=new T.Mesh(new T.SphereGeometry(1.45,12,8),new T.MeshBasicMaterial({visible:false}));
hpGrabTarget.position.set(0,.25,0);hpGrabTarget.scale.set(1.2,1.15,.7);
hpGrabTarget.userData.phys='hp';hp.add(hpGrabTarget);hpHit.push(hpGrabTarget);
/* plug: origin = where the cable enters; the pin points to local -z */
const plug2=new T.Group();plug2.visible=false;scene.add(plug2);const plugHit=[];
{const plugM=new T.MeshStandardMaterial({color:0x2b2d30,roughness:.4}),tipM=M.metal;
 const sl=new T.Mesh(new T.CylinderGeometry(.062,.075,.2,20),M.cable);sl.rotation.x=Math.PI/2;sl.position.z=-.1;
 const bd=new T.Mesh(new T.CylinderGeometry(.115,.115,.34,24),plugM);bd.rotation.x=Math.PI/2;bd.position.z=-.37;
 const rg=new T.Mesh(new T.CylinderGeometry(.125,.125,.035,24),M.metal);rg.rotation.x=Math.PI/2;rg.position.z=-.55;
 const tp=new T.Mesh(new T.CylinderGeometry(.05,.05,.3,16),tipM);tp.rotation.x=Math.PI/2;tp.position.z=-.72;
 [sl,bd,rg,tp].forEach(m=>{m.castShadow=true;m.userData.phys='plug';plug2.add(m);plugHit.push(m);});}
const PLUG_LEN=.87;
const cableM=new T.MeshStandardMaterial({color:0x2e3033,roughness:.55});
/* cable geometry: our own tube so we can rewrite the vertices every frame without allocating */
const CSAMP=(NMAX-1)*3+1,CRAD=8;
const cableGeo=new T.BufferGeometry();
{const pos=new Float32Array(CSAMP*CRAD*3),nor=new Float32Array(CSAMP*CRAD*3),idx=[];
 for(let i=0;i<CSAMP-1;i++)for(let j=0;j<CRAD;j++){const a=i*CRAD+j,b=i*CRAD+(j+1)%CRAD,c=(i+1)*CRAD+j,d=(i+1)*CRAD+(j+1)%CRAD;idx.push(a,c,b,b,c,d);}
 cableGeo.setAttribute('position',new T.BufferAttribute(pos,3));cableGeo.setAttribute('normal',new T.BufferAttribute(nor,3));cableGeo.setIndex(idx);}
const cableMesh=new T.Mesh(cableGeo,cableM);cableMesh.castShadow=true;cableMesh.frustumCulled=false;cableMesh.visible=false;scene.add(cableMesh);
const _p=[],_tmpA=new V3(),_tmpB=new V3(),_tmpC=new V3();
for(let i=0;i<CSAMP;i++)_p.push(new V3());
const jackRing=new T.Mesh(new T.RingGeometry(.15,.21,32),new T.MeshBasicMaterial({color:ACC,transparent:true,opacity:0,toneMapped:false,depthWrite:false}));jackRing.position.set(-1.35,-2.42,FZ+.03);jackRing.renderOrder=5;player.add(jackRing);

const jackWorld=()=>({x:JACK.x,y:JACK.y});
function hpDims(){const s=clamp((L.hw-1.8)/3.4,.5,1);return s;}
function makeHeadphones(s){
  const parts=[],cup=sx=>Bodies.rectangle(sx*1.25*s*PXU,0,.62*s*PXU,1.16*s*PXU,{chamfer:{radius:14*s}});
  parts.push(cup(-1),cup(1));
  for(let k=0;k<8;k++){const th=(k+.5)/8*Math.PI,chord=2*1.25*s*Math.sin(Math.PI/16)+.06*s;
    parts.push(Bodies.rectangle(1.25*s*Math.cos(th)*PXU,-1.25*s*Math.sin(th)*PXU,chord*PXU,.16*s*PXU,{angle:-(th+Math.PI/2)}));}
  const b=Body.create({parts,density:.0007,friction:.7,frictionAir:.03,restitution:.2,collisionFilter:{category:CAT.hp,mask:CAT.floor|CAT.player}});
  return b;
}
function hpBuild(){   // creates bodies (not yet placed)
  const h=hpState;h.scale=hpDims();h.body=makeHeadphones(h.scale);
  h.org={x:-h.body.position.x,y:-h.body.position.y};              // geometry origin relative to the centre of mass (matter px)
  h.att={x:PORT.x*h.scale*PXU+h.org.x,y:-PORT.y*h.scale*PXU+h.org.y};   // cable anchor = the boot on the right cup (where the model really lets the cable out), relative to the centre of mass
  hpRoot.scale.setScalar(h.scale);
  h.rope=[];h.cons=[];h.segC=[];
  for(let i=0;i<NR0;i++)h.rope.push(newRopeNode());
  h.cons.push(Constraint.create({bodyA:h.body,pointA:h.att,bodyB:h.rope[0],pointB:{x:0,y:0},length:0,stiffness:.82,damping:.42}));
  for(let i=0;i<NR0-1;i++){const c=Constraint.create({bodyA:h.rope[i],bodyB:h.rope[i+1],length:SEG*PXU,stiffness:.88,damping:.42});h.segC.push(c);h.cons.push(c);}
  Composite.add(wld,[h.body,...h.rope,...h.cons]);
}
function hpPlace(ox,oy,vx,vy,spin){   // put the headphones' origin at world (ox,oy) with velocity (world units / s), cable trailing behind
  const h=hpState;Body.setAngle(h.body,0);Body.setPosition(h.body,{x:mxp(ox)-h.org.x,y:myp(oy)-h.org.y});
  const v={x:vx*PXU/180,y:-vy*PXU/180};Body.setVelocity(h.body,v);Body.setAngularVelocity(h.body,spin||0);
  const a={x:mxp(ox)+PORT.x*h.scale*PXU,y:myp(oy)-PORT.y*h.scale*PXU};
  const dir=Math.hypot(vx,vy)>.1?{x:-vx/Math.hypot(vx,vy),y:vy/Math.hypot(vx,vy)}:{x:1,y:0};   // matter-space direction pointing back along the flight path
  h.rope.forEach((b,i)=>{Body.setPosition(b,{x:a.x+dir.x*i*SEG*PXU*.6,y:a.y+dir.y*i*SEG*PXU*.6});Body.setVelocity(b,v);});
}
function hpSpawn(){   // headphones swoop in from above the screen, cable whipping behind, and settle into a float beside the player
  if(!PHYS)return;if(hpState.worn)hpUnwear();if(hpState.s==='none')hpBuild();
  const h=hpState,s=h.scale,hoverY=FLOOR_Y+2.5*s;
  const targetX=-(1.8+1.7*s+.25),y0=L.half+1.6,t=.9;
  const x0=clamp(targetX-3.2*t,-(L.hw-1.6),-(1.8+1.7*s));
  hpPlace(x0,y0,(targetX-x0)/t,-4,.012);
  h.hov={x:mxp(targetX)-h.org.x,y:myp(hoverY)-h.org.y};
  hpRoot.visible=true;cableMesh.visible=true;plug2.visible=true;hpState.s='free';
}
/* Brow_group axes (measured at rest, in the bone's own space): +X is across the head, +Y is UP, +Z points toward the muzzle.
   The headset model uses the same convention (cups on +-X, band arc over +Y), so it is worn with no rotation; only its size and
   offset are fitted to the ear roots (LearA/RearA sit at x=+-7.2, y=2.7, z=-8.5 in this space). */
function hpWear(){
  const h=hpState,brow=wBone('Brow_group'),left=wBone('LearA'),right=wBone('RearA');
  if(!h.body||!dog.ready||!dog.present||dog.leaving||!brow||!left||!right)return false;
  brow.updateWorldMatrix(true,true);
  const a=brow.worldToLocal(left.getWorldPosition(new V3()));
  const b=brow.worldToLocal(right.getWorldPosition(new V3()));
  const span=a.distanceTo(b);
  if(span<.001)return false;
  if(W.worn.hat)wUnequip('hat');   // hat and headphones are mutually exclusive: the hat goes back to its shelf
  const mid=a.add(b).multiplyScalar(.5);
  const fitScale=clamp((span+5.2)/2.5,4.5,9.5);
  h.worn=true;brow.add(hpRoot);hpRoot.traverse(o=>o.layers.enable(1));
  // Cup centres sit on the ear roots, band arcs over the top of the skull.
  hpSetBandLean(0);
  hp.rotation.set(0,0,0);
  hpRoot.rotation.set(0,0,0);
  hpRoot.position.set(mid.x,mid.y+.3,mid.z+.9);
  hpRoot.scale.setScalar(fitScale);
  h.dragNear=0;h.grab=false;Body.setVelocity(h.body,{x:0,y:0});Body.setAngularVelocity(h.body,0);
  W.recycleKey='';Au.snap();buzz(10);return true;
}
function hpUnwear(){
  const h=hpState;if(!h.worn)return;
  scene.attach(hpRoot);hpRoot.traverse(o=>o.layers.disable(1));h.worn=false;
  hpSetBandLean(0); // restore the original undeformed band
  hp.rotation.set(.12,.5,0); // restore free-floating presentation
  h.dragNear=0;hpRoot.scale.setScalar(h.scale);
  const p=hpRoot.position,b=h.body;
  if(b){Body.setAngle(b,0);Body.setPosition(b,{x:mxp(p.x)-h.org.x,y:myp(p.y)-h.org.y});Body.setVelocity(b,{x:0,y:0});Body.setAngularVelocity(b,0);}
  hpRoot.rotation.set(0,0,0);hpRest();W.recycleKey='';
}
function hpRest(){   // let go of the headphones: they glide a little further the way they were thrown, then float where they stop
  const h=hpState,b=h.body,s=h.scale,mx=mxp(Math.max(.5,L.hw-1.95*s));
  h.hov={x:clamp(b.position.x+b.velocity.x*22,-mx,mx),y:clamp(b.position.y+b.velocity.y*22,myp(Math.min(L.top,L.half)-1.7*s),myp(FLOOR_Y+1.5*s))};
}
function hpSettled(){const h=hpState;if(!h.body)return false;const b=h.body;return Math.hypot(b.velocity.x,b.velocity.y)<.5&&Math.hypot(b.position.x-h.hov.x,b.position.y-h.hov.y)<45;}
function ropeLens(){const r=hpState.rope;let act=0,rest=0;for(let i=0;i<r.length-1;i++)act+=Math.hypot(r[i+1].position.x-r[i].position.x,r[i+1].position.y-r[i].position.y);for(const c of hpState.segC)rest+=c.length;return {act,rest};}
function stretchRatio(){const l=ropeLens();return l.rest?l.act/l.rest:1;}
/* endless cable: when the line goes taut the segment next to the plug lengthens; once it is twice as long as the others it is split in two (no visible jump) */
function payOut(){
  const h=hpState;if(h.s==='none'||!h.segC.length)return;
  const l=ropeLens(),ex=l.act-l.rest;if(ex<=l.rest*.02)return;   // only when really stretched, not for the solver's usual wobble
  const c=h.segC[h.segC.length-1],r=h.rope;c.length+=ex*.6;
  if(c.length>2*SEG*PXU&&r.length<NMAX){
    const a=r[r.length-2],b=r[r.length-1],nb=newRopeNode(),half=c.length/2;
    Body.setPosition(nb,{x:(a.position.x+b.position.x)/2,y:(a.position.y+b.position.y)/2});Body.setVelocity(nb,{x:(a.velocity.x+b.velocity.x)/2,y:(a.velocity.y+b.velocity.y)/2});
    Composite.remove(wld,c);h.cons.splice(h.cons.indexOf(c),1);h.segC.pop();
    const c1=Constraint.create({bodyA:a,bodyB:nb,length:half,stiffness:.88,damping:.42}),c2=Constraint.create({bodyA:nb,bodyB:b,length:half,stiffness:.88,damping:.42});
    h.cons.push(c1,c2);h.segC.push(c1,c2);r.splice(r.length-1,0,nb);Composite.add(wld,[nb,c1,c2]);}
}
function plugOut(kick){   // pull the plug out of the jack
  const h=hpState;if(h.s!=='plugged')return;
  if(h.pin){Composite.remove(wld,h.pin);h.pin=null;}h.s='free';
  const e=endB();Body.setVelocity(e,{x:kick?(kick.x||0):1.2,y:kick?(kick.y||0):-1.6});
  tween(.22,k=>{h.plugAmt=1-k;},ease.out3);Au.snap();Au.click(1.5,.8);h.flash=1;
}
async function plugInsert(){
  const h=hpState;if(h.pin)return;const J=jackWorld(),e=endB();
  h.pin=Constraint.create({pointA:{x:mxp(J.x),y:myp(J.y)},bodyB:e,pointB:{x:0,y:0},length:0,stiffness:.95,damping:.3});Composite.add(wld,h.pin);
  h.s='plugged';h.seek=0;
  await tween(.27,k=>{h.plugAmt=k;},ease.out5);
  Au.thunk();jiggle();h.flash=1;
}
async function seekPlug(){   // auto-plug: the loose plug flies up in an arc, aligns itself with the jack, pushes in
  const h=hpState;if(h.s==='plugged'||h.s==='seek')return;h.s='seek';h.seek=1;h.plugAmt=0;
  const e=endB,J=()=>jackWorld(),far=()=>Math.hypot(e().position.x/PXU-J().x,-e().position.y/PXU-J().y);
  h.drive={x:J().x-.5,y:J().y-.75,sp:4.3};Au.whoosh();
  await waitFor(()=>Math.hypot(e().position.x/PXU-h.drive.x,-e().position.y/PXU-h.drive.y)<.22,2600);
  h.drive={x:J().x,y:J().y,sp:2.8,follow:true};
  await waitFor(()=>far()<.14,2400);
  h.drive=null;h.seek=0;
  await plugInsert();
}
/* every physics sub-step: gravity-defying remote, drive the plug, clamp speeds */
if(PHYS)Events.on(eng,'beforeUpdate',()=>{
  const g=eng.gravity.scale,tt=performance.now()/1000;
  if(rem.body){const b=rem.body,m=b.mass;
    Body.applyForce(b,b.position,{x:0,y:-m*g*(.985+.012*Math.sin(tt*1.7))});               // floats: gravity almost cancelled, gentle bobbing
    const w=b.angularVelocity/DT_MS,W0=.0042;b.torque=-b.inertia*(W0*W0*wrapA(b.angle)+2*.8*W0*w);   // self-righting
  }
  const h=hpState;
  if(h.body&&h.s!=='none'){   // the headphones float: their own weight is cancelled and a soft spring holds them at a hover spot that bobs a little
    const b=h.body,m=b.mass;
    if(h.worn){
      hpRoot.updateWorldMatrix(true,false);const p=hpRoot.getWorldPosition(new T.Vector3());
      Body.setAngle(b,0);Body.setPosition(b,{x:mxp(p.x)-h.org.x,y:myp(p.y)-h.org.y});
      Body.setVelocity(b,{x:0,y:0});Body.setAngularVelocity(b,0);
      const port=hp.localToWorld(new T.Vector3(1.25,-.76,0));
      h.cons[0].pointA.x=mxp(port.x)-b.position.x;h.cons[0].pointA.y=myp(port.y)-b.position.y;
    }
    if(h.grab){h.hov.x=b.position.x;h.hov.y=b.position.y;}   // being held: the hover spot just follows the hand
    else if(!h.worn){
      let ex=b.position.x-(h.hov.x+Math.sin(tt*.8)*9),ey=b.position.y-(h.hov.y+Math.sin(tt*1.3+1)*13);const ed=Math.hypot(ex,ey);if(ed>220){ex*=220/ed;ey*=220/ed;}   // spring pull is capped so the entrance stays gentle
      Body.applyForce(b,b.position,{x:-m*(HOV_K*ex+HOV_C*b.velocity.x/DT_MS),y:-m*(HOV_K*ey+HOV_C*b.velocity.y/DT_MS)});}
    if(!h.worn)Body.applyForce(b,b.position,{x:0,y:-m*g});
    const w=b.angularVelocity/DT_MS,W0=h.grab?.0018:.0032;if(!h.worn)b.torque=-b.inertia*(W0*W0*wrapA(b.angle-(h.grab?0:.05*Math.sin(tt*.9)))+2*.7*W0*w);   // keeps them upright, with a slow sway
  }
  if(h.drive&&h.s==='seek'){const e=endB();if(h.drive.follow){h.drive.x=JACK.x;h.drive.y=JACK.y;}
    const dx=mxp(h.drive.x)-e.position.x,dy=myp(h.drive.y)-e.position.y,d=Math.hypot(dx,dy)||1,sp=Math.min(h.drive.sp,d*.06+.5);
    Body.setVelocity(e,{x:dx/d*sp,y:dy/d*sp});}
  if(h.pin){h.pin.pointA.x=mxp(JACK.x);h.pin.pointA.y=myp(JACK.y);}
  if(h.s==='free'||h.s==='plugged'||h.s==='seek')for(const b of h.rope){const v=Math.hypot(b.velocity.x,b.velocity.y);if(v>18)Body.setVelocity(b,{x:b.velocity.x*18/v,y:b.velocity.y*18/v});}
  for(const b of dynBodies()){const v=Math.hypot(b.velocity.x,b.velocity.y);if(v>22)Body.setVelocity(b,{x:b.velocity.x*22/v,y:b.velocity.y*22/v});}
});
function dynBodies(){const a=[];if(rem.body)a.push(rem.body);if(hpState.body)a.push(hpState.body);if(tv.b)a.push(tv.b);return a;}

