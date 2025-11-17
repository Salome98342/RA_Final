import { api } from '@/connections/http'
import { endpoints, type UserProfile } from '@/connections/endpoints'
import type { ProfileDetails } from '@/types'

export async function login(code: string, password: string): Promise<UserProfile> {
  const { data } = await api.post(endpoints.auth.login, { codigo: code, password })
  const token: string | undefined = data?.token
  const user = data?.user || {}
  if (token) {
    try { localStorage.setItem('auth_token', token) } catch { /* ignore storage errors */ }
  }
  return {
    id: String(user.id ?? ''),
    nombre: user.nombre ?? '',
    rol: (user.rol || 'estudiante'),
    code: code,
  }
}

export async function logout() {
  try { await api.post(endpoints.auth.logout, {}) } finally {
    try { localStorage.removeItem('auth_token') } catch { /* ignore */ }
  }
}

export async function requestPasswordReset(email: string) {
  await api.post(endpoints.auth.forgot, { email })
}

export async function resetPassword(token: string, password: string) {
  await api.post(endpoints.auth.reset, { token, password })
}

export async function getFullProfile(): Promise<ProfileDetails> {
  const { data } = await api.get(endpoints.auth.profile)
  const u = data.user || {}
  const d = data.details || {}
  return {
    id: String(u.id), rol: u.rol, nombre: u.nombre, apellido: u.apellido, code: u.code, correo: d.correo,
    documento: d.documento, telefono: d.telefono ?? null, jornada: d.jornada ?? null,
    zona_horaria: d.zona_horaria, cursos: data.cursos || [], cursosPorPeriodo: data.cursos_por_periodo || [],
    avatarUrl: d.avatar_url ?? null,
    programas: d.programas ?? [],
    totalCursos: d.total_cursos ?? null,
    periodoActual: d.periodo_actual ?? null,
    totalCursosPeriodoActual: d.total_cursos_periodo_actual ?? null,
  }
}

export async function updateProfile(patch: Partial<{ correo: string; telefono?: string; jornada?: string }>): Promise<ProfileDetails> {
  await api.patch(endpoints.auth.profile, patch)
  return getFullProfile()
}

export async function getProfile(): Promise<{ id: string; rol: 'docente' | 'estudiante' | 'coordinador'; nombre?: string; code?: string | null }> {
  const { data } = await api.get(endpoints.auth.me)
  const u = data?.user || {}
  return { id: String(u.id ?? ''), rol: u.rol, nombre: u.nombre, code: u.code ?? null }
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  await api.post(endpoints.auth.change, { current_password, new_password })
}

export async function uploadAvatar(file: File): Promise<string | null> {
  const fd = new FormData()
  fd.append('avatar', file)
  const { data } = await api.post(endpoints.auth.avatar, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  return data?.url ?? null
}
