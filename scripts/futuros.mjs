// Futuros: panel en vivo (cada ejecución) + sensibilidad de cada acción/índice a los futuros (una vez al día).
// Salida: out/fut.json  (en vivo)  y  out/sens.json  (sensibilidades; se reutiliza la del día anterior si existe).
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
const OUT=process.env.OUT||'out',REPO=process.env.GITHUB_REPOSITORY||'diazsantamariaivan-lgtm/trader-datos';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function gj(u,h){for(let i=0;i<3;i++){try{const r=await fetch(u,{headers:{'User-Agent':UA,...(h||{})},signal:AbortSignal.timeout(25000)});if(r.ok)return await r.json();if(r.status===404)return null;}catch(e){}await sleep(500*(i+1));}return null;}
const FUT=[['ES=F','S&P 500','Índice EE. UU.'],['NQ=F','Nasdaq 100','Índice EE. UU.'],['YM=F','Dow Jones','Índice EE. UU.'],['RTY=F','Russell 2000','Pequeñas EE. UU.'],['GC=F','Oro','Materias primas'],['CL=F','Petróleo (WTI)','Materias primas'],['ZN=F','Bono EE. UU. 10 años','Bonos'],['6E=F','Euro / dólar','Divisas'],['^VIX','VIX (miedo)','Volatilidad']];
const fmtET=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hour12:false});
const etp=t=>{const p=fmtET.formatToParts(new Date(t*1000)).reduce((a,x)=>(a[x.type]=x.value,a),{});return {d:p.year+'-'+p.month+'-'+p.day,h:+p.hour%24};};
async function hourly(sym,range){const j=await gj('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(sym)+'?range='+range+'&interval=1h');const r=j&&j.chart&&j.chart.result&&j.chart.result[0];if(!r)return null;const q=r.indicators.quote[0];return {t:r.timestamp||[],o:q.open||[],c:q.close||[],meta:r.meta};}
const byDay=h=>{const B={};for(let i=0;i<h.t.length;i++){if(h.o[i]==null||h.c[i]==null)continue;const e=etp(h.t[i]);(B[e.d]=B[e.d]||{})[e.h]={o:h.o[i],c:h.c[i],t:h.t[i]};}return B;};
// ---------- en vivo ----------
const live=[];
for(const [s,n,g] of FUT){const h=await hourly(s,'7d');if(!h||!h.t.length)continue;const B=byDay(h),ds=Object.keys(B).sort();
  const last=h.c.filter(x=>x!=null).at(-1),nowT=h.t[h.t.length-1];let ref=null;
  for(let k=ds.length-1;k>=0;k--){const b=B[ds[k]][15];if(b&&b.t<nowT-1800){ref=b.c;break;}}   // cierre de las 16:00 hora de Nueva York
  let ref12=null;for(let k=ds.length-1;k>=0;k--){const b=B[ds[k]][12];if(b&&b.t<nowT-1800){ref12=b.o;break;}}  // hacia las 17:00-18:00 en España
  let prev=null;{const dj=await gj('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(s)+'?range=10d&interval=1d');const dr=dj&&dj.chart&&dj.chart.result&&dj.chart.result[0];const dc=dr?(dr.indicators.quote[0].close||[]).filter(x=>x!=null):[];if(dc.length>=2)prev=dc[dc.length-2];}
  live.push({s,n,g,p:+last.toFixed(4),cu:ref?+((last/ref-1)*100).toFixed(2):null,ce:ref12?+((last/ref12-1)*100).toFixed(2):null,cd:prev?+((last/prev-1)*100).toFixed(2):null,t:nowT});
  await sleep(250);}
mkdirSync(OUT,{recursive:true});
writeFileSync(OUT+'/fut.json',JSON.stringify({at:Date.now(),f:live}));
console.log('futuros en vivo',live.length);
// ---------- sensibilidades (1 vez al día) ----------
let prevS=null;try{const r=await fetch('https://raw.githubusercontent.com/'+REPO+'/fut/sens.json?t='+Date.now());if(r.ok)prevS=await r.json();}catch(e){}
const hoy=new Date().toISOString().slice(0,10);
if(prevS&&prevS.d===hoy&&!process.env.FORCE){writeFileSync(OUT+'/sens.json',JSON.stringify(prevS));console.log('sensibilidades de hoy ya calculadas');process.exit(0);}
const reg=(x,y)=>{const n=x.length,mx=x.reduce((a,b)=>a+b)/n,my=y.reduce((a,b)=>a+b)/n;let sxy=0,sxx=0,syy=0;for(let i=0;i<n;i++){sxy+=(x[i]-mx)*(y[i]-my);sxx+=(x[i]-mx)**2;syy+=(y[i]-my)**2;}const b=sxy/(sxx||1e-12),r2=syy?sxy*sxy/((sxx||1e-12)*syy):0;let se=0;for(let i=0;i<n;i++)se+=(y[i]-my-b*(x[i]-mx))**2;return {b,r2,sd:Math.sqrt(se/n)};};
const F2={};for(const s of ['ES=F','NQ=F','YM=F']){const h=await hourly(s,'2y');if(h)F2[s]=byDay(h);await sleep(300);}
if(!F2['ES=F']){console.log('sin futuros históricos: se mantiene lo anterior');if(prevS)writeFileSync(OUT+'/sens.json',JSON.stringify(prevS));process.exit(0);}
function moves(B,h0,h1,lag){const ds=Object.keys(B).sort(),M={};for(let k=lag;k<ds.length;k++){const a=B[ds[k-lag]][h0],b=B[ds[k]][h1];if(a&&b)M[ds[k]]=b.o/a.c-1;}return M;}
const US={};for(const s of Object.keys(F2)){const B=F2[s],ds=Object.keys(B).sort(),M={};for(let k=1;k<ds.length;k++){const a=B[ds[k-1]][15],b=B[ds[k]][9];if(a&&b)M[ds[k]]=b.o/a.c-1;}US[s]=M;}
// Europa: movimiento de ES entre las 12:00 ET del día anterior (≈ cierre europeo) y las 03:00 ET (≈ apertura europea)
const EU={};{const B=F2['ES=F'],ds=Object.keys(B).sort();for(let k=1;k<ds.length;k++){const a=B[ds[k-1]][12],b=B[ds[k]][3];if(a&&b)EU[ds[k]]=b.o/a.o-1;}}
const dkey=t=>new Date(t*1000).toISOString().slice(0,10);
const out={d:hoy,at:Date.now(),idx:{},st:{},rx:{}};
// índices
const IDX=[['^GSPC','S&P 500','ES=F','us'],['^IXIC','Nasdaq Composite','NQ=F','us'],['^DJI','Dow Jones','YM=F','us'],['^GDAXI','DAX (Alemania)','ES=F','eu'],['^IBEX','IBEX 35','ES=F','eu'],['^FTSE','FTSE 100 (Reino Unido)','ES=F','eu'],['^STOXX50E','Euro Stoxx 50','ES=F','eu']];
for(const [s,n,fs,z] of IDX){const j=await gj('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(s)+'?range=2y&interval=1d');const r=j&&j.chart&&j.chart.result&&j.chart.result[0];if(!r)continue;const q=r.indicators.quote[0],T=r.timestamp,X=[],G=[];const M=z==='us'?US[fs]:EU;
  for(let i=1;i<T.length;i++){const d=dkey(T[i]);if(M[d]==null||!q.open[i]||!q.close[i-1])continue;const g=q.open[i]/q.close[i-1]-1;if(Math.abs(g)>0.1)continue;X.push(M[d]);G.push(g);}
  const nz=G.filter(g=>g!==0).length;
  if(X.length>=150&&nz>X.length*0.8){const a=reg(X,G);out.idx[s]={n,f:fs,z,b:+a.b.toFixed(2),r2:Math.round(a.r2*100),sd:+(a.sd*100).toFixed(2),nd:X.length};}await sleep(250);}
// acciones de EE. UU. (histórico de la rama hist)
const qj=await gj('https://raw.githubusercontent.com/'+REPO+'/quotes/q.json?t='+Date.now());
const syms=Object.keys((qj&&qj.s)||{}).filter(s=>!/[.^=]/.test(s));
console.log('acciones de EE. UU. en el histórico',syms.length);
const bucket={};let done=0;const ES=US['ES=F'];
async function one(s){const d=await gj('https://raw.githubusercontent.com/'+REPO+'/hist/h/'+encodeURIComponent(s)+'.json');if(!d||!d.o||!d.c||d.c.length<300)return;const X=[],G=[],OC=[];
  for(let i=1;i<d.c.length;i++){const k=dkey(d.t[i]);if(ES[k]==null||!d.o[i]||!d.c[i-1])continue;const g=d.o[i]/d.c[i-1]-1,oc=d.c[i]/d.o[i]-1;if(Math.abs(g)>0.3)continue;X.push(ES[k]);G.push(g);OC.push(oc);}
  if(X.length<200)return;const a=reg(X,G);out.st[s]={b:+a.b.toFixed(2),r2:Math.round(a.r2*100),sd:+(a.sd*100).toFixed(2)};
  for(let i=0;i<X.length;i++){const bk=X[i]<-0.005?0:X[i]<-0.001?1:X[i]<0.001?2:X[i]<0.005?3:4;const o=bucket[bk]=bucket[bk]||{n:0,g:0,oc:0};o.n++;o.g+=G[i];o.oc+=OC[i];}}
let q=0;await Promise.all([1,2,3,4,5,6].map(async()=>{while(q<syms.length){const s=syms[q++];await one(s);if(++done%200===0)console.log('...',done);}}));
const NB=['Futuros bajan más de 0,5 %','Bajan 0,1 – 0,5 %','Casi planos','Suben 0,1 – 0,5 %','Suben más de 0,5 %'];
out.rx=NB.map((n,k)=>{const o=bucket[k];return o?{n,g:+(o.g/o.n*100).toFixed(2),oc:+(o.oc/o.n*100).toFixed(2),k:o.n}:null;}).filter(Boolean);
const bs=Object.values(out.st).map(x=>x.b).sort((a,b)=>a-b),r2=Object.values(out.st).map(x=>x.r2);
out.res={ns:bs.length,bm:bs.length?+bs[bs.length>>1].toFixed(2):null,r2:r2.length?Math.round(r2.reduce((a,b)=>a+b,0)/r2.length):null};
writeFileSync(OUT+'/sens.json',JSON.stringify(out));
console.log('sensibilidades: acciones',bs.length,'índices',Object.keys(out.idx).length,JSON.stringify(out.res));
