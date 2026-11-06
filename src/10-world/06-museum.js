/* ---------- museum background (remote button "BG", mode 3) ----------
   Third background after the meadow (04-scenery.js) and the cafe (05-cafe.js); the state machine is bgSet in 04-scenery.js.
   The hall is models/museum.json (from models/museum/src/dinos2.obj, built by tools/build_museum.py, textures models/museum/*.png): a painted wall at the back with fossil plaques,
   a staircase up to a gallery on the left, and the big skeletons (apatosaurus at the back, mammoth + sabre-tooth to the right, a pterosaur on the left).
   Room units are the original model units (hall x -160..160 around the centre line, wall height 252, painted wall = z 0, front of the hall = z 318, gallery y 84).
   MU.zb = world z of the painted wall (worked out in muLayout so that the hall's front edge is at MU.front); the room is scaled (MU.s) so the whole model is as wide as the window at that depth (so a 16:9 window shows it like the preview),
   and the back wall / floor continue sideways, upwards and towards the camera for any other window shape. The big skeletons stand BEHIND the player: the player stands at z = FLOOR_Z in front. */
const MU={s:.1,zb:-40,front:-3,fit:.5,pitch:.1,ready:false,job:null,g:new T.Group(),room:new T.Group(),hk:'',shadow:null};
MU.g.visible=false;MU.g.add(MU.room);scene.add(MU.g);
async function muBuild(){
  if(MU.ready)return;if(MU.job)return MU.job;
  MU.job=(async()=>{
    const mj=await fetch('models/museum.json').then(r=>{if(!r.ok)throw new Error('museum '+r.status);return r.json();});
    const ld=new T.TextureLoader(),R=MU.room,TX={};
    const tx=(n,rep)=>{const k=n+(rep?'r':'');if(TX[k])return TX[k];const t=ld.load('models/museum/'+n+'.png');t.colorSpace=T.SRGBColorSpace;t.magFilter=T.NearestFilter;t.minFilter=T.NearestMipmapLinearFilter;
      t.wrapS=t.wrapT=rep?T.RepeatWrapping:T.ClampToEdgeWrapping;t.anisotropy=4;return TX[k]=t;};   // pixel art: crisp when big, mip-mapped when far
    /* while the grey cloth is being drawn up / down, the hall shows only BELOW the cloth's edge (same edge as in bgPatchCurtain), so the parts of the hall that stand in front of the grey wall never poke through it */
    const mb=(map,o)=>{const m=new T.MeshBasicMaterial(Object.assign({map,alphaTest:.4,side:T.DoubleSide,toneMapped:false},o||{}));
      m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,BG.cu);
        sh.fragmentShader=sh.fragmentShader.replace('void main() {','uniform float uK,uT,uFold;uniform vec2 uRes;\nvoid main() {')
          .replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nfloat cuX=gl_FragCoord.x/uRes.x,cuY=gl_FragCoord.y/uRes.y;\nfloat cuHem=uK+(sin(cuX*9.0+uT*1.2)*.016+sin(cuX*23.0-uT*.9)*.007+sin(cuX*3.1+uT*.5)*.02)*uFold;\nif(cuY>=cuHem)discard;');};
      m.customProgramCacheKey=()=>'mucurtain';return m;};
    mj.meshes.forEach(m=>{
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(m.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(m.u,2));g.setIndex(m.i);
      const rep=/^tex_(floor2F|wallB1|circle|etc|tesuri|table)$/.test(m.tex);
      const win=m.tex==='tex_window',me=new T.Mesh(g,mb(tx(m.tex,rep),win?{alphaTest:0,transparent:true,blending:T.AdditiveBlending,depthWrite:false}:{}));
      if(win)me.renderOrder=-1;R.add(me);});
    /* continuations: the back wall (left / right / above) and the floor (under the hall and towards the camera), so any window shape is filled */
    const W=1500,zw=-66,quad=(x0,x1,y0,y1,z0,z1,uv)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([x0,y0,z1,x1,y0,z1,x1,y1,z0,x0,y1,z0],3));
      g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex([0,1,2,0,2,3]);return g;};
    const wm=mb(tx('tex_wallB1',1)),wu=x=>x/64;
    [[-W,-224],[224,W]].forEach(([a,b])=>{const me=new T.Mesh(quad(a,b,0,252,zw,zw,[wu(a),0,wu(b),0,wu(b),3,wu(a),3]),wm);me.renderOrder=-3;R.add(me);});
    const top=new T.Mesh(quad(-W,W,252,900,zw,zw,[wu(-W),2.99,wu(W),2.99,wu(W),2.99,wu(-W),2.99]),wm);top.position.z=-.01;top.renderOrder=-3;R.add(top);   // above the wall: its top band, stretched
    const fl=new T.Mesh(quad(-W,W,0,0,318,1200,[-W/64,(318-130)/64,W/64,(318-130)/64,W/64,(1200-130)/64,-W/64,(1200-130)/64].map((v,i)=>i%2?-v:v)),mb(tx('tex_floor2F',1)));
    {const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-W,-.3,1200,W,-.3,1200,W,-.3,zw,-W,-.3,zw],3));
      g.setAttribute('uv',new T.Float32BufferAttribute([-W/64,1200/64,W/64,1200/64,W/64,(zw+130)/64,-W/64,(zw+130)/64],2));g.setIndex([0,1,2,0,2,3]);fl.geometry=g;}
    fl.renderOrder=-3;R.add(fl);
    /* the player's shadow falls on the floor: an invisible plane that only shows shadows */
    const sh=new T.Mesh(new T.PlaneGeometry(120,50),new T.ShadowMaterial({opacity:.22}));sh.rotation.x=-Math.PI/2;sh.receiveShadow=true;sh.renderOrder=-1;MU.g.add(sh);MU.shadow=sh;
    bgLitInit();muLayout(true);MU.ready=true;
  })().catch(e=>{console.warn('museum failed to load',e);MU.failed=true;MU.job=null;});
  return MU.job;
}
/* place the room: the model is as wide as the window at the painted wall's depth; its floor (y = 0) sits on FLOOR_Y */
function muLayout(force){
  if(!MU.room.children.length)return;const hk=Math.round(L.hw*10)+'|'+Math.round(FLOOR_Y*10)+'|'+Math.round(L.d*10);if(!force&&hk===MU.hk)return;MU.hk=hk;
  const k=L.hw/L.d*MU.fit,q=318*2*k/448;   // hall depth 318 units, model width 448 units: s = 2*k*(d-zb)/448, the hall's front edge is at zb+318*s
  MU.zb=Math.min(-8,(MU.front-q*L.d)/(1-q));MU.s=2*k*(L.d-MU.zb)/448;   // push the room back until the front edge of the hall is MU.front (world z), so the player stands in front of the whole hall. MU.fit = how much of the window width the model takes (smaller = further back, more of it can be seen); MU.pitch = the room is tipped back by this angle (rad) to cancel the camera's downward look, so the room is seen from a higher viewpoint, like the preview
  MU.room.scale.setScalar(MU.s);MU.room.rotation.x=MU.pitch;{const dy=-.02,dz=MU.zb-FLOOR_Z,c=Math.cos(MU.pitch),sn=Math.sin(MU.pitch);   // tip the room about the point on the floor where the player stands, so the floor still meets the player's floor there
    MU.room.position.set(0,FLOOR_Y+dy*c-dz*sn,FLOOR_Z+dy*sn+dz*c);}
  if(MU.shadow)MU.shadow.position.set(0,FLOOR_Y-.01,FLOOR_Z);
}
window.__mu={MU,muBuild,muLayout};   // test hook
try{if(BG_OK){const m=+localStorage.getItem('chill_hihi.bg')||0;if(m)bgSet(m,true);}}catch(e){}   // restore the saved background (after all scenes are defined)
