import axios, { InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/lib/auth-store'

// Default to '/api/v1' so calls like api.post('/auth/login') resolve to /api/v1/auth/login.
// This works on any port (no hardcoded localhost:3000) and avoids the mismatch
// that occurs when NEXT_PUBLIC_API_URL points to a different port.
// Override NEXT_PUBLIC_API_URL only if the API is on a completely different host.
// Backward compat: middleware.ts rewrites /api/X → /api/v1/X for legacy clients.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Auth is carried by httpOnly cookies set by the API.
api.interceptors.request.use((config) => {
  config.withCredentials = true
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
  }
  return config
})

// Track whether a refresh is already in-flight to avoid parallel refresh calls
let isRefreshing = false
let failedQueue: Array<{
  resolve: () => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve()
  })
  failedQueue = []
}

// Handle 401 — attempt silent refresh before forcing logout
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Only intercept 401s on non-refresh endpoints
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error)
    }

    if (typeof window === 'undefined') {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Queue this request until the refresh completes
      return new Promise<void>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(() => {
        return api(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, undefined, { withCredentials: true })

      if (data?.success) {
        if (data.data?.user) {
          useAuthStore.getState().setAuth(data.data.user)
        }

        processQueue(null)

        // Retry the original request; the browser sends the new access cookie.
        return api(originalRequest)
      } else {
        processQueue(error)
        useAuthStore.getState().clearAuth()
        window.location.href = '/auth/login'
        return Promise.reject(error)
      }
    } catch (refreshError) {
      processQueue(refreshError)
      useAuthStore.getState().clearAuth()
      window.location.href = '/auth/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default api
