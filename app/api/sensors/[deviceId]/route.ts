import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import SensorData from '@/lib/models/SensorData'
import Device from '@/lib/models/Device'
import { paginatedResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { getUserFromRequest } from '@/lib/utils/auth'
import { getQueryParams, isValidDeviceId } from '@/lib/utils/validation'
import { checkRateLimit, RateLimits } from '@/lib/utils/rateLimit'

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
    const user = getUserFromRequest(request)
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

    // Parse pagination parameters
    const { page, limit, skip } = getQueryParams(request, { page: 1, limit: 100 })

    // Parse optional time filter
    const searchParams = request.nextUrl.searchParams
    const hoursParam = parseInt(searchParams.get('hours') || '24', 10)
    const hours = Math.min(Math.max(1, hoursParam), 720) // 1-720 hours (30 days)

    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000)

    // Get total count
    const total = await SensorData.countDocuments({
      deviceId,
      timestamp: { $gte: hoursAgo },
    })

    // Get paginated sensor data
    const sensorData = await SensorData.find({
      deviceId,
      timestamp: { $gte: hoursAgo },
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // Format response
    const formattedData = sensorData.map((data: any) => ({
      id: data._id,
      deviceId: data.deviceId,
      temperature: data.temperature,
      humidity: data.humidity,
      moisture: data.moisture,
      timestamp: data.timestamp.toISOString(),
      createdAt: data.createdAt.toISOString(),
    }))

    const response = paginatedResponse(formattedData, total, page, limit)
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