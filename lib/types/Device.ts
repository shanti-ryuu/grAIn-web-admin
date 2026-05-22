import type { User } from './User'

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
