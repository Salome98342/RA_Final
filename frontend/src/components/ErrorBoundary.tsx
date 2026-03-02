import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * ErrorBoundary: Componente que captura errores de rendering en React
 * 
 * Evita que un error en un componente hijo cause una pantalla blanca total.
 * En su lugar, muestra una interfaz de error amigable al usuario.
 * 
 * Uso:
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Actualizar estado para mostrar UI de error en el siguiente render
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Registrar error para debugging
    console.error('❌ Error capturado por ErrorBoundary:', error)
    console.error('📍 Stack de componentes:', errorInfo.componentStack)

    // Actualizar estado con información detallada
    this.setState({
      error,
      errorInfo,
    })

    // Aquí podrías enviar el error a un servicio de logging (Sentry, LogRocket, etc.)
    // logErrorToService(error, errorInfo)
  }

  handleReset = () => {
    // Resetear estado y recargar la página
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
    window.location.href = '/'
  }

  handleReload = () => {
    // Recargar la página actual
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8f9fa',
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '600px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            padding: '40px',
            textAlign: 'center'
          }}>
            {/* Ícono de error */}
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 24px',
              backgroundColor: '#fee',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="bi bi-exclamation-triangle" style={{
                fontSize: '40px',
                color: '#dc3545'
              }}></i>
            </div>

            {/* Título */}
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#212529',
              marginBottom: '16px'
            }}>
              ¡Algo salió mal!
            </h1>

            {/* Descripción */}
            <p style={{
              fontSize: '16px',
              color: '#6c757d',
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              Ha ocurrido un error inesperado en la aplicación.
              No te preocupes, tus datos están seguros.
            </p>

            {/* Detalles del error (solo en desarrollo) */}
            {import.meta.env.DEV && this.state.error && (
              <details style={{
                marginBottom: '24px',
                textAlign: 'left',
                backgroundColor: '#f8f9fa',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <summary style={{
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  color: '#495057',
                  marginBottom: '8px'
                }}>
                  Ver detalles técnicos
                </summary>
                <div style={{
                  fontSize: '14px',
                  color: '#dc3545',
                  fontFamily: 'monospace',
                  marginTop: '12px'
                }}>
                  <strong>Error:</strong>
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    marginTop: '8px',
                    backgroundColor: 'white',
                    padding: '12px',
                    borderRadius: '4px',
                    border: '1px solid #dee2e6'
                  }}>
                    {this.state.error.toString()}
                  </pre>
                </div>
                {this.state.errorInfo && (
                  <div style={{
                    fontSize: '12px',
                    color: '#6c757d',
                    fontFamily: 'monospace',
                    marginTop: '12px'
                  }}>
                    <strong>Stack:</strong>
                    <pre style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      marginTop: '8px',
                      backgroundColor: 'white',
                      padding: '12px',
                      borderRadius: '4px',
                      border: '1px solid #dee2e6',
                      maxHeight: '200px',
                      overflow: 'auto'
                    }}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </details>
            )}

            {/* Botones de acción */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={this.handleReload}
                className="btn btn-primary"
                style={{
                  padding: '12px 24px',
                  fontSize: '16px'
                }}
              >
                <i className="bi bi-arrow-clockwise me-2"></i>
                Recargar Página
              </button>
              <button
                onClick={this.handleReset}
                className="btn btn-outline-secondary"
                style={{
                  padding: '12px 24px',
                  fontSize: '16px'
                }}
              >
                <i className="bi bi-house-door me-2"></i>
                Ir al Inicio
              </button>
            </div>

            {/* Mensaje adicional */}
            <p style={{
              fontSize: '14px',
              color: '#6c757d',
              marginTop: '24px',
              lineHeight: '1.5'
            }}>
              Si el problema persiste, por favor contacta al administrador del sistema.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
