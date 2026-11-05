/* ---------- camera pointer + picking ---------- */
const ray=new T.Raycaster(),ndc=new T.Vector2(),plane=new T.Plane(new V3(0,0,1),0),tmp=new V3();
const cvs=renderer.domElement;
function setNDC(e){const r=cvs.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ndc,cam);}
function planeHit(z){plane.constant=-z;const h=ray.ray.intersectPlane(plane,tmp);return h?tmp:null;}
function pick(){
  const list=albumMeshes.concat(keyMeshes,playerHit);
  if(PHYS){list.push(...rem.hit);if(hpState.s!=='none')list.push(...hpHit,...plugHit);if(tv.built&&tv.state!=='none'&&tv.state!=='sinking')list.push(...tv.hit);}
  if(cd&&(cd.mode==='case'||cd.mode==='drag'||cd.mode==='free'||cd.mode==='floor'||cd.mode==='carried'||(cd.mode==='in'&&lidOpen)))list.push(cd.mesh);
  /* Headphones are interactive even when their thin band overlaps the player or dog. */
  if(PHYS&&hpState.s!=='none'){
    const hpHits=ray.intersectObjects(hpHit,false);
    if(hpHits.length){
      // Never grab headphones through the TV: use the closest visible surface.
      if(tv.built&&tv.state!=='none'&&tv.state!=='sinking'){
        const tvHits=ray.intersectObjects(tv.hit,false);
        if(tvHits.length&&tvHits[0].distance<hpHits[0].distance)return tvHits[0];
      }
      return hpHits[0];
    }
  }
  const h=ray.intersectObjects(list,false);return h[0]||null;
}

