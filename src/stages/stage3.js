// ================= STAGE 3 (Execution) — Refatorado =================

(function() {
  const component = this
  const textEncoder = new TextEncoder()
  const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

  function createFallbackStore() {
    return {
      data: {},
      set(key, value) {
        if (typeof key === 'object' && key !== null) {
          Object.assign(this.data, key)
        } else {
          this.data[key] = value
        }
      },
      get(key) {
        return this.data[key]
      },
      keys() {
        return Object.keys(this.data)
      },
      commit(payload) {
        if (payload && typeof payload === 'object') {
          this.set(payload)
        }
      },
      show() {
        console.log('store contents:', this.data)
      }
    }
  }

  if (typeof window.datastore === 'undefined' || typeof window.datastore.get !== 'function') {
    console.warn('window.datastore não encontrado em Stage 3. Criando fallback.')
    window.datastore = createFallbackStore()
  }

  if (typeof window.datastore_objs === 'undefined' || typeof window.datastore_objs.get !== 'function') {
    console.warn('window.datastore_objs não encontrado em Stage 3. Criando fallback.')
    window.datastore_objs = createFallbackStore()
  }

  if (typeof window.datastore.keys !== 'function') {
    window.datastore.keys = function() {
      return Object.keys(this.entries || this.data || {})
    }
  }

  if (typeof window.datastore_objs.keys !== 'function') {
    window.datastore_objs.keys = function() {
      return Object.keys(this.entries || this.data || {})
    }
  }

  const form = document.getElementById('experiment-form')
  const instructionCopy = document.getElementById('instruction-copy')
  const stimuliGrid = document.getElementById('stimuli-grid')
  const selectedGrid = document.getElementById('selected-grid')

  const progressSequence = document.getElementById('progress-sequence')
  const attemptCountDisplay = document.getElementById('attempt-count')
  const clueProgressDisplay = document.getElementById('clue-progress')
  const elapsedDisplay = document.getElementById('elapsed-display')

  const statusSequenceChip = document.getElementById('status-sequence-chip')
  const statusReasonChip = document.getElementById('status-reason-chip')

  const scoreCorrect = document.getElementById('score-correct')
  const scoreIncorrect = document.getElementById('score-incorrect')

  const criteriaTime = document.getElementById('criteria-time')
  const criteriaCorrect = document.getElementById('criteria-correct')
  const criteriaErrors = document.getElementById('criteria-errors')
  const criteriaAttempts = document.getElementById('criteria-attempts')

  const finishSubmit = document.getElementById('finish-submit')
  const finalOverlay = document.getElementById('final-overlay')
  const finalOverlayText = document.getElementById('final-overlay-text')
  const finalOverlayReason = document.getElementById('final-overlay-reason')
  const finalOverlayTime = document.getElementById('final-overlay-time')
  const finalOverlayAttempts = document.getElementById('final-overlay-attempts')
  const finalOverlayFootnote = document.getElementById('final-overlay-footnote')

  const clueOverlay = document.getElementById('clue-overlay')
  const clueList = document.getElementById('clue-list')
  const clueResponseInput = document.getElementById('clue-response-input')
  const clueSaveButton = document.getElementById('clue-save-button')
  const clueDialogText = document.getElementById('clue-dialog-text')

  const feedbackAudio = document.getElementById('feedback-audio')

  const finalLogField = document.getElementById('final-log-field')
  const resultsJsonField = document.getElementById('results-json-field')
  const endReasonField = document.getElementById('end-reason-field')
  const totalTimeField = document.getElementById('total-time-field')
  const totalAttemptsField = document.getElementById('total-attempts-field')
  const totalCorrectField = document.getElementById('total-correct-field')
  const totalIncorrectField = document.getElementById('total-incorrect-field')

  function toBoolean(value) {
    return value === true || value === 'true' || value === 1 || value === '1'
  }

  function parseIntegerOr(value, fallback) {
    if (value === '' || value === null || typeof value === 'undefined') {
      return fallback
    }
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  function naturalEloCompare(a, b) {
    const extractNumber = (text) => {
      const match = String(text).match(/Elo\s+(\d+)/i)
      return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER
    }
    const aNumber = extractNumber(a)
    const bNumber = extractNumber(b)
    if (aNumber !== bNumber) {
      return aNumber - bNumber
    }
    return String(a).localeCompare(String(b), 'pt-BR')
  }

  function getDateTimeString(date) {
    const now = date instanceof Date ? date : new Date()
    const datePart = now.toLocaleDateString('pt-BR')
    const timePart = now.toLocaleTimeString('pt-BR')
    return `${datePart} ${timePart}`
  }

  function formatDuration(totalSeconds) {
    const safeSeconds = Math.max(0, parseIntegerOr(totalSeconds, 0))
    const hours = Math.floor(safeSeconds / 3600)
    const minutes = Math.floor((safeSeconds % 3600) / 60)
    const seconds = safeSeconds % 60
    const parts = []

    if (hours > 0) {
      parts.push(`${hours}h`)
    }
    if (minutes > 0 || hours > 0) {
      parts.push(`${minutes}m`)
    }
    parts.push(`${seconds}s`)
    return parts.join(' ')
  }

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
  }

  function formatFilenameTimestamp(date) {
    const now = date instanceof Date ? date : new Date()
    const pad = (value) => String(value).padStart(2, '0')
    return [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate())
    ].join('') + '_' + [
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds())
    ].join('')
  }

  function sanitizeFileSegment(value, fallback) {
    const base = String(value || fallback || 'resultado').trim() || String(fallback || 'resultado')
    const normalized = base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()

    return normalized || String(fallback || 'resultado')
  }

  function downloadTextFile(filename, text, mimeType) {
    const blob = new Blob([text], { type: mimeType || 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  function downloadBlobFile(filename, blob) {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  function dataUrlToUint8Array(dataUrl) {
    const base64 = String(dataUrl || '').split(',')[1] || ''
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  }

  function xmlEscape(value) {
    return String(value ?? '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  function cell(value, style, type) {
    return {
      value,
      style: typeof style === 'number' ? style : 0,
      type: type || 'auto'
    }
  }

  function looksLikeImage(value) {
    return /\.(png|jpg|jpeg|bmp|gif|webp)$/i.test(String(value || '').trim())
  }

  function getAssetUrl(filename) {
    if (component.files && component.files[filename]) {
      return component.files[filename]
    }
    return filename
  }

  function playAudio(filePath) {
    if (!filePath) {
      return
    }
    feedbackAudio.src = filePath
    feedbackAudio.play().catch((error) => {
      console.log('Falha ao reproduzir áudio:', error)
    })
  }

  function buildCrc32Table() {
    const table = new Uint32Array(256)
    for (let index = 0; index < 256; index += 1) {
      let crc = index
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1)
      }
      table[index] = crc >>> 0
    }
    return table
  }

  const CRC32_TABLE = buildCrc32Table()

  function crc32(bytes) {
    let crc = 0xffffffff
    for (let index = 0; index < bytes.length; index += 1) {
      crc = CRC32_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8)
    }
    return (crc ^ 0xffffffff) >>> 0
  }

  function concatUint8Arrays(parts) {
    const totalLength = parts.reduce((sum, part) => sum + part.length, 0)
    const output = new Uint8Array(totalLength)
    let offset = 0
    parts.forEach((part) => {
      output.set(part, offset)
      offset += part.length
    })
    return output
  }

  function toDosDateTime(date) {
    const safeDate = date instanceof Date ? date : new Date()
    const year = Math.max(1980, safeDate.getFullYear())
    const dosTime = (safeDate.getHours() << 11) | (safeDate.getMinutes() << 5) | Math.floor(safeDate.getSeconds() / 2)
    const dosDate = ((year - 1980) << 9) | ((safeDate.getMonth() + 1) << 5) | safeDate.getDate()
    return { dosTime, dosDate }
  }

  function createZip(entries) {
    const localParts = []
    const centralParts = []
    let offset = 0
    const { dosTime, dosDate } = toDosDateTime(new Date())

    entries.forEach((entry) => {
      const nameBytes = textEncoder.encode(entry.name)
      const dataBytes = entry.data instanceof Uint8Array ? entry.data : textEncoder.encode(String(entry.data))
      const checksum = crc32(dataBytes)

      const localHeader = new Uint8Array(30)
      const localView = new DataView(localHeader.buffer)
      localView.setUint32(0, 0x04034b50, true)
      localView.setUint16(4, 20, true)
      localView.setUint16(6, 0, true)
      localView.setUint16(8, 0, true)
      localView.setUint16(10, dosTime, true)
      localView.setUint16(12, dosDate, true)
      localView.setUint32(14, checksum, true)
      localView.setUint32(18, dataBytes.length, true)
      localView.setUint32(22, dataBytes.length, true)
      localView.setUint16(26, nameBytes.length, true)
      localView.setUint16(28, 0, true)

      localParts.push(localHeader, nameBytes, dataBytes)

      const centralHeader = new Uint8Array(46)
      const centralView = new DataView(centralHeader.buffer)
      centralView.setUint32(0, 0x02014b50, true)
      centralView.setUint16(4, 20, true)
      centralView.setUint16(6, 20, true)
      centralView.setUint16(8, 0, true)
      centralView.setUint16(10, 0, true)
      centralView.setUint16(12, dosTime, true)
      centralView.setUint16(14, dosDate, true)
      centralView.setUint32(16, checksum, true)
      centralView.setUint32(20, dataBytes.length, true)
      centralView.setUint32(24, dataBytes.length, true)
      centralView.setUint16(28, nameBytes.length, true)
      centralView.setUint16(30, 0, true)
      centralView.setUint16(32, 0, true)
      centralView.setUint16(34, 0, true)
      centralView.setUint16(36, 0, true)
      centralView.setUint32(38, 0, true)
      centralView.setUint32(42, offset, true)

      centralParts.push(centralHeader, nameBytes)
      offset += localHeader.length + nameBytes.length + dataBytes.length
    })

    const centralDirectory = concatUint8Arrays(centralParts)
    const endRecord = new Uint8Array(22)
    const endView = new DataView(endRecord.buffer)
    endView.setUint32(0, 0x06054b50, true)
    endView.setUint16(4, 0, true)
    endView.setUint16(6, 0, true)
    endView.setUint16(8, entries.length, true)
    endView.setUint16(10, entries.length, true)
    endView.setUint32(12, centralDirectory.length, true)
    endView.setUint32(16, offset, true)
    endView.setUint16(20, 0, true)

    return concatUint8Arrays([...localParts, centralDirectory, endRecord])
  }

  function columnToName(columnIndex) {
    let value = columnIndex
    let output = ''
    while (value > 0) {
      const remainder = (value - 1) % 26
      output = String.fromCharCode(65 + remainder) + output
      value = Math.floor((value - 1) / 26)
    }
    return output
  }

  function buildCellXml(rawCell, rowIndex, columnIndex) {
    if (rawCell === null || typeof rawCell === 'undefined' || rawCell === '') {
      return ''
    }

    let value = rawCell
    let style = 0
    let type = 'auto'

    if (typeof rawCell === 'object' && !Array.isArray(rawCell) && Object.prototype.hasOwnProperty.call(rawCell, 'value')) {
      value = rawCell.value
      style = rawCell.style || 0
      type = rawCell.type || 'auto'
    }

    if (value === null || typeof value === 'undefined' || value === '') {
      return ''
    }

    const ref = `${columnToName(columnIndex)}${rowIndex}`
    if (type === 'number' || (type === 'auto' && typeof value === 'number' && Number.isFinite(value))) {
      return `<c r="${ref}" s="${style}"><v>${value}</v></c>`
    }

    return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`
  }

  function buildWorksheetXml(sheet) {
    const rows = Array.isArray(sheet.rows) ? sheet.rows : []
    const maxColumns = rows.reduce((currentMax, row) => Math.max(currentMax, Array.isArray(row) ? row.length : 0), 0)
    const rowCount = Math.max(rows.length, 1)
    const dimension = `${columnToName(1)}1:${columnToName(Math.max(maxColumns, 1))}${rowCount}`

    const colsXml = Array.isArray(sheet.columns) && sheet.columns.length
      ? `<cols>${sheet.columns.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('')}</cols>`
      : ''

    const rowsXml = rows.map((row, rowIndex) => {
      const cellsXml = (row || []).map((entry, columnIndex) => buildCellXml(entry, rowIndex + 1, columnIndex + 1)).join('')
      return `<row r="${rowIndex + 1}">${cellsXml}</row>`
    }).join('')

    const sheetViewsXml = sheet.freeze
      ? `<sheetViews><sheetView workbookViewId="0"><pane xSplit="${sheet.freeze.col || 0}" ySplit="${sheet.freeze.row || 0}" topLeftCell="${columnToName((sheet.freeze.col || 0) + 1)}${(sheet.freeze.row || 0) + 1}" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>`
      : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'

    const drawingXml = sheet.images && sheet.images.length ? '<drawing r:id="rId1"/>' : ''

    return [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
      `<dimension ref="${dimension}"/>`,
      sheetViewsXml,
      colsXml,
      `<sheetData>${rowsXml}</sheetData>`,
      drawingXml,
      '</worksheet>'
    ].join('')
  }

  function buildWorkbookXml(sheets) {
    const sheetsXml = sheets.map((sheet, index) => (
      `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
    )).join('')

    return [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
      '<workbookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="14000"/></workbookViews>',
      `<sheets>${sheetsXml}</sheets>`,
      '</workbook>'
    ].join('')
  }

  function buildWorkbookRelsXml(sheetCount) {
    const relationships = []
    for (let index = 0; index < sheetCount; index += 1) {
      relationships.push(`<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`)
    }
    relationships.push(`<Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`)

    return [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      relationships.join(''),
      '</Relationships>'
    ].join('')
  }

  function buildRootRelsXml() {
    return [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>',
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>',
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>',
      '</Relationships>'
    ].join('')
  }

  function buildAppPropsXml(sheetNames) {
    const partNames = sheetNames.map((name) => `<vt:lpstr>${xmlEscape(name)}</vt:lpstr>`).join('')
    return [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">',
      '<Application>Lab.js</Application>',
      '<HeadingPairs><vt:vector size="2" baseType="variant">',
      '<vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant>',
      `<vt:variant><vt:i4>${sheetNames.length}</vt:i4></vt:variant>`,
      '</vt:vector></HeadingPairs>',
      `<TitlesOfParts><vt:vector size="${sheetNames.length}" baseType="lpstr">${partNames}</vt:vector></TitlesOfParts>`,
      '</Properties>'
    ].join('')
  }

  function buildCorePropsXml(title, creator) {
    const timestamp = new Date().toISOString()
    return [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
      `<dc:title>${xmlEscape(title)}</dc:title>`,
      `<dc:creator>${xmlEscape(creator || 'Lab.js')}</dc:creator>`,
      `<cp:lastModifiedBy>${xmlEscape(creator || 'Lab.js')}</cp:lastModifiedBy>`,
      `<dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created>`,
      `<dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified>`,
      '</cp:coreProperties>'
    ].join('')
  }

  function buildStylesXml() {
    return [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
      '<fonts count="2">',
      '<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>',
      '<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>',
      '</fonts>',
      '<fills count="2">',
      '<fill><patternFill patternType="none"/></fill>',
      '<fill><patternFill patternType="solid"><fgColor rgb="FFDCEBFF"/><bgColor indexed="64"/></patternFill></fill>',
      '</fills>',
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>',
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
      '<cellXfs count="4">',
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
      '<xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyFont="1" applyFill="1"/>',
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>',
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>',
      '</cellXfs>',
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>',
      '</styleSheet>'
    ].join('')
  }

  function buildWorksheetRelsXml(drawingIndex) {
    return [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${drawingIndex}.xml"/>`,
      '</Relationships>'
    ].join('')
  }

  function buildDrawingXml(images) {
    const anchors = images.map((image, index) => {
      return [
        '<xdr:twoCellAnchor editAs="oneCell">',
        `<xdr:from><xdr:col>${image.from.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${image.from.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>`,
        `<xdr:to><xdr:col>${image.to.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${image.to.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>`,
        '<xdr:pic>',
        `<xdr:nvPicPr><xdr:cNvPr id="${index + 1}" name="${xmlEscape(image.name)}"/><xdr:cNvPicPr/></xdr:nvPicPr>`,
        `<xdr:blipFill><a:blip r:embed="rId${index + 1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>`,
        '<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>',
        '</xdr:pic>',
        '<xdr:clientData/>',
        '</xdr:twoCellAnchor>'
      ].join('')
    }).join('')

    return [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
      anchors,
      '</xdr:wsDr>'
    ].join('')
  }

  function buildDrawingRelsXml(images) {
    const relationships = images.map((image, index) => (
      `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${image.mediaName}"/>`
    )).join('')

    return [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      relationships,
      '</Relationships>'
    ].join('')
  }

  function buildContentTypesXml(sheets, drawingCount) {
    const sheetOverrides = sheets.map((sheet, index) => (
      `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )).join('')

    const drawingOverrides = Array.from({ length: drawingCount }, (_, index) => (
      `<Override PartName="/xl/drawings/drawing${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`
    )).join('')

    return [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
      '<Default Extension="xml" ContentType="application/xml"/>',
      '<Default Extension="png" ContentType="image/png"/>',
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
      sheetOverrides,
      drawingOverrides,
      '</Types>'
    ].join('')
  }

  function buildWorkbookPackage(definition) {
    const sheets = definition.sheets || []
    const entries = []
    let drawingCount = 0
    let imageCount = 0

    entries.push({ name: '[Content_Types].xml', data: '' })
    entries.push({ name: '_rels/.rels', data: buildRootRelsXml() })
    entries.push({ name: 'docProps/app.xml', data: buildAppPropsXml(sheets.map((sheet) => sheet.name)) })
    entries.push({ name: 'docProps/core.xml', data: buildCorePropsXml(definition.title, definition.creator) })
    entries.push({ name: 'xl/workbook.xml', data: buildWorkbookXml(sheets) })
    entries.push({ name: 'xl/_rels/workbook.xml.rels', data: buildWorkbookRelsXml(sheets.length) })
    entries.push({ name: 'xl/styles.xml', data: buildStylesXml() })

    sheets.forEach((sheet, index) => {
      entries.push({
        name: `xl/worksheets/sheet${index + 1}.xml`,
        data: buildWorksheetXml(sheet)
      })

      if (sheet.images && sheet.images.length) {
        drawingCount += 1
        const images = sheet.images.map((image) => {
          imageCount += 1
          return Object.assign({}, image, {
            mediaName: `image${imageCount}.png`
          })
        })

        entries.push({
          name: `xl/worksheets/_rels/sheet${index + 1}.xml.rels`,
          data: buildWorksheetRelsXml(drawingCount)
        })

        entries.push({
          name: `xl/drawings/drawing${drawingCount}.xml`,
          data: buildDrawingXml(images)
        })

        entries.push({
          name: `xl/drawings/_rels/drawing${drawingCount}.xml.rels`,
          data: buildDrawingRelsXml(images)
        })

        images.forEach((image) => {
          entries.push({
            name: `xl/media/${image.mediaName}`,
            data: image.data
          })
        })
      }
    })

    entries[0].data = buildContentTypesXml(sheets, drawingCount)
    const zipBytes = createZip(entries)
    return new Blob([zipBytes], { type: XLSX_MIME })
  }

  function createCanvas(width, height) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
  }

  function drawChartBackground(ctx, width, height, title, subtitle) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#d8e0ea'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, width - 2, height - 2)
    ctx.fillStyle = '#17212f'
    ctx.font = '700 28px Segoe UI'
    ctx.fillText(title, 28, 42)
    ctx.fillStyle = '#5d6b7b'
    ctx.font = '16px Segoe UI'
    ctx.fillText(subtitle, 28, 68)
  }

  function createCumulativeOutcomePlot(events) {
    const width = 960
    const height = 420
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    drawChartBackground(ctx, width, height, 'Evolucao acumulada', 'Acertos e erros ao longo dos eventos registrados')

    const chart = { left: 82, top: 96, width: width - 130, height: height - 154 }
    ctx.strokeStyle = '#d8e0ea'
    ctx.lineWidth = 1

    if (!events.length) {
      ctx.fillStyle = '#5d6b7b'
      ctx.font = '600 20px Segoe UI'
      ctx.fillText('Sem eventos suficientes para gerar o plot.', 210, 220)
      return dataUrlToUint8Array(canvas.toDataURL('image/png'))
    }

    const points = []
    let accumulatedCorrect = 0
    let accumulatedIncorrect = 0

    events.forEach((entry, index) => {
      if (entry.wasCorrect) {
        accumulatedCorrect += 1
      } else {
        accumulatedIncorrect += 1
      }
      points.push({
        x: index + 1,
        correct: accumulatedCorrect,
        incorrect: accumulatedIncorrect
      })
    })

    const maxY = Math.max(1, ...points.map((point) => Math.max(point.correct, point.incorrect)))
    const gridLines = 5

    for (let step = 0; step <= gridLines; step += 1) {
      const y = chart.top + (chart.height * step) / gridLines
      const value = Math.round(maxY - (maxY * step) / gridLines)
      ctx.beginPath()
      ctx.moveTo(chart.left, y)
      ctx.lineTo(chart.left + chart.width, y)
      ctx.stroke()
      ctx.fillStyle = '#5d6b7b'
      ctx.font = '13px Segoe UI'
      ctx.fillText(String(value), 42, y + 4)
    }

    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(chart.left, chart.top)
    ctx.lineTo(chart.left, chart.top + chart.height)
    ctx.lineTo(chart.left + chart.width, chart.top + chart.height)
    ctx.stroke()

    const getX = (index) => {
      if (points.length === 1) {
        return chart.left + chart.width / 2
      }
      return chart.left + ((index - 1) / (points.length - 1)) * chart.width
    }

    const getY = (value) => chart.top + chart.height - (value / maxY) * chart.height

    function drawSeries(color, accessor) {
      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = 4
      ctx.beginPath()
      points.forEach((point, index) => {
        const x = getX(point.x)
        const y = getY(accessor(point))
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.stroke()

      points.forEach((point) => {
        const x = getX(point.x)
        const y = getY(accessor(point))
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    drawSeries('#059669', (point) => point.correct)
    drawSeries('#dc2626', (point) => point.incorrect)

    ctx.fillStyle = '#5d6b7b'
    ctx.font = '13px Segoe UI'
    ctx.fillText('Evento', chart.left + chart.width - 42, chart.top + chart.height + 34)
    ctx.fillText('1', chart.left - 4, chart.top + chart.height + 26)
    ctx.fillText(String(points.length), chart.left + chart.width - 12, chart.top + chart.height + 26)

    ctx.fillStyle = '#059669'
    ctx.fillRect(width - 230, 22, 16, 16)
    ctx.fillStyle = '#17212f'
    ctx.font = '600 14px Segoe UI'
    ctx.fillText('Acertos acumulados', width - 206, 35)

    ctx.fillStyle = '#dc2626'
    ctx.fillRect(width - 230, 48, 16, 16)
    ctx.fillStyle = '#17212f'
    ctx.fillText('Erros acumulados', width - 206, 61)

    return dataUrlToUint8Array(canvas.toDataURL('image/png'))
  }

  function createEventDistributionPlot(events) {
    const width = 960
    const height = 420
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    drawChartBackground(ctx, width, height, 'Distribuicao de eventos', 'Comparacao entre respostas corretas e incorretas por tipo de acao')

    const chart = { left: 82, top: 96, width: width - 130, height: height - 154 }
    const buckets = [
      { label: ['Pick', 'correto'], value: events.filter((entry) => entry.actionType === 'pick' && entry.wasCorrect).length, color: '#059669' },
      { label: ['Pick', 'incorreto'], value: events.filter((entry) => entry.actionType === 'pick' && !entry.wasCorrect).length, color: '#dc2626' },
      { label: ['Dica', 'correta'], value: events.filter((entry) => entry.actionType === 'clue' && entry.wasCorrect).length, color: '#2563eb' },
      { label: ['Dica', 'incorreta'], value: events.filter((entry) => entry.actionType === 'clue' && !entry.wasCorrect).length, color: '#d97706' }
    ]

    const maxValue = Math.max(1, ...buckets.map((bucket) => bucket.value))
    const gridLines = 5

    for (let step = 0; step <= gridLines; step += 1) {
      const y = chart.top + (chart.height * step) / gridLines
      const value = Math.round(maxValue - (maxValue * step) / gridLines)
      ctx.beginPath()
      ctx.strokeStyle = '#d8e0ea'
      ctx.lineWidth = 1
      ctx.moveTo(chart.left, y)
      ctx.lineTo(chart.left + chart.width, y)
      ctx.stroke()
      ctx.fillStyle = '#5d6b7b'
      ctx.font = '13px Segoe UI'
      ctx.fillText(String(value), 42, y + 4)
    }

    const gap = 28
    const barWidth = (chart.width - gap * (buckets.length - 1)) / buckets.length

    buckets.forEach((bucket, index) => {
      const barHeight = (bucket.value / maxValue) * chart.height
      const x = chart.left + index * (barWidth + gap)
      const y = chart.top + chart.height - barHeight

      ctx.fillStyle = bucket.color
      ctx.fillRect(x, y, barWidth, barHeight)

      ctx.fillStyle = '#17212f'
      ctx.font = '700 16px Segoe UI'
      ctx.fillText(String(bucket.value), x + barWidth / 2 - 5, y - 10)

      ctx.fillStyle = '#5d6b7b'
      ctx.font = '13px Segoe UI'
      ctx.textAlign = 'center'
      ctx.fillText(bucket.label[0], x + barWidth / 2, chart.top + chart.height + 24)
      ctx.fillText(bucket.label[1], x + barWidth / 2, chart.top + chart.height + 42)
      ctx.textAlign = 'start'
    })

    return dataUrlToUint8Array(canvas.toDataURL('image/png'))
  }

  const numComponents = parseIntegerOr(window.datastore.get('Quantidade de Elos na cadeia'), 6)
  const criteriaTimeEnabled = toBoolean(window.datastore.get('Tempo_chk'))
  const criteriaCorrectEnabled = toBoolean(window.datastore.get('Acertos_chk'))
  const criteriaErrorsEnabled = toBoolean(window.datastore.get('Erros_chk'))
  const criteriaAttemptsEnabled = toBoolean(window.datastore.get('Tentativas_chk'))

  const criteriaTimeValue = parseIntegerOr(window.datastore.get('Tempo'), 0)
  const criteriaCorrectValue = parseIntegerOr(window.datastore.get('Acertos'), 9999)
  const criteriaErrorsValue = parseIntegerOr(window.datastore.get('Erros'), 9999)
  const criteriaAttemptsValue = parseIntegerOr(window.datastore.get('Tentativas'), 9999)

  const sequenceValueRaw = window.datastore.get('Sequência') || window.datastore.get('SequÃªncia')
  const sequenceTrigger = parseIntegerOr(sequenceValueRaw, 1)
  const instructionText = window.datastore.get('Instrução') || window.datastore.get('InstruÃ§Ã£o') || 'Selecione os estímulos na ordem correta.'
  instructionCopy.textContent = instructionText

  statusSequenceChip.textContent = `Sequência: ${sequenceTrigger}`
  criteriaTime.textContent = criteriaTimeEnabled ? `${criteriaTimeValue}s` : 'Desligado'
  criteriaCorrect.textContent = criteriaCorrectEnabled ? String(criteriaCorrectValue) : 'Desligado'
  criteriaErrors.textContent = criteriaErrorsEnabled ? String(criteriaErrorsValue) : 'Desligado'
  criteriaAttempts.textContent = criteriaAttemptsEnabled ? String(criteriaAttemptsValue) : 'Desligado'

  const cluesFromDatastore = window.datastore.get('Clues') || []
  const processedClues = cluesFromDatastore
    .filter((value) => String(value || '').trim() !== '')
    .map((clueString) => {
      const parts = String(clueString).split(';').map((item) => item.trim()).filter((item, index) => index === 0 || item !== '')
      return {
        correctAnswer: parts[0] || '',
        clues: parts.slice(1)
      }
    })

  const sortedKeys = [...window.datastore_objs.keys()].sort(naturalEloCompare)
  const itemsArray = sortedKeys.map((key) => ({
    key,
    value: window.datastore_objs.get(key)
  }))

  const correctOrder = itemsArray.map((item) => item.key)
  let displayArray = [...itemsArray]

  function shuffleArray(array) {
    for (let index = array.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1))
      ;[array[index], array[randomIndex]] = [array[randomIndex], array[index]]
    }
    return array
  }

  shuffleArray(displayArray)

  let correctScore = 0
  let incorrectScore = 0
  let attemptCount = 0
  let currentSequenceIndex = 0
  let lastOverlayScore = 0
  let clueSetIndex = 0
  let clueIndex = 0
  let endReason = 'Completo'
  let startTime = new Date()
  let endTime = null
  let totalExperimentTime = 0
  let experimentEnded = false
  let allowNativeSubmit = false
  let finalPayloadPrepared = false
  let finalWorkbookName = ''
  const resultsData = []

  let elapsedInterval = null

  const dingAudioPath = (component.files && component.files['DING.WAV']) || 'DING.WAV'
  const errorAudioPath = (component.files && component.files['ERRO1.wav']) || 'ERRO1.wav'

  function updateRuntimeDisplays() {
    const endTimestamp = endTime ? endTime.getTime() : Date.now()
    const elapsedSeconds = Math.floor((endTimestamp - startTime.getTime()) / 1000)
    progressSequence.textContent = `${currentSequenceIndex} / ${correctOrder.length || numComponents}`
    attemptCountDisplay.textContent = String(attemptCount)
    clueProgressDisplay.textContent = processedClues.length
      ? `${Math.min(clueSetIndex + 1, processedClues.length)} / ${processedClues.length}`
      : '0 / 0'
    elapsedDisplay.textContent = formatDuration(elapsedSeconds)
    scoreCorrect.textContent = String(correctScore)
    scoreIncorrect.textContent = String(incorrectScore)
    finalOverlayReason.textContent = endReason
    finalOverlayTime.textContent = formatDuration(totalExperimentTime || elapsedSeconds)
    finalOverlayAttempts.textContent = String(attemptCount)
  }

  function buildStimulusNode(item) {
    const card = document.createElement('div')
    card.className = 'stimulus-card'
    card.dataset.key = item.key

    if (experimentEnded) {
      card.classList.add('is-disabled')
    }

    if (looksLikeImage(item.value)) {
      const image = document.createElement('img')
      image.src = getAssetUrl(item.value)
      image.alt = item.value
      card.appendChild(image)
    } else {
      const text = document.createElement('div')
      text.className = 'stimulus-card__text'
      text.textContent = item.value
      card.appendChild(text)
    }

    card.addEventListener('click', () => handleStimulusSelection(item, card))
    return card
  }

  function renderStimuli() {
    stimuliGrid.innerHTML = ''
    displayArray.forEach((item) => {
      stimuliGrid.appendChild(buildStimulusNode(item))
    })
  }

  function setStimuliLocked(locked) {
    Array.from(stimuliGrid.querySelectorAll('.stimulus-card')).forEach((card) => {
      card.classList.toggle('is-disabled', locked)
    })
  }

  function appendSelectedItem(item) {
    const card = document.createElement('div')
    card.className = 'selected-card'
    if (looksLikeImage(item.value)) {
      const image = document.createElement('img')
      image.src = getAssetUrl(item.value)
      image.alt = item.value
      card.appendChild(image)
    } else {
      card.textContent = item.value
      card.style.fontWeight = '800'
    }
    selectedGrid.appendChild(card)
  }

  function shuffleStimulusGrid() {
    displayArray = shuffleArray([...displayArray])
    renderStimuli()
  }

  function setStatusReason(text) {
    statusReasonChip.textContent = `Status: ${text}`
  }

  function logResult(entry) {
    resultsData.push(entry)
  }

  function checkTerminationCriteria() {
    if (criteriaCorrectEnabled && correctScore >= criteriaCorrectValue) {
      endReason = 'Critério de acertos atingido'
      endExperiment()
      return true
    }

    if (criteriaErrorsEnabled && incorrectScore >= criteriaErrorsValue) {
      endReason = 'Critério de erros atingido'
      endExperiment()
      return true
    }

    if (criteriaAttemptsEnabled && attemptCount >= criteriaAttemptsValue) {
      endReason = 'Critério de tentativas atingido'
      endExperiment()
      return true
    }

    if (currentSequenceIndex >= correctOrder.length && correctOrder.length > 0) {
      endReason = 'Completo (todos os itens da sequência)'
      endExperiment()
      return true
    }

    return false
  }

  function handleStimulusSelection(item) {
    if (experimentEnded) {
      return
    }

    attemptCount += 1
    const now = new Date()
    const elapsedSec = Math.floor((now - startTime) / 1000)
    const timestamp = getDateTimeString(now)

    const expectedKey = correctOrder[currentSequenceIndex]
    const expectedItem = expectedKey ? itemsArray.find((entry) => entry.key === expectedKey) : null
    const isCorrect = item.key === expectedKey

    if (isCorrect) {
      correctScore += 1
      currentSequenceIndex += 1
      appendSelectedItem(item)
      playAudio(dingAudioPath)
    } else {
      incorrectScore += 1
      playAudio(errorAudioPath)
    }

    logResult({
      index: attemptCount,
      actionType: 'pick',
      objectKey: item.key,
      objectChosen: item.value,
      expectedKey: expectedKey || '',
      expectedValue: expectedItem ? expectedItem.value : '',
      timestamp,
      isoTimestamp: now.toISOString(),
      elapsedSec,
      wasCorrect: isCorrect,
      correctScoreAfter: correctScore,
      incorrectScoreAfter: incorrectScore
    })

    updateRuntimeDisplays()

    if (checkTerminationCriteria()) {
      return
    }

    shuffleStimulusGrid()

    if (
      sequenceTrigger > 0 &&
      correctScore > 0 &&
      correctScore % sequenceTrigger === 0 &&
      correctScore !== lastOverlayScore
    ) {
      lastOverlayScore = correctScore
      showClueOverlay()
    }
  }

  function renderAvailableClues() {
    clueList.innerHTML = ''
    const currentSet = processedClues[clueSetIndex]
    if (!currentSet || !currentSet.clues || !currentSet.clues.length) {
      const placeholder = document.createElement('div')
      placeholder.className = 'clue-item'
      placeholder.textContent = 'Nenhuma dica disponível para este conjunto.'
      clueList.appendChild(placeholder)
      return
    }

    for (let index = 0; index <= clueIndex && index < currentSet.clues.length; index += 1) {
      const clueItem = document.createElement('div')
      clueItem.className = 'clue-item'
      clueItem.textContent = currentSet.clues[index]
      clueList.appendChild(clueItem)
    }
  }

  function showClueOverlay() {
    if (experimentEnded) {
      return
    }

    if (clueSetIndex >= processedClues.length) {
      return
    }

    const currentSet = processedClues[clueSetIndex]
    clueDialogText.textContent = currentSet && currentSet.correctAnswer
      ? `Use as dicas liberadas para tentar identificar o item alvo do conjunto ${clueSetIndex + 1}.`
      : 'Use as dicas liberadas e registre sua hipótese.'

    renderAvailableClues()
    clueResponseInput.value = ''
    clueOverlay.classList.add('is-visible')
    clueOverlay.setAttribute('aria-hidden', 'false')
    clueResponseInput.focus()
  }

  function hideClueOverlay() {
    clueOverlay.classList.remove('is-visible')
    clueOverlay.setAttribute('aria-hidden', 'true')
  }

  function handleClueSubmission() {
    if (experimentEnded) {
      hideClueOverlay()
      return
    }

    if (clueSetIndex >= processedClues.length) {
      hideClueOverlay()
      return
    }

    attemptCount += 1
    const now = new Date()
    const elapsedSec = Math.floor((now - startTime) / 1000)
    const timestamp = getDateTimeString(now)
    const currentSet = processedClues[clueSetIndex]
    const userGuess = clueResponseInput.value.trim()
    const correctAnswer = (currentSet.correctAnswer || '').trim()
    const userIsCorrect = normalizeText(userGuess) === normalizeText(correctAnswer)

    logResult({
      index: attemptCount,
      actionType: 'clue',
      clueSet: clueSetIndex + 1,
      revealedClues: Math.min(clueIndex + 1, currentSet.clues.length),
      cluesShown: currentSet.clues.slice(0, Math.min(clueIndex + 1, currentSet.clues.length)).join(' | '),
      userGuess,
      correctAnswer,
      timestamp,
      isoTimestamp: now.toISOString(),
      elapsedSec,
      wasCorrect: userIsCorrect,
      correctScoreAfter: correctScore,
      incorrectScoreAfter: incorrectScore
    })

    if (userIsCorrect) {
      clueSetIndex += 1
      clueIndex = 0
      hideClueOverlay()
    } else {
      clueIndex += 1

      if (clueIndex >= currentSet.clues.length) {
        if (correctAnswer) {
          alert(`A resposta correta era: ${correctAnswer}`)
        }
        clueSetIndex += 1
        clueIndex = 0
      }
      hideClueOverlay()
    }

    updateRuntimeDisplays()
    checkTerminationCriteria()
  }

  function buildObjectRows() {
    return [...window.datastore_objs.keys()]
      .sort(naturalEloCompare)
      .map((key, index) => {
        const orderMatch = String(key).match(/Elo\s+(\d+)/i)
        const order = orderMatch ? Number.parseInt(orderMatch[1], 10) : index + 1
        const value = window.datastore_objs.get(key)
        const type = /Imagem/i.test(key) || looksLikeImage(value) ? 'Imagem' : 'Palavra'
        return [order, key, type, value]
      })
  }

  function collectSessionSummary() {
    if (!endTime) {
      endTime = new Date()
      totalExperimentTime = Math.floor((endTime - startTime) / 1000)
    }

    const clueEntries = resultsData.filter((entry) => entry.actionType === 'clue')
    return {
      participant: window.datastore.get('Nome do Participante') || '',
      idade: window.datastore.get('Idade') || '',
      sexo: window.datastore.get('Sexo') || '',
      experimentador: window.datastore.get('Nome do Experimentador') || '',
      nomeConfig: window.datastore.get('Nome da Configuração') || window.datastore.get('Nome da ConfiguraÃ§Ã£o') || '',
      quantidadeElos: window.datastore.get('Quantidade de Elos na cadeia') || '',
      tempo: window.datastore.get('Tempo') || '',
      acertos: window.datastore.get('Acertos') || '',
      erros: window.datastore.get('Erros') || '',
      tentativas: window.datastore.get('Tentativas') || '',
      userSequence: window.datastore.get('Sequência') || window.datastore.get('SequÃªncia') || '0',
      inicio: getDateTimeString(startTime),
      termino: getDateTimeString(endTime),
      geradoEm: getDateTimeString(new Date()),
      totalExperimentTime,
      attemptCount,
      correctScore,
      incorrectScore,
      clueResponses: clueEntries.length,
      clueCorrect: clueEntries.filter((entry) => entry.wasCorrect).length,
      clueIncorrect: clueEntries.filter((entry) => !entry.wasCorrect).length
    }
  }

  function buildParticipantSheet(summary) {
    return {
      name: 'Participante',
      columns: [30, 72],
      freeze: { row: 1, col: 0 },
      rows: [
        [cell('Campo', 1), cell('Valor', 1)],
        ['Participante', summary.participant],
        ['Idade', summary.idade],
        ['Sexo', summary.sexo],
        ['Pesquisador responsável', summary.experimentador],
        ['Configuração', summary.nomeConfig],
        ['Início da sessão', summary.inicio],
        ['Término da sessão', summary.termino],
        ['Planilha gerada em', summary.geradoEm]
      ]
    }
  }

  function buildConfigurationSheet(summary) {
    return {
      name: 'Configuracao',
      columns: [34, 82],
      freeze: { row: 1, col: 0 },
      rows: [
        [cell('Campo', 1), cell('Valor', 1)],
        ['Nome da configuração', summary.nomeConfig],
        ['Quantidade de elos', summary.quantidadeElos],
        ['Conjuntos de dicas', processedClues.length],
        ['Sequência para dicas', sequenceTrigger],
        ['Critério de tempo', criteriaTimeEnabled ? `${criteriaTimeValue}s` : 'Desligado'],
        ['Critério de acertos', criteriaCorrectEnabled ? String(criteriaCorrectValue) : 'Desligado'],
        ['Critério de erros', criteriaErrorsEnabled ? String(criteriaErrorsValue) : 'Desligado'],
        ['Critério de tentativas', criteriaAttemptsEnabled ? String(criteriaAttemptsValue) : 'Desligado'],
        ['Instrução', cell(instructionText, 2)]
      ]
    }
  }

  function buildObjectsSheet() {
    const objectRows = buildObjectRows()
    return {
      name: 'Objetos',
      columns: [12, 28, 16, 34],
      freeze: { row: 1, col: 0 },
      rows: [
        [cell('Elo', 1), cell('Chave', 1), cell('Tipo', 1), cell('Valor', 1)],
        ...(objectRows.length ? objectRows : [['-', '-', '-', 'Nenhum objeto definido']])
      ]
    }
  }

  function buildCluesSheet() {
    const maxClueCount = Math.max(0, ...processedClues.map((set) => set.clues.length))
    const header = [cell('Conjunto', 1), cell('Resposta correta', 1)]
    for (let index = 0; index < maxClueCount; index += 1) {
      header.push(cell(`Dica ${index + 1}`, 1))
    }
    header.push(cell('Quantidade de dicas', 1))

    const rows = processedClues.length
      ? processedClues.map((set, index) => {
        const row = [index + 1, set.correctAnswer]
        for (let clueIndex = 0; clueIndex < maxClueCount; clueIndex += 1) {
          row.push(set.clues[clueIndex] || '')
        }
        row.push(set.clues.length)
        return row
      })
      : [['-', 'Nenhum conjunto de dicas configurado', ...Array.from({ length: maxClueCount }, () => ''), 0]]

    return {
      name: 'Dicas',
      columns: [12, 24, ...Array.from({ length: maxClueCount }, () => 26), 18],
      freeze: { row: 1, col: 0 },
      rows: [header, ...rows]
    }
  }

  function buildResultsSheet(summary) {
    const rows = [
      [cell('Métrica', 1), cell('Valor', 1)],
      ['Motivo de término', endReason],
      ['Tempo total', formatDuration(summary.totalExperimentTime)],
      ['Tentativas totais', summary.attemptCount],
      ['Acertos', summary.correctScore],
      ['Erros', summary.incorrectScore],
      ['Respostas às dicas', summary.clueResponses],
      ['Dicas corretas', summary.clueCorrect],
      ['Dicas incorretas', summary.clueIncorrect],
      [],
      [cell('Eventos registrados', 3)],
      [
        cell('Índice', 1),
        cell('Tipo', 1),
        cell('Momento', 1),
        cell('Tempo (s)', 1),
        cell('Correto?', 1),
        cell('Valor / resposta', 1),
        cell('Esperado / correto', 1),
        cell('Conjunto de dicas', 1),
        cell('Acertos acum.', 1),
        cell('Erros acum.', 1)
      ]
    ]

    if (resultsData.length) {
      resultsData.forEach((entry) => {
        rows.push([
          entry.index,
          entry.actionType === 'pick' ? 'Seleção' : 'Dica',
          entry.timestamp,
          entry.elapsedSec,
          entry.wasCorrect ? 'Sim' : 'Não',
          entry.actionType === 'pick' ? entry.objectChosen : entry.userGuess,
          entry.actionType === 'pick' ? (entry.expectedValue || entry.expectedKey || '') : entry.correctAnswer,
          entry.actionType === 'clue' ? `Conjunto ${entry.clueSet}` : '',
          entry.correctScoreAfter ?? '',
          entry.incorrectScoreAfter ?? ''
        ])
      })
    } else {
      rows.push(['-', 'Sem eventos registrados', '', '', '', '', '', '', '', ''])
    }

    return {
      name: 'Resultados',
      columns: [10, 14, 22, 14, 12, 28, 28, 18, 16, 16, 6, 14, 14, 14, 14, 14, 14, 14, 14],
      freeze: { row: 12, col: 0 },
      rows,
      images: [
        {
          name: 'Evolucao acumulada',
          data: createCumulativeOutcomePlot(resultsData),
          from: { col: 11, row: 1 },
          to: { col: 18, row: 18 }
        },
        {
          name: 'Distribuicao de eventos',
          data: createEventDistributionPlot(resultsData),
          from: { col: 11, row: 20 },
          to: { col: 18, row: 37 }
        }
      ]
    }
  }

  function buildWorkbookFilename(summary) {
    const participantPart = sanitizeFileSegment(summary.participant, 'participante').slice(0, 24)
    const configPart = sanitizeFileSegment(summary.nomeConfig, 'configuracao').slice(0, 24)
    return `resultados_${participantPart}_${configPart}_${formatFilenameTimestamp(new Date())}.xlsx`
  }

  function buildResultsWorkbook(summary) {
    return {
      filename: buildWorkbookFilename(summary),
      blob: buildWorkbookPackage({
        title: summary.nomeConfig ? `Resultados - ${summary.nomeConfig}` : 'Resultados do experimento',
        creator: summary.experimentador || 'Lab.js',
        sheets: [
          buildParticipantSheet(summary),
          buildConfigurationSheet(summary),
          buildObjectsSheet(),
          buildCluesSheet(),
          buildResultsSheet(summary)
        ]
      })
    }
  }

  function legacyGenerateFinalLog() {
    const nowString = getDateTimeString()
    const participant = window.datastore.get('Nome do Participante') || ''
    const idade = window.datastore.get('Idade') || ''
    const sexo = window.datastore.get('Sexo') || ''
    const experimentador = window.datastore.get('Nome do Experimentador') || ''
    const nomeConfig = window.datastore.get('Nome da Configuração') || ''
    const quantidadeElos = window.datastore.get('Quantidade de Elos na cadeia') || ''
    const tempo = window.datastore.get('Tempo') || ''
    const acertos = window.datastore.get('Acertos') || ''
    const erros = window.datastore.get('Erros') || ''
    const tentativas = window.datastore.get('Tentativas') || ''
    const userSequence = window.datastore.get('Sequência') || '0'

    const objectLines = [...window.datastore_objs.keys()]
      .sort(naturalEloCompare)
      .map((key, index) => `Objeto ${index + 1}: ${window.datastore_objs.get(key)}`)

    const resultLines = resultsData.map((entry) => {
      if (entry.actionType === 'pick') {
        return `${entry.index} - PICK: ${entry.objectChosen} - ${entry.timestamp} - ${entry.elapsedSec}s - ${entry.wasCorrect ? '(+)' : '(-)'}`
      }
      return `${entry.index} - CLUE: ${entry.userGuess} / Resposta: ${entry.correctAnswer} - ${entry.timestamp} - ${entry.elapsedSec}s - ${entry.wasCorrect ? '(+)' : '(-)'}`
    })

    return [
      'CONFIGURAÇÕES',
      '',
      `Nome do participante.............: ${participant}`,
      `Idade do participante.............: ${idade}`,
      `Sexo do participante..............: ${sexo}`,
      `Nome do experimentador............: ${experimentador}`,
      `Nome da configuração..............: ${nomeConfig}`,
      '',
      'Objetos escolhidos:',
      ...objectLines,
      '',
      `Descrição da coleta..............: ${instructionText}`,
      '',
      'Parâmetros:',
      `Quantidade de elos na cadeia.....: ${quantidadeElos}`,
      `Sequência de acerto para ativar as dicas.....: ${userSequence}`,
      `Tempo limite.....................: ${tempo || '—'}`,
      `Critério de acertos..............: ${acertos || '—'}`,
      `Critério de erros................: ${erros || '—'}`,
      `Critério de tentativas...........: ${tentativas || '—'}`,
      '',
      '----------------------------------------------------------------------------------',
      `RESULTADOS - ${nowString}`,
      ...resultLines,
      '',
      `Motivo de término................: ${endReason}`,
      `Tempo total de experimento.......: ${totalExperimentTime} segundo(s)`,
      `Total de tentativas..............: ${attemptCount}`,
      `Total de acertos.................: ${correctScore}`,
      `Total de erros...................: ${incorrectScore}`
    ].join('\n')
  }

  function legacyPrepareFinalPayloadAndDownload() {
    if (logPrepared) {
      return
    }

    if (!endTime) {
      endTime = new Date()
      totalExperimentTime = Math.floor((endTime - startTime) / 1000)
    }

    const finalLog = generateFinalLog()
    finalLogField.value = finalLog
    resultsJsonField.value = JSON.stringify(resultsData, null, 2)
    endReasonField.value = endReason
    totalTimeField.value = String(totalExperimentTime)
    totalAttemptsField.value = String(attemptCount)
    totalCorrectField.value = String(correctScore)
    totalIncorrectField.value = String(incorrectScore)

    logPreview.style.display = 'block'
    logPreview.textContent = finalLog

    downloadTextFile('final_log.txt', finalLog, 'text/plain;charset=utf-8')
    logPrepared = true
  }

  function legacyEndExperiment() {
    if (experimentEnded) {
      return
    }

    experimentEnded = true
    if (!endTime) {
      endTime = new Date()
      totalExperimentTime = Math.floor((endTime - startTime) / 1000)
    }

    if (elapsedInterval) {
      clearInterval(elapsedInterval)
    }

    hideClueOverlay()
    setStatusReason('encerrado')
    finalReasonCopy.textContent = `Motivo de término: ${endReason}. Ao clicar no botão abaixo, o componente será submetido corretamente no Lab.js e o arquivo de log também será baixado.`
    finalPanel.classList.add('is-visible')
    updateRuntimeDisplays()
  }

  function generateFinalLog(summary, workbookFilename) {
    const objectLines = buildObjectRows().map((row) => `Objeto ${row[0]}: [${row[2]}] ${row[3]}`)
    const clueLines = processedClues.map((set, index) => {
      const cluesText = set.clues.length ? set.clues.join(' | ') : 'Sem dicas cadastradas'
      return `Conjunto ${index + 1}: resposta=${set.correctAnswer || '-'} | dicas=${cluesText}`
    })

    const resultLines = resultsData.map((entry) => {
      if (entry.actionType === 'pick') {
        return `${entry.index} - PICK: ${entry.objectChosen} | esperado=${entry.expectedValue || entry.expectedKey || '-'} | ${entry.timestamp} | ${entry.elapsedSec}s | ${entry.wasCorrect ? '(+)' : '(-)'}`
      }
      return `${entry.index} - CLUE: ${entry.userGuess || '-'} | resposta=${entry.correctAnswer || '-'} | conjunto=${entry.clueSet} | ${entry.timestamp} | ${entry.elapsedSec}s | ${entry.wasCorrect ? '(+)' : '(-)'}`
    })

    return [
      'CONFIGURACOES',
      '',
      `Participante.......................: ${summary.participant}`,
      `Idade..............................: ${summary.idade}`,
      `Sexo...............................: ${summary.sexo}`,
      `Pesquisador responsavel............: ${summary.experimentador}`,
      `Configuracao.......................: ${summary.nomeConfig}`,
      `Inicio.............................: ${summary.inicio}`,
      `Termino............................: ${summary.termino}`,
      '',
      'OBJETOS DEFINIDOS',
      ...objectLines,
      '',
      'DICAS CONFIGURADAS',
      ...(clueLines.length ? clueLines : ['Nenhum conjunto de dicas configurado.']),
      '',
      'PARAMETROS',
      `Quantidade de elos................: ${summary.quantidadeElos}`,
      `Sequencia para dicas..............: ${sequenceTrigger}`,
      `Criterio de tempo.................: ${criteriaTimeEnabled ? `${criteriaTimeValue}s` : 'Desligado'}`,
      `Criterio de acertos...............: ${criteriaCorrectEnabled ? String(criteriaCorrectValue) : 'Desligado'}`,
      `Criterio de erros.................: ${criteriaErrorsEnabled ? String(criteriaErrorsValue) : 'Desligado'}`,
      `Criterio de tentativas............: ${criteriaAttemptsEnabled ? String(criteriaAttemptsValue) : 'Desligado'}`,
      `Arquivo XLSX......................: ${workbookFilename}`,
      '',
      'RESULTADOS',
      ...resultLines,
      '',
      `Motivo de termino.................: ${endReason}`,
      `Tempo total.......................: ${formatDuration(summary.totalExperimentTime)}`,
      `Tentativas totais.................: ${summary.attemptCount}`,
      `Acertos...........................: ${summary.correctScore}`,
      `Erros.............................: ${summary.incorrectScore}`,
      `Respostas as dicas................: ${summary.clueResponses}`,
      `Gerado em.........................: ${summary.geradoEm}`
    ].join('\n')
  }

  function prepareFinalPayloadAndDownload() {
    if (finalPayloadPrepared) {
      return
    }

    const summary = collectSessionSummary()
    const workbook = buildResultsWorkbook(summary)
    finalWorkbookName = workbook.filename
    const finalLog = generateFinalLog(summary, finalWorkbookName)

    finalLogField.value = finalLog
    resultsJsonField.value = JSON.stringify(resultsData, null, 2)
    endReasonField.value = endReason
    totalTimeField.value = String(summary.totalExperimentTime)
    totalAttemptsField.value = String(summary.attemptCount)
    totalCorrectField.value = String(summary.correctScore)
    totalIncorrectField.value = String(summary.incorrectScore)

    downloadBlobFile(workbook.filename, workbook.blob)
    finalPayloadPrepared = true
  }

  function endExperiment() {
    if (experimentEnded) {
      return
    }

    experimentEnded = true
    if (!endTime) {
      endTime = new Date()
      totalExperimentTime = Math.floor((endTime - startTime) / 1000)
    }

    if (elapsedInterval) {
      clearInterval(elapsedInterval)
    }

    hideClueOverlay()
    clueSaveButton.disabled = true
    setStimuliLocked(true)
    setStatusReason('encerrado')
    finalOverlayText.textContent = 'A etapa foi encerrada e a interface foi bloqueada. Chame o pesquisador responsável para concluir o experimento.'
    finalOverlayFootnote.textContent = 'Ao clicar em "Obrigado", a tela continuará bloqueada e os resultados serão baixados em uma planilha Excel.'
    finalOverlay.classList.add('is-visible')
    finalOverlay.setAttribute('aria-hidden', 'false')
    updateRuntimeDisplays()
  }

  clueSaveButton.addEventListener('click', handleClueSubmission)
  clueResponseInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleClueSubmission()
    }
  })

  finishSubmit.addEventListener('click', (event) => {
    event.preventDefault()

    if (!experimentEnded || allowNativeSubmit) {
      return
    }

    finishSubmit.disabled = true
    finishSubmit.textContent = 'Baixando resultados...'
    finalOverlayFootnote.textContent = 'Gerando o arquivo Excel da sessão...'

    try {
      prepareFinalPayloadAndDownload()
      finalOverlayText.textContent = 'Resultados baixados. Aguarde o pesquisador responsável para encerrar a sessão.'
      finalOverlayFootnote.textContent = `Arquivo gerado: ${finalWorkbookName}. A tela permanecerá bloqueada.`
      finishSubmit.textContent = 'Resultados baixados'
      allowNativeSubmit = true

      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit()
      } else {
        form.submit()
      }
    } catch (error) {
      console.error('Falha ao gerar a planilha final:', error)
      allowNativeSubmit = false
      finishSubmit.disabled = false
      finishSubmit.textContent = 'Obrigado'
      finalOverlayFootnote.textContent = 'Nao foi possivel gerar a planilha de resultados. Tente novamente neste navegador.'
    }
  })

  form.addEventListener('submit', (event) => {
    if (!allowNativeSubmit) {
      event.preventDefault()
      return
    }

    if (!finalPayloadPrepared) {
      prepareFinalPayloadAndDownload()
    }
  })

  renderStimuli()
  updateRuntimeDisplays()

  elapsedInterval = window.setInterval(() => {
    if (!experimentEnded) {
      updateRuntimeDisplays()
    }
  }, 1000)

  if (criteriaTimeEnabled && criteriaTimeValue > 0) {
    window.setTimeout(() => {
      if (!experimentEnded) {
        endReason = 'Tempo esgotado'
        endExperiment()
      }
    }, criteriaTimeValue * 1000)
  }

  console.log('Stage 3 refatorado carregado com sucesso.')
}).call(this)
