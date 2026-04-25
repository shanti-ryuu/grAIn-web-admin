import mongoose, { Document, Schema } from 'mongoose'

export interface IDevice extends Document {
  deviceId: string
  assignedUser: mongoose.Types.ObjectId
  status: 'online' | 'offline'
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

export default mongoose.models.Device || mongoose.model<IDevice>('Device', DeviceSchema)