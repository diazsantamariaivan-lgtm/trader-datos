// Contexto de mercado: VIX, tendencia de índices, calendario de resultados (EE. UU., Nasdaq). Genera out/x.json.
import {mkdirSync,writeFileSync} from 'node:fs';
const OUT=process.env.OUT||'out';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function gj(u,h){for(let i=0;i<3;i++){try{const r=await fetch(u,{headers:{'User-Agent':UA,Accept:'application/json',...(h||{})}});if(r.ok)return await r.json();}catch(e){}await sleep(800*(i+1));}return null;}
const IDX={SPX:'^GSPC',NDX:'^NDX',IBEX:'^IBEX',STOXX:'^STOXX50E',DAX:'^GDAXI',CAC:'^FCHI',FTSE:'^FTSE',MIB:'FTSEMIB.MI',AEX:'^AEX'};
const sma=(a,n)=>a.length>=n?a.slice(-n).reduce((x,y)=>x+y,0)/n:null;
async function serie(sym){
  const j=await gj('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(sym)+'?range=1y&interval=1d');
  const r=j&&j.chart&&j.chart.result&&j.chart.result[0];if(!r)return null;
  const c=(r.indicators.quote[0].close||[]).filter(x=>x!=null);if(c.length<30)return null;
  const p=c[c.length-1],n=c.length;
  return {p:+p.toFixed(2),ch1:+((p/c[n-2]-1)*100).toFixed(2),mom20:+((p/c[n-21]-1)*100).toFixed(2),s20:+sma(c,20).toFixed(2),s50:+sma(c,50).toFixed(2),s200:sma(c,200)?+sma(c,200).toFixed(2):null};
}
const out={t:Math.floor(Date.now()/1000),vix:null,idx:{},earn:{}};
out.vix=await serie('^VIX');
for(const [k,s] of Object.entries(IDX)){const v=await serie(s);if(v)out.idx[k]=v;await sleep(250);}
// Calendario de resultados (Nasdaq): próximos 45 días
let nd=0;
for(let i=0;i<=45;i++){
  const d=new Date(Date.now()+i*864e5);if([0,6].includes(d.getUTCDay()))continue;
  const ds=d.toISOString().slice(0,10);
  const j=await gj('https://api.nasdaq.com/api/calendar/earnings?date='+ds,{Origin:'https://www.nasdaq.com',Referer:'https://www.nasdaq.com/'});
  const rows=j&&j.data&&j.data.rows;if(!rows)continue;nd++;
  for(const r of rows){const s=String(r.symbol||'').trim().toUpperCase();if(!s||out.earn[s])continue;out.earn[s]=ds+(/pre/.test(r.time||'')?'a':/after/.test(r.time||'')?'d':'');}
  await sleep(300);
}
// Calendario de dividendos y splits (Nasdaq): próximos 45 días
out.div={};out.spl={};
for(let i=0;i<=45;i++){
  const d=new Date(Date.now()+i*864e5);if([0,6].includes(d.getUTCDay()))continue;
  const ds=d.toISOString().slice(0,10),H={Origin:'https://www.nasdaq.com',Referer:'https://www.nasdaq.com/'};
  const iso=x=>{const m=/^(\d\d)\/(\d\d)\/(\d{4})$/.exec(x||'');return m?m[3]+'-'+m[1]+'-'+m[2]:'';};
  const j=await gj('https://api.nasdaq.com/api/calendar/dividends?date='+ds,H);
  const rows=j&&j.data&&j.data.calendar&&j.data.calendar.rows;
  if(rows)for(const r of rows){const s=String(r.symbol||'').trim().toUpperCase();if(!s||out.div[s])continue;out.div[s]={x:iso(r.dividend_Ex_Date),p:iso(r.payment_Date),a:+r.dividend_Rate||0,y:+r.indicated_Annual_Dividend||0};}
  await sleep(250);
  const k=await gj('https://api.nasdaq.com/api/calendar/splits?date='+ds,H);
  const sr=k&&k.data&&k.data.rows;
  if(sr)for(const r of sr){const s=String(r.symbol||'').trim().toUpperCase();if(!s||out.spl[s])continue;out.spl[s]={d:iso(r.executionDate),r:String(r.ratio||'')};}
  await sleep(250);
}
// Reuniones de la Fed (decisión): calendario oficial 2026
out.macro=[{d:'2026-12-09',t:'Reunión de la Fed: decisión de tipos (14:00 hora de Nueva York)'}];
console.log('dividendos',Object.keys(out.div).length,'splits',Object.keys(out.spl).length);console.log('VIX',out.vix&&out.vix.p,'indices',Object.keys(out.idx).join(','),'dias calendario',nd,'empresas con resultados',Object.keys(out.earn).length);
if(!out.vix&&!Object.keys(out.idx).length){console.error('sin datos');process.exit(1);}
mkdirSync(OUT,{recursive:true});writeFileSync(OUT+'/x.json',JSON.stringify(out));
