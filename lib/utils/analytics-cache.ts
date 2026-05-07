import { Redis } from '@upstash/redis'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const CACHE_TTL_S = 300 // same, in seconds for Redis EX

// ── Upstash Redis client (singleton, shared with rateLimit) ────────────────────
let redis: Redis | null = null
function getRedis(): Redis | null {
  if (redis) return redis
  if (process.env.UPSTASH_REDIS_DISABLED === 'true') return null
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  redis = new Redis({ url, token })
  return redis
}

// ── In-memory fallback ────────────────────────────────────────────────────────
const memoryCache = new Map<string, { data: unknown; cachedAt: number }>()

function getMemory(key: string): unknown | undefined {
  const cached = memoryCache.get(key)
  if (!cached) return undefined
  if (Date.now() - cached.cachedAt >= CACHE_TTL_MS) {
    memoryCache.delete(key)
    return undefined
  }
  return cached.data
}

function setMemory(key: string, data: unknown): void {
  memoryCache.set(key, { data, cachedAt: Date.now() })
}

function invalidateMemory(deviceId: string): void {
  const periods = ['daily', 'weekly', 'monthly']
  for (const period of periods) {
    memoryCache.delete(`${deviceId}_${period}`)
    memoryCache.delete(`all_${period}`)
  }
}

// ── Public API (async, uses Redis when available) ─────────────────────────────
export async function getAnalyticsCacheEntry(key: string): Promise<unknown | undefined> {
  const r = getRedis()
  if (!r) return getMemory(key)

  try {
    const raw = await r.get(`analytics:${key}`)
    return raw ?? undefined
  } catch (err) {
    console.warn('[analytics-cache] Redis GET failed, falling back to memory:', (err as Error).message)
    return getMemory(key)
  }
}

export async function setAnalyticsCacheEntry(key: string, data: unknown): Promise<void> {
  const r = getRedis()
  if (!r) { setMemory(key, data); return }

  try {
    await r.set(`analytics:${key}`, JSON.stringify(data), { ex: CACHE_TTL_S })
  } catch (err) {
    console.warn('[analytics-cache] Redis SET failed, falling back to memory:', (err as Error).message)
    setMemory(key, data)
  }
}

export async function invalidateAnalyticsCache(deviceId: string): Promise<void> {
  invalidateMemory(deviceId)

  const r = getRedis()
  if (!r) return

  const periods = ['daily', 'weekly', 'monthly']
  const keys = [
    ...periods.map(p => `analytics:${deviceId}_${p}`),
    ...periods.map(p => `analytics:all_${p}`),
  ]

  try {
    await r.del(...keys)
  } catch (err) {
    console.warn('[analytics-cache] Redis DEL failed:', (err as Error).message)
  }
}
