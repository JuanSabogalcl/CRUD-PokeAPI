# CRUD PokeAPI

Aplicación web CRUD para gestionar las **seis estadísticas principales** de Pokémon, con conexión a [PokeAPI](https://pokeapi.co/).

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

- **Read (Consultar):** Buscar cualquier Pokémon en PokeAPI y ver sus estadísticas base.
- **Create (Crear):** Guardar un registro con nombre y las 6 estadísticas.
- **Update (Actualizar):** Editar registros guardados localmente.
- **Delete (Eliminar):** Borrar registros de la base de datos local.

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior

## Instalación y ejecución

```bash
npm install
npm start
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## API REST

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/pokemon/:name` | Obtiene estadísticas desde PokeAPI |
| GET | `/api/records` | Lista todos los registros locales |
| GET | `/api/records/:id` | Obtiene un registro por ID |
| POST | `/api/records` | Crea un nuevo registro |
| PUT | `/api/records/:id` | Actualiza un registro |
| DELETE | `/api/records/:id` | Elimina un registro |

## Ejemplo PokeAPI

Consulta de Ditto: https://pokeapi.co/api/v2/pokemon/ditto

## Tecnologías

- Node.js + Express
- HTML, CSS y JavaScript vanilla
- Almacenamiento local en JSON
