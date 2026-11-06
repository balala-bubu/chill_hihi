/* ---------- pixel clock (remote CLK key) ----------
   A DOM widget stuck to the bottom-left of the screen, above the 3D stage. Default is a plain clock; a second mode is a
   pomodoro countdown (focus 25 min / break 5 min). The screen is drawn as real pixels (5x7 digits, 3x5 small text) on a dark
   OLED with a 60-segment ring: seconds in clock mode, time left in pomodoro mode. The glass, grain and key finish are CSS (see #clockW). */
const CK_KEY='chill_hihi.clock';
const ck={on:false,mode:'clock',phase:'focus',focus:25,brk:5,run:false,endAt:0,left:25*60000,flashUntil:0,sig:'',timer:0};
const CK_G5={'0':'01110,10001,10011,10101,11001,10001,01110','1':'00100,01100,00100,00100,00100,00100,01110','2':'01110,10001,00001,00010,00100,01000,11111','3':'11110,00001,00001,01110,00001,00001,11110','4':'00010,00110,01010,10010,11111,00010,00010','5':'11111,10000,11110,00001,00001,10001,01110','6':'00110,01000,10000,11110,10001,10001,01110','7':'11111,00001,00010,00100,01000,01000,01000','8':'01110,10001,10001,01110,10001,10001,01110','9':'01110,10001,10001,01111,00001,00010,01100'};
const CK_G3={'0':'111,101,101,101,111','1':'010,110,010,010,111','2':'111,001,111,100,111','3':'111,001,111,001,111','4':'101,101,111,001,001','5':'111,100,111,001,111','6':'111,100,111,101,111','7':'111,001,010,010,010','8':'111,101,111,101,111','9':'111,101,111,001,111',
 '/':'001,001,010,100,100',':':'000,010,000,010,000','-':'000,000,111,000,000',' ':'000,000,000,000,000',
 A:'111,101,111,101,101',B:'110,101,110,101,110',C:'111,100,100,100,111',D:'110,101,101,101,110',E:'111,100,110,100,111',F:'111,100,110,100,100',H:'101,101,111,101,101',I:'111,010,010,010,111',K:'101,101,110,101,101',M:'101,111,111,101,101',N:'110,101,101,101,101',O:'111,101,101,101,111',P:'111,101,111,100,100',R:'110,101,110,101,101',S:'111,100,111,001,111',T:'111,010,010,010,010',U:'101,101,101,101,111',W:'101,101,111,111,101'};
const CK_DAY=['SUN','MON','TUE','WED','THU','FRI','SAT'];
const ckEl={w:document.getElementById('clockW'),face:document.getElementById('ckFace'),cv:document.getElementById('ckCv'),go:document.getElementById('ckGo'),x:document.getElementById('ckX'),m:document.getElementById('ckM'),p:document.getElementById('ckP'),seg:document.getElementById('ckSeg'),thumb:document.getElementById('ckThumb'),segC:document.getElementById('ckSegC'),segP:document.getElementById('ckSegP'),reset:document.getElementById('ckReset')};
const CK_PLAY='<svg viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>',CK_PAUSE='<svg viewBox="0 0 24 24"><rect x="5" y="4" width="5" height="16" rx="1.4"/><rect x="14" y="4" width="5" height="16" rx="1.4"/></svg>';
const ckCtx=ckEl.cv.getContext('2d'),CK_DPR=Math.min(window.devicePixelRatio||1,2);
ckEl.cv.width=ckEl.cv.height=150*CK_DPR;
function ckDur(){return(ck.phase==='focus'?ck.focus:ck.brk)*60000;}
function ckRemain(){return ck.run?Math.max(0,ck.endAt-Date.now()):ck.left;}
function ckSave(){try{localStorage.setItem(CK_KEY,JSON.stringify({on:ck.on,mode:ck.mode,phase:ck.phase,focus:ck.focus,brk:ck.brk,run:ck.run,endAt:ck.endAt,left:ck.left}));}catch(e){}}
function ckLoad(){try{const o=JSON.parse(localStorage.getItem(CK_KEY)||'null');if(!o)return;
  ck.on=!!o.on;ck.mode=o.mode==='pomo'?'pomo':'clock';ck.phase=o.phase==='break'?'break':'focus';ck.focus=Math.min(90,Math.max(5,o.focus|0||25));ck.brk=Math.min(30,Math.max(1,o.brk|0||5));
  ck.left=Math.min(ckDur(),Math.max(0,+o.left||ckDur()));if(o.run&&+o.endAt>Date.now()){ck.run=true;ck.endAt=+o.endAt;}else if(o.run){ck.left=0;}}catch(e){}}
/* ---- drawing (pixel fonts on the dark OLED) ---- */
function ckTextW(s,g,px,gap){let w=0;for(const c of s){w+=(g===CK_G5?(c===':'?2:5):3)*px+gap;}return w-gap;}
function ckText(x,s,px,gap,x0,y0,col,glow){
  const g=px>2?CK_G5:CK_G3;let cx=x0;ckCtx.fillStyle=col;ckCtx.shadowColor=glow;ckCtx.shadowBlur=px>2?9:5;
  for(const c of s){
    if(g===CK_G5&&c===':'){for(const r of [1,4]){ckCtx.fillRect(cx,y0+r*px,2*px-.8,2*px-.8);}cx+=2*px+gap;continue;}
    const rows=(g[c]||g[' ']||CK_G3[' ']).split(',');
    for(let j=0;j<rows.length;j++)for(let i=0;i<rows[j].length;i++)if(rows[j][i]==='1')ckCtx.fillRect(cx+i*px,y0+j*px,px-.8,px-.8);
    cx+=rows[0].length*px+gap;}
  ckCtx.shadowBlur=0;
}
function ckDraw(){
  const x=ckCtx,now=Date.now(),d=new Date(now),pomo=ck.mode==='pomo',flash=ck.flashUntil>now&&Math.floor(now/500)%2===0;
  x.setTransform(CK_DPR,0,0,CK_DPR,0,0);x.clearRect(0,0,150,150);x.fillStyle='#101112';x.fillRect(0,0,150,150);
  /* ring: 60 segments, 12 o'clock first, clockwise. clock mode = seconds so far; pomodoro = time left (the lit wedge shrinks) */
  const lit=pomo?Math.ceil(60*ckRemain()/ckDur()):d.getSeconds()+1,cx=75,cy=75;
  for(let i=0;i<60;i++){const a=(i/60)*Math.PI*2-Math.PI/2,w=.036,on=i<lit;
    x.beginPath();x.arc(cx,cy,72,a-w,a+w);x.arc(cx,cy,58,a+w,a-w,true);x.closePath();
    if(on){x.fillStyle=pomo?'#ee5a2c':'#8d9399';x.shadowColor=pomo?'rgba(238,90,44,.85)':'rgba(190,205,225,.5)';x.shadowBlur=pomo?7:4;}else{x.fillStyle='#2a2c2f';x.shadowBlur=0;x.shadowColor='transparent';}
    x.fill();}
  x.shadowBlur=0;x.shadowColor='transparent';
  const p2=n=>String(n).padStart(2,'0');let big,small;
  if(pomo){const r=Math.ceil(ckRemain()/1000);big=p2(Math.floor(r/60))+':'+p2(r%60);small=(ck.run?(ck.phase==='focus'?'FOCUS':'BREAK'):(ck.left<ckDur()?'PAUSE':(ck.phase==='focus'?'FOCUS':'BREAK')))+' '+p2(d.getHours())+':'+p2(d.getMinutes());}
  else{big=p2(d.getHours())+':'+p2(d.getMinutes());small=p2(d.getMonth()+1)+'/'+p2(d.getDate())+' '+CK_DAY[d.getDay()];}
  if(!pomo&&d.getMilliseconds()>=500)big=big.replace(':',' ');   // the colon blinks (the pomodoro colon stays solid: it is counting)
  const px=3,gap=3,w1=ckTextW(big,CK_G5,px,gap),w2=ckTextW(small,CK_G3,2,2);
  if(!flash){ckText(x,big,px,gap,Math.round(75-w1/2),52,'#eff0f1','rgba(190,205,225,.6)');}
  ckText(x,small,2,2,Math.round(75-w2/2),88,pomo&&ck.run?'#ee5a2c':'#8d9399','rgba(150,165,185,.45)');
  if(pomo&&ck.run){x.fillStyle='#ee5a2c';x.shadowColor='rgba(238,90,44,.9)';x.shadowBlur=8;x.fillRect(71,108,8,8);x.shadowBlur=0;}   // the same orange "playing" square the player shows
}
function ckUI(){   // buttons follow the state: the selected mode segment stays pressed in, the big key shows what it will do next
  const pomo=ck.mode==='pomo',m=pomo?'p':'c';ckEl.segC.classList.toggle('on',!pomo);ckEl.segP.classList.toggle('on',pomo);
  if(ckEl.seg.dataset.m!==m){ckEl.seg.dataset.m=m;if(ckEl.w.classList.contains('on')){ckEl.thumb.classList.remove('goo');void ckEl.thumb.offsetWidth;ckEl.thumb.classList.add('goo');}}   // the glass thumb slides over and stretches like a droplet
  ckEl.m.disabled=ckEl.p.disabled=!(pomo&&!ck.run);ckEl.reset.disabled=!pomo;
  ckEl.go.innerHTML=ck.run?CK_PAUSE:CK_PLAY;ckEl.go.setAttribute('aria-label',ck.run?'暫停':'開始');ckEl.go.classList.toggle('run',ck.run);
  ckEl.w.classList.toggle('on',ck.on);remLit(4,ck.on);
}
function ckRefresh(){ckUI();ck.sig='';ckTick();}
/* ---- state changes ---- */
function ckChime(){try{if(!Au.ensure())return;const t=Au.ctx.currentTime;[784,988,1319].forEach((f,i)=>Au.tone(f,t+i*.16,.28,'sine',.35,Au.sfx,.004,.5));}catch(e){}}
function ckStart(){if(ck.run)return;if(ck.left<=0)ck.left=ckDur();ck.endAt=Date.now()+ck.left;ck.run=true;}
function ckPause(){if(!ck.run)return;ck.left=ckRemain();ck.run=false;}
function ckReset(){ck.run=false;ck.phase='focus';ck.left=ckDur();ck.flashUntil=0;ckSave();ckRefresh();ckTimer();}
function ckCapTap(){Au.ensure();
  if(ck.mode!=='pomo'){ck.mode='pomo';ckStart();}
  else if(ck.run)ckPause();else ckStart();
  ck.flashUntil=0;ckSave();ckRefresh();}
function ckAdjust(dir){if(ck.mode!=='pomo'||ck.run)return;
  if(ck.phase==='focus')ck.focus=Math.min(90,Math.max(5,ck.focus+dir*5));else ck.brk=Math.min(30,Math.max(1,ck.brk+dir));
  ck.left=ckDur();ckSave();ckRefresh();}
function ckSetMode(m){if(ck.mode===m)return;ck.mode=m;ckSave();ckRefresh();}
function clockToggle(show){const was=ck.on;ck.on=typeof show==='boolean'?show:!ck.on;if(ck.on!==was){if(ck.on)Au.thunk();else Au.click(1.3,.7);}ckSave();ckRefresh();ckTimer();}
function ckTimer(){const need=ck.on||ck.run;if(need&&!ck.timer)ck.timer=setInterval(ckTick,250);else if(!need&&ck.timer){clearInterval(ck.timer);ck.timer=0;}}
function ckTick(){
  if(ck.run&&ckRemain()<=0){   // done: chime, hand over to the other phase and wait for the key (nothing starts by itself)
    ck.run=false;ckChime();ck.phase=ck.phase==='focus'?'break':'focus';ck.left=ckDur();ck.mode='pomo';ck.flashUntil=Date.now()+5000;ckSave();ckTimer();
    ckUI();ck.sig='';}
  if(!ck.on)return;
  const now=Date.now(),sig=ck.mode+(ck.run?'r':'p')+Math.floor(now/(ck.flashUntil>now?500:1000))+'|'+(ck.mode==='clock'?Math.floor(now/500):0)+'|'+ck.left;
  if(sig===ck.sig)return;ck.sig=sig;ckDraw();
}
/* ---- key feel (same as the player's keys: click, buzz, dip, face flash) ---- */
function ckPulse(){ckEl.face.classList.add('hit');clearTimeout(ck.hitT);ck.hitT=setTimeout(()=>ckEl.face.classList.remove('hit'),70);}
ckEl.w.addEventListener('pointerdown',e=>{const b=e.target.closest('button');if(!b)return;Au.click(b===ckEl.go?.85:1.15,1);buzz(7);ckEl.w.classList.add('press');});
['pointerup','pointercancel','pointerleave'].forEach(n=>ckEl.w.addEventListener(n,()=>ckEl.w.classList.remove('press')));
ckEl.w.addEventListener('click',e=>{if(e.target.closest('button'))ckPulse();});
/* ---- events ---- */
ckEl.go.addEventListener('click',()=>{ckCapTap();ckTimer();});
ckEl.reset.addEventListener('click',ckReset);
ckEl.segC.addEventListener('click',()=>ckSetMode('clock'));
ckEl.segP.addEventListener('click',()=>ckSetMode('pomo'));
ckEl.x.addEventListener('click',()=>clockToggle(false));
ckEl.m.addEventListener('click',()=>ckAdjust(-1));
ckEl.p.addEventListener('click',()=>ckAdjust(1));
ckLoad();ckRefresh();ckTimer();
