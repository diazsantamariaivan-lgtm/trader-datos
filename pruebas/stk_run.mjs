import {readFileSync,readdirSync} from 'node:fs';
import {bt,stats,atrSMA} from './ea_bt.mjs';
const dir='/tmp/hh/h/',files=readdirSync(dir).filter(f=>f.endsWith('.json'));
let all=[],rnd=[],used=0;let s=12345;const R=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
const base={hilo:5,brk:51,atr:95,m:1,exit:5,exp:10,up:false};
for(const f of files){
  let d;try{d=JSON.parse(readFileSync(dir+f));}catch(e){continue;}
  if(!d.o||d.o.length<400)continue;
  const D={o:d.o,h:d.h,l:d.l,c:d.c},n=D.o.length,cost=0.001*D.c[n>>1];
  if(!(D.c[n>>1]>1))continue;used++;
  const T=bt(D,base,cost);T.forEach(t=>all.push({R:t.R,i0:t.i0/n}));
  const A=atrSMA(D.h,D.l,D.c,95);
  for(let k=0;k<Math.max(5,T.length);k++){const i=200+Math.floor(R()*(n-210)),e=D.o[i],risk=A[i-1];if(!(risk>0))continue;let sl=e-risk,px=null;for(let j=i;j<=i+5&&j<n;j++){if(D.l[j]<=sl){px=Math.min(sl,j===i?e:D.o[j]);break;}if(j===i+5)px=D.o[j];}if(px==null)continue;rnd.push({R:(px-e-cost)/risk,i0:i/n});}
}
const f=(x,d=2)=>(+x).toFixed(d);
const show=(nm,x)=>{const s=stats(x);console.log(nm.padEnd(34),'n',String(s.n).padStart(6),'| acierto',f(s.win,1),'% | R medio',f(s.avgR,3),'| PF',f(s.pf),'| t',f(s.t,2));};
console.log('Acciones diarias (5 anios):',used,'valores, mismas reglas del EA, coste 0,1 %');
show('Senal del EA',all);show('  primera mitad del periodo',all.filter(t=>t.i0<0.5));show('  segunda mitad',all.filter(t=>t.i0>=0.5));
show('Entrar en un dia cualquiera',rnd);
