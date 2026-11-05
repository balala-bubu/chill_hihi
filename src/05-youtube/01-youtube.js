/* ---------- YouTube playback (IFrame API, same approach as wvs_hitster) ---------- */
const YTA={p:null,ready:false,failed:false,waiters:[],plErr:0,plWatch:false,sound:false,cur:null,finished:false,vol:60,infoT:0,pausedAt:null,inf:{i:0,n:0,title:''},
 whenReady(ms){return this.ready?Promise.resolve():new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error(this.failed?'YouTube 播放器載入失敗，請檢查網路或關閉廣告封鎖外掛。':'YouTube 播放器還在載入，請稍後再試。')),ms||10000);this.waiters.push(()=>{clearTimeout(t);res();});});},
 call(fn,...a){try{return this.p&&this.p[fn]?this.p[fn](...a):undefined;}catch(e){console.warn(e);}},
 async readList(id){
  await this.whenReady(12000);
  this.plErr=0;this.plWatch=true;this.call('cuePlaylist',{listType:'playlist',list:id});
  let ids=null;
  try{for(let n=0;n<50;n++){await sleep(300);const r=this.call('getPlaylist');if(r&&r.length){ids=r.filter((v,i)=>/^[\w-]{11}$/.test(v)&&r.indexOf(v)===i);break;}if(this.plErr===100&&n>4)break;}}
  finally{this.plWatch=false;}
  if(!ids||!ids.length){this.call('stopVideo');throw new Error(this.plErr===100?'找不到這份播放清單，或是它設成私人。請把隱私權改成「不公開」或「公開」。':'讀不到這份播放清單。自動產生的合輯（list= 後面是 RD 開頭）不支援。');}
  let vd=null;for(let n=0;n<12;n++){const d=this.call('getVideoData');if(d&&d.title){vd=d;break;}await sleep(250);}
  this.call('stopVideo');
  return {ids,title:vd?vd.title:'',author:vd?vd.author:''};
 },
 nTracks(){return this.cur.yt.ids.length||(this.call('getPlaylist')||[]).length;},   // a default list may be played before its track list has been read
 start(alb,index,t,cue){
  this.cur=alb;this.sound=false;this.finished=false;this.pausedAt=cue?(t||0):null;this.inf={i:0,n:alb.yt.ids.length,title:''};
  this.whenReady(12000).then(()=>{this.call('mute');this.call('setVolume',this.vol);this.call(cue?'cuePlaylist':'loadPlaylist',{listType:'playlist',list:alb.yt.list,index:index||0,startSeconds:t||0});})
   .catch(e=>{window.__ytFail&&window.__ytFail(e.message);});
 },
 setVol(v){this.vol=v*10;if(this.sound){this.call('setVolume',this.vol);this.call(v>0?'unMute':'mute');}},
 time(){const t=this.call('getCurrentTime');return typeof t==='number'&&isFinite(t)&&t>=0?t:(this.pausedAt??0);},
  pause(){this.pausedAt=this.time();this.call('pauseVideo');},
  resume(){if(this.pausedAt!==null){const t=this.time();if(Math.abs(t-this.pausedAt)>1)this.call('seekTo',this.pausedAt,true);}this.call('playVideo');this.pausedAt=null;},
  next(){if(!this.cur)return;const idx=this.call('getPlaylistIndex'),n=this.cur.yt.ids.length;if(n<1)return;
    const next=typeof idx==='number'&&idx>=0?(idx+1)%n:0;
    this.pausedAt=null;this.finished=false;this.call('playVideoAt',next);this.call('playVideo');
    this.inf.i=next;this.inf.title='';this.infoT=0;},
 tick(dt){if(!this.cur)return;this.infoT-=dt;if(this.infoT>0)return;this.infoT=.5;const d=this.call('getVideoData'),i=this.call('getPlaylistIndex');
  this.inf={i:typeof i==='number'&&i>=0?i:0,n:this.cur.yt.ids.length,title:d&&d.title||''};},
 onState(s){
  if(!this.cur)return;
  if(s===1&&!this.sound){this.sound=true;if(Au.vol>0){this.call('unMute');this.call('setVolume',Au.vol*10);}}
   if(s===2&&this.pausedAt===null)this.pausedAt=this.time();
   if(s===1)this.pausedAt=null;
  if(s===0){const i=this.call('getPlaylistIndex');if(typeof i==='number'&&i>=this.nTracks()-1)this.finish();}
 },
 onError(c){
  if(this.plWatch){this.plErr=c;return;}
  if(!this.cur)return;const i=this.call('getPlaylistIndex');
  if(typeof i==='number'&&i>=this.nTracks()-1)this.finish();else this.call('nextVideo');
 },
 finish(){if(this.finished)return;this.finished=true;Au.playing=false;window.__ytEnd&&window.__ytEnd();}
};
window.onYouTubeIframeAPIReady=()=>{
  try{YTA.p=new YT.Player('ytp',{host:'https://www.youtube-nocookie.com',width:'910',height:'512',
   playerVars:{controls:0,disablekb:1,playsinline:1,rel:0,fs:0,iv_load_policy:3,modestbranding:1,origin:location.origin},
   events:{onReady(){YTA.ready=true;YTA.waiters.splice(0).forEach(f=>f());},onStateChange(e){YTA.onState(e.data);},onError(e){YTA.onError(e.data);}}});}
  catch(e){YTA.failed=true;console.warn(e);}
};
{const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.async=true;s.onerror=()=>{YTA.failed=true;};document.head.appendChild(s);}

