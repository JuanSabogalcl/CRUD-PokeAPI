# Reporte de ejecución — Suite de pruebas API REST CRUD-PokeAPI

**Rama:** `test/suite-api-semana7` · **Comando:** `npm test` · **Fecha de ejecución:** 2026-09-16
**Entorno:** Node.js v22.15.0, Windows, servidor local (`server.js`), PokeAPI real (sin mocks).
**Logs:** [suite completa](evidencia/ejecucion-suite.log) · [unitaria](evidencia/ejecucion-unitaria.log) · [smoke](evidencia/ejecucion-smoke.log) · [regresión](evidencia/ejecucion-regresion.log) · [tabla de decisión](evidencia/ejecucion-tabla-decision.log) · [equivalencias/límites](evidencia/ejecucion-frontera.log) · [no funcional](evidencia/ejecucion-nofuncional.log)

## Resultado global

| Suite | Nivel | Total | PASA | FALLA | BLOQUEADO |
|---|---|---|---|---|---|
| Unitaria | Unitaria | 5 | 5 | 0 | 0 |
| Smoke | Integración/Sistema | 5 | 5 | 0 | 0 |
| Regresión | Integración/Sistema | 10 | 8 | 2 | 0 |
| Tabla de decisión | Sistema | 4 | 4 | 0 | 0 |
| Equivalencias y límites | Sistema | 7 | 3 | 4 | 0 |
| No funcional | Sistema | 1 | 1 | 0 | 0 |
| **Total** | | **32** | **26** | **6** | **0** |

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
| REG-09 | Nombre de registro se sanitiza antes de guardarse | Sistema | **No funcional (seguridad)** | **FALLA** | [ejecucion-suite.log](evidencia/ejecucion-suite.log) | Ver DEF-01 (XSS almacenado) |
| REG-10 | `crypto.randomUUID` usa `require('crypto')` explícito | Unitaria (estática, sobre el código fuente) | **No funcional (compatibilidad)** | **FALLA** | [ejecucion-suite.log](evidencia/ejecucion-suite.log) | Ver DEF-02 (compatibilidad Node 18) |

## Suite TABLA DE DECISIÓN (regla de negocio: crear registro)

Detalle de la técnica en [tabla-decision-crear-registro.md](tabla-decision-crear-registro.md).

| Caso | Regla (C1: nombre · C2: stats completas) | Resultado esperado | Resultado | Evidencia |
|---|---|---|---|---|
| DT-01 | V, V | Crear (201) | PASA | ejecucion-tabla-decision.log |
| DT-02 | V, F | Rechazar (400) | PASA | ejecucion-tabla-decision.log |
| DT-03 | F, V | Rechazar (400) | PASA | ejecucion-tabla-decision.log |
| DT-04 | F, F | Rechazar (400) | PASA | ejecucion-tabla-decision.log |

## Suite EQUIVALENCIAS Y LÍMITES (campo `hp`, rango declarado 1-999)

| Caso | Descripción | Técnica | Resultado | Evidencia | Observación |
|---|---|---|---|---|---|
| BVA-01 | `hp=1` (mínimo) se acepta | Valor límite | PASA | ejecucion-frontera.log | — |
| BVA-02 | `hp=999` (máximo) se acepta | Valor límite | PASA | ejecucion-frontera.log | — |
| BVA-03 | `hp=0` (mínimo-1) debería rechazarse | Valor límite | **FALLA** | ejecucion-frontera.log | Ver DEF-03 |
| BVA-04 | `hp=1000` (máximo+1) debería rechazarse | Valor límite | **FALLA** | ejecucion-frontera.log | Ver DEF-03 |
| BVA-05 | `hp=-50` (clase inválida) debería rechazarse | Equivalencia | **FALLA** | ejecucion-frontera.log | Ver DEF-03 |
| EQ-06 | `hp="abc"` (clase inválida, tipo) debería rechazarse | Equivalencia | **FALLA** | ejecucion-frontera.log | Ver DEF-03 — se guarda como `null` |
| EQ-07 | `hp=""` (vacío) se rechaza como campo requerido | Equivalencia (negativo) | PASA | ejecucion-frontera.log | Ya cubierto conceptualmente por REG-02 |

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

### DEF-03 — No se valida rango ni tipo de las estadísticas (Alto)

- **Dónde:** [`server.js`](../server.js), rutas `POST /api/records` y `PUT /api/records/:id` — ambas hacen `Number(stats[key])` sin comprobar rango ni que el resultado sea un número válido.
- **Cómo se reprodujo:** se creó un registro con `hp: -50` (se guardó tal cual), `hp: 0` y `hp: 1000` (fuera del rango 1-999 que el propio formulario declara con `min`/`max`), y `hp: "abc"` (se guardó como `hp: null`, corrompiendo el dato silenciosamente en vez de rechazar la petición).
- **Caso que lo cubre:** BVA-03, BVA-04, BVA-05, EQ-06 (quedan en FALLA hasta que se corrija).
- **Sugerencia de corrección (no aplicada):** validar `Number.isFinite(valor) && valor >= 1 && valor <= 999` para cada estadística antes de guardar, y responder 400 si no cumple.

## Decisión: listo / no-listo

**No-listo** para producción tal como está. El núcleo funcional (CRUD + integración PokeAPI + regla de creación) es sólido — 26/32 casos en PASA, incluyendo unitaria 5/5, smoke 5/5, tabla de decisión 4/4 y no funcional 1/1 — pero hay tres defectos que impiden dar luz verde:

- **DEF-01** (seguridad, XSS almacenado — Alto)
- **DEF-03** (validación de datos, acepta estadísticas fuera de rango o corruptas — Alto)
- **DEF-02** (compatibilidad con Node 18 declarado en el README — Medio)

Se recomienda corregir los tres antes de un despliegue público, y volver a correr `npm test` (REG-09, REG-10, BVA-03, BVA-04, BVA-05 y EQ-06 deben pasar a PASA) para cerrar la ronda.
