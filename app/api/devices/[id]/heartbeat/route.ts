import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import Device from '@/lib/models/Device'
import Command from '@/lib/models/Command'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { isValidDeviceId } from '@/lib/utils/validation'
import { getRealtimeDb } from '@/lib/firebase-admin'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect()

    const { id } = await params

    // Validate device ID
    const deviceId = isValidDeviceId(id) ? id : null
    if (!deviceId) {
      const response = errorResponse('Invalid device ID format', ErrorCodes.INVALID_INPUT, 400)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // No JWT — ESP32 lightweight call; security: validate deviceId format + check device exists
    const device = await Device.findOne({ deviceId })
    if (!device) {
      const response = errorResponse('Device not found', ErrorCodes.DEVICE_NOT_FOUND, 404)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Update device status to online and lastActive
    await Device.findByIdAndUpdate(device._id, {
      status: 'online',
      lastActive: new Date(),
    })

    // Sync to Firebase
    const db = getRealtimeDb()
    if (db) {
      await db.ref(`grain/devices/${deviceId}`).update({
        status: 'online',
        lastActive: Date.now(),
      })
    }

    // Return pending commands count so ESP32 knows to hit GET /commands
    const pendingCmds = await Command.find({
      deviceId,
      status: 'pending',
    }).lean()

    const response = successResponse({
      ok: true,
      pendingCommands: pendingCmds.length,
    })
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Heartbeat error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}
