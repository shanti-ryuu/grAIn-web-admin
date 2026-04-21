import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

// Auth
export const useLogin = () => {
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { data } = await api.post('/auth/login', credentials)
      return data
    },
  })
}

export const useMe = () => {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me')
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Devices
export const useDevices = () => {
  return useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const { data } = await api.get('/devices')
      return data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useDevice = (id: string) => {
  return useQuery({
    queryKey: ['device', id],
    queryFn: async () => {
      const { data } = await api.get(`/devices/${id}`)
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export const useRegisterDevice = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { deviceId: string; assignedUser: string; location?: string }) => {
      const { data } = await api.post('/devices', payload)
      return data
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
      const { data } = await api.get('/users')
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data } = await api.patch(`/users/${id}`, updates)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

// Sensor Data
export const useSensorData = (deviceId: string) => {
  return useQuery({
    queryKey: ['sensors', deviceId],
    queryFn: async () => {
      const { data } = await api.get(`/sensors/${deviceId}`)
      return data
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Commands
export const useStartDryer = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (deviceId: string) => {
      const { data } = await api.post(`/dryer/${deviceId}/start`)
      return data
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
      const { data } = await api.post(`/dryer/${deviceId}/stop`)
      return data
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
      const { data } = await api.get('/analytics/overview')
      return data
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
