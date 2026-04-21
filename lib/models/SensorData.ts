import mongoose, { Document, Schema } from 'mongoose'

export interface ISensorData extends Document {
  deviceId: string
  temperature: number
  humidity: number
  moisture: number
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

export default mongoose.models.SensorData || mongoose.model<ISensorData>('SensorData', SensorDataSchema)