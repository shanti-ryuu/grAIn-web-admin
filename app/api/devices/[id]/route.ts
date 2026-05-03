import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import Device from '@/lib/models/Device'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { getUserFromRequest } from '@/lib/utils/auth'
import { UserRole } from '@/lib/enums'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect()

    const user = await getUserFromRequest(request)
    if (!user) {
      const response = errorResponse('Unauthorized', ErrorCodes.UNAUTHORIZED, 401)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const { id } = await params

    // Support both MongoDB ObjectId and business deviceId (e.g., GR-001)
    let device
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      device = await Device.findById(id).populate('assignedUser', 'name email')
    } else {
      device = await Device.findOne({ deviceId: id }).populate('assignedUser', 'name email')
    }

    if (!device) {
      const response = errorResponse('Device not found', ErrorCodes.DEVICE_NOT_FOUND, 404)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Check if user can access this device
    if (user.role !== UserRole.Admin && device.assignedUser?._id?.toString() !== user.userId) {
      const response = errorResponse('Forbidden', ErrorCodes.FORBIDDEN, 403)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const deviceData = {
      id: device._id,
      deviceId: device.deviceId,
      status: device.status,
      location: device.location,
      lastActive: device.lastActive?.toISOString?.() || device.lastActive,
      assignedUser: device.assignedUser,
      createdAt: device.createdAt?.toISOString?.() || device.createdAt,
    }

    const response = successResponse(deviceData)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Get device error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}