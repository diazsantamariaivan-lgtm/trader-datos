import {readFileSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
let html=readFileSync('/home/claude/trader_v4.html','utf8').replace('window.__trader={','window.__trader={evalPos,closePos,dayKey,fxOf,S:()=>S,equity,');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e.message).slice(0,160)));
const dom=new JSDOM(html,{url:'https://x.github.io/trader-datos/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){const ctx=new Proxy(function(){},{get:(t,k)=>k==='measureText'?(()=>({width:10})):(()=>ctx),set:()=>true,apply:()=>ctx});w.HTMLCanvasElement.prototype.getContext=()=>ctx;w.fetch=async()=>({ok:false,status:404,json:async()=>({}),text:async()=>''});}});
const w=dom.window;await new Promise(r=>setTimeout(r,1000));const T=w.__trader;const S=(typeof T.S==="function")?T.S():T.S;
const day=(i)=>Date.UTC(2026,5,1+i)/1000+3600*9; // días consecutivos (incluye fines de semana: solo importa el orden)
function bars(spec){return {t:spec.map((_,i)=>day(i+1)),o:spec.map(b=>b[0]),h:spec.map(b=>b[1]),l:spec.map(b=>b[2]),c:spec.map(b=>b[3]),meta:{regularMarketPrice:spec[spec.length-1][3]}};}
const pos=()=>({entry:100,stop:95,target:110,openDay:T.dayKey(day(0)*1000),shares:10,cur:'EUR'});
const ok=(n,c,x)=>console.log(c?'✔':'✘',n,x!==undefined?JSON.stringify(x):'');
S.maxDays=10;S.prorroga=true;
let r=T.evalPos(pos(),bars([[100,102,99,101],[90,92,88,91]]));ok('hueco bajista: sale a la apertura (90), no al stop (95)',r.done&&r.px===90&&r.why==='stop',r);
r=T.evalPos(pos(),bars([[100,103,94,96]]));ok('mínimo toca el stop: sale en 95',r.done&&r.px===95&&r.why==='stop',r);
r=T.evalPos(pos(),bars([[112,115,111,114]]));ok('hueco alcista sobre objetivo: sale a la apertura',r.done&&r.px===112&&r.why==='objetivo',r);
r=T.evalPos(pos(),bars([[100,111,94,100]]));ok('mismo día stop y objetivo: gana el stop (prudente)',r.px===95&&r.why==='stop',r);
const flat=Array.from({length:10},()=>[100,101,99,100]);
r=T.evalPos(pos(),bars(flat));ok('plazo 10 días sin moverse: cierra por tiempo',r.done&&r.why==='tiempo'&&r.days===10,r);
const up=Array.from({length:10},(_,i)=>[100+i*0.5,101+i*0.5,99+i*0.5,100.5+i*0.5]);
const pre=Array.from({length:20},(_,i)=>[95+i*0.2,96+i*0.2,94+i*0.2,95+i*0.2]);let p=pos();p.openDay=T.dayKey(day(20)*1000);r=T.evalPos(p,bars(pre.concat(up)));ok('día 10 con tendencia alcista: prórroga y sube el stop',!r.done&&p.ext&&p.stop>=100,{stop:p.stop,ext:p.ext});
r=T.evalPos(pos(),bars([[100,101,99,100]]));ok('día de apertura no cuenta (openDay)',!r.done&&r.days===1,r);
// contabilidad de cierre en dólares
S.cash=10000;S.pos=[];S.closed=[];S.slip=0.1;S.com=1;
const fx=T.fxOf('USD')||1.1;S.fx.USD={v:1.10,at:Date.now()};
const sh=10,pe=100,cost=sh*pe/1.10;S.cash-=cost+S.com;
const P={id:'t1',s:'TEST',nm:'T',cur:'USD',shares:sh,entry:pe,stop:90,target:120,last:pe,costEur:cost,openTs:Date.now()-5*864e5,openDay:'2026-06-01',days:5};S.pos.push(P);
const eq0=T.equity();T.closePos(P,{px:110,why:'objetivo',days:5,dk:T.dayKey(Date.now())});
const c=S.closed[0];ok('cierre USD: caja = inicial + pnl',Math.abs(S.cash-(10000+c.pnl))<0.01,{cash:+S.cash.toFixed(2),pnl:+c.pnl.toFixed(2),pct:+c.pct.toFixed(2)});
ok('pnl = (110-100)*10/1.10 - 2 comisiones',Math.abs(c.pnl-((110-100)*10/1.10-2))<0.01,{esperado:+((110-100)*10/1.10-2).toFixed(2)});
console.log('errores',errs.slice(0,3));process.exit(0);
