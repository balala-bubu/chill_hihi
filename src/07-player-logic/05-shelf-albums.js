/* ---------- albums on the shelf ---------- */
/* one step of shelf motion per frame: drag follow / spring + wheel settle, then the pointer's hover on the shelf */
function shelfStep(dt){
  if(shelfDrag&&pd&&pd.kind==='shelf'){
    const w=shelfWorld(pd.cx,pd.cy);
    if(w){
      let t=pd.u0-slotD(w.x);                                   // the slot coordinate grabbed at pointerdown stays under the pointer
      if(t<0)t*=.35;else if(t>N-1)t=N-1+(t-(N-1))*.35;          // past either end it gives, like a rubber band
      t=clamp(t,-.9,N-.1);
      const p0=sx;sx+=(t-sx)*(1-Math.exp(-dt*SH.follow));       // ~25ms of easing: filters event-timing jitter and still feels glued
      sxVel=lerp(sxVel,(sx-p0)/Math.max(dt,.001),1-Math.exp(-dt*25));
    }
  }else{
    if(wheelLive&&performance.now()-wheelT>SH.wheelIdle){      // the wheel has been quiet: settle on an album (a tiny scroll still moves one)
      const mv=sxTarget-wheelFrom;let s=Math.round(sxTarget);
      if(s===Math.round(wheelFrom)&&Math.abs(mv)>.12)s+=Math.sign(mv);
      sxTarget=clamp(s,0,N-1);wheelLive=false;}
    const w=SH.spring,d=sx-sxTarget,e=Math.exp(-w*dt),c=sxVel+w*d;   // critically damped spring, keeps the velocity the drag left behind
    sx=sxTarget+(d+c*dt)*e;sxVel=(sxVel-w*c*dt)*e;
    if(Math.abs(sx-sxTarget)<.0005&&Math.abs(sxVel)<.01){sx=sxTarget;sxVel=0;}
    sx=clamp(sx,-.9,N-.1);
  }
  /* hover: where the pointer is along the shelf, in slot space */
  let want=0,uRaw=shHov.u;
  if(shPtr.ok&&(state==='home'||state==='stage')&&shelfVis>.6&&(!pd||pd.kind==='shelf')&&!(cd&&cd.mode==='drag')&&!toolsHold()){
    const w=shelfWorld(shPtr.x,shPtr.y);
    if(w){shHov.wx=w.x;shHov.wy=w.y;uRaw=sx+slotD(w.x);
      if(w.y>L.shelfB-.1&&w.y<L.shelfB+2.1)want=shelfDrag?.55:1;}}   // only while the pointer is in the band the albums stand in
  /* hover to centre: rest the pointer on an album and it slides to the middle. it only fires after the pointer has really moved (so a shelf that scrolls under a still pointer
     can't chain-scroll itself) and after a short dwell on the same album; once it has fired the pointer has to move again before it can fire again */
  if(want===1&&!pd&&!wheelLive&&shPtr.armed&&Math.abs(sx-sxTarget)<.6){
    const idx=Math.round(uRaw);
    if(idx>=0&&idx<N&&Math.abs(uRaw-idx)<.46){
      if(idx!==shPtr.dIdx){shPtr.dIdx=idx;shPtr.dT=0;}
      else if((shPtr.dT+=dt)>=SH.centerDwell){shPtr.armed=false;shPtr.fx=shPtr.x;shPtr.fy=shPtr.y;shPtr.dIdx=-1;if(idx!==Math.round(sxTarget))sxTarget=idx;}
    }else shPtr.dIdx=-1;}
  else if(!want)shPtr.dIdx=-1;
  shHov.w+=(want-shHov.w)*(1-Math.exp(-dt*(want>shHov.w?10:7)));if(shHov.w<.002&&!want)shHov.w=0;
  if(shHov.w<.03)shHov.u=uRaw;else shHov.u+=(uRaw-shHov.u)*(1-Math.exp(-dt*18));   // no sweep from a stale spot when the pointer arrives
  const kt=1-Math.exp(-dt*12);
  albums.forEach((a,i)=>{
    a.hv=shHov.w>0?hoverBell(i-shHov.u)*shHov.w:0;
    /* tilt toward the pointer: normalised pointer offset from the album's centre, eased */
    const nx=a.hv>.01?clamp((shHov.wx-a.g.position.x)/.8,-1,1):0,ny=a.hv>.01?clamp((shHov.wy-a.g.position.y)/.8,-1,1):0;
    a.tx+=(nx-a.tx)*kt;a.ty+=(ny-a.ty)*kt;});
}
function placeAlbums(time){
  albums.forEach((a,i)=>{
    const d=i-sx,ad=Math.abs(d),f=clamp(1-ad,0,1),k=a.k,hv=a.hv*(1-k);
    const x0=slotX(d)+hoverPush(i)*(1-k),s0=(1+.16*f)*(1+SH.hvScale*hv),y0=L.shelfB+.75*s0+shelfOff+SH.hvLift*hv,z0=.3*f+SH.hvForward*hv,r0=(1.05-.14*f)*(1-SH.hvTurn*hv);
    a.g.position.set(lerp(x0,SEL.x,k),lerp(y0,SEL.y+Math.sin(time*1.3)*.05*k,k),lerp(z0,SEL.z,k)+Math.sin(k*Math.PI)*1.6);
    a.g.scale.setScalar(lerp(s0,SEL.s,k)*Math.max(.001,a.born));a.g.rotation.y=lerp(r0,0,k)+a.tx*SH.hvTilt*hv;a.g.rotation.x=-a.ty*SH.hvTiltX*hv;a.g.rotation.z=Math.sin(k*Math.PI)*-.08;
    a.piv.rotation.y=-2.5*a.open;
    const m=a.mag;
    if(m>.001&&cd&&cd.ai===i){const e=ease.io3(m),P=a.g.position;P.x=lerp(P.x,cd.pos.x,e);P.y=lerp(P.y,cd.pos.y,e);P.z=lerp(P.z,.8,e);
      a.g.scale.setScalar(lerp(a.g.scale.x,1.45,e));a.g.rotation.y=lerp(a.g.rotation.y,0,e);}
  });
}

