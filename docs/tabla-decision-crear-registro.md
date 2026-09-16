# Tabla de decisión — Crear registro (`POST /api/records`)

Técnica aplicada según "Diseño de casos con tablas de decisión": se identifican
las condiciones de entrada, se calculan las combinaciones (2ⁿ) y cada regla se
convierte en un caso de prueba.

## Escenario de negocio

`server.js` solo crea un registro si llegan **el nombre del Pokémon** y **las 6
estadísticas completas**; de lo contrario responde 400.

## Condiciones

- **C1** — ¿`pokemonName` está presente (no vacío)?
- **C2** — ¿Las 6 estadísticas están presentes (no vacías)?

Con 2 condiciones booleanas: 2² = **4 reglas**.

## Tabla

| Elemento | Condiciones / Acciones | Regla 1 (DT-01) | Regla 2 (DT-02) | Regla 3 (DT-03) | Regla 4 (DT-04) |
|---|---|---|---|---|---|
| Condiciones | C1: ¿`pokemonName` presente? | V | V | F | F |
| | C2: ¿Stats completas? | V | F | V | F |
| Acciones | Crear registro (201) | SÍ | NO | NO | NO |
| | Rechazar con 400 | NO | SÍ | SÍ | SÍ |

## Colapso (opcional)

Las reglas 2, 3 y 4 producen la misma acción (rechazar) — se podrían fusionar en
una sola fila "si C1=F o C2=F → 400" usando `-` (no aplica) en la condición que
no cambia el resultado. Se dejan separadas en la suite automatizada porque cada
una ejercita una ruta de código distinta en `server.js` (falta de nombre vs.
falta de estadísticas vs. ambas), lo cual es valioso para localizar el defecto
si alguna regla se rompe.

## Casos de prueba resultantes

- **DT-01**: nombre presente + stats completas → `POST /api/records` responde 201.
- **DT-02**: nombre presente + stats incompletas → responde 400.
- **DT-03**: nombre ausente + stats completas → responde 400.
- **DT-04**: nombre ausente + stats ausentes → responde 400.

Implementados en [`tests/decision-table.test.js`](../tests/decision-table.test.js). Resultado: **4/4 PASA** (ver [reporte de ejecución](reporte-ejecucion.md)).
