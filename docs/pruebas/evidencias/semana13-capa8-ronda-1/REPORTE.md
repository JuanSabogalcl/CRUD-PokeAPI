# Reporte de pruebas de interfaz

Fecha UTC: 2026-11-17T20:12:17.385Z. Edg/157.0.4341.60, ventana 1280 × 900. Commit: f4b17fe83d028e3b923ce117a207ff18fbf19b78.

Un usuario simulado hace clics y escribe en la interfaz real; la PokeAPI es la simulada de las pruebas.

4 PASA, 5 FALLA, 0 BLOQUEADO.

| Caso | Criterio | Resultado | Capturas | Observación |
|---|---|---|---|---|
| V01 Crear un Pokémon que ya existe | Capa 8 / Sección 11 (no duplicar) | FALLA | [V01-1-tras-guardar-repetido](V01-1-tras-guardar-repetido.png), [V01-2-falla](V01-2-falla.png) | La aplicación debe avisar que ese Pokémon ya existe. Avisos al usuario: ninguno. Registros «pikachu»: 2 |
| V02 Buscar dos Pokémon seguidos con la red lenta | Capa 8 / CRUD Read | FALLA | [V02-1-resultado-final](V02-1-resultado-final.png), [V02-2-falla](V02-2-falla.png) | Debe quedar el último Pokémon que pidió el usuario. Último buscado: ditto. En pantalla: «#025 pikachu», campo «ditto», lista «ditto» |
| V03 Buscar como lo muestra la pantalla: «#025» y «Mr. Mime» | Capa 8 / CRUD Read | FALLA | [V03-1-numero-025](V03-1-numero-025.png), [V03-2-falla](V03-2-falla.png) | «#025» es como la aplicación muestra a Pikachu. «#025» → resultado «#132 ditto». Avisos: Escribe el nombre como aparece en PokeAPI (letras, números y guiones) o su número |
| V04 Doble clic en «Eliminar» | Capa 8 / CRUD Delete | FALLA | [V04-1-tras-doble-clic](V04-1-tras-doble-clic.png), [V04-2-falla](V04-2-falla.png) | El usuario no debe ver un error después de eliminar con éxito. Confirmaciones: 2. Peticiones DELETE: 2. Avisos de error: Registro no encontrado |
| V05 Doble clic en «¡A combatir!» | Capa 8 / RF01 | PASA | [V05-1-un-combate](V05-1-un-combate.png) | Coincide con el esperado |
| V06 Apretar Enter sin parar durante todo el combate | Capa 8 / RF11 | FALLA | [V06-1-tras-machacar-enter](V06-1-tras-machacar-enter.png), [V06-2-falla](V06-2-falla.png) | Al terminar, el Enter repetido no debe iniciar otro combate sin que el usuario lo elija. Combates creados: 2. Pantalla final: menú «», resultado visible: false |
| V07 Escribir letras en las estadísticas | Capa 8 / R05 | PASA | [V07-1-letras](V07-1-letras.png) | Valores que aceptó el campo: PS «», Ataque «4» |
| V08 Entrar al combate sin registros guardados | Capa 8 / RF01 | PASA | [V08-1-sin-registros](V08-1-sin-registros.png) | Mensaje: «Selecciona tu Pokémon y el Pokémon salvaje» |
| V09 Elegir el mismo Pokémon para ambos lados | Capa 8 / RF01 | PASA | [V09-1-espejo](V09-1-espejo.png) | Coincide con el esperado |

Decisión: **NO LISTO**.
