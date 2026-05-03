import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import Command from '@/lib/models/Command'
import Device from '@/lib/models/Device'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { getUserFromRequest } from '@/lib/utils/auth'
import { isValidDeviceId } from '@/lib/utils/validation'
import { checkRateLimit, RateLimits } from '@/lib/utils/rateLimit'
import { pushCommandToFirebase } from '@/lib/utils/firebase-sync'
import { UserRole, CommandType, DryerMode, CommandStatus } from '@/lib/enums'

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
    if (user.role !== UserRole.Admin && device.assignedUser?.toString() !== user.userId) {
      const response = errorResponse(
        'Forbidden: You do not have access to this device',
        ErrorCodes.FORBIDDEN,
        403
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Parse request body for optional parameters
    let body: any = {}
    try {
      body = await request.json()
    } catch {
      // Body is optional for start command
    }

    const { mode, temperature, fanSpeed } = body

    // Create START command with optional temperature/fanSpeed
    const command = await Command.create({
      deviceId,
      command: CommandType.Start,
      mode: mode && [DryerMode.Auto, DryerMode.Manual].includes(mode) ? mode : DryerMode.Manual,
      temperature: temperature !== undefined ? Number(temperature) : undefined,
      fanSpeed: fanSpeed !== undefined ? Number(fanSpeed) : undefined,
      status: CommandStatus.Pending,
    })

    // Push command to Firebase for ESP32 to poll
    try {
      await pushCommandToFirebase(deviceId, command._id.toString(), {
        command: CommandType.Start,
        mode: mode && [DryerMode.Auto, DryerMode.Manual].includes(mode) ? mode : DryerMode.Manual,
        temperature: temperature !== undefined ? Number(temperature) : undefined,
        fanSpeed: fanSpeed !== undefined ? Number(fanSpeed) : undefined,
      })
    } catch (firebaseError) {
      console.warn('Firebase command push failed:', firebaseError)
    }

    const response = successResponse({
      id: command._id,
      deviceId: command.deviceId,
      command: command.command,
      mode: command.mode,
      temperature: command.temperature,
      fanSpeed: command.fanSpeed,
      status: command.status,
      createdAt: command.createdAt.toISOString(),
    }, 201)

    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Start dryer error:', error)
    const response = errorResponse(
      'Failed to create start command',
      ErrorCodes.INTERNAL_ERROR,
      500
    )
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}