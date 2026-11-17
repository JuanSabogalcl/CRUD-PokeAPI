// Generador mínimo de documentos Word (.docx) sin dependencias, con el formato APA 7 de trabajos
// de estudiantes: carta, márgenes de 2,54 cm, Times New Roman 12, interlineado doble, sangría de
// primera línea de 1,27 cm y número de página arriba a la derecha.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const TWIP_INCH = 1440;
const EMU_INCH = 914400;
const esc = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Texto con marcas simples: **negrita**, *cursiva* y saltos de línea manuales (\n).
function runs(text, base = {}) {
  if (String(text).includes('\n')) return String(text).split('\n').map((line) => runs(line, base)).join('<w:r><w:br/></w:r>');
  return String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).filter(Boolean).map((part) => {
    const bold = part.startsWith('**');
    const italic = !bold && part.startsWith('*') && part.endsWith('*') && part.length > 2;
    const content = bold ? part.slice(2, -2) : italic ? part.slice(1, -1) : part;
    const props = [base.bold || bold ? '<w:b/>' : '', base.italic || italic ? '<w:i/>' : '',
      base.size ? `<w:sz w:val="${base.size}"/><w:szCs w:val="${base.size}"/>` : ''].join('');
    return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(content)}</w:t></w:r>`;
  }).join('');
}

function para(text, { style = 'Cuerpo', align, keepNext, pageBreakBefore, size, bold, italic, spacingAfter } = {}) {
  const props = [`<w:pStyle w:val="${style}"/>`, keepNext ? '<w:keepNext/>' : '', pageBreakBefore ? '<w:pageBreakBefore/>' : '',
    spacingAfter !== undefined ? `<w:spacing w:after="${spacingAfter}"/>` : '', align ? `<w:jc w:val="${align}"/>` : ''].join('');
  return `<w:p><w:pPr>${props}</w:pPr>${runs(text, { size, bold, italic })}</w:p>`;
}

const pageBreak = () => '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

// Tabla APA: líneas horizontales arriba, bajo el encabezado y al final; sin líneas verticales.
function table(header, rows, widths, { size = 20 } = {}) {
  const total = widths.reduce((sum, width) => sum + width, 0);
  const line = 'w:val="single" w:sz="6" w:space="0" w:color="000000"';
  const cell = (text, width, { head, last } = {}) => `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>`
    + `${head ? `<w:tcBorders><w:bottom ${line}/></w:tcBorders>` : ''}${last ? `<w:tcBorders><w:bottom ${line}/></w:tcBorders>` : ''}`
    + '</w:tcPr>' + String(text).split('\n').map((lineText) => `<w:p><w:pPr><w:pStyle w:val="TablaTexto"/></w:pPr>${runs(lineText, { size, bold: head })}</w:p>`).join('')
    + '</w:tc>';
  const row = (cells, options) => `<w:tr><w:trPr><w:cantSplit/>${options.head ? '<w:tblHeader/>' : ''}</w:trPr>`
    + cells.map((text, index) => cell(text, widths[index], options)).join('') + '</w:tr>';
  return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblBorders><w:top ${line}/></w:tblBorders>`
    + '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>'
    + `<w:tblGrid>${widths.map((width) => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>`
    + row(header, { head: true }) + rows.map((cells, index) => row(cells, { last: index === rows.length - 1 })).join('') + '</w:tbl>';
}

// Dimensiones en píxeles de PNG (IHDR) y JPEG (marcador SOF).
function imageSize(buffer) {
  if (buffer.readUInt32BE(0) === 0x89504e47) return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), type: 'png' };
  let offset = 2;
  while (offset < buffer.length) {
    const marker = buffer.readUInt16BE(offset);
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xffc0 && marker <= 0xffc3) return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7), type: 'jpeg' };
    offset += 2 + length;
  }
  throw new Error('Imagen no reconocida');
}

class DocxBuilder {
  constructor({ title, author }) {
    this.title = title;
    this.author = author;
    this.body = [];
    this.media = [];
  }

  add(...xml) { this.body.push(...xml); return this; }

  // Imagen en línea con ancho máximo en pulgadas.
  image(file, maxWidthInches, maxHeightInches = 8) {
    const buffer = fs.readFileSync(file);
    const { width, height, type } = imageSize(buffer);
    let w = maxWidthInches;
    let h = (height / width) * w;
    if (h > maxHeightInches) { h = maxHeightInches; w = (width / height) * h; }
    const id = this.media.length + 1;
    this.media.push({ name: `image${id}.${type === 'png' ? 'png' : 'jpeg'}`, buffer, rId: `rIdImg${id}` });
    const cx = Math.round(w * EMU_INCH);
    const cy = Math.round(h * EMU_INCH);
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/>`
      + `<wp:docPr id="${id}" name="Imagen ${id}" descr="${esc(path.basename(file))}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>`
      + '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>'
      + `<pic:nvPicPr><pic:cNvPr id="${id}" name="${esc(path.basename(file))}"/><pic:cNvPicPr/></pic:nvPicPr>`
      + `<pic:blipFill><a:blip r:embed="rIdImg${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`
      + `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>`
      + '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }

  // Figura con una o dos imágenes lado a lado y un subtítulo corto bajo cada una.
  figure(images, { width = 6.5, maxHeight = 7.2 } = {}) {
    if (images.length === 1) {
      return `<w:p><w:pPr><w:pStyle w:val="Figura"/><w:keepNext/></w:pPr>${this.image(images[0].file, width, maxHeight)}</w:p>`
        + (images[0].caption ? para(images[0].caption, { style: 'Subtitulo' }) : '');
    }
    const colWidth = Math.floor((width * TWIP_INCH) / 2);
    const cells = images.map(({ file, caption }) => `<w:tc><w:tcPr><w:tcW w:w="${colWidth}" w:type="dxa"/></w:tcPr>`
      + `<w:p><w:pPr><w:pStyle w:val="Figura"/></w:pPr>${this.image(file, width / 2 - 0.12, maxHeight)}</w:p>`
      + (caption ? para(caption, { style: 'Subtitulo' }) : '') + '</w:tc>').join('');
    return `<w:tbl><w:tblPr><w:tblW w:w="${colWidth * 2}" w:type="dxa"/><w:tblLayout w:type="fixed"/>`
      + '<w:tblCellMar><w:left w:w="40" w:type="dxa"/><w:right w:w="40" w:type="dxa"/></w:tblCellMar></w:tblPr>'
      + `<w:tblGrid><w:gridCol w:w="${colWidth}"/><w:gridCol w:w="${colWidth}"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>${cells}</w:tr></w:tbl>`;
  }

  files() {
    const ns = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
    const drawingNs = 'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
    const sectPr = '<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/><w:pgSz w:w="12240" w:h="15840"/>'
      + '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>';
    const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${ns} ${drawingNs}><w:body>${this.body.join('')}${sectPr}</w:body></w:document>`;
    const header = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${ns}><w:p><w:pPr><w:pStyle w:val="Encabezado"/><w:jc w:val="right"/></w:pPr>`
      + '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>'
      + '<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:hdr>';
    const font = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>';
    const style = (id, name, pPr, rPr = '') => `<w:style w:type="paragraph" w:customStyle="1" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr>${pPr}</w:pPr><w:rPr>${rPr}</w:rPr></w:style>`;
    const heading = (level, pPr, rPr) => `<w:style w:type="paragraph" w:styleId="Heading${level}"><w:name w:val="heading ${level}"/><w:basedOn w:val="Normal"/><w:next w:val="Cuerpo"/><w:qFormat/>`
      + `<w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="0" w:after="0" w:line="480" w:lineRule="auto"/>${pPr}<w:outlineLvl w:val="${level - 1}"/></w:pPr><w:rPr>${rPr}</w:rPr></w:style>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${ns}>`
      + `<w:docDefaults><w:rPrDefault><w:rPr>${font}<w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="es-CO"/></w:rPr></w:rPrDefault>`
      + '<w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0" w:line="480" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
      + `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr>${font}</w:rPr></w:style>`
      + style('Cuerpo', 'APA Cuerpo', '<w:ind w:firstLine="720"/>')
      + style('SinSangria', 'APA Sin sangría', '')
      + style('Centrado', 'APA Centrado', '<w:jc w:val="center"/>')
      + style('Rotulo', 'APA Rótulo de tabla o figura', '<w:keepNext/>', '<w:b/>')
      + style('TituloFigura', 'APA Título de tabla o figura', '<w:keepNext/>', '<w:i/>')
      + style('Nota', 'APA Nota', '<w:spacing w:after="240"/>')
      + style('TablaTexto', 'APA Texto de tabla', '<w:spacing w:before="20" w:after="20" w:line="240" w:lineRule="auto"/>')
      + style('Figura', 'APA Figura', '<w:jc w:val="center"/><w:spacing w:before="60" w:after="0" w:line="240" w:lineRule="auto"/>')
      + style('Subtitulo', 'APA Leyenda de imagen', '<w:jc w:val="center"/><w:spacing w:before="20" w:after="80" w:line="240" w:lineRule="auto"/>', '<w:sz w:val="20"/><w:szCs w:val="20"/>')
      + style('Referencia', 'APA Referencia', '<w:ind w:left="720" w:hanging="720"/>')
      + style('Encabezado', 'APA Encabezado', '<w:spacing w:line="240" w:lineRule="auto"/>')
      + heading(1, '<w:jc w:val="center"/>', '<w:b/>')
      + heading(2, '', '<w:b/>')
      + heading(3, '', '<w:b/><w:i/>')
      + '</w:styles>';
    const settings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings ${ns}><w:defaultTabStop w:val="720"/><w:themeFontLang w:val="es-CO"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;
    const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
      + '<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>'
      + '<Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>'
      + this.media.map((m) => `<Relationship Id="${m.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.name}"/>`).join('')
      + '</Relationships>';
    const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    const core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
      + `<dc:title>${esc(this.title)}</dc:title><dc:creator>${esc(this.author)}</dc:creator><dc:language>es-CO</dc:language>`
      + `<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
    const types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>'
      + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
      + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
      + '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>'
      + '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'
      + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>';
    const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
      + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>';
    return [
      ['[Content_Types].xml', types], ['_rels/.rels', rootRels], ['docProps/core.xml', core],
      ['word/document.xml', document], ['word/styles.xml', styles], ['word/settings.xml', settings],
      ['word/header1.xml', header], ['word/_rels/document.xml.rels', rels],
      ...this.media.map((m) => [`word/media/${m.name}`, m.buffer]),
    ];
  }

  save(file) { fs.writeFileSync(file, zip(this.files())); }
}

// Archivo ZIP (formato de .docx) con compresión deflate y CRC-32 de zlib.
function zip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const compressed = zlib.deflateRawSync(data);
    const nameBuffer = Buffer.from(name, 'utf8');
    const crc = zlib.crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
    local.writeUInt32LE(0, 10); local.writeUInt32LE(crc, 14); local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBuffer.length, 26); local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10); central.writeUInt32LE(0, 12); central.writeUInt32LE(crc, 16); central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24); central.writeUInt16LE(nameBuffer.length, 28); central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuffer, compressed);
    centrals.push(central, nameBuffer);
    offset += local.length + nameBuffer.length + compressed.length;
  }
  const centralBuffer = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuffer, end]);
}

module.exports = { DocxBuilder, para, table, pageBreak };
