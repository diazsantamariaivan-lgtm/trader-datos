// Fondos de inversión: descubre fondos (búsquedas + ISIN), descarga su valor liquidativo diario (5 años),
// calcula rentabilidad/riesgo/nota y aprende cómo se han comportado históricamente (por categoría y señal).
// Genera out/fd.json (lista + comportamiento) y out/fh/<símbolo>.json (histórico).
import {readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
const OUT=process.env.OUT||'out',LIMIT=+process.env.LIMIT||0;
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function gj(u){for(let i=0;i<3;i++){try{const r=await fetch(u,{headers:{'User-Agent':UA,Accept:'application/json'},signal:AbortSignal.timeout(25000)});if(r.ok)return await r.json();if(r.status===404)return null;}catch(e){}await sleep(600*(i+1));}return null;}
const lines=f=>existsSync(f)?readFileSync(f,'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&!s.startsWith('#')):[];
export const CATS=[['Monetario / corto plazo',/corto plazo|monetari|money market|cash|liquidez|treasury|tr[eé]sorerie|ultra short|tesorer|short.?duration|enhancedyield|limited maturity|s-t\b/i],['Renta fija',/garantiz|rentas 20|convertible|unconstr|bd\b|bond|bono|renta fija|fixed|credit|credito|govern|deuda|income|high yield|euro agg|rendimiento/i],['Mixto / flexible',/mixto|mixed|flexib|allocation|patrimonio|multi.?asset|balanced|moderad|prudent|conservad|kaldemorgen|optimal|global income/i],['Tecnología / temático',/tech|tecnolog|robot|megatend|innovat|digital|health|salud|biotech|clean|energy|energ|water|agua|gold|oro|cyber|ai\b|artificial|luxury|brands|infrastructure/i],['Emergentes / Asia',/emerging|emergent|asia|china|india|japan|jap[oó]n|latin|brazil|pacific|oriental/i],['Renta variable EE. UU.',/u\.?s\.?\b|usa|s&p|500|nasdaq|america|ee\.?\s?uu/i],['Renta variable Europa',/europ|euro stock|euro equity|iberi|spain|espa|eurozone|stoxx|small caps/i],['Renta variable global',/cobas|okavango|metavalor|cartesio|magallanes|azvalor|bestinver|dividendo|dev wld|glb|abante|laurisilva|world|global|internacional|international|equity|stock|bolsa|value|acciones|renta variable|msci/i]];
export const catOf=n=>{for(const [c,r] of CATS)if(r.test(n||''))return c;return 'Otros';};
const sma=(a,n)=>a.slice(-n).reduce((x,y)=>x+y,0)/Math.min(n,a.length);
function stats(t,c){
  const n=c.length,p=c[n-1],pc=k=>n>k?+((p/c[n-1-k]-1)*100).toFixed(2):null;
  const ann=(k,y)=>n>k?+(((p/c[n-1-k])**(1/y)-1)*100).toFixed(2):null;
  const rets=[];for(let i=Math.max(1,n-252);i<n;i++)rets.push(c[i]/c[i-1]-1);
  const m=rets.reduce((a,b)=>a+b,0)/rets.length,sd=Math.sqrt(rets.reduce((a,b)=>a+(b-m)**2,0)/rets.length);
  const vol=+(sd*Math.sqrt(252)*100).toFixed(2);
  let pk=0,dd=0;for(let i=Math.max(0,n-756);i<n;i++){pk=Math.max(pk,c[i]);dd=Math.min(dd,c[i]/pk-1);}
  const a3=ann(756,3);
  return {m1:pc(21),m3:pc(63),m6:pc(126),y1:pc(252),y3:a3,y5:ann(1260,5),vol,dd:+(dd*100).toFixed(1),sh:(a3!=null&&vol>0)?+((a3-2)/ (vol||1)).toFixed(2):null,
    off:+((p/Math.max(...c.slice(-252))-1)*100).toFixed(1),ma:p>sma(c,200)?1:0};
}
async function chart(sym){
  const j=await gj('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(sym)+'?range=5y&interval=1d');
  const r=j&&j.chart&&j.chart.result&&j.chart.result[0];if(!r)return null;
  const T=r.timestamp||[],C=r.indicators.quote[0].close||[],t=[],c=[];
  for(let i=0;i<T.length;i++)if(C[i]!=null&&C[i]>0){t.push(Math.floor(T[i]/86400));c.push(+C[i].toFixed(4));}
  return c.length>=250?{t,c,cur:r.meta.currency,nm:r.meta.longName||r.meta.shortName}:null;
}
async function find(q){
  const j=await gj('https://query1.finance.yahoo.com/v1/finance/search?q='+encodeURIComponent(q)+'&quotesCount=15&newsCount=0');
  return ((j&&j.quotes)||[]).filter(x=>x.quoteType==='MUTUALFUND'&&x.symbol);
}
async function main(){
  const U=new Map();
  for(const l of lines('fondos_isin.txt')){const q=(await find(l.split(/\s+/)[0]))[0];if(q)U.set(q.symbol,{s:q.symbol,n:q.longname||q.shortname||q.symbol});await sleep(250);}
  const Q=lines('fondos_busquedas.txt');
  for(const q of Q){for(const x of await find(q)){if(!U.has(x.symbol))U.set(x.symbol,{s:x.symbol,n:x.longname||x.shortname||x.symbol});}await sleep(250);}
  // conservar los fondos de la ejecución anterior y los que tienen las carteras del laboratorio (si no, algunos desaparecen y las carteras se quedan sin su ficha)
  const REPO=process.env.GITHUB_REPOSITORY||'diazsantamariaivan-lgtm/trader-datos';
  try{const r=await fetch('https://raw.githubusercontent.com/'+REPO+'/fondos/fd.json?t='+Date.now(),{signal:AbortSignal.timeout(30000)});if(r.ok){const pj=await r.json();for(const f of pj.f||[])if(f&&f.s&&!U.has(f.s))U.set(f.s,{s:f.s,n:f.n||f.s});}}catch(e){}
  try{const r=await fetch('https://raw.githubusercontent.com/'+REPO+'/fondos/lab.json?t='+Date.now(),{signal:AbortSignal.timeout(30000)});if(r.ok){const pj=await r.json();for(const pf of Object.values(pj.live||{}))for(const x of pf.pos||[])if(x&&x.s&&!U.has(x.s))U.set(x.s,{s:x.s,n:x.n||x.s});}}catch(e){}
  console.log('candidatos',U.size);
  let L=[...U.values()];if(LIMIT)L=L.slice(0,LIMIT);
  mkdirSync(OUT+'/fh',{recursive:true});
  const F=[],H={};let i=0;
  const pool=async()=>{while(i<L.length){const f=L[i++];const d=await chart(f.s);if(!d)continue;
    const nm=d.nm||f.n;if(/\bPP\b|pensi[oó]n|PPES|PPSE|\bEPSV\b/i.test(nm))continue;F.push({s:f.s,n:nm.slice(0,70),c:d.cur||'EUR',k:catOf(nm),p:d.c[d.c.length-1],d:d.t[d.t.length-1],...stats(d.t,d.c)});H[f.s]=d;await sleep(150);}};
  await Promise.all([pool(),pool(),pool()]);
  // nota 0-10: percentil dentro de su categoría (ratio rentabilidad/riesgo 3 años 50 %, caída máxima 30 %, impulso 1 año 20 %)
  const byK={};for(const f of F)(byK[f.k]=byK[f.k]||[]).push(f);
  const pct=(arr,v)=>{const a=arr.filter(x=>x!=null).sort((x,y)=>x-y);if(a.length<3||v==null)return .5;return a.filter(x=>x<=v).length/a.length;};
  for(const [k,a] of Object.entries(byK)){const sh=a.map(f=>f.sh),dd=a.map(f=>f.dd),y1=a.map(f=>f.y1);
    for(const f of a)f.sc=+(10*(.5*pct(sh,f.sh)+.3*pct(dd,f.dd)+.2*pct(y1,f.y1))).toFixed(1);}
  // comportamiento histórico: tras cada señal (impulso 3 m / caída desde máximos), ¿cómo fueron los 3 meses siguientes?
  const B={};const bk=(m)=>m<-5?'cae más de 5 %':m<0?'cae 0-5 %':m<5?'sube 0-5 %':'sube más de 5 %';
  const ddb=(d)=>d<-15?'más de 15 % bajo máximos':d<-5?'5-15 % bajo máximos':'cerca de máximos';
  for(const f of F){const {t,c}=H[f.s];const g=B[f.k]=B[f.k]||{mom:{},dd:{},all:{n:0,pos:0,sum:0}};
    for(let j=252;j+63<c.length;j+=21){const fw=(c[j+63]/c[j]-1)*100,m=(c[j]/c[j-63]-1)*100,hi=Math.max(...c.slice(j-252,j+1)),d=(c[j]/hi-1)*100;
      for(const [grp,key] of [[g.mom,bk(m)],[g.dd,ddb(d)],[g.all,'x']]){const o=grp===g.all?g.all:(grp[key]=grp[key]||{n:0,pos:0,sum:0});o.n++;if(fw>0)o.pos++;o.sum+=fw;}}}
  for(const g of Object.values(B)){for(const grp of [g.mom,g.dd])for(const o of Object.values(grp)){o.pos=Math.round(o.pos/o.n*100);o.sum=+(o.sum/o.n).toFixed(2);}g.all.pos=Math.round(g.all.pos/(g.all.n||1)*100);g.all.sum=+(g.all.sum/(g.all.n||1)).toFixed(2);}
  F.sort((a,b)=>b.sc-a.sc);
  writeFileSync(OUT+'/fd.json',JSON.stringify({t:Math.floor(Date.now()/1000),f:F,beh:B}));
  for(const f of F){const d=H[f.s];writeFileSync(OUT+'/fh/'+f.s.replace(/[^A-Za-z0-9.\-]/g,'_')+'.json',JSON.stringify({t:d.t,c:d.c}));}
  console.log('fondos',F.length,'categorías',Object.keys(byK).map(k=>k+':'+byK[k].length).join(' | '));
}
if(process.argv[1]&&process.argv[1].endsWith('fondos.mjs'))main().catch(e=>{console.error(e);process.exit(1);});
