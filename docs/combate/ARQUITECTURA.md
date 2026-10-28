# Módulo de combate Pokémon

Combate por turnos entre dos Pokémon de la Gen 1 guardados en la API del proyecto. Abre
**http://localhost:3000/combate.html** (o el botón **Ir al combate** del CRUD).

Eliges tu Pokémon y el Pokémon rival. El rival actúa como **Pokémon salvaje**: el servidor elige
al azar uno de sus 4 movimientos en cada ronda.

## Interfaz

Pantalla de combate con la disposición clásica de Game Boy, pero con imágenes modernas:

- El Pokémon salvaje aparece arriba a la derecha con su caja de PS arriba a la izquierda; tu
  Pokémon aparece abajo a la izquierda, de espaldas al jugador, con su caja de PS y números abajo a la derecha.
- Imágenes: renders 3D de **Pokémon HOME** del repositorio de sprites de PokeAPI
  (`sprites/pokemon/other/home/{id}.png`). Si no existen se usa el artwork oficial y luego el
  `sprite` guardado en el registro. Tu Pokémon se refleja para mirar al rival.
- Caja de texto con fuente pixelada (Press Start 2P, de Google Fonts), texto letra a letra e
  indicador ▼ para continuar. Menú **LUCHAR / HUIR**, menú de 4 movimientos con panel de tipo,
  categoría, poder y precisión, y menú final **REVANCHA / NUEVO**.
- Animaciones: entrada de los Pokémon, embestida al atacar, parpadeo al recibir daño, barra de PS
  que baja gradualmente (verde, amarilla, roja) y caída al debilitarse.
- Controles: clic, o teclado con flechas, Enter/Z para aceptar y Esc/X para volver.
- Debajo de la pantalla, el **registro del combate** muestra el cálculo de cada ataque
  (daño base, STAB, efectividad, crítico, variación y PS antes y después).
- *HUIR* abandona el combate sin ganador y vuelve a la selección, como en un encuentro salvaje.

## Cómo ejecutarlo

```bash
npm install
npm start            # http://localhost:3000/combate.html
npm run test:unit    # 17 pruebas de la lógica de combate, sin servidor
npm run test:combat  # 12 pruebas funcionales obligatorias contra la API (C01–C12)
npm test             # todo: unitarias + smoke + regresión + combate
```

No hay dependencias nuevas: Node.js 22+ y Express, igual que el resto del proyecto. Si es la
primera vez, el servidor importa los 151 Pokémon al iniciar o con **Sincronizar 151 Pokémon**.

## Arquitectura y tecnología

Se mantuvo la tecnología del proyecto (Node.js + Express + HTML/CSS/JS sin framework) para no
agregar dependencias ni pasos de instalación. La lógica de combate está separada de la interfaz:

| Archivo | Responsabilidad |
|---|---|
| `lib/combat/types.js` | Tabla de tipos de la Gen 1, efectividad y mapeo de tipos desde PokeAPI. |
| `lib/combat/moves.js` | Catálogo de movimientos y asignación de 4 movimientos por Pokémon. |
| `lib/combat/rules.js` | Constantes y fórmulas: nivel, estadísticas, daño, crítico, generador aleatorio. |
| `lib/combat/battle.js` | Motor: crear combate, orden de turno, resolver movimientos, fin del combate. |
| `lib/combat/routes.js` | Endpoints REST, almacén de combates en memoria y completado de tipos. |
| `public/combate.html`, `public/js/combate.js`, `public/css/combate.css` | Interfaz estilo Game Boy. Solo muestra los eventos que devuelve el servidor. |

`battle.js`, `rules.js`, `types.js` y `moves.js` no dependen de Express ni del navegador, por eso
se prueban de forma independiente (`tests/unit/combat.test.js`).

**El cliente no calcula nada.** Solo envía el identificador del movimiento elegido; el servidor
valida que pertenezca al Pokémon, resuelve precisión, daño, PS y ganador, y guarda el combate en
memoria. El estado del generador aleatorio no se envía al cliente. Reiniciar el servidor descarta
los combates en curso (se conservan los últimos 100).

### API

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/combat/rules` | Nivel, multiplicadores, tabla de tipos y catálogo de movimientos. |
| POST | `/api/battles` | `{ "mode": "cpu" \| "pvp", "p1": { "recordId" }, "p2": { "recordId" } }` → 201 con el combate. |
| GET | `/api/battles/:id` | Estado actual del combate. |
| POST | `/api/battles/:id/turn` | `{ "p1Move": "thunderbolt" }` → resultado de la ronda. En modo `cpu` (salvaje) el servidor elige el movimiento del rival e ignora `p2Move`. |

Errores con JSON `{ "error": "..." }`: 400 (cuerpo o movimiento inválido), 404 (registro o
combate inexistente), 409 (combate finalizado), 422 (registro incompleto), 502/504 (PokeAPI caída o lenta).

## Integración con la API existente

- La selección usa `GET /api/records` y el combate se crea con el `id` del registro, sin copiar ni
  duplicar los 151 registros.
- Campos usados: `id`, `pokemonId`, `pokemonName`, `sprite` y las seis `stats`.
- **Cambio al modelo de datos:** se agregó `types` (arreglo de 1 o 2 tipos en inglés, como en
  PokeAPI) a cada registro. La sincronización lo guarda desde ahora.
- **Datos faltantes:** los registros sincronizados antes de este módulo, o creados desde el
  formulario, no tienen `types`. Al iniciar un combate se consultan en PokeAPI por `pokemonId` (o
  por nombre) y se guardan en el mismo registro. Si el Pokémon no existe en PokeAPI responde 422;
  si PokeAPI falla responde 502/504 con un mensaje que la interfaz muestra.
- **Tipos de la Gen 1:** PokeAPI devuelve los tipos actuales. Se usa `past_types` para recuperar
  los originales (Clefairy y Jigglypuff eran Normal; Magnemite y Magneton, solo Eléctrico; Mr. Mime,
  solo Psíquico) y se descarta cualquier tipo inexistente en la Gen 1 (Acero, Siniestro, Hada).
- Si se editan las estadísticas en el CRUD, el siguiente combate usa los valores editados.

## Reglas implementadas

Aproximación educativa inspirada en Rojo/Azul/Amarillo; no reproduce el motor original.

### Nivel y estadísticas
- Nivel fijo **50** para todos los Pokémon.
- Estadísticas de combate desde las base, sin IV ni EV y truncando:
  PS = ⌊2·Base·50/100⌋ + 50 + 10 (= Base + 60); resto = ⌊2·Base·50/100⌋ + 5 (= Base + 5).
- El proyecto guarda Ataque Especial y Defensa Especial por separado (como PokeAPI). Aunque en la
  Gen 1 eran una sola estadística Especial, aquí el atacante usa su Ataque Especial y el defensor
  su Defensa Especial.

### Movimientos (RF03)
El proyecto no almacenaba movimientos. Se definió un catálogo de 34 movimientos en
`lib/combat/moves.js` con poder y precisión de la Gen 1 (consultables en
`https://pokeapi.co/api/v2/move/{nombre}`, campo `past_values`). Cada Pokémon recibe 4:

1. El movimiento principal de su primer tipo (p. ej. Lanzallamas).
2. El principal de su segundo tipo, si lo tiene.
3. El alternativo de su primer tipo (suele ser más fuerte y menos preciso, p. ej. Llamarada 85 %).
4. Relleno Normal: Placaje, Rapidez o Atizar. Placaje permite comparar ataques sin STAB.

- Categoría según la Gen 1, por tipo: Fuego, Agua, Eléctrico, Planta, Hielo, Psíquico y Dragón son
  **especiales**; el resto son **físicos**.
- Solo se modela el daño directo. No se implementan efectos secundarios (quemar, drenar, prioridad,
  dos turnos, golpes múltiples, mayor probabilidad de crítico).
- **Reglas especiales:** *Rapidez* nunca falla (precisión `null`). *Furia Dragón* hace siempre 40 de
  daño fijo: ignora la fórmula, el STAB, la variación y el crítico, pero respeta la inmunidad.

### Turnos y orden (RF04, RF05)
- Cada ronda eliges un movimiento y el servidor elige al azar (probabilidad uniforme) uno de los 4
  movimientos del Pokémon salvaje con el generador del combate.
- La API también acepta `mode: "pvp"`, en el que se envían ambos movimientos. La interfaz no lo
  usa; sirve para que las pruebas controlen los dos ataques.
- Actúa primero el de mayor Velocidad de combate. Si empatan, se sortea 50/50 y el registro lo indica.
- Si el primer ataque debilita al rival, este ya no actúa y el combate termina.

### Precisión (RF06)
Se acierta si `aleatorio × 100 < precisión`. Si falla, no se calcula daño, los PS no cambian y el
registro muestra "¡Pero falló!".

### Daño (RF07–RF09)
```
Daño base  = ⌊⌊⌊2·Nivel/5 + 2⌋ · Poder · Ataque / Defensa⌋ / 50⌋ + 2
Daño final = ⌊Daño base × STAB × Efectividad × Crítico × Variación / 100⌋   (mínimo 1)
```
- **Redondeo:** se trunca (`floor`) en cada paso del daño base y una vez al final. La variación es
  un entero entre 85 y 100 (equivale a 0,85–1,00); los demás multiplicadores (1,5; 2; 0,5; 0) son
  exactos en coma flotante, así que el único redondeo del daño final es el truncamiento.
- **STAB:** ×1,5 si el tipo del movimiento coincide con un tipo del atacante; si no, ×1,0.
- **Efectividad:** tabla de tipos de la Gen 1 con sus particularidades (Fantasma no afecta a
  Psíquico, Hielo es neutral contra Fuego, Bicho y Veneno son súper eficaces entre sí). Con dos
  tipos se multiplican (p. ej. Eléctrico contra Agua/Volador = ×4).
- **Inmunidad:** si la efectividad es 0, el daño es 0 sin importar los demás modificadores.
- **Mínimo 1:** un ataque que acierta y no es inmune hace al menos 1 punto.
- Ejemplo del documento: 20 × 1,5 × 1,0 × 0,90 = 27 (prueba unitaria).

### Golpes críticos
- Probabilidad: ⌊Velocidad base / 2⌋ / 256 (aproximación de la Gen 1; Pikachu, con 90: 45/256 ≈ 17,6 %).
- Efecto: ×1,5 sobre el daño (simplificación; en la Gen 1 el cálculo era distinto).
- Ambos valores están solo en `lib/combat/rules.js`.
- Se prueban forzando la tirada con un generador guionizado (`tests/unit/combat.test.js`).

### Aleatoriedad reproducible
Cada combate tiene una semilla y usa el generador `mulberry32`. Con la misma semilla y las mismas
elecciones el combate es idéntico. Orden de consumo por ataque: precisión (si puede fallar), luego
crítico y variación (solo si acierta y no es inmune). La semilla manual solo se acepta con la
variable `COMBAT_ALLOW_SEED=true`, que activan las pruebas, para que un jugador no elija tiradas favorables.

### PS y fin del combate (RF10, RF11)
- Los PS quedan entre 0 y el máximo. Un Pokémon con 0 PS no puede usar movimientos.
- Cuando uno llega a 0 el combate pasa a `finalizado`, se anuncia el ganador y el derrotado, y
  cualquier turno posterior responde 409 sin cambiar el estado. La interfaz desactiva los botones.

## Limitaciones conocidas
- Un Pokémon por participante (no hay equipos de 6).
- Sin estados alterados, cambios de estadísticas ni efectos secundarios.
- Los combates viven en memoria del servidor.
- Las imágenes y la fuente se cargan desde internet (GitHub y Google Fonts); sin conexión se ve la
  fuente monoespaciada del sistema y el texto alternativo de las imágenes.
