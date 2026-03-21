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
  id_asignatura: number
  codigo: string
  nombre: string
  grupo: string
  creditos?: number
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
  programa_codigo?: string | null
  programa?: string | null
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

export type ProgramaItem = {
  id_programa: number
  codigo_programa: string
  nombre: string
}

export type CreateAsignaturaWithRAItem = {
  descripcion: string
  porcentaje_ra: number
  indicadores: Array<{
    descripcion: string
    porcentaje_ind: number
  }>
}

export type CreateAsignaturaWithRAPayload = {
  codigo_asignatura: string
  nombre_asignatura: string
  codigo_docente: string
  codigo_programa: string
  grupo?: string
  ras: CreateAsignaturaWithRAItem[]
}

export type CreateAsignaturaWithRAResponse = {
  detail: string
  asignatura: {
    codigo: string
    nombre: string
    grupo: string | null
    programa_codigo: string | null
    docente_codigo: string | null
  }
  asignatura_creada: boolean
  asignatura_actualizada: boolean
  ras_creados: Array<{
    id_ra: number
    descripcion: string | null
    porcentaje_ra: number
    indicadores: Array<{
      id_ind: number
      descripcion: string | null
      porcentaje_ind: number
    }>
  }>
  ras_omitidos: Array<{
    descripcion: string
    motivo: string
  }>
  total_ra_asignatura: number
}

// ========== GESTIÓN DE DOCENTES ==========
export type DocenteListItem = {
  id_docente: number
  nombre: string
  apellido: string
  codigo_docente: string
  correo: string
  tipo_documento: string | null
  num_documento: string
}

export type CreateDocentePayload = {
  codigo_docente: string
  nombre: string
  apellido: string
  correo: string
  tipo_documento: string
  num_documento: string
}

// ========== FUNCIONES API - ASIGNATURAS ==========
export async function fetchAsignaturas(params: Record<string, string | number | undefined> = {}): Promise<Paged<AsignaturaRow>> {
  const { data } = await api.get(endpoints.coordinador.asignaturas, { params })
  return data
}

export async function fetchAsignaturaEstudiantes(params: {
  codigo_asignatura: string
  grupo?: string
  id_asignatura?: number
  periodo?: string
  page?: number
  page_size?: number
}): Promise<Paged<EstudianteRow>> {
  const { data } = await api.get(endpoints.coordinador.asignaturaEstudiantes, { params })
  return data
}

export async function fetchPeriodosCoordinador(): Promise<Array<{ id_periodo: number; descripcion: string; fecha_inicio: string; fecha_finalizacion: string }>> {
  const { data } = await api.get(endpoints.coordinador.periodos)
  return Array.isArray(data) ? data : []
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
  return api.post(url, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 0,
  })
}

export async function importEstudiantes(file: File) {
  const { data } = await uploadCsv(endpoints.coordinador.importEstudiantes, file)
  return data as {
    created: number
    existing: number
    errors: Array<{ row: number; error: string }>
    imported_students?: Array<{
      nombre?: string
      apellido?: string
      codigo_estudiante?: string
      num_documento?: string
      correo?: string
    }>
  }
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

export async function fetchEstudiantesParaMatricula(params: {
  codigo_asignatura: string
  grupo?: string
  id_asignatura?: number
  search?: string
  include_all_when_empty?: boolean
}): Promise<{
  id_asignatura?: number
  codigo_asignatura: string
  grupo?: string
  programa_codigo: string | null
  programa_nombre: string | null
  used_fallback_all: boolean
  total: number
  results: EstudianteListItem[]
}> {
  const { data } = await api.get(endpoints.coordinador.estudiantesParaMatricula, {
    params: {
      codigo_asignatura: params.codigo_asignatura,
      grupo: params.grupo || undefined,
      id_asignatura: params.id_asignatura || undefined,
      search: params.search || undefined,
      include_all_when_empty: params.include_all_when_empty === false ? 0 : 1,
    },
  })
  return data
}

export async function fetchDocentes(search?: string): Promise<DocenteListItem[]> {
  const { data } = await api.get(endpoints.coordinador.docentes, { params: { search } })
  return data
}

export async function fetchProgramas(): Promise<ProgramaItem[]> {
  const { data } = await api.get(endpoints.programas.list)
  return Array.isArray(data) ? data : []
}

export async function createAsignaturaWithRAs(payload: CreateAsignaturaWithRAPayload): Promise<CreateAsignaturaWithRAResponse> {
  const { data } = await api.post(endpoints.coordinador.crearAsignaturaRA, payload)
  return data
}

export async function createEstudiante(payload: CreateEstudiantePayload) {
  const { data } = await api.post(endpoints.coordinador.estudiantes, payload)
  return data as { detail: string; estudiante: EstudianteListItem }
}

export async function createDocente(payload: CreateDocentePayload) {
  const { data } = await api.post(endpoints.coordinador.docentes, payload)
  return data as { detail: string; docente: DocenteListItem }
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

// ========== PERFIL COMPLETO DE DOCENTE ==========
export interface DocentePerfilCompleto {
  docente: {
    id_docente: number
    codigo_docente: string
    nombre: string
    apellido: string
    nombre_completo: string
    correo: string
    tipo_documento: string | null
    num_documento: string
    num_telefono: string | null
  }
  estadisticas: {
    total_asignaturas: number
    total_estudiantes: number
    total_ras: number
  }
  asignaturas: Array<{
    id_asignatura: number
    codigo_asignatura: string
    nombre: string
    grupo: string | null
    programa: string | null
    total_estudiantes: number
    total_ras: number
  }>
}

export async function fetchDocentePerfil(id_docente: number): Promise<DocentePerfilCompleto> {
  const { data } = await api.get(`/coordinador/docentes/${id_docente}/perfil`)
  return data
}
