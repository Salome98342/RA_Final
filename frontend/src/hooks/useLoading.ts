import { useState, useCallback } from 'react'

/**
 * Hook para gestionar estado de carga global
 * Útil para mostrar spinners durante peticiones async
 */
export function useLoading(initialState = false) {
  const [loading, setLoading] = useState(initialState)

  const startLoading = useCallback(() => setLoading(true), [])
  const stopLoading = useCallback(() => setLoading(false), [])
  const toggleLoading = useCallback(() => setLoading(prev => !prev), [])

  return {
    loading,
    startLoading,
    stopLoading,
    toggleLoading,
    setLoading
  }
}
