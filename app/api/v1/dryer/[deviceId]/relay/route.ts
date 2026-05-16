import { withAuth } from '@/lib/utils/handler'
import { createDryerCommand } from '@/lib/utils/dryer-command'
import { errorResponse, ErrorCodes } from '@/lib/utils/response'
import { CommandType, FanAction } from '@/lib/enums'

const VALID_RELAY_ACTIONS = Object.values(FanAction)

export const POST = withAuth(async (request, user, { params }) => {
  let body: { relayAction?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid request body', ErrorCodes.INVALID_INPUT, 400)
  }

  const { relayAction } = body

  if (!relayAction || !(VALID_RELAY_ACTIONS as readonly string[]).includes(relayAction)) {
    return errorResponse('Invalid or missing "relayAction" field. Must be one of: ON, OFF', ErrorCodes.INVALID_INPUT, 400)
  }

  return createDryerCommand(request, user, params, {
    command: CommandType.RelayControl,
    extraFields: {
      commandStr: relayAction === FanAction.On ? 'R1:1' : 'R1:0',
      relayAction,
    },
  })
})
