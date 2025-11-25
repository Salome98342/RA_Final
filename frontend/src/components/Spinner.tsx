import React from 'react'

type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'
  fullscreen?: boolean
  text?: string
}

/**
 * Spinner de carga reutilizable
 * - size: tamaño del spinner (sm, md, lg)
 * - variant: color de Bootstrap
 * - fullscreen: si true, ocupa toda la pantalla con overlay
 * - text: texto opcional debajo del spinner
 */
const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'md', 
  variant = 'danger', 
  fullscreen = false,
  text 
}) => {
  // Tamaños del spinner
  const sizeClasses = {
    sm: 'spinner-sm',
    md: 'spinner-md',
    lg: 'spinner-lg'
  }

  const spinnerContent = (
    <div className="spinner-container">
      <div 
        className={`spinner-border text-${variant} ${sizeClasses[size]}`} 
        role="status"
        aria-label="Cargando"
      >
        <span className="visually-hidden">Cargando...</span>
      </div>
      {text && <div className="spinner-text mt-3">{text}</div>}
    </div>
  )

  if (fullscreen) {
    return (
      <div className="spinner-overlay">
        {spinnerContent}
      </div>
    )
  }

  return spinnerContent
}

export default Spinner
