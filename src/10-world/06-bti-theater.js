/* ---------- theater background (remote button "BG", mode 5) ----------
   Fifth background after the meadow (04-scenery.js), the cafe (05-cafe.js), the museum (06-museum.js) and the moon (06-moon.js); the state machine is bgSet in 04-scenery.js.
   The stage is models/bti.json (from models/bti/src/bti_04.dae, built by tools/build_bti.py, textures models/bti/*.png): a small theater stage with red curtains and gold trim,
   a gold proscenium frame, hanging stage lights, a row of foot lights along the front edge and a couple of rows of red seats. Everything keeps the model's baked vertex-colour lighting.
   Model units are the original ones (stage x -35..35, floor y = 0, back wall z = -10.5, proscenium frame z = 9.5..10, audience floor y = -5, seats z 12.7 ...).
   The room is scaled (BT.s) so the frame opening is about as wide as the window at the stage's front edge (world z = BT.front, behind the player), then tipped back by BT.pitch about the point
   where the player stands, exactly like the museum, so the audience floor (dark red carpet, drawn here) continues into the player's floor. The player and the dogs stand in the "audience",
   in front of the stage; the stage is raised behind them. Outside the frame everything is black (like the original's mask), so any window shape is filled.
   The foot lights run a chase and the stage lights' glows breathe a little. While the grey cloth is drawn up / down, the stage shows only BELOW the cloth's edge (same hook as the museum),
   so the parts standing in front of the grey wall never poke through it. */
const BT={s:.3,front:-3,fit:.96,hfit:30,tint:0x88827c,pitch:.1,keep:3,ready:false,job:null,g:new T.Group(),room:new T.Group(),inner:new T.Group(),hk:'',shadow:null,den:null,glow:null,chairs:[],ph:0,t:0,V:[0,.4,.7],vi:null};
BT.g.visible=false;BT.inner.position.set(0,5,-10);BT.room.add(BT.inner);BT.g.add(BT.room);scene.add(BT.g);   // inner: the audience floor (y -5) and the stage's front edge (z 10) become the room's origin
async function btBuild(){
  if(BT.ready)return;if(BT.job)return BT.job;
  BT.job=(async()=>{
    const mj=await fetch('models/bti.json').then(r=>{if(!r.ok)throw new Error('bti '+r.status);return r.json();});
    const ld=new T.TextureLoader(),R=BT.inner,TX={};
    const tx=n=>{if(TX[n])return TX[n];const t=ld.load('models/bti/'+n+'.png');t.colorSpace=T.SRGBColorSpace;t.magFilter=T.NearestFilter;t.minFilter=T.NearestMipmapLinearFilter;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return TX[n]=t;};   // pixel art: crisp when big, mip-mapped when far
    const mb=(map,o)=>{const m=new T.MeshBasicMaterial(Object.assign({map,alphaTest:.4,side:T.DoubleSide,toneMapped:false},o||{}));
      m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,BG.cu);
        sh.fragmentShader=sh.fragmentShader.replace('void main() {','uniform float uK,uT,uFold;uniform vec2 uRes;\nvoid main() {')
          .replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nfloat cuX=gl_FragCoord.x/uRes.x,cuY=gl_FragCoord.y/uRes.y;\nfloat cuHem=uK+(sin(cuX*9.0+uT*1.2)*.016+sin(cuX*23.0-uT*.9)*.007+sin(cuX*3.1+uT*.5)*.02)*uFold;\nif(cuY>=cuHem)discard;');};
      m.customProgramCacheKey=()=>'btcurtain';return m;};
    const tint=new T.Color(BT.tint);   // the stage is a little too bright next to the player: a gentle warm multiply
    const geo=m=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(m.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(m.u,2));
      if(m.c)g.setAttribute('color',new T.Float32BufferAttribute(m.c,4));g.setIndex(m.i);return g;};
    mj.meshes.forEach(m=>{
      const g=geo(m);let mat;
      if(m.tex==='light')mat=mb(tx('light'),{vertexColors:true,alphaTest:0,transparent:true,blending:T.AdditiveBlending,depthWrite:false});   // glow discs on the stage lights
      else if(m.tr)mat=mb(m.tex==='none'?null:tx(m.tex),{vertexColors:true,color:tint,alphaTest:0,transparent:true,depthWrite:false});            // soft shadows / half-transparent bits (vertex alpha)
      else mat=mb(m.tex==='none'?null:tx(m.tex),{vertexColors:true,color:tint});
      const me=new T.Mesh(g,mat);
      if(m.tex==='light'){me.renderOrder=3;BT.glow=mat;}
      else if(m.tr)me.renderOrder=2;
      if(m.tex==='isu'){me.userData.z=m.p[2];BT.chairs.push(me);}
      if(m.tex==='denki'){BT.den=me;const uv=g.attributes.uv;BT.vi=new Uint8Array(uv.count);for(let i=0;i<uv.count;i++){const v=uv.getY(i);BT.vi[i]=Math.abs(v-.4)<.15?1:v>.55?2:0;}}
      R.add(me);});
    BT.chairs.sort((a,b)=>a.userData.z-b.userData.z);   // nearest to the stage first
    /* continuations: black around the frame (the original's mask), the black wall above, and the dark red carpet of the audience floor towards the camera */
    const W=3000,quad=(x0,x1,y0,y1,z0,z1,uv)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([x0,y0,z1,x1,y0,z1,x1,y1,z0,x0,y1,z0],3));
      g.setAttribute('uv',new T.Float32BufferAttribute(uv||[0,0,1,0,1,1,0,1],2));g.setIndex([0,1,2,0,2,3]);return g;};
    const bm=mb(null,{color:0x000000,alphaTest:0});
    [[35.3,W,-5,40],[-W,-35.3,-5,40],[-W,W,25,3000]].forEach(([x0,x1,y0,y1])=>{const me=new T.Mesh(quad(x0,x1,y0,y1,9.35,9.35),bm);R.add(me);});
    const cu=x=>x*.1413,cv=z=>5.1-z*.132;   // the original carpet's texture density (bti_kyaku_yuka)
    const carpet=new T.Mesh(quad(-W,W,-5,-5,8,700,[cu(-W),cv(700),cu(W),cv(700),cu(W),cv(8),cu(-W),cv(8)]),mb(tx('katen'),{color:0x5a5a5a,alphaTest:0}));   // a plane facing up: its far edge is the stage front (z 10)
    carpet.renderOrder=-1;R.add(carpet);
    /* the player's shadow falls on the floor: an invisible plane that only shows shadows */
    const sh=new T.Mesh(new T.PlaneGeometry(120,50),new T.ShadowMaterial({opacity:.28}));sh.rotation.x=-Math.PI/2;sh.receiveShadow=true;sh.renderOrder=-1;BT.g.add(sh);BT.shadow=sh;
    bgLitInit();btLayout(true);BT.ready=true;
  })().catch(e=>{console.warn('theater failed to load',e);BT.failed=true;BT.job=null;});
  return BT.job;
}
/* place the room: the frame opening is as wide as the window at the stage's front (but the whole stage also has to fit the window height); the audience floor sits on FLOOR_Y */
function btLayout(force){
  if(!BT.inner.children.length)return;const hk=Math.round(L.hw*10)+'|'+Math.round(FLOOR_Y*10)+'|'+Math.round(L.d*10);if(!force&&hk===BT.hk)return;BT.hk=hk;
  const Wf=2*L.hw*(L.d-BT.front)/L.d,sW=BT.fit*Wf/61,sH=(bgY(BT.front,1)-FLOOR_Y)*.97/BT.hfit;   // 61 = width of the frame opening, BT.hfit = model height (above the audience floor) that has to fit the window: the frame's top (34) may be cut off a little
  BT.s=Math.min(sW,sH);BT.room.scale.setScalar(BT.s);BT.room.rotation.x=BT.pitch;
  {const dy=-.02,dz=BT.front-FLOOR_Z,c=Math.cos(BT.pitch),sn=Math.sin(BT.pitch);   // tip the room about the point on the floor where the player stands (same as the museum)
    BT.room.position.set(0,FLOOR_Y+dy*c-dz*sn,FLOOR_Z+dy*sn+dz*c);}
  BT.chairs.forEach((m,i)=>{m.visible=i<BT.keep;});
  if(BT.shadow)BT.shadow.position.set(0,FLOOR_Y-.01,FLOOR_Z);
}
function btFrame(dt,time){
  btLayout(false);
  BT.t+=dt;if(BT.den&&BT.t>.24){BT.t=0;BT.ph=(BT.ph+1)%3;const a=BT.den.geometry.attributes.uv;for(let i=0;i<a.count;i++)a.setY(i,BT.V[(BT.vi[i]+BT.ph)%3]);a.needsUpdate=true;}   // foot lights: a three-step chase
  if(BT.glow)BT.glow.opacity=.82+.14*Math.sin(time*1.3);
}
window.__bt={BT,btBuild,btLayout};   // test hook
