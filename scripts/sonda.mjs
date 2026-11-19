const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const U=[
'https://www.eleconomista.es/rss/rss-mercados-cotizaciones.php','https://www.eleconomista.es/rss/rss-empresas.php','https://www.eleconomista.es/rss/rss-economia.php','https://www.eleconomista.es/rss/rss-category.php?category=mercados-cotizaciones',
'https://feeds.elpais.com/mrss-s/pages/ep/site/cincodias.elpais.com/portada','https://cincodias.elpais.com/seccion/rss/mercados/',
'https://e00-expansion.uecdn.es/rss/mercados.xml','https://e00-expansion.uecdn.es/rss/empresas.xml','https://e00-expansion.uecdn.es/rss/portada.xml',
'https://es.investing.com/rss/news.rss','https://es.investing.com/rss/news_25.rss','https://es.investing.com/rss/stock_Stocks.rss',
'https://www.bolsamania.com/rss/','https://www.bolsamania.com/noticias/rss.xml',
'https://feeds.marketwatch.com/marketwatch/topstories/','https://feeds.finance.yahoo.com/rss/2.0/headline?s=AAPL&region=US&lang=en-US',
'https://www.cnbc.com/id/10001147/device/rss/rss.html','https://www.ft.com/markets?format=rss',
'https://news.google.com/rss/search?q=Inditex+when:2d&hl=es&gl=ES&ceid=ES:es','https://news.google.com/rss/search?q=Inditex+site:eleconomista.es+when:7d&hl=es&gl=ES&ceid=ES:es',
'https://www.cnmv.es/Portal/HR/RSS.aspx','https://www.bolsasymercados.es/bme-exchange/es/RSS',
'https://www.expansion.com/rss/mercados.xml','https://www.lainformacion.com/rss/'
];
for(const u of U){
  try{const r=await fetch(u,{headers:{'User-Agent':UA,'Accept':'application/rss+xml,application/xml,text/xml,*/*'},signal:AbortSignal.timeout(20000),redirect:'follow'});
    const t=await r.text();const n=(t.match(/<item[ >]/g)||[]).length+(t.match(/<entry[ >]/g)||[]).length;
    const m=t.match(/<title[^>]*>(?:<!\[CDATA\[)?([^<\]]{5,100})/g);const f=(t.match(/<pubDate>([^<]+)/)||[])[1];
    console.log(r.status,n+' items',(f||'').slice(0,31),'|',u.slice(8,80),'|',(m&&m[1]||'').replace(/<[^>]+>|<!\[CDATA\[/g,'').slice(0,70));
  }catch(e){console.log('ERR',e.message.slice(0,40),'|',u.slice(8,80));}
}
