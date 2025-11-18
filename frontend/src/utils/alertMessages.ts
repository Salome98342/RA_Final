// Mensajes estandarizados y mejorados para alertas en toda la aplicación

export const ALERT_MESSAGES = {
  // Autenticación
  auth: {
    loginSuccess: '¡Bienvenido! Has iniciado sesión correctamente',
    loginError: 'Usuario o contraseña incorrectos. Por favor, verifica tus credenciales',
    logoutSuccess: 'Sesión cerrada correctamente. ¡Hasta pronto!',
    sessionExpired: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente',
    unauthorized: 'No tienes permisos para realizar esta acción',
    passwordResetSent: 'Se ha enviado un correo con instrucciones para restablecer tu contraseña',
    passwordResetSuccess: 'Tu contraseña ha sido actualizada correctamente',
    passwordResetError: 'No se pudo restablecer la contraseña. Verifica el enlace o solicita uno nuevo',
    passwordUpdateSuccess: 'Contraseña actualizada correctamente',
    passwordUpdateError: 'Error al actualizar la contraseña. Verifica que la contraseña actual sea correcta',
  },

  // Perfil
  profile: {
    loadError: 'No se pudo cargar la información del perfil',
    avatarUpdateSuccess: 'Avatar actualizado correctamente',
    avatarUpdateError: 'Error al subir el avatar. Formato permitido: PNG/JPG (máximo 2 MB)',
    avatarSizeError: 'El archivo es demasiado grande. Tamaño máximo: 2 MB',
    avatarFormatError: 'Formato no válido. Solo se permiten imágenes PNG o JPG',
  },

  // Cursos
  courses: {
    loadError: 'No se pudieron cargar los cursos. Intenta nuevamente',
    empty: 'No tienes cursos asignados en este momento',
    selectOne: 'Selecciona un curso para ver más detalles',
  },

  // Actividades
  activities: {
    createSuccess: '¡Actividad creada exitosamente!',
    createError: 'Error al crear la actividad. Verifica todos los campos',
    updateSuccess: 'Actividad actualizada correctamente',
    updateError: 'No se pudo actualizar la actividad. Intenta nuevamente',
    deleteSuccess: 'Actividad eliminada correctamente',
    deleteError: 'Error al eliminar la actividad',
    deleteConfirm: '¿Estás seguro de eliminar esta actividad? Esta acción no se puede deshacer',
    missingFields: 'Por favor, completa todos los campos obligatorios',
    invalidPercentage: 'El porcentaje debe estar entre 0 y 100',
    percentageExceeded: 'La suma de porcentajes no puede exceder el 100% del RA',
    nameRequired: 'El nombre de la actividad es obligatorio',
    typeRequired: 'Debes seleccionar un tipo de actividad',
    dateRequired: 'La fecha de cierre es obligatoria',
    dateInvalid: 'La fecha de cierre debe ser futura',
  },

  // Calificaciones
  grades: {
    saveSuccess: 'Calificaciones guardadas correctamente',
    saveError: 'Error al guardar las calificaciones. Intenta nuevamente',
    invalidGrade: 'La calificación debe estar entre 0 y 5',
    missingGrade: 'Por favor, ingresa una calificación válida',
    loadError: 'No se pudieron cargar las calificaciones',
  },

  // Resultados de Aprendizaje (RAs)
  ras: {
    loadError: 'No se pudieron cargar los Resultados de Aprendizaje',
    empty: 'No hay Resultados de Aprendizaje definidos para este curso',
    percentageWarning: 'El porcentaje asignado a las actividades debe sumar 100%',
    percentageComplete: 'El RA tiene el 100% de su peso distribuido correctamente',
    percentageIncomplete: 'Falta distribuir el {{percentage}}% del peso del RA',
  },

  // Indicadores
  indicators: {
    loadError: 'No se pudieron cargar los indicadores',
    empty: 'No hay indicadores definidos para este RA',
    selectAtLeastOne: 'Debes seleccionar al menos un indicador para la actividad',
  },

  // Estudiantes
  students: {
    loadError: 'No se pudieron cargar los estudiantes',
    empty: 'No hay estudiantes matriculados en este curso',
    reloadSuccess: 'Lista de estudiantes actualizada correctamente',
    reloadError: 'Error al recargar la lista de estudiantes',
  },

  // Recursos
  resources: {
    uploadSuccess: 'Recurso subido correctamente',
    uploadError: 'Error al subir el recurso. Intenta nuevamente',
    deleteSuccess: 'Recurso eliminado correctamente',
    deleteError: 'Error al eliminar el recurso',
    downloadError: 'Error al descargar el recurso',
    empty: 'No hay recursos disponibles para este curso',
    fileRequired: 'Debes seleccionar un archivo para subir',
    titleRequired: 'El título del recurso es obligatorio',
    fileSizeError: 'El archivo es demasiado grande. Tamaño máximo: 10 MB',
  },

  // Importaciones (Coordinador)
  imports: {
    success: 'Importación completada exitosamente',
    partialSuccess: 'Importación completada con algunos errores. Revisa el resumen',
    error: 'Error al procesar el archivo. Verifica el formato',
    fileRequired: 'Debes seleccionar un archivo CSV',
    fileFormatError: 'Formato de archivo no válido. Solo se permiten archivos CSV',
    emptyFile: 'El archivo está vacío o no contiene datos válidos',
  },

  // Asignaturas (Coordinador)
  subjects: {
    loadError: 'No se pudieron cargar las asignaturas',
    empty: 'No hay asignaturas disponibles en este período',
    selectPeriod: 'Selecciona un período académico',
  },

  // Errores generales
  general: {
    networkError: 'Error de conexión. Verifica tu conexión a internet',
    serverError: 'Error del servidor. Intenta nuevamente más tarde',
    unknownError: 'Ocurrió un error inesperado. Por favor, intenta nuevamente',
    timeout: 'La solicitud ha tardado demasiado. Intenta nuevamente',
    formValidation: 'Por favor, corrige los errores en el formulario',
    requiredFields: 'Todos los campos marcados con * son obligatorios',
  },

  // Confirmaciones
  confirm: {
    unsavedChanges: 'Tienes cambios sin guardar. ¿Deseas continuar sin guardar?',
    deleteGeneric: '¿Estás seguro de eliminar este elemento?',
    logout: '¿Estás seguro de cerrar sesión?',
  },

  // Carga
  loading: {
    data: 'Cargando datos...',
    saving: 'Guardando cambios...',
    uploading: 'Subiendo archivo...',
    processing: 'Procesando información...',
  },
}

// Función helper para reemplazar variables en mensajes
export function formatMessage(message: string, variables: Record<string, string | number>): string {
  let formatted = message
  Object.entries(variables).forEach(([key, value]) => {
    formatted = formatted.replace(`{{${key}}}`, String(value))
  })
  return formatted
}

// Función para obtener mensaje de error de API
export function getApiErrorMessage(error: any): string {
  if (error.response?.data?.message) {
    return error.response.data.message
  }
  if (error.response?.data?.error) {
    return error.response.data.error
  }
  if (error.message) {
    return error.message
  }
  if (error.response?.status === 401) {
    return ALERT_MESSAGES.auth.unauthorized
  }
  if (error.response?.status === 403) {
    return ALERT_MESSAGES.auth.unauthorized
  }
  if (error.response?.status === 404) {
    return 'No se encontró el recurso solicitado'
  }
  if (error.response?.status >= 500) {
    return ALERT_MESSAGES.general.serverError
  }
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return ALERT_MESSAGES.general.timeout
  }
  if (!error.response) {
    return ALERT_MESSAGES.general.networkError
  }
  return ALERT_MESSAGES.general.unknownError
}
