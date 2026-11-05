/* ---------- dog wardrobe ----------
   models/wardrobe/manifest.json (written by tools/build_wardrobe.py) lists the slots (which bone each kind of item hangs on, and where) and the items.
   While the dog is around, an open boutique display shelf slides in from the right edge; each slot has one shelf.
   Drag an item onto the dog to put it on, drag a worn item back to the cabinet to put it away. What the dog wears is remembered. */
const W={ready:false,items:{},slots:[],slotById:{},byslot:{},worn:{},vis:0,hover:false,pin:false,drag:null,hot:null,doorA:0,restored:false,fly:[],page:{},
  root:new T.Group(),inner:new T.Group(),door:new T.Group(),shelfG:new T.Group(),Wc:3.2,Hc:6.2,tierH:2,key:'',KEY:'chill_hihi.wear',
  nd:new T.Vector2(),ray:new T.Raycaster(),v:new T.Vector3(),
  hintEl:$id('wardHint'),tipEl:$id('wardTip'),pagesEl:$id('wardPages'),nav:{},recycleEl:$id('wardRecycle'),recycleItemsEl:$id('wardRecycleItems'),recycleKey:''};
W.root.visible=false;W.root.add(W.inner,W.door,W.shelfG);scene.add(W.root);
const wMat={
  body:new T.MeshPhysicalMaterial({color:0xe4e6e8,roughness:.6,clearcoat:.25,clearcoatRoughness:.5,envMapIntensity:.6}),
  back:new T.MeshStandardMaterial({color:0xd8dbdf,roughness:.82}),
  trim:new T.MeshStandardMaterial({color:0xabb1b8,metalness:.7,roughness:.28}),
  accent:new T.MeshStandardMaterial({color:0xe9ab76,metalness:.48,roughness:.32}),
  mirror:new T.MeshStandardMaterial({color:0xf2f4f6,metalness:1,roughness:.05,envMapIntensity:1.5}),
  glint:new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.13,depthWrite:false,toneMapped:false}),
  metal:new T.MeshStandardMaterial({color:0x9ea3a8,metalness:.9,roughness:.3,envMapIntensity:1})};
const wBox=(w,h,d,x,y,z,m,par)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);par.add(o);return o;};
const wSetRot=(o,r)=>{if(!r)return;if(r.length===4)o.quaternion.fromArray(r);else o.rotation.set(r[0],r[1],r[2]);};
const wBone=n=>(dog.bones[n]&&dog.bones[n].o)||dog.g.getObjectByName(n);
function wLabel(txt){
  const c=document.createElement('canvas');c.width=192;c.height=56;const x=c.getContext('2d');
  x.font='700 40px "JetBrains Mono",ui-monospace,"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif';x.fillStyle='#8a9097';x.textBaseline='middle';x.fillText(txt,8,30);
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;
  return new T.Mesh(new T.PlaneGeometry(1.2,.35),new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,toneMapped:false}));
}
/* the cabinet is rebuilt only when the screen size changes its dimensions */
function wLayout(){
  /* the cabinet fills the wall from just under the top of the screen down to just above the floor line (heights are those of the wall plane at the resting camera) */
  const Wc=clamp(L.hw*.42,2.7,3.7),tn=TILT_UP+TILT_DN,yTop=L.d*(TILT_UP+(TANH-tn)/(1+tn*TANH))-.35,yBot=FLOOR_Y+1.8,
    Hc0=clamp(yTop-yBot,4.1,7.0),key=Wc.toFixed(2)+'/'+Hc0.toFixed(2);
  if(key===W.key)return;
  W.key=key;W.Wc=Wc;const Hc=W.Hc=Hc0,D=.9,tH=W.tierH=(Hc-.28)/W.slots.length;W.yc=yTop-Hc/2;
  [W.inner,W.door].forEach(g=>{while(g.children.length){const c=g.children.pop();if(c.geometry)c.geometry.dispose();}});
  const I=W.inner;
  wBox(Wc,Hc,.1,0,0,-D/2+.05,wMat.back,I);
  wBox(.14,Hc,D,-(Wc/2-.07),0,0,wMat.body,I);wBox(.14,Hc,D,Wc/2-.07,0,0,wMat.body,I);
  wBox(Wc,.14,D,0,Hc/2-.07,0,wMat.body,I);wBox(Wc,.14,D,0,-(Hc/2-.07),0,wMat.body,I);
  for(let i=1;i<W.slots.length;i++)wBox(Wc-.28,.07,D*.92,0,Hc/2-.14-tH*i,.02,wMat.body,I);
  W.slots.forEach((s,i)=>{const l=wLabel(s.label);l.position.set(-Wc/2+.82,Hc/2-.14-tH*i-.24,-D/2+.112);I.add(l);});
  /* Open showroom frame: soft backing, slim metal trims, warm display ledges; no swinging door or glass blocker. */
  wBox(Wc-.12,.035,.09,0,Hc/2-.20,.48,wMat.trim,I);
  wBox(Wc-.12,.035,.09,0,-Hc/2+.18,.48,wMat.trim,I);
  for(let i=0;i<W.slots.length;i++){
    const y=Hc/2-.14-tH*(i+1);
    if(i<W.slots.length-1)wBox(Wc-.35,.025,.1,0,y+.035,.42,wMat.accent,I);
    wBox(Wc-.42,.035,.22,0,y+tH*.34,-.25,wMat.trim,I);
  }
}
async function loadWardrobe(){
  try{
    const base='models/wardrobe/';
    const man=await fetch(base+'manifest.json').then(r=>{if(!r.ok)throw new Error('manifest '+r.status);return r.json();});
    W.slots=man.slots;W.slots.forEach(s=>{W.slotById[s.id]=s;W.byslot[s.id]=[];});
    const tl=new T.TextureLoader(),wrap=s=>s==='mirror'?T.MirroredRepeatWrapping:s==='clamp'?T.ClampToEdgeWrapping:T.RepeatWrapping;
    await Promise.all(man.items.map(async def=>{
      try{
        const m=await fetch(base+def.mesh).then(r=>{if(!r.ok)throw new Error(def.mesh+' '+r.status);return r.json();});
        // single-texture item: one material. multi-material item (m.texs + m.groups, def.texs = same order): one material per texture, triangles split by geometry groups.
        const multi=Array.isArray(m.texs)&&Array.isArray(m.groups)&&Array.isArray(def.texs)&&def.texs.length===m.texs.length&&m.texs.length>1,
          tds=multi?m.texs:[m.tex],files=multi?def.texs:[def.tex];
        const mats=await Promise.all(tds.map(async(td,i)=>{
          const tex=await new Promise((res,rej)=>tl.load(base+files[i],res,undefined,rej));
          tex.colorSpace=T.SRGBColorSpace;tex.wrapS=wrap(td.wrapS);tex.wrapT=wrap(td.wrapT);
          if(td.filter==='nearest'){tex.magFilter=tex.minFilter=T.NearestFilter;tex.generateMipmaps=false;}   // the little pixel textures stay crisp
          const a=!!td.alpha;
          return new T.MeshStandardMaterial({map:tex,roughness:.85,metalness:0,side:T.DoubleSide,envMapIntensity:.55,transparent:a,depthWrite:!a,alphaTest:a?.02:0});}));
        const g=new T.BufferGeometry();
        g.setAttribute('position',new T.Float32BufferAttribute(m.pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(m.nor,3));g.setAttribute('uv',new T.Float32BufferAttribute(m.uv,2));g.setIndex(m.idx);
        if(multi)m.groups.forEach(x=>g.addGroup(x.start,x.count,x.mat));
        const al=tds.some(t=>!!t.alpha),mat=multi?mats:mats[0];
        const [a,b]=m.bbox,c=[0,1,2].map(i=>(a[i]+b[i])/2),md=Math.max(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
        W.items[def.id]={def,id:def.id,slot:def.slot,name:def.name||def.id,geo:g,mat,alpha:al,c,md,hv:0,pop:1,away:false,inWindow:false,holder:null,proxy:null};
      }catch(e){console.warn('wardrobe item '+def.id+' failed',e);}
    }));
    man.items.forEach(d=>{const it=W.items[d.id];if(it&&W.byslot[d.slot])W.byslot[d.slot].push(it);});   // manifest order = shelf order
    const sph=new T.SphereGeometry(1,8,6),hide=new T.MeshBasicMaterial({visible:false});
    Object.values(W.items).forEach(it=>{
      const h=new T.Group(),m=new T.Mesh(it.geo,it.mat);m.position.set(-it.c[0],-it.c[1],-it.c[2]);m.renderOrder=it.alpha?4:0;h.add(m);
      const p=new T.Mesh(sph,hide);p.scale.setScalar(it.md*.62);p.userData.ward={id:it.id,src:'shelf'};h.add(p);   // generous invisible hit area (the glasses are thin)
      it.holder=h;it.proxy=p;W.shelfG.add(h);});
    wBuildNav();W.ready=true;
  }catch(e){console.warn('wardrobe failed to load',e);}
}
function wBuildNav(){
  W.pagesEl.replaceChildren();W.nav={};
  W.slots.forEach(sl=>{
    const bar=document.createElement('div');bar.className='wardNav';
    const prev=document.createElement('button'),next=document.createElement('button'),count=document.createElement('span');
    prev.type=next.type='button';prev.textContent='‹';next.textContent='›';
    prev.setAttribute('aria-label',sl.label+'上一組物品');next.setAttribute('aria-label',sl.label+'下一組物品');
    const step=dir=>{const max=Math.max(0,Math.ceil((W.byslot[sl.id]||[]).length/3)-1);W.page[sl.id]=clamp((W.page[sl.id]||0)+dir,0,max);wNavSync();Au.click(1.1,.35);};
    prev.addEventListener('click',()=>step(-1));next.addEventListener('click',()=>step(1));
    bar.append(prev,count,next);W.pagesEl.append(bar);W.nav[sl.id]={bar,prev,next,count};
  });wNavSync();
}
function wNavSync(){
  W.slots.forEach(sl=>{const n=W.nav[sl.id];if(!n)return;
    const total=Math.max(1,Math.ceil((W.byslot[sl.id]||[]).length/3)),pg=clamp(W.page[sl.id]||0,0,total-1);
    n.count.textContent=(pg+1)+' / '+total;n.prev.disabled=pg===0;n.next.disabled=pg>=total-1;
    n.bar.hidden=total<=1;
  });
}
function wSave(){const o={};for(const s in W.worn)o[s]=W.worn[s].id;LS.set(W.KEY,o);W.recycleKey='';}
function wRecycle(slot){
  if(slot==='headphones'){hpUnwear();Au.click(1.2,.45);buzz(8);wRenderRecycle();return;}
  if(!W.worn[slot])return;
  wUnequip(slot);
  Au.click(1.2,.45);buzz(8);
  wRenderRecycle();
}
function wRenderRecycle(){
  const equipped=W.slots.filter(sl=>!!W.worn[sl.id]);
  const key=equipped.map(sl=>sl.id+':'+W.worn[sl.id].id).join('|')+(hpState.worn?'|headphones':'');
  if(key===W.recycleKey)return;
  W.recycleKey=key;
  W.recycleItemsEl.replaceChildren();
  if(hpState.worn){const btn=document.createElement('button');btn.type='button';btn.textContent='現有耳機　↩ 取下';btn.addEventListener('click',()=>wRecycle('headphones'));W.recycleItemsEl.appendChild(btn);}
  equipped.forEach(sl=>{
    const it=W.items[W.worn[sl.id].id];
    const btn=document.createElement('button');btn.type='button';
    btn.textContent=(it?it.name:sl.label)+'　↩ 回收';
    btn.setAttribute('aria-label','回收'+(it?it.name:sl.label));
    btn.addEventListener('click',()=>wRecycle(sl.id));
    W.recycleItemsEl.appendChild(btn);
  });
}
function wUnequip(slot,silent){
  const w=W.worn[slot];if(!w)return;
  if(w.sg.parent)w.sg.parent.remove(w.sg);delete W.worn[slot];
  const it=W.items[w.id];if(it&&!silent){it.away=false;it.pop=.0001;}
  wSave();
}
function wEquip(id,quiet){
  const it=W.items[id];if(!it||!dog.ready)return;
  const sl=W.slotById[it.slot],par=sl&&wBone(sl.bone);if(!par)return;
  if(it.slot==='hat'&&hpState.worn)hpUnwear();   // hat and headphones are mutually exclusive: the headphones come off
  wUnequip(it.slot);
  const sg=new T.Group();sg.position.fromArray(sl.worn.pos);wSetRot(sg,sl.worn.rot);sg.userData.s=sl.worn.scale;sg.scale.setScalar(sl.worn.scale);
  const m=new T.Mesh(it.geo,it.mat),f=it.def.fit||{};
  if(f.pos)m.position.fromArray(f.pos);wSetRot(m,f.rot);if(f.scale){if(Array.isArray(f.scale))m.scale.fromArray(f.scale);else m.scale.setScalar(f.scale);}
  m.renderOrder=it.alpha?4:1;sg.add(m);
  const p=new T.Mesh(new T.SphereGeometry(1,8,6),new T.MeshBasicMaterial({visible:false}));p.position.set(it.c[0],it.c[1],it.c[2]);p.scale.setScalar(it.md*.75);p.userData.ward={id,src:'worn'};m.add(p);
  par.add(sg);sg.traverse(o=>o.layers.enable(1));
  W.worn[it.slot]={id,sg,m,proxy:p,pop:quiet?1:0};it.away=true;
  if(!quiet){dog.shk=1;Au.snap();buzz(10);}
  wSave();
}
/* screen position of a slot's attach point on the dog (where the drop ring goes) */
function wAnchor(slot){
  const sl=W.slotById[slot],b=sl&&wBone(sl.bone);if(!b)return null;
  b.updateWorldMatrix(true,false);const v=W.v.fromArray(sl.worn.pos).applyMatrix4(b.matrixWorld).project(cam);
  return {x:(v.x+1)/2*innerWidth,y:(1-v.y)/2*innerHeight};
}
function wPick(cx,cy){
  W.nd.set(cx/innerWidth*2-1,-(cy/innerHeight*2-1));W.ray.setFromCamera(W.nd,cam);
  const c=[];
  if(W.vis>.55)for(const id in W.items){const it=W.items[id];if(it.inWindow&&!it.away)c.push(it.proxy);}
  for(const s in W.worn)c.push(W.worn[s].proxy);
  const h=W.ray.intersectObjects(c,false)[0];return h?h.object.userData.ward:null;
}
function wStartDrag(h,e){
  const it=W.items[h.id];if(!it)return;
  if(h.src==='worn')wUnequip(it.slot,true);
  const gh=new T.Group(),m=new T.Mesh(it.geo,it.mat),sl=W.slotById[it.slot],r=(it.def.display&&it.def.display.rot)||sl.display.rot;
  m.position.set(-it.c[0],-it.c[1],-it.c[2]);m.renderOrder=5;gh.add(m);gh.rotation.set(r[0],r[1],r[2]);gh.scale.setScalar(sl.display.size/it.md*1.05);
  scene.add(gh);it.away=true;W.hot=null;W.tipEl.classList.remove('on');
  W.drag={id:h.id,it,gh,armed:false,was:false,over:false,startX:e.clientX,startY:e.clientY,wasWorn:h.src==='worn',moved:false};
  Au.click(1.2,.5);cvs.style.cursor='grabbing';wDragMove(e);
}
function wDragMove(e){
  const d=W.drag;setNDC(e);
  if(Math.hypot(e.clientX-d.startX,e.clientY-d.startY)>8)d.moved=true;
  const p=planeHit(3.2);if(p)d.gh.position.set(p.x,p.y,3.2);
  const q=planeHit(0);d.over=!!q&&q.x>W.root.position.x-W.Wc/2;   // pointer is over the cabinet: let go = put away
  const a=wAnchor(d.it.slot);
  d.px=e.clientX;d.py=e.clientY;
  d.near=a?Math.hypot(e.clientX-a.x,e.clientY-a.y):999;
  d.armed=!d.over&&dog.present&&!dog.leaving&&(dogHit(e.clientX,e.clientY)||d.near<95);
}
function wEndDrag(){
  const d=W.drag;if(!d)return;W.drag=null;cvs.style.cursor='default';
  if(d.wasWorn&&!d.moved){
    scene.remove(d.gh);d.it.away=false;d.it.pop=.0001;
    Au.click(1.2,.45);buzz(8);wRenderRecycle();
  }else if(d.armed){scene.remove(d.gh);wEquip(d.id);}
  else W.fly.push({gh:d.gh,it:d.it,t:0,from:d.gh.position.clone(),s0:d.gh.scale.x});
}
cvs.addEventListener('pointerdown',e=>{
  if(!W.ready||e.button>0)return;
  const h=wPick(e.clientX,e.clientY);if(!h)return;
  if(W.vis<.5&&h.src!=='worn')return;   // with the cabinet closed only what the dog wears can be grabbed (the cabinet then slides in by itself)
  e.stopImmediatePropagation();e.stopPropagation();try{cvs.setPointerCapture(e.pointerId);}catch(_){}
  wStartDrag(h,e);
},{capture:true});
cvs.addEventListener('pointermove',e=>{if(W.drag){e.stopImmediatePropagation();wDragMove(e);}},{capture:true});
cvs.addEventListener('pointerup',e=>{if(W.drag){e.stopImmediatePropagation();try{cvs.releasePointerCapture(e.pointerId);}catch(_){}wEndDrag();}},{capture:true});
cvs.addEventListener('pointercancel',e=>{if(W.drag){e.stopImmediatePropagation();wEndDrag();}},{capture:true});
/* hover over an item: name tag + grab cursor (this runs after the main handler, which would otherwise reset the cursor) */
cvs.addEventListener('pointermove',e=>{
  if(W.drag||!W.ready||W.vis<.8||pd){if(!W.drag&&W.hot){W.hot=null;W.tipEl.classList.remove('on');}return;}
  const h=wPick(e.clientX,e.clientY);W.hot=h?h.id:null;
  if(h){cvs.style.cursor='grab';W.tipEl.textContent=W.items[h.id].name;W.tipEl.style.transform='translate3d('+Math.round(e.clientX+14)+'px,'+Math.round(e.clientY+16)+'px,0)';W.tipEl.classList.add('on');}
  else W.tipEl.classList.remove('on');
});
/* opening: pointer at the right edge (mouse) or the pill (touch). it stays open while the pointer is over the cabinet */
addEventListener('pointermove',e=>{
  if(e.pointerType==='touch')return;
  const fx=e.clientX/innerWidth,fy=e.clientY/innerHeight,lf=1-(W.Wc+.35)/(2*L.hw);
  if(fx>.9&&fy>.2)W.hover=true;else if(fx<lf-.04)W.hover=false;
},{passive:true});
cvs.addEventListener('pointerleave',()=>{if(!W.drag&&!W.pin)W.hover=false;});
W.hintEl.addEventListener('click',()=>{W.pin=!W.pin;});
cvs.addEventListener('pointerdown',e=>{if(W.pin&&!W.drag&&e.clientX/innerWidth<1-(W.Wc+.35)/(2*L.hw)-.02)W.pin=false;});
/* a long shelf row pages with the wheel: three items are in view per slot */
cvs.addEventListener('wheel',e=>{
  if(!W.ready||W.vis<.8||W.drag)return;setNDC(e);const q=planeHit(0);if(!q||q.x<W.root.position.x-W.Wc/2)return;
  const si=clamp(Math.floor((W.Hc/2-(q.y-W.root.position.y))/W.tierH),0,W.slots.length-1),sl=W.slots[si],n=(W.byslot[sl.id]||[]).length;
  e.stopImmediatePropagation();e.preventDefault();
  W.page[sl.id]=clamp((W.page[sl.id]||0)+Math.sign(e.deltaY||e.deltaX),0,Math.max(0,Math.ceil(n/3)-1));wNavSync();
},{capture:true,passive:false});
function wardFrame(dt,time){
  if(!W.ready)return;
  const can=dog.ready&&dog.present&&!dog.leaving;
  if(!W.restored&&dog.ready){W.restored=true;const o=LS.get(W.KEY,{});for(const s in o)if(W.items[o[s]]&&W.items[o[s]].slot===s)wEquip(o[s],true);}
  if(!can&&W.drag){W.drag.armed=false;wEndDrag();}
  const want=can&&(W.hover||W.pin||!!W.drag)&&(!pd||W.pin)?1:0;
  W.vis+=(want-W.vis)*(1-Math.exp(-dt*(want>W.vis?7:5)));if(Math.abs(want-W.vis)<.003)W.vis=want;
  W.hintEl.classList.toggle('gone',!can||W.vis>.3);
  W.recycleEl.hidden=!can||W.vis<.8||(!Object.keys(W.worn).length&&!hpState.worn);
  if(!W.recycleEl.hidden)wRenderRecycle();
  wLayout();
  const open=ease.io2(clamp(W.vis,0,1));
  W.root.visible=W.vis>.002;
  W.root.position.set(lerp(L.hw+W.Wc/2+1.8,L.hw-W.Wc/2-.35,open),W.yc,0);
  /* Navigation stays aligned with projected shelf centers as camera/viewport changes. */
  W.slots.forEach((sl,i)=>{
    const n=W.nav[sl.id];if(!n)return;
    n.bar.style.display=can&&W.vis>.75&&!n.bar.hidden?'flex':'none';
    if(n.bar.style.display==='none')return;
    W.root.updateWorldMatrix(true,false);
    const p=new T.Vector3(0,W.Hc/2-.14-W.tierH*(i+.5),.55).applyMatrix4(W.root.matrixWorld).project(cam);
    n.bar.style.left=((p.x+1)*.5*innerWidth)+'px';
    n.bar.style.top=((1-p.y)*.5*innerHeight-W.tierH*10)+'px';
    n.bar.style.width=Math.max(105,Math.min(190,W.Wc/L.hw*innerWidth*.32))+'px';
  });
  /* shelves: up to three items per slot in view, evenly spread, slowly turning; the one under the pointer lifts a little */
  W.slots.forEach((sl,si)=>{
    const list=W.byslot[sl.id]||[],per=3,pg=clamp(W.page[sl.id]||0,0,Math.max(0,Math.ceil(list.length/per)-1)),n=Math.min(per,list.length-pg*per),
      cell=(W.Wc-.5)/Math.max(n,2),yc=W.Hc/2-.14-W.tierH*(si+.5)-.05;
    list.forEach((it,i)=>{
      const wi=i-pg*per,inW=wi>=0&&wi<per;it.inWindow=inW;
      const h=it.holder;h.visible=inW&&!it.away;if(!h.visible)return;
      it.hv+=((W.hot===it.id?1:0)-it.hv)*(1-Math.exp(-dt*12));if(it.pop<1)it.pop=Math.min(1,it.pop+dt/.35);
      const pop=it.pop<1?(1-Math.pow(1-it.pop,3))*(1+.25*Math.sin(it.pop*Math.PI)):1;
      const r=(it.def.display&&it.def.display.rot)||sl.display.rot,size=Math.min(sl.display.size,cell*.85);
      h.position.set((wi-(n-1)/2)*cell,yc+Math.sin(time*1.3+i*1.7)*.03,.02);
      h.rotation.set(r[0],r[1]+Math.sin(time*.8+i*2.1)*(.3+.35*it.hv),r[2]);
      h.scale.setScalar(Math.max(.001,size/it.md*(1+.12*it.hv)*pop));
    });
  });
  /* worn items pop in */
  for(const s in W.worn){const w=W.worn[s];if(w.pop<1)w.pop=Math.min(1,w.pop+dt/.35);
    const k=w.pop<1?(1-Math.pow(1-w.pop,3))*(1+.3*Math.sin(w.pop*Math.PI)):1;w.sg.scale.setScalar(Math.max(.001,w.sg.userData.s*k));}
  /* an item let go away from the dog flies back to its place on the shelf */
  for(let i=W.fly.length-1;i>=0;i--){
    const f=W.fly[i];f.t+=dt/.28;const k=ease.out3(clamp(f.t,0,1));
    f.it.holder.updateWorldMatrix(true,false);W.v.set(0,0,0).applyMatrix4(f.it.holder.matrixWorld);
    f.gh.position.lerpVectors(f.from,W.v,k);f.gh.scale.setScalar(lerp(f.s0,f.it.holder.scale.x,k));
    if(f.t>=1){scene.remove(f.gh);f.it.away=false;f.it.pop=.0001;W.fly.splice(i,1);}
  }
  /* while an item is dragged: a soft click when it is over the dog (so you know letting go will put it on) and a little sway */
  const d=W.drag;
  if(d){
    if(d.armed&&!d.was){Au.click(1.7,.45);buzz(8);}
    d.was=d.armed;
    d.gh.rotation.y+=Math.sin(time*2.2)*.25*dt;
  }
}

loadWardrobe();

function frame(){
  const rawDt=clock.getDelta(),dt=Math.min(.05,rawDt),time=clock.elapsedTime;fpsAvg+=(1/Math.max(rawDt,.001)-fpsAvg)*.1;
  stepTweens(dt);
  {const hov=Math.sin(time*1.1)*.05+Math.sin(time*2.3)*.012,shk=shakeT>0?Math.sin(time*55)*.06*(shakeT/.9):0;
   const tvOn=tv.state==='falling'||tv.state==='on',want=tvOn?tvDrift():0;
   if(tvOn&&!pDrag.tvOn)pDrag.tx=0;pDrag.tvOn=tvOn;   // the TV lands in a slot next to the player: send the player back to its own slot
   pOff.x+=(want-pOff.x)*(1-Math.exp(-dt*4.5));if(Math.abs(want-pOff.x)<.002)pOff.x=want;
   {const k=1-Math.exp(-dt*(pDrag.on?18:6));pOff.ux+=(pDrag.tx-pOff.ux)*k;pOff.uy+=(pDrag.ty-pOff.uy)*k;}
   const PX=pOff.x+pOff.ux;
   player.position.x=PX;BODY_RECT.x0=-PW/2+PX;BODY_RECT.x1=PW/2+PX;BAY.x=PX;JACK.x=-1.35+PX;
   BODY_RECT.y0=PY+pOff.uy-PH/2;BODY_RECT.y1=PY+pOff.uy+PH/2;
   if(playerB)Body.setPosition(playerB,{x:mxp(PX),y:myp(PY+pOff.uy)});
   player.position.y=PY+pOff.uy+pOff.intro+pOff.jig+hov+shk;player.rotation.z=Math.sin(time*.7)*.004+shk*.05;
   BAY.y=player.position.y+BAYY;JACK.y=player.position.y-2.42;}
  if(!camLock){
    const near=cd&&cd.mode==='drag'&&cd.committed&&lidOpen&&!cdIn&&Math.hypot(cd.pos.x-BAY.x,cd.pos.y-BAY.y)<(zoomed?4.4:3.7)&&cd.pos.y<(zoomed?.4:-.3);
    zoomed=!!near;rig.td=zoomed?L.d*.58:L.d;rig.tx=0;rig.ty=zoomed?BAY.y*.9:0;
  }
  const kc=1-Math.exp(-dt*3.4),kp=1-Math.exp(-dt*3);
  rig.x+=(rig.tx-rig.x)*kc;rig.y+=(rig.ty-rig.y)*kc;rig.d+=(rig.td-rig.d)*kc;rig.px+=(rig.ptx-rig.px)*kp;rig.py+=(rig.pty-rig.py)*kp;
  cam.position.set(rig.x+rig.px*.35,rig.y+rig.py*.22+rig.d*TILT_UP,rig.d);
  if(camShake>.003){cam.position.x+=(Math.random()-.5)*camShake*.3;cam.position.y+=(Math.random()-.5)*camShake*.3;camShake*=Math.exp(-dt*5);}
  cam.lookAt(rig.x,rig.y-rig.d*TILT_DN,0);cam.updateMatrixWorld();
  shelfStep(dt);
  {const w=shelfWant();shelfVis+=(w-shelfVis)*(1-Math.exp(-dt*(w>shelfVis?7:4.5)));if(Math.abs(w-shelfVis)<.003)shelfVis=w;
   shelfOff=(1-ease.io2(clamp(shelfVis,0,1)))*(L.top-L.shelfB+1.4);
   shelf.position.y=L.shelfB-.07+shelfOff;shelfBack.position.y=L.shelfB-.07+BACK_H/2+shelfOff;shelfShade.position.y=L.shelfB-.14-SHADE_H/2+shelfOff;shelf.visible=shelfBack.visible=shelfShade.visible=shelfVis>.002;
   shelfHint.classList.toggle('gone',shelfVis>.3);
   /* the ⋯ button is one more slot after the last album, standing on the shelf: project that slot (same spacing formula as placeAlbums) to the screen.
      if the slot has scrolled off the right edge it parks at the edge, so it can always be reached */
   {const d=albums.length-sx,ad=Math.abs(d),f=clamp(1-ad,0,1),s0=1+.16*f,x0=slotX(d)+hoverPush(albums.length);
    const v=_tv.set(x0,L.shelfB+.75*s0+shelfOff,0).project(cam);
    const cx=clamp((v.x+1)/2*innerWidth,39,innerWidth-39),cy=(1-v.y)/2*innerHeight;
    const dpr=Math.min(window.devicePixelRatio||1,2),q=n=>Math.round(n*dpr)/dpr;   // snap to device pixels, not whole CSS pixels: half the stepping on retina, still crisp at rest
    toolsEl.style.transform='translate3d('+q(cx-23)+'px,'+q(cy-23)+'px,0)';
    toolsEl.classList.toggle('flip',cx+23+190>innerWidth);
    const u=_tv.set(0,L.shelfB-.14+shelfOff,-.5).project(cam);   // under the plank (its lowest visible line)
    popEl.style.transform='translate3d(0,'+Math.round((1-u.y)/2*innerHeight+16)+'px,0)';
    const away=shelfVis<.05;toolsEl.classList.toggle('away',away);popEl.classList.toggle('away',away);}}
  albums.forEach((a,i)=>{const cs=a.k>.02||a.mag>.02||a.dock;a.meshes.forEach(m=>{m.castShadow=cs;});   // only albums lifted off the shelf cast real shadows
    if(a.dock)return;const on=cd&&cd.ai===i&&cd.mode==='drag'&&cd.committed;
    /* the album only reaches for its CD once the CD is dragged up near the shelf, at the top of the screen */
    const tg=on?clamp((cd.pos.y-(L.shelfB-1.6))/1.3,0,1):0;a.mag+=(tg*tg*(3-2*tg)-a.mag)*(1-Math.exp(-dt*6));});
  placeAlbums(time);
  updateCD(dt);
  physFrame(dt,time);
  if(Au.alb&&Au.alb.yt&&(status==='playing'||status==='paused'))Au.elapsed=status==='paused'&&YTA.pausedAt!==null?YTA.pausedAt:YTA.time();else if(Au.playing)Au.elapsed+=dt;
  YTA.tick(dt);
  if(volT>0)volT-=dt;
  try{dogFrame(dt,time);}catch(e){if(!dog.err){dog.err=1;console.warn('dog',e);}}
  try{wardFrame(dt,time);}catch(e){if(!W.err){W.err=1;console.warn('wardrobe',e);}}
  drawDisplay();syncKeys();updateFx(dt,time);
  renderer.render(scene,cam);
  if(dogOverlayRenderer&&dog.ready&&dog.present&&!dog.leaving&&tv.mode==='video'&&tv.pw>.02&&tv.b){
    if(!dog.overlayLights){scene.traverse(o=>{if(o.isLight)o.layers.enable(1);});dog.overlayLights=true;}
    dogOverlayCam.copy(cam);dogOverlayCam.layers.set(1);
    const bg=scene.background;scene.background=null;
    try{dogOverlayRenderer.render(scene,dogOverlayCam);}
    catch(e){if(!dog.overlayError){dog.overlayError=true;console.warn('Dog foreground render failed',e);}dogOverlayRenderer.domElement.style.display='none';}
    finally{scene.background=bg;}
  }
  requestAnimationFrame(frame);
}
tween(1.1,k=>{pOff.intro=lerp(-.9,0,k);},ease.out5);
