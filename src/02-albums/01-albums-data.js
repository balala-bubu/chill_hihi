/* ---------- albums: data + procedural artwork ---------- */
/* Default shelf = these YouTube playlists. Title and artist are fixed here (not read from YouTube);
   the track list and the cover are filled in later in the background (see src/09-playlist).
   Optional img:'https://...' (or a path in this repo, e.g. 'covers/x.jpg') = cover image to use instead of the first track's thumbnail. */
const DEFAULT_LISTS=[
 {list:'PL09drhUwnd9l4d_4jNonOhI8iXy_5DfV6',title:'更好',author:'Gummy B'},
 {list:'OLAK5uy_l4EaHd6QNtsgR6DfUfNa1F1PLQYoyftRM',title:'如果每天都可以 happy happy 誰想要sad:))',author:'陳嫻靜'},
 {list:'OLAK5uy_moBn9equTZCqNmY8BzAOHkZA9UptKDzDM',title:'月光',author:'蛋堡'},
 {list:'OLAK5uy_l63K1oKt-WcVxkgyJJJAU5jDYKjJ37Teg',title:'吉他手',author:'陳綺貞'},
 {list:'OLAK5uy_kayjlU3SJ4QiIRWihJtCW6R9Hi9sFpU3c',title:'Sent',author:'9m88',img:'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTxJqU747ZThXDeKFT8CJgK7aQMOiFV4s7dHVtIQvNdOg&s=10'},
 {list:'OLAK5uy_nAgtspFo6LJ1V25viuFzYsapwIqgVvtXY',title:'橙月',author:'方大同',img:'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpquRRtXWGWrpHbPI3L6JDNxAgo7dL8kBIqPhjAFGyaQ&s=10'},
 {list:'OLAK5uy_lfNo3ANxH0bxNC6gS7WtSmR9gRkZpog04',title:'木眼鏡同名專輯',author:'木眼鏡'},
 {list:'OLAK5uy_n9Fsvc257NW36XlPHXduZesadQaPSIjmM',title:'Requiem (Deluxe)',author:'keshi'},
 {list:'OLAK5uy_lfueuQkROx_bShckk3aFVYxZoSrN4Zkzc',title:'The Secret of Us',author:'Gracie Abrams'}
];
const hashStr=t=>{let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
function ytAlbum(o,cov){
  const h=hashStr(o.list),hue=h%360;let c;
  if(cov){const [r,g,b]=cov.avg.map(Math.round);c=['rgb('+r+','+g+','+b+')','#f3f1ec','#ee5a2c','#f4b942'];}
  else c=['hsl('+hue+',45%,24%)','hsl('+(hue+25)+',40%,72%)','hsl('+(hue+160)+',70%,56%)','hsl('+(hue+45)+',85%,66%)'];
  return {t:o.title||'PLAYLIST',a:(o.author||'YOUTUBE').toUpperCase(),m:['orbit','tiles','sun','wave','grid','stripe'][h%6],seed:h%997+1,c,img:cov?cov.im:null,yt:{list:o.list,ids:o.ids},bpm:80,root:55,lead:'triangle',prog:[]};
}
/* def:true = built-in (can't be renamed or deleted, comes back on reload); starts with a generated cover and no track list */
const ALBUMS=DEFAULT_LISTS.map(o=>Object.assign(ytAlbum({list:o.list,ids:[],title:o.title,author:o.author},null),{def:true,coverUrl:o.img||''}));
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
const coverTex=a=>mkTex(512,512,(x,w)=>art(x,w,a,false));   // front = artwork only, the title and artist live on the spine
function spineTex(a){return mkTex(96,900,(x,w,h)=>{
  x.fillStyle='#ecebe6';x.fillRect(0,0,w,h);x.fillStyle=a.c[2];x.fillRect(0,0,w,70);x.fillStyle=a.c[0];x.fillRect(0,h-52,w,52);
  x.fillStyle='rgba(0,0,0,.07)';x.fillRect(0,0,3,h);x.fillRect(w-3,0,3,h);   // faint edge lines where the paper meets the case
  x.textBaseline='middle';x.textAlign='left';
  /* artist sits at the foot of the spine (right-aligned, lighter), the song/album title takes whatever length is left above it */
  x.font='500 32px '+MONO;const art_=fitText(x,a.a||'',250),aw=x.measureText(art_).width,aEnd=h-52-24;
  x.save();x.translate(w/2,aEnd-aw);x.rotate(Math.PI/2);x.fillStyle='#6a6f75';x.fillText(art_,0,0);x.restore();
  const tMax=Math.max(120,aEnd-aw-26-100);let fs=44;x.font='700 '+fs+'px '+MONO;while(x.measureText(a.t).width>tMax&&fs>22){fs-=2;x.font='700 '+fs+'px '+MONO;}
  x.save();x.translate(w/2,100);x.rotate(Math.PI/2);x.fillStyle='#24272a';x.fillText(fitText(x,a.t,tMax),0,0);x.restore();
  x.fillStyle=a.c[2];x.globalAlpha=.7;x.beginPath();x.arc(w/2,aEnd-aw-14,4,0,TAU);x.fill();x.globalAlpha=1;});}   // little dot between title and artist
const trayTex=()=>mkTex(512,512,(x,w)=>{   // black slim-case tray: soft sheen, a round recess for the disc, fine concentric moulding lines
  const c=w/2,g=x.createRadialGradient(c,c,0,c,c,w*.72);g.addColorStop(0,'#26282c');g.addColorStop(1,'#111214');x.fillStyle=g;x.fillRect(0,0,w,w);
  x.lineWidth=1.2;for(let r=50;r<236;r+=7){x.strokeStyle='rgba(255,255,255,'+(.025+.02*((r/7)%2))+')';x.beginPath();x.arc(c,c,r,0,TAU);x.stroke();}
  x.strokeStyle='#08090a';x.lineWidth=9;x.beginPath();x.arc(c,c,234,0,TAU);x.stroke();                       // recess wall
  x.strokeStyle='rgba(255,255,255,.16)';x.lineWidth=2.5;x.beginPath();x.arc(c,c,226,0,TAU);x.stroke();        // lit lip inside it
  x.strokeStyle='rgba(255,255,255,.06)';x.lineWidth=2;x.beginPath();x.arc(c,c,262,0,TAU);x.stroke();
  x.fillStyle='#0c0d0e';x.beginPath();x.arc(c,c,46,0,TAU);x.fill();x.strokeStyle='rgba(255,255,255,.12)';x.lineWidth=2;x.beginPath();x.arc(c,c,46,0,TAU);x.stroke();   // hub well
});
function cdTex(a){return mkTex(1024,1024,(x)=>{const S=1024;x.save();x.beginPath();x.arc(512,512,508,0,TAU);x.clip();art(x,S,a,false);
  const g=x.createRadialGradient(512,512,60,512,512,190);g.addColorStop(0,'#f2f4f6');g.addColorStop(.6,'#cdd2d7');g.addColorStop(1,'#e8ebee');x.fillStyle=g;x.beginPath();x.arc(512,512,190,0,TAU);x.fill();
  x.strokeStyle='rgba(60,64,70,.35)';x.lineWidth=3;x.beginPath();x.arc(512,512,190,0,TAU);x.stroke();x.restore();
  x.strokeStyle='rgba(255,255,255,.9)';x.lineWidth=6;x.beginPath();x.arc(512,512,505,0,TAU);x.stroke();});}

