# Reporte de ejecución

Fecha UTC: 2026-11-17T16:55:55.579Z. Node v24.21.0. Suite: all.

PokeAPI simulada en localhost; integración HTTP real con la API del proyecto.

43 PASA, 0 FALLA, 0 BLOQUEADO.

| Caso | Criterio | Resultado | Evidencia | Observación |
|---|---|---|---|---|
| S01 Disponibilidad y contrato básico | CA01 | PASA | [JSON](S01.json) | Coincide con el esperado |
| S02 Crear registro con seis estadísticas | CA02 | PASA | [JSON](S02.json) | Coincide con el esperado |
| S03 Consultar registro persistido por ID | CA03 | PASA | [JSON](S03.json) | Coincide con el esperado |
| S04 Actualizar parcialmente y conservar al reiniciar | CA04 | PASA | [JSON](S04.json) | Coincide con el esperado |
| S05 Eliminar y comprobar ausencia | CA05 | PASA | [JSON](S05.json) | Coincide con el esperado |
| R01 Mapeo de PokeAPI por nombre y número | CA06 | PASA | [JSON](R01.json) | Coincide con el esperado |
| R02 Pokémon inexistente | CA07 | PASA | [JSON](R02.json) | Coincide con el esperado |
| R03 Catálogo Gen 1 y parámetros de paginación | CA08 | PASA | [JSON](R03.json) | Coincide con el esperado |
| R04 Campos obligatorios y nombre válido al crear | CA09 | PASA | [JSON](R04.json) | Coincide con el esperado |
| R05 Límites y tipos de las seis estadísticas | CA10 | PASA | [JSON](R05.json) | Coincide con el esperado |
| R06 Actualización inválida sin alterar datos | CA11 | PASA | [JSON](R06.json) | Coincide con el esperado |
| R07 ID inexistente en lectura, edición y eliminación | CA12 | PASA | [JSON](R07.json) | Coincide con el esperado |
| R08 Sincronizar 151 sin duplicar y conservar registros locales | CA13 | PASA | [JSON](R08.json) | Coincide con el esperado |
| R09 Errores, timeout y sincronización fallida del proveedor | CA14 | PASA | [JSON](R09.json) | Coincide con el esperado |
| R10 JSON malformado y cuerpo incompatible | CA15 | PASA | [JSON](R10.json) | Coincide con el esperado |
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
| E01 Nombre: valores límite de longitud (1–40) | RN-01 | PASA | [JSON](E01.json) | Coincide con el esperado |
| E02 Nombre: caracteres válidos y contenido HTML | RN-01 / RNF-SEG | PASA | [JSON](E02.json) | Coincide con el esperado |
| E03 Número de Pokédex (pokemonId): clases y límites | RN-02 | PASA | [JSON](E03.json) | Coincide con el esperado |
| E04 Imagen (sprite): solo URL http/https seguras | RN-03 / RNF-SEG | PASA | [JSON](E04.json) | Coincide con el esperado |
| E05 Consulta a PokeAPI: identificador fuera de formato y respuesta incompleta | CA06 / CA14 | PASA | [JSON](E05.json) | Coincide con el esperado |
| E06 Rutas de la API inexistentes responden con error JSON | CA15 | PASA | [JSON](E06.json) | Coincide con el esperado |
| E07 Renombrar un registro actualiza la especie usada en el combate | RF02 / Sección 11 | PASA | [JSON](E07.json) | Coincide con el esperado |
| E08 Tabla de decisión: iniciar combate | RF01 / Sección 11 | PASA | [JSON](E08.json) | Coincide con el esperado |
| E09 Tabla de decisión: ejecutar turno | RF04 / RF11 | PASA | [JSON](E09.json) | Coincide con el esperado |
| N01 Rendimiento: listar 151 registros (p95 ≤ 300 ms) | RNF-REN-01 | PASA | [JSON](N01.json) | 30 consultas: p50 3.4 ms, p95 5.8 ms, máx 18.9 ms |
| N02 Rendimiento: resolver una ronda de combate (p95 ≤ 150 ms) | RNF-REN-02 | PASA | [JSON](N02.json) | 20 rondas: p50 1.2 ms, p95 2.0 ms |
| N03 Seguridad: el cliente no puede alterar el combate | RNF-SEG-01 / Sección 10 | PASA | [JSON](N03.json) | Coincide con el esperado |
| N04 Seguridad: cabeceras HTTP y tamaño máximo del cuerpo | RNF-SEG-02 | PASA | [JSON](N04.json) | Coincide con el esperado |
| N05 Usabilidad: errores comprensibles en JSON y en español | RNF-USA-01 | PASA | [JSON](N05.json) | Coincide con el esperado |
| N06 Confiabilidad: 40 peticiones concurrentes y 25 combates completos | RNF-CON-01 | PASA | [JSON](N06.json) | 40 concurrentes sin 5xx; 25 combates terminados con ganador, 1.9 rondas en promedio |
| N07 Confiabilidad: archivo de datos dañado o incompleto | RNF-CON-02 | PASA | [JSON](N07.json) | Coincide con el esperado |

Decisión: **LISTO para el alcance automatizado local**. El servicio público y la interfaz se verifican por separado.
