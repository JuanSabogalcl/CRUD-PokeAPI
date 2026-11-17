// Genera el informe de pruebas en formato APA 7 (trabajo de estudiante) como .docx.
//   node scripts/crear-informe-apa.js
// Versión corta: muestra cómo se probó cada parte, con casos concretos y capturas.
const path = require('node:path');
const { DocxBuilder, para, table, pageBreak } = require('./docx-mini');

const root = path.join(__dirname, '..');
const docs = path.join(root, 'docs', 'pruebas');
const cap = (when, file) => path.join(docs, 'semana-13', 'capturas', when, file);
const ui = (round, file) => path.join(docs, 'evidencias', `semana13-ui-ronda-${round}`, file);
const OUT = path.join(docs, 'semana-13', 'Informe_APA_Pruebas_CRUD_PokeAPI.docx');

const TITLE = 'Pruebas de Software del Sistema CRUD-PokeAPI: Casos, Defectos y Evidencias';
// Título en dos líneas para que «CRUD-PokeAPI» no se parta en el guion.
const TITLE_LINES = 'Pruebas de Software del Sistema CRUD-PokeAPI:\nCasos, Defectos y Evidencias';
const doc = new DocxBuilder({ title: TITLE, author: 'Hernan Felipe Patiño, Juan Jose Sabogal y Orlando Rojas' });

const p = (text, options) => doc.add(para(text, options));
const h1 = (text, options = {}) => doc.add(para(text, { style: 'Heading1', ...options }));
const h2 = (text) => doc.add(para(text, { style: 'Heading2' }));
let tableNumber = 0;
function tabla(title, header, rows, widths, note) {
  tableNumber += 1;
  doc.add(para(`Tabla ${tableNumber}`, { style: 'Rotulo' }), para(title, { style: 'TituloFigura' }),
    table(header, rows, widths), para(note ? `*Nota.* ${note}` : '', { style: 'Nota' }));
}
function figura(id, title, images, note) {
  doc.add(para(`Figura ${id}`, { style: 'Rotulo' }), para(title, { style: 'TituloFigura' }),
    doc.figure(images), para(`*Nota.* ${note}`, { style: 'Nota' }));
}
const pair = (beforeFile, beforeCaption, afterFile, afterCaption) => [
  { file: beforeFile, caption: `Antes: ${beforeCaption}` }, { file: afterFile, caption: `Después: ${afterCaption}` }];

// ---------- Portada ----------
doc.add(para('', { style: 'Centrado' }), para('', { style: 'Centrado' }), para('', { style: 'Centrado' }));
p(TITLE_LINES, { style: 'Centrado', bold: true });
p('', { style: 'Centrado' });
p('Hernan Felipe Patiño, Juan Jose Sabogal y Orlando Rojas', { style: 'Centrado' });
p('Programa de Ingeniería de Software, Fundación Escuela Tecnológica de Neiva', { style: 'Centrado' });
p('Optativas 3: Métricas y Calidad del Software', { style: 'Centrado' });
p('Christian Julian Gonzalez Marroquin', { style: 'Centrado' });
p('17 de noviembre de 2026', { style: 'Centrado' });
doc.add(pageBreak());

// ---------- Introducción ----------
p(TITLE_LINES, { style: 'Centrado', bold: true });
p('Este informe muestra cómo se probó la última versión de CRUD-PokeAPI, una aplicación web que guarda las estadísticas de los 151 Pokémon de la primera generación, las trae de PokéAPI (s.f.) e incluye un combate por turnos contra un Pokémon salvaje (Fundación Escuela Tecnológica de Neiva [FET], s.f.). El objetivo fue comprobar si la aplicación funciona, encontrar sus errores, corregirlos y demostrar cada corrección con evidencia.');
p('La aplicación funcionaba en lo esencial, pero las pruebas encontraron 12 defectos. Todos se corrigieron, y al final pasan las 112 pruebas: 29 unitarias, 48 de API, 3 contra PokéAPI real, 4 manuales y 28 de interfaz. Además, se demostró que la lógica de pelea se aplica correctamente comparándola con una segunda implementación de las reglas en más de 17 000 ataques.');

// ---------- Método ----------
h1('Método');
h2('Tipos de Prueba Aplicados');
p('Se combinaron pruebas de distintos niveles y tipos (Vargas Ramírez, s.f.-c). Cada caso tiene datos concretos, pasos, resultado esperado, resultado obtenido (pasa, falla o bloqueado) y evidencia (Vargas Ramírez, s.f.-d). La Tabla 1 resume qué se probó y cómo.');
tabla('Pruebas Aplicadas', ['Tipo de prueba', 'Qué comprueba', 'Cómo se hizo', 'Casos'], [
  ['Unitarias', 'Fórmulas del combate: daño, tipos, críticos, turnos', 'Funciones del motor probadas por separado', '17'],
  ['Funcionales de API (smoke y regresión)', 'Crear, consultar, editar, borrar, sincronizar y combatir', 'Peticiones HTTP reales a una API con datos de prueba', '27'],
  ['Caja negra', 'Valores límite, datos inválidos y combinaciones de condiciones', 'Datos en los bordes y tablas de decisión', '9'],
  ['No funcionales', 'Rendimiento, seguridad, usabilidad y fiabilidad', 'Medición contra un umbral definido', '7'],
  ['Integración real', 'Conexión con PokéAPI en internet', 'Consultas reales a PokéAPI', '3'],
  ['Manuales', 'Lo que ve el usuario en la pantalla', 'Pasos en el navegador con capturas', '4'],
  ['Interfaz automatizada', 'Errores típicos del usuario', 'Un script usa el navegador Edge como una persona y toma capturas', '23'],
  ['Lógica del combate', 'Que cada ataque, turno y final siga las reglas', 'Comparación con un oráculo en el motor, la API y la pantalla', '22'],
], [2300, 2800, 3360, 900], 'Las pruebas se repiten con npm test, npm run test:ui y npm run test:logica.');

h2('Técnicas de Diseño de Casos');
p('Para elegir los datos se usaron particiones de equivalencia y valores límite: por ejemplo, si el nombre admite hasta 40 caracteres, se prueban 40 (debe pasar) y 41 (debe fallar) (Vargas Ramírez, s.f.-d). Las reglas con varias condiciones se probaron con tablas de decisión: cada combinación de condiciones es un caso (*Diseño de casos con tablas de decisión*, s.f.). Los requisitos no funcionales se midieron contra un umbral, por ejemplo, responder en menos de 300 ms (Vargas Ramírez, s.f.-a). Cada falla se reportó como defecto con severidad, prioridad y evidencia, y solo se cerró después de repetir la prueba (Vargas Ramírez, s.f.-b).');

// ---------- Resultados ----------
h1('Resultados');
h2('Ejemplos de Cómo se Probó');
p('La Tabla 2 muestra casos representativos de cada técnica, con sus datos, el resultado esperado y lo que se obtuvo antes y después de corregir.');
tabla('Casos de Prueba Representativos', ['Caso y técnica', 'Datos y pasos', 'Resultado esperado', 'Resultado obtenido'], [
  ['E01\nValores límite', 'Crear registros con nombres de 40 y de 41 caracteres', '40 se guarda; 41 se rechaza', 'Antes: 41 se guardaba (falla)\nDespués: se rechaza (pasa)'],
  ['E08\nTabla de decisión', 'Iniciar combates combinando: registro existe, tiene tipos, PokéAPI responde, Pokémon existe (5 reglas)', 'Cada regla da su respuesta: 201, 404, 201, 502 y 422', 'Pasa en las dos rondas'],
  ['M01\nSeguridad', 'Guardar un registro con nombre <img src=x onerror=...> y abrir el CRUD', 'El nombre se ve como texto', 'Antes: el navegador ejecutaba el código (falla)\nDespués: se ve como texto (pasa)'],
  ['M02\nFuncional manual', 'Escribir «pikachu» en la búsqueda y pulsar Buscar', 'Aparece Pikachu', 'Antes: aparecía Ditto (falla)\nDespués: aparece Pikachu (pasa)'],
  ['U06\nError del usuario', 'Llenar el formulario y hacer doble clic en Guardar', 'Se crea un solo registro', 'Antes: se creaban dos (falla)\nDespués: uno (pasa)'],
  ['U13\nLógica en pantalla', 'Bajar la Velocidad de Pikachu a 10 en el CRUD y combatir contra Charmander', 'Charmander, más rápido, ataca primero', 'Pasa en las dos rondas'],
  ['U18\nLógica en pantalla', 'Usar Surf contra Charmander', 'La barra de vida y el desglose coinciden con la fórmula', 'Pasa: 118 = 43 × 1,5 × 2 × 0,92'],
  ['N01\nRendimiento', '30 consultas seguidas del listado de 151 registros', 'p95 ≤ 300 ms', 'Pasa: 5,8 ms'],
  ['N07\nFiabilidad', 'Dañar el archivo de datos y arrancar el servidor', 'El servidor sigue activo y explica el problema', 'Antes: se caía (falla)\nDespués: avisa (pasa)'],
], [1500, 3000, 2300, 2560], 'p95 = el 95 % de las respuestas tardó menos que ese valor. Las capturas de M01, M02 y U06 están en las Figuras 1 a 3.');

h2('Resultados por Ronda');
tabla('Pruebas que Pasan en Cada Ronda', ['Ronda', 'Versión del código', 'Pasan', 'Fallan'], [
  ['1. Diagnóstico (API, caja negra y no funcionales)', 'Rama principal sin cambios', '33 de 43', '10'],
  ['2. Después de corregir', 'Con 10 correcciones', '43 de 43', '0'],
  ['3. Interfaz con usuario simulado', 'Con 10 correcciones', '21 de 23', '2'],
  ['4. Interfaz después de corregir', 'Con 12 correcciones', '23 de 23', '0'],
  ['5. Lógica del combate y regresión completa', 'Con 12 correcciones', '105 de 105', '0'],
], [3900, 2460, 1500, 1500], 'La ronda 5 suma 29 unitarias, 48 de API y 28 de interfaz. Las 3 consultas a PokéAPI real y las 4 pruebas manuales pasaron al final. En un primer intento de la ronda 5, el caso C02 falló una vez por un corte de conexión con la PokéAPI simulada; no se reprodujo en 1 065 repeticiones, por lo que se clasificó como no reproducible y la ronda se repitió completa.');

h2('Defectos Encontrados y Corregidos');
p('La Tabla 4 lista los 12 defectos. Las Figuras 1 a 3 muestran tres de ellos antes y después de corregirlos; el Apéndice tiene la evidencia de los demás.');
tabla('Defectos y Correcciones', ['ID', 'Falla encontrada', 'Severidad', 'Corrección'], [
  ['D08', 'El CRUD ejecutaba código escondido en el nombre o la imagen (XSS)', 'Alta', 'Mostrar los datos como texto y rechazar < >'],
  ['D09', 'La API aceptaba números e imágenes inválidos', 'Alta', 'Validar número de Pokédex e imagen'],
  ['D10', 'La búsqueda ignoraba el nombre escrito', 'Media', 'Buscar lo que se escribe'],
  ['D11', 'Sin PokéAPI, el CRUD mostraba 0 registros', 'Media', 'Mostrar los registros guardados y un aviso'],
  ['D12', 'Una búsqueda con «..» mostraba un error interno', 'Media', 'Validar el nombre buscado'],
  ['D13', 'Un archivo de datos dañado apagaba el servidor', 'Media', 'Avisar sin apagar el servidor'],
  ['D14', 'Al renombrar, el combate usaba el Pokémon anterior', 'Media', 'Actualizar tipos e imagen al renombrar'],
  ['D18', 'Un doble clic en Guardar creaba dos registros', 'Media', 'Bloquear el botón mientras guarda'],
  ['D15', 'Las rutas de API inexistentes respondían en HTML', 'Baja', 'Responder en JSON'],
  ['D16', 'El nombre no tenía longitud máxima', 'Baja', 'Máximo 40 caracteres'],
  ['D17', 'El servidor revelaba su tecnología en las cabeceras', 'Baja', 'Quitar la cabecera'],
  ['D19', 'El combate decía «No afecta a el … salvaje»', 'Baja', 'Corregir el texto'],
], [700, 4100, 1200, 3360], 'Todos los defectos quedaron cerrados después de repetir su prueba y la regresión completa.');
figura(1, 'Prueba de Seguridad M01: Código en el Nombre de un Registro (D08)', pair(
  cap('antes', 'D08-xss-nombre.jpg'), 'el código se ejecuta (borde rojo y texto agregado)',
  cap('despues', 'D08-xss-escapado.jpg'), 'el mismo contenido se ve como texto'), 'Captura del navegador en el CRUD.');
figura(2, 'Prueba Manual M02: Buscar a Pikachu Escribiendo su Nombre (D10)', pair(
  cap('antes', 'D10-busqueda-2-muestra-ditto.jpg'), 'se escribió «pikachu» y aparece Ditto',
  cap('despues', 'D10-busqueda-2-muestra-pikachu.jpg'), 'aparece Pikachu'), 'Captura del navegador en la sección «Consultar PokeAPI».');
figura(3, 'Prueba de Interfaz U06: Doble Clic en Guardar (D18)', pair(
  ui(1, 'U06-1-tras-doble-clic.png'), 'dos registros «Doble-Clic»',
  ui(2, 'U06-1-tras-doble-clic.png'), 'un solo registro'), 'Capturas tomadas automáticamente por el script de pruebas de interfaz.');

h2('Pruebas de la Lógica de Pelea');
p('Para demostrar que el combate aplica bien sus reglas se escribió un oráculo: una segunda implementación de las reglas de la especificación (estadísticas, fórmula de daño, STAB, tabla de tipos, críticos y orden por Velocidad) hecha sin usar el código del motor. Cada prueba hace que el motor resuelva ataques y compara el resultado con el que calcula el oráculo. Si coinciden en miles de casos, la lógica se aplica como se especificó. La Tabla 5 resume estas pruebas en los tres niveles: el motor, la API y la pantalla.');
tabla('Pruebas de la Lógica de Pelea', ['Qué se verifica', 'Cómo se probó', 'Resultado'], [
  ['Tabla de tipos de la Gen 1', 'Las 225 combinaciones de un tipo y las 1 575 de doble tipo', 'Todas coinciden; 6 inmunidades; valores de × 0 a × 4'],
  ['Fórmula de daño, STAB y efectividad', 'Cada ataque de 19 Pokémon contra los 19, con y sin crítico y tres variaciones', '8 664 ataques iguales al oráculo'],
  ['Precisión', '20 000 intentos por movimiento, de 65 % a 100 %', 'Trueno 69,9 % (esperado 70 %); Rapidez nunca falla'],
  ['Golpes críticos', '20 000 ataques por Pokémon', 'Pikachu 17,5 % (esperado 17,6 %); daño × 1,5'],
  ['Variación aleatoria', '32 000 ataques', 'Solo enteros de 85 a 100, con frecuencia pareja'],
  ['Orden de los turnos', '361 enfrentamientos y 4 000 empates', 'Siempre ataca primero el más rápido; empates 50 %'],
  ['Combates completos', '2 000 combates (8 612 ataques)', 'PS nunca negativos ni en aumento; el debilitado no ataca; el ganador es correcto'],
  ['Pokémon salvaje', '8 000 rondas', 'Usa sus 4 movimientos, cerca del 25 % cada uno'],
  ['Por la API (K01–K05)', '30 combates completos por HTTP, × 4 y × 0,25, empates y precisión', 'Todo igual al oráculo; Trueno acertó 71 % de 150'],
  ['En pantalla (U24–U28)', 'Un usuario juega en Edge; se comparan mensajes, barras, números y desglose', 'La pantalla muestra lo mismo que calcula el oráculo'],
], [2300, 3700, 3360], 'Los conteos y porcentajes salen de la ejecución con semillas fijas, por lo que se pueden repetir. Las pruebas usan las estadísticas base reales de la Gen 1.');
figura(4, 'Fallo por Precisión y Golpe Crítico en Pantalla', [
  { file: path.join(docs, 'evidencias', 'semana13-ui-ronda-3', 'U25-1-trueno-fallo.png'), caption: 'U25: Trueno falla y Ditto no pierde PS' },
  { file: path.join(docs, 'evidencias', 'semana13-ui-ronda-3', 'U26-1-critico.png'), caption: 'U26: Rapidez con golpe crítico' }], 'En U26 el daño crítico fue 41 frente a 27 sin crítico con la misma variación (× 1,5).');
figura(5, 'Efectividad de Tipos en Pantalla', [
  { file: path.join(docs, 'evidencias', 'semana13-ui-ronda-3', 'U27-1-poco-eficaz.png'), caption: 'U27: Fuego contra Agua, × 0,5' },
  { file: path.join(docs, 'evidencias', 'semana13-ui-ronda-3', 'U28-1-super-eficaz-x4.png'), caption: 'U28: Eléctrico contra Agua/Volador, × 4' }], 'En ambos casos el daño mostrado coincide con el oráculo.');
figura(6, 'Registro de un Combate Completo con el Cálculo de Cada Ataque', [
  { file: path.join(docs, 'evidencias', 'semana13-ui-ronda-3', 'U24-2-registro-completo.png') }], 'Cada línea muestra «Base × STAB × Efectividad × Variación = daño» y los PS antes y después. En la ronda 2, Golpe Cuerpo calcula 58 de daño, pero Charmander tenía 41 PS: queda en 0, no en negativo.');

h2('Métricas');
p('La Tabla 6 resume las métricas de calidad. Las características evaluadas (rendimiento, seguridad, usabilidad y fiabilidad) corresponden al modelo de calidad ISO/IEC 25010 (International Organization for Standardization [ISO], 2011).');
tabla('Métricas de la Ronda de Pruebas', ['Métrica', 'Valor'], [
  ['Defectos por severidad', 'Alta 2 · Media 6 · Baja 4 (total 12)'],
  ['Densidad de defectos', '7,0 por cada 1 000 líneas de código'],
  ['Aprobación de la API', '76,7 % antes de corregir → 100 % después'],
  ['Aprobación de la interfaz', '91,3 % antes de corregir → 100 % después'],
  ['Cobertura de las tablas de decisión', '19 de 19 reglas probadas (100 %)'],
  ['Tiempo de respuesta (p95)', 'Listado: 5,8 ms · ronda de combate: 2,0 ms'],
  ['Ataques comparados con el oráculo', '17 410 (8 664 + 8 612 en 2 000 combates + 134 por la API), sin diferencias'],
  ['Defectos abiertos y reincidentes', '0 y 0'],
], [3600, 5760], 'La densidad se calculó sobre 1 706 líneas de JavaScript del producto, sin líneas vacías ni comentarios.');

// ---------- Conclusión ----------
h1('Conclusión');
p('La aplicación funcionaba en sus funciones principales, pero no estaba lista para entregarse: tenía dos fallas graves de seguridad y varios errores que el usuario podía notar. Probar con datos en los límites, con tablas de decisión y simulando errores de usuario en la interfaz permitió encontrar fallas que las pruebas anteriores no cubrían. Después de corregirlas, todas las pruebas pasan y no quedan defectos abiertos. En el combate, la comparación con un oráculo en más de 17 000 ataques, en el motor, la API y la pantalla, no encontró ninguna diferencia: el daño, la efectividad, los críticos, la precisión, el orden de los turnos y el final del combate se aplican como dice la especificación. Por eso la versión corregida queda lista para la demostración. Quedan fuera del alcance otros navegadores distintos de Edge, la autenticación y el uso simultáneo por muchas personas.');

// ---------- Referencias ----------
h1('Referencias', { pageBreakBefore: true });
const ref = (text) => p(text, { style: 'Referencia' });
ref('*Diseño de casos con tablas de decisión* [Documento de la asignatura]. (s.f.).');
ref('Fundación Escuela Tecnológica de Neiva. (s.f.). *Especificación técnica: módulo de combate Pokémon* [Documento de la asignatura].');
ref('International Organization for Standardization. (2011). *Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models* (ISO/IEC Standard No. 25010:2011). https://www.iso.org/standard/35733.html');
ref('PokéAPI. (s.f.). *Documentation v2*. https://pokeapi.co/docs/v2');
ref('Vargas Ramírez, D. F. (s.f.-a). *Semana 11: Requisitos no funcionales II: priorización y suite mínima* [Diapositivas de PowerPoint]. Fundación Escuela Tecnológica de Neiva.');
ref('Vargas Ramírez, D. F. (s.f.-b). *Semana 13: Gestión de defectos II: triage, seguimiento y métricas* [Diapositivas de PowerPoint]. Fundación Escuela Tecnológica de Neiva.');
ref('Vargas Ramírez, D. F. (s.f.-c). *Semana 4: Etapas, tipos y estrategias de prueba* [Diapositivas de PowerPoint]. Fundación Escuela Tecnológica de Neiva.');
ref('Vargas Ramírez, D. F. (s.f.-d). *Semana 5: Diseño de pruebas funcionales (caja negra)* [Diapositivas de PowerPoint]. Fundación Escuela Tecnológica de Neiva.');

// ---------- Apéndice ----------
h1('Apéndice', { pageBreakBefore: true });
p('**Evidencia Antes y Después de los Demás Defectos**', { style: 'Centrado' });
p('A la izquierda, la falla antes de corregir; a la derecha, la misma prueba después. Las capturas de la API muestran la petición y la respuesta reales de cada prueba.');
figura('A1', 'D09: Imagen «javascript:» Aceptada por la API (E04)', pair(cap('antes', 'E04.png'), 'se guarda', cap('despues', 'E04.png'), 'se rechaza'), 'Prueba de caja negra con datos inválidos.');
figura('A2', 'D11: CRUD sin PokéAPI (M03)', pair(cap('antes', 'D11-crud-sin-pokeapi.jpg'), '0 registros', cap('despues', 'D11-crud-sin-pokeapi.jpg'), '151 registros y aviso'), 'En la captura posterior se ocultaron dos secciones para que cupieran el catálogo y los registros.');
figura('A3', 'D12: Búsqueda con «..» (E05)', pair(cap('antes', 'E05.png'), 'error interno', cap('despues', 'E05.png'), 'mensaje claro'), 'Prueba con datos raros.');
figura('A4', 'D13: Archivo de Datos Dañado (N07)', pair(cap('antes', 'N07.png'), 'el servidor se apaga', cap('despues', 'N07.png'), 'el servidor avisa'), 'Prueba de fiabilidad.');
figura('A5', 'D14: Registro Renombrado en el Combate (E07)', pair(cap('antes', 'E07.png'), 'tipo Agua de Squirtle', cap('despues', 'E07.png'), 'tipos de Bulbasaur'), 'Prueba de integración entre el CRUD y el combate.');
figura('A6', 'D15: Ruta de API Inexistente (N05)', pair(cap('antes', 'N05.png'), 'respuesta en HTML', cap('despues', 'N05.png'), 'respuesta en JSON'), 'Prueba de usabilidad de los mensajes de error.');
figura('A7', 'D16: Nombre de 41 Caracteres (E01)', pair(cap('antes', 'E01.png'), 'se guarda', cap('despues', 'E01.png'), 'se rechaza'), 'Prueba de valores límite.');
figura('A8', 'D17: Cabeceras del Servidor (N04)', pair(cap('antes', 'N04.png'), 'muestra «Express»', cap('despues', 'N04.png'), 'cabecera eliminada'), 'Prueba de seguridad.');
figura('A9', 'D19: Mensaje de Inmunidad en el Combate (U17)', pair(ui(1, 'U17-1-no-afecta.png'), '«a el GASTLY»', ui(2, 'U17-1-no-afecta.png'), '«al GASTLY»'), 'En ambas capturas Gastly conserva su vida: la lógica era correcta y solo fallaba el texto.');

doc.save(OUT);
console.log(`Informe APA: ${path.relative(root, OUT)}`);
