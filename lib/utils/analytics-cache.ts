const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

const analyticsCache = new Map<string, { data: unknown; cachedAt: number }>()

/** Check cache for a given key. Returns cached data if still valid, or undefined. */
export function getAnalyticsCacheEntry(key: string): unknown | undefined {
  const cached = analyticsCache.get(key)
  if (!cached) return undefined
  if (Date.now() - cached.cachedAt >= CACHE_TTL_MS) {
    analyticsCache.delete(key)
    return undefined
  }
  return cached.data
}

/** Store aggregation result in cache. */
export function setAnalyticsCacheEntry(key: string, data: unknown): void {
  analyticsCache.set(key, { data, cachedAt: Date.now() })
}

export function invalidateAnalyticsCache(deviceId: string): void {
  const periods = ['daily', 'weekly', 'monthly']
  for (const period of periods) {
    analyticsCache.delete(`${deviceId}_${period}`)
  }
  // Also invalidate the "all devices" entries since aggregate data changed
  for (const period of periods) {
    analyticsCache.delete(`all_${period}`)
  }
}
