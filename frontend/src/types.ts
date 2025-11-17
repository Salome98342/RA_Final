export type Course = { id: string; nombre: string; carrera: string; codigo?: string }
export type RA = { id: string; titulo: string; info?: string; porcentajeRA?: number }
export type Indicator = { id: string; descripcion: string; porcentaje: number }
export type Activity = {
  id: string
  nombre: string
  porcentajeRA?: number
  raActividadId?: string
  descripcion?: string | null
  nota?: number | null
  retroalimentacion?: string | null
  indicadorId?: string | null
  tipoActividadId?: string
  tipoActividad?: string
  fechaCierre?: string | null
  indicadores?: { id: string; descripcion: string; porcentaje: number }[]
}
export type Grade = { estudiante: string; actividad: string; nota: number | null }

// Consolidado de calificaciones por curso
export type GradeSummaryActivity = {
  id_ra_actividad: number | string
  id_actividad: number | string
  nombre: string | null
  porcentaje_ra_actividad: number
  nota: number | null
}
export type GradeSummaryRA = {
  id_ra: number | string
  descripcion: string
  porcentaje_ra: number
  strict: number | null
  progressive: number | null
  coverage: number
  actividades: GradeSummaryActivity[]
}
export type GradeSummaryTotal = { strict: number; progressive: number; coverage: number }
export type GradeSummaryResponse = {
  asignatura: { codigo: string; nombre: string }
  matricula_id: number | string
  total: GradeSummaryTotal
  ras: GradeSummaryRA[]
}

export type Student = { id: string; name: string; matriculaId: string }
export type Periodo = { id: string; descripcion: string }

export type ProfileCourse = { codigo: string; nombre: string; grupo?: string | null; programa?: string | null }
export type ProfilePeriodo = { periodo: { id: number; descripcion: string }; cursos: ProfileCourse[] }
export type ProfileDetails = {
  id: string
  rol: 'docente' | 'estudiante' | 'coordinador'
  nombre?: string
  apellido?: string
  code?: string
  correo: string
  documento?: { tipo: string | null; numero: string | null }
  telefono?: string | null
  jornada?: string | null
  zona_horaria: string
  cursos: ProfileCourse[]
  cursosPorPeriodo: ProfilePeriodo[]
  avatarUrl?: string | null
  // Extras
  programas?: { codigo?: string | null; nombre?: string | null }[]
  // Docente
  totalCursos?: number | null
  // Estudiante
  periodoActual?: { id: number; descripcion: string } | null
  totalCursosPeriodoActual?: number | null
}
