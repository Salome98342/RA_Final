import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { importAsignaturasRAs, importDocentes, importEstudiantes, importMatriculados } from '@/services/coordinador'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Alert from '@/utils/alert'
import { getAuthToken } from '@/connections/http'
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
  existing?: number
  created_asignaturas?: number
  existing_asignaturas?: number
  created_ras?: number
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
    kind: 'est',
    title: 'Estudiantes',
    iconClass: 'bi bi-people-fill',
    accentClass: 'text-primary',
    description: 'Carga estudiantes nuevos con sus datos de identificación y correo institucional.',
    acceptedColumns: 'codigo_estudiante, nombre, apellido, correo, tipo_documento, num_documento',
    templateCandidates: [
      { fileName: 'plantilla_estudiantes.xlsx', downloadName: 'plantilla_estudiantes.xlsx' },
      { fileName: 'plantilla_importacion_estudiantes_con_datos.csv', downloadName: 'plantilla_estudiantes.csv' },
    ],
    headerRule: {
      required: ['codigo_estudiante', 'nombre', 'apellido', 'correo', 'tipo_documento', 'num_documento'],
    },
    importAction: importEstudiantes,
  },
  {
    kind: 'mat',
    title: 'Matriculados',
    iconClass: 'bi bi-clipboard-check-fill',
    accentClass: 'text-success',
    description: 'Relaciona estudiantes con asignaturas y periodo académico de matrícula.',
    acceptedColumns: 'codigo_estudiante, codigo_asignatura, periodo',
    templateCandidates: [{ fileName: 'plantilla_matriculados.xlsx', downloadName: 'plantilla_matriculados.xlsx' }],
    headerRule: {
      required: ['codigo_estudiante', 'codigo_asignatura', 'periodo'],
    },
    importAction: importMatriculados,
  },
  {
    kind: 'doc',
    title: 'Docentes',
    iconClass: 'bi bi-person-badge-fill',
    accentClass: 'text-warning',
    description: 'Importa docentes con documento, correo y datos de contacto.',
    acceptedColumns: 'codigo_docente, nombre, apellido, correo, tipo_documento, num_documento',
    templateCandidates: [{ fileName: 'plantilla_docentes.xlsx', downloadName: 'plantilla_docentes.xlsx' }],
    headerRule: {
      required: ['codigo_docente', 'nombre', 'apellido', 'correo', 'tipo_documento', 'num_documento'],
    },
    importAction: importDocentes,
  },
  {
    kind: 'asig',
    title: 'Asignaturas + RAs',
    iconClass: 'bi bi-journal-bookmark-fill',
    accentClass: 'text-danger',
    description: 'Crea o actualiza asignaturas y sus resultados de aprendizaje en una sola carga.',
    acceptedColumns: 'codigo_asignatura, nombre_asignatura (o nombre), codigo_docente, codigo_programa, grupo',
    templateCandidates: [{ fileName: 'plantilla_asignaturas_ras.xlsx', downloadName: 'plantilla_asignaturas_ras.xlsx' }],
    headerRule: {
      required: ['codigo_asignatura', 'codigo_docente', 'codigo_programa', 'grupo'],
      oneOfGroups: [['nombre_asignatura', 'nombre']],
    },
    importAction: importAsignaturasRAs,
  },
]

const normalizeHeader = (value: unknown): string => {
  return String(value ?? '')
    .trim()
    .toLowerCase()
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

  const delimiter = detectDelimiter(lines[0])
  return splitCsvLine(lines[0], delimiter)
    .map((header) => normalizeHeader(header))
    .filter(Boolean)
}

const readHeadersFromExcel = async (file: File): Promise<string[]> => {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]

  if (!sheetName) {
    throw new Error('El archivo Excel no contiene hojas para procesar.')
  }

  const sheet = workbook.Sheets[sheetName]
  const firstRow = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    range: 0,
    blankrows: false,
    raw: false,
  })[0]

  if (!firstRow || !Array.isArray(firstRow)) {
    throw new Error('No se encontraron cabeceras en la primera fila del Excel.')
  }

  return firstRow.map((header) => normalizeHeader(header)).filter(Boolean)
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

const deriveBackendRoot = (): string => {
  const baseApi = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').trim()
  return baseApi.replace(/\/?api\/?$/, '')
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
    const inserted = Number(response.created_asignaturas || 0) + Number(response.created_ras || 0)
    const existing = Number(response.existing_asignaturas || 0)
    const failed = errors.length
    const processed = inserted + existing + failed

    return {
      inserted,
      existing,
      failed,
      processed,
      durationMs,
      details: `Asignaturas creadas: ${response.created_asignaturas || 0}, RAs creados: ${response.created_ras || 0}`,
      errors,
      importedStudents,
    }
  }

  const inserted = Number(response.created || 0)
  const existing = Number(response.existing || 0)
  const failed = errors.length

  return {
    inserted,
    existing,
    failed,
    processed: inserted + existing + failed,
    durationMs,
    details: `Insertados: ${inserted}, existentes: ${existing}`,
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
            : 'materias'
  const items = [
    { key: 'materias', icon: 'bi-journals', title: 'Materias' },
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
    const backendRoot = deriveBackendRoot()

    setDownloadingTemplate(kind)
    try {
      const token = getAuthToken()
      let success = false

      for (const candidate of config.templateCandidates) {
        const templateUrl = `${backendRoot}/plantillas/${candidate.fileName}`
        const response = await fetch(templateUrl, {
          method: 'GET',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })

        if (!response.ok) {
          continue
        }

        const blob = await response.blob()
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

    setActiveImport(kind)
    setSingleCardState(kind, { status: 'uploading', validationError: null, result: null })
    Alert.toast.info('Proceso de carga en progreso...')

    const startedAt = performance.now()
    try {
      const response = await config.importAction(current.file)
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

      Alert.toast.info(`Registros procesados: ${result.processed}. Insertados: ${result.inserted}.`)

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

      if (kind === 'est') {
        await Swal.fire({
          icon: 'error',
          title: 'Error en la importacion de estudiantes',
          text: message,
          confirmButtonText: 'Aceptar',
          customClass: {
            confirmButton: 'swal-btn-confirm',
          },
        })
      }

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
            if (key === 'materias') navigate('/coordinador/materias')
            else if (key === 'docentes') navigate('/coordinador/docentes')
            else if (key === 'estudiantes') navigate('/coordinador/estudiantes')
            else if (key === 'matriculados') navigate('/coordinador/matriculados')
            else if (key === 'asignaturas-ra') navigate('/coordinador/asignaturas-ra')
            else if (key === 'imports') navigate('/coordinador/imports')
          }}
        />
        <main className="dash-content">
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
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => triggerFileSelection(config.kind)}
                            disabled={isBusy}
                          >
                            <i className="bi bi-folder2-open me-1" aria-hidden="true"></i>
                            Seleccionar archivo
                          </button>

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
