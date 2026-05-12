import { getRealtimeDb } from '@/lib/firebase-admin'

export const DEVICE_ONLINE_TIMEOUT_MS = 45_000

export interface DeviceLiveness {
  status: 'online' | 'offline'
  isOnline: boolean
  lastActive: Date | null
}

function toTimestampMs(value: unknown): number | null {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? value * 1000 : value
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function toDate(value: unknown): Date | null {
  const timestamp = toTimestampMs(value)
  return timestamp ? new Date(timestamp) : null
}

function isFresh(timestamp: number | null): boolean {
  return timestamp !== null && Date.now() - timestamp <= DEVICE_ONLINE_TIMEOUT_MS
}

export async function getDeviceLiveness(
  deviceId: string,
  fallback?: { status?: string; lastActive?: Date | string | number | null }
): Promise<DeviceLiveness> {
  try {
    const db = getRealtimeDb()
    if (db) {
      const snapshot = await db.ref(`grain/devices/${deviceId}`).get()
      const data = snapshot.val() as {
        status?: string
        lastActive?: number | string
        sensors?: { updatedAt?: number | string }
      } | null

      const lastActiveMs = toTimestampMs(data?.lastActive)
      const sensorUpdatedAtMs = toTimestampMs(data?.sensors?.updatedAt)
      const heartbeatMs = Math.max(lastActiveMs ?? 0, sensorUpdatedAtMs ?? 0)
      const online = data?.status === 'online' && isFresh(heartbeatMs || null)

      return {
        status: online ? 'online' : 'offline',
        isOnline: online,
        lastActive: heartbeatMs ? new Date(heartbeatMs) : toDate(fallback?.lastActive),
      }
    }
  } catch (error) {
    console.warn(`[Device Liveness] Firebase lookup failed for ${deviceId}:`, error)
  }

  const fallbackMs = toTimestampMs(fallback?.lastActive)
  const online = fallback?.status === 'online' && isFresh(fallbackMs)
  return {
    status: online ? 'online' : 'offline',
    isOnline: online,
    lastActive: toDate(fallback?.lastActive),
  }
}
