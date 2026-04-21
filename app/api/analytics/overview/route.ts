import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import SensorData from '@/lib/models/SensorData'
import Device from '@/lib/models/Device'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { getUserFromRequest } from '@/lib/utils/auth'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const user = getUserFromRequest(request)
    if (!user) {
      const response = errorResponse('Unauthorized', ErrorCodes.UNAUTHORIZED, 401)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Get date range (default to last 7 days)
    const url = new URL(request.url)
    const days = parseInt(url.searchParams.get('days') || '7')
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    let matchCondition: any = {
      timestamp: { $gte: startDate },
    }

    // If not admin, only show data for user's devices
    if (user.role !== 'admin') {
      const userDevices = await Device.find({ assignedUser: user.userId }).select('deviceId')
      const deviceIds = userDevices.map(d => d.deviceId)
      matchCondition.deviceId = { $in: deviceIds }
    }

    // Aggregate sensor data
    const analytics = await SensorData.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: {
            deviceId: '$deviceId',
            date: {
              $dateToString: {
                format: '%Y-%m-%d %H:00',
                date: '$timestamp',
              },
            },
          },
          avgTemperature: { $avg: '$temperature' },
          avgHumidity: { $avg: '$humidity' },
          avgMoisture: { $avg: '$moisture' },
          count: { $sum: 1 },
          minTemperature: { $min: '$temperature' },
          maxTemperature: { $max: '$temperature' },
          minHumidity: { $min: '$humidity' },
          maxHumidity: { $max: '$humidity' },
          minMoisture: { $min: '$moisture' },
          maxMoisture: { $max: '$moisture' },
        },
      },
      {
        $sort: { '_id.date': 1 },
      },
    ])

    // Get device count
    const deviceCount = await Device.countDocuments(
      user.role === 'admin' ? {} : { assignedUser: user.userId }
    )

    // Get online device count
    const onlineDeviceCount = await Device.countDocuments({
      ...(user.role === 'admin' ? {} : { assignedUser: user.userId }),
      status: 'online',
    })

    // Get latest sensor readings
    const latestReadings = await SensorData.find(matchCondition)
      .sort({ timestamp: -1 })
      .limit(10)

    const result = {
      analytics,
      summary: {
        deviceCount,
        onlineDeviceCount,
        totalReadings: analytics.length,
      },
      latestReadings,
    }

    const response = successResponse(result)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Analytics error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}