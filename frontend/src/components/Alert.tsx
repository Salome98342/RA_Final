import React, { useEffect, useState } from 'react'

type AlertType = 'success' | 'error' | 'warning' | 'info'

interface AlertProps {
  type: AlertType
  message: string
  duration?: number
  onClose?: () => void
  icon?: boolean
  dismissible?: boolean
}

const Alert: React.FC<AlertProps> = ({ 
  type, 
  message, 
  duration = 0, 
  onClose, 
  icon = true,
  dismissible = true 
}) => {
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)

  // Animación de entrada suave
  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(showTimer)
  }, [])

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration])

  const handleClose = () => {
    setClosing(true)
    setTimeout(() => {
      setVisible(false)
      onClose?.()
    }, 400)
  }

  if (!visible && closing) return null

  const typeConfig = {
    success: {
      className: 'alert-success-modern',
      icon: 'bi-check-circle-fill',
      ariaLabel: 'Operación exitosa'
    },
    error: {
      className: 'alert-danger-modern',
      icon: 'bi-x-circle-fill',
      ariaLabel: 'Error'
    },
    warning: {
      className: 'alert-warning-modern',
      icon: 'bi-exclamation-triangle-fill',
      ariaLabel: 'Advertencia'
    },
    info: {
      className: 'alert-info-modern',
      icon: 'bi-info-circle-fill',
      ariaLabel: 'Información'
    }
  }

  const config = typeConfig[type]

  return (
    <div
      className={`alert-modern ${config.className} ${visible && !closing ? 'alert-visible' : ''} ${closing ? 'alert-closing' : ''}`}
      role="alert"
      aria-live="polite"
      aria-label={config.ariaLabel}
    >
      {icon && (
        <div className="alert-icon-wrapper">
          <i className={`bi ${config.icon} alert-icon`} aria-hidden="true"></i>
        </div>
      )}
      <div className="alert-message">{message}</div>
      {(dismissible || onClose) && (
        <button
          type="button"
          className="alert-close-btn"
          onClick={handleClose}
          aria-label="Cerrar alerta"
        >
          <i className="bi bi-x-lg"></i>
        </button>
      )}
    </div>
  )
}

export default Alert
