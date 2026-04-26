import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import SensorData from '@/lib/models/SensorData'
import Device from '@/lib/models/Device'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { checkRateLimit, RateLimits } from '@/lib/utils/rateLimit'
import { validateSensorDataRequest } from '@/lib/utils/validation'
import { syncSensorToFirebase } from '@/lib/utils/firebase-sync'
import { DeviceStatus, SensorDataStatus } from '@/lib/enums'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
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

    // Validate sensor data
    const validation = validateSensorDataRequest(body)
    if (!validation.valid) {
      const response = errorResponse(
        Object.values(validation.errors).join('; '),
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
      status: status && [SensorDataStatus.Running, SensorDataStatus.Idle, SensorDataStatus.Paused, SensorDataStatus.Error].includes(status) ? status : SensorDataStatus.Idle,
      solarVoltage: solarVoltage !== undefined ? Number(solarVoltage) : 0,
      weight: weight !== undefined ? Number(weight) : 0,
      timestamp: new Date(), // Ensure consistent timestamp
    })

    // Update device status to online, last active, and last moisture
    await Device.findByIdAndUpdate(device._id, {
      status: DeviceStatus.Online,
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
        status: status && [SensorDataStatus.Running, SensorDataStatus.Idle, SensorDataStatus.Paused, SensorDataStatus.Error].includes(status) ? status : SensorDataStatus.Idle,
        solarVoltage: solarVoltage !== undefined ? Number(solarVoltage) : 0,
        weight: weight !== undefined ? Number(weight) : 0,
      })
    } catch (firebaseError) {
      // Don't fail the request if Firebase sync fails
      console.warn('Firebase sync failed:', firebaseError)
    }

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