import { withAuth } from '@/lib/utils/handler'
import { createDryerCommand } from '@/lib/utils/dryer-command'
import { errorResponse, ErrorCodes } from '@/lib/utils/response'
import { CommandType, DryerMode, FanAction, FanTarget, StepperAction } from '@/lib/enums'

type CommandSpecInput = {
  command: CommandType
  mode?: DryerMode
  extraFields?: Record<string, unknown>
}

const STEPPER_ACTIONS = Object.values(StepperAction)

function parseRawCommand(rawCommand: string): CommandSpecInput | null {
  const commandStr = rawCommand.trim().toUpperCase()
  const parts = commandStr.split(':')

  if (parts[0] === CommandType.Start) {
    const mode = Object.values(DryerMode).includes(parts[1] as DryerMode) ? parts[1] as DryerMode : DryerMode.Manual
    const temperature = Number(parts[2] ?? 45)
    const fanSpeed = Number(parts[3] ?? 80)
    return {
      command: CommandType.Start,
      mode,
      extraFields: {
        commandStr: `START:${mode}:${Number.isFinite(temperature) ? temperature : 45}:${Number.isFinite(fanSpeed) ? fanSpeed : 80}`,
        temperature: Number.isFinite(temperature) ? temperature : 45,
        fanSpeed: Number.isFinite(fanSpeed) ? fanSpeed : 80,
      },
    }
  }

  if (commandStr === CommandType.Stop) {
    return { command: CommandType.Stop, extraFields: { commandStr: CommandType.Stop } }
  }

  if (commandStr === CommandType.Status) {
    return { command: CommandType.Status, extraFields: { commandStr: CommandType.Status } }
  }

  if (parts[0] === 'FAN' && Object.values(FanTarget).includes(parts[1] as FanTarget) && Object.values(FanAction).includes(parts[2] as FanAction)) {
    return {
      command: CommandType.FanControl,
      extraFields: {
        commandStr,
        fanTarget: parts[1],
        fanAction: parts[2],
      },
    }
  }

  if (parts[0] === 'STEP' && (STEPPER_ACTIONS as readonly string[]).includes(parts[1])) {
    return {
      command: CommandType.StepperControl,
      extraFields: {
        commandStr,
        stepperAction: parts[1],
      },
    }
  }

  if (parts[0] === 'H1' && ['1', '0'].includes(parts[1])) {
    return {
      command: CommandType.HeaterControl,
      extraFields: {
        commandStr,
        heaterAction: parts[1] === '1' ? FanAction.On : FanAction.Off,
      },
    }
  }

  if (parts[0] === 'R1' && ['1', '0'].includes(parts[1])) {
    return {
      command: CommandType.RelayControl,
      extraFields: {
        commandStr,
        relayAction: parts[1] === '1' ? FanAction.On : FanAction.Off,
      },
    }
  }

  return null
}

export const POST = withAuth(async (request, user) => {
  let body: { deviceId?: string; command?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid request body', ErrorCodes.INVALID_INPUT, 400)
  }

  if (!body.deviceId || typeof body.deviceId !== 'string') {
    return errorResponse('deviceId is required', ErrorCodes.INVALID_INPUT, 400)
  }

  if (!body.command || typeof body.command !== 'string') {
    return errorResponse('command is required', ErrorCodes.INVALID_INPUT, 400)
  }

  const spec = parseRawCommand(body.command)
  if (!spec) {
    return errorResponse(`Unsupported command: ${body.command}`, ErrorCodes.INVALID_INPUT, 400)
  }

  return createDryerCommand(request, user, Promise.resolve({ deviceId: body.deviceId }), spec)
})
