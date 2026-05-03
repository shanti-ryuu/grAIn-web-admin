import mongoose, { Document, Schema } from 'mongoose'
import { CommandType, CommandStatus, DryerMode } from '@/lib/enums'

export interface ICommand extends Document {
  deviceId: string
  command: CommandType
  mode: DryerMode
  temperature?: number
  fanSpeed?: number
  status: CommandStatus
  command: 'START' | 'STOP' | 'FAN_CONTROL'
  mode: 'AUTO' | 'MANUAL'
  temperature?: number
  fanSpeed?: number
  fanTarget?: 'FAN1' | 'FAN2' | 'ALL'
  fanAction?: 'ON' | 'OFF'
  status: 'pending' | 'executed' | 'failed' | 'error'
  executedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const CommandSchema: Schema = new Schema({
  deviceId: {
    type: String,
    required: true,
    trim: true,
  },
  command: {
    type: String,
    enum: Object.values(CommandType),
    enum: ['START', 'STOP', 'FAN_CONTROL'],
    required: true,
  },
  mode: {
    type: String,
    enum: Object.values(DryerMode),
    default: DryerMode.Manual,
  },
  temperature: {
    type: Number,
  },
  fanSpeed: {
    type: Number,
    min: 0,
    max: 100,
  },
  fanTarget: {
    type: String,
    enum: ['FAN1', 'FAN2', 'ALL'],
  },
  fanAction: {
    type: String,
    enum: ['ON', 'OFF'],
  },
  status: {
    type: String,
    enum: Object.values(CommandStatus),
    default: CommandStatus.Pending,
  },
  executedAt: {
    type: Date,
  },
}, {
  timestamps: true,
})

// Index for faster queries
CommandSchema.index({ deviceId: 1, status: 1 })
CommandSchema.index({ createdAt: -1 })

export default mongoose.models.Command || mongoose.model<ICommand>('Command', CommandSchema)