import { withAuth } from '@/lib/utils/handler'
import { createDryerCommand } from '@/lib/utils/dryer-command'
import { errorResponse, ErrorCodes } from '@/lib/utils/response'

const VALID_HEATER_ACTIONS = ['ON', 'OFF'] as const

export const POST = withAuth(async (request, user, { params }) => {
  let body: { heaterAction?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid request body', ErrorCodes.INVALID_INPUT, 400)
  }

  const { heaterAction } = body

  if (!heaterAction || !(VALID_HEATER_ACTIONS as readonly string[]).includes(heaterAction)) {
    return errorResponse('Invalid or missing "heaterAction" field. Must be one of: ON, OFF', ErrorCodes.INVALID_INPUT, 400)
  }

  return createDryerCommand(request, user, params, {
    command: 'HEATER_CONTROL',
    extraFields: {
      commandStr: heaterAction === 'ON' ? 'H1:1' : 'H1:0',
      heaterAction,
    },
  })
})
