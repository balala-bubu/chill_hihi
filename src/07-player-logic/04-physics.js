/* ---------- physics ---------- */
let lastBump=0;
function bump(v){const n=performance.now();if(v>1.6&&n-lastBump>110){lastBump=n;Au.click(.5,Math.min(1,v/9));}}
/* CD collision. No more "ghost" pass-through: with the lid shut the body is a solid obstacle; with the lid open the CD
   is allowed to hover OVER the body (it rises to HOVER height and its tilt is limited, so nothing can clip the keys),
   while the opened lid itself becomes a solid wall on the left. */
const CD_G=34;                                            // gravity on a loose CD (world units / s^2)
const FLAT_S=.34,FLOOR_Z=2.2;                             // a CD that has dropped to the floor shrinks to this scale and lies flat at this depth (the lane the dog walks in)
const HOVER=1.05;                                         // z of a CD that is flying over the player body
let FLOOR_Y=-4.6;                                         // top of the floor (set in the physics section)
const BODY_RECT={x0:-PW/2,x1:PW/2,y0:PY-PH/2,y1:PY+PH/2};   // x0/x1 follow pOff.x every frame
const lidRect=()=>({x0:-2.35+pOff.x+pOff.ux,x1:-1.5+pOff.x+pOff.ux,y0:BAY.y-LH/2,y1:BAY.y+LH/2});
const rectDist=(p,r)=>Math.hypot(p.x-clamp(p.x,r.x0,r.x1),p.y-clamp(p.y,r.y0,r.y1));
const canHover=()=>lidOpen&&!cdIn;
const overBody=p=>canHover()&&rectDist(p,BODY_RECT)<CDR+.3;
function rectPush(c,vel,bounce,r){
  const p=c.pos,nx=clamp(p.x,r.x0,r.x1),ny=clamp(p.y,r.y0,r.y1),dx=p.x-nx,dy=p.y-ny,d2=dx*dx+dy*dy;
  if(d2>=CDR*CDR)return;
  const qx=c.safeX===undefined?p.x:c.safeX,qy=c.safeY===undefined?p.y:c.safeY;let nxn,nyn;
  if(d2>1e-6){const d=Math.sqrt(d2);nxn=dx/d;nyn=dy/d;p.x=nx+nxn*CDR;p.y=ny+nyn*CDR;}
  else{   // centre is inside the rect: leave through the side it came from
    if(qx<=r.x0){nxn=-1;nyn=0;p.x=r.x0-CDR;}else if(qx>=r.x1){nxn=1;nyn=0;p.x=r.x1+CDR;}else if(qy<=r.y0){nxn=0;nyn=-1;p.y=r.y0-CDR;}else if(qy>=r.y1){nxn=0;nyn=1;p.y=r.y1+CDR;}
    else{const l=p.x-r.x0,rr=r.x1-p.x,b=p.y-r.y0,t=r.y1-p.y,m=Math.min(l,rr,b,t);
      if(m===l){nxn=-1;nyn=0;p.x=r.x0-CDR;}else if(m===rr){nxn=1;nyn=0;p.x=r.x1+CDR;}else if(m===b){nxn=0;nyn=-1;p.y=r.y0-CDR;}else{nxn=0;nyn=1;p.y=r.y1+CDR;}}
  }
  if(vel){const vn=vel.x*nxn+vel.y*nyn;if(vn<0){bump(-vn);vel.x-=(1+bounce)*vn*nxn;vel.y-=(1+bounce)*vn*nyn;c.spin+=(vel.x*nyn-vel.y*nxn)*.3;}}
}
function collide(c,vel,bounce){
  const k=(L.d-c.pos.z)*TANH,a=innerWidth/innerHeight,p=c.pos;
  const x0=-k*a+.1+CDR,x1=k*a-.1-CDR,y0=Math.max(-k+.1+CDR,FLOOR_Y+CDR+.12),y1=Math.min(k,TILT_UP*L.d-(L.d-c.pos.z)*Math.tan(TOPA))-.1-CDR;   // top limit = the real top edge of the screen at this depth (the view is tilted down)
  if(canHover())rectPush(c,vel,bounce,lidRect());else rectPush(c,vel,bounce,BODY_RECT);
  const hitW=(ax,dir)=>{if(vel){bump(Math.abs(vel[ax]));vel[ax]*=-bounce;c.spin+=dir*vel[ax]*.35;}};
  if(p.x<x0){p.x=x0;if(vel&&vel.x<0)hitW('x',1);}
  if(p.x>x1){p.x=x1;if(vel&&vel.x>0)hitW('x',-1);}
  if(p.y<y0){p.y=y0;if(vel&&vel.y<0)hitW('y',1);}
  if(p.y>y1){p.y=y1;if(vel&&vel.y>0)hitW('y',-1);}
  c.safeX=p.x;c.safeY=p.y;
}
/* height the CD should float at right now (clears keys, display, lid hinge and the shelf front) */
function cdLevel(c){let z=.58;if(overBody(c.pos))z=HOVER;if(c.pos.y>L.shelfB-CDR-.35&&shelfVis>.2)z=Math.max(z,1.0);return z;}

