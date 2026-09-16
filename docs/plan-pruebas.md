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

## Suite

- **Smoke (5 casos)** — `tests/smoke.test.js`: camino feliz completo del CRUD (Create, Read, Update, Delete + consulta a PokeAPI). Debe pasar al 100% en cualquier despliegue.
- **Regresión (10 casos)** — `tests/regression.test.js`: validaciones (400), casos borde (404), límite de la Gen 1, sincronización masiva, y 2 defectos conocidos de seguridad/compatibilidad.

Detalle de casos en [reporte-ejecucion.md](reporte-ejecucion.md).

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
