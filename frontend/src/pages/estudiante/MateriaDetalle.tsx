import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import { getCourseDetail } from '@/services/api'
import type { CourseDetailResponse } from '@/types'

const MateriaDetalle = () => {
  const { codigo } = useParams<{ codigo: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<CourseDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)

  useEffect(() => {
    // Obtener el studentId del localStorage/sessionStorage o contexto
    const storedStudentId = sessionStorage.getItem('studentId') || localStorage.getItem('studentId')
    if (storedStudentId) {
      setStudentId(storedStudentId)
    } else {
      setError('No se encontró ID de estudiante')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!codigo || !studentId) return
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await getCourseDetail(codigo, studentId)
        if (result) {
          setData(result)
        } else {
          setError('No se pudo cargar la información de la asignatura')
        }
      } catch (e) {
        setError('Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [codigo, studentId])

  if (loading) {
    return (
      <div className="dashboard-body min-vh-100">
        <HeaderBar roleLabel="Estudiante" />
        <div className="dash-wrapper">
          <main className="dash-content">
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="text-muted">Cargando detalle de la asignatura...</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="dashboard-body min-vh-100">
        <HeaderBar roleLabel="Estudiante" />
        <div className="dash-wrapper">
          <main className="dash-content">
            <div className="content-title">Error</div>
            <div className="alert alert-danger">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error || 'No se encontró información'}
            </div>
            <button className="btn btn-secondary" onClick={() => navigate('/estudiante')}>
              <i className="bi bi-arrow-left me-2"></i>
              Volver
            </button>
          </main>
        </div>
      </div>
    )
  }

  const { asignatura, docente, estudiantes_matriculados, mi_estadistica, resultados_aprendizaje } = data

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Estudiante" />
      <div className="dash-wrapper">
        <main className="dash-content">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="content-title">
              <i className="bi bi-book me-2"></i>
              Mi Desempeño - {asignatura.nombre}
            </div>
            <button className="btn btn-secondary" onClick={() => navigate('/estudiante')}>
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
                    <small className="text-muted d-block">Periodo</small>
                    <strong>{asignatura.periodo.descripcion || 'N/A'}</strong>
                  </div>
                  <div className="col-md-4">
                    <small className="text-muted d-block">Grupo</small>
                    <strong>{asignatura.grupo || 'N/A'}</strong>
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

            {/* Mi Desempeño - Solo información personal del estudiante */}
            <div className="card mb-3">
              <div className="card-body">
                <h6 className="card-title mb-3">
                  <i className="bi bi-person-badge text-primary me-2"></i>
                  Mi Desempeño en esta Asignatura
                </h6>
                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="text-center p-3 bg-primary bg-opacity-10 rounded">
                      <div className="display-6 mb-2 text-primary fw-bold">{mi_estadistica.nota_progressive}</div>
                      <small className="text-muted">Nota Progresiva</small>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center p-3 bg-success bg-opacity-10 rounded">
                      <div className="display-6 mb-2 text-success fw-bold">{mi_estadistica.coverage}%</div>
                      <small className="text-muted">Cobertura</small>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center p-3 bg-info bg-opacity-10 rounded">
                      <div className="display-6 mb-2 text-info fw-bold">{mi_estadistica.actividades_calificadas}</div>
                      <small className="text-muted">de {mi_estadistica.actividades_totales} actividades calificadas</small>
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <small className="text-muted">
                    <i className="bi bi-info-circle me-1"></i>
                    {mi_estadistica.coverage >= 50 ? (
                      <span className="text-success">
                        Tu nota progresiva ya está disponible. ¡Sigue así!
                      </span>
                    ) : (
                      <span className="text-warning">
                        Completa más actividades para obtener tu nota progresiva (requiere 50% de cobertura).
                      </span>
                    )}
                  </small>
                </div>
              </div>
            </div>

            {/* Resultados de Aprendizaje */}
            <div className="card">
              <div className="card-body">
                <h6 className="card-title mb-3">
                  <i className="bi bi-trophy text-warning me-2"></i>
                  Desglose por Resultados de Aprendizaje
                </h6>
                <div className="table-responsive">
                  <table className="table table-sm table-hover">
                    <thead>
                      <tr>
                        <th style={{ width: '10%' }}>RA</th>
                        <th style={{ width: '40%' }}>Descripción</th>
                        <th style={{ width: '15%' }}>Peso</th>
                        <th style={{ width: '15%' }}>Mi Nota</th>
                        <th style={{ width: '20%' }}>Cobertura</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados_aprendizaje.map((ra) => (
                        <tr key={ra.id_ra}>
                          <td><span className="badge bg-secondary">RA {ra.id_ra}</span></td>
                          <td><small>{ra.descripcion}</small></td>
                          <td><span className="badge bg-primary">{ra.porcentaje_ra}%</span></td>
                          <td>
                            {ra.nota !== null ? (
                              <span className={`badge bg-${ra.nota >= 3.5 ? 'success' : ra.nota >= 3.0 ? 'warning' : 'danger'}`}>
                                {ra.nota.toFixed(2)}
                              </span>
                            ) : (
                              <span className="badge bg-secondary">N/A</span>
                            )}
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="progress flex-grow-1" style={{ height: '8px', minWidth: '60px' }}>
                                <div 
                                  className={`progress-bar bg-${ra.coverage >= 70 ? 'success' : ra.coverage >= 40 ? 'warning' : 'danger'}`}
                                  style={{ width: `${ra.coverage}%` }}
                                ></div>
                              </div>
                              <small className="text-muted" style={{ minWidth: '40px' }}>{ra.coverage}%</small>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default MateriaDetalle
