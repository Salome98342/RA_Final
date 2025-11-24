import { useState, useCallback } from 'react'

export type AlertType = 'success' | 'error' | 'warning' | 'info'

export interface AlertState {
  show: boolean
  message: string
  type: AlertType
}

export interface UseAlertReturn {
  alert: AlertState
  showAlert: (message: string, type?: AlertType, duration?: number) => void
  hideAlert: () => void
  showSuccess: (message: string, duration?: number) => void
  showError: (message: string, duration?: number) => void
  showWarning: (message: string, duration?: number) => void
  showInfo: (message: string, duration?: number) => void
}

/**
 * Hook personalizado para gestionar alertas en componentes
 * @param defaultDuration Duración por defecto de las alertas en milisegundos (0 = permanente)
 * @returns Objeto con estado de alerta y funciones de control
 */
export function useAlert(defaultDuration: number = 4000): UseAlertReturn {
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    message: '',
    type: 'info',
  })

  const hideAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, show: false }))
  }, [])

  const showAlert = useCallback(
    (message: string, type: AlertType = 'info', duration: number = defaultDuration) => {
      setAlert({
        show: true,
        message,
        type,
      })

      if (duration > 0) {
        setTimeout(() => {
          hideAlert()
        }, duration)
      }
    },
    [defaultDuration, hideAlert]
  )

  const showSuccess = useCallback(
    (message: string, duration?: number) => {
      showAlert(message, 'success', duration)
    },
    [showAlert]
  )

  const showError = useCallback(
    (message: string, duration?: number) => {
      showAlert(message, 'error', duration)
    },
    [showAlert]
  )

  const showWarning = useCallback(
    (message: string, duration?: number) => {
      showAlert(message, 'warning', duration)
    },
    [showAlert]
  )

  const showInfo = useCallback(
    (message: string, duration?: number) => {
      showAlert(message, 'info', duration)
    },
    [showAlert]
  )

  return {
    alert,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }
}
