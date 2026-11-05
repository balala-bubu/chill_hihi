/* ---------- state + layout ---------- */
const L={d:18.3,half:5.25,hw:8.4,top:3.1,shelfC:1.65,shelfB:.9};   // top = world y of the top edge of the screen on the z=0 plane (camera is tilted down)
const TILT_UP=.13,TILT_DN=.08;
const TOPA=Math.atan(TILT_UP+TILT_DN)-FOV/2*Math.PI/180;   // angle of the top edge of the view below horizontal (the camera looks down, so the top of the screen is NOT at +L.half)   // camera looks slightly down so the floor reads as a deep surface the dog can run across
const rig={x:0,y:0,d:18.3,tx:0,ty:0,td:18.3,px:0,py:0,ptx:0,pty:0};
let lidResume=false;   // the lid was opened while playing: shutting it again carries on from the same spot
let state='home',sel=-1,cd=null,cdIn=false,cdAlbum=-1,lidOpen=false,busy=false,camLock=false,zoomed=false,status='empty',volT=0,hpScale=1;
let sx=3,sxTarget=3,sxVel=0,shelfDrag=false;
let hoverKey=-1,hintT=0,wasArmed=false,bayKick=0;
let shelfVis=0,shelfOff=0,topHover=false,shelfPin=false;   // shelf is hidden by default; slides down when the pointer visits the top edge
const _tv=new T.Vector3(),toolsEl=document.getElementById('tools'),popEl=document.getElementById('pop');
let toolsOver=false;
[toolsEl,popEl].forEach(el=>{
  el.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')toolsOver=true;});
  el.addEventListener('pointerleave',()=>{toolsOver=false;});});
/* the shelf stays out while its tools are being used: menu / add form / edit panel open, or the pointer is on them */
function toolsHold(){return toolsOver||!$id('menu').hidden||!$id('addForm').hidden||!$id('editPanel').hidden;}
function shelfWant(){
  if(toolsHold())return 1;
  if(state==='album'||state==='albumOpen'||state==='opening')return 1;
  if(cdAlbum>=0&&albums[cdAlbum]&&albums[cdAlbum].dock)return 1;
  if(cd&&cd.mode==='drag'&&cd.committed&&cdAlbum>=0&&cd.pos.y>L.shelfB-2.8)return 1;   // dragging the CD up to the top reveals the shelf
  return topHover||shelfPin?1:0;
}
const SEL={x:0,y:.5,z:5,s:1.8};
const V3=T.Vector3;

/* ---------- shelf feel ----------
   Slot space: slot i sits at slotX(i-sx) on the shelf (the centred album gets a little extra room), slotD is its inverse.
   Dragging works in slot space: whatever album is under the pointer when you press stays under the pointer (no dead zone, no gain),
   the pointer->shelf mapping runs once per frame (not once per mouse event, so event timing can't make it stutter) and is eased very lightly.
   Letting go keeps the velocity; a critically damped spring settles the shelf into a slot, so a flick glides instead of snapping.
   Hover is also computed in slot space (not from a ray hit on an album), so an album lifting toward the pointer can't flicker its own hover at its edges. */
const SLOT_W=1.42,SLOT_X=.22,SLOT_T=SLOT_W+SLOT_X;
const slotX=d=>{const a=Math.abs(d);return d*SLOT_W+Math.sign(d)*Math.min(a,1)*SLOT_X;};
const slotD=x=>{const a=Math.abs(x);return a<=SLOT_T?x/SLOT_T:Math.sign(x)*(a-SLOT_X)/SLOT_W;};
const SH={centerDwell:.14,centerMove:10,spring:13,follow:38,flickMax:14,flickLead:.2,wheelPx:110,wheelIdle:140,    // spring stiffness, drag smoothing rate, max release speed (slots/s), how far ahead a flick aims (s), wheel px per album, ms of quiet before the wheel settles
  hvLift:.12,hvForward:.5,hvScale:.07,hvTurn:.5,hvTilt:.2,hvTiltX:.15,hvPush:.3,hvSigma:.8};   // hover: lift, forward, scale, how much the turned album faces the camera, tilt toward the pointer (about Y / about X), push on neighbours, push reach
const shPtr={x:0,y:0,ok:false,armed:true,fx:0,fy:0,dIdx:-1,dT:0};                     // last mouse position over the canvas (touch has no hover)
const shHov={u:0,w:0,wx:0,wy:0};                      // slot coordinate under the pointer (eased), how strongly the pointer is "on" the shelf (0..1), pointer on the shelf plane
let wheelT=0,wheelLive=false,wheelFrom=0;
const sRay=new T.Raycaster(),sNdc=new T.Vector2(),sPlane=new T.Plane(new V3(0,0,1),0),sHit=new V3();
function shelfWorld(cx,cy){   // screen -> point on the shelf plane (z=0). own raycaster, so the shared pointer ray used by picking is never disturbed
  sNdc.set(cx/innerWidth*2-1,-(cy/innerHeight)*2+1);sRay.setFromCamera(sNdc,cam);return sRay.ray.intersectPlane(sPlane,sHit)?sHit:null;}
const hoverBell=dd=>{const h=clamp(1-Math.abs(dd)/.9,0,1);return h*h*(3-2*h);};   // 1 under the pointer, fading to 0 one slot away
const hoverPush=i=>{const dd=i-shHov.u;return shHov.w*dd*Math.exp(-dd*dd/(2*SH.hvSigma*SH.hvSigma))*SH.hvPush;};   // neighbours make room: pushed away from the pointer, nothing right under it
var physOn=false;
function layout(){
  const a=innerWidth/innerHeight;L.d=baseD();L.half=L.d*TANH;L.hw=L.half*a;
  L.top=L.d*(TILT_UP-Math.tan(TOPA));L.shelfC=Math.min(L.top-1.45,4.4);L.shelfB=L.shelfC-.75;shelf.position.y=L.shelfB-.07;shelfBack.position.y=L.shelfB-.07+BACK_H/2;shelfShade.position.y=L.shelfB-.14-SHADE_H/2;
  hpScale=clamp((L.hw-2.1)/3.6,.35,1);
  renderer.setSize(innerWidth,innerHeight);if(dogOverlayRenderer)dogOverlayRenderer.setSize(innerWidth,innerHeight);cam.aspect=a;cam.updateProjectionMatrix();
  if(physOn)buildBounds();
}
layout();rig.d=rig.td=L.d;
addEventListener('resize',layout);

const shelfHint=document.getElementById('shelfHint');
shelfHint.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')topHover=true;});
shelfHint.addEventListener('click',()=>{shelfPin=!shelfPin;});   // touch screens have no hover: tap the pill to pull the shelf down

