# Reporte de pruebas de interfaz

Fecha UTC: 2026-11-17T20:14:24.848Z. Edg/157.0.4341.60, ventana 1280 × 900. Commit: 004bc7b29015276693904b485aa54da05e47b28c.

Un usuario simulado hace clics y escribe en la interfaz real; la PokeAPI es la simulada de las pruebas.

9 PASA, 0 FALLA, 0 BLOQUEADO.

| Caso | Criterio | Resultado | Capturas | Observación |
|---|---|---|---|---|
| V01 Crear un Pokémon que ya existe | Capa 8 / Sección 11 (no duplicar) | PASA | [V01-1-tras-guardar-repetido](V01-1-tras-guardar-repetido.png) | Avisos al usuario: «Ya existe un registro de «pikachu». ¿Quieres guardar otro con el mismo nombre?». Registros «pikachu»: 1 |
| V02 Buscar dos Pokémon seguidos con la red lenta | Capa 8 / CRUD Read | PASA | [V02-1-resultado-final](V02-1-resultado-final.png) | Último buscado: ditto. En pantalla: «#132 ditto», campo «ditto», lista «ditto» |
| V03 Buscar como lo muestra la pantalla: «#025» y «Mr. Mime» | Capa 8 / CRUD Read | PASA | [V03-1-numero-025](V03-1-numero-025.png) | «#025» → resultado «#025 pikachu». Avisos: Pokémon pikachu encontrado |
| V04 Doble clic en «Eliminar» | Capa 8 / CRUD Delete | PASA | [V04-1-tras-doble-clic](V04-1-tras-doble-clic.png) | Confirmaciones: 1. Peticiones DELETE: 1. Avisos de error: ninguno |
| V05 Doble clic en «¡A combatir!» | Capa 8 / RF01 | PASA | [V05-1-un-combate](V05-1-un-combate.png) | Coincide con el esperado |
| V06 Apretar Enter sin parar durante todo el combate | Capa 8 / RF11 | PASA | [V06-1-tras-machacar-enter](V06-1-tras-machacar-enter.png) | Combates creados: 1. Pantalla final: menú «end», resultado visible: true |
| V07 Escribir letras en las estadísticas | Capa 8 / R05 | PASA | [V07-1-letras](V07-1-letras.png) | Valores que aceptó el campo: PS «», Ataque «4» |
| V08 Entrar al combate sin registros guardados | Capa 8 / RF01 | PASA | [V08-1-sin-registros](V08-1-sin-registros.png) | Mensaje: «Selecciona tu Pokémon y el Pokémon salvaje» |
| V09 Elegir el mismo Pokémon para ambos lados | Capa 8 / RF01 | PASA | [V09-1-espejo](V09-1-espejo.png) | Coincide con el esperado |

Decisión: **LISTO para el alcance de interfaz probado**.
