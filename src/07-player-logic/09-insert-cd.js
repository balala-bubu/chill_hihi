/* ---------- insert CD, close lid, plug in headphones ---------- */
async function insertCD(){
  const c=cd;busy=true;c.mode='insert';c.vel.set(0,0);camLock=true;
  const p0=c.pos.clone(),r0=c.disc.rotation.z;
  rig.td=L.d*.55;rig.ty=BAY.y*.9;rig.tx=0;
  await tween(.3,k=>{c.pos.set(lerp(p0.x,BAY.x,k),lerp(p0.y,BAY.y,k),lerp(p0.z,1.1,k));c.root.rotation.x*=.8;c.root.rotation.y*=.8;},ease.out3);
  Au.whoosh();
  await tween(.9,k=>{const h=Math.sin(Math.PI*k);c.pos.z=1.1+h*1.5;c.disc.rotation.z=r0+TAU*ease.io3(k);c.root.scale.setScalar(1+.12*h);},ease.lin);
  await tween(.26,k=>{c.pos.z=lerp(1.1,FZ+.07,ease.in2(k));c.root.scale.setScalar(1);},ease.lin);
  Au.thunk();Au.smash();impact(c);buzz([16,22,10]);cdIn=true;c.mode='in';c.spin=0;
  await tween(.25,()=>{},ease.lin);
  await setLid(false,true);
  rig.td=L.d*1.02;rig.tx=-1.5;rig.ty=-1.5;
  if(btOn&&btHave)await plugIn();else{rig.td=L.d;rig.tx=0;rig.ty=0;await tween(.35,()=>{},ease.lin);}   // no bluetooth headphones: it just plays
  camLock=false;status='playing';Au.start(ALBUMS[c.ai]);busy=false;
}
async function plugIn(){   // after the disc is in: headphones are tossed in, the plug flies to the jack and snaps in (see seekPlug)
  if(!PHYS||hpState.s==='plugged'||hpState.s==='seek')return;
  rig.td=L.d;rig.tx=-1.7;rig.ty=-1.5;
  if(hpState.s==='none'){hpSpawn();Au.whoosh();await waitFor(hpSettled,3600);await tween(.25,()=>{},ease.lin);}
  await seekPlug();
  await tween(.35,()=>{},ease.lin);
  camLock=false;rig.td=L.d;rig.tx=0;rig.ty=0;
}
async function ejectCD(){
  const c=cd;busy=true;status='empty';cdIn=false;Au.stop();
  await setLid(true);
  c.mode='free';c.pos.set(BAY.x,BAY.y,FZ+.07);c.vel.set(0,4.6);c.spin=-4;Au.click(1.3,1);
  busy=false;
}

