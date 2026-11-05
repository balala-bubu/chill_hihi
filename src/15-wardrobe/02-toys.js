/* ---------- toys: the cabinet's bottom row ("物品") ----------
   Items in a slot with "tool":true (models/wardrobe/slots.json) are not worn. Tap one on the shelf to pick it, then click empty space to use it.
   First toy: the apple. It drops from the click, bounces on the floor and waits. The dog runs over and eats it; with no dog around it fades away after 6 seconds.
   Adding another toy = a new .dae in the "toy" slot + a case in toyUse(); eating is only for the apple. */
const TOY={sel:null,apples:[],mats:{},H:.78,G:26,LIFE:6,MAX:8,EAT:1.5,chipEl:$id('toyChip'),chipKey:'',err:0};
const toyIs=id=>{const it=W.items[id],sl=it&&W.slotById[it.slot];return !!(sl&&sl.tool);};
function toyChip(){const k=TOY.sel||'';if(k===TOY.chipKey)return;TOY.chipKey=k;TOY.chipEl.hidden=!k;if(k)TOY.chipEl.firstChild.textContent=(W.items[k]?W.items[k].name:'')+'　點空白處放下';}
function toySelect(id){TOY.sel=TOY.sel===id?null:id;Au.ensure();Au.click(TOY.sel?1.5:1.1,.45);buzz(8);toyChip();}
TOY.chipEl.addEventListener('click',()=>{TOY.sel=null;toyChip();});
addEventListener('keydown',e=>{if(e.key==='Escape'&&TOY.sel){TOY.sel=null;toyChip();}});
const toyDogCan=()=>dog.ready&&dog.present&&!dog.leaving&&!PET.perch&&!PET.mini;
/* is this pointer position empty space (not the player, an album, the CD, headphones, the dog, the cabinet or the album shelf)? */
function toyBlank(e){
  if(!TOY.sel||PET.mini||busy||pd||W.drag||W.sd||(state!=='home'&&state!=='stage'))return false;
  setNDC(e);
  if(pick()||wPick(e.clientX,e.clientY)||onShelf()||dogHit(e.clientX,e.clientY))return false;
  const q=planeHit(0);if(W.vis>.3&&q&&q.x>W.root.position.x-W.Wc/2)return false;
  return true;
}
function toyPlace(e){
  if(!toyBlank(e))return false;
  const it=W.items[TOY.sel];if(!it)return false;
  const q=planeHit(FLOOR_Z);if(!q)return false;
  toySpawn(it,q.x,q.y);return true;
}
cvs.addEventListener('pointermove',e=>{if(TOY.sel&&toyBlank(e))cvs.style.cursor='crosshair';});   // registered after the other pointermove handlers, so it has the last word on the cursor
function toySpawn(it,x,y){
  const g=it.geo;if(!g.boundingBox)g.computeBoundingBox();const b=g.boundingBox,k=TOY.H/(b.max.y-b.min.y);
  const mat=TOY.mats[it.id]||(TOY.mats[it.id]=(()=>{const m=it.mat.clone();m.transparent=false;m.depthWrite=true;m.alphaTest=.02;return m;})());   // the texture is fully opaque: no sorting trouble
  const m=new T.Mesh(g,mat);m.position.set(-(b.min.x+b.max.x)/2,-b.min.y,-(b.min.z+b.max.z)/2);   // pivot = bottom centre, so it sits on the floor
  const grp=new T.Group();grp.add(m);grp.scale.setScalar(.001);scene.add(grp);
  const sh=new T.Mesh(wSoftGeo,wMat.soft.clone());sh.renderOrder=1;scene.add(sh);
  const lim=Math.max(1,L.hw-2.4);   // keeps room at the screen edge for the dog's head when it bends down to eat
  if(TOY.apples.length>=TOY.MAX)toyRemove(TOY.apples[0]);
  TOY.apples.push({it,g:grp,sh,k,x:clamp(x,-lim,lim),y:Math.max(y,FLOOR_Y+1.2),z:FLOOR_Z,vy:0,st:'fall',t:0,bounce:0,spin:(Math.random()<.5?-1:1)*(1.5+Math.random()*2),wait:0,left:TOY.LIFE,eatT:0,chomps:0,r:1});
  Au.click(1.8,.4);
}
function toyRemove(a){scene.remove(a.g);scene.remove(a.sh);a.sh.material.dispose();const i=TOY.apples.indexOf(a);if(i>=0)TOY.apples.splice(i,1);if(dog.eat&&dog.eat.a===a)dog.eat=null;}
/* the apple the dog should go for: the nearest one that is falling, waiting or already being eaten */
function toyTarget(){
  if(!toyDogCan())return null;
  if(dog.eat)return dog.eat.a;
  let best=null,bd=1e9;
  for(const a of TOY.apples)if(a.st==='fall'||a.st==='rest'){const d=Math.abs(a.x-dog.x);if(d<bd){bd=d;best=a;}}
  return best;
}
function toyEatCancel(){if(dog.eat){const a=dog.eat.a;dog.eat=null;if(a.st==='eat'){a.st='rest';a.r=1;a.g.rotation.set(0,a.g.rotation.y,0);}}}
/* called by dogFrame while mode==='eat': start the meal once the apple lies in front of the lips, then bow, take it into the mouth and chew it down in three bites. returns {bow,jaw} */
function toyEat(dt,moving,tz,a0){
  let E=dog.eat;
  if(!E&&a0&&a0.st==='rest'&&!moving&&Math.abs(dog.z-tz)<.25){const f=(a0.x-dog.x)*dog.fd;if(f<=DOG_BITE.stand+.25&&f>-.3){E=dog.eat={a:a0,t:0,n:0};a0.st='eat';}}
  if(!E)return {bow:0,jaw:0};
  const a=E.a;E.t+=dt;const p=E.t/TOY.EAT,ss=(u)=>{u=clamp(u,0,1);return u*u*(3-2*u);};
  const bow=Math.sin(Math.min(1,p)*Math.PI);
  const att=ss((p-.22)/.2);                                  // the apple travels from the floor into the mouth
  a.r=1-.96*ss((p-.42)/.5);                                  // and shrinks as it is chewed
  const thr=[.5,.67,.84];while(E.n<3&&p>=thr[E.n]){E.n++;Au.click(1.5+E.n*.2,.55);buzz(6);}
  let jaw=0;if(p>.24&&p<.95)jaw=.38*Math.abs(Math.sin((p-.24)/.7*Math.PI*3));
  if(dog.mouthL&&dog.bones.Head){
    DOGX.mw.copy(dog.mouthL);dog.bones.Head.o.localToWorld(DOGX.mw);
    const mx=DOGX.mw.x+Math.sin(dog.ry)*.4,my=DOGX.mw.y-TOY.H*.5*a.r+.08,mz=DOGX.mw.z+.95;   // held out in front of the lips and toward the camera (the dog is seen from the side, its cheek and ear would hide it otherwise)
    a.x=lerp(a.x,mx,att);a.y=lerp(FLOOR_Y+.02,my,att);a.z=lerp(FLOOR_Z,mz,att);}
  if(p>=1){toyRemove(a);dog.eat=null;}
  return {bow,jaw};
}
function toyFrame(dt,time){
  toyChip();
  const can=toyDogCan();
  for(let i=TOY.apples.length-1;i>=0;i--){
    const a=TOY.apples[i];a.t+=dt;
    if(a.st==='fall'){
      a.vy-=TOY.G*dt;a.y+=a.vy*dt;a.g.rotation.y+=a.spin*dt;
      const fl=FLOOR_Y+.02;
      if(a.y<=fl){a.y=fl;if(a.vy<-4&&a.bounce<3){a.vy=-a.vy*.36;a.bounce++;a.spin*=.6;Au.click(.55+.1*a.bounce,.5);}else{a.vy=0;a.st='rest';a.t=0;Au.click(.5,.4);}}
    }else if(a.st==='rest'){
      a.g.rotation.y+=a.spin*dt;a.spin*=Math.exp(-dt*3);
      if(can){a.wait+=dt;if(a.wait>25){toyRemove(a);continue;}}   // safety: the dog is around but busy for too long
      else{a.left-=dt;if(a.left<=0){toyRemove(a);continue;}}       // nobody to eat it: gone after 6 seconds
    }
    const fade=a.st==='rest'&&!can?clamp(a.left/.7,0,1):1,appear=a.st==='fall'?Math.min(1,a.t/.11):1;   // pops in while it starts to fall; shrinks away in the last .7 s when nobody ate it
    a.g.position.set(a.x,a.y,a.z);
    a.g.scale.setScalar(Math.max(.001,a.k*appear*a.r*fade));
    const h=Math.max(0,a.y-FLOOR_Y),lift=a.st==='eat'?clamp((a.y-FLOOR_Y)/1.5,0,1):0,sz=TOY.H*1.35/(1+h*.22)*(1-lift)*fade*appear*a.r;
    a.sh.visible=sz>.01;a.sh.position.set(a.x,FLOOR_Y+.012,a.z);a.sh.scale.set(Math.max(.001,sz),1,Math.max(.001,sz*.55));
  }
}
