import axios from 'axios'

// Centralized Axios client for all API calls
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  withCredentials: true,
})

// Attach tokens on every request (Authorization + CSRF when available)
api.interceptors.request.use((config) => {
  // Bearer token from localStorage
  try {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (token) {
      config.headers = config.headers || {}
      ;(config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }
  } catch { /* ignore storage issues */ }

  // CSRF token for Django session auth if available
  if (typeof document !== 'undefined') {
    const m = document.cookie.match(/csrftoken=([^;]+)/)
    if (m) {
      config.headers = config.headers || {}
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
    const status = error?.response?.status
    if (status === 401 && !redirecting) {
      redirecting = true
      try { localStorage.removeItem('auth_token') } catch { /* ignore */ }
      // small delay to allow any UI cleanup
      setTimeout(() => { window.location.href = '/login' }, 50)
    }
    return Promise.reject(error)
  }
)
