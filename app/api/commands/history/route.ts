import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import Command from '@/lib/models/Command'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { getUserFromRequest } from '@/lib/utils/auth'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const user = await getUserFromRequest(request)
    if (!user) {
      const response = errorResponse('Unauthorized', ErrorCodes.UNAUTHORIZED, 401)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const deviceId = url.searchParams.get('deviceId')

    const filter: any = {}
    if (deviceId) filter.deviceId = deviceId

    const commands = await Command.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    const formatted = commands.map((cmd: any) => ({
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

    const response = successResponse(formatted)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Commands history error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}
