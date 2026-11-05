/* ---------- CD ---------- */
const CDR=1.2;
const cdGeo=(()=>{const s=new T.Shape();s.absarc(0,0,CDR,0,TAU,false);const h=new T.Path();h.absarc(0,0,.16,0,TAU,true);s.holes.push(h);const g=new T.ExtrudeGeometry(s,{depth:.04,bevelEnabled:false,curveSegments:64});g.translate(0,0,-.02);return g;})();
/* diffraction sheen: two bright rainbow sectors on a ring. it lives on the CD root (not the spinning disc), so it stays put while the
   disc turns and sweeps as the CD tilts, like light on a real disc */
const rbGeo=new T.RingGeometry(.16,CDR,64,1);
const rainbowTex=mkTex(512,512,(x,w)=>{
  x.translate(w/2,w/2);const cg=!!x.createConicGradient;
  if(cg){const g=x.createConicGradient(0,0,0);['#ff6a9a','#ffd36a','#7affc4','#6ab8ff','#b48aff','#ff6a9a'].forEach((c,i,a)=>g.addColorStop(i/(a.length-1),c));x.fillStyle=g;}else x.fillStyle='#c8d4ff';
  x.beginPath();x.arc(0,0,w/2-1,0,TAU);x.arc(0,0,w*.075,0,TAU);x.fill('evenodd');
  if(cg){x.globalCompositeOperation='destination-in';const m=x.createConicGradient(.6,0,0);
    [[0,0],[.12,1],[.25,0],[.5,0],[.62,.9],[.75,0],[1,0]].forEach(([p,a])=>m.addColorStop(p,'rgba(0,0,0,'+a+')'));x.fillStyle=m;x.fillRect(-w/2,-w/2,w,w);x.globalCompositeOperation='source-over';}
});
function makeCD(ai){
  const root=new T.Group(),disc=new T.Group();root.add(disc);
  const tx=cdTex(ALBUMS[ai]);tx.repeat.set(1/(2*CDR),1/(2*CDR));tx.offset.set(.5,.5);
  const capM=new T.MeshPhysicalMaterial({map:tx,roughness:.22,metalness:.2,clearcoat:1,clearcoatRoughness:.05,iridescence:.9,iridescenceIOR:1.6,iridescenceThicknessRange:[180,720],envMapIntensity:1.1});
  const sideM=new T.MeshStandardMaterial({color:0xd8dadd,metalness:1,roughness:.3});
  const mesh=new T.Mesh(cdGeo,[capM,sideM]);mesh.castShadow=true;mesh.userData.cd=true;disc.add(mesh);
  const hit=new T.Mesh(new T.CircleGeometry(CDR,32),new T.MeshBasicMaterial({visible:false}));hit.position.z=.03;hit.userData.cd=true;disc.add(hit);
  const rbM=new T.MeshBasicMaterial({map:rainbowTex,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,opacity:.15});
  const rb=new T.Mesh(rbGeo,rbM);rb.position.z=.026;rb.renderOrder=2;root.add(rb);
  scene.add(root);
  return {root,disc,rb,mesh:hit,ai,pos:root.position,vel:new T.Vector2(),mode:'case',spin:0,tx:0,ty:0,off:new T.Vector2(),zT:.58,lift:0,flat:0,tilt:0,att:1,fp0:new T.Vector3(),dispose(){scene.remove(root);capM.dispose();tx.dispose();rbM.dispose();}};
}

