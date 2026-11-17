// Genera el informe de pruebas en formato APA 7 (trabajo de estudiante) como .docx.
//   node scripts/crear-informe-apa.js
// Las capturas salen de docs/pruebas/semana-13/capturas y de las rondas de interfaz.
const path = require('node:path');
const { DocxBuilder, para, table, pageBreak } = require('./docx-mini');

const root = path.join(__dirname, '..');
const docs = path.join(root, 'docs', 'pruebas');
const cap = (when, file) => path.join(docs, 'semana-13', 'capturas', when, file);
const ui = (round, file) => path.join(docs, 'evidencias', `semana13-ui-ronda-${round}`, file);
const OUT = path.join(docs, 'semana-13', 'Informe_APA_Pruebas_CRUD_PokeAPI.docx');

const TITLE = 'Pruebas de Software, Gestión de Defectos y Métricas de Calidad del Sistema CRUD-PokeAPI con Módulo de Combate';
// Título en dos líneas para que «CRUD-PokeAPI» no se parta en el guion.
const TITLE_LINES = 'Pruebas de Software, Gestión de Defectos y Métricas de Calidad del\nSistema CRUD-PokeAPI con Módulo de Combate';
const doc = new DocxBuilder({ title: TITLE, author: 'Hernan Felipe Patiño, Juan Jose Sabogal y Orlando Rojas' });
const W = 9360; // Ancho útil de la página en twips (6,5 pulgadas).

const p = (text, options) => doc.add(para(text, options));
const h1 = (text, options = {}) => doc.add(para(text, { style: 'Heading1', ...options }));
const h2 = (text) => doc.add(para(text, { style: 'Heading2' }));
const h3 = (text) => doc.add(para(text, { style: 'Heading3' }));
let tableNumber = 0;
function tabla(title, header, rows, widths, note) {
  tableNumber += 1;
  doc.add(para(`Tabla ${tableNumber}`, { style: 'Rotulo' }), para(title, { style: 'TituloFigura' }),
    table(header, rows, widths), para(note ? `*Nota.* ${note}` : '', { style: 'Nota' }));
  return tableNumber;
}
function figura(id, title, images, note) {
  doc.add(para(`Figura ${id}`, { style: 'Rotulo', pageBreakBefore: false }), para(title, { style: 'TituloFigura' }),
    doc.figure(images), para(`*Nota.* ${note}`, { style: 'Nota' }));
}

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
p('CRUD-PokeAPI es una aplicación web desarrollada con Node.js y Express que gestiona las seis estadísticas principales de los 151 Pokémon de la primera generación. Sus datos se sincronizan desde la API pública PokéAPI (s.f.) y se guardan en un archivo JSON local. La última versión integrada en la rama principal del repositorio (commit 31b6d97) incorpora además un módulo de combate por turnos, construido según la especificación técnica de la asignatura (Fundación Escuela Tecnológica de Neiva [FET], s.f.-a): el usuario elige su Pokémon y un Pokémon salvaje que ataca al azar, y el servidor calcula la precisión, el daño, el STAB, la efectividad de tipos, los golpes críticos y el ganador.');
p('El propósito de este informe es determinar si esa versión es funcional, encontrar sus defectos, corregirlos y demostrar las correcciones con evidencia verificable, incluida la evidencia de que la lógica del sistema se aplica en la interfaz que usa una persona. Para ello se aplicaron las técnicas del curso: plan mínimo y priorización por riesgo, diseño de casos de caja negra con particiones de equivalencia, valores límite y tablas de decisión, suite mínima de requisitos no funcionales con umbrales, gestión de defectos con triage, estados y métricas, y pruebas de interfaz que simulan errores de usuario. Los atributos de calidad evaluados se relacionan con el modelo de calidad de producto de la norma ISO/IEC 25010 (International Organization for Standardization [ISO], 2011).');
p('En síntesis, la versión de la rama principal funcionaba en sus flujos principales, pero presentaba 12 defectos, dos de ellos de severidad alta y relacionados con la seguridad. Todos se corrigieron en la rama test/semana-13-defectos y se verificaron con re-test y regresión completa: 43 de 43 casos de API, 17 de 17 pruebas unitarias, 3 de 3 consultas a la PokéAPI real, 4 de 4 pruebas manuales y 23 de 23 pruebas de interfaz.');

// ---------- Método ----------
h1('Método');
h2('Plan Mínimo y Priorización por Riesgo');
p('Se siguió un plan mínimo de una ronda con alcance, riesgos, ambiente, datos, suites, evidencia y criterios de entrada y salida (Vargas Ramírez, s.f.-f). El alcance incluyó la API del CRUD, el catálogo y la sincronización con PokéAPI, la API y el motor de combate, la interfaz del CRUD y la del combate, y requisitos de rendimiento, seguridad, usabilidad y confiabilidad. Quedaron fuera la carga con muchos usuarios, la escritura simultánea desde varios procesos, la autenticación, que el proyecto no tiene, y otros navegadores distintos de Microsoft Edge. Cada riesgo se calificó con probabilidad e impacto de 1 a 3 y se priorizó por su producto (Vargas Ramírez, s.f.-d), como muestra la Tabla 1.');
tabla('Riesgos Priorizados por Probabilidad e Impacto', ['Riesgo', 'P', 'I', 'P × I', 'Casos que lo cubren'], [
  ['Entradas inválidas o maliciosas guardadas o ejecutadas', '3', '3', '9', 'R04–R06, R10, E01–E04, N03, M01, U01–U05'],
  ['CRUD básico sin funcionar o pérdida de datos', '2', '3', '6', 'S01–S05, N07, U06–U08'],
  ['Lógica de combate incorrecta (daño, turnos, fin)', '2', '3', '6', '17 unitarias, C01–C12, E08, E09, U13, U17–U20'],
  ['Fallo o respuesta inesperada de PokéAPI', '2', '3', '6', 'R09, C12, E05, E08, M03, L01–L03, U16, U21'],
  ['Datos inconsistentes entre el CRUD y el combate', '2', '2', '4', 'E07, C01, C02, U13, U14'],
  ['Mensajes confusos o funciones de interfaz rotas', '2', '2', '4', 'N05, M02, M04, U09–U12'],
  ['Lentitud o errores con peticiones simultáneas', '1', '2', '2', 'N01, N02, N06'],
], [3700, 500, 500, 700, 3960], 'P = probabilidad; I = impacto (1 = bajo, 3 = alto). Los identificadores corresponden a las suites de la Tabla 2.');

h2('Niveles, Tipos y Estrategias de Prueba');
p('La ronda combinó los cuatro niveles de prueba del curso (Vargas Ramírez, s.f.-d). En el nivel unitario se verificó el motor de combate sin servidor ni interfaz. En integración, la API con su almacenamiento y con PokéAPI, tanto simulada como real. En sistema, flujos completos como sincronizar, crear, combatir hasta el final y arrancar con un archivo dañado. En aceptación, los criterios de la especificación del combate y del CRUD desde la interfaz. Se usaron pruebas funcionales y no funcionales, y las estrategias de smoke, regresión, priorización por riesgo y exploración guiada con objetivos concretos: datos raros en cada campo, rutas manipuladas, proveedor caído, archivo dañado, registros renombrados, cabeceras HTTP y contenido HTML en la interfaz. Cada hallazgo de la exploración se convirtió en un caso repetible antes de reportarlo como defecto. La Tabla 2 resume las suites.');
tabla('Suites de Prueba y Comandos de Ejecución', ['Suite', 'Casos', 'Nivel o tipo', 'Comando'], [
  ['Unitarias del motor de combate', '17', 'Unitaria', 'npm run test:unit'],
  ['Smoke del CRUD', 'S01–S05', 'Sistema', 'npm run test:smoke'],
  ['Regresión del CRUD', 'R01–R10', 'Integración', 'npm run test:regression'],
  ['Regresión del combate', 'C01–C12', 'Aceptación', 'npm run test:combat'],
  ['Caja negra y tablas de decisión', 'E01–E09', 'Funcional', 'npm run test:exploratoria'],
  ['No funcionales con umbral', 'N01–N07', 'No funcional', 'npm run test:nofuncional'],
  ['PokéAPI real', 'L01–L03', 'Integración', 'npm run test:live'],
  ['Manuales en el navegador', 'M01–M04', 'Aceptación', 'Pasos documentados'],
  ['Interfaz con usuario simulado', 'U01–U23', 'Sistema y aceptación', 'npm run test:ui'],
], [3000, 1400, 2000, 2960], 'Las suites S, R y C existían antes de esta ronda; E, N, M, L (ampliada) y U se crearon en ella.');

h2('Diseño de Casos de Caja Negra');
p('Para cada entrada se identificaron las reglas, se definieron clases de equivalencia válidas e inválidas y se eligieron datos en los límites: mínimo, máximo, justo por debajo y justo por encima (FET, s.f.-b; Vargas Ramírez, s.f.-e). También se incluyeron los negativos básicos: vacío, nulo, espacios, caracteres especiales, HTML, formato inválido, campos muy largos y tipo incorrecto. La Tabla 3 resume el diseño.');
tabla('Particiones de Equivalencia y Valores Límite', ['Entrada', 'Clases válidas', 'Clases inválidas', 'Valores límite', 'Casos'], [
  ['Nombre del Pokémon', 'Texto de 1 a 40 caracteres sin < > (acentos, punto, apóstrofo, ♀ y ♂)', 'Vacío o espacios; más de 40; HTML o caracteres de control; no texto', '0 → 400; 1 y 40 → 201; 41 → 400', 'R04, E01, E02, U03–U05'],
  ['Seis estadísticas', 'Entero de 1 a 999', '0, negativo, 1000, decimal, texto, nulo, booleano, lista, objeto', '0 y 1000 → 400; 1 y 999 → 201', 'R05, R06, U02, U07'],
  ['Número de Pokédex (pokemonId)', 'Ausente o nulo; entero de 1 a 100 000', '0, negativo, decimal, mayor que 100 000, texto, objeto', '0 y 100 001 → 400; 1 y 100 000 → 201', 'E03'],
  ['Imagen (sprite)', 'URL http o https sin comillas, de hasta 500 caracteres', 'javascript:, data:, comillas, ftp:, más de 500 caracteres', 'URL de 519 caracteres → 400', 'E04'],
  ['Nombre consultado en PokéAPI', 'Letras, números y guiones', '«..», «.», «../25», espacio interno', '« PIKACHU » → 200', 'R01, E05, U09, U11'],
], [1500, 2300, 2300, 1900, 1360], 'El código 201 indica que el registro se creó y el 400, que la petición se rechazó sin guardar nada.');

h2('Tablas de Decisión');
p('Las reglas de negocio con varias condiciones se modelaron con tablas de decisión (*Diseño de casos con tablas de decisión*, s.f.). Para cada tabla se calcularon las 2ⁿ combinaciones, se colapsaron las columnas cuyo resultado no depende de una condición (marcadas con –) y cada regla restante se convirtió en un caso de prueba. Las Tablas 4 a 7 muestran las cuatro tablas, que suman 19 reglas.');
const dt = (title, conditions, actions, cases, results, note) => tabla(title,
  ['Condición o acción', ...conditions[0].slice(1).map((_, i) => `R${i + 1}`)],
  [...conditions, ...actions, ['Casos', ...cases], ['Ronda 1 / ronda 2', ...results]],
  [2860, ...Array(conditions[0].length - 1).fill(Math.floor(6500 / (conditions[0].length - 1)))], note);
dt('Tabla de Decisión para Crear un Registro (2⁴ = 16 Combinaciones, 5 Reglas)', [
  ['¿Nombre válido?', 'V', 'F', 'V', 'V', 'V'], ['¿Seis estadísticas válidas?', 'V', '–', 'F', 'V', 'V'],
  ['¿pokemonId válido o ausente?', 'V', '–', '–', 'F', 'V'], ['¿sprite válido o ausente?', 'V', '–', '–', '–', 'F']],
[['Guardar y responder 201', 'Sí', 'No', 'No', 'No', 'No'], ['Responder 400 sin guardar', 'No', 'Sí', 'Sí', 'Sí', 'Sí']],
['S02', 'R04, E01, E02', 'R05', 'E03', 'E04'], ['Pasa / pasa', 'Falla / pasa', 'Pasa / pasa', 'Falla / pasa', 'Falla / pasa'],
'Las reglas R4 y R5 no estaban cubiertas por la suite anterior; al escribirlas apareció el defecto D09.');
dt('Tabla de Decisión para Iniciar un Combate (2⁴ = 16 Combinaciones, 5 Reglas)', [
  ['¿Existen los dos registros?', 'V', 'F', 'V', 'V', 'V'], ['¿Tienen tipos guardados?', 'V', '–', 'F', 'F', 'F'],
  ['¿PokéAPI responde?', '–', '–', 'V', 'F', 'V'], ['¿El Pokémon existe en PokéAPI?', '–', '–', 'V', '–', 'F']],
[['Respuesta', '201 sin consultar PokéAPI', '404', '201 y guarda tipos', '502', '422']],
['E08', 'E08', 'E08, C12', 'E08, C12', 'E08, C12'], ['Pasa / pasa', 'Pasa / pasa', 'Pasa / pasa', 'Pasa / pasa', 'Pasa / pasa'],
'V = verdadero; F = falso; – = la condición no cambia el resultado.');
dt('Tabla de Decisión para Ejecutar un Turno (2³ = 8 Combinaciones, 4 Reglas)', [
  ['¿Existe el combate?', 'F', 'V', 'V', 'V'], ['¿Está finalizado?', '–', 'V', 'F', 'F'], ['¿Movimiento válido?', '–', '–', 'F', 'V']],
[['Respuesta', '404', '409', '400, no avanza', '200, avanza']],
['E09', 'E09, C11, U20', 'E09', 'E09, U19'], ['Pasa / pasa', 'Pasa / pasa', 'Pasa / pasa', 'Pasa / pasa'],
'El código 409 indica que el combate ya terminó y no admite más acciones.');
dt('Tabla de Decisión para Resolver un Ataque (2⁴ = 16 Combinaciones, 5 Reglas)', [
  ['¿Acierta?', 'F', 'V', 'V', 'V', 'V'], ['¿Efectividad 0?', '–', 'V', 'F', 'F', 'F'],
  ['¿Mismo tipo que el atacante?', '–', '–', 'V', 'F', '–'], ['¿Golpe crítico?', '–', '–', 'F', 'F', 'V']],
[['Resultado', 'Daño 0, «falló»', 'Daño 0, «no afecta»', 'Fórmula × 1,5 (STAB)', 'Fórmula × 1,0', 'Fórmula × 1,5 (crítico)']],
['Unitarias, C04', 'Unitarias, C08, U17', 'Unitarias, C05, U18', 'Unitarias, C05', 'Unitarias'], ['Pasa / pasa', 'Pasa / pasa', 'Pasa / pasa', 'Pasa / pasa', 'Pasa / pasa'],
'Las pruebas unitarias fuerzan el acierto y el crítico con un generador aleatorio guionizado.');

h2('Requisitos No Funcionales y Modelo de Calidad');
p('La suite no funcional se priorizó por riesgo y cada caso se definió con un umbral medible, porque un requisito no funcional sin umbral está incompleto (Vargas Ramírez, s.f.-a). Siguiendo la recomendación del curso, la suite cubre rendimiento, seguridad, usabilidad y confiabilidad. La Tabla 8 relaciona cada caso con la característica de calidad correspondiente de ISO/IEC 25010 (ISO, 2011) y presenta lo medido en cada ronda.');
tabla('Suite No Funcional, Umbrales y Resultados', ['Caso', 'Característica ISO/IEC 25010', 'Umbral', 'Ronda 1', 'Ronda 2'], [
  ['N01 Listar 151 registros', 'Eficiencia de desempeño', 'p95 ≤ 300 ms', 'Pasa (8,5 ms)', 'Pasa (5,8 ms)'],
  ['N02 Resolver una ronda de combate', 'Eficiencia de desempeño', 'p95 ≤ 150 ms', 'Pasa (2,3 ms)', 'Pasa (2,0 ms)'],
  ['N03 El cliente no altera el combate', 'Seguridad (integridad)', '0 campos del cliente aplicados', 'Pasa', 'Pasa'],
  ['N04 Cabeceras y tamaño del cuerpo', 'Seguridad (confidencialidad)', 'Sin X-Powered-By; nosniff; 413 sobre 100 KB', 'Falla', 'Pasa'],
  ['N05 Errores comprensibles', 'Usabilidad', '100 % en JSON, en español, sin texto técnico', 'Falla', 'Pasa'],
  ['N06 Concurrencia y 25 combates', 'Fiabilidad (madurez)', '0 errores 5xx; combates de menos de 80 rondas', 'Pasa', 'Pasa'],
  ['N07 Archivo de datos dañado', 'Fiabilidad (tolerancia a fallos)', 'El servidor sigue activo y explica la causa', 'Falla', 'Pasa'],
  ['M04 Uso en un móvil de 375 px', 'Usabilidad', 'Sin desplazamiento horizontal', 'No ejecutado', 'Pasa'],
], [2600, 2100, 2160, 1250, 1250], 'p95 = percentil 95 del tiempo de respuesta medido en el equipo de pruebas (Windows 11, Node.js 24.21.0).');

h2('Pruebas de Interfaz con Usuario Simulado');
p('Para comprobar que la lógica se aplica en lo que ve el usuario se creó una suite de 23 casos (U01–U23). Un script controla Microsoft Edge 157 en modo sin ventana mediante el protocolo de DevTools, sin dependencias adicionales. Envía clics y pulsaciones de teclado como eventos reales de entrada, de modo que también se aplican las validaciones propias del navegador. Cada caso parte de una API con datos vacíos y compara lo mostrado en pantalla con lo que guardó o calculó el servidor. Los casos reproducen errores típicos de uso: formularios vacíos o con valores fuera de rango, doble clic, cancelar ediciones y borrados, búsquedas mal escritas, combate sin elegir rival, pérdida de conexión y recarga de la página. Cada caso deja capturas automáticas y un registro de las peticiones, avisos y mensajes.');

h2('Gestión de Defectos');
p('Cada defecto se reportó con identificador, título, severidad, prioridad, entorno, pasos numerados con datos exactos, resultado esperado frente al obtenido, evidencia y caso asociado (Vargas Ramírez, s.f.-b). La severidad expresa el impacto técnico o para el usuario y la prioridad, la urgencia: P1 se corrige antes de cualquier demostración, P2 antes de la entrega, P3 en la misma ronda si es de bajo costo y P4 cuando haya tiempo. Antes de registrar un defecto se hizo triage: se confirmó que fuera reproducible, que la información estuviera completa y cuál era su impacto. Los defectos siguieron el ciclo Nuevo, Asignado, En progreso, Resuelto y Verificado o Cerrado, y ninguno se cerró sin re-test (Vargas Ramírez, s.f.-c).');

h2('Ambiente, Datos y Evidencia');
p('Las pruebas se ejecutaron en Windows 11 Pro con Node.js 24.21.0, Express 4 y Microsoft Edge 157. Cada caso automatizado levanta su propia instancia de la API en un puerto libre, con una carpeta temporal vacía y una PokéAPI simulada con los tipos y estadísticas reales de los Pokémon usados. Así los casos se pueden repetir sin tocar los datos del usuario. Por cada caso se guarda un archivo JSON con las peticiones, respuestas, tiempos y salida del servidor, además del SHA-256 del código probado. Las capturas de la API muestran la petición y la respuesta reales de cada ronda; las de la interfaz son capturas del navegador. Toda la evidencia está en la carpeta docs/pruebas/evidencias del repositorio.');

// ---------- Resultados ----------
h1('Resultados');
h2('Ejecución por Rondas');
p('La Tabla 9 resume las rondas. La ronda 1 se ejecutó sobre la versión de la rama principal sin cambios. Las rondas siguientes se ejecutaron sobre las versiones corregidas. En la primera ejecución de la suite de interfaz fallaron seis casos; el triage mostró que cuatro de esas fallas venían del propio script (hacía clic mientras la página se desplazaba o el escenario estaba mal armado). Se corrigió el script, se repitió la ronda sobre el mismo código y esos falsos positivos no se registraron como defectos.');
tabla('Resultados por Ronda de Ejecución', ['Ronda', 'Versión', 'API (43 casos)', 'Unitarias', 'PokéAPI real', 'Manuales', 'Interfaz (23)', 'Decisión'], [
  ['1 Diagnóstico', '31b6d97', '33 pasan, 10 fallan', '17/17', 'No ejecutada', '0/3', '–', 'No listo'],
  ['2 Verificación', 'fe8a5bd', '43/43', '17/17', '3/3', '4/4', '–', 'Listo para API'],
  ['Interfaz 1', 'fe8a5bd', '–', '–', '–', '–', '21 pasan, 2 fallan', 'No listo'],
  ['Interfaz 2 y regresión', 'cab9c88', '43/43', '17/17', '–', '–', '23/23', 'Listo'],
], [1500, 950, 1450, 950, 1050, 900, 1360, 1200], 'Los 27 casos que existían antes de esta ronda (S, R y C) pasaron en todas las rondas, incluida la ronda 1.');

h2('Casos Nuevos de Caja Negra y Manuales');
tabla('Casos Nuevos de Caja Negra y Manuales', ['Caso', 'Técnica y datos principales', 'Resultado esperado', 'Ronda 1', 'Ronda 2', 'Defecto'], [
  ['E01', 'Límites: nombres de 1, 39, 40, 41 y 5 000 caracteres', '201 hasta 40; 400 desde 41', 'Falla', 'Pasa', 'D16'],
  ['E02', 'Equivalencia: «Mr. Mime», «Nidoran♀»; HTML y caracteres de control', 'Válidos 201; HTML o control 400', 'Falla', 'Pasa', 'D08'],
  ['E03', 'pokemonId ausente, 1, «25», 100 000; 0, 2.5, 100 001, texto, objeto', 'Válidos guardados como número; inválidos 400', 'Falla', 'Pasa', 'D09'],
  ['E04', 'sprite https y http; javascript:, comillas, data:, ftp:', 'Solo http o https seguras', 'Falla', 'Pasa', 'D09'],
  ['E05', 'Consultas «..», «.», «../25»; respuesta de PokéAPI sin estadísticas', '400 o 502 con mensaje claro', 'Falla', 'Pasa', 'D12'],
  ['E06', 'Rutas /api inexistentes', '404 con error en JSON', 'Falla', 'Pasa', 'D15'],
  ['E07', 'Renombrar Squirtle a Bulbasaur y combatir', 'Tipos de Bulbasaur en el combate', 'Falla', 'Pasa', 'D14'],
  ['E08', 'Tabla de decisión de inicio de combate (Tabla 5)', '201, 404, 201, 502 y 422', 'Pasa', 'Pasa', '–'],
  ['E09', 'Tabla de decisión de turno (Tabla 6)', '404, 409, 400 y 200', 'Pasa', 'Pasa', '–'],
  ['M01', 'Registros con HTML en el nombre y en el sprite', 'Se muestran como texto', 'Falla', 'Pasa', 'D08'],
  ['M02', 'Escribir «pikachu» en la búsqueda', 'Muestra a Pikachu', 'Falla', 'Pasa', 'D10'],
  ['M03', 'Abrir el CRUD con PokéAPI caída', 'Registros visibles y aviso', 'Falla', 'Pasa', 'D11'],
], [650, 3100, 2350, 900, 900, 1460], 'Los casos N01–N07 se presentan en la Tabla 8.');

h2('Casos de Interfaz con Errores de Usuario');
tabla('Casos de Interfaz: Error del Usuario y Lógica Verificada en Pantalla', ['Caso', 'Error del usuario o acción', 'Lógica que debe verse en pantalla', 'R1', 'R2'], [
  ['U01', 'Guardar con el formulario vacío', 'El navegador exige el nombre; no se envía nada', 'Pasa', 'Pasa'],
  ['U02', 'PS = 0, 1000 y 2.5; luego 1', 'Rango entero de 1 a 999; con 1 se guarda', 'Pasa', 'Pasa'],
  ['U03', 'Nombre con solo espacios', 'Aviso con el motivo del rechazo', 'Pasa', 'Pasa'],
  ['U04', 'Nombre con etiquetas HTML', 'Rechazo; nada se dibuja como HTML', 'Pasa', 'Pasa'],
  ['U05', 'Nombre de 41 caracteres', 'Aviso del límite de 40', 'Pasa', 'Pasa'],
  ['U06', 'Doble clic en «Guardar»', 'Un solo registro', 'Falla', 'Pasa'],
  ['U07', 'Editar con PS = 0 y cancelar', 'El registro no cambia', 'Pasa', 'Pasa'],
  ['U08', 'Cancelar y luego confirmar un borrado', 'Cancelar no borra; confirmar sí', 'Pasa', 'Pasa'],
  ['U09', 'Buscar «  PIKACHU  »', 'Muestra #025 Pikachu', 'Pasa', 'Pasa'],
  ['U10', 'Buscar un Pokémon inexistente', 'Error y ningún aviso de «encontrado»', 'Pasa', 'Pasa'],
  ['U11', 'Buscar «Mr. Mime»', 'Mensaje que explica el formato', 'Pasa', 'Pasa'],
  ['U12', 'Buscar sin escribir ni elegir', '«Escribe o selecciona un Pokémon»', 'Pasa', 'Pasa'],
  ['U13', 'Bajar la Velocidad de Pikachu a 10 y combatir', 'El salvaje más rápido ataca primero', 'Pasa', 'Pasa'],
  ['U14', 'Renombrar Squirtle a «bulbasaur» y combatir', 'Tipos Planta y Veneno en el combate', 'Pasa', 'Pasa'],
  ['U15', 'Iniciar el combate sin elegir al salvaje', 'Mensaje; no se crea el combate', 'Pasa', 'Pasa'],
  ['U16', 'Elegir un salvaje con datos incompletos', 'Mensaje controlado con el nombre', 'Pasa', 'Pasa'],
  ['U17', 'Rapidez (Normal) contra Gastly (Fantasma)', 'Sin daño y «No afecta al…»', 'Falla', 'Pasa'],
  ['U18', 'Surf contra Charmander', 'Barra, números y desglose iguales a la fórmula', 'Pasa', 'Pasa'],
  ['U19', 'Doble clic en un ataque', 'Una sola ronda', 'Pasa', 'Pasa'],
  ['U20', 'Seguir atacando tras ganar', 'Sin menú LUCHAR; el servidor responde 409', 'Pasa', 'Pasa'],
  ['U21', 'Se corta la conexión al atacar', 'Mensaje y posibilidad de reintentar', 'Pasa', 'Pasa'],
  ['U22', 'Recargar a mitad del combate', 'Vuelve a la preparación sin errores', 'Pasa', 'Pasa'],
  ['U23', 'Huir y empezar otro combate', 'El nuevo combate funciona', 'Pasa', 'Pasa'],
], [650, 3150, 3760, 900, 900], 'R1 = ronda 1 de interfaz (fe8a5bd); R2 = ronda 2 de interfaz (cab9c88). En el Apéndice B se muestran capturas que evidencian la lógica aplicada en pantalla.');

h2('Defectos Encontrados, Corregidos y Verificados');
p('La Tabla 12 presenta el backlog de los defectos de esta ronda con su estado final. Para cada uno, el Apéndice A muestra la captura de la falla antes de corregirla y la del mismo caso después de la corrección. Los dos defectos de severidad alta permitían ejecutar código en el navegador de quien abría el CRUD (cross-site scripting, XSS): uno porque la interfaz insertaba sin escapar el nombre y la imagen guardados, y otro porque la API aceptaba en el campo de imagen valores como «javascript:alert(1)» (OWASP Foundation, s.f.).');
tabla('Backlog de Defectos de la Ronda', ['ID', 'Falla observada', 'Sev.', 'Prio.', 'Caso', 'Corrección', 'Estado'], [
  ['D08', 'El CRUD ejecutaba HTML guardado en el nombre o la imagen (XSS)', 'Alta', 'P1', 'E02, M01', 'Escapar todo dato insertado como HTML; rechazar < > y caracteres de control', 'Cerrado'],
  ['D09', 'La API guardaba pokemonId y sprite sin validar', 'Alta', 'P1', 'E03, E04', 'Entero de 1 a 100 000; solo URL http o https seguras', 'Cerrado'],
  ['D10', 'La búsqueda ignoraba el nombre escrito y mostraba a Ditto', 'Media', 'P2', 'M02', 'El texto escrito tiene prioridad; aviso solo si hubo resultado', 'Cerrado'],
  ['D11', 'Con PokéAPI caída, el CRUD mostraba 0 registros sin aviso', 'Media', 'P2', 'M03', 'Manejar el error del catálogo y cargar los registros locales', 'Cerrado'],
  ['D12', 'La consulta «%2E%2E» llegaba a otra ruta de PokéAPI y mostraba un error interno', 'Media', 'P2', 'E05, N05', 'Validar el identificador; no exponer errores internos', 'Cerrado'],
  ['D13', 'Un records.json dañado tumbaba el servidor al iniciar', 'Media', 'P2', 'N07', 'Error controlado con mensaje claro y arranque protegido', 'Cerrado'],
  ['D14', 'Al renombrar, el combate usaba tipos e imagen del Pokémon anterior', 'Media', 'P3', 'E07, U14', 'Descartar datos de la especie al cambiarla y completarlos de nuevo', 'Cerrado'],
  ['D15', 'Rutas /api inexistentes respondían HTML', 'Baja', 'P3', 'E06, N05', '404 en JSON para toda ruta /api desconocida', 'Cerrado'],
  ['D16', 'El nombre no tenía longitud máxima', 'Baja', 'P3', 'E01, U05', 'Máximo de 40 caracteres', 'Cerrado'],
  ['D17', 'La cabecera X-Powered-By revelaba la tecnología del servidor', 'Baja', 'P4', 'N04', 'Quitar la cabecera y enviar nosniff', 'Cerrado'],
  ['D18', 'Un doble clic en «Guardar» creaba el registro dos veces', 'Media', 'P2', 'U06', 'Ignorar envíos repetidos y desactivar el botón', 'Cerrado'],
  ['D19', 'El combate decía «No afecta a el … salvaje»', 'Baja', 'P3', 'U17', 'Usar «al» con el Pokémon salvaje', 'Cerrado'],
], [550, 2550, 650, 600, 1000, 3010, 1000], 'D08–D17 se corrigieron en el commit fe8a5bd y D18–D19 en cab9c88. Sev. = severidad; Prio. = prioridad.');

h2('Métricas de Calidad y de Defectos');
p('La Tabla 13 reúne las métricas de la ronda. La densidad de defectos se calculó sobre las líneas de código JavaScript del producto, sin contar líneas vacías ni comentarios (1 706 líneas: 889 del servidor y 817 de la interfaz). La aprobación por ronda es el porcentaje de casos que pasan sobre los ejecutados. El índice ponderado asigna 3 puntos a cada defecto alto, 2 a cada medio y 1 a cada bajo.');
tabla('Métricas de Calidad y de Defectos', ['Métrica', 'Valor'], [
  ['Defectos encontrados en la ronda', '12 (D08–D19)'],
  ['Por severidad', 'Alta 2 · Media 6 · Baja 4'],
  ['Por prioridad', 'P1: 2 · P2: 5 · P3: 4 · P4: 1'],
  ['Índice ponderado por severidad', '22 puntos al inicio; 0 al cierre'],
  ['Densidad de defectos', '12 / 1,706 KLOC ≈ 7,0 defectos por cada mil líneas'],
  ['Abiertos / cerrados / reincidentes', '0 / 12 / 0'],
  ['Por componente', 'Interfaz del CRUD 4 · interfaz del combate 1 · API REST 5 · almacenamiento 1 · integración CRUD-combate 1 · motor de combate 0'],
  ['Por técnica que lo detectó', 'Caja negra 5 · no funcional 2 · manual 3 · interfaz automatizada 2'],
  ['Falsos positivos descartados en triage', '4 (script de interfaz en su primera ejecución)'],
  ['Aprobación de la API', 'Ronda 1: 76,7 % (33/43) · ronda 2: 100 % (43/43)'],
  ['Aprobación de la interfaz', 'Ronda 1: 91,3 % (21/23) · ronda 2: 100 % (23/23)'],
  ['Cobertura de reglas de las tablas de decisión', '19/19 (100 %)'],
  ['Tiempo de respuesta p95', 'Listado: 5,8 ms (umbral 300 ms) · ronda de combate: 2,0 ms (umbral 150 ms)'],
  ['Tamaño de la corrección', '207 líneas agregadas y 61 eliminadas en 8 archivos'],
  ['Relación entre código de prueba y de producto', '1 713 / 1 706 líneas ≈ 1,0'],
  ['Histórico del proyecto', '19 defectos (D01–D19), 19 cerrados'],
], [3800, 5560], 'KLOC = miles de líneas de código. Los tiempos corresponden a la ronda 2.');

h2('Historial de Defectos Anteriores');
p('Según el registro de defectos previo del proyecto, la suite de la semana 7 encontró seis fallos en su ronda de diagnóstico (9 casos pasaban y 6 fallaban). Se corrigieron y se verificaron con 15 de 15 casos aprobados. Durante el desarrollo del módulo de combate apareció un séptimo defecto. La Tabla 14 muestra cómo se corrigió cada uno y que ninguno reapareció en esta ronda.');
tabla('Defectos Anteriores, Corrección y Reincidencia', ['ID', 'Falla observada', 'Cómo se corrigió', '¿Reincide?'], [
  ['D01', 'El catálogo devolvía Pokémon fuera de la Gen 1 con offset 150', 'Limitar por offset hasta 151 y rechazar parámetros inválidos', 'No (R03 pasa)'],
  ['D02', 'Un nombre de tres espacios se guardaba', 'Validar en el servidor que el nombre no esté vacío', 'No (R04 pasa)'],
  ['D03', 'Se aceptaba hp = 0', 'Exigir enteros de 1 a 999', 'No (R05 pasa)'],
  ['D04', 'Una edición inválida alteraba el registro', 'Validar todo antes de modificar', 'No (R06 pasa)'],
  ['D05', 'Una caída de PokéAPI se informaba como «no existe»', 'Separar 404, 502 y 504', 'No (R09 pasa)'],
  ['D06', 'Un JSON truncado producía una respuesta en HTML', 'Middleware de errores que siempre responde JSON', 'No (R10 pasa)'],
  ['D07', 'El combate recibía registros sin imagen', 'Usar la imagen por número del Pokémon', 'No (C02 pasa)'],
], [600, 3300, 3460, 2000], 'D15 se relaciona con el mismo criterio que D06 (errores en JSON), pero ocurre en otra ruta del código, por lo que no se considera reincidencia.');

// ---------- Discusión ----------
h1('Discusión');
p('La pregunta inicial era si la última versión de CRUD-PokeAPI es funcional. La respuesta es que sí lo era en sus flujos principales: los 27 casos que ya existían, las 17 pruebas unitarias del motor de combate y las cuatro tablas de decisión del combate pasaron desde la primera ronda. Sin embargo, no estaba lista para entregarse, porque tenía dos defectos altos de seguridad, cinco de severidad media y tres bajos, además de los dos defectos de interfaz que se encontraron después. En términos de ISO/IEC 25010 (ISO, 2011), la adecuación funcional del núcleo era buena; las debilidades estaban en la seguridad (D08, D09, D12 y D17), la fiabilidad (D11 y D13) y la usabilidad (D10, D15, D18 y D19).');
p('Las pruebas de interfaz confirmaron que la lógica del servidor se refleja correctamente en la pantalla. Los formularios aplican los rangos y el servidor rechaza lo inválido con mensajes claros. Una Velocidad editada en el CRUD cambia el orden de ataque en el combate. Los PS y el desglose del daño que ve el usuario coinciden con la fórmula del servidor. Además, un combate terminado no admite más acciones ni siquiera forzando la petición, y una pérdida de conexión se informa y permite reintentar. Las dos fallas de interfaz encontradas eran defectos reales que las pruebas de API no podían detectar: un doble clic que duplicaba registros y un error de redacción.');
p('Las métricas respaldan la decisión de liberar la versión corregida: no quedan defectos abiertos ni reincidentes, la aprobación pasó de 76,7 % a 100 % en la API y de 91,3 % a 100 % en la interfaz, y los tiempos de respuesta quedan muy por debajo de los umbrales. La principal lección es que las suites anteriores probaban bien los campos obligatorios, pero no los opcionales, los caracteres especiales ni lo que la interfaz hace con los datos guardados. Las tablas de decisión completas y la exploración guiada fueron las técnicas que encontraron esos huecos.');
p('Se recomienda considerar la versión corregida (commit cab9c88) como lista para la demostración académica local e integrarla a la rama principal mediante una solicitud de cambios (pull request). Quedan fuera del alcance y no se presentan como aprobados: una política de seguridad de contenido (CSP), la autenticación, la escritura simultánea desde varios procesos sobre el archivo JSON, la compatibilidad con navegadores distintos de Edge, la recuperación de un combate en curso al recargar la página y una regla de nombres únicos, si el equipo la requiere. Si cambia el código o el ambiente, las suites deben ejecutarse de nuevo con npm test y npm run test:ui.');

// ---------- Referencias ----------
h1('Referencias', { pageBreakBefore: true });
const ref = (text) => p(text, { style: 'Referencia' });
ref('*Diseño de casos con tablas de decisión* [Documento de la asignatura]. (s.f.).');
ref('Fundación Escuela Tecnológica de Neiva. (s.f.-a). *Especificación técnica: módulo de combate Pokémon* [Documento de la asignatura].');
ref('Fundación Escuela Tecnológica de Neiva. (s.f.-b). *Optativa II — Pruebas de software (semana 2): Validación vs. verificación y diseño de pruebas de caja negra* [Diapositivas de PowerPoint].');
ref('International Organization for Standardization. (2011). *Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models* (ISO/IEC Standard No. 25010:2011). https://www.iso.org/standard/35733.html');
ref('OWASP Foundation. (s.f.). *Cross Site Scripting (XSS)*. https://owasp.org/www-community/attacks/xss/');
ref('PokéAPI. (s.f.). *Documentation v2*. https://pokeapi.co/docs/v2');
ref('Vargas Ramírez, D. F. (s.f.-a). *Semana 11: Requisitos no funcionales II: priorización y suite mínima* [Diapositivas de PowerPoint]. Fundación Escuela Tecnológica de Neiva.');
ref('Vargas Ramírez, D. F. (s.f.-b). *Semana 12: Gestión de defectos I: reporte y ciclo de vida* [Diapositivas de PowerPoint]. Fundación Escuela Tecnológica de Neiva.');
ref('Vargas Ramírez, D. F. (s.f.-c). *Semana 13: Gestión de defectos II: triage, seguimiento y métricas* [Diapositivas de PowerPoint]. Fundación Escuela Tecnológica de Neiva.');
ref('Vargas Ramírez, D. F. (s.f.-d). *Semana 4: Etapas, tipos y estrategias de prueba* [Diapositivas de PowerPoint]. Fundación Escuela Tecnológica de Neiva.');
ref('Vargas Ramírez, D. F. (s.f.-e). *Semana 5: Diseño de pruebas funcionales (caja negra)* [Diapositivas de PowerPoint]. Fundación Escuela Tecnológica de Neiva.');
ref('Vargas Ramírez, D. F. (s.f.-f). *Semana 7: Estrategia de pruebas y plan mínimo* [Diapositivas de PowerPoint]. Fundación Escuela Tecnológica de Neiva.');

// ---------- Apéndice A ----------
h1('Apéndice A', { pageBreakBefore: true });
p('**Evidencia de las Fallas y de sus Correcciones**', { style: 'Centrado' });
p('Cada figura muestra a la izquierda la falla antes de corregirla y a la derecha el mismo caso después de la corrección. Las capturas de la API presentan la petición y la respuesta reales guardadas en la evidencia de cada ronda: antes corresponde al commit 31b6d97 (o fe8a5bd para D18 y D19) y después, a fe8a5bd o cab9c88.');
const pair = (beforeFile, beforeCaption, afterFile, afterCaption) => [{ file: beforeFile, caption: beforeCaption }, { file: afterFile, caption: afterCaption }];
figura('A1', 'D08: Código Inyectado en el Nombre de un Registro', pair(cap('antes', 'D08-xss-nombre.jpg'), 'Antes: el navegador ejecuta el código (borde rojo y texto inyectado)', cap('despues', 'D08-xss-escapado.jpg'), 'Después: el mismo contenido se muestra como texto'), 'Caso M01. Los registros maliciosos de la captura posterior se escribieron directamente en el archivo de datos, como si se hubieran guardado antes de la corrección.');
figura('A2', 'D08 y D09: Código Inyectado en la Imagen y Rechazo en la API', pair(cap('antes', 'D08-xss-sprite.jpg'), 'Antes: franjas «XSS» creadas desde el campo sprite', cap('despues', 'E02.png'), 'Después (E02): la API rechaza nombres con HTML (400)'), 'Casos M01 y E02.');
figura('A3', 'D09: Imagen con «javascript:» Aceptada por la API', pair(cap('antes', 'E04.png'), 'Antes: 201, se guarda javascript:alert(1)', cap('despues', 'E04.png'), 'Después: 400 con el motivo'), 'Caso E04.');
figura('A4', 'D10: La Búsqueda Ignoraba el Nombre Escrito (Antes de Corregir)', pair(cap('antes', 'D10-busqueda-1-escribe-pikachu.jpg'), 'Paso 2: se escribe «pikachu»', cap('antes', 'D10-busqueda-2-muestra-ditto.jpg'), 'Paso 3: aparece Ditto'), 'Caso M02 antes de la corrección.');
figura('A5', 'D10: La Búsqueda Usa el Nombre Escrito (Después de Corregir)', pair(cap('despues', 'D10-busqueda-1-escribe-pikachu.jpg'), 'Paso 2: mismos pasos', cap('despues', 'D10-busqueda-2-muestra-pikachu.jpg'), 'Paso 3: aparece Pikachu (#025)'), 'Caso M02 después de la corrección.');
figura('A6', 'D11: CRUD sin PokéAPI', pair(cap('antes', 'D11-crud-sin-pokeapi.jpg'), 'Antes: «0 / 151 registros» y página vacía', cap('despues', 'D11-crud-sin-pokeapi.jpg'), 'Después: 151 registros visibles y aviso'), 'Caso M03. En la captura posterior se ocultaron temporalmente las secciones de consulta y formulario para mostrar juntos el catálogo y los registros.');
figura('A7', 'D12: Identificador Manipulado en la Consulta a PokéAPI', pair(cap('antes', 'E05.png'), 'Antes: 502 «stats is not iterable»', cap('despues', 'E05.png'), 'Después: 400 con mensaje en español'), 'Caso E05.');
figura('A8', 'D13: Archivo de Datos Dañado', pair(cap('antes', 'N07.png'), 'Antes: el servidor termina con SyntaxError', cap('despues', 'N07.png'), 'Después: sigue activo y explica la causa'), 'Caso N07.');
figura('A9', 'D14: Registro Renombrado en el Combate', pair(cap('antes', 'E07.png'), 'Antes: «bulbasaur» con tipo Agua y número 7', cap('despues', 'E07.png'), 'Después: tipos Planta y Veneno, número 1'), 'Caso E07.');
figura('A10', 'D15: Rutas de la API Inexistentes', pair(cap('antes', 'N05.png'), 'Antes: 404 en HTML', cap('despues', 'N05.png'), 'Después: 404 en JSON'), 'Casos E06 y N05.');
figura('A11', 'D16: Nombre de 41 Caracteres', pair(cap('antes', 'E01.png'), 'Antes: 201, se guarda', cap('despues', 'E01.png'), 'Después: 400, máximo 40 caracteres'), 'Caso E01.');
figura('A12', 'D17: Cabeceras de Seguridad', pair(cap('antes', 'N04.png'), 'Antes: x-powered-by: Express', cap('despues', 'N04.png'), 'Después: sin la cabecera y con nosniff'), 'Caso N04.');
figura('A13', 'D18: Doble Clic en «Guardar»', pair(ui(1, 'U06-1-tras-doble-clic.png'), 'Antes: dos registros «Doble-Clic»', ui(2, 'U06-1-tras-doble-clic.png'), 'Después: un solo registro'), 'Caso U06, capturas automáticas del navegador.');
figura('A14', 'D19: Mensaje de Inmunidad', pair(ui(1, 'U17-1-no-afecta.png'), 'Antes: «No afecta a el GASTLY salvaje...»', ui(2, 'U17-1-no-afecta.png'), 'Después: «No afecta al GASTLY salvaje...»'), 'Caso U17. En ambas capturas Gastly conserva todos sus PS: la lógica era correcta y la falla estaba solo en el texto.');

// ---------- Apéndice B ----------
h1('Apéndice B', { pageBreakBefore: true });
p('**Evidencia de que la Lógica se Aplica en la Interfaz**', { style: 'Centrado' });
p('Capturas automáticas de la ronda 2 de interfaz (commit cab9c88). En cada caso, el script comparó lo mostrado en pantalla con lo calculado o guardado por el servidor.');
figura('B1', 'Validación de Rango y Orden de Ataque por Velocidad', pair(ui(2, 'U02-1-ps-cero.png'), 'U02: con PS = 0 el navegador bloquea el envío', ui(2, 'U13-3-salvaje-primero.png'), 'U13: con Velocidad 10, el Charmander salvaje ataca primero'), 'En U02 no llega ninguna petición al servidor; en U13 la Velocidad se editó desde el CRUD.');
figura('B2', 'Cálculo del Daño y Manejo de la Pérdida de Conexión', pair(ui(2, 'U18-2-desglose.png'), 'U18: desglose «Base 43 × STAB 1.5 × Efect. 2 × Var. 0.92 = 118»', ui(2, 'U21-1-sin-conexion.png'), 'U21: «No hay conexión con el servidor del proyecto»'), 'En U18 el daño mostrado coincide con la fórmula del servidor; en U21 el usuario puede reintentar el ataque.');
figura('B3', 'Fin del Combate y Uso en un Teléfono', pair(ui(2, 'U20-1-fin-del-combate.png'), 'U20: tras ganar solo quedan REVANCHA y NUEVO', cap('despues', 'M04-combate-movil-375.jpg'), 'M04: pantalla de combate a 375 px'), 'En U20 un turno forzado desde la página recibe la respuesta 409 del servidor.');

doc.save(OUT);
console.log(`Informe APA: ${path.relative(root, OUT)}`);
