/* ---------- the remote control ---------- */
const RW=.95,RH=2.6;
const rem={g:new T.Group(),body:null,btn:[],ic:[],hit:[],lit:[false,false,false,false,false,false],z:2.6,pressTok:[0,0,0,0,0,0]};
const RB=['tv','bg','phones','plug','clock','toon'],RBP=[[-.215,.7],[.215,.7],[-.215,.2],[.215,.2],[-.215,-.3],[.215,-.3]];   // the 6th button brings the cartoon characters (pikachu first, then the three friends)
function remIconTex(kind,lit){return mkTex(128,128,(x,w)=>{const c=w/2;x.strokeStyle=x.fillStyle=lit?'#ee5a2c':'#3a3d41';x.lineWidth=9;x.lineCap=x.lineJoin='round';
  if(kind==='tv'){x.beginPath();x.roundRect?x.roundRect(c-38,c-22,76,54,12):x.rect(c-38,c-22,76,54);x.stroke();x.beginPath();x.moveTo(c-18,c-26);x.lineTo(c-30,c-46);x.moveTo(c+18,c-26);x.lineTo(c+30,c-46);x.stroke();}
  else if(kind==='bg'){x.beginPath();x.moveTo(c-42,c+30);x.lineTo(c-16,c-12);x.lineTo(c,c+8);x.lineTo(c+14,c-4);x.lineTo(c+42,c+30);x.closePath();x.stroke();   // mountains + a sun
    x.beginPath();x.arc(c+22,c-26,10,0,TAU);x.fill();}
  else if(kind==='phones'){x.beginPath();x.arc(c,c+4,34,Math.PI,TAU);x.stroke();   // headphones: band over the top, two ear cups
    x.beginPath();x.roundRect?x.roundRect(c-45,c+2,18,34,7):x.rect(c-45,c+2,18,34);x.fill();x.beginPath();x.roundRect?x.roundRect(c+27,c+2,18,34,7):x.rect(c+27,c+2,18,34);x.fill();}
  else if(kind==='clock'){x.beginPath();x.arc(c,c+2,34,0,TAU);x.stroke();x.beginPath();x.moveTo(c,c+2);x.lineTo(c,c-18);x.moveTo(c,c+2);x.lineTo(c+15,c+10);x.stroke();   // clock face with two hands
    x.beginPath();x.moveTo(c-20,c-38);x.lineTo(c-30,c-30);x.moveTo(c+20,c-38);x.lineTo(c+30,c-30);x.stroke();}   // + the two little alarm bells
  else if(kind==='toon'){   // a round cartoon face: two little ears, dot eyes, a small mouth and blush
    x.beginPath();x.arc(c,c+6,33,0,TAU);x.stroke();
    x.beginPath();x.moveTo(c-24,c-18);x.lineTo(c-27,c-40);x.lineTo(c-10,c-28);x.moveTo(c+24,c-18);x.lineTo(c+27,c-40);x.lineTo(c+10,c-28);x.stroke();
    x.beginPath();x.arc(c-13,c+2,4.2,0,TAU);x.arc(c+13,c+2,4.2,0,TAU);x.fill();
    x.lineWidth=7;x.beginPath();x.moveTo(c-7,c+14);x.quadraticCurveTo(c,c+22,c+7,c+14);x.stroke();}
  else{ /* dog face as a solid silhouette: floppy ears, round head, eyes + nose cut out */
    const ear=s=>{x.beginPath();x.moveTo(c+s*15,c-19);x.quadraticCurveTo(c+s*50,c-26,c+s*45,c+16);x.quadraticCurveTo(c+s*43,c+38,c+s*31,c+33);x.quadraticCurveTo(c+s*23,c+17,c+s*21,c-6);x.closePath();x.fill();};
    ear(-1);ear(1);
    x.globalCompositeOperation='destination-out';x.lineWidth=5;x.beginPath();x.ellipse(c,c+3,26,29,0,0,TAU);x.stroke();   // thin gap between ears and head
    x.globalCompositeOperation='source-over';x.beginPath();x.ellipse(c,c+3,23,26,0,0,TAU);x.fill();
    x.globalCompositeOperation='destination-out';
    x.beginPath();x.arc(c-9,c-3,5.4,0,TAU);x.fill();x.beginPath();x.arc(c+9,c-3,5.4,0,TAU);x.fill();
    x.beginPath();x.ellipse(c,c+12,8.5,6,0,0,TAU);x.fill();
    x.globalCompositeOperation='source-over';}});}
const remTexN=RB.map(k=>remIconTex(k,false)),remTexL=RB.map(k=>remIconTex(k,true));
{ const remM=new T.MeshPhysicalMaterial({color:0xe6e8ea,roughness:.48,clearcoat:.3,clearcoatRoughness:.4,envMapIntensity:.85});
  const rb=new T.Mesh(rrBox(RW,RH,.24,.3,.05),remM);rb.castShadow=true;rb.userData.phys='rem';rem.g.add(rb);rem.hit.push(rb);
  const lab=new T.Mesh(new T.PlaneGeometry(RW-.06,RH-.06),new T.MeshBasicMaterial({transparent:true,toneMapped:false,map:mkTex(190,520,(x,w,h)=>{
    x.fillStyle='#6a7076';x.font='700 15px '+MONO;x.textAlign='center';x.textBaseline='middle';
    RBP.forEach((p,i)=>x.fillText(['TV','BG','BT','DOG','CLK','TOON'][i],w/2+p[0]*200,(1.3-(p[1]-.3))*200));
    x.fillStyle='#b4b7bb';for(let r=0;r<3;r++)for(let c=0;c<5;c++){x.beginPath();x.arc(w/2+(c-2)*20,424+r*18,4.2,0,TAU);x.fill();}
    x.fillStyle='#8d9399';x.font='700 12px '+MONO;x.fillText('BalaBuBu',w/2,h-26);x.font='500 9px '+MONO;x.fillText('REMOTE · BALA-1',w/2,h-12);
    x.fillStyle='#ee5a2c';x.beginPath();x.arc(w/2,52,7,0,TAU);x.fill();})}));
  lab.position.z=.123;lab.userData.phys='rem';rem.g.add(lab);rem.hit.push(lab);
  RBP.forEach((p,i)=>{const g=new T.Group();g.position.set(p[0],p[1],.12);g.userData.z0=.12;
    const m=new T.Mesh(rrBox(.4,.4,.22,.13,.04),M.key);m.position.z=.1;m.castShadow=true;m.userData.phys='rem';m.userData.rbtn=i;g.add(m);
    const ic=new T.Mesh(new T.PlaneGeometry(.24,.24),new T.MeshBasicMaterial({map:remTexN[i],transparent:true,toneMapped:false}));ic.position.z=.215;ic.userData.phys='rem';ic.userData.rbtn=i;g.add(ic);
    rem.g.add(g);rem.btn.push(g);rem.ic.push(ic);rem.hit.push(m,ic);});
  rem.g.position.set(3.4,-.4,rem.z);scene.add(rem.g);}
function remLit(i,on){if(rem.lit[i]===on)return;rem.lit[i]=on;rem.ic[i].material.map=on?remTexL[i]:remTexN[i];rem.ic[i].material.needsUpdate=true;}
function remPressAnim(i){const g=rem.btn[i],z0=g.userData.z0,tok=++rem.pressTok[i];
  tween(.06,k=>{if(rem.pressTok[i]===tok)g.position.z=lerp(g.position.z,z0-.12,k);},ease.out3).then(()=>{if(rem.pressTok[i]!==tok)return;const f=g.position.z;return tween(.28,k=>{if(rem.pressTok[i]===tok)g.position.z=lerp(f,z0,k);},ease.outBack);});}
function remRelease(i){const g=rem.btn[i],tok=++rem.pressTok[i],f=g.position.z;tween(.2,k=>{if(rem.pressTok[i]===tok)g.position.z=lerp(f,g.userData.z0,k);},ease.outBack);}
function remHold(i){const g=rem.btn[i],tok=++rem.pressTok[i];tween(.06,k=>{if(rem.pressTok[i]===tok)g.position.z=lerp(g.position.z,g.userData.z0-.12,k);},ease.out3);}
function spawnRemote(){
  if(!PHYS)return;if(rem.body)Composite.remove(wld,rem.body);
  const x=Math.min(3.35,L.hw-1.2);
  rem.body=Bodies.rectangle(mxp(x),myp(-.5),RW*PXU,RH*PXU,{chamfer:{radius:24},density:.0012,frictionAir:.04,friction:.5,restitution:.35,collisionFilter:{category:CAT.rem,mask:CAT.floor|CAT.player|CAT.tv}});
  Composite.add(wld,rem.body);
}

