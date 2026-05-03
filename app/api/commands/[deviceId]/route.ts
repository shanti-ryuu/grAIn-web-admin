import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import Command from '@/lib/models/Command'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { isValidDeviceId } from '@/lib/utils/validation'
import { CommandStatus } from '@/lib/enums'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    await dbConnect()

    const { deviceId } = await params

    // Validate device ID
    if (!isValidDeviceId(deviceId)) {
      const response = errorResponse(
        'Invalid device ID format',
        ErrorCodes.InvalidInput,
        400
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Get pending commands for this device
    const commands = await Command.find({
      deviceId,
      status: CommandStatus.Pending,
    })
      .sort({ createdAt: 1 })
      .limit(10)
      .lean()

    // Format commands
    const formattedCommands = commands.map((cmd: any) => ({
      id: cmd._id,
      deviceId: cmd.deviceId,
      command: cmd.command,
      mode: cmd.mode,
      ...(cmd.fanTarget && { fanTarget: cmd.fanTarget }),
      ...(cmd.fanAction && { fanAction: cmd.fanAction }),
      status: cmd.status,
      createdAt: cmd.createdAt.toISOString(),
    }))

    // Mark commands as executed
    const commandIds = commands.map(cmd => cmd._id)
    if (commandIds.length > 0) {
      await Command.updateMany(
        { _id: { $in: commandIds } },
        {
          status: CommandStatus.Executed,
          executedAt: new Date(),
        }
      )
    }

    const response = successResponse({
      commands: formattedCommands,
      count: formattedCommands.length,
    })

    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Get commands error:', error)
    const response = errorResponse(
      'Failed to retrieve commands',
      ErrorCodes.InternalError,
      500
    )
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}