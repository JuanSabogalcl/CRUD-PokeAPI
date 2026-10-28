# Reporte de ejecución

Fecha UTC: 2026-10-28T00:19:17.622Z. Node v24.21.0. Suite: combat.

PokeAPI simulada en localhost; integración HTTP real con la API del proyecto.

12 PASA, 0 FALLA, 0 BLOQUEADO.

| Caso | Criterio | Resultado | Evidencia | Observación |
|---|---|---|---|---|
| C01 Seleccionar dos Pokémon disponibles en la API | RF01 | PASA | [JSON](C01.json) | Coincide con el esperado |
| C02 Mostrar los datos básicos de ambos Pokémon | RF02/RF03 | PASA | [JSON](C02.json) | Coincide con el esperado |
| C03 Ejecutar un movimiento válido y actualizar los PS | RF04/RF10 | PASA | [JSON](C03.json) | Coincide con el esperado |
| C04 Un movimiento fallido por precisión no causa daño | RF06 | PASA | [JSON](C04.json) | Coincide con el esperado |
| C05 Ataque con STAB y ataque sin STAB | RF07/RF09 | PASA | [JSON](C05.json) | Coincide con el esperado |
| C06 Ataque súper efectivo | RF08 | PASA | [JSON](C06.json) | Coincide con el esperado |
| C07 Ataque poco efectivo | RF08 | PASA | [JSON](C07.json) | Coincide con el esperado |
| C08 Inmunidad entre tipos de primera generación | RF08 | PASA | [JSON](C08.json) | Coincide con el esperado |
| C09 El daño no deja PS negativos | RF10 | PASA | [JSON](C09.json) | Coincide con el esperado |
| C10 El combate termina cuando un Pokémon llega a cero | RF11 | PASA | [JSON](C10.json) | Coincide con el esperado |
| C11 No se permiten acciones después de finalizar | RF11 | PASA | [JSON](C11.json) | Coincide con el esperado |
| C12 Error o dato faltante de la API con mensaje controlado | Sección 10/11 | PASA | [JSON](C12.json) | Coincide con el esperado |

Decisión: **LISTO para el alcance automatizado local**. El servicio público y la interfaz se verifican por separado.
