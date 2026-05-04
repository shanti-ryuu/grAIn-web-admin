import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import SensorData from '@/lib/models/SensorData'
import Device from '@/lib/models/Device'
import { paginatedResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { getUserFromRequest } from '@/lib/utils/auth'
import { getQueryParams, isValidDeviceId } from '@/lib/utils/validation'
import { checkRateLimit, RateLimits } from '@/lib/utils/rateLimit'

// Lean sensor document with dynamic keys for field projection
type LeanSensorDoc = {
  _id: string
  deviceId: string
  [key: string]: unknown
}

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    // Check rate limit for sensor data polling
    const rateLimit = checkRateLimit(request, RateLimits.SENSOR_DATA)
    if (!rateLimit.allowed) {
      const response = errorResponse(
        'Rate limit exceeded. Please reduce polling frequency.',
        ErrorCodes.RATE_LIMIT,
        429
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    await dbConnect()

    // Verify authentication
    const user = await getUserFromRequest(request)
    if (!user) {
      const response = errorResponse(
        'Unauthorized: Missing or invalid token',
        ErrorCodes.UNAUTHORIZED,
        401
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const { deviceId } = await params

    // Validate device ID
    if (!isValidDeviceId(deviceId)) {
      const response = errorResponse(
        'Invalid device ID format',
        ErrorCodes.INVALID_INPUT,
        400
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Check if device exists and user can access it
    const device = await Device.findOne({ deviceId })
    if (!device) {
      const response = errorResponse(
        `Device ${deviceId} not found`,
        ErrorCodes.DEVICE_NOT_FOUND,
        404
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Check access control
    if (user.role !== 'admin' && device.assignedUser?.toString() !== user.userId) {
      const response = errorResponse(
        'Forbidden: You do not have access to this device',
        ErrorCodes.FORBIDDEN,
        403
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Parse pagination parameters (cap limit at 500 to prevent accidental large queries)
    const MAX_SENSOR_LIMIT = 500
    const { page, limit: rawLimit, skip } = getQueryParams(request, { page: 1, limit: 100 })
    const limit = Math.min(rawLimit, MAX_SENSOR_LIMIT)

    // Parse optional time filter
    const searchParams = request.nextUrl.searchParams
    const hoursParam = parseInt(searchParams.get('hours') || '24', 10)
    const hours = Math.min(Math.max(1, hoursParam), 720) // 1-720 hours (30 days)

    // Parse optional field projection (?fields=temperature,humidity,moisture,timestamp)
    const fieldsParam = searchParams.get('fields')
    const allowedFields = ['temperature', 'humidity', 'moisture', 'fanSpeed', 'energy', 'status', 'solarVoltage', 'weight', 'timestamp']
    const selectFields = fieldsParam
      ? fieldsParam.split(',').filter(f => allowedFields.includes(f)).join(' ')
      : 'temperature humidity moisture timestamp -_id'

    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000)

    // Get total count
    const total = await SensorData.countDocuments({
      deviceId,
      timestamp: { $gte: hoursAgo },
    })

    // Get paginated sensor data with field projection and index hint
    const sensorData = await SensorData.find({
      deviceId,
      timestamp: { $gte: hoursAgo },
    })
      .select(selectFields)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .hint({ deviceId: 1, timestamp: -1 })
      .lean()

    // Format response — only include projected fields
    const formattedData = sensorData.map((data: LeanSensorDoc) => {
      const entry: Record<string, unknown> = { id: data._id, deviceId: data.deviceId }
      for (const key of Object.keys(data)) {
        if (key === '_id' || key === 'deviceId' || key === '__v') continue
        if (key === 'timestamp' || key === 'createdAt') {
          const val = data[key] as Date | null | undefined
          entry[key] = val?.toISOString?.() ?? data[key]
        } else {
          entry[key] = data[key]
        }
      }
      return entry
    })

    const response = paginatedResponse(formattedData, total, page, limit)
    response.headers.set('Cache-Control', 'private, max-age=60')
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Get sensor data error:', error)
    const response = errorResponse(
      'Failed to retrieve sensor data',
      ErrorCodes.INTERNAL_ERROR,
      500
    )
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}