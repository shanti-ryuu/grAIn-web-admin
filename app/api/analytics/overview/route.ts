import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import SensorData from '@/lib/models/SensorData'
import Command from '@/lib/models/Command'
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

    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Build device filter for non-admin users
    let deviceFilter: any = {}
    let deviceIdList: string[] = []
    if (user.role !== 'admin') {
      const userDevices = await Device.find({ assignedUser: user.userId }).select('deviceId')
      deviceIdList = userDevices.map(d => d.deviceId)
      deviceFilter = { deviceId: { $in: deviceIdList } }
    }

    // 1. Moisture trend (last 24h, hourly)
    const moistureTrend = await SensorData.aggregate([
      { $match: { ...deviceFilter, timestamp: { $gte: last24h } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%dT%H:00', date: '$timestamp' },
          },
          value: { $avg: '$moisture' },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, time: '$_id', value: { $round: ['$value', 2] } } },
    ])

    // 2. Drying cycles (last 5 START commands)
    const startCommands = await Command.find({
      ...deviceFilter,
      command: 'START',
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()

    const dryingCycles = startCommands.map((cmd, i) => {
      const duration = cmd.executedAt
        ? (cmd.executedAt.getTime() - cmd.createdAt.getTime()) / (1000 * 60)
        : 0
      return {
        cycle: i + 1,
        duration: Math.round(duration),
      }
    })

    // 3. Energy consumption (last 7 days, daily)
    const energyConsumption = await SensorData.aggregate([
      { $match: { ...deviceFilter, timestamp: { $gte: last7d } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
          },
          value: { $sum: '$energy' },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, day: '$_id', value: { $round: ['$value', 2] } } },
    ])

    // 4. Average temperature and humidity (last 7 days)
    const averages = await SensorData.aggregate([
      { $match: { ...deviceFilter, timestamp: { $gte: last7d } } },
      {
        $group: {
          _id: null,
          avgTemperature: { $avg: '$temperature' },
          avgHumidity: { $avg: '$humidity' },
        },
      },
    ])

    const avgTemperature = averages.length > 0 ? Math.round(averages[0].avgTemperature * 100) / 100 : 0
    const avgHumidity = averages.length > 0 ? Math.round(averages[0].avgHumidity * 100) / 100 : 0

    // 5. Total cycles (all START commands)
    const totalCycles = await Command.countDocuments({
      ...deviceFilter,
      command: 'START',
    })

    // 6. Active dryers (devices with status 'online' and recent sensor data showing 'running')
    const activeDryers = await SensorData.distinct('deviceId', {
      ...deviceFilter,
      status: 'running',
      timestamp: { $gte: last24h },
    }).then((ids) => ids.length)

    const result = {
      moistureTrend,
      dryingCycles,
      energyConsumption,
      avgTemperature,
      avgHumidity,
      totalCycles,
      activeDryers,
    }

    const response = successResponse(result)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Analytics error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}