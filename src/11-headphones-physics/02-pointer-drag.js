/* ---------- pointer dragging for physics objects ---------- */
const grab={c:null,kind:null,body:null,z:.5,btn:-1,startX:0,startY:0};
function startPhysGrab(hit){
  const o=hit.object,kind=o.userData.phys;let body=null,stiff=.2;
  if(kind==='rem'){body=rem.body;stiff=.22;}else if(kind==='hp'){if(hpState.worn)hpUnwear();body=hpState.body;stiff=.13;hpState.grab=true;}
  else if(kind==='plug'){body=endB();stiff=.3;if(hpState.s==='seek'){hpState.drive=null;hpState.s='free';hpState.seek=0;}}
  else if(kind==='tv'){body=tv.b;stiff=.07;}
  if(!body)return false;
  grab.kind=kind;grab.body=body;grab.z=hit.point.z;grab.pointer=null;grab.btn=kind==='rem'&&o.userData.rbtn!==undefined?o.userData.rbtn:-1;
  const px=mxp(hit.point.x),py=myp(hit.point.y),dx=px-body.position.x,dy=py-body.position.y,ca=Math.cos(-body.angle),sa=Math.sin(-body.angle);
  grab.c=Constraint.create({pointA:{x:px,y:py},bodyB:body,pointB:{x:dx*ca-dy*sa,y:dx*sa+dy*ca},stiffness:stiff,damping:.18,length:0});
  Composite.add(wld,grab.c);
  if(grab.btn>=0)remHold(grab.btn);
  if(kind==='tv'&&tv.state==='on')tvPoke();
  return true;
}
function moveGrab(e){if(!grab.c)return;grab.pointer={x:e.clientX,y:e.clientY};setNDC(e);const h=planeHit(grab.z);if(h){grab.c.pointA.x=mxp(h.x);grab.c.pointA.y=myp(h.y);}}
function endPhysGrab(moved){
  if(!grab.c)return;Composite.remove(wld,grab.c);grab.c=null;
  const k=grab.kind,btn=grab.btn;grab.kind=null;hpState.grab=false;
  if(k==='rem'&&btn>=0){if(!moved){remPressAnim(btn);remoteFx(btn);}else remRelease(btn);}
  if(k==='hp'){
    const p=grab.pointer;
    if(moved&&p&&dog.ready&&dog.present&&!dog.leaving){
      const a=wAnchor('hat');
      if(dogHit(p.x,p.y)||(a&&Math.hypot(p.x-a.x,p.y-a.y)<115)){
        if(!hpWear())hpRest();
      }else hpRest();
    }else hpRest();
  }
  if(k==='plug'&&!moved&&hpState.s==='plugged')plugOut();   // the plug only comes out when it is actively clicked (dragging, pulling or a long cable never unplugs it)
  else if(k==='plug'&&hpState.s==='free'){const e=endB();if(Math.hypot(e.position.x/PXU-JACK.x,-e.position.y/PXU-JACK.y)<1.1)seekPlug();}
  grab.body=null;
}

