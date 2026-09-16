# Plan mínimo de pruebas — API REST CRUD-PokeAPI

**Materia:** Optativa II – Pruebas de Software · Semana 7
**Proyecto:** [CRUD-PokeAPI](https://github.com/JuanSabogalcl/CRUD-PokeAPI)
**Grupo (3 integrantes):** _completar con nombres del equipo_
**Fecha:** 2026-09-15

## Alcance

Se prueba la **API REST** del backend Express (`server.js`, `lib/pokeapi-sync.js`), que expone:

- Operaciones CRUD sobre registros locales de estadísticas Pokémon (`/api/records*`).
- Consulta e importación masiva contra PokeAPI (`/api/pokemon*`, `/api/records/sync-gen1`).

**Fuera de alcance:** interfaz visual (`public/`), pruebas de carga/rendimiento, y pruebas de disponibilidad de PokeAPI (dependencia externa).

## Riesgos (probabilidad × impacto)

| Riesgo | Probabilidad | Impacto | Prioridad |
|---|---|---|---|
| Falla en Create/Read/Update/Delete de registros | Alta | Alto | **Alto-alto → smoke** |
| Falla en la sincronización masiva Gen 1 (151 registros) | Media | Alto | Alto |
| Validaciones de entrada insuficientes (campos faltantes) | Media | Medio | Medio |
| IDs/nombres inexistentes no manejados (404) | Media | Medio | Medio |
| Datos de usuario no sanitizados antes de guardarse/renderizarse | Media | Alto | Alto (seguridad) |
| Incompatibilidad con la versión mínima de Node declarada (18) | Baja | Alto | Medio |

Lo alto-alto (CRUD básico) va primero en la suite **smoke**; el resto queda en **regresión**.

## Ambiente

- Node.js v22.15.0 (LTS activo; el README exige 18+, ver defecto DEF-02).
- Servidor local: `node server.js`, puerto configurable por `PORT` (tests usan 4310/4311 para no chocar con `npm start`).
- Dependencia externa real: PokeAPI (`https://pokeapi.co`) — no se mockea, las pruebas son de integración real.
- Framework de pruebas: **Jest** (sin mocks de red; se levanta el servidor real como proceso hijo por archivo de prueba).

## Datos

- Almacenamiento local: `data/records.json` (generado en caliente, ignorado por git).
- Cada archivo de prueba limpia los registros que crea (ver `finally` en `tests/regression.test.js`), para que la suite sea repetible sin arrastrar estado entre corridas.
- `POST /api/records/sync-gen1` es el propio mecanismo de carga de datos (151 Pokémon Gen 1); se usa como caso de regresión (REG-08) en vez de un seed manual aparte.

## Etapas (niveles) y tipos de prueba

Siguiendo el mapa de Semana 4 (nivel ≠ tipo ≠ estrategia):

| Nivel | ¿Dónde? | Cobertura en este proyecto |
|---|---|---|
| **Unitaria** | Método/función, sin red ni servidor | `tests/unit.test.js` — funciones puras `mapStatsFromApi` y `getSpriteUrl` de `lib/pokeapi-sync.js` |
| **Integración** | Nuestro backend conectado a un módulo externo real (PokeAPI, archivo JSON) | Parte de smoke/regresión: `GET /api/pokemon/:name`, `GET /api/pokemon-list`, `POST /api/records/sync-gen1` |
| **Sistema** | Flujo HTTP end-to-end contra el servidor real levantado como proceso | Resto de smoke/regresión (CRUD completo vía HTTP) y la prueba no funcional |
| **Aceptación** | Contra criterios de usuario, en su lenguaje | Manual (fuera de automatización, ver sección *Aceptación* abajo) — la UI está fuera de alcance |

Por **tipo**: casi toda la suite es **funcional** (entrada → proceso → salida verificable). Dos casos son **no funcionales**:
- REG-09 (seguridad: sanitización de entrada).
- REG-10 (compatibilidad: versión mínima de Node soportada).
- NFR-01 (rendimiento: tiempo de respuesta de un endpoint local).

## Suite

- **Unitaria (5 casos)** — `tests/unit.test.js`: funciones puras de mapeo de estadísticas y resolución de sprite.
- **Smoke (5 casos)** — `tests/smoke.test.js`: camino feliz completo del CRUD (Create, Read, Update, Delete + consulta a PokeAPI). Debe pasar al 100% en cualquier despliegue.
- **Regresión (10 casos)** — `tests/regression.test.js`: validaciones (400), casos borde (404), límite de la Gen 1, sincronización masiva, y 2 defectos conocidos de seguridad/compatibilidad.
- **No funcional (1 caso)** — `tests/nonfuncional.test.js`: presupuesto de tiempo de respuesta en un endpoint local.

Detalle de casos en [reporte-ejecucion.md](reporte-ejecucion.md).

## Aceptación (manual, criterios de usuario)

Escenario tomado del propio README ("Read → Create → Update → Delete" desde la interfaz):

| # | Criterio (lenguaje de usuario) | Aprobado / No aprobado |
|---|---|---|
| ACC-01 | Como usuario, puedo buscar un Pokémon y ver sus 6 estadísticas | Aprobado — cubierto por SMK-01 |
| ACC-02 | Como usuario, puedo guardar un Pokémon con sus estadísticas | Aprobado — cubierto por SMK-02 |
| ACC-03 | Como usuario, puedo editar un registro guardado | Aprobado — cubierto por SMK-04 |
| ACC-04 | Como usuario, puedo borrar un registro | Aprobado — cubierto por SMK-05 |
| ACC-05 | Como usuario, no espero que mi navegador ejecute código al ver la lista de registros | **No aprobado** — ver DEF-01 |

Recomendación de aceptación: **no listo** mientras ACC-05 no se apruebe (ver defectos en el reporte de ejecución).

## Evidencia

- Log completo de ejecución: [`docs/evidencia/ejecucion-suite.log`](evidencia/ejecucion-suite.log).
- Reproducible con `npm test` (o `npm run test:smoke` / `npm run test:regression`).

## Criterios de entrada/salida (go / no-go)

**Entrada (para iniciar una ronda):**
- Servidor arranca sin errores y responde en `/api/stats-labels`.
- Conexión a PokeAPI disponible (la suite depende de la red real).
- `npm install` ejecutado sin fallos.

**Salida (para cerrar una ronda):**
- 100% de la suite **smoke** en PASA → condición obligatoria para continuar.
- Suite de **regresión** ejecutada completa; toda FALLA queda registrada como defecto con evidencia.
- Decisión **listo/no-listo** documentada en el reporte de ejecución con soporte (no solo "funciona").

## Recomendación (listo / no-listo)

**No listo para producción sin mitigar los defectos.** El CRUD base es sólido (smoke 5/5), pero hay un defecto de seguridad (XSS almacenado) y uno de compatibilidad con la versión mínima de Node declarada en el propio README. Ver detalle y evidencia en el [reporte de ejecución](reporte-ejecucion.md).
