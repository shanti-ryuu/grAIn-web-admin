import type { User } from './user.types'

export interface Device {
  _id: string
  id?: string
  deviceId: string
  location: string
  assignedUser?: string | User
  status: 'online' | 'offline'
  lastActive?: string
  lastMoisture?: number
  createdAt: string
  updatedAt?: string
  isOnline?: boolean
}

export interface RegisterDeviceInput {
  deviceId: string
  location: string
  assignedUser?: string
}

export interface UpdateDeviceInput {
  location?: string
  assignedUser?: string | null
}
