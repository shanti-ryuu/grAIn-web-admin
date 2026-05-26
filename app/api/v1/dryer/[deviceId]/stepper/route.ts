import { withAuth } from '@/lib/utils/handler'
import { createDryerCommand } from '@/lib/utils/dryer-command'
import { errorResponse, ErrorCodes } from '@/lib/utils/response'
import { CommandType, StepperAction } from '@/lib/enums'

const VALID_STEPPER_ACTIONS = Object.values(StepperAction)
const STEPPER_COMMAND_STR: Record<StepperAction, string> = {
  [StepperAction.Start]: 'STEP:START',
  [StepperAction.Stop]: 'STEP:STOP',
  [StepperAction.Cw]: 'STEP:CW',
  [StepperAction.Ccw]: 'STEP:CCW',
}

export const POST = withAuth(async (request, user, { params }) => {
  let body: { stepperAction?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid request body', ErrorCodes.INVALID_INPUT, 400)
  }

  const stepperAction = body.stepperAction as StepperAction | undefined

  if (!stepperAction || !(VALID_STEPPER_ACTIONS as readonly string[]).includes(stepperAction)) {
    return errorResponse('Invalid or missing "stepperAction" field. Must be one of: START, STOP, CW, CCW', ErrorCodes.INVALID_INPUT, 400)
  }

  return createDryerCommand(request, user, params, {
    command: CommandType.StepperControl,
    extraFields: {
      commandStr: STEPPER_COMMAND_STR[stepperAction],
      stepperAction,
    },
  })
})
