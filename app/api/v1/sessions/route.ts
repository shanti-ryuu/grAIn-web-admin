import { withAuth } from '@/lib/utils/handler'
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/utils/response'
import DryingSession from '@/lib/models/DryingSession'
import Device from '@/lib/models/Device'
import SensorData from '@/lib/models/SensorData'
import { sendPushNotification } from '@/lib/utils/notifications'
import { getDeviceLiveness } from '@/lib/utils/device-liveness'

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))
  const status = url.searchParams.get('status')
  const deviceId = url.searchParams.get('deviceId')

  const filter: Record<string, unknown> = {}
  if (user.role !== 'admin') filter.userId = user.userId
  if (status) filter.status = status
  if (deviceId) filter.deviceId = deviceId

  const [sessions, total] = await Promise.all([
    DryingSession.find(filter)
      .sort({ startedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    DryingSession.countDocuments(filter),
  ])

  return paginatedResponse(sessions, total, page, limit)
})

export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const { deviceId, grainType, targetMoisture } = body

  if (!deviceId) {
    return errorResponse('deviceId is required', ErrorCodes.INVALID_INPUT, 400)
  }

  const device = await Device.findOne({ deviceId })
  if (!device) {
    return errorResponse('Device not found', ErrorCodes.DEVICE_NOT_FOUND, 404)
  }

  if (user.role !== 'admin' && device.assignedUser.toString() !== user.userId) {
    return errorResponse('Not authorized for this device', ErrorCodes.FORBIDDEN, 403)
  }

  const liveness = await getDeviceLiveness(deviceId, { status: device.status, lastActive: device.lastActive })
  if (!liveness.isOnline) {
    return errorResponse('Cannot start drying session while device is offline. Power on the prototype and wait for live sensor data first.', ErrorCodes.CONFLICT, 409)
  }

  const activeSession = await DryingSession.findOne({ deviceId, status: 'active' })
  if (activeSession) {
    return errorResponse('Device already has an active drying session', ErrorCodes.CONFLICT, 409)
  }

  const latestSensor = await SensorData.findOne({ deviceId }).sort({ timestamp: -1 }).lean()
  const startMoisture = latestSensor?.moisture || body.startMoisture || 0
  const startWeight = latestSensor?.weight || body.startWeight || 0

  const session = await DryingSession.create({
    deviceId,
    userId: user.userId,
    grainType: grainType || 'rice',
    targetMoisture: targetMoisture || 14,
    startMoisture,
    currentMoisture: startMoisture,
    startWeight,
    startedAt: new Date(),
  })

  await sendPushNotification({
    userId: user.userId,
    deviceId,
    type: 'session_started',
    title: 'Drying Session Started',
    body: `Drying session started for ${deviceId}. Target: ${targetMoisture || 14}% moisture.`,
    data: { sessionId: session._id.toString() },
  }).catch(err => console.error('[Notification]', err))

  return successResponse(session, 201)
})
