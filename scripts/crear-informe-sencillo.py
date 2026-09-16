"""Genera el informe académico en PDF y HTML a partir de evidencias reales.

Requiere reportlab, Pillow y pypdf. Los PNG originales no se modifican.
"""
from pathlib import Path
from datetime import datetime
from html import escape
import json
import hashlib
from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Flowable
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'pruebas'
CAP = OUT / 'capturas'
EVIDENCE = OUT / 'evidencias'

def read(folder):
    return json.loads((EVIDENCE / folder / 'resultados.json').read_text(encoding='utf-8'))

initial = read('ronda-1-diagnostico')
verified = read('ronda-2-verificacion')
latest = read('ronda-4-captura-terminal')
live = read('integracion-real')
assert latest['totals'] == {'PASA': 15, 'FALLA': 0, 'BLOQUEADO': 0}
assert all(result['status'] == 'PASA' for result in live['results'])

font_dir = Path('C:/Windows/Fonts')
if (font_dir / 'arial.ttf').exists():
    pdfmetrics.registerFont(TTFont('BodyFont', str(font_dir / 'arial.ttf')))
    pdfmetrics.registerFont(TTFont('BodyBold', str(font_dir / 'arialbd.ttf')))
else:
    pdfmetrics.registerFontFamily('Helvetica', normal='Helvetica', bold='Helvetica-Bold')
FONT = 'BodyFont' if 'BodyFont' in pdfmetrics.getRegisteredFontNames() else 'Helvetica'
BOLD = 'BodyBold' if FONT == 'BodyFont' else 'Helvetica-Bold'
pdfmetrics.registerFontFamily(FONT, normal=FONT, bold=BOLD)
styles = {
    'body': ParagraphStyle('body', fontName=FONT, fontSize=10.5, leading=14, spaceAfter=6),
    'title': ParagraphStyle('title', fontName=BOLD, fontSize=15, leading=19, spaceAfter=8),
    'h': ParagraphStyle('h', fontName=BOLD, fontSize=12, leading=15, spaceBefore=9, spaceAfter=6),
    'small': ParagraphStyle('small', fontName=FONT, fontSize=9, leading=12, spaceAfter=5),
    'cell': ParagraphStyle('cell', fontName=FONT, fontSize=9, leading=11.7),
    'headcell': ParagraphStyle('headcell', fontName=BOLD, fontSize=9, leading=11.7),
}
WIDTH = A4[0] - 38*mm
story, html = [], []

def para(text, kind='body'):
    story.append(Paragraph(text, styles[kind]))
    tag = 'h1' if kind == 'title' else 'h2' if kind == 'h' else 'p'
    html.append(f'<{tag}>{text}</{tag}>')

def page():
    story.append(PageBreak())
    html.append('<div class="pagebreak"></div>')

def table(headers, rows, widths):
    content = [[Paragraph(escape(str(value)), styles['headcell' if index == 0 else 'cell'])
                for value in row] for index, row in enumerate([headers, *rows])]
    item = Table(content, colWidths=[WIDTH*part for part in widths], repeatRows=1, hAlign='LEFT')
    item.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), .45, colors.HexColor('#b5b5b5')),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#eeeeee')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 5), ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5), ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.extend([item, Spacer(1,7)])
    html.append('<table><thead><tr>' + ''.join(f'<th>{escape(str(v))}</th>' for v in headers)
        + '</tr></thead><tbody>' + ''.join('<tr>' + ''.join(f'<td>{escape(str(v))}</td>' for v in row)
        + '</tr>' for row in rows) + '</tbody></table>')

class ScreenshotArea(Flowable):
    """Coloca una zona del pantallazo en el documento sin editar el PNG fuente."""
    def __init__(self, filename, rectangle, width):
        super().__init__()
        self.filename = str(CAP / filename)
        self.x, self.y, self.sw, self.sh = rectangle
        self.width = width
        self.height = width * self.sh / self.sw
        self.iw, self.ih = PILImage.open(self.filename).size

    def draw(self):
        c = self.canv
        factor = self.width/self.sw
        c.saveState()
        boundary = c.beginPath()
        boundary.rect(0,0,self.width,self.height)
        c.clipPath(boundary, stroke=0)
        c.drawImage(self.filename, -self.x*factor, -(self.ih-self.y-self.sh)*factor,
            width=self.iw*factor, height=self.ih*factor)
        c.restoreState()

def figure(filename, rectangle, caption):
    story.append(ScreenshotArea(filename, rectangle, WIDTH))
    story.append(Spacer(1,5))
    story.append(Paragraph(caption, styles['small']))
    html.append(f'<figure><img src="capturas/{filename}" alt="{escape(caption, quote=True)}"><figcaption>{caption}</figcaption></figure>')

para('Suite de pruebas de la API CRUD PokeAPI', 'title')
para('Optativa II - Semana 7 - Grupo 6')
para('<b>Integrantes</b><br/>Hernan Felipe Patiño Rico<br/>Juan Jose Sabogal Garcia<br/>Orlando Rojas Narvaez')
para('Docente: Diego Fernando Vargas Ramírez<br/>Fundación Escuela Tecnológica de Neiva')
para('1 Plan mínimo de pruebas', 'h')
para('<b>Objetivo y alcance.</b> Comprobar el CRUD de estadísticas Pokémon, la persistencia, el catálogo Gen 1, la sincronización y las respuestas de error. Se aplicó la estrategia de la semana 7: priorizar riesgos, separar smoke y regresión y conservar evidencia de cada resultado.')
para('<b>Riesgos.</b> Probabilidad e impacto se calificaron de 1 a 3. El riesgo se obtuvo multiplicando ambos valores. Se probaron primero las funciones que pueden impedir el uso de la aplicación o guardar datos incorrectos.')
table(['Riesgo', 'P', 'I', 'P x I', 'Casos'], [
    ['API o CRUD básico sin funcionar',3,3,9,'S01 a S05'],
    ['Datos inválidos o edición incorrecta',3,3,9,'R04 a R06 y R10'],
    ['Fallo del proveedor o sincronización',2,3,6,'R08 y R09'],
    ['Catálogo o consulta incorrectos',2,2,4,'R01 a R03 y R07'],
], [.48,.07,.07,.10,.28])
para('<b>Ambiente y datos.</b> Windows, Node.js 24.21.0 y Express. Cada caso crea una API local, una carpeta temporal vacía y un proveedor simulado. Dato base: Ditto, ID Pokémon 132 y las seis estadísticas en 48. Se admiten enteros de 1 a 999, como indica el formulario. Las consultas al proveedor real se ejecutaron por separado.')
para('<b>Suites.</b> Cinco smoke comprueban disponibilidad, creación, consulta, edición y eliminación. Diez pruebas de regresión verifican entradas, límites, errores y sincronización. Los identificadores S01 a R10 se relacionan con los criterios CA01 a CA15 en CASOS.md.')
para('<b>Entrada.</b> Dependencias instaladas, datos aislados y resultados esperados definidos. <b>Detención.</b> Una smoke fallida o pérdida de datos impide aprobar la ronda; se conserva evidencia y se corrige. <b>Salida.</b> Se exige 15 de 15 casos aprobados, sin bloqueos ni defectos altos abiertos dentro del alcance. La demostración en línea exige también tres consultas reales aprobadas.')
para('<b>Evidencia.</b> Por cada caso se guarda solicitud, respuesta, resultado y observación en JSON, más el reporte de la ronda. PASA significa que cumple el esperado; FALLA, que no coincide; BLOQUEADO, que no se pudo comprobar. Las pruebas de carga, seguridad y concurrencia entre procesos quedan fuera de este trabajo.')

page()
para('2 Casos de prueba', 'title')
para('Cada caso inicia con almacenamiento vacío. Cuando requiere un registro, primero crea el dato base. El reporte completo conserva los pasos y respuestas HTTP. Los casos se ejecutan con npm test.')
para('Pruebas smoke', 'h')
table(['Caso', 'Prueba y dato principal', 'Resultado esperado'], [
    ['S01','Consultar etiquetas y colección vacía.','HTTP 200; seis etiquetas y colección vacía.'],
    ['S02','Crear DITTO con seis valores 48.','HTTP 201; ID válido, nombre ditto y datos guardados.'],
    ['S03','Consultar por el ID recién creado.','HTTP 200; datos iguales al registro creado.'],
    ['S04','Cambiar nombre a PIKACHU y hp a 60; reiniciar.','HTTP 200; conserva las otras estadísticas y persiste el cambio.'],
    ['S05','Eliminar el registro, consultarlo y reiniciar.','DELETE 200; consulta 404 y colección vacía.'],
], [.10,.45,.45])
para('Pruebas de regresión', 'h')
table(['Caso', 'Prueba y dato principal', 'Resultado esperado'], [
    ['R01','Consultar PIKACHU con espacios y por número 25.','HTTP 200; ID 25 y estadísticas 35, 55, 40, 50, 50 y 90.'],
    ['R02','Consultar no-existe-grupo6.','HTTP 404 y mensaje de error en JSON.'],
    ['R03','Lista con limit=999; limit=10 y offset=150; parámetros inválidos.','Máximo 151; en offset 150 solo Mew; inválidos devuelven 400.'],
    ['R04','Omitir datos; nombre vacío o numérico; stats nulo o lista.','HTTP 400 y ningún registro guardado.'],
    ['R05','Probar 1, 999 y "48"; luego 66 variantes inválidas.','Válidos: 201. Inválidos: 400 sin alterar la colección.'],
    ['R06','Editar con nombre vacío, valores fuera de rango o tipos inválidos.','HTTP 400; registro y fechas sin cambios.'],
    ['R07','GET, PUT y DELETE con un ID inexistente.','HTTP 404 en las tres operaciones.'],
    ['R08','Sincronizar 151 dos veces con un registro local adicional.','151 creados la primera vez; 0 la segunda; total 152, sin duplicar.'],
    ['R09','Simular 503, demora, JSON externo roto y fallo de un detalle.','HTTP 502 o 504; sin guardado parcial.'],
    ['R10','Enviar JSON truncado y cuerpos que no son objetos.','HTTP 400 con error JSON; la API continúa funcionando.'],
], [.10,.45,.45])
para('En R04, R05, R06 y R10 se compara el estado anterior con el posterior para comprobar que los rechazos no modificaron los datos.', 'small')

page()
para('3 Resultados y defectos', 'title')
para('La primera ronda detectó seis fallos. Después de corregirlos se ejecutó nuevamente la suite completa. Las comprobaciones adicionales realizadas al preparar los pantallazos mantuvieron el resultado de 15 casos aprobados.')
table(['Ronda', 'PASA', 'FALLA', 'BLOQUEADO', 'Decisión'], [
    ['Diagnóstico inicial',9,6,0,'NO LISTO'],
    ['Después de las correcciones',15,0,0,'LISTO'],
    ['Comprobación para pantallazos',15,0,0,'LISTO'],
], [.40,.12,.12,.18,.18])
para('La comprobación adicional terminó el ' + latest['endedAt'].replace('T',' ').replace('Z',' UTC') + '. Los tres controles independientes contra la PokeAPI pública también pasaron: consulta de Pikachu, lista de 151 y nombre inexistente.')
para('Defectos encontrados y correcciones', 'h')
table(['ID', 'Fallo observado', 'Corrección y verificación'], [
    ['D01','Con offset=150 se devolvían 10 Pokémon, fuera de Gen 1.','Limitar la paginación. R03 terminó PASA.'],
    ['D02','POST aceptaba un nombre compuesto por espacios.','Validar tipo y nombre no vacío. R04 terminó PASA.'],
    ['D03','POST aceptaba hp=0, contrario al mínimo del formulario.','Exigir enteros entre 1 y 999. R05 terminó PASA.'],
    ['D04','PUT guardaba un nombre vacío y modificaba el registro.','Validar antes de modificar datos. R06 terminó PASA.'],
    ['D05','Un 503 del proveedor se reportaba como Pokémon inexistente.','Distinguir 404, 502 y 504. R09 terminó PASA.'],
    ['D06','Un JSON malformado devolvía una página HTML de error.','Responder con error JSON. R10 terminó PASA.'],
], [.09,.45,.46])
para('Ejemplo de corrección', 'h')
para('Al enviar hp=0, la primera ronda obtuvo HTTP 201 y guardó el registro. La verificación actual obtiene HTTP 400 con el mensaje “La estadística hp debe ser un entero entre 1 y 999”. Los archivos R05.json de ambas rondas conservan las solicitudes y respuestas para comparar.')
para('Ubicación de las evidencias', 'h')
para('docs/pruebas/evidencias/ronda-1-diagnostico<br/>docs/pruebas/evidencias/ronda-2-verificacion<br/>docs/pruebas/evidencias/ronda-4-captura-terminal<br/>docs/pruebas/evidencias/integracion-real', 'small')
para('Cada carpeta contiene resultados.json y REPORTE.md. En las rondas locales también hay un archivo JSON por cada caso. La evidencia de cada fila está identificada por S01, S02, etc.; las observaciones describen el fallo o indican que coincidió con el esperado.')

page()
para('4 Pantallazos de la aplicación', 'title')
para('Capturas reales tomadas en http://localhost:3000. Se muestran las zonas relevantes de las imágenes; los PNG completos están en docs/pruebas/capturas.', 'small')
figure('01-catalogo.png', (400,20,1100,712), 'Figura 1. Catálogo Gen 1 cargado. El contador muestra 151 de 151 registros y las tarjetas aparecen como guardadas.')
story.append(Spacer(1,8))
figure('03-estadisticas.png', (400,30,1100,625), 'Figura 2. Consulta de Pikachu. Se observan las seis estadísticas: PS 35, ataque 55, defensa 40, ataque especial 50, defensa especial 50 y velocidad 90.')

page()
para('5 Pantallazo del reporte de pruebas', 'title')
para('El reporte de la segunda ronda quedó publicado en el repositorio. La captura muestra 15 PASA, 0 FALLA y 0 BLOQUEADO, con un enlace JSON para la evidencia de cada caso.')
figure('04-reporte-pruebas.png', (666,302,1045,835), 'Figura 3. Reporte de ejecución real abierto en GitHub. Ruta: docs/pruebas/evidencias/ronda-2-verificacion/REPORTE.md. El resultado de esa ronda se confirmó nuevamente al preparar este informe.')
para('6 Conclusión', 'h')
para('El proyecto cumple los 15 casos definidos para la actividad y las tres consultas reales adicionales. Los seis defectos detectados en el diagnóstico se corrigieron y verificaron. Se considera listo para la demostración académica dentro del alcance probado.')
para('Para repetir la suite se utiliza npm test. Para consultar el proveedor real se utiliza npm run test:live. La documentación detallada está en CASOS.md y DEFECTOS.md. Quedan pendientes, fuera del alcance, las pruebas de carga, seguridad y concurrencia entre procesos.')
para('Referencia', 'h')
para('Diego Fernando Vargas Ramírez. Optativa II, Semana 7, Estrategia de pruebas y plan mínimo. Diapositivas 4 a 10.<br/>Repositorio: https://github.com/JuanSabogalcl/CRUD-PokeAPI', 'small')

def footer(canvas, document):
    canvas.setFont(FONT,8)
    canvas.drawRightString(A4[0]-19*mm, 11*mm, str(document.page))

pdf_path = OUT/'INFORME_GRUPO_6.pdf'
doc=SimpleDocTemplate(str(pdf_path),pagesize=A4,leftMargin=19*mm,rightMargin=19*mm,
    topMargin=16*mm,bottomMargin=16*mm,title='Suite de pruebas de la API CRUD PokeAPI',
    author='Hernan Felipe Patiño Rico; Juan Jose Sabogal Garcia; Orlando Rojas Narvaez')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
pages=len(PdfReader(pdf_path).pages)
print(f'Informe creado: {pages} páginas')
if pages != 5:
    raise RuntimeError(f'Revisar paginación: se esperaban 5 páginas, hay {pages}')

css='body{font:11pt/1.45 Arial,sans-serif;color:#000;background:#fff;max-width:850px;margin:35px auto;padding:0 15px}h1{font-size:16pt}h2{font-size:13pt}table{border-collapse:collapse;width:100%;font-size:10pt;margin:12px 0}td,th{border:1px solid #aaa;padding:7px;text-align:left}th{background:#eee}figure{margin:16px 0}img{max-width:100%}figcaption{font-size:10pt}a{color:#000}@media print{body{margin:0;max-width:none}.pagebreak{break-before:page}}'
(OUT/'INFORME_GRUPO_6.html').write_text('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe Grupo 6</title><style>'+css+'</style></head><body>'+'\n'.join(html)+'</body></html>',encoding='utf-8')
manifest={'generatedAt':datetime.now().astimezone().isoformat(),'images':[]}
for filename,source in [
    ('01-catalogo.png','http://localhost:3000'),
    ('02-pikachu.png','http://localhost:3000'),
    ('03-estadisticas.png','http://localhost:3000'),
    ('04-reporte-pruebas.png','https://github.com/JuanSabogalcl/CRUD-PokeAPI/blob/b9e59f77ca15af45512b37bd767caebcee3ab7e0/docs/pruebas/evidencias/ronda-2-verificacion/REPORTE.md'),
]:
    manifest['images'].append({'file':filename,'source':source,
        'capturedAt':datetime.fromtimestamp((CAP/filename).stat().st_mtime).astimezone().isoformat(),
        'sha256':hashlib.sha256((CAP/filename).read_bytes()).hexdigest()})
(CAP/'fuentes.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
