import Command from '@/lib/models/Command'
import type { ICommand } from '@/lib/models/Command'
import { successResponse } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'

export const GET = withAuth(async (request, user) => {
  void user
  const url = new URL(request.url)
  const limit = parseInt(url.searchParams.get('limit') || '20')
  const deviceId = url.searchParams.get('deviceId')

  const filter: Record<string, unknown> = {}
  if (deviceId) filter.deviceId = deviceId

  const commands = await Command.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<ICommand[]>()

  const formatted = commands.map((cmd: ICommand) => ({
    id: cmd._id,
    deviceId: cmd.deviceId,
    command: cmd.command,
    mode: cmd.mode,
    temperature: cmd.temperature,
    fanSpeed: cmd.fanSpeed,
    status: cmd.status,
    executedAt: cmd.executedAt?.toISOString?.() || null,
    createdAt: cmd.createdAt.toISOString(),
  }))

  return successResponse(formatted)
})
