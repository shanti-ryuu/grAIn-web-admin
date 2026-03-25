import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

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
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/devices/register', payload)
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

export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch(`/users/${id}/status`, { status })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
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

export const useDeviceAnalytics = (deviceId: string) => {
  return useQuery({
    queryKey: ['analytics', 'device', deviceId],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/device/${deviceId}`)
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Alerts
export const useAlerts = () => {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/alerts')
        return data
      } catch (error: any) {
        // If endpoint doesn't exist (404), return empty array
        if (error.response?.status === 404) {
          return []
        }
        throw error
      }
    },
    staleTime: 2 * 60 * 1000,
  })
}

export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data } = await api.patch(`/alerts/${alertId}/acknowledge`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}
