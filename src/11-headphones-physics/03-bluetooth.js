/* ---------- bluetooth headphones ---------- */
/* The headphones are not always there. They swoop in and plug into the jack when Bluetooth headphones are connected, and when they go away the plug
   pops out and the headphones reel themselves up off the top of the screen. With nothing connected a disc just plays.
   A web page cannot ask "is Bluetooth connected": it can only list the audio outputs, and only sees their names once the page has permission.
   So there are two ways in, and they work together:
   - the remote's headphone key (the BT key) brings the headphones out / sends them away by hand. The first time (Chrome), it opens the browser's
     "choose an output device" picker: pick the AirPods once and the page can read their name and remember them;
   - after that, the output list changing (connecting / disconnecting) does it automatically. Without names it can only count outputs
     (one more than the fewest ever seen counts as connected, so a wired headset triggers it too). */
let btOn=false,btHave=false,btBusy=false,btBase=null,btAuto=false,btForce=null,btLabeled=false,btPick=null;
try{btPick=JSON.parse(localStorage.getItem('chill_bt_pick')||'null');}catch(_){}
const BT_RE=/bluetooth|airpods|buds|earbud|earphone|headphone|headset|hands-?free|beats|wh-\d|wf-\d|藍牙|藍芽|耳機|耳麥/i;
async function btScan(){
  const md=navigator.mediaDevices;if(!md||!md.enumerateDevices)return;
  let list;try{list=await md.enumerateDevices();}catch(_){return;}
  const out=list.filter(d=>d.kind==='audiooutput'&&d.deviceId!=='default'&&d.deviceId!=='communications');
  btLabeled=out.some(d=>d.label);
  if(btLabeled)btAuto=out.some(d=>BT_RE.test(d.label)||(btPick&&d.deviceId===btPick.id));
  else{btBase=btBase===null?out.length:Math.min(btBase,out.length);btAuto=out.length>btBase;}
  btApply();
}
function btApply(){btSet(btForce===null?btAuto:btForce);}
function btSet(on){on=!!on;remLit(2,on);if(on===btOn)return;btOn=on;btSync();}   // also the test hook: __mt.btSet(true/false)
async function btButton(){   // the remote's headphone key
  if(btOn){btForce=false;btApply();return;}
  const md=navigator.mediaDevices;
  if(md&&md.selectAudioOutput&&!btLabeled){   // first time: choose the output (this is also what lets the page read its name)
    try{
      const d=await md.selectAudioOutput(btPick?{deviceId:btPick.id}:undefined);
      btPick={id:d.deviceId,label:d.label};try{localStorage.setItem('chill_bt_pick',JSON.stringify(btPick));}catch(_){}
      await btScan();
    }catch(_){}   // cancelled or refused: the headphones still come out by hand
  }
  btForce=true;btApply();
}
async function btSync(){   // one at a time: attach and detach never overlap, whatever order the events come in
  if(btBusy||!PHYS)return;btBusy=true;
  try{
    await waitFor(()=>physOn,8000);
    while(btHave!==btOn){
      if(btOn){await btAttach();btHave=true;}
      else{await hpRetract();btHave=false;}
    }
  }finally{btBusy=false;}
}
async function btAttach(){
  const h=hpState;
  if(h.s==='none'){hpSpawn();Au.whoosh();await waitFor(hpSettled,3600);await tween(.25,()=>{},ease.lin);}
  if(h.s==='free')await seekPlug();
}
if(navigator.mediaDevices&&navigator.mediaDevices.addEventListener){
  navigator.mediaDevices.addEventListener('devicechange',()=>{btForce=null;btScan();});   // the real state changed: follow it again
  setTimeout(btScan,1200);
}
