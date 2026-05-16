import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import Command from '@/lib/models/Command'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { isValidDeviceId } from '@/lib/utils/validation'
import { markCommandExecuted } from '@/lib/utils/firebase-sync'
import { CommandStatus } from '@/lib/enums'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    await dbConnect()

    const { deviceId } = await params

    if (!isValidDeviceId(deviceId)) {
      return errorResponse('Invalid device ID format', ErrorCodes.INVALID_INPUT, 400)
    }

    const body = await request.json()
    const { commandId, status, command } = body

    let resolvedCommandId = typeof commandId === 'string' ? commandId : ''

    const validStatuses = [CommandStatus.Executed, CommandStatus.Failed, CommandStatus.Timeout, CommandStatus.Error]
    const commandStatus = validStatuses.includes(status) ? status : CommandStatus.Executed

    if (!resolvedCommandId) {
      const hardwareCommand = typeof command === 'string' ? command.trim().toUpperCase() : ''
      const query: Record<string, unknown> = {
        deviceId,
        status: { $in: [CommandStatus.Pending, CommandStatus.Polled, CommandStatus.Executing] },
      }
      if (hardwareCommand) {
        query.$or = [
          { commandStr: hardwareCommand },
          { command: hardwareCommand },
        ]
      }
      const activeCommand = await Command.findOne(query).sort({ createdAt: 1 }).lean()
      resolvedCommandId = activeCommand?._id?.toString?.() ?? ''
    }

    if (!resolvedCommandId) {
      return errorResponse('commandId or active command match is required', ErrorCodes.INVALID_INPUT, 400)
    }

    await markCommandExecuted(deviceId, resolvedCommandId, commandStatus)

    const updatedCommand = await Command.findById(resolvedCommandId)

    if (!updatedCommand) {
      return errorResponse('Command not found', ErrorCodes.NOT_FOUND, 404)
    }

    console.info(`[Command ACK] device=${deviceId} id=${resolvedCommandId} status=${commandStatus}`)

    return successResponse({
      id: updatedCommand._id,
      deviceId: updatedCommand.deviceId,
      command: updatedCommand.command,
      status: updatedCommand.status,
      executedAt: updatedCommand.executedAt?.toISOString?.() || null,
    })

  } catch (error) {
    console.error('Command ack error:', error)
    return errorResponse('Failed to acknowledge command', ErrorCodes.INTERNAL_ERROR, 500)
  }
}
