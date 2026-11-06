/* ---------- the ball: a toy-row item ("t_ball", models/wardrobe/src/t_ball) ----------
   Pick it on the shelf, click empty space: it drops, bounces and rolls (a round matter-js body in the same small world as the apples, see 02-toys.js).
   With ONE puppy out it plays alone: runs after the ball and either nudges it along the floor with its nose or scoops it up and keeps it in the air with its head (a few headers, then it sends it off again).
   With TWO puppies out they play catch: every hit is a lob to the other puppy, which walks under it, heads it back, and so on. They keep about BALL.S between them.
   After 14-23 seconds a puppy gets bored (25 s) and goes back to its normal things; dropping a new ball wakes them up.
   Dog side: dogFrame calls ballPick() (what should I do?) and, in mode 'ball', ballDog() (animation + the actual hit). Units: world units / seconds; matter velocity is px per 1/60 s, BALL.K converts. */
const BALL={held:null,list:[],R:.5,MAX:3,LIFE:9,K:60/PXU,mats:{},err:0,sndT:0,S:7.4};
const ballG=()=>TOY.eng?TOY.eng.gravity.y*TOY.eng.gravity.scale*1e6/PXU:26;   // gravity in world units per second squared
const ballVel=b=>({x:b.body.velocity.x*BALL.K,y:-b.body.velocity.y*BALL.K});
function ballSpawn(it,x,y){
  if(!PHYS||!TOY.eng)return null;
  const g=it.geo;if(!g.boundingBox)g.computeBoundingBox();const bb=g.boundingBox,k=BALL.R*2/(bb.max.y-bb.min.y);
  const mat=BALL.mats[it.id]||(BALL.mats[it.id]=(()=>{const m=it.mat.clone();m.transparent=false;m.depthWrite=true;m.alphaTest=.02;return m;})());
  const m=new T.Mesh(g,mat);m.scale.setScalar(k);m.position.set(-(bb.min.x+bb.max.x)/2*k,-(bb.min.y+bb.max.y)/2*k,-(bb.min.z+bb.max.z)/2*k);   // pivot = the middle of the ball
  const rot=new T.Group(),out=new T.Group();rot.add(m);out.add(rot);out.scale.setScalar(.001);scene.add(out);
  const sh=new T.Mesh(wSoftGeo,wMat.soft.clone());sh.renderOrder=1;scene.add(sh);
  if(BALL.list.length>=BALL.MAX)ballRemove(BALL.list[0]);
  const lim=Math.max(1,L.hw-1.2);
  const b={it,g:out,rot,sh,x:clamp(x,-lim,lim),y:Math.max(y,FLOOR_Y+1),z:FLOOR_Z,t:0,calm:0,left:BALL.LIFE,j:0,jv:0,jn:{x:0,y:1},body:null,last:null,own:null,air:true,vx:0,vy:0};
  const body=Bodies.circle(mxp(b.x),myp(b.y),BALL.R*PXU,{restitution:.7,friction:.25,frictionStatic:.3,frictionAir:.008,density:.0009,slop:.02});
  body.ball=b;b.body=body;Composite.add(TOY.eng.world,body);
  Body.setVelocity(body,{x:(Math.random()-.5)/BALL.K*.8,y:0});Body.setAngularVelocity(body,(Math.random()-.5)*.1);
  BALL.list.push(b);Au.click(1.6,.4);
  for(const I of DOGS.list){const s=DS(I);s.ballBored=0;s.ballSince=0;}   // a new ball wakes everybody up
  return b;
}
function ballRemove(b){
  if(b.body){Composite.remove(TOY.eng.world,b.body);b.body=null;}
  scene.remove(b.g);scene.remove(b.sh);b.sh.material.dispose();
  const i=BALL.list.indexOf(b);if(i>=0)BALL.list.splice(i,1);
}
if(PHYS&&TOY.eng)Events.on(TOY.eng,'collisionStart',ev=>{   // squash a little on every hit, and a soft thud
  for(const p of ev.pairs){
    const b=p.bodyA.ball||p.bodyB.ball;if(!b)continue;
    const n=p.collision.normal,vn=Math.abs((p.bodyA.velocity.x-p.bodyB.velocity.x)*n.x+(p.bodyA.velocity.y-p.bodyB.velocity.y)*n.y)*BALL.K;
    if(vn<1)continue;
    b.jv+=Math.min(vn*.1,1.5);b.jn.x=Math.abs(n.x);b.jn.y=Math.abs(n.y);
    
  }});
/* where will the ball be when the puppy can reach it? hit = it will come down through the height of the lips; x = where */
function ballPred(b){
  const lim=L.hw-.65;
  if(!b.air)return {x:clamp(b.x+b.vx*.3,-lim,lim),air:false,hit:false};
  const g=ballG(),yT=FLOOR_Y+dog.footLift*dog.scale+DOG_BITE.my*dog.scale+.03,yF=FLOOR_Y+BALL.R,y0=b.y,vy=b.vy;
  let t=-1,hit=false;
  const d=vy*vy+2*g*(y0-yT);
  if(d>=0){const tt=(vy+Math.sqrt(d))/g;if(tt>=0){t=tt;hit=true;}}
  if(t<0){const dF=vy*vy+2*g*(y0-yF);t=dF>=0?Math.max(0,(vy+Math.sqrt(dF))/g):0;}
  let x=b.x+b.vx*t;if(x>lim)x=2*lim-x;if(x<-lim)x=-2*lim-x;
  return {x:clamp(x,-lim,lim),air:true,hit};
}
const ballBuddy=()=>{const s=dogBuddy();return s&&s.lie.s==='none'&&performance.now()>=(s.ballBored||0)&&!['fetch','bring','eat','chase','job'].includes(s.mode)?s:null;};   // the other puppy, if it is free to play
/* what does this puppy do about the balls? null = nothing. {b, role:'strike'|'wait', tx, spd} */
function ballPick(){
  if(!BALL.list.length){dog.ballSince=0;return null;}
  if(!toyDogCan()||dog.lie.s!=='none'||dog.leaving)return null;
  const now=performance.now();if(now<(dog.ballBored||0))return null;
  const me=DOGS.me,bu=ballBuddy(),buI=bu&&DOGS.list.find(o=>o!==me&&DS(o)===bu),MD=DOG_BITE.mz*dog.scale,hw=L.hw;
  let sb=null,ss=1e9,wb=null,ws=1e9,sp=null;
  for(const b of BALL.list){
    if(b.t<.25||b.held)continue;
    const pr=ballPred(b),dm=Math.abs(pr.x-dog.x)-(b.own===me?1.2:0);
    let wait=false;
    if(bu){
      const db=Math.abs(pr.x-bu.x)-(b.own===buI?1.2:0);
      if(b.air&&b.last===me)wait=true;          // I just sent it: the other one's turn
      else if(b.air&&b.last===buI)wait=false;   // it is on its way to me
      else wait=db<dm-.01;                      // the other one is nearer
    }
    if(wait){if(dm<ws){ws=dm;wb=b;}}else if(dm<ss){ss=dm;sb=b;sp=pr;}
  }
  if(!sb&&!wb)return null;
  if(!dog.ballSince)dog.ballSince=now;
  else if(now-dog.ballSince>(dog.ballMax||(dog.ballMax=14000+Math.random()*9000))){dog.ballBored=now+25000;dog.ballSince=0;dog.ballMax=0;return null;}
  if(sb){
    sb.own=me;
    let a=(sp.x-dog.x)*dog.fd;if(a<-.45){dog.fd=-dog.fd;a=-a;}   // it only walks forward: if the ball ends up behind it, it turns round
    const tx=clamp(sp.hit?sp.x-dog.fd*MD:sp.x-dog.fd*(MD+BALL.R+.12),-hw+1.1,hw-1.1);
    return {b:sb,role:'strike',tx,spd:sp.air?8.5:Math.abs(sb.vx)>1.5?7.5:5.5};
  }
  const side=Math.sign(bu.x-dog.x)||1,S=Math.min(BALL.S,2*hw-4.6);
  dog.fd=side;                                                    // waits facing the other puppy, keeping its distance
  return {b:wb,role:'wait',tx:clamp(Math.abs(dog.x-bu.x)<S-.4?bu.x-side*S:dog.x,-hw+1.1,hw-1.1),spd:5};
}
/* the hit itself: kind = 'nudge' | 'toss' (from the floor) | 'head' (in the air) */
function ballHit(b,kind,mx,my){
  const P=dog.play,g=ballG(),bu=ballBuddy(),MD=DOG_BITE.mz*dog.scale,lim=L.hw-.65;let vx,vy;
  my=FLOOR_Y+dog.footLift*dog.scale+DOG_BITE.my*dog.scale+.03;   // heights below are measured from the lips of a puppy standing up (the real lips are down by the floor during a bow)
  if(bu){   // a lob to the other puppy: it lands right at its lips
    const sg=Math.sign(dog.x-bu.x)||1,tbx=clamp(bu.x+sg*MD,-lim,lim),D=Math.abs(tbx-b.x),T=clamp(.5+.06*D,.5,1.1);
    vx=(tbx-b.x)/T;vy=(my-b.y)/T+g*T/2;
  }else if(kind==='nudge'){vx=dog.fd*(4.2+Math.random()*2.3);vy=1+Math.random();}
  else if(kind==='toss'){vy=Math.sqrt(2*g*Math.max(1,my+1.5+Math.random()*.5-b.y));vx=dog.fd*(.4+Math.random()*.9);P.n=0;P.nMax=2+(Math.random()*3|0);}
  else{   // header: a few in place, then it sends the ball off
    P.n++;
    if(P.n>=P.nMax){vx=dog.fd*(3.2+Math.random()*2);vy=7.5+Math.random()*2;P.n=0;P.nMax=2+(Math.random()*3|0);}
    else{vy=Math.sqrt(2*g*Math.max(1,my+1.4+Math.random()*.6-b.y));vx=(mx-b.x)*3+(Math.random()-.5)*.9;}
  }
  Body.setVelocity(b.body,{x:vx/BALL.K,y:-vy/BALL.K});Body.setAngularVelocity(b.body,(vx>=0?1:-1)*(.05+Math.random()*.08));
  b.last=DOGS.me;b.own=DOGS.me;b.air=true;b.jv+=1.2;b.jn.x=b.jn.y=.6;
  buzz(5);
}
/* mode 'ball' of dogFrame: the floor strikes (bow down, nose under / against the ball) and the headers. returns {pitch,jaw}: pitch > 0 = head down, < 0 = flicked up */
function ballDog(dt,moving,tz,BP){
  const b=BP.b,P=dog.play||(dog.play={k:'',t:0,hit:false,n:0,nMax:2,cool:0,dur:.6,at:.45,fl:0}),out={pitch:0,jaw:0},sm=u=>{u=clamp(u,0,1);return u*u*(3-2*u);};
  P.cool-=dt;
  if(P.fl>0){P.fl-=dt;out.pitch-=.75*Math.sin(Math.PI*clamp(1-P.fl/.32,0,1));}
  if(BP.role!=='strike'||!dog.mouthL||!dog.bones.Head){P.k='';return out;}
  DOGX.mw.copy(dog.mouthL);dog.bones.Head.o.localToWorld(DOGX.mw);const mx=DOGX.mw.x,my=DOGX.mw.y;
  if(P.k){
    P.t+=dt;const p=P.t/P.dur;
    out.pitch=P.k==='nudge'?Math.sin(clamp(p,0,1)*Math.PI):p<.38?.75*Math.sin(p/.38*Math.PI/2):p<.58?lerp(.75,-.8,sm((p-.38)/.2)):lerp(-.8,0,sm((p-.58)/.42));
    if(!P.hit&&p>=P.at){P.hit=true;const f=(b.x-dog.x)*dog.fd;if(f>.6&&f<3.4&&b.y-FLOOR_Y<BALL.R+1)ballHit(b,P.k,mx,my);}
    if(p>=1){P.k='';P.cool=.35;}
    return out;
  }
  const h=b.y-BALL.R-FLOOR_Y,f=(b.x-dog.x)*dog.fd,MD=DOG_BITE.mz*dog.scale;
  if(P.cool<=0&&b.air&&Math.abs(b.x-mx)<.75&&b.y-my>-.9&&b.y-my<.6&&b.vy<1.5){ballHit(b,'head',mx,my);P.fl=.32;P.cool=.3;}   // the ball comes down on its lips: a header
  else if(P.cool<=0&&!b.air&&h<.3&&Math.abs(b.vx)<3.5&&!moving&&Math.abs(dog.z-tz)<.25&&f>MD-.5&&f<MD+BALL.R+.7){
    P.k=(ballBuddy()||Math.abs(b.x)>L.hw-3||Math.random()<.45)?'toss':'nudge';P.t=0;P.hit=false;P.dur=P.k==='toss'?.7:.55;P.at=P.k==='toss'?.5:.46;
  }
  return out;
}
function ballFrame(dt,time){
  if(!BALL.list.length)return;
  const can=toyDogCan(),lim=L.hw-.15-BALL.R,fl=FLOOR_Y+.02+BALL.R;
  for(let i=BALL.list.length-1;i>=0;i--){
    const b=BALL.list[i];b.t+=dt;
    if(b.held){const H=BALL.held,fl2=FLOOR_Y+.02+BALL.R;b.x=clamp(H.x,-lim,lim);b.y=Math.max(H.y,fl2);Body.setPosition(b.body,{x:mxp(b.x),y:myp(b.y)});Body.setVelocity(b.body,{x:0,y:0});Body.setAngularVelocity(b.body,0);b.calm=0;b.left=BALL.LIFE;b.air=true;b.vx=b.vy=0;}
    const p=b.body.position;let x=p.x/PXU,y=-p.y/PXU;
    if(Math.abs(x)>lim+.3||y<fl-.4){x=clamp(x,-lim,lim);y=Math.max(y,fl);Body.setPosition(b.body,{x:mxp(x),y:myp(y)});}   // safety: never outside the room
    b.x=x;b.y=y;const v=ballVel(b);b.vx=v.x;b.vy=v.y;
    const h=y-BALL.R-FLOOR_Y;if(!b.held)b.air=h>.22&&(Math.abs(v.y)>.8||h>.5);
    if(!b.air&&Math.hypot(v.x,v.y)<.4&&Math.abs(b.body.angularVelocity)<.03)b.calm+=dt;else b.calm=0;
    if(can||b.held)b.left=BALL.LIFE;
    else if(b.calm>.5){b.left-=dt;if(b.left<=0){ballRemove(b);continue;}}   // nobody to play with: gone after a while
    for(let k=0;k<2;k++){const hh=dt/2;b.jv+=(-300*b.j-9*b.jv)*hh;b.j+=b.jv*hh;}   // jelly spring, same as the apples
    b.j=clamp(b.j,-.25,.3);
    const jx=b.j*(b.jn.y*.55-b.jn.x),jy=b.j*(b.jn.x*.55-b.jn.y),fade=!can&&b.calm>.5?clamp(b.left/.7,0,1):1,f=Math.max(.001,Math.min(1,b.t/.11)*fade);
    b.g.position.set(b.x,b.y,b.z);b.g.scale.set(f*(1+jx),f*(1+jy),f*(1+b.j*.25));
    b.rot.rotation.z=-b.body.angle;
    const sz=BALL.R*2.7/(1+Math.max(0,h)*.22)*fade;
    b.sh.visible=sz>.01&&h<3;b.sh.position.set(b.x,FLOOR_Y+.012,b.z);b.sh.scale.set(Math.max(.001,sz),1,Math.max(.001,sz*.55));
  }
}
window.__ball={BALL,ballAt,ballGrab,ballSpawn,ballG,ballVel,ballPred,TOY,spawn:(x,y)=>ballSpawn(W.items.t_ball,x,y)};   // test hook

/* ---------- picking the ball up: grab it, carry it, let go (a flick throws it); let go over the cabinet / right edge and it is put away ---------- */
function ballAt(e){   // the ball under the pointer (nearest to the camera first)
  const r=cvs.getBoundingClientRect();JOB.nd.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);JOB.rc.setFromCamera(JOB.nd,cam);
  let best=null,bd=1e9;
  for(const b of BALL.list){if(b.t<.15)continue;const h=JOB.rc.intersectObject(b.g,true)[0];if(h&&h.distance<bd){bd=h.distance;best=b;}}
  return best;
}
function ballGrab(b,e,id){   // also used when a ball is dragged straight out of the cabinet
  const q=(setNDC(e),planeHit(b.z));if(!q)return;
  b.held=true;BALL.held={b,ox:b.x-q.x,oy:b.y-q.y,x:b.x,y:b.y,vx:0,vy:0,t:performance.now(),id};
  b.last=null;b.own=null;Au.click(1.5,.4);buzz(6);cvs.style.cursor='grabbing';
}
function ballHeldMove(e){
  const H=BALL.held;if(!H)return;
  setNDC(e);const q=planeHit(H.b.z);if(!q)return;
  const nx=q.x+H.ox,ny=q.y+H.oy,now=performance.now(),dt=Math.max(.008,(now-H.t)/1000);
  H.vx=lerp(H.vx,(nx-H.x)/dt,.5);H.vy=lerp(H.vy,(ny-H.y)/dt,.5);H.x=nx;H.y=ny;H.t=now;
}
function ballLetGo(e){
  const H=BALL.held;if(!H)return;BALL.held=null;const b=H.b;b.held=false;
  try{cvs.releasePointerCapture(H.id);}catch(_){}
  cvs.style.cursor='default';
  if(e&&jobOverCabinet(e)){ballRemove(b);Au.click(1.1,.45);buzz(8);return;}   // put away
  if(!b.body)return;
  const k=performance.now()-H.t>90?0:1,vx=clamp(H.vx*k,-22,22),vy=clamp(H.vy*k,-22,22);
  Body.setVelocity(b.body,{x:vx/BALL.K,y:-vy/BALL.K});b.air=true;b.jv+=.8;b.jn.x=b.jn.y=.6;
  for(const I of DOGS.list){const s=DS(I);s.ballBored=0;s.ballSince=0;}
}
cvs.addEventListener('pointerdown',e=>{
  if(e.button>0||BALL.held||!BALL.list.length||W.drag||W.sd||pd||busy)return;
  const b=ballAt(e);if(!b)return;
  const I=typeof dogWhoAt==='function'?dogWhoAt(e.clientX,e.clientY):null;if(I&&DS(I).z>b.z+1.1)return;   // a puppy standing in front of it gets the click
  e.stopImmediatePropagation();e.stopPropagation();try{cvs.setPointerCapture(e.pointerId);}catch(_){}
  ballGrab(b,e,e.pointerId);
},{capture:true});
cvs.addEventListener('pointermove',e=>{if(BALL.held){e.stopImmediatePropagation();ballHeldMove(e);cvs.style.cursor='grabbing';}},{capture:true});
cvs.addEventListener('pointerup',e=>{if(BALL.held){e.stopImmediatePropagation();ballLetGo(e);}},{capture:true});
cvs.addEventListener('pointercancel',e=>{if(BALL.held)ballLetGo(null);},{capture:true});
cvs.addEventListener('pointermove',e=>{if(!BALL.held&&!JOB.held&&!TOY.sel&&!W.drag&&!pd&&BALL.list.length&&ballAt(e))cvs.style.cursor='grab';});
