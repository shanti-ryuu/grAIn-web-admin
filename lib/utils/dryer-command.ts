import { NextRequest } from 'next/server'
import Command from '@/lib/models/Command'
import Device from '@/lib/models/Device'
import { successResponse, multiStatusResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { TokenPayload } from '@/lib/utils/auth'
import { isValidDeviceId } from '@/lib/utils/validation'
import { checkRateLimit, RateLimits } from '@/lib/utils/rateLimit'
import { markCommandExecuted, pushCommandToFirebase } from '@/lib/utils/firebase-sync'
import { getDeviceLiveness } from '@/lib/utils/device-liveness'

const PENDING_COMMAND_TIMEOUT_MS = 20_000
const POLLED_COMMAND_TIMEOUT_MS = 30_000
const ACTIVE_COMMAND_STATUSES = ['pending', 'polled', 'executing'] as const

interface CommandSpec {
  /** The command string sent to ESP32 (e.g. 'START', 'STOP', 'FAN_CONTROL') */
  command: string
  /** Mode for the command (default: 'MANUAL') */
  mode?: string
  /** Additional fields to include in the MongoDB Command doc and Firebase payload */
  extraFields?: Record<string, unknown>
}

export async function expireStalePendingCommands(deviceId: string): Promise<number> {
  return expireStaleCommands({ deviceId })
}

export async function expireStaleCommands(filter: { deviceId?: string } = {}): Promise<number> {
  const now = Date.now()
  const pendingCutoff = new Date(now - PENDING_COMMAND_TIMEOUT_MS)
  const polledCutoff = new Date(now - POLLED_COMMAND_TIMEOUT_MS)
  const staleCommands = await Command.find({
    ...(filter.deviceId && { deviceId: filter.deviceId }),
    $or: [
      { status: 'pending', createdAt: { $lt: pendingCutoff } },
      { status: { $in: ['polled', 'executing'] }, polledAt: { $lt: polledCutoff } },
      { status: { $in: ['polled', 'executing'] }, polledAt: { $exists: false }, updatedAt: { $lt: polledCutoff } },
    ],
  }).select('_id deviceId command commandStr status').lean()

  if (staleCommands.length === 0) return 0

  await Promise.all(staleCommands.map(async command => {
    console.warn(`[Command Timeout] ${command.deviceId} ${command._id.toString()} ${command.commandStr ?? command.command} expired from ${command.status}`)
    await markCommandExecuted(command.deviceId, command._id.toString(), 'timeout')
  }))

  return staleCommands.length
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

  await expireStalePendingCommands(deviceId)

  const existingPending = await Command.findOne({ deviceId, status: { $in: ACTIVE_COMMAND_STATUSES } }).sort({ createdAt: 1 }).lean()
  if (existingPending) {
    return errorResponse(
      `Device ${deviceId} already has an active ${existingPending.status} command. Wait for hardware acknowledgement or timeout before sending another command.`,
      ErrorCodes.CONFLICT,
      409
    )
  }

  // 4. Create command in MongoDB
  const commandMode = spec.mode ?? 'MANUAL'
  const commandStr = typeof spec.extraFields?.commandStr === 'string'
    ? spec.extraFields.commandStr
    : spec.command === 'START'
      ? `START:${commandMode}:${Number(spec.extraFields?.temperature ?? 45)}:${Number(spec.extraFields?.fanSpeed ?? 80)}`
      : spec.command === 'STOP'
        ? 'STOP'
        : undefined
  const command = await Command.create({
    deviceId,
    command: spec.command,
    mode: commandMode,
    status: 'pending',
    ...(commandStr && { commandStr }),
    ...spec.extraFields,
  })

  await Device.findOneAndUpdate(
    { deviceId },
    {
      $set: {
        'runtimeState.pendingCommand': command._id.toString(),
        'runtimeState.activeCommand': commandStr ?? spec.command,
        'runtimeState.lastCommand': commandStr ?? spec.command,
        'runtimeState.commandStatus': 'pending',
        'runtimeState.commandAcknowledged': false,
        'runtimeState.updatedAt': new Date(),
      },
    }
  )

  console.info(`[Command Inserted] device=${deviceId} id=${command._id.toString()} command=${commandStr ?? spec.command}`)

  // 5. Push to Firebase with 1-retry
  const firebasePayload = {
    command: spec.command,
    mode: commandMode,
    ...(commandStr && { commandStr }),
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
    ...(commandStr && { commandStr }),
    ...spec.extraFields,
  }

  return firebaseDelivered
    ? successResponse(commandData, 201)
    : multiStatusResponse(commandData, 'Command saved but realtime delivery failed. ESP32 will receive on next poll.')
}
