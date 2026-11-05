/* ====================================================================
   THE OLD TV  (modelled on the grey portable set: recessed CRT, dark control strip on the right, tape drawer below)
   ==================================================================== */
renderer.localClippingEnabled=true;
const floorClip=new T.Plane(new V3(0,1,0),-FLOOR_Y);     // everything of the TV below the floor is cut away -> it sinks "into" the hole
const TVW0=2.9,TVH0=2.5,TVS=1.45,TVW=TVW0*TVS,TVH=TVH0*TVS,SC={x:-.28,y:.18};   // TVW/TVH = world size of the (scaled) set; the model is built at TVW0×TVH0
const tv={g:new T.Group(),i:new T.Group(),b:null,state:'none',landed:false,pw:0,mode:'noise',album:null,hit:[],poke:0,glass:null,punch:null,over:null,built:false};
const hole={g:new T.Group(),k:0,x:0,rx:1.8,rz:2.1};
function tvMat(C,p){p.clippingPlanes=[floorClip];return new C(p);}
function rrPathAt(w,h,r,cx,cy){const p=new T.Path(),x=cx-w/2,y=cy-h/2;p.moveTo(x+r,y);p.lineTo(x+w-r,y);p.quadraticCurveTo(x+w,y,x+w,y+r);p.lineTo(x+w,y+h-r);p.quadraticCurveTo(x+w,y+h,x+w-r,y+h);p.lineTo(x+r,y+h);p.quadraticCurveTo(x,y+h,x,y+h-r);p.lineTo(x,y+r);p.quadraticCurveTo(x,y,x+r,y);return p;}
/* CRT screen: one 2D canvas drawn every frame (picture + scanlines + grain + vignette + glare + power on/off), used as an overlay texture */
const crt={c:document.createElement('canvas'),x:null,tex:null,nf:0};crt.c.width=320;crt.c.height=256;crt.x=crt.c.getContext('2d');
crt.tex=new T.CanvasTexture(crt.c);crt.tex.colorSpace=T.SRGBColorSpace;
const NT=6,noiseTiles=[];
for(let n=0;n<NT;n++){const c=document.createElement('canvas');c.width=160;c.height=128;const x=c.getContext('2d'),id=x.createImageData(160,128);
  for(let i=0;i<id.data.length;i+=4){const v=Math.random()*255|0;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=255;}x.putImageData(id,0,0);noiseTiles.push(c);}
function crtSource(a){
  if(a._crt)return a._crt;const c=document.createElement('canvas');c.width=320;c.height=256;const x=c.getContext('2d');
  if(a.img){const im=a.img,r=Math.max(320/im.naturalWidth,256/im.naturalHeight),w=im.naturalWidth*r,h=im.naturalHeight*r;x.drawImage(im,(320-w)/2,(256-h)/2,w,h);}
  else{const t=document.createElement('canvas');t.width=t.height=512;art(t.getContext('2d'),512,a,false);x.drawImage(t,0,0,512,512,0,-32,320,320);}
  return a._crt=c;}
const BARS=['#c8c8c8','#c8c800','#00c8c8','#00c800','#c800c8','#c80000','#0000c8'];
function crtDraw(time){
  const W=320,H=256,x=crt.x,mode=tv.mode;x.globalAlpha=1;x.globalCompositeOperation='source-over';x.clearRect(0,0,W,H);
  if(mode==='noise'){const bw=W/7;BARS.forEach((c,i)=>{x.fillStyle=c;x.fillRect(i*bw,0,bw+1,H*.72);});x.fillStyle='#111';x.fillRect(0,H*.72,W,H*.28);
    x.fillStyle='#e8e8e8';x.font='700 22px '+MONO;x.textAlign='center';x.textBaseline='middle';x.fillText(Math.floor(time*2)%2?'NO DISC':'',W/2,H*.86);}
  else if(mode==='thumb'&&tv.album){const k=1.04+.03*Math.sin(time*.4),w=W*k,h=H*k;x.drawImage(crtSource(tv.album),(W-w)/2+Math.sin(time*.3)*4,(H-h)/2,w,h);}
  else if(mode==='video'){x.fillStyle='rgba(0,0,0,0)';}
  if(mode!=='video'&&(Math.random()<.05+tv.poke*.5)){const yy=Math.random()*H,hh=5+Math.random()*16;x.drawImage(crt.c,0,yy,W,hh,(Math.random()-.5)*16,yy,W,hh);}
  x.fillStyle='rgba(0,0,0,.2)';for(let y=0;y<H;y+=3)x.fillRect(0,y,W,1.3);                         // scanlines
  x.globalAlpha=mode==='noise'?.5:clamp(.17+.06*Math.random()+tv.poke*.5,0,.9);                  // film grain
  crt.nf=(crt.nf+1)%NT;x.drawImage(noiseTiles[crt.nf],0,0,W,H);x.globalAlpha=1;
  const by=((time*38)%(H+80))-40,rg=x.createLinearGradient(0,by-24,0,by+24);rg.addColorStop(0,'rgba(255,255,255,0)');rg.addColorStop(.5,'rgba(255,255,255,.06)');rg.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=rg;x.fillRect(0,by-24,W,48);
  const vg=x.createRadialGradient(W/2,H/2,H*.26,W/2,H/2,H*.82);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.6)');x.fillStyle=vg;x.fillRect(0,0,W,H);   // vignette
  const gg=x.createLinearGradient(0,0,W*.8,H);gg.addColorStop(0,'rgba(255,255,255,.14)');gg.addColorStop(.4,'rgba(255,255,255,0)');x.fillStyle=gg;x.fillRect(0,0,W,H);          // glass glare
  const pw=tv.pw;
  if(pw<1){   // power on/off: white line -> opens vertically (and the reverse when switching off)
    let ww,hh;if(pw<.3){ww=W*ease.out3(pw/.3);hh=3;}else{ww=W;hh=3+(H-3)*ease.out3((pw-.3)/.7);}
    x.fillStyle='#000';x.fillRect(0,0,W,(H-hh)/2);x.fillRect(0,(H+hh)/2,W,(H-hh)/2);x.fillRect(0,(H-hh)/2,(W-ww)/2,hh);x.fillRect((W+ww)/2,(H-hh)/2,(W-ww)/2,hh);
    if(pw>0&&pw<.3){x.fillStyle='rgba(255,255,255,.95)';x.fillRect((W-ww)/2,(H-3)/2,ww,3);}}
  crt.tex.needsUpdate=true;
}
function tvEnsureBuilt(){
  if(tv.built)return;tv.built=true;
  const bodyM=tvMat(T.MeshPhysicalMaterial,{color:0xb3b5af,roughness:.62,clearcoat:.16,clearcoatRoughness:.5,envMapIntensity:.75});
  const darkM=tvMat(T.MeshStandardMaterial,{color:0x1c1d1f,roughness:.5});
  const insetM=tvMat(T.MeshStandardMaterial,{color:0x8f918b,roughness:.72});
  const lightM=tvMat(T.MeshStandardMaterial,{color:0xc9cbc5,roughness:.55});
  const add=(m,x,y,z,hit)=>{m.position.set(x,y,z);m.castShadow=true;tv.i.add(m);if(hit){m.userData.phys='tv';tv.hit.push(m);}return m;};
  add(new T.Mesh(rrBox(TVW0,TVH0,.7,.3,.06),bodyM),0,0,.15,true).receiveShadow=true;               // front shell
  add(new T.Mesh(rrBox(2.25,1.95,.45,.3,.05),bodyM),0,.02,-.28,true);                          // tapered rear (CRT hump)
  add(new T.Mesh(rrBox(1.9,1.62,.72,.28,.05),bodyM),0,.02,-.84,true);                           // CRT body, stepping down toward the back
  add(new T.Mesh(rrBox(1.4,1.18,.58,.25,.05),bodyM),0,.02,-1.45,true);
  add(new T.Mesh(rrBox(.9,.78,.34,.2,.04),insetM),0,.02,-1.84,false);                           // neck cap
  for(let i=0;i<5;i++)add(new T.Mesh(new T.BoxGeometry(1.3,.014,.05),darkM),0,.83,-.62-i*.12,false).castShadow=false;   // vent slots on top
  for(let i=0;i<3;i++)add(new T.Mesh(new T.BoxGeometry(.9,.014,.045),darkM),0,.605,-1.28-i*.11,false).castShadow=false;
  /* recessed bezel around the glass */
  {const s=rrShape(2.06,1.82,.34);s.holes.push(rrPathAt(1.72,1.38,.22,0,.07));
   add(new T.Mesh(new T.ExtrudeGeometry(s,{depth:.04,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:2,curveSegments:12}),insetM),SC.x,SC.y-.07,.49,true);}
  /* convex glass: punch-through (video) + CRT overlay share one bulged grid */
  const gg=new T.PlaneGeometry(1.8,1.46,22,18),pa=gg.attributes.position;
  for(let i=0;i<pa.count;i++){const u=pa.getX(i)/.9,v=pa.getY(i)/.73;pa.setZ(i,.075*(1-u*u)*(1-v*v));}gg.computeVertexNormals();
  tv.punch=new T.Mesh(gg,tvMat(T.MeshBasicMaterial,{color:0x000000,opacity:0,blending:T.NoBlending}));tv.punch.position.set(SC.x,SC.y,.478);tv.punch.visible=false;tv.i.add(tv.punch);
  tv.over=new T.Mesh(gg,tvMat(T.MeshBasicMaterial,{map:crt.tex,transparent:true,toneMapped:false,depthWrite:false}));tv.over.position.set(SC.x,SC.y,.486);tv.over.renderOrder=6;tv.i.add(tv.over);
  tv.glass=tv.punch;tv.over.userData.phys='tv';tv.hit.push(tv.over);
  /* right control strip: two slider windows + knobs */
  add(new T.Mesh(rrBox(.5,1.76,.07,.1,.02),darkM),1.1,SC.y-.04,.5);
  const strip=new T.Mesh(new T.PlaneGeometry(.46,1.7),tvMat(T.MeshBasicMaterial,{toneMapped:false,map:mkTex(92,340,(x,w,h)=>{
    x.fillStyle='#17181a';x.fillRect(0,0,w,h);x.fillStyle='#c9cbc5';x.fillRect(16,34,60,74);x.fillRect(16,150,60,74);
    x.fillStyle='#2a2b2e';x.fillRect(16,70,60,6);x.fillRect(16,186,60,6);x.fillStyle='#ee5a2c';x.fillRect(16,68,16,10);
    x.fillStyle='#6a7076';for(let i=0;i<5;i++)x.fillRect(80,40+i*14,6,2);x.fillStyle='#8d9399';[262,292,322].forEach(y=>{x.beginPath();x.arc(46,y,11,0,TAU);x.fill();x.fillStyle='#2a2b2e';x.fillRect(44,y-9,4,9);x.fillStyle='#8d9399';});})}));
  strip.position.set(1.1,SC.y-.04,.538);tv.i.add(strip);
  /* tape drawer + small button along the bottom */
  add(new T.Mesh(rrBox(2.28,.24,.06,.07,.02),lightM),-.12,-.97,.5);
  add(new T.Mesh(new T.BoxGeometry(2.0,.03,.02),darkM),-.12,-.97,.535);
  add(new T.Mesh(rrBox(.36,.15,.07,.05,.02),insetM),1.1,-.97,.5);
  /* brand badge: BalaBuBu */
  const badge=new T.Mesh(new T.PlaneGeometry(.64,.17),tvMat(T.MeshBasicMaterial,{toneMapped:false,transparent:true,map:mkTex(256,68,(x,w,h)=>{
    x.fillStyle='#232426';x.beginPath();x.roundRect?x.roundRect(0,0,w,h,16):x.rect(0,0,w,h);x.fill();
    x.fillStyle='#f1f2f3';x.font='italic 800 38px "Trebuchet MS","Helvetica Neue",Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('BalaBuBu',w/2,h/2+2);})}));
  badge.position.set(SC.x-.5,SC.y-.07-.91+.145+.03,.545);tv.i.add(badge);
  tv.i.rotation.y=-.36;tv.i.scale.setScalar(TVS);tv.g.add(tv.i);tv.g.visible=false;scene.add(tv.g);
  /* the hole in the floor */
  const dm=new T.Mesh(new T.CircleGeometry(1,64),new T.MeshBasicMaterial({transparent:true,depthWrite:false,toneMapped:false,map:mkTex(256,256,(x,w)=>{const g=x.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2);g.addColorStop(0,'#020203');g.addColorStop(.72,'#0b0c0e');g.addColorStop(.94,'rgba(14,15,18,.9)');g.addColorStop(1,'rgba(14,15,18,0)');x.fillStyle=g;x.fillRect(0,0,w,w);})}));
  const rm=new T.Mesh(new T.RingGeometry(.9,1,64),new T.MeshBasicMaterial({color:ACC,transparent:true,opacity:.55,depthWrite:false,toneMapped:false}));rm.position.z=.001;
  dm.rotation.x=rm.rotation.x=-Math.PI/2;dm.renderOrder=2;rm.renderOrder=3;hole.g.add(dm,rm);hole.g.visible=false;scene.add(hole.g);
}
function tvLanded(){tv.landed=true;if(tv.b)tv.b.collisionFilter.mask|=CAT.player;Au.crash(1);camShake=.7;tween(.9,k=>{if(tv.state==='falling'||tv.state==='on'){tv.pw=Math.max(tv.pw,k);}},ease.lin,.35).then(()=>{if(tv.state==='falling')tv.state='on';});}
function tvDrift(){return Math.max(0,Math.min(1.7,L.hw-.15-PW/2));}      // how far the player floats right
function tvSlotX(){return tvDrift()-PW/2-TVW/2-.2;}                      // TV lands just left of the drifted player
function tvSummon(){
  if(!PHYS||tv.state!=='none')return;tvEnsureBuilt();
  const hw=L.hw-.15,x=clamp(tvSlotX(),-hw+TVW/2+.05,hw-TVW/2-.05);
  tv.b=Bodies.rectangle(mxp(x),myp(L.half+2.6),TVW*PXU,TVH*PXU,{chamfer:{radius:36},density:.0016,friction:.85,frictionAir:.008,restitution:.14,angle:(Math.random()-.5)*.35,collisionFilter:{category:CAT.tv,mask:CAT.floor|CAT.rem}});
  Body.setAngularVelocity(tv.b,(Math.random()-.5)*.03);Body.setVelocity(tv.b,{x:(Math.random()-.5)*1.4,y:0});
  Composite.add(wld,tv.b);tv.state='falling';tv.landed=false;tv.pw=0;tv.g.visible=true;remLit(0,true);Au.whoosh();
}
function tvRemove(){if(tv.b)Composite.remove(wld,tv.b);tv.b=null;tv.state='none';tv.g.visible=false;blobTv.visible=false;remLit(0,false);}
async function tvDismiss(){
  if(tv.state!=='on'&&tv.state!=='falling')return;const t=tv;t.state='sinking';remLit(0,false);Au.whoosh();
  const bx=t.b.position.x/PXU,cs=Math.abs(Math.cos(t.b.angle)),sn=Math.abs(Math.sin(t.b.angle));
  hole.x=bx;hole.rx=(cs*TVW+sn*TVH)/2+.4;hole.rz=2.1;hole.g.visible=true;
  for(const b of [hpState.body]){if(b&&Math.abs(b.position.x/PXU-bx)<hole.rx+1.6){Body.setVelocity(b,{x:Math.sign(b.position.x/PXU-bx||1)*4,y:-3});}}   // anything standing there is nudged out of the way
  const p0=t.pw;tween(.4,k=>{t.pw=p0*(1-k);},ease.io2);
  await tween(.55,k=>{hole.k=k;},ease.out5);
  if(t.b){t.b.collisionFilter.mask&=~CAT.floor;Body.setVelocity(t.b,{x:t.b.velocity.x*.2,y:2.5});Body.setAngularVelocity(t.b,(Math.random()-.5)*.012);}
  Au.thunk();
  await waitFor(()=>!t.b||t.b.position.y>myp(FLOOR_Y-3.6),4500);
  tvRemove();await tween(.5,k=>{hole.k=1-k;},ease.io2);hole.g.visible=false;
}
function tvToggle(){if(tv.state==='none')tvSummon();else if(tv.state==='on'||tv.state==='falling')tvDismiss();}
function tvPoke(){tv.poke=1;Au.click(.7,.8);}

