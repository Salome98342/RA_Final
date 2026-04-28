const normalizeDocumentType = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

export const formatTipoDocumentoAbbr = (
  value: string | null | undefined,
  fallback = 'Doc'
): string => {
  const raw = String(value ?? '').trim()
  if (!raw) return fallback

  const normalized = normalizeDocumentType(raw)
  const compact = normalized.replace(/[\.\s]/g, '')

  if (compact === 'cc' || normalized.includes('cedula de ciudadania')) return 'C.C.'
  if (compact === 'cr' || normalized.includes('registro civil')) return 'C.R.'
  if (compact === 'ti' || normalized.includes('tarjeta de identidad')) return 'T.I.'
  if (compact === 'ppt' || normalized.includes('permiso por proteccion temporal')) return 'PPT'

  return raw.toUpperCase()
}
