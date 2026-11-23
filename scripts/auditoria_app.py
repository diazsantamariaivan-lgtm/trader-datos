#!/usr/bin/env python3
"""Auditoria de inventario de la app: compara app/trader_a_mano.html con auditoria/inventario.json.
Avisa de (1) lo que ha desaparecido, (2) lo nuevo, y (3) posibles DUPLICADOS (textos nuevos parecidos a otros que ya existian).
Uso:  python3 scripts/auditoria_app.py            -> compara
      python3 scripts/auditoria_app.py --guardar  -> da por bueno el estado actual (tras revisar)"""
import re,json,sys,os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP=os.path.join(ROOT,'app','trader_a_mano.html');INV=os.path.join(ROOT,'auditoria','inventario.json')
STOP=set('de la el los las un una y o a en con para por del al que se tu tus mi mis es su sus lo ya no si'.split())
def clean(t):return re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',t)).strip()
def inv(s):
    s=re.sub(r'<script[\s\S]*?</script>','',s,flags=re.I) if False else s
    html=s.split('<script>')[0]
    return {
     'pantallas':sorted(set(re.findall(r'<section id="t-([a-z0-9]+)"',html))),
     'titulos':sorted(set(clean(x) for x in re.findall(r'<h2[^>]*>(.*?)</h2>',html) if clean(x))),
     'botones':sorted(set(clean(x) for x in re.findall(r'<button[^>]*>(.*?)</button>',html) if clean(x))),
     'ids':sorted(set(re.findall(r'\bid="([A-Za-z0-9_\-]+)"',html))),
     'claves':sorted(set(re.findall(r"(?:const KEY|const NUBE_K)\s*=\s*'([^']+)'",s))|set(re.findall(r"localStorage\.(?:set|get|remove)Item\(\s*'([A-Za-z0-9_.]+)'",s)))}
def words(t):return {w for w in re.findall(r'[a-záéíóúñ]{4,}',t.lower()) if w not in STOP}
cur=inv(open(APP,encoding='utf-8').read())
if '--guardar' in sys.argv:
    json.dump(cur,open(INV,'w'),ensure_ascii=False,indent=1);print('Inventario guardado.');sys.exit(0)
old=json.load(open(INV));bad=0
for k in ('pantallas','titulos','botones','ids','claves'):
    gone=[x for x in old[k] if x not in cur[k]]
    if gone:bad+=1;print('✘ DESAPARECE en',k,':',gone)
print('Resumen: pantallas %d, títulos %d, botones %d, ids %d, claves %d'%tuple(len(cur[k]) for k in ('pantallas','titulos','botones','ids','claves')))
for k in ('titulos','botones'):
    new=[x for x in cur[k] if x not in old[k]]
    if new:print('Nuevo en',k,':',new)
    for n in new:
        wn=words(n)
        if not wn:continue
        sim=[o for o in old[k] if (len(wn&words(o))>=2 and len(wn&words(o))/len(wn)>=.5) or any(len(w)>=7 for w in wn&words(o))]
        if sim:print('⚠ POSIBLE DUPLICADO: «%s» se parece a lo que ya existía: %s'%(n,sim))
print('AUDITORÍA DE INVENTARIO:','CON FALLOS' if bad else 'sin pérdidas')
sys.exit(1 if bad else 0)
