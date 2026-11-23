import {readFileSync,readdirSync} from 'node:fs';
/* Replica de las reglas del EA: Gann HiLo (medias de las N velas previas) + buy stop en maximo de B velas + SL = M*ATR(A) + cierre a X velas */
export function atrSMA(h,l,c,n){const tr=h.map((x,i)=>i?Math.max(x-l[i],Math.abs(x-c[i-1]),Math.abs(l[i]-c[i-1])):x-l[i]);const a=new Array(h.length).fill(NaN);let s=0;for(let i=0;i<tr.length;i++){s+=tr[i];if(i>=n)s-=tr[i-n];if(i>=n-1)a[i]=s/n;}return a;}
export function hilo(h,l,c,N){const tr=new Int8Array(h.length),ln=new Array(h.length).fill(NaN);let t=0,line=NaN;for(let i=N;i<h.length;i++){let sh=0,sl=0;for(let k=i-N;k<i;k++){sh+=h[k];sl+=l[k];}sh/=N;sl/=N;if(c[i]>sh)t=1;else if(c[i]<sl)t=-1;line=t===1?sl:t===-1?sh:NaN;tr[i]=t;ln[i]=line;}return {tr,ln};}
export function bt(D,p,cost,opt={}){
  const {o,h,l,c}=D,n=o.length,A=atrSMA(h,l,c,p.atr),H=hilo(h,l,c,p.hilo),T=[];
  let pend=null,pos=null;const start=Math.max(p.brk,p.atr,p.hilo)+2;
  for(let i=start;i<n;i++){
    // 1) salida por tiempo, al abrir la vela
    if(pos&&i-pos.bar>=p.exit){T.push({i0:pos.bar,i1:i,R:(o[i]-pos.e-cost)/pos.risk});pos=null;}
    // 2) caducidad de la pendiente
    if(pend&&i-pend.bar>=p.exp)pend=null;
    // 3) senal en la vela anterior si no hay operacion
    if(!pos){
      const j=i-1;
      if(!isNaN(H.ln[j])&&l[j]<=H.ln[j]&&(!p.up||H.tr[j]===1)&&!isNaN(A[j])){
        let mx=-Infinity;for(let k=i-p.brk;k<=j;k++)if(h[k]>mx)mx=h[k];
        const e=mx,sl=e-p.m*A[j];
        if(opt.noPend){pend=null;} else if(sl>0&&e>o[i])pend={bar:i,e,sl,risk:e-sl};
      }
    } else pend=null;
    // 4) durante la vela i: stop de la posicion y activacion de la pendiente
    if(pos){if(l[i]<=pos.sl){const px=Math.min(pos.sl,o[i]);T.push({i0:pos.bar,i1:i,R:(px-pos.e-cost)/pos.risk});pos=null;}}
    if(!pos&&pend&&h[i]>=pend.e){
      const e=Math.max(pend.e,o[i]);const risk=pend.risk;
      pos={bar:i,e,sl:pend.sl,risk};pend=null;
      if(l[i]<=pos.sl){T.push({i0:i,i1:i,R:(pos.sl-e-cost)/risk});pos=null;}
    }
  }
  return T;
}
export function stats(T,risk=0.003){
  if(!T.length)return {n:0,win:0,avgR:0,pf:0,ret:0,dd:0,t:0};
  let eq=1,pk=1,dd=0,gw=0,gl=0,w=0,s=0,s2=0;
  for(const t of T){eq*=1+risk*t.R;pk=Math.max(pk,eq);dd=Math.max(dd,(pk-eq)/pk);if(t.R>0){gw+=t.R;w++;}else gl-=t.R;s+=t.R;s2+=t.R*t.R;}
  const m=s/T.length,sd=Math.sqrt(Math.max(0,s2/T.length-m*m));
  return {n:T.length,win:w/T.length*100,avgR:m,pf:gl?gw/gl:99,ret:(eq-1)*100,dd:dd*100,t:sd?m/(sd/Math.sqrt(T.length)):0};
}
