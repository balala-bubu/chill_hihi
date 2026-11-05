/* ---------- YouTube playlist -> album ---------- */
const $id=i=>document.getElementById(i);
const LS={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
const hashStr=t=>{let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
function loadImg(src){return new Promise(res=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>res(im);im.onerror=()=>res(null);im.src=src;});}
async function loadCover(id){
  for(const q of ['hq720','mqdefault']){
    const im=await loadImg('https://i.ytimg.com/vi/'+id+'/'+q+'.jpg');
    if(im&&im.naturalWidth>200){
      try{const c=document.createElement('canvas');c.width=c.height=8;const x=c.getContext('2d');x.drawImage(im,0,0,8,8);const d=x.getImageData(0,0,8,8).data;let r=0,g=0,b=0;
        for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];}const n=d.length/4;return {im,avg:[r/n,g/n,b/n]};}
      catch(e){return null;}   // image has no CORS headers: cannot be used as a texture
    }
  }
  return null;
}
let cbN=0;
function jsonp(url){return new Promise((res,rej)=>{const name='mtcb'+(++cbN)+'_'+(Math.random()*1e6|0),s=document.createElement('script');
  const t=setTimeout(()=>{done();rej(new Error('timeout'));},7000);
  function done(){clearTimeout(t);delete window[name];s.remove();}
  window[name]=d=>{done();res(d);};s.onerror=()=>{done();rej(new Error('script'));};s.src=url+'&callback='+name;document.head.appendChild(s);});}
async function plMeta(id){try{const d=await jsonp('https://noembed.com/embed?url='+encodeURIComponent('https://www.youtube.com/playlist?list='+id));return d&&d.title?{t:d.title,a:d.author_name||''}:null;}catch(e){return null;}}
function ytAlbum(o,cov){
  const h=hashStr(o.list),hue=h%360;let c;
  if(cov){const [r,g,b]=cov.avg.map(Math.round);c=['rgb('+r+','+g+','+b+')','#f3f1ec','#ee5a2c','#f4b942'];}
  else c=['hsl('+hue+',45%,24%)','hsl('+(hue+25)+',40%,72%)','hsl('+(hue+160)+',70%,56%)','hsl('+(hue+45)+',85%,66%)'];
  return {t:o.title||'PLAYLIST',a:(o.author||'YOUTUBE').toUpperCase(),m:['orbit','tiles','sun','wave','grid','stripe'][h%6],seed:h%997+1,c,img:cov?cov.im:null,yt:{list:o.list,ids:o.ids},bpm:80,root:55,lead:'triangle',prog:[]};
}
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
$id('addUrl').value='https://youtube.com/playlist?list=PL09drhUwnd9l4d_4jNonOhI8iXy_5DfV6&si=GgiwHDWSV4ZndZlZ';
if(!saved.length)setForm(true);
(async()=>{for(const o of saved){const cov=await loadCover(o.ids[0]);addAlbum(ytAlbum(o,cov));}if(saved.length)sxTarget=N-1;applyOrder(LS.get('mt1.order',[]));})();

