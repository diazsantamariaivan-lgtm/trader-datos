import {readFileSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
const AUTH='http://127.0.0.1:9099',DB='http://127.0.0.1:9000',NS='demo-trader-default-rtdb',KEYAPI='fake-key';
let html=readFileSync('/home/claude/trader_v4.html','utf8').replace('window.__trader={','window.__trader={SS:()=>S,NUBE,amUnir,amToggle,amSync,amPoll,limited,AM,msPoll,MSG,msList,msSend,fbLogin,fbAnon,go,renderCom,');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e.message).slice(0,200)));
const rw=u=>{u=String(u);
 if(u.startsWith('https://identitytoolkit.googleapis.com/'))return u.replace('https://',AUTH+'/');
 if(u.startsWith('https://securetoken.googleapis.com/'))return u.replace('https://',AUTH+'/');
 if(u.startsWith(DB)){return u+(u.includes('?')?'&':'?')+'ns='+NS;}
 return null;};
const mk=async(st)=>{const dom=new JSDOM(html,{url:'https://diazsantamariaivan-lgtm.github.io/trader-datos/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
 beforeParse(w){w.__FBCFG={apiKey:KEYAPI,dbUrl:DB};const ctx=new Proxy(function(){},{get:(t,k)=>k==='measureText'?(()=>({width:10})):(()=>ctx),set:()=>true,apply:()=>ctx});w.HTMLCanvasElement.prototype.getContext=()=>ctx;
 w.fetch=async(u,o)=>{const r=rw(u);if(r)return fetch(r,o);return {ok:false,status:404,json:async()=>({}),text:async()=>''};};
 w.localStorage.setItem('traderamano.v4',JSON.stringify(st));}});
 await new Promise(r=>setTimeout(r,800));return dom;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
// crear creador en el emulador de auth
const su=await (await fetch(AUTH+'/identitytoolkit.googleapis.com/v1/accounts:signUp?key='+KEYAPI,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'ivan@test.com',password:'secreto123',returnSecureToken:true})})).json();
console.log('0 creador en auth:',!!su.idToken);
const cr=await mk({cap0:10000,cash:10000,pos:[],closed:[]});const C=cr.window.__trader,CS=C.SS();
const au=await C.fbLogin('ivan@test.com','secreto123');CS.nube={fb:au};console.log('1 login creador (app): email',au.email);
// REST directo con token de usuario
const rest=async(tok,method,path,body)=>{const r=await fetch(DB+'/'+path+'.json?ns='+NS+'&auth='+tok,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {s:r.status,j:await r.json().catch(()=>null)};};
// crear bases (creador)
await C.NUBE.set('amigos/aaa111',{al:'Amigo 1',cap0:5000,cod:'CODIGO1',ct:Date.now(),sh:null,seen:0});
await C.NUBE.set('amigos/bbb222',{al:'Amigo 2',cap0:5000,cod:'CODIGO2',ct:Date.now(),sh:null,seen:0});
console.log('2 creador crea 2 bases: OK');
// amigos se unen con la app real
const f1=await mk({cap0:500,cash:500});const F1=f1.window.__trader;
const f2=await mk({cap0:500,cash:500});const F2=f2.window.__trader;
F1.go('mas');F2.go('mas');
await F1.amUnir('aaa111-codigoX');console.log('3 código malo →',!F1.SS().nube||F1.SS().nube.rol!=='amigo'?'rechazado ✔':'ACEPTADO ✘');
await F1.amUnir('aaa111-CODIGO1');console.log('4 unirse 1 →',F1.SS().nube&&F1.SS().nube.rol,F1.SS().nube&&F1.SS().nube.al,'cap',F1.SS().cap0);
await F2.amUnir('aaa111-CODIGO1');console.log('5 código ya usado por otro →',(F2.SS().nube&&F2.SS().nube.rol==='amigo')?'ACEPTADO ✘':'rechazado ✔');
await F2.amUnir('bbb222-CODIGO2');console.log('6 unirse 2 →',F2.SS().nube&&F2.SS().nube.al);
// operar y enviar
const S1=F1.SS();S1.closed.unshift({u:'x1',s:'TSLA',nm:'T',entry:10,exit:9,shares:5,cur:'USD',pnl:-25,pct:-10,why:'stop',days:3,open:Date.now()-5e8,close:Date.now()-1e8,f:[1,0,0,0,0],pred:{pT:55,ev:1.2},gross:-9});
await F1.amSync(true);console.log('7 envío amigo 1: err =',JSON.stringify(S1.nube.err||''),'| enviados',S1.nube.sent.length);
await C.amPoll(true);console.log('8 creador ve a 1:',JSON.stringify(Object.keys(C.AM.d)),'snap',!!(C.AM.d.aaa111||{}).snap,'ops',Object.keys((C.AM.d.aaa111||{}).ops||{}));
// chat con reglas
await F1.msSend('aaa111','f','hola creador');await C.msSend('aaa111','o','hola amigo 1');
await F1.msPoll(true);await F2.msPoll(true);
console.log('9 chat amigo1 ve',F1.msList(F1.MSG.d).map(m=>m.de).join(','),'| amigo2 ve',F2.msList(F2.MSG.d).length,'mensajes');
// ataques (REST con los tokens de las apps)
const t1=await (async()=>{const a=F1.SS().nube.fb;return a.idt;})(),t2=F2.SS().nube.fb.idt,tc=au.idt;
const T=async(nombre,res,esperado)=>console.log((res.s===esperado?'✔':'✘'),nombre,'→ HTTP',res.s);
await T('amigo 2 lee la base del amigo 1',await rest(t2,'GET','amigos/aaa111'),401);
await T('amigo 1 lista todas las bases',await rest(t1,'GET','amigos'),401);
await T('amigo 1 lee su propia base',await rest(t1,'GET','amigos/aaa111'),200);
await T('amigo 1 lee el chat del amigo 2',await rest(t1,'GET','chat/bbb222'),401);
await T('amigo 2 escribe en el chat del 1',await rest(t2,'POST','chat/aaa111',{t:1,de:'f',x:'intruso'}),401);
await T('amigo 1 se hace pasar por el creador (de:o)',await rest(t1,'PUT','chat/aaa111/zzz1',{t:Date.now(),de:'o',x:'soy el creador'}),401);
await T('amigo 1 cambia su capital',await rest(t1,'PUT','amigos/aaa111/cap0',999999),401);
await T('amigo 1 cambia su código',await rest(t1,'PUT','amigos/aaa111/cod','HACK'),401);
await T('amigo 1 cambia su alias',await rest(t1,'PUT','amigos/aaa111/al','Rey'),401);
await T('amigo 1 escribe la base del amigo 2',await rest(t1,'PUT','amigos/bbb222/snap',{eq:1}),401);
await T('amigo 1 escribe un aviso',await rest(t1,'POST','aviso',{t:1,x:'spam'}),401);
await T('amigo 1 lee uids de otros',await rest(t1,'GET','uids'),401);
await T('anónimo sin cuenta lee avisos',await rest('nada','GET','aviso'),401);
await T('amigo 1 reclama la base del amigo 2 (sin código)',await rest(t1,'PATCH','amigos/bbb222',{uid:F1.SS().nube.fb.uid}),401);
await T('creador lee todas las bases',await rest(tc,'GET','amigos'),200);
await T('creador lee el chat del amigo 1',await rest(tc,'GET','chat/aaa111'),200);
await T('creador escribe aviso',await rest(tc,'POST','aviso',{t:Date.now(),x:'novedad',u:1}),200);
await T('amigo 1 lee avisos',await rest(t1,'GET','aviso'),200);
await T('amigo 2 lee avisos',await rest(t2,'GET','aviso'),200);
// precios gated
await rest(tc,'PUT','precios',{at:1,s:{AAPL:{p:1}}});
await T('creador escribe precios (también vale por regla del admin)',await rest(tc,'PUT','precios',{at:1,s:{AAPL:{p:1}}}),401);
console.log('  (los precios los sube el piloto con credencial de administrador, no con regla de cliente)');
await T('amigo 1 compartiendo lee precios',await rest(t1,'GET','precios'),200);
await F1.amToggle(false);await wait(300);
await T('amigo 1 SIN compartir lee precios',await rest(t1,'GET','precios'),401);
await F1.amToggle(true);await wait(300);
await T('amigo 1 vuelve a compartir: lee precios',await rest(t1,'GET','precios'),200);
// sin datos 48h: simular seen antiguo (creador)
await rest(tc,'PATCH','amigos/aaa111',{seen:Date.now()-3*864e5});
await T('amigo 1 con seen de hace 3 días lee precios',await rest(t1,'GET','precios'),401);
console.log('errores jsdom',errs.slice(0,3));process.exit(0);
