# Defectos y pendientes

Los seis fallos se reprodujeron en la ronda 1 sobre el código original con ajustes de configuración para aislar datos, proveedor y arranque. Se conservaron las respuestas. La ronda 2 volvió a ejecutar todos los casos después de corregirlos.

| ID | Severidad | Reproducción y resultado observado | Esperado / corrección | Estado y evidencia |
|---|---|---|---|---|
| D01 | Media | R03: `GET /api/pokemon-list?limit=10&offset=150` devolvió 10 entradas y salió de Gen 1. | Devolver solo Mew; limitar por offset y rechazar parámetros inválidos. | Corregido. [Antes](evidencias/ronda-1-diagnostico/R03.json), [después](evidencias/ronda-2-verificacion/R03.json). |
| D02 | Alta | R04: POST con nombre de tres espacios devolvió 201. | 400 sin inserción; comprobar tipo y contenido del nombre, así como estructura de stats. | Corregido. [Antes](evidencias/ronda-1-diagnostico/R04.json), [después](evidencias/ronda-2-verificacion/R04.json). |
| D03 | Alta | R05: POST con hp=0 devolvió 201, aunque el formulario exige mínimo 1. | Validación del servidor: entero 1–999, sin coerción de null, booleanos u objetos. | Corregido. [Antes](evidencias/ronda-1-diagnostico/R05.json), [después](evidencias/ronda-2-verificacion/R05.json). |
| D04 | Alta | R06: PUT con nombre de un espacio devolvió 200 y alteró el registro. | 400; validar todos los campos enviados antes de modificar el objeto. | Corregido. [Antes](evidencias/ronda-1-diagnostico/R06.json), [después](evidencias/ronda-2-verificacion/R06.json). |
| D05 | Alta | R09: proveedor simulado devuelve 503; la consulta local responde 404 como si no existiera el Pokémon. | Separar ausencia (404), fallo externo (502) y timeout (504); comprobar estado del proveedor también al sincronizar. | Corregido. [Antes](evidencias/ronda-1-diagnostico/R09.json), [después](evidencias/ronda-2-verificacion/R09.json). |
| D06 | Media | R10: JSON truncado provoca 400 con contenido HTML. | Respuesta uniforme JSON con campo error; middleware de errores y validación del cuerpo. | Corregido. [Antes](evidencias/ronda-1-diagnostico/R10.json), [después](evidencias/ronda-2-verificacion/R10.json). |

Cambios de soporte: variables DATA_DIR/POKEAPI_BASE/AUTO_SYNC_GEN1 para aislamiento, puerto libre notificado al runner y UUID importado explícitamente. La sincronización descarga primero y relee registros antes de guardar para conservar creaciones locales realizadas durante la descarga. El catálogo informa `count=151` coherente con su alcance.

## Límites de la conclusión

- Sin defectos abiertos en los 15 casos ejecutados. Esto no equivale a una certificación completa del sistema.
- Pendiente fuera del alcance: pruebas de carga y escrituras concurrentes entre varios procesos; el almacenamiento sigue siendo JSON local.
- Pendiente fuera del alcance: revisión completa de seguridad, autenticación, saneamiento de contenido HTML y metadatos opcionales.
- La interfaz recibió una revisión básica; no hay una suite automatizada de navegador. Las imágenes y consultas en línea dependen de conectividad.
- Los resultados son una ejecución puntual. Si cambia el código o el ambiente, hay que repetir la suite.

No se presentan los pendientes fuera de alcance como casos PASA. La recomendación es usar el proyecto para la demostración académica local, con los límites anteriores.

## Backlog actualizado · semana 13

Ronda sobre la última versión (CRUD + combate). Informe completo con triage, métricas y capturas antes/después: [semana-13/INFORME_SEMANA_13.pdf](semana-13/INFORME_SEMANA_13.pdf) ([HTML](semana-13/INFORME_SEMANA_13.html)). Ronda 1 sobre `master` (31b6d97): [33 PASA / 10 FALLA](evidencias/semana13-ronda-1-diagnostico/REPORTE.md). Ronda 2 tras corregir (fe8a5bd): [43/43 PASA](evidencias/semana13-ronda-2-verificacion/REPORTE.md), además de 17/17 unitarias, [3/3 contra la PokeAPI real](evidencias/semana13-integracion-real/REPORTE.md) y 4/4 manuales.

| ID | Severidad / prioridad | Falla observada | Corrección | Caso / estado |
|---|---|---|---|---|
| D07 | Media | Combate: registros creados desde el formulario sin imagen (sprite nulo). | Respaldo de imagen por número, igual que el CRUD. | C02 · Cerrado antes de integrar el combate (8596d23). |
| D08 | Alta / P1 | XSS: el CRUD ejecutaba HTML guardado en el nombre o el sprite. | Escapar todo dato insertado como HTML; rechazar < > y caracteres de control en el nombre. | E02, M01 · Cerrado (fe8a5bd). |
| D09 | Alta / P1 | La API guardaba pokemonId y sprite sin validar (texto, objetos, `javascript:`). | pokemonId entero 1–100000; sprite solo URL http/https segura. | E03, E04 · Cerrado. |
| D10 | Media / P2 | La búsqueda ignoraba el nombre escrito y mostraba Ditto. | El texto escrito tiene prioridad; sin `required`; «encontrado» solo si la consulta tuvo éxito. | M02 · Cerrado. |
| D11 | Media / P2 | Con PokeAPI caída, el CRUD mostraba 0 registros y ningún aviso. | Manejar el error del catálogo, avisar y cargar los registros locales. | M03 · Cerrado. |
| D12 | Media / P2 | `/api/pokemon/%2E%2E` consultaba otra ruta de PokeAPI y devolvía «stats is not iterable». | Validar el identificador (400) y rechazar respuestas sin estadísticas sin exponer errores internos. | E05, N05 · Cerrado. |
| D13 | Media / P2 | Un records.json dañado tumbaba el servidor al iniciar. | Error controlado con mensaje claro; arranque protegido; registros incompletos no rompen el listado. | N07 · Cerrado. |
| D14 | Media / P3 | Al renombrar un registro, el combate seguía usando tipos, número e imagen del Pokémon anterior. | El PUT descarta datos de la especie al cambiarla; el combate los completa desde PokeAPI. | E07 · Cerrado. |
| D15 | Baja / P3 | Rutas /api inexistentes respondían HTML. | 404 en JSON para toda ruta /api desconocida. | E06, N05 · Cerrado. |
| D16 | Baja / P3 | El nombre no tenía longitud máxima (se aceptaron 5000 caracteres). | Máximo 40 caracteres. | E01 · Cerrado. |
| D17 | Baja / P4 | Cabecera `X-Powered-By: Express` y sin `nosniff`. | Quitar la cabecera y enviar `X-Content-Type-Options: nosniff`. | N04 · Cerrado. |
| D18 | Media / P2 | Un doble clic en «Guardar» creaba el registro dos veces. | Ignorar envíos repetidos y desactivar el botón mientras se guarda. | U06 · Cerrado (cab9c88). |
| D19 | Baja / P3 | El combate decía «No afecta a el … salvaje». | Usar «al» con el Pokémon salvaje. | U17 · Cerrado (cab9c88). |

Pruebas de interfaz con un usuario simulado en Edge (U01–U23, `npm run test:ui`): [ronda 1: 21 PASA / 2 FALLA](evidencias/semana13-ui-ronda-1/REPORTE.md), [ronda 2: 23/23 PASA](evidencias/semana13-ui-ronda-2/REPORTE.md) y [regresión de la API tras corregir: 43/43](evidencias/semana13-ronda-3-regresion/REPORTE.md).

Métricas: 19 defectos en total (D01–D19), 0 abiertos y 0 reincidentes. En la semana 13: 2 altos, 6 medios y 4 bajos. Comandos nuevos: `npm run test:exploratoria`, `npm run test:nofuncional`, `npm run test:ui` y `node scripts/capturas-evidencia.js`.
