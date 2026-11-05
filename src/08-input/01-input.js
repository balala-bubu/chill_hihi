/* ---------- input ---------- */
let pd=null,dragY0=0;
/* the pointer is inside the band the shelf occupies while it is out: there, a press scrolls the albums, it never grabs the player behind them */
function onShelf(){const g=planeHit(0);return !!(g&&g.y>L.shelfB-.2&&shelfVis>.6&&(state==='home'||state==='stage'));}
function grabCD(e){
  const c=cd;const fromIn=c.mode==='in';c.mz=false;
  c.dragFrom=fromIn?'stage':(state==='albumOpen'?'case':'stage');c.committed=c.dragFrom==='stage';
  if(fromIn){cdIn=false;status='empty';Au.stop();}
  c.zT=c.dragFrom==='case'?c.pos.z+.9:.58;c.mode='drag';c.vel.set(0,0);c.safeX=c.pos.x;c.safeY=c.pos.y;
  const h=planeHit(c.zT);if(h)c.off.set(c.pos.x-h.x,c.pos.y-h.y);dragY0=e.clientY;
  cvs.style.cursor='grabbing';
}
function releaseCD(){
  const c=cd;if(!c||c.mode!=='drag')return;
  if(!c.committed){c.mode='case';return;}
  const d=Math.hypot(c.pos.x-BAY.x,c.pos.y-BAY.y);
  if(lidOpen&&!cdIn&&d<1.8){insertCD();return;}
  if(cdAlbum>=0&&albums[cdAlbum].mag>.45){dockCD();return;}
  c.mode='free';c.spin=c.vel.x*.45;
}
cvs.addEventListener('pointerdown',e=>{
  Au.ensure();setNDC(e);const h=pick();
  pd={x:e.clientX,y:e.clientY,lx:e.clientX,moved:false,kind:'bg',album:-1};
  try{cvs.setPointerCapture(e.pointerId);}catch(_){}
  const o=h&&h.object;
  if(PHYS&&o&&o.userData.phys&&(o.userData.phys==='hp'||(state!=='album'&&state!=='albumOpen'&&state!=='opening'))){
    const wasWorn=o.userData.phys==='hp'&&hpState.worn;
    if(startPhysGrab(h)){pd.kind='phys';cvs.style.cursor='grabbing';if(wasWorn)e.stopPropagation();return;}
  }
  if(busy)return;
  if(o&&o.userData.cd){grabCD(e);pd.kind='cd';}
  else if(o&&o.userData.key!==undefined){pd.kind='key';press(o.userData.key);}
  else if(o&&o.userData.album!==undefined){
    pd.album=o.userData.album;
    if(state==='album'&&pd.album===sel)pd.kind='selTap';
    else if((state==='home'||state==='stage')&&shelfVis>.6)shelfGrab(e);
    else pd.kind='bg';
  }
  else if(o&&isPlayerObj(o)&&!onShelf()){pd.kind='player';const g0=planeHit(FZ);if(g0){pd.h0=g0.clone();pd.ux0=pDrag.tx;pd.uy0=pDrag.ty;}}
  else{const g=planeHit(0);if(g&&g.y>L.shelfB-.2&&shelfVis>.6&&(state==='home'||state==='stage'))shelfGrab(e);}
});
/* pressing the shelf: remember which slot coordinate is under the pointer and stop any glide, so a tap catches a moving shelf */
function shelfGrab(e){
  const w=shelfWorld(e.clientX,e.clientY);
  pd.kind='shelf';pd.cx=e.clientX;pd.cy=e.clientY;pd.u0=w?sx+slotD(w.x):sx;
  sxVel=0;sxTarget=clamp(Math.round(sx),0,N-1);wheelLive=false;shelfDrag=false;}
/* The shelf stays tucked away until the pointer visits the top edge of the screen (with hysteresis so it doesn't flicker). */
function trackTop(e){if(e.pointerType==='touch')return;const f=e.clientY/innerHeight;if(f<.13)topHover=true;else if(f>.3)topHover=false;}
cvs.addEventListener('pointerleave',()=>{hoverKey=-1;shPtr.ok=false;if(!pd)topHover=false;});
cvs.addEventListener('pointermove',e=>{
  setNDC(e);rig.ptx=ndc.x;rig.pty=ndc.y;trackTop(e);
  shPtr.x=e.clientX;shPtr.y=e.clientY;shPtr.ok=e.pointerType!=='touch';   // the shelf reads these once per frame (shelfStep)
  if(!shPtr.armed&&Math.hypot(e.clientX-shPtr.fx,e.clientY-shPtr.fy)>SH.centerMove)shPtr.armed=true;   // moved again since the last hover-centre: it may fire again
  if(pd&&pd.kind==='shelf'){pd.cx=e.clientX;pd.cy=e.clientY;}
  if(!pd){
    const h=pick(),o=h&&h.object;let cur='default';hoverKey=-1;
    if(o&&o.userData.phys)cur=o.userData.rbtn!==undefined?'pointer':'grab';else if(o&&!busy){if(o.userData.cd)cur='grab';else if(o.userData.key!==undefined){cur='pointer';hoverKey=o.userData.key;}else if(o.userData.album!==undefined)cur=(state==='home'||state==='album'?'pointer':'default');else if(isPlayerObj(o))cur='grab';}
    cvs.style.cursor=cur;return;
  }
  if(Math.hypot(e.clientX-pd.x,e.clientY-pd.y)>(pd.kind==='shelf'?(e.pointerType==='touch'?8:4):pd.kind==='phys'?8:6))pd.moved=true;
  if(pd.kind==='phys'){moveGrab(e);return;}
  /* shelf drag: just start it. the albums are moved in shelfStep, once per frame, from the latest pointer position */
  if(pd.kind==='shelf'&&pd.moved&&!shelfDrag){shelfDrag=true;cvs.style.cursor='grabbing';}
  pd.lx=e.clientX;
  /* drag the player around: pure translation (no tilt, no flip). The click that opens the lid only fires when the pointer didn't move. */
  if(pd.kind==='player'&&pd.moved&&pd.h0&&!busy&&(state==='home'||state==='stage')){
    const h=planeHit(FZ);
    if(h){pDrag.on=true;cvs.style.cursor='grabbing';
      const lim=L.hw-PW/2-.15,tvOn=tv.state==='falling'||tv.state==='on';
      pDrag.tx=clamp(pd.ux0+h.x-pd.h0.x,tvOn?0:-lim-pOff.x,lim-pOff.x);                 // with the TV out it can only go further right, away from the set
      pDrag.ty=clamp(pd.uy0+h.y-pd.h0.y,-.3,L.top-.2-PH/2-PY);}}                          // stays above the floor and on screen
  if(pd.kind==='cd'&&cd&&cd.mode==='drag'&&!cd.committed&&e.clientY-dragY0>innerHeight*.18)commitStage();
});
function closeTools(){setMenu(false);setPanel(null);setForm(false);}
function up(){
  if(!pd)return;const p=pd;pd=null;pDrag.on=false;
  if(p.kind==='bg'&&!p.moved)closeTools();   // tap on empty background: put the tools away (the shelf follows)
  if(p.kind==='phys'){endPhysGrab(p.moved);cvs.style.cursor='default';return;}
  if(p.kind==='cd'){releaseCD();}
  else if(p.kind==='shelf'){
    if(!p.moved&&p.album>=0)selectAlbum(p.album);
    else if(shelfDrag){
      /* let go: the spring keeps the speed the drag had and settles on the slot a flick would reach (sxVel has already decayed to ~0 if the pointer rested before release) */
      sxVel=clamp(sxVel,-SH.flickMax,SH.flickMax);
      sxTarget=clamp(Math.round(sx+clamp(sxVel*SH.flickLead,-1.6,1.6)),0,N-1);}
    shelfDrag=false;
  }
  else if(p.kind==='selTap'&&!p.moved)openAlbum();
  else if(p.kind==='player'&&!p.moved){if(!busy&&(state==='home'||state==='stage')){if(cdIn&&!lidOpen){Au.stop();status='stopped';setLid(true);}else if(!cdIn)setLid(!lidOpen);}}
  else if(p.kind==='bg'&&!p.moved&&!busy&&(state==='album'||state==='albumOpen'))cancelAlbum();
  else if(p.kind==='bg'&&!p.moved&&shelfPin&&(state==='home'||state==='stage'))shelfPin=false;
  cvs.style.cursor='default';
}
cvs.addEventListener('pointerup',up);cvs.addEventListener('pointercancel',up);
/* wheel / trackpad: continuous. the target follows every tick (about SH.wheelPx of travel = one album, the spring eases toward it), and once the wheel has been
   quiet for a moment shelfStep settles it on an album. trackpad inertia scrolls smoothly and ends on a slot instead of spinning past it or stepping in jerks */
cvs.addEventListener('wheel',e=>{if(state!=='home'&&state!=='stage')return;e.preventDefault();if(shelfVis<.6)return;
  const d0=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY,d=e.deltaMode===1?d0*16:e.deltaMode===2?d0*innerHeight:d0;
  if(!wheelLive){wheelLive=true;wheelFrom=sxTarget;}
  sxTarget=clamp(sxTarget+d/SH.wheelPx,-.35,N-.65);wheelT=performance.now();
},{passive:false});


