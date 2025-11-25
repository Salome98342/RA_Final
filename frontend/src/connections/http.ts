import axios from 'axios'
import type { AxiosRequestHeaders, AxiosError } from 'axios'
import { loadingEventBus } from '@/utils/loadingEvents'

// Centralized Axios client for all API calls
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  withCredentials: true,
  timeout: 30000, // 30 segundos timeout
})

// ==================== GESTIÓN DE TOKENS ====================
/**
 * Estrategia de almacenamiento de tokens:
 * - sessionStorage: Aislado por pestaña (no se comparte entre pestañas)
 * - localStorage: Compartido entre pestañas (fallback para compatibilidad)
 * 
 * PRIORIDAD: sessionStorage > localStorage
 * Esto evita que múltiples sesiones se sobrescriban entre pestañas
 */
function getAuthToken(): string | null {
  // Priorizar sessionStorage (aislado por pestaña)
  if (typeof sessionStorage !== 'undefined') {
    const sessionToken = sessionStorage.getItem('auth_token')
    if (sessionToken) return sessionToken
  }
  
  // Fallback a localStorage (compartido entre pestañas)
  if (typeof localStorage !== 'undefined') {
    const localToken = localStorage.getItem('auth_token')
    if (localToken) {
      // Migrar a sessionStorage para aislar la sesión
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('auth_token', localToken)
      }
      return localToken
    }
  }
  
  return null
}

function setAuthToken(token: string): void {
  // Guardar en sessionStorage (aislado por pestaña)
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('auth_token', token)
  }
  // También en localStorage para persistencia entre recargas
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('auth_token', token)
  }
}

function removeAuthToken(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('auth_token')
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('auth_token')
  }
}

// Exportar funciones de gestión de tokens
export { getAuthToken, setAuthToken, removeAuthToken }

// ==================== REQUEST INTERCEPTOR ====================
api.interceptors.request.use(
  (config) => {
    // Iniciar loading para peticiones que no sean de polling/notificaciones
    const url = config.url || ''
    const isBackgroundRequest = url.includes('/notificaciones') || url.includes('/polling')
    
    if (!isBackgroundRequest) {
      loadingEventBus.start()
    }

    // Attach Bearer token usando la función de gestión de tokens
    const t = getAuthToken()
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
    loadingEventBus.stop()
    console.error('❌ Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// ==================== RESPONSE INTERCEPTOR ====================
let redirecting = false

api.interceptors.response.use(
  (res) => {
    // Detener loading al recibir respuesta exitosa
    const url = res.config.url || ''
    const isBackgroundRequest = url.includes('/notificaciones') || url.includes('/polling')
    
    if (!isBackgroundRequest) {
      loadingEventBus.stop()
    }

    // Reset redirecting flag on successful response
    if (redirecting && res.status === 200) {
      redirecting = false
    }
    return res
  },
  async (error: AxiosError) => {
    // Detener loading en caso de error
    loadingEventBus.stop()
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
      
      // Usar función centralizada para limpiar tokens
      removeAuthToken()
      
      // Limpiar todo el sessionStorage de la pestaña actual
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
