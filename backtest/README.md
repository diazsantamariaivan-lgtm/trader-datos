# Pruebas del algoritmo de acciones (20/11/2026)
`senales.mjs` calcula, para 823 valores y cada 5 sesiones (2022-2026), la nota técnica de la app, el "ev" simulado,
el impulso 12-1 y el resultado real de comprar (regla 2/4 ATR a 10 días, salida a 10 y 20 días, paradas anchas).
`comparar*.mjs` y `controles.mjs` comparan estrategias frente a elegir al azar y frente a la media del universo.
Datos: rama `hist` (carpeta h/) descargada a /tmp/hh/h. Sesgos: valores actuales de los índices (supervivencia), 5 años mayormente alcistas.
Resultados: ver biblioteca/07_pruebas_propias.md

## cartera_correlacion.mjs (22/11/2026)
Simula la cartera completa (5 posiciones, stop 2 ATR, objetivo 4 ATR, 10 días) con distintos tamaños de posición y límite de correlación.
Uso: `HIST=ruta/a/h node cartera_correlacion.mjs` (carpeta con los h/<símbolo>.json de la rama hist).
Resultado: el límite de correlación por sí solo no mejora de forma fiable; reducir el tamaño (riesgo 1 %, máx. 10 % por valor) reduce a la mitad la volatilidad y la caída máxima.
Con ~800 valores y 4 años, la estrategia rinde por debajo de comprar todo a partes iguales (con sesgo de supervivencia en ambos).
