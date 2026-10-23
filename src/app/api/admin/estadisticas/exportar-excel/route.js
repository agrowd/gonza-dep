import zlib from 'zlib';

// Tabla CRC32 estándar (IEEE 802.3) para contenedores ZIP / OpenXML (.xlsx)
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Empaqueta archivos en un contenedor ZIP estándar con compresión DEFLATE (Method 8),
 * requerido por lectores móviles (Google Sheets Android/iOS, Excel Mobile, WPS Office) y de escritorio.
 */
function createZipBuffer(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const uncompressedBuf = Buffer.isBuffer(file.content)
      ? file.content
      : Buffer.from(file.content, 'utf8');
    const compressedBuf = zlib.deflateRawSync(uncompressedBuf, { level: 6 });
    const crc = crc32(uncompressedBuf);

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Signature
    localHeader.writeUInt16LE(20, 4);         // Version needed (2.0)
    localHeader.writeUInt16LE(0, 6);          // General purpose bit flag
    localHeader.writeUInt16LE(8, 8);          // Compression method: 8 (DEFLATE)
    localHeader.writeUInt16LE(0x4000, 10);    // Last mod file time
    localHeader.writeUInt16LE(0x5954, 12);    // Last mod file date
    localHeader.writeUInt32LE(crc, 14);       // CRC-32
    localHeader.writeUInt32LE(compressedBuf.length, 18);   // Compressed size
    localHeader.writeUInt32LE(uncompressedBuf.length, 22); // Uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26);         // File name length
    localHeader.writeUInt16LE(0, 28);                      // Extra field length

    localParts.push(localHeader, nameBuf, compressedBuf);

    // Central directory file header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Signature
    centralHeader.writeUInt16LE(20, 4);         // Version made by
    centralHeader.writeUInt16LE(20, 6);         // Version needed
    centralHeader.writeUInt16LE(0, 8);          // General purpose bit flag
    centralHeader.writeUInt16LE(8, 10);         // Compression method: 8 (DEFLATE)
    centralHeader.writeUInt16LE(0x4000, 12);    // Last mod file time
    centralHeader.writeUInt16LE(0x5954, 14);    // Last mod file date
    centralHeader.writeUInt32LE(crc, 16);       // CRC-32
    centralHeader.writeUInt32LE(compressedBuf.length, 20);   // Compressed size
    centralHeader.writeUInt32LE(uncompressedBuf.length, 24); // Uncompressed size
    centralHeader.writeUInt16LE(nameBuf.length, 28);         // File name length
    centralHeader.writeUInt16LE(0, 30);                      // Extra field length
    centralHeader.writeUInt16LE(0, 32);                      // File comment length
    centralHeader.writeUInt16LE(0, 34);                      // Disk number start
    centralHeader.writeUInt16LE(0, 36);                      // Internal file attributes
    centralHeader.writeUInt32LE(0, 38);                      // External file attributes
    centralHeader.writeUInt32LE(offset, 42);                 // Relative offset of local header

    centralParts.push(centralHeader, nameBuf);
    offset += 30 + nameBuf.length + compressedBuf.length;
  }

  const centralDirSize = centralParts.reduce((acc, b) => acc + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);          // EOCD signature
  eocd.writeUInt16LE(0, 4);                   // Number of this disk
  eocd.writeUInt16LE(0, 6);                   // Disk where central directory starts
  eocd.writeUInt16LE(files.length, 8);        // Number of central directory records on this disk
  eocd.writeUInt16LE(files.length, 10);       // Total number of central directory records
  eocd.writeUInt32LE(centralDirSize, 12);     // Size of central directory
  eocd.writeUInt32LE(offset, 16);             // Offset of start of central directory
  eocd.writeUInt16LE(0, 20);                  // Comment length

  return Buffer.concat([...localParts, ...centralParts, eocd]);
}

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colLetter(colIdx1Based) {
  let n = colIdx1Based;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - m) / 26);
  }
  return s;
}

function formatDateDisplay(yyyyMmDd) {
  if (!yyyyMmDd) return '-';
  const parts = String(yyyyMmDd).split('-');
  if (parts.length !== 3) return String(yyyyMmDd);
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Definición de estilos OpenXML (cellXfs):
 * 0: Default Normal
 * 1: Title Banner (#6B1D1D bg, White 13pt Bold, Center, Border)
 * 2: Date Label (#D6C8B4 bg, Black 10pt Bold, Center, Border)
 * 3: Date Value (#FFFFFF bg, Black 10pt, Center, Border)
 * 4: Table Header (#1F2D3D bg, White 10pt Bold, Center, Border)
 * 5: Data Text Even (#F1F5F9 bg, Black 10pt, Left, Border)
 * 6: Data Text Odd (#FFFFFF bg, Black 10pt, Left, Border)
 * 7: Data Center Even (#F1F5F9 bg, Black 10pt, Center, Border)
 * 8: Data Center Odd (#FFFFFF bg, Black 10pt, Center, Border)
 * 9: Data Currency Even (#F1F5F9 bg, Black 10pt, Right, Currency "$ "#,##0, Border)
 * 10: Data Currency Odd (#FFFFFF bg, Black 10pt, Right, Currency "$ "#,##0, Border)
 * 11: Summary Header (#6B1D1D bg, White 10pt Bold, Left, Border)
 * 12: Summary Header Center (#6B1D1D bg, White 10pt Bold, Center, Border)
 * 13: Summary Label (#F4EFE6 bg, Black 10pt, Left, Border)
 * 14: Summary Integer Value (#FFFFFF bg, Black 10pt Bold, Right, Int #,##0, Border)
 * 15: Summary Currency Value (#FFFFFF bg, Black 10pt Bold, Right, Currency "$ "#,##0, Border)
 * 16: Footer Note Italic (No bg, Gray #555555 9pt Italic, Left, No border)
 */
function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0;&quot;-$&quot;#,##0;&quot;$&quot;0"/>
    <numFmt numFmtId="165" formatCode="#,##0"/>
  </numFmts>
  <fonts count="6">
    <font><sz val="10"/><color rgb="FF1D1D1D"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="13"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="FF1D1D1D"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
    <font><i/><sz val="9"/><color rgb="FF555555"/><name val="Calibri"/><family val="2"/></font>
    <font><sz val="10"/><color rgb="FF1D1D1D"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="8">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF6B1D1D"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD6C8B4"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1F2D3D"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF4EFE6"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FFB8A890"/></left>
      <right style="thin"><color rgb="FFB8A890"/></right>
      <top style="thin"><color rgb="FFB8A890"/></top>
      <bottom style="thin"><color rgb="FFB8A890"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="17">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="7" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="165" fontId="2" fillId="4" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="164" fontId="2" fillId="4" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;
}

export async function POST(request) {
  try {
    let body = {};
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      const rawPayload = formData.get('payload');
      if (rawPayload) {
        body = JSON.parse(String(rawPayload));
      }
    }

    const {
      startDate = '',
      endDate = '',
      selectedMetric = 'realizados',
      summary = {},
      items = []
    } = body;

    const isModelA = summary.model === 'A';
    const isGananciaNeta = selectedMetric === 'gananciaNeta' || summary.title?.includes('GANANCIA NETA');

    function getEstadoTurnoLabel(item) {
      if (!item) return '-';
      if (item.estadoTurnoLabel) return item.estadoTurnoLabel;
      if (item.subtipoGanancia) {
        if (item.subtipoGanancia.includes('siguiente') && !item.subtipoGanancia.includes('sin siguiente')) {
          return 'Turno siguiente';
        }
        if (item.subtipoGanancia.includes('sin siguiente')) {
          return 'Realizado (Sin sig. turno)';
        }
        if (item.subtipoGanancia.includes('nuevo')) {
          return 'Turno nuevo (Señado)';
        }
      }
      if (item.subEstado === 'SIGUIENTE_TURNO') return 'Turno siguiente';
      if (item.subEstado === 'VA_A_AVISAR') return 'Va a avisar';
      if (item.subEstado === 'MANTENIMIENTO') return 'Mantenimiento';
      if (item.subEstado === 'FINALIZADO') return 'Finalizó';
      if (item.estado === 'SEÑADO') return 'Señado';
      if (item.estado === 'REPROGRAMADO') return 'Reprogramado';
      if (item.estado === 'PENDIENTE_AUTORIZACION') return 'Pendiente aut.';
      if (item.estado === 'CANCELADO') return 'Cancelado';
      if (item.estado === 'NO_ASISTIO') return 'Ausente';
      if (item.estado === 'REALIZADO') return 'Realizado';
      return item.ultimoEstadoLabel || item.estado || '-';
    }

    // Shared Strings registry (strictly compatible with all mobile viewers)
    const sharedStrings = [];
    const sharedStringMap = new Map();
    function getStringIdx(str) {
      const s = String(str ?? '');
      if (sharedStringMap.has(s)) return sharedStringMap.get(s);
      const idx = sharedStrings.length;
      sharedStrings.push(s);
      sharedStringMap.set(s, idx);
      return idx;
    }

    const rows = [];
    const merges = [];
    let currentRow = 1;

    // Helper to add a row with cells sorted by col index (1..10)
    function pushRow(rowNum, height, cellDefs) {
      const sorted = [...cellDefs].sort((a, b) => a.col - b.col);
      const cellsXml = sorted.map(c => {
        const ref = `${colLetter(c.col)}${rowNum}`;
        const styleAttr = c.style !== undefined ? ` s="${c.style}"` : '';
        if (c.type === 'n') {
          const numVal = Number.isFinite(Number(c.value)) ? Number(c.value) : 0;
          return `<c r="${ref}"${styleAttr} t="n"><v>${numVal}</v></c>`;
        } else if (c.type === 's') {
          const sIdx = getStringIdx(c.value);
          return `<c r="${ref}"${styleAttr} t="s"><v>${sIdx}</v></c>`;
        } else {
          // Empty styled cell (e.g. inside merged range)
          return `<c r="${ref}"${styleAttr}/>`;
        }
      }).join('');
      const htAttr = height ? ` ht="${height}" customHeight="1"` : '';
      rows.push(`<row r="${rowNum}"${htAttr}>${cellsXml}</row>`);
    }

    // 1. Row 1: Title Banner (Merged A1:J1)
    const titleCells = [{ col: 1, type: 's', value: summary.title || 'INFORME DE ESTADÍSTICAS', style: 1 }];
    for (let c = 2; c <= 10; c++) titleCells.push({ col: c, type: 'empty', style: 1 });
    pushRow(currentRow, 28, titleCells);
    merges.push(`A${currentRow}:J${currentRow}`);
    currentRow++;

    // 2. Row 2: Date Range ("Desde" | startDate | "Hasta" | endDate)
    pushRow(currentRow, 20, [
      { col: 1, type: 's', value: 'Desde', style: 2 },
      { col: 2, type: 's', value: formatDateDisplay(startDate), style: 3 },
      { col: 3, type: 's', value: 'Hasta', style: 2 },
      { col: 4, type: 's', value: formatDateDisplay(endDate), style: 3 }
    ]);
    currentRow++;

    // 3. Row 3: Blank spacer row
    currentRow++;

    // 4. Row 4: Main Table Header (#1F2D3D Dark Navy with White Bold Text)
    const isModelC = summary.model === 'C';
    const headers = isModelC
      ? [
          'Día Cumpleaños',
          'Mes',
          'Cliente',
          'Edad',
          'WhatsApp',
          'Email',
          'Canal de Origen',
          'Estado',
          'Notif. Email',
          'Notif. WhatsApp'
        ]
      : isModelA
      ? [
          'Fecha de turno',
          'Hora',
          'Cliente',
          'Origen',
          'Tipo de pago',
          isGananciaNeta ? 'Ingreso real' : 'Valor final',
          isGananciaNeta ? 'Seña cobrada' : 'Seña aplicada',
          'Estado de turno',
          'Zonas',
          'Operador'
        ]
      : [
          'Fecha de turno',
          'Hora',
          'Cliente',
          'Último estado',
          'Tipo de valor',
          'Valor',
          'Seña del turno',
          'Seña retenida',
          'Oportunidad no concretada',
          'Operador'
        ];

    pushRow(
      currentRow,
      24,
      headers.map((h, i) => ({ col: i + 1, type: 's', value: h, style: 4 }))
    );
    currentRow++;

    // 5. Data Rows
    items.forEach((item, idx) => {
      const isEven = idx % 2 === 0;
      const sText = isEven ? 5 : 6;
      const sCenter = isEven ? 7 : 8;
      const sCurr = isEven ? 9 : 10;

      if (isModelC) {
        pushRow(currentRow, 19, [
          { col: 1, type: 's', value: String(item.diaCumple || item.diaMesCompact || '-'), style: sCenter },
          { col: 2, type: 's', value: item.mesCumple || '-', style: sCenter },
          { col: 3, type: 's', value: item.clienteNombre || '-', style: sText },
          { col: 4, type: 's', value: item.edad ? `${item.edad} años` : '-', style: sCenter },
          { col: 5, type: 's', value: item.whatsapp || '-', style: sCenter },
          { col: 6, type: 's', value: item.email || '-', style: sText },
          { col: 7, type: 's', value: item.canalAdquisicion || 'Orgánico', style: sText },
          { col: 8, type: 's', value: item.estado || 'Activo', style: sCenter },
          { col: 9, type: 's', value: item.notifEmail ? 'Activo' : 'Inactivo', style: sCenter },
          { col: 10, type: 's', value: item.notifWhatsapp ? 'Activo' : 'Inactivo', style: sCenter }
        ]);
      } else if (isModelA) {
        const vFinal = isGananciaNeta
          ? Number(item.ingresoCobradoPeriodo ?? item.valorTotal ?? 0)
          : Number(item.valorTotal || 0);
        const vSena = isGananciaNeta
          ? Number(item.señaCobradaPeriodo ?? 0)
          : Number(item.valorSeña || 0);
        const estadoTurno = getEstadoTurnoLabel(item);

        pushRow(currentRow, 19, [
          { col: 1, type: 's', value: formatDateDisplay(item.fecha), style: sCenter },
          { col: 2, type: 's', value: item.horaInicio || '-', style: sCenter },
          { col: 3, type: 's', value: item.clienteNombre || '-', style: sText },
          { col: 4, type: 's', value: item.origenCategoria || 'Orgánico', style: sText },
          { col: 5, type: 's', value: item.metodoPagoLabel || 'Transferencia', style: sText },
          { col: 6, type: 'n', value: vFinal, style: sCurr },
          { col: 7, type: 'n', value: vSena, style: sCurr },
          { col: 8, type: 's', value: estadoTurno, style: sCenter },
          { col: 9, type: 's', value: item.zonasTexto || '-', style: sText },
          { col: 10, type: 's', value: item.operadorNombre || 'Gonzalo', style: sText }
        ]);
      } else {
        const val = Number(item.valorTotal || 0);
        const senaT = Number(item.señaDelTurnoReporte ?? item.valorSeña ?? 0);
        const ret = Number(item.señaRetenida || 0);
        const opNoConc = Number(item.oportunidadNoConcretada ?? Math.max(0, val - ret));

        pushRow(currentRow, 19, [
          { col: 1, type: 's', value: formatDateDisplay(item.fecha), style: sCenter },
          { col: 2, type: 's', value: item.horaInicio || '-', style: sCenter },
          { col: 3, type: 's', value: item.clienteNombre || '-', style: sText },
          { col: 4, type: 's', value: item.ultimoEstadoLabel || item.estado || '-', style: sText },
          { col: 5, type: 's', value: item.tipoValor || 'Turno no realizado', style: sText },
          { col: 6, type: 'n', value: val, style: sCurr },
          { col: 7, type: 'n', value: senaT, style: sCurr },
          { col: 8, type: 'n', value: ret, style: sCurr },
          { col: 9, type: 'n', value: opNoConc, style: sCurr },
          { col: 10, type: 's', value: item.operadorNombre || 'Gonzalo', style: sText }
        ]);
      }
      currentRow++;
    });

    // 6. Blank spacer row before Summary
    currentRow++;

    // 7. Summary Header Row
    pushRow(currentRow, 22, [
      { col: 1, type: 's', value: 'RESUMEN DEL PERÍODO', style: 11 },
      { col: 2, type: 'empty', style: 11 },
      { col: 3, type: 's', value: isModelA ? 'VALOR' : 'CANTIDAD', style: 12 },
      { col: 6, type: 's', value: 'IMPORTES', style: 11 },
      { col: 7, type: 'empty', style: 11 },
      { col: 8, type: 's', value: 'TOTAL', style: 12 }
    ]);
    merges.push(`A${currentRow}:B${currentRow}`);
    merges.push(`F${currentRow}:G${currentRow}`);
    currentRow++;

    // 8. Summary Body Rows
    if (isModelC) {
      const modelCRows = [
        { leftLabel: 'Cantidad de cumpleañeros', leftVal: summary.cantidadCumpleaneros || items.length, rightLabel: 'Canal de envío', rightVal: 'Únicamente por Email' },
        { leftLabel: 'Clientes con Email activo', leftVal: summary.conEmail || 0, rightLabel: 'Horario del cron', rightVal: '10:00 AM (Día de cumpleaños)' },
        { leftLabel: 'Clientes con WhatsApp registrado', leftVal: summary.conWpp || 0, rightLabel: 'Plantilla de saludo', rightVal: 'email_birthday_body' }
      ];

      for (const r of modelCRows) {
        const rowCells = [];
        rowCells.push(
          { col: 1, type: 's', value: r.leftLabel, style: 13 },
          { col: 2, type: 'empty', style: 13 },
          { col: 3, type: typeof r.leftVal === 'number' ? 'n' : 's', value: r.leftVal, style: 14 }
        );
        merges.push(`A${currentRow}:B${currentRow}`);

        rowCells.push(
          { col: 6, type: 's', value: r.rightLabel, style: 13 },
          { col: 7, type: 'empty', style: 13 },
          { col: 8, type: 's', value: r.rightVal, style: 13 }
        );
        merges.push(`F${currentRow}:G${currentRow}`);
        pushRow(currentRow, 19, rowCells);
        currentRow++;
      }
    } else if (isModelA) {
      const modelARows = [
        { leftLabel: 'Cantidad de turnos', leftVal: summary.cantidadTurnos || 0, rightLabel: isGananciaNeta ? 'Ingreso total real' : 'Valor total de turnos', rightVal: summary.valorTotalTurnos || 0 },
        { leftLabel: 'Cantidad de clientes únicos', leftVal: summary.cantidadClientesUnicos || 0, rightLabel: isGananciaNeta ? 'Total señas cobradas' : 'Total de señas aplicadas', rightVal: summary.totalSenasAplicadas || 0 },
        { leftLabel: 'Clientes de Orgánico', leftVal: summary.clientesOrganico || 0, rightLabel: isGananciaNeta ? 'Total saldos cobrados' : 'Total de saldos', rightVal: summary.totalSaldos || 0 },
        { leftLabel: 'Clientes de Redes sociales', leftVal: summary.clientesRedes || 0, rightLabel: isGananciaNeta ? 'Ingresos en efectivo' : 'Valor en efectivo', rightVal: summary.valorEfectivo || 0 },
        { leftLabel: 'Clientes de Publicidad', leftVal: summary.clientesPublicidad || 0, rightLabel: isGananciaNeta ? 'Ingresos en transferencia' : 'Valor en transferencia', rightVal: summary.valorTransferencia || 0 },
        { leftLabel: null, leftVal: null, rightLabel: 'Ticket promedio por cliente', rightVal: summary.ticketPromedioCliente || 0 }
      ];

      for (const r of modelARows) {
        const rowCells = [];
        if (r.leftLabel !== null) {
          rowCells.push(
            { col: 1, type: 's', value: r.leftLabel, style: 13 },
            { col: 2, type: 'empty', style: 13 },
            { col: 3, type: 'n', value: r.leftVal, style: 14 }
          );
          merges.push(`A${currentRow}:B${currentRow}`);
        }
        if (r.rightLabel !== null) {
          rowCells.push(
            { col: 6, type: 's', value: r.rightLabel, style: 13 },
            { col: 7, type: 'empty', style: 13 },
            { col: 8, type: 'n', value: r.rightVal, style: 15 }
          );
          merges.push(`F${currentRow}:G${currentRow}`);
        }
        pushRow(currentRow, 19, rowCells);
        currentRow++;
      }
    } else {
      const modelBRows = [
        { leftLabel: 'Cantidad de clientes', leftVal: summary.cantidadClientes || 0, rightLabel: 'Valor de referencia total', rightVal: summary.valorReferenciaTotal || 0 },
        { leftLabel: 'Clientes ausentes', leftVal: summary.clientesAusentes || 0, rightLabel: 'Total de señas retenidas', rightVal: summary.totalSenasRetenidas || 0 },
        { leftLabel: 'Clientes va a avisar', leftVal: summary.clientesVaAAvisar || 0, rightLabel: 'Oportunidad total no concretada', rightVal: summary.oportunidadTotalNoConcretada || 0 },
        { leftLabel: 'Clientes cancelados', leftVal: summary.clientesCancelados || 0, rightLabel: null, rightVal: null },
        { leftLabel: 'Clientes mantenimiento', leftVal: summary.clientesMantenimiento || 0, rightLabel: null, rightVal: null },
        { leftLabel: 'Clientes finalizados', leftVal: summary.clientesFinalizados || 0, rightLabel: null, rightVal: null }
      ];

      for (const r of modelBRows) {
        const rowCells = [];
        if (r.leftLabel !== null) {
          rowCells.push(
            { col: 1, type: 's', value: r.leftLabel, style: 13 },
            { col: 2, type: 'empty', style: 13 },
            { col: 3, type: 'n', value: r.leftVal, style: 14 }
          );
          merges.push(`A${currentRow}:B${currentRow}`);
        }
        if (r.rightLabel !== null) {
          rowCells.push(
            { col: 6, type: 's', value: r.rightLabel, style: 13 },
            { col: 7, type: 'empty', style: 13 },
            { col: 8, type: 'n', value: r.rightVal, style: 15 }
          );
          merges.push(`F${currentRow}:G${currentRow}`);
        }
        pushRow(currentRow, 19, rowCells);
        currentRow++;
      }

      // Footer Note Row for Model B
      const noteCells = [
        {
          col: 1,
          type: 's',
          value: 'Seña retenida: importe perdido; 0 si quedó guardada. En seguimiento se toma el valor de la última sesión, sin descontar su seña.',
          style: 16
        }
      ];
      for (let c = 2; c <= 10; c++) noteCells.push({ col: c, type: 'empty', style: 16 });
      pushRow(currentRow, 19, noteCells);
      merges.push(`A${currentRow}:J${currentRow}`);
      currentRow++;
    }

    const lastRow = currentRow - 1;
    const colWidths = [15, 11, 28, 19, 22, 16, 16, 24, 28, 16];
    const colsXml = colWidths
      .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
      .join('');

    const mergesXml = merges.length > 0
      ? `<mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
      : '';

    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:J${lastRow}"/>
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0"/>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${colsXml}</cols>
  <sheetData>${rows.join('')}</sheetData>
  ${mergesXml}
</worksheet>`;

    const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">
  ${sharedStrings.map(s => `<si><t xml:space="preserve">${escapeXml(s)}</t></si>`).join('')}
</sst>`;

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Informe" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

    const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

    const nowIso = new Date().toISOString();
    const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(summary.title || 'Informe')}</dc:title>
  <dc:creator>Gonzalo Depilación Masculina</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:modified>
</cp:coreProperties>`;

    const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Excel</Application>
</Properties>`;

    const zipBuffer = createZipBuffer([
      { name: '[Content_Types].xml', content: contentTypesXml },
      { name: '_rels/.rels', content: rootRelsXml },
      { name: 'docProps/core.xml', content: coreXml },
      { name: 'docProps/app.xml', content: appXml },
      { name: 'xl/workbook.xml', content: workbookXml },
      { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
      { name: 'xl/styles.xml', content: buildStylesXml() },
      { name: 'xl/sharedStrings.xml', content: sharedStringsXml },
      { name: 'xl/worksheets/sheet1.xml', content: sheetXml }
    ]);

    const safeFilename = `Informe_${selectedMetric}_${startDate}_al_${endDate}.xlsx`.replace(/[^a-zA-Z0-9._-]/g, '_');

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Content-Length': String(zipBuffer.length),
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Error generando archivo XLSX:', error);
    return Response.json({ error: 'Error al generar el archivo Excel (.xlsx)' }, { status: 500 });
  }
}
