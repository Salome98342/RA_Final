import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchAsignaturaEstudiantes, fetchAsignaturaRAs, fetchAsignaturaAvance, type EstudianteRow, type RARow, type AvanceAsignaturaResponse } from '@/services/coordinador'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import { getPeriodosByCourse } from '@/services/api'

const AsignaturaDetalle: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>()
  const [periodo, setPeriodo] = useState('')
  const [estPage, setEstPage] = useState(1)
  const [estTotal, setEstTotal] = useState(0)
  const [estRows, setEstRows] = useState<EstudianteRow[]>([])
  const [rasRows, setRasRows] = useState<RARow[]>([])
  const [loadingEst, setLoadingEst] = useState(false)
  const [loadingRAs, setLoadingRAs] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pageSize = 20
  const [avance, setAvance] = useState<AvanceAsignaturaResponse | null>(null)
  const [periodos, setPeriodos] = useState<{ id: string; descripcion: string }[]>([])
  const [periodoActual, setPeriodoActual] = useState<string | null>(null)

  const loadEstudiantes = async () => {
    if (!codigo) return
    setLoadingEst(true); setError(null)
    try {
      const data = await fetchAsignaturaEstudiantes({ codigo_asignatura: codigo, periodo: periodo || undefined, page: estPage, page_size: pageSize })
      setEstRows(data.results); setEstTotal(data.total)
    } catch (e: any) { setError(String(e?.response?.data?.detail || e.message)) } finally { setLoadingEst(false) }
  }
  const loadRAs = async () => {
    if (!codigo) return
    setLoadingRAs(true)
    try {
      const data = await fetchAsignaturaRAs({ codigo_asignatura: codigo, periodo: periodo || undefined })
      setRasRows(data.ras)
    } catch (e: any) { /* ignore for now */ } finally { setLoadingRAs(false) }
  }

  const loadAvance = async () => {
    if (!codigo) return
    try {
      const data = await fetchAsignaturaAvance({ codigo_asignatura: codigo, periodo: periodo || undefined })
      setAvance(data)
    } catch (e) {
      // no bloquear página por error de avance
      if (import.meta.env.DEV) console.warn('No se pudo cargar avance', e)
      setAvance(null)
    }
  }

  useEffect(()=>{ loadEstudiantes(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [estPage, codigo])
  useEffect(()=>{ loadRAs(); loadAvance(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [codigo])

  // Cargar lista de periodos por asignatura y detectar el actual (último por fecha)
  useEffect(() => {
    let mounted = true
    const run = async () => {
      if (!codigo) { setPeriodos([]); setPeriodoActual(null); return }
      try {
        const list = await getPeriodosByCourse(codigo)
        if (!mounted) return
        setPeriodos(list)
        const curr = list.length ? list[list.length - 1].descripcion : null
        setPeriodoActual(curr)
      } catch {
        if (!mounted) return
        setPeriodos([]); setPeriodoActual(null)
      }
    }
    run()
    return () => { mounted = false }
  }, [codigo])

  const maxPage = Math.max(1, Math.ceil(estTotal / pageSize))

  const location = useLocation()
  const navigate = useNavigate()
  const active = location.pathname.includes('/imports') ? 'imports' : 'materias'
  const items = [
    { key: 'materias', icon: 'bi-journals', title: 'Materias' },
    { key: 'imports', icon: 'bi-upload', title: 'Imports' },
  ]

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Coordinador" />
      <div className="dash-wrapper">
        <Sidebar
          active={active}
          items={items}
          onClick={(key) => {
            if (key === 'materias') navigate('/coordinador/materias')
            else if (key === 'imports') navigate('/coordinador/imports')
          }}
        />
        <main className="dash-content">
          <div className="content-title">Asignatura: {codigo}</div>
          <section className="panel shown">
            {/* Resumen visual de avance */}
            <div className="ra-card mb-3">
              <div className="ra-card-body">
                <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between mb-2">
                  <div className="fw-bold">Estado general</div>
                  {avance && (
                    <div className="ra-small text-muted">
                      Estudiantes: {avance.total_estudiantes} · Umbral OK: {avance.total.threshold.toFixed(1)}
                    </div>
                  )}
                </div>
                {avance ? (
                  <div className="row g-3 align-items-center">
                    <div className="col-md-6">
                      <div className="mb-1">Promedio del curso</div>
                      {(() => {
                        const val = avance.total.avg != null ? Math.round((avance.total.avg / 5) * 100) : 0
                        const step = Math.round(val / 10) * 10
                        const widthClass = `w-pct-${step}`
                        return (
                          <div>
                            <div className="progress progress-compact">
                              <div className={`progress-bar bg-danger ${widthClass}`} aria-hidden="true" />
                            </div>
                            <div className="ra-small text-muted mt-1 d-flex justify-content-between">
                              <span>{avance.total.avg != null ? `${avance.total.avg.toFixed(2)} / 5` : 'Sin datos'}</span>
                              <span>{val}%</span>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                    <div className="col-md-6">
                      <div className="d-flex gap-2 align-items-center">
                        <span className="badge bg-success">OK {Math.round(avance.total.ok_pct)}%</span>
                        <span className="badge bg-danger">Bajo {Math.round(avance.total.low_pct)}%</span>
                        <span className="ra-small text-muted ms-auto">Cobertura promedio {(avance.total.coverage_avg*100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="mt-2">
                        <div className="fw-bold mb-1">Promedio por RA</div>
                        <div className="row g-2">
                          {avance.ras.map(r => {
                            const val = r.avg != null ? Math.round((r.avg / 5) * 100) : 0
                            const step = Math.round(val / 10) * 10
                            const widthClass = `w-pct-${step}`
                            return (
                              <div className="col-12" key={r.id_ra}>
                                <div className="d-flex justify-content-between align-items-center ra-small text-muted">
                                  <span>RA {r.id_ra}</span>
                                  <span>{val}%</span>
                                </div>
                                <div className="progress progress-compact">
                                  <div className={`progress-bar bg-danger ${widthClass}`} aria-hidden="true" />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted">No hay datos de avance aún.</div>
                )}
              </div>
            </div>
            <div className="row g-2 mb-3 align-items-end">
              <div className="col-md-4">
                <label className="form-label">Periodo</label>
                <div className="d-flex align-items-center gap-2">
                  <select className="form-select" value={periodo} onChange={e=>setPeriodo(e.target.value)} aria-label="Seleccionar periodo">
                    <option value="">Todos</option>
                    {periodoActual && (
                      <optgroup label="Actual">
                        <option value={periodoActual}>{periodoActual}</option>
                      </optgroup>
                    )}
                    {(() => {
                      const anteriors = periodos.filter(p => p.descripcion !== periodoActual)
                      if (!anteriors.length) return null
                      return (
                        <optgroup label="Anteriores">
                          {anteriors.map(p => <option key={p.id} value={p.descripcion}>{p.descripcion}</option>)}
                        </optgroup>
                      )
                    })()}
                  </select>
                  {periodo && periodoActual && (
                    <span className={`badge ${periodo === periodoActual ? 'bg-success' : 'bg-secondary'}`}>
                      {periodo === periodoActual ? 'Actual' : 'Anterior'}
                    </span>
                  )}
                </div>
              </div>
              <div className="col-md-4">
                <button
                  className="btn btn-danger btn-sm w-100"
                  disabled={loadingEst || loadingRAs}
                  onClick={()=>{setEstPage(1); loadEstudiantes(); loadRAs(); loadAvance()}}
                >
                  Aplicar filtro
                </button>
              </div>
              <div className="col-md-4">
                <button
                  className="btn btn-outline-danger btn-sm w-100"
                  onClick={()=>navigate('/coordinador/materias')}
                >
                  <i className="bi bi-arrow-left" /> Volver a Materias
                </button>
              </div>
            </div>
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="row">
              <div className="col-md-7">
                <div className="ra-card mb-3">
                  <div className="ra-card-body">
                    <div className="fw-bold mb-2">Estudiantes</div>
                    <div className="table-responsive">
                      <table className="table table-sm table-striped align-middle">
                        <thead><tr><th>Código</th><th>Nombre</th><th>Apellido</th><th>Periodo</th></tr></thead>
                        <tbody>{estRows.map(r => <tr key={r.id_matricula}><td>{r.codigo_estudiante}</td><td>{r.nombre}</td><td>{r.apellido}</td><td>{r.periodo}</td></tr>)}</tbody>
                      </table>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <small>Total: {estTotal}</small>
                      <div className="btn-group">
                        <button className="btn btn-sm btn-outline-secondary" disabled={estPage<=1 || loadingEst} onClick={()=>setEstPage(p=>p-1)}>Prev</button>
                        <button className="btn btn-sm btn-outline-secondary" disabled>{estPage}/{maxPage}</button>
                        <button className="btn btn-sm btn-outline-secondary" disabled={estPage>=maxPage || loadingEst} onClick={()=>setEstPage(p=>p+1)}>Next</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-5">
                <div className="ra-card mb-3">
                  <div className="ra-card-body">
                    <div className="fw-bold mb-2">RAs</div>
                    <div className="table-responsive">
                      <table className="table table-sm table-striped align-middle">
                        <thead><tr><th>ID</th><th>Descripción</th><th>% RA</th><th>Actividades</th></tr></thead>
                        <tbody>{rasRows.map(r => <tr key={r.id_ra}><td>{r.id_ra}</td><td>{r.descripcion}</td><td>{r.porcentaje_ra}</td><td>{r.total_actividades}</td></tr>)}</tbody>
                      </table>
                    </div>
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

export default AsignaturaDetalle
