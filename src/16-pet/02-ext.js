/* ---------- normal page <-> floating player (Chrome extension) ----------
   The extension marks every page with data-chillhihi-ext and talks to this page through window messages.
   While a floating player is alive somewhere (any other tab), THAT player makes the sound and this page only
   remote-controls it and mirrors it:
     this page -> floating player   play / pause / next / stop / "this CD" (site-cmd)
     floating player -> this page   which CD is in and whether it plays (widget-state)
   When no floating player is alive (extension off, no other tab), this page plays on its own as usual. */
if(!PET.on){
  const item=document.querySelector('#menu [data-act="widget"]');
  const present=()=>document.documentElement.dataset.chillhihiExt==='1';
  let enabled=false,aliveAt=0,applying=false,wasVia=false;
  const via=()=>enabled&&Date.now()-aliveAt<9000;
  const label=()=>{if(item)item.lastChild.textContent='懸浮播放器：'+(present()?(enabled?'開':'關'):'未安裝');};
  const send=c=>postMessage({chillhihi:'site-cmd',cmd:c},location.origin);
  const yt=()=>!!(Au.alb&&Au.alb.yt);

  /* playback calls of the YouTube albums are redirected while the floating player is alive (or while mirroring it) */
  const o={start:Au.start,resume:Au.resume,pause:Au.pause,stop:Au.stop,skipNext:Au.skipNext};
  Au.start=function(alb,i,t,cue){
    if(alb&&alb.yt&&(applying||via())){this.alb=alb;this.elapsed=t||0;this.playing=!cue;if(!applying)send({a:'start',list:alb.yt.list,index:i||0,time:t||0,playing:true});return;}
    return o.start.apply(this,arguments);};
  Au.resume=function(){if(yt()&&(applying||via())){this.playing=true;if(!applying)send({a:'play'});return;}return o.resume.apply(this,arguments);};
  Au.pause=function(){if(yt()&&(applying||via())){this.playing=false;if(!applying)send({a:'pause'});return;}return o.pause.apply(this,arguments);};
  Au.stop=function(){if(yt()&&(applying||via())){this.playing=false;this.elapsed=0;if(!applying)send({a:'stop'});return;}return o.stop.apply(this,arguments);};
  Au.skipNext=function(){if(yt()&&(applying||via())){this.elapsed=0;this.playing=true;if(!applying)send({a:'next'});return;}return o.skipNext.apply(this,arguments);};

  /* a floating player has just appeared while this page was playing: hand it the CD, this page goes quiet */
  const handOff=()=>{
    if(!(status==='playing'||status==='paused')||!yt())return;
    const live=status==='playing';
    send({a:'start',list:Au.alb.yt.list,index:YTA.inf?YTA.inf.i:0,time:YTA.time(),playing:live});
    o.stop.call(Au);   // local sound off; the widget-state that comes back puts the CD/lamp state right again
  };

  /* mirror what the floating player does */
  const fresh=s=>s&&Date.now()-s.t<10000;
  function mirror(s){
    if(!via()||!s||!s.list||busy||lidOpen)return;
    const ai=ALBUMS.findIndex(a=>a.yt&&a.yt.list===s.list);if(ai<0)return;
    const want=!!s.playing&&fresh(s);
    applying=true;
    try{
      if(!cd||cd.ai!==ai||!cdIn){
        if(cd&&!(cd.mode==='in'))return;   // never disturb a disc the visitor is holding
        if(cd&&cd.root.parent)cd.root.parent.remove(cd.root);
        petRestore({list:s.list,index:s.index,time:s.time,playing:want,t:Date.now()});
      }else if(want&&status!=='playing'){Au.resume();status='playing';}
      else if(!want&&status==='playing'){Au.pause();status='paused';}
    }finally{applying=false;}
  }

  addEventListener('message',e=>{
    if(e.source!==window||!e.data||e.data.chillhihi!=='widget-state')return;
    enabled=!!e.data.enabled;aliveAt=e.data.alive||0;label();
    const v=via();if(v&&!wasVia)handOff();wasVia=v;
    if(v)mirror(e.data.state);
  });
  const query=()=>postMessage({chillhihi:'query-widget'},location.origin);
  setTimeout(()=>{query();label();},600);
  setInterval(()=>{wasVia=via();},1000);
  if(item){
    $id('moreBtn').addEventListener('click',()=>{query();label();});
    item.addEventListener('click',()=>{
      if(!present()){say('還沒安裝「chill_hihi 懸浮播放器」Chrome 擴充功能，安裝方式見 extension/README.md。',7000);return;}
      postMessage({chillhihi:'toggle-widget'},location.origin);
      say(enabled?'已關閉懸浮播放器。':'懸浮播放器已開啟：在其他分頁右下角出現，這個網頁會同步遙控它。',5000);
    });
  }
}
