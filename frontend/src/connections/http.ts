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
