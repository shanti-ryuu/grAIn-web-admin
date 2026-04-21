/**
 * grAIn Mobile App - API Client Library
 * 
 * This library provides a unified interface for the React Expo app to interact with the grAIn backend.
 * 
 * Installation (for React Expo):
 * 1. Copy this file to your Expo project
 * 2. Install dependencies: expo-secure-store, axios
 * 3. Import and use throughout your app
 * 
 * Usage:
 * ```typescript
 * import { grainApi } from './api/grain-api'
 * 
 * // Login
 * const user = await grainApi.auth.login(email, password)
 * 
 * // Get sensor data
 * const data = await grainApi.sensors.getData(deviceId, { page: 1 })
 * 
 * // Control device
 * await grainApi.device.startDryer(deviceId)
 * ```
 */

import axios, { AxiosInstance, AxiosError } from 'axios'
import * as SecureStore from 'expo-secure-store'

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'farmer'
  status?: string
}

export interface SensorData {
  id: string
  deviceId: string
  temperature: number
  humidity: number
  moisture: number
  timestamp: string
  createdAt: string
}

export interface Device {
  id: string
  deviceId: string
  status: 'online' | 'offline'
  location?: string
  lastActive: string
  createdAt: string
  updatedAt?: string
}

export interface Command {
  id: string
  deviceId: string
  command: 'START' | 'STOP'
  mode: 'MANUAL' | 'AUTO'
  status: 'pending' | 'executed'
  createdAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    count: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
  timestamp: string
}

export interface ApiError {
  message: string
  code: string
  status: number
}

class GrainApiClient {
  private client: AxiosInstance
  private baseURL: string

  constructor(baseURL: string = 'http://localhost:3000/api') {
    this.baseURL = baseURL

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    })

    // Add token to all requests
    this.client.interceptors.request.use(
      async (config) => {
        const token = await this.getStoredToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(this.handleError(error))
    )

    // Handle responses
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          await this.clearToken()
          // You can emit an event here to redirect to login
          console.warn('Authentication failed - token cleared')
        }
        return Promise.reject(this.handleError(error))
      }
    )
  }

  private async getStoredToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('grain_auth_token')
    } catch {
      return null
    }
  }

  private async setStoredToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync('grain_auth_token', token)
    } catch (error) {
      console.error('Failed to store token:', error)
    }
  }

  private async clearToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('grain_auth_token')
    } catch (error) {
      console.error('Failed to clear token:', error)
    }
  }

  private handleError(error: AxiosError<ApiResponse<any>>): ApiError {
    const response = error.response?.data

    return {
      message: response?.error || error.message || 'Unknown error',
      code: response?.errorCode || 'UNKNOWN_ERROR',
      status: error.response?.status || 500,
    }
  }

  /**
   * Authentication API
   */
  auth = {
    login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
      try {
        const response = await this.client.post<ApiResponse<{ token: string; user: User; expiresIn: number }>>(
          '/auth/login',
          { email, password }
        )

        if (response.data.data) {
          await this.setStoredToken(response.data.data.token)
          return response.data.data
        }

        throw new Error('Invalid login response')
      } catch (error) {
        throw this.handleError(error as AxiosError)
      }
    },

    getCurrentUser: async (): Promise<User> => {
      try {
        const response = await this.client.get<ApiResponse<{ user: User }>>('/auth/me')

        if (response.data.data?.user) {
          return response.data.data.user
        }

        throw new Error('Invalid user response')
      } catch (error) {
        throw this.handleError(error as AxiosError)
      }
    },

    logout: async (): Promise<void> => {
      await this.clearToken()
    },

    isAuthenticated: async (): Promise<boolean> => {
      try {
        const token = await this.getStoredToken()
        return !!token
      } catch {
        return false
      }
    },
  }

  /**
   * Sensors API
   */
  sensors = {
    getData: async (
      deviceId: string,
      options?: { page?: number; limit?: number; hours?: number }
    ): Promise<PaginatedResponse<SensorData>> => {
      try {
        const params = {
          page: options?.page || 1,
          limit: options?.limit || 50,
          hours: options?.hours || 24,
        }

        const response = await this.client.get<
          ApiResponse<SensorData[]> & { pagination: any }
        >(`/sensors/${deviceId}`, { params })

        if (response.data.data) {
          return {
            data: response.data.data,
            pagination: response.data.pagination,
          }
        }

        throw new Error('Invalid sensor data response')
      } catch (error) {
        throw this.handleError(error as AxiosError)
      }
    },

    getLatestData: async (deviceId: string): Promise<SensorData | null> => {
      try {
        const response = await this.sensors.getData(deviceId, { limit: 1 })
        return response.data[0] || null
      } catch (error) {
        throw this.handleError(error as AxiosError)
      }
    },

    postData: async (deviceId: string, data: { temperature: number; humidity: number; moisture: number }): Promise<SensorData> => {
      try {
        const response = await this.client.post<ApiResponse<SensorData>>('/sensors/data', {
          deviceId,
          ...data,
        })

        if (response.data.data) {
          return response.data.data
        }

        throw new Error('Invalid post response')
      } catch (error) {
        throw this.handleError(error as AxiosError)
      }
    },
  }

  /**
   * Device Control API
   */
  device = {
    startDryer: async (deviceId: string): Promise<Command> => {
      try {
        const response = await this.client.post<ApiResponse<Command>>(
          `/dryer/${deviceId}/start`,
          {}
        )

        if (response.data.data) {
          return response.data.data
        }

        throw new Error('Invalid start response')
      } catch (error) {
        throw this.handleError(error as AxiosError)
      }
    },

    stopDryer: async (deviceId: string): Promise<Command> => {
      try {
        const response = await this.client.post<ApiResponse<Command>>(
          `/dryer/${deviceId}/stop`,
          {}
        )

        if (response.data.data) {
          return response.data.data
        }

        throw new Error('Invalid stop response')
      } catch (error) {
        throw this.handleError(error as AxiosError)
      }
    },

    getCommands: async (deviceId: string): Promise<Command[]> => {
      try {
        const response = await this.client.get<
          ApiResponse<{ commands: Command[]; count: number }>
        >(`/commands/${deviceId}`)

        if (response.data.data?.commands) {
          return response.data.data.commands
        }

        throw new Error('Invalid commands response')
      } catch (error) {
        throw this.handleError(error as AxiosError)
      }
    },

    list: async (options?: { page?: number; limit?: number }): Promise<PaginatedResponse<Device>> => {
      try {
        const params = {
          page: options?.page || 1,
          limit: options?.limit || 50,
        }

        const response = await this.client.get<
          ApiResponse<Device[]> & { pagination: any }
        >('/devices', { params })

        if (response.data.data) {
          return {
            data: response.data.data,
            pagination: response.data.pagination,
          }
        }

        throw new Error('Invalid devices response')
      } catch (error) {
        throw this.handleError(error as AxiosError)
      }
    },

    getDetails: async (id: string): Promise<Device> => {
      try {
        const response = await this.client.get<ApiResponse<Device>>(`/devices/${id}`)

        if (response.data.data) {
          return response.data.data
        }

        throw new Error('Invalid device response')
      } catch (error) {
        throw this.handleError(error as AxiosError)
      }
    },
  }

  /**
   * Health check
   */
  health = {
    check: async (): Promise<boolean> => {
      try {
        const response = await this.client.get('/health')
        return response.status === 200
      } catch {
        return false
      }
    },
  }
}

// Export singleton instance
export const grainApi = new GrainApiClient(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api')

// Export types for TypeScript projects
export type { GrainApiClient }
