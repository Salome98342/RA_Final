/**
 * Valida que una nota esté en el rango válido (0-5)
 * @param nota - Valor a validar (string o number)
 * @returns Objeto con resultado de validación
 */
export const validateGrade = (nota: string | number): { valid: boolean; error?: string } => {
  const num = Number(nota)
  if (Number.isNaN(num)) {
    return { valid: false, error: 'La nota debe ser un número' }
  }
  if (num < 0 || num > 5) {
    return { valid: false, error: 'La nota debe estar entre 0 y 5' }
  }
  return { valid: true }
}

/**
 * Valida que un porcentaje esté en el rango válido (0-100)
 * @param percentage - Valor a validar (string o number)
 * @returns Objeto con resultado de validación
 */
export const validatePercentage = (percentage: string | number): { valid: boolean; error?: string } => {
  const num = Number(percentage)
  if (Number.isNaN(num)) {
    return { valid: false, error: 'El porcentaje debe ser un número' }
  }
  if (num < 0 || num > 100) {
    return { valid: false, error: 'El porcentaje debe estar entre 0 y 100' }
  }
  return { valid: true }
}

/**
 * Valida que una fecha no sea anterior a hoy
 * @param date - Fecha en formato string (YYYY-MM-DD)
 * @returns Objeto con resultado de validación
 */
export const validateFutureDate = (date: string): { valid: boolean; error?: string } => {
  if (!date) {
    return { valid: false, error: 'La fecha es requerida' }
  }
  const selectedDate = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (selectedDate < today) {
    return { valid: false, error: 'La fecha no puede ser anterior a hoy' }
  }
  return { valid: true }
}

/**
 * Normaliza una nota (redondea a 1 decimal)
 * @param nota - Nota a normalizar
 * @returns Nota normalizada o null si inválida
 */
export const normalizeGrade = (nota: string | number | null | undefined): number | null => {
  if (nota === null || nota === undefined || nota === '') return null
  const num = Number(nota)
  if (Number.isNaN(num)) return null
  return Math.round(num * 10) / 10
}
