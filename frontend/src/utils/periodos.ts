export type PeriodoLike = {
  id?: string | number
  descripcion: string
}

const TERM_WEIGHT: Record<string, number> = {
  I: 1,
  II: 2,
}

const VALID_TERM_DESCRIPTIONS = new Set(['I', 'II', '1', '2'])

function normalizeDescripcion(input: string): string {
  return String(input || '').trim().toUpperCase()
}

// Convierte descripciones tipo "2026-I" o "2026-II" a una llave ordenable.
export function periodoSortKey(descripcion: string): number {
  const normalized = normalizeDescripcion(descripcion)
  const match = normalized.match(/^(\d{4})\s*[-/]\s*(I{1,2}|\d+)$/)
  if (!match) return -1

  const year = Number(match[1])
  const termRaw = match[2]
  const term = TERM_WEIGHT[termRaw] ?? Number(termRaw)
  if (!Number.isFinite(year) || !Number.isFinite(term)) return -1

  if (!VALID_TERM_DESCRIPTIONS.has(termRaw) && !(term === 1 || term === 2)) {
    return -1
  }

  if (term < 1 || term > 2) {
    return -1
  }

  return year * 10 + term
}

export function isPeriodoAtLeast2024I(descripcion: string): boolean {
  return periodoSortKey(descripcion) >= 20241
}

export function sortPeriodosDesc<T extends PeriodoLike>(periodos: T[]): T[] {
  return [...periodos].sort((a, b) => {
    const ka = periodoSortKey(a.descripcion)
    const kb = periodoSortKey(b.descripcion)
    if (ka !== kb) return kb - ka
    return normalizeDescripcion(b.descripcion).localeCompare(normalizeDescripcion(a.descripcion))
  })
}

export function sortPeriodoDescriptionsDesc(periodos: string[]): string[] {
  const wrapped = periodos.map((descripcion) => ({ descripcion }))
  return sortPeriodosDesc(wrapped).map((p) => p.descripcion)
}

export function latestPeriodoDescripcion(periodos: Array<PeriodoLike>): string | null {
  if (!periodos.length) return null
  return sortPeriodosDesc(periodos)[0].descripcion
}
