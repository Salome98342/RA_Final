import React, { useEffect, useState } from 'react'
import { fetchDocentePerfil, fetchPeriodosCoordinador, type DocentePerfilCompleto } from '@/services/coordinador'
import { sortPeriodosDesc } from '@/utils/periodos'

interface DocentePerfilModalProps {
  id_docente: number
  onClose: () => void
}

const DocentePerfilModal: React.FC<DocentePerfilModalProps> = ({ id_docente, onClose }) => {
  const [data, setData] = useState<DocentePerfilCompleto | null>(null)
  const [periodos, setPeriodos] = useState<Array<{ id_periodo: number; descripcion: string }>>([])
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [result, periodosResponse] = await Promise.all([
          fetchDocentePerfil(id_docente),
          fetchPeriodosCoordinador(),
        ])

        const sortedPeriodos = sortPeriodosDesc(periodosResponse || [])
        setPeriodos(sortedPeriodos)

        const latestFromPeriodos = sortedPeriodos.length ? String(sortedPeriodos[0].id_periodo) : ''
        const latestFromAsignaturas = sortPeriodosDesc(
          result.asignaturas
            .filter((asig) => !!asig.id_periodo && !!asig.periodo)
            .map((asig) => ({
              id_periodo: Number(asig.id_periodo),
              descripcion: String(asig.periodo),
            }))
        )
        const latestFromAsignaturasValue = latestFromAsignaturas.length
          ? String(latestFromAsignaturas[0].id_periodo)
          : ''

        setPeriodoSeleccionado(latestFromPeriodos || latestFromAsignaturasValue)
        setData(result)
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Error al cargar el perfil del docente')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id_docente])

  const asignaturasMostradas = data
    ? (periodoSeleccionado
        ? data.asignaturas.filter((asig) => String(asig.id_periodo || '') === periodoSeleccionado)
        : data.asignaturas)
    : []
  const totalAsignaturasPeriodo = asignaturasMostradas.length
  const totalEstudiantesPeriodo = asignaturasMostradas.reduce((acc, asig) => acc + asig.total_estudiantes, 0)
  const totalRasPeriodo = asignaturasMostradas.reduce((acc, asig) => acc + asig.total_ras, 0)
  const periodoActual = periodos.find((p) => String(p.id_periodo) === periodoSeleccionado)

  return (
    <div className="modal fade show d-block modal-overlay-backdrop" tabIndex={-1}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title d-flex align-items-center gap-2 mb-0">
              <img src="/LogoBlanco.png" alt="Logo Universidad del Valle" className="profile-modal-logo" />
              <span>Perfil del Docente</span>
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Cerrar"></button>
          </div>

          <div className="modal-body">
            {loading && (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="mt-3 text-muted">Cargando información del docente...</p>
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
                          <span className="badge bg-primary">{data.docente.codigo_docente}</span>
                        </div>
                        <div className="mb-2">
                          <strong className="text-muted me-2">Nombre Completo:</strong>
                          <span>{data.docente.nombre_completo}</span>
                        </div>
                        <div className="mb-2">
                          <strong className="text-muted me-2">Correo:</strong>
                          <span>{data.docente.correo}</span>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-2">
                          <strong className="text-muted me-2">Documento:</strong>
                          <span>{data.docente.tipo_documento} - {data.docente.num_documento}</span>
                        </div>
                        <div className="mb-2">
                          <strong className="text-muted me-2">Teléfono:</strong>
                          <span>{data.docente.num_telefono || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <div className="card shadow-sm border-primary h-100">
                      <div className="card-body text-center">
                        <i className="bi bi-journal-bookmark text-primary fs-2"></i>
                        <h4 className="mt-2 mb-0">{totalAsignaturasPeriodo}</h4>
                        <small className="text-muted">Asignaturas</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card shadow-sm border-success h-100">
                      <div className="card-body text-center">
                        <i className="bi bi-people text-success fs-2"></i>
                        <h4 className="mt-2 mb-0">{totalEstudiantesPeriodo}</h4>
                        <small className="text-muted">Estudiantes</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card shadow-sm border-info h-100">
                      <div className="card-body text-center">
                        <i className="bi bi-graph-up text-info fs-2"></i>
                        <h4 className="mt-2 mb-0">{totalRasPeriodo}</h4>
                        <small className="text-muted">RAs</small>
                      </div>
                    </div>
                  </div>
                </div>

                {periodos.length > 0 && (
                  <div className="mb-3">
                    <label className="form-label fw-bold">
                      <i className="bi bi-calendar3 me-2"></i>
                      Período Académico:
                    </label>
                    <select
                      className="form-select"
                      value={periodoSeleccionado}
                      onChange={(e) => setPeriodoSeleccionado(e.target.value)}
                      aria-label="Seleccionar período académico"
                    >
                      {periodos.map((periodo) => (
                        <option key={periodo.id_periodo} value={String(periodo.id_periodo)}>
                          {periodo.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="card shadow-sm">
                  <div className="card-header bg-light">
                    <h6 className="mb-0">
                      <i className="bi bi-book me-2"></i>
                      Asignaturas Asociadas{periodoActual ? ` - ${periodoActual.descripcion}` : ''}
                    </h6>
                  </div>
                  <div className="card-body p-0">
                    {asignaturasMostradas.length === 0 ? (
                      <div className="text-center text-muted py-4">
                        <i className="bi bi-inbox d-block mb-2"></i>
                        {periodoActual
                          ? `No hay información para el período ${periodoActual.descripcion}.`
                          : 'Este docente aún no tiene asignaturas asociadas.'}
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Código</th>
                              <th>Asignatura</th>
                              <th>Programa</th>
                              <th className="text-center">Estudiantes</th>
                              <th className="text-center">RAs</th>
                            </tr>
                          </thead>
                          <tbody>
                            {asignaturasMostradas.map((asig) => (
                              <tr key={asig.id_asignatura}>
                                <td><span className="badge bg-secondary">{asig.codigo_asignatura}</span></td>
                                <td>{asig.nombre}{asig.grupo ? ` (Grupo ${asig.grupo})` : ''}</td>
                                <td>{asig.programa || 'N/A'}</td>
                                <td className="text-center">{asig.total_estudiantes}</td>
                                <td className="text-center">{asig.total_ras}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

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

export default DocentePerfilModal
