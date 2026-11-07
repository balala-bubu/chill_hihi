/* ---------- background scenery (remote button "BG") ----------
   Press BG: the grey dot wall + floor are drawn up off the top of the screen like a curtain (see bgCurtain) and a sunny meadow is revealed:
   warm sky + sun, three layers of hazy mountains, rolling grass, big trees (models/scenery/tree.json),
   a notice board and a tent. Press again: the wall slides back up. State is remembered in localStorage.
   Everything lives in one group (BG.g) far behind the action, so it never touches the physics world.
   Backgrounds: BG.mode 1 = meadow (this file), 2 = cafe (10-world/05-cafe.js), 3 = museum (06-museum.js), 4 = moon (06-moon.js), 5 = theater (06-bti-theater.js), 6 = fireplace living room (06-fireplace.js). The BG button switches the last picked one on/off; the hover menu on the button (03-summon-menu.js) picks which.
   Changing between two scenes draws the cloth back down and up again. localStorage 'chill_hihi.bg' = the mode shown ('0' off), 'chill_hihi.bgPick' = the last one picked. */
const BG={on:false,mode:0,k:0,wall:0,ready:false,job:null,g:new T.Group(),trees:[],clouds:[],props:{},t:0,hw:-1,tok:0,
  litSun:null,litFill:null,p:0,cu:{uK:{value:-1},uT:{value:0},uFold:{value:0},uRes:{value:new T.Vector2(1,1)}}};
BG.g.visible=false;scene.add(BG.g);
const BG_OK=!(PET.on&&!PET.card);   // transparent desktop pet has no wall to drop
function bgCanvasTex(w,h,draw,rep){const t=mkTex(w,h,draw);t.anisotropy=4;if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;}return t;}
function bgRand(seed){let s=seed|0||1;return()=>{s=(s*1664525+1013904223)|0;return((s>>>8)&0xffff)/0xffff;};}
/* a mountain silhouette: a sum of sines (jagged for far peaks, soft for hills); the ridge spans lo..hi of the canvas height */
function bgRidge(seed,top,foot,lo,hi,fr,jag){
  return bgCanvasTex(1024,256,(x,w,h)=>{const r=bgRand(seed),ph=fr.map(()=>r()*TAU),nrm=fr.reduce((a,_,j)=>a+1/(1+j*.75),0);
    const y=i=>{let v=0;fr.forEach((f,j)=>{v+=(jag?1-2*Math.abs(Math.sin(i/w*Math.PI*f+ph[j])):Math.sin(i/w*TAU*f+ph[j]))/(1+j*.75);});return h*(1-(lo+(hi-lo)*(v/nrm+1)/2));};
    x.beginPath();x.moveTo(0,h);for(let i=0;i<=w;i+=4)x.lineTo(i,y(i));x.lineTo(w,h);x.closePath();
    const g=x.createLinearGradient(0,h*(1-hi),0,h);g.addColorStop(0,top);g.addColorStop(1,foot);x.fillStyle=g;x.fill();
    x.globalCompositeOperation='source-atop';   // sunlit side: a thin warm strip along the ridge line
    x.strokeStyle='rgba(255,236,190,.4)';x.lineWidth=5;x.beginPath();for(let i=0;i<=w;i+=4){const yy=y(i)+3;i?x.lineTo(i,yy):x.moveTo(i,yy);}x.stroke();});}
const bgBlobTex=mkTex(128,128,(x,w)=>{const g=x.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,w,w);});
function bgCloudTex(seed){return mkTex(256,96,(x,w,h)=>{const r=bgRand(seed);for(let i=0;i<14;i++){const cx=40+r()*(w-80),cy=h*.62-r()*22,rr=16+r()*20;
  const g=x.createRadialGradient(cx,cy,0,cx,cy,rr);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.beginPath();x.arc(cx,cy,rr,0,TAU);x.fill();}});}
function bgMesh(j,tex,mat){   // json {p,u,c,i} -> BufferGeometry mesh
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(j.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(j.u,2));
  if(j.c)g.setAttribute('color',new T.Float32BufferAttribute(j.c,3));g.setIndex(j.i);return new T.Mesh(g,mat);}
/* ---- the grass: one painted ground texture (mown stripes, patches, blades, tiny flowers, dappled sun) ---- */
function bgGroundTex(){
  return bgCanvasTex(2560,1080,(x,w,h)=>{const r=bgRand(77),R=(a,b)=>a+(b-a)*r();
    let g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#cfe096');g.addColorStop(.4,'#aed275');g.addColorStop(1,'#8cb958');x.fillStyle=g;x.fillRect(0,0,w,h);   // far end is hazier and lighter
    for(let i=0;i<16;i++){x.fillStyle=i%2?'rgba(255,245,170,.07)':'rgba(70,130,60,.06)';x.fillRect(i*w/16,0,w/16,h);}   // soft mown stripes
    for(let i=0;i<340;i++){const cx=R(0,w),cy=R(0,h),rr=R(60,220),lt=r()<.5;const q=x.createRadialGradient(cx,cy,0,cx,cy,rr);
      q.addColorStop(0,lt?'rgba(205,230,120,.30)':'rgba(70,130,60,.22)');q.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=q;x.fillRect(cx-rr,cy-rr,rr*2,rr*2);}   // mottled patches
    const pal=['#5f9440','#74a84a','#8cbf5a','#a5d06a','#c3e07f','#4f8838'];
    for(let i=0;i<26000;i++){const bx=R(0,w),by=R(0,h),L=R(7,17),a=R(-.4,.4),k=bx+Math.sin(a)*L,m=by-Math.cos(a)*L;   // blades
      x.strokeStyle=pal[(r()*pal.length)|0];x.globalAlpha=R(.35,.8);x.lineWidth=R(1.3,2.6);x.lineCap='round';x.beginPath();x.moveTo(bx,by);x.quadraticCurveTo(bx+(k-bx)*.3,by-L*.6,k,m);x.stroke();}
    x.globalAlpha=1;
    for(let c=0;c<70;c++){const cx=R(0,w),cy=R(0,h),n=(4+r()*9)|0,kind=r();   // flower clusters
      for(let j=0;j<n;j++){const fx=cx+R(-90,90),fy=cy+R(-45,45),s=R(2.4,4.6);x.fillStyle=kind<.45?'#fffdf2':kind<.75?'#ffe58a':'#ffc3d2';
        for(let q=0;q<5;q++){const a=q/5*TAU;x.beginPath();x.arc(fx+Math.cos(a)*s*.8,fy+Math.sin(a)*s*.8,s*.62,0,TAU);x.fill();}
        x.fillStyle='#f0a21c';x.beginPath();x.arc(fx,fy,s*.5,0,TAU);x.fill();}}
    x.globalCompositeOperation='lighter';   // dappled sunlight
    for(let i=0;i<46;i++){const cx=R(0,w),cy=R(0,h),rx=R(90,300),ry=rx*R(.3,.5);const q=x.createRadialGradient(cx,cy,0,cx,cy,rx);q.addColorStop(0,'rgba(255,225,140,.11)');q.addColorStop(1,'rgba(255,225,140,0)');
      x.save();x.translate(cx,cy);x.scale(1,ry/rx);x.translate(-cx,-cy);x.fillStyle=q;x.fillRect(cx-rx,cy-rx,rx*2,rx*2);x.restore();}
  });}
/* a grass tuft atlas: 3 cells (plain, white flowers, yellow flowers) */
function bgTuftTex(){
  return bgCanvasTex(384,128,(x,w,h)=>{const r=bgRand(9),R=(a,b)=>a+(b-a)*r(),pal=['#5a9040','#72a848','#8cc058','#a8d26a','#c6e682'];
    for(let c=0;c<3;c++){const ox=c*128,n=17;
      for(let i=0;i<n;i++){const a=(i/(n-1)-.5)*1.5+R(-.12,.12),L=R(52,112),wd=R(4,8),bx=ox+64+R(-10,10),by=126;const tx=bx+Math.sin(a)*L*.9,ty=by-Math.cos(a)*L;
        x.fillStyle=pal[(r()*pal.length)|0];x.beginPath();x.moveTo(bx-wd,by);x.quadraticCurveTo(bx+(tx-bx)*.35-wd*.3,by-L*.55,tx,ty);x.quadraticCurveTo(bx+(tx-bx)*.35+wd*.3,by-L*.55,bx+wd,by);x.closePath();x.fill();}
      if(c>0)for(let i=0;i<4;i++){const fx=ox+64+R(-34,34),fy=R(22,62),s=R(4,6);x.fillStyle=c===1?'#fffdf0':'#ffdf6e';
        for(let q=0;q<5;q++){const a=q/5*TAU;x.beginPath();x.arc(fx+Math.cos(a)*s*.8,fy+Math.sin(a)*s*.8,s*.62,0,TAU);x.fill();}x.fillStyle='#f29a1a';x.beginPath();x.arc(fx,fy,s*.48,0,TAU);x.fill();
        x.strokeStyle='#5a9040';x.lineWidth=2.2;x.beginPath();x.moveTo(fx,fy+s);x.lineTo(fx+R(-3,3),120);x.stroke();}}});}
function bgTufts(){
  const NT=520,tex=bgTuftTex();tex.magFilter=T.LinearFilter;
  const q=new T.PlaneGeometry(1,1);q.translate(0,.5,0);const q2=q.clone();q2.rotateY(Math.PI/2);   // two crossed quads; uv.x is remapped per instance to pick a cell
  const geo=T.BufferGeometryUtils?null:null;void geo;
  const pos=[],uv=[],idx=[];[q,q2].forEach((g,j)=>{const p=g.attributes.position.array,u=g.attributes.uv.array,o=pos.length/3;for(let i=0;i<p.length;i++)pos.push(p[i]);for(let i=0;i<u.length;i++)uv.push(u[i]);g.index.array.forEach(v=>idx.push(v+o));});
  const G=new T.InstancedBufferGeometry();G.setAttribute('position',new T.Float32BufferAttribute(pos,3));G.setAttribute('uv',new T.Float32BufferAttribute(uv,2));G.setIndex(idx);
  const r=bgRand(123),cell=new Float32Array(NT);G.setAttribute('cell',new T.InstancedBufferAttribute(cell,1));
  const mat=new T.MeshBasicMaterial({map:tex,alphaTest:.5,side:T.DoubleSide,toneMapped:false,color:0xf3ffe0});
  mat.onBeforeCompile=sh=>{sh.uniforms.uTime={value:0};mat.userData.sh=sh;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float cell;uniform float uTime;')
      .replace('#include <uv_vertex>','#include <uv_vertex>\nvMapUv=vec2((uv.x+cell)/3.0,uv.y);')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nfloat sw=sin(uTime*1.5+instanceMatrix[3].x*.6+instanceMatrix[3].z*.45)*.09+sin(uTime*2.7+instanceMatrix[3].x*1.3)*.03;transformed.x+=sw*position.y;');};
  const m=new T.InstancedMesh(G,mat,NT),d=new T.Object3D();m.frustumCulled=false;
  for(let i=0;i<NT;i++){
    const z=-5.2-Math.pow(r(),.8)*20.5,x=(r()*2-1)*(16+(-z)*1.25),s=(.5+r()*.6)*(1+(-z)*.01);
    d.position.set(x,0,z);d.rotation.y=r()*Math.PI;d.scale.set(s,s*(.8+r()*.5),s);d.updateMatrix();m.setMatrixAt(i,d.matrix);cell[i]=r()<.74?0:r()<.5?1:2;}
  m.userData.tufts=true;return m;}
async function bgBuild(){
  if(BG.ready)return;if(BG.job)return BG.job;
  BG.job=(async()=>{
    const base='models/scenery/',load=n=>fetch(base+n+'.json').then(rr=>{if(!rr.ok)throw new Error(n+' '+rr.status);return rr.json();});
    const ld=new T.TextureLoader(),tx=n=>{const t=ld.load(base+n+'.png');t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.MirroredRepeatWrapping;t.anisotropy=4;return t;};
    const [jt,jb,jj,jd,jn]=await Promise.all([load('tree'),load('bbs'),load('tent'),load('bird_d'),load('bird_n')]);
    const G=BG.g;BG.lay=[];
    const lay=(o,z,foot,peak,hi)=>{o.userData.lay={z,foot,peak,hi};BG.lay.push(o);G.add(o);return o;};   // unit-height planes that bgLayout stretches to their screen-space band
    /* sky: warm cream near the ridges, clear blue above */
    const sky=new T.Mesh(new T.PlaneGeometry(460,1),new T.MeshBasicMaterial({toneMapped:false,map:bgCanvasTex(8,256,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);
      g.addColorStop(0,'#6db3e8');g.addColorStop(.45,'#a9d6ef');g.addColorStop(.78,'#f7eed0');g.addColorStop(1,'#ffe2ad');x.fillStyle=g;x.fillRect(0,0,w,h);})}));
    sky.position.z=-96;lay(sky,-96,0,1.2,1);
    /* the sun: a big soft glow + a bright core, plus a few faint light shafts */
    const sunAt=(o,z)=>{o.position.z=z;o.userData.sun={z};G.add(o);};
    const sunG=new T.Sprite(new T.SpriteMaterial({map:bgBlobTex,color:0xffc870,blending:T.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false,opacity:.5}));sunG.scale.set(80,80,1);sunAt(sunG,-90);
    const sunC=new T.Sprite(new T.SpriteMaterial({map:bgBlobTex,color:0xfff6d8,blending:T.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false}));sunC.scale.set(14,14,1);sunAt(sunC,-89);
    const rayTex=bgCanvasTex(64,256,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(255,230,160,.9)');g.addColorStop(1,'rgba(255,230,160,0)');x.fillStyle=g;x.fillRect(0,0,w,h);const e=x.createLinearGradient(0,0,w,0);e.addColorStop(0,'rgba(0,0,0,1)');e.addColorStop(.5,'rgba(0,0,0,0)');e.addColorStop(1,'rgba(0,0,0,1)');x.globalCompositeOperation='destination-out';x.fillStyle=e;x.fillRect(0,0,w,h);});
    BG.rays=[];[[.55,.08,12],[.78,.06,8],[.36,.05,7]].forEach(([a,o,wd],i)=>{const m=new T.Mesh(new T.PlaneGeometry(wd,140),new T.MeshBasicMaterial({map:rayTex,transparent:true,opacity:o,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));
      m.geometry.translate(0,-70,0);m.rotation.z=a;m.userData.o=o;sunAt(m,-80+i);BG.rays.push(m);});
    /* clouds drifting slowly */
    for(let i=0;i<6;i++){const m=new T.Mesh(new T.PlaneGeometry(36+i*5,14+i*2),new T.MeshBasicMaterial({map:bgCloudTex(11+i*7),transparent:true,opacity:.85,depthWrite:false,toneMapped:false}));
      m.position.set(-110+i*42,0,-86+i);m.userData.cl={n:.66+((i*37)%23)/100,sp:.35+(i%3)*.18};G.add(m);BG.clouds.push(m);}
    /* three mountain ranges far -> near, then a low rolling hill that hides the end of the meadow */
    [[-74,'#aab0d6','#f3dcc8',.35,1,[1.6,3.3,6.7],21,.74,1],[-60,'#86aab0','#e6e4c4',.3,1,[2.3,4.1,8.3],8,.58,1],[-46,'#5f9a63','#cfdc98',.4,1,[2.4,4.4,7.7],33,.44,0],[-32,'#98c268','#a9cf72',.55,1,[1.3,2.7,4.6],5,.21,0]].forEach(([z,top,foot,lo,hi,fr,seed,pk,jg],i)=>{
      const m=new T.Mesh(new T.PlaneGeometry(300,1),new T.MeshBasicMaterial({map:bgRidge(seed,top,foot,lo,hi,fr,jg),transparent:true,depthWrite:false,toneMapped:false}));m.position.z=z;lay(m,z,0,pk,hi);});
    /* the meadow: ONE painted ground plane that replaces the grey floor top (it keeps receiving the player's shadow) */
    const gt=bgGroundTex();gt.anisotropy=8;gt.generateMipmaps=true;gt.minFilter=T.LinearMipmapLinearFilter;
    const ground=new T.Mesh(new T.PlaneGeometry(96,39),new T.MeshLambertMaterial({map:gt}));
    ground.rotation.x=-Math.PI/2;ground.position.set(0,0,12.4-19.5);ground.receiveShadow=true;G.add(ground);BG.ground=ground;
    /* props share one warm tint */
    const mk=(tex,haze)=>new T.MeshBasicMaterial({map:tex,color:new T.Color(0xffffff).lerp(new T.Color(0xf6dcae),haze),side:T.DoubleSide,alphaTest:.45,toneMapped:false});
    const treeTex=tx('tree'),bbsTex=tx('bbs'),tentTex=tx('tent');
    const treeMats=[0,.2,.4].map(h=>{const m=mk(treeTex,h);m.vertexColors=true;return m;});
    /* a grove along the back of the meadow, a few closer ones at the edges */
    const T_=[[-50,-26,.03,2],[-34,-27,.032,2],[-14,-28,.034,2],[10,-28,.034,2],[30,-27,.03,2],[50,-26,.032,2],
      [-40,-20,.026,1],[-22,-22,.024,1],[22,-21,.024,1],[42,-19,.027,1],
      [-33,-13,.02,0],[34,-13,.021,0]];
    T_.forEach(([x,z,s,d],i)=>{const m=bgMesh(jt,null,treeMats[d]);const p=new T.Group();p.add(m);p.position.set(x,0,z);p.scale.setScalar(s);p.userData.base=1;p.userData.ph=i*1.7;G.add(p);BG.trees.push(p);});
    /* notice board + tent, beside the player (their x follows the window width) */
    const bbs=new T.Group();bbs.add(bgMesh(jb,null,mk(bbsTex,0)));bbs.scale.setScalar(.075);bbs.userData.base=1;G.add(bbs);BG.props.bbs=bbs;
    const tent=new T.Group();tent.add(bgMesh(jj,null,mk(tentTex,0)));tent.scale.setScalar(.7);tent.rotation.y=-.35;tent.userData.base=1;G.add(tent);BG.props.tent=tent;
    /* two little birds (16x16 pixel textures): the yellow one flies lazy loops across the sky, the owl keeps watch on top of the notice board */
    const pix=n=>{const t=tx(n);t.magFilter=t.minFilter=T.NearestFilter;t.generateMipmaps=false;return t;};
    const bird=new T.Group(),birdM=bgMesh(jd,null,mk(pix('bird_d'),0));birdM.position.y=-jd.h/2;bird.add(birdM);bird.scale.setScalar(9);G.add(bird);BG.props.bird=bird;
    const owl=new T.Group(),owlM=bgMesh(jn,null,mk(pix('bird_n'),0));owl.add(owlM);owl.scale.setScalar(9);G.add(owl);BG.props.owl=owl;BG.props.owlM=owlM;
    /* soft contact shadows on the grass */
    [[bbs,5,1.8],[tent,9,5]].forEach(([o,w,d])=>{const m=new T.Mesh(new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map:blobTex,transparent:true,opacity:.32,depthWrite:false,toneMapped:false}));
      m.rotation.x=-Math.PI/2;m.userData.follow=o;G.add(m);o.userData.sh=m;});
    /* swaying grass tufts + floating pollen */
    BG.tufts=bgTufts();G.add(BG.tufts);
    const N=46,pp=new Float32Array(N*3),r=bgRand(5);for(let i=0;i<N;i++){pp[i*3]=-24+r()*48;pp[i*3+1]=r()*13;pp[i*3+2]=-14+r()*10;}
    const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(pp,3));
    BG.motes=new T.Points(pg,new T.PointsMaterial({map:bgBlobTex,color:0xfff0b0,size:.5,transparent:true,opacity:.75,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));BG.motes.frustumCulled=false;G.add(BG.motes);
    bgLitInit();bgPatchCurtain();BG.ready=true;BG.hw=-1;bgLayout(true);
  })().catch(e=>{console.warn('background failed to load',e);BG.failed=true;BG.job=null;});
  return BG.job;
}
/* world y of the point on the plane z that appears at screen height n (NDC) */
const _bgV=new T.Vector3();
function bgY(z,n){cam.updateMatrixWorld();_bgV.set(0,n,.5).unproject(cam);const o=cam.position,t=(z-o.z)/(_bgV.z-o.z);return o.y+(_bgV.y-o.y)*t;}
/* keep every layer on its screen band and the props at the sides of the window */
function bgLayout(force){
  if(!BG.ready)return;const hk=Math.round(L.hw*10)+'|'+Math.round(FLOOR_Y*10)+'|'+Math.round(L.d*10);if(!force&&hk===BG.hw)return;BG.hw=hk;
  BG.lay.forEach(m=>{const l=m.userData.lay,y0=bgY(l.z,l.foot),y1=bgY(l.z,l.peak),H=(y1-y0)/l.hi;m.scale.y=H;m.position.y=y0+H/2;});
  BG.g.children.forEach(o=>{const s=o.userData.sun;if(s){const k=(L.d-s.z)/L.d;o.position.x=-.5*L.hw*k;o.position.y=bgY(s.z,.84);}
    const c=o.userData.cl;if(c)o.position.y=bgY(o.position.z,c.n);});
  BG.ground.position.y=FLOOR_Y-.02;BG.tufts.position.y=FLOOR_Y;
  const sx=clamp(L.hw*.74,8,24),P=BG.props;
  P.bbs.position.set(-sx,FLOOR_Y,-8);P.tent.position.set(sx,FLOOR_Y,-8.5);P.owl.position.set(-sx+.1,FLOOR_Y+48*.075,-7.9);
  BG.trees.forEach(p=>{p.position.y=FLOOR_Y;});
  BG.g.children.forEach(o=>{const f=o.userData.follow;if(f)o.position.set(f.position.x+(f===P.tent?.6:0),FLOOR_Y+.02,f.position.z+(f===P.tent?.5:.4));});
}
/* the curtain: the grey wall, its shadow catcher and the grey floor all discard the pixels below a wavy "hem" line that
   travels up the screen (uK: 0 = bottom edge, 1 = top edge); the grass/sky scene sits behind them and shows through.
   The cloth gets soft pleats while it moves and a darker rolled hem. */
function bgPatchCurtain(){
  if(BG.patched)return;BG.patched=true;
  const hook=(mat,shade)=>{mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,BG.cu);
    sh.fragmentShader=sh.fragmentShader.replace('void main() {','uniform float uK,uT,uFold;uniform vec2 uRes;\nvoid main() {')
      .replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nfloat cuX=gl_FragCoord.x/uRes.x,cuY=gl_FragCoord.y/uRes.y;\nfloat cuHem=uK+(sin(cuX*9.0+uT*1.2)*.016+sin(cuX*23.0-uT*.9)*.007+sin(cuX*3.1+uT*.5)*.02)*uFold;\nif(cuY<cuHem)discard;')
      .replace('#include <dithering_fragment>',shade?'#include <dithering_fragment>\nfloat cuD=cuY-cuHem;gl_FragColor.rgb*=1.0-.34*(1.0-smoothstep(0.0,.05,cuD))*step(0.0,uK+.2)-uFold*.075*(sin(cuX*46.0+sin(cuY*4.0+uT)*1.6)*.5+.5);gl_FragColor.rgb+=.05*(1.0-smoothstep(0.0,.006,cuD))*step(0.0,uK+.2);':'#include <dithering_fragment>');};
    mat.customProgramCacheKey=()=>'bgcurtain'+(shade?'1':'0');mat.needsUpdate=true;};
  hook(grid.material,true);hook(floorMesh.material,true);hook(catcher.material,false);
}
function bgCurtain(p){   // p 0 = grey wall/floor fully in place, 1 = drawn up out of the screen
  BG.p=p;const c=BG.cu;c.uK.value=p<=0?-1:lerp(-.06,1.14,p);c.uFold.value=Math.sin(Math.PI*clamp(p,0,1));
  renderer.getDrawingBufferSize(c.uRes.value);
  const gone=p>=1;grid.visible=catcher.visible=!gone;floorMesh.visible=!gone&&(PET.on?PET.shadow:true);
}
function bgLitInit(){if(!BG.litSun){BG.litSun={c:sun.color.clone(),i:sun.intensity};BG.litFill=fill.intensity;}}   // the normal lighting, remembered once so both scenes can warm it up and put it back
function bgApply(){   // lighting warms up with the reveal
  const k=BG.k;if(!BG.litSun)return;
  sun.color.copy(BG.litSun.c).lerp(new T.Color(BG.mode===4?0xb8c8ff:BG.mode===5?0xffcf9a:BG.mode===6?0xffb878:0xffdca0),k);sun.intensity=BG.litSun.i*(BG.mode===4?1-.12*k:BG.mode===5?1-.06*k:BG.mode===6?1-.2*k:1+.1*k);fill.intensity=BG.litFill*(1-.4*k);   // moonlight is cool and a little dimmer
}
const bgShowFloor=()=>{floorMesh.visible=PET.on?PET.shadow:true;grid.visible=catcher.visible=true;};
async function bgSet(m,instant){   // m: 0 off, 1 meadow, 2 cafe, 3 museum, 4 moon, 5 theater, 6 fireplace (true/false also work: meadow / off)
  if(!BG_OK)return;m=m===true?1:!m?0:clamp(m|0,0,6);if(m===BG.mode&&!instant)return;
  const prev=BG.mode;BG.mode=m;BG.on=m>0;remLit(1,m>0);
  try{localStorage.setItem('chill_hihi.bg',String(m));if(m)localStorage.setItem('chill_hihi.bgPick',String(m));}catch(e){}
  const tok=++BG.tok;
  if(m===1)await bgBuild();else if(m===2)await cfBuild();else if(m===3)await muBuild();else if(m===4)await mnBuild();else if(m===5)await btBuild();else if(m===6)await fpBuild();
  if(tok!==BG.tok)return;
  if(m&&!([0,BG,CF,MU,MN,BT,FP][m].ready)){BG.mode=0;BG.on=false;remLit(1,false);try{localStorage.setItem('chill_hihi.bg','0');}catch(e){}return;}   // the scene failed to load: stay off
  const show=n=>{BG.g.visible=n===1;CF.g.visible=n===2;MU.g.visible=n===3;MN.g.visible=n===4;BT.g.visible=n===5;FP.g.visible=n===6;};
  const lay=()=>{if(BG.mode===1)bgLayout(true);else if(BG.mode===2)cfLayout(true);else if(BG.mode===3)muLayout(true);else if(BG.mode===4)mnLayout(true);else if(BG.mode===5)btLayout(true);else if(BG.mode===6)fpLayout(true);};
  const run=(from,to,sec,tk)=>tween(sec,k=>{if(BG.tok===tk){const p=lerp(from,to,k);bgCurtain(p);BG.k=clamp(p*1.3,0,1);bgApply();}},ease.io2);
  if(instant||(!m&&!BG.g.visible&&!CF.g.visible&&!MU.g.visible&&!MN.g.visible&&!BT.g.visible&&!FP.g.visible)){
    if(m){show(m);lay();BG.k=1;bgApply();bgCurtain(1);}else{show(0);BG.k=0;bgApply();bgCurtain(0);bgShowFloor();}return;}
  Au.whoosh&&Au.whoosh();
  const p0=BG.p;bgShowFloor();
  if(m&&prev){   // from one scene to the other: the cloth comes back down, the scene behind it is swapped, the cloth is drawn up again
    await run(p0,0,1.0*p0+.15,tok);if(BG.tok!==tok)return;
    show(m);lay();await run(0,1,1.7,tok);
  }else if(m){show(m);lay();await run(p0,1,1.9*(1-p0)+.2,tok);}
  else{
    await run(p0,0,1.5*p0+.2,tok);
    if(BG.tok===tok){show(0);BG.k=0;bgApply();bgCurtain(0);bgShowFloor();}
  }
}
function bgToggle(){   // the BG button: grey <-> a background, cycling meadow / cafe / museum / moon / theater, one per press (menu on hover picks one directly, see 03-summon-menu.js); meadow first
  if(BG.mode){try{localStorage.setItem('chill_hihi.bgPick',String(BG.mode%6+1));}catch(e){}bgSet(0);}   // turning off: the next press brings the OTHER background (grey -> meadow -> grey -> cafe -> grey ...)
  else{let m=1;try{m=+localStorage.getItem('chill_hihi.bgPick')||1;}catch(e){}bgSet(m);}
}
function bgFrame(dt,time){
  if(FP.g.visible&&FP.ready){BG.cu.uT.value=time;if(BG.p>0&&BG.p<1)renderer.getDrawingBufferSize(BG.cu.uRes.value);fpFrame(dt,time);return;}
  if(BT.g.visible&&BT.ready){BG.cu.uT.value=time;if(BG.p>0&&BG.p<1)renderer.getDrawingBufferSize(BG.cu.uRes.value);btFrame(dt,time);return;}
  if(MN.g.visible&&MN.ready){BG.cu.uT.value=time;if(BG.p>0&&BG.p<1)renderer.getDrawingBufferSize(BG.cu.uRes.value);mnFrame(dt,time);return;}
  if(MU.g.visible&&MU.ready){BG.cu.uT.value=time;if(BG.p>0&&BG.p<1)renderer.getDrawingBufferSize(BG.cu.uRes.value);muLayout(false);return;}
  if(CF.g.visible&&CF.ready){BG.cu.uT.value=time;if(BG.p>0&&BG.p<1)renderer.getDrawingBufferSize(BG.cu.uRes.value);cfFrame(dt,time);return;}
  if(!BG.ready||!BG.g.visible)return;bgLayout(false);
  BG.cu.uT.value=time;if(BG.p>0&&BG.p<1)renderer.getDrawingBufferSize(BG.cu.uRes.value);
  const sh=BG.tufts.material.userData.sh;if(sh)sh.uniforms.uTime.value=time;
  BG.trees.forEach(p=>{p.rotation.z=Math.sin(time*.55+p.userData.ph)*.012;p.rotation.x=Math.sin(time*.4+p.userData.ph*.6)*.006;});
  BG.clouds.forEach(m=>{m.position.x+=m.userData.cl.sp*dt;if(m.position.x>140)m.position.x=-140;});
  const a=BG.motes.geometry.attributes.position.array;for(let i=0;i<a.length;i+=3){a[i]+=dt*(.35+Math.sin(time*.7+i)*.15);a[i+1]+=dt*(.18+Math.sin(time*.5+i*1.3)*.12);if(a[i]>26)a[i]=-26;if(a[i+1]>13)a[i+1]=0;}
  BG.motes.geometry.attributes.position.needsUpdate=true;BG.motes.position.y=FLOOR_Y;
  {const b=BG.props.bird,t=time*.22,span=Math.min(L.hw*.8,22),dx=Math.cos(t),dy=Math.cos(t*2)*.7;
    b.position.set(Math.sin(t)*span,FLOOR_Y+14+Math.sin(t*2)*2.5+Math.sin(time*7)*.15,-18);b.rotation.y=dx>=0?0:Math.PI;b.rotation.z=Math.atan2(dy,Math.abs(dx)+.4)*.5+Math.sin(time*7)*.05;
    BG.props.owlM.rotation.y=Math.sin(time*.6)*.35*Math.max(0,Math.sin(time*.23));}
  BG.rays.forEach((m,i)=>{m.material.opacity=m.userData.o*(.65+.35*Math.sin(time*.45+i*2));});
}
window.__bg={BG,bgSet,bgToggle,bgCurtain,bgLayout,bgShowFloor};   // test hook
