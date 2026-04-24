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

// FIX 3: Add token to requests from Zustand auth store (not localStorage)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state and redirect to login
      if (typeof window !== 'undefined') {
        useAuthStore.getState().logout()
        window.location.href = '/auth/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
