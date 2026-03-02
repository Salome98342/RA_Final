import React, { useEffect, useState } from 'react'
import { fetchEstudiantePerfil, type EstudiantePerfilCompleto } from '@/services/coordinador'

interface EstudiantePerfilModalProps {
  id_estudiante: number
  onClose: () => void
}

const EstudiantePerfilModal: React.FC<EstudiantePerfilModalProps> = ({ id_estudiante, onClose }) => {
  const [data, setData] = useState<EstudiantePerfilCompleto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<number | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchEstudiantePerfil(id_estudiante)
        setData(result)
        // Seleccionar el período más reciente por defecto
        if (result.periodos.length > 0) {
          setPeriodoSeleccionado(result.periodos[0].id_periodo)
        }
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Error al cargar el perfil del estudiante')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id_estudiante])

  const periodo = data?.periodos.find(p => p.id_periodo === periodoSeleccionado)

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'aprobado': return 'success'
      case 'reprobado': return 'danger'
      case 'en_progreso': return 'warning'
      default: return 'secondary'
    }
  }

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'aprobado': return 'Aprobado'
      case 'reprobado': return 'Reprobado'
      case 'en_progreso': return 'En Progreso'
      default: return estado
    }
  }

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 80) return 'success'
    if (coverage >= 50) return 'warning'
    return 'danger'
  }

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className="bi bi-person-circle me-2"></i>
              Perfil del Estudiante
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Cerrar"></button>
          </div>

          {/* Body */}
          <div className="modal-body">
            {loading && (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="mt-3 text-muted">Cargando información del estudiante...</p>
              </div>
            )}

            {error && (
              <div className="alert alert-danger">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}

            {data && !loading && (
              <>
                {/* Información Personal */}
                <div className="card shadow-sm mb-4">
                  <div className="card-header bg-light">
                    <h6 className="mb-0">
                      <i className="bi bi-person-vcard me-2"></i>
                      Información Personal
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="d-flex align-items-center mb-2">
                          <strong className="text-muted me-2">Código:</strong>
                          <span className="badge bg-primary">{data.estudiante.codigo_estudiante}</span>
                        </div>
                        <div className="mb-2">
                          <strong className="text-muted me-2">Nombre Completo:</strong>
                          <span>{data.estudiante.nombre_completo}</span>
                        </div>
                        <div className="mb-2">
                          <strong className="text-muted me-2">Correo:</strong>
                          <span>{data.estudiante.correo}</span>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-2">
                          <strong className="text-muted me-2">Documento:</strong>
                          <span>{data.estudiante.tipo_documento} - {data.estudiante.num_documento}</span>
                        </div>
                        <div className="mb-2">
                          <strong className="text-muted me-2">Programa:</strong>
                          <span>{data.estudiante.programa || 'N/A'}</span>
                        </div>
                        {data.estudiante.jornada && (
                          <div className="mb-2">
                            <strong className="text-muted me-2">Jornada:</strong>
                            <span>{data.estudiante.jornada}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estadísticas Generales */}
                <div className="row g-3 mb-4">
                  <div className="col-md-3">
                    <div className="card shadow-sm border-primary h-100">
                      <div className="card-body text-center">
                        <i className="bi bi-mortarboard text-primary fs-2"></i>
                        <h4 className="mt-2 mb-0">{data.estadisticas.total_asignaturas}</h4>
                        <small className="text-muted">Asignaturas</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card shadow-sm border-success h-100">
                      <div className="card-body text-center">
                        <i className="bi bi-trophy text-success fs-2"></i>
                        <h4 className="mt-2 mb-0">
                          {data.estadisticas.promedio_general?.toFixed(2) || 'N/A'}
                        </h4>
                        <small className="text-muted">Promedio General</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card shadow-sm border-info h-100">
                      <div className="card-body text-center">
                        <i className="bi bi-check-circle text-info fs-2"></i>
                        <h4 className="mt-2 mb-0">{data.estadisticas.asignaturas_aprobadas}</h4>
                        <small className="text-muted">Aprobadas</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card shadow-sm border-danger h-100">
                      <div className="card-body text-center">
                        <i className="bi bi-x-circle text-danger fs-2"></i>
                        <h4 className="mt-2 mb-0">{data.estadisticas.asignaturas_reprobadas}</h4>
                        <small className="text-muted">Reprobadas</small>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selector de Período */}
                {data.periodos.length > 0 && (
                  <div className="mb-3">
                    <label className="form-label fw-bold">
                      <i className="bi bi-calendar3 me-2"></i>
                      Período Académico:
                    </label>
                    <select 
                      className="form-select"
                      value={periodoSeleccionado || ''}
                      onChange={(e) => setPeriodoSeleccionado(Number(e.target.value))}
                      aria-label="Seleccionar período académico"
                    >
                      {data.periodos.map(p => (
                        <option key={p.id_periodo} value={p.id_periodo}>
                          {p.descripcion} ({p.asignaturas.length} asignaturas)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Asignaturas del Período Seleccionado */}
                {periodo && (
                  <div className="card shadow-sm">
                    <div className="card-header bg-light">
                      <h6 className="mb-0">
                        <i className="bi bi-book me-2"></i>
                        Asignaturas - {periodo.descripcion}
                      </h6>
                    </div>
                    <div className="card-body p-0">
                      <div className="accordion" id="accordionAsignaturas">
                        {periodo.asignaturas.map((asig, idx) => (
                          <div className="accordion-item" key={asig.id_asignatura}>
                            <h2 className="accordion-header">
                              {/* eslint-disable-next-line axe/aria */}
                              <button
                                className={`accordion-button ${idx !== 0 ? 'collapsed' : ''}`}
                                type="button"
                                data-bs-toggle="collapse"
                                data-bs-target={`#collapse${asig.id_asignatura}`}
                                aria-expanded={idx === 0 ? 'true' : 'false'}
                              >
                                <div className="d-flex w-100 justify-content-between align-items-center me-3">
                                  <div>
                                    <span className="badge bg-secondary me-2">{asig.codigo_asignatura}</span>
                                    <strong>{asig.nombre}</strong>
                                    <br />
                                    <small className="text-muted">Docente: {asig.docente}</small>
                                  </div>
                                  <div className="text-end">
                                    <span className={`badge bg-${getEstadoColor(asig.estado)} me-2`}>
                                      {getEstadoLabel(asig.estado)}
                                    </span>
                                    <strong className="text-primary">{asig.nota_strict.toFixed(2)}</strong>
                                    <br />
                                    <small className="text-muted">Cobertura: {asig.coverage.toFixed(0)}%</small>
                                  </div>
                                </div>
                              </button>
                            </h2>
                            <div
                              id={`collapse${asig.id_asignatura}`}
                              className={`accordion-collapse collapse ${idx === 0 ? 'show' : ''}`}
                              data-bs-parent="#accordionAsignaturas"
                            >
                              <div className="accordion-body">
                                <div className="row mb-3">
                                  <div className="col-md-4">
                                    <small className="text-muted">Nota Strict:</small>
                                    <div className="fs-5 fw-bold text-primary">{asig.nota_strict.toFixed(2)}</div>
                                  </div>
                                  <div className="col-md-4">
                                    <small className="text-muted">Nota Progressive:</small>
                                    <div className="fs-5 fw-bold text-success">{asig.nota_progressive.toFixed(2)}</div>
                                  </div>
                                  <div className="col-md-4">
                                    <small className="text-muted">Cobertura:</small>
                                    <div className="progress" style={{ height: '30px' }}>
                                      {/* eslint-disable-next-line axe/aria */}
                                      <div
                                        className={`progress-bar bg-${getCoverageColor(asig.coverage)}`}
                                        role="progressbar"
                                        style={{ width: `${asig.coverage}%` }}
                                        aria-label="Cobertura de la asignatura"
                                        aria-valuenow={Math.round(asig.coverage)}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                      >
                                        {asig.coverage.toFixed(0)}%
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* RAs de la asignatura */}
                                <h6 className="mb-3">Resultados de Aprendizaje:</h6>
                                <div className="table-responsive">
                                  <table className="table table-sm table-hover">
                                    <thead className="table-light">
                                      <tr>
                                        <th>RA</th>
                                        <th className="text-center">Peso</th>
                                        <th className="text-center">Nota</th>
                                        <th className="text-center">Cobertura</th>
                                        <th className="text-center">Actividades</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {asig.ras.map(ra => (
                                        <tr key={ra.id_ra}>
                                          <td>
                                            <small>{ra.descripcion}</small>
                                          </td>
                                          <td className="text-center">
                                            <span className="badge bg-info">{ra.porcentaje_ra}%</span>
                                          </td>
                                          <td className="text-center">
                                            <strong>{ra.nota_strict.toFixed(2)}</strong>
                                            {ra.nota_progressive && (
                                              <small className="text-muted d-block">
                                                ({ra.nota_progressive.toFixed(2)})
                                              </small>
                                            )}
                                          </td>
                                          <td className="text-center">
                                            <span className={`badge bg-${getCoverageColor(ra.coverage)}`}>
                                              {ra.coverage.toFixed(0)}%
                                            </span>
                                          </td>
                                          <td className="text-center">
                                            <small>
                                              {ra.actividades_calificadas}/{ra.total_actividades}
                                            </small>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              <i className="bi bi-x-circle me-2"></i>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EstudiantePerfilModal
