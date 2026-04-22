import mongoose, { Document, Schema } from 'mongoose'

export interface IAlert extends Document {
  deviceId: string
  type: 'critical' | 'warning' | 'info'
  message: string
  severity: number
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}

const AlertSchema: Schema = new Schema({
  deviceId: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['critical', 'warning', 'info'],
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  severity: {
    type: Number,
    default: 0,
    min: 0,
    max: 10,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
})

// Index for faster queries
AlertSchema.index({ deviceId: 1, createdAt: -1 })
AlertSchema.index({ isRead: 1 })
AlertSchema.index({ type: 1 })

export default mongoose.models.Alert || mongoose.model<IAlert>('Alert', AlertSchema)
