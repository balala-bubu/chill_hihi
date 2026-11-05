/* ---------- shelf + albums ---------- */
const shelf=new T.Mesh(new T.BoxGeometry(70,.14,.8),new T.MeshPhysicalMaterial({color:0xe4e6e8,roughness:.6,clearcoat:.25,clearcoatRoughness:.5,envMapIntensity:.6}));shelf.receiveShadow=true;shelf.position.z=-.1;scene.add(shelf);   // 0.8 deep, back flush with the wall
/* soft shadow under the plank: a gradient that fades out, instead of a hard shadow-map edge. albums resting on the shelf don't cast real shadows
   (they stand turned and overhang the plank, so their shadows used to hang below it like pillars); they cast again once lifted off the shelf */
const SHADE_H=1.0,shadeTex=mkTex(4,128,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(58,64,74,.34)');g.addColorStop(.35,'rgba(58,64,74,.14)');g.addColorStop(1,'rgba(58,64,74,0)');x.fillStyle=g;x.fillRect(0,0,w,h);});
const shelfShade=new T.Mesh(new T.PlaneGeometry(70,SHADE_H),new T.MeshBasicMaterial({map:shadeTex,transparent:true,depthWrite:false,toneMapped:false}));shelfShade.position.z=-.45;shelfShade.renderOrder=1;scene.add(shelfShade);   // the plank casts its own shadow onto the wall, so nothing shows through underneath it
/* back panel: lit like everything else (catches the albums' shadows), starts exactly at the plank and runs up past the top of the screen, so it has no loose lower edge */
const BACK_H=12,shelfBack=new T.Mesh(new T.PlaneGeometry(70,BACK_H),new T.MeshStandardMaterial({color:0xaeb2b7,roughness:.95}));shelfBack.position.z=-.46;shelfBack.receiveShadow=true;scene.add(shelfBack);
const albums=[];const albumMeshes=[];
const edgeM=new T.MeshPhysicalMaterial({color:0xd9dbde,roughness:.42,clearcoat:.5,clearcoatRoughness:.3,envMapIntensity:.9});   // jewel-case plastic
const CASE_D=.16,COV_T=.025,TRAY_Z=CASE_D/2+.02;   // slim jewel case; TRAY_Z = height at which a CD rests in the open case
function buildAlbum(d,i){
  const g=new T.Group();scene.add(g);
  const sp=spineTex(d);
  const bodyM=new T.Mesh(new T.BoxGeometry(1.5,1.5,CASE_D),[edgeM,new T.MeshPhysicalMaterial({map:sp,roughness:.5,clearcoat:.4,clearcoatRoughness:.35}),edgeM,edgeM,new T.MeshPhysicalMaterial({map:trayTex(),roughness:.75,bumpMap:GR2,bumpScale:.004}),edgeM]);
  bodyM.castShadow=bodyM.receiveShadow=true;bodyM.userData.album=i;g.add(bodyM);
  const piv=new T.Group();piv.position.set(-.75,0,CASE_D/2+COV_T/2);g.add(piv);
  const cm=new T.MeshPhysicalMaterial({map:coverTex(d),roughness:.35,clearcoat:.6,clearcoatRoughness:.2});
  const cedge=new T.MeshStandardMaterial({color:new T.Color(d.c[0]),roughness:.5});   // cover edge takes the artwork's colour so the cover reads as one sheet
  const cover=new T.Mesh(new T.BoxGeometry(1.5,1.5,COV_T),[cedge,cedge,cedge,cedge,cm,new T.MeshStandardMaterial({color:0xcfd2d5,roughness:.7})]);
  cover.position.x=.75;cover.castShadow=true;cover.userData.album=i;piv.add(cover);
  albums.push({g,d,piv,k:0,open:0,sel:false,mag:0,dock:false,born:1,hv:0,tx:0,ty:0,meshes:[bodyM,cover]});albumMeshes.push(bodyM,cover);
}
ALBUMS.forEach((d,i)=>buildAlbum(d,i));

