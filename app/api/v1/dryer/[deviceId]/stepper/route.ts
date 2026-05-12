import { withAuth } from '@/lib/utils/handler'
import { createDryerCommand } from '@/lib/utils/dryer-command'
import { errorResponse, ErrorCodes } from '@/lib/utils/response'

const VALID_STEPPER_ACTIONS = ['START', 'STOP', 'CW', 'CCW'] as const

export const POST = withAuth(async (request, user, { params }) => {
  let body: { stepperAction?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid request body', ErrorCodes.INVALID_INPUT, 400)
  }

  const { stepperAction } = body

  if (!stepperAction || !(VALID_STEPPER_ACTIONS as readonly string[]).includes(stepperAction)) {
    return errorResponse('Invalid or missing "stepperAction" field. Must be one of: START, STOP, CW, CCW', ErrorCodes.INVALID_INPUT, 400)
  }

  return createDryerCommand(request, user, params, {
    command: 'STEPPER_CONTROL',
    extraFields: {
      commandStr: `STEP:${stepperAction}`,
      stepperAction,
    },
  })
})
