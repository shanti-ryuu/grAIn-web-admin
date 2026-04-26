import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import SensorData from '@/lib/models/SensorData'
import Command from '@/lib/models/Command'
import Device from '@/lib/models/Device'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { getUserFromRequest } from '@/lib/utils/auth'
import { UserRole, CommandType, SensorDataStatus } from '@/lib/enums'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const user = getUserFromRequest(request)
    if (!user) {
      const response = errorResponse('Unauthorized', ErrorCodes.Unauthorized, 401)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const url = new URL(request.url)
    const period = url.searchParams.get('period') || 'weekly'
    const deviceId = url.searchParams.get('deviceId') || 'all'

    const now = new Date()
    let startTime: Date
    let moistureFormat: string
    let energyFormat: string

    switch (period) {
      case 'daily':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        moistureFormat = '%Y-%m-%dT%H:00'
        energyFormat = '%Y-%m-%dT%H:00'
        break
      case 'monthly':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        moistureFormat = '%Y-%m-%d'
        energyFormat = '%Y-%m-%d'
        break
      case 'weekly':
      default:
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        moistureFormat = '%Y-%m-%dT%H:00'
        energyFormat = '%Y-%m-%d'
        break
    }

    // Build device filter
    let deviceFilter: any = {}
    if (deviceId !== 'all') {
      deviceFilter = { deviceId }
    } else if (user.role !== UserRole.Admin) {
      const userDevices = await Device.find({ assignedUser: user.userId }).select('deviceId')
      deviceFilter = { deviceId: { $in: userDevices.map(d => d.deviceId) } }
    }

    // 1. Moisture trend
    const moistureTrend = await SensorData.aggregate([
      { $match: { ...deviceFilter, timestamp: { $gte: startTime } } },
      { $group: { _id: { $dateToString: { format: moistureFormat, date: '$timestamp' } }, value: { $avg: '$moisture' } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, time: '$_id', value: { $round: ['$value', 2] } } },
    ])

    // 2. Drying cycles (last 10 START commands)
    const startCommands = await Command.find({ ...deviceFilter, command: CommandType.Start })
      .sort({ createdAt: -1 }).limit(10).lean()

    const dryingCycles = startCommands.map((cmd, i) => {
      const duration = cmd.executedAt ? (cmd.executedAt.getTime() - cmd.createdAt.getTime()) / (1000 * 60) : 0
      return { cycle: `Cycle ${i + 1}`, duration: Math.round(duration), deviceId: cmd.deviceId, mode: cmd.mode, status: cmd.status }
    })

    // 3. Energy consumption
    const energyConsumption = await SensorData.aggregate([
      { $match: { ...deviceFilter, timestamp: { $gte: startTime } } },
      { $group: { _id: { $dateToString: { format: energyFormat, date: '$timestamp' } }, value: { $sum: '$energy' } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, day: '$_id', value: { $round: ['$value', 2] } } },
    ])

    // 4. Average temperature and humidity
    const averages = await SensorData.aggregate([
      { $match: { ...deviceFilter, timestamp: { $gte: startTime } } },
      { $group: { _id: null, avgTemperature: { $avg: '$temperature' }, avgHumidity: { $avg: '$humidity' } } },
    ])
    const avgTemperature = averages.length > 0 ? Math.round(averages[0].avgTemperature * 100) / 100 : 0
    const avgHumidity = averages.length > 0 ? Math.round(averages[0].avgHumidity * 100) / 100 : 0

    // 5. Total cycles
    const totalCycles = await Command.countDocuments({ ...deviceFilter, command: CommandType.Start })

    // 6. Active dryers
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const activeDryers = await SensorData.distinct('deviceId', {
      ...deviceFilter, status: SensorDataStatus.Running, timestamp: { $gte: last24h },
    }).then((ids) => ids.length)

    // 7. Device status distribution
    const deviceStatusDist = await Device.aggregate([
      { $match: deviceId !== 'all' ? { deviceId } : {} },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    const deviceStatusDistribution = deviceStatusDist.map(d => ({ status: d._id, count: d.count }))

    const result = {
      moistureTrend, dryingCycles, energyConsumption,
      avgTemperature, avgHumidity, totalCycles, activeDryers,
      period, deviceStatusDistribution,
    }

    const response = successResponse(result)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Analytics error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.InternalError, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}