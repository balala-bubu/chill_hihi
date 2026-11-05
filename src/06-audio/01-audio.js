/* ---------- audio: synthesized album loops + sound effects ---------- */
const Au={ctx:null,vol:6,playing:false,elapsed:0,step:0,timer:0,alb:null,pauseLead:0,
 ensure(){
  if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;
   const c=this.ctx=new C();
   this.bus=c.createGain();this.lp=c.createBiquadFilter();this.lp.type='lowpass';this.lp.frequency.value=7200;
   this.master=c.createGain();this.comp=c.createDynamicsCompressor();this.sfx=c.createGain();this.sfx.gain.value=.9;
   this.pad=c.createGain();this.padLP=c.createBiquadFilter();this.padLP.type='lowpass';this.padLP.frequency.value=1300;
   this.dly=c.createDelay(1);this.dly.delayTime.value=.36;this.fb=c.createGain();this.fb.gain.value=.34;this.dlp=c.createBiquadFilter();this.dlp.type='lowpass';this.dlp.frequency.value=2200;this.wet=c.createGain();this.wet.gain.value=.3;
   this.pad.connect(this.padLP);this.padLP.connect(this.bus);
   this.bus.connect(this.lp);this.lp.connect(this.master);
   this.bus.connect(this.dly);this.dly.connect(this.dlp);this.dlp.connect(this.fb);this.fb.connect(this.dly);this.dlp.connect(this.wet);this.wet.connect(this.master);
   this.master.connect(this.comp);this.sfx.connect(this.comp);this.comp.connect(c.destination);
   const nb=c.createBuffer(1,c.sampleRate,c.sampleRate),d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.noise=nb;
   this.setVol(this.vol);
  }
  if(this.ctx.state==='suspended')this.ctx.resume();return true;},
 setVol(v){this.vol=v;YTA.setVol(v);if(this.master)this.master.gain.setTargetAtTime(Math.pow(v/10,1.7)*.9,this.ctx.currentTime,.03);},
 f(m){return 440*Math.pow(2,(m-69)/12);},
 tone(freq,t,dur,type,g,dest,a,r){const c=this.ctx,o=c.createOscillator(),e=c.createGain();o.type=type;o.frequency.value=freq;a=a||.008;r=r||.2;
  e.gain.setValueAtTime(0,t);e.gain.linearRampToValueAtTime(g,t+a);e.gain.exponentialRampToValueAtTime(.0001,t+dur+r);o.connect(e);e.connect(dest);o.start(t);o.stop(t+dur+r+.05);},
 hit(t,dur,fc,g,type,dest){const c=this.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),e=c.createGain();s.buffer=this.noise;f.type=type;f.frequency.value=fc;
  e.gain.setValueAtTime(g,t);e.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(e);e.connect(dest);s.start(t,Math.random()*.5);s.stop(t+dur+.02);},
 kick(t,dest){const c=this.ctx,o=c.createOscillator(),e=c.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.13);
  e.gain.setValueAtTime(.8,t);e.gain.exponentialRampToValueAtTime(.0001,t+.34);o.connect(e);e.connect(dest);o.start(t);o.stop(t+.4);},
 sched(s,t){
  const a=this.alb,bar=this.bar,ch=a.prog[bar%4],r=a.root,sd=60/a.bpm/4,R=this.rand;
  if(s%2)t+=sd*.16;
  if(s===0)ch.forEach((n,i)=>this.tone(this.f(r+n),t+i*.012,sd*15,'sawtooth',.045,this.pad,.4,.9));
  if(s===0||s===10)this.tone(this.f(r+ch[0]-12),t,sd*(s?3:8),'sine',.34,this.bus,.01,.25);
  if(s===6&&bar%2)this.tone(this.f(r+ch[2]-12),t,sd*2,'sine',.22,this.bus,.01,.2);
  if(s===0||s===8||(s===11&&bar%2))this.kick(t,this.bus);
  if(s===4||s===12)this.hit(t,.13,1900,.3,'bandpass',this.bus);
  if(s%2===0)this.hit(t,.035,7500,s%4?.07:.12,'highpass',this.bus);
  if(s===14)this.hit(t,.14,6500,.07,'highpass',this.bus);
  if(s%2===0&&R()>.22){const oct=[12,12,24][(R()*3)|0];this.tone(this.f(r+ch[(R()*4)|0]+oct),t,sd*1.4,a.lead,.075,this.bus,.006,.35);}
  if(s===15)this.bar++;
 },
 tick(){const c=this.ctx;while(this.next<c.currentTime+.16){this.sched(this.step,this.next);this.next+=60/this.alb.bpm/4;this.step=(this.step+1)%16;}},
 start(alb){if(alb.yt){this.ensure();this.alb=alb;this.elapsed=0;this.playing=true;YTA.start(alb);return;}if(!this.ensure())return;this.alb=alb;this.step=0;this.bar=0;this.elapsed=0;this.rand=rng(alb.seed*7+3);this.pauseLead=0;this.resume();},
 resume(){if(this.alb&&this.alb.yt){this.playing=true;YTA.resume();return;}if(!this.ctx)return;const n=this.ctx.currentTime;this.next=n+Math.max(.035,this.pauseLead||.06);this.pauseLead=0;this.playing=true;this.bus.gain.cancelScheduledValues(n);this.bus.gain.setTargetAtTime(1,n,.02);clearInterval(this.timer);this.timer=setInterval(()=>this.tick(),25);},
 pause(){if(this.alb&&this.alb.yt){if(this.playing){this.playing=false;YTA.pause();this.elapsed=YTA.pausedAt??this.elapsed;}return;}if(!this.ctx||!this.playing)return;this.playing=false;clearInterval(this.timer);const n=this.ctx.currentTime;this.pauseLead=Math.max(.035,this.next-n);this.bus.gain.setTargetAtTime(0,n,.03);},
 stop(){if(this.alb&&this.alb.yt){this.playing=false;this.elapsed=0;YTA.cur=null;YTA.pausedAt=null;YTA.call('stopVideo');return;}this.pause();this.step=0;this.bar=0;this.pauseLead=0;this.elapsed=0;},
 skipNext(){if(!this.alb)return;if(this.alb.yt){YTA.next();this.elapsed=0;this.playing=true;return;}
   /* A synthesized album has four musical phrases, so skip to the next phrase. */
   if(!this.ensure())return;this.bar=(this.bar+1)%4;this.step=0;
   const phrase=60/this.alb.bpm*4;this.elapsed=(Math.floor(this.elapsed/phrase)+1)*phrase;
   if(this.playing){this.next=this.ctx.currentTime+.06;this.bus.gain.setTargetAtTime(1,this.ctx.currentTime,.02);}
 },
 /* sound effects */
 click(p,g){if(!this.ensure())return;const t=this.ctx.currentTime;this.tone(2300*(p||1),t,.012,'square',.09*(g||1),this.sfx,.001,.03);this.hit(t,.025,4200,.22*(g||1),'highpass',this.sfx);},
 snap(){if(!this.ensure())return;const t=this.ctx.currentTime;this.tone(1500,t,.01,'square',.12,this.sfx,.001,.04);this.hit(t,.04,3200,.4,'bandpass',this.sfx);this.tone(170,t,.05,'sine',.4,this.sfx,.002,.1);},
 /* heavier layer for a disc slamming into the bay: pitch-dropping sub thump + low noise body + a bright tick on top */
 smash(){if(!this.ensure())return;const c=this.ctx,t=c.currentTime,o=c.createOscillator(),e=c.createGain();
  o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(48,t+.16);e.gain.setValueAtTime(.55,t);e.gain.exponentialRampToValueAtTime(.0001,t+.28);
  o.connect(e);e.connect(this.sfx);o.start(t);o.stop(t+.3);this.hit(t,.09,900,.3,'lowpass',this.sfx);this.tone(2600,t,.012,'square',.07,this.sfx,.001,.05);},
 thunk(){if(!this.ensure())return;const t=this.ctx.currentTime;this.tone(120,t,.04,'sine',.5,this.sfx,.002,.12);this.hit(t,.03,2400,.25,'bandpass',this.sfx);this.tone(1900,t+.02,.01,'square',.06,this.sfx,.001,.03);},
 whoosh(){if(!this.ensure())return;const c=this.ctx,t=c.currentTime,s=c.createBufferSource(),f=c.createBiquadFilter(),e=c.createGain();s.buffer=this.noise;f.type='bandpass';f.Q.value=.8;
  f.frequency.setValueAtTime(500,t);f.frequency.exponentialRampToValueAtTime(2600,t+.35);e.gain.setValueAtTime(.0001,t);e.gain.linearRampToValueAtTime(.16,t+.12);e.gain.exponentialRampToValueAtTime(.0001,t+.45);
  s.connect(f);f.connect(e);e.connect(this.sfx);s.start(t);s.stop(t+.5);},
 slide(){if(!this.ensure())return;const c=this.ctx,t=c.currentTime,s=c.createBufferSource(),f=c.createBiquadFilter(),e=c.createGain();s.buffer=this.noise;f.type='lowpass';f.frequency.value=900;
  e.gain.setValueAtTime(.0001,t);e.gain.linearRampToValueAtTime(.07,t+.4);e.gain.exponentialRampToValueAtTime(.0001,t+1.6);s.connect(f);f.connect(e);e.connect(this.sfx);s.start(t);s.stop(t+1.7);}
};

