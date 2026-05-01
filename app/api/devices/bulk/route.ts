import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import Device from '@/lib/models/Device'
import SensorData from '@/lib/models/SensorData'
import Command from '@/lib/models/Command'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { getUserFromRequest } from '@/lib/utils/auth'
import { IDevice } from '@/lib/models/Device'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect()

    const authUser = await getUserFromRequest(request)
    if (!authUser || authUser.role !== 'admin') {
      const response = errorResponse('Forbidden: Admin access required', ErrorCodes.FORBIDDEN, 403)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      const response = errorResponse('ids array is required', ErrorCodes.INVALID_INPUT, 400)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Find deviceIds for associated data cleanup
    const devices = await Device.find({ _id: { $in: ids } }).select('deviceId').lean()
    const deviceIds = devices.map((d: IDevice) => d.deviceId)

    // Delete associated SensorData and Commands for cleanliness
    if (deviceIds.length > 0) {
      await Promise.all([
        SensorData.deleteMany({ deviceId: { $in: deviceIds } }),
        Command.deleteMany({ deviceId: { $in: deviceIds } }),
      ])
    }

    const result = await Device.deleteMany({ _id: { $in: ids } })

    const response = successResponse({ deletedCount: result.deletedCount })
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Bulk delete devices error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}
