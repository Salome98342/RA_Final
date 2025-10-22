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
  const { data } = await api.get<any[]>(endpoints.asignaturas.list)
  return (data || []).map((it: any) => ({
    id: String(it.codigo_asignatura),
    nombre: it.nombre,
    carrera: it.programa?.codigo_programa || it.programa?.nombre || String(it.programa ?? ''),
    codigo: it.codigo_asignatura
  }))
}

// RAs por curso
export async function getRAsByCourse(courseId: string): Promise<RA[]> {
  const { data } = await api.get<any[]>(endpoints.asignaturas.ras(courseId))
  return (data || []).map((it: any) => ({
    id: String(it.id_ra ?? it.id),
    titulo: it.titulo || it.descripcion || `RA ${it.id_ra ?? it.id}`,
    info: it.info || (it.porcentaje_ra != null ? `Peso: ${it.porcentaje_ra}%` : ''),
    porcentajeRA: it.porcentaje_ra != null ? Number(it.porcentaje_ra) : undefined,
  }))
}

// Estudiantes por curso (opcional: filtrar por periodo)
export async function getStudentsByCourse(courseId: string, opts?: { periodoId?: string, periodo?: string }): Promise<Student[]> {
  const { data } = await api.get<any[]>(endpoints.asignaturas.estudiantes(courseId), {
    params: opts?.periodoId ? { id_periodo: opts.periodoId } : (opts?.periodo ? { periodo: opts.periodo } : undefined),
  })
  return (data || []).map((s: any) => ({
    id: String(s.id_estudiante),
    name: `${s.nombre} ${s.apellido}`.trim(),
    matriculaId: String(s.id_matricula),
  }))
}

// Indicadores por RA
export async function getIndicatorsByRA(raId: string): Promise<Indicator[]> {
  const { data } = await api.get<any[]>(endpoints.ras.indicadores(raId))
  return (data || []).map((it: any) => ({ id: String(it.id), descripcion: it.descripcion, porcentaje: Number(it.porcentaje_ind ?? it.porcentaje ?? 0) }))
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
  const { data } = await api.get<any[]>(endpoints.asignaturas.indicadoresEstudiante(courseId, studentId))
  return data as { id_ind: number; ra_id: number; descripcion: string; porcentaje_ind: number; avg_nota: number | null; avg_pct: number | null }[]
}

// Mi matrícula
export async function getMyMatricula(courseId: string): Promise<string | null> {
  const { data } = await api.get<{ id_matricula: number | null }>(endpoints.asignaturas.miMatricula(courseId))
  return data?.id_matricula ? String(data.id_matricula) : null
}

// Catálogo tipos de actividad
export async function getTiposActividad(): Promise<{ id: string; descripcion: string }[]> {
  const { data } = await api.get<any[]>(endpoints.catalogos.tiposActividad)
  return (data || []).map((t: any) => ({ id: String(t.id_tipo_actividad ?? t.id), descripcion: t.descripcion }))
}

// Periodos por curso
export async function getPeriodosByCourse(courseId: string): Promise<Periodo[]> {
  const { data } = await api.get<any[]>(endpoints.asignaturas.periodos(courseId))
  return (data || []).map((p: any) => ({ id: String(p.id_periodo), descripcion: p.descripcion }))
}

// Actividades por RA (incluye nota si pasas matrícula)
export async function getActivitiesByRA(raId: string, opts?: { matriculaId?: string }): Promise<Activity[]> {
  const { data } = await api.get<any[]>(endpoints.ras.actividades(raId), {
    params: opts?.matriculaId ? { id_matricula: opts.matriculaId } : undefined,
  })
  return (data || []).map((it: any) => ({
    id: String(it.id_actividad ?? it.id),
    nombre: it.nombre_actividad || it.nombre,
    porcentaje: Number(it.porcentaje_actividad ?? it.porcentaje ?? 0),
    porcentajeRA: Number(it.porcentaje_ra_actividad ?? 0),
    raActividadId: String(it.id_ra_actividad ?? it.ra_actividad_id ?? ''),
    nota: it.nota != null ? Number(it.nota) : null,
    retroalimentacion: it.retroalimentacion ?? null,
    indicadorId: it.id_ind != null ? String(it.id_ind) : null,
    tipoActividadId: it.id_tipo_actividad != null ? String(it.id_tipo_actividad) : undefined,
    tipoActividad: it.tipo_actividad ?? undefined,
    fechaCierre: it.fecha_cierre ?? null,
    // Enriquecimiento: lista de indicadores asignados a la actividad dentro del RA
    indicadores: Array.isArray(it.indicadores)
      ? it.indicadores.map((r: any) => ({
          id: String(r.id_ind ?? r.id),
          descripcion: String(r.descripcion ?? ''),
          porcentaje: Number(r.porcentaje_ind ?? r.porcentaje ?? 0),
        }))
      : undefined,
  }))
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
  const { data } = await api.get<any[]>(endpoints.asignaturas.recursos(courseId))
  return (data || []).map(r => ({
    id: String(r.id_recurso),
    titulo: r.titulo,
    url: r.archivo_url || r.archivo,
    fecha: r.fecha_subida,
  }))
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
  const { data } = await api.get<any[]>(endpoints.notificaciones)
  return (data || []).map((n: any) => ({
    id: String(n.id ?? n.uuid ?? Math.random()),
    kind: n.kind || n.tipo || undefined,
    text: n.text || n.mensaje || n.descripcion || 'Nueva notificación',
    date: n.date || n.created_at || n.fecha || undefined,
    read: Boolean(n.read ?? n.visto ?? false),
    link: n.link || n.url || undefined,
  }))
}
