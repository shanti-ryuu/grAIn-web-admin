import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import Command, { ICommand } from '@/lib/models/Command'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { isValidDeviceId } from '@/lib/utils/validation'
import { markCommandExecuted } from '@/lib/utils/firebase-sync'

function toHardwareCommand(cmd: ICommand): string {
  if (cmd.commandStr) return cmd.commandStr

  if (cmd.command === 'START') {
    return `START:${cmd.mode ?? 'AUTO'}:${Number(cmd.temperature ?? 45)}:${Number(cmd.fanSpeed ?? 80)}`
  }

  if (cmd.command === 'STOP') return 'STOP'

  if (cmd.command === 'FAN_CONTROL') {
    return `FAN:${cmd.fanTarget ?? 'FAN1'}:${cmd.fanAction ?? 'ON'}`
  }

  if (cmd.command === 'HEATER_CONTROL') {
    return cmd.heaterAction === 'ON' ? 'H1:1' : 'H1:0'
  }

  if (cmd.command === 'RELAY_CONTROL') {
    return cmd.relayAction === 'ON' ? 'R1:1' : 'R1:0'
  }

  if (cmd.command === 'STEPPER_CONTROL') {
    return `STEP:${cmd.stepperAction ?? 'STOP'}`
  }

  if (cmd.command === 'STATUS') return 'STATUS'

  return cmd.command
}

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
      .limit(1)
      .lean()

    const formattedCommands = commands.map((cmd: ICommand) => {
      const hardwareCommand = toHardwareCommand(cmd)

      return {
        id: cmd._id.toString(),
        _id: cmd._id.toString(),
        deviceId: cmd.deviceId,
        command: hardwareCommand,
        commandType: cmd.command,
        commandStr: hardwareCommand,
        mode: cmd.mode,
        ...(cmd.fanTarget && { fanTarget: cmd.fanTarget }),
        ...(cmd.fanAction && { fanAction: cmd.fanAction }),
        ...(cmd.relayAction && { relayAction: cmd.relayAction }),
        ...(cmd.stepperAction && { stepperAction: cmd.stepperAction }),
        ...(cmd.heaterAction && { heaterAction: cmd.heaterAction }),
        status: cmd.status,
        createdAt: cmd.createdAt.toISOString(),
      }
    })

    if (commands.length > 0) {
      try {
        await markCommandExecuted(deviceId, commands[0]._id.toString(), 'executed')
      } catch (ackError) {
        console.error('[Commands Poll] Auto-ack failed:', ackError)
      }
    }

    return successResponse({ commands: formattedCommands, count: formattedCommands.length })

  } catch (error) {
    console.error('Get commands error:', error)
    return errorResponse('Failed to retrieve commands', ErrorCodes.INTERNAL_ERROR, 500)
  }
}
