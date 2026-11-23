import {readFileSync} from 'node:fs';import {JSDOM,VirtualConsole} from 'jsdom';
let html=readFileSync('/home/claude/trader_v4.html','utf8').replace('window.__trader={','window.__trader={SS:()=>S,buyManual,QROW,FD,fdS,fdTotals,fdFixFx,fdBuy,fdSell,fdRow,fdPx,fdHero,fxv,');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e.message).slice(0,160)));
const FDJ=JSON.parse(readFileSync('/tmp/fxt/fd.json')),H=JSON.parse(readFileSync('/tmp/fxt/h_gbp.json'));
const buy=new Date('2026-11-21T12:00:00Z').getTime();
const st={cap0:10000,cash:0,pos:[],closed:[],eq:[],log:[],fd:{cap0:10000,cash:5000,pos:{
 '0P000127WE.L':{u:2500/33.0435,c:2500,t:buy,sig:{}},                    // GBP comprado SIN tipo de cambio (fallo)
},tr:[]}};
const dom=new JSDOM(html,{url:'https://diazsantamariaivan-lgtm.github.io/trader-datos/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){const ctx=new Proxy(function(){},{get:(t,k)=>k==='measureText'?(()=>({width:10})):(()=>ctx),set:()=>true,apply:()=>ctx});w.HTMLCanvasElement.prototype.getContext=()=>ctx;w.fetch=async()=>({ok:false,status:404,json:async()=>({}),text:async()=>''});w.localStorage.setItem('traderamano.v4',JSON.stringify(st));}});
await new Promise(r=>setTimeout(r,900));const T=dom.window.__trader,S=T.SS();
T.FD.d=FDJ;T.FD.h['0P000127WE.L']=H;S.fx={};
let bad=0;const ok=(c,m)=>{console.log(c?'✔':'✘',m);if(!c)bad++;};
const F=T.fdS(),sym='0P000127WE.L';
let t=T.fdTotals();
ok(Math.abs(t.inv-2500)<0.01,'1 sin tipo de cambio el fondo en libras se valora a su coste ('+t.inv.toFixed(2)+' €), ya NO inventa un +14 %');
const msg=T.fdBuy(sym,100);ok(/tipo de cambio/.test(msg)&&!F.pos[sym].u0&&Math.abs(F.pos[sym].c-2500)<1e-9,'2 comprar otro fondo en libras sin tipo de cambio se rechaza: «'+msg+'»');
S.fx.GBP={v:0.8716,at:Date.now()};
t=T.fdTotals();console.log('   con el tipo de cambio y la compra errónea: valor',t.inv.toFixed(2),'(el fallo: +'+((t.inv/2500-1)*100).toFixed(1)+' %)');
await T.fdFixFx();
t=T.fdTotals();const g=(t.inv/2500-1)*100;
ok(F.pos[sym].u0>0&&Math.abs(F.pos[sym].c-2500)<1e-9,'3 la compra errónea se corrige y se guarda la participación antigua (u0) y el coste no cambia');
const realNav=H.c[H.c.length-1]/33.0435-1;console.log('   tras corregir: valor',t.inv.toFixed(2),'rentabilidad',g.toFixed(2),'% (el fondo cotiza igual que al comprar: la real es ~0 %)');
ok(Math.abs(g)<0.5,'4 la rentabilidad real queda cerca de 0 %, no +17 %');
const u1=F.pos[sym].u;await T.fdFixFx();ok(F.pos[sym].u===u1,'5 reparar dos veces no vuelve a cambiar nada');
// posición bien comprada: no se toca
F.pos['0P000127WE.L'].fixed=0;delete F.fxfix[sym];
const good=T.fdS();good.pos[sym]={u:2500/(33.0435/0.8716),c:2500,t:buy,sig:{}};await T.fdFixFx();
ok(Math.abs(good.pos[sym].u-2500/(33.0435/0.8716))<1e-9&&!good.pos[sym].u0,'6 una compra que ya estaba bien hecha NO se modifica');
// compra normal con tipo de cambio
delete F.pos['x'];S.fx.GBP={v:0.8716,at:Date.now()};const m2=T.fdBuy(sym,100);ok(m2==='',"7 con tipo de cambio la compra funciona");
ok(!!dom.window.localStorage.getItem('traderamano.v4.pre_fxfix'),'8 se guardó copia previa antes de reparar');
// acciones: sin tipo de cambio no se compra una acción en dólares
S.fx={};S.cash=5000;S.pos=[];S.rows.AAPL={s:'AAPL',nm:'Apple',cur:'USD',p:200,atr:4,pen:[0,0],rsi:50,ev:1};
dom.window.document.body.insertAdjacentHTML('beforeend','<div id="mbMsg"></div>');await T.buyManual('AAPL',500,{});ok(S.pos.length===0&&/tipo de cambio/.test(dom.window.document.querySelector('#mbMsg').textContent),'9 acciones: sin tipo de cambio la compra manual no se hace ('+S.pos.length+' abiertas)');
console.log('errores',errs.slice(0,3));console.log(bad?'FALLOS '+bad:'FONDOS-DIVISA OK');process.exit(0);
