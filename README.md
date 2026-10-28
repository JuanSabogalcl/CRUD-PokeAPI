# CRUD PokeAPI

Configuración local y actividad de la semana 7: [LEEME_PRIMERO.md](LEEME_PRIMERO.md). Suite ejecutable: `npm test` (17 unitarias + 5 smoke + 10 regresión + 12 combate). [Informe del grupo 6 con pantallazos](docs/pruebas/INFORME_GRUPO_6.pdf). [Documentos y evidencias](docs/pruebas/ENTREGA.html).

Aplicación web CRUD para gestionar las **seis estadísticas principales** de Pokémon, con conexión a [PokeAPI](https://pokeapi.co/).

## Módulo de combate

Combate por turnos estilo Game Boy con imágenes modernas en [http://localhost:3000/combate.html](http://localhost:3000/combate.html): eliges tu Pokémon y el Pokémon salvaje, que ataca al azar. Reglas, arquitectura e integración: [docs/combate/ARQUITECTURA.md](docs/combate/ARQUITECTURA.md). Pruebas: [docs/combate/PRUEBAS.md](docs/combate/PRUEBAS.md) (`npm run test:unit` y `npm run test:combat`).

## Estadísticas soportadas

| Campo | Descripción |
|-------|-------------|
| **PS (Puntos de Salud)** | La vida del Pokémon; si llegan a cero, el Pokémon se debilita. |
| **Ataque** | Mide el daño que infligen los ataques físicos. |
| **Defensa** | Mide la resistencia frente a los ataques físicos del rival. |
| **Ataque Especial** | Mide el daño de los movimientos especiales o no físicos. |
| **Defensa Especial** | Mide la resistencia ante los ataques especiales. |
| **Velocidad** | Decide qué Pokémon ataca primero en cada turno. |

## Funcionalidades

- **Catálogo Gen 1:** Navega entre los 151 Pokémon (#001 Bulbasaur – #151 Mew).
- **Sincronización masiva:** Importa o actualiza los 151 registros desde PokeAPI con un clic.
- **Read (Consultar):** Buscar cualquier Pokémon en PokeAPI y ver sus estadísticas base.
- **Create (Crear):** Guardar un registro con nombre y las 6 estadísticas.
- **Update (Actualizar):** Editar registros guardados localmente.
- **Delete (Eliminar):** Borrar registros de la base de datos local.

## Requisitos

- [Node.js](https://nodejs.org/) 22 o superior (verificado con 24.21.0)

## Instalación y ejecución

```bash
npm install
npm start
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

Para importar los 151 Pokémon de la primera generación desde PokeAPI:

```bash
npm run seed
```

También puedes usar el botón **Sincronizar 151 Pokémon** en la interfaz web.

## API REST

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/pokemon-list?limit=151` | Lista los 151 Pokémon de la Gen 1 |
| GET | `/api/pokemon/:name` | Obtiene estadísticas desde PokeAPI |
| POST | `/api/records/sync-gen1` | Importa/actualiza los 151 Pokémon locales |
| GET | `/api/records` | Lista todos los registros locales |
| GET | `/api/records/:id` | Obtiene un registro por ID |
| POST | `/api/records` | Crea un nuevo registro |
| PUT | `/api/records/:id` | Actualiza un registro |
| DELETE | `/api/records/:id` | Elimina un registro |
| GET | `/api/combat/rules` | Reglas, tabla de tipos y movimientos del combate |
| POST | `/api/battles` | Inicia un combate entre dos registros |
| GET | `/api/battles/:id` | Estado de un combate |
| POST | `/api/battles/:id/turn` | Ejecuta una ronda con el movimiento elegido |

## Ejemplo PokeAPI

Consulta de Ditto: https://pokeapi.co/api/v2/pokemon/ditto

## Tecnologías

- Node.js + Express
- HTML, CSS y JavaScript vanilla
- Almacenamiento local en JSON
