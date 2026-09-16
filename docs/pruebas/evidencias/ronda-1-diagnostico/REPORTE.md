# Reporte de ejecución

Fecha UTC: 2026-09-16T00:16:50.802Z. Node v24.21.0. Suite: all.

PokeAPI simulada en localhost; integración HTTP real con la API del proyecto.

9 PASA, 6 FALLA, 0 BLOQUEADO.

| Caso | Criterio | Resultado | Evidencia | Observación |
|---|---|---|---|---|
| S01 Disponibilidad y contrato básico | CA01 | PASA | [JSON](S01.json) | Coincide con el esperado |
| S02 Crear registro con seis estadísticas | CA02 | PASA | [JSON](S02.json) | Coincide con el esperado |
| S03 Consultar registro persistido por ID | CA03 | PASA | [JSON](S03.json) | Coincide con el esperado |
| S04 Actualizar parcialmente y conservar al reiniciar | CA04 | PASA | [JSON](S04.json) | Coincide con el esperado |
| S05 Eliminar y comprobar ausencia | CA05 | PASA | [JSON](S05.json) | Coincide con el esperado |
| R01 Mapeo de PokeAPI por nombre y número | CA06 | PASA | [JSON](R01.json) | Coincide con el esperado |
| R02 Pokémon inexistente | CA07 | PASA | [JSON](R02.json) | Coincide con el esperado |
| R03 Catálogo Gen 1 y parámetros de paginación | CA08 | FALLA | [JSON](R03.json) | No deben salir Pokémon posteriores a Mew  10 !== 1  |
| R04 Campos obligatorios y nombre válido al crear | CA09 | FALLA | [JSON](R04.json) | {"id":"b379db87-4352-44da-86d4-00704e1944ea","pokemonName":"   ","pokemonId":132,"sprite":"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/132.png","stats":{"hp":48,"attack":48,"defense":48,"special-attack":48,"special-defense":48,"speed":48},"createdAt":"2026-09-16T00:16:52  201 !== 400  |
| R05 Límites y tipos de las seis estadísticas | CA10 | FALLA | [JSON](R05.json) | {"id":"aab887be-5a19-4eb9-8ed3-7fdaff9d0923","pokemonName":"ditto","pokemonId":132,"sprite":"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/132.png","stats":{"hp":0,"attack":48,"defense":48,"special-attack":48,"special-defense":48,"speed":48},"createdAt":"2026-09-16T00:16:5  201 !== 400  |
| R06 Actualización inválida sin alterar datos | CA11 | FALLA | [JSON](R06.json) | {"id":"7ccc5f84-c7f6-4a57-add4-358ace14e3ab","pokemonName":" ","pokemonId":132,"sprite":"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/132.png","stats":{"hp":48,"attack":48,"defense":48,"special-attack":48,"special-defense":48,"speed":48},"createdAt":"2026-09-16T00:16:52.8  200 !== 400  |
| R07 ID inexistente en lectura, edición y eliminación | CA12 | PASA | [JSON](R07.json) | Coincide con el esperado |
| R08 Sincronizar 151 sin duplicar y conservar registros locales | CA13 | PASA | [JSON](R08.json) | Coincide con el esperado |
| R09 Errores, timeout y sincronización fallida del proveedor | CA14 | FALLA | [JSON](R09.json) | {"error":"Pokémon \"pikachu\" no encontrado"}  404 !== 502  |
| R10 JSON malformado y cuerpo incompatible | CA15 | FALLA | [JSON](R10.json) | The input did not match the regular expression /application\/json/. Input:  'text/html; charset=utf-8'  |

Decisión: **NO LISTO**. El servicio público y la interfaz se verifican por separado.
