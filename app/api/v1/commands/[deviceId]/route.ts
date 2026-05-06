import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import Command, { ICommand } from '@/lib/models/Command'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { isValidDeviceId } from '@/lib/utils/validation'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    await dbConnect()

    const { deviceId } = await params

    if (!isValidDeviceId(deviceId)) {
      return errorResponse('Invalid device ID format', ErrorCodes.INVALID_INPUT, 400)
    }

    const commands = await Command.find({ deviceId, status: 'pending' })
      .sort({ createdAt: 1 })
      .limit(10)
      .lean()

    const formattedCommands = commands.map((cmd: ICommand) => ({
      id: cmd._id,
      deviceId: cmd.deviceId,
      command: cmd.command,
      mode: cmd.mode,
      ...(cmd.fanTarget && { fanTarget: cmd.fanTarget }),
      ...(cmd.fanAction && { fanAction: cmd.fanAction }),
      status: cmd.status,
      createdAt: cmd.createdAt.toISOString(),
    }))

    const commandIds = commands.map(cmd => cmd._id)
    if (commandIds.length > 0) {
      await Command.updateMany(
        { _id: { $in: commandIds } },
        { status: 'executed', executedAt: new Date() }
      )
    }

    return successResponse({ commands: formattedCommands, count: formattedCommands.length })

  } catch (error) {
    console.error('Get commands error:', error)
    return errorResponse('Failed to retrieve commands', ErrorCodes.INTERNAL_ERROR, 500)
  }
}