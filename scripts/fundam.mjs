// Fundamentales de cada empresa: ROCE, F-Score de Piotroski, capitalización y dividendos.
// Uso: node scripts/fundam.mjs   (lee la lista de valores de la rama quotes y escribe out/f.json)
import {mkdirSync,writeFileSync} from 'node:fs';
const OUT=process.env.OUT||'out',LIMIT=+process.env.LIMIT||0,REPO=process.env.GITHUB_REPOSITORY||'diazsantamariaivan-lgtm/trader-datos';
const TS=process.env.YTS||'https://query2.finance.yahoo.com',YH=process.env.YAHOO||'https://query1.finance.yahoo.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const TYPES=['annualTotalRevenue','annualGrossProfit','annualNetIncome','annualEBIT','annualTotalAssets','annualCurrentAssets','annualCurrentLiabilities','annualLongTermDebt','annualOrdinarySharesNumber','annualOperatingCashFlow','trailingMarketCap'];
async function getJson(url,tries=3){
  let err;
  for(let i=0;i<tries;i++){
    try{
      const r=await fetch(url.replace(TS,i%2?YH:TS),{headers:{'User-Agent':UA,'Accept':'application/json'},signal:AbortSignal.timeout(25000)});
      if(r.status===404)throw Object.assign(new Error('HTTP 404'),{fatal:true});
      if(!r.ok)throw new Error('HTTP '+r.status);
      return await r.json();
    }catch(e){err=e;if(e.fatal)break;await sleep(1500*2**i+Math.random()*800);}
  }
  throw err;
}
function parseTS(j){
  const o={};let cu='';
  for(const x of (j.timeseries&&j.timeseries.result)||[]){
    const t=x.meta.type[0],v=x[t];if(!v)continue;
    const m=new Map();
    for(const i of v){if(i&&i.reportedValue&&i.reportedValue.raw!=null){m.set(i.asOfDate,i.reportedValue.raw);if(t==='trailingMarketCap'&&i.currencyCode)cu=i.currencyCode;}}
    o[t.replace(/^(annual|trailing)/,'')]=m;
  }
  return {o,cu};
}
function ratios(o){
  const TA=o.TotalAssets;if(!TA||TA.size<2)return null;
  const ds=[...TA.keys()].sort(),d0=ds[ds.length-1],d1=ds[ds.length-2];
  const g=(k,d)=>o[k]&&o[k].has(d)?o[k].get(d):null;
  const res={};
  // ROCE = EBIT / (activos totales - pasivo corriente)
  const ebit=g('EBIT',d0),cl0=g('CurrentLiabilities',d0),ta0=g('TotalAssets',d0);
  if(ebit!=null&&cl0!=null&&ta0-cl0>0)res.roce=+(ebit/(ta0-cl0)*100).toFixed(1);
  // Piotroski
  const ni0=g('NetIncome',d0),ni1=g('NetIncome',d1),ta1=g('TotalAssets',d1),cfo=g('OperatingCashFlow',d0);
  const ld0=g('LongTermDebt',d0)||0,ld1=g('LongTermDebt',d1)||0,ca0=g('CurrentAssets',d0),ca1=g('CurrentAssets',d1),cl1=g('CurrentLiabilities',d1);
  const sh0=g('OrdinarySharesNumber',d0),sh1=g('OrdinarySharesNumber',d1),gp0=g('GrossProfit',d0),gp1=g('GrossProfit',d1),rv0=g('TotalRevenue',d0),rv1=g('TotalRevenue',d1);
  let fs=0,fn=0;const add=c=>{if(c===null)return;fn++;if(c)fs++;};
  add(ni0==null?null:ni0>0);
  add(cfo==null?null:cfo>0);
  add(ni0==null||ni1==null?null:ni0/ta0>ni1/ta1);
  add(cfo==null||ni0==null?null:cfo>ni0);
  add(ld0/ta0<ld1/ta1);
  add(ca0==null||ca1==null||!cl0||!cl1?null:ca0/cl0>ca1/cl1);
  add(sh0==null||sh1==null?null:sh0<=sh1*1.005);
  add(gp0==null||gp1==null||!rv0||!rv1?null:gp0/rv0>gp1/rv1);
  add(rv0==null||rv1==null?null:rv0/ta0>rv1/ta1);
  if(fn>=6){res.fs=fs;res.fn=fn;}
  res.fd=d0;
  return res;
}
async function dividends(sym){
  const j=await getJson(YH+'/v8/finance/chart/'+encodeURIComponent(sym)+'?interval=1mo&range=12y&events=div');
  const r=j.chart&&j.chart.result&&j.chart.result[0];if(!r)return null;
  const dv=r.events&&r.events.dividends?Object.values(r.events.dividends).map(d=>({t:d.date,a:d.amount})).sort((a,b)=>a.t-b.t):[];
  return {dv,cu:r.meta.currency||'',px:r.meta.regularMarketPrice};
}
function divStats(dv){
  const now=new Date(),yr=now.getUTCFullYear(),by={};
  for(const d of dv){const y=new Date(d.t*1000).getUTCFullYear();by[y]=(by[y]||0)+d.a;}
  const full=[];for(let y=yr-1;y>=yr-11;y--)full.push([y,by[y]||0]);
  let paid=0;for(const [y,a] of full){if(a>0)paid++;else break;}
  let grow=0;for(let i=0;i<full.length-1;i++){const [,a]=full[i],[,b]=full[i+1];if(a>0&&b>0&&a>b*1.001)grow++;else break;}
  let cut=null;if(full[0][1]>0&&full[1][1]>0&&full[0][1]<full[1][1]*0.97)cut=1;
  const ttm=dv.filter(d=>d.t>Date.now()/1000-365*86400).reduce((a,d)=>a+d.a,0);
  const nPay=dv.filter(d=>new Date(d.t*1000).getUTCFullYear()===yr-1).length;
  return {ttm:+ttm.toFixed(4),paid,grow,cut,nPay,hist:full.slice(0,6).reverse().map(([y,a])=>[y,+a.toFixed(3)]),last:dv.length?dv[dv.length-1].t:0};
}
async function pool(items,n,fn){let i=0;await Promise.all(Array.from({length:n},async()=>{while(i<items.length){const it=items[i++];await fn(it);await sleep(120+Math.random()*180);}}));}
async function main(){
  const q=await (await fetch('https://raw.githubusercontent.com/'+REPO+'/quotes/q.json',{signal:AbortSignal.timeout(30000)})).json();
  let syms=Object.keys(q.s||{}).filter(s=>!/^\^|=X$|=F$|-USD$/.test(s));
  if(LIMIT)syms=syms.slice(0,LIMIT);
  console.log('valores',syms.length);
  const out={t:Math.floor(Date.now()/1000),s:{}};let ok=0,fail=0;
  await pool(syms,4,async sym=>{
    try{
      const j=await getJson(TS+'/ws/fundamentals-timeseries/v1/finance/timeseries/'+encodeURIComponent(sym)+'?type='+TYPES.join(',')+'&period1=1400000000&period2='+(Math.floor(Date.now()/1000)+86400*30));
      const {o,cu}=parseTS(j);const e={};
      if(o.MarketCap&&o.MarketCap.size){const k=[...o.MarketCap.keys()].sort().pop();e.mc=Math.round(o.MarketCap.get(k));e.cu=cu;}
      const r=ratios(o);if(r)Object.assign(e,r);
      try{const d=await dividends(sym);if(d){const s=divStats(d.dv);e.dv=s.ttm;e.dp=s.paid;e.dg=s.grow;e.dn=s.nPay;if(s.cut)e.dc=1;e.dh=s.hist;e.dl=s.last;if(!e.cu)e.cu=d.cu;}}catch(err){}
      if(Object.keys(e).length>1){out.s[sym]=e;ok++;}else fail++;
    }catch(err){fail++;}
  });
  console.log('con datos',ok,'sin datos',fail);
  if(ok<(+process.env.MINOK||50))throw new Error('muy pocos datos: no se publica');
  mkdirSync(OUT,{recursive:true});writeFileSync(OUT+'/f.json',JSON.stringify(out));
}
main().catch(e=>{console.error(e);process.exit(1);});
