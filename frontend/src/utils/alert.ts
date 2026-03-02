/**
 * Wrapper profesional para SweetAlert2
 * Sistema centralizado de notificaciones y confirmaciones sin emojis
 */
import Swal from 'sweetalert2'

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'question'

interface AlertOptions {
  title?: string
  text: string
  type?: AlertType
  confirmButtonText?: string
  timer?: number
  showConfirmButton?: boolean
}

interface ConfirmOptions {
  title?: string
  text: string
  confirmButtonText?: string
  cancelButtonText?: string
  type?: AlertType
}

/**
 * Muestra una alerta simple con auto-cierre
 */
export const showAlert = ({
  title,
  text,
  type = 'info',
  confirmButtonText = 'Aceptar',
  timer,
  showConfirmButton = true
}: AlertOptions) => {
  return Swal.fire({
    title,
    text,
    icon: type,
    confirmButtonText,
    timer,
    showConfirmButton: timer ? false : showConfirmButton,
    timerProgressBar: !!timer,
    customClass: {
      confirmButton: 'swal-btn-confirm',
      cancelButton: 'swal-btn-cancel'
    }
  })
}

/**
 * Muestra un toast (notificación pequeña en esquina)
 */
export const showToast = (text: string, type: AlertType = 'success', timer = 3000) => {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer)
      toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
  })

  return Toast.fire({
    icon: type,
    title: text
  })
}

/**
 * Muestra un diálogo de confirmación
 */
export const showConfirm = async ({
  title = 'Confirmar acción',
  text,
  confirmButtonText = 'Confirmar',
  cancelButtonText = 'Cancelar',
  type = 'question'
}: ConfirmOptions): Promise<boolean> => {
  const result = await Swal.fire({
    title,
    text,
    icon: type,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    customClass: {
      confirmButton: 'swal-btn-confirm',
      cancelButton: 'swal-btn-cancel'
    }
  })

  return result.isConfirmed
}

/**
 * Muestra un diálogo de confirmación con input de contraseña
 */
export const showPasswordConfirm = async (
  title: string = 'Confirmar con contraseña',
  text: string = 'Por seguridad, ingresa tu contraseña'
): Promise<{ confirmed: boolean; password?: string }> => {
  const result = await Swal.fire({
    title,
    text,
    input: 'password',
    inputPlaceholder: 'Contraseña',
    showCancelButton: true,
    confirmButtonText: 'Confirmar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    inputValidator: (value) => {
      if (!value) {
        return 'Debes ingresar tu contraseña'
      }
      return null
    },
    customClass: {
      confirmButton: 'swal-btn-confirm',
      cancelButton: 'swal-btn-cancel'
    }
  })

  return {
    confirmed: result.isConfirmed,
    password: result.value
  }
}

/**
 * Muestra loading durante operación asíncrona
 */
export const showLoading = (title: string = 'Procesando...', text?: string) => {
  Swal.fire({
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading()
    }
  })
}

/**
 * Cierra el loading/alerta actual
 */
export const closeAlert = () => {
  Swal.close()
}

/**
 * Shortcuts para tipos comunes
 */
export const Alert = {
  success: (text: string, title?: string) => showAlert({ text, title, type: 'success', timer: 3000 }),
  error: (text: string, title?: string) => showAlert({ text, title, type: 'error' }),
  warning: (text: string, title?: string) => showAlert({ text, title, type: 'warning' }),
  info: (text: string, title?: string) => showAlert({ text, title, type: 'info' }),
  
  toast: {
    success: (text: string) => showToast(text, 'success'),
    error: (text: string) => showToast(text, 'error'),
    warning: (text: string) => showToast(text, 'warning'),
    info: (text: string) => showToast(text, 'info'),
  },
  
  confirm: showConfirm,
  confirmPassword: showPasswordConfirm,
  loading: showLoading,
  close: closeAlert
}

export default Alert
