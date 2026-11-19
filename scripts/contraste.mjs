// Contraste de los datos de empresa (Yahoo) con una segunda fuente: Financial Modeling Prep (plan gratuito, solo EE. UU.).
// Cuota gratuita: 250 consultas/día -> 3 por valor -> unos 75 valores al día, rotando por toda la lista.
import {mkdirSync,writeFileSync} from 'node:fs';
const KEY=process.env.FMP_KEY||'',OUT=process.env.OUT||'out',REPO=process.env.GITHUB_REPOSITORY||'diazsantamariaivan-lgtm/trader-datos';
const PER=+process.env.PER||110;
if(!KEY){console.log('Falta el secreto FMP_KEY: no se contrasta nada.');process.exit(0);}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function j(path){
  const r=await fetch('https://financialmodelingprep.com/stable/'+path+(path.includes('?')?'&':'?')+'apikey='+KEY,{signal:AbortSignal.timeout(25000)});
  if(r.status===429)throw Object.assign(new Error('límite diario'),{stop:true});
  if(!r.ok)throw new Error('HTTP '+r.status);
  return r.json();
}
async function main(){
  const f=await (await fetch('https://raw.githubusercontent.com/'+REPO+'/fund/f.json')).json();
  let prev={t:0,s:{}};try{prev=await (await fetch('https://raw.githubusercontent.com/'+REPO+'/check/c.json')).json();}catch(e){}
  // valores de EE. UU. (sin sufijo de bolsa), de mayor a menor capitalización, rotando por días
  const us=Object.entries(f.s).filter(([s,v])=>!/\./.test(s)&&!/-/.test(s)&&v.mc&&v.cu==='USD').sort((a,b)=>b[1].mc-a[1].mc).map(x=>x[0]);
  const day=Math.floor(Date.now()/86400000),start=(day*PER)%us.length;
  const pick=[];for(let i=0;i<Math.min(PER,us.length);i++)pick.push(us[(start+i)%us.length]);
  console.log('EE. UU.',us.length,'hoy',pick.length,'desde',start);
  const out={t:Math.floor(Date.now()/1000),s:{}};
  const lim=Date.now()/1000-30*86400;
  for(const [k,v] of Object.entries(prev.s||{}))if(v.at>lim)out.s[k]=v;
  let ok=0,fail=0,calls=0;const MAXC=+process.env.MAXC||230;
  const call=async path=>{calls++;return j(path);};
  for(const sym of pick){
    if(calls>=MAXC-3)break;
    try{
      const was=(prev.s||{})[sym];
      const p=(await call('profile?symbol='+encodeURIComponent(sym)))[0];
      const e={at:out.t};
      if(p&&p.marketCap)e.mc=Math.round(p.marketCap);
      if(p&&p.lastDividend!=null)e.ld=+p.lastDividend;
      if(!(was&&was.nf)){
        try{
          const sc=(await call('financial-scores?symbol='+encodeURIComponent(sym)))[0];
          if(sc&&sc.piotroskiScore!=null)e.fs=sc.piotroskiScore;
          const km=(await call('key-metrics?symbol='+encodeURIComponent(sym)+'&limit=1'))[0];
          if(km&&km.returnOnCapitalEmployed!=null)e.roce=+(km.returnOnCapitalEmployed*100).toFixed(1);
          if(km&&km.date)e.fd=km.date;
        }catch(err){if(err.stop)throw err;if(/402/.test(err.message))e.nf=1;}
      }else e.nf=1;
      if(Object.keys(e).length>1){out.s[sym]=e;ok++;}else fail++;
    }catch(e){fail++;console.log(sym,e.message);if(e.stop){console.log('Cuota agotada');break;}}
    await sleep(250);
  }
  console.log('consultas',calls);
  console.log('contrastados hoy',ok,'fallidos',fail,'total acumulado',Object.keys(out.s).length);
  if(ok<5)throw new Error('muy pocos datos: no se publica');
  mkdirSync(OUT,{recursive:true});writeFileSync(OUT+'/c.json',JSON.stringify(out));
}
main().catch(e=>{console.error(e);process.exit(1);});
