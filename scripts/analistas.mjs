// Opinión de analistas (EE. UU., Nasdaq): compra/mantener/venta y precio objetivo. Genera out/a.json.
import {mkdirSync,writeFileSync} from 'node:fs';
const OUT=process.env.OUT||'out',LIMIT=+process.env.LIMIT||0,REPO=process.env.GITHUB_REPOSITORY||'diazsantamariaivan-lgtm/trader-datos';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function gj(u){for(let i=0;i<3;i++){try{const r=await fetch(u,{headers:{'User-Agent':UA,Accept:'application/json',Origin:'https://www.nasdaq.com',Referer:'https://www.nasdaq.com/'},signal:AbortSignal.timeout(20000)});if(r.ok)return await r.json();if(r.status===404||r.status===400)return null;}catch(e){}await sleep(700*(i+1));}return null;}
async function main(){
  const q=await (await fetch('https://raw.githubusercontent.com/'+REPO+'/quotes/q.json',{signal:AbortSignal.timeout(30000)})).json();
  let syms=Object.keys(q.s||{}).filter(s=>!/[\^=.]|-USD$/.test(s));   // solo EE. UU. (sin sufijo de bolsa)
  if(LIMIT)syms=syms.slice(0,LIMIT);
  console.log('valores EE. UU.',syms.length);
  const out={t:Math.floor(Date.now()/1000),s:{}};let ok=0,i=0;
  async function w(){while(i<syms.length){const sym=syms[i++];
    const j=await gj('https://api.nasdaq.com/api/analyst/'+encodeURIComponent(sym)+'/targetprice');
    const c=j&&j.data&&j.data.consensusOverview;
    if(c&&(c.buy!=null||c.priceTarget)){
      const h=(j.data.historicalConsensus||[]).slice(-4).map(x=>x.z&&[x.z.buy|0,x.z.hold|0,x.z.sell|0]);
      out.s[sym]={b:c.buy|0,h:c.hold|0,s:c.sell|0,pt:+c.priceTarget||0,lo:+c.lowPriceTarget||0,hi:+c.highPriceTarget||0,hist:h.filter(Boolean)};ok++;}
    await sleep(150+Math.random()*150);}}
  await Promise.all(Array.from({length:3},w));
  console.log('con analistas',ok);
  if(!ok){console.error('sin datos');process.exit(1);}
  mkdirSync(OUT,{recursive:true});writeFileSync(OUT+'/a.json',JSON.stringify(out));
}
main().catch(e=>{console.error(e);process.exit(1)});
