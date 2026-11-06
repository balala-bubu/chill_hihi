/* ---------- more puppies: B = Sib_a (models/dog2.*), C = pug (models/pug.*), D = chihuahua (models/chihuahua.*), E = husky (models/husky.*), F = pikachu (models/pikachu.*) ----------
   The dog button brings the puppies in turn: 1st press -> puppy A, next press (when none is out) -> puppy B, then C, then D, then E, then F, then A again ...; a long press brings the next two.
   Every puppy has its own model group and state (03-dogs.js); they all run the same behaviour code (dogFrame). A variant is the skinned model, the bone table
   (dog1's bone names -> this model's joints), a few pose numbers, and which wardrobe outfit is on (each puppy keeps its own, localStorage key per variant). */
const DV={cur:0,v:[null,null,null,null,null,null,null,null,null,null,null],KEY:'chill_hihi.dogNext',NDOG:5,   // variants 0..NDOG-1 are the puppies (the dog button's rotation); 5.. are the cartoon characters (the TOON button: 5 = pikachu, then 6/7/8/9/10 = chiikawa / hachiware / usagi / toad / stitch)
  WK:['chill_hihi.wear','chill_hihi.wear2','chill_hihi.wear3','chill_hihi.wear4','chill_hihi.wear5','chill_hihi.wear6','chill_hihi.wear7','chill_hihi.wear8','chill_hihi.wear9','chill_hihi.wear10','chill_hihi.wear11'],
  base:null,   // pose numbers of puppy A, to restore
  /* per-puppy numbers, index = variant (0 = puppy A, kept in DV.base). Each entry:
     map  how its joints answer dog1's bone names (null = not driven)
     sit / lie / perch / bite  pose numbers (override DOG_SIT / DOG_LIE / DOG_PERCH / DOG_BITE)
     ak   motion strengths (dog.ak)     fit  headgear: extra offset (pos) and size factor (s) on top of the slot numbers
     brow  where "Brow_group" sits in the head model (between the eyes) */
  P:[null,null,null,null,null,null,null,null,null,null]};
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
/* puppy F (pikachu): NOT the dog skeleton. models/pikachu.* is a static .obj turned into a rigid-part rig by tools/build_pikachu.py (each part bound to one joint, joint
   names as the dogs'), so the same behaviour code drives it; it stands upright on two legs. Its face / eyes are swapped between painted textures (faceFx below: blink, happy,
   open mouth, tears) instead of eyelid bones. All numbers below are first guesses, tune after looking at it. */
DV.P[5]=Object.assign({},DV.P[1],{
  map:{Hip:'skl_root',Waist:'waist',Bust:'chest',Neck:'neck',Head:'head',LearA:'Lear1',RearA:'Rear1',tailA:'tail1',tailB:'tail2',tailC:'tail3',
    ShoulderL:'Larm1',ShoulderR:'Rarm1',LegL:'Lleg1',LegR:'Rleg1'},
  sit:{hip:.5,front:0,leg:.9,tail:0,drop:.2},lie:{ang:2.6,drop:.3,arm:.9,leg:-.5},
  bite:{mx:0,my:27,mz:16,stand:.8},
  ak:{LearA:.5,RearA:.5,Neck:.8,Head:.8,Bust:1},
  brow:[0,30,14],   // the painted eyes sit at x=+-5.5, y=29, z=16 in the model (K=125)
  fit:{hat:{pos:[0,0,0],s:.8},glasses:{pos:[0,4.2,0],s:.95}}});
/* the three friends (chiikawa / hachiware / usagi, models/chiikawa.* hachiware.* usagi.*, from models/chiikawa/src/chiikawa_and_friends.glb by tools/build_chiikawa.py): a static glb turned into a rig
   (joint names as the dogs'; the weights come from vertex positions because head, body, arms and legs are one mesh). They walk upright like people (human:true, see dogFrame): arms swing against the legs,
   they bend at the waist for a CD / apple / ball and hold it in their hands in front of the chest (biteBone 'Bust': the "mouth" point of the dogs lives in the chest bone instead of the head), they sit with the legs
   out in front and flop over on their side to be petted. rad = half the width they need (two characters never stand closer than the sum of their rad), tvGap = spacing in front of the TV, hit = pet / pick ellipsoid.
   All numbers are first guesses: tune after looking at it. */
const HUMANOID={
  map:{Hip:'skl_root',Waist:'waist',Bust:'chest',Neck:'neck',Head:'head',tailA:'tail1',ShoulderL:'Larm1',ShoulderR:'Rarm1',LegL:'Lleg1',LegR:'Rleg1'},
  human:true,biteBone:'Bust',rad:1.05,tvGap:2.7,hit:{C:[0,24,0],R:[22,30,20]},
  sit:{hip:0,front:0,leg:-1.45,tail:0,drop:.22},lie:{ang:1.5,drop:.34,arm:-.9,leg:.3},
  perch:DV.P[1].perch,
  bite:{mx:0,my:15,mz:14,stand:1.15},
  ak:{Neck:.8,Head:.8,Bust:1},
  brow:[0,34,17],hpMark:[20,10.5,0],   // hpMark: where the headphone cups sit (head space, +-x), see hpWear
  fit:{hat:{pos:[0,5,0],s:1.1},glasses:{pos:[0,0,1],s:1.1},hp:{pos:[0,0,0]}}};
DV.P[6]=Object.assign({},HUMANOID);                                                            // chiikawa
DV.P[7]=Object.assign({},HUMANOID);                                                            // hachiware
DV.P[8]=Object.assign({},HUMANOID,{map:Object.assign({LearA:'Lear1',RearA:'Rear1'},HUMANOID.map),ak:{Neck:.8,Head:.8,Bust:1,LearA:.7,RearA:.7}});   // usagi: long ears that swing
/* toad (models/toad.*, from models/toad/src/Toad_custom_rig.dae by tools/build_toad.py): the file has a real rigid-part skeleton (arms, feet, torso, vest, head+cap), collapsed to the same 12-joint
   names as the other characters, so it moves exactly like chiikawa (HUMANOID). Textures: a 32x4 colour palette (limbs, body), the painted face (128x64) and the red-spotted cap (64x64), all pixel-art
   (meta.tex path, no expression swaps). The cap is much wider than the body (x up to +-22 at K=50), so rad is bigger. All numbers are first guesses: tune after looking at it. */
DV.P[9]=Object.assign({},HUMANOID,{rad:1.3,tvGap:3,hit:{C:[0,26,-2],R:[24,28,22]},
  bite:{mx:0,my:15,mz:14,stand:1.15},
  brow:[0,25,10],hpMark:[23,11.5,-3],   // the painted eyes sit at x=+-7, y=25, z=9..10 (K=50); the headphone cups go under the cap at the sides of the face
  fit:{hat:{pos:[0,23,-3],s:1.5},glasses:{pos:[0,0,2],s:1.25},hp:{pos:[0,0,0]}}});
/* stitch (models/stitch.*, from models/stitch/src/Stitch_rigged.dae by tools/build_stitch.py): a rigid-part skeleton collapsed to the same 12-joint names (arms, legs, head, big ears, a tail nub, the body blended
   between hip / waist / chest), so he moves like chiikawa (HUMANOID) and his ears flap like usagi's. Four painted pixel textures (head, belly, skin, eyes; meta.tex), skin + head are double sided (the ears are flat sheets).
   Big head and thin T-pose arms (lowered in the converter); K=4.2 so he is about as tall as the others, the ears reach x=+-37. All numbers are first guesses: tune after looking at it. */
DV.P[10]=Object.assign({},HUMANOID,{map:Object.assign({LearA:'Lear1',RearA:'Rear1'},HUMANOID.map),ak:{Neck:.8,Head:.8,Bust:1,LearA:.5,RearA:.5},rad:1.4,tvGap:3,hit:{C:[0,24,0],R:[22,30,20]},
  bite:{mx:0,my:14,mz:14,stand:1.15},
  brow:[0,41,12],hpMark:[12.5,9.5,-.5],   // eyes at y~38..46, z~12 (K=4.2); the headphone cups (head space) sit on the sides of the head under the ears
  fit:{hat:{pos:[0,2,0],s:1.3},glasses:{pos:[0,0,1],s:1.2},hp:{pos:[0,0,0]}}});
DV.P[5].rad=1;DV.P[5].tvGap=2.8;
function dogVarReg0(){   // called by loadDog when puppy A is built
  DV.v[0]={bones:dog.bones,mouthL:dog.mouthL,fix:dog.fix,footLift:dog.footLift,ak:undefined,fitAdj:undefined,ready:true};
  DV.base={sit:Object.assign({},DOG_SIT),lie:Object.assign({},DOG_LIE),perch:Object.assign({},DOG_PERCH),bite:Object.assign({},DOG_BITE)};
}
/* pikachu's face: the eyes and the lower face are two textured patches; swap their painted textures. called every frame from dogFrame (01-dog.js) with the current state.
   (the pikachu party hat is a wardrobe item, models/wardrobe/src/pika_hat) */
function dogFaceFx(alt,mats){
  let eye='',face='';
  const set=(k,a,cur)=>{if(cur===a)return cur;mats[k].map=alt[k][a]||alt[k].base;mats[k].needsUpdate=true;return a;};
  return (bl,open,mode,eo,playing,lie)=>{
    const busy=mode==='chase'||mode==='fetch'||mode==='bring'||mode==='eat'||mode==='ball';
    eye=set('eyes',lie==='trip'?'drop':(eo>.4||bl>.5)?'closed':busy?'big':'base',eye);
    face=set('face',lie==='trip'?'cyan':eo>.4?'wavy':open>.05||mode==='bring'||mode==='eat'?'tongue':playing?'wavy':'base',face);
  };
}
async function loadDogV(vi,name){   // vi = variant index, name = file stem under models/ ('dog2', 'pug')
  const P=DV.P[vi];
  try{
    const [meta,buf]=await Promise.all([fetch('models/'+name+'.json').then(r=>{if(!r.ok)throw new Error(name+'.json '+r.status);return r.json();}),fetch('models/'+name+'.bin').then(r=>{if(!r.ok)throw new Error(name+'.bin '+r.status);return r.arrayBuffer();})]);
    const tl=new T.TextureLoader(),lt=u=>new Promise((res,rej)=>tl.load(u,t=>{t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;res(t);},undefined,rej));
    const mk=m=>new T.MeshStandardMaterial({map:m,roughness:.9,metalness:0,envMapIntensity:.5});
    let mats,alt=null;
    if(meta.mats){   // flat colours + the shared painted face atlas (chiikawa & friends): meta.mats = {material: {color, outline?, face?, cutoff?}}
      if(!DV.atlas)DV.atlas=new Promise((res,rej)=>tl.load('models/'+meta.atlas,t=>{t.colorSpace=T.SRGBColorSpace;t.flipY=false;t.anisotropy=8;res(t);},undefined,rej));
      const atlas=await DV.atlas;mats={};
      for(const k in meta.mats){const d=meta.mats[k];
        mats[k]=d.face?new T.MeshBasicMaterial({map:atlas,alphaTest:d.cutoff,side:T.DoubleSide,toneMapped:false}):d.outline?new T.MeshBasicMaterial({color:d.color}):new T.MeshStandardMaterial({color:d.color,roughness:.85,metalness:0,side:T.DoubleSide,envMapIntensity:.5});}
    }else if(meta.tex){   // painted pixel textures, one per material (pikachu): meta.tex = {material: file stem}, meta.alt = {material: {name: file stem}} for expressions
      const px=u=>lt(u).then(t=>{t.magFilter=t.minFilter=T.NearestFilter;t.generateMipmaps=false;return t;}),ks=Object.keys(meta.tex);mats={};alt={};
      await Promise.all(ks.map(async k=>{mats[k]=mk(await px('models/'+name+'/'+meta.tex[k]+'.png'));
        const al=(meta.alt&&meta.alt[k])||{};alt[k]={base:mats[k].map};
        await Promise.all(Object.keys(al).map(async a=>{alt[k][a]=await px('models/'+name+'/'+al[a]+'.png');}));}));
    }else{
      const [ta,th,te]=await Promise.all([lt('models/'+name+'_all.png'),lt('models/'+name+'_hand.png'),lt('models/'+name+'_eye.png')]);
      mats={[name+'_all']:mk(ta),[name+'_hand']:mk(th),[name+'_eye']:mk(te)};
    }
    if(meta.double)meta.double.forEach(k=>{if(mats[k])mats[k].side=T.DoubleSide;});   // flat sheets (ears, hair) seen from both sides
    const attr=(m,k,Arr)=>{const a=m.attrs[k];return new T.BufferAttribute(new Arr(buf,a.off,a.count*a.size),a.size);};
    const byNode=new Map(meta.meshes.map(m=>[m.node,m]));
    const objs=meta.nodes.map((n,i)=>{
      let o;const m=byNode.get(i);
      if(m){const g=new T.BufferGeometry();
        g.setAttribute('position',attr(m,'position',Float32Array));g.setAttribute('normal',attr(m,'normal',Float32Array));g.setAttribute('uv',attr(m,'uv',Float32Array));
        g.setAttribute('skinIndex',attr(m,'skinIndex',Uint16Array));g.setAttribute('skinWeight',attr(m,'skinWeight',Float32Array));
        if(m.index!==undefined)g.setIndex(new T.BufferAttribute(new Uint32Array(buf,m.index,m.indexCount),1));
        o=new T.SkinnedMesh(g,mats[m.mat]);o.castShadow=meta.mats?!(meta.mats[m.mat].face||meta.mats[m.mat].outline):meta.tex?(m.mat!=='eyes'&&m.mat!=='face'):m.mat===name+'_all';if(meta.tex)o.userData.mat=m.mat;o.receiveShadow=false;o.frustumCulled=false;}
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
    if(P.hpMark){for(const [n,sx] of [['HpL',1],['HpR',-1]]){const m=new T.Object3D();m.name=n;m.position.set(sx*P.hpMark[0],P.hpMark[1],P.hpMark[2]);bones.Head.o.add(m);}}
    const root=objs[0];
    root.traverse(o=>o.layers.enable(1));
    /* the mouth: the bite point, remembered in the head's own space (same trick as puppy A) */
    DV.v[vi]={bones,fix,mouthL:null,footLift:.02,ak:P.ak,fitAdj:P.fit,ready:true,faceFx:(alt&&meta.alt)?dogFaceFx(alt,mats):null,human:!!P.human,biteBone:P.biteBone||'Head',rad:P.rad||1.3,tvGap:P.tvGap||3.4,hit:P.hit||null};
  }catch(e){console.warn(name+' failed to load',e);}
}
loadDogV(1,'dog2');
loadDogV(2,'pug');
loadDogV(3,'chihuahua');
loadDogV(4,'husky');
loadDogV(5,'pikachu');
loadDogV(6,'chiikawa');
loadDogV(7,'hachiware');
loadDogV(8,'usagi');
loadDogV(9,'toad');
loadDogV(10,'stitch');
