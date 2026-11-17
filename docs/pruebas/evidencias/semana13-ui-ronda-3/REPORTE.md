# Reporte de pruebas de interfaz

Fecha UTC: 2026-11-17T19:32:11.090Z. Edg/157.0.4341.60, ventana 1280 × 900. Commit: c5968629894051cdbc586dc436fbc322e5a8a581.

Un usuario simulado hace clics y escribe en la interfaz real; la PokeAPI es la simulada de las pruebas.

28 PASA, 0 FALLA, 0 BLOQUEADO.

| Caso | Criterio | Resultado | Capturas | Observación |
|---|---|---|---|---|
| U01 Crear con el formulario vacío | RN-01 / interfaz | PASA | [1-formulario-vacio](U01-1-formulario-vacio.png) | Mensaje del navegador: «Rellena este campo.» |
| U02 Estadística fuera de rango en el formulario (0, 1000, 2.5 y 1) | R05 / interfaz | PASA | [1-ps-cero](U02-1-ps-cero.png), [2-ps-uno-guardado](U02-2-ps-uno-guardado.png) | 0: «El valor debe ser mayor o igual que 1.» · 1000: «El valor debe ser menor o igual que 999.» · 2.5: «Escribe un valor válido. Los dos valores válidos más cercanos son 2 y 3.» |
| U03 Nombre con solo espacios | R04 / interfaz | PASA | [1-aviso-nombre-vacio](U03-1-aviso-nombre-vacio.png) | Aviso: «El nombre del Pokémon debe ser un texto no vacío» |
| U04 Nombre con etiquetas HTML | D08 / interfaz | PASA | [1-aviso-html](U04-1-aviso-html.png) | Aviso: «El nombre del Pokémon no puede contener < > ni caracteres de control» |
| U05 Nombre de 41 caracteres | D16 / interfaz | PASA | [1-nombre-41](U05-1-nombre-41.png) | Caracteres aceptados en el campo: 41. Avisos: El nombre del Pokémon admite máximo 40 caracteres |
| U06 Doble clic en Guardar | Integridad / interfaz | PASA | [1-tras-doble-clic](U06-1-tras-doble-clic.png) | Peticiones POST enviadas: 1. Registros creados: 1 |
| U07 Editar con un valor inválido y cancelar | R06 / interfaz | PASA | [1-editar-ps-cero](U07-1-editar-ps-cero.png), [2-cancelado](U07-2-cancelado.png) | Coincide con el esperado |
| U08 Eliminar: cancelar y luego confirmar | S05 / interfaz | PASA | [1-eliminado](U08-1-eliminado.png) | Diálogo: «¿Eliminar este registro?» (cancelado y luego aceptado) |
| U09 Búsqueda con mayúsculas y espacios | R01 / interfaz | PASA | [1-pikachu](U09-1-pikachu.png) | Coincide con el esperado |
| U10 Búsqueda de un Pokémon que no existe | R02 / interfaz | PASA | [1-no-existe](U10-1-no-existe.png) | Coincide con el esperado |
| U11 Búsqueda escrita con formato inválido («Mr. Mime») | D12 / interfaz | PASA | [1-formato-invalido](U11-1-formato-invalido.png) | Aviso: «Escribe el nombre como aparece en PokeAPI (letras, números y guiones) o su número» |
| U12 Búsqueda vacía | D10 / interfaz | PASA | [1-busqueda-vacia](U12-1-busqueda-vacia.png) | Coincide con el esperado |
| U13 Editar la Velocidad cambia quién ataca primero | RF05 / interfaz | PASA | [1-velocidad-editada](U13-1-velocidad-editada.png), [2-vista-previa](U13-2-vista-previa.png), [3-salvaje-primero](U13-3-salvaje-primero.png) | Orden en pantalla: ¡El CHARMANDER salvaje usó LLAMARADA! → ¡PIKACHU usó RAYO! |
| U14 Renombrar desde el formulario cambia la especie en el combate | D14 / interfaz | PASA | [1-bulbasaur-en-combate](U14-1-bulbasaur-en-combate.png) | Coincide con el esperado |
| U15 Iniciar el combate sin elegir al Pokémon salvaje | RF01 / interfaz | PASA | [1-sin-salvaje](U15-1-sin-salvaje.png) | Coincide con el esperado |
| U16 Pokémon salvaje con datos incompletos | C12 / interfaz | PASA | [1-datos-incompletos](U16-1-datos-incompletos.png) | Mensaje: «Datos incompletos de grupo6-custom: no tiene tipos y no existe en PokeAPI para completarlos» |
| U17 Inmunidad visible: Rapidez contra Gastly | RF08 / interfaz | PASA | [1-no-afecta](U17-1-no-afecta.png) | Coincide con el esperado |
| U18 Súper eficaz: PS y desglose en pantalla iguales a la lógica | RF07–RF10 / interfaz | PASA | [1-super-eficaz](U18-1-super-eficaz.png), [2-desglose](U18-2-desglose.png) | Daño 114 = ⌊43 × 1,5 × 2 × 0.89⌋ |
| U19 Doble clic en un ataque | RF04 / interfaz | PASA | [1-tras-doble-clic](U19-1-tras-doble-clic.png) | Peticiones de turno: 1. Rondas jugadas: 1 |
| U20 Después de terminar no se puede seguir atacando | RF11 / interfaz | PASA | [1-fin-del-combate](U20-1-fin-del-combate.png) | Ganador: Squirtle. Derrotado: Charmander.. Turno forzado desde la página: HTTP 409 |
| U21 Se pierde la conexión al atacar | Sección 10 / interfaz | PASA | [1-sin-conexion](U21-1-sin-conexion.png), [2-conexion-recuperada](U21-2-conexion-recuperada.png) | Mensaje: «No hay conexión con el servidor del proyecto» |
| U22 Recargar la página a mitad del combate | Confiabilidad / interfaz | PASA | [1-tras-recargar](U22-1-tras-recargar.png) | La página vuelve a la preparación sin errores; el combate en curso no se recupera (no es un requisito) |
| U23 HUIR y empezar otro combate | Interfaz | PASA | [1-huir](U23-1-huir.png) | Coincide con el esperado |
| U24 Combate completo: cada ronda en pantalla coincide con el oráculo | RF04–RF11 / interfaz | PASA | [1-ronda-2](U24-1-ronda-2.png), [2-registro-completo](U24-2-registro-completo.png), [3-fin](U24-3-fin.png) | 2 rondas y 4 ataques: daño, PS, barra y desglose iguales al oráculo. Ganador: ditto |
| U25 Fallo por precisión en pantalla: Trueno (70 %) no quita PS | RF06 / interfaz | PASA | [1-trueno-fallo](U25-1-trueno-fallo.png) | Trueno falló: PS del rival 27 → 27 |
| U26 Golpe crítico en pantalla: daño × 1,5 según la fórmula | Críticos / interfaz | PASA | [1-critico](U26-1-critico.png) | Crítico: daño 40 frente a 26 sin crítico con la misma variación (0.87) |
| U27 «No es muy eficaz» en pantalla: Fuego contra Agua (× 0,5) | RF08 / interfaz | PASA | [1-poco-eficaz](U27-1-poco-eficaz.png) | Lanzallamas a Squirtle: × 0,5, daño 30 |
| U28 × 4 en pantalla: Rayo contra Gyarados hasta el final del combate | RF08 / RF11 / interfaz | PASA | [1-super-eficaz-x4](U28-1-super-eficaz-x4.png), [2-super-eficaz-x4](U28-2-super-eficaz-x4.png), [3-debilitado](U28-3-debilitado.png), [4-fin-del-combate](U28-4-fin-del-combate.png) | Daños de Rayo × 4: 132, 131. Ganador: pikachu |

Decisión: **LISTO para el alcance de interfaz probado**.
