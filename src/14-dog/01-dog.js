/* ---------- dog: a rigged puppy that runs in from the left, watches the pointer, chases a dragged CD and sits in front of the TV ---------- */
const dogFresh=()=>({pop:1,pet2:0,g:new T.Group(),ready:false,failed:false,present:false,leaving:false,wantShow:false,
  x:-20,z:2.6,ry:.4,mode:'idle',move:0,gait:0,sit:0,hop:0,hopT:0,lookYaw:0,lookPitch:0,blinkT:2,blink:0,earT:3,earL:0,earR:0,earWear:0,wag:0,fd:1,job:0,grab:null,mouthL:null,
  bones:{},acc:{},scale:2.3/53.7,footLift:.75,nextHop:0,ptr:{x:0,y:.05,t:0,cx:0,cy:0},
  lie:{s:'none',amt:0,sign:1,ryL:1.25,petT:0,retried:false,fail:false,failAt:.5,tt:0,a0:0,fast:false},rg:null,watchT:0,trotX:null,glT:4,glance:0});
const dog=dogFresh();
dog.g.visible=false;scene.add(dog.g);
addEventListener('pointermove',e=>{dog.ptr.x=e.clientX/innerWidth*2-1;dog.ptr.y=-(e.clientY/innerHeight*2-1);dog.ptr.cx=e.clientX;dog.ptr.cy=e.clientY;dog.ptr.t=performance.now();},{passive:true});
/* petting: a click on the dog (ray vs. a body-sized ellipsoid in the dog's own space) makes it flop over for belly rubs */
const dogHitX={r:new T.Raycaster(),n:new T.Vector2(),inv:new T.Matrix4(),o:new T.Vector3(),d:new T.Vector3(),C:new T.Vector3(0,22,2),R:new T.Vector3(30,34,54)};
function dogHit1(cx,cy){   // is the pointer on THIS (loaded) puppy? (03-dogs.js: dogHit also looks at the other one)
  if(!dog.ready||!dog.present||dog.leaving)return false;
  dogHitX.n.set(cx/innerWidth*2-1,-(cy/innerHeight*2-1));dogHitX.r.setFromCamera(dogHitX.n,cam);
  dog.g.updateMatrixWorld();dogHitX.inv.copy(dog.g.matrixWorld).invert();
  const o=dogHitX.o.copy(dogHitX.r.ray.origin).applyMatrix4(dogHitX.inv).sub(dogHitX.C).divide(dogHitX.R),d=dogHitX.d.copy(dogHitX.r.ray.direction).transformDirection(dogHitX.inv).divide(dogHitX.R);
  const a=d.dot(d),b=2*o.dot(d),c=o.dot(o)-1,disc=b*b-4*a*c;
  return disc>=0&&(-b+Math.sqrt(disc))>0;
}
function dogPet(){
  const Lc=dog.lie;if(!dog.ready||!dog.present||dog.leaving||Lc.s==='trip')return;
  if(PET.perch){dog.pet2=1.2;Au.click(.5,.6);return;}   // lying on the player: it wiggles happily instead of rolling over
  if(cd&&(cd.mode==='carried'||dog.grab))return;   // busy with a CD: the dog does not flop over
  if(Lc.s==='none'){Lc.s='down';Lc.ryL=dog.ry>=0?1.25:-1.25;Lc.sign=dog.ry>=0?-1:1;Lc.retried=false;Lc.fast=false;Au.click(.5,.6);}
  else if(Lc.s==='up'){Lc.s='down';Lc.fast=false;}
  Lc.petT=performance.now()/1000;
}
addEventListener('pointerdown',e=>{if(e.target&&e.target.tagName==='CANVAS'&&grab.kind!=='hp'&&!(typeof wPick==='function'&&W.ready&&wPick(e.clientX,e.clientY))&&dogPetAt(e.clientX,e.clientY));},{passive:true});
const DOGX={AX:{u:new T.Vector3(0,1,0),r:new T.Vector3(1,0,0),f:new T.Vector3(0,0,1)},q:new T.Quaternion(),q2:new T.Quaternion(),v:new T.Vector3(),v2:new T.Vector3(),p:new T.Vector3(),pt:new T.Vector3(),pd:new T.Vector3(),mw:new T.Vector3()};
/* the pointer projected onto the vertical plane at depth z (where the dog stands) */
function dogPtrAt(z,out){out.set(dog.ptr.x,dog.ptr.y,.5).unproject(cam);DOGX.pd.copy(out).sub(cam.position).normalize();
  return out.copy(cam.position).addScaledVector(DOGX.pd,(cam.position.z-z)/Math.max(.001,-DOGX.pd.z));}
async function loadDog(){
  try{
    const [meta,buf]=await Promise.all([fetch('models/dog.json').then(r=>{if(!r.ok)throw new Error('dog.json '+r.status);return r.json();}),fetch('models/dog.bin').then(r=>{if(!r.ok)throw new Error('dog.bin '+r.status);return r.arrayBuffer();})]);
    const tl=new T.TextureLoader(),lt=(u,srgb)=>new Promise((res,rej)=>tl.load(u,t=>{if(srgb)t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;res(t);},undefined,rej));
    /* colour maps are sRGB; normal / roughness / occlusion / specular are data. fur strips carry their shape in the alpha channel */
    const [tb,tf,tN,tR,tA,tS,tFA]=await Promise.all([lt('models/dog_body.png',1),lt('models/dog_fur.png',1),lt('models/dog_normal.png'),lt('models/dog_rough.png'),lt('models/dog_ao.png'),lt('models/dog_spec.png'),lt('models/dog_furao.png')]);
    const mat={
      body:new T.MeshPhysicalMaterial({map:tb,normalMap:tN,normalScale:new T.Vector2(.9,.9),roughness:1,roughnessMap:tR,metalness:0,aoMap:tA,aoMapIntensity:1,specularIntensity:.45,specularIntensityMap:tS,
        envMapIntensity:.5}),
      fur:new T.MeshStandardMaterial({map:tf,aoMap:tFA,aoMapIntensity:1,transparent:true,alphaTest:.02,depthWrite:false,side:T.DoubleSide,roughness:.95,metalness:0,envMapIntensity:.5}),
      whisk:new T.MeshStandardMaterial({color:0xf6f3ea,roughness:.6,side:T.DoubleSide,envMapIntensity:.5})};
    dog.mat=mat;
    const byNode=new Map(meta.meshes.map(m=>[m.node,m]));
    const attr=(m,k,Arr)=>{const a=m.attrs[k];return new T.BufferAttribute(new Arr(buf,a.off,a.count*a.size),a.size);};
    const objs=meta.nodes.map((n,i)=>{
      let o;const m=byNode.get(i);
      if(m){const g=new T.BufferGeometry();
        g.setAttribute('position',attr(m,'position',Float32Array));g.setAttribute('normal',attr(m,'normal',Float32Array));g.setAttribute('uv',attr(m,'uv',Float32Array));g.setAttribute('uv1',g.attributes.uv);g.setAttribute('uv2',g.attributes.uv);   // occlusion maps share the one UV set
        g.setAttribute('skinIndex',attr(m,'skinIndex',Uint16Array));g.setAttribute('skinWeight',attr(m,'skinWeight',Float32Array));
        const mi=meta.meshes.indexOf(m),kind=mi===2?'whisk':mi===1?'fur':'body';   // export order: body, fur, whisker
        o=new T.SkinnedMesh(g,mat[kind]);o.castShadow=kind==='body';o.renderOrder=kind==='body'?0:2;o.receiveShadow=false;o.frustumCulled=false;}
      else o=n.t==='B'?new T.Bone():new T.Object3D();
      o.name=n.n;o.position.fromArray(n.pos);o.quaternion.fromArray(n.q);o.scale.fromArray(n.s);return o;});
    meta.nodes.forEach((n,i)=>{if(n.p>=0)objs[n.p].add(objs[i]);});
    const fix=new T.Group();fix.rotation.x=Math.PI/2;fix.add(objs[0]);
    const SPN=1.1/dog.scale,pv=new T.Group(),rg=new T.Group(),inn=new T.Group();pv.position.y=SPN;inn.position.y=-SPN;   // roll about the spine, not the feet
    inn.add(fix);rg.add(inn);pv.add(rg);dog.g.add(pv);dog.rg=rg;dog.inn=inn;dog.fix=fix;
    dog.g.scale.setScalar(dog.scale);dog.g.updateMatrixWorld(true);
    meta.meshes.forEach(m=>{const o=objs[m.node],bones=m.bones.map(i=>objs[i]),inv=new Float32Array(buf,m.inv,bones.length*16),bi=[];
      for(let i=0;i<bones.length;i++)bi.push(new T.Matrix4().fromArray(inv,i*16));
      o.bind(new T.Skeleton(bones,bi),new T.Matrix4().fromArray(m.bind));});
    /* animated bones: the OUTER node of each duplicated pair (the inner one is its child and follows) */
    ['Hip','Waist','Bust','Neck','Head','jawA','UplidL','UplidR','LearA','LearB','RearA','RearB','tailA','tailB','tailC','ClavicleL','ClavicleR','ShoulderL','ShoulderR','LegL','LegR','Brow_group'].forEach(nm=>{
      const i=meta.nodes.findIndex(n=>n.t==='B'&&n.n===nm);if(i<0)return;const o=objs[i],pq=new T.Quaternion();o.parent.getWorldQuaternion(pq);
      dog.bones[nm]={o,q0:o.quaternion.clone(),pqi:pq.invert()};});
    /* the bite point between the lips, remembered in the head bone's own space so it follows every head turn and bob (rest-pose spot in the dog's model space) */
    dog.g.updateMatrixWorld(true);
    if(dog.bones.Head)dog.mouthL=dog.bones.Head.o.worldToLocal(dog.g.localToWorld(new T.Vector3(DOG_BITE.mx,DOG_BITE.my,DOG_BITE.mz)));
    dog.g.traverse(o=>o.layers.enable(1));
    dogVarReg0();   // 14-dog/02-dog2.js: remember this puppy as variant 0
    dog.ready=true;
    if(dog.wantShow)dogToggle();
  }catch(e){console.warn('dog failed to load',e);dog.failed=true;remLit(3,false);}
}
function dogAdd(n,ax,a){const k=dog.ak&&dog.ak[n];(dog.acc[n]||(dog.acc[n]=[])).push([ax,k===undefined?a:a*k]);}   // dog.ak: per-puppy strength of a bone's motion (second puppy)
function dogApply(){
  for(const nm in dog.bones){const b=dog.bones[nm],list=dog.acc[nm];DOGX.q.copy(b.q0);
    if(list)for(const [ax,a] of list){DOGX.v.copy(DOGX.AX[ax]).applyQuaternion(b.pqi);DOGX.q2.setFromAxisAngle(DOGX.v,a);DOGX.q.premultiply(DOGX.q2);}
    b.o.quaternion.copy(DOGX.q);}
  dog.acc={};
}
const angDiff=(a,b)=>{let d=(b-a)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;};
function dogFrame(dt,time){
  if(!dog.ready||!dog.present)return;
  const hw=L.hw,rank=dogRank(),isOwner=DOGS.cdOwn===DOGS.me,home=clamp((PET.mini?0:-clamp(hw-1.6,2.4,3.3))+(dogCount()-1-rank)*DOGS.gap,-hw+1.4,hw-1.4);   // the newcomer walks in from the left and takes the left spot, the one already there moves right   // mini desktop pet: the dog stands in the middle; with two puppies each has its own spot
  const dragging=!!(isOwner&&cd&&cd.mode==='drag'&&cd.committed&&cd.pos);
  const tvOn=tv.b&&(tv.state==='on'||(tv.state==='falling'&&tv.landed));
  const ptA=dogPtrAt(dog.z,DOGX.pt);                                                   // the pointer on the dog's depth plane
  if(dog.leaving&&isOwner&&cd&&cd.mode==='carried'){cd.mode='floor';cd.vel.set(0,0);dog.grab=null;}   // leaving: it puts the CD down where it stands
  const cdFloor=!!(isOwner&&cd&&cd.mode==='floor'&&cd.flat>.6&&dog.lie.s==='none'&&!dog.leaving);   // a CD lies on the floor and the dog is free to fetch it
  const carrying=!!(isOwner&&cd&&cd.mode==='carried');
  if(dog.grab&&!(cd&&(cd.mode==='floor'||cd.mode==='carried')))dog.grab=null;          // someone else took the CD mid-bite
  /* 1. what is the dog doing? */
  const soc=dogSocial(dt,hw);
  let tx=home,tz=1.9,spd=4.2,mode='idle';
  if(PET.perch){mode='perch';tx=dog.x;tz=dog.z;}   // lying on top of the player: it does not walk anywhere
  else if(dog.leaving){tx=-(hw+3.4);spd=8;mode='out';}
  else if(dragging){mode='chase';tx=clamp(cd.pos.x,-hw+1.1,hw-1.1);tz=1.9;spd=8.5;}
  else if(carrying||cdFloor){
    /* fetch: run to a spot where the CD lies right in front of the lips, bite it, then carry it after the pointer and hold it out. it only ever walks forward:
       if the target ends up behind it, it turns around instead of backing up */
    mode=carrying?'bring':'fetch';const goal=carrying?ptA.x:cd.pos.x;
    let a=(goal-dog.x)*dog.fd;if(a<-.3){dog.fd=-dog.fd;a=-a;}
    tz=FLOOR_Z;spd=7.5;tx=(dog.grab||a<=DOG_BITE.stand)?dog.x:clamp(goal-dog.fd*DOG_BITE.stand,-hw+1.1,hw-1.1);}
  else if(toyTarget()){   // an apple (see 15-wardrobe/02-toys.js): run to where it lies right in front of the lips, like fetching a CD. it only walks forward, otherwise it turns around
    mode='eat';const ap=toyTarget();let a=(ap.x-dog.x)*dog.fd;if(a<-.3){dog.fd=-dog.fd;a=-a;}
    tz=FLOOR_Z;spd=7.5;tx=(dog.eat||a<=DOG_BITE.stand)?dog.x:clamp(ap.x-dog.fd*DOG_BITE.stand,-hw+1.1,hw-1.1);}
  else if(soc&&soc.mode){mode=soc.mode;tx=soc.tx;spd=soc.spd;}   // the other puppy is busy / has left (03-dogs.js)
  else if(jobSpot(rank,dogCount())){const js=jobSpot(rank,dogCount());mode='job';tx=js.x;tz=js.z;spd=5.5;}   // the part-time job set stands: go behind the counter (15-wardrobe/03-job.js)
  else if(tvOn){mode='tv';tx=tv.b.position.x/PXU-1.3-3.4*rank;tz=2.9;spd=5.2;}
  /* belly-up state machine: down -> lie (as long as it is being petted) -> up (slowly; now and then it flops back) */
  const Lc=dog.lie,nowS=performance.now()/1000;
  if(dog.leaving&&Lc.s!=='none'){Lc.s='none';}
  if(dragging&&Lc.s!=='none'&&Lc.s!=='trip'){Lc.s='up';Lc.fast=true;Lc.fail=false;}
  switch(Lc.s){
    case 'down':Lc.amt=Math.min(1,Lc.amt+dt/.7);if(Lc.amt>=1)Lc.s='lie';break;
    case 'lie':if(dogHit(dog.ptr.cx,dog.ptr.cy))Lc.petT=nowS;
      if(nowS-Lc.petT>(Lc.retried?1.2:2.8)){Lc.s='up';Lc.fail=!Lc.retried&&Math.random()<.16;Lc.failAt=.4+Math.random()*.3;}break;
    case 'up':Lc.amt-=dt*(Lc.fast?1:1/2.8);
      if(Lc.fail&&(1-Lc.amt)>Lc.failAt){Lc.s='trip';Lc.tt=0;Lc.a0=Lc.amt;Lc.retried=true;Lc.fail=false;Au.crash(.35);camShake=Math.max(camShake,.3);}
      else if(Lc.amt<=0){Lc.amt=0;Lc.s='none';}break;
    case 'trip':Lc.tt+=dt;{const k=clamp(Lc.tt/.45,0,1);Lc.amt=Lc.a0+(1.04-Lc.a0)*ease.out3(k);if(Lc.tt>.45+.25){Lc.amt=1;Lc.s='lie';Lc.petT=nowS;}}break;
    default:if(Lc.amt>0)Lc.amt=Math.max(0,Lc.amt-dt*2);
  }
  const eo=Lc.amt*Lc.amt*(3-2*Math.min(1,Lc.amt));
  if(Lc.s!=='none'){tx=dog.x;tz=dog.z;mode='lie';}
  let jfinal=mode==='job';
  if(mode!=='lie'){const rt=jobRoute(tx,tz);if(rt){tx=rt[0];tz=rt[1];jfinal=false;}}   // the counter is in the way: round its left end
  dog.mode=mode;
  if(dog.eat&&mode!=='eat')toyEatCancel();   // something more important came up: the apple stays where it is
  if(PET.perch){   // pops in and out (a quick scale) instead of running in from the side
    dog.pop+=((dog.leaving?0:1)-dog.pop)*(1-Math.exp(-dt*(dog.leaving?14:8)));
    if(dog.leaving&&dog.pop<.03){dog.present=false;dog.leaving=false;dog.g.visible=false;dog.pop=0;return;}
  }
  /* 2. move */
  const dx=tx-dog.x,dz=tz-dog.z,dist=Math.abs(dx);
  let vx=0;
  if(dist>.12){const want=Math.sign(dx)*Math.min(spd,dist*5.5+.8);vx=want;dog.x+=want*dt;if((dx>0)!==(tx-dog.x>0))dog.x=tx;}
  dog.z+=dz*(1-Math.exp(-dt*3));
  if(!PET.perch&&dog.leaving&&dog.x<-(hw+2.2)){dog.present=false;dog.leaving=false;dog.g.visible=false;return;}
  const moving=Math.abs(vx)>.35;
  dog.move+=((moving?clamp(Math.abs(vx)/6,.35,1.25):0)-dog.move)*(1-Math.exp(-dt*9));
  dog.gait+=dt*(6+Math.abs(vx)*1.15)*(moving?1:0);
  dog.job+=(((mode==='job'&&jfinal&&!moving&&Math.abs(dog.z-tz)<.25&&Math.abs(dog.x-tx)<.2)?1:0)-dog.job)*(1-Math.exp(-dt*(mode==='job'?4:8)));   // paws up on the counter
  /* 2b. the bite: it stops with the CD in front of its lips, bows down to it, snatches it up into the mouth and lifts its head again */
  let bow=0,jawX=carrying?.12:0;
  if(mode==='fetch'&&!dog.grab){const a=(cd.pos.x-dog.x)*dog.fd;if(!moving&&Math.abs(dog.z-tz)<.25&&a<=DOG_BITE.stand+.25&&a>-.3)dog.grab={t:0,at:false};}
  if(dog.grab){const G=dog.grab;G.t+=dt;const p=G.t/DOG_BITE.dur;
    bow=Math.sin(Math.min(1,p)*Math.PI);jawX=p<.45?.4*Math.sin(p/.45*Math.PI/2):.12;
    if(!G.at&&p>=.45&&cd.mode==='floor'){G.at=true;cd.mode='carried';cd.att=0;cd.fp0.copy(cd.pos);Au.click(1.5,.8);}   // snatched: from here on the CD travels with the mouth
    if(p>=1)dog.grab=null;}
  let eatJaw=0;
  if(mode==='eat'){const E=toyEat(dt,moving,tz,toyTarget());bow=Math.max(bow,E.bow);eatJaw=E.jaw;}   // 2c. the apple: bow, take it into the mouth, chew
  /* 3. sit when parked in front of the TV */
  const sitWant=((mode==='tv'||mode==='sitby')&&!moving&&Math.abs(dog.z-tz)<.15)?1:0;
  dog.sit+=(sitWant-dog.sit)*(1-Math.exp(-dt*(sitWant?5:9)));
  /* 4. facing */
  DOGX.p.set(dog.ptr.x,dog.ptr.y,.5).unproject(cam);DOGX.v.copy(DOGX.p).sub(cam.position).normalize();
  const tpl=(cam.position.z-dog.z)/Math.max(.001,-DOGX.v.z);DOGX.p.copy(cam.position).addScaledVector(DOGX.v,tpl);   // pointer projected onto the dog's depth plane
  let look=DOGX.p;                                                                                                       // where the head aims (world)
  let ryT;
  if(PET.perch){ryT=DOG_PERCH.ry+Math.sin(time*.6)*.05;}
  else if(Lc.s!=='none'&&Lc.amt>.12){ryT=Lc.ryL;look=DOGX.p;}
  else if(mode==='job'&&dog.job>.3){ryT=0;}   // behind the counter, facing the customers (= the camera)
  else if(mode==='tv'&&dog.sit>.5){ryT=Math.PI-.4;look=DOGX.v2.set(tv.b.position.x/PXU,-tv.b.position.y/PXU+.3,0);}
  else if(mode==='fetch'||mode==='bring'||mode==='eat'){ryT=dog.fd*1.2;if(mode==='fetch')look=DOGX.v2.set(cd.pos.x,cd.pos.y,cd.pos.z);else if(mode==='eat'){const ap=toyTarget();if(ap)look=DOGX.v2.set(ap.x,ap.y+.3,ap.z);}}
  else if(moving)ryT=vx>0?1.2:-1.2;
  else if(mode==='chase'){ryT=clamp(Math.atan2(cd.pos.x-dog.x,4),-1,1);look=DOGX.v2.set(cd.pos.x,cd.pos.y,.8);}
  else if(soc&&soc.look){ryT=clamp(Math.atan2(soc.look.x-dog.x,3.2),-1.2,1.2);look=DOGX.v2.set(soc.look.x,soc.look.y,soc.look.z);}   // watching / glancing at the other puppy
  else ryT=clamp(Math.atan2(DOGX.p.x-dog.x,4.5),-.95,.95)*.8;
  dog.ry+=angDiff(dog.ry,ryT)*(1-Math.exp(-dt*(moving?10:5)));
  /* 5. hops: when the dragged CD is just above, the dog jumps for it */
  let hopY=0;
  if(((mode==='chase'&&cd.pos.y-FLOOR_Y<4.6)||(mode==='bring'&&!dog.grab&&ptA.y>FLOOR_Y+2.4))&&!moving&&performance.now()>dog.nextHop){dog.hopT=.0001;dog.nextHop=performance.now()+900+Math.random()*500;}   // chase: jumps for the dragged CD; bring: jumps to hand over the CD when the pointer is up high
  if(dog.hopT>0){dog.hopT+=dt;const k=dog.hopT/.5;if(k>=1)dog.hopT=0;else hopY=Math.sin(k*Math.PI)*.85;}
  /* 6. place */
  const bob=moving?Math.abs(Math.sin(dog.gait*.5))*.1*dog.move:0;
  const pw=PET.perch&&dog.pet2>0?(dog.pet2=Math.max(0,dog.pet2-dt),Math.min(1,dog.pet2/.6)):0;   // happy wiggle after a click
  if(PET.perch){   // lying on the top face of the floating player: follows its drift, its drag and its bobbing
    dog.g.position.set(player.position.x+DOG_PERCH.dx,player.position.y+PH/2+(dog.footLift*dog.scale-DOG_PERCH.drop)*dog.pop+Math.abs(Math.sin(time*13))*.08*pw,DOG_PERCH.z);
    dog.g.scale.setScalar(dog.scale*Math.max(.001,dog.pop));
  }else{
    dog.g.position.set(dog.x,FLOOR_Y+dog.footLift*dog.scale+bob+hopY-dog.sit*DOG_SIT.drop-eo*DOG_LIE.drop+dog.job*DOG_JOB.rise,dog.z);dog.g.rotation.x=-dog.job*DOG_JOB.pitch;
  }
  dog.g.rotation.y=dog.ry;if(dog.rg)dog.rg.rotation.z=Lc.sign*(DOG_LIE.ang*eo+Math.sin(performance.now()/1000*2.2)*.05*eo*(nowS-Lc.petT<.6?2:1));
dog.g.updateMatrixWorld(true);
  /* 6b. the CD hangs from the lips: its rim in the mouth, its centre a little way out in front, tipped up so it can be seen; right after the bite it glides up from the floor */
  if(isOwner&&cd&&cd.mode==='carried'&&dog.mouthL){
    DOGX.mw.copy(dog.mouthL);dog.bones.Head.o.localToWorld(DOGX.mw);
    const R=CDR*FLAT_S*DOG_BITE.reach;DOGX.mw.x+=Math.sin(dog.ry)*R;DOGX.mw.z+=Math.cos(dog.ry)*R;DOGX.mw.y+=DOG_BITE.lift;
    cd.att=Math.min(1,cd.att+dt/.4);const e=ease.io2(cd.att);
    cd.pos.set(lerp(cd.fp0.x,DOGX.mw.x,e),lerp(cd.fp0.y,DOGX.mw.y,e),lerp(cd.fp0.z,DOGX.mw.z,e));}
  /* 7. head look */
  const hb=dog.bones.Head;hb.o.getWorldPosition(DOGX.v);dog.g.worldToLocal(DOGX.v);DOGX.p.copy(look);dog.g.worldToLocal(DOGX.p);
  const ddx=DOGX.p.x-DOGX.v.x,ddy=DOGX.p.y-DOGX.v.y,ddz=Math.max(.2,DOGX.p.z-DOGX.v.z);
  const yawT=clamp(Math.atan2(ddx,ddz),-1.25,1.25),pitT=clamp(Math.atan2(ddy,Math.hypot(ddx,ddz)),-.55,.75);
  const kl=1-Math.exp(-dt*(mode==='chase'?14:9));dog.lookYaw+=(yawT-dog.lookYaw)*kl;dog.lookPitch+=(pitT-dog.lookPitch)*kl;
  const playing=status==='playing',bpm=(Au.alb&&Au.alb.bpm)||90,beat=playing?Math.sin(time*Math.PI*bpm/60):0;
  const happy=Math.max(pw,playing?.55:0,mode==='chase'||mode==='fetch'||mode==='bring'||mode==='eat'||mode==='follow'?1:0,moving?.7:0,eo);
  if(pw>0)dogAdd('Head','u',Math.sin(time*16)*.14*pw);
  dogAdd('Neck','u',dog.lookYaw*.42*(1-eo));dogAdd('Head','u',dog.lookYaw*.58*(1-eo));
  dogAdd('Neck','r',(-dog.lookPitch*.4+beat*.03)*(1-eo));dogAdd('Head','r',(-dog.lookPitch*.6+beat*.05)*(1-eo));
  if(dog.shk>0){dog.shk=Math.max(0,dog.shk-dt*2.4);const a=Math.sin((1-dog.shk)*22)*dog.shk*.45;dogAdd('Head','u',a);dogAdd('Neck','u',a*.5);dogAdd('LearA','f',a*.7);dogAdd('RearA','f',-a*.7);}   // shakes its head after putting something on
  /* 8. tail, ears, blink, breath, jaw */
  const wf=lerp(3,13,happy),wa=lerp(.22,.6,happy);dog.wag+=dt*wf;
  dogAdd('tailA','u',Math.sin(dog.wag)*wa);dogAdd('tailB','u',Math.sin(dog.wag-.7)*wa*1.1);dogAdd('tailC','u',Math.sin(dog.wag-1.4)*wa*1.2);
  dog.earT-=dt;if(dog.earT<=0){dog.earT=2+Math.random()*4;if(Math.random()<.5)dog.earL=.6;else dog.earR=.6;}
  dog.earL*=Math.exp(-dt*6);dog.earR*=Math.exp(-dt*6);
  // Headphones fully fold the ears; glasses gently lower them over the temples.
  // Use a shared target so wearing both never doubles the rotation.
  const earWearTarget=Math.max(Number(hpState.worn),W.worn.glasses?.82:0);
  dog.earWear+=(earWearTarget-dog.earWear)*(1-Math.exp(-dt*(earWearTarget>dog.earWear?7:5)));
  /* ears are damped springs: they lift back with speed and bounce on every stride, the tips lag behind the base */
  {const spd01=Math.min(1,Math.abs(vx)/7),bn=Math.sin(dog.gait+1.2)*dog.move,E=dog.ear||(dog.ear={L:{a:0,av:0,b:0,bv:0,f:0,fv:0},R:{a:0,av:0,b:0,bv:0,f:0,fv:0}});
   const step=(e,ph,kick,sgn)=>{const n=Math.max(1,Math.ceil(dt/.012)),h2=dt/n;
     const ta=.62*spd01+.55*bn*Math.cos(ph)+Math.sin(time*1.7+ph)*.025-dog.earWear*.62,tf=sgn*(.35*spd01+.4*Math.abs(bn)+kick*.7+dog.earWear*.35);
     for(let i=0;i<n;i++){
       e.av+=(150*(ta-e.a)-9*e.av)*h2;e.a+=e.av*h2;
       e.bv+=(95*(e.a*.9+.35*bn*.5-dog.earWear*.22-e.b)-6*e.bv)*h2;e.b+=e.bv*h2;
       e.fv+=(130*(tf-e.f)-8*e.fv)*h2;e.f+=e.fv*h2;}};
   step(E.L,0,dog.earL,-1);step(E.R,.6,dog.earR,1);
   dogAdd('LearA','r',E.L.a);dogAdd('LearB','r',E.L.b);dogAdd('LearA','f',E.L.f);dogAdd('LearB','f',E.L.f*.6);
   dogAdd('RearA','r',E.R.a);dogAdd('RearB','r',E.R.b);dogAdd('RearA','f',E.R.f);dogAdd('RearB','f',E.R.f*.6);}
  dog.blinkT-=dt;if(dog.blinkT<=0){dog.blinkT=2.2+Math.random()*3.5;dog.blink=.0001;}
  let bl=0;if(dog.blink>0){dog.blink+=dt;const k=dog.blink/.16;if(k>=1)dog.blink=0;else bl=Math.sin(k*Math.PI);}
  dogAdd('UplidL','r',bl*DOG_LID);dogAdd('UplidR','r',bl*DOG_LID);
  dogAdd('Bust','r',Math.sin(time*2.2)*.012);
  dogAdd('jawA','r',(eatJaw>0?eatJaw:(carrying||dog.grab)?jawX:(moving||playing?.12+.08*Math.sin(time*9):0))*DOG_JAW);   // mouth open for the bite, then closed round the rim
  if(bow>.001){dogAdd('Neck','r',.7*bow);dogAdd('Head','r',.5*bow);dogAdd('Bust','r',.22*bow);}   // bows down to the CD
  /* 9. legs: trot while moving, folded when sitting */
  const g=dog.gait,A=dog.move*.75;
  dogAdd('ShoulderL','r',Math.sin(g)*A*DOG_LEG);dogAdd('ShoulderR','r',-Math.sin(g)*A*DOG_LEG);
  dogAdd('LegL','r',-Math.sin(g)*A*DOG_LEG);dogAdd('LegR','r',Math.sin(g)*A*DOG_LEG);
  dogAdd('Waist','r',-Math.sin(g*2)*.04*dog.move);
  const s=dog.sit;
  if(s>.001){dogAdd('Hip','r',-DOG_SIT.hip*s);dogAdd('ClavicleL','r',DOG_SIT.hip*s*DOG_SIT.front);dogAdd('ClavicleR','r',DOG_SIT.hip*s*DOG_SIT.front);
    dogAdd('Neck','r',DOG_SIT.hip*s*.5);dogAdd('LegL','r',DOG_SIT.leg*s);dogAdd('LegR','r',DOG_SIT.leg*s);dogAdd('tailA','r',DOG_SIT.tail*s);}
  if(PET.perch){const P=DOG_PERCH;   // lying down on the player: belly low, front legs out, back legs folded
    dogAdd('Hip','r',P.hip);dogAdd('Waist','r',P.waist);dogAdd('Bust','r',P.bust);dogAdd('ClavicleL','r',P.clav);dogAdd('ClavicleR','r',P.clav);
    dogAdd('ShoulderL','r',P.sh);dogAdd('ShoulderR','r',P.sh);dogAdd('LegL','r',P.leg);dogAdd('LegR','r',P.leg);dogAdd('Neck','r',P.neck);dogAdd('Head','r',P.head);dogAdd('tailA','r',P.tail);}
  if(dog.job>.001){const j=dog.job,P=DOG_JOB;   // standing up behind the counter, both front paws on top
    dogAdd('ShoulderL','r',P.sh*j);dogAdd('ShoulderR','r',P.sh*j);dogAdd('ClavicleL','r',P.clav*j);dogAdd('ClavicleR','r',P.clav*j);dogAdd('LegL','r',P.leg*j);dogAdd('LegR','r',P.leg*j);dogAdd('Neck','r',P.neck*j);dogAdd('Head','r',P.head*j);dogAdd('Bust','r',P.bust*j);}
  if(eo>.001){const pet=nowS-Lc.petT<.6,sp=pet?7:4,amp=pet?1.4:1;
    dogAdd('ShoulderL','r',(DOG_LIE.arm+Math.sin(time*sp)*.35*amp)*eo);dogAdd('ShoulderR','r',(DOG_LIE.arm+Math.sin(time*sp+.9)*.35*amp)*eo);
    dogAdd('LegL','r',(DOG_LIE.leg+Math.sin(time*(sp+1)+1.7)*.3*amp)*eo);dogAdd('LegR','r',(DOG_LIE.leg+Math.sin(time*(sp+1)+2.6)*.3*amp)*eo);
    dogAdd('Neck','u',Math.sin(time*1.4)*.2*eo);dogAdd('Head','r',.25*eo);dogAdd('jawA','r',.22*eo*DOG_JAW);
    dogAdd('UplidL','r',.7*eo*DOG_LID);dogAdd('UplidR','r',.7*eo*DOG_LID);}
  dogApply();
}
const DOG_JOB={rise:.42,pitch:.42,sh:-1.1,clav:-.2,leg:0,neck:.25,head:.1,bust:0};   // 'job' pose: rise = body lift, pitch = whole body tipped nose-up, the rest are bone angles (front paws forward onto the counter)
const DOG_PERCH={dx:0,z:0,drop:.6,ry:.9,hip:0,waist:0,bust:0,clav:.5,sh:.6,leg:1.2,neck:0,head:0,tail:0};   // desktop pet: dx/z = where on the player's top face, drop = how far the belly sinks, ry = facing, the rest are bone angles
const DOG_LIE={ang:2.6,drop:.75,arm:.9,leg:-.5},DOG_LID=1,DOG_JAW=1,DOG_LEG=1,DOG_SIT={hip:.8,front:1,leg:.9,tail:0,drop:.3};
/* fetching a CD: mx/my/mz = the lips in model space; stand = how far in front of the hips the CD should lie when the dog bites it (and when it is held out to the pointer);
   dur = length of the bite (bow, snatch, head back up); reach = how far the CD's centre sits out from the lips, as a fraction of its radius; lift = height above the lips */
const DOG_BITE={mx:0,my:35.5,mz:38,stand:1.65,dur:.7,reach:.85,lift:.05};
loadDog();

