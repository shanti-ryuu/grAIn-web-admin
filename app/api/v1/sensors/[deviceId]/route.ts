import SensorData from '@/lib/models/SensorData'
import Device from '@/lib/models/Device'
import { paginatedResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'
import { getQueryParams, isValidDeviceId } from '@/lib/utils/validation'
import { checkRateLimit, RateLimits } from '@/lib/utils/rateLimit'

type LeanSensorDoc = {
  _id: string
  deviceId: string
  [key: string]: unknown
}

export const GET = withAuth(async (request, user, { params }) => {
  const rateLimit = await checkRateLimit(request, RateLimits.SENSOR_DATA)
  if (!rateLimit.allowed) {
    return errorResponse('Rate limit exceeded. Please reduce polling frequency.', ErrorCodes.RATE_LIMIT, 429)
  }

  const { deviceId } = await params

  if (!isValidDeviceId(deviceId)) {
    return errorResponse('Invalid device ID format', ErrorCodes.INVALID_INPUT, 400)
  }

  const device = await Device.findOne({ deviceId })
  if (!device) {
    return errorResponse(`Device ${deviceId} not found`, ErrorCodes.DEVICE_NOT_FOUND, 404)
  }

  if (user.role !== 'admin' && device.assignedUser?.toString() !== user.userId) {
    return errorResponse('Forbidden: You do not have access to this device', ErrorCodes.FORBIDDEN, 403)
  }

  const MAX_SENSOR_LIMIT = 500
  const { page, limit: rawLimit, skip } = getQueryParams(request, { page: 1, limit: 100 })
  const limit = Math.min(rawLimit, MAX_SENSOR_LIMIT)

  const searchParams = request.nextUrl.searchParams
  const hoursParam = parseInt(searchParams.get('hours') || '24', 10)
  const hours = Math.min(Math.max(1, hoursParam), 720)

  const fieldsParam = searchParams.get('fields')
  const allowedFields = ['temperature', 'humidity', 'moisture', 'fanSpeed', 'energy', 'status', 'solarVoltage', 'weight', 'timestamp']
  const selectFields = fieldsParam
    ? fieldsParam.split(',').filter(f => allowedFields.includes(f)).join(' ')
    : 'temperature humidity moisture timestamp -_id'

  const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000)

  const total = await SensorData.countDocuments({ deviceId, timestamp: { $gte: hoursAgo } })

  const sensorData = await SensorData.find({ deviceId, timestamp: { $gte: hoursAgo } })
    .select(selectFields)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .hint({ deviceId: 1, timestamp: -1 })
    .lean()

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
  return response
})