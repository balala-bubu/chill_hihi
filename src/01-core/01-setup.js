(async function(){
'use strict';
const T=THREE, TAU=Math.PI*2;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function fitText(x,t,w){t=String(t==null?'':t);if(x.measureText(t).width<=w)return t;while(t.length>1&&x.measureText(t+'…').width>w)t=t.slice(0,-1);return t+'…';}
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), lerp=(a,b,t)=>a+(b-a)*t;
const ease={lin:t=>t,out3:t=>1-Math.pow(1-t,3),io3:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,in2:t=>t*t,io2:t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,
  outBack:t=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)},out5:t=>1-Math.pow(1-t,5)};
const MONO='"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace';
try{await Promise.race([Promise.all([document.fonts.load('700 40px "JetBrains Mono"'),document.fonts.load('500 24px "JetBrains Mono"')]),new Promise(r=>setTimeout(r,1800))]);}catch(e){}

