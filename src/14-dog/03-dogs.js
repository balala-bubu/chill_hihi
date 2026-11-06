/* ---------- several puppies at once (max 2) ----------
   Every puppy is an instance {v,st,worn,restored,wkey}. `dog` stays the one state object all the old code reads and writes: dogLoad(I) copies an instance's state into it,
   dogSave(I) copies it back. dogsFrame runs dogFrame once per present puppy; after the frame `dog` is the FOCUS puppy again (the one the wardrobe / headphones / toys talk to).
   Short press of the dog button: none out -> next puppy in the rotation walks in; some out -> all leave (one after the other).
   Long press (~3 s): the next two puppies in the rotation walk in, one after the other. */
const DOGS={byV:[],list:[],cur:null,focus:null,me:null,inFrame:false,gap:3.8,stagger:.7,cdOwn:null,blink:false};
const DS=I=>I===DOGS.cur?dog:I.st;                       // live state of an instance (the loaded one lives in `dog`)
const dogCap=()=>(PET.perch||PET.mini)?1:2;
const isToon=I=>I.v>=DV.NDOG;   // the cartoon characters (pikachu, chiikawa, hachiware, usagi, toad, stitch) belong to the TOON button, the puppies to the dog button
const dogActive=()=>DOGS.list.filter(I=>!isToon(I)&&(I.pend||(DS(I).present&&!DS(I).leaving)));
const toonActive=()=>DOGS.list.filter(I=>isToon(I)&&(I.pend||(DS(I).present&&!DS(I).leaving)));
const dogAnyOn=()=>dog.ready?DOGS.list.some(I=>I.pend||(DS(I).present&&!DS(I).leaving)):dog.wantShow;   // any character at all (toys, headphones, the TV ... ask this)
const dogsOnlyOn=()=>dog.ready?dogActive().length>0:dog.wantShow;   // puppies only (the dog button's lamp)
function dogSave(I){for(const k in dog)I.st[k]=dog[k];I.restored=W.restored;I.worn=W.worn;}
function dogLoad(I){
  if(!I||DOGS.cur===I)return;
  if(DOGS.cur)dogSave(DOGS.cur);
  const st=I.st;for(const k in dog)if(!(k in st))delete dog[k];Object.assign(dog,st);
  const P=I.v>0?DV.P[I.v]:DV.base;Object.assign(DOG_SIT,P.sit);Object.assign(DOG_LIE,P.lie);Object.assign(DOG_PERCH,P.perch);Object.assign(DOG_BITE,DV.base.bite,P.bite);
  W.worn=I.worn;W.KEY=I.wkey;W.restored=I.restored;W.recycleKey='';
  DOGS.cur=I;
}
function dogInst(v){   // the instance of variant v (built the first time it is needed)
  if(DOGS.byV[v])return DOGS.byV[v];
  const V=DV.v[v];if(!V||!V.ready||!dog.ready)return null;
  let I;
  if(v===0){I={v,st:Object.assign({},dog),worn:W.worn,restored:W.restored,wkey:DV.WK[0]};DOGS.cur=I;DOGS.byV[0]=I;return I;}   // puppy A is the original `dog`
  const st=dogFresh(),g=st.g,SPN=1.1/st.scale,pv=new T.Group(),rg=new T.Group(),inn=new T.Group();pv.position.y=SPN;inn.position.y=-SPN;
  inn.add(V.fix);rg.add(inn);pv.add(rg);g.add(pv);g.scale.setScalar(st.scale);g.visible=false;scene.add(g);g.updateMatrixWorld(true);
  const b=DV.P[v].bite;if(!V.mouthL)V.mouthL=V.bones[V.biteBone].o.worldToLocal(g.localToWorld(new T.Vector3(b.mx,b.my,b.mz)));   // the mouth (puppies) or the hands in front of the chest (characters)
  Object.assign(st,{rg,inn,fix:V.fix,bones:V.bones,mouthL:V.mouthL,ak:V.ak,fitAdj:V.fitAdj,faceFx:V.faceFx,footLift:V.footLift,ptr:dog.ptr,ready:true,human:V.human,biteBone:V.biteBone,hit:V.hit,rad:V.rad,tvGap:V.tvGap});
  g.traverse(o=>o.layers.enable(1));
  I={v,st,worn:{},restored:false,wkey:DV.WK[v]};DOGS.byV[v]=I;return I;
}
/* the next n puppies in the rotation that are ready and not already out */
function dogsNext(n){
  const N=DV.NDOG;let s=LS.get(DV.KEY,0)|0;if(s<0||s>=N)s=0;const out=[];
  for(let k=0;k<N&&out.length<n;k++){const v=(s+k)%N;if(DV.v[v]&&DV.v[v].ready&&!DOGS.list.some(I=>I.v===v))out.push(v);}
  if(out.length)LS.set(DV.KEY,(out[out.length-1]+1)%N);
  return out;
}
function dogSummon(vs,t0){
  let t=t0||0;
  for(const v of vs){const I=dogInst(v);if(!I||DOGS.list.includes(I))continue;I.pend=true;I.delay=t;t+=DOGS.stagger;DOGS.list.push(I);}
}
function dogEnter(I){
  dogLoad(I);
  dog.present=true;dog.leaving=false;dog.g.visible=true;dog.x=-(L.hw+3.2);dog.z=1.9;dog.sit=0;dog.pop=PET.perch?0:1;dog.watchT=0;dog.trotX=null;dog.lie.s='none';dog.lie.amt=0;
  I.pend=false;if(!DOGS.focus||!DS(DOGS.focus).present||DS(DOGS.focus).leaving)DOGS.focus=I;
  Au.whoosh();dogSave(I);
}
function dogLeave(I,delay){
  if(I.pend){I.pend=false;DOGS.list=DOGS.list.filter(o=>o!==I);return;}   // had not walked in yet
  I.leaveIn=delay||0;
}
function dogDoLeave(I){
  const s=DS(I);if(!s.present||s.leaving)return;
  if(hpState.worn&&DOGS.focus===I)hpUnwear();
  s.leaving=true;Au.whoosh();
  for(const o of DOGS.list)if(o!==I){const t=DS(o);if(t.present&&!t.leaving){t.watchT=2.2+Math.random()*1.4;t.trotX=Math.random()<.4?t.x-2.6:null;}}   // the other one looks after it, sometimes trots a few steps
  if(DOGS.focus===I){const o=DOGS.list.find(x=>x!==I&&DS(x).present&&!DS(x).leaving);if(o)DOGS.focus=o;}
}
function dogToggle(){   // short press
  if(dog.failed)return;
  if(!dog.ready){dog.wantShow=!dog.wantShow;remLit(3,dog.wantShow);return;}
  const act=dogActive();
  if(act.length)act.forEach((I,i)=>dogLeave(I,i*DOGS.stagger));
  else dogSummon(dogsNext(1));
  remLit(3,dogsOnlyOn());
}
/* ---------- the TOON button (remote button 6): 1st press -> pikachu walks in, 2nd press -> pikachu leaves and chiikawa + hachiware + usagi walk in together (toad and stitch are not in the group: long press or the menu), 3rd press -> they all leave.
   They are ordinary entries of DOGS.list, so they share everything with the puppies: the floor lane, collisions (nobody stands inside another), the CD, apples, balls, the TV, petting. */
const TOON={q:0,trio:[6,7,8],cast:[5,6,7,8,9,10],KEY:'chill_hihi.toonNext'};
const toonReady=vs=>vs.filter(v=>DV.v[v]&&DV.v[v].ready);
function toonToggle(){   // short press
  if(dog.failed)return;
  if(!dog.ready){TOON.q=1;return;}   // pressed before the models have loaded: runs as soon as they are there
  const act=toonActive();
  if(!act.length)dogSummon(toonReady([5]));                                                   // nobody: pikachu walks in
  else if(act.every(I=>I.v===5)){act.forEach(I=>dogLeave(I,0));dogSummon(toonReady(TOON.trio),.9);}   // only pikachu: it leaves and the three friends walk in together
  else act.forEach((I,i)=>dogLeave(I,i*DOGS.stagger));                                        // otherwise: everybody leaves
}
function toonCall2(){   // long press (~3 s): the next two of pikachu / chiikawa / hachiware / usagi / toad / stitch (in that order) walk in, one after the other
  if(dog.failed||!dog.ready)return;
  const N=TOON.cast.length;let s=LS.get(TOON.KEY,0)|0;if(s<0||s>=N)s=0;const out=[];
  for(let k=0;k<N&&out.length<2;k++){const v=TOON.cast[(s+k)%N];if(DV.v[v]&&DV.v[v].ready&&!DOGS.list.some(I=>I.v===v))out.push(v);}
  if(!out.length)return;
  LS.set(TOON.KEY,(TOON.cast.indexOf(out[out.length-1])+1)%N);
  dogSummon(out);
}
/* the hover menu (10-world/03-summon-menu.js): bring in / send away ONE specific puppy or character. puppies are capped at two: the one that has been out the longest leaves */
const dogOut=v=>{const I=DOGS.byV[v];return !!I&&DOGS.list.includes(I)&&(I.pend||(DS(I).present&&!DS(I).leaving));};
function dogSummonOne(v){
  if(dog.failed||!dog.ready)return false;
  const I=DOGS.byV[v];
  if(dogOut(v)){dogLeave(I,0);return false;}
  if(!(DV.v[v]&&DV.v[v].ready)||(I&&DOGS.list.includes(I)))return false;   // not loaded yet / still walking out
  if(v<DV.NDOG){const act=dogActive();if(act.length>=dogCap())dogLeave(act[0],0);}
  dogSummon([v]);return true;
}
function dogCall2(){    // long press: the next two puppies walk in
  if(dog.failed||!dog.ready)return;
  const room=dogCap()-dogActive().length;if(room<=0)return;
  dogSummon(dogsNext(Math.min(2,room)));remLit(3,true);
}
function dogFocus(I){if(!I||DOGS.focus===I||DOGS.inFrame)return;if(hpState.worn)hpUnwear();DOGS.focus=I;dogLoad(I);}
/* hit-tests: which puppy is under the pointer */
function dogWhoAt(cx,cy){
  const cands=DOGS.list.filter(I=>{const s=DS(I);return s.present&&!s.leaving;});
  const prev=DOGS.cur;let hit=null;
  for(const I of cands){dogLoad(I);if(dogHit1(cx,cy)){hit=I;break;}}
  if(prev&&DOGS.cur!==prev)dogLoad(prev);
  return hit;
}
function dogHit(cx,cy,focus){   // is the pointer on any character? only with focus=true (dropping a wardrobe item / the headphones onto one) does the one under it become the focus.
  // a plain test must NOT change the focus: the headphones come off when the focus changes, and the toy / hover checks run all the time
  if(DOGS.inFrame)return dogHit1(cx,cy);
  if(dogHit1(cx,cy))return true;
  const I=dogWhoAt(cx,cy);if(I){if(focus)dogFocus(I);return true;}return false;
}
function dogPetAt(cx,cy){   // a click: pets whichever puppy is under it (focus does not change)
  const I=dogWhoAt(cx,cy);if(!I)return false;
  const prev=DOGS.cur;dogLoad(I);dogPet();if(prev&&prev!==I)dogLoad(prev);return true;
}
/* the CD belongs to one puppy at a time: the nearest one, and it keeps it until it is done */
function dogsCdOwner(){
  const act=cd&&((cd.mode==='drag'&&cd.committed&&cd.pos)||(cd.mode==='floor'&&cd.flat>.6)||cd.mode==='carried');
  const c=DOGS.list.filter(I=>{const s=DS(I);return s.present;});
  if(!act||!c.length){DOGS.cdOwn=null;return;}
  const cur=DOGS.cdOwn;
  if(cur&&c.includes(cur)&&(cd.mode==='carried'||DS(cur).grab||!DS(cur).leaving))return;   // it keeps the CD until it is done
  let best=null,bs=1e9;
  for(const I of c){const s=DS(I);if(s.leaving)continue;const sc=Math.abs(cd.pos.x-s.x)+(s.lie.s!=='none'?6:0);if(sc<bs){bs=sc;best=I;}}
  DOGS.cdOwn=best;
}
const dogRank=I=>{const a=DOGS.list.filter(o=>{const s=DS(o);return s.present&&!s.leaving;});const i=a.indexOf(I||DOGS.me);return i<0?0:i;};
const dogCount=()=>Math.max(1,DOGS.list.filter(o=>{const s=DS(o);return s.present&&!s.leaving;}).length);
const dogBuddy=()=>{for(const o of DOGS.list)if(o!==DOGS.me){const s=DS(o);if(s.present&&!s.leaving)return s;}return null;};
/* the social layer: what a puppy does when the other one is busy (only used when it has no task of its own) */
function dogSocial(dt,hw){
  const b=dogBuddy();
  if(dog.watchT>0){dog.watchT-=dt;return {mode:'watch',tx:dog.trotX!=null?clamp(dog.trotX,-hw+1.2,hw-1.2):dog.x,spd:3.2,look:{x:-(hw+3),y:FLOOR_Y+1.2,z:dog.z}};}   // the other one left: look after it
  if(!b)return null;
  const side=dog.x>=b.x?1:-1,bl=b.lie&&b.lie.s!=='none'&&b.lie.amt>.3;
  if(bl)return {mode:'sitby',tx:clamp(b.x+side*3.3,-hw+1.2,hw-1.2),spd:4.5,look:{x:b.x,y:FLOOR_Y+.9,z:b.z}};   // it is being petted: sit down next to it
  if(b.mode==='chase'||b.mode==='fetch'||b.mode==='bring'||b.mode==='eat')return {mode:'follow',tx:clamp(b.x+side*2.9,-hw+1.2,hw-1.2),spd:6.5,look:{x:b.x,y:FLOOR_Y+.9,z:b.z}};   // it has something going on: trot along
  dog.glT-=dt;if(dog.glT<=0){dog.glT=4+Math.random()*5;dog.glance=1.6;}
  if(dog.glance>0){dog.glance-=dt;return {mode:null,look:{x:b.x,y:FLOOR_Y+1.3,z:b.z}};}   // now and then a glance at the other puppy
  return null;
}
/* spacing between neighbours: wide enough for the widest of them (puppies 3.8, characters about 2.6), squeezed to fit the screen */
function dogGap(){
  const a=DOGS.list.filter(o=>{const s=DS(o);return s.present&&!s.leaving;});
  if(a.length<2)return DOGS.gap;
  const r=a.reduce((t,o)=>t+DS(o).rad,0)/a.length;
  return clamp(Math.min(r*2.92,(L.hw*2-3.2)/(a.length-1)),2.2,DOGS.gap);
}
function dogRestoreWear(){
  const o=LS.get(W.KEY,{});
  for(const s in o){const id=o[s];if(!W.items[id]||W.items[id].slot!==s)continue;
    if(DOGS.list.some(x=>x!==DOGS.me&&Object.values(x.worn).some(w=>w.id===id)))continue;   // the other puppy already wears it
    wEquip(id,true);}
}
function dogsLongPress(){   // hold the dog button (3) or the TOON button (5) for ~3 s: two more come in
  const hold=pd&&pd.kind==='phys'&&grab.kind==='rem'&&(grab.btn===3||grab.btn===5)&&!pd.moved,now=performance.now();
  if(hold){
    const bt=grab.btn;if(!grab.t0)grab.t0=now;
    const h=(now-grab.t0)/3000;
    if(!grab.long){
      if(h>=1){grab.long=true;DOGS.blink=false;if(bt===3)dogCall2();else toonCall2();}
      else{DOGS.blink=bt;remLit(bt,(((now-grab.t0)/(320-220*h))|0)%2===0);}   // the lamp blinks faster and faster until it triggers
    }
  }else{DOGS.blink=false;grab.t0=0;}
}
function dogsFrame(dt,time){
  if(!dog.ready)return;
  if(!DOGS.cur)dogInst(0);
  if(TOON.q){TOON.q=0;toonToggle();}
  dogsLongPress();
  DOGS.inFrame=true;
  try{
    dogSave(DOGS.cur);
    for(const I of DOGS.list){   // timers: walk in / walk out one after the other
      if(I.pend){I.delay-=dt;if(I.delay<=0)dogEnter(I);}
      else if(I.leaveIn!=null){I.leaveIn-=dt;if(I.leaveIn<=0){I.leaveIn=null;dogDoLeave(I);}}
    }
    dogsCdOwner();
    for(const I of DOGS.list){
      if(!I.st.present)continue;
      dogLoad(I);DOGS.me=I;
      if(dog.present&&!I.restored&&W.ready){I.restored=true;W.restored=true;dogRestoreWear();}
      dogFrame(dt,time);
      dogSave(I);
    }
    /* nobody stands inside anybody else: of two that are too close, the idle one gives way (both move when both are idle or both busy). the needed distance is the sum of the two half widths (rad) */
    const on=DOGS.list.filter(I=>I.st.present&&!I.st.leaving);
    for(let i=0;i<on.length;i++)for(let j=i+1;j<on.length;j++){
      const A=on[i].st,B=on[j].st;if(A.mode==='job'&&B.mode==='job')continue;   // (two puppies at the counter stand close side by side)
      const ov=A.rad+B.rad-Math.abs(A.x-B.x);
      if(ov>0){const busy=s=>s.lie.s!=='none'||s.mode==='fetch'||s.mode==='bring'||s.mode==='eat'||s.mode==='chase'||s.mode==='ball';
        const dir=A.x>=B.x?1:-1,k=Math.min(1,dt*4)*ov;
        if(busy(A)&&!busy(B))B.x-=dir*k;else if(busy(B)&&!busy(A))A.x+=dir*k;else{A.x+=dir*k*.5;B.x-=dir*k*.5;}}}
    if(DOGS.cur)Object.assign(dog,DOGS.cur.st);   // the last one handled is still the loaded one: take over the pushes
    DOGS.list=DOGS.list.filter(I=>I.pend||I.st.present);
    if(DOGS.focus&&!DOGS.list.includes(DOGS.focus))DOGS.focus=DOGS.list.find(I=>I.st.present&&!I.st.leaving)||DOGS.list[0]||null;
  }finally{DOGS.inFrame=false;DOGS.me=null;}
  dogLoad(DOGS.focus||DOGS.byV[0]);
  if(DOGS.blink!==3)remLit(3,dogsOnlyOn());
  if(DOGS.blink!==5)remLit(5,toonActive().length>0);
}
window.__dogs={dogHit,hpWear,hpSpawn,toonCall2,testCd(x){cd=makeCD(0);cd.mode='floor';cd.pos.set(x,FLOOR_Y+.02,FLOOR_Z);cd.flat=1;cd.vel.set(0,0);cdIn=false;},DOGS,DV,dogToggle,dogCall2,toonToggle,TOON,dogsNext,rem,cam,get grab(){return grab;}};   // test hook

/* tool hook (tools/render_thumbs.py): a transparent portrait of variant v for the hover menu, rendered with its own renderer so the game scene is not touched */
window.__thumb=(v,size)=>{
  size=size||192;const I=dogInst(v);if(!I)return null;
  const g=I.st.g,par=g.parent,p0=g.position.clone(),r0=g.rotation.clone(),v0=g.visible,sc=new T.Scene();
  sc.environment=scene.environment;sc.add(new T.HemisphereLight(0xffffff,0xb9bdc3,1.15));const dl=new T.DirectionalLight(0xffffff,1.6);dl.position.set(2.5,4,5);sc.add(dl);
  sc.add(g);g.visible=true;g.position.set(0,0,0);g.rotation.set(0,.5,0);g.updateMatrixWorld(true);
  const bb=new T.Box3().setFromObject(g),c=bb.getCenter(new T.Vector3()),sz=bb.getSize(new T.Vector3());
  const cam2=new T.PerspectiveCamera(26,1,.1,100),h=Math.max(sz.y,sz.x*.95)*1.12,dist=h/2/Math.tan(13/180*Math.PI);
  cam2.position.set(c.x,c.y+sz.y*.04,c.z+dist);cam2.lookAt(c.x,c.y,c.z);
  const r=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});r.setPixelRatio(1);r.setSize(size,size);r.setClearColor(0,0);
  r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.12;
  r.render(sc,cam2);const url=r.domElement.toDataURL('image/png');r.dispose();
  g.position.copy(p0);g.rotation.copy(r0);g.visible=v0;if(par)par.add(g);else scene.remove(g);
  return url;
};
