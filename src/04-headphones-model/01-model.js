/* ---------- headphones + cable ---------- */
const hp=new T.Group();hp.visible=false;scene.add(hp);
/* sweep a rounded-rectangle cross-section along an arc in the xy plane (headband shell + head pad); profile u = depth (z), v = radial thickness */
function arcBand(R,a0,a1,w,th,rnd,seg){
  const pr=[],cn=4,rr=Math.min(w,th)/2*rnd,hw=w/2,ht=th/2;
  [[hw-rr,ht-rr,0],[-hw+rr,ht-rr,Math.PI/2],[-hw+rr,-ht+rr,Math.PI],[hw-rr,-ht+rr,Math.PI*1.5]].forEach(([cx,cy,s0])=>{for(let k=0;k<=cn;k++){const a=s0+k/cn*Math.PI/2;pr.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr]);}});
  const P=pr.length,pos=[],idx=[];
  for(let i=0;i<=seg;i++){const a=lerp(a0,a1,i/seg),c=Math.cos(a),s=Math.sin(a);for(const p0 of pr)pos.push((R+p0[1])*c,(R+p0[1])*s,p0[0]);}
  for(let i=0;i<seg;i++)for(let j=0;j<P;j++){const a=i*P+j,b=i*P+(j+1)%P,c=(i+1)*P+j,d=(i+1)*P+(j+1)%P;idx.push(a,b,c,b,d,c);}
  [[0,-1],[seg,1]].forEach(([i,sg])=>{   // flat end caps (own vertices so they shade flat)
    const base=pos.length/3,a=lerp(a0,a1,i/seg),c=Math.cos(a),s=Math.sin(a);pos.push(R*c,R*s,0);
    for(const p0 of pr)pos.push((R+p0[1])*c,(R+p0[1])*s,p0[0]);
    for(let j=0;j<P;j++){const p=base+1+j,q=base+1+(j+1)%P;if(sg>0)idx.push(base,p,q);else idx.push(base,q,p);}});
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
/* lathe from a profile function u(0..1) -> [radius, height]; the height axis becomes the cup's axis */
const lathe=(f,n,seg)=>{const o=[];for(let k=0;k<=n;k++){const p=f(k/n);o.push(new T.Vector2(Math.max(p[0],.0004),p[1]));}return new T.LatheGeometry(o,seg||56);};
const FAB=new T.MeshStandardMaterial({color:0x464a4f,roughness:.95,bumpMap:WEAVE,bumpScale:.03});   // speaker cloth
const LEDM=new T.MeshBasicMaterial({color:0x7fc4ff,toneMapped:false});
/* ear cup, built around +y = pointing out of the ear (the group is turned so +y becomes +x, mirrored for the left side) */
function makeCup(s){
  const g=new T.Group();g.position.set(s*1.25,0,0);g.scale.x=s;
  const ax=new T.Group();ax.rotation.z=-Math.PI/2;g.add(ax);
  const add=(geo,mat,x,y,z,shadow)=>{const m=new T.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);if(shadow)m.castShadow=true;ax.add(m);return m;};
  /* housing: a soft squircle puck (superellipse profile), frosted body plastic */
  const SQ=3.2,RAD=.58,YC=.015,HH=.165;
  add(lathe(u=>{const f=-Math.PI/2+u*Math.PI,c=Math.cos(f),sn=Math.sin(f);return[RAD*Math.pow(Math.abs(c),2/SQ),YC+HH*Math.sign(sn)*Math.pow(Math.abs(sn),2/SQ)];},44),M.cup,0,0,0,true);
  /* outer cap: slightly domed metal-ish plate with a parting groove around it */
  add(lathe(u=>{const P=[[0,.206],[.15,.2],[.30,.186],[.40,.169],[.435,.15]],f=u*(P.length-1),i=Math.min(P.length-2,Math.floor(f)),t=f-i;return[lerp(P[i][0],P[i+1][0],t),lerp(P[i][1],P[i+1][1],t)];},16,56),M.plate,0,0,0,true);
  const grv=add(new T.TorusGeometry(.447,.011,8,64),M.groove,0,.154,0);grv.rotation.x=Math.PI/2;
  const led=add(new T.TorusGeometry(.31,.016,8,56),LEDM,0,.188,0);led.rotation.x=Math.PI/2;
  add(new T.CylinderGeometry(.085,.085,.012,28),M.dark,0,.204,0);
  /* cushion: fat oval donut in the weave material, with a dark cloth disc visible through the middle */
  const cus=add(new T.TorusGeometry(.355,.13,18,48),M.orange,0,-.205,0,true);cus.rotation.x=Math.PI/2;cus.scale.set(1,1,.82);
  add(new T.CylinderGeometry(.245,.245,.012,36),FAB,0,-.158,0);
  return g;
}
const band=new T.Mesh(arcBand(1.27,.36,Math.PI-.36,.36,.095,.85,64),M.cup);band.castShadow=true;hp.add(band);            // headband shell
const bandPad=new T.Mesh(arcBand(1.175,.62,Math.PI-.62,.3,.14,.9,48),M.orange);bandPad.castShadow=true;hp.add(bandPad);   // soft pad under it
// Bend only the headband toward the muzzle while the cups stay at the ear roots.
// The lower ends remain at the hinges; the crown progressively moves forward.
const hpBandRest=[band,bandPad].map(m=>new Float32Array(m.geometry.attributes.position.array));
function hpSetBandLean(lean){
  [band,bandPad].forEach((mesh,i)=>{
    const attr=mesh.geometry.attributes.position,base=hpBandRest[i];
    for(let j=0;j<attr.count;j++){
      const o=j*3,top=clamp((base[o+1]-.43)/.8,0,1);
      attr.array[o+2]=base[o+2]+lean*top*top;
    }
    attr.needsUpdate=true;mesh.geometry.computeVertexNormals();
    mesh.geometry.computeBoundingSphere();
  });
}
[-1,1].forEach(s=>{
  hp.add(makeCup(s));
  const hg=new T.Mesh(rrBox(.2,.36,.24,.06,.025),M.metal);hg.position.set(s*1.172,.52,0);hg.rotation.z=s*.37;hg.castShadow=true;hp.add(hg);   // hinge/slider where the band tucks into the cup
});
/* strain-relief boot on the right cup: the cable leaves here */
const boot=new T.Mesh(new T.CylinderGeometry(.085,.055,.22,20),M.dark);boot.position.set(1.25,-.66,0);boot.castShadow=true;hp.add(boot);
hp.rotation.set(.12,.5,0);
/* where the cable leaves the model (after the model's own tilt), in the unscaled headphone frame: the physics anchor and the first cable node are placed here */
hp.updateMatrix();
const PORT=new T.Vector3(1.25,-.76,0).applyMatrix4(hp.matrix);



