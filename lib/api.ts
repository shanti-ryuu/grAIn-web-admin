import axios from 'axios'
import { useAuthStore } from '@/lib/auth-store'

// Default to '/api' so calls like api.post('/auth/login') resolve to /api/auth/login.
// This works on any port (no hardcoded localhost:3000) and avoids the mismatch
// that occurs when NEXT_PUBLIC_API_URL points to a different port.
// Override NEXT_PUBLIC_API_URL only if the API is on a completely different host.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach token from Zustand auth store on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Debug log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`,
        token ? '✅ token attached' : '❌ NO TOKEN')
    }
  }
  return config
})

// Handle errors — clear auth on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear auth and redirect
      if (typeof window !== 'undefined') {
        useAuthStore.getState().clearAuth()
        window.location.href = '/auth/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
