import axios from 'axios'
import type { AxiosRequestHeaders, AxiosError } from 'axios'

// Centralized Axios client for all API calls
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  withCredentials: true,
  timeout: 30000, // 30 segundos timeout
})

// ==================== REQUEST INTERCEPTOR ====================
api.interceptors.request.use(
  (config) => {
    // Attach Bearer token from localStorage on every request
    const t = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (t) {
      if (!config.headers) config.headers = {} as AxiosRequestHeaders
      ;(config.headers as Record<string, string>)['Authorization'] = `Bearer ${t}`
    }

    // Attach CSRF token for Django session auth if available
    if (typeof document !== 'undefined') {
      const m = document.cookie.match(/csrftoken=([^;]+)/)
      if (m) {
        if (!config.headers) config.headers = {} as AxiosRequestHeaders
        ;(config.headers as Record<string, string>)['X-CSRFToken'] = m[1]
      }
    }
    
    return config
  },
  (error) => {
    console.error('❌ Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// ==================== RESPONSE INTERCEPTOR ====================
let redirecting = false

api.interceptors.response.use(
  (res) => {
    // Reset redirecting flag on successful response
    if (redirecting && res.status === 200) {
      redirecting = false
    }
    return res
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean; _retryCount?: number }
    const status: number | undefined = error?.response?.status

    // ========== MANEJO DE ERRORES DE RED ==========
    if (!error.response) {
      // Error de red (sin respuesta del servidor)
      console.error('🔴 Network error - No response from server:', error.message)
      
      // Retry logic para errores de red (máximo 2 reintentos)
      if (!originalRequest?._retryCount) {
        originalRequest!._retryCount = 0
      }
      
      if (originalRequest && originalRequest._retryCount < 2) {
        originalRequest._retryCount += 1
        console.log(`🔄 Retrying request (attempt ${originalRequest._retryCount}/2)...`)
        
        // Esperar un poco antes de reintentar (backoff exponencial)
        const retryCount = originalRequest._retryCount || 1
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
        
        return api.request(originalRequest)
      }
      
      return Promise.reject({
        message: 'Error de conexión. Verifica tu conexión a internet.',
        type: 'NETWORK_ERROR',
        originalError: error
      })
    }

    // ========== MANEJO DE 401 (NO AUTORIZADO) ==========
    if (status === 401 && !redirecting) {
      redirecting = true
      
      console.warn('⚠️ 401 Unauthorized - Redirecting to login...')
      
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('auth_token')
      }
      
      // Limpiar estado de sesión si existe
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear()
      }
      
      // Delay pequeño para permitir limpieza de UI
      setTimeout(() => {
        window.location.href = '/login'
      }, 100)
      
      return Promise.reject({
        message: 'Sesión expirada. Por favor inicia sesión nuevamente.',
        type: 'UNAUTHORIZED',
        status: 401
      })
    }

    // ========== MANEJO DE 403 (PROHIBIDO) ==========
    if (status === 403) {
      console.error('⛔ 403 Forbidden - Insufficient permissions')
      return Promise.reject({
        message: 'No tienes permisos para realizar esta acción.',
        type: 'FORBIDDEN',
        status: 403
      })
    }

    // ========== MANEJO DE 404 (NO ENCONTRADO) ==========
    if (status === 404) {
      console.warn('🔍 404 Not Found -', error.config?.url)
      return Promise.reject({
        message: 'El recurso solicitado no existe.',
        type: 'NOT_FOUND',
        status: 404
      })
    }

    // ========== MANEJO DE 500 (ERROR DEL SERVIDOR) ==========
    if (status && status >= 500) {
      console.error('💥 Server error:', status, error.response?.data)
      
      // Retry automático para errores 503 (Service Unavailable)
      if (status === 503 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true
        console.log('🔄 Retrying after 503 Service Unavailable...')
        await new Promise(resolve => setTimeout(resolve, 2000))
        return api.request(originalRequest)
      }
      
      return Promise.reject({
        message: 'Error en el servidor. Inténtalo de nuevo más tarde.',
        type: 'SERVER_ERROR',
        status,
        detail: error.response?.data
      })
    }

    // ========== ERROR GENÉRICO ==========
    const errorData = error.response?.data as { detail?: string; message?: string; error?: { message?: string } }
    const errorMessage = 
      errorData?.error?.message ||
      errorData?.detail || 
      errorData?.message || 
      error.message || 
      'Error desconocido'

    console.error('❌ API Error:', {
      status,
      url: error.config?.url,
      message: errorMessage,
      data: errorData
    })

    return Promise.reject({
      message: errorMessage,
      type: 'API_ERROR',
      status,
      data: errorData,
      originalError: error
    })
  }
)

// ==================== UTILIDADES EXPORTADAS ====================

/**
 * Wrapper para manejar errores de API de forma consistente
 */
export const handleApiError = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as { message: string }).message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Error desconocido. Por favor contacta al administrador.'
}

/**
 * Estado de carga global (opcional - para usar en un context)
 */
export const loadingState = {
  count: 0,
  listeners: new Set<(loading: boolean) => void>(),
  
  start() {
    this.count++
    if (this.count === 1) {
      this.notify(true)
    }
  },
  
  end() {
    this.count = Math.max(0, this.count - 1)
    if (this.count === 0) {
      this.notify(false)
    }
  },
  
  notify(loading: boolean) {
    this.listeners.forEach(listener => listener(loading))
  },
  
  subscribe(listener: (loading: boolean) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
