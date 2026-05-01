'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'

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
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { data: responseData } = await api.post<ApiResponse<{ token: string; user: any; expiresIn: number }>>('/auth/login', credentials)
      return unwrapResponse(responseData)
    },
    onError: (error: any) => {
      toast({ title: 'Login Failed', description: error?.response?.data?.error || error.message, variant: 'destructive' })
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
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (payload: { name: string; email: string; password: string; role?: string }) => {
      const { data: responseData } = await api.post<ApiResponse<{ token: string; user: any }>>('/auth/register', payload)
      return unwrapResponse(responseData)
    },
    onSuccess: (data) => {
      toast({ title: 'User Created', description: `${data.user.name} created successfully` })
    },
    onError: (error: any) => {
      toast({ title: 'Registration Failed', description: error?.response?.data?.error || error.message, variant: 'destructive' })
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
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
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
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (payload: { deviceId: string; assignedUser: string; location?: string }) => {
      const { data: responseData } = await api.post<ApiResponse<any>>('/devices', payload)
      return unwrapResponse(responseData)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      toast({ title: 'Device Registered', description: `Device ${data.deviceId} registered successfully` })
    },
    onError: (error: any) => {
      toast({ title: 'Registration Failed', description: error?.response?.data?.error || error.message, variant: 'destructive' })
    },
  })
}

export const useUpdateDevice = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data: responseData } = await api.patch<ApiResponse<any>>(`/devices/${id}`, updates)
      return unwrapResponse(responseData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      toast({ title: 'Device Updated', description: 'Device updated successfully' })
    },
    onError: (error: any) => {
      toast({ title: 'Update Failed', description: error?.response?.data?.error || error.message, variant: 'destructive' })
    },
  })
}

export const useDeleteDevice = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: responseData } = await api.delete<ApiResponse<any>>(`/devices/${id}`)
      return unwrapResponse(responseData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      toast({ title: 'Device Deregistered', description: 'Device has been removed' })
    },
    onError: (error: any) => {
      toast({ title: 'Delete Failed', description: error?.response?.data?.error || error.message, variant: 'destructive' })
    },
  })
}

// Users
export const useUsers = (page?: number, limit?: number) => {
  const params = page !== undefined && limit !== undefined
    ? `?page=${page}&limit=${limit}`
    : '?limit=9999'
  return useQuery({
    queryKey: ['users', page ?? 'all', limit ?? 'all'],
    queryFn: async () => {
      const { data: responseData } = await api.get<ApiResponse<any>>(`/users${params}`)
      return unwrapResponse(responseData)
    },
    staleTime: 30_000,
    retry: 2,
  })
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (payload: { name: string; email: string; password: string; role?: string }) => {
      const { data: responseData } = await api.post<ApiResponse<any>>('/users', payload)
      return unwrapResponse(responseData)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({ title: 'User Created', description: `User ${data.name} created successfully` })
    },
    onError: (error: any) => {
      toast({ title: 'Creation Failed', description: error?.response?.data?.error || error.message, variant: 'destructive' })
    },
  })
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data: responseData } = await api.patch<ApiResponse<any>>(`/users/${id}`, updates)
      return unwrapResponse(responseData)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      if (variables.role) {
        toast({ title: 'User Updated', description: `Role changed to ${variables.role} successfully` })
      } else if (variables.status) {
        toast({ title: 'User Updated', description: `User is now ${variables.status}` })
      } else if (variables.password) {
        toast({ title: 'Password Changed', description: 'Password updated successfully' })
      } else {
        toast({ title: 'User Updated', description: 'User updated successfully' })
      }
    },
    onError: (error: any) => {
      toast({ title: 'Update Failed', description: error?.response?.data?.error || error.message, variant: 'destructive' })
    },
  })
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: responseData } = await api.delete<ApiResponse<any>>(`/users/${id}`)
      return unwrapResponse(responseData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({ title: 'User Deleted', description: 'User has been removed' })
    },
    onError: (error: any) => {
      toast({ title: 'Delete Failed', description: error?.response?.data?.error || error.message, variant: 'destructive' })
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
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    enabled: !!deviceId,
  })
}

// Commands
export const useStartDryer = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async ({ deviceId, ...opts }: { deviceId: string; mode?: string; temperature?: number; fanSpeed?: number }) => {
      const { data: responseData } = await api.post<ApiResponse<any>>(`/dryer/${deviceId}/start`, opts)
      return unwrapResponse(responseData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      queryClient.invalidateQueries({ queryKey: ['commands'] })
      toast({ title: 'Dryer Started', description: 'Dryer has been started successfully' })
    },
    onError: (error: any) => {
      toast({ title: 'Start Failed', description: error?.response?.data?.error || error.message, variant: 'destructive' })
    },
  })
}

export const useStopDryer = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (deviceId: string) => {
      const { data: responseData } = await api.post<ApiResponse<any>>(`/dryer/${deviceId}/stop`)
      return unwrapResponse(responseData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      queryClient.invalidateQueries({ queryKey: ['commands'] })
      toast({ title: 'Dryer Stopped', description: 'Dryer has been stopped successfully' })
    },
    onError: (error: any) => {
      toast({ title: 'Stop Failed', description: error?.response?.data?.error || error.message, variant: 'destructive' })
    },
  })
}

export function useControlFan() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({ deviceId, fan, action }: {
      deviceId: string;
      fan: 'FAN1' | 'FAN2' | 'ALL';
      action: 'ON' | 'OFF';
    }) =>
      api.post<ApiResponse<any>>(`/dryer/${deviceId}/fan`, { fan, action })
        .then(r => unwrapResponse(r.data)),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      queryClient.invalidateQueries({ queryKey: ['commands'] })
      toast({ title: 'Fan Control', description: `${variables.fan} turned ${variables.action.toLowerCase()}` })
    },
    onError: (error: any) => {
      toast({ title: 'Fan Control Failed', description: error?.response?.data?.error || error.message, variant: 'destructive' })
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
    staleTime: 20_000,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  })
}

export const useMarkAlertRead = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data: responseData } = await api.patch<ApiResponse<any>>(`/alerts/${alertId}/read`)
      return unwrapResponse(responseData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast({ title: 'Alert Read', description: 'Alert marked as read' })
    },
    onError: (error: any) => {
      toast({ title: 'Failed', description: error?.response?.data?.error || error.message, variant: 'destructive' })
    },
  })
}

export const useClearAllAlerts = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async () => {
      const { data: responseData } = await api.post<ApiResponse<any>>('/alerts/clear')
      return unwrapResponse(responseData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast({ title: 'Alerts Cleared', description: 'All alerts marked as read' })
    },
    onError: (error: any) => {
      toast({ title: 'Clear Failed', description: error?.response?.data?.error || error.message, variant: 'destructive' })
    },
  })
}

// AI Prediction
export const usePredictDrying = () => {
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (payload: { deviceId: string; temperature: number; humidity: number; moisture: number; fanSpeed: number; timeElapsed: number; solarVoltage?: number }) => {
      const { data: responseData } = await api.post<ApiResponse<any>>('/ai/predict', payload)
      return unwrapResponse(responseData)
    },
    onError: (error: any) => {
      toast({ title: 'Prediction Failed', description: error?.response?.data?.error || error.message, variant: 'destructive' })
    },
  })
}

// Predictions
export const usePredictions = (deviceId?: string) => {
  return useQuery({
    queryKey: ['predictions', deviceId],
    queryFn: async () => {
      const params = deviceId ? `?deviceId=${deviceId}` : ''
      const { data: responseData } = await api.get<ApiResponse<any[]>>(`/predictions${params}`)
      return unwrapResponse(responseData)
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    enabled: !!deviceId || deviceId === undefined,
  })
}

// Logout
export const useLogout = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async () => {
      const { data: responseData } = await api.post<ApiResponse<any>>('/auth/logout')
      return unwrapResponse(responseData)
    },
    onSuccess: () => {
      queryClient.clear()
      toast({ title: 'Logged Out', description: 'You have been logged out successfully' })
    },
    onError: (error: any) => {
      toast({ title: 'Logout Failed', description: error?.response?.data?.error || error.message, variant: 'destructive' })
    },
  })
}

// User Profile
export const useUserProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: responseData } = await api.get<ApiResponse<any>>('/users/profile')
      return unwrapResponse(responseData)
    },
    staleTime: 5 * 60 * 1000,
  })
}

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (payload: { name?: string; bio?: string; phoneNumber?: string; location?: string }) => {
      const { data: responseData } = await api.patch<ApiResponse<any>>('/users/profile', payload)
      return unwrapResponse(responseData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({ title: 'Profile Updated', description: 'Your profile has been updated' })
    },
    onError: (error: any) => {
      toast({ title: 'Update Failed', description: error?.response?.data?.error || error.message, variant: 'destructive' })
    },
  })
}

export const useUpdateAvatar = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (payload: { image: string }) => {
      const { data: responseData } = await api.post<ApiResponse<any>>('/users/profile/avatar', payload)
      return unwrapResponse(responseData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast({ title: 'Avatar Updated', description: 'Profile image updated' })
    },
    onError: (error: any) => {
      toast({ title: 'Avatar Failed', description: error?.response?.data?.error || error.message, variant: 'destructive' })
    },
  })
}

export const useBulkDeleteUsers = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data: responseData } = await api.delete<ApiResponse<any>>('/users/bulk', { data: { ids } })
      return unwrapResponse(responseData)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({ title: 'Users Deleted', description: `${data.deletedCount} user(s) have been permanently deleted` })
    },
    onError: (error: any) => {
      toast({ title: 'Bulk Delete Failed', description: error?.response?.data?.error || error.message, variant: 'destructive' })
    },
  })
}

export const useBulkDeleteDevices = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data: responseData } = await api.delete<ApiResponse<any>>('/devices/bulk', { data: { ids } })
      return unwrapResponse(responseData)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      toast({ title: 'Devices Deleted', description: `${data.deletedCount} device(s) have been deregistered` })
    },
    onError: (error: any) => {
      toast({ title: 'Bulk Delete Failed', description: error?.response?.data?.error || error.message, variant: 'destructive' })
    },
  })
}

export const useChangePassword = () => {
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
      const { data: responseData } = await api.post<ApiResponse<any>>('/users/change-password', payload)
      return unwrapResponse(responseData)
    },
    onSuccess: () => {
      toast({ title: 'Password Changed', description: 'Your password has been updated successfully' })
    },
    onError: (error: any) => {
      toast({ title: 'Change Failed', description: error?.response?.data?.error || error.message, variant: 'destructive' })
    },
  })
}
