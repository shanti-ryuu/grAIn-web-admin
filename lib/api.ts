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

// Track whether a refresh is already in-flight to avoid parallel refresh calls
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
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

    const { refreshToken } = useAuthStore.getState()
    if (!refreshToken) {
      // No refresh token available — force logout
      useAuthStore.getState().clearAuth()
      window.location.href = '/auth/login'
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Queue this request until the refresh completes
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken })

      if (data?.success && data?.data?.accessToken) {
        const { accessToken, refreshToken: newRefreshToken } = data.data
        const { user } = useAuthStore.getState()

        // Update auth store with new tokens
        useAuthStore.getState().setAuth(accessToken, user!, newRefreshToken)

        processQueue(null, accessToken)

        // Retry the original request with new access token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
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
