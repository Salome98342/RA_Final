import React, { useEffect, useState } from 'react'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import SearchPill from '@/components/SearchPill'
import CardGrid from '@/components/CardGrid'
import RaCard from '@/components/RaCard'
import type { Course, GroupedActivity, ProfilePeriodo, ProfileDetails } from '@/types'
import { getCourses, getMyMatricula, getCourseActivitiesGrouped, getCourseGradeSummary } from '@/services/api'
import GradeSummary from '@/components/GradeSummary'
import { getProfile, getFullProfile } from '@/services/auth'
import { SkeletonCard } from '@/components/Skeleton'

const Estudiante: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([])
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<Course | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [groups, setGroups] = useState<ProfilePeriodo[] | null>(null)
  const [currentPeriodId, setCurrentPeriodId] = useState<number | null>(null)
  const [matriculaId, setMatriculaId] = useState<string | null>(null)
  const [groupedActivities, setGroupedActivities] = useState<GroupedActivity[]>([])
  const [selectedGroupedActivity, setSelectedGroupedActivity] = useState<GroupedActivity | null>(null)
  const [notifications, setNotifications] = useState<{ id: string; kind: 'danger'|'warning'; text: string; courseId?: string }[]>([])
  const [view, setView] = useState<'notifs'|'cursos'|'tareas'|'recursos'>('cursos')
  type TaskItem = { id: string; courseId: string; courseName: string; raId: string; actId: string; nombre: string; fechaCierre?: string | null; tipo?: string }
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [rawResources, setRawResources] = useState<Array<{ curso: string; items: Array<{ id: string; titulo: string; url: string; fecha: string }> }>>([])
  // Nota ponderada por curso (0-5) y porcentaje (0-100)
  const [courseStats, setCourseStats] = useState<Record<string, { note: number | null; pct: number | null; graded: number; total: number; strict?: number | null; progressive?: number | null; coverage?: number | null }>>({})
  const [gradeSummaryByCourse, setGradeSummaryByCourse] = useState<Record<string, import('@/types').GradeSummaryResponse>>({})
  // Cronograma (notificaciones abajo)
  const [schedQuery, setSchedQuery] = useState('')
  const [schedOrder, setSchedOrder] = useState<'fecha'|'curso'|'nombre'>('fecha')

  // UI filtros/orden para actividades
  const [actFilter, setActFilter] = useState<'todas'|'pendientes'|'calificadas'|'vencidas'>('todas')
  // 'peso' option removed (visual only)
  const [sortBy, setSortBy] = useState<'fecha'|'nombre'>('fecha')

  // ESC para volver atrás
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (selectedGroupedActivity) setSelectedGroupedActivity(null)
      else { setSelected(null); setView('cursos') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedGroupedActivity])

  useEffect(() => {
    let mounted = true
    setLoading(true); setErr(null)
    Promise.allSettled([getCourses(), getFullProfile()])
      .then(async (results) => {
        const coursesRes = results[0]
        const profileRes = results[1]
        
        if (coursesRes.status !== 'fulfilled') {
          if (mounted) setErr('No se pudieron cargar tus cursos')
          return
        }
        
        const list = coursesRes.value
        if (!mounted) return
        setCourses(list)

        // Procesar datos de perfil para separar por periodos
        if (profileRes.status === 'fulfilled') {
          const p: ProfileDetails = profileRes.value
          const gps = Array.isArray(p.cursosPorPeriodo) ? p.cursosPorPeriodo : []
          setGroups(gps)
          const pid = p.periodoActual?.id ?? (gps.length > 0 ? Math.max(...gps.map(g => Number(g.periodo.id))) : null)
          setCurrentPeriodId(typeof pid === 'number' && !Number.isNaN(pid) ? pid : null)
        } else {
          setGroups(null)
          setCurrentPeriodId(null)
        }

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

          // Cargar actividades agrupadas para obtener estadísticas y tareas
          let grouped: GroupedActivity[] = []
          try { grouped = await getCourseActivitiesGrouped(c.id, { matriculaId: mid }) } catch (e) { if (import.meta.env.DEV) console.debug('Grouped acts load failed', e) }

          const courseTotalActs = grouped.length
          const courseGradedActs = grouped.filter(a => a.nota != null).length

          // Generar tareas pendientes y notificaciones de vencimiento
          for (const act of grouped) {
            if (act.nota == null) {
              // Para las tareas, usamos el primer RA asociado para compatibilidad con openTaskDetail
              const firstRa = act.ras_asociados[0]
              if (firstRa) {
                todos.push({
                  id: `task-${c.id}-${firstRa.id_ra}-${act.id_actividad}`,
                  courseId: c.id,
                  courseName: c.nombre,
                  raId: String(firstRa.id_ra),
                  actId: String(firstRa.id_ra_actividad),
                  nombre: act.nombre_actividad,
                  fechaCierre: act.fecha_cierre ?? null,
                  tipo: act.tipo_actividad,
                })
              }
            }
            if (!act.fecha_cierre || (act.nota != null)) continue
            const due = new Date(act.fecha_cierre)
            if (due >= monday && due <= sunday) {
              notes.push({
                id: `due-${c.id}-${act.id_actividad}`,
                kind: 'warning',
                text: `Actividad "${act.nombre_actividad}" de ${c.nombre} vence ${due.toLocaleDateString()}.`,
                courseId: c.id,
              })
            }
          }

          let courseNote: number | null = null
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

        // Cargar recursos de todos los cursos
        const { getRecursosByCourse } = await import('@/services/api')
        const resourcesPromises = list.map(async (c) => {
          try {
            const items = await getRecursosByCourse(c.id)
            return { curso: c.id, items }
          } catch {
            return { curso: c.id, items: [] }
          }
        })
        const resourcesData = await Promise.all(resourcesPromises)
        if (mounted) setRawResources(resourcesData)

        if (mounted) { setNotifications(notes); setTasks(todos); setCourseStats(stats); setGradeSummaryByCourse({...gradeSummaryByCourse}) }
      })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const openCourse = async (c: Course) => {
    setSelected(c)
    setSelectedGroupedActivity(null)
    setGroupedActivities([])
    try {
      const mid = await getMyMatricula(c.id)
      setMatriculaId(mid)
      
      // Cargar actividades agrupadas directamente a nivel de curso
      if (mid) {
        try {
          const grouped = await getCourseActivitiesGrouped(c.id, { matriculaId: mid })
          setGroupedActivities(grouped)
        } catch (e) {
          if (import.meta.env.DEV) console.debug('Failed to load grouped activities', e)
          setGroupedActivities([])
        }
      }
      
      setView('cursos')
    } catch (e) {
  if (import.meta.env.DEV) console.debug('openCourse failed', e)
      setMatriculaId(null)
    }
  }

  // Abrir directamente el detalle de una tarea del cronograma
  const openTaskDetail = async (t: TaskItem) => {
    try {
      const c = courses.find(x => x.id === t.courseId)
      if (!c) return
      // Abrir curso y cargar actividades agrupadas
      await openCourse(c)
      // Buscar actividad agrupada
      const mid = await getMyMatricula(c.id)
      if (!mid) return
      const grouped = await getCourseActivitiesGrouped(c.id, { matriculaId: mid })
      const act = grouped.find(a => a.ras_asociados.some(ra => String(ra.id_ra_actividad) === t.actId))
      if (act) {
        setSelectedGroupedActivity(act)
      }
    } catch (e) {
      if (import.meta.env.DEV) console.debug('openTaskDetail failed', e)
    }
  }

  const title = selectedGroupedActivity
    ? `Actividad - ${selectedGroupedActivity.nombre_actividad}`
    : selected
    ? `${selected.codigo ?? selected.id} - ${selected.nombre}`
    : view === 'tareas'
    ? 'Tareas'
    : 'Mis cursos'

  const filteredCourses = courses.filter(
    (c) => !filter || c.id.toUpperCase().includes(filter.toUpperCase()) || c.carrera.toUpperCase().includes(filter.toUpperCase())
  )

  // Construir conjuntos de códigos por periodo (si hay datos de perfil)
  const currentCodes = new Set<string>()
  const previousCodes = new Set<string>()
  if (groups && groups.length > 0) {
    groups.forEach(g => {
      const codes = g.cursos.map(c => c.codigo)
      if (currentPeriodId != null && Number(g.periodo.id) === Number(currentPeriodId)) {
        codes.forEach(c => currentCodes.add(c))
      } else {
        codes.forEach(c => previousCodes.add(c))
      }
    })
  }

  const filteredCurrent = groups ? filteredCourses.filter(c => currentCodes.has(c.id)) : filteredCourses
  const filteredMap = new Map(filteredCourses.map(c => [c.id, c]))
  const previousGroups = groups ? groups.filter(g => currentPeriodId == null || Number(g.periodo.id) !== Number(currentPeriodId)) : []

  // Filtros y orden para actividades
  const now = new Date()
  const groupedActsFiltered = groupedActivities.filter(a => {
    const due = a.fecha_cierre ? new Date(a.fecha_cierre) : null
    const vencida = !a.nota && due && due.getTime() < now.getTime()
    if (actFilter === 'pendientes') return a.nota == null
    if (actFilter === 'calificadas') return a.nota != null
    if (actFilter === 'vencidas') return vencida
    return true
  }).sort((a, b) => {
    if (sortBy === 'fecha') {
      const da = a.fecha_cierre ? new Date(a.fecha_cierre).getTime() : Number.MAX_SAFE_INTEGER
      const db = b.fecha_cierre ? new Date(b.fecha_cierre).getTime() : Number.MAX_SAFE_INTEGER
      return da - db || a.nombre_actividad.localeCompare(b.nombre_actividad)
    }
    return a.nombre_actividad.localeCompare(b.nombre_actividad)
  })

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Estudiante" />
      <div className="dash-wrapper">
        <Sidebar
          active={view}
          onClick={(key) => {
            setSelected(null); setSelectedGroupedActivity(null)
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
            {selected && !selectedGroupedActivity && <i className="bi bi-clipboard-check text-info me-2"></i>}
            {selectedGroupedActivity && <i className="bi bi-file-earmark-text text-danger me-2"></i>}
            {title}
          </div>

          {/* Notificaciones rápidas (se mantienen discretas) */}
          {!selected && !selectedGroupedActivity && view === 'cursos' && notifications.length > 0 && (
            <div className="d-none">
              {notifications.map(n => (
                <div key={n.id} className={`alert ${n.kind === 'danger' ? 'alert-danger' : 'alert-warning'}`}>{n.text}</div>
              ))}
            </div>
          )}

          {/* Cursos */}
          {!selected && !selectedGroupedActivity && view === 'cursos' && (
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
              ) : (
                <>
                  {groups && groups.length > 0 ? (
                    <>
                      <div className="d-flex align-items-center gap-2 mb-3" aria-label="Cursos del periodo actual">
                        <i className="bi bi-calendar-check text-success"></i>
                        <span className="fw-bold">Periodo actual</span>
                        {filteredCurrent.length > 0 && (
                          <span className="badge bg-success rounded-pill">{filteredCurrent.length}</span>
                        )}
                      </div>
                      <CardGrid>
                        {filteredCurrent.length === 0 ? (
                          <div className="alert alert-info d-flex align-items-center">
                            <i className="bi bi-info-circle me-2"></i>
                            Sin cursos en el periodo actual{filter ? ' (filtro aplicado)' : ''}.
                          </div>
                        ) : (
                          filteredCurrent.map((c, idx) => (
                            <RaCard key={c.id} headTone={idx===0?'dark':'light'} title={c.nombre} subtitle={`${c.codigo ?? c.id} · ${c.carrera}`} onClick={() => openCourse(c)} />
                          ))
                        )}
                      </CardGrid>
                      <div className="d-flex align-items-center gap-2 mb-3 mt-4" aria-label="Cursos de periodos anteriores">
                        <i className="bi bi-clock-history text-muted"></i>
                        <span className="fw-bold">Periodos anteriores</span>
                      </div>
                      {previousGroups.length === 0 ? (
                        <div className="alert alert-secondary d-flex align-items-center">
                          <i className="bi bi-inbox me-2"></i>
                          Sin cursos en periodos anteriores{filter ? ' (filtro aplicado)' : ''}.
                        </div>
                      ) : (
                        previousGroups.map(pg => {
                          const periodCourses = pg.cursos
                            .map(c => filteredMap.get(c.codigo))
                            .filter((x): x is Course => Boolean(x))
                          return (
                            <section key={pg.periodo.id} className="mb-3" aria-label={`Periodo ${pg.periodo.descripcion}`}>
                              <div className="d-flex align-items-center gap-2 mb-2">
                                <i className="bi bi-calendar2 text-muted ra-small"></i>
                                <span className="ra-small text-muted fw-semibold">{pg.periodo.descripcion}</span>
                                {periodCourses.length > 0 && (
                                  <span className="badge bg-secondary rounded-pill ra-small">{periodCourses.length}</span>
                                )}
                              </div>
                              <CardGrid>
                                {periodCourses.length === 0 ? (
                                  <div className="alert alert-secondary d-flex align-items-center">
                                    <i className="bi bi-inbox me-2"></i>
                                    Sin cursos en este periodo{filter ? ' (filtro aplicado)' : ''}.
                                  </div>
                                ) : (
                                  periodCourses.map(c => (
                                    <RaCard key={c.id} headTone={'light'} title={c.nombre} subtitle={`${c.codigo ?? c.id} · ${c.carrera}`} onClick={() => openCourse(c)} />
                                  ))
                                )}
                              </CardGrid>
                            </section>
                          )
                        })
                      )}
                    </>
                  ) : (
                    <>
                      {filteredCourses.length === 0 ? (
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
                    </>
                  )}
                </>
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
          {!selected && !selectedGroupedActivity && view === 'tareas' && (
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

          {/* Actividades del curso seleccionado (vista agrupada sin duplicación) */}
          {selected && !selectedGroupedActivity && (
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

              {/* Filtros y ordenamiento */}
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

              {/* Lista de actividades agrupadas */}
              {groupedActsFiltered.length === 0 ? (
                <div className="alert alert-info d-flex align-items-center">
                  <i className="bi bi-info-circle me-2"></i>
                  Sin actividades{actFilter !== 'todas' ? ` (filtro: ${actFilter})` : ''}.
                </div>
              ) : (
                <ul className="list-group ra-list-group">
                  {groupedActsFiltered.map(act => {
                    const due = act.fecha_cierre ? new Date(act.fecha_cierre) : null
                    const vencida = !act.nota && due && due.getTime() < now.getTime()
                    const estado = act.nota != null ? 'Calificada' : (vencida ? 'Vencida' : 'Pendiente')
                    const badgeClass = act.nota != null ? 'bg-secondary' : (vencida ? 'bg-danger' : 'bg-warning')
                    return (
                      <li
                        key={act.id_actividad}
                        className="list-group-item ra-clickable"
                        onClick={() => setSelectedGroupedActivity(act)}
                        title="Ver detalle e indicadores"
                      >
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="fw-semibold">{act.nombre_actividad}</div>
                            <div className="ra-small text-muted">
                              {act.tipo_actividad}
                              {act.fecha_cierre ? ` · Cierra: ${new Date(act.fecha_cierre).toLocaleDateString()}` : ''}
                              {act.nota != null ? ` · Nota: ${Number(act.nota).toFixed(1)}` : ''}
                              {` · Peso total: ${act.porcentaje_total.toFixed(1)}%`}
                            </div>
                            {/* Mostrar RAs asociados */}
                            <div className="mt-2">
                              <div className="ra-small text-muted fw-semibold mb-1">Asociado a {act.ras_asociados.length} RA{act.ras_asociados.length !== 1 ? 's' : ''}:</div>
                              <div className="d-flex flex-wrap gap-1">
                                {act.ras_asociados.map(ra => (
                                  <span key={ra.id_ra_actividad} className="badge bg-light text-dark border">
                                    {ra.titulo_ra} ({ra.porcentaje_actividad}% del RA)
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className={`badge ${badgeClass} ms-2`}>{estado}</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              <button className="btn btn-outline-danger mt-3" onClick={()=>{ setSelected(null); setView('cursos') }}>
                <i className="bi bi-arrow-left" /> Volver a cursos
              </button>
            </section>
          )}

          {/* Detalle de actividad agrupada */}
          {selected && selectedGroupedActivity && (
            <section className="panel shown ra-detail-panel">
              <div className="row g-3">
                <div className="col-12">
                  <div className="ra-card shadow-sm">
                    <div className="ra-card-body">
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <i className="bi bi-file-earmark-text text-primary"></i>
                        <span className="fw-bold">Detalle de actividad</span>
                      </div>
                      <div className="d-flex flex-column gap-3">
                        <div className="border-bottom pb-2">
                          <span className="ra-small text-muted d-block mb-1">Actividad</span>
                          <span className="fw-semibold">{selectedGroupedActivity.nombre_actividad}</span>
                        </div>
                        {selectedGroupedActivity.descripcion && (
                          <div className="border-bottom pb-2">
                            <span className="ra-small text-muted d-block mb-1">Descripción</span>
                            <span>{selectedGroupedActivity.descripcion}</span>
                          </div>
                        )}
                        <div className="border-bottom pb-2">
                          <span className="ra-small text-muted d-block mb-1">Tipo</span>
                          <span>{selectedGroupedActivity.tipo_actividad}</span>
                        </div>
                        {selectedGroupedActivity.fecha_cierre && (
                          <div className="border-bottom pb-2">
                            <span className="ra-small text-muted d-block mb-1">Fecha de cierre</span>
                            <span>{new Date(selectedGroupedActivity.fecha_cierre).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="border-bottom pb-2">
                          <span className="ra-small text-muted d-block mb-1">Peso total en la asignatura</span>
                          <span className="fw-semibold">{selectedGroupedActivity.porcentaje_total.toFixed(1)}%</span>
                        </div>
                        <div className="border-bottom pb-2">
                          <span className="ra-small text-muted d-block mb-1">Estado</span>
                          {selectedGroupedActivity.nota != null ? (
                            <span className="badge bg-success">Calificada: {Number(selectedGroupedActivity.nota).toFixed(1)}</span>
                          ) : (
                            <span className="badge bg-warning text-dark">Pendiente</span>
                          )}
                        </div>
                        {selectedGroupedActivity.retroalimentacion && (
                          <div className="border-bottom pb-2">
                            <span className="ra-small text-muted d-block mb-1">Retroalimentación</span>
                            <span>{selectedGroupedActivity.retroalimentacion}</span>
                          </div>
                        )}

                        {/* Sección de RAs asociados */}
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <i className="bi bi-diagram-3 text-info"></i>
                            <span className="fw-bold">Resultados de aprendizaje asociados</span>
                          </div>
                          <div className="alert alert-info mb-2">
                            <i className="bi bi-info-circle me-2"></i>
                            Esta actividad contribuye a {selectedGroupedActivity.ras_asociados.length} resultado{selectedGroupedActivity.ras_asociados.length !== 1 ? 's' : ''} de aprendizaje
                          </div>
                          <ul className="list-group">
                            {selectedGroupedActivity.ras_asociados.map(ra => (
                              <li key={ra.id_ra_actividad} className="list-group-item">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <div className="flex-grow-1">
                                    <div className="fw-semibold">{ra.titulo_ra}</div>
                                    <div className="ra-small text-muted">
                                      Peso en el RA: {ra.porcentaje_actividad}% · Peso del RA en la asignatura: {ra.porcentaje_ra}%
                                    </div>
                                  </div>
                                </div>
                                {/* Indicadores de este RA */}
                                {ra.indicadores.length > 0 && (
                                  <div className="mt-2">
                                    <div className="ra-small text-muted fw-semibold mb-1">Indicadores evaluados:</div>
                                    <div className="d-flex flex-wrap gap-1">
                                      {ra.indicadores.map(ind => (
                                        <span key={ind.id_ind} className="badge bg-light text-dark border" title={ind.descripcion}>
                                          {ind.descripcion} ({ind.porcentaje_ind}%)
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button className="btn btn-outline-danger mt-3" onClick={()=>setSelectedGroupedActivity(null)}>
                <i className="bi bi-arrow-left" /> Volver a actividades
              </button>
            </section>
          )}

          {/* Vista de RECURSOS */}
          {view === 'recursos' && (
            <section className="panel shown">
              <div className="content-title d-flex align-items-center gap-2 mb-3">
                <i className="bi bi-paperclip"></i>
                Recursos y Documentos
              </div>

              {/* Mostrar todos los recursos de todos los cursos directamente */}
              {(() => {
                // Agrupar recursos por curso
                const allResources = rawResources.flatMap(rc => 
                  rc.items.map(item => ({
                    ...item,
                    cursoId: rc.curso,
                    cursoNombre: courses.find(c => c.id === rc.curso)?.nombre || 'Curso desconocido'
                  }))
                )

                if (allResources.length === 0) {
                  return (
                    <div className="alert alert-secondary shadow-sm d-flex align-items-center">
                      <i className="bi bi-inbox-fill me-2 fs-5"></i>
                      <span>No hay documentos disponibles en tus cursos aún.</span>
                    </div>
                  )
                }

                // Agrupar por curso para mostrar organizadamente
                const resourcesByCourse = rawResources.filter(rc => rc.items.length > 0)

                return (
                  <div>
                    {resourcesByCourse.map(rc => {
                      const curso = courses.find(c => c.id === rc.curso)
                      if (!curso || rc.items.length === 0) return null
                      
                      return (
                        <div key={rc.curso} className="mb-4">
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <i className="bi bi-book text-danger"></i>
                            <h5 className="mb-0">{curso.nombre}</h5>
                            <span className="badge bg-light text-dark">{rc.items.length} documento{rc.items.length !== 1 ? 's' : ''}</span>
                          </div>
                          
                          <ul className="list-group ra-list-group">
                            {rc.items.map((r: { id: string; titulo: string; url: string; fecha: string }) => (
                              <li
                                key={r.id}
                                className="list-group-item shadow-sm d-flex justify-content-between align-items-center"
                                onDoubleClick={() => window.open(r.url, '_blank')}
                              >
                                <div>
                                  <div className="d-flex align-items-center gap-2">
                                    <i className="bi bi-file-earmark-pdf-fill text-danger"></i>
                                    <span className="fw-semibold">{r.titulo}</span>
                                  </div>
                                  <div className="ra-small text-muted mt-1">
                                    <i className="bi bi-calendar3 me-1"></i>
                                    {new Date(r.fecha).toLocaleString()}
                                  </div>
                                </div>
                                <a
                                  className="btn btn-sm btn-outline-danger shadow-sm"
                                  href={r.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Descargar documento"
                                >
                                  <i className="bi bi-download me-1"></i>
                                  Descargar
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              <button className="btn btn-outline-danger mt-3" onClick={() => setView('cursos')}>
                <i className="bi bi-arrow-left" /> Volver a inicio
              </button>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

export default Estudiante
