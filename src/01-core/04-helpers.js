/* ---------- helpers ---------- */
function mkTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw(x,w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;t.userData.c=c;return t;}
function rng(s){return function(){s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function rrShape(w,h,r){const s=new T.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
function rrBox(w,h,d,r,b){b=b||.04;const g=new T.ExtrudeGeometry(rrShape(w-2*b,h-2*b,Math.max(r-b,.01)),{depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:3,curveSegments:10});g.translate(0,0,-(d-2*b)/2);return g;}
function flower(x,px,py,r,pc,cc){x.fillStyle=pc;for(let i=0;i<5;i++){const a=i/5*TAU;x.beginPath();x.arc(px+Math.cos(a)*r,py+Math.sin(a)*r,r*.62,0,TAU);x.fill();}x.fillStyle=cc;x.beginPath();x.arc(px,py,r*.5,0,TAU);x.fill();}

/* tileable 2-octave value noise used as roughness + bump map (frosted plastic grain) */
function grainTex(size,seed,rep){
  const R=rng(seed),d=new Uint8Array(size*size*4);
  const layer=cells=>{const g=[];for(let i=0;i<cells*cells;i++)g.push(R());
    return (x,y)=>{const fx=x/size*cells,fy=y/size*cells,x0=Math.floor(fx),y0=Math.floor(fy),tx=fx-x0,ty=fy-y0,u=tx*tx*(3-2*tx),v=ty*ty*(3-2*ty),
      a=g[(y0%cells)*cells+x0%cells],b=g[(y0%cells)*cells+(x0+1)%cells],c=g[((y0+1)%cells)*cells+x0%cells],e=g[((y0+1)%cells)*cells+(x0+1)%cells];
      return lerp(lerp(a,b,u),lerp(c,e,u),v);};};
  const n1=layer(6),n2=layer(24);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const v=.55*n1(x,y)+.3*n2(x,y)+.15*R(),o=(y*size+x)*4,q=Math.round(150+v*105);d[o]=d[o+1]=d[o+2]=q;d[o+3]=255;}
  const t=new T.DataTexture(d,size,size,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;
  t.generateMipmaps=true;t.anisotropy=4;t.repeat.set(rep,rep);t.needsUpdate=true;return t;
}
function weaveTex(rep){const t=mkTex(64,64,(x,w)=>{x.fillStyle='#777';x.fillRect(0,0,w,w);for(let j=0;j<8;j++)for(let i=0;i<8;i++){x.fillStyle=(i+j)%2?'#c8c8c8':'#5a5a5a';x.fillRect(i*8+1,j*8+1,6,6);}});
  t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep,rep);return t;}
const buzz=ms=>{try{navigator.vibrate&&navigator.vibrate(ms);}catch(e){}};

