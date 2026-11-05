/* ---------- renderer ---------- */
const stage=document.getElementById('stage');
let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch(e){document.getElementById('err').hidden=false;return;}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);
/* Render only the dog and its worn accessories over the embedded TV video.
   The main 3D scene stays below the iframe; all pointer input stays on the main canvas. */
let dogOverlayRenderer=null;
const dogOverlayCam=new T.PerspectiveCamera(32,1,.1,200);
try{
  dogOverlayRenderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  dogOverlayRenderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  dogOverlayRenderer.outputColorSpace=renderer.outputColorSpace;
  dogOverlayRenderer.toneMapping=renderer.toneMapping;
  dogOverlayRenderer.toneMappingExposure=renderer.toneMappingExposure;
  dogOverlayRenderer.setClearColor(0x000000,0);
  const overlay=dogOverlayRenderer.domElement;
  overlay.style.cssText='position:fixed;inset:0;z-index:5;pointer-events:none;display:none;';
  overlay.setAttribute('aria-hidden','true');
  document.body.appendChild(overlay);
}catch(e){dogOverlayRenderer=null;console.warn('Dog foreground renderer unavailable',e);}
const scene=new T.Scene();scene.background=new T.Color(0xd9dbde);
const FOV=32,TANH=Math.tan(FOV/2*Math.PI/180);
const cam=new T.PerspectiveCamera(FOV,1,.1,200);
const baseD=()=>Math.max(18.3,8.6/((innerWidth/innerHeight)*2*TANH));

/* studio reflections */
const pm=new T.PMREMGenerator(renderer);
const envS=new T.Scene();
{/* gradient dome: bright overhead, darker floor, so glossy parts have something to reflect */
  const g=new T.SphereGeometry(20,48,24),pos=g.attributes.position,col=new Float32Array(pos.count*3);
  const top=new T.Color(0xaeb3b8),mid=new T.Color(0x8d9195),bot=new T.Color(0x666a6f),c=new T.Color();
  for(let i=0;i<pos.count;i++){const y=pos.getY(i)/20;if(y>=0)c.copy(mid).lerp(top,Math.pow(y,.8));else c.copy(mid).lerp(bot,Math.pow(-y,.8));col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;}
  g.setAttribute('color',new T.BufferAttribute(col,3));envS.add(new T.Mesh(g,new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide})));}
function soft(w,h,x,y,z,k){const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(k,k,k),side:T.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);envS.add(m);}
soft(14,8,-8,10,10,3.4);soft(10,10,12,2,8,1.7);soft(22,3,0,-9,6,1.2);soft(6,14,-12,0,-4,1.5);
soft(3,12,14,2,-5,2.3);soft(18,2.4,-2,12,4,2.4);   // edge strips: thin bright lines along bevels
scene.environment=pm.fromScene(envS,.04).texture;

const sun=new T.DirectionalLight(0xfff4e8,1.25);
sun.position.set(-6,10,14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:1,far:50});
sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;
const fill=new T.DirectionalLight(0xdbe6ff,.4);fill.position.set(9,-3,12);   // cool fill from the opposite side: warm/cool split on the bevels
scene.add(sun,fill,new T.HemisphereLight(0xffffff,0x9a9ea3,.55));

