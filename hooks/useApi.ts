'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
  timestamp: string
}

function unwrapResponse<T>(responseData: ApiResponse<T>): T {
  if (!responseData.success || responseData.data === undefined) {
    throw new Error(responseData.error || 'Request failed')
  }
  return responseData.data
}

// Auth
export const useLogin = () => {
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { data: responseData } = await api.post<ApiResponse<{ token: string; user: any; expiresIn: number }>>('/auth/login', credentials)
      return unwrapResponse(responseData)
    },
  })
}

export const useMe = () => {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data: responseData } = await api.get<ApiResponse<{ user: any }>>('/auth/me')
      return unwrapResponse(responseData).user
    },
    staleTime: 5 * 60 * 1000,
  })
}

export const useRegister = () => {
  return useMutation({
    mutationFn: async (payload: { name: string; email: string; password: string; role?: string }) => {
      const { data: responseData } = await api.post<ApiResponse<{ token: string; user: any }>>('/auth/register', payload)
      return unwrapResponse(responseData)
    },
  })
}

// Devices
export const useDevices = () => {
  return useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const { data: responseData } = await api.get<ApiResponse<any[]>>('/devices')
      return unwrapResponse(responseData)
    },
    staleTime: 5 * 60 * 1000,
  })
}

export const useDevice = (id: string) => {
  return useQuery({
    queryKey: ['device', id],
    queryFn: async () => {
      const { data: responseData } = await api.get<ApiResponse<any>>(`/devices/${id}`)
      return unwrapResponse(responseData)
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  })
}

export const useRegisterDevice = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { deviceId: string; assignedUser: string; location?: string }) => {
      const { data: responseData } = await api.post<ApiResponse<any>>('/devices', payload)
      return unwrapResponse(responseData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
    },
  })
}

// Users
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data: responseData } = await api.get<ApiResponse<any[]>>('/users')
      return unwrapResponse(responseData)
    },
    staleTime: 5 * 60 * 1000,
  })
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { name: string; email: string; password: string; role?: string }) => {
      const { data: responseData } = await api.post<ApiResponse<any>>('/users', payload)
      return unwrapResponse(responseData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data: responseData } = await api.patch<ApiResponse<any>>(`/users/${id}`, updates)
      return unwrapResponse(responseData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

// Sensor Data
export const useSensorData = (deviceId: string, hours: number = 24) => {
  return useQuery({
    queryKey: ['sensors', deviceId, hours],
    queryFn: async () => {
      const { data: responseData } = await api.get<ApiResponse<any[]>>(`/sensors/${deviceId}?hours=${hours}`)
      return unwrapResponse(responseData)
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!deviceId,
  })
}

// Commands
export const useStartDryer = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ deviceId, ...opts }: { deviceId: string; mode?: string; temperature?: number; fanSpeed?: number }) => {
      const { data: responseData } = await api.post<ApiResponse<any>>(`/dryer/${deviceId}/start`, opts)
      return unwrapResponse(responseData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      queryClient.invalidateQueries({ queryKey: ['commands'] })
    },
  })
}

export const useStopDryer = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (deviceId: string) => {
      const { data: responseData } = await api.post<ApiResponse<any>>(`/dryer/${deviceId}/stop`)
      return unwrapResponse(responseData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      queryClient.invalidateQueries({ queryKey: ['commands'] })
    },
  })
}

export const useCommandHistory = (deviceId?: string, limit: number = 20) => {
  return useQuery({
    queryKey: ['commands', deviceId, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit) })
      if (deviceId) params.set('deviceId', deviceId)
      const { data: responseData } = await api.get<ApiResponse<any[]>>(`/commands/history?${params}`)
      return unwrapResponse(responseData)
    },
    staleTime: 2 * 60 * 1000,
  })
}

// Analytics
export const useAnalyticsOverview = (period: string = 'weekly', deviceId: string = 'all') => {
  return useQuery({
    queryKey: ['analytics', 'overview', period, deviceId],
    queryFn: async () => {
      const params = new URLSearchParams({ period, deviceId })
      const { data: responseData } = await api.get<ApiResponse<any>>(`/analytics/overview?${params}`)
      return unwrapResponse(responseData)
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Alerts
export const useAlerts = (type?: string) => {
  return useQuery({
    queryKey: ['alerts', type],
    queryFn: async () => {
      const params = type ? `?type=${type}` : ''
      const { data: responseData } = await api.get<ApiResponse<any[]>>(`/alerts${params}`)
      return unwrapResponse(responseData)
    },
    staleTime: 2 * 60 * 1000,
  })
}

export const useMarkAlertRead = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data: responseData } = await api.patch<ApiResponse<any>>(`/alerts/${alertId}/read`)
      return unwrapResponse(responseData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}

export const useClearAllAlerts = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data: responseData } = await api.post<ApiResponse<any>>('/alerts/clear')
      return unwrapResponse(responseData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}
