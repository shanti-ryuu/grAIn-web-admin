import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import SensorData from '@/lib/models/SensorData'
import Device from '@/lib/models/Device'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { checkRateLimit, RateLimits } from '@/lib/utils/rateLimit'
import { validateSensorDataRequest, sanitizeString } from '@/lib/utils/validation'
import { syncSensorToFirebase } from '@/lib/utils/firebase-sync'
import { invalidateAnalyticsCache } from '@/lib/utils/analytics-cache'
import Alert from '@/lib/models/Alert'

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

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, RateLimits.PUBLIC_API)
    if (!rateLimit.allowed) {
      return errorResponse('Rate limit exceeded. Please reduce request frequency.', ErrorCodes.RATE_LIMIT, 429)
    }

    await dbConnect()

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

    const device = await Device.findOne({ deviceId })
    if (!device) {
      return errorResponse(`Device ${deviceId} not found`, ErrorCodes.DEVICE_NOT_FOUND, 404)
    }

    const [mongoResult, deviceUpdateResult, firebaseResult] = await Promise.allSettled([
      SensorData.create({
        deviceId,
        temperature: Number(temperature),
        humidity: Number(humidity),
        moisture: Number(moisture),
        fanSpeed: fanSpeed !== undefined ? Number(fanSpeed) : 0,
        energy: energy !== undefined ? Number(energy) : 0,
        status: status && ['running', 'idle', 'paused', 'error'].includes(status) ? sanitizeString(status) : 'idle',
        solarVoltage: solarVoltage !== undefined ? Number(solarVoltage) : 0,
        weight: weight !== undefined ? Number(weight) : 0,
        timestamp: new Date(),
      }),
      Device.findByIdAndUpdate(device._id, {
        status: 'online',
        lastActive: new Date(),
        lastMoisture: Number(moisture),
      }),
      syncSensorToFirebase(deviceId, {
        temperature: Number(temperature),
        humidity: Number(humidity),
        moisture: Number(moisture),
        fanSpeed: fanSpeed !== undefined ? Number(fanSpeed) : 0,
        energy: energy !== undefined ? Number(energy) : 0,
        status: status && ['running', 'idle', 'paused', 'error'].includes(status) ? status : 'idle',
        solarVoltage: solarVoltage !== undefined ? Number(solarVoltage) : 0,
        weight: weight !== undefined ? Number(weight) : 0,
      }),
    ])

    if (mongoResult.status === 'rejected') {
      console.error('Sensor data MongoDB save failed:', mongoResult.reason)
      return errorResponse('Failed to store sensor data', ErrorCodes.INTERNAL_ERROR, 500)
    }

    const sensorData = mongoResult.value

    await invalidateAnalyticsCache(deviceId)

    if (deviceUpdateResult.status === 'rejected') {
      console.warn('[Device Update Error] Failed to update device status:', deviceUpdateResult.reason)
    }
    const firebaseFailed = firebaseResult.status === 'rejected'
    if (firebaseFailed) {
      console.error('[Firebase Sync Failed] Sensor data Firebase sync failed:', firebaseResult.reason)
    }

    setImmediate(() => {
      void checkAndCreateAlerts(deviceId, {
        temperature: Number(temperature),
        humidity: Number(humidity),
        moisture: Number(moisture),
      }).catch((err: unknown) => console.error('[Alert Gen]', err))
    })

    const sensorPayload = {
      id: sensorData._id,
      deviceId: sensorData.deviceId,
      temperature: sensorData.temperature,
      humidity: sensorData.humidity,
      moisture: sensorData.moisture,
      fanSpeed: sensorData.fanSpeed,
      energy: sensorData.energy,
      status: sensorData.status,
      solarVoltage: sensorData.solarVoltage,
      weight: sensorData.weight,
      timestamp: sensorData.timestamp.toISOString(),
      createdAt: sensorData.createdAt.toISOString(),
    }

    return firebaseFailed
      ? successResponse(sensorPayload, { status: 201, warning: 'Realtime sync failed' })
      : successResponse(sensorPayload, 201)

  } catch (error) {
    console.error('Sensor data error:', error)
    return errorResponse('Failed to store sensor data', ErrorCodes.INTERNAL_ERROR, 500)
  }
}