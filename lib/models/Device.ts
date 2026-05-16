import mongoose, { Document, Schema } from 'mongoose'

export interface IDevice extends Document {
  deviceId: string
  assignedUser: mongoose.Types.ObjectId
  status: 'online' | 'offline'
  runtimeState?: {
    isRunning?: boolean
    currentMode?: 'AUTO' | 'MANUAL'
    heaterState?: 'ON' | 'OFF'
    fan1State?: 'ON' | 'OFF'
    fan2State?: 'ON' | 'OFF'
    relayState?: 'ON' | 'OFF'
    stepperState?: 'ON' | 'OFF' | 'CW' | 'CCW'
    lastSeen?: Date
    activeCommand?: string | null
    pendingCommand?: string | null
    lastCommand?: string | null
    commandStatus?: 'idle' | 'pending' | 'polled' | 'executing' | 'executed' | 'failed' | 'timeout' | 'error'
    commandAcknowledged?: boolean
    lastHeartbeat?: Date
    updatedAt?: Date
    currentTemperature?: number
    currentHumidity?: number
    currentMoisture?: number
    currentWeight?: number
  }
  location?: string
  lastActive: Date
  lastMoisture?: number
  createdAt: Date
  updatedAt: Date
}

const DeviceSchema: Schema = new Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  assignedUser: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline',
  },
  runtimeState: {
    isRunning: { type: Boolean, default: false },
    currentMode: { type: String, enum: ['AUTO', 'MANUAL'], default: 'MANUAL' },
    heaterState: { type: String, enum: ['ON', 'OFF'], default: 'OFF' },
    fan1State: { type: String, enum: ['ON', 'OFF'], default: 'OFF' },
    fan2State: { type: String, enum: ['ON', 'OFF'], default: 'OFF' },
    relayState: { type: String, enum: ['ON', 'OFF'], default: 'OFF' },
    stepperState: { type: String, enum: ['ON', 'OFF', 'CW', 'CCW'], default: 'OFF' },
    lastSeen: { type: Date, default: Date.now },
    activeCommand: { type: String, default: null },
    pendingCommand: { type: String, default: null },
    lastCommand: { type: String, default: null },
    commandStatus: {
      type: String,
      enum: ['idle', 'pending', 'polled', 'executing', 'executed', 'failed', 'timeout', 'error'],
      default: 'idle',
    },
    commandAcknowledged: { type: Boolean, default: true },
    lastHeartbeat: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    currentTemperature: { type: Number, default: 0 },
    currentHumidity: { type: Number, default: 0 },
    currentMoisture: { type: Number, default: 0 },
    currentWeight: { type: Number, default: 0 },
  },
  location: {
    type: String,
    trim: true,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
  lastMoisture: {
    type: Number,
    default: null,
  },
}, {
  timestamps: true,
})

// Index for faster queries
DeviceSchema.index({ assignedUser: 1 })
DeviceSchema.index({ status: 1 })
DeviceSchema.index({ lastActive: -1 })
DeviceSchema.index({ deviceId: 1, status: 1, lastActive: -1 })
DeviceSchema.index({ 'runtimeState.commandStatus': 1 })

export default mongoose.models.Device || mongoose.model<IDevice>('Device', DeviceSchema)
