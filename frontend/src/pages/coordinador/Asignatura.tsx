import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import ModuleBreadcrumbs from '@/components/ModuleBreadcrumbs'
import Alert from '@/utils/alert'
import { getApiErrorMessage } from '@/utils/alertMessages'
import { getPeriodosByCourse } from '@/services/api'
import {
  fetchAsignaturas,
  fetchAsignaturaAvance,
  fetchAsignaturaEstudiantes,
  fetchAsignaturaRAs,
  type AsignaturaRow,
  type AvanceAsignaturaResponse,
  type EstudianteRow,
  type RARow,
} from '@/services/coordinador'
import { isPeriodoAtLeast2024I, sortPeriodosDesc } from '@/utils/periodos'
import PaginationControls from '@/components/PaginationControls'

const DEFAULT_PAGE_SIZE = 10

const AsignaturaDetalle: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>()
  const [asignaturas, setAsignaturas] = useState<AsignaturaRow[]>([])
  const [selectedCodigo, setSelectedCodigo] = useState(codigo || '')
  const [loadingAsignaturas, setLoadingAsignaturas] = useState(false)
  const [periodo, setPeriodo] = useState('')
  const [periodoActual, setPeriodoActual] = useState<string | null>(null)
  const [periodos, setPeriodos] = useState<{ id: string; descripcion: string }[]>([])

  const [estRows, setEstRows] = useState<EstudianteRow[]>([])
  const [estTotal, setEstTotal] = useState(0)
  const [estPage, setEstPage] = useState(1)
  const [estPageSize, setEstPageSize] = useState(DEFAULT_PAGE_SIZE)

  const [rasRows, setRasRows] = useState<RARow[]>([])
  const [avance, setAvance] = useState<AvanceAsignaturaResponse | null>(null)

  const [loadingEst, setLoadingEst] = useState(false)
  const [loadingRAs, setLoadingRAs] = useState(false)
  const [loadingAvance, setLoadingAvance] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

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

  const maxPage = useMemo(() => Math.max(1, Math.ceil(estTotal / estPageSize)), [estPageSize, estTotal])

  const loadAsignaturas = useCallback(async () => {
    setLoadingAsignaturas(true)
    try {
      const data = await fetchAsignaturas({ page: 1, page_size: 500 })
      setAsignaturas(data.results || [])
      if (!selectedCodigo && data.results?.length) {
        setSelectedCodigo(data.results[0].codigo)
      }
    } catch {
      setAsignaturas([])
    } finally {
      setLoadingAsignaturas(false)
    }
  }, [selectedCodigo])

  const loadPeriodos = useCallback(async () => {
    if (!selectedCodigo) {
      setPeriodos([])
      setPeriodoActual(null)
      setPeriodo('')
      return
    }

    try {
      const raw = await getPeriodosByCourse(selectedCodigo)
      const list = sortPeriodosDesc(
        raw.filter((p) => isPeriodoAtLeast2024I(p.descripcion))
      )
      setPeriodos(list)
      const latest = list.length ? list[0].descripcion : null
      setPeriodoActual(latest)
      setPeriodo((prev) => {
        if (prev && list.some((p) => p.descripcion === prev)) return prev
        return latest || ''
      })
    } catch {
      setPeriodos([])
      setPeriodoActual(null)
      setPeriodo('')
    }
  }, [selectedCodigo])

  const loadEstudiantes = useCallback(async () => {
    if (!selectedCodigo) return
    setLoadingEst(true)
    try {
      const data = await fetchAsignaturaEstudiantes({
        codigo_asignatura: selectedCodigo,
        periodo: periodo || undefined,
        page: estPage,
        page_size: estPageSize,
      })
      setEstRows(data.results)
      setEstTotal(data.total)
    } catch (e: unknown) {
      Alert.error(getApiErrorMessage(e) || 'No se pudo cargar la lista de estudiantes.')
    } finally {
      setLoadingEst(false)
    }
  }, [selectedCodigo, periodo, estPage, estPageSize])

  const loadRAs = useCallback(async () => {
    if (!selectedCodigo) return
    setLoadingRAs(true)
    try {
      const data = await fetchAsignaturaRAs({ codigo_asignatura: selectedCodigo, periodo: periodo || undefined })
      setRasRows(data.ras)
    } catch {
      setRasRows([])
    } finally {
      setLoadingRAs(false)
    }
  }, [selectedCodigo, periodo])

  const loadAvance = useCallback(async () => {
    if (!selectedCodigo) return
    setLoadingAvance(true)
    try {
      const data = await fetchAsignaturaAvance({ codigo_asignatura: selectedCodigo, periodo: periodo || undefined })
      setAvance(data)
    } catch {
      setAvance(null)
    } finally {
      setLoadingAvance(false)
    }
  }, [selectedCodigo, periodo])

  useEffect(() => {
    loadAsignaturas()
  }, [loadAsignaturas])

  useEffect(() => {
    if (codigo && codigo !== selectedCodigo) {
      setSelectedCodigo(codigo)
    }
  }, [codigo, selectedCodigo])

  useEffect(() => {
    loadPeriodos()
  }, [loadPeriodos])

  useEffect(() => {
    loadEstudiantes()
  }, [loadEstudiantes])

  useEffect(() => {
    loadRAs()
    loadAvance()
  }, [loadRAs, loadAvance])

  useEffect(() => {
    setEstPage(1)
  }, [periodo, estPageSize])

  useEffect(() => {
    if (!selectedCodigo) return
    if (selectedCodigo !== codigo) {
      navigate(`/coordinador/asignatura/${selectedCodigo}`, { replace: true })
    }
    setEstPage(1)
  }, [selectedCodigo, codigo, navigate])

  const handleApplyFilters = async () => {
    setRefreshing(true)
    try {
      if (estPage !== 1) {
        setEstPage(1)
      } else {
        await loadEstudiantes()
      }
      await Promise.all([loadRAs(), loadAvance()])
    } finally {
      setRefreshing(false)
    }
  }

  const overallPct = avance?.total.avg != null ? Math.max(0, Math.min(100, Math.round((avance.total.avg / 5) * 100))) : 0
  const overallStep = Math.round(overallPct / 10) * 10

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
          <div className="content-title d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <i className="bi bi-journal-bookmark me-2"></i>
              Detalle de Asignatura: {selectedCodigo || 'Sin código'}
            </div>
            <button className="btn btn-sm btn-outline-primary" onClick={() => navigate('/coordinador/asignaturas')}>
              <i className="bi bi-arrow-left me-1"></i>
              Volver a Asignaturas
            </button>
          </div>

          <ModuleBreadcrumbs
            items={[
              { label: 'Coordinador', to: '/coordinador' },
              { label: 'Asignaturas', to: '/coordinador/asignaturas' },
              { label: 'Detalle de Asignatura' },
            ]}
            onNavigate={(to) => navigate(to)}
          />

          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-funnel me-2"></i>
                Filtros
              </h5>
            </div>
            <div className="card-body">
              <div className="row align-items-end g-3">
                <div className="col-md-6 col-lg-5">
                  <label className="form-label">Asignatura registrada</label>
                  <select
                    className="form-select"
                    value={selectedCodigo}
                    onChange={(e) => setSelectedCodigo(e.target.value)}
                    aria-label="Seleccionar asignatura"
                    disabled={loadingAsignaturas}
                  >
                    {!selectedCodigo && <option value="">Seleccione una asignatura...</option>}
                    {asignaturas.map((a) => (
                      <option key={a.id_asignatura} value={a.codigo}>
                        {a.codigo} - {a.nombre} - Grupo {a.grupo} - Sede {a.sede || 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6 col-lg-4">
                  <label className="form-label">Período</label>
                  <div className="d-flex gap-2">
                    <select
                      className="form-select"
                      value={periodo}
                      onChange={(e) => setPeriodo(e.target.value)}
                      aria-label="Seleccionar período"
                    >
                      {!periodos.length && <option value="">Sin períodos desde 2024-I</option>}
                      {periodos.map((p) => (
                        <option key={p.id} value={p.descripcion}>
                          {p.descripcion}
                        </option>
                      ))}
                    </select>
                    {periodo && periodoActual && (
                      <span className={`badge align-self-center ${periodo === periodoActual ? 'bg-success' : 'bg-secondary'}`}>
                        {periodo === periodoActual ? 'Actual' : 'Anterior'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="col-md-6 col-lg-3">
                  <button
                    className="btn btn-primary w-100"
                    disabled={refreshing || loadingEst || loadingRAs || loadingAvance}
                    onClick={handleApplyFilters}
                  >
                    {refreshing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Actualizando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-repeat me-2"></i>
                        Aplicar filtro
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-graph-up-arrow me-2"></i>
                Estado General
              </h5>
            </div>
            <div className="card-body">
              {loadingAvance ? (
                <div className="text-center py-3">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando avance...</span>
                  </div>
                </div>
              ) : !avance ? (
                <div className="text-muted">No hay datos de avance para este filtro.</div>
              ) : (
                <>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    <span className="badge bg-secondary">Estudiantes: {avance.total_estudiantes}</span>
                    <span className="badge bg-success">OK: {Math.round(avance.total.ok_pct)}%</span>
                    <span className="badge bg-danger">Bajo: {Math.round(avance.total.low_pct)}%</span>
                    <span className="badge bg-info text-dark">Cobertura: {Math.round(avance.total.coverage_avg * 100)}%</span>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between small text-muted mb-1">
                      <span>Promedio del curso</span>
                      <span>{avance.total.avg != null ? `${avance.total.avg.toFixed(2)} / 5` : 'Sin datos'} ({overallPct}%)</span>
                    </div>
                    <div className="progress progress-compact">
                      <div
                        className={`progress-bar bg-primary w-pct-${overallStep}`}
                        role="progressbar"
                        aria-label="Promedio general de la asignatura"
                        title={`Promedio general ${overallPct}%`}
                      ></div>
                    </div>
                  </div>

                  <div className="row g-2">
                    {avance.ras.map((ra) => {
                      const raNumero = ra.numero_ra ?? ra.id_ra
                      const raPct = ra.avg != null ? Math.max(0, Math.min(100, Math.round((ra.avg / 5) * 100))) : 0
                      const raStep = Math.round(raPct / 10) * 10
                      return (
                        <div className="col-12" key={ra.id_ra}>
                          <div className="d-flex justify-content-between small text-muted mb-1">
                            <span>RA {raNumero}</span>
                            <span>{ra.avg != null ? `${ra.avg.toFixed(2)} / 5` : 'Sin datos'} ({raPct}%)</span>
                          </div>
                          <div className="progress progress-compact">
                            <div
                              className={`progress-bar bg-info w-pct-${raStep}`}
                              role="progressbar"
                              aria-label={`Porcentaje de desempeño RA ${raNumero}`}
                              title={`RA ${raNumero}: ${raPct}%`}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="row g-4">
            <div className="col-lg-7">
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <i className="bi bi-people me-2"></i>
                    Estudiantes ({estTotal})
                  </h5>
                  <span className="text-muted small">Página {estPage} de {maxPage}</span>
                </div>
                <div className="card-body p-0">
                  {loadingEst ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Cargando estudiantes...</span>
                      </div>
                    </div>
                  ) : estRows.length === 0 ? (
                    <div className="text-center text-muted py-5">
                      <i className="bi bi-inbox display-5 d-block mb-3"></i>
                      No hay estudiantes para el filtro seleccionado.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Código</th>
                            <th>Nombre</th>
                            <th>Apellido</th>
                            <th>Periodo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {estRows.map((row) => (
                            <tr key={row.id_matricula}>
                              <td><span className="badge bg-secondary">{row.codigo_estudiante}</span></td>
                              <td>{row.nombre}</td>
                              <td>{row.apellido}</td>
                              <td>{row.periodo}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="card-footer">
                  <PaginationControls
                    page={estPage}
                    totalPages={maxPage}
                    totalItems={estTotal}
                    pageSize={estPageSize}
                    onPageChange={setEstPage}
                    onPageSizeChange={(size) => {
                      setEstPage(1)
                      setEstPageSize(size)
                    }}
                    label="estudiantes"
                    className="mt-0"
                  />
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="bi bi-diagram-3 me-2"></i>
                    RAs de la Asignatura ({rasRows.length})
                  </h5>
                </div>
                <div className="card-body p-0">
                  {loadingRAs ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Cargando RAs...</span>
                      </div>
                    </div>
                  ) : rasRows.length === 0 ? (
                    <div className="text-center text-muted py-5">
                      <i className="bi bi-inbox display-5 d-block mb-3"></i>
                      No hay RAs registrados para este filtro.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>ID RA</th>
                            <th>Descripción</th>
                            <th>% RA</th>
                            <th>Actividades</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rasRows.map((row) => (
                            <tr key={row.id_ra}>
                              <td><span className="badge bg-secondary">RA {row.numero_ra ?? row.id_ra}</span></td>
                              <td>{row.descripcion || '-'}</td>
                              <td>{row.porcentaje_ra}%</td>
                              <td>{row.total_actividades}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default AsignaturaDetalle
