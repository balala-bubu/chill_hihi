/* ---------- player ---------- */
const PW=3.6,PH=5.4,PD=.9,PY=-1.1,FZ=PD/2;
const pOff={intro:-.9,jig:0,x:0,ux:0,uy:0};
const pDrag={on:false,tx:0,ty:0,tvOn:false};   // ux/uy: where the user has dragged the player (translation only, it never tilts or flips)   // x: sideways drift (player floats right to make room for the TV)          // animated offsets added to the player's hover height
const player=new T.Group();player.position.set(0,PY,0);scene.add(player);
const body=new T.Mesh(rrBox(PW,PH,PD,.42,.07),M.body);body.castShadow=body.receiveShadow=true;player.add(body);
const BAYY=.3;
const BAY=new T.Vector3(0,PY+BAYY,FZ);           // world position of the disc bay
/* warm light that comes up from the bay while a disc is playing or being offered to it (follows the floating player every frame) */
const bayLight=new T.PointLight(0xffb08a,0,7,2);bayLight.position.set(0,PY+BAYY,FZ+1.4);scene.add(bayLight);
/* corner screws */
{const screwM=new T.MeshPhysicalMaterial({color:0xb9bdc2,metalness:.9,roughness:.35});
 [[-1.62,2.5],[1.62,2.5],[1.62,-2.5],[-1.62,-2.5]].forEach(([x0,y0],i)=>{
   const s=new T.Mesh(new T.CylinderGeometry(.045,.045,.02,20),screwM);s.rotation.x=Math.PI/2;s.position.set(x0,y0,FZ+.003);player.add(s);
   const sl=new T.Mesh(new T.BoxGeometry(.06,.011,.004),M.groove);sl.position.set(x0,y0,FZ+.0135);sl.rotation.z=i*1.1+.4;player.add(sl);});}
/* front-face finish: soft top-to-bottom light falloff, a lit rim top/left and a shaded rim bottom/right, plus fine matte grain.
   a flat-lit plastic slab reads as flat; this gives the face the gentle tonal drift of a moulded part */
{const FW=PW-.16,FH=PH-.16,tx=mkTex(512,768,(x,w,h)=>{
  const rr=(i,r)=>{x.beginPath();x.moveTo(i+r,i);x.arcTo(w-i,i,w-i,h-i,r);x.arcTo(w-i,h-i,i,h-i,r);x.arcTo(i,h-i,i,i,r);x.arcTo(i,i,w-i,i,r);x.closePath();};
  let g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(255,255,255,.2)');g.addColorStop(.4,'rgba(255,255,255,0)');g.addColorStop(.72,'rgba(70,78,90,0)');g.addColorStop(1,'rgba(70,78,90,.13)');x.fillStyle=g;x.fillRect(0,0,w,h);
  x.save();rr(0,53);x.clip();
  g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,'rgba(255,255,255,.75)');g.addColorStop(.5,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(60,66,76,.26)');
  x.lineWidth=16;x.strokeStyle=g;rr(6,47);x.stroke();x.restore();
  const R=rng(21);for(let i=0;i<6000;i++){x.fillStyle=R()>.5?'rgba(255,255,255,.06)':'rgba(40,46,54,.05)';x.fillRect(R()*w,R()*h,2,2);}});
 tx.repeat.set(1/FW,1/FH);tx.offset.set(.5,.5);
 const face=new T.Mesh(new T.ShapeGeometry(rrShape(FW,FH,.36),16),new T.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false,toneMapped:false}));
 face.position.z=FZ+.0015;player.add(face);}
function cyl(r,h,mat,x,y,z){const m=new T.Mesh(new T.CylinderGeometry(r,r,h,64),mat);m.rotation.x=Math.PI/2;m.position.set(x,y,z);m.receiveShadow=true;player.add(m);return m;}
cyl(1.5,.03,M.groove,0,BAYY,FZ+.005);
const platter=cyl(1.38,.03,M.plate,0,BAYY,FZ+.02);
const rings=new T.Mesh(new T.CircleGeometry(1.38,64),new T.MeshBasicMaterial({toneMapped:false,transparent:true,map:mkTex(512,512,(x,w)=>{
  x.translate(w/2,w/2);
  {let g=x.createRadialGradient(0,0,190,0,0,256);g.addColorStop(0,'rgba(40,46,54,0)');g.addColorStop(1,'rgba(40,46,54,.17)');x.fillStyle=g;x.beginPath();x.arc(0,0,256,0,TAU);x.fill();   // inner shadow: bay reads as recessed
   g=x.createRadialGradient(0,0,0,0,0,200);g.addColorStop(0,'rgba(255,255,255,.2)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.beginPath();x.arc(0,0,200,0,TAU);x.fill();}
  x.strokeStyle='rgba(60,64,70,.55)';x.fillStyle='rgba(60,64,70,.7)';
  for(let i=0;i<120;i++){const a=i/120*TAU;x.lineWidth=i%10?2:4;x.beginPath();x.moveTo(Math.cos(a)*236,Math.sin(a)*236);x.lineTo(Math.cos(a)*(i%10?248:254),Math.sin(a)*(i%10?248:254));x.stroke();}
  x.lineWidth=1.5;[120,170,205].forEach(r=>{x.beginPath();x.arc(0,0,r,0,TAU);x.stroke();});
  x.font='500 15px '+MONO;x.textAlign='center';x.fillText('44.1 kHz · 16 bit',0,-96);})}));
rings.position.set(0,BAYY,FZ+.04);player.add(rings);
/* drop-zone ring: fades in while a disc is dragged toward the open bay, pulses once it is close enough to drop */
const hint=new T.Mesh(new T.CircleGeometry(1.5,64),new T.MeshBasicMaterial({transparent:true,depthWrite:false,toneMapped:false,opacity:0,map:mkTex(256,256,(x,w)=>{
  x.translate(w/2,w/2);const g=x.createRadialGradient(0,0,90,0,0,126);g.addColorStop(0,'rgba(238,100,56,0)');g.addColorStop(.5,'rgba(238,100,56,0)');g.addColorStop(.62,'rgba(238,100,56,.85)');g.addColorStop(.74,'rgba(238,100,56,.25)');g.addColorStop(1,'rgba(238,100,56,0)');
  x.fillStyle=g;x.beginPath();x.arc(0,0,126,0,TAU);x.fill();})}));
hint.position.set(0,BAYY,FZ+.09);player.add(hint);
/* impact burst, fired when a disc lands in the bay: a shockwave ring, a warm flash and a few sparks.
   normal blending (not additive) on purpose: additive just clips to white on the pale body */
const burst={t:9,dur:.7};
const mkRadial=stops=>mkTex(256,256,(x,w)=>{x.translate(w/2,w/2);const g=x.createRadialGradient(0,0,0,0,0,w/2);stops.forEach(([p,c])=>g.addColorStop(p,c));x.fillStyle=g;x.beginPath();x.arc(0,0,w/2,0,TAU);x.fill();});
const burstRing=new T.Mesh(new T.CircleGeometry(1.5,64),new T.MeshBasicMaterial({transparent:true,depthWrite:false,toneMapped:false,opacity:0,
  map:mkRadial([[0,'rgba(238,100,56,0)'],[.74,'rgba(238,100,56,0)'],[.84,'rgba(238,100,56,.95)'],[.92,'rgba(255,190,140,.35)'],[1,'rgba(255,190,140,0)']])}));
const burstFlash=new T.Mesh(new T.CircleGeometry(1.5,64),new T.MeshBasicMaterial({transparent:true,depthWrite:false,toneMapped:false,opacity:0,
  map:mkRadial([[0,'rgba(255,226,196,.85)'],[.5,'rgba(255,170,110,.35)'],[1,'rgba(255,150,90,0)']])}));
burstFlash.position.set(0,BAYY,FZ+.085);burstRing.position.set(0,BAYY,FZ+.095);burstRing.visible=burstFlash.visible=false;player.add(burstFlash,burstRing);
const sparks=[];for(let i=0;i<14;i++){const m=new T.Mesh(new T.PlaneGeometry(.075,.075),new T.MeshBasicMaterial({color:i%3?0xff8a4c:0xffd9b0,transparent:true,depthWrite:false,toneMapped:false,opacity:0}));
  m.position.set(0,BAYY,FZ+.11);m.visible=false;player.add(m);sparks.push({m,a:i/14*TAU+((i*7)%5)*.13,s:1.5+((i*5)%4)*.28});}
cyl(.13,.1,M.metal,0,BAYY,FZ+.08);

/* display */
const dispC=document.createElement('canvas');dispC.width=384;dispC.height=128;const dctx=dispC.getContext('2d');
const dispTex=new T.CanvasTexture(dispC);dispTex.colorSpace=T.SRGBColorSpace;
const bezel=new T.Mesh(rrBox(1.7,.62,.06,.12,.02),M.dark);bezel.position.set(-.85,2.05,FZ+.02);player.add(bezel);
const dispM=new T.Mesh(new T.PlaneGeometry(1.56,.5),new T.MeshBasicMaterial({map:dispTex,toneMapped:false}));dispM.position.set(-.85,2.05,FZ+.056);player.add(dispM);
/* display glass: scanlines + pixel columns + a diagonal glare, so the OLED reads as a screen behind a pane */
const dispGlass=new T.Mesh(new T.PlaneGeometry(1.56,.5),new T.MeshBasicMaterial({transparent:true,depthWrite:false,toneMapped:false,map:mkTex(384,128,(x,w,h)=>{
  x.fillStyle='rgba(255,255,255,.06)';for(let j=0;j<h;j+=3)x.fillRect(0,j,w,1);
  x.fillStyle='rgba(255,255,255,.03)';for(let i=0;i<w;i+=3)x.fillRect(i,0,1,h);
  const g=x.createLinearGradient(0,0,w*.9,h*1.6);g.addColorStop(0,'rgba(255,255,255,.17)');g.addColorStop(.3,'rgba(255,255,255,.03)');g.addColorStop(.31,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=g;x.fillRect(0,0,w,h);})}));
dispGlass.position.set(-.85,2.05,FZ+.06);player.add(dispGlass);
/* volume LEDs */
const leds=[];for(let i=0;i<10;i++){const m=new T.Mesh(new T.BoxGeometry(.07,.22,.04),new T.MeshBasicMaterial({color:OFF,toneMapped:false}));m.position.set(.5+i*.125,2.05,FZ+.02);player.add(m);leds.push(m);}
/* label */
const label=new T.Mesh(new T.PlaneGeometry(1.2,.3),new T.MeshBasicMaterial({toneMapped:false,transparent:true,map:mkTex(256,64,(x)=>{x.fillStyle='#4a4e53';x.font='700 30px '+MONO;x.textBaseline='middle';x.fillText('MT-1',4,26);x.font='500 11px '+MONO;x.fillText('MATTE DISC PLAYER',6,52);})}));
label.position.set(-1.1,1.62-.0,FZ+.01);label.visible=false;player.add(label);
/* LED halos: additive glow behind each lit LED. brightness eases with volume and flashes on the LED that just changed */
const glowTex=mkTex(64,64,(x,w)=>{const g=x.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2);g.addColorStop(0,'rgba(255,150,100,1)');g.addColorStop(.35,'rgba(255,110,60,.45)');g.addColorStop(1,'rgba(255,90,40,0)');x.fillStyle=g;x.fillRect(0,0,w,w);});
const ledGlow=leds.map(m=>{const g=new T.Mesh(new T.PlaneGeometry(.3,.5),new T.MeshBasicMaterial({map:glowTex,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,opacity:0}));
  g.position.set(m.position.x,m.position.y,FZ+.045);g.userData.v=0;player.add(g);return g;});
const ledFlash=new Array(10).fill(0);

/* keys */
const keyWell=new T.Mesh(new T.PlaneGeometry(3.2,.84),new T.MeshStandardMaterial({color:0xb4b7bb,roughness:.9}));keyWell.position.set(0,-1.85,FZ+.004);player.add(keyWell);
function iconTex(kind,col){return mkTex(128,128,(x,w)=>{x.fillStyle=col||'#3a3d41';const c=w/2;
  if(kind==='play'){x.beginPath();x.moveTo(c-18,c-26);x.lineTo(c+28,c);x.lineTo(c-18,c+26);x.fill();}
  else if(kind==='pause'){x.fillRect(c-26,c-26,16,52);x.fillRect(c+10,c-26,16,52);}
  else if(kind==='stop'){x.fillRect(c-24,c-24,48,48);}
  else if(kind==='next'){x.beginPath();x.moveTo(c-30,c-25);x.lineTo(c+10,c);x.lineTo(c-30,c+25);x.fill();x.fillRect(c+17,c-26,10,52);}
  else if(kind==='minus'){x.fillRect(c-28,c-6,56,12);}
  else{x.fillRect(c-28,c-6,56,12);x.fillRect(c-6,c-28,12,56);}});}
const keyDefs=['play','stop','next','minus','plus'];const keys=[],keyIcons=[],keyMeshes=[],keyMats=[],keyGlow=[0,0,0,0,0];
keyDefs.forEach((k,i)=>{const g=new T.Group();g.position.set(-1.28+i*.64,-1.85,FZ-.02);g.userData.z0=FZ-.02;
  const sock=new T.Mesh(new T.PlaneGeometry(.64,.68),new T.MeshBasicMaterial({color:0x6d7176,toneMapped:false}));sock.position.set(g.position.x,g.position.y,FZ+.008);player.add(sock);   // dark socket the key sinks into
  const m=new T.Mesh(rrBox(.57,.6,.26,.12,.05),keyMats[i]=M.key.clone());m.position.z=.12;m.castShadow=true;m.userData.key=i;g.add(m);
  const ic=new T.Mesh(new T.PlaneGeometry(.30,.30),new T.MeshBasicMaterial({map:iconTex(k),transparent:true,toneMapped:false}));ic.position.z=.255;ic.userData.key=i;g.add(ic);
  player.add(g);keys.push(g);keyIcons.push(ic);keyMeshes.push(m,ic);});
const tex={play:iconTex('play'),pause:iconTex('pause','#ee5a2c')};   // pause icon turns accent-orange while playing

/* headphone jack (front, bottom-left) */
const jack=new T.Mesh(new T.CylinderGeometry(.14,.14,.03,32),M.dark);jack.rotation.x=Math.PI/2;jack.position.set(-1.35,-2.42,FZ+.012);player.add(jack);
const JACK=new T.Vector3(-1.35,PY-2.42,FZ);

/* lid */
/* A clearly readable lid: opaque frame + smoky tinted glass + glare streak + hinge barrels + finger tab,
   and a dark seat outline cut into the body so the closed lid's footprint is obvious. */
const LW=3.24,LH=2.9,LT=.09,LID_OPEN=-1.75;
function rrPath(w,h,r){const p=new T.Path(),x=-w/2,y=-h/2;p.moveTo(x+r,y);p.lineTo(x+w-r,y);p.quadraticCurveTo(x+w,y,x+w,y+r);p.lineTo(x+w,y+h-r);p.quadraticCurveTo(x+w,y+h,x+w-r,y+h);p.lineTo(x+r,y+h);p.quadraticCurveTo(x,y+h,x,y+h-r);p.lineTo(x,y+r);p.quadraticCurveTo(x,y,x+r,y);return p;}
{const sh=rrShape(LW+.12,LH+.12,.4);sh.holes.push(rrPath(LW-.06,LH-.06,.34));
 const seat=new T.Mesh(new T.ShapeGeometry(sh,16),new T.MeshBasicMaterial({color:0x8e9298,toneMapped:false}));seat.position.set(0,BAYY,FZ+.011);player.add(seat);}
const lidPivot=new T.Group();lidPivot.position.set(-1.62,BAYY,.64);player.add(lidPivot);
const lidFrameM=new T.MeshPhysicalMaterial({color:0xa9adb2,roughness:.42,metalness:.28,clearcoat:.5,clearcoatRoughness:.3,envMapIntensity:1});
const lidFrameS=rrShape(LW,LH,.36);lidFrameS.holes.push(rrPath(LW-.34,LH-.34,.22));
const lid=new T.Mesh(new T.ExtrudeGeometry(lidFrameS,{depth:LT-.04,bevelEnabled:true,bevelThickness:.02,bevelSize:.02,bevelSegments:2,curveSegments:10}),lidFrameM);
lid.position.set(LW/2,0,-(LT-.04)/2);lid.castShadow=true;lidPivot.add(lid);
const lidGlass=new T.Mesh(new T.ShapeGeometry(rrShape(LW-.3,LH-.3,.22),12),new T.MeshPhysicalMaterial({color:0x7f93a6,transparent:true,opacity:.36,roughness:.08,clearcoat:1,clearcoatRoughness:.05,side:T.DoubleSide,depthWrite:false,envMapIntensity:1.6}));
lidGlass.position.set(LW/2,0,0);lidGlass.renderOrder=3;lidPivot.add(lidGlass);
const lidShine=new T.Mesh(new T.PlaneGeometry(LW-.34,LH-.34),new T.MeshBasicMaterial({transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide,map:mkTex(256,256,(x,w)=>{
  const g=x.createLinearGradient(0,0,w,w);g.addColorStop(0,'rgba(255,255,255,.6)');g.addColorStop(.2,'rgba(255,255,255,.08)');g.addColorStop(.26,'rgba(255,255,255,.38)');g.addColorStop(.36,'rgba(255,255,255,0)');
  g.addColorStop(.64,'rgba(255,255,255,0)');g.addColorStop(.7,'rgba(255,255,255,.22)');g.addColorStop(.76,'rgba(255,255,255,.02)');g.addColorStop(1,'rgba(255,255,255,.1)');x.fillStyle=g;x.fillRect(0,0,w,w);})}));
lidShine.position.set(LW/2,0,.004);lidShine.renderOrder=4;lidPivot.add(lidShine);
{const tab=new T.Mesh(rrBox(.3,.9,.13,.09,.03),M.plate);tab.position.set(LW-.02,0,0);tab.castShadow=true;lidPivot.add(tab);
 const grip=new T.Mesh(new T.BoxGeometry(.07,.5,.03),M.dark);grip.position.set(LW-.02,0,.07);lidPivot.add(grip);
 [-.85,.85].forEach(y=>{const h=new T.Mesh(new T.CylinderGeometry(.095,.095,.6,24),M.metal);h.position.set(0,y,0);h.castShadow=true;lidPivot.add(h);});}
const playerHit=[body,lid,lidGlass,lidShine];const isPlayerObj=o=>o===body||o===lid||o===lidGlass||o===lidShine;

