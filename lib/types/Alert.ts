export interface Alert {
  _id: string
  id?: string
  deviceId: string
  type: 'critical' | 'warning' | 'info'
  message: string
  severity: number
  isRead: boolean
  createdAt: string
}
