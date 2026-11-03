# Informe de pruebas del módulo de combate

Reglas probadas: [ARQUITECTURA.md](ARQUITECTURA.md). Evidencia de la ronda guardada:
[combate-ronda-1/REPORTE.md](../pruebas/evidencias/combate-ronda-1/REPORTE.md) (un JSON por caso
con cada petición y respuesta).

```bash
npm run test:unit    # lógica de combate aislada (node:test)
npm run test:combat  # casos C01–C12 contra la API; guarda evidencia en docs/pruebas/evidencias/<fecha>
npm test             # unitarias + S01–S05 + R01–R10 + C01–C12
```

Las pruebas funcionales levantan el servidor real con una carpeta de datos temporal y una PokeAPI
simulada (`tests/fixture.js`), con los tipos y estadísticas reales de los Pokémon usados. No tocan
`data/records.json`. Para que los casos sean reproducibles, envían una semilla
(`COMBAT_ALLOW_SEED=true` solo en pruebas) y usan el modo `pvp` de la API, en el que se controlan
los dos movimientos.

## Pruebas funcionales obligatorias (sección 12)

| Caso | Prueba obligatoria | Entrada | Resultado esperado | Obtenido |
|---|---|---|---|---|
| C01 | Seleccionar dos Pokémon de la API | Sincronizar 151; combate Bulbasaur vs Charmander por `recordId` | 201; participantes con el `recordId` y número correctos; tipos guardados; siguen siendo 151 registros | PASA |
| C02 | Mostrar datos básicos | Combate Pikachu vs Squirtle | Nombre, imagen, tipos, PS actuales = máximos (Pikachu 95), 6 estadísticas y 4 movimientos; Clefairy se mapea como Normal; `/combate.html` responde | PASA |
| C03 | Movimiento válido actualiza PS | Charmander vs Ditto, ambos *Rapidez* | Charmander actúa primero (Vel 70 > 53); cada golpe resta su daño y el estado coincide con `hpAfter` | PASA |
| C04 | Fallo por precisión sin daño | Charmander *Llamarada* (85 %) con semillas hasta encontrar un fallo | `hit: false`, daño 0, PS del rival intactos, mensaje "falló" | PASA |
| C05 | Ataque con y sin STAB | Charmander *Lanzallamas* y luego *Rapidez* contra Ditto | STAB 1,5 y 1,0; el daño coincide con la fórmula recalculada | PASA |
| C06 | Súper efectivo | *Lanzallamas* contra Bulbasaur (Planta/Veneno) | Efectividad 2, mensaje "súper eficaz", daño según la fórmula | PASA |
| C07 | Poco efectivo | *Lanzallamas* contra Squirtle | Efectividad 0,5, mensaje "No es muy eficaz" | PASA |
| C08 | Inmunidad | *Rapidez* (Normal) contra Gastly; *Rayo* (Eléctrico) contra Diglett | Efectividad 0, daño 0, PS intactos, "No afecta" | PASA |
| C09 | PS nunca negativos | Combate hasta el final | Siempre `hpAfter = max(0, hpBefore − daño)`; el golpe final supera los PS restantes y deja 0 | PASA |
| C10 | Fin al llegar a cero | Squirtle vs Charmander salvaje (CPU) hasta terminar | `finalizado`, ganador y derrotado distintos, derrotado con 0 PS, ganador con PS, mensaje con el ganador | PASA |
| C11 | Sin acciones tras el final | Turno sobre un combate terminado | 409 con mensaje y el estado del combate no cambia | PASA |
| C12 | Error o dato faltante | PokeAPI caída; registro propio inexistente en PokeAPI; IDs, modo, cuerpo y movimiento inválidos | 502 con el nombre del Pokémon; al volver PokeAPI se completan y guardan los tipos; 422, 404 y 400 con mensajes; la ronda no avanza | PASA |

## Pruebas unitarias (`tests/unit/combat.test.js`)

17 pruebas sin servidor ni interfaz. Usan un generador aleatorio guionizado para forzar aciertos,
fallos, críticos y la variación, y fallan si el motor consume más números de los previstos.

- Tabla de tipos de la Gen 1, incluidas las particularidades (Fantasma → Psíquico = 0, Hielo → Fuego = 1) y el doble tipo (×4, ×0,25).
- Mapeo de tipos con `past_types` (Clefairy → Normal, Magnemite → Eléctrico).
- Estadísticas al nivel 50, daño base con truncamiento y el ejemplo del documento (20 × 1,5 × 1,0 × 0,90 = 27).
- STAB, efectividad, inmunidad sin crítico, fallo por precisión, crítico ×1,5 y su probabilidad, daño fijo de *Furia Dragón*.
- Orden por Velocidad y empate sorteado.
- PS no negativos, el debilitado no actúa, fin del combate, 409 posterior.
- Movimientos inválidos (400), reproducibilidad con la misma semilla y estado del generador oculto al cliente.
- Rechazo de registros sin tipos o con estadísticas inválidas (422).

## Verificación manual de la interfaz

Con el servidor y la PokeAPI real (151 Pokémon sincronizados) se jugaron combates completos en
`/combate.html`: aparición del salvaje, LUCHAR → movimiento, ataque aleatorio del salvaje, golpe
crítico, barras de PS animadas, debilitado, menú REVANCHA/NUEVO, HUIR y control por teclado. Sin
errores en la consola del navegador. Faltan las capturas de pantalla o la grabación que pide la entrega.
