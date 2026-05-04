import SensorData from '@/lib/models/SensorData'
import Command from '@/lib/models/Command'
import Device from '@/lib/models/Device'
import { successResponse } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'
import { getAnalyticsCacheEntry, setAnalyticsCacheEntry } from '@/lib/utils/analytics-cache'

export const GET = withAuth(async (request, user) => {
  const url = new URL(request.url)
  const period = url.searchParams.get('period') || 'weekly'
  const deviceId = url.searchParams.get('deviceId') || 'all'

  // Check cache
  const cacheKey = `${deviceId}_${period}`
  const cachedData = await getAnalyticsCacheEntry(cacheKey)
  if (cachedData !== undefined) {
    const response = successResponse(cachedData)
    response.headers.set('Cache-Control', 'private, max-age=300')
    response.headers.set('X-Cache', 'HIT')
    return response
  }

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
  let deviceFilter: Record<string, unknown> = {}
  if (deviceId !== 'all') {
    deviceFilter = { deviceId }
  } else if (user.role !== 'admin') {
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

  // 2. Drying cycles
  const startCommands = await Command.find({ ...deviceFilter, command: 'START' })
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

  // 4. Averages
  const averages = await SensorData.aggregate([
    { $match: { ...deviceFilter, timestamp: { $gte: startTime } } },
    { $group: { _id: null, avgTemperature: { $avg: '$temperature' }, avgHumidity: { $avg: '$humidity' } } },
  ])
  const avgTemperature = averages.length > 0 ? Math.round(averages[0].avgTemperature * 100) / 100 : 0
  const avgHumidity = averages.length > 0 ? Math.round(averages[0].avgHumidity * 100) / 100 : 0

  // 5. Total cycles
  const totalCycles = await Command.countDocuments({ ...deviceFilter, command: 'START' })

  // 6. Active dryers
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const activeDryers = await SensorData.distinct('deviceId', {
    ...deviceFilter, status: 'running', timestamp: { $gte: last24h },
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

  await setAnalyticsCacheEntry(cacheKey, result)

  const response = successResponse(result)
  response.headers.set('Cache-Control', 'private, max-age=300')
  response.headers.set('X-Cache', 'MISS')
  return response
})