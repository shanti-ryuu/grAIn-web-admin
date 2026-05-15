import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import SensorData from '@/lib/models/SensorData'
import Device from '@/lib/models/Device'
import Command from '@/lib/models/Command'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { validateSensorDataRequest, sanitizeString } from '@/lib/utils/validation'
import { markCommandExecuted, syncSensorToFirebase } from '@/lib/utils/firebase-sync'
import { invalidateAnalyticsCache } from '@/lib/utils/analytics-cache'
import Alert from '@/lib/models/Alert'
import DryingSession from '@/lib/models/DryingSession'
import { eventBroadcaster } from '@/lib/utils/event-stream'
import { sendNotificationToDeviceOwner } from '@/lib/utils/notifications'

const SENSOR_RATE_WINDOW_MS = 10_000
const SENSOR_RATE_MAX = 20
const sensorRateBuckets = new Map<string, { count: number; resetAt: number }>()

interface NormalizedSensorReading {
  deviceId: string
  temperature: number
  humidity: number
  moisture: number
  fanSpeed: number
  energy: number
  status: string
  solarVoltage: number
  weight: number
  isActuallyRunning: boolean
  receivedAt: Date
}

function getSensorClientKey(request: NextRequest, deviceId: string): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = request.headers.get('x-real-ip')
  return `${deviceId}:${forwardedFor ?? realIp ?? 'unknown'}`
}

function isSensorRateLimited(request: NextRequest, deviceId: string): boolean {
  const key = getSensorClientKey(request, deviceId)
  const now = Date.now()

  if (sensorRateBuckets.size > 500) {
    for (const [bucketKey, bucket] of sensorRateBuckets.entries()) {
      if (now > bucket.resetAt) sensorRateBuckets.delete(bucketKey)
    }
  }

  const bucket = sensorRateBuckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    sensorRateBuckets.set(key, { count: 1, resetAt: now + SENSOR_RATE_WINDOW_MS })
    return false
  }

  bucket.count += 1
  return bucket.count > SENSOR_RATE_MAX
}

async function reconcileCommandFromSensor(deviceId: string, runtimeStatus: string, fanSpeed: number): Promise<void> {
  const activeCommand = await Command.findOne({
    deviceId,
    status: { $in: ['polled', 'executing'] },
  }).sort({ createdAt: 1 }).lean()

  if (!activeCommand) return

  const hardwareCommand = activeCommand.commandStr ?? activeCommand.command
  const shouldComplete =
    activeCommand.command === 'STOP'
      ? runtimeStatus === 'idle' || fanSpeed === 0
      : activeCommand.command === 'START'
        ? runtimeStatus === 'running' || fanSpeed > 0
        : true

  if (!shouldComplete) return

  console.info(`[Command Sensor Confirmed] device=${deviceId} id=${activeCommand._id.toString()} command=${hardwareCommand}`)
  await markCommandExecuted(deviceId, activeCommand._id.toString(), 'executed')
}

async function checkAndCreateAlerts(deviceId: string, data: { temperature: number; humidity: number; moisture: number }): Promise<void> {
  const alerts: { deviceId: string; type: 'critical' | 'warning' | 'info'; message: string; severity: number }[] = []
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)

  const recentAlerts = await Alert.find({
    deviceId,
    createdAt: { $gte: thirtyMinAgo },
  }).select('message').lean()

  const hasRecent = (keyword: string) =>
    recentAlerts.some(a => a.message.toLowerCase().includes(keyword))

  if (data.temperature > 55 && !hasRecent('temperature')) {
    alerts.push({ deviceId, type: 'critical', message: `Temperature critical: ${data.temperature}°C (threshold: 55°C)`, severity: 9 })
  }
  if (data.humidity > 85 && !hasRecent('humidity')) {
    alerts.push({ deviceId, type: 'warning', message: `High humidity: ${data.humidity}% may slow drying`, severity: 6 })
  }
  if (data.moisture < 10 && !hasRecent('over-dried')) {
    alerts.push({ deviceId, type: 'warning', message: `Moisture ${data.moisture}% — grain may be over-dried (min: 10%)`, severity: 7 })
  }
  if (data.temperature < 0 && !hasRecent('sensor')) {
    alerts.push({ deviceId, type: 'critical', message: `Temperature sensor error: ${data.temperature}°C — check hardware`, severity: 10 })
  }

  if (alerts.length > 0) {
    await Alert.insertMany(alerts)
  }
}

async function updateDryingSession(deviceId: string, data: { moisture: number; temperature: number; humidity: number; fanSpeed: number; energy: number }): Promise<void> {
  const session = await DryingSession.findOne({ deviceId, status: 'active' })
  if (!session) return

  session.dataPoints += 1
  session.currentMoisture = data.moisture
  session.totalEnergyUsed += data.energy
  session.avgTemperature = ((session.avgTemperature * (session.dataPoints - 1)) + data.temperature) / session.dataPoints
  session.avgHumidity = ((session.avgHumidity * (session.dataPoints - 1)) + data.humidity) / session.dataPoints
  session.avgFanSpeed = ((session.avgFanSpeed * (session.dataPoints - 1)) + data.fanSpeed) / session.dataPoints
  await session.save()

  // Auto-complete if target moisture reached
  if (data.moisture <= session.targetMoisture && session.dataPoints >= 3) {
    const now = new Date()
    const duration = Math.round((now.getTime() - session.startedAt.getTime()) / 1000)
    const moistureDrop = session.startMoisture - data.moisture
    const efficiency = moistureDrop > 0
      ? Math.min(100, Math.round((moistureDrop / (session.startMoisture - session.targetMoisture)) * 100))
      : 0

    session.status = 'completed'
    session.completedAt = now
    session.duration = duration
    session.finalMoisture = data.moisture
    session.efficiency = efficiency
    await session.save()

    eventBroadcaster.broadcast('session_complete', {
      deviceId,
      sessionId: session._id.toString(),
      finalMoisture: data.moisture,
      duration,
      efficiency,
    })

    await sendNotificationToDeviceOwner(
      deviceId,
      'drying_complete',
      'Drying Complete!',
      `Target moisture reached (${data.moisture}%). Duration: ${Math.round(duration / 60)} min. Efficiency: ${efficiency}%`,
      { sessionId: session._id.toString() }
    )
  } else {
    eventBroadcaster.broadcast('session_update', {
      deviceId,
      sessionId: session._id.toString(),
      currentMoisture: data.moisture,
      targetMoisture: session.targetMoisture,
      dataPoints: session.dataPoints,
    })
  }
}

async function persistSensorReading(reading: NormalizedSensorReading): Promise<void> {
  await dbConnect()

  const deviceUpdate = await Device.findOneAndUpdate(
    { deviceId: reading.deviceId },
    {
      $set: {
        status: 'online',
        lastActive: reading.receivedAt,
        lastMoisture: reading.moisture,
        'runtimeState.isRunning': reading.isActuallyRunning,
        'runtimeState.lastSeen': reading.receivedAt,
        'runtimeState.currentTemperature': reading.temperature,
        'runtimeState.currentHumidity': reading.humidity,
        'runtimeState.currentMoisture': reading.moisture,
        'runtimeState.currentWeight': reading.weight,
      },
    },
    { returnDocument: 'after' }
  )

  if (!deviceUpdate) {
    console.warn(`[Sensor Persist Skipped] device=${reading.deviceId} not registered`)
    return
  }

  await SensorData.create({
    deviceId: reading.deviceId,
    temperature: reading.temperature,
    humidity: reading.humidity,
    moisture: reading.moisture,
    fanSpeed: reading.fanSpeed,
    energy: reading.energy,
    status: reading.status,
    solarVoltage: reading.solarVoltage,
    weight: reading.weight,
    timestamp: reading.receivedAt,
  })

  eventBroadcaster.broadcast('sensor_update', {
    deviceId: reading.deviceId,
    temperature: reading.temperature,
    humidity: reading.humidity,
    moisture: reading.moisture,
    fanSpeed: reading.fanSpeed,
    energy: reading.energy,
    status: reading.status,
    solarVoltage: reading.solarVoltage,
    weight: reading.weight,
    timestamp: reading.receivedAt.toISOString(),
  })

  void syncSensorToFirebase(reading.deviceId, {
    temperature: reading.temperature,
    humidity: reading.humidity,
    moisture: reading.moisture,
    fanSpeed: reading.fanSpeed,
    energy: reading.energy,
    status: reading.status,
    solarVoltage: reading.solarVoltage,
    weight: reading.weight,
  }).catch((err: unknown) => console.error('[Firebase Sync Failed] Sensor data Firebase sync failed:', err))

  void invalidateAnalyticsCache(reading.deviceId)
    .catch((err: unknown) => console.error('[Analytics Cache Invalidate]', err))

  void reconcileCommandFromSensor(reading.deviceId, reading.status, reading.fanSpeed)
    .catch((err: unknown) => console.error('[Command Sensor Confirm]', err))

  void updateDryingSession(reading.deviceId, {
    moisture: reading.moisture,
    temperature: reading.temperature,
    humidity: reading.humidity,
    fanSpeed: reading.fanSpeed,
    energy: reading.energy,
  }).catch((err: unknown) => console.error('[Session Update]', err))

  void checkAndCreateAlerts(reading.deviceId, {
    temperature: reading.temperature,
    humidity: reading.humidity,
    moisture: reading.moisture,
  }).catch((err: unknown) => console.error('[Alert Gen]', err))
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now()

  try {
    const body = await request.json()

    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_SENSORS === 'true') {
      console.log('[ESP32 RAW]', JSON.stringify(body, null, 2))
    }

    const validation = validateSensorDataRequest(body)
    if (!validation.valid) {
      const failedFields = Object.keys(validation.errors)
      return errorResponse(
        `Validation failed: ${failedFields.join(', ')}. Received: temp=${body.temperature}, hum=${body.humidity}, moisture=${body.moisture}`,
        ErrorCodes.INVALID_INPUT,
        400
      )
    }

    const { deviceId, temperature, humidity, moisture, fanSpeed, energy, status, solarVoltage, weight } = body
    if (isSensorRateLimited(request, String(deviceId))) {
      return errorResponse('Rate limit exceeded. Please reduce request frequency.', ErrorCodes.RATE_LIMIT, 429)
    }

    const numericTemperature = Number(temperature)
    const numericHumidity = Number(humidity)
    const numericMoisture = Number(moisture)
    const runtimeStatus = status && ['running', 'idle', 'paused', 'error'].includes(status) ? sanitizeString(status) : 'idle'
    const numericFanSpeed = fanSpeed !== undefined ? Number(fanSpeed) : 0
    const numericEnergy = energy !== undefined ? Number(energy) : 0
    const numericSolarVoltage = solarVoltage !== undefined ? Number(solarVoltage) : 0
    const numericWeight = weight !== undefined ? Number(weight) : 0
    const isActuallyRunning = runtimeStatus === 'running' && numericFanSpeed > 0
    const receivedAt = new Date()
    const reading: NormalizedSensorReading = {
      deviceId,
      temperature: numericTemperature,
      humidity: numericHumidity,
      moisture: numericMoisture,
      fanSpeed: numericFanSpeed,
      energy: numericEnergy,
      status: runtimeStatus,
      solarVoltage: numericSolarVoltage,
      weight: numericWeight,
      isActuallyRunning,
      receivedAt,
    }

    setImmediate(() => {
      void persistSensorReading(reading)
        .catch((err: unknown) => console.error('[Sensor Persist Failed]', err))
    })

    const sensorPayload = {
      accepted: true,
      deviceId,
      temperature: numericTemperature,
      humidity: numericHumidity,
      moisture: numericMoisture,
      fanSpeed: numericFanSpeed,
      energy: numericEnergy,
      status: runtimeStatus,
      solarVoltage: numericSolarVoltage,
      weight: numericWeight,
      timestamp: receivedAt.toISOString(),
    }

    const durationMs = Date.now() - startedAt
    if (durationMs > 1500) {
      console.warn(`[Sensor Ingest Slow] device=${deviceId} durationMs=${durationMs}`)
    }

    return successResponse(sensorPayload, 202)

  } catch (error) {
    console.error('Sensor data error:', error)
    return errorResponse('Failed to store sensor data', ErrorCodes.INTERNAL_ERROR, 500)
  }
}
