/* ---------- more puppies: B = Sib_a (models/dog2.*), C = pug (models/pug.*), D = chihuahua (models/chihuahua.*), E = husky (models/husky.*) ----------
   The dog button brings the puppies in turn: 1st press -> puppy A, next press (when none is out) -> puppy B, then C, then D, then E, then A again ...; a long press brings the next two.
   Every puppy has its own model group and state (03-dogs.js); they all run the same behaviour code (dogFrame). A variant is the skinned model, the bone table
   (dog1's bone names -> this model's joints), a few pose numbers, and which wardrobe outfit is on (each puppy keeps its own, localStorage key per variant). */
const DV={cur:0,v:[null,null,null,null,null],KEY:'chill_hihi.dogNext',WK:['chill_hihi.wear','chill_hihi.wear2','chill_hihi.wear3','chill_hihi.wear4','chill_hihi.wear5'],
  base:null,   // pose numbers of puppy A, to restore
  /* per-puppy numbers, index = variant (0 = puppy A, kept in DV.base). Each entry:
     map  how its joints answer dog1's bone names (null = not driven)
     sit / lie / perch / bite  pose numbers (override DOG_SIT / DOG_LIE / DOG_PERCH / DOG_BITE)
     ak   motion strengths (dog.ak)     fit  headgear: extra offset (pos) and size factor (s) on top of the slot numbers
     brow  where "Brow_group" sits in the head model (between the eyes) */
  P:[null,null,null,null,null]};
DV.P[1]={
  map:{Hip:'skl_root',Waist:'waist',Bust:'chest',Neck:'neck',Head:'head',jawA:'mouth',LearA:'Lear1',RearA:'Rear1',tailA:'tail1',tailB:'tail2',tailC:'tail3',
    ShoulderL:'Larm1',ShoulderR:'Rarm1',LegL:'Lleg1',LegR:'Rleg1'},
  sit:{hip:.55,front:0,leg:.5,tail:0,drop:.3},lie:{ang:2.6,drop:.75,arm:.9,leg:-.5},
  perch:{dx:0,z:0,drop:.6,ry:.9,hip:0,waist:0,bust:0,clav:0,sh:.5,leg:.9,neck:0,head:0,tail:0},
  bite:{mx:0,my:34,mz:37},
  ak:{LearA:.5,RearA:.5,jawA:.6,Neck:.8,Head:.8},
  fit:{hat:{pos:[0,-5,2],s:.85},glasses:{pos:[0,-2.5,-1],s:.85}},
  brow:[0,38.1,28.5]};   // the painted eyes sit at x=+-4, y=37, z=31 in the model
/* puppy C (pug): same skeleton and size as puppy B (same artist, same bone names), so it starts from B's numbers; tune these after looking at it */
DV.P[2]=Object.assign({},DV.P[1],{ak:{LearA:.5,RearA:.5,jawA:.5,Neck:.8,Head:.8},
  brow:[0,40.3,27.8],   // pug eyes: centre y 39.2, z 30.3, x=+-6.9 (wider, a bit higher and flatter-faced than B)
  fit:{hat:{pos:[0,-2,1.5],s:1},glasses:{pos:[0,0,-1],s:1}}});
/* puppy D (chihuahua): same skeleton and bone names as B and C, so it also starts from B's numbers; tune after looking at it */
DV.P[3]=Object.assign({},DV.P[1],{ak:{LearA:.45,RearA:.45,jawA:.5,Neck:.8,Head:.8},
  brow:[0,39.5,27.5],   // chihuahua eyes: centre y 38.4, z 30.0, big round eyes (x about +-5.5); the head is narrower but the ears are huge (x up to +-17)
  fit:{hat:{pos:[0,-3,1.5],s:.95},glasses:{pos:[0,-.5,-1],s:.95}}});
/* puppy E (husky): same skeleton and bone names as B, C and D (parent map checked identical), so it starts from B's numbers; tune after looking at it */
DV.P[4]=Object.assign({},DV.P[1],{ak:{LearA:.5,RearA:.5,jawA:.5,Neck:.8,Head:.8},
  brow:[0,39,28.3],   // husky eyes: centre y 37.9, z 30.8, x about +-3.8 (close together, pale blue); erect ears, longer body (z -43..37)
  fit:{hat:{pos:[0,-3.5,1.5],s:.9},glasses:{pos:[0,-1,1],s:.9}}});
function dogVarReg0(){   // called by loadDog when puppy A is built
  DV.v[0]={bones:dog.bones,mouthL:dog.mouthL,fix:dog.fix,footLift:dog.footLift,ak:undefined,fitAdj:undefined,ready:true};
  DV.base={sit:Object.assign({},DOG_SIT),lie:Object.assign({},DOG_LIE),perch:Object.assign({},DOG_PERCH),bite:Object.assign({},DOG_BITE)};
}
async function loadDogV(vi,name){   // vi = variant index, name = file stem under models/ ('dog2', 'pug')
  const P=DV.P[vi];
  try{
    const [meta,buf]=await Promise.all([fetch('models/'+name+'.json').then(r=>{if(!r.ok)throw new Error(name+'.json '+r.status);return r.json();}),fetch('models/'+name+'.bin').then(r=>{if(!r.ok)throw new Error(name+'.bin '+r.status);return r.arrayBuffer();})]);
    const tl=new T.TextureLoader(),lt=u=>new Promise((res,rej)=>tl.load(u,t=>{t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;res(t);},undefined,rej));
    const [ta,th,te]=await Promise.all([lt('models/'+name+'_all.png'),lt('models/'+name+'_hand.png'),lt('models/'+name+'_eye.png')]);
    const mk=m=>new T.MeshStandardMaterial({map:m,roughness:.9,metalness:0,envMapIntensity:.5});
    const mats={[name+'_all']:mk(ta),[name+'_hand']:mk(th),[name+'_eye']:mk(te)};
    const attr=(m,k,Arr)=>{const a=m.attrs[k];return new T.BufferAttribute(new Arr(buf,a.off,a.count*a.size),a.size);};
    const byNode=new Map(meta.meshes.map(m=>[m.node,m]));
    const objs=meta.nodes.map((n,i)=>{
      let o;const m=byNode.get(i);
      if(m){const g=new T.BufferGeometry();
        g.setAttribute('position',attr(m,'position',Float32Array));g.setAttribute('normal',attr(m,'normal',Float32Array));g.setAttribute('uv',attr(m,'uv',Float32Array));
        g.setAttribute('skinIndex',attr(m,'skinIndex',Uint16Array));g.setAttribute('skinWeight',attr(m,'skinWeight',Float32Array));
        o=new T.SkinnedMesh(g,mats[m.mat]);o.castShadow=m.mat===name+'_all';o.receiveShadow=false;o.frustumCulled=false;}
      else o=n.t==='B'?new T.Bone():new T.Object3D();
      o.name=n.n;o.position.fromArray(n.pos);o.quaternion.fromArray(n.q);o.scale.fromArray(n.s);return o;});
    meta.nodes.forEach((n,i)=>{if(n.p>=0)objs[n.p].add(objs[i]);});
    const fix=new T.Group();fix.rotation.x=Math.PI/2;fix.add(objs[0]);   // same wrapper as puppy A; the file already cancels it (see tools/build_dog2.py)
    fix.updateMatrixWorld(true);
    meta.meshes.forEach(m=>{const o=objs[m.node],bones=m.bones.map(i=>objs[i]),inv=new Float32Array(buf,m.inv,bones.length*16),bi=[];
      for(let i=0;i<bones.length;i++)bi.push(new T.Matrix4().fromArray(inv,i*16));
      o.bind(new T.Skeleton(bones,bi),new T.Matrix4().fromArray(m.bind));});
    const byName=n=>objs[meta.nodes.findIndex(x=>x.t==='B'&&x.n===n)];
    const bones={};
    for(const k in P.map){const o=byName(P.map[k]);if(!o)continue;const pq=new T.Quaternion();o.parent.getWorldQuaternion(pq);bones[k]={o,q0:o.quaternion.clone(),pqi:pq.invert()};}
    /* "Brow_group": a pivot in the head with the axes the hats / glasses / headphones expect (+X across, +Y up, +Z to the muzzle), placed so that
       the eyes sit near (+-4, -1, 2.5) in it, like on puppy A */
    {const head=bones.Head.o,a=new T.Vector3(),hq=new T.Quaternion();
      a.set(...P.brow);   // between the eyes
      head.getWorldQuaternion(hq);
      const brow=new T.Object3D();brow.name='Brow_group';brow.position.copy(head.worldToLocal(a));brow.quaternion.copy(hq.clone().invert());head.add(brow);
      bones.Brow_group={o:brow,q0:brow.quaternion.clone(),pqi:new T.Quaternion()};}
    const root=objs[0];
    root.traverse(o=>o.layers.enable(1));
    /* the mouth: the bite point, remembered in the head's own space (same trick as puppy A) */
    DV.v[vi]={bones,fix,mouthL:null,footLift:.02,ak:P.ak,fitAdj:P.fit,ready:true};
  }catch(e){console.warn(name+' failed to load',e);}
}
loadDogV(1,'dog2');
loadDogV(2,'pug');
loadDogV(3,'chihuahua');
loadDogV(4,'husky');
