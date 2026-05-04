import { withAuth } from '@/lib/utils/handler'
import { createDryerCommand } from '@/lib/utils/dryer-command'
import { errorResponse, ErrorCodes } from '@/lib/utils/response'

const VALID_FANS = ['FAN1', 'FAN2', 'ALL'] as const
const VALID_ACTIONS = ['ON', 'OFF'] as const

export const POST = withAuth(async (request, user, { params }) => {
  let body: { fan?: string; action?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid request body', ErrorCodes.INVALID_INPUT, 400)
  }

  const { fan: rawFan, action: rawAction } = body

  if (!rawFan || !(VALID_FANS as readonly string[]).includes(rawFan)) {
    return errorResponse('Invalid or missing "fan" field. Must be one of: FAN1, FAN2, ALL', ErrorCodes.INVALID_INPUT, 400)
  }

  if (!rawAction || !(VALID_ACTIONS as readonly string[]).includes(rawAction)) {
    return errorResponse('Invalid or missing "action" field. Must be one of: ON, OFF', ErrorCodes.INVALID_INPUT, 400)
  }

  return createDryerCommand(request, user, params, {
    command: 'FAN_CONTROL',
    extraFields: {
      fanTarget: rawFan,
      fanAction: rawAction,
    },
  })
})
