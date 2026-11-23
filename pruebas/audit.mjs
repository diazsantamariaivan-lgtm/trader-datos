import {readFileSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
let html=readFileSync('/home/claude/trader_v4.html','utf8').replace('window.__trader={','window.__trader={SS:()=>S,NUBE,amUnir,amSync,amPoll,AM,msPoll,MSG,msSend,renderAmi,renderCom,go,fbTok,fbOn,equity,capTot,fdCap,limited,');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e.message).slice(0,160)));
const SH={};
const mk=async(st,fb)=>{const dom=new JSDOM(html,{url:'https://diazsantamariaivan-lgtm.github.io/trader-datos/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
 beforeParse(w){w.__NUBE=SH;const ctx=new Proxy(function(){},{get:(t,k)=>k==='measureText'?(()=>({width:10})):(()=>ctx),set:()=>true,apply:()=>ctx});w.HTMLCanvasElement.prototype.getContext=()=>ctx;
 w.fetch=async()=>({ok:false,status:404,json:async()=>({}),text:async()=>''});w.localStorage.setItem('traderamano.v4',JSON.stringify(st));}});
 await new Promise(r=>setTimeout(r,900));return dom;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let bad=0;const ok=(c,m)=>{console.log(c?'✔':'✘',m);if(!c)bad++;};
// B) datos antiguos intactos
const now=Date.now();
const old={cap0:10000,cash:6543.21,riesgo:1,maxPos:10,fav:['AAPL','SAN.MC'],trk:['MSFT'],alerts:[{id:'a1',s:'AAPL',dir:'>=',px:300,t:now-1e8}],
 pos:[{manual:true,id:11,s:'AAPL',nm:'Apple',cur:'USD',shares:5,entry:190,stop:170,target:230,last:200,costEur:880,openTs:now-864e5,openDay:'2026-11-22',days:1,f:[1,0,1,0,0]}],
 closed:[{u:'k1',s:'MSFT',nm:'M',entry:400,exit:420,shares:2,cur:'USD',pnl:35,pct:4.4,why:'objetivo',days:4,open:now-6e8,close:now-4e8,cd:'2026-11-18'}],
 eq:[{t:now-3e8,e:10000},{t:now-1e8,e:10120.5}],log:[{t:now-5e7,x:'prueba'}],ext:[{u:'e1',f:[1,0,0,0,0],pnl:3,why:'objetivo',days:2}],
 fd:{cap0:10000,cash:8800,pos:{},tr:[{t:now-2e8,s:'X',a:1200}],cust:{}},mainManual:true,ntfy:'mitema',shadow:{},apr:true,aprT:'t'};
const d1=await mk(old);const S=d1.window.__trader.SS();
const keys=['cap0','cash','riesgo','maxPos','fav','trk','alerts','pos','closed','log','ext','ntfy','apr','aprT'];
const same=keys.every(k=>JSON.stringify(S[k])===JSON.stringify(old[k]));
ok(same&&JSON.stringify(S.eq.slice(0,2))===JSON.stringify(old.eq),'B1 claves antiguas idénticas tras cargar con la versión nueva: '+keys.filter(k=>JSON.stringify(S[k])!==JSON.stringify(old[k])).join(',')+'');
ok(JSON.stringify(S.fd.tr)===JSON.stringify(old.fd.tr)&&S.fd.cash===8800&&S.fd.cap0===10000,'B2 cartera de fondos intacta');
ok(Array.isArray(S.dep)&&S.dep.length===0&&!S.nube,'B3 campos nuevos vacíos y sin rol (la app sigue siendo la del creador)');
const sv=JSON.parse(d1.window.localStorage.getItem('traderamano.v4'));ok(sv.pos.length===1&&sv.closed.length===1&&sv.eq.length>=2&&JSON.stringify(sv.eq.slice(0,2))===JSON.stringify(old.eq),'B4 lo guardado en el móvil conserva posiciones, cerradas e historial');
ok(Math.abs(d1.window.__trader.capTot()-10000)<1e-9,'B5 sin ingresos la base es el capital inicial');
// D) seguridad XSS: alias, mensaje, aviso, ops maliciosos
const X='<img src=x onerror="window.__pwn=1">"\'><script>window.__pwn=2</script>';
SH.amigos={zzz999:{al:X,cap0:5000,cod:'ABC',joined:1,sh:1,seen:now,ver:X,mot:X,dev:'d',snap:{eq:5100,cap:5000,nc:1,nw:1,t:now,pos:[{s:X,e:10,sh:1,l:11}]},ops:{u1:{u:'u1',s:X,why:X,pnl:5,close:now,pct:2}}}};
SH.chat={zzz999:{m1:{t:now,de:'f',x:X}}};SH.aviso={a1:{t:now,x:X,u:1}};
const d2=await mk({cap0:10000,cash:10000,pos:[],closed:[]});const T=d2.window.__trader;
await T.amPoll(true);await T.msPoll(true);T.go('ami');T.renderAmi();
d2.window.document.querySelector('[data-amop="zzz999"]').click();d2.window.document.querySelector('[data-amch="zzz999"]').click();await wait(100);
ok(!d2.window.__pwn&&!d2.window.document.querySelector('#amList img')&&!d2.window.document.querySelector('#amList script'),'D1 panel del creador: alias, versión, motivo, mensaje y operaciones con HTML malicioso se muestran como texto');
const d3=await mk({cap0:500,cash:500,pos:[],closed:[],nube:{rol:'amigo',fid:'zzz999',al:X,dev:'d',sh:1,sent:[],at:0}});const T3=d3.window.__trader;
await T3.msPoll(true);T3.go('mas');T3.renderCom();await wait(100);
ok(!d3.window.__pwn&&!d3.window.document.querySelector('#comBox img')&&!d3.window.document.querySelector('#comBox script'),'D2 pantalla del amigo: alias, chat y tablón con HTML malicioso se muestran como texto');
// secretos en el HTML
ok(!/luna-roca|CARTERA_CLAVE=|secret.*=\s*['"][A-Za-z0-9]{20}/i.test(html),'D3 sin claves ni contraseñas en el HTML');
// G) renovación de token (Firebase simulado)
const calls=[];const d4=await mk({cap0:500,cash:500,nube:{rol:'amigo',fid:'q',al:'Q',sh:1,fb:{uid:'u',rt:'RT1',idt:'viejo',exp:Date.now()-1000}}});
d4.window.__FBCFG={apiKey:'k',dbUrl:'https://x.firebaseio.com'};
d4.window.fetch=async(u,o)=>{calls.push(String(u).slice(0,60));if(String(u).includes('securetoken'))return {ok:true,status:200,json:async()=>({id_token:'nuevo',refresh_token:'RT2',user_id:'u',expires_in:'3600'})};return {ok:true,status:200,json:async()=>({a:1})};};
const tok=await d4.window.__trader.fbTok();ok(tok==='nuevo'&&d4.window.__trader.SS().nube.fb.rt==='RT2','G1 token caducado se renueva solo y se guarda el nuevo');
ok(await d4.window.__trader.NUBE.get('amigos/q')&&calls.some(c=>c.includes('.json?auth=nuevo')),'G2 la petición a la base usa el token renovado');
// H) ids largos o raros no rompen
const d5=await mk({cap0:500,cash:500});await d5.window.__trader.amUnir('../../etc-passwd');ok(!d5.window.__trader.SS().nube,'H1 código con formato raro se rechaza');
console.log('errores jsdom:',errs.slice(0,4));console.log(bad?('FALLOS: '+bad):'AUDITORÍA SIN FALLOS');process.exit(0);
