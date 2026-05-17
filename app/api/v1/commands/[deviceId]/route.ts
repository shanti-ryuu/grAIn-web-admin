import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import Command, { ICommand } from '@/lib/models/Command'
import Device from '@/lib/models/Device'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { isValidDeviceId } from '@/lib/utils/validation'
import { markCommandPolled } from '@/lib/utils/firebase-sync'
import { expireStalePendingCommands } from '@/lib/utils/dryer-command'
import { getRealtimeDb } from '@/lib/firebase-admin'

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

    await expireStalePendingCommands(deviceId)

    const now = new Date()
    await Device.findOneAndUpdate(
      { deviceId },
      {
        $set: {
          status: 'online',
          lastActive: now,
          'runtimeState.lastSeen': now,
          'runtimeState.lastHeartbeat': now,
          'runtimeState.updatedAt': now,
        },
      }
    )
    const realtimeDb = getRealtimeDb()
    if (realtimeDb) {
      await realtimeDb.ref(`grain/devices/${deviceId}`).update({
        status: 'online',
        lastActive: now.getTime(),
      })
      await realtimeDb.ref(`grain/devices/${deviceId}/runtimeState`).update({
        lastSeen: now.getTime(),
        lastHeartbeat: now.getTime(),
        updatedAt: now.getTime(),
      })
    }

    const activeCommand = await Command.findOne({ deviceId, status: { $in: ['polled', 'executing'] } })
      .sort({ createdAt: 1 })
      .lean()

    if (activeCommand) {
      return successResponse({
        commands: [],
        count: 0,
        activeCommand: {
          id: activeCommand._id.toString(),
          status: activeCommand.status,
          command: toHardwareCommand(activeCommand as ICommand),
          polledAt: activeCommand.polledAt?.toISOString?.() ?? null,
        },
      })
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
        status: 'polled',
        createdAt: cmd.createdAt.toISOString(),
      }
    })

    if (commands.length > 0) {
      await markCommandPolled(deviceId, commands[0]._id.toString())
      console.info(`[Command Polled] device=${deviceId} id=${commands[0]._id.toString()} command=${toHardwareCommand(commands[0] as ICommand)}`)
    }

    return successResponse({ commands: formattedCommands, count: formattedCommands.length })

  } catch (error) {
    console.error('Get commands error:', error)
    return errorResponse('Failed to retrieve commands', ErrorCodes.INTERNAL_ERROR, 500)
  }
}
