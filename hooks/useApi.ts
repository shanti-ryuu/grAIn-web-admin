import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

// All API responses are wrapped in { success, data } or { success, error }
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
  timestamp: string
}

// Helper to unwrap the standardized API response
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

export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data: responseData } = await api.patch<ApiResponse<any>>(`/users/${id}`, updates)
      return unwrapResponse(responseData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

// Sensor Data (returns array from paginated response)
export const useSensorData = (deviceId: string) => {
  return useQuery({
    queryKey: ['sensors', deviceId],
    queryFn: async () => {
      const { data: responseData } = await api.get<ApiResponse<any[]> & { pagination?: any }>(`/sensors/${deviceId}`)
      return unwrapResponse(responseData)
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!deviceId, // Don't fetch if no deviceId
  })
}

// Commands
export const useStartDryer = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (deviceId: string) => {
      const { data: responseData } = await api.post<ApiResponse<any>>(`/dryer/${deviceId}/start`)
      return unwrapResponse(responseData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
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
    },
  })
}

// Analytics
export const useAnalyticsOverview = () => {
  return useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: async () => {
      const { data: responseData } = await api.get<ApiResponse<any>>('/analytics/overview')
      return unwrapResponse(responseData)
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Alerts (placeholder - not implemented yet)
export const useAlerts = () => {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      // TODO: Implement alerts API
      return []
    },
    staleTime: 5 * 60 * 1000,
  })
}
