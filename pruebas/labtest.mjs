import {readFileSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
let html=readFileSync('/home/claude/trader_v4.html','utf8').replace('window.__trader={','window.__trader={fdMode,fdRender,FD,');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e.message).slice(0,200)));
const dom=new JSDOM(html,{url:'https://diazsantamariaivan-lgtm.github.io/trader-datos/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
 beforeParse(w){const ctx=new Proxy(function(){},{get:(t,k)=>k==='measureText'?(()=>({width:10})):(()=>ctx),set:()=>true,apply:()=>ctx});w.HTMLCanvasElement.prototype.getContext=()=>ctx;
 w.fetch=async(u)=>{u=String(u);const m=/fondos\/(fd\.json|lab\.json|fh\/([^?]+))/.exec(u);if(m){try{const f=m[1].startsWith('fh/')?'fh/'+decodeURIComponent(m[2]):m[1];const b=readFileSync('/tmp/fdout/'+f,'utf8');return {ok:true,status:200,json:async()=>JSON.parse(b),text:async()=>b};}catch(e){}}return {ok:false,status:404,json:async()=>({}),text:async()=>''};};
 w.localStorage.setItem('traderamano.v4',JSON.stringify({gh:'diazsantamariaivan-lgtm/trader-datos'}));}});
const w=dom.window;await new Promise(r=>setTimeout(r,1200));const T=w.__trader;T.fdMode(true);await new Promise(r=>setTimeout(r,1500));
T.FD.tab='lab';T.fdRender();const d=w.document;const first=d.querySelector('[data-lp]');console.log('carteras visibles',d.querySelectorAll('[data-lp]').length);first.click();await new Promise(r=>setTimeout(r,200));console.log('detalle:',d.querySelector('[data-lp]').textContent.slice(0,500));d.querySelector('[data-lall]').click();console.log('tras ver todas',d.querySelectorAll('[data-lp]').length);d.querySelectorAll('[data-lp]')[40].click();console.log('cartera 41:',d.querySelectorAll('[data-lp]')[40].textContent.slice(0,400));console.log('errs',errs);process.exit(0);
