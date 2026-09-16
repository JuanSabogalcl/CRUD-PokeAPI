# Reporte de ejecución — Suite de pruebas API REST CRUD-PokeAPI

**Rama:** `test/suite-api-semana7` · **Comando:** `npm test` · **Fecha de ejecución:** 2026-09-15
**Entorno:** Node.js v22.15.0, Windows, servidor local (`server.js`), PokeAPI real (sin mocks).
**Logs:** [suite completa](evidencia/ejecucion-suite.log) · [unitaria](evidencia/ejecucion-unitaria.log) · [smoke](evidencia/ejecucion-smoke.log) · [regresión](evidencia/ejecucion-regresion.log) · [no funcional](evidencia/ejecucion-nofuncional.log)

## Resultado global

| Suite | Nivel | Total | PASA | FALLA | BLOQUEADO |
|---|---|---|---|---|---|
| Unitaria | Unitaria | 5 | 5 | 0 | 0 |
| Smoke | Integración/Sistema | 5 | 5 | 0 | 0 |
| Regresión | Integración/Sistema | 10 | 8 | 2 | 0 |
| No funcional | Sistema | 1 | 1 | 0 | 0 |
| **Total** | | **21** | **19** | **2** | **0** |

## Suite UNITARIA (funciones puras — sin servidor ni red)

| Caso | Descripción | Tipo | Resultado | Evidencia |
|---|---|---|---|---|
| UNI-01 | `mapStatsFromApi` extrae solo las 6 estadísticas conocidas | Funcional | PASA | ejecucion-unitaria.log |
| UNI-02 | `mapStatsFromApi` con lista vacía devuelve objeto vacío | Funcional | PASA | ejecucion-unitaria.log |
| UNI-03 | `getSpriteUrl` prioriza el artwork oficial | Funcional | PASA | ejecucion-unitaria.log |
| UNI-04 | `getSpriteUrl` usa sprite frontal si no hay artwork oficial | Funcional | PASA | ejecucion-unitaria.log |
| UNI-05 | `getSpriteUrl` arma URL de respaldo por id si no hay sprites | Funcional | PASA | ejecucion-unitaria.log |

## Suite SMOKE (camino feliz del CRUD — riesgo alto-alto)

| Caso | Descripción | Nivel | Tipo | Resultado | Evidencia | Observación |
|---|---|---|---|---|---|---|
| SMK-01 | `GET /api/pokemon/ditto` devuelve estadísticas base | Integración (PokeAPI real) | Funcional | PASA | [ejecucion-smoke.log](evidencia/ejecucion-smoke.log): `Tests: 5 passed, 5 total` | Confirma integración real con PokeAPI |
| SMK-02 | `POST /api/records` crea un registro (Create) | Sistema | Funcional | PASA | ejecucion-smoke.log | Responde 201 con `id` generado |
| SMK-03 | `GET /api/records` incluye el registro creado (Read) | Sistema | Funcional | PASA | ejecucion-smoke.log | — |
| SMK-04 | `PUT /api/records/:id` actualiza estadísticas (Update) | Sistema | Funcional | PASA | ejecucion-smoke.log | — |
| SMK-05 | `DELETE /api/records/:id` elimina y confirma 404 posterior (Delete) | Sistema | Funcional | PASA | ejecucion-smoke.log | — |

## Suite REGRESIÓN (validaciones, errores y casos borde)

| Caso | Descripción | Nivel | Tipo | Resultado | Evidencia | Observación |
|---|---|---|---|---|---|---|
| REG-01 | `GET /api/pokemon/:name` inexistente → 404 | Integración (PokeAPI real) | Funcional | PASA | ejecucion-regresion.log | — |
| REG-02 | `POST /api/records` sin `stats` → 400 | Sistema | Funcional | PASA | ejecucion-regresion.log | — |
| REG-03 | `POST /api/records` sin `pokemonName` → 400 | Sistema | Funcional | PASA | ejecucion-regresion.log | — |
| REG-04 | `GET /api/records/:id` inexistente → 404 | Sistema | Funcional | PASA | ejecucion-regresion.log | — |
| REG-05 | `PUT /api/records/:id` inexistente → 404 | Sistema | Funcional | PASA | ejecucion-regresion.log | — |
| REG-06 | `DELETE /api/records/:id` inexistente → 404 | Sistema | Funcional | PASA | ejecucion-regresion.log | — |
| REG-07 | `GET /api/pokemon-list` respeta tope de 151 (Gen 1) | Integración (PokeAPI real) | Funcional | PASA | ejecucion-regresion.log | `limit=500` se capea correctamente |
| REG-08 | `POST /api/records/sync-gen1` importa los 151 Pokémon | Integración (PokeAPI + JSON) | Funcional | PASA | ejecucion-regresion.log | Repetible: reimporta sin duplicar |
| REG-09 | Nombre de registro se sanitiza antes de guardarse | Sistema | **No funcional (seguridad)** | **FALLA** | [ejecucion-suite.log](evidencia/ejecucion-suite.log) líneas 2-17 | Ver DEF-01 (XSS almacenado) |
| REG-10 | `crypto.randomUUID` usa `require('crypto')` explícito | Unitaria (estática, sobre el código fuente) | **No funcional (compatibilidad)** | **FALLA** | [ejecucion-suite.log](evidencia/ejecucion-suite.log) líneas 19-34 | Ver DEF-02 (compatibilidad Node 18) |

## Suite NO FUNCIONAL

| Caso | Descripción | Nivel | Tipo | Resultado | Evidencia |
|---|---|---|---|---|---|
| NFR-01 | `GET /api/records` (local) responde en menos de 300ms | Sistema | No funcional (rendimiento) | PASA | ejecucion-nofuncional.log |

## Aceptación (manual — ver detalle en plan-pruebas.md)

| Caso | Resultado |
|---|---|
| ACC-01 a ACC-04 (buscar, crear, editar, borrar) | Aprobado |
| ACC-05 (la UI no debe ejecutar código ajeno) | **No aprobado** — mismo defecto que REG-09 (DEF-01) |

## Lista de defectos

### DEF-01 — XSS almacenado en `pokemonName` (Alto)

- **Dónde:** [`public/js/app.js`](../public/js/app.js) función `renderRecordsList` (también `renderCatalog`/`renderApiResult`); el backend ([`server.js`](../server.js) `POST /api/records`) no valida ni escapa el campo.
- **Cómo se reprodujo:** `POST /api/records` con `pokemonName: "<img src=x onerror=alert(1)>"` → se guarda y se devuelve tal cual. Al renderizar la lista de registros en el navegador, el `alert(1)` **se ejecuta realmente** (confirmado manualmente en consola del navegador antes de escribir esta suite).
- **Caso que lo cubre:** REG-09 (queda en FALLA hasta que se corrija).
- **Sugerencia de corrección (no aplicada, fuera del alcance de esta actividad):** escapar el HTML al insertarlo en el DOM (`textContent` en vez de `innerHTML`, o una función de escape) y/o validar el formato del nombre en el backend.

### DEF-02 — Uso de `crypto.randomUUID()` sin `require('crypto')` (Medio)

- **Dónde:** [`server.js:170`](../server.js) y [`lib/pokeapi-sync.js:62`](../lib/pokeapi-sync.js).
- **Riesgo:** el README exige Node 18+, pero `globalThis.crypto` sin flag solo está garantizado desde Node 19+. En un Node 18 limpio, `Create` y la sincronización Gen 1 fallarían con `ReferenceError: crypto is not defined`.
- **Caso que lo cubre:** REG-10 (test estático que verifica que el módulo se importe explícitamente).
- **Sugerencia de corrección (no aplicada):** agregar `const crypto = require('crypto');` al inicio de ambos archivos.

## Decisión: listo / no-listo

**No-listo** para producción tal como está. El núcleo funcional (CRUD + integración PokeAPI) es estable — 19/21 casos en PASA, incluyendo unitaria 5/5, smoke 5/5, no funcional (rendimiento) 1/1 y regresión 8/10 — pero DEF-01 es una vulnerabilidad de seguridad real y explotable, y DEF-02 compromete la compatibilidad que el propio proyecto declara como requisito mínimo. Se recomienda corregir ambos antes de un despliegue público, y volver a correr `npm test` (REG-09 y REG-10 deben pasar a PASA) para cerrar la ronda.
