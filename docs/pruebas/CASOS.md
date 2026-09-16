# Suite de pruebas REST · Grupo 6

Base: `CRUD-PokeAPI`, commit `c468b40f1258fd01b1228544065f1a123eef2825`. La suite contiene **5 smoke y 10 regresión**. Los tres controles contra el proveedor real son adicionales.

## Condiciones comunes

Cada caso inicia un proceso nuevo de la API, un proveedor HTTP simulado y una carpeta temporal vacía. Las peticiones se envían por HTTP real a un puerto libre. El runner destruye únicamente sus datos temporales al terminar. No utiliza `data/records.json` del usuario. Cada caso es independiente, incluido el CRUD smoke: si requiere un registro, lo crea como precondición.

Ejecutar `npm test`, o `PRUEBAS.cmd` en este equipo. Para separar suites: `npm run test:smoke` y `npm run test:regression`. Las rutas siguientes son relativas a la URL del proceso de prueba. Cada aserción fallida detiene ese caso; el runner continúa con el siguiente. Por ello, una ronda fallida prueba el primer fallo registrado, no necesariamente todas las variantes posteriores de ese caso.

Datos base **D1**:

```json
{
  "pokemonName": "ditto",
  "pokemonId": 132,
  "stats": {
    "hp": 48,
    "attack": 48,
    "defense": 48,
    "special-attack": 48,
    "special-defense": 48,
    "speed": 48
  }
}
```

Contrato acordado en esta implementación: estadísticas enteras 1–999, coherentes con `public/index.html`; acepta números y cadenas numéricas del formulario. Nombre: texto no vacío, recortado y en minúsculas. PUT permite estadísticas parciales. Error del proveedor: 502; espera agotada: 504; recurso ausente: 404; entrada inválida: 400. Todo error probado debe devolver JSON con `error` de tipo texto. Estos criterios hacen verificables los casos; la guía de clase no especifica los códigos de esta API.

## Smoke

| Caso / criterio | Prioridad | Datos y pasos | Resultado esperado |
|---|---|---|---|
| S01 / CA01 · Disponibilidad | Alta | GET `/api/stats-labels`; GET `/api/records` con almacenamiento vacío. | 200 en ambos; seis claves de estadísticas en el orden del contrato; colección `[]`. |
| S02 / CA02 · Crear | Alta | POST `/api/records` con D1 y nombre `DITTO`; consultar colección. | 201; UUID con formato válido; nombre `ditto`; seis valores 48; seis etiquetas; fecha válida; colección con un registro. |
| S03 / CA03 · Consultar | Alta | Crear D1; usar su ID en GET `/api/records/{id}`. | 200 y objeto igual al creado, incluidos datos, ID y fechas. |
| S04 / CA04 · Editar y persistir | Alta | Crear D1; PUT al ID con `{"pokemonName":"PIKACHU","stats":{"hp":60}}`; reiniciar proceso con la misma carpeta temporal; GET al ID. | 200; nombre `pikachu`; hp=60; otras cinco estadísticas=48; createdAt conservado; updatedAt no anterior; después del reinicio se conserva el objeto. |
| S05 / CA05 · Eliminar | Alta | Crear D1; DELETE al ID; GET al ID; reiniciar; GET colección. | DELETE 200; GET 404 con error JSON; colección vacía después del reinicio. |

## Regresión

| Caso / criterio | Prioridad | Datos y pasos | Resultado esperado |
|---|---|---|---|
| R01 / CA06 · Mapeo del proveedor | Media | GET `/api/pokemon/%20PIKACHU%20` y `/api/pokemon/25`. Fixture Pikachu con sprite alternativo. | 200; id=25; nombre `pikachu`; estadísticas 35,55,40,50,50,90; seis etiquetas; sprite alternativo `https://example.test/25.png`. |
| R02 / CA07 · Pokémon inexistente | Media | GET `/api/pokemon/no-existe-grupo6`; proveedor devuelve 404. | 404 con error JSON. |
| R03 / CA08 · Paginación Gen 1 | Media | GET lista con `limit=999`, luego `limit=10&offset=150`, luego `offset=151`; probar `limit=-1`, `limit=0`, `limit=abc`, `offset=-1`, `offset=1.5`, `limit=2&limit=3`. | Primera lista de 151, inicia ID 1 y termina Mew; segunda solo ID 151; tercera vacía; cada parámetro inválido devuelve 400 JSON. |
| R04 / CA09 · Obligatorios | Alta | POST sucesivos con `{}`, solo nombre, D1 sin speed, nombre espacios, nombre 42, stats=null, stats=[]. Consultar colección. | Cada POST devuelve 400 JSON; ningún registro creado. |
| R05 / CA10 · Límites y tipos | Alta | POST válidos con las seis estadísticas=1, =999 y =`"48"`; para cada una de las seis estadísticas probar 0, -1, 1000, 2.5, `"abc"`, vacío, espacio, null, true, [], {}. Comparar colección antes/después. | Tres registros válidos (201), valores convertidos a número; las 66 combinaciones inválidas devuelven 400 JSON; colección no cambia con rechazos. |
| R06 / CA11 · PUT inválido | Alta | Crear D1; editar con nombre espacio, nombre 42, hp=-1, speed=null, attack=`"abc"`, stats=null, stats=[], y nombre pikachu junto con hp=1000. GET después de cada intento. | Cada PUT devuelve 400 JSON y el registro completo, incluidas las fechas, permanece idéntico. |
| R07 / CA12 · ID inexistente | Media | GET, PUT con hp=50 y DELETE a `/api/records/00000000-0000-0000-0000-000000000000`; GET colección. | Tres respuestas 404 JSON; colección vacía. |
| R08 / CA13 · Sincronización repetible | Alta | Crear D1 con nombre `grupo6-custom`; POST `/api/records/sync-gen1` dos veces; consultar y reiniciar. El proveedor ofrece 151 entradas sintéticas. | Primera: 151 creados y 152 totales; registro local conservado; IDs únicos. Segunda: 0 creados, 151 actualizados; mismos IDs y createdAt; total 152 tras reiniciar. |
| R09 / CA14 · Fallos externos | Alta | Crear D1; proveedor responde 503 a búsqueda, lista y sync. Restablecer; consultar `slow` (sin respuesta, límite 500 ms), `broken-json` (JSON truncado); hacer fallar el detalle #40 al sincronizar; comparar registros. | Los 503 se traducen en 502; espera agotada en 504; JSON roto y sync incompleta en 502; errores JSON; D1 intacto, sin guardado parcial. |
| R10 / CA15 · JSON inválido | Alta | POST cuerpo crudo `{"pokemonName":`; POST con [], null, `"ditto"`, 123; crear D1 válido; PUT al ID con esos cuatro cuerpos. | Todos los cuerpos incompatibles/malformados producen 400 JSON; la API sigue operativa y D1 permanece igual. |

## Evidencias y ejecución real

- Implementación ejecutable: [tests/run.js](../../tests/run.js).
- Primera ronda: [9 PASA / 6 FALLA](evidencias/ronda-1-diagnostico/REPORTE.md).
- Ronda tras correcciones: [15 PASA / 0 FALLA](evidencias/ronda-2-verificacion/REPORTE.md).
- Proveedor público: [tres controles reales](evidencias/integracion-real/REPORTE.md), ejecutables con `npm run test:live`.

El reporte de cada ronda enlaza un JSON por caso con peticiones, respuestas, duración y salida del servidor. `resultados.json` incluye versiones, fechas y SHA-256 del código usado. Los datos de `fixture.js` son sintéticos, salvo valores de referencia de Pikachu, y no constituyen una copia completa de PokeAPI. Las pruebas no requieren Postman ni una cuenta externa.
