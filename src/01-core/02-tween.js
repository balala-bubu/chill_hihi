/* ---------- tween ---------- */
const tweens=[];
function tween(dur,fn,e,delay){return new Promise(res=>{tweens.push({t:-(delay||0),dur,fn,e:e||ease.io3,res});});}
function stepTweens(dt){for(let i=tweens.length-1;i>=0;i--){const w=tweens[i];w.t+=dt;if(w.t<0)continue;const k=clamp(w.t/w.dur,0,1);w.fn(w.e(k));if(k>=1){tweens.splice(i,1);w.res();}}}

