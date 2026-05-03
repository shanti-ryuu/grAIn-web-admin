import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import Command from '@/lib/models/Command'
import Device from '@/lib/models/Device'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { isValidDeviceId } from '@/lib/utils/validation'
import { getRealtimeDb } from '@/lib/firebase-admin'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    await dbConnect()

    const { deviceId } = await params

    // Validate device ID format
    if (!isValidDeviceId(deviceId)) {
      const response = errorResponse('Invalid device ID format', ErrorCodes.INVALID_INPUT, 400)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Verify device exists (no JWT — ESP32 can't hold tokens)
    const device = await Device.findOne({ deviceId })
    if (!device) {
      const response = errorResponse('Device not found', ErrorCodes.DEVICE_NOT_FOUND, 404)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const body = await request.json()
    const { commandId, status, executedAt } = body

    if (!commandId) {
      const response = errorResponse('commandId is required', ErrorCodes.INVALID_INPUT, 400)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Update command status
    await Command.findByIdAndUpdate(commandId, {
      status: status === 'ok' ? 'executed' : 'failed',
      executedAt: executedAt ? new Date(executedAt) : new Date(),
    })

    // Write ack to Firebase so mobile app gets instant feedback
    const db = getRealtimeDb()
    if (db) {
      await db.ref(`grain/commands/${deviceId}/executed`).set({
        commandId,
        status,
        executedAt: Date.now(),
      })
    }

    const response = successResponse({ acknowledged: true })
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Command ack error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}
