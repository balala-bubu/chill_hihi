/* ---------- pick a character up and throw it: press and hold on a puppy / cartoon character (no moving) to lift it, drag it around, let go to toss it ----------
   Worn wardrobe items win over the body (wPick runs first, same as petting), and moving the pointer before the hold time is up cancels (that is a stroke / ordinary click).
   The state lives in dog.th (null | {held,...}) so it travels with dogLoad/dogSave; dogFrame calls dogThrowStep and draws dog.cy / dog.th.rz. */
const THR={pend:null,I:null,hold:.35,lift:.55,g:46,rest:.32,vmax:15,vmaxY:16,gain:.8,p:new T.Vector3()};
function thrBusy(){return !!((typeof TOY!=='undefined'&&TOY.sel)||(typeof JOB!=='undefined'&&JOB.held)||(typeof BALL!=='undefined'&&BALL.held)||(typeof chairHeld==='function'&&chairHeld())||(typeof W!=='undefined'&&W.drag)||(typeof cd!=='undefined'&&cd&&cd.mode==='drag'&&cd.committed));}
function thrStart(I){
  const prev=DOGS.cur;dogLoad(I);
  try{
    if(!dog.ready||!dog.present||dog.leaving||PET.perch||dog.th)return false;
    const p=dogPtrAt(dog.z,THR.p),base=FLOOR_Y+dog.footLift*dog.scale;
    const Lc=dog.lie;Lc.s='none';Lc.amt=0;dog.chair=null;
    dog.th={held:true,ox:p.x-dog.x,oy:clamp(p.y-base,.6,30),y:dog.cy,lift:0,vx:0,vy:0,rz:0,w:0,lx:dog.x,ly:dog.cy,settle:0};
    Au.snap();buzz(10);THR.I=I;return true;
  }finally{if(prev&&prev!==I)dogLoad(prev);}
}
addEventListener('pointerdown',e=>{
  THR.pend=null;
  if(e.button>0||!e.target||e.target.tagName!=='CANVAS'||grab.kind==='hp'||thrBusy())return;
  if(typeof wPick==='function'&&W.ready&&wPick(e.clientX,e.clientY))return;
  const I=dogWhoAt(e.clientX,e.clientY);if(!I)return;
  const t=THR.pend={I,x:e.clientX,y:e.clientY,id:e.pointerId};
  setTimeout(()=>{if(THR.pend===t){THR.pend=null;thrStart(I);}},THR.hold*1000);
},{passive:true});
addEventListener('pointermove',e=>{const t=THR.pend;if(t&&Math.hypot(e.clientX-t.x,e.clientY-t.y)>12)THR.pend=null;},{passive:true});
function thrRelease(){
  THR.pend=null;const I=THR.I;THR.I=null;if(!I)return;
  const s=DS(I),th=s.th;if(!th||!th.held)return;
  th.held=false;th.vx=clamp(th.vx*THR.gain,-THR.vmax,THR.vmax);th.vy=clamp(th.vy*THR.gain,-THR.vmaxY,THR.vmaxY);
  th.w=clamp(-th.vx*.14,-3.2,3.2);
  if(Math.hypot(th.vx,th.vy)>3.5)Au.whoosh();
}
addEventListener('pointerup',thrRelease);addEventListener('pointercancel',thrRelease);
addEventListener('blur',thrRelease);
/* called from dogFrame for the loaded character while dog.th is set; moves dog.x and sets dog.cy / th.rz */
function dogThrowStep(dt,hw){
  const th=dog.th,xm=hw-1.2;
  if(dog.leaving||!dog.present||PET.perch){dog.th=null;dog.cy=0;return;}
  if(th.held){
    const p=dogPtrAt(dog.z,THR.p),base=FLOOR_Y+dog.footLift*dog.scale;
    th.lift+=(THR.lift-th.lift)*(1-Math.exp(-dt*14));
    const tx=clamp(p.x-th.ox,-xm,xm),ty=Math.max(0,p.y-th.oy-base)+th.lift;
    dog.x+=(tx-dog.x)*(1-Math.exp(-dt*20));th.y+=(ty-th.y)*(1-Math.exp(-dt*20));
    const k=1-Math.exp(-dt*25);
    th.vx+=((dog.x-th.lx)/Math.max(dt,.001)-th.vx)*k;th.vy+=((th.y-th.ly)/Math.max(dt,.001)-th.vy)*k;
    th.lx=dog.x;th.ly=th.y;
    th.rz+=((clamp(-th.vx*.045,-.5,.5)+Math.sin(performance.now()/1000*7)*.05)-th.rz)*(1-Math.exp(-dt*10));   // hangs from the grip and swings a little
    cvs.style.cursor='grabbing';
  }else if(th.settle>0){   // landed: slide to a stop, straighten up
    th.settle-=dt;dog.x=clamp(dog.x+th.vx*dt,-xm,xm);th.vx*=Math.exp(-dt*9);th.y=0;
    th.rz*=Math.exp(-dt*14);
    if(th.settle<=0){dog.th=null;dog.cy=0;return;}
  }else{   // in the air
    th.vy-=THR.g*dt;th.y+=th.vy*dt;dog.x+=th.vx*dt;th.rz+=th.w*dt;
    if(dog.x>xm||dog.x<-xm){dog.x=clamp(dog.x,-xm,xm);th.vx*=-.5;th.w*=-.5;Au.click(1.1,.4);}
    if(th.y<=0&&th.vy<0){
      th.y=0;const sp=-th.vy;
      if(sp>5){th.vy=sp*THR.rest;th.vx*=.7;th.w*=.45;th.rz*=.6;Au.crash(Math.min(.3,sp*.014));camShake=Math.max(camShake,Math.min(.22,sp*.012));buzz(8);}
      else{th.vy=0;th.settle=.28;th.rz*=.3;}
    }
  }
  dog.cy=th.y;
}
