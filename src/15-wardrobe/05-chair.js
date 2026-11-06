/* ---------- the froggy chair ("青蛙椅", cabinet item t_chair, models/wardrobe/src/t_chair) ----------
   Drag it out of the cabinet's toy row (or tap it, then click empty space): it drops from the pointer, squashes a little and stands on the floor, turned about 20 degrees toward the camera like the TV.
   Grab it again to move it (it falls again where you let go); let go over the cabinet / the right edge to put it away. Like the part-time job set it is not part of any physics world.
   Up to CHAIR.MAX chairs. A free chair is taken by the NEAREST character (puppy or cartoon friend) that has no chair yet (chairAssign, called from dogsFrame): it walks over, turns the way the chair faces and sits on it.
   The seat belongs to that character until it leaves or the chair is picked up; a real job (CD, apple, ball, being petted) comes first, then it goes back to the chair. Whoever has no chair keeps doing the TV / counter / idling.
   Dog side: dogFrame (14-dog/01-dog.js) has mode 'chair' (walk to chairSeat(), sit, and rise by the seat height dog.cy). Layout: the model is in its own units (seat disc radius 10.6, seat top y=11.99, backrest and frog eyes at -Z, front = +Z); CHAIR.k scales it to the world. */
const CHAIR={list:[],MAX:3,k:.1,z:.35,yaw:-.36,seatY:11.99,sink:.05,mats:{},held:null,rc:new T.Raycaster(),nd:new T.Vector2(),err:0};
const chairHeld=()=>!!CHAIR.held;
function chairMat(it){return CHAIR.mats[it.id]||(CHAIR.mats[it.id]=(()=>{const m=it.mat.clone();m.transparent=false;m.depthWrite=true;m.alphaTest=0;m.side=T.FrontSide;return m;})());}
function chairSpawn(x,y){
  const it=W.items.t_chair;if(!it||!PHYS)return null;
  if(CHAIR.list.length>=CHAIR.MAX)chairRemove(CHAIR.list[0]);
  const root=new T.Group(),rot=new T.Group(),m=new T.Mesh(it.geo,chairMat(it));
  rot.rotation.y=CHAIR.yaw;rot.scale.setScalar(CHAIR.k);rot.add(m);root.add(rot);root.traverse(o=>o.layers.enable(1));scene.add(root);
  const sh=new T.Mesh(wSoftGeo,wMat.soft.clone());sh.renderOrder=1;scene.add(sh);
  const lim=Math.max(1,L.hw-1.5);
  const c={it,root,rot,sh,x:clamp(x,-lim,lim),y:Math.max(y,FLOOR_Y+2),z:CHAIR.z,vy:0,y0:1,tilt:(Math.random()<.5?-1:1)*(.12+Math.random()*.1),sq:0,sqv:0,bounced:false,st:'fall',stow:0,fall:1,sitter:null};
  c.y0=c.y;root.position.set(c.x,c.y,c.z);CHAIR.list.push(c);Au.click(1.8,.4);return c;
}
function chairRemove(c){
  if(c.sitter){const s=DS(c.sitter);if(s.chair===c)s.chair=null;c.sitter=null;}
  if(CHAIR.held&&CHAIR.held.c===c)CHAIR.held=null;
  scene.remove(c.root);scene.remove(c.sh);c.sh.material.dispose();
  const i=CHAIR.list.indexOf(c);if(i>=0)CHAIR.list.splice(i,1);
}
function chairStow(c){c.st='stow';c.stow=0;if(CHAIR.held&&CHAIR.held.c===c)CHAIR.held=null;Au.click(1.1,.45);buzz(8);}
/* the pointer is on a chair (and not on a character sitting / standing in front of it) */
function chairHit(e){
  if(!CHAIR.list.length)return null;
  const r=cvs.getBoundingClientRect();CHAIR.nd.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);CHAIR.rc.setFromCamera(CHAIR.nd,cam);
  let best=null,bd=1e9;
  for(const c of CHAIR.list){if(c.st==='stow'||!c.root.visible)continue;const h=CHAIR.rc.intersectObject(c.rot,true)[0];if(h&&h.distance<bd){bd=h.distance;best=c;}}
  if(!best)return null;
  const I=typeof dogWhoAt==='function'?dogWhoAt(e.clientX,e.clientY):null;
  if(I&&DS(I).z>best.z+.02)return null;   // a character in front of the chair is in front of it
  return best;
}
function chairGrab(c,e,pid){
  setNDC(e);const q=planeHit(CHAIR.z);if(!q)return;
  if(c.sitter){const s=DS(c.sitter);if(s.chair===c)s.chair=null;c.sitter=null;}   // whoever sat on it gets up
  CHAIR.held={c,ox:c.x-q.x,oy:c.y-q.y,id:pid};c.st='held';c.vy=0;c.tilt=0;Au.click(1.5,.4);buzz(6);
}
cvs.addEventListener('pointerdown',e=>{
  if(e.button>0||CHAIR.held)return;
  const c=chairHit(e);if(!c||(c.st!=='rest'&&c.st!=='fall'))return;
  e.stopImmediatePropagation();e.stopPropagation();try{cvs.setPointerCapture(e.pointerId);}catch(_){}
  chairGrab(c,e,e.pointerId);
},{capture:true});
cvs.addEventListener('pointermove',e=>{
  const H=CHAIR.held;
  if(!H){if(!TOY.sel&&!W.drag&&!pd&&!JOB.held&&CHAIR.list.some(c=>c.st==='rest')&&chairHit(e))cvs.style.cursor='grab';return;}
  setNDC(e);const q=planeHit(CHAIR.z);if(!q)return;
  H.c.x=q.x+H.ox;H.c.y=Math.max(FLOOR_Y,q.y+H.oy);cvs.style.cursor='grabbing';
});
function chairRelease(e){
  const H=CHAIR.held;if(!H)return;
  try{cvs.releasePointerCapture(H.id);}catch(_){}
  CHAIR.held=null;cvs.style.cursor='default';const c=H.c;
  if(e&&jobOverCabinet(e)){chairStow(c);return;}
  c.x=clamp(c.x,-L.hw+1.5,L.hw-1.5);c.y0=c.y;c.vy=0;c.tilt=0;c.bounced=false;c.st='fall';
}
cvs.addEventListener('pointerup',e=>{if(CHAIR.held){e.stopImmediatePropagation();chairRelease(e);}},{capture:true});
cvs.addEventListener('pointercancel',()=>{if(CHAIR.held)chairRelease(null);},{capture:true});
/* where a character sits: the middle of the seat, a little in front of the chair's centre so the backrest stays behind it. h = seat height above the floor */
function chairSeat(c){
  if(!c||c.st!=='rest')return null;
  return {x:c.x,z:c.z+.1,h:Math.max(0,c.y-FLOOR_Y)+CHAIR.k*CHAIR.seatY-CHAIR.sink,ry:CHAIR.yaw};
}
/* who sits where: every free chair goes to the nearest character that has no chair yet. whoever already has one keeps it (until it leaves, or the chair is picked up) */
function chairAssign(){
  if(!CHAIR.list.length&&!DOGS.list.some(I=>DS(I).chair)){return;}
  const ok=I=>{const s=DS(I);return !I.pend&&s.present&&!s.leaving;};
  for(const c of CHAIR.list)if(c.sitter&&(c.st!=='rest'||!ok(c.sitter)||DS(c.sitter).chair!==c)){const s=DS(c.sitter);if(s.chair===c)s.chair=null;c.sitter=null;}
  for(const I of DOGS.list){const s=DS(I);if(s.chair&&(!CHAIR.list.includes(s.chair)||s.chair.sitter!==I))s.chair=null;}
  const pairs=[];
  for(const c of CHAIR.list)if(c.st==='rest'&&!c.sitter)for(const I of DOGS.list)if(ok(I)&&!DS(I).chair){const s=DS(I);pairs.push({c,I,d:Math.abs(s.x-c.x)+(s.lie.s!=='none'?4:0)});}
  pairs.sort((a,b)=>a.d-b.d);
  for(const p of pairs){if(p.c.sitter||DS(p.I).chair)continue;p.c.sitter=p.I;DS(p.I).chair=p.c;}
}
function chairFrame(dt,time){
  for(let i=CHAIR.list.length-1;i>=0;i--){
    const c=CHAIR.list[i],R=c.root;
    if(c.st==='fall'){
      c.vy-=34*dt;c.y+=c.vy*dt;
      const h0=Math.max(.1,c.y0-FLOOR_Y);c.fall=clamp((c.y-FLOOR_Y)/h0,0,1);   // the tilt it was dropped with straightens out on the way down
      if(c.y<=FLOOR_Y){
        const v=-c.vy;c.y=FLOOR_Y;
        if(!c.bounced&&v>4){c.bounced=true;c.vy=v*.16;c.sqv=-Math.min(v*.5,9);Au.crash(clamp(v/22,.25,.8));camShake=Math.max(camShake,clamp(v/40,.1,.5));}
        else{c.vy=0;c.st='rest';c.sqv-=Math.min(v*.25,3);}
      }
    }else if(c.st==='stow'){
      c.stow=Math.min(1,c.stow+dt/.35);const e=c.stow*c.stow;
      c.x+=(L.hw+1-c.x)*Math.min(1,dt*6);c.y+=(FLOOR_Y+2-c.y)*Math.min(1,dt*3);R.scale.setScalar(Math.max(.001,1-e));
      if(c.stow>=1){chairRemove(c);continue;}
    }else if(c.st==='held')c.fall=1;
    else if(c.st==='rest'){const lim=Math.max(1,L.hw-1.5);c.x=clamp(c.x,-lim,lim);}   // the screen got narrower
    if(c.sq||c.sqv){for(let n=0;n<2;n++){const h=dt/2;c.sqv+=(-260*c.sq-14*c.sqv)*h;c.sq+=c.sqv*h;}if(Math.abs(c.sq)<.0004&&Math.abs(c.sqv)<.004)c.sq=c.sqv=0;}
    const sq=clamp(c.sq,-.05,.06);
    R.position.set(c.x,c.y,c.z);R.rotation.z=c.st==='fall'?c.tilt*c.fall:c.st==='held'?Math.sin(time*5)*.03:0;
    c.rot.scale.set(CHAIR.k*(1-sq*.5),CHAIR.k*(1+sq),CHAIR.k*(1-sq*.5));
    const hgt=Math.max(0,c.y-FLOOR_Y),s=1/(1+hgt*.2);
    c.sh.visible=c.st!=='stow'&&hgt<5;c.sh.position.set(c.x,FLOOR_Y+.012,c.z);c.sh.scale.set(Math.max(.001,2.5*CHAIR.k*11*s),1,Math.max(.001,2.4*CHAIR.k*11*s*.8));
    c.sh.material.opacity=c.st==='stow'?0:1;
  }
}
window.__chair={CHAIR,chairSpawn,chairRemove,chairStow,chairAssign,chairSeat,get dogs(){return DOGS;},DS,dog,W,TOY};   // test hook
