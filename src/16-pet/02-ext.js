/* ---------- normal page: switch the floating player (Chrome extension) on or off ----------
   The extension marks every page with data-chillhihi-ext and listens for these window messages.
   It floats the player over whatever tab you are on, except on this site itself. */
if(!PET.on){
  const item=document.querySelector('#menu [data-act="widget"]');
  const present=()=>document.documentElement.dataset.chillhihiExt==='1';
  let on=false;
  const label=()=>{if(item)item.lastChild.textContent='懸浮播放器：'+(present()?(on?'開':'關'):'未安裝');};
  addEventListener('message',e=>{
    if(e.source!==window||!e.data||e.data.chillhihi!=='widget-state')return;
    const was=on;on=!!e.data.enabled;label();
    if(on&&!was&&(status==='playing'||status==='paused')){Au.stop();status='stopped';}   // from now on the floating player plays, not this tab
  });
  const query=()=>postMessage({chillhihi:'query-widget'},location.origin);
  setTimeout(()=>{query();label();},600);
  if(item){
    $id('moreBtn').addEventListener('click',()=>{query();label();});
    item.addEventListener('click',()=>{
      if(!present()){say('還沒安裝「chill_hihi 懸浮播放器」Chrome 擴充功能，安裝方式見 extension/README.md。',7000);return;}
      postMessage({chillhihi:'toggle-widget'},location.origin);
      say(on?'已關閉懸浮播放器。':'懸浮播放器已開啟，會浮在你瀏覽的每個分頁右下角。',5000);
    });
  }
}
