/* ---------- fireplace living room background (remote button "BG", mode 6) ----------
   An evening living room: a crackling fireplace on the left, a sofa under a night window (snow falling, big moon) on the right, a warm rug in front, lamp and bookshelf at the walls.
   Pieces:
   - models/fireplace.json (tools/build_fireplace.py): `living` = the furniture of the Disney Magical World 2 "Lilo & Stitch" living room (sofa, lamp table, shelf, books, rug, flower table ...,
     the textured meshes of models/fireplace/*.png; only the strip against the back wall is used), `fire` = the Gone Home fireplace (fire.png, 1196 triangles, 0.06 wide).
   - the back wall (wood panels), the wood floor, the skirting board, the window (frame + night picture + falling snow + curtains) and the painting over the mantel are made here;
   - the fire: flame sprites (additive, swaying), a log sprite, sparks that rise, a glow on the hearth, a flickering warm light;
   - every material goes through fpGrade: it dims everything to a blue dusk and adds the fire's warm light (flickering) and the window's cool moonlight by world position, so the room is
     lit from the fireplace and the puppies / the player stand out against it. The scene lighting is warmed in bgApply (04-scenery.js).
   Room units: the original model units (a sofa is 3.3 wide); FP.s turns them into world units, FP.zb is the world z of the back wall; the room group sits on FLOOR_Y.
   All of it is far behind the action in one group (FP.g); the back wall and the floor are huge so any window shape is filled. */
const FP={rx:4.6,s:1.6,zb:-12,xo:-.9,ready:false,job:null,g:new T.Group(),room:new T.Group(),hk:'',fireX:-2.5,fireK:55.7,fdx:0,r2:null,rf:null,flames:[],sparks:[],snow:[],glow:null,hearth:null,floor:null,shadow:null,win:{x:2.05,y:3.45,w:2.9,h:2.7},
  u:{uFire:{value:new T.Vector3()},uWin:{value:new T.Vector3()},uT:{value:0}}};
FP.g.visible=false;FP.g.add(FP.room);scene.add(FP.g);
function fpGrade(mat,k){   // dusk + fire light + moonlight, by world position (k: how strongly the fire lights it)
  mat.onBeforeCompile=sh=>{sh.uniforms.uFire=FP.u.uFire;sh.uniforms.uWin=FP.u.uWin;sh.uniforms.uT=FP.u.uT;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vFP;').replace('#include <begin_vertex>','#include <begin_vertex>\nvFP=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vFP;uniform vec3 uFire;uniform vec3 uWin;uniform float uT;')
      .replace('#include <tonemapping_fragment>',`
      vec3 fd=vFP-uFire;float fr=length(vec3(fd.x*.78,fd.y*1.05,fd.z*.5));
      float fl=.9+.07*sin(uT*8.1)+.05*sin(uT*13.7+1.3)+.03*sin(uT*23.0+.4);
      float fg=exp(-fr*fr/${(26).toFixed(1)})*fl;
      vec3 wd=vFP-uWin;float wr=length(vec3(wd.x*.7,wd.y*.85,wd.z*.6));float wg=exp(-wr*wr/46.);
      vec3 base=vec3(.17,.145,.25);vec3 c=gl_FragColor.rgb;
      c=c*base+c*vec3(1.7,.72,.22)*fg*1.25+c*vec3(.14,.22,.55)*wg*.6;
      c*=1.-.3*smoothstep(8.,22.,vFP.y-uFire.y);
      gl_FragColor.rgb=c;
      #include <tonemapping_fragment>`);};
  return mat;}
const fpImg=u=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error(u));i.src=u;});
function fpFlameTex(){return mkTex(128,256,(x,w,h)=>{   // a teardrop flame: red outside, orange, yellow, white-hot core
  const g=x.createRadialGradient(w/2,h*.74,2,w/2,h*.7,h*.5);g.addColorStop(0,'rgba(255,250,210,1)');g.addColorStop(.22,'rgba(255,205,90,.95)');g.addColorStop(.5,'rgba(255,120,30,.75)');g.addColorStop(.8,'rgba(200,40,10,.25)');g.addColorStop(1,'rgba(160,20,0,0)');
  x.save();x.translate(w/2,h*.72);x.scale(.62,1.3);x.translate(-w/2,-h*.72);x.fillStyle=g;x.beginPath();x.moveTo(w/2,h*.02);x.bezierCurveTo(w*.95,h*.35,w*.98,h*.62,w*.7,h*.86);x.lineTo(w*.3,h*.86);x.bezierCurveTo(w*.02,h*.62,w*.05,h*.35,w/2,h*.02);x.fill();x.restore();});}
function fpLogTex(){return mkTex(256,64,(x,w,h)=>{   // two logs in front, glowing at the cracks
  const log=(cx,cy,len,a,col)=>{x.save();x.translate(cx,cy);x.rotate(a);let g=x.createLinearGradient(0,-12,0,12);g.addColorStop(0,'#5b3a22');g.addColorStop(.5,col);g.addColorStop(1,'#2a160a');x.fillStyle=g;
    x.beginPath();x.roundRect(-len/2,-11,len,22,10);x.fill();x.strokeStyle='rgba(255,140,40,.7)';x.lineWidth=2;for(let i=-3;i<=3;i++){x.beginPath();x.moveTo(i*len/8-4,-6);x.lineTo(i*len/8+3,5);x.stroke();}
    x.fillStyle='#ffb04a';x.beginPath();x.ellipse(len/2-3,0,5,9,0,0,TAU);x.fill();x.restore();};
  log(80,40,150,.1,'#7a4a28');log(176,40,150,-.12,'#6a3e20');});}
function fpWallTex(img){const t=new T.Texture(img);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;t.needsUpdate=true;return t;}
function fpWindowTex(){return mkTex(512,512,(x,w,h)=>{   // the night outside: deep blue sky, stars, a big moon, snowy pines and a snowfield
  let g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#0d1636');g.addColorStop(.55,'#2a3a72');g.addColorStop(.8,'#6a80b8');g.addColorStop(1,'#a9b8dc');x.fillStyle=g;x.fillRect(0,0,w,h);
  const r=bgRand(5);for(let i=0;i<110;i++){x.fillStyle='rgba(255,255,255,'+(.3+r()*.6)+')';x.beginPath();x.arc(r()*w,r()*h*.62,.6+r()*1.3,0,TAU);x.fill();}
  g=x.createRadialGradient(w*.72,h*.24,0,w*.72,h*.24,h*.3);g.addColorStop(0,'rgba(255,255,240,.9)');g.addColorStop(.18,'rgba(235,240,255,.35)');g.addColorStop(1,'rgba(180,200,255,0)');x.fillStyle=g;x.fillRect(0,0,w,h);
  x.fillStyle='#f6f4e4';x.beginPath();x.arc(w*.72,h*.24,h*.065,0,TAU);x.fill();x.fillStyle='rgba(190,190,200,.5)';[[.7,.23,.012],[.74,.26,.009],[.71,.27,.007]].forEach(([a,b,c])=>{x.beginPath();x.arc(w*a,h*b,h*c,0,TAU);x.fill();});
  x.fillStyle='#15203f';for(let i=0;i<9;i++){const px=i*w/8+r()*30-15,ph=h*(.2+r()*.12),py=h*.78;x.beginPath();x.moveTo(px,py-ph);x.lineTo(px+ph*.28,py);x.lineTo(px-ph*.28,py);x.fill();
    x.fillStyle='rgba(230,240,255,.55)';x.beginPath();x.moveTo(px,py-ph);x.lineTo(px+ph*.1,py-ph*.7);x.lineTo(px-ph*.1,py-ph*.7);x.fill();x.fillStyle='#15203f';}
  g=x.createLinearGradient(0,h*.76,0,h);g.addColorStop(0,'#c9d4ee');g.addColorStop(1,'#f0f4ff');x.fillStyle=g;x.beginPath();x.moveTo(0,h*.8);for(let i=0;i<=w;i+=16)x.lineTo(i,h*.78+Math.sin(i/70)*7);x.lineTo(w,h);x.lineTo(0,h);x.fill();});}
function fpSnowTex(){return mkTex(256,256,(x,w,h)=>{const r=bgRand(11);for(let i=0;i<70;i++){const s=1+r()*2.4;x.fillStyle='rgba(255,255,255,'+(.5+r()*.5)+')';x.beginPath();x.arc(r()*w,r()*h,s,0,TAU);x.fill();}});}
function fpCurtainTex(){return mkTex(128,256,(x,w,h)=>{   // draped fabric: vertical folds, dusty rose, a tie-back band
  for(let i=0;i<w;i++){const f=.5+.5*Math.sin(i/w*TAU*3.5+Math.sin(i*.05)*.6);x.fillStyle='rgb('+(150+f*50|0)+','+(70+f*30|0)+','+(86+f*34|0)+')';x.fillRect(i,0,1,h);}
  const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(0,0,0,.25)');g.addColorStop(.5,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.2)');x.fillStyle=g;x.fillRect(0,0,w,h);
  x.fillStyle='#e8c07a';x.fillRect(0,h*.52,w,10);});}
const fpSolid=c=>fpGrade(new T.MeshBasicMaterial({color:c,toneMapped:false}));
async function fpBuild(){
  if(FP.ready)return;if(FP.job)return FP.job;
  FP.job=(async()=>{
    const j=await fetch('models/fireplace.json').then(r=>{if(!r.ok)throw new Error('fireplace '+r.status);return r.json();});
    const B='models/fireplace/',imgs={};await Promise.all(['wall01','floor01','sofa01','bookshelf01','obj01','obj02','obj04','desk01','objalpha01','carpet03','picture01','fire'].map(async n=>{imgs[n]=await fpImg(B+n+'.png');}));
    const R=FP.room,S=FP.s,R2=new T.Group();R2.position.x=FP.rx;R.add(R2);FP.r2=R2;const RF=new T.Group();R.add(RF);FP.rf=RF;   // RF: the fireplace corner (mantel, fire, rug, painting)
       // R2: the sofa corner (lamp table, sofa, window), moved to the right of the player
    const mat=(n,o)=>{const t=new T.Texture(imgs[n]);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;t.wrapS=t.wrapT=T.RepeatWrapping;t.needsUpdate=true;return fpGrade(new T.MeshBasicMaterial(Object.assign({map:t,alphaTest:.4,side:T.DoubleSide,toneMapped:false},o||{})));};
    const quad=(x0,x1,y0,y1,z0,z1)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([x0,y0,z1,x1,y0,z1,x1,y1,z0,x0,y1,z0],3));g.setIndex([0,1,2,0,2,3]);return g;};
    /* the back wall: wood panels, one texture tile = 3 room units */
    {const W=70,g=quad(-W,W,0,40,0,0);g.setAttribute('uv',new T.Float32BufferAttribute([-W/3,0,W/3,0,W/3,40/3,-W/3,40/3],2));
      const m=mat('wall01',{alphaTest:0});m.map.wrapT=T.MirroredRepeatWrapping;m.color=new T.Color(.82,.72,.66);const wall=new T.Mesh(g,m);wall.renderOrder=-3;R.add(wall);}
    {const g=quad(-70,70,0,.42,.02,.02),m=mat('wall01',{alphaTest:0});m.color=new T.Color(.42,.3,.24);g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,.1,0,.1],2));const sk=new T.Mesh(g,m);sk.renderOrder=-2;R.add(sk);}   // skirting board
    /* the wood floor (world size, set in fpLayout) + a plane that only shows the player's shadow */
    {const t=new T.Texture(imgs.floor01);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;t.needsUpdate=true;
      const fl=new T.Mesh(new T.PlaneGeometry(1,1),fpGrade(new T.MeshBasicMaterial({map:t,toneMapped:false,color:new T.Color(.72,.64,.62)})));fl.rotation.x=-Math.PI/2;fl.renderOrder=-4;FP.g.add(fl);FP.floor=fl;
      const sh=new T.Mesh(new T.PlaneGeometry(120,50),new T.ShadowMaterial({opacity:.3}));sh.rotation.x=-Math.PI/2;sh.receiveShadow=true;sh.renderOrder=-1;FP.g.add(sh);FP.shadow=sh;}
    /* furniture of the Disney room: only the strip along the back wall (room z 0..3.7) and the rug; the triangle's centre decides */
    const keepMat={sofa01:1,obj01:1,obj02:1,obj04:1,desk01:1,objalpha01:1};const skip={m11:1,m23:1,m24:1,m25:1,m5:1,m12:1,m6:1,m14:1};
    j.living.meshes.forEach(m=>{
      if(m.mat==='carpet03')return;   // the green rug of the original does not suit the evening: a braided oval rug is drawn in front of the fire instead
      if(!keepMat[m.mat]||skip[m.name])return;
      const I=[];for(let t=0;t<m.i.length;t+=3){const a=m.i[t],b=m.i[t+1],c=m.i[t+2],cz=(m.p[a*3+2]+m.p[b*3+2]+m.p[c*3+2])/3,cx=(m.p[a*3]+m.p[b*3]+m.p[c*3])/3;if(cz>=-.1&&cz<=1.8&&cx>-.7&&cx<4.2)I.push(a,b,c);}
      if(!I.length)return;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(m.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(m.u,2));g.setIndex(I);
      const me=new T.Mesh(g,mat(m.mat));me.userData.nm=m.name;R2.add(me);});
    /* the fireplace (Gone Home): its back against the wall, centred on FP.fireX; the opening is 1.36 wide / 1.2 high in room units */
    {const f=j.fire,g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(f.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(f.u,2));g.setIndex(f.i);g.computeVertexNormals();
      const t=new T.Texture(imgs.fire);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;t.needsUpdate=true;
      const fm=new T.Mesh(g,fpGrade(new T.MeshBasicMaterial({map:t,toneMapped:false,side:T.DoubleSide})));fm.scale.setScalar(FP.fireK);fm.position.set(FP.fireX,0,.0116*FP.fireK+.02);RF.add(fm);FP.fm=fm;}
    /* the fire inside the opening: logs, flames, sparks (all additive / transparent, drawn after the mantel so the mantel hides what sticks out) */
    {const fg=new T.Group();fg.position.set(FP.fireX,0,.2);RF.add(fg);FP.fg=fg;
      const logs=new T.Sprite(new T.SpriteMaterial({map:fpLogTex(),transparent:true,depthWrite:false,toneMapped:false}));logs.scale.set(1.15,.29,1);logs.position.set(0,.2,.1);fg.add(logs);
      const ft=fpFlameTex();
      for(let i=0;i<6;i++){const s=new T.Sprite(new T.SpriteMaterial({map:ft,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,opacity:.9}));
        const bx=(i-2.5)*.19,bh=.62+((i*37)%5)*.07-Math.abs(i-2.5)*.05;s.userData={bx,bh,ph:i*1.7+.3};s.position.set(bx,.16,.15+i*.001);fg.add(s);FP.flames.push(s);}
      const sp=bgBlobTex;for(let i=0;i<14;i++){const s=new T.Sprite(new T.SpriteMaterial({map:sp,color:0xffa840,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,opacity:0}));s.userData={t:Math.random()*3,sp:.35+Math.random()*.4,x:0,ph:Math.random()*9};fg.add(s);FP.sparks.push(s);}
      const gl=new T.Sprite(new T.SpriteMaterial({map:sp,color:0xff8a30,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,opacity:.55}));gl.scale.set(2.4,2,1);gl.position.set(0,.6,.3);fg.add(gl);FP.glow=gl;
      const hm=new T.Mesh(new T.PlaneGeometry(6.4,3.4),new T.MeshBasicMaterial({map:sp,color:0xff9a44,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,opacity:.5}));   // the glow on the floor in front
      hm.rotation.x=-Math.PI/2;hm.position.set(FP.fireX,.03,2.1);hm.renderOrder=-1;RF.add(hm);FP.hearth=hm;}
    /* a braided oval rug on the hearth floor */
    {const t=mkTex(512,320,(x,w,h)=>{const cols=['#7a3c2a','#d9b98a','#9a5a3a','#e8d2a6','#6a3224'];for(let i=0;i<9;i++){x.fillStyle=cols[i%cols.length];x.beginPath();x.ellipse(w/2,h/2,w/2*(1-i*.105),h/2*(1-i*.105),0,0,TAU);x.fill();}
        x.strokeStyle='rgba(60,30,20,.35)';x.lineWidth=1.5;for(let i=0;i<9;i++){x.beginPath();x.ellipse(w/2,h/2,w/2*(1-i*.105),h/2*(1-i*.105),0,0,TAU);x.stroke();}});
      t.anisotropy=8;const rg=new T.Mesh(new T.PlaneGeometry(4.6,2.8),fpGrade(new T.MeshBasicMaterial({map:t,color:new T.Color(.7,.62,.58),transparent:true,toneMapped:false})));rg.rotation.x=-Math.PI/2;rg.position.set(FP.fireX+.3,.025,2.2);rg.renderOrder=-2;RF.add(rg);}
    /* the painting over the mantel: the sailing picture cut out of picture01.png */
    {const t=new T.Texture(imgs.picture01);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;t.repeat.set(.575,.395);t.offset.set(0,.56);t.needsUpdate=true;
      const p=new T.Mesh(new T.PlaneGeometry(2.3,1.57),fpGrade(new T.MeshBasicMaterial({map:t,toneMapped:false})));p.position.set(FP.fireX,3.7,.04);RF.add(p);}
    /* the window above the sofa: night picture, falling snow, frame with a cross, sill, curtains, a cold glow on the wall */
    {const W=FP.win,wg=new T.Group();wg.position.set(W.x,W.y,.03);R2.add(wg);
      const pic=new T.Mesh(new T.PlaneGeometry(W.w,W.h),new T.MeshBasicMaterial({map:fpWindowTex(),toneMapped:false}));wg.add(pic);   // not graded: it is the light source
      const st=fpSnowTex();st.wrapS=st.wrapT=T.RepeatWrapping;[[.9,1.6],[.6,1.1]].forEach(([op,sc],i)=>{const t=st.clone();t.needsUpdate=true;t.repeat.set(W.w/(W.h*.55*sc),1/(sc*.8));const m=new T.Mesh(new T.PlaneGeometry(W.w,W.h),new T.MeshBasicMaterial({map:t,transparent:true,opacity:op*.8,depthWrite:false,toneMapped:false}));m.position.z=.01+i*.001;wg.add(m);FP.snow.push({t,sp:.07*(i?.7:1),dx:i?.012:-.01});});
      const fr=fpSolid(0xe6dcc6),bar=(w,h,x,y)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,.18),fr);m.position.set(x,y,.07);wg.add(m);};
      const t=.13;bar(W.w+2*t,t,0,W.h/2+t/2);bar(W.w+2*t,t,0,-W.h/2-t/2);bar(t,W.h,-W.w/2-t/2,0);bar(t,W.h,W.w/2+t/2,0);bar(.08,W.h,0,0);bar(W.w,.08,0,.1);
      const sill=new T.Mesh(new T.BoxGeometry(W.w+.7,.12,.55),fpSolid(0xd8cdb4));sill.position.set(0,-W.h/2-.2,.28);wg.add(sill);
      const ct=fpCurtainTex();[-1,1].forEach(sg=>{const c=new T.Mesh(new T.PlaneGeometry(.95,W.h+.75),fpGrade(new T.MeshBasicMaterial({map:ct,toneMapped:false,side:T.DoubleSide})));c.position.set(sg*(W.w/2+.3),-.05,.26);wg.add(c);});
      const rod=new T.Mesh(new T.CylinderGeometry(.04,.04,W.w+2.4,8),fpSolid(0x6a4a2a));rod.rotation.z=Math.PI/2;rod.position.set(0,W.h/2+.45,.3);wg.add(rod);
      const cg=new T.Sprite(new T.SpriteMaterial({map:bgBlobTex,color:0x8fa8ff,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,opacity:.2}));cg.scale.set(7,6,1);cg.position.set(0,-.4,.2);wg.add(cg);}
    /* a few extras on the wall: fairy lights along the mantel are left out on purpose (the fire is the light) */
    FP.hk='';bgLitInit();fpLayout(true);FP.ready=true;
  })().catch(e=>{console.warn('fireplace failed to load',e);FP.failed=true;FP.job=null;});
  return FP.job;
}
function fpLayout(force){
  if(!FP.floor)return;const hk=Math.round(L.hw*10)+'|'+Math.round(FLOOR_Y*10)+'|'+Math.round(L.d*10);if(!force&&hk===FP.hk)return;FP.hk=hk;
  FP.room.scale.setScalar(FP.s);FP.room.position.set(FP.xo*FP.s,FLOOR_Y-.02,FP.zb);
  {const hv=L.hw*(L.d-FP.zb)/L.d/FP.s,c0=-FP.xo;   // half of the window's width at the back wall, in room units: the two corners keep to the two sides of the screen
    FP.rx=clamp(c0+.72*hv-1.95,1.2,10);FP.fdx=clamp(c0-.38*hv-FP.fireX,-5,2.4);if(FP.r2)FP.r2.position.x=FP.rx;if(FP.rf)FP.rf.position.x=FP.fdx;}
  const z0=FP.zb,z1=14,f=FP.floor;f.scale.set(200,z1-z0,1);f.position.set(0,FLOOR_Y-.025,(z0+z1)/2);f.material.map.repeat.set(200/(FP.s*2.4),(z1-z0)/(FP.s*2.4));   // the wood planks keep their size
  if(FP.shadow)FP.shadow.position.set(0,FLOOR_Y-.01,FLOOR_Z);
  FP.room.updateMatrixWorld(true);
  FP.u.uFire.value.copy(FP.room.localToWorld(new T.Vector3(FP.fireX+(FP.fdx||0),.7,.9)));
  FP.u.uWin.value.copy(FP.room.localToWorld(new T.Vector3(FP.win.x+FP.rx,FP.win.y,.6)));
}
function fpFrame(dt,time){
  fpLayout(false);FP.u.uT.value=time;
  const fl=.9+.07*Math.sin(time*8.1)+.05*Math.sin(time*13.7+1.3)+.03*Math.sin(time*23+.4);
  FP.flames.forEach(s=>{const u=s.userData,k=.8+.28*Math.sin(time*5.3+u.ph)+.14*Math.sin(time*11.1+u.ph*2.3),h=u.bh*k;
    s.scale.set(.3+.05*Math.sin(time*7+u.ph),h,1);s.position.set(u.bx+Math.sin(time*2.6+u.ph)*.05,.12+h*.5,s.position.z);s.material.opacity=.72+.2*Math.sin(time*9+u.ph*1.9);});
  FP.sparks.forEach(s=>{const u=s.userData;u.t+=dt*u.sp;if(u.t>1){u.t=0;u.sp=.3+Math.random()*.45;u.x=(Math.random()-.5)*.7;u.ph=Math.random()*9;}
    s.position.set(u.x+Math.sin(u.t*6+u.ph)*.07,.3+u.t*1.15,.2);const q=.05+.04*Math.sin(u.ph);s.scale.set(q,q,1);s.material.opacity=Math.sin(u.t*Math.PI)*.9;});
  if(FP.glow)FP.glow.material.opacity=.45*fl;if(FP.hearth)FP.hearth.material.opacity=.38+.2*fl;
  FP.snow.forEach(s=>{s.t.offset.y-=s.sp*dt;s.t.offset.x+=s.dx*dt+Math.sin(time*.8)*.0006;});
}
window.__fp={FP,fpBuild,fpLayout};   // test hook
