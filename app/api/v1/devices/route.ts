import Device from '@/lib/models/Device'
import User from '@/lib/models/User'
import { successResponse, paginatedResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'
import { validateDeviceRequest, sanitizeString } from '@/lib/utils/validation'
import type { IDevice } from '@/lib/models/Device'

export const GET = withAuth(async (request, user) => {
  const { searchParams } = request.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '50'))
  const skip = (page - 1) * limit

  const filter = user.role === 'admin' ? {} : { assignedUser: user.userId }

  const [devices, total] = await Promise.all([
    Device.find(filter)
      .populate('assignedUser', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Device.countDocuments(filter),
  ])

  const formattedDevices = devices.map((d: IDevice) => ({
    id: d._id,
    deviceId: d.deviceId,
    status: d.status,
    location: d.location,
    lastActive: d.lastActive?.toISOString?.() || d.lastActive,
    assignedUser: d.assignedUser,
    createdAt: d.createdAt?.toISOString?.() || d.createdAt,
  }))

  return paginatedResponse(formattedDevices, total, page, limit)
})

export const POST = withAuth(async (request, user) => {
  void user
  const body = await request.json()
  const { deviceId, assignedUser, location } = body

  // Sanitize location (NOT deviceId — it has its own format validation)
  const safeLocation = typeof location === 'string' ? sanitizeString(location) : location

  const validation = validateDeviceRequest(body)
  if (!validation.valid) {
    return errorResponse(Object.values(validation.errors).join(', '), ErrorCodes.INVALID_INPUT, 400)
  }

  if (!assignedUser) {
    return errorResponse('Assigned user is required', ErrorCodes.INVALID_INPUT, 400)
  }

  const existingDevice = await Device.findOne({ deviceId })
  if (existingDevice) {
    return errorResponse('Device with this ID already exists', ErrorCodes.CONFLICT, 400)
  }

  const userExists = await User.findById(assignedUser)
  if (!userExists) {
    return errorResponse('Assigned user not found', ErrorCodes.USER_NOT_FOUND, 400)
  }

  const newDevice = await Device.create({ deviceId, assignedUser, location: safeLocation, status: 'offline' })
  await newDevice.populate('assignedUser', 'name email')

  return successResponse({
    id: newDevice._id,
    deviceId: newDevice.deviceId,
    status: newDevice.status,
    location: newDevice.location,
    lastActive: newDevice.lastActive?.toISOString?.() || newDevice.lastActive,
    assignedUser: newDevice.assignedUser,
    createdAt: newDevice.createdAt?.toISOString?.() || newDevice.createdAt,
  }, 201)
}, { role: 'admin' })