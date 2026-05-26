export interface DryingSession {
  _id: string
  id?: string
  deviceId: string
  userId: string
  status: 'active' | 'completed' | 'aborted'
  grainType: string
  startMoisture: number
  targetMoisture: number
  currentMoisture: number
  finalMoisture?: number
  totalEnergyUsed: number
  avgTemperature: number
  efficiency?: number
  startedAt: string
  completedAt?: string
  duration?: number
}
