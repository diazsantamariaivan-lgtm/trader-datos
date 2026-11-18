#!/usr/bin/env python3
"""Genera docs/index.html (la app instalable) a partir de app/trader_a_mano.html."""
import sys, datetime, zoneinfo
src = open('app/trader_a_mano.html', encoding='utf8').read()
def rep(a, b):
    global src
    assert src.count(a) == 1, a[:60]
    src = src.replace(a, b)
now = datetime.datetime.now(zoneinfo.ZoneInfo('Europe/Madrid')).strftime('%d/%m/%Y %H:%M')
rep('<title>Trader a mano</title>', '<title>Trader a mano</title>\n<link rel="manifest" href="manifest.webmanifest">\n<meta name="theme-color" content="#0b0d26">\n<link rel="icon" href="icon-192.png">\n<link rel="apple-touch-icon" href="icon-192.png">\n<script>window.BUILD="' + now + '";</script>')
rep("window.__trader={", "try{if('serviceWorker' in navigator&&/^https?:/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(()=>{});}catch(e){}\nwindow.__trader={")
rep("const DEF={cap0:500,cash:500,riesgo:2,maxPos:20,maxOpen:5,maxDays:10,prorroga:true,com:1,", "const DEF={cap0:10000,cash:10000,riesgo:1,maxPos:10,maxOpen:10,maxDays:10,prorroga:true,com:1,")
rep("uni:{on:['SP500','IBEX35','EXTRA']}", "uni:{on:['SP500','IBEX35','EUROSTOXX50','DAX40','EXTRA']}")
rep("slip:0.15,limD:3,limS:6,", "slip:0.15,limD:2,limS:5,")
rep("srv:true,srvKey:'',", "srv:false,srvKey:'',")
open('docs/index.html', 'w', encoding='utf8').write(src)
print('docs/index.html generado', now)
