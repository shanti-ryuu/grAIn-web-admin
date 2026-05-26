import mongoose, { Document, Schema } from 'mongoose'
import { CommandStatus, CommandType, DryerMode, FanAction, FanTarget, StepperAction } from '@/lib/enums'

export interface ICommand extends Document {
  deviceId: string
  command: CommandType
  commandStr?: string
  mode: DryerMode
  temperature?: number
  fanSpeed?: number
  fanTarget?: FanTarget
  fanAction?: FanAction
  relayAction?: FanAction
  stepperAction?: StepperAction
  heaterAction?: FanAction
  status: CommandStatus
  polledAt?: Date
  acknowledgedAt?: Date
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
    required: true,
  },
  commandStr: {
    type: String,
    trim: true,
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
    enum: Object.values(FanTarget),
  },
  fanAction: {
    type: String,
    enum: Object.values(FanAction),
  },
  relayAction: {
    type: String,
    enum: Object.values(FanAction),
  },
  stepperAction: {
    type: String,
    enum: Object.values(StepperAction),
  },
  heaterAction: {
    type: String,
    enum: Object.values(FanAction),
  },
  status: {
    type: String,
    enum: Object.values(CommandStatus),
    default: CommandStatus.Pending,
  },
  polledAt: {
    type: Date,
  },
  executedAt: {
    type: Date,
  },
  acknowledgedAt: {
    type: Date,
  },
}, {
  timestamps: true,
})

// Index for faster queries
CommandSchema.index({ deviceId: 1, status: 1 })
CommandSchema.index({ deviceId: 1, status: 1, createdAt: 1 })
CommandSchema.index({ deviceId: 1, status: 1, polledAt: 1 })
CommandSchema.index({ createdAt: -1 })

export default mongoose.models.Command || mongoose.model<ICommand>('Command', CommandSchema)
