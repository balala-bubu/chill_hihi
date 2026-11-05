/* ---------- edit / reset playlist shelf ---------- */
function disposeAlbum(a){scene.remove(a.g);a.g.traverse(o=>{if(o.geometry&&o.geometry!==cdGeo)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}});}
function reindexAlbums(){albumMeshes.length=0;albums.forEach((a,i)=>{a.meshes.forEach(m=>{m.userData.album=i;albumMeshes.push(m);});});}
function canEdit(){if(busy||cd||state!=='home'){say('請先把 CD 放回專輯櫃，再編輯清單。',4000);return false;}return true;}
function removeAlbumAt(i){disposeAlbum(albums[i]);albums.splice(i,1);ALBUMS.splice(i,1);N=ALBUMS.length;reindexAlbums();sxTarget=clamp(Math.round(Math.min(sxTarget,N-1)),0,N-1);}
function rebuildAt(i){disposeAlbum(albums[i]);buildAlbum(ALBUMS[i],i);const a=albums.pop();albums.splice(i,1,a);reindexAlbums();}
function renameAlbum(i,name){ALBUMS[i].t=name;rebuildAt(i);}
const albumKey=d=>d.yt?d.yt.list:d.t;
function saveOrder(){LS.set('mt1.order',ALBUMS.map(albumKey));saved.sort((a,b)=>ALBUMS.findIndex(d=>d.yt&&d.yt.list===a.list)-ALBUMS.findIndex(d=>d.yt&&d.yt.list===b.list));LS.set('mt1.lists',saved);}
function applyOrder(keys){   // restore the saved shelf order (unknown albums keep their relative place at the end)
  if(!Array.isArray(keys)||!keys.length)return;
  const rank=d=>{const k=keys.indexOf(albumKey(d));return k<0?1e6+ALBUMS.indexOf(d):k;};
  const before=ALBUMS.map(albumKey).join('|');ALBUMS.sort((a,b)=>rank(a)-rank(b));
  if(ALBUMS.map(albumKey).join('|')!==before)for(let i=0;i<ALBUMS.length;i++)rebuildAt(i);
}
function moveAlbum(i,dir){
  const j=i+dir;if(j<0||j>=ALBUMS.length||!canEdit())return;
  [ALBUMS[i],ALBUMS[j]]=[ALBUMS[j],ALBUMS[i]];rebuildAt(i);rebuildAt(j);sxTarget=j;saveOrder();renderEdit();
}
let editMode='sort';
function renderEdit(){
  const ul=$id('editList');ul.textContent='';let n=0;const sort=editMode==='sort';
  $id('editTitle').textContent=sort?'編輯排序・點名稱可改名':'刪除播放清單';
  ALBUMS.forEach((d,i)=>{
    if(!sort&&!d.yt)return;n++;
    const li=document.createElement('li'),inp=document.createElement('input'),c=document.createElement('span');
    inp.value=d.t;inp.maxLength=60;inp.setAttribute('aria-label','清單名稱');c.className='cnt';c.textContent=d.yt?d.yt.ids.length+' 首':'內建';
    if(!d.yt){inp.readOnly=true;li.className='ro';}
    inp.addEventListener('change',()=>{const v=inp.value.trim();if(!v){inp.value=d.t;return;}if(!canEdit()){inp.value=d.t;return;}
      const idx=ALBUMS.indexOf(d);renameAlbum(idx,v);const s=saved.find(x=>x.list===d.yt.list);if(s){s.title=v;LS.set('mt1.lists',saved);}say('已更新名稱。',2500);});
    if(sort){
      const up=document.createElement('button'),dn=document.createElement('button');
      up.className=dn.className='k3 ord';up.type=dn.type='button';up.textContent='▲';dn.textContent='▼';up.setAttribute('aria-label','上移 '+d.t);dn.setAttribute('aria-label','下移 '+d.t);
      up.disabled=i===0;dn.disabled=i===ALBUMS.length-1;
      up.addEventListener('click',()=>moveAlbum(ALBUMS.indexOf(d),-1));dn.addEventListener('click',()=>moveAlbum(ALBUMS.indexOf(d),1));
      li.append(up,dn,inp,c);
    }else{
      const b=document.createElement('button');b.className='k3 del';b.type='button';b.textContent='×';b.setAttribute('aria-label','刪除 '+d.t);
      b.addEventListener('click',()=>{if(!canEdit())return;const idx=ALBUMS.indexOf(d);removeAlbumAt(idx);saved=saved.filter(x=>x.list!==d.yt.list);LS.set('mt1.lists',saved);saveOrder();renderEdit();say('已刪除「'+d.t+'」。',3000);});
      li.append(inp,c,b);inp.readOnly=true;li.className='ro';
    }
    ul.appendChild(li);});
  $id('editEmpty').hidden=n>0;$id('editEmpty').textContent=sort?'還沒有專輯。':'還沒有加入播放清單。';
  const rb=$id('resetBtn');rb.hidden=sort;const has=ALBUMS.some(d=>d.yt);rb.disabled=!has;rb.style.opacity=has?'':'.5';
}
let resetT=0;
function resetBtnState(sure){const b=$id('resetBtn');b.classList.toggle('sure',sure);b.textContent=sure?'再按一次確認':'回復預設';clearTimeout(resetT);if(sure)resetT=setTimeout(()=>resetBtnState(false),4000);}
const menuEl=$id('menu'),moreBtn=$id('moreBtn');
function setMenu(open){menuEl.hidden=!open;moreBtn.setAttribute('aria-expanded',open?'true':'false');}
function setPanel(mode){const pn=$id('editPanel');if(!mode){pn.hidden=true;return;}editMode=mode;pn.hidden=false;resetBtnState(false);renderEdit();}
moreBtn.addEventListener('click',e=>{e.stopPropagation();Au.ensure();setMenu(menuEl.hidden);});
menuEl.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;Au.ensure();setMenu(false);const act=b.dataset.act;
  if(act==='add'){setPanel(null);setForm(true);}
  else{setForm(false);setPanel(act);}
});
document.addEventListener('pointerdown',e=>{if(!menuEl.hidden&&!menuEl.contains(e.target)&&e.target!==moreBtn&&!moreBtn.contains(e.target))setMenu(false);},true);
$id('stage').addEventListener('pointerdown',()=>{setMenu(false);},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){setMenu(false);setPanel(null);setForm(false);}});
$id('resetBtn').addEventListener('click',()=>{
  if(!$id('resetBtn').classList.contains('sure')){resetBtnState(true);return;}
  if(!canEdit()){resetBtnState(false);return;}
  for(let i=ALBUMS.length-1;i>=0;i--)if(ALBUMS[i].yt)removeAlbumAt(i);
  saved=[];LS.set('mt1.lists',saved);resetBtnState(false);renderEdit();say('已回復預設專輯。',3000);
});

