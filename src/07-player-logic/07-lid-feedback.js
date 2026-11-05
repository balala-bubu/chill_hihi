/* ---------- lid, player feedback ---------- */
/* a disc has just landed: fire the burst, kick the bay light, press the body down, dip the disc, nudge the camera */
function impact(c){
  burst.t=0;bayKick=1.6;camShake=Math.max(camShake,.22);
  tween(.3,k=>{pOff.jig=-Math.sin(Math.PI*k)*.08*(1-.35*k);},ease.lin);
  tween(.32,k=>c.root.scale.setScalar(1-.05*Math.sin(Math.PI*k)),ease.lin);
}
function jiggle(){return tween(.2,k=>{pOff.jig=-Math.sin(Math.PI*k)*.035;},ease.lin);}
async function setLid(open,quiet){
  if(lidOpen===open)return;lidOpen=open;const from=lidPivot.rotation.y,to=open?LID_OPEN:0;
  if(!quiet)Au.click(.8,.9);
  await tween(open?.6:.5,k=>{lidPivot.rotation.y=lerp(from,to,k);},open?ease.out5:ease.io2);
  if(open)Au.click(1.1,.7);else{Au.snap();jiggle();buzz(10);}
}
function pressAnim(i){
  const g=keys[i],z0=g.userData.z0,tok=g.userData.tok=(g.userData.tok||0)+1;
  tween(.07,k=>{if(g.userData.tok===tok)g.position.z=lerp(g.position.z,z0-.17,k);g.rotation.x=lerp(g.rotation.x,.05,k);},ease.out3).then(()=>{
    if(g.userData.tok!==tok)return;const from=g.position.z;return tween(.3,k=>{if(g.userData.tok===tok)g.position.z=lerp(from,z0,k);g.rotation.x*=1-k;},ease.outBack);});
}
function press(i){
  pressAnim(i);Au.click(i>1?1.15:.9,1);keyGlow[i]=1;buzz(7);
  if(i===0){
    if(status==='playing'){Au.pause();status='paused';}
    else if(status==='paused'){Au.resume();status='playing';}
    else if((status==='ready'||status==='stopped')&&cd){Au.start(ALBUMS[cd.ai]);status='playing';}
  }else if(i===1){
    if(status==='playing'||status==='paused'){Au.stop();status='stopped';}
    else if(status==='stopped')ejectCD();
  }else if(i===2){
    if(cd&&(status==='playing'||status==='paused')){Au.skipNext();status='playing';}
  }else{const v0=Au.vol;Au.setVol(clamp(Au.vol+(i===4?1:-1),0,10));volT=1.4;updateLeds();if(Au.vol!==v0)ledFlash[clamp(i===4?Au.vol-1:Au.vol,0,9)]=1;}
}

