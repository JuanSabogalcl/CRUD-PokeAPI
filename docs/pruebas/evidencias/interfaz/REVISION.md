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

La captura PNG no se obtuvo porque el navegador agotó el tiempo de espera. No se adjunta una captura simulada ni se declara probado el CRUD completo desde la interfaz. El CRUD se comprobó mediante peticiones HTTP en los casos S02–S05.
