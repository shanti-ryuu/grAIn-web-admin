import mongoose, { Document, Schema } from 'mongoose'
import { CommandStatus, DeviceStatus, DryerMode, FanAction } from '@/lib/enums'

export interface IDevice extends Document {
  deviceId: string
  assignedUser: mongoose.Types.ObjectId
  status: DeviceStatus
  runtimeState?: {
    isRunning?: boolean
    currentMode?: DryerMode
    heaterState?: FanAction
    fan1State?: FanAction
    fan2State?: FanAction
    relayState?: FanAction
    stepperState?: 'ON' | 'OFF' | 'CW' | 'CCW'
    lastSeen?: Date
    activeCommand?: string | null
    pendingCommand?: string | null
    lastCommand?: string | null
    commandStatus?: 'idle' | CommandStatus
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
    enum: Object.values(DeviceStatus),
    default: DeviceStatus.Offline,
  },
  runtimeState: {
    isRunning: { type: Boolean, default: false },
    currentMode: { type: String, enum: Object.values(DryerMode), default: DryerMode.Manual },
    heaterState: { type: String, enum: Object.values(FanAction), default: FanAction.Off },
    fan1State: { type: String, enum: Object.values(FanAction), default: FanAction.Off },
    fan2State: { type: String, enum: Object.values(FanAction), default: FanAction.Off },
    relayState: { type: String, enum: Object.values(FanAction), default: FanAction.Off },
    stepperState: { type: String, enum: ['ON', 'OFF', 'CW', 'CCW'], default: 'OFF' },
    lastSeen: { type: Date, default: Date.now },
    activeCommand: { type: String, default: null },
    pendingCommand: { type: String, default: null },
    lastCommand: { type: String, default: null },
    commandStatus: {
      type: String,
      enum: ['idle', ...Object.values(CommandStatus)],
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
