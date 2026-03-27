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
  confirmButtonText = type === 'error' ? 'OK' : 'Aceptar'
}: AlertOptions) => {
  return Swal.fire({
    title,
    text,
    icon: type,
    position: 'center',
    confirmButtonText,
    showConfirmButton: true,
    allowOutsideClick: false,
    allowEscapeKey: false,
    allowEnterKey: true,
    customClass: {
      confirmButton: 'swal-btn-confirm',
      cancelButton: 'swal-btn-cancel'
    }
  })
}

/**
 * Muestra una notificación centrada con confirmación explícita
 */
export const showToast = (text: string, type: AlertType = 'success') => {
  return showAlert({
    text,
    type,
    confirmButtonText: type === 'error' ? 'OK' : 'Aceptar',
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
    position: 'center',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    allowOutsideClick: false,
    allowEscapeKey: false,
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
    position: 'center',
    input: 'password',
    inputPlaceholder: 'Contraseña',
    showCancelButton: true,
    confirmButtonText: 'Confirmar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    allowOutsideClick: false,
    allowEscapeKey: false,
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
    position: 'center',
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
  success: (text: string, title?: string) => showAlert({ text, title, type: 'success', confirmButtonText: 'Aceptar' }),
  error: (text: string, title?: string) => showAlert({ text, title, type: 'error' }),
  warning: (text: string, title?: string) => showAlert({ text, title, type: 'warning', confirmButtonText: 'Aceptar' }),
  info: (text: string, title?: string) => showAlert({ text, title, type: 'info', confirmButtonText: 'Aceptar' }),
  
  toast: {
    success: (text: string) => showToast(text, 'success'),
    error: (text: string) => showToast(text, 'error'),
    warning: (text: string) => showToast(text, 'warning'),
    info: (text: string) => showToast(text, 'info'),
  },

  confirmCreate: (entity: string = 'registro') =>
    showConfirm({
      title: `¿Crear ${entity}?`,
      text: 'Confirma para continuar con la creación.',
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      type: 'question',
    }),

  confirmDelete: (entity: string = 'registro') =>
    showConfirm({
      title: `¿Eliminar ${entity}?`,
      text: 'Esta acción no se puede deshacer.',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      type: 'warning',
    }),
  
  confirm: showConfirm,
  confirmPassword: showPasswordConfirm,
  loading: showLoading,
  close: closeAlert
}

export default Alert
