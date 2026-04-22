'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: {
    id: string
    email: string
    name: string
    role: 'admin' | 'farmer'
  }
}

export interface User {
  id: string
  email: string
  name: string
  role: string
  status?: string
}

// All API responses are wrapped in { success, data } or { success, error }
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
  timestamp: string
}

export function useLogin() {
  const { login } = useAuthStore()

  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<LoginResponse> => {
      const { data: responseData } = await api.post<ApiResponse<LoginResponse>>('/auth/login', credentials)
      if (!responseData.success || !responseData.data) {
        throw new Error(responseData.error || 'Login failed')
      }
      return responseData.data
    },
    onSuccess: (data) => {
      login(data.token, data.user)
    },
  })
}

export function useLogout() {
  const { logout } = useAuthStore()

  return useMutation({
    mutationFn: async () => {
      // No server-side logout endpoint; just clear local state
    },
    onSuccess: () => {
      localStorage.removeItem('auth_token')
      logout()
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login'
      }
    },
  })
}

export function useGetCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async (): Promise<User> => {
      const { data: responseData } = await api.get<ApiResponse<{ user: User }>>('/auth/me')
      if (!responseData.success || !responseData.data?.user) {
        throw new Error(responseData.error || 'Failed to get user')
      }
      return responseData.data.user
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}
