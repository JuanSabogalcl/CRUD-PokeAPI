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
