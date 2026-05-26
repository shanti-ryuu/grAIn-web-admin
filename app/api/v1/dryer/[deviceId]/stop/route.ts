import { withAuth } from '@/lib/utils/handler'
import { createDryerCommand } from '@/lib/utils/dryer-command'
import { CommandType } from '@/lib/enums'

export const POST = withAuth(async (request, user, { params }) => {
  return createDryerCommand(request, user, params, { command: CommandType.Stop })
})
