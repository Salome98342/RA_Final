import React, { useEffect, useState } from 'react'

type Props = { 
  text: string
  type?: 'ok' | 'error' | 'warning' | 'info'
  duration?: number
  onClose?: () => void
}

const Toast: React.FC<Props> = ({ text, type = 'ok', duration = 3500, onClose }) => {
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)

  // Pequeño delay para activar la animación de entrada
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
    }, 500)
  }

  if (!visible && closing) return null

  const toastConfig = {
    ok: {
      icon: 'bi-check-circle-fill',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      shadow: '0 8px 32px rgba(16, 185, 129, 0.35)',
      borderColor: '#10b981'
    },
    error: {
      icon: 'bi-x-circle-fill',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      shadow: '0 8px 32px rgba(239, 68, 68, 0.35)',
      borderColor: '#ef4444'
    },
    warning: {
      icon: 'bi-exclamation-triangle-fill',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      shadow: '0 8px 32px rgba(245, 158, 11, 0.35)',
      borderColor: '#f59e0b'
    },
    info: {
      icon: 'bi-info-circle-fill',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      shadow: '0 8px 32px rgba(59, 130, 246, 0.35)',
      borderColor: '#3b82f6'
    }
  }

  const config = toastConfig[type]

  return (
    <div 
      role="status" 
      aria-live="polite" 
      className={`toast-notification ${visible && !closing ? 'toast-visible' : ''} ${closing ? 'toast-closing' : ''}`}
      style={{
        background: config.gradient,
        boxShadow: config.shadow,
        borderLeft: `4px solid ${config.borderColor}`
      }}
    >
      <div className="toast-content">
        <div className="toast-icon-wrapper">
          <i className={`bi ${config.icon} toast-icon`} aria-hidden="true"></i>
        </div>
        <span className="toast-text">{text}</span>
        <button 
          className="toast-close-btn"
          onClick={handleClose}
          aria-label="Cerrar notificación"
          type="button"
        >
          <i className="bi bi-x-lg"></i>
        </button>
      </div>
    </div>
  )
}

export default Toast
