import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import SearchPill from '@/components/SearchPill'
import CardGrid from '@/components/CardGrid'
import RaCard from '@/components/RaCard'
import StudentList from '@/components/StudentList'
import { getCourses, getRAsByCourse, getStudentsByCourse, getIndicatorsByRA, getActivitiesByRA, createActivityForRA, upsertGrade, getIndicatorChart, getRAValidation } from '@/services/api'
import type { Course, RA, Indicator, Activity, Student } from '@/types'
import { useSearchParams } from 'react-router-dom'
import { useSession } from '@/state/SessionContext'
import Chart from 'chart.js/auto'
import Toast from '@/components/Toast'

type View = 'cursos' | 'ra' | 'estudiantes'

const Docente: React.FC = () => {
  const [view, setView] = useState<View>('cursos')
  const [filter, setFilter] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [ras, setRas] = useState<RA[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedRA, setSelectedRA] = useState<RA | null>(null)
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<string>('')
  // Crear actividad
  const [newAct, setNewAct] = useState({ nombre: '', tipo: '1', pctRA: '' })
  const [newActError, setNewActError] = useState<string | null>(null)
  const [savingNewAct, setSavingNewAct] = useState(false)
  // Calificación
  const [grade, setGrade] = useState({ nota: '', retro: '', indicadorId: '' })
  const [raVal, setRaVal] = useState<{ actividades: { suma: number; ok: boolean; faltante: number }; indicadores: { suma: number; ok: boolean; faltante: number } } | null>(null)
  const chartRef = useRef<HTMLCanvasElement | null>(null)
  const chartInstance = useRef<Chart | null>(null)
  const [chartEmpty, setChartEmpty] = useState(false)
  const [toast, setToast] = useState<{ text: string; type?: 'ok' | 'error' } | null>(null)
  const [savingGrade, setSavingGrade] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [params, setParams] = useSearchParams()
  const { state, setSelectedCurso } = useSession()

  const selectedCurso = useMemo(() => params.get('curso') || state.selectedCurso, [params, state.selectedCurso])

  useEffect(() => {
    let mounted = true
    setLoadingCourses(true)
    setErrorMsg(null)
    getCourses()
      .then((list) => { if (mounted) setCourses(list) })
      .catch((err) => {
        if (import.meta.env.DEV) console.error('Error loading courses', err)
        if (mounted) setErrorMsg('No se pudieron cargar los cursos. Verifica la conexión con el servidor.')
      })
      .finally(() => { if (mounted) setLoadingCourses(false) })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (selectedCurso) {
      setSelectedRA(null)
      setIndicators([])
      setActivities([])
      setSelectedStudent(null)
      getRAsByCourse(selectedCurso).then(setRas)
    }
  }, [selectedCurso])

  const openCurso = (c: Course) => {
    setSelectedCurso(c.id)
    setParams({ curso: c.id })
    setView('ra')
  }

  const openEstudiantes = async () => {
    if (!selectedCurso) return
    setLoadingStudents(true)
    try {
      const list = await getStudentsByCourse(selectedCurso)
      setStudents(list)
    } finally {
      setLoadingStudents(false)
    }
    setView('estudiantes')
  }

  const openRADetails = async (ra: RA) => {
    setSelectedRA(ra)
    setView('ra')
    setSelectedActivity('')
    try {
      const [inds, acts, val] = await Promise.all([
        getIndicatorsByRA(ra.id),
        getActivitiesByRA(ra.id),
        getRAValidation(ra.id)
      ])
      setIndicators(inds)
      setActivities(acts)
      setRaVal(val)
    } catch (e) {
      if (import.meta.env.DEV) console.warn('No se pudo cargar detalle de RA', e)
      setIndicators([])
      setActivities([])
      setRaVal(null)
    }
  }

  // Render/actualiza gráfico de indicadores del estudiante
  const renderChart = useCallback(async (student: Student) => {
    if (!selectedCurso) return
    const data = await getIndicatorChart(selectedCurso, student.id)
    const noData = data.length === 0 || data.every(d => d.avg_pct == null)
    setChartEmpty(noData)
    if (noData) {
      if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null }
      return
    }
    const labels = data.map(d => d.descripcion)
    const values = data.map(d => (d.avg_pct ?? 0))
    const ctx = chartRef.current?.getContext('2d')
    if (!ctx) return
    if (chartInstance.current) chartInstance.current.destroy()
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Avance indicador (%)', data: values, backgroundColor: '#dc3545' }]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }
    })
  }, [selectedCurso])

  const onSelectStudent = async (s: Student) => {
    setSelectedStudent(s)
    setView('ra')
    if (selectedRA) {
      // asegurar tener indicadores/actividades cargados
      if (indicators.length === 0) setIndicators(await getIndicatorsByRA(selectedRA.id))
      if (activities.length === 0) setActivities(await getActivitiesByRA(selectedRA.id))
    }
    await renderChart(s)
  }

  // Garantizar que el canvas esté montado antes de renderizar el gráfico al cambiar de estudiante
  React.useEffect(() => {
    if (!selectedStudent) return
    const id = window.setTimeout(() => {
      renderChart(selectedStudent)
    }, 0)
    return () => window.clearTimeout(id)
  }, [selectedStudent, renderChart])

  const submitNewActivity = async () => {
    if (!selectedRA) return
    setNewActError(null)
    const nombre_actividad = newAct.nombre.trim()
    const pctRA = Number(newAct.pctRA)
    // Validaciones rápidas en front
    if (!nombre_actividad) { setNewActError('Ingresa un nombre para la actividad.'); return }
    if (Number.isNaN(pctRA) || pctRA <= 0 || pctRA > 100) { setNewActError('"% en RA" debe estar entre 0 y 100.'); return }
    try {
      setSavingNewAct(true)
      await createActivityForRA(selectedRA.id, {
        nombre_actividad,
        id_tipo_actividad: Number(newAct.tipo),
        porcentaje_ra_actividad: pctRA, // Aporte de la actividad al RA
      })
      setNewAct({ nombre: '', tipo: '1', pctRA: '' })
      setActivities(await getActivitiesByRA(selectedRA.id))
    } catch (err: unknown) {
      // Intenta extraer detalle amigable del backend
      let msg = 'No se pudo crear la actividad.'
      if (err && typeof err === 'object' && 'response' in err) {
        const resp = (err as import('axios').AxiosError).response
        const dataUnknown = resp?.data as unknown
        const data = (dataUnknown ?? {}) as Record<string, unknown>
        const message = typeof data.message === 'string' ? data.message : undefined
        const detail = typeof data.detail === 'string' ? data.detail : undefined
        msg = message || detail || msg
        if (!message && !detail && data && typeof data === 'object') {
          const firstKey = Object.keys(data)[0]
          const val = firstKey ? data[firstKey] : undefined
          if (typeof val === 'string') msg = `${firstKey}: ${val}`
          else if (Array.isArray(val) && val.length) msg = `${firstKey}: ${val[0]}`
        }
      }
      setNewActError(msg)
    } finally {
      setSavingNewAct(false)
    }
  }


  const submitGrade = async () => {
    if (!selectedStudent) { setToast({ text: 'Selecciona un estudiante primero.', type: 'error' }); return }
    if (!selectedActivity) { setToast({ text: 'Selecciona una actividad.', type: 'error' }); return }
    if (!grade.nota) { setToast({ text: 'Ingresa una nota entre 0 y 5.', type: 'error' }); return }
    const act = activities.find(a => String(a.raActividadId) === String(selectedActivity))
    if (act && Array.isArray(act.indicadores) && act.indicadores.length > 0 && !grade.indicadorId) {
      setToast({ text: 'Selecciona un indicador para esta actividad.', type: 'error' })
      return
    }
    const n = Number(grade.nota)
    if (Number.isNaN(n) || n < 0 || n > 5) { setToast({ text: 'La nota debe estar entre 0 y 5.', type: 'error' }); return }
    try {
      setSavingGrade(true)
      await upsertGrade({
        matriculaId: selectedStudent.matriculaId,
        raActividadId: selectedActivity,
        nota: n,
        retroalimentacion: grade.retro || undefined,
        indicadorId: grade.indicadorId || undefined,
      })
      setToast({ text: 'Guardado correctamente.' })
      setGrade({ nota: '', retro: '', indicadorId: '' })
      setSelectedActivity('')
      await renderChart(selectedStudent)
    } catch (err: unknown) {
      let msg = 'No se pudo guardar. Inténtalo de nuevo.'
      const resData = (err as { response?: { data?: unknown } })?.response?.data
      if (typeof resData === 'string') msg = resData
      else if (resData && typeof resData === 'object') {
        const rec = resData as Record<string, unknown>
        if (typeof rec.message === 'string') msg = rec.message
        else if (typeof rec.detail === 'string') msg = rec.detail
      } else if (err && typeof err === 'object' && 'message' in (err as Record<string, unknown>)) {
        const eMsg = (err as Record<string, unknown>).message
        if (typeof eMsg === 'string') msg = eMsg
      }
      setToast({ text: msg, type: 'error' })
    } finally {
      setSavingGrade(false)
    }
  }

  const title = view === 'cursos'
    ? 'Cursos - Filtrar por código de carrera'
    : view === 'ra'
    ? `RA - ${selectedCurso}`
    : `Estudiantes - ${selectedCurso}`

  const items = [
    { key: 'cursos', icon: 'bi-grid-3x3-gap', title: 'Cursos' },
    { key: 'crear', icon: 'bi-pencil-square', title: 'Crear' },
    { key: 'listar', icon: 'bi-list-ul', title: 'Listado' },
    { key: 'recursos', icon: 'bi-paperclip', title: 'Recursos' }
  ]

  const onSidebarClick = async (key: string) => {
    if (key === 'cursos') setView('cursos')
    else if (key === 'listar') {
      if (!selectedCurso) return
      await openEstudiantes()
    }
  }

  const filtered = courses.filter(
    (c) => !filter || c.id.toUpperCase().includes(filter.toUpperCase()) || c.carrera.toUpperCase().includes(filter.toUpperCase())
  )

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Docente" />
      <div className="dash-wrapper">
        <Sidebar active={view === 'cursos' ? 'cursos' : view === 'ra' ? 'crear' : 'listar'} onClick={onSidebarClick} items={items} />
        <main className="dash-content">
          <div className="content-title">{title}</div>

          {!!toast && (
            <div className="mb-2" role="status" aria-live="polite">
              <Toast text={toast.text} type={toast.type} />
            </div>
          )}

          {errorMsg && (
            <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
              <span>{errorMsg}</span>
              <button className="btn btn-sm btn-outline-light" onClick={() => {
                setErrorMsg(null)
                setLoadingCourses(true)
                getCourses()
                  .then(setCourses)
                  .catch(() => setErrorMsg('No se pudieron cargar los cursos.'))
                  .finally(() => setLoadingCourses(false))
              }}>Reintentar</button>
            </div>
          )}

          {view === 'cursos' && (
            <section className="panel shown">
              <SearchPill icon="bi-search" placeholder="Cursos — Filtrar por código de carrera" value={filter} onChange={setFilter} />
              {loadingCourses ? (
                <div className="text-muted d-flex align-items-center"><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Cargando cursos…</div>
              ) : (
                <CardGrid>
                  {filtered.map((c, idx) => (
                    <RaCard key={c.id} headTone={idx===0?'dark':'light'} title={c.nombre} subtitle={`${c.codigo ?? c.id} · ${c.carrera}`} onClick={() => openCurso(c)} />
                  ))}
                </CardGrid>
              )}
            </section>
          )}

          {view === 'ra' && (
            <section className="panel shown">
              <SearchPill icon="bi-journal-text" label={`RA - ${selectedCurso}`} />
              {/* Lista de RAs de la asignatura */}
              <CardGrid>
                {ras.map((ra, idx) => (
                  <RaCard key={ra.id} headTone={idx===0?'dark':'light'} title={<><span className="text-uppercase small fw-bold d-block">Resultado de aprendizaje</span>{ra.titulo}</> as unknown as string} subtitle={ra.info} onClick={() => openRADetails(ra)} />
                ))}
              </CardGrid>

              {/* Crear actividad en RA seleccionado */}
              {selectedRA && (
                <div className="mt-3">
                  <div className="content-title">Crear actividad para: {selectedRA.titulo}</div>
                  <div className="row g-2">
                    <div className="col-md-4"><input className="form-control" placeholder="Nombre actividad" value={newAct.nombre} onChange={e=>setNewAct(a=>({...a, nombre:e.target.value}))} /></div>
                    <div className="col-md-2"><input className="form-control" placeholder="% en RA" title="Aporte de esta actividad al RA" type="number" step="0.01" value={newAct.pctRA} onChange={e=>setNewAct(a=>({...a, pctRA:e.target.value}))} /></div>
                    <div className="col-md-2"><input className="form-control" placeholder="Tipo (id)" value={newAct.tipo} onChange={e=>setNewAct(a=>({...a, tipo:e.target.value}))} /></div>
                    <div className="col-md-2"><button className="btn btn-danger w-100" disabled={savingNewAct} onClick={submitNewActivity}>{savingNewAct?(<><span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Creando…</>):'Crear'}</button></div>
                  </div>
                  {newActError && <div className="alert alert-danger mt-2" role="alert">{newActError}</div>}
                </div>
              )}

              {/* Detalle del RA seleccionado (indicadores y actividades) */}
              {selectedRA && (
                <div className="mt-3">
                  <div className="content-title">Detalle de RA: {selectedRA.titulo}</div>
                  {raVal && (
                    <div className="row g-3 mb-2">
                      <div className="col-md-6">
                        <div className={`alert ${raVal.actividades.ok ? 'alert-success' : 'alert-warning'}`}>
                          Actividades: <strong>{raVal.actividades.suma.toFixed(2)}%</strong>. {raVal.actividades.ok ? '¡Listo!' : `Falta ${raVal.actividades.faltante.toFixed(2)}%`}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <progress
                            className={`w-100 ${raVal.actividades.suma > 100 ? 'prog-danger' : (raVal.actividades.ok ? 'prog-success' : 'prog-warning')}`}
                            aria-label="Progreso actividades a 100%"
                            max={100}
                            value={Math.min(100, Math.max(0, raVal.actividades.suma))}
                            title={`${raVal.actividades.suma.toFixed(2)}%`}
                          />
                          <span className="text-muted small" aria-hidden="true">{raVal.actividades.suma.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className={`alert ${raVal.indicadores.ok ? 'alert-success' : 'alert-warning'}`}>
                          Indicadores: <strong>{raVal.indicadores.suma.toFixed(2)}%</strong>. {raVal.indicadores.ok ? '¡Listo!' : `Falta ${raVal.indicadores.faltante.toFixed(2)}%`}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <progress
                            className={`w-100 ${raVal.indicadores.suma > 100 ? 'prog-danger' : (raVal.indicadores.ok ? 'prog-success' : 'prog-warning')}`}
                            aria-label="Progreso indicadores a 100%"
                            max={100}
                            value={Math.min(100, Math.max(0, raVal.indicadores.suma))}
                            title={`${raVal.indicadores.suma.toFixed(2)}%`}
                          />
                          <span className="text-muted small" aria-hidden="true">{raVal.indicadores.suma.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="ra-card">
                        <div className="ra-card-body">
                          <div className="fw-bold mb-2">Indicadores de logro</div>
                          {indicators.length === 0 ? (
                            <div className="text-muted">Sin indicadores</div>
                          ) : (
                            <ul className="list-group ra-list-group">
                              {indicators.map(ind => (
                                <li key={ind.id} className="list-group-item d-flex justify-content-between align-items-center">
                                  <span>{ind.descripcion}</span>
                                  {/* indicator percentage hidden (visual only) */}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="ra-card">
                        <div className="ra-card-body">
                          <div className="fw-bold mb-2">Actividades</div>
                          {activities.length === 0 ? (
                            <div className="text-muted">Sin actividades</div>
                          ) : (
                            <ul className="list-group ra-list-group">
                              {activities.map(act => (
                                <li key={act.id} className="list-group-item d-flex justify-content-between align-items-center">
                                  <span>{act.nombre}</span>
                                  {/* activity aporte percentage hidden (visual only) */}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Calificar estudiante por actividad */}
                  <div className="mt-3">
                    <div className="content-title">Calificar</div>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <div className="ra-card">
                          <div className="ra-card-body">
                            <div className="fw-bold mb-2">Estudiantes</div>
                            <StudentList students={students} onSelect={onSelectStudent} />
                            <button className="btn btn-outline-danger mt-2" onClick={openEstudiantes}><i className="bi bi-people" /> Cargar estudiantes</button>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="ra-card">
                          <div className="ra-card-body">
                            <div className="fw-bold mb-2">Ingresar nota {selectedStudent ? `a ${selectedStudent.name}` : ''}</div>
                            <div className="mb-2">
                              <select className="form-select" aria-label="Seleccionar indicador (opcional)" value={grade.indicadorId} onChange={e=>setGrade(g=>({...g, indicadorId:e.target.value}))}>
                                <option value="">Seleccionar indicador (opcional)</option>
                                {indicators.map(ind => <option key={ind.id} value={ind.id}>{ind.descripcion}</option>)}
                              </select>
                            </div>
                            <div className="mb-2">
                              <select className="form-select" aria-label="Seleccionar actividad" value={selectedActivity} onChange={e=>setSelectedActivity(e.target.value)}>
                                <option value="">Seleccione una actividad</option>
                                {activities.map(act => (
                                  <option key={act.id} value={act.raActividadId}>{act.nombre}</option>
                                ))}
                              </select>
                            </div>
                            <div className="mb-2">
                              <input className="form-control" type="number" step="0.1" min={0} max={5} placeholder="Nota (0-5)" value={grade.nota} onChange={e=>setGrade(g=>({...g, nota:e.target.value}))} />
                            </div>
                            <div className="mb-2">
                              <textarea className="form-control" placeholder="Retroalimentación (opcional)" value={grade.retro} onChange={e=>setGrade(g=>({...g, retro:e.target.value}))} />
                            </div>
                            <div className="d-grid">
                              {
                                (() => {
                                  const act = activities.find(a => String(a.raActividadId) === String(selectedActivity))
                                  const req = Boolean(act && Array.isArray(act.indicadores) && act.indicadores.length > 0)
                                  const disabled = !selectedStudent || !grade.nota || !selectedActivity || (req && !grade.indicadorId)
                                  return (
                                    <button className="btn btn-danger" disabled={disabled || savingGrade} onClick={submitGrade}>
                                      {savingGrade ? (<><span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Guardando…</>) : 'Guardar nota'}
                                    </button>
                                  )
                                })()
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="ra-card">
                          <div className="ra-card-body">
                            <div className="fw-bold mb-2">Indicadores (gráfico)</div>
                            {chartEmpty ? (
                              <div className="text-muted ra-small">Sin datos para graficar.</div>
                            ) : (
                              <canvas ref={chartRef} height={220} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <button className="btn btn-outline-danger mt-3" onClick={() => setView('cursos')}><i className="bi bi-arrow-left" /> Volver a cursos</button>
              <button className="btn btn-danger mt-3 ms-2" onClick={openEstudiantes}><i className="bi bi-people" /> Ver estudiantes</button>
            </section>
          )}

          {view === 'estudiantes' && (
            <section className="panel shown">
              <SearchPill icon="bi-people" label={`Estudiantes - ${selectedCurso}`} />
              {loadingStudents ? (
                <div className="text-muted d-flex align-items-center"><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Cargando estudiantes…</div>
              ) : (
                <StudentList students={students} />
              )}
              <button className="btn btn-outline-danger mt-3" onClick={() => setView('ra')}><i className="bi bi-arrow-left" /> Volver a RA</button>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

export default Docente
