export interface SensorData {
  _id: string
  id?: string
  deviceId: string
  temperature: number
  humidity: number
  moisture: number
  fanSpeed: number
  energy: number
  status: 'running' | 'idle' | 'paused' | 'error'
  solarVoltage?: number
  weight?: number
  timestamp: string
}
