// Laboratorio de fondos: 100 carteras de 10.000 € (5 reglas de elección × 4 nº de fondos × 5 plazos).
// 1) Backtest: cada cartera se "compra" en muchas fechas pasadas usando SOLO datos anteriores a esa fecha
//    y se mide qué pasó al cabo de su plazo. Compara con azar y con un fondo mundial.
// 2) En vivo: las mismas 100 carteras arrancan hoy con dinero ficticio y rotan al vencer su plazo (estado en la rama fondos).
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const OUT=process.env.OUT||'out',REPO=process.env.GITHUB_REPOSITORY||'diazsantamariaivan-lgtm/trader-datos';
const fd=JSON.parse(readFileSync(OUT+'/fd.json','utf8'));
const UA='Mozilla/5.0';
const RULES=[['mom12','Impulso 12 meses'],['mom3','Impulso 3 meses'],['sharpe','Mejor rentabilidad/riesgo'],['lowvol','Menor riesgo'],['random','Al azar (referencia)']];
const NS=[1,3,5,10],HS=[2,4,6,12,24];
const U=fd.f.filter(f=>f.c==='EUR'&&f.k!=='Otros'||f.c==='EUR');
const H={};for(const f of U){try{H[f.s]=JSON.parse(readFileSync(OUT+'/fh/'+f.s.replace(/[^A-Za-z0-9.\-]/g,'_')+'.json','utf8'));}catch(e){}}
const syms=Object.keys(H),K=Object.fromEntries(U.map(f=>[f.s,f.k]));
const at=(s,d)=>{const t=H[s].t;if(d<t[0])return null;let lo=0,hi=t.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(t[m]<=d)lo=m;else hi=m-1;}return {i:lo,p:H[s].c[lo]};};
function sig(s,d){
  const a=at(s,d),b=at(s,d-21),c=at(s,d-63),e=at(s,d-365);if(!a||!e||!b||!c||H[s].t[0]>d-365)return null;
  if(d-H[s].t[a.i]>10)return null;
  const r=[];for(let i=Math.max(1,at(s,d-365).i+1);i<=a.i;i++)r.push(H[s].c[i]/H[s].c[i-1]-1);if(r.length<150)return null;
  const m=r.reduce((x,y)=>x+y,0)/r.length,sd=Math.sqrt(r.reduce((x,y)=>x+(y-m)**2,0)/r.length)||1e-9,ret12=a.p/e.p-1;
  return {mom12:b.p/e.p-1,mom3:a.p/c.p-1,sharpe:(ret12-0.02)/(sd*Math.sqrt(252)),lowvol:-sd};
}
let seed=12345;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
function pick(rule,n,d){
  const L=[];for(const s of syms){const g=sig(s,d);if(g)L.push([s,g]);}if(L.length<n)return null;
  if(rule==='random'){const a=L.map(x=>x[0]);for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,n);}
  return L.sort((x,y)=>y[1][rule]-x[1][rule]).slice(0,n).map(x=>x[0]);
}
const WORLD=(fd.f.find(f=>/vanguard global stock index inv eur/i.test(f.n))||fd.f.find(f=>/msci world/i.test(f.n))||{}).s;
function holdRet(list,d,days){let r=0,k=0;for(const s of list){const a=at(s,d),b=at(s,d+days);if(!a||!b||H[s].t[b.i]<d+days-10)return null;r+=b.p/a.p-1;k++;}return k?r/k:null;}
async function vixSeries(){try{const r=await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?range=5y&interval=1d',{headers:{'User-Agent':UA}});const j=await r.json();const x=j.chart.result[0],t=[],c=[];x.timestamp.forEach((T,i)=>{const v=x.indicators.quote[0].close[i];if(v!=null){t.push(Math.floor(T/86400));c.push(v);}});return {t,c};}catch(e){return null;}}
const med=a=>{const b=[...a].sort((x,y)=>x-y);return b.length?b[Math.floor(b.length/2)]:null;};
async function main(){
  const now=Math.floor(Date.now()/86400000),minD=Math.min(...syms.map(s=>H[s].t[0])),V=await vixSeries();
  const vixAt=d=>{if(!V)return null;let lo=0,hi=V.t.length-1;if(d<V.t[0])return null;while(lo<hi){const m=(lo+hi+1)>>1;if(V.t[m]<=d)lo=m;else hi=m-1;}return V.c[lo];};
  const P=[];
  for(const rule of RULES.map(r=>r[0]))for(const n of NS)for(const hm of HS){
    const days=Math.round(hm*30.4),R=[],X=[],hi=[],lo=[],B=[];
    for(let d=minD+380;d+days<=now-3;d+=14){
      seed=d*31+n*7+hm;const L=pick(rule,n,d);if(!L)continue;const r=holdRet(L,d,days);if(r==null)continue;
      const w=WORLD?holdRet([WORLD],d,days):null;R.push(r);if(w!=null){X.push(r-w);B.push(w);}
      const vx=vixAt(d);if(vx!=null)(vx>22?hi:lo).push(r);
    }
    if(R.length<4)continue;
    const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
    P.push({id:rule+'-'+n+'-'+hm,rule,n,hm,k:R.length,med:+(med(R)*100).toFixed(2),avg:+(mean(R)*100).toFixed(2),pos:Math.round(R.filter(x=>x>0).length/R.length*100),worst:+(Math.min(...R)*100).toFixed(1),best:+(Math.max(...R)*100).toFixed(1),
      ex:X.length?+(mean(X)*100).toFixed(2):null,vh:hi.length>=3?+(mean(hi)*100).toFixed(2):null,vl:lo.length>=3?+(mean(lo)*100).toFixed(2):null,ann:+(((1+med(R))**(12/hm)-1)*100).toFixed(1)});
  }
  // lo aprendido: efecto de cada factor frente al azar con el mismo nº de fondos y plazo
  const rnd0=Object.fromEntries(P.filter(p=>p.rule==='random').map(p=>[p.n+'-'+p.hm,p]));
  const gain=p=>{const r=rnd0[p.n+'-'+p.hm];return r?p.avg-r.avg:null;};
  const agg=(key,vals,filter=()=>true)=>vals.map(v=>{const a=P.filter(p=>p[key]===v&&p.rule!=='random'&&filter(p)).map(gain).filter(x=>x!=null);return {v,g:a.length?+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2):null,k:a.length};});
  const byRule=agg('rule',RULES.map(r=>r[0]).filter(x=>x!=='random')),byN=agg('n',NS),byH=agg('hm',HS);
  const spread=(hm)=>{const a=P.filter(p=>p.hm===hm&&p.rule==='random');return a.length?{hm,rA:+(a.reduce((x,y)=>x+y.avg,0)/a.length).toFixed(2),pos:Math.round(a.reduce((x,y)=>x+y.pos,0)/a.length),worst:+Math.min(...a.map(p=>p.worst)).toFixed(1)}:null;};
  const byHr=HS.map(spread).filter(Boolean);
  const nWorld=WORLD&&P.length?P.filter(p=>p.ex!=null):[];
  // regímenes de VIX: media de los fondos por categoría tras VIX alto/bajo
  const V2={};for(const k of [...new Set(Object.values(K))]){const a={hi:[],lo:[]};
    for(let d=minD+30;d+91<=now-3;d+=14){const vx=vixAt(d);if(vx==null)continue;const rs=[];for(const s of syms)if(K[s]===k){const a1=at(s,d),b1=at(s,d+91);if(a1&&b1&&H[s].t[b1.i]>=d+80)rs.push(b1.p/a1.p-1);}
      if(rs.length>=3)(vx>22?a.hi:a.lo).push(rs.reduce((x,y)=>x+y,0)/rs.length);}
    if(a.hi.length>=4&&a.lo.length>=4)V2[k]={hi:+(a.hi.reduce((x,y)=>x+y,0)/a.hi.length*100).toFixed(2),nh:a.hi.length,lo:+(a.lo.reduce((x,y)=>x+y,0)/a.lo.length*100).toFixed(2),nl:a.lo.length};}
  // ----- en vivo -----
  let prev=null;try{const r=await fetch('https://raw.githubusercontent.com/'+REPO+'/fondos/lab.json?t='+Date.now());if(r.ok)prev=await r.json();}catch(e){}
  const live=(prev&&prev.live)||{};const PX=Object.fromEntries(fd.f.map(f=>[f.s,f.p]));const NM=Object.fromEntries(fd.f.map(f=>[f.s,f.n]));const today=now;
  const val=pf=>pf.pos.reduce((a,x)=>a+x.u*(PX[x.s]||x.pl||x.p0),0);
  for(const rule of RULES.map(r=>r[0]))for(const n of NS)for(const hm of HS){
    const id=rule+'-'+n+'-'+hm;let pf=live[id];
    const open=(cash)=>{seed=today*13+n+hm;const L=pick(rule,n,today);if(!L)return [];return L.map(s=>({s,n:NM[s]||s,p0:PX[s]||H[s].c[H[s].c.length-1],u:cash/L.length/(PX[s]||H[s].c[H[s].c.length-1])}));};
    if(!pf){pf=live[id]={id,rule,n,hm,t0:today,cash:0,next:today+Math.round(hm*30.4),pos:open(10000),cl:[],eq:[]};}
    else if(today>=pf.next){const v=val(pf),c0=pf.cost||10000;pf.cl.push({d:today,ret:+((v/c0-1)*100).toFixed(2)});pf.pos=open(v);pf.cost=v;pf.next=today+Math.round(hm*30.4);}
    for(const x of pf.pos){if(!x.n&&NM[x.s])x.n=NM[x.s];if(PX[x.s])x.pl=PX[x.s];}
    if(!pf.cost)pf.cost=10000;
    const v=val(pf);if(!pf.eq.length||pf.eq[pf.eq.length-1][0]!==today)pf.eq.push([today,Math.round(v)]);else pf.eq[pf.eq.length-1][1]=Math.round(v);pf.eq=pf.eq.slice(-800);pf.v=Math.round(v);
  }
  const learn={rules:byRule,n:byN,h:byH,hz:byHr,vix:V2,world:WORLD||null,nf:syms.length,from:minD+380,to:now};
  writeFileSync(OUT+'/lab.json',JSON.stringify({t:Math.floor(Date.now()/1000),bt:P,learn,live}));
  console.log('carteras backtest',P.length,'en vivo',Object.keys(live).length);
  console.log('por regla (ventaja media vs azar, pts %)',JSON.stringify(byRule));console.log('por nº fondos',JSON.stringify(byN));console.log('por plazo',JSON.stringify(byH));console.log('azar por plazo',JSON.stringify(byHr));console.log('VIX',JSON.stringify(V2).slice(0,500));
}
main().catch(e=>{console.error(e);process.exit(1);});
