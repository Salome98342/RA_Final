export type Course = { id: string; nombre: string; carrera: string; codigo?: string }
export type RA = { id: string; titulo: string; info?: string; porcentajeRA?: number }
export type Indicator = { id: string; descripcion: string; porcentaje: number }
export type Activity = {
  id: string  // id_actividad (mismo para todas las relaciones multi-RA)
  nombre: string
  porcentajeRA?: number
  raActividadId?: string  // id único de la relación RA-Actividad
  descripcion?: string | null
  nota?: number | null
  retroalimentacion?: string | null
  indicadorId?: string | null
  tipoActividadId?: string
  tipoActividad?: string
  fechaCierre?: string | null
  indicadores?: { id: string; descripcion: string; porcentaje: number }[]
  // 🆕 Notas por indicador (múltiples notas posibles)
  notasPorIndicador?: Array<{
    nota: number | null
    retroalimentacion: string | null
    id_ind: string | null
  }>
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

// Detalle completo de asignatura para analítica
export type CourseDetailResponse = {
  asignatura: {
    codigo: string
    nombre: string
    grupo: string | null
    creditos: number | null
    programa: {
      codigo: string | null
      nombre: string | null
    }
    periodo: {
      id: number | null
      descripcion: string | null
    }
  }
  docente: {
    codigo: string
    nombre: string
    correo: string
  } | null
  estudiantes_matriculados: number
  mi_estadistica: {
    nota_strict: number
    nota_progressive: number
    coverage: number
    actividades_totales: number
    actividades_calificadas: number
  }
  estadistica_curso: {
    promedio: number
    nota_max: number
    nota_min: number
    estudiantes_aprobados: number
    estudiantes_reprobados: number
  }
  resultados_aprendizaje: Array<{
    id_ra: number
    descripcion: string
    porcentaje_ra: number
    actividades_total: number
    actividades_calificadas: number
    coverage: number
    nota: number | null
  }>
}

// Análisis general de asignatura para coordinador
export type CourseAnalyticsResponse = {
  asignatura: {
    codigo: string
    nombre: string
    grupo: string | null
    creditos: number | null
    programa: {
      codigo: string | null
      nombre: string | null
    }
    periodo: {
      id: number | null
      descripcion: string | null
    }
  }
  docente: {
    codigo: string
    nombre: string
    correo: string
  } | null
  estudiantes_matriculados: number
  estadistica_curso: {
    promedio: number
    nota_max: number
    nota_min: number
    estudiantes_aprobados: number
    estudiantes_reprobados: number
    desviacion_estandar: number
  }
  resultados_aprendizaje: Array<{
    id_ra: number
    descripcion: string
    porcentaje_ra: number
    actividades_total: number
    promedio: number
    coverage_promedio: number
  }>
  estudiantes: Array<{
    id: string
    nombre: string
    correo: string
    nota: number
    coverage: number
    actividades_calificadas: number
    actividades_totales: number
  }>
}

export type Student = { id: string; name: string; matriculaId: string }
export type Periodo = { id: string; descripcion: string }

// Actividad agrupada (sin duplicación por RA)
export type GroupedActivityRA = {
  id_ra: number | string
  id_ra_actividad: number | string
  titulo_ra: string
  porcentaje_ra: number
  porcentaje_actividad: number
  indicadores: Array<{ id_ind: number | string; descripcion: string; porcentaje_ind: number }>
}
export type GroupedActivity = {
  id_actividad: number | string
  nombre_actividad: string
  descripcion: string | null
  fecha_creacion: string
  fecha_cierre: string | null
  tipo_actividad: string
  porcentaje_total: number
  nota: number | null
  retroalimentacion: string | null
  ras_asociados: GroupedActivityRA[]
}

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
