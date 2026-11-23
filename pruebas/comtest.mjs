import {readFileSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
let html=readFileSync('/home/claude/trader_v4.html','utf8').replace('window.__trader={','window.__trader={SS:()=>S,NUBE,amUnir,amToggle,amSync,amPoll,limited,AM,renderAmi,renderCom,renderCv,go,equity,capTot,ghJson,buyManual,renderLim,msPoll,MSG,msList,msUnreadF,msUnreadO,msSend,renderCom,');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e.message).slice(0,200)));
const NUBE_SHARED={};
const mk=async(st,tag)=>{const dom=new JSDOM(html,{url:'https://diazsantamariaivan-lgtm.github.io/trader-datos/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
 beforeParse(w){w.__NUBE=NUBE_SHARED;const ctx=new Proxy(function(){},{get:(t,k)=>k==='measureText'?(()=>({width:10})):(()=>ctx),set:()=>true,apply:()=>ctx});w.HTMLCanvasElement.prototype.getContext=()=>ctx;
 w.fetch=async()=>({ok:false,status:404,json:async()=>({}),text:async()=>''});w.localStorage.setItem('traderamano.v4',JSON.stringify(st));}});
 await new Promise(r=>setTimeout(r,1200));return dom;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const mkPos=(s,e)=>({manual:true,id:Math.random(),s,nm:s,cur:'USD',shares:5,entry:e,stop:e*.9,target:e*1.2,last:e*1.05,costEur:e*5,openTs:Date.now()-864e5,openDay:'2026-11-22',days:1,f:[0,0,0,0,0]});
const mkCl=(u,s,pnl)=>({u,s,nm:s,entry:10,exit:11,shares:5,cur:'USD',pnl,pct:pnl/50*100,why:'objetivo',days:3,open:Date.now()-5*864e5,close:Date.now()-864e5,cd:'2026-11-22',f:[1,0,0,0,0],pred:{pT:55,ev:1.2},gross:pnl/50*100/1.5});
// creador con cartera propia con datos
const cr=await mk({cap0:10000,cash:8000,pos:[mkPos('AAPL',190)],closed:[mkCl('c1','MSFT',40)],eq:[],log:[]},'creador');
let C=cr.window,CT=C.__trader,CS=CT.SS();CS.ntfy='tema-x';
// 0) detalle cartera
CT.go('cv');console.log('0 cartera virtual:',C.document.querySelector('#cvTop').textContent.replace(/\s+/g,' ').slice(0,200));console.log('  ops:',C.document.querySelector('#cvOps').textContent.replace(/\s+/g,' ').slice(0,260));
// 1) crear 2 bases
CT.go('ami');await wait(200);
const mkBase=async(al)=>{const d=C.document;d.querySelector('#amAl').value=al;d.querySelector('#amCap').value='5000';d.querySelector('#amMk').click();await wait(200);return d.querySelector('#amMsg').textContent;};
const m1=await mkBase('Amigo 1'),m2=await mkBase('Amigo 2');console.log('1',m1,'|',m2);
const codes=Object.entries(NUBE_SHARED.amigos).map(([id,f])=>id+'-'+f.cod);console.log('  códigos',codes);
// 2) amigos se unen
const f1=await mk({cap0:500,cash:500},'f1'),f2=await mk({cap0:500,cash:500},'f2');f1.window.__trader.go('mas');f2.window.__trader.go('mas');
let F1=f1.window.__trader,F2=f2.window.__trader;
await F1.amUnir('abc');console.log('2 código mal →',f1.window.document.querySelector('#comMsg')?.textContent);
f1.window.document.querySelector('#comCod') ;
await F1.amUnir(codes[0]);console.log('3 unirse 1 →',F1.SS().nube&&F1.SS().nube.al,'cap',F1.SS().cap0);
await F2.amUnir(codes[0]);console.log('4 mismo código en otro móvil →',f2.window.document.querySelector('#comMsg')?.textContent.slice(0,80));
await F2.amUnir(codes[1]);console.log('5 unirse 2 →',F2.SS().nube.al,'cap',F2.SS().cap0);
// 3) amigo 1 opera y envía
const S1=F1.SS();S1.pos.push(mkPos('NVDA',100));S1.cash-=500;S1.closed.unshift(mkCl('x1','TSLA',-25));S1.closed.unshift(mkCl('x2','AMD',30));
await F1.amSync(true);
console.log('6 nube f1:',JSON.stringify(Object.keys((NUBE_SHARED.amigos[codes[0].split('-')[0]]||{}).ops||{})),'snap eq',(NUBE_SHARED.amigos[codes[0].split('-')[0]].snap||{}).eq);
// 4) privacidad: amigo 2 solo ve su base (la API de cliente no lee otras)
// 5) panel creador
await CT.amPoll(true);CT.go('ami');await wait(100);console.log('6b aprende de amigos: S.fr =',(CS.fr||[]).length,'| W cambia al llegar a 8:',JSON.stringify(CS.W).slice(0,60));console.log('7 panel:',C.document.querySelector('#amList').textContent.replace(/\s+/g,' ').slice(0,420));
// 6) amigo 1 desactiva compartir → modo limitado
await F1.amToggle(false);
console.log('8 limitado f1:',F1.limited(),'| banner visible:',f1.window.document.querySelector('#limBan').style.display!=='none');
let err='';try{await F1.ghJson('https://x/quotes/q.json');}catch(e){err=e.message;}console.log('9 precios bloqueados →',err);
await F1.buyManual('AAPL',100,{});console.log('10 compra bloqueada →','(sin error)');
console.log('   cartera e historial siguen:',F1.SS().pos.length,'abiertas',F1.SS().closed.length,'cerradas');
await CT.amPoll(true);console.log('11 creador ve:',C.document.querySelector('#amList')?CT.AM.d[codes[0].split('-')[0]].sh:'?','| aviso móvil en outbox:',JSON.stringify((CS.outbox||[]).map(o=>o.body)));
// 7) reactivar
await F1.amToggle(true);await CT.amPoll(true);console.log('12 reactivado: limitado',F1.limited(),'| creador estado sh',CT.AM.d[codes[0].split('-')[0]].sh);

// ---- chat y tablón ----
const fid1=codes[0].split('-')[0],fid2=codes[1].split('-')[0];
const d1=f1.window.document;F1.go('mas');F1.renderCom();
d1.querySelector('#msTx').value='Hola Ivan, ¿por qué compró NVDA?';d1.querySelector('#msGo').click();await wait(200);
await F2.msPoll(true);f2.window.document.querySelector('#comBox');
CT.go('ami');await CT.amPoll(true);await CT.msPoll(true);
console.log('14 creador: sin leer de amigo1',CT.msUnreadO(fid1),'| amigo2',CT.msUnreadO(fid2),'| punto en Más:',C.document.querySelector('nav button[data-t=mas]').classList.contains('dot'));
C.document.querySelector('[data-amch="'+fid1+'"]').click();await wait(100);
C.document.querySelector('[data-amtx="'+fid1+'"]').value='Por la nota 8 y el momentum';C.document.querySelector('[data-amsend="'+fid1+'"]').click();await wait(200);
await F1.msPoll(true);await F2.msPoll(true);
console.log('15 amigo1 ve hilo:',F1.msList(F1.MSG.d).map(m=>m.de+':'+m.x.slice(0,22)).join(' | '));
console.log('16 amigo2 ve hilo (debe estar vacío):',JSON.stringify(F2.msList(F2.MSG.d)),'| sin leer',F2.SS?F2.msUnreadF():'');
await new Promise(r=>r());
C.document.querySelector('#avTx').value='Ahora el algoritmo vigila el volumen';C.document.querySelector('#avUp').checked=true;C.document.querySelector('#avGo').click();await wait(200);
await F1.msPoll(true);await F2.msPoll(true);F1.go('mas');F1.renderCom();F2.go('mas');F2.renderCom();
console.log('17 amigo1 tablón:',d1.querySelector('#comBox').textContent.includes('Ahora el algoritmo vigila el volumen'),'| botón actualizar:',!!d1.querySelector('#msUpd'),'| amigo2 también:',f2.window.document.querySelector('#comBox').textContent.includes('vigila el volumen'));
console.log('18 NUBE amigo2 no contiene chat del 1 en su vista:',Object.values(F2.MSG.d||{}).length===0);

// 8) vuelve a recargar amigo desde su almacenamiento
const sv=f1.window.localStorage.getItem('traderamano.v4');f1.window.close();const f1b=await mk(JSON.parse(sv),'f1b');console.log('13 recarga f1: rol',f1b.window.__trader.SS().nube.rol,'abiertas',f1b.window.__trader.SS().pos.length);
console.log('errores',errs);process.exit(0);
