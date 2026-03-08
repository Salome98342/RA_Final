import React, { useState } from 'react'

interface Props {
  curso: string
  estudiantes: Array<{ codigo: string; nombre: string; apellido: string }>
  loading: boolean
}

const EstudiantesMatriculadosCard: React.FC<Props> = ({ estudiantes, loading }) => {
  const [collapsed, setCollapsed] = useState(true)

  if (loading) {
    return (
      <div className="ra-card shadow-sm border-0 mb-3">
        <div className="ra-card-body">
          <div className="d-flex align-items-center">
            <span className="spinner-border spinner-border-sm me-2"></span>
            Cargando estudiantes...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ra-card shadow-sm border-0 mb-3">
      <div className="ra-card-body">
        <div 
          className="fw-bold mb-2 d-flex align-items-center justify-content-between"
          style={{ cursor: 'pointer' }}
          onClick={() => setCollapsed(!collapsed)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setCollapsed(!collapsed) }}
        >
          <div className="d-flex align-items-center">
            <i className="bi bi-people-fill text-info me-2 fs-5"></i>
            Estudiantes matriculados ({estudiantes.length})
          </div>
          <i className={`bi ${collapsed ? 'bi-chevron-down' : 'bi-chevron-up'}`}></i>
        </div>

        {!collapsed && (
          <div className="mt-3">
            {estudiantes.length === 0 ? (
              <div className="alert alert-info d-flex align-items-center mb-0">
                <i className="bi bi-info-circle me-2"></i>
                No hay estudiantes matriculados aún. Usa el importador CSV para agregar estudiantes.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nombre</th>
                      <th>Apellido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantes.map((est) => (
                      <tr key={est.codigo}>
                        <td><code>{est.codigo}</code></td>
                        <td>{est.nombre}</td>
                        <td>{est.apellido}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default EstudiantesMatriculadosCard
