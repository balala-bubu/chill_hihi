/* ---------- Pikmin: a toy-row item ("t_pikmin", models/wardrobe/src/t_pikmin) ----------
   Pick it on the shelf and a Pikmin (random blue / red / yellow) hangs from the pointer by the tip of its leaf, swinging like a pendulum when you move the mouse.
   Click empty space and it lets go: it falls, squashes on the floor, then dawdles (waits, yawns, strolls a bit) and finally runs off the left or right edge.
   Assets: models/pikmin/pikmin.json (built by tools/build_pikmin.py from the .smd files: skeleton, three bodies, the leaf, five clips as quaternions) + models/pikmin/*.png.
   Model space: Y up, the Pikmin looks toward +Z, 24 units tall; PK.S scales it into the scene. The leaf is a separate mesh stuck on the stem's last bone; its bend is a little spring done on the CPU (60 vertices).
   While it hangs it plays the "Fall" clip (arms and legs flailing, stem straight up: that is the pose of a Pikmin dangling from its leaf); the whole body is rotated around the leaf tip (pendulum). The "Hang" clip (a Pikmin held by the head, stem drooping) is in the data but not used. */
const PK={ready:false,loading:false,data:null,list:[],held:null,nextHold:0,S:.09,Hc:10,g:36,Leff:1.1,cx:0,cy:0,has:false,MAX:8,err:0,
  geo:{},mat:{},leafGeo:null,leafMat:null,binv:null,COL:['blue','red','yellow'],
  RUN:{v:2.6,anim:2.2,yaw:1.15},WALK:{v:1.1,anim:1.3},HANGYAW:.75,
  q:new T.Quaternion(),v1:new T.Vector3(),v2:new T.Vector3(),m1:new T.Matrix4(),tA:new Float32Array(48),tB:new Float32Array(48)};
addEventListener('pointermove',e=>{PK.cx=e.clientX;PK.cy=e.clientY;PK.has=true;},true);
addEventListener('pointerdown',e=>{PK.cx=e.clientX;PK.cy=e.clientY;PK.has=true;},true);
async function pkLoad(){
  if(PK.loading)return;PK.loading=true;
  try{
    const base='models/pikmin/',D=PK.data=await fetch(base+'pikmin.json').then(r=>{if(!r.ok)throw new Error('pikmin.json '+r.status);return r.json();});
    const tl=new T.TextureLoader(),lt=(f,srgb,nearest)=>new Promise((res,rej)=>tl.load(base+f,t=>{
      if(srgb)t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;
      if(nearest){t.magFilter=t.minFilter=T.NearestFilter;t.generateMipmaps=false;}   // the body texture is a few flat colour patches: nearest keeps them from bleeding into each other
      res(t);},undefined,rej));
    const [tb,tr,ty,tleaf,tln]=await Promise.all([lt('blue.png',1,1),lt('red.png',1,1),lt('yellow.png',1,1),lt('leaf.png',1,0),lt('leaf_n.png',0,0)]);
    PK.mat={blue:tb,red:tr,yellow:ty};
    for(const c of PK.COL){
      const b=D.bodies[c],g=new T.BufferGeometry(),n=b.pos.length/3,si=new Uint16Array(n*4),sw=new Float32Array(n*4);
      for(let i=0;i<n;i++){si[i*4]=b.sk[i*2];si[i*4+1]=b.sk[i*2+1];sw[i*4]=b.sw[i*2];sw[i*4+1]=b.sw[i*2+1];}
      g.setAttribute('position',new T.Float32BufferAttribute(b.pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(b.nor,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));
      g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));g.setIndex(b.idx);
      PK.geo[c]=g;PK.mat[c]=new T.MeshStandardMaterial({map:PK.mat[c],roughness:.85,metalness:0,envMapIntensity:.5,side:T.DoubleSide});
    }
    const lg=new T.BufferGeometry(),L=D.leaf;
    lg.setAttribute('position',new T.Float32BufferAttribute(L.pos,3));lg.setAttribute('normal',new T.Float32BufferAttribute(L.nor,3));lg.setAttribute('uv',new T.Float32BufferAttribute(L.uv,2));lg.setIndex(L.idx);
    PK.leafGeo=lg;PK.leafMat=new T.MeshStandardMaterial({map:tleaf,normalMap:tln,roughness:.7,metalness:0,side:T.DoubleSide,envMapIntensity:.6});
    const bs=pkBones();bs[0].updateMatrixWorld(true);PK.binv=bs.map(o=>o.matrixWorld.clone().invert());   // inverse bind matrices = inverse of the rest pose's world matrices
    PK.ready=true;
  }catch(e){console.warn('pikmin failed to load',e);PK.failed=true;}
}
function pkBones(){
  const D=PK.data,bs=D.bones.map(b=>{const o=new T.Bone();o.name=b.n;o.position.fromArray(b.pos);o.quaternion.fromArray(b.q);return o;});
  D.bones.forEach((b,i)=>{if(b.p>=0)bs[b.p].add(bs[i]);});return bs;
}
function pkMake(color){
  const D=PK.data,bones=pkBones(),mesh=new T.SkinnedMesh(PK.geo[color],PK.mat[color]);
  mesh.frustumCulled=false;mesh.castShadow=true;mesh.add(bones[0]);
  mesh.bind(new T.Skeleton(bones,PK.binv.map(m=>m.clone())),new T.Matrix4());
  const lg=PK.leafGeo.clone(),leaf=new T.Mesh(lg,PK.leafMat);leaf.frustumCulled=false;leaf.castShadow=true;
  leaf.position.fromArray(D.attach.pos);leaf.quaternion.fromArray(D.attach.q);bones[D.attach.bone].add(leaf);
  const tip=new T.Object3D();tip.position.set(0,D.leaf.h*.97,0);leaf.add(tip);   // the point the pointer holds
  const model=new T.Group(),face=new T.Group(),swing=new T.Group(),root=new T.Group();
  model.add(mesh);face.add(model);swing.add(face);root.add(swing);scene.add(root);
  const sh=new T.Mesh(wSoftGeo,wMat.soft.clone());sh.renderOrder=1;scene.add(sh);
  return {c:color,tip,bones,mesh,leaf,lg,lp0:Float32Array.from(D.leaf.pos),root,swing,face,model,sh,
    st:'hold',t:0,x:0,y:0,z:FLOOR_Z,vx:0,vy:0,th:0,thv:0,yaw:PK.HANGYAW,dir:1,pop:0,j:0,jv:0,
    cur:{n:'fall',t:0,sp:1,loop:true},prev:null,blend:1,floor:0,
    lbx:0,lbz:0,lvx:0,lvz:0,px:0,py:0,pvx:0,pvy:0,pax:0,pay:0,acts:[],act:null,P:new T.Vector3(),turn:0,anchor:new T.Vector3(0,PK.Hc,0)};
}
function pkRemove(p){
  const i=PK.list.indexOf(p);if(i>=0)PK.list.splice(i,1);if(PK.held===p)PK.held=null;
  scene.remove(p.root);scene.remove(p.sh);p.sh.material.dispose();p.lg.dispose();
}
function pkCursor(out){   // the pointer on the floor lane's plane
  setNDC({clientX:PK.cx,clientY:PK.cy});const q=planeHit(FLOOR_Z);if(!q)return false;out.copy(q);return true;
}
function pkHold(){
  if(PK.list.length>=PK.MAX)pkRemove(PK.list.find(p=>p.st!=='hold'&&p!==PK.held)||PK.list[0]);
  const p=pkMake(PK.COL[Math.random()*3|0]);PK.list.push(p);PK.held=p;
  if(pkCursor(p.P)){p.px=p.P.x;p.py=p.P.y;}
  Au.ensure();Au.click(1.7,.35);buzz(6);
}
function pkRelease(){
  const p=PK.held;if(!p||p.st!=='hold')return false;
  p.root.updateMatrixWorld(true);
  p.model.localToWorld(PK.v1.set(0,PK.Hc,0));   // keep the body where it is, but from now on it turns around its middle instead of around the held point
  p.x=PK.v1.x;p.y=PK.v1.y;p.z=PK.v1.z;
  p.vx=clamp(p.pvx*.7,-7,7);p.vy=clamp(p.pvy*.5,-4,6);
  p.st='fall';p.t=0;PK.held=null;PK.nextHold=performance.now()+260;
  pkPlay(p,'fall',{loop:true,sp:1,fade:.1});Au.click(1.25,.3);buzz(8);return true;
}
/* ---- clips ---- */
function pkPlay(p,name,o){
  o=o||{};if(p.cur.n===name&&p.cur.loop===(o.loop!==false)){p.cur.sp=o.sp||1;return;}
  p.prev={n:p.cur.n,t:p.cur.t,sp:p.cur.sp,loop:p.cur.loop};p.cur={n:name,t:0,sp:o.sp||1,loop:o.loop!==false};p.fade=o.fade||.15;p.blend=0;
}
function pkSample(n,t,loop,out){   // -> floor; fills out (12 bone quaternions + the pelvis position at [48..50])
  const a=PK.data.anims[n],N=a.n,fps=PK.data.fps;let f=t*fps;
  if(loop)f=((f%N)+N)%N;else f=clamp(f,0,N-1);
  const i0=Math.floor(f),i1=loop?(i0+1)%N:Math.min(i0+1,N-1),u=f-i0,q=a.q;
  for(let b=0;b<12;b++){
    const A=(i0*12+b)*4,B=(i1*12+b)*4;let d=q[A]*q[B]+q[A+1]*q[B+1]+q[A+2]*q[B+2]+q[A+3]*q[B+3];const s=d<0?-1:1;
    let x=q[A]+(s*q[B]-q[A])*u,y=q[A+1]+(s*q[B+1]-q[A+1])*u,z=q[A+2]+(s*q[B+2]-q[A+2])*u,w=q[A+3]+(s*q[B+3]-q[A+3])*u;const l=1/Math.hypot(x,y,z,w);   // nlerp: the frames are close together
    out[b*4]=x*l;out[b*4+1]=y*l;out[b*4+2]=z*l;out[b*4+3]=w*l;}
  const pp=a.p;for(let k=0;k<3;k++)out[48+k]=pp[i0*3+k]+(pp[i1*3+k]-pp[i0*3+k])*u;
  return a.floor;
}
const PKA=new Float32Array(51),PKB=new Float32Array(51);
function pkAnimate(p,dt){
  const c=p.cur;c.t+=dt*c.sp;let fl=pkSample(c.n,c.t,c.loop,PKA);
  if(p.blend<1&&p.prev){
    p.blend=Math.min(1,p.blend+dt/p.fade);p.prev.t+=dt*p.prev.sp;
    const f2=pkSample(p.prev.n,p.prev.t,p.prev.loop,PKB),w=p.blend*p.blend*(3-2*p.blend);
    for(let b=0;b<12;b++){let d=0;for(let k=0;k<4;k++)d+=PKA[b*4+k]*PKB[b*4+k];const s=d<0?-1:1;let l=0;
      for(let k=0;k<4;k++){PKA[b*4+k]=PKB[b*4+k]*s*(1-w)+PKA[b*4+k]*w;l+=PKA[b*4+k]*PKA[b*4+k];}l=1/Math.sqrt(l);for(let k=0;k<4;k++)PKA[b*4+k]*=l;}
    for(let k=0;k<3;k++)PKA[48+k]+=(PKB[48+k]-PKA[48+k])*(1-w);
    fl=f2+(fl-f2)*w;
  }else if(p.blend>=1)p.prev=null;
  for(let b=0;b<12;b++)p.bones[b].quaternion.set(PKA[b*4],PKA[b*4+1],PKA[b*4+2],PKA[b*4+3]);
  p.bones[1].position.set(PKA[48],PKA[49],PKA[50]);
  p.floor=fl;
}
function pkTip(p){   // the leaf tip in model space, with the current pose (bones were just posed)
  p.mesh.updateWorldMatrix(true,true);PK.m1.copy(p.mesh.matrixWorld).invert().multiply(p.tip.matrixWorld);p.anchor.setFromMatrixPosition(PK.m1);
}
/* ---- the leaf: a spring-driven bend of its 60 vertices ---- */
function pkLeaf(p,dt,ax,ay){
  const ca=Math.cos(p.yaw),sa=Math.sin(p.yaw),aM=ax*ca-0*sa,aZ=ax*sa;   // world acceleration along the model's X axis (in the leaf plane) and Z axis (across it)
  for(let k=0;k<2;k++){const h=dt/2;
    p.lvz+=(-170*p.lbz-6.5*p.lvz-aM*.55)*h;p.lbz+=p.lvz*h;
    p.lvx+=(-170*p.lbx-6.5*p.lvx-aZ*.75+ay*.18)*h;p.lbx+=p.lvx*h;}
  p.lbz=clamp(p.lbz,-.9,.9);p.lbx=clamp(p.lbx,-.9,.9);
  const P0=p.lp0,A=p.lg.attributes.position.array,H=PK.data.leaf.h,bz=p.lbz,bx=p.lbx;
  for(let i=0;i<P0.length;i+=3){
    const x=P0[i],y=P0[i+1],z=P0[i+2],t=Math.pow(Math.max(0,y/H),1.3),a=bz*t,b=bx*t,c1=Math.cos(a),s1=Math.sin(a);
    const x1=x*c1-y*s1,y1=x*s1+y*c1,c2=Math.cos(b),s2=Math.sin(b);
    A[i]=x1;A[i+1]=y1*c2-z*s2;A[i+2]=y1*s2+z*c2;}
  p.lg.attributes.position.needsUpdate=true;
}
/* ---- behaviour after landing ---- */
function pkPlan(p){
  const acts=[{t:'wait',d:.5+Math.random()*.7}];let n=1+(Math.random()*3|0),yawn=false;
  while(n-->0){const r=Math.random();
    if(r<.3&&!yawn){yawn=true;acts.push({t:'yawn'});}
    else if(r<.65)acts.push({t:'walk',dx:(Math.random()<.5?-1:1)*(.8+Math.random()*1.6)});
    else acts.push({t:'wait',d:1.4+Math.random()*1.8});}
  const dir=p.x>0?1:-1;acts.push({t:'exit',dir:Math.random()<.7?dir:-dir});
  p.acts=acts;p.act=null;
}
function pkNext(p){
  const a=p.act=p.acts.shift();if(!a){p.act={t:'exit',dir:p.x>0?1:-1};return;}
  a.el=0;
  if(a.t==='wait'){pkPlay(p,'wait',{loop:true,sp:1,fade:.2});p.yawT=[.55,-.55,.15][Math.random()*3|0];p.turn=.6+Math.random()*1.4;}
  else if(a.t==='yawn'){pkPlay(p,'yawn',{loop:false,sp:1,fade:.25});p.yawT=p.yaw*.6;a.d=PK.data.anims.yawn.n/PK.data.fps;}
  else if(a.t==='walk'){const lim=Math.max(1,L.hw-1.6);a.tx=clamp(p.x+a.dx,-lim,lim);a.dir=a.tx>=p.x?1:-1;pkPlay(p,'run',{loop:true,sp:PK.WALK.anim,fade:.2});p.yawT=a.dir*PK.RUN.yaw*.9;}
  else if(a.t==='exit'){a.dir=a.dir||1;pkPlay(p,'run',{loop:true,sp:PK.RUN.anim,fade:.15});p.yawT=a.dir*PK.RUN.yaw;a.v=0;}
}
function pkUpdate(p,dt){
  try{pkStep(p,dt);}catch(e){if(!PK.err){PK.err=1;console.warn('pikmin',e);}pkRemove(p);}
}
function pkStep(p,dt){
  const S=PK.S;p.t+=dt;p.pop=Math.min(1,p.pop+dt/.12);let ax=0,ay=0;
  const ang=(a,b)=>{let d=(b-a)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return d;};
  if(p.st==='hold'){
    if(!pkCursor(p.P)){}
    const P=p.P,vx=(P.x-p.px)/Math.max(dt,.001),vy=(P.y-p.py)/Math.max(dt,.001),k=1-Math.exp(-dt*22);
    const ovx=p.pvx,ovy=p.pvy;p.pvx+=(vx-p.pvx)*k;p.pvy+=(vy-p.pvy)*k;
    p.pax+=((p.pvx-ovx)/Math.max(dt,.001)-p.pax)*(1-Math.exp(-dt*18));p.pay+=((p.pvy-ovy)/Math.max(dt,.001)-p.pay)*(1-Math.exp(-dt*18));
    p.px=P.x;p.py=P.y;ax=p.pax;ay=p.pay;
    const n=3,h=dt/n;   // pendulum around the held point; the pointer's acceleration drives it
    for(let i=0;i<n;i++){p.thv+=(-((PK.g+ay)*Math.sin(p.th)+ax*Math.cos(p.th))/PK.Leff-1.5*p.thv)*h;p.th=clamp(p.th+p.thv*h,-1.25,1.25);}
    if(Math.abs(p.pvx)>2.2)p.dir=p.pvx>0?1:-1;
    p.yaw+=ang(p.yaw,p.dir*PK.HANGYAW)*(1-Math.exp(-dt*4));
    p.cur.sp=.8+Math.min(1.2,Math.abs(p.thv)*.3+Math.abs(p.pvx)*.04);   // flails more when swung hard
    pkAnimate(p,dt);pkTip(p);
    p.root.position.set(P.x,P.y,FLOOR_Z);p.root.rotation.set(0,0,0);p.swing.rotation.z=p.th;p.face.rotation.y=p.yaw;
    p.model.scale.setScalar(S);p.model.position.set(-p.anchor.x*S,-p.anchor.y*S,-p.anchor.z*S);
    p.sh.visible=false;
  }else{
    let moving=0;
    if(p.st==='fall'){
      p.vy-=PK.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=(FLOOR_Z-p.z)*(1-Math.exp(-dt*6));
      p.th+=(0-p.th)*(1-Math.exp(-dt*6));p.thv=0;p.yaw+=ang(p.yaw,p.dir*.7)*(1-Math.exp(-dt*3));
      const lim=L.hw-.7;if(Math.abs(p.x)>lim){p.x=Math.sign(p.x)*lim;p.vx*=-.4;}
      ay=-PK.g*.15;
    }else if(p.st==='idle'){
      const a=p.act;a.el+=dt;
      if(a.t==='wait'){p.turn-=dt;if(p.turn<=0){p.turn=1.2+Math.random()*1.8;p.yawT=[.55,-.55,.15,.9,-.9][Math.random()*5|0];}if(a.el>=a.d)pkNext(p);}
      else if(a.t==='yawn'){if(a.el>=a.d)pkNext(p);}
      else if(a.t==='walk'){const d=a.tx-p.x,st=Math.min(Math.abs(d),PK.WALK.v*dt);p.x+=Math.sign(d)*st;moving=Math.sign(d)*st/dt;if(Math.abs(d)<.03||a.el>6)pkNext(p);}
      else if(a.t==='exit'){a.v=Math.min(PK.RUN.v,a.v+dt*9);p.x+=a.dir*a.v*dt;moving=a.dir*a.v;if(Math.abs(p.x)>L.hw+1.6){pkRemove(p);return;}}
      p.yaw+=ang(p.yaw,p.yawT)*(1-Math.exp(-dt*(a.t==='exit'?10:5)));
      ax=moving*2;
    }
    p.pvx=p.vx;
    pkAnimate(p,dt);
    /* squash spring (landing) */
    for(let k=0;k<2;k++){const h=dt/2;p.jv+=(-260*p.j-11*p.jv)*h;p.j+=p.jv*h;}p.j=clamp(p.j,-.35,.3);
    const sy=1+p.j,sx=1-p.j*.5,rest=(PK.Hc-p.floor)*S;
    if(p.st==='fall'){
      const yy=FLOOR_Y+rest;
      if(p.y<=yy&&p.vy<0){p.y=yy;p.st='idle';p.vy=0;p.vx=0;p.j=-.01;p.jv=-3.2;p.lvx+=5;p.lvz+=3;Au.click(.8,.32);buzz(10);pkPlay(p,'wait',{loop:true,sp:1,fade:.1});pkPlan(p);pkNext(p);}
    }else{p.y=FLOOR_Y+rest*sy;}
    p.anchor.set(0,PK.Hc,0);
    p.root.position.set(p.x,p.y,p.z);p.swing.rotation.z=p.th;p.face.rotation.y=p.yaw;
    p.model.scale.set(S*sx,S*sy,S*sx);p.model.position.set(0,-PK.Hc*S*sy,0);
    const h=Math.max(0,p.y-rest-FLOOR_Y),sz=S*22/(1+h*.25)*p.pop;
    p.sh.visible=true;p.sh.position.set(p.x,FLOOR_Y+.012,p.z);p.sh.scale.set(Math.max(.001,sz),1,Math.max(.001,sz*.55));
  }
  p.root.scale.setScalar(Math.max(.001,p.pop));
  pkLeaf(p,dt,ax,ay);
}
function pkFrame(dt){
  if(PET.mini)return;
  const want=TOY.sel==='t_pikmin';
  if(want&&!PK.ready&&!PK.loading)pkLoad();
  if(!PK.ready)return;
  dt=Math.min(dt,.05);
  if(want&&!PK.held&&PK.has&&performance.now()>PK.nextHold)pkHold();
  if(!want&&PK.held)pkRemove(PK.held);
  for(let i=PK.list.length-1;i>=0;i--)pkUpdate(PK.list[i],dt);
}
