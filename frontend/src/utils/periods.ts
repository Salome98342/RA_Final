/**
 * Utilidades para manejo de periodos académicos
 */

export interface ProfilePeriodo {
  id: number
  descripcion: string
  fecha_inicio?: string
  fecha_fin?: string
  is_current?: boolean
}

/**
 * Determina el periodo actual basado en fechas o marcador explicit
 */
export function getCurrentPeriod(periodos: ProfilePeriodo[]): ProfilePeriodo | null {
  if (!periodos || periodos.length === 0) return null
  
  // Si algún periodo tiene is_current marcado, usarlo
  const marked = periodos.find(p => p.is_current)
  if (marked) return marked
  
  // Si no, determinar por fecha (el más reciente que ya comenzó)
  const now = new Date()
  const started = periodos.filter(p => {
    if (!p.fecha_inicio) return false
    const inicio = new Date(p.fecha_inicio)
    return inicio <= now
  })
  
  if (started.length === 0) return periodos[0] // Fallback al primero
  
  // El más reciente de los que ya empezaron
  return started.reduce((latest, current) => {
    const latestDate = new Date(latest.fecha_inicio || 0)
    const currentDate = new Date(current.fecha_inicio || 0)
    return currentDate > latestDate ? current : latest
  })
}

/**
 * Separa cursos por periodo actual vs histórico
 */
export function separateCoursesByPeriod<T extends { periodo?: string | ProfilePeriodo }>(
  courses: T[],
  currentPeriodId?: number | string
): { current: T[]; past: T[] } {
  if (!currentPeriodId) {
    // Si no hay periodo actual definido, todos son históricos
    return { current: [], past: courses }
  }
  
  const current: T[] = []
  const past: T[] = []
  
  courses.forEach(course => {
    const periodo = course.periodo
    if (!periodo) {
      past.push(course)
      return
    }
    
    // Si periodo es objeto con id
    if (typeof periodo === 'object' && 'id' in periodo) {
      if (periodo.id === currentPeriodId) {
        current.push(course)
      } else {
        past.push(course)
      }
    }
    // Si periodo es string (descripción)
    else if (typeof periodo === 'string' && typeof currentPeriodId === 'string') {
      if (periodo === currentPeriodId) {
        current.push(course)
      } else {
        past.push(course)
      }
    }
    else {
      past.push(course)
    }
  })
  
  return { current, past }
}

/**
 * Agrupa cursos por periodo
 */
export function groupCoursesByPeriod<T extends { periodo?: string | ProfilePeriodo }>(
  courses: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  
  courses.forEach(course => {
    const periodo = course.periodo
    let key = 'Sin periodo'
    
    if (typeof periodo === 'object' && 'descripcion' in periodo) {
      key = periodo.descripcion || 'Sin periodo'
    } else if (typeof periodo === 'string') {
      key = periodo
    }
    
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(course)
  })
  
  return groups
}
