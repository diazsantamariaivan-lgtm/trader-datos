import {readdirSync,readFileSync} from 'node:fs';
const DIR='/tmp/hh/h/';const D={};for(const f of readdirSync(DIR)){D[f.replace('.json','')]=JSON.parse(readFileSync(DIR+f,'utf8'));}
const reg=s=>{const m=/\.([A-Z]+)$/.exec(s);return !m?'US':(['MC','PA','DE','AS','MI','SW','L','BR','HE','ST','CO','OL','LS','VI'].includes(m[1])?'EU':'OTRO');};
const dayOf=t=>Math.floor(t/86400);
// serie por símbolo: mapa día->cierre ajustado
const P={};for(const s in D){const m=new Map();D[s].t.forEach((t,i)=>m.set(dayOf(t),D[s].c[i]));P[s]={m,days:D[s].t.map(dayOf),c:D[s].c};}
const all=[...new Set(Object.values(P).flatMap(x=>x.days))].sort((a,b)=>a-b);
const at=(s,d)=>{const x=P[s];let lo=0,hi=x.days.length-1;if(d<x.days[0])return null;while(lo<hi){const m=(lo+hi+1)>>1;if(x.days[m]<=d)lo=m;else hi=m-1;}return {i:lo,p:x.c[lo]};};
const sma=(s,i,n)=>{const c=P[s].c;if(i<n)return null;let a=0;for(let j=i-n+1;j<=i;j++)a+=c[j];return a/n;};
const start=all[300],end=all[all.length-1];
function run(region,N,useFilter,hold=21){
  let eq=1,eqU=1,eqB=1;const R=[],U=[],yr={};let inM=0,tot=0;
  for(let d=start;d+hold<=end;d+=hold){
    const L=[];let up=0,n=0;
    for(const s in P){if(region!=='ALL'&&reg(s)!==region)continue;const a=at(s,d),b=at(s,d-21),e=at(s,d-252),f=at(s,d+hold);if(!a||!b||!e||!f||P[s].days[a.i]<d-5||P[s].days[f.i]<d+hold-5)continue;
      const m50=sma(s,a.i,200);if(m50&&a.p>m50)up++;n++;L.push({s,m:b.p/e.p-1,r:f.p/a.p-1});}
    if(L.length<40)continue;const breadthOn=up/n>0.5;
    const uni=L.reduce((x,y)=>x+y.r,0)/L.length;L.sort((x,y)=>y.m-x.m);const top=L.slice(0,N),pr=top.reduce((x,y)=>x+y.r,0)/N;
    const on=!useFilter||breadthOn;const r=on?pr-0.001:0;tot++;if(on)inM++;
    eq*=1+r;eqU*=1+uni;const y=new Date(d*86400000).getUTCFullYear();yr[y]=(yr[y]||1)*(1+r);R.push(r);U.push(uni);}
  const yrs=(end-start)/365,m=R.reduce((a,b)=>a+b,0)/R.length,sd=Math.sqrt(R.reduce((a,b)=>a+(b-m)**2,0)/R.length);let pk=1,dd=0,e=1;for(const r of R){e*=1+r;pk=Math.max(pk,e);dd=Math.min(dd,e/pk-1);}
  return {anual:+((eq**(1/yrs)-1)*100).toFixed(1),univ:+((eqU**(1/yrs)-1)*100).toFixed(1),caida:+(dd*100).toFixed(0),sharpe:+(m/sd*Math.sqrt(12*21/hold)).toFixed(2),mes:inM+'/'+tot,años:Object.entries(yr).map(([y,v])=>y+':'+((v-1)*100).toFixed(0)+'%').join(' ')};
}
for(const reg of ['US','EU','ALL'])for(const f of [false,true])console.log(reg.padEnd(4),f?'con filtro ':'sin filtro ',JSON.stringify(run(reg,20,f)));
console.log('— 10 valores —');for(const reg of ['US','EU'])for(const f of [false,true])console.log(reg.padEnd(4),f?'con filtro ':'sin filtro ',JSON.stringify(run(reg,10,f)));
