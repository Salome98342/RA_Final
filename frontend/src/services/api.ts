import type { Course, RA, Indicator, Activity, Student, Periodo } from '@/types'
// grade
import { endpoints } from '@/connections/endpoints'
import { api } from '@/connections/http'

// Tipos auxiliares
export type NotificationItem = {
  id: string
  kind?: 'grade' | 'resource' | 'deadline' | 'message' | string
  text: string
  date?: string
  read?: boolean
  link?: string
}

// Cursos
export async function getCourses(): Promise<Course[]> {
  const { data } = await api.get<unknown[]>(endpoints.asignaturas.list)
  const rows = Array.isArray(data) ? data : []
  return rows.map((it) => {
    const o = it as Record<string, unknown>
    const prog = (o.programa as Record<string, unknown> | undefined)
    return {
      id: String(o.codigo_asignatura ?? ''),
      nombre: String(o.nombre ?? ''),
      carrera: String((prog?.codigo_programa ?? prog?.nombre ?? o.programa ?? '') as string),
      codigo: String(o.codigo_asignatura ?? ''),
    }
  })
}

// RAs por curso
export async function getRAsByCourse(courseId: string): Promise<RA[]> {
  const { data } = await api.get<unknown[]>(endpoints.asignaturas.ras(courseId))
  const rows = Array.isArray(data) ? data : []
  return rows.map((it) => {
    const o = it as Record<string, unknown>
    const id = String((o.id_ra ?? o.id) as string | number | undefined ?? '')
    const titulo = (typeof o.titulo === 'string' && o.titulo) || (typeof o.descripcion === 'string' && o.descripcion) || `RA ${id}`
    const pct = o.porcentaje_ra
    return {
      id,
      titulo,
      info: typeof o.info === 'string' ? o.info : (typeof pct === 'number' ? `Peso: ${pct}%` : ''),
      porcentajeRA: typeof pct === 'number' ? pct : undefined,
    }
  })
}

// Estudiantes por curso (opcional: filtrar por periodo)
export async function getStudentsByCourse(courseId: string, opts?: { periodoId?: string, periodo?: string }): Promise<Student[]> {
  const { data } = await api.get<unknown[]>(endpoints.asignaturas.estudiantes(courseId), {
    params: opts?.periodoId ? { id_periodo: opts.periodoId } : (opts?.periodo ? { periodo: opts.periodo } : undefined),
  })
  const rows = Array.isArray(data) ? data : []
  return rows.map((s) => {
    const o = s as Record<string, unknown>
    const nombre = String(o.nombre ?? '')
    const apellido = String(o.apellido ?? '')
    return {
      id: String(o.id_estudiante ?? ''),
      name: `${nombre} ${apellido}`.trim(),
      matriculaId: String(o.id_matricula ?? ''),
    }
  })
}

// Indicadores por RA
export async function getIndicatorsByRA(raId: string): Promise<Indicator[]> {
  const { data } = await api.get<unknown[]>(endpoints.ras.indicadores(raId))
  const rows = Array.isArray(data) ? data : []
  return rows.map((it) => {
    const o = it as Record<string, unknown>
    return {
      id: String(o.id ?? ''),
      descripcion: String(o.descripcion ?? ''),
      porcentaje: Number((o.porcentaje_ind ?? o.porcentaje ?? 0) as number),
    }
  })
}

// Crear actividad
export async function createActivityForRA(raId: string, payload: {
  nombre_actividad: string
  id_tipo_actividad: number | string
  porcentaje_actividad: number
  porcentaje_ra_actividad: number
  descripcion?: string
  fecha_cierre?: string
  indicadores?: Array<number | string>
}): Promise<Activity> {
  const { data } = await api.post(endpoints.ras.actividades(raId), payload)
  return {
    id: String(data.id_actividad),
    nombre: data.nombre_actividad,
    porcentaje: Number(data.porcentaje_actividad),
    porcentajeRA: Number(data.porcentaje_ra_actividad),
    raActividadId: String(data.id_ra_actividad),
  }
}

// Crear una actividad y asociarla a múltiples RAs en un solo paso
export async function createActivityMulti(payload: {
  nombre_actividad: string
  id_tipo_actividad: number | string
  porcentaje_actividad: number
  descripcion?: string
  fecha_cierre?: string
  ras: Array<{ ra_id: number | string; porcentaje_ra_actividad: number; indicadores?: Array<number | string> }>
}): Promise<{ id: string; relaciones: Array<{ raId: string; raActividadId: string; porcentajeRA: number }> }> {
  const { data } = await api.post(endpoints.actividades.multi, payload)
  return {
    id: String(data.id_actividad),
    relaciones: Array.isArray(data.relaciones)
      ? data.relaciones.map((r: unknown) => {
          const o = r as Record<string, unknown>
          return {
            raId: String(o.id_ra ?? ''),
            raActividadId: String(o.id_ra_actividad ?? ''),
            porcentajeRA: Number((o.porcentaje_ra_actividad ?? 0) as number),
          }
        })
      : [],
  }
}

// Upsert nota
export async function upsertGrade(input: {
  matriculaId: string
  raActividadId: string
  nota: number
  retroalimentacion?: string
  indicadorId?: string
}) {
  const { data } = await api.post(endpoints.notas, {
    id_matricula: input.matriculaId,
    id_ra_actividad: input.raActividadId,
    nota: input.nota,
    retroalimentacion: input.retroalimentacion,
    id_ind: input.indicadorId,
  })
  return data
}

// Gráfico indicadores estudiante en curso
export async function getIndicatorChart(courseId: string, studentId: string) {
  const { data } = await api.get<unknown[]>(endpoints.asignaturas.indicadoresEstudiante(courseId, studentId))
  return (Array.isArray(data) ? data : []) as { id_ind: number; ra_id: number; descripcion: string; porcentaje_ind: number; avg_nota: number | null; avg_pct: number | null }[]
}

// Mi matrícula
export async function getMyMatricula(courseId: string): Promise<string | null> {
  const { data } = await api.get<{ id_matricula: number | null }>(endpoints.asignaturas.miMatricula(courseId))
  return data?.id_matricula ? String(data.id_matricula) : null
}

// Catálogo tipos de actividad
export async function getTiposActividad(): Promise<{ id: string; descripcion: string }[]> {
  const { data } = await api.get<unknown[]>(endpoints.catalogos.tiposActividad)
  const rows = Array.isArray(data) ? data : []
  return rows.map((t) => {
    const o = t as Record<string, unknown>
    return { id: String(o.id_tipo_actividad ?? o.id ?? ''), descripcion: String(o.descripcion ?? '') }
  })
}

// Periodos por curso
export async function getPeriodosByCourse(courseId: string): Promise<Periodo[]> {
  const { data } = await api.get<unknown[]>(endpoints.asignaturas.periodos(courseId))
  const rows = Array.isArray(data) ? data : []
  return rows.map((p) => {
    const o = p as Record<string, unknown>
    return { id: String(o.id_periodo ?? ''), descripcion: String(o.descripcion ?? '') }
  })
}

// Actividades por RA (incluye nota si pasas matrícula)
export async function getActivitiesByRA(raId: string, opts?: { matriculaId?: string }): Promise<Activity[]> {
  const { data } = await api.get<unknown[]>(endpoints.ras.actividades(raId), {
    params: opts?.matriculaId ? { id_matricula: opts.matriculaId } : undefined,
  })
  const rows = Array.isArray(data) ? data : []
  return rows.map((it) => {
    const o = it as Record<string, unknown>
    const inds = Array.isArray(o.indicadores) ? (o.indicadores as unknown[]) : undefined
    return {
      id: String(o.id_actividad ?? o.id ?? ''),
      nombre: String((o.nombre_actividad ?? o.nombre ?? '') as string),
      porcentaje: Number((o.porcentaje_actividad ?? o.porcentaje ?? 0) as number),
      porcentajeRA: Number((o.porcentaje_ra_actividad ?? 0) as number),
      raActividadId: String((o.id_ra_actividad ?? (o as Record<string, unknown>).ra_actividad_id ?? '') as string | number),
      nota: o.nota != null ? Number(o.nota as number) : null,
      retroalimentacion: (o.retroalimentacion ?? null) as string | null,
      indicadorId: o.id_ind != null ? String(o.id_ind as string | number) : null,
      tipoActividadId: o.id_tipo_actividad != null ? String(o.id_tipo_actividad as string | number) : undefined,
      tipoActividad: (o.tipo_actividad ?? undefined) as string | undefined,
      fechaCierre: (o.fecha_cierre ?? null) as string | null,
      indicadores: inds?.map((r) => {
        const ri = r as Record<string, unknown>
        return {
          id: String(ri.id_ind ?? ri.id ?? ''),
          descripcion: String(ri.descripcion ?? ''),
          porcentaje: Number((ri.porcentaje_ind ?? ri.porcentaje ?? 0) as number),
        }
      }),
    }
  })
}

// Validaciones y progreso
export async function getRAValidation(raId: string): Promise<{
  actividades: { suma: number; ok: boolean; faltante: number }
  indicadores: { suma: number; ok: boolean; faltante: number }
}> {
  const { data } = await api.get(endpoints.validacion.ra(raId))
  return data
}

export async function getAsignaturaValidation(codigo: string): Promise<{
  ras: { suma: number; ok: boolean; faltante: number }
}> {
  const { data } = await api.get(endpoints.validacion.asignatura(codigo))
  return data
}

// Recursos por curso
export async function getRecursosByCourse(courseId: string): Promise<{ id: string; titulo: string; url: string; fecha: string }[]> {
  const { data } = await api.get<unknown[]>(endpoints.asignaturas.recursos(courseId))
  const rows = Array.isArray(data) ? data : []
  return rows.map((r) => {
    const o = r as Record<string, unknown>
    return {
      id: String(o.id_recurso ?? ''),
      titulo: String(o.titulo ?? ''),
      url: String((o.archivo_url ?? o.archivo ?? '') as string),
      fecha: String(o.fecha_subida ?? ''),
    }
  })
}

export async function uploadRecurso(courseId: string, file: File, titulo?: string) {
  const fd = new FormData()
  if (titulo) fd.append('titulo', titulo)
  fd.append('file', file)
  const { data } = await api.post(endpoints.asignaturas.recursos(courseId), fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// Notificaciones
export async function getNotifications(): Promise<NotificationItem[]> {
  const { data } = await api.get<unknown[]>(endpoints.notificaciones)
  const rows = Array.isArray(data) ? data : []
  return rows.map((n) => {
    const o = n as Record<string, unknown>
    return {
      id: String((o.id ?? o.uuid ?? Math.random()) as string | number),
      kind: (o.kind ?? o.tipo ?? undefined) as NotificationItem['kind'],
      text: String((o.text ?? o.mensaje ?? o.descripcion ?? 'Nueva notificación') as string),
      date: (o.date ?? o.created_at ?? o.fecha ?? undefined) as string | undefined,
      read: Boolean((o.read ?? o.visto ?? false) as boolean),
      link: (o.link ?? o.url ?? undefined) as string | undefined,
    }
  })
}
