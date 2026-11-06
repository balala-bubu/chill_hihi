/* ---------- cafe background (remote button "BG", third state) ----------
   BG button: off -> meadow -> cafe -> off (the state machine is bgSet in 04-scenery.js; the grey wall/floor are drawn away by the same curtain).
   The room is models/cafe.json (from models/cafe/src/idr_cafe.dae, built by tools/build_cafe.py): a counter bar and a door at the back, a clock, a magazine rack and tables on the right.
   Room units are the original model units (a floor tile = 16, wall height 112); CF.s turns them into world units and CF.zb is the world z of the back wall,
   so the open floor in the middle is where the puppies and the cartoon friends walk (they stand at z = FLOOR_Z).
   "Covering the needed range": the carpet and the back wall are one big plane each (same texture density as the original), and the two side walls (with the windows) slide outwards
   as far as the window needs, so any window width / height is filled with room. Above the wall there is a plain band of the wall's top colour.
   The shop owner (a penguin, models/boss.json from models/boss/src/pge.dae) stands behind the counter: breathing, looking around, now and then waving a flipper.
   The clock hands show the real time. Everything is in one group (CF.g) far behind the action, so it never touches the physics world. */
const CF={s:.075,zb:-16,xo:0,k:1.4,bx:-122,bz:46,ready:false,job:null,g:new T.Group(),room:new T.Group(),side:[],E:0,hands:[],hk:'',t:0,boss:null,shadow:null};
CF.g.visible=false;CF.g.add(CF.room);scene.add(CF.g);
function cfGeo(m,pick){   // json mesh {p,u,i} -> BufferGeometry (pick: optional triangle filter)
  let I=m.i;if(pick){I=[];for(let t=0;t<m.i.length;t+=3){const a=m.i[t],b=m.i[t+1],c=m.i[t+2];if(pick((m.p[a*3]+m.p[b*3]+m.p[c*3])/3))I.push(a,b,c);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(m.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(m.u,2));g.setIndex(I);return g;}
async function cfBuild(){
  if(CF.ready)return;if(CF.job)return CF.job;
  CF.job=(async()=>{
    const fj=u=>fetch(u).then(r=>{if(!r.ok)throw new Error(u+' '+r.status);return r.json();});
    const [cj,bj]=await Promise.all([fj('models/cafe.json'),fj('models/boss.json')]);
    const ld=new T.TextureLoader();
    const tx=(u,rep)=>{const t=ld.load(u);t.colorSpace=T.SRGBColorSpace;t.magFilter=T.NearestFilter;t.minFilter=T.NearestMipmapLinearFilter;t.wrapS=t.wrapT=rep?T.RepeatWrapping:T.ClampToEdgeWrapping;t.anisotropy=4;return t;};   // pixel art: crisp when big, mip-mapped when far
    const base='models/cafe/',R=CF.room,T0={obj:tx(base+'obj.png'),obj2:tx(base+'obj2.png'),wall:tx(base+'wall.png',1),carpet:tx(base+'carpet.png',1),shadow:tx(base+'shadow.png'),win:tx(base+'sun_window.png')};
    const mb=(map,o)=>new T.MeshBasicMaterial(Object.assign({map,alphaTest:.4,side:T.DoubleSide,toneMapped:false},o||{}));
    const mats={obj:mb(T0.obj),obj2:mb(T0.obj2),wall:mb(T0.wall),
      shadow:mb(T0.shadow,{alphaTest:0,transparent:true,blending:T.MultiplyBlending,premultipliedAlpha:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),   // soft dark patches under the furniture (white = no change)
      win:mb(T0.win,{alphaTest:0,transparent:true,blending:T.AdditiveBlending,depthWrite:false})};   // sun shafts on the side walls (black = nothing)
    /* big carpet + back wall (original texture density: carpet 64 units per tile, wall 58.667 units per tile across / 112 high) */
    const W=1700,quad=(x0,x1,y0,y1,z0,z1,uv)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([x0,y0,z1,x1,y0,z1,x1,y1,z0,x0,y1,z0],3));
      g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex([0,1,2,0,2,3]);return g;};
    const carpetUV=(x,z)=>[(x+16)/64,(160-z)/64],cA=carpetUV(-W,640),cB=carpetUV(W,640),cC=carpetUV(W,0),cD=carpetUV(-W,0);
    const carpet=new T.Mesh(quad(-W,W,0,0,0,640,[cA[0],cA[1],cB[0],cB[1],cC[0],cC[1],cD[0],cD[1]]),mb(T0.carpet));carpet.renderOrder=-3;R.add(carpet);CF.carpet=carpet;
    const wu=x=>(x-176)/58.667,wall=new T.Mesh(quad(-W,W,0,112,0,0,[wu(-W),0,wu(W),0,wu(W),1,wu(-W),1]),mats.wall);wall.renderOrder=-3;R.add(wall);
    const top=new T.Mesh(quad(-W,W,112,900,0,0,[wu(-W),.995,wu(W),.995,wu(W),.995,wu(-W),.995]),mats.wall);top.position.z=-.01;top.renderOrder=-3;R.add(top);   // above the wall: its top band, stretched
    /* furniture, shadows */
    cj.meshes.forEach(m=>{
      if(m.mat==='obj'||m.mat==='obj2'){
        if(m.mat==='obj2'&&m.p.length===12){   // the clock's two hands: pivot at the clock centre so they can turn
          const P=m.p,ys=[P[1],P[4],P[7],P[10]],h=Math.max(...ys)-Math.min(...ys),px=32,py=69.5;
          const g=cfGeo(m);g.translate(-px,-py,0);const me=new T.Mesh(g,mats.obj2),gr=new T.Group();gr.position.set(px,py,P[2]);gr.add(me);R.add(gr);CF.hands.push({g:gr,h});return;}
        const me=new T.Mesh(cfGeo(m),mats[m.mat]);R.add(me);}
      else if(m.mat==='shadow'){const me=new T.Mesh(cfGeo(m),mats.shadow);me.renderOrder=-2;R.add(me);}
      else if(m.mat==='wall'||m.mat==='window'){   // the two side walls: left/right groups that slide outwards (CF.E)
        [-1,1].forEach(sg=>{const g=cfGeo(m,cx=>cx*sg>0);if(!g.index.count)return;const me=new T.Mesh(g,m.mat==='wall'?mats.wall:mats.win);if(m.mat==='window')me.renderOrder=-1;
          let gr=CF.side[sg<0?0:1];if(!gr){gr=CF.side[sg<0?0:1]=new T.Group();R.add(gr);}gr.add(me);});}});
    CF.hands.sort((a,b)=>a.h-b.h);   // 0 = hour hand (short), 1 = minute hand
    /* the owner: a skinned penguin (every vertex follows one bone) */
    const bt=n=>tx('models/boss/'+n+'.png',1),bm={body:mb(bt('body'),{alphaTest:.5,side:T.FrontSide}),eye:mb(bt('eye'),{alphaTest:.5,side:T.FrontSide}),cloth:mb(bt('cloth'),{alphaTest:.5,side:T.FrontSide})};
    Object.values(bm).forEach(m=>{m.map.minFilter=T.NearestFilter;m.map.generateMipmaps=false;});
    const bones=bj.bones.map(b=>{const o=new T.Bone();o.name=b.n;o.matrix.set(...b.m);o.matrix.decompose(o.position,o.quaternion,o.scale);return o;});
    bj.bones.forEach((b,i)=>{if(b.p>=0)bones[b.p].add(bones[i]);});
    const boss=new T.Group();boss.add(bones[0]);boss.updateMatrixWorld(true);const skel=new T.Skeleton(bones);
    bj.meshes.forEach(m=>{const g=new T.BufferGeometry(),n=m.s.length,si=new Uint16Array(n*4),sw=new Float32Array(n*4);m.s.forEach((b,i)=>{si[i*4]=b;sw[i*4]=1;});
      g.setAttribute('position',new T.Float32BufferAttribute(m.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(m.u,2));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));g.setIndex(m.i);
      const sm=new T.SkinnedMesh(g,bm[m.mat]);sm.frustumCulled=false;boss.add(sm);sm.bind(skel);});
    const bn={};bones.forEach(b=>{bn[b.name]=b;b.userData.q0=b.quaternion.clone();b.userData.p0=b.position.y;});
    CF.boss={g:boss,bn,ph:Math.random()*10,wave:0,next:3+Math.random()*4,look:0,lt:0,q:new T.Quaternion(),e:new T.Euler()};
    boss.scale.setScalar(CF.k);boss.position.set(CF.bx,0,CF.bz);R.add(boss);
    /* the player's shadow falls on the carpet: an invisible plane that only shows shadows */
    const sh=new T.Mesh(new T.PlaneGeometry(120,50),new T.ShadowMaterial({opacity:.22}));sh.rotation.x=-Math.PI/2;sh.receiveShadow=true;sh.renderOrder=-1;CF.g.add(sh);CF.shadow=sh;
    bgLitInit();cfLayout(true);CF.ready=true;
  })().catch(e=>{console.warn('cafe failed to load',e);CF.failed=true;CF.job=null;});
  return CF.job;
}
/* place the room: floor level, depth, and how far the side walls must slide out to fill the window */
function cfLayout(force){
  if(!CF.room.children.length)return;const hk=Math.round(L.hw*10)+'|'+Math.round(FLOOR_Y*10)+'|'+Math.round(L.d*10);if(!force&&hk===CF.hk)return;CF.hk=hk;
  const hwBack=L.hw*(L.d-CF.zb)/L.d,need=hwBack/CF.s+24;   // half of the window's width at the back wall, in room units, plus a margin
  CF.E=Math.max(0,need-176);CF.side.forEach((gr,i)=>{gr.position.x=(i?1:-1)*CF.E;});
  CF.room.scale.setScalar(CF.s);CF.room.position.set(CF.xo,FLOOR_Y-.02,CF.zb);
  if(CF.shadow)CF.shadow.position.set(0,FLOOR_Y-.01,FLOOR_Z);
}
const _cfQ=new T.Quaternion(),_cfE=new T.Euler();
function cfRot(b,x,y,z){_cfE.set(x,y,z);b.quaternion.copy(b.userData.q0).multiply(_cfQ.setFromEuler(_cfE));}
function cfFrame(dt,time){
  cfLayout(false);
  const B=CF.boss;if(B&&B.g.visible){
    const t=time+B.ph,bn=B.bn;
    if(time>B.next){B.wave=1;B.next=time+7+Math.random()*7;B.wt=time;}   // now and then: a wave with the right flipper
    const w=B.wave?clamp(Math.sin(Math.min(1,(time-B.wt)/2.6)*Math.PI)*1.6,0,1):0;if(B.wave&&time-B.wt>2.6)B.wave=0;
    const arm=1.05;   // flippers rest hanging down (the model is in a T-pose)
    cfRot(bn.Larm1,0,0,-(arm+Math.sin(t*1.3)*.05));cfRot(bn.Rarm1,0,0,(arm+Math.sin(t*1.3+1)*.05)*(1-w)-w*.45);
    cfRot(bn.Rarm2,0,0,w*Math.sin(time*9)*.35);
    cfRot(bn.chest,0,Math.sin(t*.35)*.05,Math.sin(t*1.6)*.015);   // breathing + a slight turn
    cfRot(bn.head,Math.sin(t*.5)*.05,Math.sin(t*.42)*.55*Math.max(0,Math.sin(t*.17)),Math.sin(t*.31)*.04);   // looks around every now and then
    bn.base.position.y=bn.base.userData.p0+Math.sin(t*1.6)*.18;
    cfRot(bn.tail1,0,Math.sin(t*2)*.12,0);
  }
  if(CF.hands.length===2){const d=new Date(),mi=d.getMinutes()+d.getSeconds()/60,hr=(d.getHours()%12)+mi/60;CF.hands[0].g.rotation.z=-hr/12*TAU;CF.hands[1].g.rotation.z=-mi/60*TAU;}
}
window.__cf={CF,cfBuild,cfLayout};   // test hook
