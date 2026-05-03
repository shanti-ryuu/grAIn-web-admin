import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import dbConnect from '@/lib/db'
import User, { IRevokedToken } from '@/lib/models/User'

export interface TokenPayload {
  userId: string
  email: string
  role: 'admin' | 'farmer'
  iat?: number
  exp?: number
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

/**
 * Extract and verify JWT token from request
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  return authHeader.substring(7)
}

/**
 * Decode JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload
    return decoded
  } catch (error) {
    console.warn('[verifyToken] Token verification failed:', error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Get user from request — with diagnostic logging + revoked token check
 */
export async function getUserFromRequest(request: NextRequest): Promise<TokenPayload | null> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader) {
    console.warn('[getUserFromRequest] No Authorization header')
    return null
  }

  if (!authHeader.startsWith('Bearer ')) {
    console.warn('[getUserFromRequest] Invalid header format:', authHeader.slice(0, 20))
    return null
  }

  const token = authHeader.slice(7)

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload

    // Check if token has been revoked
    try {
      await dbConnect()
      const user = await User.findById(decoded.userId)
      if (user && user.revokedTokens?.some((rt: IRevokedToken) => rt.token === token)) {
        console.warn('[getUserFromRequest] Token has been revoked')
        return null
      }
    } catch (dbError) {
      // If DB check fails, still allow the request (fail open for availability)
      console.warn('[getUserFromRequest] Revoked token check failed, allowing request:', dbError)
    }

    return decoded
  } catch (error) {
    console.warn('[getUserFromRequest] Token verification failed:', error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Generate JWT token
 */
export function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, expiresIn: number | string = '7d'): string {
  const opts = typeof expiresIn === 'number'
    ? { expiresIn } as jwt.SignOptions
    : { expiresIn: expiresIn as any }
  return jwt.sign(payload, JWT_SECRET, opts)
}
