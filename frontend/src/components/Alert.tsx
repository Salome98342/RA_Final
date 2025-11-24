import React, { useEffect, useState } from 'react'

type AlertType = 'success' | 'error' | 'warning' | 'info'

interface AlertProps {
  type: AlertType
  message: string
  duration?: number
  onClose?: () => void
  icon?: boolean
}

const Alert: React.FC<AlertProps> = ({ type, message, duration = 0, onClose, icon = true }) => {
  const [visible, setVisible] = useState(true)
  const [closing, setClosing] = useState(false)

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
    }, 300) // Duración de la animación de salida
  }

  if (!visible) return null

  const typeConfig = {
    success: {
      className: 'alert-success',
      icon: 'bi-check-circle-fill',
      ariaLabel: 'Operación exitosa'
    },
    error: {
      className: 'alert-danger',
      icon: 'bi-exclamation-triangle-fill',
      ariaLabel: 'Error'
    },
    warning: {
      className: 'alert-warning',
      icon: 'bi-exclamation-circle-fill',
      ariaLabel: 'Advertencia'
    },
    info: {
      className: 'alert-info',
      icon: 'bi-info-circle-fill',
      ariaLabel: 'Información'
    }
  }

  const config = typeConfig[type]

  return (
    <div
      className={`alert ${config.className} alert-dismissible fade ${closing ? 'fade-out' : 'show'} d-flex align-items-center shadow-sm`}
      role="alert"
      aria-live="polite"
      aria-label={config.ariaLabel}
    >
      {icon && (
        <i className={`bi ${config.icon} me-2 fs-5`} aria-hidden="true"></i>
      )}
      <div className="flex-grow-1">{message}</div>
      {onClose && (
        <button
          type="button"
          className="btn-close"
          onClick={handleClose}
          aria-label="Cerrar alerta"
        ></button>
      )}
    </div>
  )
}

export default Alert
