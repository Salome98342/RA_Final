// Centralized endpoint paths used by services
export const endpoints = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
    forgot: '/auth/password/forgot',
    verifyOtp: '/auth/password/verify-otp',
    reset: '/auth/password/reset',
    profile: '/auth/profile',
    change: '/auth/password/change',
    avatar: '/auth/profile/avatar',
  },
  catalogos: {
    tiposActividad: '/tipos-actividad/',
  },
  asignaturas: {
    list: '/asignaturas/',
    ras: (id: string) => `/asignaturas/${id}/ras/`,
    estudiantes: (id: string) => `/asignaturas/${id}/estudiantes/`,
    miMatricula: (id: string) => `/asignaturas/${id}/mi-matricula/`,
    indicadoresEstudiante: (codigo: string, estudianteId: string | number) => `/asignaturas/${codigo}/estudiante/${estudianteId}/indicadores`,
    // Consolidado de calificaciones (summary) por asignatura y estudiante
    calificaciones: (codigo: string, estudianteId: string | number) => `/asignaturas/${codigo}/calificaciones/${estudianteId}/`,
    periodos: (id: string) => `/asignaturas/${id}/periodos/`,
    recursos: (id: string) => `/asignaturas/${id}/recursos/`, // <- nuevo
    anuncios: (id: string) => `/asignaturas/${id}/anuncios/`,
  },
  ras: {
    indicadores: (id: string) => `/ras/${id}/indicadores/`,
    actividades: (id: string) => `/ras/${id}/actividades/`,
    actividad: (raId: string, relId: string) => `/ras/${raId}/actividades/${relId}/`,
    indicador: (raId: string, indId: string) => `/ras/${raId}/indicadores/${indId}/`,
  },
  actividades: {
    multi: '/actividades/multi',
  },
  validacion: {
    ra: (id: string) => `/validacion/ra/${id}`,
    asignatura: (codigo: string) => `/validacion/asignatura/${codigo}`,
  },
  notas: '/notas',
  notificaciones: '/notificaciones',
  anuncios: {
    delete: (id: string | number) => `/anuncios/${id}/`,
  },
  coordinador: {
    estudiantes: '/coordinador/estudiantes',  // GET: listar, POST: crear individual
    asignaturas: '/coordinador/asignaturas',
    asignaturaEstudiantes: '/coordinador/asignaturas/estudiantes',
    asignaturaRAs: '/coordinador/asignaturas/ras',
    asignaturaAvance: '/coordinador/asignaturas/avance',
    importEstudiantes: '/coordinador/import/estudiantes',
    importMatriculados: '/coordinador/import/matriculados',
    importDocentes: '/coordinador/import/docentes',
    importAsignaturasRAs: '/coordinador/import/asignaturas-ras',
  },
  tiposDocumento: '/tipos-documento/',
}

export type UserProfile = {
  id: string
  nombre: string
  rol: 'docente' | 'estudiante' | 'coordinador'
  code?: string
}
