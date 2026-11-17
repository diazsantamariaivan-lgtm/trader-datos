# trader-datos

Publica automáticamente los precios que lee la app «Trader a mano».

- `cotizaciones` (cada 15 min en horario de mercado): 6 meses de todos los valores → rama `quotes`.
- `historico` (cada tarde): 5 años de cada valor → rama `hist`.

Si algún día dejan de actualizarse (GitHub pausa los programas de repositorios sin actividad), entra en la pestaña Actions y pulsa «Run workflow».
