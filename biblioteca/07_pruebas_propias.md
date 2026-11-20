# Pruebas propias del algoritmo de acciones (noviembre 2026)

Probado con 160.000 señales de 823 valores entre 2022 y 2026. Cada señal se calcula solo con datos anteriores a su fecha y se mide su resultado real.

## Lo que se vio
- **La nota técnica de la app (tendencia, RSI, máximos, impulso a 1 mes) no rinde más que elegir al azar.** Las notas 8-10 dieron +0,14 % de media por operación frente a +0,52 % de las notas 0-3.
- **El "ev" simulado y el impulso 12-1 sí batieron al universo** (+1,0 a +1,6 puntos por operación a 20 días), con resultados parecidos en las dos mitades del periodo.
- **Pero casi todo eso es la prima de volatilidad.** Elegir simplemente las acciones más volátiles dio lo mismo que el "ev" (+2,5 % por operación). Entre las acciones de volatilidad baja o media, el impulso no ganó al universo. Es riesgo cobrado en un mercado alcista, no puntería.
- **Por años:** el impulso ganó mucho en 2024 y 2025, quedó plano en 2023 y 2026 y perdió en 2022. Por eso el filtro de mercado de la estrategia lenta (S&P 500 sobre su media de 200 días) es lo importante.
- **La salida estrecha (parada 2 ATR, objetivo 4 ATR, 10 días) fue la peor**: +0,39 % de media por operación frente a +1,0 % con parada de 3 ATR y 20 días. Mejor ratio rentabilidad/riesgo también (0,11 frente a 0,07).

## Momentum mensual con y sin filtro de mercado (5 años, 20 valores, rebalanceo cada 21 sesiones)
- EE. UU.: +52 % anual sin filtro y +36 % con filtro (universo: +16 %). Europa: +26 % y +16 % (universo: +14 %). Caída máxima -28 % sin filtro y -25 % con filtro.
- Esas cifras son demasiado buenas para ser reales: solo están los valores que siguen en los índices hoy (sesgo de supervivencia). Sirven para comparar entre variantes, no para esperar esos números.
- En estos 5 años el filtro (valores sobre su media de 200 sesiones) costó rentabilidad y apenas redujo la caída, porque solo hubo un mercado bajista suave (2022). No se puede confirmar ni desmentir con estos datos que proteja en una crisis. Se mantiene la prueba de 20 años de EE. UU. como referencia.
- El impulso también superó a la media en Europa. En la app se muestra solo como información.

## Qué cambió en la app
- Propuesta de compra manual: parada a 3 ATR y objetivo lejano, pensada para aguantar 3-4 semanas.
- La lista "Ideas a corto plazo" lleva el aviso de que la nota no supera al azar.

## Límites
Solo valores que están hoy en los índices (los que salieron no están), cinco años casi siempre alcistas, sin comisiones reales. Sirve para descartar lo que no funciona, no para demostrar lo que sí.
