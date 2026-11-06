/* ---------- remote effects ---------- */
Object.assign(Au,{
 crash(g){if(!this.ensure())return;const t=this.ctx.currentTime;g=g||1;this.tone(62,t,.09,'sine',.85*g,this.sfx,.002,.32);this.tone(130,t,.05,'triangle',.4*g,this.sfx,.002,.2);this.hit(t,.24,650,.5*g,'lowpass',this.sfx);this.hit(t+.015,.05,3400,.16*g,'bandpass',this.sfx);},
 rumble(){if(!this.ensure())return;const c=this.ctx,t=c.currentTime,s=c.createBufferSource(),f=c.createBiquadFilter(),e=c.createGain();s.buffer=this.noise;f.type='lowpass';f.frequency.value=220;e.gain.setValueAtTime(.0001,t);e.gain.linearRampToValueAtTime(.5,t+.06);e.gain.exponentialRampToValueAtTime(.0001,t+.9);s.connect(f);f.connect(e);e.connect(this.sfx);s.start(t);s.stop(t+1);}
});
function shakeWorld(){
  Au.rumble();shakeT=.9;camShake=.9;
  dynBodies().forEach(b=>{Body.setVelocity(b,{x:b.velocity.x+(Math.random()-.5)*7,y:b.velocity.y-3.5-Math.random()*4});Body.setAngularVelocity(b,(Math.random()-.5)*.07);});
  hpState.rope.forEach(b=>Body.setVelocity(b,{x:b.velocity.x+(Math.random()-.5)*4,y:b.velocity.y-2-Math.random()*3}));
}
function remoteFx(i){
  Au.ensure();
  if(i===0)tvToggle();
  else if(i===1)shakeWorld();
  else if(i===2)btButton();
  else if(i===3){
    dogToggle();
  }
  else if(i===4)clockToggle();   // 05-clock.js
}

