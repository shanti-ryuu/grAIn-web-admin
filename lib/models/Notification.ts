import mongoose, { Document, Schema } from 'mongoose'

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId
  deviceId?: string
  type: 'drying_complete' | 'alert_critical' | 'alert_warning' | 'device_offline' | 'session_started' | 'session_aborted'
  title: string
  body: string
  data?: Record<string, string>
  isRead: boolean
  sentViaFCM: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IFCMToken extends Document {
  userId: mongoose.Types.ObjectId
  token: string
  platform: 'web' | 'android' | 'ios'
  createdAt: Date
  updatedAt: Date
}

const NotificationSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  deviceId: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ['drying_complete', 'alert_critical', 'alert_warning', 'device_offline', 'session_started', 'session_aborted'],
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  body: {
    type: String,
    required: true,
    trim: true,
  },
  data: {
    type: Map,
    of: String,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  sentViaFCM: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
})

NotificationSchema.index({ userId: 1, createdAt: -1 })
NotificationSchema.index({ userId: 1, isRead: 1 })

const FCMTokenSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  platform: {
    type: String,
    enum: ['web', 'android', 'ios'],
    default: 'web',
  },
}, {
  timestamps: true,
})

FCMTokenSchema.index({ userId: 1 })

export const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema)
export const FCMToken = mongoose.models.FCMToken || mongoose.model<IFCMToken>('FCMToken', FCMTokenSchema)
