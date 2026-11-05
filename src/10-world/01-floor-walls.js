/* ====================================================================
   PHYSICS WORLD (matter-js): floor, floating player, remote, headphones + cable, TV
   World unit -> matter px:  x*100, y*-100.  Bodies live in the xy plane; z is only used for draw order.
   ==================================================================== */
const PHYS=!!window.Matter;
const PXU=100,mxp=x=>x*PXU,myp=y=>-y*PXU,DT_MS=1000/180;
const CAT={floor:1,rope:2,hp:4,tv:8,rem:16,player:32};
const wrapA=a=>{a=(a+Math.PI)%TAU;if(a<0)a+=TAU;return a-Math.PI;};
const {Engine,Bodies,Body,Composite,Constraint,Events}=PHYS?window.Matter:{};
const G0=.0016;let zeroG=false,shakeT=0,camShake=0,physAcc=0;
const eng=PHYS?Engine.create({positionIterations:16,velocityIterations:12,constraintIterations:12}):null;
if(PHYS){eng.gravity.x=0;eng.gravity.y=1;eng.gravity.scale=G0;}
const wld=PHYS?eng.world:null;
const waitFor=(fn,ms)=>new Promise(res=>{const t0=performance.now(),id=setInterval(()=>{const ok=fn();if(ok||performance.now()-t0>ms){clearInterval(id);res(ok);}},30);});
const bodyWorld=b=>({x:b.position.x/PXU,y:-b.position.y/PXU});

/* ---------- floor, walls, the (static) player body ---------- */
const floorMesh=new T.Mesh(new T.BoxGeometry(160,12,16),new T.MeshStandardMaterial({color:0xe4e6e8,roughness:.9}));floorMesh.receiveShadow=true;floorMesh.position.z=3.8;scene.add(floorMesh);
let floorB=null,wallL=null,wallR=null,playerB=null;
function buildBounds(){
  FLOOR_Y=PY-PH/2-.8;floorMesh.position.y=FLOOR_Y-6;
  if(!PHYS)return;
  [floorB,wallL,wallR].forEach(b=>b&&Composite.remove(wld,b));
  const W=L.hw-.15,f={isStatic:true,friction:.9,restitution:.1,collisionFilter:{category:CAT.floor,mask:0xffff}};
  floorB=Bodies.rectangle(0,myp(FLOOR_Y)+250,mxp(W)*2+4000,500,f);
  wallL=Bodies.rectangle(-mxp(W)-250,0,500,24000,f);wallR=Bodies.rectangle(mxp(W)+250,0,500,24000,f);
  Composite.add(wld,[floorB,wallL,wallR]);
  if(!playerB){playerB=Bodies.rectangle(0,myp(PY),PW*PXU,PH*PXU,{isStatic:true,chamfer:{radius:36},friction:.6,collisionFilter:{category:CAT.player,mask:0xffff}});Composite.add(wld,playerB);}
  dynBodies().forEach(b=>{const lim=mxp(W)-60;if(Math.abs(b.position.x)>lim)Body.setPosition(b,{x:clamp(b.position.x,-lim,lim),y:b.position.y});});
}
/* soft contact shadows: floating things cast a blurred patch on the floor that fades with height */
const blobTex=mkTex(128,128,(x,w)=>{const g=x.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2);g.addColorStop(0,'rgba(40,44,50,.6)');g.addColorStop(1,'rgba(40,44,50,0)');x.fillStyle=g;x.fillRect(0,0,w,w);});
function mkBlob(){const m=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false,toneMapped:false,opacity:0}));m.rotation.x=-Math.PI/2;m.renderOrder=1;m.visible=false;scene.add(m);return m;}
function placeBlob(m,x,z,w,d,h){const k=clamp(1-h/3.6,0,1);m.visible=k>.02;if(!m.visible)return;m.position.set(x,FLOOR_Y+.012,z);m.scale.set(w*(1+h*.1),d*(1+h*.1),1);m.material.opacity=.9*k;}
const blobPlayer=mkBlob(),blobRem=mkBlob(),blobHp=mkBlob(),blobTv=mkBlob();

