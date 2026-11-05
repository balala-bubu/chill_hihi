/* ---------- backdrop: dot grid + soft shadow catcher ---------- */
const dots=mkTex(64,64,(x,w)=>{x.fillStyle='#d9dbde';x.fillRect(0,0,w,w);x.fillStyle='#c2c5c9';x.beginPath();x.arc(w/2,w/2,2.2,0,TAU);x.fill();});
dots.wrapS=dots.wrapT=T.RepeatWrapping;dots.repeat.set(160,100);dots.anisotropy=4;
const grid=new T.Mesh(new T.PlaneGeometry(80,50),new T.MeshBasicMaterial({map:dots,toneMapped:false}));grid.position.z=-4.22;grid.scale.setScalar(1.2);scene.add(grid);   // wall sits well behind the action so there is room for depth
const catcher=new T.Mesh(new T.PlaneGeometry(80,50),new T.ShadowMaterial({opacity:.2}));catcher.position.z=-4.2;catcher.scale.setScalar(1.2);catcher.receiveShadow=true;scene.add(catcher);
if(PET.on&&!PET.card){grid.visible=false;catcher.visible=false;}   // transparent desktop pet: no wall, the desktop is the background

