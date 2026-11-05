/* ---------- CD update ---------- */
function updateCD(dt){
  const c=cd;if(!c)return;
  const m=c.mode;
  if(m==='case'){
    const a=albums[c.ai],s=a.g.scale.x,k=1-Math.exp(-dt*16);
    c.pos.x+=(a.g.position.x-c.pos.x)*k;c.pos.y+=(a.g.position.y-c.pos.y)*k;c.pos.z+=(a.g.position.z+TRAY_Z*s+c.lift-c.pos.z)*k;
    c.root.rotation.x*=.85;c.root.rotation.y*=.85;
  }else if(m==='drag'){
    if(c.committed){const mg=cdAlbum>=0?albums[cdAlbum].mag:0;if(mg>.4)c.mz=true;else if(mg<.12)c.mz=false;c.zT=c.mz?2.0:cdLevel(c);}
    const h=planeHit(c.zT);
    if(h){
      c.off.multiplyScalar(Math.exp(-dt*2.5));
      const k=1-Math.exp(-dt*22),px=c.pos.x,py=c.pos.y;
      const mx=(h.x+c.off.x-c.pos.x)*k,my=(h.y+c.off.y-c.pos.y)*k;
      c.pos.z+=(c.zT-c.pos.z)*(1-Math.exp(-dt*10));
      const n=c.committed?Math.min(10,Math.ceil(Math.hypot(mx,my)/.35)):1;
      for(let i=0;i<n;i++){c.pos.x+=mx/n;c.pos.y+=my/n;if(c.committed)collide(c,null,0);}
      c.vel.x=lerp(c.vel.x,(c.pos.x-px)/Math.max(dt,.001),.35);c.vel.y=lerp(c.vel.y,(c.pos.y-py)/Math.max(dt,.001),.35);
    }
    const tl=c.committed&&overBody(c.pos)?.2:1;   // keep the disc almost flat while it travels over the player so its rim never digs into it
    c.root.rotation.y+=(clamp(c.vel.x*.035,-.45,.45)*tl-c.root.rotation.y)*.2;c.root.rotation.x+=(clamp(-c.vel.y*.035,-.45,.45)*tl-c.root.rotation.x)*.2;
    c.spin*=Math.exp(-dt*2);
  }else if(m==='free'){
    /* released in mid-air: it falls to the floor (gravity), bounces a little and slides to a stop; thrown fast it still flies first */
    const onFloor=c.pos.y<=FLOOR_Y+CDR+.13;
    c.vel.x*=Math.exp(-dt*(onFloor?4.2:.7));c.vel.y-=CD_G*dt;c.vel.y*=Math.exp(-dt*.25);
    if(onFloor&&Math.abs(c.vel.y)<Math.max(1.6,CD_G*dt*2.2))c.vel.y=0;   // resting: no micro-bounce at any frame rate
    c.pos.z+=(cdLevel(c)-c.pos.z)*(1-Math.exp(-dt*10));
    const n=Math.min(10,Math.ceil(Math.hypot(c.vel.x,c.vel.y)*dt/.35)||1);
    for(let i=0;i<n;i++){c.pos.x+=c.vel.x*dt/n;c.pos.y+=c.vel.y*dt/n;collide(c,c.vel,.62);}
    c.spin*=Math.exp(-dt*1.1);c.root.rotation.x*=.85;c.root.rotation.y*=.85;
    /* it has come to rest on the floor: it shrinks and drops flat onto the ground plane (see 'floor') */
    if(c.pos.y<=FLOOR_Y+CDR+.13&&Math.abs(c.vel.y)<.5&&Math.abs(c.vel.x)<.9){c.mode='floor';c.vel.y=0;Au.click(.55,.7);}
  }else if(m==='floor'){
    /* lying on the floor: small and flat. it slides to a stop and settles onto the floor plane, a bit nearer the camera, in the lane the dog walks in */
    const hw=L.hw-.9;
    c.vel.x*=Math.exp(-dt*5);c.pos.x=clamp(c.pos.x+c.vel.x*dt,-hw,hw);
    const k=1-Math.exp(-dt*9);c.pos.y+=(FLOOR_Y+.02-c.pos.y)*k;c.pos.z+=(FLOOR_Z-c.pos.z)*k;
    c.spin*=Math.exp(-dt*2.5);c.root.rotation.x*=.8;c.root.rotation.y*=.8;
  }else if(m==='carried'){
    /* in the dog's mouth: the dog places it every frame (dogFrame) */
    c.spin*=Math.exp(-dt*2.5);c.root.rotation.x*=.8;c.root.rotation.y*=.8;
  }else if(m==='in'){
    c.pos.set(BAY.x,BAY.y,FZ+.07);c.root.rotation.set(0,0,0);
    const target=status==='playing'?9:0;c.spin+=(target-c.spin)*(1-Math.exp(-dt*2.2));
  }
  /* small + flat while it lies on the floor or hangs in the dog's mouth; any other mode (picked up, thrown, inserted) eases it back to its normal size and pose.
     the shrink and the tilt live on the disc and the sheen ring, so the position, the root scale and the tween code of the other modes are untouched */
  {const on=m==='floor'||m==='carried',kf=1-Math.exp(-dt*(on?10:16)),tt=m==='floor'?1:m==='carried'?.62:0;
   c.flat+=((on?1:0)-c.flat)*kf;c.tilt+=(tt-c.tilt)*kf;if(c.flat<.002&&!on)c.flat=0;if(c.tilt<.002&&!on)c.tilt=0;
   const sc=lerp(1,FLAT_S,c.flat);c.disc.scale.setScalar(sc);c.rb.scale.setScalar(sc);
   c.disc.rotation.x=c.rb.rotation.x=-c.tilt*Math.PI/2;c.mesh.scale.setScalar(1+.8*c.flat);c.rb.visible=c.flat<.3;}   // the hit disc grows with it so a small CD is still easy to click
  if(m!=='insert')c.disc.rotation.z+=c.spin*dt;
}

