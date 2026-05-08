import React from 'react'

interface ProgressModalProps {
  show: boolean
  progress: number // 0-100
  title?: string
  message?: string
  status?: 'loading' | 'success' | 'error'
}

const ProgressModal: React.FC<ProgressModalProps> = ({
  show,
  progress,
  title = 'Procesando...',
  message,
  status = 'loading'
}) => {
  if (!show) return null

  const getIcon = () => {
    if (status === 'success') return <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
    if (status === 'error') return <i className="bi bi-x-circle-fill text-danger" style={{ fontSize: '3rem' }}></i>
    return null
  }

  const getTitle = () => {
    if (status === 'success') return '✓ Carga Exitosa'
    if (status === 'error') return '✗ Carga Fallida'
    return title
  }

  return (
    <div className={`modal fade ${show ? 'show d-block' : ''}`} tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-body text-center p-4">
            <div className="mb-3">
              {getIcon()}
            </div>
            <h5 className="mb-3">{getTitle()}</h5>
            {message && <p className="text-muted mb-3">{message}</p>}
            
            {status === 'loading' && (
              <div className="progress" style={{ height: '25px' }}>
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated"
                  role="progressbar"
                  style={{ width: `${progress}%` }}
                  aria-label="Progreso de carga"
                  aria-valuenow={Math.round(progress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  {Math.round(progress)}%
                </div>
              </div>
            )}
            
            {status === 'success' && (
              <div className="alert alert-success mb-0">
                <i className="bi bi-info-circle me-2"></i>
                Los datos se han importado correctamente
              </div>
            )}
            
            {status === 'error' && (
              <div className="alert alert-danger mb-0">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Ocurrió un error durante la importación
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProgressModal
