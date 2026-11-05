/* ---------- materials ---------- */
const GR=grainTex(128,5,.38),GR2=grainTex(128,9,2.5),WEAVE=weaveTex(7);
const M={
 /* body: frosted matte plastic. grain in roughness+bump, soft clearcoat sheen, velvety sheen at grazing angles */
 body:new T.MeshPhysicalMaterial({color:0xcfd2d5,roughness:.82,roughnessMap:GR,bumpMap:GR,bumpScale:.045,clearcoat:.28,clearcoatRoughness:.45,sheen:.6,sheenRoughness:.5,sheenColor:new T.Color(0xf4f6f8),envMapIntensity:.85}),
 plate:new T.MeshPhysicalMaterial({color:0xdfe1e3,roughness:.5,metalness:.15,clearcoat:.15,clearcoatRoughness:.4,envMapIntensity:.85}),
 groove:new T.MeshStandardMaterial({color:0x9a9ea3,roughness:.8}),
 /* glossy black: bezel, jack, plug */
 dark:new T.MeshPhysicalMaterial({color:0x2b2d30,roughness:.35,clearcoat:.6,clearcoatRoughness:.2}),
 /* keys: smoother and glossier than the body so they read as a different part; emissive drives the press flash (cloned per key) */
 key:new T.MeshPhysicalMaterial({color:0xe9eaec,roughness:.42,roughnessMap:GR,bumpMap:GR,bumpScale:.012,clearcoat:.35,clearcoatRoughness:.3,envMapIntensity:.8,emissive:new T.Color(0xff9466),emissiveIntensity:0}),
 metal:new T.MeshStandardMaterial({color:0xc4c8cc,metalness:1,roughness:.22}),
 glass:new T.MeshPhysicalMaterial({color:0xf6f8fa,transparent:true,opacity:.26,roughness:.15,clearcoat:1,clearcoatRoughness:.06,depthWrite:false,envMapIntensity:1.4}),
 /* ear cushion: foam/fabric weave with soft sheen */
 orange:new T.MeshPhysicalMaterial({color:0xf0925a,roughness:.85,bumpMap:WEAVE,bumpScale:.02,sheen:1,sheenRoughness:.5,sheenColor:new T.Color(0xffc59a)}),
 /* cable: silky sheathing */
 cable:new T.MeshPhysicalMaterial({color:0x2e3033,roughness:.45,clearcoat:.5,clearcoatRoughness:.35,sheen:.6,sheenRoughness:.4,sheenColor:new T.Color(0x8a9099)})
};
M.cup=M.body.clone();M.cup.roughnessMap=M.cup.bumpMap=GR2;
const ACC=0xee5a2c,OFF=0xb4b7bb;

