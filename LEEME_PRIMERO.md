# Proyecto listo en esta carpeta

Se clonó `https://github.com/JuanSabogalcl/CRUD-PokeAPI.git` directamente en `C:\xampp\htdocs\OPTATIVAIII`, conservando su historial y el remoto `origin`. No necesitas SSH para trabajar con esta copia. El repositorio incluye el código, las pruebas y los documentos de la entrega. La presentación en la plataforma académica se realiza por separado.

## Abrir la aplicación

Abre **http://localhost:3000** mientras esté encendido el servidor. Para iniciarlo en otra sesión, haz doble clic en **INICIAR.cmd** y deja abierta esa ventana. Detén ese proceso con Ctrl+C. Si el puerto ya está ocupado por esta aplicación, basta con abrir la dirección.

El servidor iniciado durante la preparación corre en segundo plano. **DETENER.cmd** detiene únicamente ese proceso registrado, verificando su identidad y fecha de inicio. Después puedes volver a iniciarlo con **INICIAR.cmd**.

Aunque esté dentro de `xampp/htdocs`, este proyecto usa **Node.js**, no PHP. No necesita Apache ni MySQL y no se abre como `localhost/OPTATIVAIII`.

En este equipo se prepararon Git y Node.js portátiles en `%LOCALAPPDATA%\OptativaIII-tools`. Los accesos `.cmd` los encuentran automáticamente. **ABRIR-TERMINAL.cmd** abre una consola con `git`, `node` y `npm` disponibles. En otro equipo instala Node.js 22 o superior y ejecuta `npm ci`.

## Pruebas y entrega

Haz doble clic en **PRUEBAS.cmd**. Genera una ronda nueva en `docs/pruebas/evidencias/`. Las pruebas crean sus propios datos temporales y no borran los registros de la aplicación.

Desde la terminal preparada:

```bat
npm test
npm run test:smoke
npm run test:regression
npm run test:live
```

Abre [ENTREGA.html](docs/pruebas/ENTREGA.html) para consultar el resumen y los enlaces a plan, suite y evidencias. El [plan mínimo PDF](docs/pruebas/PLAN_MINIMO.pdf) está verificado en una página A4. También se incluye una versión HTML para editarlo.

La carpeta de entrega incluye 5 smoke, 10 regresión, primera ronda con fallos, verificación tras correcciones, tres consultas reales y lista de defectos. Para sustentarlo, revisa [CASOS.md](docs/pruebas/CASOS.md) y [DEFECTOS.md](docs/pruebas/DEFECTOS.md).

## Configuración opcional

| Variable | Valor predeterminado | Uso |
|---|---|---|
| PORT | 3000 | Puerto HTTP. |
| HOST | 127.0.0.1 | Escucha local. |
| DATA_DIR | `data` del proyecto | Carpeta para records.json. |
| POKEAPI_BASE | `https://pokeapi.co/api/v2/pokemon` | Proveedor público o fixture. |
| POKEAPI_TIMEOUT_MS | 10000 | Tiempo máximo por solicitud externa. |
| AUTO_SYNC_GEN1 | activa | `false` desactiva importación al iniciar. |

Los datos reales están en `data/records.json`, ignorado por Git. El ZIP no incluye node_modules ni datos locales; al descomprimir se instalan dependencias y se sincroniza el catálogo al iniciar. No ejecutes `seed` y el servidor simultáneamente contra la misma carpeta de datos.

## Git

En `ABRIR-TERMINAL.cmd`, `git status` muestra todos los cambios preparados. `git diff` permite revisarlos. Para clonar otra copia en el futuro: `git clone https://github.com/JuanSabogalcl/CRUD-PokeAPI.git`. El envío al repositorio exige una cuenta con permisos de escritura.
