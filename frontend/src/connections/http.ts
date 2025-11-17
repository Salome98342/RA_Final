import axios from 'axios'
import type { AxiosRequestHeaders } from 'axios'

// Centralized Axios client for all API calls
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  withCredentials: true,
})

// Attach CSRF token for Django session auth if available
api.interceptors.request.use((config) => {
  // Attach Bearer token from localStorage on every request
  const t = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null
  if (t) {
    if (!config.headers) config.headers = {} as AxiosRequestHeaders
    ;(config.headers as Record<string, string>)['Authorization'] = `Bearer ${t}`
  }

  if (typeof document !== 'undefined') {
    const m = document.cookie.match(/csrftoken=([^;]+)/)
    if (m) {
      if (!config.headers) config.headers = {} as AxiosRequestHeaders
      ;(config.headers as Record<string, string>)['X-CSRFToken'] = m[1]
    }
  }
  return config
})

// Handle 401 globally: clear token and redirect to login once
let redirecting = false
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status: number | undefined = error?.response?.status
    if (status === 401 && !redirecting) {
      redirecting = true
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('auth_token')
      }
      // small delay to allow any UI cleanup
      setTimeout(() => { window.location.href = '/login' }, 50)
    }
    return Promise.reject(error)
  }
)
