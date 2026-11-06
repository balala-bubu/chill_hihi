/* ---------- dog wardrobe ----------
   models/wardrobe/manifest.json (written by tools/build_wardrobe.py) lists the slots (which bone each kind of item hangs on, and where) and the items.
   While the dog is around, an open boutique display shelf slides in from the right edge; each slot has one shelf.
   Drag an item onto the dog to put it on, drag a worn item back to the cabinet to put it away. What the dog wears is remembered. */
const W={ready:false,items:{},slots:[],slotById:{},byslot:{},worn:{},vis:0,hover:false,pin:false,drag:null,hot:null,restored:false,fly:[],sc:{},sd:null,glow:0,thumbs:{},PER:3,cell:1,ledZ:0,rowS:[0],rowH:[2],
  root:new T.Group(),inner:new T.Group(),shelfG:new T.Group(),Wc:3.2,Hc:6.2,tierH:2,key:'',KEY:'chill_hihi.wear',
  nd:new T.Vector2(),ray:new T.Raycaster(),v:new T.Vector3(),
  hintEl:$id('wardHint'),tipEl:$id('wardTip'),recycleEl:$id('wardRecycle'),recycleItemsEl:$id('wardRecycleItems'),recycleKey:''};
W.root.visible=false;W.root.add(W.inner,W.shelfG);scene.add(W.root);
/* the cabinet speaks the album shelf's language: same plank material, same soft gradient shadows, rounded frame. orange appears only once (the rim, see wardFrame) */
const wMat={
  body:new T.MeshPhysicalMaterial({color:0xe4e6e8,roughness:.6,clearcoat:.25,clearcoatRoughness:.5,envMapIntensity:.6}),
  ledge:new T.MeshPhysicalMaterial({color:0xeceef0,roughness:.5,clearcoat:.4,clearcoatRoughness:.35,envMapIntensity:.8}),
  track:new T.MeshBasicMaterial({color:0x8b9198,transparent:true,opacity:.28,depthWrite:false,toneMapped:false}),
  thumb:new T.MeshBasicMaterial({color:0x5b6168,transparent:true,opacity:.7,depthWrite:false,toneMapped:false}),
  rim:new T.MeshBasicMaterial({color:0xee5a2c,transparent:true,opacity:0,depthWrite:false,toneMapped:false}),
  soft:new T.MeshBasicMaterial({map:mkTex(64,64,(x,w,h)=>{const g=x.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(58,64,74,.5)');g.addColorStop(.5,'rgba(58,64,74,.2)');g.addColorStop(1,'rgba(58,64,74,0)');x.fillStyle=g;x.fillRect(0,0,w,h);}),transparent:true,depthWrite:false,toneMapped:false})};   // contact shadow under each item
const wSoftGeo=new T.PlaneGeometry(1,1);wSoftGeo.rotateX(-Math.PI/2);
const wBox=(w,h,d,x,y,z,m,par)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);par.add(o);return o;};
const wSetRot=(o,r)=>{if(!r)return;if(r.length===4)o.quaternion.fromArray(r);else o.rotation.set(r[0],r[1],r[2]);};
const wBone=n=>(dog.bones[n]&&dog.bones[n].o)||dog.g.getObjectByName(n);
function wLabel(txt){   // engraved into the back panel: dark text with a light edge just below it, drawn large so it stays sharp
  const t=mkTex(512,128,(x,w,h)=>{
    x.font='600 50px "JetBrains Mono",ui-monospace,"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif';x.textBaseline='middle';
    if('letterSpacing' in x)x.letterSpacing='5px';
    x.fillStyle='rgba(255,255,255,.65)';x.fillText(txt,10,h/2+3);
    x.fillStyle='rgba(66,72,82,.5)';x.fillText(txt,10,h/2);});
  const m=new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,toneMapped:false});m.userData.own=true;
  return new T.Mesh(new T.PlaneGeometry(1.6,.4),m);
}
if(document.fonts&&document.fonts.load)document.fonts.load('600 50px "JetBrains Mono"').then(()=>{W.key='';}).catch(()=>{});   // redraw the labels once the font is in
function wClear(g){while(g.children.length){const c=g.children[g.children.length-1];g.remove(c);if(c.geometry)c.geometry.dispose();if(c.material&&c.material.userData.own){if(c.material.map)c.material.map.dispose();c.material.dispose();}}}
const wSc=id=>W.sc[id]||(W.sc[id]={x:0,t:0,v:0,wl:false,wf:0,wt:0});   // scroll state of a shelf: position, target, velocity, wheel bookkeeping (in items; the left-most visible item)
const wTierTop=i=>W.Hc/2-.15-W.rowS[i],wLedgeTop=i=>wTierTop(i+1)+.05;   // y (cabinet space) of the top of tier i, and of the top of the ledge it stands on. rows can differ in height (slot.rowH, default 1): rowS = distance from the top of the opening to the top of each row
function wTierAt(q){   // which shelf is under a point on the z=0 plane (-1 outside the cabinet's opening)
  const rx=W.root.position.x,ry=W.root.position.y,F=.15;
  if(q.x<rx-W.Wc/2+F||q.x>rx+W.Wc/2-F||q.y>ry+W.Hc/2-F||q.y<ry-W.Hc/2+F)return -1;
  const d=W.Hc/2-F-(q.y-ry);for(let i=W.slots.length-1;i>0;i--)if(d>=W.rowS[i])return i;
  return 0;
}
function wReveal(it){   // scroll the item's shelf so the item can be seen where it is about to come back to
  const list=W.byslot[it.slot]||[],i=list.indexOf(it);if(i<0||list.length<=W.PER)return;
  const sc=wSc(it.slot);if(i<sc.t-.01||i>sc.t+W.PER-1+.01)sc.t=clamp(i-1,0,list.length-W.PER);
}
/* the cabinet is rebuilt only when the screen size changes its dimensions */
function wLayout(){
  /* the cabinet fills the wall from just under the top of the screen down to just above the floor line (heights are those of the wall plane at the resting camera) */
  const Wc=clamp(L.hw*.42,2.7,3.7),tn=TILT_UP+TILT_DN,yTop=L.d*(TILT_UP+(TANH-tn)/(1+tn*TANH))-.35,yBot=FLOOR_Y+1.8,
    Hc0=clamp(yTop-yBot,4.1,7.0),key=Wc.toFixed(2)+'/'+Hc0.toFixed(2);
  if(key===W.key)return;
  const Hc=Hc0,D=.9,F=.15,n=W.slots.length,iw=Wc-2*F,ih=Hc-2*F,bz=-D/2+.14;
  W.key=key;W.Wc=Wc;W.Hc=Hc;{const wt=W.slots.map(s=>s.rowH||1),u=ih/wt.reduce((a,b)=>a+b,0);W.rowH=wt.map(w=>w*u);W.rowS=[0];W.rowH.forEach(h=>W.rowS.push(W.rowS[W.rowS.length-1]+h));W.tierH=u;}W.yc=yTop-Hc/2;W.cell=(Wc-.5)/W.PER;
  wClear(W.inner);W.thumbs={};
  const I=W.inner,add=(g,m,x,y,z,ro)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);if(ro)o.renderOrder=ro;I.add(o);return o;};
  /* soft drop shadow on the wall behind: lifts the cabinet off the wall like the shelf's own shade */
  {const sw=Wc+1.5,sh=Hc+1.5,cw=160,ch=Math.round(cw*sh/sw),k=cw/sw,
     t=mkTex(cw,ch,(x,w,h)=>{x.shadowColor='rgba(40,46,56,.5)';x.shadowBlur=16;x.shadowOffsetX=3000;x.shadowOffsetY=4;x.fillStyle='#000';   // the shape itself is drawn far off-canvas, only its shadow lands here
       const rw=Wc*k,rh=Hc*k,rx=(w-rw)/2-3000,ry=(h-rh)/2-2,r=.26*k;x.beginPath();if(x.roundRect)x.roundRect(rx,ry,rw,rh,r);else x.rect(rx,ry,rw,rh);x.fill();}),
     m=new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,toneMapped:false});m.userData.own=true;
   add(new T.PlaneGeometry(sw,sh),m,0,-.1,-D/2-.05,-1);}
  /* rounded frame */
  {const fo=rrShape(Wc-.06,Hc-.06,.22);fo.holes.push(rrShape(iw+.06,ih+.06,.14));
   const fg=new T.ExtrudeGeometry(fo,{depth:D-.06,bevelEnabled:true,bevelThickness:.03,bevelSize:.03,bevelSegments:3,curveSegments:10});fg.translate(0,0,-(D-.06)/2);
   add(fg,wMat.body,0,0,0);}
  /* back panel: darker than the frame so the items read against it, with a soft shade under every ledge and along the side walls */
  {const bw=256,bh=Math.round(bw*ih/iw),
     t=mkTex(bw,bh,(x,w,h)=>{
       const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#bcc0c5');g.addColorStop(1,'#a9adb3');x.fillStyle=g;x.fillRect(0,0,w,h);
       for(let i=0;i<n;i++){const y0=h*W.rowS[i]/ih,th=h*W.rowH[i]/ih,gg=x.createLinearGradient(0,y0,0,y0+th*.38);gg.addColorStop(0,'rgba(48,54,64,.34)');gg.addColorStop(1,'rgba(48,54,64,0)');x.fillStyle=gg;x.fillRect(0,y0,w,th*.38);}
       const sg=x.createLinearGradient(0,0,w,0);sg.addColorStop(0,'rgba(48,54,64,.28)');sg.addColorStop(.1,'rgba(48,54,64,0)');sg.addColorStop(.9,'rgba(48,54,64,0)');sg.addColorStop(1,'rgba(48,54,64,.28)');x.fillStyle=sg;x.fillRect(0,0,w,h);}),
     m=new T.MeshStandardMaterial({map:t,roughness:.95});m.userData.own=true;
   add(new T.PlaneGeometry(iw,ih),m,0,0,bz);}
  /* ledges: rounded front edge, one under every shelf (the last one sits on the frame's bottom bar) */
  const ledD=D*.78,lg=new T.ExtrudeGeometry(rrShape(ledD,.1,.04),{depth:iw,bevelEnabled:false,curveSegments:8});lg.rotateY(Math.PI/2);lg.translate(-iw/2,0,0);
  W.ledZ=bz+ledD/2;
  for(let i=0;i<n;i++)add(lg,wMat.ledge,0,wTierTop(i+1),W.ledZ);
  /* shelf names (engraved) and, on shelves that scroll, a thin position bar on the same line */
  W.slots.forEach((s,i)=>{
    const ly=wTierTop(i)-.42,l=wLabel(s.label);l.position.set(-iw/2+1,ly,bz+.004);I.add(l);
    const N=(W.byslot[s.id]||[]).length;
    if(N>W.PER){
      const tl=Math.min(.8,iw*.3),thl=tl*W.PER/N,x0=iw/2-.22-tl;
      add(new T.PlaneGeometry(tl,.03),wMat.track,x0+tl/2,ly,bz+.006,2);
      W.thumbs[s.id]={m:add(new T.PlaneGeometry(thl,.05),wMat.thumb,x0+thl/2,ly,bz+.008,3),x0,tl,thl};
    }
  });
  /* rim: an orange outline just inside the opening, off until a worn item is carried over the cabinet */
  {const ro=rrShape(iw,ih,.12);ro.holes.push(rrShape(iw-.13,ih-.13,.06));add(new T.ShapeGeometry(ro,10),wMat.rim,0,0,bz+.01,4);}
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
    man.items.forEach(d=>{const it=W.items[d.id];if(it&&!d.hide&&W.byslot[d.slot])W.byslot[d.slot].push(it);});   // manifest order = shelf order
    const sph=new T.SphereGeometry(1,8,6),hide=new T.MeshBasicMaterial({visible:false});
    Object.values(W.items).forEach(it=>{
      const h=new T.Group(),m=new T.Mesh(it.geo,it.mat);m.position.set(-it.c[0],-it.c[1],-it.c[2]);m.renderOrder=it.alpha?4:0;h.add(m);
      const p=new T.Mesh(sph,hide);p.scale.setScalar(it.md*.62);p.userData.ward={id:it.id,src:'shelf'};h.add(p);   // generous invisible hit area (the glasses are thin)
      it.holder=h;it.proxy=p;W.shelfG.add(h);const sh=new T.Mesh(wSoftGeo,wMat.soft);sh.renderOrder=3;W.shelfG.add(sh);it.sh=sh;});
    W.ready=true;
  }catch(e){console.warn('wardrobe failed to load',e);}
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
  const add=(name,fn)=>{const btn=document.createElement('button'),a=document.createElement('span'),b=document.createElement('span');btn.type='button';a.textContent=name;b.className='t';b.textContent='取下';btn.append(a,b);btn.setAttribute('aria-label','取下'+name);btn.addEventListener('click',fn);W.recycleItemsEl.appendChild(btn);};
  if(hpState.worn)add('耳機',()=>wRecycle('headphones'));
  equipped.forEach(sl=>{const it=W.items[W.worn[sl.id].id];add(it?it.name:sl.label,()=>wRecycle(sl.id));});
}
function wUnequip(slot,silent){
  const w=W.worn[slot];if(!w)return;
  if(w.sg.parent)w.sg.parent.remove(w.sg);delete W.worn[slot];
  const it=W.items[w.id];if(it&&!silent){it.away=false;it.pop=.0001;wReveal(it);}
  wSave();
}
function wEquip(id,quiet){
  const it=W.items[id];if(!it||!dog.ready)return;
  const sl=W.slotById[it.slot],par=sl&&wBone(sl.bone);if(!par)return;
  if(it.slot==='hat'&&hpState.worn)hpUnwear();   // hat and headphones are mutually exclusive: the headphones come off
  wUnequip(it.slot);
  const sg=new T.Group();sg.position.fromArray(sl.worn.pos);wSetRot(sg,sl.worn.rot);sg.userData.s=sl.worn.scale;sg.scale.setScalar(sl.worn.scale);
  {const a=dog.fitAdj&&dog.fitAdj[it.slot];if(a){if(a.pos)sg.position.add(new T.Vector3().fromArray(a.pos));if(a.s){sg.scale.multiplyScalar(a.s);sg.userData.s*=a.s;}}}   // the second puppy has a differently shaped head
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
    scene.remove(d.gh);d.it.away=false;d.it.pop=.0001;wReveal(d.it);
    Au.click(1.2,.45);buzz(8);wRenderRecycle();
  }else if(d.armed){scene.remove(d.gh);wEquip(d.id);}
  else{wReveal(d.it);W.fly.push({gh:d.gh,it:d.it,t:0,from:d.gh.position.clone(),s0:d.gh.scale.x});}
}
/* a shelf with more items than fit scrolls like the album shelf: the item (or the shelf behind it) under the pointer at pointerdown stays under the pointer, and letting go
   keeps the speed and settles on an item. a grabbed item only comes off the shelf when it is pulled out of the cabinet, or up/down away from its shelf */
function wScrollMove(e){
  const s=W.sd;
  if(!s.moved){if(Math.hypot(e.clientX-s.startX,e.clientY-s.startY)<6)return;s.moved=true;}
  setNDC(e);const q=planeHit(0);if(!q)return;
  const qx=q.x,qy=q.y;
  if(s.id){
    const cy=W.root.position.y+wTierTop(s.si)-W.rowH[s.si]/2;
    if(qx<W.root.position.x-W.Wc/2+.2||Math.abs(qy-cy)>W.rowH[s.si]*.62){W.sd=null;cvs.style.cursor='default';wStartDrag({id:s.id,src:'shelf'},e);return;}
  }
  s.scrolling=true;cvs.style.cursor='grabbing';
  const max=Math.max(0,(W.byslot[s.slot]||[]).length-W.PER);
  let t=s.u0-(qx-s.qx0)/W.cell;
  if(t<0)t*=.35;else if(t>max)t=max+(t-max)*.35;   // past either end it gives, like a rubber band
  s.t=clamp(t,-.9,max+.9);
}
function wScrollEnd(){
  const s=W.sd;W.sd=null;cvs.style.cursor='default';if(!s||!s.scrolling)return;
  const sc=wSc(s.slot),max=Math.max(0,(W.byslot[s.slot]||[]).length-W.PER),v=clamp(sc.v,-SH.flickMax,SH.flickMax);
  sc.t=clamp(Math.round(sc.x+clamp(v*SH.flickLead,-1.6,1.6)),0,max);
}
cvs.addEventListener('pointerdown',e=>{
  if(!W.ready||e.button>0)return;
  const h=wPick(e.clientX,e.clientY);
  if(h&&W.vis<.5&&h.src!=='worn')return;   // with the cabinet closed only what the dog wears can be grabbed (the cabinet then slides in by itself)
  if(h&&h.src==='shelf'&&toyIs(h.id)){e.stopImmediatePropagation();e.stopPropagation();toySelect(h.id);return;}   // the toy row: a tap picks the toy (or puts it back), nothing is dragged
  /* a press on a shelf that has more items than fit: dragging along the row scrolls it (the album shelf's own feel) */
  if(W.vis>.8&&shelfVis<.3&&(!h||h.src==='shelf')){
    setNDC(e);const q=planeHit(0),si=q?wTierAt(q):-1;
    if(si>=0){const sl=W.slots[si],N=(W.byslot[sl.id]||[]).length;
      if(N>W.PER){
        const sc=wSc(sl.id);sc.v=0;sc.wl=false;sc.t=clamp(Math.round(sc.x),0,N-W.PER);   // a tap catches a gliding shelf
        W.sd={slot:sl.id,si,id:h?h.id:null,startX:e.clientX,startY:e.clientY,qx0:q.x,u0:sc.x,t:sc.x,moved:false,scrolling:false};
        e.stopImmediatePropagation();e.stopPropagation();try{cvs.setPointerCapture(e.pointerId);}catch(_){}
        return;}}
  }
  if(!h){if(toyPlace(e)){e.stopImmediatePropagation();e.stopPropagation();}return;}   // a toy is picked and this is empty space: use it here
  e.stopImmediatePropagation();e.stopPropagation();try{cvs.setPointerCapture(e.pointerId);}catch(_){}
  wStartDrag(h,e);
},{capture:true});
cvs.addEventListener('pointermove',e=>{
  if(W.sd){e.stopImmediatePropagation();wScrollMove(e);}
  else if(W.drag){e.stopImmediatePropagation();wDragMove(e);}
},{capture:true});
cvs.addEventListener('pointerup',e=>{
  if(W.sd){e.stopImmediatePropagation();try{cvs.releasePointerCapture(e.pointerId);}catch(_){}wScrollEnd();}
  else if(W.drag){e.stopImmediatePropagation();try{cvs.releasePointerCapture(e.pointerId);}catch(_){}wEndDrag();}
},{capture:true});
cvs.addEventListener('pointercancel',e=>{
  if(W.sd){e.stopImmediatePropagation();wScrollEnd();}
  else if(W.drag){e.stopImmediatePropagation();wEndDrag();}
},{capture:true});
/* hover over an item: name tag + grab cursor (this runs after the main handler, which would otherwise reset the cursor). over a shelf that scrolls, the cursor says so */
cvs.addEventListener('pointermove',e=>{
  if(W.drag||W.sd||!W.ready||W.vis<.8||pd){if(!W.drag&&W.hot){W.hot=null;W.tipEl.classList.remove('on');}return;}
  const h=wPick(e.clientX,e.clientY);W.hot=h?h.id:null;
  if(h){cvs.style.cursor=toyIs(h.id)?'pointer':'grab';W.tipEl.textContent=W.items[h.id].name;{const tw=W.tipEl.offsetWidth||90,tx=e.clientX+14+tw>innerWidth-8?e.clientX-14-tw:e.clientX+14;W.tipEl.style.transform='translate3d('+Math.round(tx)+'px,'+Math.round(e.clientY+16)+'px,0)';}W.tipEl.classList.add('on');}
  else{W.tipEl.classList.remove('on');
    if(shelfVis<.3){setNDC(e);const q=planeHit(0),si=q?wTierAt(q):-1;if(si>=0&&(W.byslot[W.slots[si].id]||[]).length>W.PER)cvs.style.cursor='grab';}}
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
/* wheel / trackpad over a shelf scrolls it, same feel as the album shelf: the target follows every tick, and once the wheel is quiet it settles on an item */
cvs.addEventListener('wheel',e=>{
  if(!W.ready||W.vis<.8||W.drag||W.sd)return;setNDC(e);const q=planeHit(0),si=q?wTierAt(q):-1;if(si<0)return;
  const sl=W.slots[si],N=(W.byslot[sl.id]||[]).length;
  e.stopImmediatePropagation();e.preventDefault();if(N<=W.PER)return;
  const sc=wSc(sl.id),max=N-W.PER,d0=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY,d=e.deltaMode===1?d0*16:e.deltaMode===2?d0*innerHeight:d0;
  if(!sc.wl){sc.wl=true;sc.wf=sc.t;}
  sc.t=clamp(sc.t+d/SH.wheelPx,-.35,max+.35);sc.wt=performance.now();
},{capture:true,passive:false});
function wardFrame(dt,time){
  if(!W.ready)return;
  const can=dog.ready&&dog.present&&!dog.leaving;
  if(!W.restored&&dog.ready){W.restored=true;const o=LS.get(W.KEY,{});for(const s in o)if(W.items[o[s]]&&W.items[o[s]].slot===s)wEquip(o[s],true);}
  if(!can&&W.drag){W.drag.armed=false;wEndDrag();}
  if(!can&&W.sd)W.sd=null;
  const want=can&&(W.hover||W.pin||!!W.drag)&&(!pd||W.pin)?1:0;
  W.vis+=(want-W.vis)*(1-Math.exp(-dt*(want>W.vis?7:5)));if(Math.abs(want-W.vis)<.003)W.vis=want;
  W.hintEl.classList.toggle('gone',!can||W.vis>.3);
  W.recycleEl.hidden=!can||W.vis<.8||(!Object.keys(W.worn).length&&!hpState.worn);
  if(!W.recycleEl.hidden)wRenderRecycle();
  wLayout();
  const open=ease.io2(clamp(W.vis,0,1));
  W.root.visible=W.vis>.002;
  W.root.position.set(lerp(L.hw+W.Wc/2+1.8,L.hw-W.Wc/2-.35,open),W.yc,0);
  /* the one orange moment: the rim lights up while a worn item is carried over the cabinet (let go and it is put away) */
  W.glow+=((W.drag&&W.drag.wasWorn&&W.drag.over?1:0)-W.glow)*(1-Math.exp(-dt*14));
  wMat.rim.opacity=.85*W.glow*(.85+.15*Math.sin(time*6));
  /* shelves: three items in view per shelf, evenly spread, slowly turning, each with a soft shadow on the ledge; the one under the pointer lifts a little.
     a shelf with more items scrolls (spring + drag, like the album shelf); items at the edges shrink away to show there is more */
  const per=W.PER,cell=W.cell;
  W.slots.forEach((sl,si)=>{
    const list=W.byslot[sl.id]||[],N=list.length,sc=wSc(sl.id),max=Math.max(0,N-per),scrolls=N>per,s=W.sd;
    if(scrolls){
      if(s&&s.slot===sl.id&&s.scrolling){const p0=sc.x;sc.x+=(s.t-sc.x)*(1-Math.exp(-dt*SH.follow));sc.v=lerp(sc.v,(sc.x-p0)/Math.max(dt,.001),1-Math.exp(-dt*25));}
      else{
        if(sc.wl&&performance.now()-sc.wt>SH.wheelIdle){const mv=sc.t-sc.wf;let r=Math.round(sc.t);if(r===Math.round(sc.wf)&&Math.abs(mv)>.12)r+=Math.sign(mv);sc.t=clamp(r,0,max);sc.wl=false;}
        const w=SH.spring,d=sc.x-sc.t,ex=Math.exp(-w*dt),c=sc.v+w*d;sc.x=sc.t+(d+c*dt)*ex;sc.v=(sc.v-w*c*dt)*ex;
        if(Math.abs(sc.x-sc.t)<.0005&&Math.abs(sc.v)<.01){sc.x=sc.t;sc.v=0;}
      }
      sc.x=clamp(sc.x,-.9,max+.9);
    }else{sc.x=sc.t=sc.v=0;}
    const th=W.thumbs[sl.id];if(th)th.m.position.x=th.x0+th.thl/2+(max?clamp(sc.x/max,0,1):0)*(th.tl-th.thl);
    const ledTop=wLedgeTop(si),tierTop=wTierTop(si),off=scrolls?1:(N-1)/2;
    list.forEach((it,i)=>{
      const x=(i-sc.x-off)*cell,k=scrolls?clamp((Math.abs(x)-cell*1.05)/(cell*.5),0,1):0,e=1-k*k*(3-2*k);
      const h=it.holder,sh=it.sh,vis=e>.01&&!it.away;
      h.visible=vis;if(sh)sh.visible=vis;it.inWindow=e>.45&&!it.away;
      it.hv+=(((W.hot===it.id||TOY.sel===it.id)?1:0)-it.hv)*(1-Math.exp(-dt*12));if(it.pop<1)it.pop=Math.min(1,it.pop+dt/.35);
      const pop=it.pop<1?(1-Math.pow(1-it.pop,3))*(1+.25*Math.sin(it.pop*Math.PI)):1;
      const r=(it.def.display&&it.def.display.rot)||sl.display.rot,size=Math.min(sl.display.size,cell*.85,W.rowH[si]-.35),
        yc=Math.max(ledTop+.2+size*.5,(ledTop+tierTop-.65)/2)+Math.sin(time*1.3+i*1.7)*.035;
      h.position.set(x,yc,.02);
      h.rotation.set(r[0],r[1]+Math.sin(time*.8+i*2.1)*(.3+.35*it.hv),r[2]);
      h.scale.setScalar(Math.max(.001,size/it.md*(1+.12*it.hv)*pop*e));
      if(sh&&vis){const g=Math.min(yc-size*.5-ledTop,.6),ss=size*(1.2-g*.25)*e*Math.max(.001,pop);sh.position.set(x,ledTop+.008,W.ledZ+.03);sh.scale.set(ss,1,ss*.55);}
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
  if(PET.on)PET.lastRender=performance.now();
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
    zoomed=!!near;rig.td=zoomed?L.d*.58:L.d;rig.tx=0;rig.ty=zoomed?BAY.y*.9:(PET.mini?FLOOR_Y+PET.miniUp:0);
  }
  const kc=1-Math.exp(-dt*3.4),kp=1-Math.exp(-dt*3);
  rig.x+=(rig.tx-rig.x)*kc;rig.y+=(rig.ty-rig.y)*kc;rig.d+=(rig.td-rig.d)*kc;rig.px+=(rig.ptx-rig.px)*kp;rig.py+=(rig.pty-rig.py)*kp;
  cam.position.set(rig.x+rig.px*.35,rig.y+rig.py*.22+rig.d*TILT_UP,rig.d);
  if(camShake>.003){cam.position.x+=(Math.random()-.5)*camShake*.3;cam.position.y+=(Math.random()-.5)*camShake*.3;camShake*=Math.exp(-dt*5);}
  cam.lookAt(rig.x,rig.y-rig.d*TILT_DN,0);cam.updateMatrixWorld();
  if(!PET.mini){   // mini desktop pet: no shelf, albums, player or physics to update
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
  }
  if(Au.alb&&Au.alb.yt&&(status==='playing'||status==='paused'))Au.elapsed=status==='paused'&&YTA.pausedAt!==null?YTA.pausedAt:YTA.time();else if(Au.playing)Au.elapsed+=dt;
  YTA.tick(dt);
  if(volT>0)volT-=dt;
  try{dogsFrame(dt,time);}catch(e){if(!dog.err){dog.err=1;console.warn('dog',e);}}
  try{wardFrame(dt,time);}catch(e){if(!W.err){W.err=1;console.warn('wardrobe',e);}}
  try{toyFrame(dt,time);}catch(e){if(!TOY.err){TOY.err=1;console.warn('toys',e);}}
  try{jobFrame(dt,time);}catch(e){if(!JOB.err){JOB.err=1;console.warn('job',e);}}
  if(PET.on)petFrame(dt,time);
  if(!PET.mini){drawDisplay();syncKeys();updateFx(dt,time);}
  renderer.render(scene,cam);
  if(dogOverlayRenderer&&dogAnyOn()&&tv.mode==='video'&&tv.pw>.02&&tv.b){
    if(!dog.overlayLights){scene.traverse(o=>{if(o.isLight)o.layers.enable(1);});dog.overlayLights=true;}
    dogOverlayCam.copy(cam);dogOverlayCam.layers.set(1);
    const bg=scene.background;scene.background=null;
    try{dogOverlayRenderer.render(scene,dogOverlayCam);PET.ovFrame=true;}
    catch(e){if(!dog.overlayError){dog.overlayError=true;console.warn('Dog foreground render failed',e);}dogOverlayRenderer.domElement.style.display='none';}
    finally{scene.background=bg;}
  }
  if(PET.on)petAfterRender();
  nextFrame();
}
tween(1.1,k=>{pOff.intro=lerp(-.9,0,k);},ease.out5);
