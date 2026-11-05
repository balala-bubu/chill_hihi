/* ---------- album flow ---------- */
async function selectAlbum(i){
  if(busy||state!=='home'||cdAlbum>=0)return;
  busy=true;sel=i;state='album';shelfPin=false;Au.click(.8,.8);
  await tween(.85,k=>{albums[i].k=k;},ease.io3);busy=false;
}
async function openAlbum(){
  if(busy)return;busy=true;state='opening';const a=albums[sel];Au.click(.7,1);
  cd=makeCD(sel);cd.mode='case';cd.lift=0;cd.pos.set(a.g.position.x,a.g.position.y,a.g.position.z+TRAY_Z*a.g.scale.x);
  await tween(.8,k=>{a.open=k;},ease.out5);
  Au.slide&&0;await tween(.5,k=>{cd.lift=.6*k;},ease.outBack);
  state='albumOpen';busy=false;
}
async function cancelAlbum(){
  if(busy||sel<0)return;busy=true;const a=albums[sel],o0=a.open,c=cd;cd=null;
  if(c){c.mode='insert';tween(.4,k=>c.root.scale.setScalar(1-.95*k),ease.io2).then(()=>c.dispose());}
  if(o0>0)await tween(.45,k=>{a.open=lerp(o0,0,k);},ease.io2);
  await tween(.75,k=>{a.k=1-k;},ease.io3);
  sel=-1;state='home';busy=false;
}
function commitStage(){
  const a=albums[sel];cd.committed=true;cd.zT=.58;state='stage';cdAlbum=sel;Au.whoosh();
  (async()=>{const o0=a.open;await tween(.45,k=>{a.open=lerp(o0,0,k);},ease.io2);await tween(.8,k=>{a.k=1-k;},ease.io3);sel=-1;})();
}
async function dockCD(){
  const c=cd,a=albums[cdAlbum];busy=true;a.dock=true;c.mode='insert';c.vel.set(0,0);c.root.rotation.set(0,0,0);
  const p0=c.pos.clone(),m0=a.mag,lift=.6,caseZ=()=>a.g.position.z+TRAY_Z*a.g.scale.x;Au.slide();
  await tween(.6,k=>{a.k=k;a.mag=m0*(1-k);c.pos.set(lerp(p0.x,a.g.position.x,k),lerp(p0.y,a.g.position.y,k),lerp(p0.z,caseZ()+lift,k));},ease.io3);
  await tween(.7,k=>{a.open=k;c.pos.set(a.g.position.x,a.g.position.y,caseZ()+lift);},ease.out5);
  Au.whoosh();const r0=c.disc.rotation.z;
  await tween(.9,k=>{const h=Math.sin(Math.PI*k);c.pos.set(a.g.position.x,a.g.position.y,caseZ()+lift*(1-ease.in2(k))+h*1.2);c.disc.rotation.z=r0+TAU*ease.io3(k);c.root.scale.setScalar(1+.08*h);},ease.lin);
  c.root.scale.setScalar(1);Au.thunk();
  await tween(.25,()=>{},ease.lin);
  await tween(.5,k=>{a.open=1-k;},ease.io2);Au.snap();
  c.dispose();cd=null;
  await tween(.8,k=>{a.k=1-k;},ease.io3);
  a.dock=false;a.mag=0;cdAlbum=-1;sel=-1;state='home';busy=false;
}

