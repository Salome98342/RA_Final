import { api } from '@/connections/http'
import { endpoints } from '@/connections/endpoints'

export interface Paged<T> { page: number; page_size: number; total: number; results: T[] }

export interface AsignaturaRow {
  codigo: string
  nombre: string
  grupo: string | null
  programa: string | null
  programa_codigo: string | null
  docente: string | null
  docente_codigo: string | null
  total_estudiantes: number
  total_ras: number
}

export interface EstudianteRow {
  id_matricula: number
  id_estudiante: number
  nombre: string
  apellido: string
  codigo_estudiante: string
  periodo: string
}

export interface RARow {
  id_ra: number
  descripcion: string | null
  porcentaje_ra: number
  total_actividades: number
}

export interface AvanceRAItem {
  id_ra: number
  descripcion: string | null
  porcentaje_ra: number
  avg: number | null
  ok_pct: number
  low_pct: number
  coverage_avg: number
}

export interface AvanceAsignaturaResponse {
  codigo_asignatura: string
  periodo?: string
  total_estudiantes: number
  total: { avg: number | null; ok_pct: number; low_pct: number; coverage_avg: number; threshold: number }
  ras: AvanceRAItem[]
}

export async function fetchAsignaturas(params: Record<string, string | number | undefined> = {}): Promise<Paged<AsignaturaRow>> {
  const { data } = await api.get(endpoints.coordinador.asignaturas, { params })
  return data
}

export async function fetchAsignaturaEstudiantes(params: { codigo_asignatura: string; periodo?: string; page?: number; page_size?: number }): Promise<Paged<EstudianteRow>> {
  const { data } = await api.get(endpoints.coordinador.asignaturaEstudiantes, { params })
  return data
}

export async function fetchAsignaturaRAs(params: { codigo_asignatura: string; periodo?: string }): Promise<{ codigo_asignatura: string; periodo?: string; ras: RARow[]; total_ras: number }> {
  const { data } = await api.get(endpoints.coordinador.asignaturaRAs, { params })
  return data
}

export async function fetchAsignaturaAvance(params: { codigo_asignatura: string; periodo?: string }): Promise<AvanceAsignaturaResponse> {
  const { data } = await api.get(endpoints.coordinador.asignaturaAvance, { params })
  return data
}

function uploadCsv(url: string, file: File) {
  const fd = new FormData()
  fd.append('file', file)
  return api.post(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
}

export async function importMatriculados(file: File) {
  const { data } = await uploadCsv(endpoints.coordinador.importMatriculados, file)
  return data as { created: number; existing: number; errors: Array<{ row: number; error: string }> }
}

export async function importDocentes(file: File) {
  const { data } = await uploadCsv(endpoints.coordinador.importDocentes, file)
  return data as { created: number; existing: number; errors: Array<{ row: number; error: string }> }
}

export async function importAsignaturasRAs(file: File) {
  const { data } = await uploadCsv(endpoints.coordinador.importAsignaturasRAs, file)
  return data as { created_asignaturas: number; existing_asignaturas: number; created_ras: number; errors: Array<{ row: number; error: string }> }
}
