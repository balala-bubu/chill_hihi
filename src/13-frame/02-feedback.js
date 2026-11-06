/* ---------- per-frame feedback: key glow, LED halos, drop-zone hint, bay light, CD sheen ---------- */
const KEY_TINT=new T.Color(0xf2a47c);
function updateFx(dt,time){
  for(let i=0;i<keys.length;i++){
    keyGlow[i]*=Math.exp(-dt*4.5);
    /* the keys are near-white, so emissive would just clip: tint the key towards a warm peach instead */
    const hv=hoverKey===i&&!busy?.22:0,km=keyMats[i];
    if(!km.userData.base)km.userData.base=km.color.clone();
    km.color.copy(km.userData.base).lerp(KEY_TINT,clamp(keyGlow[i]*.7+hv,0,1));
  }
  for(let i=0;i<10;i++){
    const g=ledGlow[i],on=i<Au.vol?1:0;ledFlash[i]*=Math.exp(-dt*5);
    g.userData.v+=(on-g.userData.v)*(1-Math.exp(-dt*14));
    g.material.opacity=Math.min(1,g.userData.v*.26+ledFlash[i]*.6);
  }
  const near=!!(cd&&cd.mode==='drag'&&cd.committed&&lidOpen&&!cdIn);
  const dB=near?Math.hypot(cd.pos.x-BAY.x,cd.pos.y-BAY.y):99,armed=near&&dB<1.8;
  hintT+=((near?clamp((4.4-dB)/2.8,0,1):0)-hintT)*(1-Math.exp(-dt*9));
  hint.material.opacity=hintT*(armed?.8+.2*Math.sin(time*10):.4);
  hint.scale.setScalar(armed?1.03+.02*Math.sin(time*10):1);
  if(armed&&!wasArmed){Au.click(1.7,.45);buzz(8);}
  wasArmed=armed;
  bayKick*=Math.exp(-dt*7);
  const bt=(status==='playing'?.32:0)+hintT*(armed?.6:.35)+bayKick;
  bayLight.position.set(BAY.x,BAY.y,FZ+1.4);
  bayLight.intensity+=(bt-bayLight.intensity)*(1-Math.exp(-dt*6));
  if(burst.t<burst.dur){
    burst.t+=dt;const k=clamp(burst.t/burst.dur,0,1),eo=ease.out3(k);
    burstRing.visible=burstFlash.visible=true;
    burstRing.scale.setScalar(.86+eo*.75);burstRing.material.opacity=(1-k)*(1-k)*.95;
    burstFlash.scale.setScalar(.9+eo*.35);burstFlash.material.opacity=Math.pow(1-k,2.2)*.8;
    sparks.forEach(p=>{const r=.55+eo*p.s*.9;p.m.visible=true;p.m.position.set(Math.cos(p.a)*r,BAYY+Math.sin(p.a)*r,FZ+.11);
      p.m.rotation.z=p.a+k*3;p.m.scale.setScalar(1-k*.7);p.m.material.opacity=(1-k)*(k<.08?k/.08:1);});
  }else if(burstRing.visible){burstRing.visible=burstFlash.visible=false;sparks.forEach(p=>{p.m.visible=false;});}
  if(cd&&cd.rb){
    const sp=Math.min(1,Math.abs(cd.spin)/9),m=cd.rb.material;
    m.opacity+=((.15+.3*sp)-m.opacity)*(1-Math.exp(-dt*6));
    cd.rb.rotation.z=-cd.root.rotation.y*2.2+cd.root.rotation.x*1.6+time*.25*sp;
  }
}

