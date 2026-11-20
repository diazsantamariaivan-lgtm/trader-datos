import {readFileSync} from 'node:fs';
const S=JSON.parse(readFileSync('sig.json','utf8'));
const byK={};for(const s of S)(byK[s.k]=byK[s.k]||[]).push(s);const ks=Object.keys(byK).map(Number).sort((a,b)=>a-b);const mid=ks[ks.length>>1];
const mean=a=>a.reduce((x,y)=>x+y,0)/(a.length||1);
function run(name,filter,rank,N,field,rg=[0,1e9]){const ex=[],ab=[];let n=0;
  for(const k of ks){if(k<rg[0]||k>=rg[1])continue;const all=byK[k];if(all.length<30)continue;const base=mean(all.map(s=>s[field]));const L=all.filter(filter).sort((a,b)=>rank(b)-rank(a)).slice(0,N);if(!L.length)continue;ex.push(mean(L.map(s=>s[field]))-base);ab.push(mean(L.map(s=>s[field])));n+=L.length;}
  const me=mean(ex),sd=Math.sqrt(mean(ex.map(x=>(x-me)**2))),t=me/(sd/Math.sqrt(ex.length)||1);
  console.log(name.padEnd(48),'ops',String(n).padStart(5),'ret/op',mean(ab).toFixed(2).padStart(6)+'%','vs todos',me.toFixed(2).padStart(6),'t',t.toFixed(1).padStart(5));}
const f50=s=>s.above50&&s.rsi<=78;
for(const [lab,rg] of [['todo',[0,1e9]],['1ª mitad',[0,mid]],['2ª mitad',[mid,1e9]]]){console.log('==',lab);
 run('ev + m50 · top 10 · salida regla actual',f50,s=>s.ev,10,'rule',rg);
 run('ev + m50 · top 10 · salida 20 d',f50,s=>s.ev,10,'r20',rg);
 run('ev + m50 · top 10 · parada 4 ATR 20 d',f50,s=>s.ev,10,'w4',rg);
 run('ev sin filtro · top 10 · salida 20 d',s=>true,s=>s.ev,10,'r20',rg);
 run('ev · nota<=6 (evitar nota alta) top10 20d',s=>f50(s)&&s.sc<=6,s=>s.ev,10,'r20',rg);
 run('actual nota+ev top10 · salida 20 d',s=>s.ev>0&&s.rsi<=78,s=>s.sc+s.ev/2,10,'r20',rg);}
console.log('== control: ¿es solo "más volátiles"?');
run('Más volátiles (top 10) · 20 d',s=>true,s=>s.vol,10,'r20');
run('Más volátiles + m50 (top 10) · 20 d',f50,s=>s.vol,10,'r20');
run('ev / volatilidad (top 10) · 20 d',s=>true,s=>s.ev/s.vol,10,'r20');
run('ev entre los 50 % MENOS volátiles · 20 d',s=>s.vol<=40,s=>s.ev,10,'r20');
const hi=S.filter(s=>s.vol>0);const v=hi.map(s=>s.vol).sort((a,b)=>a-b);console.log('vol mediana',v[v.length>>1].toFixed(0)+'%');
console.log('== control impulso 12-1');
run('Impulso 12-1 + m50, solo vol<=27% (mitad calmada) · 20 d',s=>f50(s)&&s.vol<=27,s=>s.mom12,10,'r20');
run('Impulso 12-1 + m50, solo vol<=27% · 1ª mitad',s=>f50(s)&&s.vol<=27,s=>s.mom12,10,'r20',[0,mid]);
run('Impulso 12-1 + m50, solo vol<=27% · 2ª mitad',s=>f50(s)&&s.vol<=27,s=>s.mom12,10,'r20',[mid,1e9]);
run('Mitad calmada, al azar-ish (todas, top10 por -vol)',s=>s.vol<=27,s=>-s.vol,10,'r20');
run('Impulso 12-1 (sin filtro) top 10',s=>s.rsi<=78,s=>s.mom12,10,'r20');
