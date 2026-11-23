import {readFileSync} from 'node:fs';import {JSDOM,VirtualConsole} from 'jsdom';
let html=readFileSync('/home/claude/trader_v4.html','utf8').replace('window.__trader={','window.__trader={SS:()=>S,csvOps,exInit,go,');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e.message).slice(0,160)));
const now=Date.now();
const st={cap0:10000,cash:6543.21,srvKey:'CLAVE-SECRETA',dep:[{t:now-1e8,a:1000}],fd:{cap0:10000,cash:9000,pos:{},tr:[],dep:[{t:now-9e7,a:500}]},
 pos:[{manual:true,id:11,s:'AAPL',nm:'Apple',cur:'USD',shares:5,entry:190,stop:170,target:230,last:200,costEur:880,openTs:now-864e5,openDay:'2026-11-22',days:1,f:[1,0,1,0,0]}],
 closed:[{u:'k1',s:'=MSFT',nm:'M',entry:400,exit:420,shares:2,cur:'USD',pnl:35,pct:4.4,why:'objetivo',days:4,open:now-6e8,close:now-4e8,cd:'2026-11-18'}],eq:[],log:[],nube:{rol:'amigo',fid:'a',al:'A',sh:1,sent:[]}};
const dom=new JSDOM(html,{url:'https://diazsantamariaivan-lgtm.github.io/trader-datos/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){const ctx=new Proxy(function(){},{get:(t,k)=>k==='measureText'?(()=>({width:10})):(()=>ctx),set:()=>true,apply:()=>ctx});w.HTMLCanvasElement.prototype.getContext=()=>ctx;w.fetch=async()=>({ok:false,status:404,json:async()=>({}),text:async()=>''});w.localStorage.setItem('traderamano.v4',JSON.stringify(st));}});
await new Promise(r=>setTimeout(r,900));const T=dom.window.__trader,S=T.SS(),d=dom.window.document;
let bad=0;const ok=(c,m)=>{console.log(c?'✔':'✘',m);if(!c)bad++;};
const csv=T.csvOps();const L=csv.replace('﻿','').split('\r\n');
console.log(L.join('\n'));
ok(csv.startsWith('﻿')&&L[0].split(';').length===10,'E1 CSV con cabecera de 10 columnas y codificación para Excel');
ok(L.some(l=>l.includes("'=MSFT")),'E2 un valor que empieza por = se neutraliza (no se ejecuta como fórmula)');
ok(L.some(l=>l.includes('Ingreso acciones')&&l.includes('1000,00'))&&L.some(l=>l.includes('Ingreso fondos')&&l.includes('500,00')),'E3 los ingresos de acciones y de fondos salen en el Excel');
ok(L.some(l=>l.includes('Venta')&&l.includes('35,00')&&l.includes('4,40')),'E4 la venta con su resultado en € y % con coma decimal');
console.log('errores',errs.slice(0,3));console.log(bad?'FALLOS '+bad:'EXPORTAR OK');process.exit(0);
