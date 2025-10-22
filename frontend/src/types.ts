export type Course = { id: string; nombre: string; carrera: string; codigo?: string }
export type RA = { id: string; titulo: string; info?: string; porcentajeRA?: number }
export type Indicator = { id: string; descripcion: string; porcentaje: number }
export type Activity = {
  id: string
  nombre: string
  porcentaje: number
  porcentajeRA?: number
  raActividadId?: string
  nota?: number | null
  retroalimentacion?: string | null
  indicadorId?: string | null
  tipoActividadId?: string
  tipoActividad?: string
  fechaCierre?: string | null
  indicadores?: { id: string; descripcion: string; porcentaje: number }[]
}
export type Grade = { estudiante: string; actividad: string; nota: number | null }

export type Student = { id: string; name: string; matriculaId: string }
export type Periodo = { id: string; descripcion: string }

export type PerfilCurso = { codigo: string; nombre: string; grupo?: string; programa?: string }
export type PerfilPeriodo = { periodo: { id: number; descripcion: string }, cursos: PerfilCurso[] }

export type ProfileDetails = {
  id: number
  rol: 'docente' | 'estudiante'
  nombre: string
  apellido: string
  code: string
  correo: string
  documento?: { tipo?: string | null; numero?: string | null }
  telefono?: string | null
  jornada?: string | null
  zona_horaria?: string
  cursos: PerfilCurso[]
  cursosPorPeriodo: PerfilPeriodo[]
}
