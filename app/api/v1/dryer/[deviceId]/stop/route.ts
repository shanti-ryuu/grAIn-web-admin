import { withAuth } from '@/lib/utils/handler'
import { createDryerCommand } from '@/lib/utils/dryer-command'

export const POST = withAuth(async (request, user, { params }) => {
  return createDryerCommand(request, user, params, { command: 'STOP' })
})