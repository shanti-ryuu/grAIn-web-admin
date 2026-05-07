import { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export interface RateLimitOptions {
  windowMs: number
  maxRequests: number
  keyGenerator?: (req: NextRequest) => string
}

// ── Upstash Redis client (singleton) ──────────────────────────────────────────
let redis: Redis | null = null
function getRedis(): Redis | null {
  if (redis) return redis
  if (process.env.UPSTASH_REDIS_DISABLED === 'true') return null
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    console.warn('[rateLimit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set — falling back to in-memory')
    return null
  }
  redis = new Redis({ url, token })
  return redis
}

// ── In-memory fallback for dev / missing env vars ─────────────────────────────
const memoryStore = new Map<string, { count: number; resetTime: number }>()

function checkMemory(
  key: string,
  windowMs: number,
  maxRequests: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  let record = memoryStore.get(key)
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs }
    memoryStore.set(key, record)
    return { allowed: true, remaining: maxRequests - 1, resetTime: record.resetTime }
  }
  record.count++
  const allowed = record.count <= maxRequests
  const remaining = Math.max(0, maxRequests - record.count)
  return { allowed, remaining, resetTime: record.resetTime }
}

// Periodic cleanup of in-memory fallback
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of memoryStore.entries()) {
    if (now > v.resetTime) memoryStore.delete(k)
  }
}, 60 * 1000)

// ── Public API ────────────────────────────────────────────────────────────────
export async function checkRateLimit(
  req: NextRequest,
  options: RateLimitOptions
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (r) => r.headers.get('x-forwarded-for') || r.headers.get('x-real-ip') || 'unknown',
  } = options

  const key = keyGenerator(req)
  const r = getRedis()

  if (!r) {
    return checkMemory(key, windowMs, maxRequests)
  }

  try {
    const limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.fixedWindow(maxRequests, `${windowMs / 1000}s`),
      analytics: false,
    })

    const { success, remaining, reset } = await limiter.limit(key)
    return {
      allowed: success,
      remaining,
      resetTime: reset,
    }
  } catch (err) {
    console.warn('[rateLimit] Redis rate limit failed, falling back to in-memory:', (err as Error)?.message)
    redis = null // reset so next request retries Redis init
    return checkMemory(key, windowMs, maxRequests)
  }
}

/**
 * Predefined rate limit configurations
 */
export const RateLimits = {
  PUBLIC_API: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
  SENSOR_DATA: {
    windowMs: 10 * 1000,
    maxRequests: 5,
  },
  COMMAND: {
    windowMs: 60 * 1000,
    maxRequests: 20,
  },
  AUTH: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 20,
  },
} as const
