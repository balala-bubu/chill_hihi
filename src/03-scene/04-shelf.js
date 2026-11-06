/* ---------- shelf + albums ---------- */
const shelf=new T.Mesh(new T.BoxGeometry(70,.14,.8),new T.MeshPhysicalMaterial({color:0xe4e6e8,roughness:.6,clearcoat:.25,clearcoatRoughness:.5,envMapIntensity:.6}));shelf.receiveShadow=true;shelf.position.z=-.1;scene.add(shelf);   // 0.8 deep, back flush with the wall
/* soft shadow under the plank: a gradient that fades out, instead of a hard shadow-map edge. albums resting on the shelf don't cast real shadows
   (they stand turned and overhang the plank, so their shadows used to hang below it like pillars); they cast again once lifted off the shelf */
const SHADE_H=1.0,shadeTex=mkTex(4,128,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(58,64,74,.34)');g.addColorStop(.35,'rgba(58,64,74,.14)');g.addColorStop(1,'rgba(58,64,74,0)');x.fillStyle=g;x.fillRect(0,0,w,h);});
const shelfShade=new T.Mesh(new T.PlaneGeometry(70,SHADE_H),new T.MeshBasicMaterial({map:shadeTex,transparent:true,depthWrite:false,toneMapped:false}));shelfShade.position.z=-.45;shelfShade.renderOrder=1;scene.add(shelfShade);   // the plank casts its own shadow onto the wall, so nothing shows through underneath it
/* back panel: lit like everything else (catches the albums' shadows), starts exactly at the plank and runs up past the top of the screen, so it has no loose lower edge */
const BACK_H=12,shelfBack=new T.Mesh(new T.PlaneGeometry(70,BACK_H),new T.MeshStandardMaterial({color:0xaeb2b7,roughness:.95}));shelfBack.position.z=-.46;shelfBack.receiveShadow=true;scene.add(shelfBack);
const albums=[];const albumMeshes=[];
/* ---- slim jewel case (modelled on a real one): black tray with a raised rim, round recess, hub with prongs and four disc clips;
   a clear hinged lid whose frame, hinge knuckles and latch hooks are see-through, with the artwork sheet sitting inside it.
   everything below that doesn't depend on the album is built once and shared by every case (flagged keep so disposeAlbum leaves it alone) ---- */
const CASE_D=.16,COV_T=.025,TRAY_Z=CASE_D/2+.02;   // TRAY_Z = height at which a CD rests in the open case (CD radius in case units is 1.2/1.8 ≈ .667)
const RIM_H=.014,TZ=CASE_D/2,keep=o=>{o.userData.keep=true;return o;};
const darkM=keep(new T.MeshPhysicalMaterial({color:0x191a1d,roughness:.3,clearcoat:.8,clearcoatRoughness:.18,envMapIntensity:1}));   // black tray plastic (edges, rim, hub, clips)
const trayM=keep(new T.MeshPhysicalMaterial({map:trayTex(),roughness:.36,clearcoat:.55,clearcoatRoughness:.25,envMapIntensity:.9}));
const clearM=keep(new T.MeshPhysicalMaterial({color:0xe3edf2,transparent:true,opacity:.38,roughness:.07,clearcoat:1,clearcoatRoughness:.04,depthWrite:false,envMapIntensity:1.8}));   // clear lid frame, hinge, hooks
/* same recipe as the player's lid: tinted double-sided glass (no depth write, strong env reflection) + a baked diagonal glare streak that doesn't depend on the lighting */
const paneM=keep(new T.MeshPhysicalMaterial({color:0xdde8ee,transparent:true,opacity:.2,roughness:.08,clearcoat:1,clearcoatRoughness:.05,side:T.DoubleSide,depthWrite:false,envMapIntensity:1.6}));
const shineM=keep(new T.MeshBasicMaterial({transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide,map:mkTex(256,256,(x,w)=>{
  const g=x.createLinearGradient(0,0,w,w);g.addColorStop(0,'rgba(255,255,255,.5)');g.addColorStop(.2,'rgba(255,255,255,.06)');g.addColorStop(.26,'rgba(255,255,255,.3)');g.addColorStop(.36,'rgba(255,255,255,0)');
  g.addColorStop(.64,'rgba(255,255,255,0)');g.addColorStop(.7,'rgba(255,255,255,.18)');g.addColorStop(.76,'rgba(255,255,255,.02)');g.addColorStop(1,'rgba(255,255,255,.08)');x.fillStyle=g;x.fillRect(0,0,w,w);})}));
const rectPath=(sh,x0,y0,x1,y1)=>{sh.moveTo(x0,y0);sh.lineTo(x1,y0);sh.lineTo(x1,y1);sh.lineTo(x0,y1);sh.closePath();};
const ext=(sh,depth,z0)=>{const g=new T.ExtrudeGeometry(sh,{depth,bevelEnabled:false,curveSegments:32});g.translate(0,0,z0);g.userData.keep=true;return g;};
const rimGeo=(()=>{const sh=new T.Shape();rectPath(sh,-.75,-.75,.75,.75);const h=new T.Path();h.absarc(0,0,.7,0,TAU,true);sh.holes.push(h);return ext(sh,RIM_H,TZ);})();   // raised tray plate with a round hole: the well the disc sits in (CD radius .667)
const hubBaseGeo=(()=>{const sh=new T.Shape();sh.absarc(0,0,.115,0,TAU,false);return ext(sh,.006,TZ);})();
const hubGeo=(()=>{const a=[];for(let k=0;k<6;k++){const a0=k*TAU/6+.12,a1=(k+1)*TAU/6-.12,sh=new T.Shape();sh.absarc(0,0,.078,a0,a1,false);sh.absarc(0,0,.05,a1,a0,true);sh.closePath();a.push(sh);}return ext(a,.026,TZ+.006);})();   // six prongs the disc snaps onto
const clipGeo=(()=>{const a=[];for(let k=0;k<4;k++){const an=Math.PI/4+k*Math.PI/2,c=Math.cos(an),s=Math.sin(an),P=(r,t)=>new T.Vector2(c*r-s*t,s*r+c*t),sh=new T.Shape([P(.675,-.04),P(.8,-.07),P(.8,.07),P(.675,.04)]);a.push(sh);}return ext(a,.026,TZ);})();   // four tabs at the corners that hold the disc's edge
const frameGeo=(()=>{const sh=new T.Shape();rectPath(sh,.006,-.744,1.494,.744);const h=new T.Path();rectPath(h,.056,-.714,1.464,.714);sh.holes.push(h);const g=new T.ExtrudeGeometry(sh,{depth:COV_T-.012,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:2,curveSegments:8});g.translate(0,0,-(COV_T-.012)/2);g.userData.keep=true;return g;})();   // lid frame: hinge side a little thicker
const artGeo=keep(new T.BoxGeometry(1.42,1.44,COV_T*.6));
const paneGeo=keep(new T.PlaneGeometry(1.5,1.5));
const paperEdgeM=keep(new T.MeshStandardMaterial({color:0xf1efe8,roughness:.8}));   // the paper's cut edge
const knuckleGeo=keep(new T.CylinderGeometry(.03,.03,.13,16));
const hookGeo=keep(new T.BoxGeometry(.14,.034,COV_T+.012));
const trayDetail=(geo,m)=>{const o=new T.Mesh(geo,m||darkM);o.receiveShadow=true;return o;};
function buildAlbum(d,i){
  const g=new T.Group();scene.add(g);
  const sp=spineTex(d);
  /* box face order: +x, -x (spine, with its paper label), +y, -y, +z (tray, facing the lid), -z (back) */
  const bodyM=new T.Mesh(new T.BoxGeometry(1.5,1.5,CASE_D),[darkM,new T.MeshPhysicalMaterial({map:sp,roughness:.45,clearcoat:.5,clearcoatRoughness:.25}),darkM,darkM,trayM,darkM]);
  bodyM.castShadow=bodyM.receiveShadow=true;bodyM.userData.album=i;g.add(bodyM);
  g.add(trayDetail(rimGeo),trayDetail(hubBaseGeo),trayDetail(hubGeo),trayDetail(clipGeo));
  const piv=new T.Group();piv.position.set(-.75,0,TZ+.044+COV_T/2);g.add(piv);   // the lid sits above the hub and clips, so nothing on the tray pokes through the artwork
  const cm=new T.MeshPhysicalMaterial({map:coverTex(d),roughness:.35,clearcoat:.6,clearcoatRoughness:.2});
    const cover=new T.Mesh(artGeo,[paperEdgeM,paperEdgeM,paperEdgeM,paperEdgeM,cm,new T.MeshStandardMaterial({color:0xcfd2d5,roughness:.7})]);
  cover.position.set(.76,0,-COV_T*.1);cover.castShadow=true;cover.userData.album=i;piv.add(cover);
  const fr=new T.Mesh(frameGeo,clearM);piv.add(fr);
  const pane=new T.Mesh(paneGeo,paneM);pane.position.set(.75,0,COV_T/2);pane.renderOrder=3;piv.add(pane);   // outer clear shell over the paper
  const pane2=new T.Mesh(paneGeo,paneM);pane2.position.set(.75,0,-COV_T/2);pane2.renderOrder=3;piv.add(pane2);   // inner sheet of the shell, facing the tray: the paper sits between the two
  const shine=new T.Mesh(paneGeo,shineM);shine.position.set(.75,0,COV_T/2+.003);shine.renderOrder=4;piv.add(shine);
  [-.62,.62].forEach(y=>{const k=new T.Mesh(knuckleGeo,clearM);k.position.set(.02,y,0);piv.add(k);});   // hinge knuckles
  [-1,1].forEach(sy=>{const hk=new T.Mesh(hookGeo,clearM);hk.position.set(sy<0?.2:1.36,.745,0);piv.add(hk);const lw=new T.Mesh(hookGeo,clearM);lw.position.set(sy<0?.2:1.36,-.745,0);piv.add(lw);});   // latch hooks on the top and bottom edges
  albums.push({g,d,piv,k:0,open:0,sel:false,mag:0,dock:false,born:1,hv:0,tx:0,ty:0,meshes:[bodyM,cover]});albumMeshes.push(bodyM,cover);
}
ALBUMS.forEach((d,i)=>buildAlbum(d,i));

