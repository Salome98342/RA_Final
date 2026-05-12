import React, { useEffect, useMemo, useState, useRef } from 'react'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import ModuleBreadcrumbs from '@/components/ModuleBreadcrumbs'
import Alert from '@/utils/alert'
import { useNavigate, useLocation } from 'react-router-dom'
import { fetchAsignaturas, fetchAsignaturaAvance, fetchPeriodosCoordinador, type AsignaturaRow, type AvanceAsignaturaResponse } from '@/services/coordinador'
import { getIndicatorsByRA, getActivitiesByRA } from '@/services/api'
import type { Indicator, Activity } from '@/types'
import { isPeriodoAtLeast2024I, sortPeriodoDescriptionsDesc } from '@/utils/periodos'
import PaginationControls from '@/components/PaginationControls'
import { getErrorMessage } from '@/utils/errors'

// Simple helper to compute traffic-light by percentage (0-100)
function toneByPct(pct: number): 'success' | 'warning' | 'danger' {
  if (pct >= 70) return 'success'
  if (pct >= 40) return 'warning'
  return 'danger'
}

const DEFAULT_PAGE_SIZE = 10

const Asignaturas: React.FC = () => {
  const [periodo, setPeriodo] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [periodos, setPeriodos] = useState<string[]>([])
  const [asignaturas, setAsignaturas] = useState<AsignaturaRow[]>([])
  const [asignaturasTotal, setAsignaturasTotal] = useState(0)
  const [asignaturasPage, setAsignaturasPage] = useState(1)
  const [asignaturasPageSize, setAsignaturasPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selected, setSelected] = useState<AsignaturaRow | null>(null)
  const [avance, setAvance] = useState<AvanceAsignaturaResponse | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingAvance, setLoadingAvance] = useState(false)
  const [selectedRAId, setSelectedRAId] = useState<string | null>(null)
  const [raIndicators, setRaIndicators] = useState<Indicator[] | null>(null)
  const [raActivities, setRaActivities] = useState<Activity[] | null>(null)
  const [loadingRAData, setLoadingRAData] = useState(false)
  const [raDataError, setRaDataError] = useState<string | null>(null)
  
  // Ref para manejar el timer de doble clic
  const clickTimer = useRef<NodeJS.Timeout | null>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const active = location.pathname.includes('/docentes') ? 'docentes' : location.pathname.includes('/estudiantes') ? 'estudiantes' : location.pathname.includes('/matriculados') ? 'matriculados' : location.pathname.includes('/asignaturas-ra') ? 'asignaturas-ra' : location.pathname.includes('/imports') ? 'imports' : 'asignaturas'
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

  const asignaturasMaxPage = Math.max(1, Math.ceil(asignaturasTotal / asignaturasPageSize))

  // Load list of subjects for selected period.
  const loadAsignaturas = async (p: string) => {
    setLoadingList(true)
    try {
      const data = await fetchAsignaturas({
        page: asignaturasPage,
        page_size: asignaturasPageSize,
        periodo: p || undefined,
        search: searchTerm.trim() || undefined,
      })
      setAsignaturas(data.results)
      setAsignaturasTotal(data.total)
      // Keep current selection only if it still exists after filtering.
      setSelected((sel) => {
        if (!data.results.length) return null
        if (!sel) return data.results[0]
        const exists = data.results.some((r) => r.id_asignatura === sel.id_asignatura)
        return exists ? sel : data.results[0]
      })
    } catch (error: unknown) {
      Alert.error(getErrorMessage(error, 'No se pudo cargar la lista de asignaturas'))
    } finally { setLoadingList(false) }
  }

  // Load periods from coordinator catalog and default to latest period >= 2024-I.
  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        const data = await fetchPeriodosCoordinador()
        if (!mounted) return
        const list = sortPeriodoDescriptionsDesc(
          (Array.isArray(data) ? data : [])
            .map((p) => String(p.descripcion || '').trim())
            .filter((d) => d && isPeriodoAtLeast2024I(d))
        )
        setPeriodos(list)
        setPeriodo((prev) => prev || list[0] || '')
      } catch {
        if (!mounted) return
        setPeriodos([])
        setPeriodo('')
      }
    }
    run()
    return () => { mounted = false }
  }, [])

  // When period changes, refresh subject list and avance.
  useEffect(() => {
    if (!periodo) return
    if (asignaturasPage !== 1) {
      setAsignaturasPage(1)
      return
    }
    loadAsignaturas(periodo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, asignaturasPage, searchTerm])

  useEffect(() => {
    setAsignaturasPage(1)
  }, [searchTerm])

  useEffect(() => {
    if (asignaturasPage > asignaturasMaxPage) {
      setAsignaturasPage(asignaturasMaxPage)
    }
  }, [asignaturasMaxPage, asignaturasPage])

  // Load RA progress for selected subject & period.
  useEffect(() => {
    const run = async () => {
      if (!selected) { setAvance(null); return }
      setLoadingAvance(true)
      try {
        const data = await fetchAsignaturaAvance({ codigo_asignatura: selected.codigo, periodo: periodo || undefined })
        setAvance(data)
      } catch {
        setAvance(null)
      } finally { setLoadingAvance(false) }
    }
    run()
  }, [selected, periodo])

  const rightTitle = useMemo(() => (
    selected
      ? `${selected.codigo} - ${selected.nombre} - Grupo ${selected.grupo || 'N/A'} - Sede ${selected.sede || 'N/A'}`
      : 'Selecciona una asignatura'
  ), [selected])

  // Fetch indicators + activities for selected RA
  useEffect(()=>{
    let abort = false
    const run = async () => {
      if (!selected || !selectedRAId) { setRaIndicators(null); setRaActivities(null); return }
      setLoadingRAData(true); setRaDataError(null)
      try {
        const [inds, acts] = await Promise.all([
          getIndicatorsByRA(selectedRAId),
          getActivitiesByRA(selectedRAId),
        ])
        if (abort) return
        setRaIndicators(inds)
        setRaActivities(acts)
      } catch (error: unknown) {
        if (abort) return
        setRaIndicators(null); setRaActivities(null)
        const msg = getErrorMessage(error, 'Error al cargar detalle del RA')
        setRaDataError(msg)
        Alert.toast.error(msg)
      } finally { if (!abort) setLoadingRAData(false) }
    }
    run()
    return () => { abort = true }
  }, [selected, selectedRAId])

  // Manejar clic simple vs doble clic en asignaturas
  const handleMateriaClick = (m: AsignaturaRow) => {
    // Cancelar timer previo si existe
    if (clickTimer.current) {
      clearTimeout(clickTimer.current)
      clickTimer.current = null
    }
    // Esperar para distinguir entre clic simple y doble
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null
      setSelected(m) // Clic simple: seleccionar materia
    }, 250)
  }

  const handleMateriaDoubleClick = (m: AsignaturaRow) => {
    // Cancelar timer del clic simple
    if (clickTimer.current) {
      clearTimeout(clickTimer.current)
      clickTimer.current = null
    }
    // Navegar a la página de análisis
    navigate(`/coordinador/asignaturas/${m.codigo}/analitica`, {
      state: {
        returnTo: '/coordinador/asignaturas',
        id_asignatura: m.id_asignatura,
        grupo: m.grupo,
        sede: m.sede,
      }
    })
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
          <div className="content-title mb-3">
            <span className="d-inline-flex align-items-center justify-content-center text-danger" style={{ width: 18, height: 18 }}>
              <i className="bi bi-journals" style={{ fontSize: '0.8rem', lineHeight: 1 }} aria-hidden="true" />
            </span>
            <span>Vista de Asignaturas por Período</span>
          </div>
          <ModuleBreadcrumbs
            items={[
              { label: 'Coordinador', to: '/coordinador' },
              { label: 'Asignaturas' },
            ]}
            onNavigate={(to) => navigate(to)}
          />
          <section className="panel shown">
            <div className="alert alert-info d-flex align-items-center py-2" role="note">
              <i className="bi bi-mouse2 me-2"></i>
              Clic para seleccionar una asignatura. Doble clic sobre una asignatura para abrir su análisis general.
            </div>
            {/* Controls */}
            <div className="row g-2 mb-3 align-items-end">
              <div className="col-md-4">
                <label htmlFor="periodoSelect" className="form-label">Período</label>
                <select id="periodoSelect" className="form-select" value={periodo} onChange={(e)=>setPeriodo(e.target.value)}>
                  {!periodos.length && <option value="">Sin períodos disponibles desde 2024-I</option>}
                  {periodos.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="col-md-5">
                <label htmlFor="asignaturaSearch" className="form-label">Buscar asignatura</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-search" aria-hidden="true"></i>
                  </span>
                  <input
                    id="asignaturaSearch"
                    type="text"
                    className="form-control"
                    placeholder="Código o nombre"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Two-panel layout */}
            <div className="row g-3">
              <div className="col-md-4">
                <div className="ra-card h-100 shadow-sm">
                  <div className="ra-card-body">
                    <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                      <i className="bi bi-journals text-primary"></i>
                      <span className="fw-bold asignaturas-panel-title">Asignaturas {periodo ? `(${periodo})` : ''}</span>
                      {asignaturas.length > 0 && (
                        <span className="badge bg-primary rounded-pill ms-auto">{asignaturasTotal}</span>
                      )}
                    </div>
                    <div className="list-group asignaturas-scroll">
                      {loadingList && <div className="text-muted">Cargando…</div>}
                      {!loadingList && asignaturas.length === 0 && <div className="text-muted">No hay asignaturas registradas en el período seleccionado.</div>}
                      {!loadingList && asignaturas.map(m => (
                        <button
                          key={m.id_asignatura}
                          className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center asignaturas-item ${selected?.codigo===m.codigo?'active':''}`}
                          onClick={()=>handleMateriaClick(m)}
                          onDoubleClick={()=>handleMateriaDoubleClick(m)}
                          title="Clic para seleccionar, doble clic para análisis detallado"
                          aria-current={selected?.codigo===m.codigo ? 'true' : undefined}
                        >
                          <div className="asignaturas-item-main">
                            <div className="fw-semibold asignaturas-item-title">
                              {m.codigo} - {m.nombre} - Grupo {m.grupo || 'N/A'} - Sede {m.sede || 'N/A'}
                              <i className="bi bi-bar-chart-line ms-2 text-primary opacity-50" style={{ fontSize: '0.85rem' }}></i>
                            </div>
                            <div className="ra-small text-muted asignaturas-item-subtitle">{m.docente || 'Sin docente'}</div>
                          </div>
                          <span className="badge bg-light text-dark asignaturas-item-badge">{m.total_ras} RAs</span>
                        </button>
                      ))}
                    </div>
                    <PaginationControls
                      page={asignaturasPage}
                      totalPages={asignaturasMaxPage}
                      totalItems={asignaturasTotal}
                      pageSize={asignaturasPageSize}
                      onPageChange={setAsignaturasPage}
                      onPageSizeChange={(size) => {
                        setAsignaturasPage(1)
                        setAsignaturasPageSize(size)
                      }}
                      label="asignaturas"
                    />
                  </div>
                </div>
              </div>
              <div className="col-md-8">
                <div className="ra-card h-100 shadow-sm">
                  <div className="ra-card-body">
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                      <div className="d-flex align-items-center gap-2 asignaturas-right-title-wrap">
                        <i className="bi bi-bar-chart-line text-success"></i>
                        <span className="fw-bold asignaturas-right-title">{rightTitle}</span>
                      </div>
                      {/* Botón para ver vista del docente con ruta de retorno */}
                      {selected && (
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          onClick={()=>navigate(`/docente/${selected.codigo}/ras`, { state: { returnTo: '/coordinador/asignaturas' } })}
                            title="Abrir vista del docente"
                        >
                          <i className="bi bi-eye me-1"></i>
                            Vista docente
                        </button>
                      )}
                    </div>

                    {!selected && (
                      <div className="text-center text-muted py-5">
                        <i className="bi bi-arrow-left-circle d-block mb-3 ra-empty-state-icon"></i>
                        <p>Elige una asignatura a la izquierda para ver sus resultados de aprendizaje.</p>
                      </div>
                    )}
                    {selected && loadingAvance && (
                      <div className="text-center text-muted py-4">
                        <div className="spinner-border text-primary mb-2" role="status">
                          <span className="visually-hidden">Cargando...</span>
                        </div>
                        <p>Cargando resultados de aprendizaje…</p>
                      </div>
                    )}

                    {selected && !loadingAvance && avance && (
                      <>
                        <div className="row g-3">
                          {avance.ras.map(r => {
                            const raNumero = r.numero_ra ?? r.id_ra
                            const pct = r.avg != null ? Math.round((r.avg/5)*100) : 0
                            const tone = toneByPct(pct)
                            const step = Math.round(pct/10)*10
                            const widthClass = `w-pct-${step}`
                            const icon = tone === 'success' ? '🟢' : (tone === 'warning' ? '🟡' : '🔴')
                            const isActive = selectedRAId === String(r.id_ra)
                            return (
                              <div key={r.id_ra} className="col-12 col-sm-6 col-lg-4">
                                <button
                                  type="button"
                                  onClick={()=> setSelectedRAId(String(r.id_ra))}
                                  className={`border rounded p-2 h-100 w-100 text-start bg-white ra-hover-card asignaturas-ra-card ${isActive?'border-primary shadow-sm':''}`}
                                  aria-label={`Seleccionar RA ${raNumero}`}
                                >
                                  <div className="d-flex align-items-center justify-content-between mb-1">
                                    <div className="fw-semibold">RA {raNumero}</div>
                                    <span className={`badge bg-${tone}`}>{pct}%</span>
                                  </div>
                                  <div className="ra-small text-muted mb-2 asignaturas-ra-desc" title={r.descripcion || ''}>{r.descripcion || 'Sin descripción'}</div>
                                  <div className="d-flex align-items-center gap-2">
                                    <div className="progress progress-compact flex-grow-1" aria-hidden="true">
                                      <div className={`progress-bar bg-${tone} ${widthClass}`} />
                                    </div>
                                    <span className="ra-small" aria-hidden="true">{icon}</span>
                                  </div>
                                </button>
                              </div>
                            )
                          })}
                        </div>
                        {/* RA detail panel - Mejorado con animaciones y mejor diseño */}
                        {selectedRAId && (
                          <div className="mt-4 border-top pt-3 ra-detail-panel">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                              <div className="d-flex align-items-center gap-2">
                                <i className="bi bi-info-circle text-primary ra-detail-icon-lg"></i>
                                <span className="fw-bold">Detalle RA {selectedRAId}</span>
                              </div>
                              <button 
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setSelectedRAId(null)}
                                title="Cerrar detalle"
                              >
                                <i className="bi bi-x-lg"></i>
                              </button>
                            </div>
                            {loadingRAData && (
                              <div className="text-center text-muted py-3">
                                <div className="spinner-border spinner-border-sm me-2" role="status">
                                  <span className="visually-hidden">Cargando...</span>
                                </div>
                                Cargando detalle…
                              </div>
                            )}
                            {raDataError && (
                              <div className="alert alert-danger d-flex align-items-center py-2 px-3 mb-2">
                                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                {raDataError}
                              </div>
                            )}
                            {!loadingRAData && !raDataError && (
                              <div className="row g-3">
                                <div className="col-md-6">
                                  <div className="border rounded p-3 h-100 bg-light bg-opacity-25">
                                    <div className="d-flex align-items-center gap-2 mb-3">
                                      <i className="bi bi-bullseye text-success"></i>
                                      <span className="fw-semibold">Indicadores</span>
                                      {raIndicators && raIndicators.length > 0 && (
                                        <span className="badge bg-success rounded-pill">{raIndicators.length}</span>
                                      )}
                                    </div>
                                    {(!raIndicators || raIndicators.length===0) && (
                                      <div className="text-muted text-center py-3 ra-small">
                                        <i className="bi bi-inbox d-block mb-2 ra-detail-empty-icon"></i>
                                        Sin indicadores definidos
                                      </div>
                                    )}
                                    {raIndicators && raIndicators.map((ind, idx) => (
                                      <div 
                                        key={ind.id} 
                                        className={`d-flex justify-content-between align-items-start ra-small py-2 asignaturas-detail-row ${idx < raIndicators.length - 1 ? 'border-bottom' : ''}`}
                                      >
                                        <div className="flex-grow-1 pe-2 asignaturas-detail-main">
                                          <div className="mb-1 asignaturas-detail-line" title={ind.descripcion}>
                                            <i className="bi bi-dot"></i>
                                            {ind.descripcion || '—'}
                                          </div>
                                        </div>
                                        <span className="badge bg-success bg-opacity-75">{ind.porcentaje}%</span>
                                      </div>
                                    ))}
                                    {raIndicators && raIndicators.length > 0 && (
                                      <div className="mt-3 pt-2 border-top d-flex justify-content-between align-items-center ra-small text-muted">
                                        <span>Total ponderación:</span>
                                        <span className="fw-bold">
                                          {raIndicators.reduce((sum, ind) => sum + ind.porcentaje, 0)}%
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="col-md-6">
                                  <div className="border rounded p-3 h-100 bg-light bg-opacity-25">
                                    <div className="d-flex align-items-center gap-2 mb-3">
                                      <i className="bi bi-clipboard-check text-primary"></i>
                                      <span className="fw-semibold">Actividades</span>
                                      {raActivities && raActivities.length > 0 && (
                                        <span className="badge bg-primary rounded-pill">{raActivities.length}</span>
                                      )}
                                    </div>
                                    {(!raActivities || raActivities.length===0) && (
                                      <div className="text-muted text-center py-3 ra-small">
                                        <i className="bi bi-inbox d-block mb-2 ra-detail-empty-icon"></i>
                                        Sin actividades creadas
                                      </div>
                                    )}
                                    {raActivities && raActivities.map((act, idx) => (
                                      <div 
                                        key={act.id} 
                                        className={`d-flex justify-content-between align-items-start ra-small py-2 asignaturas-detail-row ${idx < raActivities.length - 1 ? 'border-bottom' : ''}`}
                                      >
                                        <div className="flex-grow-1 pe-2 asignaturas-detail-main">
                                          <div className="mb-1 asignaturas-detail-line" title={act.nombre}>
                                            <i className="bi bi-check-circle me-1"></i>
                                            {act.nombre || '—'}
                                          </div>
                                          {act.tipoActividad && (
                                            <div className="text-muted ra-detail-tag-text">
                                              <i className="bi bi-tag-fill me-1"></i>
                                              {act.tipoActividad}
                                            </div>
                                          )}
                                        </div>
                                        <span className="badge bg-primary bg-opacity-75" title="Porcentaje dentro del RA">
                                          {act.porcentajeRA}%
                                        </span>
                                      </div>
                                    ))}
                                    {raActivities && raActivities.length > 0 && (
                                      <div className="mt-3 pt-2 border-top d-flex justify-content-between align-items-center ra-small text-muted">
                                        <span>Total ponderación:</span>
                                        <span className="fw-bold">
                                          {raActivities.reduce((sum, act) => sum + (act.porcentajeRA ?? 0), 0)}%
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {selected && !loadingAvance && !avance && (
                      <div className="alert alert-info d-flex align-items-center">
                        <i className="bi bi-info-circle me-2"></i>
                        Sin datos de avance para este periodo.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </section>
        </main>
      </div>
    </div>
  )
}

export default Asignaturas
