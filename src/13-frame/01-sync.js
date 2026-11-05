/* ---------- per-frame sync: physics -> meshes ---------- */
function catmull(p0,p1,p2,p3,t,out){const t2=t*t,t3=t2*t;out.x=.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3);
  out.y=.5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3);out.z=.5*((2*p1.z)+(-p0.z+p2.z)*t+(2*p0.z-5*p1.z+4*p2.z-p3.z)*t2+(-p0.z+3*p1.z-3*p2.z+p3.z)*t3);return out;}
const cp=[];for(let i=0;i<NMAX;i++)cp.push({x:0,y:0,z:0});
const _smooth=k=>k*k*(3-2*k);
function syncCable(dt){
  const h=hpState,r=h.rope,n=r.length,last=n-1,ns=last*3+1;
  const aimT=h.s==='plugged'?1:(h.s==='seek'?(()=>{const e=r[last],d=Math.hypot(e.position.x/PXU-JACK.x,-e.position.y/PXU-JACK.y);return _smooth(clamp((1.5-d)/1.3,0,1));})():0);
  h.aim+=(aimT-h.aim)*(1-Math.exp(-dt*9));
  const zEnd=lerp(lerp(.52,FZ+PLUG_LEN+.3,h.aim),FZ+PLUG_LEN-.1,h.plugAmt),pz=h.worn?hp.localToWorld(new T.Vector3(1.25,-.76,0)).z:hpRoot.position.z+PORT.z*h.scale;   // pz: depth of the boot on the (turned) cup, so the cable visibly comes out of it
  for(let i=0;i<n;i++){const b=r[i];cp[i].x=b.position.x/PXU;cp[i].y=-b.position.y/PXU;
    const base=lerp(.34,.52,i/last),w=_smooth(clamp((i-(n-8))/7,0,1));cp[i].z=lerp(pz,base+(zEnd-base)*w,_smooth(clamp(i/5,0,1)));}
  let m=0;
  for(let i=0;i<last;i++){const p0=cp[Math.max(0,i-1)],p1=cp[i],p2=cp[i+1],p3=cp[Math.min(last,i+2)];for(let q=0;q<3;q++)catmull(p0,p1,p2,p3,q/3,_p[m++]);}
  _p[m].set(cp[last].x,cp[last].y,cp[last].z);
  const pos=cableGeo.attributes.position.array,nor=cableGeo.attributes.normal.array,R=.036;
  for(let i=0;i<ns;i++){
    const a=_p[Math.max(0,i-1)],b=_p[Math.min(ns-1,i+1)];_tmpA.set(b.x-a.x,b.y-a.y,b.z-a.z).normalize();
    if(Math.abs(_tmpA.z)>.85)_tmpB.set(0,1,0);else _tmpB.set(0,0,1);
    _tmpB.crossVectors(_tmpA,_tmpB).normalize();_tmpC.crossVectors(_tmpA,_tmpB);
    for(let j=0;j<CRAD;j++){const th=j/CRAD*TAU,c=Math.cos(th),sn=Math.sin(th),nx=_tmpB.x*c+_tmpC.x*sn,ny=_tmpB.y*c+_tmpC.y*sn,nz=_tmpB.z*c+_tmpC.z*sn,o=(i*CRAD+j)*3;
      pos[o]=_p[i].x+nx*R;pos[o+1]=_p[i].y+ny*R;pos[o+2]=_p[i].z+nz*R;nor[o]=nx;nor[o+1]=ny;nor[o+2]=nz;}}
  cableGeo.attributes.position.needsUpdate=true;cableGeo.attributes.normal.needsUpdate=true;cableGeo.setDrawRange(0,(ns-1)*CRAD*6);
  /* plug pose: pin follows the cable's end direction, swings round to face the jack as it gets close */
  const e=cp[last],pr=cp[last-1];_tmpA.set(e.x-pr.x,e.y-pr.y,0);if(_tmpA.lengthSq()<1e-6)_tmpA.set(1,0,0);_tmpA.normalize();
  _tmpB.set(0,0,-1);_tmpA.lerp(_tmpB,h.aim).normalize();
  plug2.position.set(e.x,e.y,zEnd);plug2.quaternion.setFromUnitVectors(_tmpB,_tmpA);
  if(h.flash>0){h.flash=Math.max(0,h.flash-dt*2.4);jackRing.material.opacity=h.flash*.85;jackRing.scale.setScalar(1+(1-h.flash)*.9);}else if(jackRing.material.opacity!==0)jackRing.material.opacity=0;
}
function physFrame(dt,time){
  if(!PHYS||!physOn)return;
  payOut();                                                                                          // endless cable: never pulls the plug out, it just pays out more line
  physAcc+=Math.min(dt,.05);let n=0;while(physAcc>=DT_MS/1000&&n<10){Engine.update(eng,DT_MS);physAcc-=DT_MS/1000;n++;}
  /* remote */
  if(rem.body){const p=bodyWorld(rem.body);rem.g.position.set(p.x,p.y,rem.z);rem.g.rotation.z=-rem.body.angle;
    placeBlob(blobRem,p.x,rem.z-.5,1.1,.8,p.y-RH/2-FLOOR_Y);}
  /* headphones + cable */
  if(hpState.s!=='none'){const h=hpState,b=h.body,ca=Math.cos(b.angle),sa=Math.sin(b.angle);
    const ox=b.position.x+(h.org.x*ca-h.org.y*sa),oy=b.position.y+(h.org.x*sa+h.org.y*ca);
    if(!h.worn){
      hpRoot.position.set(ox/PXU,-oy/PXU,.3);hpRoot.rotation.z=-b.angle;
      const pointer=grab.kind==='hp'?grab.pointer:null;
      const anchor=pointer&&dog.ready&&dog.present&&!dog.leaving?wAnchor('hat'):null;
      const dist=anchor?Math.hypot(pointer.x-anchor.x,pointer.y-anchor.y):Infinity;
      const near=clamp((220-dist)/140,0,1);
      h.dragNear+=(near-h.dragNear)*(1-Math.exp(-dt*13));
      hpRoot.scale.setScalar(h.scale*(1-.54*h.dragNear));
    }
    if(!h.worn)placeBlob(blobHp,ox/PXU,.3,3.1*hpRoot.scale.x,1.0*hpRoot.scale.x,-oy/PXU-.58*hpRoot.scale.x-FLOOR_Y);else blobHp.visible=false;
    syncCable(dt);}
  /* TV */
  if(tv.b&&tv.state==='on'&&tv.landed&&!(grab.kind==="tv")&&Math.abs(tv.b.angle)>.01&&Math.abs(tv.b.angle)<1.1)Body.setAngularVelocity(tv.b,tv.b.angularVelocity-tv.b.angle*.0025);   // a set that's been dropped settles upright
  if(tv.b){const p=bodyWorld(tv.b);tv.g.position.set(p.x,p.y,0);tv.g.rotation.z=-tv.b.angle;
    placeBlob(blobTv,p.x,-.75,TVW*1.05,3.1,p.y-TVH/2-FLOOR_Y);
    if(tv.state==='sinking')blobTv.visible=false;
    tv.poke=Math.max(0,tv.poke-dt*3);
    const a=cd&&(cdIn||status!=='empty')?ALBUMS[cd.ai]:null;
    tv.album=a;tv.mode=!a?'noise':(a.yt&&YTA.cur&&(status==='playing'||status==='paused')?'video':'thumb');
    tv.punch.visible=tv.mode==='video';crtDraw(time);
    ytLayout(tv.mode==='video'&&tv.pw>.02);
  }else ytLayout(false);
  hole.g.position.set(hole.x,FLOOR_Y+.015,-.95);hole.g.scale.set(Math.max(.001,hole.rx*hole.k),1,Math.max(.001,hole.rz*hole.k));
  /* the player floats: soft bobbing, shadow on the floor */
  placeBlob(blobPlayer,player.position.x,0,PW*.95,1.3,player.position.y-PH/2-FLOOR_Y);
  if(shakeT>0)shakeT=Math.max(0,shakeT-dt);
  /* safety net: anything that escaped the world comes back */
  dynBodies().forEach(b=>{if(b!==tv.b&&b.position.y>myp(FLOOR_Y-6)){Body.setPosition(b,{x:0,y:myp(L.half)});Body.setVelocity(b,{x:0,y:0});}});
}
physOn=PHYS;
floorClip.constant=-FLOOR_Y;
buildBounds();floorClip.constant=-FLOOR_Y;spawnRemote();

