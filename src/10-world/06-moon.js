/* ---------- moon background (remote button "BG", mode 4) ----------
   Fourth background after the meadow (04-scenery.js), the cafe (05-cafe.js) and the museum (06-museum.js); the state machine is bgSet in 04-scenery.js.
   Made from the "moo_04" night-sky model (models/moon/src/moo_04.dae -> models/moon.json by tools/build_moon.py) and its textures (models/moon/*.png):
   - sky.png (moo_moon_01): the deep-blue night sky, stretched over the whole window at the back;
   - stars.png (moo_hosi_02): three layers of tiled stars that drift and twinkle at different speeds;
   - nebula.png (moo_hosi_04) x the model's vertex colours: the five teal / violet / yellow nebula clouds (additive), placed like in the model; the little orange / green / cyan
     patches of the model (tiny quads in the original) are drawn as soft twinkling coloured lights at the same spots;
   - ground.png (the uploaded moon-surface strip): its pebbly lower part is tiled (mirrored, so no seams) into the lunar floor and dotted with craters, its cratered upper edge is the
     horizon ridge standing at the far end of the floor, and it is wrapped into a round big moon (with a halo) in the sky; now and then a shooting star flies by.
   The sky objects live at the original model's relative positions in one group (MN.sky) far behind the action; the scale follows the window height (MN.sky.scale), the floor / ridge follow FLOOR_Y,
   so any window shape is filled. The lights are cooled to moonlight while this background is shown (bgApply in 04-scenery.js). Everything is behind the grey wall, which the curtain draws away. */
const MN={z:-80,ready:false,job:null,g:new T.Group(),sky:new T.Group(),hk:'',star:[],neb:[],glow:[],ground:null,ridge:null,back:null,moon:null,halo:null,shoot:null,nextShoot:5,t0:0};
MN.g.visible=false;MN.g.add(MN.sky);scene.add(MN.g);
const mnImg=u=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error(u));i.src=u;});
const mnCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const mnTex=(c,rep,mir)=>{const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;if(rep)t.wrapS=t.wrapT=mir?T.MirroredRepeatWrapping:T.RepeatWrapping;return t;};
/* the visible size of the window at world depth z (w, h) and the world y of the screen centre there (cy) */
function mnVis(z){const a=bgY(z,1),b=bgY(z,-1);return{w:2*L.hw*(L.d-z)/L.d,h:a-b,cy:(a+b)/2};}
/* a source strip of the moon-surface picture, tiled sideways / downwards with every other tile mirrored (no seams) */
function mnTile(x,img,sx,sy,sw,sh,dw,dh,W,H){
  for(let ty=0,j=0;ty<H;ty+=dh,j++)for(let tx=0,i=0;tx<W;tx+=dw,i++){const fx=i&1,fy=j&1;x.save();x.translate(tx+(fx?dw:0),ty+(fy?dh:0));x.scale(fx?-1:1,fy?-1:1);x.drawImage(img,sx,sy,sw,sh,0,0,dw,dh);x.restore();}
}
function mnGroundCanvas(img){   // the lunar floor: pebbles + craters, cooled and darkened (far end = top of the picture)
  const W=2048,H=832,c=mnCanvas(W,H),x=c.getContext('2d'),r=bgRand(41),R=(a,b)=>a+(b-a)*r();
  mnTile(x,img,0,194,256,62,512,124,W,H);
  for(let i=0;i<340;i++){const cx=R(0,W),cy=R(0,H),rr=R(8,46)*(.5+cy/H*.8);   // craters: a dark bowl, a bright rim on the lit side (nearer ones are bigger)
    let g=x.createRadialGradient(cx-rr*.12,cy-rr*.12,rr*.1,cx,cy,rr);g.addColorStop(0,'rgba(50,48,60,.42)');g.addColorStop(.7,'rgba(60,58,70,.26)');g.addColorStop(.88,'rgba(235,228,210,.16)');g.addColorStop(1,'rgba(235,228,210,0)');
    x.fillStyle=g;x.beginPath();x.arc(cx,cy,rr,0,TAU);x.fill();}
  for(let i=0;i<60;i++){const cx=R(0,W),cy=R(0,H),rr=R(80,260),g=x.createRadialGradient(cx,cy,0,cx,cy,rr);g.addColorStop(0,r()<.5?'rgba(255,250,235,.1)':'rgba(40,44,70,.14)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(cx-rr,cy-rr,rr*2,rr*2);}   // large soft light / dark patches
  x.globalCompositeOperation='multiply';x.fillStyle='rgb(150,160,196)';x.fillRect(0,0,W,H);   // cool, dark: the player and the dogs have to stand out
  x.globalCompositeOperation='source-over';const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(18,26,66,.6)');g.addColorStop(.5,'rgba(18,26,66,.18)');g.addColorStop(1,'rgba(18,26,66,0)');x.fillStyle=g;x.fillRect(0,0,W,H);
  return c;}
function mnRidgeCanvas(img){   // the horizon: the cratered upper edge of the strip (rows 122..255), tiled sideways, shaded to a dark blue silhouette
  const W=1536,H=272,c=mnCanvas(W,H),x=c.getContext('2d');
  for(let tx=0,i=0;tx<W;tx+=512,i++){x.save();x.translate(tx+(i&1?512:0),0);x.scale(i&1?-1:1,1);x.drawImage(img,0,122,256,134,0,0,512,H);x.restore();}
  x.globalCompositeOperation='destination-out';x.beginPath();x.moveTo(0,0);   // cut a lumpy skyline (whole periods across the tile, so it repeats without a jump)
  for(let i=0;i<=W;i+=8){const t=i/W*TAU;x.lineTo(i,H*(.3+.13*Math.sin(t*3+.6)+.08*Math.sin(t*7+2.1)+.045*Math.sin(t*13+4)));}
  x.lineTo(W,0);x.closePath();x.fill();
  x.globalCompositeOperation='source-atop';x.fillStyle='rgba(26,34,84,.95)';x.fillRect(0,0,W,H);
  const g=x.createLinearGradient(0,0,0,H);g.addColorStop(.18,'rgba(150,170,230,.18)');g.addColorStop(.5,'rgba(150,170,230,0)');x.fillStyle=g;x.fillRect(0,0,W,H);   // a faint rim light along the ridge line
  return c;}
function mnMoonCanvas(img){   // the big moon: pebbly surface from the picture, craters, grey seas, shaded to a crescent-ish phase
  const S=512,R0=S/2-8,c=mnCanvas(S,S),x=c.getContext('2d'),r=bgRand(7),R=(a,b)=>a+(b-a)*r();
  x.save();x.beginPath();x.arc(S/2,S/2,R0,0,TAU);x.clip();
  let g=x.createRadialGradient(S*.4,S*.38,S*.05,S/2,S/2,R0);g.addColorStop(0,'#fdfbf2');g.addColorStop(1,'#dcdde2');x.fillStyle=g;x.fillRect(0,0,S,S);
  x.globalAlpha=.2;x.globalCompositeOperation='multiply';mnTile(x,img,0,194,256,62,256,62,S,S);x.globalAlpha=1;x.globalCompositeOperation='source-over';
  for(let i=0;i<7;i++){const cx=R(S*.2,S*.8),cy=R(S*.2,S*.8),rr=R(50,110);g=x.createRadialGradient(cx,cy,0,cx,cy,rr);g.addColorStop(0,'rgba(120,122,140,.42)');g.addColorStop(1,'rgba(120,122,140,0)');x.fillStyle=g;x.fillRect(cx-rr,cy-rr,rr*2,rr*2);}   // seas
  for(let i=0;i<46;i++){const rr=R(5,26),a=R(0,TAU),d=R(0,R0-rr)*.95,cx=S/2+Math.cos(a)*d,cy=S/2+Math.sin(a)*d;   // craters
    g=x.createRadialGradient(cx-rr*.15,cy-rr*.15,rr*.2,cx,cy,rr);g.addColorStop(0,'rgba(110,108,124,.5)');g.addColorStop(.8,'rgba(120,118,134,.3)');g.addColorStop(.92,'rgba(255,252,240,.5)');g.addColorStop(1,'rgba(255,252,240,0)');x.fillStyle=g;x.beginPath();x.arc(cx,cy,rr,0,TAU);x.fill();}
  g=x.createRadialGradient(S*.34,S*.32,R0*.5,S*.5,S*.5,R0*1.08);g.addColorStop(0,'rgba(20,26,60,0)');g.addColorStop(.7,'rgba(20,26,60,.1)');g.addColorStop(1,'rgba(20,26,60,.5)');x.fillStyle=g;x.fillRect(0,0,S,S);   // lit from the upper left
  x.restore();return c;}
async function mnBuild(){
  if(MN.ready)return;if(MN.job)return MN.job;
  MN.job=(async()=>{
    const [mj,gI,sI,nI,kI]=await Promise.all([fetch('models/moon.json').then(r=>{if(!r.ok)throw new Error('moon '+r.status);return r.json();}),mnImg('models/moon/ground.png'),mnImg('models/moon/stars.png'),mnImg('models/moon/nebula.png'),mnImg('models/moon/sky.png')]);
    const tx=(img,rep)=>{const t=new T.Texture(img);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;if(rep)t.wrapS=t.wrapT=T.RepeatWrapping;t.needsUpdate=true;return t;};
    const G=MN.g,mb=(o)=>new T.MeshBasicMaterial(Object.assign({toneMapped:false,depthWrite:false},o)),quad=new T.PlaneGeometry(1,1);
    /* the night sky (moo_moon_01): one picture over the whole window */
    const back=new T.Mesh(quad,mb({map:tx(kI)}));back.renderOrder=-10;back.position.z=MN.z-8;G.add(back);MN.back=back;
    /* three layers of stars (moo_hosi_02): the model's three tiled planes (alpha .35 / .35 / .5 there), further layers finer and slower */
    [[.5,3.6,.006,.0016,0],[.6,3.8,-.0045,.0021,1.7],[.85,2.7,.003,-.0015,3.1]].forEach(([op,rows,dx,dy,ph],i)=>{
      const t=tx(sI,1),m=new T.Mesh(quad,mb({map:t,transparent:true,opacity:op,blending:T.AdditiveBlending}));m.renderOrder=-9+i;m.position.z=MN.z-6+i*2;G.add(m);MN.star.push({m,t,op,rows,dx,dy,ph});});
    /* the nebulae (moo_hosi_04 x vertex colours) and the little coloured lights, at the model's own spots (all in the MN.sky group, whose scale follows the window height) */
    const nm=mb({map:tx(nI),vertexColors:true,transparent:true,blending:T.AdditiveBlending,side:T.DoubleSide}),blob=bgBlobTex;
    let n=0;mj.meshes.forEach(m=>{
      if(m.tex==='nebula'){const g=new T.BufferGeometry(),P=[];for(let i=0;i<m.p.length;i+=3)P.push(m.p[i],m.p[i+1],0);
        g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('uv',new T.Float32BufferAttribute(m.u,2));g.setAttribute('color',new T.Float32BufferAttribute(m.c,4));g.setIndex(m.i);
        const me=new T.Mesh(g,nm);me.renderOrder=-6+(n++)*.01;me.userData.ph=n*1.9;MN.sky.add(me);MN.neb.push(me);}
      else if(m.tex==='sky'&&m.p.length===12&&m.c[0]<.99){   // the tiny tinted quads (orange / green / cyan): soft twinkling lights
        const cx=(m.p[0]+m.p[3]+m.p[6]+m.p[9])/4,cy=(m.p[1]+m.p[4]+m.p[7]+m.p[10])/4,w=Math.hypot(m.p[0]-m.p[3],m.p[1]-m.p[4]);
        const sp=new T.Sprite(new T.SpriteMaterial({map:blob,color:new T.Color(m.c[0],m.c[1],m.c[2]),blending:T.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false,opacity:.8}));
        sp.position.set(cx,cy,0);sp.scale.set(w*5,w*5,1);sp.renderOrder=-5;sp.userData.ph=cx*1.3+cy;sp.userData.s=w*5;MN.sky.add(sp);MN.glow.push(sp);}});
    /* the lunar floor (replaces the grey floor top, still receives the player's shadow), the horizon ridge at its far end, and the big moon */
    const gt=mnTex(mnGroundCanvas(gI));gt.generateMipmaps=true;gt.minFilter=T.LinearMipmapLinearFilter;gt.anisotropy=8;
    const ground=new T.Mesh(new T.PlaneGeometry(96,41),new T.MeshLambertMaterial({map:gt}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;G.add(ground);MN.ground=ground;
    const ridge=new T.Mesh(quad,mb({map:mnTex(mnRidgeCanvas(gI),1,1),transparent:true,alphaTest:.3}));ridge.renderOrder=-4;G.add(ridge);MN.ridge=ridge;
    const moon=new T.Mesh(quad,mb({map:mnTex(mnMoonCanvas(gI)),transparent:true}));moon.renderOrder=-3;G.add(moon);MN.moon=moon;
    const halo=new T.Sprite(new T.SpriteMaterial({map:blob,color:0xc9d8ff,blending:T.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false,opacity:.5}));halo.renderOrder=-4;G.add(halo);MN.halo=halo;
    /* a shooting star: a thin streak with a fading tail */
    const sc=mnCanvas(256,8),sx=sc.getContext('2d'),sg=sx.createLinearGradient(0,0,256,0);sg.addColorStop(0,'rgba(200,220,255,0)');sg.addColorStop(.85,'rgba(220,235,255,.7)');sg.addColorStop(1,'rgba(255,255,255,1)');sx.fillStyle=sg;sx.fillRect(0,2,256,4);
    const sh=new T.Mesh(quad,mb({map:mnTex(sc),transparent:true,blending:T.AdditiveBlending,opacity:0}));sh.renderOrder=-2;G.add(sh);MN.shoot={m:sh,t:-1,x:0,y:0,a:0};
    /* the player's shadow falls on the floor: the floor itself receives it, no extra plane needed */
    bgLitInit();mnLayout(true);MN.ready=true;
  })().catch(e=>{console.warn('moon failed to load',e);MN.failed=true;MN.job=null;});
  return MN.job;
}
/* keep every layer on its screen band: backdrop / stars cover the window at their depth, the model's group is scaled to the window height, the floor sits on FLOOR_Y */
function mnLayout(force){
  if(!MN.back)return;const hk=Math.round(L.hw*10)+'|'+Math.round(FLOOR_Y*10)+'|'+Math.round(L.d*10);if(!force&&hk===MN.hk)return;MN.hk=hk;
  const cover=(m,z,f)=>{const v=mnVis(z);m.position.set(0,v.cy,z);m.scale.set(v.w*(f||1.5),v.h*(f||1.5),1);return v;};
  cover(MN.back,MN.z-8,1.7);
  MN.star.forEach((s,i)=>{const z=MN.z-6+i*2,v=cover(s.m,z,1.5),tile=v.h/s.rows;s.t.repeat.set(v.w*1.5/tile,v.h*1.5/tile);});
  {const v=mnVis(MN.z);MN.sky.position.set(0,v.cy,MN.z);MN.sky.scale.setScalar(v.h/46);}   // the model's view is about 46 units high
  {const z=-79,v=mnVis(z),k=(L.d-z)/L.d,d=v.h*.23;MN.moon.position.set(-.5*L.hw*k,bgY(z,.6),z);MN.moon.scale.set(d,d,1);MN.halo.position.copy(MN.moon.position);MN.halo.position.z=z-.3;MN.halo.scale.set(d*2.8,d*2.8,1);}
  MN.ground.position.set(0,FLOOR_Y-.02,-8.1);
  {const z=-30,y0=bgY(z,.02),y1=bgY(z,.4),H=y1-y0;MN.ridge.scale.set(Math.max(240,mnVis(z).w*1.5),H,1);MN.ridge.position.set(0,y0+H/2,z);
    MN.ridge.material.map.repeat.set(MN.ridge.scale.x/(H*3.2),1);}
}
function mnFrame(dt,time){
  mnLayout(false);
  MN.star.forEach(s=>{s.t.offset.x+=s.dx*dt;s.t.offset.y+=s.dy*dt;s.m.material.opacity=s.op*(.78+.22*Math.sin(time*(.9+s.ph*.2)+s.ph));});
  MN.neb.forEach(m=>{m.scale.setScalar(1+Math.sin(time*.23+m.userData.ph)*.025);});
  MN.glow.forEach(s=>{const k=.7+.3*Math.sin(time*(.8+Math.abs(s.userData.ph)%.9)+s.userData.ph*3);s.material.opacity=.8*k;s.scale.setScalar(s.userData.s*(.9+.2*k));});
  if(MN.halo)MN.halo.material.opacity=.46+.06*Math.sin(time*.5);
  const S=MN.shoot;if(S){
    if(S.t<0){if(time>MN.nextShoot){const z=-78,v=mnVis(z);S.t=0;S.a=Math.PI+.28+Math.random()*.3;S.x=v.w*(Math.random()*.5+.05);S.y=v.cy+v.h*(.28+Math.random()*.15);S.len=v.h*.22;S.sp=v.w*.65;S.m.position.z=z;}}
    else{S.t+=dt;const p=S.t/.9;if(p>=1){S.t=-1;S.m.material.opacity=0;MN.nextShoot=time+7+Math.random()*10;}
      else{const d=S.t*S.sp*.85;S.m.position.x=S.x+Math.cos(S.a)*d;S.m.position.y=S.y+Math.sin(S.a)*d;S.m.rotation.z=S.a;S.m.scale.set(S.len,S.len*.012,1);S.m.material.opacity=Math.sin(p*Math.PI)*.9;}}
  }
}
window.__mn={MN,mnBuild,mnLayout};   // test hook
