/* ---------- albums: data + procedural artwork ---------- */
const ALBUMS=[
 {t:'LOW LIGHT',a:'LUMEN HALL',m:'sky',seed:11,c:['#a8cdf0','#f3f0e8','#e5483a','#f4b942'],bpm:76,root:57,lead:'triangle',prog:[[0,4,7,11],[5,9,12,16],[2,5,9,12],[7,11,14,17]]},
 {t:'GLASS HOURS',a:'NOVA FIELD',m:'orbit',seed:23,c:['#20242b','#6c7a89','#f08a4b','#e8e6e1'],bpm:84,root:52,lead:'sine',prog:[[0,3,7,10],[8,12,15,19],[5,8,12,15],[10,14,17,21]]},
 {t:'PAPER MOON',a:'OTO LINE',m:'tiles',seed:37,c:['#f2e9d8','#3b6fb6','#e5483a','#f4b942'],bpm:92,root:55,lead:'triangle',prog:[[0,4,7,9],[2,5,9,12],[7,11,14,17],[0,4,7,12]]},
 {t:'SLOW ORBIT',a:'HALF PINT',m:'sun',seed:41,c:['#1f2a44','#f5d9c0','#ff6a3d','#ffc971'],bpm:70,root:50,lead:'sine',prog:[[0,7,10,15],[5,12,15,19],[3,10,14,17],[7,10,14,19]]},
 {t:'BLUE STATIC',a:'MIRA TAN',m:'wave',seed:53,c:['#12356b','#7fb2e5','#e9f1f9','#ff6a3d'],bpm:96,root:59,lead:'square',prog:[[0,4,7,11],[9,12,16,19],[5,9,12,16],[7,11,14,19]]},
 {t:'AFTER RAIN',a:'SALT & PINE',m:'grid',seed:67,c:['#cfd8cf','#4a6b57','#f3f0e8','#d9573b'],bpm:80,root:54,lead:'triangle',prog:[[0,3,7,10],[3,7,10,14],[5,8,12,15],[7,10,14,17]]},
 {t:'NIGHT FIELD',a:'KOI SOUND',m:'stripe',seed:79,c:['#2b2437','#8c6fb0','#f0c4d5','#f4b942'],bpm:88,root:53,lead:'sine',prog:[[0,5,7,12],[2,7,9,14],[3,7,10,14],[5,9,12,16]]}
];
let N=ALBUMS.length;

function art(x,S,alb,txt){
  const R=rng(alb.seed),c=alb.c;
  const g=x.createLinearGradient(0,0,0,S);g.addColorStop(0,c[0]);g.addColorStop(1,c[1]);x.fillStyle=g;x.fillRect(0,0,S,S);
  const blob=(px,py,rad,col,al)=>{const r=x.createRadialGradient(px,py,0,px,py,rad);r.addColorStop(0,col);r.addColorStop(1,'rgba(255,255,255,0)');x.globalAlpha=al;x.fillStyle=r;x.beginPath();x.arc(px,py,rad,0,TAU);x.fill();x.globalAlpha=1;};
  if(alb.img){const im=alb.img,s=Math.min(im.naturalWidth,im.naturalHeight);x.drawImage(im,(im.naturalWidth-s)/2,(im.naturalHeight-s)/2,s,s,0,0,S,S);}
  else switch(alb.m){
   case 'sky':
    for(let i=0;i<8;i++)blob(R()*S,S*(.08+R()*.5),S*(.16+R()*.2),'#ffffff',.85);
    x.fillStyle='#8fb86a';x.beginPath();x.ellipse(S*.5,S*1.05,S*.78,S*.3,0,0,TAU);x.fill();
    for(let i=0;i<16;i++)flower(x,R()*S,S*(.7+R()*.24),S*(.025+R()*.03),i%3?c[3]:'#ffffff',c[2]);
    break;
   case 'orbit':
    x.strokeStyle=c[1];for(let i=1;i<=7;i++){x.lineWidth=S*(.004+R()*.006);x.beginPath();x.arc(S*.5,S*.5,S*i*.065,0,TAU);x.stroke();}
    x.fillStyle=c[2];x.beginPath();x.arc(S*.76,S*.32,S*.07,0,TAU);x.fill();
    x.fillStyle=c[3];x.beginPath();x.arc(S*.5,S*.5,S*.1,0,TAU);x.fill();break;
   case 'tiles':{const s=S/4;
    for(let j=0;j<4;j++)for(let i=0;i<4;i++){x.save();x.beginPath();x.rect(i*s,j*s,s,s);x.clip();
      x.fillStyle=c[(R()*4)|0];x.fillRect(i*s,j*s,s,s);x.fillStyle=c[(R()*4)|0];
      const q=(R()*4)|0,cx=i*s+(q%2?s:0),cy=j*s+(q>1?s:0);x.beginPath();x.arc(cx,cy,s*.92,0,TAU);x.fill();x.restore();}
    break;}
   case 'sun':
    x.fillStyle=c[2];x.beginPath();x.arc(S*.5,S*.62,S*.3,0,TAU);x.fill();
    x.fillStyle=c[3];x.beginPath();x.arc(S*.5,S*.62,S*.17,0,TAU);x.fill();
    x.fillStyle=c[0];for(let i=0;i<6;i++)x.fillRect(0,S*(.5+i*.035),S,S*(.004+i*.004));
    x.fillRect(0,S*.7,S,S*.3);x.fillStyle=c[2];x.globalAlpha=.35;for(let i=0;i<5;i++)x.fillRect(S*(.5-.24+i*.03),S*(.73+i*.04),S*(.48-i*.06),S*.012);x.globalAlpha=1;break;
   case 'wave':
    for(let i=0;i<7;i++){x.fillStyle=[c[1],c[2],c[3],c[0]][i%4];x.beginPath();x.moveTo(0,S);for(let px=0;px<=S;px+=8)x.lineTo(px,S*(.18+i*.11)+Math.sin(px/S*TAU*(1+i*.25)+i)*S*.05);x.lineTo(S,S);x.closePath();x.fill();}
    break;
   case 'grid':
    for(let j=0;j<12;j++)for(let i=0;i<12;i++){const d=Math.hypot(i-5.5,j-5.5)/7.8;x.fillStyle=d<.55?c[3]:c[1];x.beginPath();x.arc((i+.5)*S/12,(j+.5)*S/12,S*(.04*(1-d*.7)+.004),0,TAU);x.fill();}
    break;
   case 'stripe':
    x.save();x.translate(S/2,S/2);x.rotate(-.5);for(let i=-10;i<=10;i++){x.fillStyle=i%2?c[1]:c[0];x.fillRect(-S,i*S*.09,S*2,S*.05);}x.restore();
    x.fillStyle=c[2];x.beginPath();x.arc(S*.5,S*.46,S*.2,0,TAU);x.fill();x.fillStyle=c[3];x.beginPath();x.arc(S*.57,S*.4,S*.07,0,TAU);x.fill();break;
  }
  x.globalAlpha=alb.img?0:.07;for(let i=0;i<1800;i++){x.fillStyle=R()>.5?'#fff':'#000';x.fillRect(R()*S,R()*S,2,2);}x.globalAlpha=1;
  if(txt){ /* full-bleed cover: artwork runs edge to edge, title sits on a soft shade instead of an opaque bar */
    const gg=x.createLinearGradient(0,S*.8,0,S);gg.addColorStop(0,'rgba(0,0,0,0)');gg.addColorStop(1,'rgba(0,0,0,.4)');x.fillStyle=gg;x.fillRect(0,S*.8,S,S*.2);
    x.save();x.shadowColor='rgba(0,0,0,.4)';x.shadowBlur=S*.012;x.fillStyle='#f6f4ee';x.textBaseline='middle';
    x.font='700 '+(S*.05)+'px '+MONO;x.textAlign='left';x.fillText(fitText(x,alb.t,S*.6),S*.05,S*.94);
    x.font='500 '+(S*.032)+'px '+MONO;x.textAlign='right';x.fillText(fitText(x,alb.a,S*.26),S*.95,S*.94);x.restore();}
}
const coverTex=a=>mkTex(512,512,(x,w)=>art(x,w,a,true));
function spineTex(a){return mkTex(80,750,(x,w,h)=>{x.fillStyle='#ecebe6';x.fillRect(0,0,w,h);x.fillStyle=a.c[2];x.fillRect(0,0,w,58);x.fillStyle=a.c[0];x.fillRect(0,h-44,w,44);
  x.fillStyle='#24272a';x.textBaseline='middle';x.save();x.translate(w/2,90);x.rotate(Math.PI/2);let fs=36;x.font='700 '+fs+'px '+MONO;while(x.measureText(a.t).width>560&&fs>18){fs-=2;x.font='700 '+fs+'px '+MONO;}x.textAlign='left';x.fillText(fitText(x,a.t,560),0,0);x.restore();});}
const trayTex=()=>mkTex(256,256,(x,w)=>{x.fillStyle='#cdd0d3';x.fillRect(0,0,w,w);x.strokeStyle='#b9bdc1';x.lineWidth=5;x.beginPath();x.arc(w/2,w/2,116,0,TAU);x.stroke();x.beginPath();x.arc(w/2,w/2,22,0,TAU);x.stroke();});
function cdTex(a){return mkTex(1024,1024,(x)=>{const S=1024;x.save();x.beginPath();x.arc(512,512,508,0,TAU);x.clip();art(x,S,a,false);
  const g=x.createRadialGradient(512,512,60,512,512,190);g.addColorStop(0,'#f2f4f6');g.addColorStop(.6,'#cdd2d7');g.addColorStop(1,'#e8ebee');x.fillStyle=g;x.beginPath();x.arc(512,512,190,0,TAU);x.fill();
  x.strokeStyle='rgba(60,64,70,.35)';x.lineWidth=3;x.beginPath();x.arc(512,512,190,0,TAU);x.stroke();x.restore();
  x.strokeStyle='rgba(255,255,255,.9)';x.lineWidth=6;x.beginPath();x.arc(512,512,505,0,TAU);x.stroke();});}

