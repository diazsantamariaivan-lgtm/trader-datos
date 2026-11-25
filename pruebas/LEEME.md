# Pruebas de la app (antes de publicar cualquier cambio)

1. `python3 scripts/auditoria_app.py` — inventario: avisa de lo que desaparece y de posibles duplicados. Si todo es correcto: `--guardar`.
2. Pruebas con jsdom (`npm i jsdom@24`; ajustar la ruta del HTML de la app dentro de cada script):
   `engine`, `labtest`, `piltest`, `altest`, `fntest` (cálculos, laboratorio, piloto, alertas, añadir fondos),
   `comtest` (creador + 2 amigos simulados, chat, modo limitado), `audit` (datos antiguos intactos, HTML malicioso, token), `extest` (Excel).
3. `rulestest.mjs` — reglas de Firebase (`firebase/database.rules.json`) contra el emulador oficial
   (`firebase emulators:start --only database,auth --project demo-trader`, con `firebase.json` de esta carpeta).
4. `ea_bt.mjs`, `gold_run.mjs`, `stk_run.mjs` — comprobación de la estrategia del EA (resultado: no funciona).
5. `ideas_formacion.py` — prueba de las ideas de las diapositivas (suelo confirmado, amplitud de mercado, tendencia) con 815 acciones y ~7 anios: ninguna regla de eleccion de acciones supera al resto.
