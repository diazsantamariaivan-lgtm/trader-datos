import {readdirSync,readFileSync} from 'node:fs';
const DIR=(process.env.HIST||'hist/h')+'/';const D={};
for(const f of readdirSync(DIR)){const d=JSON.parse(readFileSync(DIR+f,'utf8'));if(d.c&&d.c.length>300)D[f.replace('.json','')]=d;}
const dayOf=t=>Math.floor(t/86400);
const W={tr:2,s50:1,rs:2,hi:1,mo:1},TOT=7;
const sma=(c,i,n)=>{let s=0;for(let j=i-n+1;j<=i;j++)s+=c[j];return s/n;};
function rsiAt(c,i,n=14){let g=0,l=0;const a=Math.max(0,i-120);for(let j=a+1;j<=a+n;j++){const d=c[j]-c[j-1];d>0?g+=d:l-=d;}g/=n;l/=n;for(let j=a+n+1;j<=i;j++){const d=c[j]-c[j-1];g=(g*(n-1)+Math.max(d,0))/n;l=(l*(n-1)+Math.max(-d,0))/n;}return l===0?100:100-100/(1+g/l);}
let seed=7;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
function bootEv(rets,sp,tp,days,runs){const m=rets.reduce((a,b)=>a+b,0)/rets.length,adj=rets.map(x=>x-0.5*m);let sum=0;
  for(let r=0;r<runs;r++){let lv=0,out=0;for(let d=0;d<days;d++){lv+=adj[(rnd()*adj.length)|0];const px=Math.exp(lv)-1;if(px>=tp){sum+=tp;out=1;break;}if(px<=-sp){sum-=sp;out=1;break;}}if(!out)sum+=Math.exp(lv)-1;}return sum/runs*100;}
const IX={};for(const s in D){IX[s]=new Map(D[s].t.map((t,i)=>[dayOf(t),i]));}
const days=[...new Set(Object.values(D).flatMap(d=>d.t.map(dayOf)))].sort((a,b)=>a-b);
const start=days[Math.floor(days.length*0.22)];
// señales en los días de decisión (2 por semana)
const dec=days.filter(k=>k>=start&&(Math.floor(k/1)%7===1||Math.floor(k/1)%7===4));
const SIG={};
for(const k of dec){const L=[];for(const s in D){const i=IX[s].get(k);if(i==null||i<260||i+12>=D[s].c.length)continue;const d=D[s],c=d.c,h=d.h,l=d.l,p=c[i];
  const s20=sma(c,i,20),s50=sma(c,i,50),r=rsiAt(c,i);if(r>78||p<s50)continue;
  const hi20=Math.max(...h.slice(i-19,i+1)),mom=(p/c[i-20]-1)*100;let tr=0;for(let j=i-13;j<=i;j++)tr+=Math.max(h[j]-l[j],Math.abs(h[j]-c[j-1]),Math.abs(l[j]-c[j-1]));const a=tr/14;if(!(a>0))continue;
  const f=[p>s20&&s20>s50?1:0,1,r>=50&&r<=68?1:0,(hi20/p-1)*100<=3?1:0,mom>5?1:0];
  let sc=W.tr*f[0]+W.s50*f[1]+W.rs*f[2]+W.hi*f[3]+W.mo*f[4];sc=Math.max(0,Math.min(10,10*sc/TOT));if(sc<6)continue;
  const rets=[];for(let j=i-119;j<=i;j++)rets.push(Math.log(c[j]/c[j-1]));const ev=bootEv(rets,2*a/p,4*a/p,10,200);if(!(ev>0))continue;
  L.push({s,i,sc,ev,a,rank:sc+ev/2});}
  L.sort((x,y)=>y.rank-x.rank);SIG[k]=L.slice(0,25);}
console.log('días decisión',dec.length,'candidatas medias',(Object.values(SIG).reduce((a,b)=>a+b.length,0)/dec.length).toFixed(1));
function corr(s1,i1,s2,i2,n=60){const a=D[s1].c,b=D[s2].c,ta=D[s1].t,tb=D[s2].t;const ra=new Map();for(let j=i1-n;j<=i1;j++)ra.set(dayOf(ta[j]),Math.log(a[j]/a[j-1]));const X=[],Y=[];for(let j=i2-n;j<=i2;j++){const k=dayOf(tb[j]);if(ra.has(k)){X.push(ra.get(k));Y.push(Math.log(b[j]/b[j-1]));}}
  if(X.length<30)return 0;const mx=X.reduce((u,v)=>u+v)/X.length,my=Y.reduce((u,v)=>u+v)/Y.length;let sxy=0,sxx=0,syy=0;for(let j=0;j<X.length;j++){sxy+=(X[j]-mx)*(Y[j]-my);sxx+=(X[j]-mx)**2;syy+=(Y[j]-my)**2;}return sxy/Math.sqrt(sxx*syy+1e-12);}
function sim(thr,maxOpen=5,from=0,to=1,risk=0.02,mp=0.20){
  let cash=10000,pos=[],eqH=[],trades=[],blocked=0;const K=days.filter(k=>k>=start);const a0=Math.floor(K.length*from),a1=Math.floor(K.length*to);
  const mtm=k=>cash+pos.reduce((u,p)=>{const i=IX[p.s].get(k);const px=i!=null?D[p.s].c[i]:p.last;p.last=px;return u+p.sh*px;},0);
  let buys=0,bd=-1;
  for(const k of K.slice(a0,a1)){
    // salidas
    for(const p of pos.slice()){const i=IX[p.s].get(k);if(i==null)continue;const d=D[p.s];p.n++;let x=null;
      if(d.o[i]<=p.st)x=d.o[i];else if(d.l[i]<=p.st)x=p.st;else if(d.o[i]>=p.tg)x=d.o[i];else if(d.h[i]>=p.tg)x=p.tg;else if(p.n>=10)x=d.c[i];
      if(x!=null){cash+=p.sh*x*(1-0.001)-1;trades.push((x/p.e-1)*100);pos=pos.filter(q=>q!==p);}}
    // compras (señal del día anterior a la decisión → entrada hoy a la apertura)
    const prev=days[days.indexOf(k)-1];
    if(SIG[prev]){let nb=0;for(const c of SIG[prev]){if(pos.length>=maxOpen||nb>=3)break;if(pos.some(p=>p.s===c.s))continue;const i=IX[c.s].get(k);if(i==null)continue;const d=D[c.s];
        if(thr<1){let mx=-1;for(const p of pos){const j=IX[p.s].get(prev);if(j==null)continue;const r=corr(c.s,c.i,p.s,j);if(r>mx)mx=r;}if(mx>=thr){blocked++;continue;}}
        const e=d.o[i]*1.001,eq=mtm(k),sh=Math.min(eq*risk/(2*c.a),eq*mp/e,(cash-1)/e);if(!(sh>0)||sh*e<200)continue;
        cash-=sh*e+1;pos.push({s:c.s,sh,e,st:e-2*c.a,tg:e+4*c.a,n:0,last:e});nb++;}}
    eqH.push(mtm(k));}
  const r=[];for(let j=1;j<eqH.length;j++)r.push(eqH[j]/eqH[j-1]-1);const m=r.reduce((u,v)=>u+v,0)/r.length,sd=Math.sqrt(r.reduce((u,v)=>u+(v-m)**2,0)/r.length);
  let pk=0,dd=0;for(const e of eqH){pk=Math.max(pk,e);dd=Math.min(dd,e/pk-1);}
  const yrs=eqH.length/252;return {fin:eqH.at(-1),cagr:((eqH.at(-1)/10000)**(1/yrs)-1)*100,dd:dd*100,sh:m/sd*Math.sqrt(252),vol:sd*Math.sqrt(252)*100,n:trades.length,win:trades.filter(x=>x>0).length/trades.length*100,blocked};}

const K=days.filter(k=>k>=start);let bh=[];{const eqw=[];for(const k of K){let r=0,n=0;const pk=days[days.indexOf(k)-1];for(const s in D){const i=IX[s].get(k),j=IX[s].get(pk);if(i!=null&&j!=null){r+=D[s].c[i]/D[s].c[j]-1;n++;}}eqw.push(n?r/n:0);}
 let e=10000,pkv=0,dd=0;const arr=[];for(const r of eqw){e*=1+r;arr.push(e);pkv=Math.max(pkv,e);dd=Math.min(dd,e/pkv-1);}const yrs=arr.length/252;console.log('REFERENCIA comprar todas a partes iguales: anual',(((arr.at(-1)/10000)**(1/yrs)-1)*100).toFixed(1)+'%','caída máx',(dd*100).toFixed(1)+'%');}
for(const [nm,f,t] of [['todo',0,1],['1ª mitad',0,.5],['2ª mitad',.5,1]]){console.log('==',nm);
 for(const [lab,thr,risk,mp,mo] of [['actual (riesgo 2 %, máx 20 % por valor, 5 pos.)',1,.02,.2,5],['+ límite corr 0,7',.7,.02,.2,5],['riesgo 1 %, máx 10 % por valor',1,.01,.1,5],['riesgo 1 %, máx 10 % + corr 0,7',.7,.01,.1,5],['riesgo 1 %, máx 10 % + corr 0,5',.5,.01,.1,5],['riesgo 1 %, máx 10 %, 8 posiciones',1,.01,.1,8]]){const r=sim(thr,mo,f,t,risk,mp);console.log(lab.padEnd(50),'final',r.fin.toFixed(0),'| anual',r.cagr.toFixed(1)+'%','| caída máx',r.dd.toFixed(1)+'%','| vol',r.vol.toFixed(1)+'%','| Sharpe',r.sh.toFixed(2),'| ops',r.n);}}
