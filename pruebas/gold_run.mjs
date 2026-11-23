import {readFileSync} from 'node:fs';
import {bt,stats,atrSMA} from './ea_bt.mjs';
const rows=JSON.parse(readFileSync('/tmp/gold/gc1h_clean.json'));
const D={t:rows.map(r=>r[0]),o:rows.map(r=>r[1]),h:rows.map(r=>r[2]),l:rows.map(r=>r[3]),c:rows.map(r=>r[4])};
const n=D.o.length,split=Math.floor(n*0.6);
const COST=0.35; // dolares por onza (diferencial + deslizamiento, estimado)
const base={hilo:5,brk:51,atr:95,m:1,exit:5,exp:10,up:false};
const f=(x,d=2)=>(+x).toFixed(d);
const show=(nm,s)=>console.log(nm.padEnd(26),'n',String(s.n).padStart(4),'| acierto',f(s.win,1).padStart(5),'% | R medio',f(s.avgR,3).padStart(7),'| PF',f(s.pf).padStart(5),'| ret',f(s.ret,1).padStart(6),'% | DD',f(s.dd,1).padStart(5),'% | t',f(s.t,2));
console.log('Oro GC=F 1h:',n,'velas, del',new Date(D.t[0]*1e3).toISOString().slice(0,10),'al',new Date(D.t[n-1]*1e3).toISOString().slice(0,10));
console.log('Comprar y mantener todo el periodo:',f((D.c[n-1]/D.o[0]-1)*100,1),'%  | primer 60%:',f((D.c[split]/D.o[0]-1)*100,1),'% | ultimo 40%:',f((D.c[n-1]/D.c[split]-1)*100,1),'%');
const T=bt(D,base,COST);
console.log('\n== EA tal cual (5, 51, 95, 1 ATR, 5 velas), coste',COST,'$ por operacion ==');
show('Todo el periodo',stats(T));show('Primer 60 % (entrenar)',stats(T.filter(t=>t.i0<split)));show('Ultimo 40 % (comprobar)',stats(T.filter(t=>t.i0>=split)));
const T0=bt(D,base,0);show('Sin costes (referencia)',stats(T0));
// linea base: mismas salidas pero entrando en velas al azar (compra a mercado, SL 1 ATR95, 5 velas)
function rnd(seed){let s=seed;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
const A=atrSMA(D.h,D.l,D.c,95),R=rnd(7),Rs=[];
for(let k=0;k<4000;k++){const i=200+Math.floor(R()*(n-210)),e=D.o[i],risk=1*A[i-1];if(!(risk>0))continue;let sl=e-risk,px=null;for(let j=i;j<=i+5&&j<n;j++){if(D.l[j]<=sl){px=Math.min(sl,j===i?e:D.o[j]);break;}if(j===i+5)px=D.o[j];}if(px==null)continue;Rs.push({i0:i,R:(px-e-COST)/risk});}
console.log('\n== Linea base: entrar en una vela cualquiera, mismo stop y mismas 5 velas ==');show('Entradas al azar (4000)',stats(Rs));
// 100 carteras virtuales = 100 combinaciones de parametros
const P=[base],R2=rnd(99);const pick=a=>a[Math.floor(R2()*a.length)];
while(P.length<100)P.push({hilo:pick([3,5,8,13,21]),brk:pick([20,30,51,80,100]),atr:pick([14,30,60,95]),m:pick([0.75,1,1.5,2]),exit:pick([3,5,8,12]),exp:10,up:false});
const res=P.map((p,k)=>{const TT=bt(D,p,COST);return {k,p,is:stats(TT.filter(t=>t.i0<split)),os:stats(TT.filter(t=>t.i0>=split)),all:stats(TT)};});
const okIS=res.filter(r=>r.is.avgR>0&&r.is.n>=30),pos=res.filter(r=>r.os.avgR>0&&r.os.n>=15);
console.log('\n== 100 carteras (combinaciones de parametros) ==');
console.log('Con R medio positivo en el 60 % de entrenamiento:',res.filter(r=>r.is.avgR>0).length,'| en el 40 % de comprobacion:',res.filter(r=>r.os.avgR>0).length);
console.log('Mediana del R medio  entrenamiento:',f(res.map(r=>r.is.avgR).sort((a,b)=>a-b)[50],3),' comprobacion:',f(res.map(r=>r.os.avgR).sort((a,b)=>a-b)[50],3));
const top=res.slice().sort((a,b)=>b.is.avgR-a.is.avgR).slice(0,10);
console.log('\nLas 10 mejores en entrenamiento y que hicieron despues:');
top.forEach(r=>console.log(JSON.stringify([r.p.hilo,r.p.brk,r.p.atr,r.p.m,r.p.exit]).padEnd(18),'entren. R',f(r.is.avgR,3).padStart(7),'(n',r.is.n+')','-> compr. R',f(r.os.avgR,3).padStart(7),'(n',r.os.n+')'));
const ra=a=>{const idx=a.map((v,i)=>[v,i]).sort((x,y)=>x[0]-y[0]);const rk=[];idx.forEach((x,r)=>rk[x[1]]=r);return rk;};
const a=ra(res.map(r=>r.is.avgR)),b=ra(res.map(r=>r.os.avgR));const ma=a.reduce((s,x)=>s+x,0)/100,mb=b.reduce((s,x)=>s+x,0)/100;
let sxy=0,sxx=0,syy=0;for(let i=0;i<100;i++){sxy+=(a[i]-ma)*(b[i]-mb);sxx+=(a[i]-ma)**2;syy+=(b[i]-mb)**2;}
console.log('\nCorrelacion entre el ranking de entrenamiento y el de comprobacion (1 = predice, 0 = azar):',f(sxy/Math.sqrt(sxx*syy),2));
const e=res[0];console.log('EA base en las 100: entrenamiento R',f(e.is.avgR,3),'comprobacion R',f(e.os.avgR,3));
