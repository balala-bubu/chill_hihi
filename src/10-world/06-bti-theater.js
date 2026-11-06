/* ---------- theater background (remote button "BG", mode 5) ----------
   Fifth background after the meadow (04-scenery.js), the cafe (05-cafe.js), the museum (06-museum.js) and the moon (06-moon.js); the state machine is bgSet in 04-scenery.js.
   The stage is models/bti.json (from models/bti/src/bti_04.dae, built by tools/build_bti.py, textures models/bti/*.png): a small theater stage with red curtains and gold trim,
   a gold proscenium frame, hanging stage lights, a row of foot lights along the front edge and a couple of rows of red seats. Everything keeps the model's baked vertex-colour lighting.
   Model units are the original ones (stage x -35..35, floor y = 0, back wall z = -10.5, proscenium frame z = 9.5..10, audience floor y = -5, seats z 12.7 ...).
   The room is scaled (BT.s) so the frame opening is about as wide as the window at the stage's front edge (world z = BT.front, behind the player), then tipped back by BT.pitch about the point
   where the player stands, exactly like the museum, so the audience floor (dark red carpet, drawn here) continues into the player's floor. The player and the dogs stand in the "audience",
   in front of the stage; the stage is raised behind them. Outside the frame everything is black (like the original's mask), so any window shape is filled.
   The foot lights run a chase and the stage lights' glows breathe a little. While the grey cloth is drawn up / down, the stage shows only BELOW the cloth's edge (same hook as the museum),
   so the parts standing in front of the grey wall never poke through it.
   VIDEO: while a YouTube album plays (and no TV is showing it) the stage's back wall becomes a 16:9 screen. The video box is a DOM element BEHIND the canvas (ytBehind in 04-homography.js);
   BT.screen is a plane with a "punch" material (no blending, alpha 0) that cuts a depth-tested hole in the canvas, so the curtains, frame, seats, player and dogs all stay in front of the picture.
   A vignette quad, a black fade quad (projector warm-up) and a soft floor spill sit just in front of the hole; all of them are ordinary transparent meshes drawn over the video.
   LIGHT: every stage material runs btGrade (a position-based grade: warm key pool at centre stage, cool dark edges, the audience falling off with distance, warm spill on the front rows), plus
   additive light cones with floor pools from the six stage lights (a slow sway), drifting dust motes and a gentle flicker. */
const BT={s:.3,front:-3,fit:.96,hfit:30,tint:0x88827c,pitch:.1,keep:3,ready:false,job:null,g:new T.Group(),room:new T.Group(),inner:new T.Group(),hk:'',shadow:null,den:null,glow:null,chairs:[],ph:0,t:0,V:[0,.4,.7],vi:null,scr:{x:0,y:14.2,w:38,h:21.4,z:-10.3},cu:{uLt:{value:1}},vf:0,vv:0,vx:.36,vs:.22,beams:[],motes:null,spill:null,force:false};
BT.g.visible=false;BT.inner.position.set(0,5,-10);BT.room.add(BT.inner);BT.g.add(BT.room);scene.add(BT.g);   // inner: the audience floor (y -5) and the stage's front edge (z 10) become the room's origin
/* position-based light grade, applied to every stage material (p = room-local model units: stage x +-35, floor y 0, back wall z -10.5, front edge z 10, audience z > 10) */
const _btD=new T.Vector3(),_btDn=new T.Vector3(0,-1,0);
const BT_GRADE=`vec3 btGrade(vec3 c,vec3 p){
  vec3 q=(p-vec3(0.,7.,-2.))/vec3(36.,18.,26.);
  float pool=1.-smoothstep(.05,1.15,length(q));                                    // the key light on centre stage
  float far=smoothstep(10.,70.,p.z);                                            // the audience hall darkens away from the stage
  float top=smoothstep(13.,29.,p.y)*step(-4.,p.y)*step(p.z,10.5);               // the flies and the top of the frame
  float spill=exp(-max(p.z-10.,0.)*.07)*(1.-smoothstep(6.,46.,abs(p.x)))*smoothstep(9.,11.,p.z);   // warm light spilling over the first rows
  vec3 g=mix(vec3(.66,.72,.86),vec3(1.14,1.01,.84),pool);
  g*=1.-.5*far;g*=1.-.34*top;g*=1.+spill*vec3(.6,.36,.16);
  return c*g*uLt;}
`;
async function btBuild(){
  if(BT.ready)return;if(BT.job)return BT.job;
  BT.job=(async()=>{
    const mj=await fetch('models/bti.json').then(r=>{if(!r.ok)throw new Error('bti '+r.status);return r.json();});
    const ld=new T.TextureLoader(),R=BT.inner,TX={};
    const tx=n=>{if(TX[n])return TX[n];const t=ld.load('models/bti/'+n+'.png');t.colorSpace=T.SRGBColorSpace;t.magFilter=T.NearestFilter;t.minFilter=T.NearestMipmapLinearFilter;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return TX[n]=t;};   // pixel art: crisp when big, mip-mapped when far
    const mb=(map,o,grade)=>{const m=new T.MeshBasicMaterial(Object.assign({map,alphaTest:.4,side:T.DoubleSide,toneMapped:false},o||{}));
      m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,BG.cu,BT.cu);
        sh.fragmentShader=sh.fragmentShader.replace('void main() {','uniform float uK,uT,uFold,uLt;uniform vec2 uRes;varying vec3 vBtP;\n'+BT_GRADE+'void main() {')
          .replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nfloat cuX=gl_FragCoord.x/uRes.x,cuY=gl_FragCoord.y/uRes.y;\nfloat cuHem=uK+(sin(cuX*9.0+uT*1.2)*.016+sin(cuX*23.0-uT*.9)*.007+sin(cuX*3.1+uT*.5)*.02)*uFold;\nif(cuY>=cuHem)discard;')
          .replace('#include <color_fragment>','#include <color_fragment>\n'+(grade?'diffuseColor.rgb=btGrade(diffuseColor.rgb,vBtP);':''));
        sh.vertexShader=sh.vertexShader.replace('void main() {','varying vec3 vBtP;\nvoid main() {').replace('#include <begin_vertex>','#include <begin_vertex>\nvBtP=position;');};
      m.customProgramCacheKey=()=>'btcurtain'+(grade?'g':'');return m;};
    const tint=new T.Color(BT.tint);   // the stage is a little too bright next to the player: a gentle warm multiply
    const geo=m=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(m.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(m.u,2));
      if(m.c)g.setAttribute('color',new T.Float32BufferAttribute(m.c,4));g.setIndex(m.i);return g;};
    mj.meshes.forEach(m=>{
      const g=geo(m);let mat;
      if(m.tex==='light')mat=mb(tx('light'),{vertexColors:true,alphaTest:0,transparent:true,blending:T.AdditiveBlending,depthWrite:false},false);   // glow discs on the stage lights
      else if(m.tr)mat=mb(m.tex==='none'?null:tx(m.tex),{vertexColors:true,color:tint,alphaTest:0,transparent:true,depthWrite:false},true);            // soft shadows / half-transparent bits (vertex alpha)
      else mat=mb(m.tex==='none'?null:tx(m.tex),{vertexColors:true,color:tint},true);
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
    const carpet=new T.Mesh(quad(-W,W,-5,-5,8,700,[cu(-W),cv(700),cu(W),cv(700),cu(W),cv(8),cu(-W),cv(8)]),mb(tx('katen'),{color:0x5a5a5a,alphaTest:0},true));   // a plane facing up: its far edge is the stage front (z 10)
    carpet.renderOrder=-1;R.add(carpet);
    /* the player's shadow falls on the floor: an invisible plane that only shows shadows */
    const sh=new T.Mesh(new T.PlaneGeometry(120,50),new T.ShadowMaterial({opacity:.28}));sh.rotation.x=-Math.PI/2;sh.receiveShadow=true;sh.renderOrder=-1;BT.g.add(sh);BT.shadow=sh;
    /* the stage screen (video) -- all hidden until a video plays */
    {const sc=BT.scr,qm=(w,h,mat,z,ro)=>{const me=new T.Mesh(new T.PlaneGeometry(1,1),mat);me.scale.set(w,h,1);me.position.set(sc.x,sc.y,z);if(ro)me.renderOrder=ro;me.visible=false;R.add(me);return me;};
      const vg=document.createElement('canvas');vg.width=256;vg.height=144;{const x=vg.getContext('2d'),g=x.createRadialGradient(128,72,40,128,72,150);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.62,'rgba(0,0,0,.18)');g.addColorStop(1,'rgba(0,0,0,.7)');x.fillStyle=g;x.fillRect(0,0,256,144);
        const t=x.createLinearGradient(0,0,0,144);t.addColorStop(0,'rgba(10,6,4,.45)');t.addColorStop(.3,'rgba(10,6,4,0)');t.addColorStop(.85,'rgba(10,6,4,0)');t.addColorStop(1,'rgba(10,6,4,.3)');x.fillStyle=t;x.fillRect(0,0,256,144);}
      const vt=new T.CanvasTexture(vg);vt.colorSpace=T.SRGBColorSpace;
      BT.back=qm(sc.w+1.5,sc.h+1.5,mb(null,{color:0x060607,alphaTest:0}),sc.z-.06);                                            // dark bezel around the picture
      BT.screen=qm(sc.w,sc.h,mb(null,{color:0x000000,opacity:0,blending:T.NoBlending,transparent:false,alphaTest:0}),sc.z);    // the hole
      BT.shade=qm(sc.w,sc.h,mb(vt,{transparent:true,depthWrite:false,alphaTest:0}),sc.z+.04,4);                              // vignette over the picture
      BT.fade=qm(sc.w,sc.h,mb(null,{color:0x000000,transparent:true,opacity:1,depthWrite:false,alphaTest:0}),sc.z+.06,5);    // projector warm-up
      const sg=document.createElement('canvas');sg.width=sg.height=128;{const x=sg.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(190,215,255,.85)');g.addColorStop(.5,'rgba(150,180,255,.3)');g.addColorStop(1,'rgba(120,150,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);}
      const st=new T.CanvasTexture(sg);st.colorSpace=T.SRGBColorSpace;
      BT.spill=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:st,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));
      BT.spill.rotation.x=-Math.PI/2;BT.spill.scale.set(54,20,1);BT.spill.position.set(0,.07,-3);BT.spill.renderOrder=3;BT.spill.visible=false;R.add(BT.spill);}
    /* light cones from the six stage lights, a warm pool where each lands, and dust motes drifting through them */
    {const pg=document.createElement('canvas');pg.width=pg.height=128;{const x=pg.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,214,150,.9)');g.addColorStop(.45,'rgba(255,190,120,.35)');g.addColorStop(1,'rgba(255,170,100,0)');x.fillStyle=g;x.fillRect(0,0,128,128);}
      const pt=new T.CanvasTexture(pg);pt.colorSpace=T.SRGBColorSpace;
      const cone=new T.CylinderGeometry(.5,5.2,20,24,1,true);cone.translate(0,-10,0);
      {const pos=cone.attributes.position,col=new Float32Array(pos.count*4);for(let i=0;i<pos.count;i++){const k=1-(-pos.getY(i)/20);col.set([1,.84,.58,.2*k*k],i*4);}cone.setAttribute('color',new T.BufferAttribute(col,4));}
      [[-20,-9],[-10,-5],[-3.5,-2],[3.5,-2],[10,-5],[20,-9]].forEach(([x,tx],i)=>{
        const bm=new T.MeshBasicMaterial({vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false});
        const me=new T.Mesh(cone,bm);me.position.set(x,20.3,0);me.renderOrder=3;R.add(me);
        const pool=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:pt,transparent:true,opacity:.5,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));
        pool.rotation.x=-Math.PI/2;pool.scale.set(11,7,1);pool.renderOrder=3;R.add(pool);
        BT.beams.push({me,pool,x,tx,ph:i*1.7,bm,pm:pool.material});});
      const N=70,mp=new Float32Array(N*3),mv=new Float32Array(N*2);for(let i=0;i<N;i++){mp.set([(Math.random()-.5)*46,3+Math.random()*17,-8+Math.random()*14],i*3);mv.set([(Math.random()-.5)*.5,.25+Math.random()*.5],i*2);}
      const dg=new T.BufferGeometry();dg.setAttribute('position',new T.BufferAttribute(mp,3));
      const dc=document.createElement('canvas');dc.width=dc.height=32;{const x=dc.getContext('2d'),g=x.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'rgba(255,236,200,1)');g.addColorStop(1,'rgba(255,220,170,0)');x.fillStyle=g;x.fillRect(0,0,32,32);}
      const dm=new T.Points(dg,new T.PointsMaterial({map:new T.CanvasTexture(dc),size:.5,transparent:true,opacity:.55,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));
      dm.renderOrder=3;dm.userData.v=mv;R.add(dm);BT.motes=dm;}
    bgLitInit();btLayout(true);BT.ready=true;
  })().catch(e=>{console.warn('theater failed to load',e);BT.failed=true;BT.job=null;});
  return BT.job;
}
/* place the room: the frame opening is as wide as the window at the stage's front (but the whole stage also has to fit the window height); the audience floor sits on FLOOR_Y */
function btLayout(force){
  if(!BT.inner.children.length)return;const hk=Math.round(L.hw*10)+'|'+Math.round(FLOOR_Y*10)+'|'+Math.round(L.d*10)+'|'+Math.round(BT.vv*80);if(!force&&hk===BT.hk)return;BT.hk=hk;
  const Wf=2*L.hw*(L.d-BT.front)/L.d,sW=BT.fit*Wf/61,sH=(bgY(BT.front,1)-FLOOR_Y)*.97/BT.hfit;   // 61 = width of the frame opening, BT.hfit = model height (above the audience floor) that has to fit the window: the frame's top (34) may be cut off a little
  BT.s=Math.min(sW,sH)*(1+BT.vs*BT.vv);BT.room.scale.setScalar(BT.s);   // video view (BT.vv 0..1): the room grows a little and slides to the left, so the screen is not hidden behind the player in the middleBT.room.rotation.x=BT.pitch;
  {const dy=-.02,dz=BT.front-FLOOR_Z,c=Math.cos(BT.pitch),sn=Math.sin(BT.pitch);   // tip the room about the point on the floor where the player stands (same as the museum)
    BT.room.position.set(-L.hw*BT.vx*BT.vv,FLOOR_Y+dy*c-dz*sn,FLOOR_Z+dy*sn+dz*c);}
  BT.chairs.forEach((m,i)=>{m.visible=i<BT.keep;});
  if(BT.shadow)BT.shadow.position.set(0,FLOOR_Y-.01,FLOOR_Z);
}
/* called every frame from the sync loop: puts the video box behind the stage screen while a video plays; returns false when there is no video to show here */
function btVideoFrame(){
  const on=!!(BT.ready&&BT.g.visible&&(BT.force||ytVideoNow()));
  if(BT.screen){BT.screen.visible=BT.back.visible=BT.shade.visible=BT.fade.visible=BT.spill.visible=on;}
  if(!on)return false;
  BT.screen.updateWorldMatrix(true,false);
  const P=[[-.5,.5],[.5,.5],[.5,-.5],[-.5,-.5]].map(([x,y])=>{_tmpA.set(x,y,0).applyMatrix4(BT.screen.matrixWorld).project(cam);return [(_tmpA.x+1)/2*innerWidth,(1-_tmpA.y)/2*innerHeight];});
  ytBehind(true);ytPlace(P);if(dogOverlayRenderer)dogOverlayRenderer.domElement.style.display='none';
  return true;
}
function btFrame(dt,time){
  {const want=BT.screen&&BT.screen.visible?1:0;BT.vv+=(want-BT.vv)*Math.min(1,dt*2.4);if(Math.abs(want-BT.vv)<.004)BT.vv=want;}
  btLayout(false);
  BT.cu.uLt.value=1+.022*Math.sin(time*1.7)+.012*Math.sin(time*5.3+1);
  {const on=BT.screen&&BT.screen.visible;BT.vf+=((on?1:0)-BT.vf)*Math.min(1,dt*3);
    if(BT.fade){BT.fade.material.opacity=Math.max(0,1-BT.vf*1.08);BT.spill.material.opacity=.3*BT.vf*(.9+.1*Math.sin(time*2.3));}
    BT.beams.forEach(b=>{const sw=Math.sin(time*.45+b.ph)*3.2,tx=b.tx+sw,tz=-4+Math.cos(time*.37+b.ph)*3;_btD.set(tx-b.x,-20.3,tz).normalize();b.me.quaternion.setFromUnitVectors(_btDn,_btD);
      b.me.scale.y=Math.min(1.25,20.3/(-_btD.y)/20);b.pool.position.set(tx,.07,tz);b.bm.opacity=.9-.55*BT.vf;b.pm.opacity=.5-.22*BT.vf;});
    if(BT.motes){const a=BT.motes.geometry.attributes.position,v=BT.motes.userData.v;for(let i=0;i<a.count;i++){let y=a.getY(i)+v[i*2+1]*dt,x=a.getX(i)+Math.sin(time*.3+i)*.2*dt+v[i*2]*dt;if(y>20)y=2;a.setXYZ(i,x,y,a.getZ(i));}a.needsUpdate=true;}}
  BT.t+=dt;if(BT.den&&BT.t>.24){BT.t=0;BT.ph=(BT.ph+1)%3;const a=BT.den.geometry.attributes.uv;for(let i=0;i<a.count;i++)a.setY(i,BT.V[(BT.vi[i]+BT.ph)%3]);a.needsUpdate=true;}   // foot lights: a three-step chase
  if(BT.glow)BT.glow.opacity=.82+.14*Math.sin(time*1.3);
}
window.__bt={BT,btBuild,btLayout,btVideoFrame};   // test hook
