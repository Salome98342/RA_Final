import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  importAsignaturasRAs,
  importDocentes,
  importEstudiantes,
  importMatriculados,
} from '@/services/coordinador'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import ModuleBreadcrumbs from '@/components/ModuleBreadcrumbs'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Alert from '@/utils/alert'
import { api } from '@/connections/http'
import { endpoints } from '@/connections/endpoints'
import Swal from 'sweetalert2'

export type ImportKind = 'est' | 'mat' | 'doc' | 'asig'

type ImportsProps = {
  forcedModule?: ImportKind | null
  moduleTitle?: string
  showBackToAll?: boolean
  individualSection?: React.ReactNode
}

type ImportErrorItem = {
  row?: number
  error?: string
  more?: string
}

type ImportApiResponse = {
  created?: number
  updated?: number
  existing?: number
  created_asignaturas?: number
  existing_asignaturas?: number
  created_ras?: number
  created_indicadores?: number
  imported_students?: Array<{
    nombre?: string
    apellido?: string
    codigo_estudiante?: string
    num_documento?: string
    correo?: string
  }>
  errors?: ImportErrorItem[]
}

type ImportResult = {
  inserted: number
  updated: number
  existing: number
  failed: number
  processed: number
  durationMs: number
  details: string
  errors: ImportErrorItem[]
  importedStudents: Array<{
    nombre?: string
    apellido?: string
    codigo_estudiante?: string
    num_documento?: string
    correo?: string
  }>
}

type CardState = {
  file: File | null
  fileLabel: string
  validationError: string | null
  status: 'idle' | 'ready' | 'uploading' | 'success' | 'error'
  result: ImportResult | null
}

type HeaderRule = {
  required: string[]
  oneOfGroups?: string[][]
}

type ImportCardConfig = {
  kind: ImportKind
  title: string
  iconClass: string
  accentClass: string
  description: string
  acceptedColumns: string
  templateCandidates: Array<{ fileName: string; downloadName: string }>
  headerRule: HeaderRule
  importAction: (file: File) => Promise<ImportApiResponse>
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls']

const initialCardState: CardState = {
  file: null,
  fileLabel: 'Sin archivo seleccionado',
  validationError: null,
  status: 'idle',
  result: null,
}

const cardConfigs: ImportCardConfig[] = [
  {
    kind: 'doc',
    title: 'Docentes',
    iconClass: 'bi bi-person-badge-fill',
    accentClass: 'text-danger',
    description: 'Importa docentes con documento, correo y datos de contacto.',
    acceptedColumns: 'codigo_docente, nombre, apellido, correo, tipo_documento, num_documento, num_telefono',
    templateCandidates: [
      { fileName: 'plantilla_docentes.xlsx', downloadName: 'plantilla_docentes.xlsx' },
    ],
    headerRule: {
      required: ['codigo_docente', 'nombre', 'apellido', 'correo', 'tipo_documento', 'num_documento'],
    },
    importAction: importDocentes,
  },
  {
    kind: 'est',
    title: 'Estudiantes',
    iconClass: 'bi bi-people-fill',
    accentClass: 'text-danger',
    description: 'Carga estudiantes nuevos con sus datos de identificación y correo institucional. Acepta formato RA Manager o Sistema de Registro Académico. En tipo_documento solo se acepta: C.C., C.R., T.I., PPT.',
    acceptedColumns: 'codigo_estudiante, nombre, apellido, correo, tipo_documento, num_documento, jornada',
    templateCandidates: [
      { fileName: 'plantilla_estudiantes.xlsx', downloadName: 'plantilla_estudiantes.xlsx' },
    ],
    headerRule: {
      required: [],
      oneOfGroups: [
        ['codigo_estudiante', 'codigo'],
        ['nombre', 'nombres'],
        ['apellido', 'apellidos'],
        ['correo', 'email'],
        ['tipo_documento', 'documento_identidad'],
        ['num_documento', 'documento', 'documento_identidad'],
      ],
    },
    importAction: importEstudiantes,
  },
  {
    kind: 'asig',
    title: 'Asignaturas + RAs + IL',
    iconClass: 'bi bi-journal-bookmark-fill',
    accentClass: 'text-danger',
    description: 'Crea o actualiza asignaturas, RAs e indicadores de logro (IL) en una sola carga.',
    acceptedColumns: 'codigo_asignatura, nombre_asignatura, codigo_docente, codigo_programa, grupo, sede, ra_descripcion, ra_porcentaje, indicador_descripcion (opcional), indicador_porcentaje (opcional)',
    templateCandidates: [
      { fileName: 'plantilla_asignaturas_ras_il.xlsx', downloadName: 'plantilla_asignaturas_ras_il.xlsx' },
      { fileName: 'plantilla_asignaturas_ras.xlsx', downloadName: 'plantilla_asignaturas_ras.xlsx' },
    ],
    headerRule: {
      required: ['codigo_asignatura', 'codigo_docente', 'codigo_programa', 'periodo', 'grupo', 'sede', 'creditos'],
      oneOfGroups: [['nombre_asignatura', 'nombre']],
    },
    importAction: importAsignaturasRAs,
  },
  {
    kind: 'mat',
    title: 'Matriculados',
    iconClass: 'bi bi-clipboard-check-fill',
    accentClass: 'text-danger',
    description: 'Relaciona estudiantes con asignaturas y periodo académico de matrícula.',
    acceptedColumns: 'codigo_estudiante o codigo, codigo_asignatura (opcional por nombre de archivo), grupo, semestre (opcional), periodo (opcional)',
    templateCandidates: [
      { fileName: 'plantilla_matriculados.xlsx', downloadName: 'plantilla_matriculados.xlsx' },
    ],
    headerRule: {
      required: [],
      oneOfGroups: [
        ['codigo_estudiante', 'codigo'],
      ],
    },
    importAction: importMatriculados,
  },
]

const normalizeHeader = (value: unknown): string => {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
}

const getFileExtension = (name: string): string => {
  const lower = name.toLowerCase()
  const idx = lower.lastIndexOf('.')
  return idx === -1 ? '' : lower.slice(idx)
}

const detectDelimiter = (line: string): string => {
  const candidates = [',', ';', '\t', '|']
  let selected = ','
  let maxSplits = 0

  for (const candidate of candidates) {
    const parts = line.split(candidate).length
    if (parts > maxSplits) {
      maxSplits = parts
      selected = candidate
    }
  }

  return selected
}

const splitCsvLine = (line: string, delimiter: string): string[] => {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === delimiter && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)
  return values
}

const readHeadersFromCsv = async (file: File): Promise<string[]> => {
  const text = await file.text()
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\uFEFF/, '').trim())
    .filter((line) => line.length > 0)

  if (!lines.length) {
    throw new Error('El archivo está vacío o no contiene cabeceras legibles.')
  }

  // Keywords esperados en headers (similares al backend)
  const headerKeywords = ['codigo', 'nombre', 'apellido', 'email', 'documento', 'correo']
  
  let headerLineIndex = 0
  let maxMatches = 0

  // Buscar la línea que contenga más keywords esperados (hasta línea 10)
  const maxLinesToCheck = Math.min(lines.length, 10)
  for (let i = 0; i < maxLinesToCheck; i++) {
    const delimiter = detectDelimiter(lines[i])
    const headers = splitCsvLine(lines[i], delimiter)
    const headerStr = headers.map((h) => h.toLowerCase()).join(' ')
    const matches = headerKeywords.filter((kw) => headerStr.includes(kw)).length
    
    if (matches > maxMatches) {
      maxMatches = matches
      headerLineIndex = i
    }
  }

  // Si encontramos al menos 2 keywords, usar esa línea como headers
  const delimiter = detectDelimiter(lines[headerLineIndex])
  const headers = splitCsvLine(lines[headerLineIndex], delimiter)
  
  if (headers.length === 0) {
    throw new Error(`No se encontraron cabeceras válidas en el CSV (intentó ${maxLinesToCheck} líneas).`)
  }

  console.log(`[ReadCsvHeaders] Headers detectados en línea ${headerLineIndex}:`, headers)
  
  return headers.map((header) => normalizeHeader(header)).filter(Boolean)
}

const readHeadersFromExcel = async (file: File): Promise<string[]> => {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]

  if (!sheetName) {
    throw new Error('El archivo Excel no contiene hojas para procesar.')
  }

  const sheet = workbook.Sheets[sheetName]
  
  // Leer todas las filas sin especificar header para detectar la fila de headers
  const allRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    blankrows: false,
    raw: false,
  })

  if (!allRows || allRows.length === 0) {
    throw new Error('El archivo Excel está vacío.')
  }

  // Keywords esperados en headers (similares al backend)
  const headerKeywords = ['codigo', 'nombre', 'apellido', 'email', 'documento', 'correo']
  
  let headerRowIndex = 0
  let maxMatches = 0

  // Buscar la fila que contenga más keywords esperados
  for (let i = 0; i < Math.min(allRows.length, 10); i++) {
    const row = allRows[i]
    if (!row || !Array.isArray(row)) continue
    
    const rowStr = row.map((v) => String(v || '').toLowerCase()).join(' ')
    const matches = headerKeywords.filter((kw) => rowStr.includes(kw)).length
    
    if (matches > maxMatches) {
      maxMatches = matches
      headerRowIndex = i
    }
  }

  // Si encontramos al menos 2 keywords, usar esa fila como headers
  const headerRow = allRows[headerRowIndex]
  if (!headerRow || !Array.isArray(headerRow) || headerRow.length === 0) {
    throw new Error(`No se encontraron cabeceras válidas en el Excel (intentó ${Math.min(allRows.length, 10)} filas).`)
  }

  console.log(`[ReadExcelHeaders] Headers detectados en fila ${headerRowIndex}:`, headerRow)
  
  return headerRow.map((header) => normalizeHeader(header)).filter(Boolean)
}

const validateHeaders = (headers: string[], rule: HeaderRule): string[] => {
  const headerSet = new Set(headers)
  const missing: string[] = []

  rule.required.forEach((requiredHeader) => {
    if (!headerSet.has(requiredHeader)) {
      missing.push(requiredHeader)
    }
  })

  if (rule.oneOfGroups?.length) {
    rule.oneOfGroups.forEach((group) => {
      const hasAtLeastOne = group.some((candidate) => headerSet.has(candidate))
      if (!hasAtLeastOne) {
        missing.push(`(${group.join(' o ')})`)
      }
    })
  }

  return missing
}

const extractErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object') {
    const e = error as {
      message?: string
      detail?: string
      data?: { detail?: string; message?: string }
      originalError?: { response?: { data?: { detail?: string; message?: string } } }
    }

    if (e.data?.detail) return e.data.detail
    if (e.data?.message) return e.data.message
    if (e.detail) return e.detail
    if (e.message) return e.message
    if (e.originalError?.response?.data?.detail) return e.originalError.response.data.detail
    if (e.originalError?.response?.data?.message) return e.originalError.response.data.message
  }

  return 'Ocurrió un error inesperado durante la operación.'
}

const buildResult = (kind: ImportKind, response: ImportApiResponse, durationMs: number): ImportResult => {
  const errors = Array.isArray(response.errors) ? response.errors : []
  const importedStudents = Array.isArray(response.imported_students) ? response.imported_students : []

  if (kind === 'asig') {
    const createdAsignaturas = Number(response.created_asignaturas || 0)
    const createdRas = Number(response.created_ras || 0)
    const createdIndicadores = Number(response.created_indicadores || 0)
    const inserted = createdAsignaturas + createdRas + createdIndicadores
    const existing = Number(response.existing_asignaturas || 0)
    const failed = errors.length
    const processed = inserted + existing + failed

    return {
      inserted,
      updated: 0,
      existing,
      failed,
      processed,
      durationMs,
      details: `Asignaturas creadas: ${createdAsignaturas}, RAs creados: ${createdRas}, IL creados: ${createdIndicadores}`,
      errors,
      importedStudents,
    }
  }

  const inserted = Number(response.created || 0)
  const updated = Number(response.updated || 0)
  const existing = Number(response.existing || 0)
  const failed = errors.length

  return {
    inserted,
    updated,
    existing,
    failed,
    processed: inserted + updated + existing + failed,
    durationMs,
    details: `Insertados: ${inserted}, actualizados: ${updated}, existentes sin cambios: ${existing}`,
    errors,
    importedStudents,
  }
}

const escapeHtml = (value: unknown): string => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const buildImportStudentsSummaryHtml = (result: ImportResult): string => {
  const students = result.importedStudents
  const visibleStudents = students.slice(0, 20)
  const hiddenCount = Math.max(students.length - visibleStudents.length, 0)

  const studentsListHtml = visibleStudents.length
    ? visibleStudents
        .map((student) => {
          const fullName = `${student.nombre || ''} ${student.apellido || ''}`.trim() || 'Sin nombre'
          const documentOrCode = student.num_documento || student.codigo_estudiante || 'Sin documento/codigo'
          const emailChunk = student.correo ? ` - ${escapeHtml(student.correo)}` : ''
          return `<li>• ${escapeHtml(fullName)} - ${escapeHtml(documentOrCode)}${emailChunk}</li>`
        })
        .join('')
    : '<li>• No se recibieron detalles de estudiantes en la respuesta.</li>'

  const errorsListHtml = result.errors.length
    ? result.errors
        .map((errorItem) => {
          const detail = errorItem.more || errorItem.error || 'Error no especificado'
          if (errorItem.more) {
            return `<li>• ${escapeHtml(detail)}</li>`
          }
          return `<li>• Fila ${escapeHtml(errorItem.row || '-')} - ${escapeHtml(detail)}</li>`
        })
        .join('')
    : ''

  return `
    <div class="swal-import-summary">
      <div class="swal-import-section-title">Estudiantes importados correctamente:</div>
      <ul class="swal-import-list">${studentsListHtml}</ul>
      ${hiddenCount > 0 ? `<p class="swal-import-more">Y ${hiddenCount} estudiantes mas fueron importados correctamente</p>` : ''}
      ${
        result.errors.length > 0
          ? `
            <div class="swal-import-section-title mt-3">Registros con error:</div>
            <ul class="swal-import-list swal-import-errors">${errorsListHtml}</ul>
          `
          : ''
      }
    </div>
  `
}

const showImportStudentsSummaryAlert = async (result: ImportResult) => {
  const hasErrors = result.failed > 0
  await Swal.fire({
    icon: 'success',
    title: hasErrors ? 'Importacion completada con observaciones' : 'Importacion exitosa de estudiantes',
    html: buildImportStudentsSummaryHtml(result),
    confirmButtonText: 'Aceptar',
    customClass: {
      confirmButton: 'swal-btn-confirm',
    },
  })
}

const Imports: React.FC<ImportsProps> = ({
  forcedModule = null,
  moduleTitle,
  showBackToAll = true,
  individualSection,
}) => {
  const [cardState, setCardState] = useState<Record<ImportKind, CardState>>({
    est: { ...initialCardState },
    mat: { ...initialCardState },
    doc: { ...initialCardState },
    asig: { ...initialCardState },
  })
  const [activeImport, setActiveImport] = useState<ImportKind | null>(null)
  const [downloadingTemplate, setDownloadingTemplate] = useState<ImportKind | null>(null)
  const inputRefs = {
    est: useRef<HTMLInputElement | null>(null),
    mat: useRef<HTMLInputElement | null>(null),
    doc: useRef<HTMLInputElement | null>(null),
    asig: useRef<HTMLInputElement | null>(null),
  }
  const cardRefs = {
    est: useRef<HTMLDivElement | null>(null),
    mat: useRef<HTMLDivElement | null>(null),
    doc: useRef<HTMLDivElement | null>(null),
    asig: useRef<HTMLDivElement | null>(null),
  }

  const configByKind = useMemo(() => {
    return cardConfigs.reduce((acc, config) => {
      acc[config.kind] = config
      return acc
    }, {} as Record<ImportKind, ImportCardConfig>)
  }, [])

  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const routeModule: ImportKind | null = forcedModule
  const requestedModule = searchParams.get('modulo')
  const highlightedModule: ImportKind | null = routeModule || (requestedModule === 'est' || requestedModule === 'mat' || requestedModule === 'doc' || requestedModule === 'asig'
    ? requestedModule
    : null)
  const visibleConfigs = routeModule ? cardConfigs.filter((c) => c.kind === routeModule) : cardConfigs
  const pageTitle = moduleTitle || (routeModule === 'mat'
    ? 'Módulo Matriculados'
    : routeModule === 'asig'
      ? 'Módulo Asignaturas + RA'
      : 'Importaciones Masivas')
  const active = location.pathname.includes('/docentes')
    ? 'docentes'
    : location.pathname.includes('/estudiantes')
      ? 'estudiantes'
      : location.pathname.includes('/matriculados')
        ? 'matriculados'
        : location.pathname.includes('/asignaturas-ra')
          ? 'asignaturas-ra'
          : location.pathname.includes('/imports')
            ? 'imports'
            : 'asignaturas'
  const items = [
    { key: 'inicio', icon: 'bi-house-door', title: 'Inicio' },
    { key: 'desempenio', icon: 'bi-graph-up-arrow', title: 'Desempeño' },
    { key: 'asignaturas', icon: 'bi-journals', title: 'Asignaturas' },
    { key: 'docentes', icon: 'bi-person-badge', title: 'Docentes' },
    { key: 'estudiantes', icon: 'bi-people', title: 'Estudiantes' },
    { key: 'matriculados', icon: 'bi-clipboard-check', title: 'Matriculados' },
    { key: 'asignaturas-ra', icon: 'bi-journal-bookmark', title: 'Asignaturas + RA' },
    { key: 'imports', icon: 'bi-upload', title: 'Imports' },
  ]

  const setSingleCardState = (kind: ImportKind, patch: Partial<CardState>) => {
    setCardState((prev) => ({
      ...prev,
      [kind]: {
        ...prev[kind],
        ...patch,
      },
    }))
  }

  const clearFileSelection = (kind: ImportKind) => {
    setSingleCardState(kind, {
      ...initialCardState,
    })
  }

  const validateFile = async (kind: ImportKind, file: File): Promise<string | null> => {
    const extension = getFileExtension(file.name)
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      return 'Formato de archivo no válido. Usa CSV o Excel (.xlsx, .xls).'
    }

    if (file.size <= 0) {
      return 'El archivo está vacío. Selecciona un archivo con datos.'
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'El archivo supera el tamaño máximo permitido de 10 MB.'
    }

    const headers = extension === '.csv' ? await readHeadersFromCsv(file) : await readHeadersFromExcel(file)
    if (headers.length < 2) {
      return 'No se detectaron cabeceras válidas. Verifica la primera fila del archivo.'
    }

    const missingHeaders = validateHeaders(headers, configByKind[kind].headerRule)
    if (missingHeaders.length > 0) {
      return `Faltan columnas requeridas: ${missingHeaders.join(', ')}`
    }

    return null
  }

  const handleFileSelected = async (kind: ImportKind, file: File | null) => {
    if (!file) {
      setSingleCardState(kind, {
        ...initialCardState,
      })
      return
    }

    try {
      const validationError = await validateFile(kind, file)
      if (validationError) {
        setSingleCardState(kind, {
          file: null,
          fileLabel: 'Archivo inválido',
          validationError,
          status: 'error',
          result: null,
        })
        Alert.toast.error(validationError)
        return
      }

      setSingleCardState(kind, {
        file,
        fileLabel: `${file.name} (${Math.ceil(file.size / 1024)} KB)`,
        validationError: null,
        status: 'ready',
        result: null,
      })
      Alert.toast.success('Archivo cargado correctamente y listo para importar.')
    } catch (error) {
      const message = extractErrorMessage(error)
      setSingleCardState(kind, {
        file: null,
        fileLabel: 'Error de lectura',
        validationError: message,
        status: 'error',
        result: null,
      })
      Alert.toast.error(`Error de lectura del archivo: ${message}`)
    }
  }

  const triggerFileSelection = (kind: ImportKind) => {
    inputRefs[kind].current?.click()
  }

  const downloadTemplate = async (kind: ImportKind) => {
    const config = configByKind[kind]

    setDownloadingTemplate(kind)
    try {
      let success = false

      for (const candidate of config.templateCandidates) {
        const response = await api.get(endpoints.coordinador.importTemplate(candidate.fileName), {
          responseType: 'blob',
        })

        if (!response.data) {
          continue
        }

        const blob = response.data as Blob
        const objectUrl = window.URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = objectUrl
        anchor.download = candidate.downloadName
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        window.URL.revokeObjectURL(objectUrl)
        success = true
        break
      }

      if (!success) {
        throw new Error('No se encontró la plantilla solicitada en el servidor.')
      }

      Alert.toast.success('Plantilla descargada correctamente.')
    } catch (error) {
      const message = extractErrorMessage(error)
      Alert.toast.error(`No se pudo descargar la plantilla: ${message}`)
    } finally {
      setDownloadingTemplate(null)
    }
  }

  const runImport = async (kind: ImportKind) => {
    const config = configByKind[kind]
    const current = cardState[kind]
    if (!current.file) {
      Alert.toast.warning('Primero selecciona un archivo válido para importar.')
      return
    }

    const confirmed = await Alert.confirmCreate(`importación de ${config.title.toLowerCase()}`)
    if (!confirmed) {
      return
    }

    setActiveImport(kind)
    setSingleCardState(kind, { status: 'uploading', validationError: null, result: null })
    Alert.toast.info('Proceso de carga en progreso...')

    const startedAt = performance.now()
    try {
      let response: ImportApiResponse

      if (kind === 'mat') {
        response = await importMatriculados(current.file)
      } else {
        response = await config.importAction(current.file)
      }

      const durationMs = Math.round(performance.now() - startedAt)
      const result = buildResult(kind, response, durationMs)

      const hasErrors = result.failed > 0
      setSingleCardState(kind, {
        status: hasErrors ? 'error' : 'success',
        result,
      })

      if (hasErrors) {
        Alert.toast.warning(`Importación finalizada con observaciones: ${result.failed} registros con error.`)
      } else {
        Alert.toast.success('Importación exitosa.')
      }

      Alert.toast.info(`Registros procesados: ${result.processed}. Insertados: ${result.inserted}. Actualizados: ${result.updated}.`)

      if (kind === 'est') {
        await showImportStudentsSummaryAlert(result)
      }
    } catch (error) {
      const message = extractErrorMessage(error)
      setSingleCardState(kind, {
        status: 'error',
        validationError: message,
        result: null,
      })

      Alert.toast.error(`Error del servidor: ${message}`)
    } finally {
      setActiveImport(null)
    }
  }

  const renderErrors = (result: ImportResult | null) => {
    if (!result || !result.errors.length) return null

    return (
      <details className="mt-2">
        <summary className="text-danger imports-error-summary">
          <i className="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
          Ver errores ({result.errors.length})
        </summary>
        <ul className="small mb-0 mt-2 imports-errors-list">
          {result.errors.map((errorItem, index) => (
            <li key={`${errorItem.row || 'line'}-${index}`} className="text-muted">
              {errorItem.more || `Fila ${errorItem.row || '-'}: ${errorItem.error || 'Error no especificado'}`}
            </li>
          ))}
        </ul>
      </details>
    )
  }

  useEffect(() => {
    if (!highlightedModule) return
    const target = cardRefs[highlightedModule].current
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightedModule])

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Coordinador" />
      <div className="dash-wrapper">
        <Sidebar
          active={active}
          items={items}
          onClick={(key) => {
            if (key === 'inicio') navigate('/coordinador')
            else if (key === 'desempenio') navigate('/coordinador/desempenio')
            else if (key === 'asignaturas') navigate('/coordinador/asignaturas')
            else if (key === 'docentes') navigate('/coordinador/docentes')
            else if (key === 'estudiantes') navigate('/coordinador/estudiantes')
            else if (key === 'matriculados') navigate('/coordinador/matriculados')
            else if (key === 'asignaturas-ra') navigate('/coordinador/asignaturas-ra')
            else if (key === 'imports') navigate('/coordinador/imports')
          }}
        />
        <main className="dash-content">
          <ModuleBreadcrumbs
            items={[
              { label: 'Coordinador', to: '/coordinador' },
              { label: 'Imports' },
            ]}
            onNavigate={navigate}
          />
          <div className="content-title">
            <i className="bi bi-upload me-2" aria-hidden="true"></i>
            {pageTitle}
          </div>

          {routeModule && showBackToAll && (
            <div className="mb-3">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => navigate('/coordinador/imports')}
              >
                <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>
                Ver todos los imports
              </button>
            </div>
          )}

          {individualSection}

          <section className="ra-card mb-4">
            <div className="ra-card-body">
              <h5 className="mb-2">Carga de archivos</h5>
              <p className="text-muted mb-2">
                Usa las plantillas oficiales para evitar errores. El sistema valida formato, tamaño y cabeceras antes de importar.
              </p>
              <div className="alert alert-warning py-2 mb-3" role="alert">
                <i className="bi bi-exclamation-circle me-2" aria-hidden="true"></i>
                <strong>Importante:</strong> se recomienda importar en el siguiente orden: docentes, estudiantes, asignaturas y matriculados.
              </div>
              <ul className="mb-0 ps-3 text-muted small">
                <li>Formatos permitidos: CSV, XLSX, XLS.</li>
                <li>Tamaño máximo por archivo: 10 MB.</li>
                <li>Incluye cabeceras en la primera fila.</li>
                <li>Durante la importación los botones se bloquean para evitar duplicados.</li>
              </ul>
            </div>
          </section>

          <section className="panel shown">
            <div className="row g-4 imports-grid">
              {visibleConfigs.map((config) => {
                const state = cardState[config.kind]
                const isUploading = activeImport === config.kind
                const isBusy = activeImport !== null
                const isDownloading = downloadingTemplate === config.kind
                const isHighlighted = highlightedModule === config.kind

                return (
                  <div key={config.kind} className="col-md-6 col-xl-3">
                    <div
                      ref={(el) => {
                        cardRefs[config.kind].current = el
                      }}
                      className={`ra-card h-100 imports-card ${isHighlighted ? 'imports-card-target' : ''}`}
                    >
                      <div className="ra-card-body d-flex flex-column">
                        <div className="d-flex align-items-center mb-3">
                          <i className={`${config.iconClass} ${config.accentClass} me-2 imports-card-icon`} aria-hidden="true"></i>
                          <h5 className="mb-0">{config.title}</h5>
                        </div>

                        <p className="text-muted small mb-2">{config.description}</p>
                        <p className="small mb-3">
                          <span className="fw-semibold">Cabeceras esperadas:</span> {config.acceptedColumns}
                        </p>

                        <input
                          ref={inputRefs[config.kind]}
                          type="file"
                          aria-label={`Archivo de importacion para ${config.title}`}
                          title={`Archivo de importacion para ${config.title}`}
                          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                          className="d-none"
                          onChange={(event) => {
                            const selectedFile = event.target.files?.[0] || null
                            void handleFileSelected(config.kind, selectedFile)
                            event.currentTarget.value = ''
                          }}
                          disabled={isBusy}
                        />

                        <div className="d-grid gap-2 mb-2">
                          {state.file ? (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => clearFileSelection(config.kind)}
                              disabled={isBusy}
                            >
                              <i className="bi bi-x-circle me-1" aria-hidden="true"></i>
                              Quitar archivo
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-outline-success btn-sm"
                              onClick={() => triggerFileSelection(config.kind)}
                              disabled={isBusy}
                            >
                              <i className="bi bi-plus-circle me-1" aria-hidden="true"></i>
                              Añadir archivo
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => {
                              void downloadTemplate(config.kind)
                            }}
                            disabled={isBusy || isDownloading}
                          >
                            {isDownloading ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
                                Descargando...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-download me-1" aria-hidden="true"></i>
                                Descargar plantilla
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              void runImport(config.kind)
                            }}
                            disabled={isBusy || !state.file || state.status === 'error'}
                          >
                            {isUploading ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
                                Importando...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-upload me-1" aria-hidden="true"></i>
                                Importar
                              </>
                            )}
                          </button>
                        </div>

                        <div className="mt-2 pt-2 border-top small">
                          <div className="mb-1">
                            <span className="fw-semibold">Archivo:</span> {state.fileLabel}
                          </div>

                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="fw-semibold">Estado:</span>
                            <span
                              className={`badge ${
                                state.status === 'success'
                                  ? 'bg-success'
                                  : state.status === 'error'
                                    ? 'bg-danger'
                                    : state.status === 'uploading'
                                      ? 'bg-warning text-dark'
                                      : state.status === 'ready'
                                        ? 'bg-info text-dark'
                                        : 'bg-secondary'
                              }`}
                            >
                              {state.status === 'idle' && 'Sin iniciar'}
                              {state.status === 'ready' && 'Listo para importar'}
                              {state.status === 'uploading' && 'Procesando'}
                              {state.status === 'success' && 'Completado'}
                              {state.status === 'error' && 'Con errores'}
                            </span>
                          </div>

                          {state.validationError && <div className="text-danger">{state.validationError}</div>}

                          {state.result && (
                            <div className="mt-2 p-2 rounded bg-light border">
                              <div className="small mb-1">
                                <span className="fw-semibold">Insertados:</span> {state.result.inserted}
                              </div>
                              <div className="small mb-1">
                                <span className="fw-semibold">Existentes:</span> {state.result.existing}
                              </div>
                              <div className="small mb-1">
                                <span className="fw-semibold">Fallidos:</span> {state.result.failed}
                              </div>
                              <div className="small mb-1">
                                <span className="fw-semibold">Procesados:</span> {state.result.processed}
                              </div>
                              <div className="small mb-1">
                                <span className="fw-semibold">Tiempo:</span> {(state.result.durationMs / 1000).toFixed(2)} s
                              </div>
                              <div className="small text-muted">{state.result.details}</div>
                              {renderErrors(state.result)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {activeImport && (
              <div className="alert alert-warning mt-4 py-2 d-flex align-items-center">
                <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                <span>Importación en progreso. Espera mientras se procesan los registros.</span>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}

export default Imports
