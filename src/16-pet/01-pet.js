/* ====================================================================
   DESKTOP PET runtime (active only with ?pet=full|mini, see 01-core/02-pet-config.js)
   - frame limiter: capped fps, lower while idle, can be paused (music keeps playing)
   - click-through: asks the desktop shell to ignore the mouse over fully transparent pixels
   - mini layout: dog + a small control bar that plays a playlist directly (no CD / player needed)
   - commands from the shell (tray menu, media keys, desktop cursor)
   ==================================================================== */

/* ---------- frame scheduling (used by every mode; outside pet mode it is plain requestAnimationFrame) ---------- */
function nextFrame(){
  if(!PET.on){requestAnimationFrame(frame);return;}
  if(PET.paused){PET.timer=setTimeout(nextFrame,300);return;}                  // paused: poll for resume, draw nothing
  const idle=performance.now()-PET.lastAct>PET.idleAfter,fps=idle?PET.idleFps:PET.fps,
        gap=1000/fps-(performance.now()-PET.lastRender);
  if(gap>8)PET.timer=setTimeout(()=>{PET.timer=0;requestAnimationFrame(frame);},gap-6);   // sleep instead of waking up every 16 ms
  else{PET.timer=0;requestAnimationFrame(frame);}
}
function petWake(){   // activity while a long sleep is pending: draw right away instead of waiting out the idle frame time
  if(PET.timer&&!PET.paused){clearTimeout(PET.timer);PET.timer=0;requestAnimationFrame(frame);}
}
function petApply(){
  if(!PET.on)return;
  const pr=Math.min(window.devicePixelRatio||1,PET.dpr);
  renderer.setPixelRatio(pr);if(dogOverlayRenderer)dogOverlayRenderer.setPixelRatio(pr);
  sun.castShadow=PET.shadow;if(!PET.card)floorMesh.visible=PET.shadow;
  layout();
}

/* ---------- click-through ----------
   With the shell around, the window ignores the mouse by default. Whenever the pointer moves we decide whether it is over something:
   a DOM control (grip, bar, menus) is found right away; for the 3D scene we read one pixel of the canvas after the next render
   and treat anything not (almost) transparent as "over the pet". The read only happens after the pointer moved, never every frame. */
function petSetIgnore(b){if(!PET.bridge||PET.hold||PET.ignore===b)return;PET.ignore=b;try{PET.bridge.setIgnore(b);}catch(e){}}
const _petPx=new Uint8Array(4);
function petProbe(r){
  const gl=r.getContext(),c=r.domElement,sx=c.width/innerWidth,sy=c.height/innerHeight;
  const x=clamp(Math.floor(PET.hx*sx),0,c.width-1),y=clamp(c.height-1-Math.floor(PET.hy*sy),0,c.height-1);
  gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,_petPx);return _petPx[3];
}
function petAfterRender(){
  const ov=PET.ovFrame;PET.ovFrame=false;
  if(!PET.bridge||!PET.wantHit||PET.hold)return;
  PET.wantHit=false;
  let a=petProbe(renderer);
  if(a<=40&&ov&&dogOverlayRenderer)a=Math.max(a,petProbe(dogOverlayRenderer));   // the dog in front of the TV video is drawn on its own canvas
  PET.over=a>40;petSetIgnore(!PET.over);
}
function petPointer(e){
  PET.lastAct=performance.now();petWake();
  if(!PET.bridge||PET.card)return;                           // the card is solid, the whole window takes the mouse
  PET.hx=e.clientX;PET.hy=e.clientY;
  const t=document.elementFromPoint(e.clientX,e.clientY);   // skips pointer-events:none elements, so only real controls count
  if(t&&t!==cvs&&t!==stage&&t!==document.body&&t!==document.documentElement){PET.over=true;petSetIgnore(false);}
  else PET.wantHit=true;
}

/* ---------- playback without the CD player (mini layout, media keys) ---------- */
const petLast=()=>{const i=+(LS.get('chillhihi.pet.last',0));return i>=0&&i<ALBUMS.length?i:0;};
function petPlayAlbum(i){
  const a=ALBUMS[i];if(!a)return;
  Au.ensure();PET.cur=i;LS.set('chillhihi.pet.last',i);
  Au.start(a);status='playing';petBarSync(true);
}
function petToggle(){
  if(!PET.mini){if(cd&&cdIn)press(0);return;}                                   // full layout: same as pressing ▶/❚❚ on the player
  if(status==='playing'){Au.pause();status='paused';}
  else if(status==='paused'){Au.resume();status='playing';}
  else petPlayAlbum(PET.cur>=0?PET.cur:petLast());
  petBarSync(true);
}
function petNext(){
  if(!PET.mini){if(cd&&cdIn)press(2);return;}
  if(status==='playing'||status==='paused'){Au.skipNext();status='playing';petBarSync(true);}
}
function petVol(d){
  const v0=Au.vol;Au.setVol(clamp(Au.vol+d,0,10));volT=1.4;if(typeof updateLeds==='function')updateLeds();
  PET.volShow=1.6;petBarSync(true);return Au.vol!==v0;
}
function petDog(on){
  const cur=dog.ready?(dog.present&&!dog.leaving):dog.wantShow;
  if(on!==cur)dogToggle();
}

/* ---------- mini control bar ---------- */
const petEl={};
function petBuildBar(){
  ['petBar','petTitle','petSub','pbPlay','pbNext','pbVm','pbVp','pbList','petList','petAlbums','petAddForm','petAddUrl'].forEach(k=>petEl[k]=$id(k));
  petEl.pbPlay.addEventListener('click',()=>{Au.ensure();petToggle();});
  petEl.pbNext.addEventListener('click',petNext);
  petEl.pbVm.addEventListener('click',()=>petVol(-1));
  petEl.pbVp.addEventListener('click',()=>petVol(1));
  petEl.pbList.addEventListener('click',()=>{const o=petEl.petList.hidden;petEl.petList.hidden=!o;petEl.pbList.setAttribute('aria-expanded',String(o));if(o)petRenderList();});
  petEl.petAddForm.addEventListener('submit',e=>{e.preventDefault();Au.ensure();addFromUrl(petEl.petAddUrl.value).then(()=>{petEl.petAddUrl.value='';petRenderList();});});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!petEl.petList.hidden){petEl.petList.hidden=true;petEl.pbList.setAttribute('aria-expanded','false');}});
}
function petRenderList(){
  const ul=petEl.petAlbums;ul.textContent='';
  ALBUMS.forEach((a,i)=>{
    const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.className='k3'+(i===PET.cur?' on':'');
    const t=document.createElement('span'),s=document.createElement('small');t.textContent=a.t||'PLAYLIST';s.textContent=a.a||'';
    b.append(t,s);b.addEventListener('click',()=>{petPlayAlbum(i);petEl.petList.hidden=true;petEl.pbList.setAttribute('aria-expanded','false');});
    li.appendChild(b);ul.appendChild(li);});
}
let _petBarKey='';
function petBarSync(force){
  if(!PET.mini||!petEl.petBar)return;
  const a=PET.cur>=0?ALBUMS[PET.cur]:null,playing=status==='playing',live=playing||status==='paused';
  const title=live?((YTA.inf&&YTA.inf.title)||(a&&a.t)||''):'選一張專輯',
        sub=PET.volShow>0?'VOL '+Au.vol+' / 10':live&&a?(a.a||'')+(YTA.inf&&YTA.inf.n?'  '+(YTA.inf.i+1)+'/'+YTA.inf.n:''):'按 ♫ 挑專輯，或按 ▶ 播放上次聽的';
  const key=title+'|'+sub+'|'+playing;
  if(!force&&key===_petBarKey)return;_petBarKey=key;
  petEl.petTitle.textContent=title;petEl.petSub.textContent=sub;
  petEl.pbPlay.textContent=playing?'❚❚':'▶';petEl.pbPlay.setAttribute('aria-label',playing?'暫停':'播放');
}

/* ---------- per-frame upkeep (called from frame(), only in pet mode) ---------- */
function petFrame(dt,time){
  if(pd)PET.lastAct=performance.now();                                         // dragging something counts as activity
  if(PET.mini){
    albums.forEach(a=>{a.g.visible=false;});                                   // albums are never shown here, including ones added later
    W.root.visible=false;                                                      // the dog's wardrobe is not part of the mini layout
  }
  if(PET.noRemote){rem.g.visible=false;blobRem.visible=false;W.root.visible=false;}   // the full layout keeps just the player (and the dog)
  if(PET.volShow>0)PET.volShow-=dt;
  PET.uiT-=dt;if(PET.uiT>0)return;PET.uiT=.5;
  petBarSync(false);
  petSaveState(false);
  /* YouTube decodes video even when it is invisible. Unless the TV is showing it, keep the player small so YouTube picks a low-resolution stream. */
  const ytb=$id('ytbox');if(ytb)ytb.classList.toggle('lite',!(tv.mode==='video'&&tv.pw>.02));
}

/* ---------- extension: what is playing survives a page change ----------
   Every page you visit gets its own floating player (and loses it again when you leave), so the state is saved
   and the next player puts the CD back in and carries on from the same track and second. */
function petSaveState(force){
  if(!PET.ext||!PET.bridge)return;
  const now=performance.now();if(!force&&now-PET.saveT<2000)return;PET.saveT=now;
  const a=Au.alb;
  PET.bridge.post({chp:'state',v:{list:a&&a.yt?a.yt.list:null,index:YTA.inf?YTA.inf.i:0,time:YTA.time(),playing:status==='playing'&&!!a,t:Date.now()}});
}
function petRestore(st){
  const ai=ALBUMS.findIndex(a=>a.yt&&a.yt.list===st.list);if(ai<0)return;
  cd=makeCD(ai);cd.mode='in';cdIn=true;lidOpen=false;state='home';
  Au.ensure();Au.start(ALBUMS[ai],st.index||0,st.time||0);status='playing';
}

/* ---------- commands from the desktop shell ---------- */
function petHandle(m){
  switch(m&&m.type){
    case 'quality':if(PET.setQuality(m.v))petApply();break;
    case 'paused':
      PET.paused=!!m.v;
      if(PET.paused){petSetIgnore(!PET.card);}                                      // nothing is drawn, so the window stops catching clicks
      else{PET.lastAct=performance.now();if(PET.timer){clearTimeout(PET.timer);PET.timer=0;}nextFrame();}
      break;
    case 'dog':petDog(!!m.v);break;
    case 'activate':if(status==='playing'){YTA.call('unMute');YTA.call('setVolume',Au.vol*10);}break;   // the first click on the host page lifts the browser's autoplay block
    case 'toggle':petToggle();break;
    case 'next':petNext();break;
    case 'cursor':   // the pointer anywhere on the desktop, normalised to this window (-1..1); the dog looks at it
      if(typeof m.x==='number'&&typeof m.y==='number'){dog.ptr.x=clamp(m.x,-2.5,2.5);dog.ptr.y=clamp(m.y,-2.5,2.5);}
      break;
  }
}

if(PET.on){
  const root=document.documentElement;
  root.classList.add('pet','pet-'+PET.layout);if(PET.card)root.classList.add('pet-card');if(PET.bridge)root.classList.add('pet-app');
  petApply();
  if(PET.mini){
    player.visible=false;rem.g.visible=false;shelf.visible=shelfBack.visible=shelfShade.visible=false;
    petBuildBar();petBarSync(true);
  }
  ['pointermove','mousemove'].forEach(n=>addEventListener(n,petPointer,{passive:true,capture:true}));
  addEventListener('pointerdown',()=>{PET.lastAct=performance.now();PET.hold=true;},{capture:true,passive:true});
  const rel=()=>{PET.hold=false;PET.wantHit=true;};
  addEventListener('pointerup',rel,{capture:true,passive:true});addEventListener('pointercancel',rel,{capture:true,passive:true});
  addEventListener('keydown',()=>{PET.lastAct=performance.now();petWake();},{passive:true});
  addEventListener('wheel',()=>{PET.lastAct=performance.now();petWake();},{passive:true});
  if(PET.bridge){
    PET.bridge.onCmd(petHandle);
    if(PET.ext)PET.bridge.in=m=>{if(m.t==='move')petPointer({clientX:m.x,clientY:m.y});else if(m.t==='cmd')petHandle(m.m);else if(m.t==='activate')petHandle({type:'activate'});};
    petSetIgnore(!PET.card);
  }         // transparent style: start click-through, it opens up over the pet and the controls
  const dogBtn=$id('petDogBtn');
  if(dogBtn){   // small browser window (no menu-bar icon there): a button for the dog
    const sync=()=>dogBtn.setAttribute('aria-pressed',String(dog.ready?(dog.present&&!dog.leaving):dog.wantShow));
    dogBtn.addEventListener('click',()=>{const on=!(dog.ready?(dog.present&&!dog.leaving):dog.wantShow);petDog(on);sync();if(PET.bridge&&PET.bridge.post)PET.bridge.post({chp:'dog',v:on});});
    setTimeout(sync,400);
  }
  const hide=$id('petHide');if(hide)hide.addEventListener('click',()=>PET.bridge&&PET.bridge.hide());
  PET.cur=-1;
  if(PET.ext&&PET.initState&&PET.initState.playing&&Date.now()-PET.initState.t<90000)petRestore(PET.initState);
  if(PET.ext)addEventListener('pagehide',()=>petSaveState(true));
  if(new URLSearchParams(location.search).get('dog')==='1'||PET.wantDog)dogToggle();   // the dog is optional: the desktop shell passes dog=1, the extension sends its setting
  window.__pet={PET,pose:DOG_PERCH,handle:petHandle,playAlbum:petPlayAlbum,toggle:petToggle,next:petNext,vol:petVol};
}
