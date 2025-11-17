import React, { useEffect, useRef, useState } from 'react'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import SearchPill from '@/components/SearchPill'
import CardGrid from '@/components/CardGrid'
import RaCard from '@/components/RaCard'
import Chart from 'chart.js/auto'
import type { Course, RA, Activity } from '@/types'
import { getCourses, getMyMatricula, getRAsByCourse, getActivitiesByRA, getIndicatorChart, getCourseGradeSummary } from '@/services/api'
import GradeSummary from '@/components/GradeSummary'
import { getProfile } from '@/services/auth'
import { SkeletonCard } from '@/components/Skeleton'

const Estudiante: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([])
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<Course | null>(null)
  const [ras, setRas] = useState<RA[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [selectedRA, setSelectedRA] = useState<RA | null>(null)
  const [matriculaId, setMatriculaId] = useState<string | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [notifications, setNotifications] = useState<{ id: string; kind: 'danger'|'warning'; text: string; courseId?: string }[]>([])
  const [view, setView] = useState<'notifs'|'cursos'|'tareas'|'recursos'>('cursos')
  type TaskItem = { id: string; courseId: string; courseName: string; raId: string; actId: string; nombre: string; fechaCierre?: string | null; tipo?: string }
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loadingActs, setLoadingActs] = useState(false)
  // Nota ponderada por curso (0-5) y porcentaje (0-100)
  const [courseStats, setCourseStats] = useState<Record<string, { note: number | null; pct: number | null; graded: number; total: number; strict?: number | null; progressive?: number | null; coverage?: number | null }>>({})
  const [gradeSummaryByCourse, setGradeSummaryByCourse] = useState<Record<string, import('@/types').GradeSummaryResponse>>({})
  // Cronograma (notificaciones abajo)
  const [schedQuery, setSchedQuery] = useState('')
  const [schedOrder, setSchedOrder] = useState<'fecha'|'curso'|'nombre'>('fecha')
  const chartRef = useRef<HTMLCanvasElement | null>(null)
  const chartInstance = useRef<Chart | null>(null)

  // UI filtros/orden para actividades
  const [actFilter, setActFilter] = useState<'todas'|'pendientes'|'calificadas'|'vencidas'>('todas')
  // 'peso' option removed (visual only)
  const [sortBy, setSortBy] = useState<'fecha'|'nombre'>('fecha')

  // ESC para volver atrás
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (selectedActivity) setSelectedActivity(null)
      else if (selectedRA) setSelectedRA(null)
      else { setSelected(null); setView('cursos') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedActivity, selectedRA])

  useEffect(() => {
    let mounted = true
    setLoading(true); setErr(null)
    getCourses()
      .then(async (list) => {
        if (!mounted) return
        setCourses(list)

  const notes: { id: string; kind: 'danger'|'warning'; text: string; courseId?: string }[] = []
  const stats: Record<string, { note: number | null; pct: number | null; graded: number; total: number; strict?: number | null; progressive?: number | null; coverage?: number | null }> = {}
        const todos: TaskItem[] = []
        const now = new Date()
        const day = now.getDay()
        const monday = new Date(now); monday.setHours(0,0,0,0); monday.setDate(now.getDate() - ((day + 6) % 7))
        const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999)

        // Obtener perfil para tener id de estudiante (necesario para summary)
        let studentId: string | null = null
        try { const prof = await getProfile(); studentId = prof.id } catch (e) { if (import.meta.env.DEV) console.debug('profile load failed', e) }

        for (const c of list) {
          let mid: string | null = null
          try { mid = await getMyMatricula(c.id) } catch (e) { if (import.meta.env.DEV) console.debug('matricula load failed', e) }
          if (!mid) continue

          let ras: RA[] = []
          try { ras = await getRAsByCourse(c.id) } catch (e) { if (import.meta.env.DEV) console.debug('RA load failed', e) }

          let courseTotal = 0
          let courseWeight = 0
          let courseTotalActs = 0
          let courseGradedActs = 0

          for (const ra of ras) {
            let acts: Activity[] = []
            try { acts = await getActivitiesByRA(ra.id, { matriculaId: mid }) } catch (e) { if (import.meta.env.DEV) console.debug('Acts load failed', e) }

            const graded = acts.filter(a => typeof a.nota === 'number' && a.porcentajeRA != null)
            const sumPct = graded.reduce((acc, a) => acc + Number(a.porcentajeRA || 0), 0)
            const total = graded.reduce((acc, a) => acc + (Number(a.nota || 0) * Number(a.porcentajeRA || 0)), 0)
            const raNota = sumPct > 0 ? (total / sumPct) : null

            if (raNota != null && ra.porcentajeRA != null) {
              courseTotal += raNota * Number(ra.porcentajeRA)
              courseWeight += Number(ra.porcentajeRA)
            }

            // Contadores por curso
            courseTotalActs += acts.length
            courseGradedActs += acts.filter(a => a.nota != null).length

            for (const act of acts) {
              if (act.nota == null) {
                todos.push({
                  id: `task-${c.id}-${ra.id}-${act.id}`,
                  courseId: c.id,
                  courseName: c.nombre,
                  raId: ra.id,
                  actId: act.raActividadId || act.id,
                  nombre: act.nombre,
                  fechaCierre: act.fechaCierre ?? null,
                  tipo: act.tipoActividad,
                })
              }
              if (!act.fechaCierre || (act.nota != null)) continue
              const due = new Date(act.fechaCierre)
              if (due >= monday && due <= sunday) {
                notes.push({
                  id: `due-${c.id}-${ra.id}-${act.id}`,
                  kind: 'warning',
                  text: `Actividad "${act.nombre}" de ${c.nombre} vence ${due.toLocaleDateString()}.`,
                  courseId: c.id,
                })
              }
            }
          }

          let courseNote = courseWeight > 0 ? (courseTotal / courseWeight) : null
          // Intentar obtener summary del backend para valores estrictos/progresivos reales
          if (studentId) {
            const summary = await getCourseGradeSummary(c.id, studentId)
            if (summary) {
              gradeSummaryByCourse[c.id] = summary
              // Preferir promedio progresivo como nota principal
              courseNote = summary.total.progressive
              stats[c.id] = {
                note: courseNote,
                pct: courseNote != null ? (courseNote / 5) * 100 : null,
                graded: courseGradedActs,
                total: courseTotalActs,
                strict: summary.total.strict,
                progressive: summary.total.progressive,
                coverage: summary.total.coverage,
              }
            }
          }
          if (!stats[c.id]) {
            stats[c.id] = {
              note: courseNote,
              pct: courseNote != null ? (courseNote / 5) * 100 : null,
              graded: courseGradedActs,
              total: courseTotalActs,
            }
          }
          if (courseNote != null && courseNote < 3.0) {
            notes.push({
              id: `low-${c.id}`,
              kind: 'danger',
              text: `Atención en ${c.nombre}: promedio ${courseNote.toFixed(2)} / 5.`,
              courseId: c.id,
            })
          }
        }

        todos.sort((a, b) => {
          const da = a.fechaCierre ? new Date(a.fechaCierre).getTime() : Number.MAX_SAFE_INTEGER
          const db = b.fechaCierre ? new Date(b.fechaCierre).getTime() : Number.MAX_SAFE_INTEGER
          return da - db || a.courseName.localeCompare(b.courseName) || a.nombre.localeCompare(b.nombre)
        })

        if (mounted) { setNotifications(notes); setTasks(todos); setCourseStats(stats); setGradeSummaryByCourse({...gradeSummaryByCourse}) }
      })
  .catch(() => setErr('No se pudieron cargar tus cursos'))
      .finally(() => setLoading(false))
    return () => { mounted = false }
  }, [])

  const openCourse = async (c: Course) => {
    setSelected(c)
    setSelectedRA(null)
    setSelectedActivity(null)
    setActivities([])
    try {
      const data = await getRAsByCourse(c.id)
      setRas(data)
      const mid = await getMyMatricula(c.id)
      setMatriculaId(mid)
      setView('cursos')
    } catch (e) {
  if (import.meta.env.DEV) console.debug('openCourse failed', e)
      setRas([])
      setMatriculaId(null)
    }
  }

  const openRA = async (ra: RA) => {
    setSelectedRA(ra)
    setSelectedActivity(null)
    try {
      setLoadingActs(true)
      let mid = matriculaId
      if (!mid && selected) {
        try { mid = await getMyMatricula(selected.id) } catch (e) { if (import.meta.env.DEV) console.debug('matricula reload failed', e) }
        if (mid) setMatriculaId(mid)
      }
      if (!mid) { setActivities([]); return }
      const acts = await getActivitiesByRA(ra.id, { matriculaId: mid })
      setActivities(acts)
    } catch (e) {
      if (import.meta.env.DEV) console.debug('openRA failed', e)
      setActivities([])
    } finally { setLoadingActs(false) }
  }

  const openActivity = async (act: Activity) => {
    setSelectedActivity(act)
    if (!selected) return
    let studentId: string | null = null
  try { const p = await getProfile(); studentId = p.id } catch (e) { if (import.meta.env.DEV) console.debug('getProfile failed', e) }
    if (!studentId) return
    const data = await getIndicatorChart(selected.id, studentId)
    if (!chartRef.current) return
    if (chartInstance.current) chartInstance.current.destroy()
    const labels = data.map(d => d.descripcion)
    const values = data.map(d => d.avg_pct ?? 0)
    chartInstance.current = new Chart(chartRef.current, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Avance indicador (%)', data: values, backgroundColor: '#dc3545' }] },
      options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }
    })
  }

  // Abrir directamente el detalle de una tarea del cronograma
  const openTaskDetail = async (t: TaskItem) => {
    try {
      const c = courses.find(x => x.id === t.courseId)
      if (!c) return
      // Seleccionar curso y preparar estado
      setSelected(c)
      setSelectedRA(null)
      setSelectedActivity(null)
      // Cargar RAs y matrícula
      const rasList = await getRAsByCourse(c.id)
      setRas(rasList)
      const mid = await getMyMatricula(c.id)
      setMatriculaId(mid)
      // Buscar RA
      const ra = rasList.find(r => r.id === t.raId)
      if (!ra || !mid) return
      setSelectedRA(ra)
      // Cargar actividades de ese RA
      const acts = await getActivitiesByRA(ra.id, { matriculaId: mid })
      setActivities(acts)
      // Encontrar actividad por surrogate o id
      const act = acts.find(a => (a.raActividadId ?? a.id) === t.actId)
      if (act) {
        await openActivity(act)
      }
    } catch (e) {
      if (import.meta.env.DEV) console.debug('openTaskDetail failed', e)
    }
  }

  const title = selectedActivity
    ? `Actividad - ${selectedActivity.nombre}`
    : selectedRA
    ? `Actividades de ${selectedRA.titulo}`
    : selected
    ? `RAs · ${selected.codigo ?? selected.id} - ${selected.nombre}`
    : view === 'tareas'
    ? 'Tareas'
    : 'Mis cursos'

  const filteredCourses = courses.filter(
    (c) => !filter || c.id.toUpperCase().includes(filter.toUpperCase()) || c.carrera.toUpperCase().includes(filter.toUpperCase())
  )

  // Filtros y orden para actividades
  const now = new Date()
  const actsFiltered = activities.filter(a => {
    const due = a.fechaCierre ? new Date(a.fechaCierre) : null
    const vencida = !a.nota && due && due.getTime() < now.getTime()
    if (actFilter === 'pendientes') return a.nota == null
    if (actFilter === 'calificadas') return a.nota != null
    if (actFilter === 'vencidas') return vencida
    return true
  }).sort((a, b) => {
    if (sortBy === 'fecha') {
      const da = a.fechaCierre ? new Date(a.fechaCierre).getTime() : Number.MAX_SAFE_INTEGER
      const db = b.fechaCierre ? new Date(b.fechaCierre).getTime() : Number.MAX_SAFE_INTEGER
      return da - db || a.nombre.localeCompare(b.nombre)
    }
  // 'peso' sort removed
  return a.nombre.localeCompare(b.nombre)
  })

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Estudiante" />
      <div className="dash-wrapper">
        <Sidebar
          active={view}
          onClick={(key) => {
            setSelected(null); setSelectedRA(null); setSelectedActivity(null)
            if (key === 'cursos') { setView('cursos'); return }
            if (key === 'tareas') { setView('tareas'); return }
            if (key === 'recursos') { setView('recursos'); return }
          }}
          items={[{key:'cursos',icon:'bi-grid-3x3-gap',title:'Mis cursos'},{key:'tareas',icon:'bi-journal-text',title:'Tareas'},{key:'recursos',icon:'bi-paperclip',title:'Recursos'}]}
        />
        <main className="dash-content">
          <div className="content-title">
            {view === 'cursos' && !selected && <i className="bi bi-book text-primary me-2"></i>}
            {view === 'tareas' && <i className="bi bi-list-check text-warning me-2"></i>}
            {selected && !selectedRA && <i className="bi bi-bar-chart-line text-success me-2"></i>}
            {selectedRA && !selectedActivity && <i className="bi bi-clipboard-check text-info me-2"></i>}
            {selectedActivity && <i className="bi bi-file-earmark-text text-danger me-2"></i>}
            {title}
          </div>

          {/* Notificaciones rápidas (se mantenien discretas) */}
          {!selected && !selectedRA && !selectedActivity && view === 'cursos' && notifications.length > 0 && (
            <div className="d-none">
              {notifications.map(n => (
                <div key={n.id} className={`alert ${n.kind === 'danger' ? 'alert-danger' : 'alert-warning'}`}>{n.text}</div>
              ))}
            </div>
          )}

          {/* Cursos */}
          {!selected && !selectedRA && !selectedActivity && view === 'cursos' && (
            <section className="panel shown">
              <SearchPill icon="bi-search" placeholder="Filtrar por código de carrera" value={filter} onChange={setFilter} />
              {err && (
                <div className="alert alert-danger d-flex align-items-center">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {err}
                </div>
              )}
              {loading ? (
                <CardGrid>
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </CardGrid>
              ) : filteredCourses.length === 0 ? (
                <div className="alert alert-info d-flex align-items-center">
                  <i className="bi bi-info-circle me-2"></i>
                  No se encontraron cursos{filter ? ' con ese filtro' : ''}.
                </div>
              ) : (
                <CardGrid>
                  {filteredCourses.map((c, idx) => (
                    <RaCard key={c.id} headTone={idx===0?'dark':'light'} title={c.nombre} subtitle={`${c.codigo ?? c.id} · ${c.carrera}`} onClick={() => openCourse(c)} />
                  ))}
                </CardGrid>
              )}

              {/* Cronograma (abajo) - siempre visible */}
              <div className="card mt-4 sched-card shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-calendar3 text-primary ra-icon-lg"></i>
                    <h5 className="card-title mb-0">Cronograma</h5>
                    {tasks.length > 0 && (
                      <span className="badge bg-primary rounded-pill">{tasks.length}</span>
                    )}
                  </div>
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="dropdown">
                        <button className="btn btn-outline-danger dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">Todos</button>
                        <ul className="dropdown-menu">
                          <li><button className="dropdown-item" type="button">Todos</button></li>
                        </ul>
                      </div>
                      <div className="dropdown">
                        <button className="btn btn-outline-danger dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">Ordenar por fecha</button>
                        <ul className="dropdown-menu">
                          <li><button className="dropdown-item" type="button" onClick={()=>setSchedOrder('fecha')}>Fecha</button></li>
                          <li><button className="dropdown-item" type="button" onClick={()=>setSchedOrder('curso')}>Curso</button></li>
                          <li><button className="dropdown-item" type="button" onClick={()=>setSchedOrder('nombre')}>Nombre</button></li>
                        </ul>
                      </div>
                    </div>
                    <input
                      className="form-control w-240px"
                      placeholder="Buscar por tipo o nombre de actividad"
                      value={schedQuery}
                      onChange={e=>setSchedQuery(e.target.value)}
                      aria-label="Buscar en cronograma"
                    />
                  </div>

                  {(() => {
                  const list = tasks
                    .filter(t => !schedQuery || t.nombre.toLowerCase().includes(schedQuery.toLowerCase()) || t.courseName.toLowerCase().includes(schedQuery.toLowerCase()))
                    .slice()
                    .sort((a,b) => {
                      if (schedOrder === 'curso') return a.courseName.localeCompare(b.courseName) || (a.fechaCierre?new Date(a.fechaCierre).getTime():0) - (b.fechaCierre?new Date(b.fechaCierre).getTime():0)
                      if (schedOrder === 'nombre') return a.nombre.localeCompare(b.nombre)
                      const da = a.fechaCierre ? new Date(a.fechaCierre).getTime() : Number.MAX_SAFE_INTEGER
                      const db = b.fechaCierre ? new Date(b.fechaCierre).getTime() : Number.MAX_SAFE_INTEGER
                      return da - db
                    })

                  if (list.length === 0) {
                    return (
                      <div className="alert alert-success m-0 d-flex align-items-center">
                        <i className="bi bi-check-circle-fill me-2"></i>
                        ¡Excelente! No tienes tareas pendientes.
                      </div>
                    )
                  }

                  const groups = list.reduce<Record<string, typeof list>>((acc, t) => {
                    const d = t.fechaCierre ? new Date(t.fechaCierre) : null
                    const key = d ? d.toLocaleDateString('es-ES', { weekday: 'long', year:'numeric', month:'long', day:'numeric' }) : 'Sin fecha'
                    if (!acc[key]) acc[key] = []
                    acc[key].push(t)
                    return acc
                  }, {})

                  const toTime = (iso?: string|null) => {
                    if (!iso) return '00:00'
                    try { return new Date(iso).toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' }) } catch { return '00:00' }
                  }

                  return (
                    <div>
                      {Object.entries(groups).map(([dateLabel, items]) => (
                        <div key={dateLabel} className="mb-3">
                          <div className="text-capitalize text-muted fw-semibold mb-1 sched-date">{dateLabel}</div>
                          <ul className="list-unstyled m-0">
                            {items.map((t) => (
                              <li
                                key={t.id}
                                className="sched-item d-flex align-items-center py-2 border-bottom"
                                tabIndex={0}
                                onClick={()=>openTaskDetail(t)}
                                onKeyDown={(e)=>{ if (e.key==='Enter' || e.key===' ') { e.preventDefault(); openTaskDetail(t) } }}
                              >
                                <div className="text-muted w-60px">{toTime(t.fechaCierre)}</div>
                                <div className="d-flex align-items-center justify-content-center me-2 sched-icon">
                                  <i className="bi bi-clipboard2-check text-white" aria-hidden="true" />
                                </div>
                                <div className="flex-grow-1">
                                  <div className="sched-title fw-semibold text-danger">{t.nombre}</div>
                                  <div className="ra-small text-uppercase text-muted">Vencimiento de Asignación · {(courses.find(x=>x.id===t.courseId)?.id) || t.courseId} {t.courseName}</div>
                                </div>
                                {(() => {
                                  const due = t.fechaCierre ? new Date(t.fechaCierre) : null
                                  const vencida = due && due.getTime() < now.getTime()
                                  const estado = vencida ? 'Vencida' : 'Pendiente'
                                  const badge = vencida ? 'bg-danger' : 'bg-warning text-dark'
                                  return <span className={`badge ${badge} ms-2`}>{estado}</span>
                                })()}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )
                })()}
                </div>
              </div>
            </section>
          )}

          {/* Tareas pendientes (todas las materias) con formato Cronograma */}
          {!selected && !selectedRA && !selectedActivity && view === 'tareas' && (
            <section className="panel shown">
              <div className="card sched-card shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-calendar3 text-primary ra-icon-lg"></i>
                    <h5 className="card-title mb-0">Cronograma</h5>
                    {tasks.length > 0 && (
                      <span className="badge bg-primary rounded-pill">{tasks.length}</span>
                    )}
                  </div>
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="dropdown">
                        <button className="btn btn-outline-danger dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">Todos</button>
                        <ul className="dropdown-menu">
                          <li><button className="dropdown-item" type="button">Todos</button></li>
                        </ul>
                      </div>
                      <div className="dropdown">
                        <button className="btn btn-outline-danger dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                          {schedOrder === 'fecha' ? 'Ordenar por fecha' : schedOrder === 'curso' ? 'Ordenar por curso' : 'Ordenar por nombre'}
                        </button>
                        <ul className="dropdown-menu">
                          <li><button className="dropdown-item" type="button" onClick={()=>setSchedOrder('fecha')}>Fecha</button></li>
                          <li><button className="dropdown-item" type="button" onClick={()=>setSchedOrder('curso')}>Curso</button></li>
                          <li><button className="dropdown-item" type="button" onClick={()=>setSchedOrder('nombre')}>Nombre</button></li>
                        </ul>
                      </div>
                    </div>
                    <input
                      className="form-control w-240px"
                      placeholder="Buscar por tipo o nombre de actividad"
                      value={schedQuery}
                      onChange={e=>setSchedQuery(e.target.value)}
                      aria-label="Buscar en cronograma"
                    />
                  </div>

                  {(() => {
                  const list = tasks
                    .filter(t => !schedQuery || t.nombre.toLowerCase().includes(schedQuery.toLowerCase()) || t.courseName.toLowerCase().includes(schedQuery.toLowerCase()))
                    .slice()
                    .sort((a,b) => {
                      if (schedOrder === 'curso') return a.courseName.localeCompare(b.courseName) || (a.fechaCierre?new Date(a.fechaCierre).getTime():0) - (b.fechaCierre?new Date(b.fechaCierre).getTime():0)
                      if (schedOrder === 'nombre') return a.nombre.localeCompare(b.nombre)
                      const da = a.fechaCierre ? new Date(a.fechaCierre).getTime() : Number.MAX_SAFE_INTEGER
                      const db = b.fechaCierre ? new Date(b.fechaCierre).getTime() : Number.MAX_SAFE_INTEGER
                      return da - db
                    })

                  if (loading) {
                    return (
                      <div className="text-center text-muted py-4">
                        <div className="spinner-border text-primary mb-2" role="status">
                          <span className="visually-hidden">Cargando...</span>
                        </div>
                        <p>Cargando tareas…</p>
                      </div>
                    )
                  }
                  if (list.length === 0) {
                    return (
                      <div className="alert alert-success m-0 d-flex align-items-center">
                        <i className="bi bi-check-circle-fill me-2"></i>
                        ¡Excelente! No tienes tareas pendientes.
                      </div>
                    )
                  }

                  const groups = list.reduce<Record<string, typeof list>>((acc, t) => {
                    const d = t.fechaCierre ? new Date(t.fechaCierre) : null
                    const key = d ? d.toLocaleDateString('es-ES', { weekday: 'long', year:'numeric', month:'long', day:'numeric' }) : 'Sin fecha'
                    if (!acc[key]) acc[key] = []
                    acc[key].push(t)
                    return acc
                  }, {})

                  const toTime = (iso?: string|null) => {
                    if (!iso) return '00:00'
                    try { return new Date(iso).toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' }) } catch { return '00:00' }
                  }

                  return (
                    <div>
                      {Object.entries(groups).map(([dateLabel, items]) => (
                        <div key={dateLabel} className="mb-3">
                          <div className="text-capitalize text-muted fw-semibold mb-1 sched-date">{dateLabel}</div>
                          <ul className="list-unstyled m-0">
                            {items.map((t) => (
                              <li
                                key={t.id}
                                className="sched-item d-flex align-items-center py-2 border-bottom"
                                tabIndex={0}
                                onClick={()=>openTaskDetail(t)}
                                onKeyDown={(e)=>{ if (e.key==='Enter' || e.key===' ') { e.preventDefault(); openTaskDetail(t) } }}
                              >
                                <div className="text-muted w-60px">{toTime(t.fechaCierre)}</div>
                                <div className="d-flex align-items-center justify-content-center me-2 sched-icon">
                                  <i className="bi bi-clipboard2-check text-white" aria-hidden="true" />
                                </div>
                                <div className="flex-grow-1">
                                  <div className="sched-title fw-semibold text-danger">{t.nombre}</div>
                                  <div className="ra-small text-uppercase text-muted">Vencimiento de Asignación · {(courses.find(x=>x.id===t.courseId)?.id) || t.courseId} {t.courseName}</div>
                                </div>
                                {(() => {
                                  const due = t.fechaCierre ? new Date(t.fechaCierre) : null
                                  const vencida = due && due.getTime() < now.getTime()
                                  const estado = vencida ? 'Vencida' : 'Pendiente'
                                  const badge = vencida ? 'bg-danger' : 'bg-warning text-dark'
                                  return <span className={`badge ${badge} ms-2`}>{estado}</span>
                                })()}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )
                })()}
                </div>
              </div>
            </section>
          )}

          {/* RAs del curso seleccionado */}
          {selected && !selectedRA && (
            <section className="panel shown">
              {/* Nota ponderada del curso */}
              {(() => {
                const summary = gradeSummaryByCourse[selected.id]
                if (summary) return <GradeSummary summary={summary} />
                // Fallback anterior si aún no se cargó el summary
                const s = courseStats[selected.id]
                const note = s?.note ?? null
                const pct = s?.pct ?? null
                return (
                  <div className="ra-card mb-3">
                    <div className="ra-card-body">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <div className="fw-bold">Progreso en la asignatura</div>
                        {note != null && <div className="text-muted">Promedio: {note.toFixed(2)} / 5</div>}
                      </div>
                      {pct != null ? (() => {
                        const pp = Math.max(0, Math.min(100, Math.round(pct)))
                        const step = Math.round(pp / 10) * 10
                        const widthClass = `w-pct-${step}`
                        return (
                          <div>
                            <div className="progress progress-compact">
                              <div className={`progress-bar bg-danger ${widthClass}`} aria-hidden="true" />
                              <span className="visually-hidden" aria-live="polite">Porcentaje de nota: {pp}%</span>
                            </div>
                            <div className="ra-small text-muted mt-1 d-flex justify-content-between" aria-live="polite">
                              <span>{pp}%</span>
                              <span>Calificadas {typeof s?.graded === 'number' ? s.graded : 0} de {typeof s?.total === 'number' ? s.total : 0}</span>
                            </div>
                          </div>
                        )
                      })() : <div className="text-muted">Aún no hay calificaciones registradas.</div>}
                    </div>
                  </div>
                )
              })()}
              {ras.length === 0 ? (
                <div className="alert alert-info d-flex align-items-center">
                  <i className="bi bi-info-circle me-2"></i>
                  No hay resultados de aprendizaje disponibles para este curso.
                </div>
              ) : (
                <CardGrid>
                  {ras.map((ra, idx) => (
                    <RaCard
                      key={ra.id}
                      headTone={idx===0?'dark':'light'}
                      title={ra.titulo}
                      subtitle={ra.info}
                      onClick={() => openRA(ra)}
                    />
                  ))}
                </CardGrid>
              )}
              <button className="btn btn-outline-danger mt-3" onClick={()=>{ setSelected(null); setView('cursos') }}>
                <i className="bi bi-arrow-left" /> Volver a cursos
              </button>
            </section>
          )}

          {/* Actividades del RA */}
          {selected && selectedRA && !selectedActivity && (
            <section className="panel shown">
              <div className="d-flex gap-2 align-items-center mb-2">
                <div className="btn-group" role="group" aria-label="Filtro actividades">
                  <button className={`btn ${actFilter==='todas'?'btn-danger':'btn-outline-danger'}`} onClick={()=>setActFilter('todas')}>Todas</button>
                  <button className={`btn ${actFilter==='pendientes'?'btn-danger':'btn-outline-danger'}`} onClick={()=>setActFilter('pendientes')}>Pendientes</button>
                  <button className={`btn ${actFilter==='calificadas'?'btn-danger':'btn-outline-danger'}`} onClick={()=>setActFilter('calificadas')}>Calificadas</button>
                  <button className={`btn ${actFilter==='vencidas'?'btn-danger':'btn-outline-danger'}`} onClick={()=>setActFilter('vencidas')}>Vencidas</button>
                </div>
                <span className="ms-auto ra-small">Ordenar por</span>
                <select className="form-select w-240px" aria-label="Ordenar actividades" title="Ordenar actividades" value={sortBy} onChange={e=>setSortBy(e.target.value as 'fecha' | 'nombre')}>
                  <option value="fecha">Fecha de cierre</option>
                  <option value="nombre">Nombre</option>
                </select>
              </div>

              {loadingActs ? (
                <div className="text-center text-muted py-4">
                  <div className="spinner-border text-primary mb-2" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                  <p>Cargando actividades…</p>
                </div>
              ) : actsFiltered.length === 0 ? (
                <div className="alert alert-info d-flex align-items-center">
                  <i className="bi bi-info-circle me-2"></i>
                  Sin actividades{actFilter !== 'todas' ? ` (filtro: ${actFilter})` : ''}.
                </div>
              ) : (
                <ul className="list-group ra-list-group">
                  {actsFiltered.map(act => {
                    const due = act.fechaCierre ? new Date(act.fechaCierre) : null
                    const vencida = !act.nota && due && due.getTime() < now.getTime()
                    const estado = act.nota != null ? 'Calificada' : (vencida ? 'Vencida' : 'Pendiente')
                    const badgeClass = act.nota != null ? 'bg-secondary' : (vencida ? 'bg-danger' : 'bg-warning')
                    return (
                      <li
                        key={act.id}
                        className="list-group-item d-flex justify-content-between align-items-center"
                        onClick={() => openActivity(act)}
                        title="Ver detalle e indicadores"
                      >
                        <div>
                          <div>{act.nombre}</div>
                          <div className="ra-small">
                            {(act.tipoActividad || (act.tipoActividadId ? `Tipo ${act.tipoActividadId}` : ''))}
                            {act.fechaCierre ? ` · Cierra: ${new Date(act.fechaCierre).toLocaleDateString()}` : ''}
                            {act.nota != null ? ` · Nota: ${Number(act.nota).toFixed(1)}` : ''}
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className={`badge ${badgeClass}`}>{estado}</span>
                          {/* sin porcentaje */}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              <button className="btn btn-outline-danger mt-3" onClick={()=>setSelectedRA(null)}>
                <i className="bi bi-arrow-left" /> Volver a RAs
              </button>
            </section>
          )}

          {/* Detalle de actividad con gráfico */}
          {selected && selectedRA && selectedActivity && (
            <section className="panel shown ra-detail-panel">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="ra-card shadow-sm"><div className="ra-card-body">
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <i className="bi bi-file-earmark-text text-primary"></i>
                      <span className="fw-bold">Detalle de actividad</span>
                    </div>
                    <div className="d-flex flex-column gap-2">
                      <div className="border-bottom pb-2">
                        <span className="ra-small text-muted d-block mb-1">Actividad</span>
                        <span className="fw-semibold">{selectedActivity.nombre}</span>
                      </div>
                      {selectedActivity.fechaCierre && (
                        <div className="border-bottom pb-2">
                          <span className="ra-small text-muted d-block mb-1">Fecha de cierre</span>
                          <span>{new Date(selectedActivity.fechaCierre).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="border-bottom pb-2">
                        <span className="ra-small text-muted d-block mb-1">Estado</span>
                        {selectedActivity.nota != null ? (
                          <span className="badge bg-success">Calificada: {Number(selectedActivity.nota).toFixed(1)}</span>
                        ) : (
                          <span className="badge bg-warning text-dark">Pendiente</span>
                        )}
                      </div>
                    </div>
                  </div></div>
                </div>
                <div className="col-md-6">
                  <div className="ra-card shadow-sm"><div className="ra-card-body">
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <i className="bi bi-bar-chart-fill text-success"></i>
                      <span className="fw-bold">Indicadores de desempeño</span>
                    </div>
                    <canvas ref={chartRef} height={220} />
                  </div></div>
                </div>
              </div>
              <button className="btn btn-outline-danger mt-3" onClick={()=>setSelectedActivity(null)}>
                <i className="bi bi-arrow-left" /> Volver a actividades
              </button>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

export default Estudiante
