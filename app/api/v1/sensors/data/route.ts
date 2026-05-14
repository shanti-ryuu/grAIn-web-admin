import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import SensorData from '@/lib/models/SensorData'
import Device from '@/lib/models/Device'
import Command from '@/lib/models/Command'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { checkRateLimit, RateLimits } from '@/lib/utils/rateLimit'
import { validateSensorDataRequest, sanitizeString } from '@/lib/utils/validation'
import { markCommandExecuted, syncSensorToFirebase } from '@/lib/utils/firebase-sync'
import { invalidateAnalyticsCache } from '@/lib/utils/analytics-cache'
import Alert from '@/lib/models/Alert'
import DryingSession from '@/lib/models/DryingSession'
import { eventBroadcaster } from '@/lib/utils/event-stream'
import { sendNotificationToDeviceOwner } from '@/lib/utils/notifications'

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
    const runtimeStatus = status && ['running', 'idle', 'paused', 'error'].includes(status) ? sanitizeString(status) : 'idle'
    const numericFanSpeed = fanSpeed !== undefined ? Number(fanSpeed) : 0
    const isActuallyRunning = runtimeStatus === 'running' && numericFanSpeed > 0

    const device = await Device.findOne({ deviceId })
    if (!device) {
      return errorResponse(`Device ${deviceId} not found`, ErrorCodes.DEVICE_NOT_FOUND, 404)
    }

    const receivedAt = new Date()

    const [mongoResult, deviceUpdateResult, firebaseResult] = await Promise.allSettled([
      SensorData.create({
        deviceId,
        temperature: Number(temperature),
        humidity: Number(humidity),
        moisture: Number(moisture),
        fanSpeed: numericFanSpeed,
        energy: energy !== undefined ? Number(energy) : 0,
        status: runtimeStatus,
        solarVoltage: solarVoltage !== undefined ? Number(solarVoltage) : 0,
        weight: weight !== undefined ? Number(weight) : 0,
        timestamp: receivedAt,
      }),
      Device.findOneAndUpdate(
        { deviceId },
        {
          $set: {
            status: 'online',
            lastActive: receivedAt,
            lastMoisture: Number(moisture),
            'runtimeState.isRunning': isActuallyRunning,
            'runtimeState.lastSeen': receivedAt,
            'runtimeState.currentTemperature': Number(temperature),
            'runtimeState.currentHumidity': Number(humidity),
            'runtimeState.currentMoisture': Number(moisture),
            'runtimeState.currentWeight': weight !== undefined ? Number(weight) : 0,
          },
        },
        { new: true }
      ),
      syncSensorToFirebase(deviceId, {
        temperature: Number(temperature),
        humidity: Number(humidity),
        moisture: Number(moisture),
        fanSpeed: numericFanSpeed,
        energy: energy !== undefined ? Number(energy) : 0,
        status: runtimeStatus,
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

    // Broadcast real-time event via SSE
    eventBroadcaster.broadcast('sensor_update', {
      deviceId,
      temperature: Number(temperature),
      humidity: Number(humidity),
      moisture: Number(moisture),
      fanSpeed: fanSpeed !== undefined ? Number(fanSpeed) : 0,
      energy: energy !== undefined ? Number(energy) : 0,
      status: runtimeStatus,
      solarVoltage: solarVoltage !== undefined ? Number(solarVoltage) : 0,
      weight: weight !== undefined ? Number(weight) : 0,
      timestamp: new Date().toISOString(),
    })

    // Update active drying session for this device
    setImmediate(() => {
      void reconcileCommandFromSensor(deviceId, runtimeStatus, numericFanSpeed)
        .catch((err: unknown) => console.error('[Command Sensor Confirm]', err))
    })

    setImmediate(() => {
      void updateDryingSession(deviceId, {
        moisture: Number(moisture),
        temperature: Number(temperature),
        humidity: Number(humidity),
        fanSpeed: fanSpeed !== undefined ? Number(fanSpeed) : 0,
        energy: energy !== undefined ? Number(energy) : 0,
      }).catch((err: unknown) => console.error('[Session Update]', err))
    })

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
