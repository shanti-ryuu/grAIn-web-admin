import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import Command from '@/lib/models/Command'
import Device from '@/lib/models/Device'
import { successResponse, multiStatusResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { getUserFromRequest } from '@/lib/utils/auth'
import { isValidDeviceId } from '@/lib/utils/validation'
import { checkRateLimit, RateLimits } from '@/lib/utils/rateLimit'
import { pushCommandToFirebase } from '@/lib/utils/firebase-sync'

const VALID_FANS = ['FAN1', 'FAN2', 'ALL'] as const
const VALID_ACTIONS = ['ON', 'OFF'] as const

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    // Check rate limit
    const rateLimit = checkRateLimit(request, RateLimits.COMMAND)
    if (!rateLimit.allowed) {
      const response = errorResponse(
        'Rate limit exceeded. Too many commands in a short period.',
        ErrorCodes.RATE_LIMIT,
        429
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    await dbConnect()

    // Verify authentication
    const user = await getUserFromRequest(request)
    if (!user) {
      const response = errorResponse(
        'Unauthorized: Missing or invalid token',
        ErrorCodes.UNAUTHORIZED,
        401
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const { deviceId } = await params

    // Validate device ID
    if (!isValidDeviceId(deviceId)) {
      const response = errorResponse(
        'Invalid device ID format',
        ErrorCodes.INVALID_INPUT,
        400
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Check if device exists and user can access it
    const device = await Device.findOne({ deviceId })
    if (!device) {
      const response = errorResponse(
        `Device ${deviceId} not found`,
        ErrorCodes.DEVICE_NOT_FOUND,
        404
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Check access control
    if (user.role !== 'admin' && device.assignedUser?.toString() !== user.userId) {
      const response = errorResponse(
        'Forbidden: You do not have access to this device',
        ErrorCodes.FORBIDDEN,
        403
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Parse and validate request body
    let body: { fan?: string; action?: string }
    try {
      body = await request.json()
    } catch {
      const response = errorResponse(
        'Invalid request body',
        ErrorCodes.INVALID_INPUT,
        400
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const { fan: rawFan, action: rawAction } = body

    // Validate fan field
    if (!rawFan || !(VALID_FANS as readonly string[]).includes(rawFan)) {
      const response = errorResponse(
        'Invalid or missing "fan" field. Must be one of: FAN1, FAN2, ALL',
        ErrorCodes.INVALID_INPUT,
        400
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }
    const fan = rawFan as typeof VALID_FANS[number]

    // Validate action field
    if (!rawAction || !(VALID_ACTIONS as readonly string[]).includes(rawAction)) {
      const response = errorResponse(
        'Invalid or missing "action" field. Must be one of: ON, OFF',
        ErrorCodes.INVALID_INPUT,
        400
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }
    const action = rawAction as typeof VALID_ACTIONS[number]

    // Create FAN_CONTROL command
    const command = await Command.create({
      deviceId,
      command: 'FAN_CONTROL',
      mode: 'MANUAL',
      fanTarget: fan,
      fanAction: action,
      status: 'pending',
    })

    // Push command to Firebase for ESP32 to poll (with retry)
    let firebaseDelivered = true
    try {
      await pushCommandToFirebase(deviceId, command._id.toString(), {
        command: 'FAN_CONTROL',
        mode: 'MANUAL',
        fanTarget: fan,
        fanAction: action,
      })
    } catch (firebaseError) {
      console.error('[Firebase Push Error] Initial attempt failed for FAN_CONTROL command:', firebaseError)
      // Retry once after 1s
      await new Promise(resolve => setTimeout(resolve, 1000))
      try {
        await pushCommandToFirebase(deviceId, command._id.toString(), {
          command: 'FAN_CONTROL',
          mode: 'MANUAL',
          fanTarget: fan,
          fanAction: action,
        })
      } catch (retryError) {
        console.error('[Firebase Push Error] Retry failed for FAN_CONTROL command:', retryError)
        firebaseDelivered = false
      }
    }

    const commandData = {
      id: command._id,
      deviceId: command.deviceId,
      command: command.command,
      mode: command.mode,
      fanTarget: command.fanTarget,
      fanAction: command.fanAction,
      status: command.status,
      createdAt: command.createdAt.toISOString(),
    }

    const response = firebaseDelivered
      ? successResponse(commandData, 201)
      : multiStatusResponse(
          commandData,
          'Command saved but realtime delivery failed. ESP32 will receive on next poll.'
        )

    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Fan control error:', error)
    const response = errorResponse(
      'Failed to create fan control command',
      ErrorCodes.INTERNAL_ERROR,
      500
    )
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}
