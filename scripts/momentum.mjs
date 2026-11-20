// Momentum 12-1 de cada valor de EE. UU. (rentabilidad de hace 12 meses a hace 1 mes). Genera out/m.json.
// Es la señal de la estrategia lenta: se probó con 20 años de datos (ver README de la app).
import {mkdirSync,writeFileSync} from 'node:fs';
const OUT=process.env.OUT||'out',LIMIT=+process.env.LIMIT||0,REPO=process.env.GITHUB_REPOSITORY||'diazsantamariaivan-lgtm/trader-datos';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function gj(u){for(let i=0;i<3;i++){try{const r=await fetch(u,{headers:{'User-Agent':UA},signal:AbortSignal.timeout(25000)});if(r.ok)return await r.json();if(r.status===404)return null;}catch(e){}await sleep(800*(i+1));}return null;}
async function main(){
  const q=await (await fetch('https://raw.githubusercontent.com/'+REPO+'/quotes/q.json',{signal:AbortSignal.timeout(30000)})).json();
  let syms=Object.keys(q.s||{}).filter(s=>!/[\^=]|-USD$/.test(s));
  if(LIMIT)syms=syms.slice(0,LIMIT);
  console.log('valores EE. UU.',syms.length);
  const out={t:Math.floor(Date.now()/1000),s:{},x:{}};let ok=0,i=0;
  async function w(){while(i<syms.length){const sym=syms[i++];
    const j=await gj('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(sym)+'?range=2y&interval=1d');
    const r=j&&j.chart&&j.chart.result&&j.chart.result[0];
    if(r){
      const a=(r.indicators.adjclose&&r.indicators.adjclose[0]&&r.indicators.adjclose[0].adjclose)||r.indicators.quote[0].close||[];
      const c=a.filter(x=>x!=null&&x>0),n=c.length;
      if(n>=260){
        const lr=[];for(let k=n-60;k<n;k++)lr.push(Math.log(c[k]/c[k-1]));
        const mu=lr.reduce((x,y)=>x+y,0)/lr.length,v=Math.sqrt(lr.reduce((x,y)=>x+(y-mu)*(y-mu),0)/(lr.length-1))*Math.sqrt(252);
        const o={m:+(c[n-22]/c[n-253]-1).toFixed(4),m6:+(c[n-22]/c[n-127]-1).toFixed(4),v:+v.toFixed(3),p:+c[n-1].toFixed(2)};
        if(sym.includes('.')){o.cu=r.meta.currency||'';out.x[sym]=o;}else out.s[sym]=o;ok++;}
    }
    await sleep(120+Math.random()*150);}}
  await Promise.all(Array.from({length:4},w));
  console.log('con momentum',ok);
  if(ok<20){console.error('muy pocos datos');process.exit(1);}
  mkdirSync(OUT,{recursive:true});writeFileSync(OUT+'/m.json',JSON.stringify(out));
}
main().catch(e=>{console.error(e);process.exit(1)});
