import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import SensorData from '@/lib/models/SensorData'
import Device from '@/lib/models/Device'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { checkRateLimit, RateLimits } from '@/lib/utils/rateLimit'
import { validateSensorDataRequest } from '@/lib/utils/validation'
import { syncSensorToFirebase } from '@/lib/utils/firebase-sync'
import Alert from '@/lib/models/Alert'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
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

export async function POST(request: NextRequest) {
  try {
    // Check rate limit for ESP32 public endpoint
    const rateLimit = checkRateLimit(request, RateLimits.PUBLIC_API)
    if (!rateLimit.allowed) {
      const response = errorResponse(
        'Rate limit exceeded. Please reduce request frequency.',
        ErrorCodes.RATE_LIMIT,
        429
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    await dbConnect()

    const body = await request.json()

    // Log raw incoming data for IoT debugging
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_SENSORS === 'true') {
      console.log('[ESP32 RAW]', JSON.stringify(body, null, 2))
    }

    // Validate sensor data
    const validation = validateSensorDataRequest(body)
    if (!validation.valid) {
      const failedFields = Object.keys(validation.errors)
      const response = errorResponse(
        `Validation failed: ${failedFields.join(', ')}. Received: temp=${body.temperature}, hum=${body.humidity}, moisture=${body.moisture}`,
        ErrorCodes.INVALID_INPUT,
        400
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const { deviceId, temperature, humidity, moisture, fanSpeed, energy, status, solarVoltage, weight } = body

    // Check if device exists
    const device = await Device.findOne({ deviceId })
    if (!device) {
      const response = errorResponse(
        `Device ${deviceId} not found`,
        ErrorCodes.DEVICE_NOT_FOUND,
        404
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Create sensor data with ALL fields
    const sensorData = await SensorData.create({
      deviceId,
      temperature: Number(temperature),
      humidity: Number(humidity),
      moisture: Number(moisture),
      fanSpeed: fanSpeed !== undefined ? Number(fanSpeed) : 0,
      energy: energy !== undefined ? Number(energy) : 0,
      status: status && ['running', 'idle', 'paused', 'error'].includes(status) ? status : 'idle',
      solarVoltage: solarVoltage !== undefined ? Number(solarVoltage) : 0,
      weight: weight !== undefined ? Number(weight) : 0,
      timestamp: new Date(), // Ensure consistent timestamp
    })

    // Update device status to online, last active, and last moisture
    await Device.findByIdAndUpdate(device._id, {
      status: 'online',
      lastActive: new Date(),
      lastMoisture: Number(moisture),
    })

    // Sync sensor data to Firebase Realtime Database (non-blocking)
    try {
      await syncSensorToFirebase(deviceId, {
        temperature: Number(temperature),
        humidity: Number(humidity),
        moisture: Number(moisture),
        fanSpeed: fanSpeed !== undefined ? Number(fanSpeed) : 0,
        energy: energy !== undefined ? Number(energy) : 0,
        status: status && ['running', 'idle', 'paused', 'error'].includes(status) ? status : 'idle',
        solarVoltage: solarVoltage !== undefined ? Number(solarVoltage) : 0,
        weight: weight !== undefined ? Number(weight) : 0,
      })
    } catch (firebaseError) {
      // Don't fail the request if Firebase sync fails
      console.warn('Firebase sync failed:', firebaseError)
    }

    // Auto-generate alerts based on sensor thresholds (non-blocking)
    checkAndCreateAlerts(deviceId, {
      temperature: Number(temperature),
      humidity: Number(humidity),
      moisture: Number(moisture),
    }).catch((err: unknown) => console.error('[Alert generation failed]', err))

    const response = successResponse({
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
    }, 201)

    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Sensor data error:', error)
    const response = errorResponse(
      'Failed to store sensor data',
      ErrorCodes.INTERNAL_ERROR,
      500
    )
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}