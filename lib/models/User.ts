import mongoose, { Document, Schema } from 'mongoose'
import { UserRole, UserStatus } from '@/lib/enums'

export interface IRevokedToken {
  token: string
  revokedAt: Date
}

export interface IRefreshToken {
  token: string
  createdAt: Date
  expiresAt: Date
}

export interface IUser extends Document {
  name: string
  email: string
  password: string
  role: UserRole
  status: UserStatus
  profileImage: string | null
  bio: string
  phoneNumber: string
  location: string
  revokedTokens: IRevokedToken[]
  refreshTokens: IRefreshToken[]
  createdAt: Date
  updatedAt: Date
}

const UserSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.Farmer,
  },
  status: {
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.Active,
  },
  profileImage: {
    type: String,
    default: null,
  },
  bio: {
    type: String,
    maxlength: 200,
    default: '',
  },
  phoneNumber: {
    type: String,
    default: '',
  },
  location: {
    type: String,
    default: '',
  },
  revokedTokens: {
    type: [{
      token: { type: String, required: true },
      revokedAt: { type: Date, default: Date.now },
    }],
    default: [],
  },
  refreshTokens: {
    type: [{
      token: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
      expiresAt: { type: Date, required: true },
    }],
    default: [],
  },
}, {
  timestamps: true,
})

UserSchema.index({ 'revokedTokens.revokedAt': 1 })
UserSchema.index({ 'refreshTokens.token': 1 }, { sparse: true })
UserSchema.index({ 'refreshTokens.expiresAt': 1 })

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
