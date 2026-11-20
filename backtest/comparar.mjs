import {readFileSync} from 'node:fs';
const S=JSON.parse(readFileSync('sig.json','utf8'));
const byK={};for(const s of S)(byK[s.k]=byK[s.k]||[]).push(s);
const ks=Object.keys(byK).map(Number).sort((a,b)=>a-b);
const mid=ks[Math.floor(ks.length/2)];
let seed=1;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const mean=a=>a.reduce((x,y)=>x+y,0)/(a.length||1);
function run(name,filter,rank,N,field='rule',range=[0,1e9]){
  const ex=[],ab=[];let n=0,w=0;
  for(const k of ks){if(k<range[0]||k>=range[1])continue;const all=byK[k];if(all.length<30)continue;const base=mean(all.map(s=>s[field]));
    let L=all.filter(filter);if(!L.length)continue;L=rank?L.sort((a,b)=>rank(b)-rank(a)).slice(0,N):L.sort(()=>rnd()-.5).slice(0,N);
    const m=mean(L.map(s=>s[field]));ex.push(m-base);ab.push(m);n+=L.length;w+=L.filter(s=>s[field]>0).length;}
  const me=mean(ex),sd=Math.sqrt(mean(ex.map(x=>(x-me)**2))),t=me/(sd/Math.sqrt(ex.length)||1);
  return {name,fechas:ex.length,ops:n,ret:+mean(ab).toFixed(2),vsTodos:+me.toFixed(2),t:+t.toFixed(1),gana:Math.round(w/n*100)};
}
const fmt=r=>console.log(r.name.padEnd(46),'ops',String(r.ops).padStart(5),'ret/op',String(r.ret).padStart(6)+'%','vs todos',String(r.vsTodos).padStart(6),'t',String(r.t).padStart(5),'gana',r.gana+'%');
const any=()=>true,N=5;
for(const [lab,rg] of [['TODO',[0,1e9]],['1ª mitad',[0,mid]],['2ª mitad (fuera de muestra)',[mid,1e9]]]){
  console.log('\n=== '+lab+' · regla actual (stop 2 ATR / objetivo 4 ATR / 10 días) ===');
  fmt(run('Todas las señales (referencia)',any,null,9999,'rule',rg));
  fmt(run('Azar, 5 por día',any,null,N,'rule',rg));
  fmt(run('ACTUAL: nota técnica + ev (top 5)',s=>s.ev>0&&s.rsi<=78,s=>s.sc+s.ev/2,N,'rule',rg));
  fmt(run('ACTUAL con nota ≥8',s=>s.sc>=8&&s.ev>0&&s.rsi<=78,s=>s.sc+s.ev/2,N,'rule',rg));
  fmt(run('Solo ev (top 5)',s=>s.rsi<=78,s=>s.ev,N,'rule',rg));
  fmt(run('Impulso 12-1 meses (top 5)',s=>s.rsi<=78,s=>s.mom12,N,'rule',rg));
  fmt(run('Impulso 12-1 + sobre media 50',s=>s.above50&&s.rsi<=78,s=>s.mom12,N,'rule',rg));
  fmt(run('Impulso 6-1 + sobre media 50',s=>s.above50&&s.rsi<=78,s=>s.mom6,N,'rule',rg));
  fmt(run('Impulso 12-1 / riesgo',s=>s.above50&&s.rsi<=78,s=>s.mom12/s.vol,N,'rule',rg));
  fmt(run('Nota + impulso 12-1 combinados',s=>s.sc>=6&&s.rsi<=78,s=>s.sc+s.mom12/25,N,'rule',rg));
  fmt(run('Menor volatilidad + sobre media 200',s=>s.above200,s=>-s.vol,N,'rule',rg));
}
console.log('\n=== Misma entrada, distinta salida (todo el periodo, top 5 ACTUAL) ===');
for(const f of ['rule','r10','r20'])fmt(run('Salida '+f,s=>s.ev>0&&s.rsi<=78,s=>s.sc+s.ev/2,N,f));
fmt(run('Impulso 12-1+m50 · salida r20',s=>s.above50&&s.rsi<=78,s=>s.mom12,N,'r20'));
fmt(run('Impulso 12-1+m50 · salida r10',s=>s.above50&&s.rsi<=78,s=>s.mom12,N,'r10'));
console.log('\n=== Filtro de mercado (amplitud: % de valores sobre su media 200) ===');
for(const th of [0,0.35,0.45,0.55]){fmt(run('ACTUAL solo si amplitud ≥ '+th,s=>s.ev>0&&s.rsi<=78&&(s.br??1)>=th,s=>s.sc+s.ev/2,N));fmt(run('Impulso 12-1+m50 si amplitud ≥ '+th,s=>s.above50&&s.rsi<=78&&(s.br??1)>=th,s=>s.mom12,N));}
console.log('\n=== Por nota (todas las señales, salida regla) ===');
for(const [a,b] of [[0,3],[3,6],[6,8],[8,10.1]]){const L=S.filter(s=>s.sc>=a&&s.sc<b);console.log('nota',a+'-'+b,'n',L.length,'ret',mean(L.map(s=>s.rule)).toFixed(2)+'%','gana',Math.round(L.filter(s=>s.rule>0).length/L.length*100)+'%');}
