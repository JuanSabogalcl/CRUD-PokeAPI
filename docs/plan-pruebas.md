# Plan mínimo de pruebas — API REST CRUD-PokeAPI

**Materia:** Optativa II – Pruebas de Software · Semanas 4, 5 y 7
**Proyecto:** [CRUD-PokeAPI](https://github.com/JuanSabogalcl/CRUD-PokeAPI)
**Grupo (3 integrantes):** Hernán Felipe Patiño, Juan José Sabogal, Orlando Rojas
**Fecha:** 2026-09-15

## Alcance

Se prueba la **API REST** del backend Express (`server.js`, `lib/pokeapi-sync.js`), que expone:

- Operaciones CRUD sobre registros locales de estadísticas Pokémon (`/api/records*`).
- Consulta e importación masiva contra PokeAPI (`/api/pokemon*`, `/api/records/sync-gen1`).

**Fuera de alcance:** interfaz visual (`public/`) más allá de un escenario de aceptación manual, pruebas de carga (solo se incluye 1 chequeo puntual de tiempo de respuesta), y pruebas de disponibilidad de PokeAPI (dependencia externa).

## Riesgos (probabilidad × impacto)

| Riesgo | Probabilidad | Impacto | Prioridad |
|---|---|---|---|
| Falla en Create/Read/Update/Delete de registros | Alta | Alto | **Alto-alto → smoke** |
| Falla en la sincronización masiva Gen 1 (151 registros) | Media | Alto | Alto |
| Validaciones de entrada insuficientes (campos faltantes) | Media | Medio | Medio |
| IDs/nombres inexistentes no manejados (404) | Media | Medio | Medio |
| Datos de usuario no sanitizados antes de guardarse/renderizarse | Media | Alto | Alto (seguridad) |
| Estadísticas fuera del rango declarado (negativas, >999, no numéricas) se aceptan sin validar | Alta | Medio | Alto |
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

## Diseño de casos (caja negra — Semana 5)

Sin mirar el código: se toma como especificación el propio formulario (`public/index.html`, cada estadística `min="1" max="999"`) y la regla de negocio de creación de registros.

- **Partición de equivalencia** sobre el campo `hp` (representativo de las 6 estadísticas, todas comparten la misma ruta de validación en `server.js`): clase válida (1-999), inválida por debajo (≤0), inválida por encima (>999), inválida por tipo (no numérico), inválida por ausencia (vacío/`undefined`).
- **Valores límite**: mínimo (1), máximo (999), justo por debajo (0) y justo por encima (1000).
- **Negativos básicos**: vacío, tipo incorrecto (texto en un campo numérico).
- **Tabla de decisión** para la regla "crear registro" (2 condiciones → 4 reglas): ver [tabla-decision-crear-registro.md](tabla-decision-crear-registro.md).

## Trazabilidad (criterio → casos)

| Criterio | Casos de prueba |
|---|---|
| CRUD básico funciona (Create/Read/Update/Delete) | SMK-01 a SMK-05 |
| El servidor valida presencia de nombre y estadísticas | DT-01 a DT-04, REG-02, REG-03 |
| El servidor solo acepta estadísticas dentro del rango declarado (1-999) | BVA-01 a BVA-05, EQ-06, EQ-07 |
| IDs/nombres inexistentes se manejan con 404 | REG-01, REG-04, REG-05, REG-06 |
| La sincronización masiva importa la Gen 1 completa | REG-07, REG-08 |
| Los datos de usuario no deben ejecutar código en el navegador | REG-09, ACC-05 |
| Compatibilidad con la versión mínima de Node declarada | REG-10 |
| Funciones puras de mapeo/sprite se comportan como se espera | UNI-01 a UNI-05 |
| Tiempo de respuesta razonable en endpoints locales | NFR-01 |

## Suite

- **Unitaria (5 casos)** — `tests/unit.test.js`: funciones puras de mapeo de estadísticas y resolución de sprite.
- **Smoke (5 casos)** — `tests/smoke.test.js`: camino feliz completo del CRUD (Create, Read, Update, Delete + consulta a PokeAPI). Debe pasar al 100% en cualquier despliegue.
- **Regresión (10 casos)** — `tests/regression.test.js`: validaciones (400), casos borde (404), límite de la Gen 1, sincronización masiva, y 2 defectos conocidos de seguridad/compatibilidad.
- **Tabla de decisión (4 casos)** — `tests/decision-table.test.js`: las 4 reglas de la regla de negocio "crear registro".
- **Caja negra: equivalencias y límites (7 casos)** — `tests/boundary.test.js`: clases válidas/inválidas y bordes del rango 1-999 en el campo `hp`.
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
