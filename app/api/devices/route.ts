import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import Device from '@/lib/models/Device'
import User from '@/lib/models/User'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { getUserFromRequest } from '@/lib/utils/auth'
import { validateDeviceRequest } from '@/lib/utils/validation'
import { UserRole, DeviceStatus } from '@/lib/enums'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const user = await getUserFromRequest(request)
    if (!user) {
      const response = errorResponse('Unauthorized', ErrorCodes.UNAUTHORIZED, 401)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    let devices
    if (user.role === UserRole.Admin) {
      devices = await Device.find({})
        .populate('assignedUser', 'name email')
        .sort({ createdAt: -1 })
    } else {
      devices = await Device.find({ assignedUser: user.userId })
        .populate('assignedUser', 'name email')
        .sort({ createdAt: -1 })
    }

    const formattedDevices = devices.map((d: any) => ({
      id: d._id,
      deviceId: d.deviceId,
      status: d.status,
      location: d.location,
      lastActive: d.lastActive?.toISOString?.() || d.lastActive,
      assignedUser: d.assignedUser,
      createdAt: d.createdAt?.toISOString?.() || d.createdAt,
    }))

    const response = successResponse(formattedDevices)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Get devices error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const user = getUserFromRequest(request)
    if (!user || user.role !== UserRole.Admin) {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      const response = errorResponse('Forbidden: Admin access required', ErrorCodes.FORBIDDEN, 403)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const body = await request.json()
    const { deviceId, assignedUser, location } = body

    // Validate
    const validation = validateDeviceRequest(body)
    if (!validation.valid) {
      const response = errorResponse(
        Object.values(validation.errors).join(', '),
        ErrorCodes.INVALID_INPUT,
        400
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    if (!assignedUser) {
      const response = errorResponse('Assigned user is required', ErrorCodes.INVALID_INPUT, 400)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Check if device already exists
    const existingDevice = await Device.findOne({ deviceId })
    if (existingDevice) {
      const response = errorResponse('Device with this ID already exists', ErrorCodes.CONFLICT, 400)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Check if user exists
    const userExists = await User.findById(assignedUser)
    if (!userExists) {
      const response = errorResponse('Assigned user not found', ErrorCodes.USER_NOT_FOUND, 400)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Create device
    const newDevice = await Device.create({
      deviceId,
      assignedUser,
      location,
      status: DeviceStatus.Offline,
    })

    await newDevice.populate('assignedUser', 'name email')

    const formattedDevice = {
      id: newDevice._id,
      deviceId: newDevice.deviceId,
      status: newDevice.status,
      location: newDevice.location,
      lastActive: newDevice.lastActive?.toISOString?.() || newDevice.lastActive,
      assignedUser: newDevice.assignedUser,
      createdAt: newDevice.createdAt?.toISOString?.() || newDevice.createdAt,
    }

    const response = successResponse(formattedDevice, 201)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Create device error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}