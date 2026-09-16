# Reporte de ejecución

Fecha UTC: 2026-09-16T00:48:12.651Z. Node v24.21.0. Suite: all.

PokeAPI simulada en localhost; integración HTTP real con la API del proyecto.

15 PASA, 0 FALLA, 0 BLOQUEADO.

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

Decisión: **LISTO para el alcance automatizado local**. El servicio público y la interfaz se verifican por separado.
