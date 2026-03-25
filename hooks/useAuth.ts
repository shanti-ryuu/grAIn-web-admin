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
    role: 'admin' | 'user'
  }
}

export interface User {
  id: string
  email: string
  name: string
  role: string
}

export function useLogin() {
  const { login } = useAuthStore()

  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<LoginResponse> => {
      const { data } = await api.post<LoginResponse>('/auth/login', credentials)
      return data
    },
    onSuccess: (data) => {
      // Store token in localStorage
      localStorage.setItem('auth_token', data.token)
      // Update Zustand store with both token and user
      login(data.token, data.user)
    },
  })
}

export function useLogout() {
  const { logout } = useAuthStore()

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout')
    },
    onSuccess: () => {
      // Clear token from localStorage
      localStorage.removeItem('auth_token')
      // Clear Zustand store
      logout()
      // Redirect to login page
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
      const { data } = await api.get<User>('/auth/me')
      return data
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
