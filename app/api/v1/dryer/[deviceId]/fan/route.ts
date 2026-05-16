import { withAuth } from '@/lib/utils/handler'
import { createDryerCommand } from '@/lib/utils/dryer-command'
import { errorResponse, ErrorCodes } from '@/lib/utils/response'
import { CommandType, FanAction, FanTarget } from '@/lib/enums'

const VALID_FANS = Object.values(FanTarget)
const VALID_ACTIONS = Object.values(FanAction)

export const POST = withAuth(async (request, user, { params }) => {
  let body: { fan?: string; action?: string; fanTarget?: string; fanAction?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid request body', ErrorCodes.INVALID_INPUT, 400)
  }

  const rawFan = body.fanTarget ?? body.fan
  const rawAction = body.fanAction ?? body.action

  if (!rawFan || !(VALID_FANS as readonly string[]).includes(rawFan)) {
    return errorResponse('Invalid or missing fan target. Must be one of: FAN1, FAN2, ALL', ErrorCodes.INVALID_INPUT, 400)
  }

  if (!rawAction || !(VALID_ACTIONS as readonly string[]).includes(rawAction)) {
    return errorResponse('Invalid or missing fan action. Must be one of: ON, OFF', ErrorCodes.INVALID_INPUT, 400)
  }

  return createDryerCommand(request, user, params, {
    command: CommandType.FanControl,
    extraFields: {
      commandStr: `FAN:${rawFan}:${rawAction}`,
      fanTarget: rawFan,
      fanAction: rawAction,
    },
  })
})
