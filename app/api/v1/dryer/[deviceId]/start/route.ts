import { withAuth } from '@/lib/utils/handler'
import { createDryerCommand } from '@/lib/utils/dryer-command'
import { CommandType, DryerMode } from '@/lib/enums'

export const POST = withAuth(async (request, user, { params }) => {
  let body: { mode?: string; temperature?: number; fanSpeed?: number } = {}
  try { body = await request.json() } catch { /* body optional */ }

  const commandMode = body.mode && Object.values(DryerMode).includes(body.mode as DryerMode) ? body.mode as DryerMode : DryerMode.Manual

  return createDryerCommand(request, user, params, {
    command: CommandType.Start,
    mode: commandMode,
    extraFields: {
      temperature: body.temperature !== undefined ? Number(body.temperature) : undefined,
      fanSpeed: body.fanSpeed !== undefined ? Number(body.fanSpeed) : undefined,
    },
  })
})
