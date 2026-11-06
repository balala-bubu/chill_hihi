/* ---------- YouTube playlist -> album ---------- */
const $id=i=>document.getElementById(i);
const LS={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
function loadImg(src){return new Promise(res=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>res(im);im.onerror=()=>res(null);im.src=src;});}
function coverOf(im){   // cover image -> {im, avg colour}; null if it has no CORS headers (cannot be used as a texture)
  try{const c=document.createElement('canvas');c.width=c.height=8;const x=c.getContext('2d');x.drawImage(im,0,0,8,8);const d=x.getImageData(0,0,8,8).data;let r=0,g=0,b=0;
    for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];}const n=d.length/4;return {im,avg:[r/n,g/n,b/n]};}
  catch(e){return null;}
}
async function loadCoverUrl(u){const im=await loadImg(u);return im&&im.naturalWidth>50?coverOf(im):null;}
async function loadCover(id){
  for(const q of ['hq720','mqdefault']){
    const im=await loadImg('https://i.ytimg.com/vi/'+id+'/'+q+'.jpg');
    if(im&&im.naturalWidth>200)return coverOf(im);
  }
  return null;
}
let cbN=0;
function jsonp(url){return new Promise((res,rej)=>{const name='mtcb'+(++cbN)+'_'+(Math.random()*1e6|0),s=document.createElement('script');
  const t=setTimeout(()=>{done();rej(new Error('timeout'));},7000);
  function done(){clearTimeout(t);delete window[name];s.remove();}
  window[name]=d=>{done();res(d);};s.onerror=()=>{done();rej(new Error('script'));};s.src=url+'&callback='+name;document.head.appendChild(s);});}
async function plMeta(id){try{const d=await jsonp('https://noembed.com/embed?url='+encodeURIComponent('https://www.youtube.com/playlist?list='+id));return d&&d.title?{t:d.title,a:d.author_name||''}:null;}catch(e){return null;}}
function addAlbum(d){
  ALBUMS.push(d);N=ALBUMS.length;buildAlbum(d,N-1);const a=albums[N-1];a.born=0;tween(.9,k=>{a.born=k;},ease.outBack);return N-1;
}
let saved=LS.get('mt1.lists',[]),addBusy=false,msgT=0;
function say(t,ms){const el=$id('addMsg');el.textContent=t||'';clearTimeout(msgT);if(ms)msgT=setTimeout(()=>{el.textContent='';},ms);}
function setForm(open){$id('addForm').hidden=!open;if(open)setTimeout(()=>$id('addUrl').focus(),30);}
async function addFromUrl(raw){
  if(addBusy)return;raw=String(raw||'').trim();
  const m=raw.match(/[?&]list=([\w-]+)/)||(/^(PL|UU|OL|FL)[\w-]{10,}$/.test(raw)?[0,raw]:null);
  if(!m){say('網址裡找不到播放清單（要有 list=…）。',5000);return;}
  const id=m[1];
  if(/^RD/.test(id)){say('YouTube 自動產生的合輯讀不到，請貼一般的播放清單。',6000);return;}
  if(location.protocol==='file:'){say('請用網址開啟本頁（GitHub Pages 或本機伺服器），YouTube 不能在 file:// 播放。',8000);return;}
  const ex=ALBUMS.findIndex(a=>a.yt&&a.yt.list===id);if(ex>=0){sxTarget=ex;say('這份清單已經在櫃子裡了。',3000);setForm(false);return;}
  addBusy=true;$id('addGo').disabled=true;say('讀取播放清單…');
  try{
    const r=await YTA.readList(id);say('取得封面…');
    const [cov,meta]=await Promise.all([loadCover(r.ids[0]),plMeta(id)]);
    const o={list:id,ids:r.ids,title:(meta&&meta.t)||r.title||'',author:(meta&&meta.a)||r.author||''};
    const idx=addAlbum(ytAlbum(o,cov));saved.push(o);LS.set('mt1.lists',saved);
    sxTarget=idx;setForm(false);$id('addUrl').value='';
    say('已加入「'+(o.title||'播放清單')+'」，共 '+r.ids.length+' 首'+(cov?'':'（封面讀不到，改用預設圖案）'),5000);
  }catch(e){say(e.message||'讀取失敗，請再試一次。',7000);}
  finally{addBusy=false;$id('addGo').disabled=false;}
}
$id('addForm').addEventListener('submit',e=>{e.preventDefault();Au.ensure();addFromUrl($id('addUrl').value);});
window.__ytEnd=()=>{if(status==='playing'||status==='paused'){status='stopped';Au.elapsed=0;}};
window.__ytFail=m=>{if(status==='playing'){status='stopped';}say(m||'YouTube 播放失敗',6000);};
(async()=>{for(const o of saved){const cov=await loadCover(o.ids[0]);addAlbum(ytAlbum(o,cov));}if(saved.length)sxTarget=N-1;applyOrder(LS.get('mt1.order',[]));})();

/* ---------- default playlists: fill in tracks + cover in the background ----------
   Track lists are cached in localStorage (mt1.defids) so later visits only fetch the covers.
   Reading a list borrows the shared YouTube player, so it only runs while nothing is playing. */
const defCache=LS.get('mt1.defids',{});
ALBUMS.forEach(d=>{if(d.def&&Array.isArray(defCache[d.yt.list]))d.yt.ids=defCache[d.yt.list];});
const defIdle=()=>!cd&&!busy&&state==='home'&&status==='empty';
async function defCover(d){   // swap the generated cover for the real one, only while nothing is lifted off the shelf
  if(d.coverDone||d.coverBusy)return;d.coverBusy=true;
  try{
    let cov=d.coverUrl?await loadCoverUrl(d.coverUrl):null;   // DEFAULT_LISTS img first, then the first track's thumbnail
    if(!cov&&d.yt.ids.length)cov=await loadCover(d.yt.ids[0]);
    if(!cov)return;
    while(ALBUMS.indexOf(d)>=0&&!(state==='home'&&!cd&&!busy&&sel<0&&!shelfDrag))await sleep(600);
    const i=ALBUMS.indexOf(d);if(i<0)return;
    Object.assign(d,ytAlbum({list:d.yt.list,ids:d.yt.ids,title:d.t,author:d.a},cov));rebuildAt(i);d.coverDone=true;
  }finally{d.coverBusy=false;}
}
async function defLoad(d){
  if(!d.yt.ids.length){
    for(let k=0;k<3&&!d.yt.ids.length;k++){
      while(!defIdle())await sleep(500);
      try{const r=await YTA.readList(d.yt.list);d.yt.ids=r.ids;defCache[d.yt.list]=r.ids;LS.set('mt1.defids',defCache);}
      catch(e){console.warn('default list',d.t,e&&e.message);if(YTA.failed)return;await sleep(4000);}
    }
  }
  defCover(d);
}
(async()=>{
  const defs=ALBUMS.filter(d=>d.def);
  defs.filter(d=>d.yt.ids.length||d.coverUrl).forEach(defCover);
  for(const d of defs.filter(d=>!d.yt.ids.length)){if(YTA.failed)break;await defLoad(d);}
})();

