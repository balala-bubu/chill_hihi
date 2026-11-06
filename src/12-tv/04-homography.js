/* ---------- homography: maps the YouTube box onto the TV glass ---------- */
const ytboxEl=document.getElementById('ytbox'),YB={w:640,h:512};
function homography(s,d){
  const A=[],b=[];for(let i=0;i<4;i++){const [x,y]=s[i],[X,Y]=d[i];A.push([x,y,1,0,0,0,-x*X,-y*X]);b.push(X);A.push([0,0,0,x,y,1,-x*Y,-y*Y]);b.push(Y);}
  for(let c=0;c<8;c++){let p=c;for(let r=c+1;r<8;r++)if(Math.abs(A[r][c])>Math.abs(A[p][c]))p=r;[A[c],A[p]]=[A[p],A[c]];[b[c],b[p]]=[b[p],b[c]];
    for(let r=c+1;r<8;r++){const f=A[r][c]/A[c][c];for(let k=c;k<8;k++)A[r][k]-=f*A[c][k];b[r]-=f*b[c];}}
  const h=new Array(8);for(let r=7;r>=0;r--){let s2=b[r];for(let k=r+1;k<8;k++)s2-=A[r][k]*h[k];h[r]=s2/A[r][r];}return h;}
/* the video box is placed by its four screen corners P (TV glass, or the theater's back-stage screen) */
function ytPlace(P){
  const h=homography([[0,0],[YB.w,0],[YB.w,YB.h],[0,YB.h]],P);
  ytboxEl.style.transform='matrix3d('+[h[0],h[3],0,h[6],h[1],h[4],0,h[7],0,0,1,0,h[2],h[5],0,1].join(',')+')';
  if(ytboxEl.style.opacity!=='1')ytboxEl.style.opacity='1';
}
/* "behind" mode (theater): the box is a wide 16:9 one that sits BEHIND the canvas; the stage's screen is a hole punched into the canvas, so everything in front of it hides it */
function ytBehind(on){
  if(YB.behind===on)return;YB.behind=on;YB.w=on?910:640;
  ytboxEl.classList.toggle('bt',on);document.documentElement.classList.toggle('btv',on);
}
const ytVideoNow=()=>{const a=cd&&(cdIn||status!=='empty')?ALBUMS[cd.ai]:null;return !!(a&&a.yt&&YTA.cur&&(status==='playing'||status==='paused'));};
function ytLayout(show){
  if(!show){if(ytboxEl.style.opacity!=='0')ytboxEl.style.opacity='0';if(dogOverlayRenderer)dogOverlayRenderer.domElement.style.display='none';return;}
  ytBehind(false);
  tv.punch.updateWorldMatrix(true,false);
  const P=[[-.9,.73],[.9,.73],[.9,-.73],[-.9,-.73]].map(([x,y])=>{_tmpA.set(x,y,0).applyMatrix4(tv.punch.matrixWorld).project(cam);return [(_tmpA.x+1)/2*innerWidth,(1-_tmpA.y)/2*innerHeight];});
  ytPlace(P);
  if(dogOverlayRenderer){const el=dogOverlayRenderer.domElement;
    el.style.clipPath='polygon('+P.map(p=>p[0].toFixed(1)+'px '+p[1].toFixed(1)+'px').join(',')+')';
    el.style.display=dog.ready&&dogAnyOn()?'block':'none';}
}
