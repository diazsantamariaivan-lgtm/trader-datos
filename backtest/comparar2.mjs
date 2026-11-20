import {readFileSync} from 'node:fs';
const S=JSON.parse(readFileSync('sig.json','utf8'));
const byK={};for(const s of S)(byK[s.k]=byK[s.k]||[]).push(s);const ks=Object.keys(byK).map(Number).sort((a,b)=>a-b);
const mean=a=>a.reduce((x,y)=>x+y,0)/(a.length||1);
// percentil por fecha de mom12 y ev
for(const k of ks){const L=byK[k];for(const f of ['mom12','ev','mom6']){const o=[...L].sort((a,b)=>a[f]-b[f]);o.forEach((s,i)=>{s['p_'+f]=i/(o.length-1||1);});}}
function run(name,filter,rank,N,field,yr){const ex=[],ab=[];let n=0;
  for(const k of ks){if(yr&&new Date(k*86400000).getUTCFullYear()!==yr)continue;const all=byK[k];if(all.length<30)continue;const base=mean(all.map(s=>s[field]));const L=all.filter(filter).sort((a,b)=>rank(b)-rank(a)).slice(0,N);if(!L.length)continue;ex.push(mean(L.map(s=>s[field]))-base);ab.push(mean(L.map(s=>s[field])));n+=L.length;}
  const me=mean(ex),sd=Math.sqrt(mean(ex.map(x=>(x-me)**2))),t=me/(sd/Math.sqrt(ex.length)||1);
  console.log(name.padEnd(52),'ops',String(n).padStart(5),'ret/op',mean(ab).toFixed(2).padStart(6)+'%','vs todos',me.toFixed(2).padStart(6),'t',t.toFixed(1).padStart(5));}
const f50=s=>s.above50&&s.rsi<=78;
console.log('--- quintiles de impulso 12-1 (todas las señales, salida 20 d) ---');
for(let q=0;q<5;q++){const L=S.filter(s=>s.p_mom12>=q/5&&s.p_mom12<(q+1)/5+(q==4?1:0));console.log('quintil',q+1,'ret',mean(L.map(s=>s.r20)).toFixed(2)+'%');}
console.log('--- combinaciones (salida 20 d sin parada) ---');
for(const N of [5,10,20]){run('Impulso 12-1 + media 50 · top '+N,f50,s=>s.mom12,N,'r20');}
run('Impulso+ev (percentiles) +m50 · top 10',f50,s=>s.p_mom12+s.p_ev,10,'r20');
run('Impulso+ev+impulso6 · top 10',f50,s=>s.p_mom12+s.p_ev+s.p_mom6,10,'r20');
console.log('--- salidas para impulso 12-1 + m50 top 10 ---');
for(const f of ['rule','r10','r20','w3','w4','w5'])run('salida '+f,f50,s=>s.mom12,10,f);
console.log('--- por año (impulso 12-1+m50 top 10, salida 20 d / actual) ---');
for(const y of [2022,2023,2024,2025,2026]){run('año '+y+' impulso',f50,s=>s.mom12,10,'r20',y);run('año '+y+' ACTUAL ev+nota',s=>s.ev>0&&s.rsi<=78,s=>s.sc+s.ev/2,10,'rule',y);}
