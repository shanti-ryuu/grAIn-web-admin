import { withAuth } from '@/lib/utils/handler'
import { createDryerCommand } from '@/lib/utils/dryer-command'
import { errorResponse, ErrorCodes } from '@/lib/utils/response'

type CommandSpecInput = {
  command: string
  mode?: string
  extraFields?: Record<string, unknown>
}

function parseRawCommand(rawCommand: string): CommandSpecInput | null {
  const commandStr = rawCommand.trim().toUpperCase()
  const parts = commandStr.split(':')

  if (parts[0] === 'START') {
    const mode = parts[1] === 'AUTO' || parts[1] === 'MANUAL' ? parts[1] : 'MANUAL'
    const temperature = Number(parts[2] ?? 45)
    const fanSpeed = Number(parts[3] ?? 80)
    return {
      command: 'START',
      mode,
      extraFields: {
        commandStr: `START:${mode}:${Number.isFinite(temperature) ? temperature : 45}:${Number.isFinite(fanSpeed) ? fanSpeed : 80}`,
        temperature: Number.isFinite(temperature) ? temperature : 45,
        fanSpeed: Number.isFinite(fanSpeed) ? fanSpeed : 80,
      },
    }
  }

  if (commandStr === 'STOP') {
    return { command: 'STOP', extraFields: { commandStr: 'STOP' } }
  }

  if (commandStr === 'STATUS') {
    return { command: 'STATUS', extraFields: { commandStr: 'STATUS' } }
  }

  if (parts[0] === 'FAN' && ['FAN1', 'FAN2', 'ALL'].includes(parts[1]) && ['ON', 'OFF'].includes(parts[2])) {
    return {
      command: 'FAN_CONTROL',
      extraFields: {
        commandStr,
        fanTarget: parts[1],
        fanAction: parts[2],
      },
    }
  }

  if (parts[0] === 'STEP' && ['START', 'STOP', 'CW', 'CCW'].includes(parts[1])) {
    return {
      command: 'STEPPER_CONTROL',
      extraFields: {
        commandStr,
        stepperAction: parts[1],
      },
    }
  }

  if (parts[0] === 'H1' && ['1', '0'].includes(parts[1])) {
    return {
      command: 'HEATER_CONTROL',
      extraFields: {
        commandStr,
        heaterAction: parts[1] === '1' ? 'ON' : 'OFF',
      },
    }
  }

  if (parts[0] === 'R1' && ['1', '0'].includes(parts[1])) {
    return {
      command: 'RELAY_CONTROL',
      extraFields: {
        commandStr,
        relayAction: parts[1] === '1' ? 'ON' : 'OFF',
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
