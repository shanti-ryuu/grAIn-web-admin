import mongoose, { Document, Schema } from 'mongoose'

export interface ISensorData extends Document {
  deviceId: string
  sessionId?: string
  temperature: number
  humidity: number
  moisture: number
  fanSpeed: number
  energy: number
  status: 'running' | 'idle' | 'paused' | 'error'
  dryingStatus?: 'running' | 'idle' | 'completed'
  heaterStatus?: 'ON' | 'OFF'
  fan1Status?: 'ON' | 'OFF'
  fan2Status?: 'ON' | 'OFF'
  solarVoltage: number
  solarCurrent?: number
  weight: number
  isSimulated?: boolean
  simulationTag?: string
  timestamp: Date
  createdAt: Date
  updatedAt: Date
}

const SensorDataSchema: Schema = new Schema({
  deviceId: {
    type: String,
    required: true,
    trim: true,
  },
  sessionId: {
    type: String,
    trim: true,
    default: null,
  },
  temperature: {
    type: Number,
    required: true,
  },
  humidity: {
    type: Number,
    required: true,
  },
  moisture: {
    type: Number,
    required: true,
  },
  fanSpeed: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  energy: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ['running', 'idle', 'paused', 'error'],
    default: 'idle',
  },
  dryingStatus: {
    type: String,
    enum: ['running', 'idle', 'completed'],
    default: null,
  },
  heaterStatus: {
    type: String,
    enum: ['ON', 'OFF'],
    default: null,
  },
  fan1Status: {
    type: String,
    enum: ['ON', 'OFF'],
    default: null,
  },
  fan2Status: {
    type: String,
    enum: ['ON', 'OFF'],
    default: null,
  },
  solarVoltage: {
    type: Number,
    default: 0,
    min: 0,
  },
  solarCurrent: {
    type: Number,
    default: 0,
    min: 0,
  },
  weight: {
    type: Number,
    default: 0,
    min: 0,
  },
  isSimulated: {
    type: Boolean,
    default: false,
  },
  simulationTag: {
    type: String,
    trim: true,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
})

// Index for faster queries
SensorDataSchema.index({ deviceId: 1, timestamp: -1 })
SensorDataSchema.index({ timestamp: -1 })
SensorDataSchema.index({ deviceId: 1, isSimulated: 1, simulationTag: 1 })
SensorDataSchema.index({ sessionId: 1, timestamp: 1 })

export default mongoose.models.SensorData || mongoose.model<ISensorData>('SensorData', SensorDataSchema)
