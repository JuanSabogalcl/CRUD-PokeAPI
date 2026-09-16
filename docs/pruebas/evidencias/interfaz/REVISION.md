# Revisión básica de la interfaz

Revisión complementaria a la suite REST, realizada en Chrome sobre `http://localhost:3000`.

- La página mostró el título CRUD PokeAPI, el catálogo y el formulario de estadísticas.
- Después de la sincronización inicial, el DOM mostró `151 / 151 registros` y las tarjetas del catálogo.
- Se escribió `pikachu` en el filtro del catálogo. La inspección visible mostró una tarjeta: `#025 pikachu Guardado`.

Extracto textual observado después de filtrar:

```text
button: Sincronizar 151 Pokémon
input: Filtrar por nombre o número (#25, pikachu)...
button: #025 pikachu Guardado
select: Selecciona un Pokémon... #001 bulbasaur #002 ivysaur ...
input: O escribe el nombre [ditto]
button: Buscar en PokeAPI
```

En la revisión posterior se obtuvieron pantallazos reales del catálogo, del filtro y de las seis estadísticas de Pikachu. Se guardaron en `docs/pruebas/capturas`, junto con una captura del reporte de 15 pruebas aprobadas abierto en GitHub. El archivo `fuentes.json` identifica su procedencia y huella SHA-256. El informe `INFORME_GRUPO_6.pdf` los incorpora.

Esta revisión no comprueba el CRUD completo desde la interfaz. El CRUD se comprobó mediante peticiones HTTP en los casos S02–S05.
