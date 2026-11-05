/* ---------- desktop-pet mode: settings ----------
   ?pet=full   the whole scene on a transparent background (player, remote, shelf, dog ...)
   ?pet=mini   only the dog plus a small control bar (the lightest option)
   &quality=eco|balanced|smooth   frame-rate cap, pixel ratio, shadows (see presets below)
   Without ?pet= nothing in this block changes behaviour: PET.on is false and every pet hook is skipped.
   The runtime (hit testing, control bar, commands from the desktop shell) lives in src/17-pet. */
/* Chrome-extension mode (&ext=1): the page lives in an iframe that the extension floats over the page you are reading.
   The extension hands over a private MessagePort (so the host page cannot listen in); everything goes through it:
   page -> extension  ign (click-through), ls (saved data), state (what is playing), dog, hide
   extension -> page  init, move (pointer over the iframe while it is click-through), cmd, activate */
function petExtBridge(){
  const q=[];let port=null;
  const B={platform:'ext',in:null,
    post(m){if(port)port.postMessage(m);else q.push(m);},
    setIgnore(b){B.post({chp:'ign',v:!!b});},hide(){B.post({chp:'hide'});},onCmd(){},
    attach(p,onInit){port=p;p.onmessage=e=>{const m=e.data||{};if(m.t==='init')onInit(m);else if(B.in)B.in(m);};q.splice(0).forEach(m=>p.postMessage(m));}};
  return B;
}
const PET=(()=>{
  const q=new URLSearchParams(location.search),m=q.get('pet'),on=m==='full'||m==='mini';   // the window is transparent: only the player (and the dog, if called) float over the desktop. &card=1 puts them on a rounded grey-white card instead
  const P={on,card:on&&q.get('card')==='1',mini:m==='mini',perch:on&&m==='full'&&q.get('perch')!=='0',noRemote:on&&m==='full',layout:m==='mini'?'mini':'full',quality:'balanced',
    fps:30,idleFps:15,dpr:1.5,shadow:false,       // active frame-rate cap, cap while nobody is interacting, max pixel ratio, real shadows
    idleAfter:8000,                                // ms without pointer activity before the idle frame rate is used
    paused:false,lastAct:performance.now(),lastRender:0,timer:0,
    bridge:window.petBridge||(on&&q.get('ext')==='1'?petExtBridge():null),ext:on&&q.get('ext')==='1',wantDog:false,initState:null,saveT:0,                 // present only inside the desktop shell (see desktop/preload.js)
    ignore:null,hold:false,hx:-1,hy:-1,wantHit:false,over:false,ovFrame:false,uiT:0,cur:-1,
    miniD:9.5,miniUp:1.0,fullD:14.6,embed:on&&q.get('embed')==='1'};                          // camera: mini distance and aim height above the floor; fullD = closest distance for the full layout (a small upright window shows the whole player plus the dog on top)
  P.presets={eco:{fps:20,idleFps:8,dpr:1,shadow:false},balanced:{fps:30,idleFps:15,dpr:1.5,shadow:false},smooth:{fps:60,idleFps:30,dpr:2,shadow:true}};
  P.setQuality=n=>{const p=P.presets[n];if(!p)return false;P.quality=n;Object.assign(P,p);return true;};
  if(on)P.setQuality(P.presets[q.get('quality')]?q.get('quality'):'balanced');
  if(q.get('md')>0)P.miniD=+q.get('md');if(q.get('mu')!==null&&q.get('mu')!==''&&isFinite(+q.get('mu')))P.miniUp=+q.get('mu');   // camera tuning for the mini layout: &md=distance &mu=aim height above the floor
  return P;
})();
if(PET.ext&&PET.bridge){   // wait for the extension's handshake: its saved data must be in place before the rest of the app reads it
  const port=await new Promise(res=>{let n=0;const t=setInterval(()=>{if(window.__chpPort||++n>100){clearInterval(t);res(window.__chpPort||null);}},30);});
  if(port){
    const init=await new Promise(res=>{PET.bridge.attach(port,res);setTimeout(()=>res(null),2000);port.postMessage({chp:'hello'});});
    if(init){
      const si=Storage.prototype.setItem,ri=Storage.prototype.removeItem;
      try{Object.keys(init.ls||{}).forEach(k=>si.call(localStorage,k,init.ls[k]));}catch(e){}
      Storage.prototype.setItem=function(k,v){si.call(this,k,v);if(this===localStorage)PET.bridge.post({chp:'ls',k:String(k),v:String(v)});};
      Storage.prototype.removeItem=function(k){ri.call(this,k);if(this===localStorage)PET.bridge.post({chp:'ls',k:String(k),v:null});};
      if(init.settings){if(init.settings.quality)PET.setQuality(init.settings.quality);PET.wantDog=!!init.settings.dog;}
      PET.initState=init.state||null;
    }
  }else PET.bridge=null;   // opened with ext=1 outside the extension: behave like a normal pet page
}
