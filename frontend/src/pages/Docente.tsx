import React, { useEffect, useMemo, useState, useRef } from 'react'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import SearchPill from '@/components/SearchPill'
import CardGrid from '@/components/CardGrid'
import RaCard from '@/components/RaCard'
import StudentList from '@/components/StudentList'
import { getCourses, getRAsByCourse, getStudentsByCourse, getIndicatorsByRA, getActivitiesByRA, createActivityForRA, upsertGrade, getIndicatorChart } from '@/services/api'
import type { Course, RA, Indicator, Activity, Student } from '@/types'
import { useSearchParams } from 'react-router-dom'
import { useSession } from '@/state/SessionContext'
import Chart from 'chart.js/auto'

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
  const [newAct, setNewAct] = useState({ nombre: '', tipo: '1', pctAct: '', pctRA: '' })
  // Calificación
  const [grade, setGrade] = useState({ nota: '', retro: '', indicadorId: '' })
  const chartRef = useRef<HTMLCanvasElement | null>(null)
  const chartInstance = useRef<Chart | null>(null)
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
        console.error('Error loading courses', err)
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
    const list = await getStudentsByCourse(selectedCurso)
    setStudents(list)
    setView('estudiantes')
  }

  const openRADetails = async (ra: RA) => {
    setSelectedRA(ra)
    setView('ra')
    setSelectedActivity('')
    try {
      const [inds, acts] = await Promise.all([
        getIndicatorsByRA(ra.id),
        getActivitiesByRA(ra.id)
      ])
      setIndicators(inds)
      setActivities(acts)
    } catch (e) {
      console.warn('No se pudo cargar detalle de RA', e)
      setIndicators([])
      setActivities([])
    }
  }

  // Render/actualiza gráfico de indicadores del estudiante
  const renderChart = async (student: Student) => {
    if (!selectedCurso) return
    const data = await getIndicatorChart(selectedCurso, student.id)
    const labels = data.map(d => d.descripcion)
    const values = data.map(d => d.avg_pct ?? 0)
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
  }

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

  const submitNewActivity = async () => {
    if (!selectedRA) return
    const nombre_actividad = newAct.nombre.trim()
    if (!nombre_actividad) return
    await createActivityForRA(selectedRA.id, {
      nombre_actividad,
      id_tipo_actividad: Number(newAct.tipo),
      porcentaje_actividad: Number(newAct.pctAct),
      porcentaje_ra_actividad: Number(newAct.pctRA),
    })
    setNewAct({ nombre: '', tipo: '1', pctAct: '', pctRA: '' })
    setActivities(await getActivitiesByRA(selectedRA.id))
  }

  const submitGrade = async () => {
    if (!selectedStudent || !selectedActivity || !grade.nota) return
    await upsertGrade({
      matriculaId: selectedStudent.matriculaId,
      raActividadId: selectedActivity,
      nota: Number(grade.nota),
      retroalimentacion: grade.retro || undefined,
      indicadorId: grade.indicadorId || undefined,
    })
    setGrade({ nota: '', retro: '', indicadorId: '' })
    setSelectedActivity('')
    await renderChart(selectedStudent)
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
    <div className="dashboard-body" style={{minHeight:'100%'}}>
      <HeaderBar roleLabel="Docente" />
      <div className="dash-wrapper">
        <Sidebar active={view === 'cursos' ? 'cursos' : view === 'ra' ? 'crear' : 'listar'} onClick={onSidebarClick} items={items} />
        <main className="dash-content">
          <div className="content-title">{title}</div>

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
                <div className="text-muted">Cargando cursos…</div>
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
                    <div className="col-md-2"><input className="form-control" placeholder="% Actividad" type="number" step="0.01" value={newAct.pctAct} onChange={e=>setNewAct(a=>({...a, pctAct:e.target.value}))} /></div>
                    <div className="col-md-2"><input className="form-control" placeholder="% en RA" type="number" step="0.01" value={newAct.pctRA} onChange={e=>setNewAct(a=>({...a, pctRA:e.target.value}))} /></div>
                    <div className="col-md-2"><input className="form-control" placeholder="Tipo (id)" value={newAct.tipo} onChange={e=>setNewAct(a=>({...a, tipo:e.target.value}))} /></div>
                    <div className="col-md-2"><button className="btn btn-danger w-100" onClick={submitNewActivity}>Crear</button></div>
                  </div>
                </div>
              )}

              {/* Detalle del RA seleccionado (indicadores y actividades) */}
              {selectedRA && (
                <div className="mt-3">
                  <div className="content-title">Detalle de RA: {selectedRA.titulo}</div>
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
                                  <span className="badge bg-secondary">{ind.porcentaje}%</span>
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
                                  <span className="badge bg-secondary">{act.porcentaje}%</span>
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
                              <select className="form-select" value={grade.indicadorId} onChange={e=>setGrade(g=>({...g, indicadorId:e.target.value}))}>
                                <option value="">Seleccionar indicador (opcional)</option>
                                {indicators.map(ind => <option key={ind.id} value={ind.id}>{ind.descripcion}</option>)}
                              </select>
                            </div>
                            <div className="mb-2">
                              <select className="form-select" value={selectedActivity} onChange={e=>setSelectedActivity(e.target.value)}>
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
                              <button className="btn btn-danger" disabled={!selectedStudent || !grade.nota || !selectedActivity} onClick={submitGrade}>Guardar nota</button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="ra-card">
                          <div className="ra-card-body">
                            <div className="fw-bold mb-2">Indicadores (gráfico)</div>
                            <canvas ref={chartRef} height={220} />
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
              <StudentList students={students} />
              <button className="btn btn-outline-danger mt-3" onClick={() => setView('ra')}><i className="bi bi-arrow-left" /> Volver a RA</button>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

export default Docente
