import React, { useEffect, useMemo, useState, useRef } from 'react'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import { useNavigate, useLocation } from 'react-router-dom'
import { fetchAsignaturas, fetchAsignaturaAvance, type AsignaturaRow, type AvanceAsignaturaResponse } from '@/services/coordinador'
import { getPeriodosByCourse, getIndicatorsByRA, getActivitiesByRA } from '@/services/api'
import type { Indicator, Activity } from '@/types'

// Simple helper to compute traffic-light by percentage (0-100)
function toneByPct(pct: number): 'success' | 'warning' | 'danger' {
  if (pct >= 70) return 'success'
  if (pct >= 40) return 'warning'
  return 'danger'
}

const Materias: React.FC = () => {
  const [periodo, setPeriodo] = useState<string>('')
  const [periodos, setPeriodos] = useState<string[]>([])
  const [materias, setMaterias] = useState<AsignaturaRow[]>([])
  const [selected, setSelected] = useState<AsignaturaRow | null>(null)
  const [avance, setAvance] = useState<AvanceAsignaturaResponse | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingAvance, setLoadingAvance] = useState(false)
  const [selectedRAId, setSelectedRAId] = useState<string | null>(null)
  const [raIndicators, setRaIndicators] = useState<Indicator[] | null>(null)
  const [raActivities, setRaActivities] = useState<Activity[] | null>(null)
  const [loadingRAData, setLoadingRAData] = useState(false)
  const [raDataError, setRaDataError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Ref para manejar el timer de doble clic
  const clickTimer = useRef<NodeJS.Timeout | null>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const active = location.pathname.includes('/estudiantes') ? 'estudiantes' : location.pathname.includes('/imports') ? 'imports' : 'materias'
  const items = [
    { key: 'materias', icon: 'bi-journals', title: 'Materias' },
    { key: 'estudiantes', icon: 'bi-people', title: 'Estudiantes' },
    { key: 'imports', icon: 'bi-upload', title: 'Imports' },
  ]

  // Load list of subjects for current semester
  const loadMaterias = async (p: string) => {
    setLoadingList(true); setError(null)
    try {
      const data = await fetchAsignaturas({ page: 1, page_size: 100, periodo: p || undefined })
      setMaterias(data.results)
      // auto-select first when none selected
      setSelected((sel) => sel ?? (data.results.length ? data.results[0] : null))
    } catch (e: any) {
      setError(String(e?.response?.data?.detail || e.message))
    } finally { setLoadingList(false) }
  }

  // Find available semesters by sampling courses (best effort when no global endpoint)
  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        // Load some materias first (without filtro) to discover periods
        const data = await fetchAsignaturas({ page: 1, page_size: 50 })
        if (!mounted) return
        setMaterias((m) => m.length ? m : data.results)
        const codes = data.results.map((r) => r.codigo).slice(0, 25)
        const set = new Set<string>()
        for (const code of codes) {
          try {
            const ps = await getPeriodosByCourse(code)
            ps.forEach((p) => set.add(p.descripcion))
          } catch { /* ignore individual errors */ }
        }
        const list = Array.from(set)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
        if (!mounted) return
        setPeriodos(list)
      } catch {
        if (!mounted) return
        setPeriodos([])
      }
    }
    run()
    return () => { mounted = false }
  }, [])

  // When semester changes, refresh list and clear avance until subject selected
  useEffect(() => {
    loadMaterias(periodo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo])

  // Load RA progress for selected subject & semester
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
    selected ? `${selected.nombre} (${selected.codigo})` : 'Selecciona una materia'
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
      } catch (e: any) {
        if (abort) return
        setRaIndicators(null); setRaActivities(null)
        setRaDataError(String(e?.message || 'Error al cargar detalle del RA'))
      } finally { if (!abort) setLoadingRAData(false) }
    }
    run()
    return () => { abort = true }
  }, [selected, selectedRAId])

  // Manejar clic simple vs doble clic en materias
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
    navigate(`/coordinador/materias/${m.codigo}/analitica`, { state: { returnTo: '/coordinador/materias' } })
  }

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Coordinador" />
      <div className="dash-wrapper">
        <Sidebar
          active={active}
          items={items}
          onClick={(key) => {
            if (key === 'materias') navigate('/coordinador/materias')
            else if (key === 'estudiantes') navigate('/coordinador/estudiantes')
            else if (key === 'imports') navigate('/coordinador/imports')
          }}
        />
        <main className="dash-content">
          <div className="content-title">Vista de Materias por semestre</div>
          <section className="panel shown">
            {/* Controls */}
            <div className="row g-2 mb-3 align-items-end">
              <div className="col-md-4">
                <label htmlFor="periodoSelect" className="form-label">Semestre</label>
                <select id="periodoSelect" className="form-select" value={periodo} onChange={(e)=>setPeriodo(e.target.value)}>
                  <option value="">Todos</option>
                  {periodos.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="col-md-8 d-none d-md-block"><div className="text-muted small">Selecciona un semestre para listar sus materias y ver sus RA a la derecha.</div></div>
            </div>

            {/* Two-panel layout */}
            <div className="row g-3">
              <div className="col-md-4">
                <div className="ra-card h-100 shadow-sm">
                  <div className="ra-card-body">
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <i className="bi bi-journals text-primary"></i>
                      <span className="fw-bold">Materias {periodo ? `(${periodo})` : ''}</span>
                      {materias.length > 0 && (
                        <span className="badge bg-primary rounded-pill ms-auto">{materias.length}</span>
                      )}
                    </div>
                    <div className="list-group materias-scroll">
                      {loadingList && <div className="text-muted">Cargando…</div>}
                      {!loadingList && materias.length === 0 && <div className="text-muted">No hay materias.</div>}
                      {!loadingList && materias.map(m => (
                        <button
                          key={m.codigo}
                          className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selected?.codigo===m.codigo?'active':''}`}
                          onClick={()=>handleMateriaClick(m)}
                          onDoubleClick={()=>handleMateriaDoubleClick(m)}
                          title="Clic para seleccionar, doble clic para análisis detallado"
                          aria-current={selected?.codigo===m.codigo ? 'true' : undefined}
                        >
                          <div>
                            <div className="fw-semibold">
                              {m.codigo} · {m.nombre}
                              <i className="bi bi-bar-chart-line ms-2 text-primary opacity-50" style={{ fontSize: '0.85rem' }}></i>
                            </div>
                            <div className="ra-small text-muted">{m.docente || 'Sin docente'}</div>
                          </div>
                          <span className="badge bg-light text-dark">{m.total_ras} RAs</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-8">
                <div className="ra-card h-100 shadow-sm">
                  <div className="ra-card-body">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-bar-chart-line text-success"></i>
                        <span className="fw-bold">{rightTitle}</span>
                      </div>
                      {/* Botón para ver vista del docente con ruta de retorno */}
                      {selected && (
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          onClick={()=>navigate(`/docente/${selected.codigo}/ras`, { state: { returnTo: '/coordinador/materias' } })}
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
                        <p>Elige una materia a la izquierda para ver sus RAs</p>
                      </div>
                    )}
                    {selected && loadingAvance && (
                      <div className="text-center text-muted py-4">
                        <div className="spinner-border text-primary mb-2" role="status">
                          <span className="visually-hidden">Cargando...</span>
                        </div>
                        <p>Cargando RAs…</p>
                      </div>
                    )}

                    {selected && !loadingAvance && avance && (
                      <>
                        <div className="row g-3">
                          {avance.ras.map(r => {
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
                                  className={`border rounded p-2 h-100 w-100 text-start bg-white ra-hover-card ${isActive?'border-primary shadow-sm':''}`}
                                  aria-label={`Seleccionar RA ${r.id_ra}`}
                                >
                                  <div className="d-flex align-items-center justify-content-between mb-1">
                                    <div className="fw-semibold">RA {r.id_ra}</div>
                                    <span className={`badge bg-${tone}`}>{pct}%</span>
                                  </div>
                                  <div className="ra-small text-muted mb-2 text-truncate" title={r.descripcion || ''}>{r.descripcion || 'Sin descripción'}</div>
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
                                        className={`d-flex justify-content-between align-items-start ra-small py-2 ${idx < raIndicators.length - 1 ? 'border-bottom' : ''}`}
                                      >
                                        <div className="flex-grow-1 pe-2">
                                          <div className="text-truncate mb-1" title={ind.descripcion}>
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
                                        className={`d-flex justify-content-between align-items-start ra-small py-2 ${idx < raActivities.length - 1 ? 'border-bottom' : ''}`}
                                      >
                                        <div className="flex-grow-1 pe-2">
                                          <div className="text-truncate mb-1" title={act.nombre}>
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
                        Sin datos de avance para este semestre.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {error && <div className="alert alert-danger mt-3">{error}</div>}
          </section>
        </main>
      </div>
    </div>
  )
}

export default Materias
