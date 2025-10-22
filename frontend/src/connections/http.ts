import axios from 'axios'

// Centralized Axios client for all API calls
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  withCredentials: true,
})

// Attach bearer token if saved
const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null
if (token) {
  (api.defaults.headers as any).common = (api.defaults.headers as any).common || {}
  ;(api.defaults.headers as any).common['Authorization'] = `Bearer ${token}`
}

// Attach CSRF token for Django session auth if available
api.interceptors.request.use((config) => {
  if (typeof document !== 'undefined') {
    const m = document.cookie.match(/csrftoken=([^;]+)/)
    if (m) {
      config.headers = config.headers || {}
      ;(config.headers as any)['X-CSRFToken'] = m[1]
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
      try { localStorage.removeItem('auth_token') } catch {}
      if ((api.defaults.headers as any).common) {
        delete (api.defaults.headers as any).common['Authorization']
      }
      // small delay to allow any UI cleanup
      setTimeout(() => { window.location.href = '/login' }, 50)
    }
    return Promise.reject(error)
  }
)
