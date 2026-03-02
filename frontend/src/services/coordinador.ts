import { api } from '@/connections/http'
import { endpoints } from '@/connections/endpoints'

// ========== TIPOS PARA PAGINACIÓN ==========
export interface Paged<T> { 
  page: number
  page_size: number
  total: number
  results: T[] 
}

// ========== TIPOS PARA ASIGNATURAS ==========
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
  total: { 
    avg: number | null
    ok_pct: number
    low_pct: number
    coverage_avg: number
    threshold: number 
  }
  ras: AvanceRAItem[]
}

// ========== GESTIÓN DE ESTUDIANTES ==========
export type EstudianteListItem = {
  id_estudiante: number
  nombre: string
  apellido: string
  codigo_estudiante: string
  correo: string
  tipo_documento: string | null
  num_documento: string
  jornada: string | null
}

export type CreateEstudiantePayload = {
  codigo_estudiante: string
  nombre: string
  apellido: string
  correo: string
  tipo_documento: string
  num_documento: string
  jornada?: string
}

export type TipoDocumento = {
  id_tipo_documento: number
  descripcion: string
}

// ========== FUNCIONES API - ASIGNATURAS ==========
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

// ========== FUNCIONES API - IMPORTACIONES CSV ==========
function uploadCsv(url: string, file: File) {
  const fd = new FormData()
  fd.append('file', file)
  return api.post(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
}

export async function importEstudiantes(file: File) {
  const { data } = await uploadCsv(endpoints.coordinador.importEstudiantes, file)
  return data as { created: number; existing: number; errors: Array<{ row: number; error: string }> }
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

// ========== FUNCIONES API - ESTUDIANTES ==========
export async function fetchEstudiantes(search?: string): Promise<EstudianteListItem[]> {
  const { data } = await api.get(endpoints.coordinador.estudiantes, { params: { search } })
  return data
}

export async function createEstudiante(payload: CreateEstudiantePayload) {
  const { data } = await api.post(endpoints.coordinador.estudiantes, payload)
  return data as { detail: string; estudiante: EstudianteListItem }
}

export async function fetchTiposDocumento(): Promise<TipoDocumento[]> {
  const { data } = await api.get(endpoints.tiposDocumento)
  return data
}

// ========== PERFIL COMPLETO DE ESTUDIANTE ==========
export interface EstudiantePerfilCompleto {
  estudiante: {
    id_estudiante: number
    codigo_estudiante: string
    nombre: string
    apellido: string
    nombre_completo: string
    correo: string
    tipo_documento: string | null
    num_documento: string
    programa: string | null
    jornada: string | null
  }
  estadisticas: {
    total_asignaturas: number
    promedio_general: number | null
    asignaturas_aprobadas: number
    asignaturas_reprobadas: number
    tasa_aprobacion: number | null
  }
  periodos: Array<{
    id_periodo: number
    descripcion: string
    fecha_inicio: string
    fecha_finalizacion: string
    asignaturas: Array<{
      id_asignatura: number
      codigo_asignatura: string
      nombre: string
      docente: string
      nota_final: number | null
      nota_strict: number
      nota_progressive: number
      coverage: number
      estado: string
      ras: Array<{
        id_ra: number
        descripcion: string
        porcentaje_ra: number
        nota_strict: number
        nota_progressive: number | null
        coverage: number
        actividades_calificadas: number
        total_actividades: number
      }>
    }>
  }>
}

export async function fetchEstudiantePerfil(id_estudiante: number): Promise<EstudiantePerfilCompleto> {
  const { data } = await api.get(`/coordinador/estudiantes/${id_estudiante}/perfil`)
  return data
}
