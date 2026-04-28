export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = error as { response?: { data?: { detail?: unknown } } }
    const detail = response.response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const errMessage = (error as { message?: unknown }).message
    if (typeof errMessage === 'string' && errMessage.trim()) return errMessage
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}