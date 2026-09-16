"""Exportación opcional del plan. Requiere reportlab y pypdf.
No se necesita Python para ejecutar la aplicación ni las pruebas.
"""
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
folder = root / 'docs' / 'pruebas'
html = (folder / 'PLAN_MINIMO.html').read_text(encoding='utf-8')
html = re.sub(r'<!doctype[^>]*>', '', html, flags=re.I)
html = re.sub(r'<meta([^>]+)>', r'<meta\1/>', html)
body = ET.fromstring(html).find('body')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='PlanBody', fontName='Helvetica', fontSize=9, leading=11.7, spaceAfter=4))
styles.add(ParagraphStyle(name='PlanTitle', fontName='Helvetica-Bold', fontSize=20, leading=23, textColor=colors.HexColor('#163b66'), spaceAfter=5))
styles.add(ParagraphStyle(name='PlanHeading', fontName='Helvetica-Bold', fontSize=10.5, leading=13, textColor=colors.HexColor('#163b66'), spaceBefore=8, spaceAfter=3))
styles.add(ParagraphStyle(name='PlanSmall', fontName='Helvetica', fontSize=8, leading=10, textColor=colors.HexColor('#475569'), spaceAfter=4))
styles.add(ParagraphStyle(name='PlanCell', fontName='Helvetica', fontSize=8, leading=10))

def text(tag):
    value = ' '.join(''.join(tag.itertext()).split())
    return value.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('–', '-').replace('—', '-')

story = []
header = body.find('header')
story.append(Paragraph('FET · Optativa II · Semana 7 · Grupo 6', styles['PlanSmall']))
story.append(Paragraph(text(header.find('h1')), styles['PlanTitle']))
story.append(Paragraph(text(header.find('p')), styles['PlanBody']))
story.append(Paragraph(text(header.findall('div')[-1]), styles['PlanSmall']))
for node in body:
    if node.tag == 'h2':
        story.append(Paragraph(text(node), styles['PlanHeading']))
    elif node.tag == 'p':
        story.append(Paragraph(text(node), styles['PlanBody']))
    elif node.tag == 'table':
        rows = [[Paragraph(text(cell), styles['PlanCell']) for cell in row] for row in node.iter('tr')]
        table = Table(rows, colWidths=[88*mm, 9*mm, 9*mm, 13*mm, 61*mm])
        table.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#edf2f7')),
            ('GRID',(0,0),(-1,-1),.4,colors.HexColor('#cbd5df')),
            ('VALIGN',(0,0),(-1,-1),'TOP'),
            ('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),
            ('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),
        ]))
        story.append(table)
    elif node.tag == 'footer':
        story.append(Spacer(1, 6))
        story.append(Paragraph(text(node), styles['PlanSmall']))

output = folder / 'PLAN_MINIMO.pdf'
doc = SimpleDocTemplate(str(output), pagesize=A4, leftMargin=15*mm, rightMargin=15*mm,
    topMargin=12*mm, bottomMargin=12*mm, title='Plan mínimo de pruebas - Grupo 6', author='Grupo 6')
doc.build(story)
pages = len(PdfReader(output).pages)
assert pages == 1, f'El plan debe tener 1 página; tiene {pages}'
print(f'PDF verificado: {pages} página, {output}')
