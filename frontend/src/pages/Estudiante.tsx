import React, { useEffect, useRef, useState } from 'react'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import SearchPill from '@/components/SearchPill'
import CardGrid from '@/components/CardGrid'
import RaCard from '@/components/RaCard'
import Chart from 'chart.js/auto'
import type { Course, RA, Activity } from '@/types'
import { getCourses, getMyMatricula, getRAsByCourse, getActivitiesByRA, getIndicatorChart } from '@/services/api'
import { getProfile } from '@/services/auth'
import './Estudiante.css'

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
  type TaskItem = { id: string; courseId: string; courseName: string; raId: string; actId: string; nombre: string; porcentaje: number; fechaCierre?: string | null; tipo?: string }
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const chartRef = useRef<HTMLCanvasElement | null>(null)
  const chartInstance = useRef<Chart | null>(null)

  // UI filtros/orden para actividades
  const [actFilter, setActFilter] = useState<'todas'|'pendientes'|'calificadas'|'vencidas'>('todas')
  const [sortBy, setSortBy] = useState<'fecha'|'peso'|'nombre'>('fecha')

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
        const todos: TaskItem[] = []
        const now = new Date()
        const day = now.getDay()
        const monday = new Date(now); monday.setHours(0,0,0,0); monday.setDate(now.getDate() - ((day + 6) % 7))
        const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999)

        for (const c of list) {
          let mid: string | null = null
          try { mid = await getMyMatricula(c.id) } catch { /* ignore per-course matricula fetch */ }
          if (!mid) continue

          let ras: RA[] = []
          try { ras = await getRAsByCourse(c.id) } catch { /* ignore RA load error */ }

          let courseTotal = 0
          let courseWeight = 0

          for (const ra of ras) {
            let acts: Activity[] = []
            try { acts = await getActivitiesByRA(ra.id, { matriculaId: mid }) } catch { /* ignore activities load */ }

            const graded = acts.filter(a => typeof a.nota === 'number' && a.porcentajeRA != null)
            const sumPct = graded.reduce((acc, a) => acc + Number(a.porcentajeRA || 0), 0)
            const total = graded.reduce((acc, a) => acc + (Number(a.nota || 0) * Number(a.porcentajeRA || 0)), 0)
            const raNota = sumPct > 0 ? (total / sumPct) : null

            if (raNota != null && ra.porcentajeRA != null) {
              courseTotal += raNota * Number(ra.porcentajeRA)
              courseWeight += Number(ra.porcentajeRA)
            }

            for (const act of acts) {
              if (act.nota == null) {
                todos.push({
                  id: `task-${c.id}-${ra.id}-${act.id}`,
                  courseId: c.id,
                  courseName: c.nombre,
                  raId: ra.id,
                  actId: act.raActividadId || act.id,
                  nombre: act.nombre,
                  porcentaje: act.porcentaje,
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

          const courseNote = courseWeight > 0 ? (courseTotal / courseWeight) : null
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

        if (mounted) { setNotifications(notes); setTasks(todos) }
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
    } catch {
      setRas([])
      setMatriculaId(null)
    }
  }

  const openRA = async (ra: RA) => {
    setSelectedRA(ra)
    setSelectedActivity(null)
    if (!matriculaId) { setActivities([]); return }
    try {
      const acts = await getActivitiesByRA(ra.id, { matriculaId })
      setActivities(acts)
    } catch {
      setActivities([])
    }
  }

  const openActivity = async (act: Activity) => {
    setSelectedActivity(act)
    if (!selected) return
    let studentId: string | null = null
  try { const p = await getProfile(); studentId = p.id } catch { /* ignore profile fetch */ }
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
    if (sortBy === 'peso') return (Number(b.porcentajeRA||0) - Number(a.porcentajeRA||0)) || a.nombre.localeCompare(b.nombre)
    return a.nombre.localeCompare(b.nombre)
  })

  return (
    <div className="dashboard-body" style={{minHeight:'100%'}}>
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
          <div className="content-title">{title}</div>

          {/* Notificaciones rápidas */}
          {!selected && !selectedRA && !selectedActivity && view === 'cursos' && notifications.length > 0 && (
            <div className="d-flex flex-column gap-2 mb-2">
              {notifications.map(n => (
                <div key={n.id} className={`alert ${n.kind === 'danger' ? 'alert-danger' : 'alert-warning'}`}>{n.text}</div>
              ))}
            </div>
          )}

          {/* Cursos */}
          {!selected && !selectedRA && !selectedActivity && view === 'cursos' && (
            <section className="panel shown">
              <SearchPill icon="bi-search" placeholder="Filtrar por código de carrera" value={filter} onChange={setFilter} />
              {err && <div className="alert alert-danger">{err}</div>}
              {loading ? <div className="text-muted">Cargando…</div> : (
                <CardGrid>
                  {filteredCourses.map((c, idx) => (
                    <RaCard key={c.id} headTone={idx===0?'dark':'light'} title={c.nombre} subtitle={`${c.codigo ?? c.id} · ${c.carrera}`} onClick={() => openCourse(c)} />
                  ))}
                </CardGrid>
              )}
            </section>
          )}

          {/* Tareas pendientes (todas las materias) */}
          {!selected && !selectedRA && !selectedActivity && view === 'tareas' && (
            <section className="panel shown">
              {loading && <div className="text-muted">Cargando…</div>}
              {!loading && tasks.length === 0 ? (
                <div className="alert alert-secondary">No tienes tareas pendientes.</div>
              ) : (
                <ul className="list-group ra-list-group">
                  {tasks.map(t => (
                    <li key={t.id} className="list-group-item d-flex justify-content-between align-items-center" role="button" title="Abrir curso" onClick={()=>{
                      const c = courses.find(x=>x.id===t.courseId); if (c) openCourse(c)
                    }}>
                      <div>
                        <div>{t.nombre}</div>
                        <div className="ra-small">{t.courseName}{t.fechaCierre ? ` · Cierra: ${new Date(t.fechaCierre).toLocaleDateString()}` : ''}</div>
                      </div>
                      <span className="badge bg-secondary">{t.porcentaje}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* RAs del curso seleccionado */}
          {selected && !selectedRA && (
            <section className="panel shown">
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
                <select className="form-select ra-select--maxwidth" title="Ordenar actividades" aria-label="Ordenar actividades" value={sortBy} onChange={e=>setSortBy(e.target.value as 'fecha'|'peso'|'nombre')}>
                  <option value="fecha">Fecha de cierre</option>
                  <option value="peso">Peso en RA</option>
                  <option value="nombre">Nombre</option>
                </select>
              </div>

              {actsFiltered.length === 0 ? (
                <div className="alert alert-secondary">Sin actividades.</div>
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
                        role="button"
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
                          <span className="badge bg-secondary">{act.porcentaje}%</span>
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
            <section className="panel shown">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="ra-card"><div className="ra-card-body">
                    <div className="fw-bold mb-2">Detalle</div>
                    <div className="d-flex flex-column gap-1">
                      <div><span className="ra-small">Actividad</span> <span className="ms-1">{selectedActivity.nombre}</span></div>
                      <div><span className="ra-small">Peso en RA</span> <span className="ms-1">{selectedActivity.porcentajeRA ?? selectedActivity.porcentaje}%</span></div>
                      {selectedActivity.fechaCierre && <div><span className="ra-small">Cierre</span> <span className="ms-1">{new Date(selectedActivity.fechaCierre).toLocaleDateString()}</span></div>}
                      <div><span className="ra-small">Estado</span> <span className="ms-1">{selectedActivity.nota != null ? `Calificada (${Number(selectedActivity.nota).toFixed(1)})` : 'Pendiente'}</span></div>
                    </div>
                  </div></div>
                </div>
                <div className="col-md-6">
                  <div className="ra-card"><div className="ra-card-body">
                    <div className="fw-bold mb-2">Indicadores (gráfico)</div>
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
