import mongoose, { Document, Schema } from 'mongoose'

export interface IDryingSession extends Document {
  deviceId: string
  userId: mongoose.Types.ObjectId
  status: 'active' | 'completed' | 'aborted'
  grainType: string
  startMoisture: number
  targetMoisture: number
  currentMoisture: number
  finalMoisture?: number
  startWeight: number
  finalWeight?: number
  totalEnergyUsed: number
  avgTemperature: number
  avgHumidity: number
  avgFanSpeed: number
  dataPoints: number
  startedAt: Date
  completedAt?: Date
  duration?: number
  efficiency?: number
  isSimulated?: boolean
  simulationTag?: string
  createdAt: Date
  updatedAt: Date
}

const DryingSessionSchema: Schema = new Schema({
  deviceId: {
    type: String,
    required: true,
    trim: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'aborted'],
    default: 'active',
  },
  grainType: {
    type: String,
    trim: true,
    default: 'rice',
  },
  startMoisture: {
    type: Number,
    required: true,
  },
  targetMoisture: {
    type: Number,
    default: 14,
  },
  currentMoisture: {
    type: Number,
    required: true,
  },
  finalMoisture: {
    type: Number,
  },
  startWeight: {
    type: Number,
    default: 0,
  },
  finalWeight: {
    type: Number,
  },
  totalEnergyUsed: {
    type: Number,
    default: 0,
  },
  avgTemperature: {
    type: Number,
    default: 0,
  },
  avgHumidity: {
    type: Number,
    default: 0,
  },
  avgFanSpeed: {
    type: Number,
    default: 0,
  },
  dataPoints: {
    type: Number,
    default: 0,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
  duration: {
    type: Number,
  },
  efficiency: {
    type: Number,
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
}, {
  timestamps: true,
})

DryingSessionSchema.index({ deviceId: 1, status: 1 })
DryingSessionSchema.index({ userId: 1, createdAt: -1 })
DryingSessionSchema.index({ startedAt: -1 })
DryingSessionSchema.index({ deviceId: 1, isSimulated: 1, simulationTag: 1 })

export default mongoose.models.DryingSession || mongoose.model<IDryingSession>('DryingSession', DryingSessionSchema)
