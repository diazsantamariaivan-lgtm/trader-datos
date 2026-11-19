// Carga q.json (núcleo) y, además, los ficheros por índice (qi/<ID>.json) para que todos los scripts vean el universo completo.
export async function loadQ(REPO,{shards=true}={}){
  const base='https://raw.githubusercontent.com/'+REPO+'/quotes/';
  const q=await (await fetch(base+'q.json',{signal:AbortSignal.timeout(30000)})).json();
  q.s=q.s||{};
  if(shards)for(const g of (q.idx||[]).filter(g=>g.sh)){
    try{const r=await fetch(base+'qi/'+encodeURIComponent(g.id)+'.json',{signal:AbortSignal.timeout(30000)});if(!r.ok)continue;const j=await r.json();for(const [s,v] of Object.entries(j.s||{}))if(!q.s[s])q.s[s]=v;}catch(e){}
  }
  return q;
}
