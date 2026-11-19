// Descarga los datos de Yahoo Finance y los deja listos para publicar.
// Uso: node scripts/fetch.mjs quotes   (6 meses de todos los valores, en un solo archivo)
//      node scripts/fetch.mjs hist     (5 años de cada valor, un archivo por valor)
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
const MODE=process.argv[2]||'quotes';
const OUT=process.env.OUT||'out';
const YH=process.env.YAHOO||'https://query1.finance.yahoo.com';
const YH2=process.env.YAHOO2||'https://query2.finance.yahoo.com';
const LIMIT=+process.env.LIMIT||0;
const REPO=process.env.GITHUB_REPOSITORY||'';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const IBEX=['ACS','ACX','AENA','AMS','ANA','ANE','BBVA','BKT','CABK','CLNX','COL','ELE','ENG','FDR','FER','GRF','IAG','IBE','IDR','ITX','LOG','MAP','MRL','MTS','NTGY','PUIG','RED','REP','ROVI','SAB','SAN','SCYR','SLR','TEF','UNI'].map(x=>x.trim().replace(/'/g,''));
const FALLBACK='AAPL MSFT NVDA AMZN GOOGL META BRK-B TSLA AVGO LLY JPM V UNH XOM MA COST HD PG JNJ NFLX ABBV BAC CRM ORCL WMT KO CVX MRK AMD PEP TMO ADBE LIN CSCO ACN MCD ABT WFC GE DIS TXN QCOM INTU VZ CAT AMGN IBM PFE AMAT NOW ISRG GS UNP SPGI LOW RTX PM HON BKNG NEE T SYK AXP ELV MS BLK DE COP PLD TJX MDT VRTX BSX CB LRCX ADP MMC GILD PANW REGN C ADI MU SBUX KLAC CI MDLZ SO ZTS ETN BMY'.split(' ');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fileOf=s=>s.replace(/[^A-Za-z0-9.\-]/g,'_');
const rd=x=>Number(x.toFixed(4));

async function sp500(){
  try{
    const r=await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=List_of_S%26P_500_companies&prop=text&section=1&format=json',{headers:{'User-Agent':'trader-datos/1.0 (github actions)'}});
    const j=await r.json(),html=j.parse.text['*'],out=[];
    for(const tr of html.split('<tr').slice(1)){
      const m=tr.match(/<td[^>]*>([\s\S]*?)<\/td>/);if(!m)continue;
      const t=m[1].replace(/<[^>]+>/g,'').trim().replace('.','-');
      if(/^[A-Z-]{1,6}$/.test(t))out.push(t);
    }
    if(out.length>400)return out;
  }catch(e){console.log('Wikipedia no disponible:',e.message);}
  return FALLBACK;
}
async function getJson(url,tries=4){
  let err;
  for(let i=0;i<tries;i++){
    try{
      const r=await fetch(i%2?url.replace(YH,YH2):url,{headers:{'User-Agent':UA,'Accept':'application/json'},signal:AbortSignal.timeout(25000)});
      if(r.status===404)throw Object.assign(new Error('HTTP 404'),{fatal:true});
      if(!r.ok)throw new Error('HTTP '+r.status);
      return await r.json();
    }catch(e){err=e;if(e.fatal)break;await sleep(1500*2**i+Math.random()*800);}
  }
  throw err;
}
async function fetchSym(sym,range){
  const j=await getJson(YH+'/v8/finance/chart/'+encodeURIComponent(sym)+'?interval=1d&range='+range);
  const r=j.chart&&j.chart.result&&j.chart.result[0];if(!r)throw new Error('sin datos');
  const q=r.indicators.quote[0],ts=r.timestamp||[],o={nm:String(r.meta.shortName||r.meta.longName||'').slice(0,30),cu:r.meta.currency||'',t:[],o:[],h:[],l:[],c:[]};
  for(let i=0;i<ts.length;i++){
    if(q.close[i]==null||q.high[i]==null||q.low[i]==null)continue;
    o.t.push(ts[i]);o.o.push(rd(q.open[i]==null?q.close[i]:q.open[i]));o.h.push(rd(q.high[i]));o.l.push(rd(q.low[i]));o.c.push(rd(q.close[i]));
  }
  if(o.c.length<30)throw new Error('pocos datos');
  o.p=rd(r.meta.regularMarketPrice||o.c[o.c.length-1]);o.pt=r.meta.regularMarketTime||o.t[o.t.length-1];
  return o;
}
async function pool(items,n,fn){let i=0;await Promise.all(Array.from({length:n},async()=>{while(i<items.length){const it=items[i++];await fn(it);await sleep(100+Math.random()*150);}}));}
async function previous(){
  if(!REPO)return{};
  try{const r=await fetch('https://raw.githubusercontent.com/'+REPO+'/quotes/q.json',{signal:AbortSignal.timeout(30000)});if(r.ok)return (await r.json()).s||{};}catch(e){}
  return{};
}
function extras(){
  const x={study:[],view:[]};
  if(!existsSync('extras.txt'))return x;
  let sec='study';
  for(const ln of readFileSync('extras.txt','utf8').split(/\r?\n/)){
    const t=ln.replace(/#.*/,'').trim();if(!t)continue;
    const m=t.match(/^\[(estudiar|ver)\]$/i);if(m){sec=m[1].toLowerCase()==='ver'?'view':'study';continue;}
    for(const w of t.split(/[\s,;]+/))if(/^[A-Za-z0-9.^=\-]{1,14}$/.test(w))x[sec].push(w.toUpperCase());
  }
  x.study=[...new Set(x.study)];x.view=[...new Set(x.view)];
  return x;
}
function indices(){
  const out=[];if(!existsSync('indices.txt'))return out;let cur=null;
  for(const ln of readFileSync('indices.txt','utf8').split(/\r?\n/)){
    const t=ln.replace(/#.*/,'').trim();if(!t)continue;
    const m=t.match(/^\[(.+)\]$/);
    if(m){const p=m[1].split('|').map(x=>x.trim());cur={id:p[0],n:p[1]||p[0],c:p[2]||'',t:p[3]||p[0],s:[]};out.push(cur);continue;}
    if(cur)for(const w of t.split(/[\s,;]+/))if(/^[A-Za-z0-9.^=\-]{1,14}$/.test(w))cur.s.push(w.toUpperCase());
  }
  const seen=new Set();const u=out.filter(g=>seen.has(g.id)?false:(seen.add(g.id),true));
  u.forEach(g=>{g.s=[...new Set(g.s)];});return u;
}
const EX=extras(),IX=indices();
const SP=await sp500(),IB=IBEX.map(x=>x+'.MC');
const FX=['EURUSD=X','EURGBP=X','EURCHF=X','EURJPY=X','EURHKD=X','EURCAD=X','EURAUD=X','EURKRW=X','EURTWD=X','EURINR=X','EURBRL=X','EURSEK=X','EURDKK=X','EURNOK=X'];
// Índices "del núcleo" (van en q.json). El resto se publica por separado (qi/<ID>.json) y el móvil solo baja los que estudias.
const CORE_IDS=new Set(['EUROSTOXX50','DAX40','CAC40','FTSEMIB','AEX','SMI','FTSE100','NASDAQ100','DOW30']);
const coreSyms=new Set(IB.concat(SP,FX,EX.study,EX.view,...IX.filter(g=>CORE_IDS.has(g.id)).map(g=>g.s)));
const list=MODE==='hist'?[...coreSyms]:[...new Set([...coreSyms,...IX.flatMap(g=>g.s)])];
const syms=LIMIT?list.slice(0,LIMIT).concat(EX.study.slice(0,3),EX.view.slice(0,2)):list;
console.log(MODE,'-',syms.length,'valores');
mkdirSync(OUT,{recursive:true});
const got={},bad=[];
await pool(syms,6,async s=>{try{got[s]=await fetchSym(s,MODE==='hist'?'5y':'6mo');}catch(e){bad.push(s+' ('+e.message+')');}});
console.log('descargados',Object.keys(got).length,'fallidos',bad.length);if(bad.length)console.log(bad.slice(0,15).join(', '));
const ok=Object.keys(got).length/syms.length;
if(MODE==='hist'){
  if(ok<0.85){console.error('Demasiados fallos: no se publica nada.');process.exit(1);}
  mkdirSync(OUT+'/h',{recursive:true});
  for(const s of Object.keys(got))writeFileSync(OUT+'/h/'+fileOf(s)+'.json',JSON.stringify(got[s]));
}else{
  const prev=await previous();let kept=0;
  for(const s of syms)if(!got[s]&&prev[s]){got[s]=prev[s];kept++;}
  if(Object.keys(got).length/syms.length<0.7){console.error('Demasiados fallos: no se publica nada.');process.exit(1);}
  console.log('conservados de la vez anterior:',kept);
  const has=a=>a.filter(s=>got[s]);
  const idx=[{id:'SP500',n:'S&P 500',c:'EE. UU.',t:'S&P',s:has(SP)},{id:'IBEX35',n:'IBEX 35',c:'España',t:'IBEX',s:has(IB)}]
    .concat(IX.map(g=>({id:g.id,n:g.n,c:g.c,t:g.t,s:has(g.s)})))
    .concat([{id:'EXTRA',n:'Mis extras (valores y fondos)',c:'Varios',t:'Extra',s:has(EX.study)},{id:'VER',n:'Índices, cripto y materias primas',c:'Solo para mirar',t:'Ver',s:has(EX.view)}])
    .filter(g=>g.s.length>=3);
  const at=Math.floor(Date.now()/1000),core={};
  for(const s of Object.keys(got))if(coreSyms.has(s))core[s]=got[s];
  const shard=new Set(IX.filter(g=>!CORE_IDS.has(g.id)).map(g=>g.id));
  mkdirSync(OUT+'/qi',{recursive:true});
  for(const g of IX)if(shard.has(g.id)){const o={};for(const s of g.s)if(got[s]&&!coreSyms.has(s))o[s]=got[s];writeFileSync(OUT+'/qi/'+g.id+'.json',JSON.stringify({at,s:o}));}
  idx.forEach(g=>{if(shard.has(g.id))g.sh=1;});
  writeFileSync(OUT+'/q.json',JSON.stringify({at,x:{study:has(EX.study),view:has(EX.view)},idx,s:core}));
}
writeFileSync(OUT+'/LEEME.txt','Datos generados automáticamente. No editar.\n');
