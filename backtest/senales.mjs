import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
const DIR='/tmp/hh/h/';const files=readdirSync(DIR);
const W={tr:2,s50:1,rs:2,hi:1,mo:1},TOT=7;
const sma=(c,i,n)=>{let s=0;for(let j=i-n+1;j<=i;j++)s+=c[j];return s/n;};
function rsiAt(c,i,n=14){let g=0,l=0;const a=i-120>0?i-120:0;// Wilder recalculado en ventana
  for(let j=a+1;j<=a+n;j++){const d=c[j]-c[j-1];d>0?g+=d:l-=d;}g/=n;l/=n;for(let j=a+n+1;j<=i;j++){const d=c[j]-c[j-1];g=(g*(n-1)+Math.max(d,0))/n;l=(l*(n-1)+Math.max(-d,0))/n;}return l===0?100:100-100/(1+g/l);}
let seed=7;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
function bootEv(rets,sp,tp,days,runs){const m=rets.reduce((a,b)=>a+b,0)/rets.length,adj=rets.map(x=>x-0.5*m);let sum=0,ct=0;
  for(let r=0;r<runs;r++){let lv=0,out=0;for(let d=0;d<days;d++){lv+=adj[(rnd()*adj.length)|0];const px=Math.exp(lv)-1;if(px>=tp){sum+=tp;out=1;ct++;break;}if(px<=-sp){sum-=sp;out=1;break;}}if(!out)sum+=Math.exp(lv)-1;}return {ev:sum/runs*100,pT:ct/runs};}
const S=[];// señales
const D={};
for(const f of files){const d=JSON.parse(readFileSync(DIR+f,'utf8'));const sym=f.replace('.json','');D[sym]=d;}
// amplitud: % de valores sobre su media de 200 sesiones, por día (alineado por fecha)
const dayOf=t=>Math.floor(t/86400);
const BR={};{const cnt={},tot={};for(const sym in D){const d=D[sym],c=d.c;for(let i=200;i<c.length;i++){const k=dayOf(d.t[i]);tot[k]=(tot[k]||0)+1;if(c[i]>sma(c,i,200))cnt[k]=(cnt[k]||0)+1;}}for(const k in tot)BR[k]=cnt[k]/tot[k];}
for(const sym in D){const d=D[sym],c=d.c,h=d.h,l=d.l,o=d.o,n=c.length;
  for(let i=260;i<n-21;i+=5){
    const p=c[i],s20=sma(c,i,20),s50=sma(c,i,50),r=rsiAt(c,i),hi20=Math.max(...h.slice(i-19,i+1)),mom=(p/c[i-20]-1)*100;
    let tr=0;for(let j=i-13;j<=i;j++)tr+=Math.max(h[j]-l[j],Math.abs(h[j]-c[j-1]),Math.abs(l[j]-c[j-1]));const a=tr/14;if(!(a>0))continue;
    const f=[p>s20&&s20>s50?1:0,p>s50?1:0,r>=50&&r<=68?1:0,(hi20/p-1)*100<=3?1:0,mom>5?1:0];
    let sc=W.tr*f[0]+W.s50*f[1]+W.rs*f[2]+W.hi*f[3]+W.mo*f[4];sc-=2*(r>75?1:0)+2*(p<s50?1:0);sc=Math.max(0,Math.min(10,10*sc/TOT));
    const rets=[];for(let j=i-119;j<=i;j++)rets.push(Math.log(c[j]/c[j-1]));
    const ev=bootEv(rets,2*a/p,4*a/p,10,300);
    const mom12=(c[i-21]/c[i-252]-1)*100,mom6=(c[i-21]/c[i-126]-1)*100;
    const vol=Math.sqrt(rets.reduce((x,y)=>x+y*y,0)/rets.length)*Math.sqrt(252)*100;
    // resultados: entrada al open siguiente
    const e=o[i+1];if(!(e>0))continue;const st=e-2*a,tg=e+4*a;let ex=null,x=null;
    for(let j=i+1;j<=i+10;j++){if(l[j]<=st){x=st;break;}if(h[j]>=tg){x=tg;break;}}
    if(x==null)x=c[i+10];
    const r10=(c[i+10]/e-1)*100,r20=(c[i+20]/e-1)*100,rule=(x/e-1)*100;
    const wide=(m)=>{const st2=e-m*a;for(let j=i+1;j<=i+20;j++){if(l[j]<=st2)return (st2/e-1)*100;}return r20;};
    S.push({sym,k:dayOf(d.t[i]),sc,ev:ev.ev,pT:ev.pT,rsi:r,mom,mom12,mom6,vol,above50:p>s50?1:0,above200:p>sma(c,i,200)?1:0,br:BR[dayOf(d.t[i])]??null,rule:rule-0.1,r10:r10-0.1,r20:r20-0.1,w3:wide(3)-0.1,w4:wide(4)-0.1,w5:wide(5)-0.1});
  }}
writeFileSync('sig.json',JSON.stringify(S));console.log('señales',S.length,'símbolos',Object.keys(D).length);
