import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import ModuleBreadcrumbs from '@/components/ModuleBreadcrumbs'
import PaginationControls from '@/components/PaginationControls'
import { getCourseAnalytics } from '@/services/api'
import type { CourseAnalyticsResponse } from '@/types'

type RouteState = {
  returnTo?: string
  id_asignatura?: number
  grupo?: string
  sede?: string
}

const DEFAULT_PAGE_SIZE = 10

const AsignaturaAnalisis = () => {
  const { codigo } = useParams<{ codigo: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [data, setData] = useState<CourseAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [raPage, setRaPage] = useState(1)
  const [studentPage, setStudentPage] = useState(1)
  const [raPageSize, setRaPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [studentPageSize, setStudentPageSize] = useState(DEFAULT_PAGE_SIZE)

  const routeState = (location.state as RouteState | null) || {}
  const returnTo = routeState.returnTo || '/coordinador/asignaturas'
  const idAsignatura = routeState.id_asignatura
  const grupo = routeState.grupo
  const sede = routeState.sede

  useEffect(() => {
    if (!codigo) return
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await getCourseAnalytics(codigo, {
          id_asignatura: idAsignatura,
          grupo,
          sede,
        })
        if (result) {
          setData(result)
        } else {
          setError('No se pudo cargar la información de la asignatura')
        }
      } catch {
        setError('Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [codigo, idAsignatura, grupo, sede])

  useEffect(() => {
    setRaPage(1)
    setStudentPage(1)
  }, [codigo, idAsignatura, grupo, sede])

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

  if (loading) {
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
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="text-muted">Cargando análisis de la asignatura...</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error || !data) {
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
            <div className="content-title">Error</div>
            <div className="alert alert-danger">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error || 'No se encontró información'}
            </div>
            <button className="btn btn-secondary" onClick={() => navigate(returnTo)}>
              <i className="bi bi-arrow-left me-2"></i>
              Volver
            </button>
          </main>
        </div>
      </div>
    )
  }

  const { asignatura, docente, estudiantes_matriculados, estadistica_curso, resultados_aprendizaje, estudiantes } = data
  const resultadosAprendizajePage = resultados_aprendizaje.slice((raPage - 1) * raPageSize, raPage * raPageSize)
  const estudiantesOrdenados = [...estudiantes].sort((a, b) => b.nota - a.nota)
  const estudiantesPageData = estudiantesOrdenados.slice((studentPage - 1) * studentPageSize, studentPage * studentPageSize)
  const raMaxPage = Math.max(1, Math.ceil(resultados_aprendizaje.length / raPageSize))
  const studentMaxPage = Math.max(1, Math.ceil(estudiantesOrdenados.length / studentPageSize))

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
          <ModuleBreadcrumbs
            items={[
              { label: 'Coordinador', to: '/coordinador' },
              { label: 'Asignaturas', to: '/coordinador/asignaturas' },
              { label: 'Análisis General' },
            ]}
            onNavigate={(to) => navigate(to)}
          />
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="content-title">
              <i className="bi bi-bar-chart-line-fill me-2"></i>
              Análisis General - {asignatura.nombre}
            </div>
            <button className="btn btn-secondary" onClick={() => navigate(returnTo)}>
              <i className="bi bi-arrow-left me-2"></i>
              Volver
            </button>
          </div>

          <section className="panel shown">
            {/* Información de la asignatura */}
            <div className="card mb-3">
              <div className="card-body">
                <h6 className="card-title mb-3">
                  <i className="bi bi-journal-text text-primary me-2"></i>
                  Información de la Asignatura
                </h6>
                <div className="row g-2">
                  <div className="col-md-4">
                    <small className="text-muted d-block">Código</small>
                    <strong>{asignatura.codigo}</strong>
                  </div>
                  <div className="col-md-4">
                    <small className="text-muted d-block">Programa</small>
                    <strong>{asignatura.programa.nombre || 'N/A'}</strong>
                  </div>
                  <div className="col-md-4">
                    <small className="text-muted d-block">Período</small>
                    <strong>{asignatura.periodo.descripcion || 'N/A'}</strong>
                  </div>
                  <div className="col-md-4">
                    <small className="text-muted d-block">Grupo</small>
                    <strong>{asignatura.grupo || 'N/A'}</strong>
                  </div>
                  <div className="col-md-4">
                    <small className="text-muted d-block">Sede</small>
                    <strong>{asignatura.sede || 'N/A'}</strong>
                  </div>
                  <div className="col-md-4">
                    <small className="text-muted d-block">Créditos</small>
                    <strong>{asignatura.creditos || 'N/A'}</strong>
                  </div>
                  <div className="col-md-4">
                    <small className="text-muted d-block">Estudiantes matriculados</small>
                    <strong className="text-primary">{estudiantes_matriculados}</strong>
                  </div>
                </div>
                {docente && (
                  <div className="mt-3 pt-3 border-top">
                    <small className="text-muted d-block mb-1">Docente</small>
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-person-circle"></i>
                      <div>
                        <strong>{docente.nombre}</strong>
                        <small className="text-muted d-block">{docente.correo}</small>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Estadísticas generales del curso */}
            <div className="card mb-3">
              <div className="card-body">
                <h6 className="card-title mb-3">
                  <i className="bi bi-graph-up text-success me-2"></i>
                  Estadísticas del Curso
                </h6>
                <div className="row g-3">
                  <div className="col-md-3">
                    <div className="text-center p-3 bg-light rounded">
                      <div className="h2 mb-1 text-primary">{estadistica_curso.promedio}</div>
                      <small className="text-muted">Promedio General</small>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="text-center p-3 bg-light rounded">
                      <div className="h2 mb-1 text-success">{estadistica_curso.nota_max}</div>
                      <small className="text-muted">Nota Máxima</small>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="text-center p-3 bg-light rounded">
                      <div className="h2 mb-1 text-danger">{estadistica_curso.nota_min}</div>
                      <small className="text-muted">Nota Mínima</small>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="text-center p-3 bg-light rounded">
                      <div className="h2 mb-1 text-info">{estadistica_curso.desviacion_estandar}</div>
                      <small className="text-muted">Desviación Estándar</small>
                    </div>
                  </div>
                </div>
                
                {/* Distribución aprobados/reprobados */}
                <div className="mt-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted">Distribución de notas</span>
                    <span className="text-muted">
                      {estadistica_curso.estudiantes_aprobados} aprobados / {estadistica_curso.estudiantes_reprobados} reprobados
                    </span>
                  </div>
                  <div className="progress" style={{ height: '30px' }}>
                    <div 
                      className="progress-bar bg-success" 
                      style={{ width: `${(estadistica_curso.estudiantes_aprobados / estudiantes_matriculados) * 100}%` }}
                    >
                      {estadistica_curso.estudiantes_aprobados > 0 && (
                        <span className="fw-bold">{Math.round((estadistica_curso.estudiantes_aprobados / estudiantes_matriculados) * 100)}%</span>
                      )}
                    </div>
                    <div 
                      className="progress-bar bg-danger" 
                      style={{ width: `${(estadistica_curso.estudiantes_reprobados / estudiantes_matriculados) * 100}%` }}
                    >
                      {estadistica_curso.estudiantes_reprobados > 0 && (
                        <span className="fw-bold">{Math.round((estadistica_curso.estudiantes_reprobados / estudiantes_matriculados) * 100)}%</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resultados de Aprendizaje */}
            <div className="card mb-3">
              <div className="card-body">
                <h6 className="card-title mb-3">
                  <i className="bi bi-trophy text-warning me-2"></i>
                  Resultados de Aprendizaje
                </h6>
                <div className="table-responsive">
                  <table className="table table-sm table-hover">
                    <thead>
                      <tr>
                        <th style={{ width: '10%' }}>RA</th>
                        <th style={{ width: '40%' }}>Descripción</th>
                        <th style={{ width: '15%' }}>Peso</th>
                        <th style={{ width: '15%' }}>Promedio</th>
                        <th style={{ width: '20%' }}>Cobertura</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultadosAprendizajePage.map((ra) => (
                        <tr key={ra.id_ra}>
                          <td><span className="badge bg-secondary">RA {ra.numero_ra ?? ra.id_ra}</span></td>
                          <td><small>{ra.descripcion}</small></td>
                          <td><span className="badge bg-primary">{ra.porcentaje_ra}%</span></td>
                          <td>
                            <span className={`badge bg-${ra.promedio >= 3.5 ? 'success' : ra.promedio >= 3.0 ? 'warning' : 'danger'}`}>
                              {ra.promedio.toFixed(2)}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="progress flex-grow-1 progress-min-60" style={{ height: '8px' }}>
                                <div 
                                  className={`progress-bar bg-${ra.coverage_promedio >= 70 ? 'success' : ra.coverage_promedio >= 40 ? 'warning' : 'danger'}`}
                                  style={{ width: `${ra.coverage_promedio}%` }}
                                ></div>
                              </div>
                              <small className="text-muted minw-40">{ra.coverage_promedio}%</small>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationControls
                  page={raPage}
                  totalPages={raMaxPage}
                  totalItems={resultados_aprendizaje.length}
                  pageSize={raPageSize}
                  onPageChange={setRaPage}
                  onPageSizeChange={(size) => {
                    setRaPage(1)
                    setRaPageSize(size)
                  }}
                  label="RAs"
                />
              </div>
            </div>

            {/* Lista de estudiantes */}
            <div className="card">
              <div className="card-body">
                <h6 className="card-title mb-3">
                  <i className="bi bi-people text-info me-2"></i>
                  Estudiantes ({estudiantes.length})
                </h6>
                <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <table className="table table-sm table-striped table-hover">
                    <thead className="sticky-top bg-white">
                      <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Nota</th>
                        <th>Cobertura</th>
                        <th>Actividades</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estudiantesPageData.map((est) => (
                          <tr key={est.id}>
                            <td><small className="font-monospace">{est.id}</small></td>
                            <td><small>{est.nombre}</small></td>
                            <td>
                              <span className={`badge bg-${est.nota >= 3.5 ? 'success' : est.nota >= 3.0 ? 'warning' : 'danger'}`}>
                                {est.nota.toFixed(2)}
                              </span>
                            </td>
                            <td>
                              <div className="d-flex align-items-center gap-1">
                                <div className="progress flex-grow-1 progress-min-50" style={{ height: '6px' }}>
                                  <div 
                                    className={`progress-bar bg-${est.coverage >= 70 ? 'success' : est.coverage >= 40 ? 'warning' : 'danger'}`}
                                    style={{ width: `${est.coverage}%` }}
                                  ></div>
                                </div>
                                <small className="minw-35">{est.coverage}%</small>
                              </div>
                            </td>
                            <td>
                              <small className="text-muted">
                                {est.actividades_calificadas}/{est.actividades_totales}
                              </small>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <PaginationControls
                  page={studentPage}
                  totalPages={studentMaxPage}
                  totalItems={estudiantesOrdenados.length}
                  pageSize={studentPageSize}
                  onPageChange={setStudentPage}
                  onPageSizeChange={(size) => {
                    setStudentPage(1)
                    setStudentPageSize(size)
                  }}
                  label="estudiantes"
                />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default AsignaturaAnalisis
