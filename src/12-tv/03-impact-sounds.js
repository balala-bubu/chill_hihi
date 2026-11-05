/* ---------- impact sounds ---------- */
let lastHit=0;
if(PHYS)Events.on(eng,'collisionStart',ev=>{
  const now=performance.now();
  for(const p of ev.pairs){
    const A=p.bodyA.parent||p.bodyA,B=p.bodyB.parent||p.bodyB,other=A===tv.b?B:(B===tv.b?A:null);
    if(tv.b&&other&&other===floorB&&tv.state==='falling'&&!tv.landed){tvLanded();continue;}
    if(now-lastHit<90)continue;
    const dyn=[rem.body,hpState.body,tv.b],involved=dyn.find(d=>d&&(A===d||B===d));if(!involved)continue;
    const v=Math.hypot(involved.velocity.x,involved.velocity.y);
    if(involved===tv.b){if(v>2.2){lastHit=now;Au.crash(clamp(v/9,.3,1));}}
    else if(v>2.4){lastHit=now;Au.click(involved===rem.body?.9:.6,clamp(v/10,.25,.9));}
  }
});

