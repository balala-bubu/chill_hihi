/* ---------- display + key + led state ---------- */
const fmt=s=>{s=Math.floor(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
let dispSig='';
function drawDisplay(){
  const a=cd&&(cdIn||status!=='empty')?ALBUMS[cd.ai]:null;
  let l1='MT-1',l2='NO DISC';
  if(a){l1=a.yt?((YTA.inf.n?(YTA.inf.i+1)+'/'+YTA.inf.n+' ':'')+(YTA.inf.title||a.t)):('SIDE A · '+a.t).slice(0,22);
    if(status==='playing')l2='PLAY '+fmt(Au.elapsed);
    else if(status==='paused')l2=(Math.floor(performance.now()/500)%2?'     ':'PAUSE ')+fmt(Au.elapsed);
    else l2='STOP '+fmt(0);}
  if(volT>0){l1='VOLUME';l2='VOL '+String(Au.vol).padStart(2,'0');}
  const sig=l1+'|'+l2+'|'+status;if(sig===dispSig)return;dispSig=sig;
  dctx.fillStyle='#101112';dctx.fillRect(0,0,384,128);
  dctx.textBaseline='alphabetic';dctx.shadowColor='rgba(150,165,185,.45)';dctx.shadowBlur=6;dctx.font='500 20px '+MONO;dctx.fillStyle='#8d9399';dctx.fillText(fitText(dctx,l1,350),16,36);
  dctx.shadowColor='rgba(190,205,225,.6)';dctx.shadowBlur=11;dctx.font='700 46px '+MONO;dctx.fillStyle='#eff0f1';dctx.fillText(l2,16,98);
  if(status==='playing'){dctx.shadowColor='rgba(238,90,44,.9)';dctx.shadowBlur=12;dctx.fillStyle='#ee5a2c';dctx.fillRect(352,18,16,16);}
  dctx.shadowBlur=0;dctx.shadowColor='transparent';
  dispTex.needsUpdate=true;
}
function updateLeds(){leds.forEach((m,i)=>m.material.color.setHex(i<Au.vol?ACC:OFF));}
let iconState='';
function syncKeys(){const s=status==='playing'?'pause':'play';if(s===iconState)return;iconState=s;keyIcons[0].material.map=tex[s];keyIcons[0].material.needsUpdate=true;}
updateLeds();drawDisplay();syncKeys();
label.position.set(.72,-2.43,FZ+.01);label.visible=true;

