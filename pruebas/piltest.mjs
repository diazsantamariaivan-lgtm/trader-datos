import {readFileSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
let html=readFileSync('/home/claude/td-clone/docs/index.html','utf8').replace('window.__trader={','window.__trader={go,renderPil,srvAgo,SS:()=>S,CXX:()=>CX,');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e.message).slice(0,200)));
const dom=new JSDOM(html,{url:'https://diazsantamariaivan-lgtm.github.io/trader-datos/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
 beforeParse(w){const ctx=new Proxy(function(){},{get:(t,k)=>k==='measureText'?(()=>({width:10})):(()=>ctx),set:()=>true,apply:()=>ctx});w.HTMLCanvasElement.prototype.getContext=()=>ctx;w.fetch=async()=>({ok:false,status:404,json:async()=>({}),text:async()=>''});
 w.localStorage.setItem('traderamano.v4',JSON.stringify({gh:'diazsantamariaivan-lgtm/trader-datos'}));}});
const w=dom.window;await new Promise(r=>setTimeout(r,1500));
const T=w.__trader;
console.log('--- vacío');T.go('pil');const d=w.document;console.log(d.querySelector('#t-pil').classList.contains('on'),d.querySelector('#pilHead').textContent.slice(0,200));
console.log(d.querySelector('#pilFun').textContent.slice(0,120),'|',d.querySelector('#pilOpen').textContent.slice(0,60),'|',d.querySelector('#pilLog').textContent.slice(0,60));
console.log('--- con datos');T.CXX().d={t:Date.now()/1000,idx:{SPX:{p:6100,s200:5800}}};
const S=T.SS();S.pos.push({s:'PG',nm:'P&G',cur:'USD',shares:2,entry:158.2,stop:150.1,target:174.4,last:160.4,days:3,costEur:290,openTs:Date.now()-3*864e5,pred:{pT:0.54,ev:0.9}});
S.closed.unshift({s:'KO',pnl:-8,pct:-2.6,why:'stop',days:6,manual:false,mom:false},{s:'ITX',pnl:15,pct:5.1,why:'objetivo',days:8,manual:false,mom:false});
S.srv=true;S.srvAt=Date.now()-20*60000;S.log.unshift({t:Date.now(),x:'Compra <b>PG</b>: probabilidad 54 %'});
S.shBench={d:'2026-11-17',x:6000};S.eq.push({t:new Date('2026-11-17T12:00:00').getTime(),e:10000},{t:Date.now(),e:10120});w.document.querySelector('#pilGo').click();
console.log(d.querySelector('#pilHead').textContent);console.log(d.querySelector('#pilOpen').textContent);console.log(d.querySelector('#pilLog').textContent.slice(0,80));
d.querySelector('#pilBack').click();console.log('vuelve a hoy',d.querySelector('#t-hoy').classList.contains('on'));
console.log('errores',errs);process.exit(0);
