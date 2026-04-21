import { NextRequest } from 'next/server'

/**
 * Simple in-memory rate limiter
 * Note: For production, use Redis or similar distributed cache
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  keyGenerator?: (req: NextRequest) => string // Custom key generator
}

/**
 * Check if request exceeds rate limit
 */
export function checkRateLimit(
  req: NextRequest,
  options: RateLimitOptions
): { allowed: boolean; remaining: number; resetTime: number } {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (r) => r.headers.get('x-forwarded-for') || r.headers.get('x-real-ip') || 'unknown',
  } = options

  const key = keyGenerator(req)
  const now = Date.now()

  let record = rateLimitStore.get(key)

  // Create new record or reset if window expired
  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs,
    }
    rateLimitStore.set(key, record)
    return { allowed: true, remaining: maxRequests - 1, resetTime: record.resetTime }
  }

  // Increment count
  record.count++

  const allowed = record.count <= maxRequests
  const remaining = Math.max(0, maxRequests - record.count)

  return { allowed, remaining, resetTime: record.resetTime }
}

/**
 * Cleanup old entries (call periodically)
 */
export function cleanupRateLimitStore() {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Cleanup every hour
setInterval(cleanupRateLimitStore, 60 * 60 * 1000)

/**
 * Predefined rate limit configurations
 */
export const RateLimits = {
  // Public endpoints (ESP32 posting data)
  PUBLIC_API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },
  // Sensor data polling (mobile app)
  SENSOR_DATA: {
    windowMs: 10 * 1000, // 10 seconds
    maxRequests: 5, // 5 requests per 10 seconds per device
  },
  // Command endpoints
  COMMAND: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 commands per minute
  },
  // Auth endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20, // 20 login attempts per 15 minutes
  },
} as const
