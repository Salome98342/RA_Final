// Centralized endpoint paths used by services
export const endpoints = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
    forgot: '/auth/password/forgot',
    reset: '/auth/password/reset',
    profile: '/auth/profile',
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
    periodos: (id: string) => `/asignaturas/${id}/periodos/`,
    recursos: (id: string) => `/asignaturas/${id}/recursos/`, // <- nuevo
  },
  ras: {
    indicadores: (id: string) => `/ras/${id}/indicadores/`,
    actividades: (id: string) => `/ras/${id}/actividades/`,
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
}

export type UserProfile = {
  id: string
  nombre: string
  rol: 'docente' | 'estudiante'
  code?: string
}
