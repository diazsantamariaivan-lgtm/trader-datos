// Noticias económicas por empresa: prensa económica (Cinco Días, Expansión, El Economista vía Google News,
// Investing, CNBC, MarketWatch, FT) + titulares por valor. Genera out/n.json.
import {mkdirSync,writeFileSync} from 'node:fs';
const OUT=process.env.OUT||'out',LIMIT=+process.env.LIMIT||0,REPO=process.env.GITHUB_REPOSITORY||'diazsantamariaivan-lgtm/trader-datos';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const AL={};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const MAXAGE=+process.env.MAXAGE_H||72;
const GEN=[
 ['Cinco Días','https://feeds.elpais.com/mrss-s/pages/ep/site/cincodias.elpais.com/portada'],
 ['Expansión','https://e00-expansion.uecdn.es/rss/mercados.xml'],['Expansión','https://e00-expansion.uecdn.es/rss/empresas.xml'],
 ['Investing.com','https://es.investing.com/rss/news.rss'],['Investing.com','https://es.investing.com/rss/news_25.rss'],
 ['CNBC','https://www.cnbc.com/id/10001147/device/rss/rss.html'],['MarketWatch','https://feeds.marketwatch.com/marketwatch/topstories/'],['Financial Times','https://www.ft.com/markets?format=rss']
];
const ES={ITX:'Inditex',SAN:'Santander',BBVA:'BBVA',TEF:'Telefónica',IBE:'Iberdrola',REP:'Repsol',CABK:'CaixaBank',AMS:'Amadeus',FER:'Ferrovial',ACS:'ACS',ANA:'Acciona',ANE:'Acciona Energía',AENA:'Aena',ELE:'Endesa',NTGY:'Naturgy',GRF:'Grifols',IAG:'IAG',MAP:'Mapfre',MRL:'Merlin Properties',SAB:'Sabadell',BKT:'Bankinter',CLNX:'Cellnex',COL:'Colonial',ENG:'Enagás',FDR:'Fluidra',LOG:'Logista',MTS:'ArcelorMittal',RED:'Redeia',ROVI:'Rovi',SCYR:'Sacyr',PUIG:'Puig',UNI:'Unicaja',ACX:'Acerinox',SLR:'Solaria',IDR:'Indra',SGRE:'Siemens Gamesa'};
const SUF=/\b(incorporated|inc|corp|corporation|company|co|plc|ltd|limited|holdings?|group|the|s\.?a\.?|s\.?e\.?|a\.?g\.?|n\.?v\.?|s\.?p\.?a\.?|ag|sa|se|nv|spa|class [abc]|clase [abc]|cl [abc]|ordinary shares?|common stock|oyj|ab|a\/s|asa|llc|lp)\b\.?/gi;
const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const GEN1=new Set(['acciones','banco','grupo','corporacion','industria','compania','empresa','sociedad','international','global','american','united','first','national','general','new','bank','capital','energy','financial','technologies','systems','services','health','pharma','pharmaceuticals','resources','partners','trust','realty','properties','industries','laboratorios','sistemas','inversiones']);
function alias(sym,nm){
  const base=sym.replace(/\.[A-Z]+$/,'');
  const out=new Set();
  if(sym.endsWith('.MC')&&ES[base])return [ES[base]];
  let n=String(nm||'').replace(/\.{2,}.*$/,'').replace(/[,\.]/g,' ').replace(SUF,' ').replace(/\s+/g,' ').trim();
  if(n.length>=4&&!/\.\.\./.test(String(nm||'')))out.add(n);
  const w=n.split(' ');if(w.length>=2&&w[0].length>=5&&!GEN1.has(norm(w[0])))out.add(w[0]);
  return [...out].filter(a=>a.length>=4);
}
const POS=['sube','suben','subida','al alza','dispara','repunta','rebota','record','supera prevision','mejora','eleva','ganancias','crece','crecimiento','upgrade','beats','surges','jumps','rises','soars','raises','outperform','rally','gana','avanza','impulsa','recompra','dividendo extra','adjudica','acuerdo'];
const NEG=['cae','caen','caida','hunde','desploma','pierde','perdidas','recorta','rebaja','multa','sancion','investigacion','demanda','fraude','quiebra','concurso','expediente','suspende','advertencia','profit warning','plunges','falls','drops','slumps','misses','cuts','probe','lawsuit','downgrade','recall','layoffs','sinks','tumbles','despidos','ere','huelga','retira prevision','baja prevision','alerta','cuestiona','se resiente','pierden'];
function tone(t){const n=' '+norm(t)+' ';let p=0,q=0;for(const w of POS)if(n.includes(' '+w)||n.includes(w+' '))p++;for(const w of NEG)if(n.includes(' '+w+' ')||n.includes(' '+w))q++;return p>q?1:q>p?-1:0;}
const dec=s=>s.replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#0?39;|&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(m,c)=>String.fromCharCode(+c)).replace(/\s+/g,' ').trim();
function parse(xml,srcName){
  const items=[];
  for(const b of xml.split(/<item[ >]|<entry[ >]/).slice(1)){
    const g=tag=>{const m=b.match(new RegExp('<'+tag+'[^>]*>([\\s\\S]*?)</'+tag+'>','i'));return m?dec(m[1]):'';};
    let title=g('title'),link=g('link')||((b.match(/<link[^>]*href="([^"]+)"/)||[])[1]||'');
    const ds=g('pubDate')||g('published')||g('updated')||g('dc:date');let d=ds?Date.parse(ds.replace(/^(\d{4}-\d\d-\d\d) /,'$1T')):NaN;
    if(isNaN(d)||!title)continue;
    let src=srcName;const sm=b.match(/<source[^>]*>([\s\S]*?)<\/source>/i);if(sm&&dec(sm[1]))src=dec(sm[1]);
    if(srcName==='Google'&&src&&title.endsWith(' - '+src))title=title.slice(0,-(src.length+3));
    items.push({s:src,t:title.slice(0,130),u:link,d:Math.floor(d/1000)});
  }
  return items;
}
async function get(url,tries=2){
  let err;for(let i=0;i<tries;i++){try{const r=await fetch(url,{headers:{'User-Agent':UA,'Accept':'application/rss+xml,application/xml,text/xml,*/*'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('HTTP '+r.status);return await r.text();}catch(e){err=e;await sleep(1200*(i+1));}}
  throw err;
}
async function pool(items,n,fn){let i=0;await Promise.all(Array.from({length:n},async()=>{while(i<items.length){const it=items[i++];await fn(it);await sleep(150+Math.random()*250);}}));}
const JUNK=/noticias y actualidad|listado de noticias|^an[aá]lisis fundamental$|encuentro digital|consultorio|^ibex 35:|cotizaci[oó]n hist[oó]rica/i;
const relev=(sym,t)=>{if(JUNK.test(t))return false;const nt=' '+norm(t).replace(/[^a-z0-9ñ ]/g,' ')+' ';return AL[sym].some(a=>{const na=norm(a);return nt.includes(' '+na+' ')||nt.includes(' '+na+'s ');});};
const gnews=(q,es)=>'https://news.google.com/rss/search?q='+encodeURIComponent(q+' when:3d')+(es?'&hl=es&gl=ES&ceid=ES:es':'&hl=en-US&gl=US&ceid=US:en');
async function main(){
  const now=Date.now()/1000,since=now-MAXAGE*3600;
  const q=await (await fetch('https://raw.githubusercontent.com/'+REPO+'/quotes/q.json',{signal:AbortSignal.timeout(30000)})).json();
  let syms=Object.keys(q.s||{}).filter(s=>!/^\^|=X$|=F$|-USD$/.test(s));if(LIMIT)syms=syms.slice(0,LIMIT);
  for(const s of syms)AL[s]=alias(s,q.s[s].nm);
  // 1) prensa económica general
  const gen=[];
  for(const [name,url] of GEN){try{const x=parse(await get(url),name);gen.push(...x);console.log(name,x.length);}catch(e){console.log('falla',name,e.message);}}
  const seen=new Set(),G=[];
  for(const it of gen.filter(i=>i.d>=since).sort((a,b)=>b.d-a.d)){const k=norm(it.t).slice(0,60);if(seen.has(k))continue;seen.add(k);G.push(it);}
  const S={};const add=(sym,it)=>{const a=S[sym]=S[sym]||[];const k=norm(it.t).slice(0,60);if(a.some(x=>x._k===k))return;a.push(Object.assign({_k:k,k:tone(it.t)},it));};
  for(const it of G){if(JUNK.test(it.t))continue;const nt=' '+norm(it.t).replace(/[^a-z0-9ñ ]/g,' ')+' ';
    for(const s of syms){for(const a of AL[s]){const na=norm(a);if(nt.includes(' '+na+' ')||nt.includes(' '+na+'s ')||nt.includes(' '+na+"'s ")){add(s,it);break;}}}}
  console.log('titulares generales',G.length,'valores con noticia',Object.keys(S).length);
  // 2) por valor: prensa económica vía Google News
  let ok=0,fail=0;
  await pool(syms,3,async sym=>{
    const es=/\.(MC|MI|PA|AS)$/.test(sym)||AL[sym].some(a=>Object.values(ES).includes(a));
    const name=(AL[sym][0]||sym);
    const qq=es?'"'+name+'" (site:eleconomista.es OR site:expansion.com OR site:cincodias.elpais.com OR site:bolsamania.com)':'"'+name+'" (stock OR shares) (site:cnbc.com OR site:marketwatch.com OR site:ft.com OR site:reuters.com OR site:wsj.com OR site:bloomberg.com OR site:barrons.com)';
    try{const x=parse(await get(gnews(qq,es)),'Google');ok++;for(const it of x)if(it.d>=since&&relev(sym,it.t))add(sym,it);}catch(e){fail++;}
    if(!es){try{const q2='"'+name+'" (site:expansion.com OR site:eleconomista.es OR site:cincodias.elpais.com OR site:bolsamania.com)';const x=parse(await get(gnews(q2,true)),'Google');for(const it of x)if(it.d>=since&&relev(sym,it.t))add(sym,it);}catch(e){}}
  });
  console.log('consultas',ok,'fallidas',fail);
  const out={t:Math.floor(now),g:G.slice(0,30).map(({s,t,u,d})=>({s,t,u,d,k:tone(t)})),s:{}};
  const full={};
  for(const [s,a] of Object.entries(S)){const arr=a.sort((x,y)=>y.d-x.d).slice(0,4).map(({s,t,u,d,k})=>({s,t,u,d,k}));if(arr.length){full[s]=arr;out.s[s]=arr.map(({s,t,d,k})=>({s,t,d,k}));}}
  console.log('valores con noticias',Object.keys(out.s).length);
  if(G.length<5)throw new Error('prensa general vacía: no se publica');
  mkdirSync(OUT+'/n',{recursive:true});writeFileSync(OUT+'/n.json',JSON.stringify(out));
  for(const [sym,arr] of Object.entries(full))writeFileSync(OUT+'/n/'+sym.replace(/[^A-Za-z0-9.\-]/g,'_')+'.json',JSON.stringify(arr));
}
main().catch(e=>{console.error(e);process.exit(1);});
