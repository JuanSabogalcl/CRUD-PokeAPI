# Reporte de ejecución

Fecha UTC: 2026-11-17T16:46:34.828Z. Node v24.21.0. Suite: all.

PokeAPI simulada en localhost; integración HTTP real con la API del proyecto.

33 PASA, 10 FALLA, 0 BLOQUEADO.

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
| E01 Nombre: valores límite de longitud (1–40) | RN-01 | FALLA | [JSON](E01.json) | {"id":"e6923ad8-da15-45d5-980d-8562ae2d306b","pokemonName":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","pokemonId":null,"sprite":"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png","stats":{"hp":48,"attack":48,"defense":48,"special-attack":48,"special-defense":48,"speed"  201 !== 400  |
| E02 Nombre: caracteres válidos y contenido HTML | RN-01 / RNF-SEG | FALLA | [JSON](E02.json) | {"id":"1473dcd1-3cbc-46c7-8ce2-2a5cef750c36","pokemonName":"<img src=x onerror=alert(1)>","pokemonId":null,"sprite":"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png","stats":{"hp":48,"attack":48,"defense":48,"special-attack":48,"special-defense":48,"speed":48},"created  201 !== 400  |
| E03 Número de Pokédex (pokemonId): clases y límites | RN-02 | FALLA | [JSON](E03.json) | Expected values to be strictly equal:  '25' !== 25  |
| E04 Imagen (sprite): solo URL http/https seguras | RN-03 / RNF-SEG | FALLA | [JSON](E04.json) | {"id":"f9c34b8f-2552-4c95-a232-ea7117140981","pokemonName":"ditto","pokemonId":null,"sprite":"javascript:alert(1)","stats":{"hp":48,"attack":48,"defense":48,"special-attack":48,"special-defense":48,"speed":48},"createdAt":"2026-11-17T16:46:48.233Z","updatedAt":"2026-11-17T16:46:48.233Z","statsFormat  201 !== 400  |
| E05 Consulta a PokeAPI: identificador fuera de formato y respuesta incompleta | CA06 / CA14 | FALLA | [JSON](E05.json) | {"error":"stats is not iterable"}  502 !== 400  |
| E06 Rutas de la API inexistentes responden con error JSON | CA15 | FALLA | [JSON](E06.json) | The input did not match the regular expression /application\/json/. Input:  'text/html; charset=utf-8'  |
| E07 Renombrar un registro actualiza la especie usada en el combate | RF02 / Sección 11 | FALLA | [JSON](E07.json) | No debe conservar el tipo Agua de Squirtle + actual - expected    [ +   'water' -   'grass', -   'poison'   ]  |
| E08 Tabla de decisión: iniciar combate | RF01 / Sección 11 | PASA | [JSON](E08.json) | Coincide con el esperado |
| E09 Tabla de decisión: ejecutar turno | RF04 / RF11 | PASA | [JSON](E09.json) | Coincide con el esperado |
| N01 Rendimiento: listar 151 registros (p95 ≤ 300 ms) | RNF-REN-01 | PASA | [JSON](N01.json) | 30 consultas: p50 5.4 ms, p95 8.5 ms, máx 9.2 ms |
| N02 Rendimiento: resolver una ronda de combate (p95 ≤ 150 ms) | RNF-REN-02 | PASA | [JSON](N02.json) | 20 rondas: p50 1.4 ms, p95 2.3 ms |
| N03 Seguridad: el cliente no puede alterar el combate | RNF-SEG-01 / Sección 10 | PASA | [JSON](N03.json) | Coincide con el esperado |
| N04 Seguridad: cabeceras HTTP y tamaño máximo del cuerpo | RNF-SEG-02 | FALLA | [JSON](N04.json) | No debe anunciar la tecnología del servidor + actual - expected  + 'Express' - undefined  |
| N05 Usabilidad: errores comprensibles en JSON y en español | RNF-USA-01 | FALLA | [JSON](N05.json) | Respuesta 404 no es JSON |
| N06 Confiabilidad: 40 peticiones concurrentes y 25 combates completos | RNF-CON-01 | PASA | [JSON](N06.json) | 40 concurrentes sin 5xx; 25 combates terminados con ganador, 1.9 rondas en promedio |
| N07 Confiabilidad: archivo de datos dañado o incompleto | RNF-CON-02 | FALLA | [JSON](N07.json) | El servidor no debe caerse con un archivo de datos dañado |

Decisión: **NO LISTO**. El servicio público y la interfaz se verifican por separado.
