export interface Command {
  _id: string
  id?: string
  deviceId: string
  command: string
  commandStr?: string
  mode?: 'AUTO' | 'MANUAL'
  temperature?: number
  fanSpeed?: number
  fanTarget?: string
  fanAction?: string
  relayAction?: string
  stepperAction?: string
  heaterAction?: string
  status: 'pending' | 'polled' | 'executed' | 'executing' | 'failed' | 'timeout' | 'error'
  executedAt?: string
  createdAt: string
}
