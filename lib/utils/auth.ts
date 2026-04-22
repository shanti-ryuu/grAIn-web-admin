import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

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
  } catch {
    return null
  }
}

/**
 * Get user from request
 */
export function getUserFromRequest(request: NextRequest): TokenPayload | null {
  const token = getTokenFromRequest(request)
  if (!token) {
    return null
  }

  return verifyToken(token)
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
