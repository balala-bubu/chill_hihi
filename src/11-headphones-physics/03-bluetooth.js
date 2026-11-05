/* ---------- bluetooth headphones ---------- */
/* The headphones are not always there. They swoop in and plug into the jack when the computer gets Bluetooth headphones (a new audio output),
   and when that output goes away the plug pops out and they reel themselves up off the top of the screen. With nothing connected a disc just plays.
   A web page cannot ask "is Bluetooth connected": it can only list the audio outputs, and only gets their names once the page has a media permission. So:
   named outputs -> a headphone-like name counts; unnamed -> one more output than the fewest ever seen counts (it can't tell Bluetooth from a wired headset). */
let btOn=false,btHave=false,btBusy=false,btBase=null;
const BT_RE=/bluetooth|airpods|buds|earbud|earphone|headphone|headset|hands-?free|beats|wh-\d|wf-\d|藍牙|藍芽|耳機|耳麥/i;
async function btScan(){
  const md=navigator.mediaDevices;if(!md||!md.enumerateDevices)return;
  let list;try{list=await md.enumerateDevices();}catch(_){return;}
  const out=list.filter(d=>d.kind==='audiooutput'&&d.deviceId!=='default'&&d.deviceId!=='communications');
  let on;
  if(out.some(d=>d.label))on=out.some(d=>BT_RE.test(d.label));
  else{btBase=btBase===null?out.length:Math.min(btBase,out.length);on=out.length>btBase;}
  btSet(on);
}
function btSet(on){on=!!on;if(on===btOn)return;btOn=on;btSync();}   // also the test hook: __mt.btSet(true/false)
async function btSync(){   // one at a time: attach and detach never overlap, whatever order the connect / disconnect events come in
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
  navigator.mediaDevices.addEventListener('devicechange',btScan);
  setTimeout(btScan,1200);
}
