/* ---------- the summon menu: hover the dog button (3) or the TOON button (5) on the remote and pick WHO comes; hover the BG button (1) and pick WHERE ----------
   A small card with one thumbnail per puppy / character (models/thumbs/v<N>.png, made by tools/render_thumbs.py). Click a tile: that one walks in (or, if it is already out, leaves).
   The TOON menu also has a "three friends" tile (chiikawa + hachiware + usagi together; toad is only picked on his own). Highlighted tiles are the ones that are out now. Pressing the remote button works as before.
   The BG menu lists the backgrounds (models/thumbs/bg<N>.png): click one to switch to it (it is highlighted while shown; click it again to turn the background off). The BG button itself
   only switches the background on/off (the last one picked, the meadow at first). A new background = one more tile in SM.tiles[1] plus its scene in BG.scenes (04-scenery.js).
   The menu opens after the pointer has rested on the button for a moment and stays while the pointer is on the button or on the menu. */
const SM={el:null,btn:-1,want:-1,showT:0,hideT:0,over:false,sync:0,
  tiles:{
    3:[{v:0,n:'米格魯'},{v:1,n:'柴犬'},{v:2,n:'巴哥'},{v:3,n:'吉娃娃'},{v:4,n:'哈士奇'}],
    5:[{v:5,n:'皮卡丘'},{v:6,n:'吉伊卡哇'},{v:7,n:'小八'},{v:8,n:'烏薩奇'},{v:9,n:'奇諾比奧'},{g:[6,7,8],n:'三隻一組'}]},
  title:{1:'背景',3:'狗狗',5:'卡通人物'}};
SM.tiles[1]=[{m:1,n:'草地',img:'bg1'},{m:2,n:'咖啡廳',img:'bg2'},{m:3,n:'博物館',img:'bg3'},{m:4,n:'月亮',img:'bg4'}];   // m = BG.mode (04-scenery.js)
const smOn=t=>t.m?BG.mode===t.m:t.g?t.g.some(dogOut):dogOut(t.v);
function smBuild(){
  const el=document.createElement('div');el.id='summonMenu';el.setAttribute('role','menu');document.body.appendChild(el);
  el.addEventListener('pointerenter',()=>{SM.over=true;clearTimeout(SM.hideT);SM.hideT=0;});
  el.addEventListener('pointerleave',()=>{SM.over=false;smSchedHide();});
  el.addEventListener('pointerdown',e=>e.stopPropagation());
  el.addEventListener('click',e=>{
    const b=e.target.closest('.smt');if(!b||SM.btn<0)return;const t=SM.tiles[SM.btn][+b.dataset.i];
    Au.ensure();
    if(t.m){bgSet(BG.mode===t.m?0:t.m);Au.click(1.4,.5);smSync();return;}
    if(t.g){if(t.g.some(dogOut))t.g.forEach((v,i)=>{const I=DOGS.byV[v];if(dogOut(v))dogLeave(I,i*DOGS.stagger);});else dogSummon(t.g.filter(v=>DV.v[v]&&DV.v[v].ready));}
    else dogSummonOne(t.v);
    Au.click(1.4,.5);smSync();
  });
  SM.el=el;return el;
}
function smShow(b){
  const el=SM.el||smBuild();
  el.innerHTML='<div class="smh">'+SM.title[b]+'</div><div class="smr">'+SM.tiles[b].map((t,i)=>'<button class="smt" data-i="'+i+'" title="'+t.n+'">'
    +(t.m?'<img alt="" src="models/thumbs/'+t.img+'.png">':t.g?'<span class="smg">'+t.g.map(v=>'<img alt="" src="models/thumbs/v'+v+'.png">').join('')+'</span>':'<img alt="" src="models/thumbs/v'+t.v+'.png">')+'<span>'+t.n+'</span></button>').join('')+'</div>';
  const p=rem.btn[b].getWorldPosition(new T.Vector3()).project(cam),sx=(p.x+1)/2*innerWidth,sy=(1-p.y)/2*innerHeight;
  el.style.visibility='hidden';el.classList.add('open');
  const w=el.offsetWidth,h=el.offsetHeight,left=sx>innerWidth/2;   // the remote lives at the right edge: the card opens to its left
  el.style.left=Math.max(8,Math.min(innerWidth-w-8,left?sx-w-46:sx+46))+'px';el.style.top=Math.max(8,Math.min(innerHeight-h-8,sy-h/2))+'px';el.style.visibility='';
  SM.btn=b;smSync();clearInterval(SM.sync);SM.sync=setInterval(smSync,250);
}
function smSync(){if(!SM.el||SM.btn<0)return;SM.el.querySelectorAll('.smt').forEach(b=>b.classList.toggle('on',smOn(SM.tiles[SM.btn][+b.dataset.i])));}
function smHide(){clearTimeout(SM.showT);clearTimeout(SM.hideT);SM.showT=SM.hideT=0;SM.want=-1;if(SM.btn<0&&!(SM.el&&SM.el.classList.contains('open')))return;SM.btn=-1;SM.over=false;clearInterval(SM.sync);if(SM.el)SM.el.classList.remove('open');}
function smSchedHide(){clearTimeout(SM.hideT);SM.hideT=setTimeout(smHide,380);}
function smHover(b){   // b = the remote button under the pointer (-1 = none), called from the canvas pointermove
  if(b!==1&&b!==3&&b!==5)b=-1;
  if(b===1&&!BG_OK)b=-1;
  if(b<0){clearTimeout(SM.showT);SM.showT=0;SM.want=-1;if(SM.btn>=0&&!SM.over&&!SM.hideT)smSchedHide();return;}
  clearTimeout(SM.hideT);SM.hideT=0;
  if(SM.btn===b||SM.want===b)return;
  SM.want=b;clearTimeout(SM.showT);SM.showT=setTimeout(()=>{SM.showT=0;if(SM.want===b)smShow(b);},240);
}
addEventListener('blur',smHide);
