// Registro de aciertos de analistas: detecta en los titulares recomendaciones de casas (Stifel, Mizuho...),
// guarda el precio del momento y mide a 7 y 28 días si el valor se movió en la dirección que dijeron
// (y si le ganó al S&P 500). Genera out/ac.json y conserva el historial entre ejecuciones (rama acierto).
import {mkdirSync,writeFileSync} from 'node:fs';
import {loadQ} from './universo.mjs';
const OUT=process.env.OUT||'out',REPO=process.env.GITHUB_REPOSITORY||'diazsantamariaivan-lgtm/trader-datos';
const B='https://raw.githubusercontent.com/'+REPO+'/';
const J=async u=>{try{const r=await fetch(u+'?t='+Date.now(),{signal:AbortSignal.timeout(30000)});return r.ok?await r.json():null;}catch(e){return null;}};
const UP=/\b(eleva|mejora|sube|aumenta|raises?|boosts?|upgrades?|lifts?|hikes?)\b/i,DN=/\b(recorta|rebaja|degrada|baja|reduce|lowers?|cuts?|downgrades?|slashes)\b/i;
const KEEP=/\b(reitera|mantiene|inicia|asume|reiterates?|initiates?|maintains?|reaffirms?)\b/i;
const BUY=/(compra|sobreponderar|superar|outperform|overweight|buy)/i,SELL=/(venta|infraponderar|underperform|underweight|sell)/i;
export function parseCall(t){
  const m=/^(.{2,34}?)\s+(eleva|mejora|sube|aumenta|recorta|rebaja|degrada|baja|reduce|reitera|mantiene|inicia|asume|raises?|boosts?|upgrades?|lifts?|hikes?|lowers?|cuts?|downgrades?|slashes|reiterates?|initiates?|maintains?|reaffirms?)\b(.*)$/i.exec(t);
  if(!m)return null;
  const firm=m[1].trim();if(firm.split(/\s+/).length>4||!/^[A-ZÁÉÍÓÚ0-9]/.test(firm)||/[:,;“"]/.test(firm))return null;
  if(!/(precio objetivo|recomendaci|price target|rating|calific|objetivo|\bpt\b|compra|venta)/i.test(m[3]+' '+m[2]))return null;
  let dir=0;const v=m[2],rest=m[3];
  if(UP.test(v))dir=1;else if(DN.test(v))dir=-1;
  else if(KEEP.test(v)){dir=BUY.test(rest)?1:SELL.test(rest)?-1:0;}
  if(!dir)return null;
  return {f:firm,dir};
}
const nz=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const SUFX=/\b(incorporated|inc|corp|corporation|company|companies|co|plc|ltd|limited|holdings?|group|the|sa|se|ag|nv|spa|class [abc]|common stock|ordinary shares?)\b/g;
// el titular debe nombrar de verdad a la empresa (evita confundir Williams-Sonoma con Williams Cos)
function nombraEmpresa(t,nm){
  const n=nz(nm).replace(/[.,()]/g,' ').replace(SUFX,' ').replace(/\s+/g,' ').trim();if(!n||/\.\.\./.test(nm||''))return false;
  const w=n.split(' '),tt=' '+nz(t).replace(/[^a-z0-9ñ&\- ]/g,' ').replace(/\s+/g,' ')+' ';
  const k=w.length>=2?w.slice(0,2).join(' '):w[0];if(k.length<4)return false;
  const i=tt.indexOf(' '+k);if(i<0)return false;const nx=tt[i+1+k.length];return nx===' '||nx==='s';
}
const day=d=>Math.floor(d/86400);
async function main(){
  const now=Math.floor(Date.now()/1000);
  const prev=(await J(B+'acierto/ac.json'))||{calls:[]};
  const calls=prev.calls||[];const q=await loadQ(REPO);
  for(let i=calls.length-1;i>=0;i--){const c=calls[i];if(q.s[c.s]&&!nombraEmpresa(c.t,q.s[c.s].nm))calls.splice(i,1);}
  const have=new Set(calls.map(c=>c.f+'|'+c.s+'|'+day(c.d)));const bm=(q.s['SPY']||q.s['^GSPC']||{}).p||null;
  const n=await J(B+'news/n.json');let nuevas=0;
  if(n&&n.s)for(const [sym,arr] of Object.entries(n.s))for(const it of arr){
    const c=parseCall(it.t);if(!c||!nombraEmpresa(it.t,(q.s[sym]||{}).nm))continue;const k=c.f+'|'+sym+'|'+day(it.d);if(have.has(k))continue;
    const p=q.s[sym]&&q.s[sym].p;if(!p)continue;have.add(k);nuevas++;
    calls.push({f:c.f,s:sym,dir:c.dir,d:it.d,seen:now,p0:p,b0:bm,t:it.t.slice(0,110)});
  }
  for(const c of calls){const p=q.s[c.s]&&q.s[c.s].p;if(!p)continue;const age=(now-c.d)/86400;
    for(const h of [7,28]){if(c['e'+h]==null&&age>=h){c['e'+h]=+((p/c.p0-1)*100).toFixed(2);c['r'+h]=bm&&c.b0?+(((p/c.p0)-(bm/c.b0))*100).toFixed(2):null;}}}
  const keep=calls.filter(c=>now-c.d<400*86400).sort((a,b)=>b.d-a.d).slice(0,3000);
  const F={};
  for(const c of keep){const f=F[c.f]=F[c.f]||{n:0,n7:0,h7:0,n28:0,h28:0,m28:0};f.n++;
    if(c.e7!=null){f.n7++;if(c.e7*c.dir>0)f.h7++;}
    if(c.e28!=null){f.n28++;if(c.e28*c.dir>0)f.h28++;if(c.r28!=null&&c.r28*c.dir>0)f.m28++;}}
  mkdirSync(OUT,{recursive:true});writeFileSync(OUT+'/ac.json',JSON.stringify({t:now,calls:keep,firms:F}));
  console.log('llamadas',keep.length,'nuevas',nuevas,'casas',Object.keys(F).length,'medidas a 7d',keep.filter(c=>c.e7!=null).length);
}
if(process.argv[1]&&process.argv[1].endsWith('acierto.mjs'))main().catch(e=>{console.error(e);process.exit(1);});
