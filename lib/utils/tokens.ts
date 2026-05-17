import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import dbConnect from '@/lib/db'
import User from '@/lib/models/User'
import { TokenPayload } from '@/lib/utils/auth'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_BYTES = 64
const REFRESH_TOKEN_EXPIRY_DAYS = 30

/**
 * Generate a short-lived JWT access token (15 min).
 */
export function generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY })
}

/**
 * Generate a long-lived opaque refresh token (64-byte hex, 30-day expiry).
 * Stores the token in User.refreshTokens array.
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  await dbConnect()
  await User.findByIdAndUpdate(userId, {
    $push: {
      refreshTokens: { token, createdAt: now, expiresAt },
    },
  })

  return token
}

/**
 * Verify a refresh token: find the User where refreshTokens.token === token
 * and expiresAt > now. Returns the user document (or null).
 * Also cleans up expired refresh tokens for this user.
 */
export async function verifyRefreshToken(token: string) {
  await dbConnect()
  const now = new Date()

  const user = await User.findOne({
    'refreshTokens.token': token,
    'refreshTokens.expiresAt': { $gt: now },
  })

  if (!user) return null

  // Cleanup expired refresh tokens for this user
  await User.findByIdAndUpdate(user._id, {
    $pull: { refreshTokens: { expiresAt: { $lte: now } } },
  })

  return user
}

/**
 * Remove a specific refresh token from a user's refreshTokens array.
 */
export async function revokeRefreshToken(userId: string, token: string): Promise<void> {
  await dbConnect()
  await User.findByIdAndUpdate(userId, {
    $pull: { refreshTokens: { token } },
  })
}
