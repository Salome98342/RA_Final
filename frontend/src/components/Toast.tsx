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
      gradient: 'linear-gradient(135deg, #199A75 0%, #0F6B50 100%)',
      shadow: '0 8px 32px rgba(25, 154, 117, 0.35)',
      borderColor: '#199A75'
    },
    error: {
      icon: 'bi-x-circle-fill',
      gradient: 'linear-gradient(135deg, #E73431 0%, #9A1915 100%)',
      shadow: '0 8px 32px rgba(154, 25, 21, 0.35)',
      borderColor: '#9A1915'
    },
    warning: {
      icon: 'bi-exclamation-triangle-fill',
      gradient: 'linear-gradient(135deg, #9A1915 0%, #460E0F 100%)',
      shadow: '0 8px 32px rgba(70, 14, 15, 0.35)',
      borderColor: '#9A1915'
    },
    info: {
      icon: 'bi-info-circle-fill',
      gradient: 'linear-gradient(135deg, #575756 0%, #1D1D1B 100%)',
      shadow: '0 8px 32px rgba(29, 29, 27, 0.35)',
      borderColor: '#575756'
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
