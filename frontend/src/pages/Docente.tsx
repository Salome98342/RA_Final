import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import ModuleBreadcrumbs from '@/components/ModuleBreadcrumbs'
import SearchPill from '@/components/SearchPill'
import CardGrid from '@/components/CardGrid'
import RaCard from '@/components/RaCard'
import StudentList from '@/components/StudentList'
import PaginationControls from '@/components/PaginationControls'
import { getCourses, getRAsByCourse, getStudentsByCourse, getIndicatorsByRA, getActivitiesByRA, createActivityForRA, upsertGrade, getIndicatorChart, getRAValidation } from '@/services/api'
import type { Course, RA, Indicator, Activity, Student } from '@/types'
import { useSearchParams } from 'react-router-dom'
import { useSession } from '@/state/SessionContext'
import { Alert } from '@/utils/alert'
import Chart from 'chart.js/auto'

const DEFAULT_PAGE_SIZE = 10

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
  const [indicatorPage, setIndicatorPage] = useState(1)
  const [activityPage, setActivityPage] = useState(1)
  const [indicatorPageSize, setIndicatorPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [activityPageSize, setActivityPageSize] = useState(DEFAULT_PAGE_SIZE)
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
      setIndicatorPage(1)
      setActivityPage(1)
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
      setIndicatorPage(1)
      setActivityPage(1)
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
    const confirmed = await Alert.confirmCreate('actividad')
    if (!confirmed) return
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
    if (!selectedStudent) { Alert.toast.error('Selecciona un estudiante primero.'); return }
    if (!selectedActivity) { Alert.toast.error('Selecciona una actividad.'); return }
    if (!grade.nota) { Alert.toast.error('Ingresa una nota entre 0 y 5.'); return }
    const act = activities.find(a => String(a.raActividadId) === String(selectedActivity))
    if (act && Array.isArray(act.indicadores) && act.indicadores.length > 0 && !grade.indicadorId) {
      Alert.toast.error('Selecciona un indicador para esta actividad.')
      return
    }
    const n = Number(grade.nota)
    if (Number.isNaN(n) || n < 0 || n > 5) { Alert.toast.error('La nota debe estar entre 0 y 5.'); return }
    try {
      setSavingGrade(true)
      await upsertGrade({
        matriculaId: selectedStudent.matriculaId,
        raActividadId: selectedActivity,
        nota: n,
        retroalimentacion: grade.retro || undefined,
        indicadorId: grade.indicadorId || undefined,
      })
      Alert.toast.success('Guardado correctamente.')
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
      Alert.toast.error(msg)
    } finally {
      setSavingGrade(false)
    }
  }

  const items = [
    { key: 'inicio', icon: 'bi-house-door', title: 'Inicio' },
    { key: 'cursos', icon: 'bi-grid-3x3-gap', title: 'Cursos' },
    { key: 'crear', icon: 'bi-pencil-square', title: 'Gestionar RAs' },
    { key: 'listar', icon: 'bi-list-ul', title: 'Estudiantes' },
    { key: 'recursos', icon: 'bi-paperclip', title: 'Recursos' }
  ]

  const onSidebarClick = async (key: string) => {
    if (key === 'inicio') { setView('cursos'); setSelectedRA(null); return }
    else if (key === 'cursos') { setView('cursos'); setSelectedRA(null) }
    else if (key === 'crear') {
      if (!selectedCurso) { setView('cursos'); return }
      setView('ra')
      setSelectedRA(null)
    }
    else if (key === 'listar') {
      if (!selectedCurso) return
      await openEstudiantes()
    }
  }

  const filtered = courses.filter(
    (c) => !filter || c.id.toUpperCase().includes(filter.toUpperCase()) || c.carrera.toUpperCase().includes(filter.toUpperCase())
  )

  const breadcrumbItems = view === 'estudiantes'
    ? [
        { label: 'Inicio Docente', to: 'inicio' },
        { label: 'Cursos', to: 'cursos' },
        { label: 'Estudiantes' },
      ]
    : view === 'ra' && selectedRA
    ? [
        { label: 'Inicio Docente', to: 'inicio' },
        { label: 'Cursos', to: 'cursos' },
        { label: selectedCurso || 'Curso', to: 'ra' },
        { label: selectedRA.titulo || 'RA' },
      ]
    : view === 'ra'
    ? [
        { label: 'Inicio Docente', to: 'inicio' },
        { label: 'Cursos', to: 'cursos' },
        { label: selectedCurso || 'Curso' },
      ]
    : [
        { label: 'Inicio Docente' },
      ]

  const onBreadcrumbNavigate = (to: string) => {
    if (to === 'inicio' || to === 'cursos') {
      setView('cursos')
      if (to === 'inicio') {
        setSelectedRA(null)
      }
      return
    }
    if (to === 'ra' && selectedCurso) {
      setView('ra')
    }
  }

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Docente" />
      <div className="dash-wrapper">
        <Sidebar active={view === 'cursos' ? 'inicio' : view === 'ra' ? 'crear' : 'listar'} onClick={onSidebarClick} items={items} />
        <main className="dash-content">
          <ModuleBreadcrumbs items={breadcrumbItems} onNavigate={onBreadcrumbNavigate} />
          {errorMsg && (
            <div className="alert alert-danger d-flex justify-content-between align-items-center mb-3" role="alert">
              <span>{errorMsg}</span>
              <button className="btn btn-sm btn-outline-danger" onClick={() => {
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
              <div className="content-title">
                <i className="bi bi-book text-danger me-2"></i>
                Mis Cursos
              </div>
              <SearchPill icon="bi-search" placeholder="Buscar por código, nombre o carrera..." value={filter} onChange={setFilter} />
              {loadingCourses ? (
                <div className="text-center py-5">
                  <div className="spinner-border spinner-lg text-danger mb-3" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                  <p className="text-muted fw-semibold">Cargando tus cursos...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="alert alert-info mt-3 d-flex align-items-center shadow-sm">
                  <i className="bi bi-info-circle me-2 fs-5"></i>
                  <span>{filter ? 'No se encontraron cursos con ese criterio de búsqueda.' : 'No tienes cursos asignados.'}</span>
                </div>
              ) : (
                <CardGrid>
                  {filtered.map((c, idx) => (
                    <RaCard 
                      key={c.id} 
                      headTone={idx % 2 === 0 ? 'dark' : 'light'} 
                      title={c.nombre} 
                      subtitle={`${c.codigo ?? c.id} · ${c.carrera}`} 
                      onClick={() => openCurso(c)} 
                    />
                  ))}
                </CardGrid>
              )}
            </section>
          )}

          {view === 'ra' && !selectedRA && (
            <section className="panel shown">
              <div className="content-title">
                <i className="bi bi-clipboard-check text-info me-2"></i>
                Resultados de Aprendizaje
                {selectedCurso && (
                  <span className="text-muted fw-normal ms-2 text-subtitle">· {selectedCurso}</span>
                )}
              </div>
              <SearchPill icon="bi-journal-text" placeholder="Selecciona un Resultado de Aprendizaje..." value="" onChange={() => {}} />
              {ras.length === 0 ? (
                <div className="alert alert-info mt-3 d-flex align-items-center shadow-sm">
                  <i className="bi bi-info-circle me-2 fs-5"></i>
                  <span>Este curso no tiene Resultados de Aprendizaje definidos aún.</span>
                </div>
              ) : (
                <CardGrid>
                  {ras.map((ra, idx) => (
                    <RaCard 
                      key={ra.id} 
                      headTone={idx % 2 === 0 ? 'dark' : 'light'} 
                      title={
                        <>
                          <span className="text-uppercase small fw-bold d-block mb-1">RA {idx + 1}</span>
                          {ra.titulo}
                        </> as unknown as string
                      } 
                      subtitle={ra.info} 
                      onClick={() => openRADetails(ra)} 
                    />
                  ))}
                </CardGrid>
              )}
              <div className="d-flex gap-2 mt-4">
                <button className="btn btn-outline-danger shadow-sm" onClick={() => { setView('cursos'); setSelectedCurso('') }}>
                  <i className="bi bi-arrow-left me-1"></i>
                  Volver a cursos
                </button>
              </div>
            </section>
          )}

          {view === 'ra' && selectedRA && (
            <section className="panel shown">
              <div className="content-title">
                <i className="bi bi-clipboard-data text-success me-2"></i>
                {selectedRA.titulo}
                {selectedCurso && (
                  <span className="text-muted fw-normal ms-2 text-subtitle">· {selectedCurso}</span>
                )}
              </div>

              {/* Crear actividad */}
              <div className="ra-card mb-4 shadow-sm border-0">
                <div className="ra-card-head bg-danger text-white d-flex align-items-center p-1rem">
                  <i className="bi bi-plus-circle-fill me-2 fs-5"></i>
                  <span className="fw-bold">Crear Nueva Actividad</span>
                </div>
                <div className="ra-card-body p-1-5rem">
                  <div className="row g-3">
                    <div className="col-md-5">
                      <label className="form-label small fw-bold text-danger mb-2">
                        <i className="bi bi-pencil me-1"></i>
                        Nombre de la actividad <span className="text-danger">*</span>
                      </label>
                      <input 
                        className="form-control shadow-sm" 
                        placeholder="Ej: Taller sobre algoritmos" 
                        value={newAct.nombre} 
                        onChange={e=>setNewAct(a=>({...a, nombre:e.target.value}))} 
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small fw-bold text-danger mb-2">
                        <i className="bi bi-percent me-1"></i>
                        Peso (%) <span className="text-danger">*</span>
                      </label>
                      <input 
                        className="form-control shadow-sm" 
                        placeholder="25" 
                        title="Aporte de esta actividad al RA" 
                        type="number" 
                        step="0.01" 
                        min="0"
                        max="100"
                        value={newAct.pctRA} 
                        onChange={e=>setNewAct(a=>({...a, pctRA:e.target.value}))} 
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small fw-bold text-danger mb-2">
                        <i className="bi bi-tag me-1"></i>
                        Tipo
                      </label>
                      <input 
                        className="form-control shadow-sm" 
                        placeholder="1" 
                        value={newAct.tipo} 
                        onChange={e=>setNewAct(a=>({...a, tipo:e.target.value}))} 
                      />
                    </div>
                    <div className="col-md-3 d-flex align-items-end">
                      <button 
                        className="btn btn-danger w-100 shadow" 
                        disabled={savingNewAct} 
                        onClick={submitNewActivity}
                      >
                        {savingNewAct ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                            Creando…
                          </>
                        ) : (
                          <>
                            <i className="bi bi-plus-lg me-2"></i>
                            Crear Actividad
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {newActError && (
                    <div className="alert alert-danger mt-3 mb-0 d-flex align-items-center shadow-sm" role="alert">
                      <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
                      <span>{newActError}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Validación de pesos */}
              {raVal && (
                <div className="ra-card mb-4 shadow-sm border-0">
                  <div className="ra-card-head bg-light d-flex align-items-center">
                    <i className="bi bi-calculator-fill me-2 text-primary fs-5"></i>
                    <span className="fw-bold text-dark">Validación de Pesos</span>
                  </div>
                  <div className="ra-card-body">
                    <div className="row g-4">
                      <div className="col-md-6">
                        <div className={`alert mb-3 d-flex align-items-center shadow-sm ${raVal.actividades.ok ? 'alert-success' : 'alert-warning'}`}>
                          <i className={`bi ${raVal.actividades.ok ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2 fs-5`}></i>
                          <div>
                            <strong className="d-block">Actividades: {raVal.actividades.suma.toFixed(1)}%</strong>
                            <small>{raVal.actividades.ok ? 'Completo ✓' : `Falta ${raVal.actividades.faltante.toFixed(1)}%`}</small>
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                          <progress
                            className={`flex-grow-1 uv-progress ${raVal.actividades.suma > 100 ? 'prog-danger' : (raVal.actividades.ok ? 'prog-success' : 'prog-warning')}`}
                            aria-label="Progreso actividades a 100%"
                            max={100}
                            value={Math.min(100, Math.max(0, raVal.actividades.suma))}
                            title={`${raVal.actividades.suma.toFixed(2)}%`}
                          />
                          <span className="badge bg-secondary fs-6" aria-hidden="true">{raVal.actividades.suma.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className={`alert mb-3 d-flex align-items-center shadow-sm ${raVal.indicadores.ok ? 'alert-success' : 'alert-warning'}`}>
                          <i className={`bi ${raVal.indicadores.ok ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2 fs-5`}></i>
                          <div>
                            <strong className="d-block">Indicadores: {raVal.indicadores.suma.toFixed(1)}%</strong>
                            <small>{raVal.indicadores.ok ? 'Completo ✓' : `Falta ${raVal.indicadores.faltante.toFixed(1)}%`}</small>
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                          <progress
                            className={`flex-grow-1 uv-progress ${raVal.indicadores.suma > 100 ? 'prog-danger' : (raVal.indicadores.ok ? 'prog-success' : 'prog-warning')}`}
                            aria-label="Progreso indicadores a 100%"
                            max={100}
                            value={Math.min(100, Math.max(0, raVal.indicadores.suma))}
                            title={`${raVal.indicadores.suma.toFixed(2)}%`}
                          />
                          <span className="badge bg-secondary fs-6" aria-hidden="true">{raVal.indicadores.suma.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Indicadores y actividades */}
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <div className="ra-card shadow-sm border-0">
                    <div className="ra-card-head bg-info text-white d-flex align-items-center">
                      <i className="bi bi-bullseye me-2 fs-5"></i>
                      <span className="fw-bold">Indicadores de Logro</span>
                    </div>
                    <div className="ra-card-body">
                      {indicators.length === 0 ? (
                        <div className="text-center py-4 text-muted">
                          <i className="bi bi-info-circle fs-1 d-block mb-2"></i>
                          <small>No hay indicadores definidos</small>
                        </div>
                      ) : (
                            <>
                              <div className="ra-scroll-260">
                                <ul className="list-group ra-list-group">
                                  {indicators.slice((indicatorPage - 1) * indicatorPageSize, indicatorPage * indicatorPageSize).map((ind, idx) => (
                              <li key={ind.id} className="list-group-item d-flex justify-content-between align-items-start shadow-sm">
                                <div>
                                  <div className="badge bg-info text-white mb-2">Indicador {idx + 1}</div>
                                  <div>{ind.descripcion}</div>
                                </div>
                              </li>
                                  ))}
                                </ul>
                              </div>
                              <PaginationControls
                                page={indicatorPage}
                                totalPages={Math.max(1, Math.ceil(indicators.length / indicatorPageSize))}
                                totalItems={indicators.length}
                                pageSize={indicatorPageSize}
                                onPageChange={setIndicatorPage}
                                onPageSizeChange={(size) => {
                                  setIndicatorPage(1)
                                  setIndicatorPageSize(size)
                                }}
                                label="indicadores"
                              />
                            </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="ra-card shadow-sm border-0">
                    <div className="ra-card-head bg-success text-white d-flex align-items-center">
                      <i className="bi bi-clipboard-check-fill me-2 fs-5"></i>
                      <span className="fw-bold">Actividades</span>
                    </div>
                    <div className="ra-card-body">
                      {activities.length === 0 ? (
                        <div className="text-center py-4 text-muted">
                          <i className="bi bi-clipboard-x fs-1 d-block mb-2"></i>
                          <small>No hay actividades creadas</small>
                        </div>
                      ) : (
                        <>
                          <div className="ra-scroll-260">
                            <ul className="list-group ra-list-group">
                              {activities.slice((activityPage - 1) * activityPageSize, activityPage * activityPageSize).map((act, idx) => (
                              <li key={act.id} className="list-group-item d-flex justify-content-between align-items-start shadow-sm">
                                <div className="flex-grow-1">
                                  <div className="badge bg-success text-white mb-2">Actividad {idx + 1}</div>
                                  <div>{act.nombre}</div>
                                </div>
                                {act.porcentajeRA && (
                                  <span className="badge bg-danger rounded-pill fs-6">{act.porcentajeRA}%</span>
                                )}
                              </li>
                              ))}
                            </ul>
                          </div>
                          <PaginationControls
                            page={activityPage}
                            totalPages={Math.max(1, Math.ceil(activities.length / activityPageSize))}
                            totalItems={activities.length}
                            pageSize={activityPageSize}
                            onPageChange={setActivityPage}
                            onPageSizeChange={(size) => {
                              setActivityPage(1)
                              setActivityPageSize(size)
                            }}
                            label="actividades"
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Calificar estudiante por actividad */}
              <div className="ra-card mb-4 shadow border-0">
                <div className="ra-card-head bg-danger text-white d-flex align-items-center">
                  <i className="bi bi-pen-fill me-2 fs-5"></i>
                  <span className="fw-bold">Calificar Estudiantes</span>
                </div>
                <div className="ra-card-body">
                  <div className="row g-4">
                    <div className="col-md-4">
                      <div className="mb-2">
                        <label className="form-label fw-bold text-danger d-flex align-items-center mb-3">
                          <span className="badge bg-danger me-2">1</span>
                          <i className="bi bi-people me-2"></i>
                          Seleccionar Estudiante
                        </label>
                        {loadingStudents ? (
                          <div className="text-center py-4">
                            <div className="spinner-border text-danger mb-2" role="status">
                              <span className="visually-hidden">Cargando...</span>
                            </div>
                            <p className="text-muted small">Cargando estudiantes...</p>
                          </div>
                        ) : students.length === 0 ? (
                          <div className="text-center py-4">
                            <i className="bi bi-people fs-1 text-muted d-block mb-3"></i>
                            <button className="btn btn-danger shadow" onClick={openEstudiantes}>
                              <i className="bi bi-people me-2"></i>
                              Cargar estudiantes
                            </button>
                          </div>
                        ) : (
                          <>
                            {selectedStudent && (
                              <div className="alert alert-success py-2 px-3 mb-3 small d-flex align-items-center shadow-sm">
                                <i className="bi bi-check-circle-fill me-2 fs-5"></i>
                                <strong>{selectedStudent.name}</strong>
                              </div>
                            )}
                            <div className="ra-scroll-260 border rounded shadow-sm">
                              <StudentList students={students} onSelect={onSelectStudent} />
                            </div>
                            <button className="btn btn-sm btn-outline-danger mt-3 w-100 shadow-sm" onClick={openEstudiantes}>
                              <i className="bi bi-arrow-clockwise me-2"></i>
                              Recargar lista
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-2">
                        <label className="form-label fw-bold text-danger d-flex align-items-center mb-3">
                          <span className="badge bg-danger me-2">2</span>
                          <i className="bi bi-pencil me-2"></i>
                          Ingresar Calificación
                        </label>
                        
                        {!selectedStudent ? (
                          <div className="alert alert-warning py-3 shadow-sm d-flex align-items-center">
                            <i className="bi bi-arrow-left-circle-fill me-2 fs-5"></i>
                            <span className="small">Primero selecciona un estudiante</span>
                          </div>
                        ) : (
                          <>
                            <div className="mb-3">
                              <label className="form-label small fw-semibold">
                                <i className="bi bi-clipboard-check me-1"></i>
                                Actividad <span className="text-danger">*</span>
                              </label>
                              <select 
                                className="form-select shadow-sm" 
                                aria-label="Seleccionar actividad" 
                                value={selectedActivity} 
                                onChange={e=>setSelectedActivity(e.target.value)}
                              >
                                <option value="">Seleccione...</option>
                                {activities.map(act => (
                                  <option key={act.id} value={act.raActividadId}>
                                    {act.nombre} {act.porcentajeRA && `(${act.porcentajeRA}%)`}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="mb-3">
                              <label className="form-label small fw-semibold">
                                <i className="bi bi-bullseye me-1"></i>
                                Indicador (opcional)
                              </label>
                              <select 
                                className="form-select shadow-sm" 
                                aria-label="Seleccionar indicador (opcional)" 
                                value={grade.indicadorId} 
                                onChange={e=>setGrade(g=>({...g, indicadorId:e.target.value}))}
                              >
                                <option value="">Todos</option>
                                {indicators.map(ind => <option key={ind.id} value={ind.id}>{ind.descripcion}</option>)}
                              </select>
                            </div>

                            <div className="mb-3">
                              <label className="form-label small fw-semibold">
                                <i className="bi bi-star-fill text-warning me-1"></i>
                                Nota (0-5) <span className="text-danger">*</span>
                              </label>
                              <input 
                                className="form-control shadow-sm" 
                                type="number" 
                                step="0.1" 
                                min={0} 
                                max={5} 
                                placeholder="Ej: 4.5" 
                                value={grade.nota} 
                                onChange={e=>setGrade(g=>({...g, nota:e.target.value}))} 
                              />
                            </div>

                            <div className="mb-3">
                              <label className="form-label small fw-semibold">
                                <i className="bi bi-chat-left-text me-1"></i>
                                Retroalimentación
                              </label>
                              <textarea 
                                className="form-control shadow-sm" 
                                rows={3}
                                placeholder="Comentarios para el estudiante..." 
                                value={grade.retro} 
                                onChange={e=>setGrade(g=>({...g, retro:e.target.value}))} 
                              />
                            </div>

                            <div className="d-grid">
                              {
                                (() => {
                                  const act = activities.find(a => String(a.raActividadId) === String(selectedActivity))
                                  const req = Boolean(act && Array.isArray(act.indicadores) && act.indicadores.length > 0)
                                  const disabled = !selectedStudent || !grade.nota || !selectedActivity || (req && !grade.indicadorId)
                                  return (
                                    <button className="btn btn-danger shadow" disabled={disabled || savingGrade} onClick={submitGrade}>
                                      {savingGrade ? (
                                        <>
                                          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                                          Guardando…
                                        </>
                                      ) : (
                                        <>
                                          <i className="bi bi-check2-circle-fill me-2"></i>
                                          Guardar nota
                                        </>
                                      )}
                                    </button>
                                  )
                                })()
                              }
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-2">
                        <label className="form-label fw-bold text-danger d-flex align-items-center mb-3">
                          <span className="badge bg-danger me-2">3</span>
                          <i className="bi bi-bar-chart me-2"></i>
                          Progreso del Estudiante
                        </label>
                        {!selectedStudent ? (
                          <div className="text-center py-5">
                            <i className="bi bi-bar-chart-fill fs-1 text-muted d-block mb-3"></i>
                            <p className="text-muted small mb-0">Selecciona un estudiante<br/>para ver su progreso</p>
                          </div>
                        ) : chartEmpty ? (
                          <div className="alert alert-info shadow-sm d-flex align-items-start mb-0">
                            <i className="bi bi-info-circle-fill me-2 fs-5 mt-1"></i>
                            <div>
                              <strong className="d-block mb-1">{selectedStudent.name}</strong>
                              <small>No hay calificaciones aún. Ingresa notas para ver el progreso.</small>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="alert alert-light shadow-sm py-2 px-3 mb-3 d-flex align-items-center border">
                              <i className="bi bi-person-circle me-2 text-primary fs-5"></i>
                              <strong>{selectedStudent.name}</strong>
                            </div>
                            <div className="border rounded p-3 bg-white shadow-sm">
                              <canvas ref={chartRef} height={220} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="d-flex gap-3 mt-4">
                <button className="btn btn-outline-danger shadow-sm" onClick={() => { setView('ra'); setSelectedRA(null) }}>
                  <i className="bi bi-arrow-left me-2"></i>
                  Volver a RAs
                </button>
                <button className="btn btn-outline-danger shadow-sm" onClick={() => { setView('cursos'); setSelectedRA(null); setSelectedCurso('') }}>
                  <i className="bi bi-grid-3x3-gap me-2"></i>
                  Ver cursos
                </button>
              </div>
            </section>
          )}

          {view === 'estudiantes' && (
            <section className="panel shown">
              <div className="content-title">
                <i className="bi bi-people-fill text-primary me-2"></i>
                Estudiantes
                {selectedCurso && (
                  <span className="text-muted fw-normal ms-2 text-subtitle">· {selectedCurso}</span>
                )}
              </div>
              <SearchPill icon="bi-people" placeholder="Buscar estudiante..." value="" onChange={() => {}} />
              {loadingStudents ? (
                <div className="text-center py-5">
                  <div className="spinner-border spinner-lg text-danger mb-3" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                  <p className="text-muted fw-semibold">Cargando estudiantes...</p>
                </div>
              ) : students.length === 0 ? (
                <div className="alert alert-info mt-3 d-flex align-items-center shadow-sm">
                  <i className="bi bi-info-circle me-2 fs-5"></i>
                  <span>No hay estudiantes matriculados en este curso.</span>
                </div>
              ) : (
                <div className="ra-card mt-3 shadow-sm border-0">
                  <div className="ra-card-head bg-primary text-white d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-people-fill me-2 fs-5"></i>
                      <span className="fw-bold">Estudiantes Matriculados</span>
                    </div>
                    <span className="badge bg-light text-dark">{students.length}</span>
                  </div>
                  <div className="ra-card-body">
                    <StudentList students={students} onSelect={async (s) => {
                      await onSelectStudent(s)
                      setView('ra')
                    }} />
                  </div>
                </div>
              )}
              <div className="d-flex gap-3 mt-4">
                <button className="btn btn-outline-danger shadow-sm" onClick={() => { setView('ra') }}>
                  <i className="bi bi-arrow-left me-2"></i>
                  Volver a RAs
                </button>
                <button className="btn btn-outline-danger shadow-sm" onClick={() => { setView('cursos'); setSelectedCurso('') }}>
                  <i className="bi bi-grid-3x3-gap me-2"></i>
                  Ver cursos
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

export default Docente
