import React, { useEffect, useState } from 'react'

type Props = { 
  text: string
  type?: 'ok' | 'error' | 'warning' | 'info'
  duration?: number
  onClose?: () => void
}

const Toast: React.FC<Props> = ({ text, type = 'ok', duration = 3000, onClose }) => {
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
    }, 400) // Duración de la animación de salida
  }

  if (!visible) return null

  const getIcon = () => {
    switch (type) {
      case 'ok':
        return 'bi-check-circle-fill'
      case 'error':
        return 'bi-exclamation-triangle-fill'
      case 'warning':
        return 'bi-exclamation-circle-fill'
      case 'info':
        return 'bi-info-circle-fill'
      default:
        return 'bi-check-circle-fill'
    }
  }

  return (
    <div 
      role="status" 
      aria-live="polite" 
      className={`mensaje mensaje-flex ${visible && !closing ? 'visible' : ''} ${type}`}
    >
      <i className={`bi ${getIcon()} mensaje-icon`} aria-hidden="true"></i>
      <span>{text}</span>
    </div>
  )
}

export default Toast
