import { NextRequest } from 'next/server'
import Command from '@/lib/models/Command'
import Device from '@/lib/models/Device'
import { successResponse, multiStatusResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { TokenPayload } from '@/lib/utils/auth'
import { isValidDeviceId } from '@/lib/utils/validation'
import { checkRateLimit, RateLimits } from '@/lib/utils/rateLimit'
import { pushCommandToFirebase } from '@/lib/utils/firebase-sync'
import { getDeviceLiveness } from '@/lib/utils/device-liveness'

interface CommandSpec {
  /** The command string sent to ESP32 (e.g. 'START', 'STOP', 'FAN_CONTROL') */
  command: string
  /** Mode for the command (default: 'MANUAL') */
  mode?: string
  /** Additional fields to include in the MongoDB Command doc and Firebase payload */
  extraFields?: Record<string, unknown>
}

interface DryerCommandResult {
  id: unknown
  deviceId: string
  command: string
  mode: string
  status: string
  createdAt: string
  [key: string]: unknown
}

/**
 * Factory that handles the full dryer-command lifecycle:
 *   1. Rate-limit check
 *   2. Device ID validation
 *   3. Device existence + access-control check
 *   4. Command creation in MongoDB
 *   5. Firebase push with 1-retry
 *   6. Return successResponse or multiStatusResponse
 *
 * @example
 * // In app/api/dryer/[deviceId]/start/route.ts:
 * export const POST = withAuth((req, user, { params }) =>
 *   createDryerCommand(req, user, params, { command: 'START', mode: 'MANUAL' })
 * )
 */
export async function createDryerCommand(
  request: NextRequest,
  user: TokenPayload,
  params: Promise<Record<string, string>>,
  spec: CommandSpec
) {
  // 1. Rate limit
  const rateLimit = await checkRateLimit(request, RateLimits.COMMAND)
  if (!rateLimit.allowed) {
    return errorResponse('Rate limit exceeded. Too many commands in a short period.', ErrorCodes.RATE_LIMIT, 429)
  }

  // 2. Validate deviceId
  const { deviceId } = await params
  if (!isValidDeviceId(deviceId)) {
    return errorResponse('Invalid device ID format', ErrorCodes.INVALID_INPUT, 400)
  }

  // 3. Device existence + access control
  const device = await Device.findOne({ deviceId })
  if (!device) {
    return errorResponse(`Device ${deviceId} not found`, ErrorCodes.DEVICE_NOT_FOUND, 404)
  }
  if (user.role !== 'admin' && device.assignedUser?.toString() !== user.userId) {
    return errorResponse('Forbidden: You do not have access to this device', ErrorCodes.FORBIDDEN, 403)
  }

  const liveness = await getDeviceLiveness(deviceId, { status: device.status, lastActive: device.lastActive })
  if (!liveness.isOnline) {
    return errorResponse(`Device ${deviceId} is offline. Power on the prototype and wait for live sensor data before sending commands.`, ErrorCodes.CONFLICT, 409)
  }

  // 4. Create command in MongoDB
  const commandMode = spec.mode ?? 'MANUAL'
  const command = await Command.create({
    deviceId,
    command: spec.command,
    mode: commandMode,
    status: 'pending',
    ...spec.extraFields,
  })

  // 5. Push to Firebase with 1-retry
  const firebasePayload = {
    command: spec.command,
    mode: commandMode,
    ...spec.extraFields,
  }

  let firebaseDelivered = true
  try {
    await pushCommandToFirebase(deviceId, command._id.toString(), firebasePayload)
  } catch (firebaseError) {
    console.error(`[Firebase Push Error] Initial attempt failed for ${spec.command} command:`, firebaseError)
    await new Promise(resolve => setTimeout(resolve, 1000))
    try {
      await pushCommandToFirebase(deviceId, command._id.toString(), firebasePayload)
    } catch (retryError) {
      console.error(`[Firebase Push Error] Retry failed for ${spec.command} command:`, retryError)
      firebaseDelivered = false
    }
  }

  // 6. Return response
  const commandData: DryerCommandResult = {
    id: command._id,
    deviceId: command.deviceId,
    command: command.command,
    mode: command.mode,
    status: command.status,
    createdAt: command.createdAt.toISOString(),
    ...spec.extraFields,
  }

  return firebaseDelivered
    ? successResponse(commandData, 201)
    : multiStatusResponse(commandData, 'Command saved but realtime delivery failed. ESP32 will receive on next poll.')
}
