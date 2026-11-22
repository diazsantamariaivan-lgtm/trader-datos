// Calendario económico de la semana (datos publicados gratis por Forex Factory/FairEconomy).
// Genera out/c.json con: t (ms), c (país), n (nombre en español), o (original), i (H/M/L/F), f (previsión), p (anterior).
import {mkdirSync,writeFileSync} from 'node:fs';
const OUT=process.env.OUT||'out';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const URLS=['https://nfs.faireconomy.media/ff_calendar_thisweek.json','https://nfs.faireconomy.media/ff_calendar_nextweek.json'];
const PAIS={USD:'EE. UU.',EUR:'Eurozona',GBP:'Reino Unido',JPY:'Japón',CNY:'China',CHF:'Suiza',CAD:'Canadá',AUD:'Australia',NZD:'Nueva Zelanda'};
const IMP={High:'H',Medium:'M',Low:'L',Holiday:'F'};
const TR=[
 ['Core Retail Sales','Ventas minoristas subyacentes'],['Core PCE Price Index','Índice de precios PCE subyacente'],['PCE Price Index','Índice de precios PCE'],
 ['Non-Farm Employment Change','Empleo no agrícola'],['Unemployment Claims','Solicitudes de subsidio de desempleo'],['Unemployment Rate','Tasa de paro'],['Unemployment Change','Variación del paro'],
 ['Federal Funds Rate','Tipos de interés de la Fed'],['FOMC Meeting Minutes','Actas de la reunión de la Fed'],['FOMC Member','Miembro del FOMC'],['Beige Book','Libro Beige de la Fed'],
 ['Flash Manufacturing PMI','PMI manufacturero preliminar'],['Flash Services PMI','PMI de servicios preliminar'],['Manufacturing PMI','PMI manufacturero'],['Services PMI','PMI de servicios'],['Composite PMI','PMI compuesto'],
 ['Ifo Business Climate','Índice IFO de clima empresarial'],['ZEW Economic Sentiment','Índice ZEW de confianza'],['Consumer Confidence','Confianza del consumidor'],['Consumer Sentiment','Sentimiento del consumidor'],['Business Confidence','Confianza empresarial'],
 ['Durable Goods Orders','Pedidos de bienes duraderos'],['New Home Sales','Ventas de viviendas nuevas'],['Existing Home Sales','Ventas de viviendas de segunda mano'],['Pending Home Sales','Viviendas con venta pendiente'],
 ['Crude Oil Inventories','Inventarios semanales de crudo'],['Natural Gas Storage','Reservas de gas natural'],['Trade Balance','Balanza comercial'],['Current Account','Balanza por cuenta corriente'],
 ['Industrial Production','Producción industrial'],['Retail Sales','Ventas minoristas'],['Core CPI','IPC subyacente'],['Flash CPI','IPC preliminar'],['CPI','IPC'],['PPI','Precios de producción (IPP)'],
 ['Prelim GDP','PIB preliminar'],['Final GDP','PIB definitivo'],['Advance GDP','PIB adelantado'],['GDP','PIB'],['Bank Holiday','Festivo bancario'],['Speaks','interviene'],['Press Conference','Rueda de prensa'],
 ['Interest Rate','Tipos de interés'],['Rate Decision','Decisión de tipos'],['Monetary Policy Statement','Comunicado de política monetaria'],['Employment Change','Variación del empleo'],['Housing Starts','Inicio de viviendas'],
 ['Revised','revisado'],['Prelim','preliminar'],['Final','definitivo'],['Flash','preliminar'],['Core','subyacente'],['m/m','(mensual)'],['q/q','(trimestral)'],['y/y','(interanual)']];
const es=t=>{let s=String(t);for(const[a,b]of TR)s=s.split(a).join(b);return s;};
const PX={French:'Francia',German:'Alemania',Italian:'Italia',Spanish:'España'};
const E=[];
for(const u of URLS){
  try{const r=await fetch(u,{headers:{'User-Agent':UA}});if(!r.ok){console.log(u,'HTTP',r.status);continue;}
    const j=await r.json();if(!Array.isArray(j))continue;
    for(const x of j){const t=Date.parse(x.date);if(!isFinite(t))continue;const i=IMP[x.impact];if(!i)continue;
      let ti=String(x.title),c=PAIS[x.country]||String(x.country||'').slice(0,12);const m=ti.match(/^(French|German|Italian|Spanish)\s+(.*)$/);if(m){c=PX[m[1]];ti=m[2];}
      E.push({t,c,n:es(ti).slice(0,120),o:String(x.title).slice(0,120),i,f:String(x.forecast||'').slice(0,20),p:String(x.previous||'').slice(0,20)});}
    console.log(u,'ok',j.length);
  }catch(e){console.log(u,'error',e.message);}
}
if(!E.length){console.error('Sin datos de calendario: no se publica nada.');process.exit(1);}
E.sort((a,b)=>a.t-b.t||a.n.localeCompare(b.n));
mkdirSync(OUT,{recursive:true});
writeFileSync(OUT+'/c.json',JSON.stringify({at:Date.now(),e:E}));
console.log('eventos',E.length);
