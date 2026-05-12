import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import ModuleBreadcrumbs from '@/components/ModuleBreadcrumbs'
import Alert from '@/utils/alert'
import { formatTipoDocumentoAbbr } from '@/utils/documento'
import { getErrorMessage } from '@/utils/errors'
import {
  desmatricularEstudiante,
  fetchAsignaturaEstudiantes,
  fetchAsignaturas,
  fetchPeriodosCoordinador,
  fetchEstudiantesParaMatricula,
  importMatriculados,
  type AsignaturaRow,
  type EstudianteRow,
  type EstudianteListItem,
} from '@/services/coordinador'
import PaginationControls from '@/components/PaginationControls'

const DEFAULT_PAGE_SIZE = 10

const toCsvSafe = (value: string) => {
  const normalized = String(value ?? '').replace(/"/g, '""')
  return `"${normalized}"`
}

const Matriculados: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

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

  const [loading, setLoading] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [asignaturas, setAsignaturas] = useState<AsignaturaRow[]>([])
  const [periodos, setPeriodos] = useState<Array<{ id_periodo: number; descripcion: string }>>([])
  const [students, setStudents] = useState<EstudianteListItem[]>([])
  const [alreadyEnrolledCodes, setAlreadyEnrolledCodes] = useState<Set<string>>(new Set())
  const [enrolledRowsByCode, setEnrolledRowsByCode] = useState<Record<string, EstudianteRow>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [unenrollingCode, setUnenrollingCode] = useState<string | null>(null)
  const [studentPage, setStudentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const [formData, setFormData] = useState({
    id_asignatura: '',
    periodo: '',
  })

  const [selectedStudents, setSelectedStudents] = useState<Record<string, boolean>>({})

  const selectedStudentCodes = useMemo(
    () => Object.keys(selectedStudents).filter((k) => selectedStudents[k]),
    [selectedStudents]
  )

  const isFormValid = Boolean(
    formData.id_asignatura.trim() &&
    formData.periodo.trim() &&
    selectedStudentCodes.length > 0
  )

  const selectedAsignatura = useMemo(
    () => asignaturas.find((a) => String(a.id_asignatura) === formData.id_asignatura) || null,
    [asignaturas, formData.id_asignatura]
  )

  const availableStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return students
    return students.filter((s) => {
      const fullName = `${s.nombre} ${s.apellido}`.toLowerCase()
      return (
        fullName.includes(term) ||
        s.codigo_estudiante.toLowerCase().includes(term) ||
        s.correo.toLowerCase().includes(term) ||
        s.num_documento.toLowerCase().includes(term)
      )
    })
  }, [students, searchTerm])

  const studentMaxPage = Math.max(1, Math.ceil(availableStudents.length / pageSize))
  const visibleStudents = useMemo(
    () => availableStudents.slice((studentPage - 1) * pageSize, studentPage * pageSize),
    [availableStudents, studentPage, pageSize]
  )

  const selectedStudentRows = useMemo(
    () => students.filter((s) => selectedStudents[s.codigo_estudiante]),
    [students, selectedStudents]
  )

  useEffect(() => {
    setStudentPage(1)
  }, [searchTerm, formData.id_asignatura, formData.periodo, students.length])

  const loadAsignaturas = useCallback(async () => {
    setLoadingOptions(true)
    try {
      const data = await fetchAsignaturas({ page: 1, page_size: 1000 })
      setAsignaturas(data.results || [])
      if (!formData.id_asignatura && data.results?.length) {
        setFormData((prev) => ({ ...prev, id_asignatura: String(data.results[0].id_asignatura) }))
      }
    } catch (error: unknown) {
      Alert.error(getErrorMessage(error, 'No se pudieron cargar las asignaturas registradas.'))
    } finally {
      setLoadingOptions(false)
    }
  }, [formData.id_asignatura])

  const loadPeriodos = useCallback(async () => {
    try {
      const list = await fetchPeriodosCoordinador()
      setPeriodos(list)

      setFormData((prev) => {
        if (prev.periodo) {
          const exists = list.some((p: { descripcion: string }) => p.descripcion === prev.periodo)
          if (exists) return prev
        }
        return {
          ...prev,
          periodo: list.length ? String(list[0].descripcion) : '',
        }
      })
    } catch {
      setPeriodos([])
    }
  }, [])

  const loadStudents = useCallback(async (asignatura: AsignaturaRow | null, period: string) => {
    if (!asignatura) {
      setStudents([])
      setSelectedStudents({})
      setAlreadyEnrolledCodes(new Set())
      setEnrolledRowsByCode({})
      return
    }

    setLoadingStudents(true)
    try {
      const candidates = await fetchEstudiantesParaMatricula({
        codigo_asignatura: asignatura.codigo,
        grupo: asignatura.grupo,
        id_asignatura: asignatura.id_asignatura,
        include_all_when_empty: true,
      })
      setStudents(candidates.results)

      const enrolled = new Set<string>()
      const enrolledByCode: Record<string, EstudianteRow> = {}
      if (period) {
        const existing = await fetchAsignaturaEstudiantes({
          codigo_asignatura: asignatura.codigo,
          grupo: asignatura.grupo,
          id_asignatura: asignatura.id_asignatura,
          periodo: period,
          page: 1,
          page_size: 3000,
        })
        existing.results.forEach((e) => {
          enrolled.add(e.codigo_estudiante)
          enrolledByCode[e.codigo_estudiante] = e
        })
      }
      setAlreadyEnrolledCodes(enrolled)
      setEnrolledRowsByCode(enrolledByCode)

      setSelectedStudents((prev) => {
        const next: Record<string, boolean> = {}
        for (const row of candidates.results) {
          if (prev[row.codigo_estudiante] && !enrolled.has(row.codigo_estudiante)) {
            next[row.codigo_estudiante] = true
          }
        }
        return next
      })
    } catch (error: unknown) {
      setStudents([])
      setSelectedStudents({})
      setAlreadyEnrolledCodes(new Set())
      setEnrolledRowsByCode({})
      Alert.error(getErrorMessage(error, 'No se pudo cargar el listado de estudiantes.'))
    } finally {
      setLoadingStudents(false)
    }
  }, [])

  useEffect(() => {
    loadAsignaturas()
  }, [loadAsignaturas])

  useEffect(() => {
    loadPeriodos()
  }, [loadPeriodos])

  useEffect(() => {
    loadStudents(selectedAsignatura, formData.periodo)
  }, [selectedAsignatura, formData.periodo, loadStudents])

  const toggleStudent = (codigo: string, checked: boolean) => {
    setSelectedStudents((prev) => ({ ...prev, [codigo]: checked }))
  }

  const selectVisible = () => {
    setSelectedStudents((prev) => {
      const next = { ...prev }
      for (const s of availableStudents) {
        if (!alreadyEnrolledCodes.has(s.codigo_estudiante)) {
          next[s.codigo_estudiante] = true
        }
      }
      return next
    })
  }

  const clearSelection = () => {
    setSelectedStudents({})
  }

  const handleUnenroll = async (codigoEstudiante: string) => {
    const enrolledRow = enrolledRowsByCode[codigoEstudiante]
    if (!enrolledRow) {
      Alert.info('No se encontró la matrícula para desmatricular en este periodo.')
      return
    }

    const confirmed = await Alert.confirm({
      title: 'Confirmar desmatrícula',
      text: [
        `Estudiante: ${enrolledRow.codigo_estudiante} - ${enrolledRow.nombre} ${enrolledRow.apellido}`,
        `Periodo: ${enrolledRow.periodo}`,
        `Asignatura: ${selectedAsignatura?.codigo || '-'} (${selectedAsignatura?.nombre || '-'})`,
        '',
        '¿Deseas desmatricular este estudiante?'
      ].join('\n'),
      confirmButtonText: 'Sí, desmatricular',
      cancelButtonText: 'Cancelar',
      type: 'warning',
    })

    if (!confirmed) return

    setUnenrollingCode(codigoEstudiante)
    try {
      await desmatricularEstudiante(enrolledRow.id_matricula)
      setSelectedStudents((prev) => {
        const next = { ...prev }
        delete next[codigoEstudiante]
        return next
      })
      Alert.success('Estudiante desmatriculado correctamente.')
      await loadStudents(selectedAsignatura, formData.periodo)
    } catch (error: unknown) {
      Alert.error(getErrorMessage(error, 'No se pudo desmatricular al estudiante.'))
    } finally {
      setUnenrollingCode(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isFormValid) {
      Alert.toast.warning('Debes seleccionar asignatura, periodo y al menos un estudiante.')
      return
    }

    const preview = selectedStudentRows
      .slice(0, 8)
      .map((s) => `${s.codigo_estudiante} - ${s.nombre} ${s.apellido} - ${s.correo}`)
      .join('\n')

    const confirmText = [
      `Asignatura: ${selectedAsignatura?.codigo || 'N/A'} (${selectedAsignatura?.nombre || 'N/A'})`,
      `Grupo: ${selectedAsignatura?.grupo || 'N/A'}`,
      `Periodo: ${formData.periodo}`,
      `Estudiantes a matricular: ${selectedStudentCodes.length}`,
      '',
      'Detalle (primeros registros):',
      preview || 'Sin detalle',
      selectedStudentCodes.length > 8 ? `\n... y ${selectedStudentCodes.length - 8} más.` : '',
      '',
      '¿Deseas continuar?'
    ].join('\n')

    const confirmed = await Alert.confirm({
      title: 'Confirmar matrícula de estudiantes',
      text: confirmText,
      confirmButtonText: 'Sí, matricular',
      cancelButtonText: 'Cancelar',
      type: 'warning',
    })

    if (!confirmed) {
      return
    }

    setLoading(true)
    try {
      if (!selectedAsignatura) {
        Alert.error('Debes seleccionar una asignatura válida.')
        return
      }

      const headers = ['codigo_estudiante', 'codigo_asignatura', 'grupo', 'periodo']

      const bodyRows = selectedStudentCodes
        .map((codigoEst) => [
          codigoEst,
          selectedAsignatura.codigo.trim(),
          String(selectedAsignatura.grupo || '').trim(),
          formData.periodo.trim(),
        ].map(toCsvSafe).join(','))
        .join('\n')

      const csv = `${headers.join(',')}\n${bodyRows}\n`
      const file = new File([csv], 'matriculado_individual.csv', { type: 'text/csv' })
      const result = await importMatriculados(file)

      if (result.errors?.length) {
        Alert.error(result.errors[0]?.error || 'No fue posible procesar el registro.')
        return
      }

      if ((result.created || 0) > 0) {
        Alert.success(`Matrículas creadas: ${result.created}. Ya existentes: ${result.existing || 0}.`)
      } else if ((result.existing || 0) > 0) {
        Alert.info('Todos los estudiantes seleccionados ya estaban matriculados en este periodo.')
      } else {
        Alert.info('Registro procesado.')
      }

      clearSelection()
      await loadStudents(selectedAsignatura, formData.periodo)
    } catch (error: unknown) {
      Alert.error(getErrorMessage(error, 'Error al registrar matrícula'))
    } finally {
      setLoading(false)
    }
  }

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
              { label: 'Matriculados' },
            ]}
            onNavigate={navigate}
          />
          <div className="content-title d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <i className="bi bi-clipboard-check me-2"></i>
              Gestión de Matriculados
            </div>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => navigate('/coordinador/imports?modulo=mat')}
            >
              <i className="bi bi-upload me-1"></i>
              Carga masiva
            </button>
          </div>

          <div className="card mb-4">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-ui-checks-grid me-2"></i>
                Formulario de Matrícula (selección múltiple)
              </span>
              <span className="badge bg-light text-dark">Grande</span>
            </div>
            <div className="card-body">
              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                Selecciona asignatura y periodo, luego marca uno o varios estudiantes del listado para matricular.
              </div>

              <form onSubmit={handleSubmit}>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Asignatura registrada <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={formData.id_asignatura}
                      onChange={(e) => setFormData((prev) => ({ ...prev, id_asignatura: e.target.value }))}
                      disabled={loadingOptions || loading}
                      aria-label="Seleccionar asignatura"
                    >
                      <option value="">Seleccione...</option>
                      {asignaturas.map((a) => (
                        <option key={a.id_asignatura} value={String(a.id_asignatura)}>
                          {a.codigo} - {a.nombre} - Grupo {a.grupo} - Sede {a.sede || 'N/A'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Período <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={formData.periodo}
                      onChange={(e) => setFormData((prev) => ({ ...prev, periodo: e.target.value }))}
                      disabled={loading || !formData.id_asignatura}
                      aria-label="Seleccionar período"
                    >
                      <option value="">Seleccione...</option>
                      {periodos.map((p) => (
                        <option key={p.id_periodo} value={p.descripcion}>
                          {p.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedAsignatura && (
                  <div className="mb-3 small text-muted">
                    <i className="bi bi-journal-text me-1"></i>
                    Grupo: {selectedAsignatura.grupo || '-'} | 
                    Sede: {selectedAsignatura.sede || '-'} | 
                    Programa: {selectedAsignatura.programa || '-'} ({selectedAsignatura.programa_codigo || '-'})
                  </div>
                )}

                <div className="card border mb-3">
                  <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div>
                      <i className="bi bi-people me-2"></i>
                      Estudiantes disponibles ({availableStudents.length})
                    </div>
                    <div className="d-flex gap-2">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Buscar estudiante..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={selectVisible}>
                        Seleccionar visibles
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clearSelection}>
                        Limpiar
                      </button>
                    </div>
                  </div>
                  <div className="card-body matriculados-students-scroll">
                    {loadingStudents ? (
                      <div className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Cargando estudiantes...</span>
                        </div>
                      </div>
                    ) : availableStudents.length === 0 ? (
                      <div className="text-center text-muted py-3">No hay estudiantes para este filtro.</div>
                    ) : (
                      <>
                        <div className="table-responsive">
                          <table className="table table-sm align-middle mb-0">
                            <thead className="table-light">
                              <tr>
                                <th className="matriculados-col-select">Acción</th>
                                <th>Código</th>
                                <th>Nombre</th>
                                <th>Correo</th>
                                <th>Documento</th>
                                <th>Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {visibleStudents.map((s) => {
                                const already = alreadyEnrolledCodes.has(s.codigo_estudiante)
                                const checked = !!selectedStudents[s.codigo_estudiante]
                                const isUnenrolling = unenrollingCode === s.codigo_estudiante
                                return (
                                  <tr key={s.codigo_estudiante}>
                                    <td>
                                      {already ? (
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-danger"
                                          disabled={loading || isUnenrolling || !enrolledRowsByCode[s.codigo_estudiante]}
                                          onClick={() => handleUnenroll(s.codigo_estudiante)}
                                          aria-label={`Desmatricular ${s.codigo_estudiante}`}
                                        >
                                          {isUnenrolling ? 'Desmatriculando...' : 'Desmatricular'}
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          className={`btn btn-sm ${checked ? 'btn-danger' : 'btn-outline-success'}`}
                                          disabled={loading}
                                          onClick={() => toggleStudent(s.codigo_estudiante, !checked)}
                                          aria-label={`${checked ? 'Quitar' : 'Añadir'} ${s.codigo_estudiante}`}
                                        >
                                          {checked ? 'Quitar' : 'Añadir'}
                                        </button>
                                      )}
                                    </td>
                                    <td><span className="badge bg-secondary">{s.codigo_estudiante}</span></td>
                                    <td>{s.nombre} {s.apellido}</td>
                                    <td>{s.correo}</td>
                                    <td>{formatTipoDocumentoAbbr(s.tipo_documento)}: {s.num_documento}</td>
                                    <td>
                                      {already ? (
                                        <span className="badge bg-warning text-dark">Ya matriculado</span>
                                      ) : (
                                        <span className="badge bg-success">Disponible</span>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                        <PaginationControls
                          page={studentPage}
                          totalPages={studentMaxPage}
                          totalItems={availableStudents.length}
                          pageSize={pageSize}
                          onPageChange={setStudentPage}
                          onPageSizeChange={(size) => {
                            setStudentPage(1)
                            setPageSize(size)
                          }}
                          label="estudiantes disponibles"
                          className="px-3 pb-3"
                        />
                      </>
                    )}
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <small className="text-muted">
                    Seleccionados: <strong>{selectedStudentCodes.length}</strong>
                  </small>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        clearSelection()
                      }}
                      disabled={loading}
                    >
                      Reiniciar selección
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loading || !isFormValid}>
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Matriculando...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-lg me-2"></i>
                          Matricular Estudiantes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}

export default Matriculados
