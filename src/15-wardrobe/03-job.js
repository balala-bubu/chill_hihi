/* ---------- the part-time job set ("打工"): a shop counter + a standee, one cabinet item in the toy row ----------
   The cabinet shows the standee (models/wardrobe/src/t_job); the counter (t_job_counter, "hide":true in its item.json) is not listed, it comes out together with it.
   Pick it and click empty space: the whole set drops from the click and lands upright on the floor. It is not part of any physics world, so apples, CDs and the dog never push it;
   only a grab moves it: drag it elsewhere and let go (it falls again), or drag it into the cabinet / off the right edge to put it away.
   While it stands, the puppies walk round the left end of the counter, stand behind it and rest their front paws on top (dogFrame mode 'job', 14-dog/01-dog.js). Two puppies stand side by side.
   Layout is in the set's own model units (counter x -33..33 after the 1.3 widening so two puppies fit behind it, floor y=0; the standee stands to the right of it); JOB.k scales it to world units. The counter's front (drawers) and the standee's logo face +Z = the camera. */
const JOB={on:false,st:'none',root:null,rot:null,sh:null,k:.082,sx:1.3,x:0,y:0,z:.35,vy:0,y0:1,tilt:0,sq:0,sqv:0,bounced:false,held:null,stow:0,blk:null,err:0,
  SIGN_X:49,CL:33,SR:12,spots:{1:[-14],2:[-22,-6.5],3:[-31,-13,5]},mats:{},rc:new T.Raycaster(),nd:new T.Vector2(),tmp:new T.Vector3()};
function jobBuild(){
  if(JOB.root)return true;
  const ci=W.items.t_job_counter,si=W.items.t_job;if(!ci||!si)return false;
  const mk=it=>{const m=it.mat.clone();m.transparent=false;m.depthWrite=true;m.alphaTest=0;m.side=T.FrontSide;return m;};
  const root=new T.Group(),rot=new T.Group();
  const add=(it,dx,sx)=>{sx=sx||1;const g=it.geo;if(!g.boundingBox)g.computeBoundingBox();const b=g.boundingBox;
    const m=new T.Mesh(g,JOB.mats[it.id]||(JOB.mats[it.id]=mk(it)));m.scale.x=sx;m.position.set(dx-(b.min.x+b.max.x)/2*sx,-b.min.y,-(b.min.z+b.max.z)/2);m.castShadow=false;m.receiveShadow=false;rot.add(m);};
  add(ci,0,JOB.sx);add(si,0);
  const sg=rot.children.pop(),sw=new T.Group();sw.position.x=JOB.SIGN_X;sw.add(sg);rot.add(sw);JOB.sw=sw;   // the standee turns on its own (it always faces the camera), pivot = its own foot
  rot.scale.setScalar(JOB.k);root.add(rot);root.visible=false;root.traverse(o=>o.layers.enable(1));scene.add(root);
  const sh=new T.Mesh(wSoftGeo,wMat.soft.clone());sh.renderOrder=1;sh.visible=false;scene.add(sh);
  JOB.root=root;JOB.rot=rot;JOB.sh=sh;return true;
}
const jobExt=()=>({l:JOB.CL*JOB.k+.25,r:(JOB.SIGN_X+JOB.SR)*JOB.k+.25});
function jobSpawn(x,y){
  if(!jobBuild())return false;
  const e=jobExt();
  JOB.x=clamp(x,-L.hw+e.l,L.hw-e.r);JOB.y0=Math.max(y,FLOOR_Y+3);JOB.y=JOB.y0;JOB.vy=0;JOB.tilt=(Math.random()<.5?-1:1)*(.14+Math.random()*.1);JOB.sq=0;JOB.sqv=0;JOB.bounced=false;JOB.held=null;JOB.stow=0;
  JOB.on=true;JOB.st='fall';JOB.root.visible=true;JOB.root.scale.setScalar(1);Au.click(1.8,.4);return true;
}
function jobStow(){JOB.st='stow';JOB.stow=0;JOB.held=null;JOB.blk=null;Au.click(1.1,.45);buzz(8);}
function jobHit(e){   // is the pointer on the set (and not on a puppy standing in front of it)?
  if(!JOB.on||!JOB.root||!JOB.root.visible||JOB.st==='stow')return false;
  const r=cvs.getBoundingClientRect();JOB.nd.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);JOB.rc.setFromCamera(JOB.nd,cam);
  if(!JOB.rc.intersectObject(JOB.rot,true).length)return false;
  const I=typeof dogWhoAt==='function'?dogWhoAt(e.clientX,e.clientY):null;
  if(I&&DS(I).z>JOB.z+JOB.CL*0+1.1)return false;   // a puppy in front of the counter is in front of it
  return true;
}
cvs.addEventListener('pointerdown',e=>{
  if(e.button>0||(JOB.st!=='rest'&&JOB.st!=='fall')||!jobHit(e))return;
  e.stopImmediatePropagation();e.stopPropagation();try{cvs.setPointerCapture(e.pointerId);}catch(_){}
  setNDC(e);const q=planeHit(JOB.z);if(!q)return;
  JOB.held={ox:JOB.x-q.x,oy:JOB.y-q.y,id:e.pointerId};JOB.st='held';JOB.blk=null;JOB.vy=0;JOB.tilt=0;Au.click(1.5,.4);buzz(6);
},{capture:true});
function jobOverCabinet(e){const lf=1-(W.Wc+.35)/(2*L.hw);return (W.vis>.3&&e.clientX/innerWidth>lf)||e.clientX/innerWidth>.95;}
cvs.addEventListener('pointermove',e=>{
  if(!JOB.held)return;
  setNDC(e);const q=planeHit(JOB.z);if(!q)return;
  JOB.x=q.x+JOB.held.ox;JOB.y=Math.max(FLOOR_Y,q.y+JOB.held.oy);cvs.style.cursor='grabbing';
});
function jobRelease(e){
  if(!JOB.held)return;
  try{cvs.releasePointerCapture(JOB.held.id);}catch(_){}
  const over=e&&jobOverCabinet(e);JOB.held=null;cvs.style.cursor='default';
  if(over){jobStow();return;}
  const ex=jobExt();JOB.x=clamp(JOB.x,-L.hw+ex.l,L.hw-ex.r);JOB.y0=JOB.y;JOB.vy=0;JOB.tilt=0;JOB.bounced=false;JOB.st='fall';
}
cvs.addEventListener('pointerup',e=>{if(JOB.held){e.stopImmediatePropagation();jobRelease(e);}},{capture:true});
cvs.addEventListener('pointercancel',e=>{if(JOB.held)jobRelease(null);},{capture:true});
cvs.addEventListener('pointermove',e=>{if(!JOB.held&&JOB.st==='rest'&&!TOY.sel&&!W.drag&&!pd&&jobHit(e))cvs.style.cursor='grab';});
/* where a puppy stands: spot s (0 = left) of n, behind the counter. returns null when the set is not standing */
function jobSpot(rank,n){
  if(JOB.st!=='rest'||PET.perch||PET.mini)return null;
  const arr=JOB.spots[Math.min(3,Math.max(1,n))],s=n-1-rank;
  if(s<0||s>=arr.length)return null;   // the counter has room for three: the others keep playing outside
  return {x:JOB.x+arr[s]*JOB.k,z:JOB.z+JOB.dz};
}
JOB.dz=-.32;
/* the way round: the counter blocks the lane, so changing between "in front" and "behind" goes round the left end. returns [tx,tz] or null when the straight way is free */
function jobRoute(tx,tz){
  const B=JOB.blk;if(!B)return null;
  const behindD=dog.z<B.zf-.4,behindT=tz<B.zf-.4;
  if(behindD===behindT)return null;
  const gx=B.l-.95;
  if(dog.x>gx+.3)return [gx,dog.z];
  return [gx,tz];
}
function jobFrame(dt,time){
  if(!JOB.root||!JOB.on)return;
  const k=JOB.k,R=JOB.root;
  if(JOB.st==='fall'){
    JOB.vy-=34*dt;JOB.y+=JOB.vy*dt;
    const h0=Math.max(.1,JOB.y0-FLOOR_Y),f=clamp((JOB.y-FLOOR_Y)/h0,0,1);JOB.tilt*=1;   // the tilt it was dropped with straightens out on the way down and is exactly zero at the floor
    if(JOB.y<=FLOOR_Y){
      const v=-JOB.vy;JOB.y=FLOOR_Y;
      if(!JOB.bounced&&v>4){JOB.bounced=true;JOB.vy=v*.16;JOB.sqv=-Math.min(v*.5,9);Au.crash(clamp(v/22,.25,.8));camShake=Math.max(camShake,clamp(v/40,.1,.5));}
      else{JOB.vy=0;JOB.st='rest';JOB.sqv-=Math.min(v*.25,3);}
    }
    JOB.fall=f;
  }else if(JOB.st==='stow'){
    JOB.stow=Math.min(1,JOB.stow+dt/.35);const e=JOB.stow*JOB.stow;
    JOB.x+=(L.hw+1-JOB.x)*Math.min(1,dt*6);JOB.y+=(FLOOR_Y+2-JOB.y)*Math.min(1,dt*3);R.scale.setScalar(Math.max(.001,1-e));
    if(JOB.stow>=1){JOB.st='none';JOB.on=false;R.visible=false;JOB.sh.visible=false;JOB.blk=null;return;}
  }
  if(JOB.st==='held'){JOB.fall=1;}
  /* squash spring (landing) */
  if(JOB.sq||JOB.sqv){for(let i=0;i<2;i++){const h=dt/2;JOB.sqv+=(-260*JOB.sq-14*JOB.sqv)*h;JOB.sq+=JOB.sqv*h;}if(Math.abs(JOB.sq)<.0004&&Math.abs(JOB.sqv)<.004)JOB.sq=JOB.sqv=0;}
  const sq=clamp(JOB.sq,-.05,.06);
  const tilt=JOB.st==='fall'?JOB.tilt*(JOB.fall||0):JOB.st==='held'?Math.sin(time*5)*.02:0;
  R.position.set(JOB.x,JOB.y,JOB.z);R.rotation.z=tilt;
  JOB.sw.rotation.y=Math.atan2(JOB.x+JOB.SIGN_X*k-cam.position.x,Math.max(4,cam.position.z-JOB.z))*.9;   // the logo looks at the camera
  JOB.rot.scale.set(k*(1-sq*.5),k*(1+sq),k*(1-sq*.5));
  /* soft shadow on the floor */
  const hgt=Math.max(0,JOB.y-FLOOR_Y),e=jobExt(),w=(e.l+e.r)*.5,cx=JOB.x+(e.r-e.l)*.5*1;
  JOB.sh.visible=JOB.st!=='stow'&&hgt<5;const s=1/(1+hgt*.2);
  JOB.sh.position.set(JOB.x+(JOB.SIGN_X*.5+2)*k-(0),FLOOR_Y+.012,JOB.z);JOB.sh.scale.set(Math.max(.001,w*2.1*s),1,Math.max(.001,JOB.CL*2*k*1.15*s));
  JOB.sh.material.opacity=JOB.st==='stow'?0:1;
  JOB.blk=JOB.st==='rest'?{l:JOB.x-JOB.CL*k,r:JOB.x+JOB.CL*k,zf:JOB.z+14.6*k+.1}:null;
}
window.__job={JOB,jobSpawn,jobStow,get dogs(){return DOGS;},DOG_JOB,DS,dogCall2,dogToggle,TOY,W,dog};   // test hook
