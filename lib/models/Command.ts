import mongoose, { Document, Schema } from 'mongoose'

export interface ICommand extends Document {
  deviceId: string
  command: 'START' | 'STOP' | 'FAN_CONTROL' | 'RELAY_CONTROL' | 'STEPPER_CONTROL' | 'HEATER_CONTROL' | 'STATUS'
  commandStr?: string
  mode: 'AUTO' | 'MANUAL'
  temperature?: number
  fanSpeed?: number
  fanTarget?: 'FAN1' | 'FAN2' | 'ALL'
  fanAction?: 'ON' | 'OFF'
  relayAction?: 'ON' | 'OFF'
  stepperAction?: 'START' | 'STOP' | 'CW' | 'CCW'
  heaterAction?: 'ON' | 'OFF'
  status: 'pending' | 'executed' | 'failed' | 'error'
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
    enum: ['START', 'STOP', 'FAN_CONTROL', 'RELAY_CONTROL', 'STEPPER_CONTROL', 'HEATER_CONTROL', 'STATUS'],
    required: true,
  },
  commandStr: {
    type: String,
    trim: true,
  },
  mode: {
    type: String,
    enum: ['AUTO', 'MANUAL'],
    default: 'MANUAL',
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
  relayAction: {
    type: String,
    enum: ['ON', 'OFF'],
  },
  stepperAction: {
    type: String,
    enum: ['START', 'STOP', 'CW', 'CCW'],
  },
  heaterAction: {
    type: String,
    enum: ['ON', 'OFF'],
  },
  status: {
    type: String,
    enum: ['pending', 'executed', 'failed', 'error'],
    default: 'pending',
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
CommandSchema.index({ createdAt: -1 })

export default mongoose.models.Command || mongoose.model<ICommand>('Command', CommandSchema)
