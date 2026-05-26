import { withAuth } from '@/lib/utils/handler'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import DryingSession from '@/lib/models/DryingSession'
import { sendPushNotification } from '@/lib/utils/notifications'
import { DryingSessionStatus, UserRole } from '@/lib/enums'

export const GET = withAuth(async (_req, user, ctx) => {
  const { id } = await ctx.params

  const session = await DryingSession.findById(id).lean()
  if (!session) {
    return errorResponse('Session not found', ErrorCodes.NOT_FOUND, 404)
  }

  if (user.role !== UserRole.Admin && session.userId.toString() !== user.userId) {
    return errorResponse('Not authorized', ErrorCodes.FORBIDDEN, 403)
  }

  return successResponse(session)
})

export const PATCH = withAuth(async (req, user, ctx) => {
  const { id } = await ctx.params
  const body = await req.json()
  const { action } = body

  const session = await DryingSession.findById(id)
  if (!session) {
    return errorResponse('Session not found', ErrorCodes.NOT_FOUND, 404)
  }

  if (user.role !== UserRole.Admin && session.userId.toString() !== user.userId) {
    return errorResponse('Not authorized', ErrorCodes.FORBIDDEN, 403)
  }

  if (action === 'complete' || action === 'abort') {
    if (session.status !== DryingSessionStatus.Active) {
      return errorResponse('Session is not active', ErrorCodes.INVALID_INPUT, 400)
    }

    const now = new Date()
    const duration = Math.round((now.getTime() - session.startedAt.getTime()) / 1000)
    const moistureDrop = session.startMoisture - session.currentMoisture
    const efficiency = moistureDrop > 0
      ? Math.min(100, Math.round((moistureDrop / (session.startMoisture - session.targetMoisture)) * 100))
      : 0

    session.status = action === 'complete' ? DryingSessionStatus.Completed : DryingSessionStatus.Aborted
    session.completedAt = now
    session.duration = duration
    session.finalMoisture = session.currentMoisture
    session.efficiency = action === 'complete' ? efficiency : undefined
    await session.save()

    const notifType = action === 'complete' ? 'drying_complete' : 'session_aborted'
    const title = action === 'complete' ? 'Drying Complete!' : 'Session Aborted'
    const notifBody = action === 'complete'
      ? `${session.deviceId} finished drying. Final moisture: ${session.currentMoisture}%. Duration: ${Math.round(duration / 60)}min.`
      : `Drying session for ${session.deviceId} was aborted.`

    await sendPushNotification({
      userId: session.userId,
      deviceId: session.deviceId,
      type: notifType,
      title,
      body: notifBody,
      data: { sessionId: id },
    }).catch(err => console.error('[Notification]', err))

    return successResponse(session)
  }

  if (body.grainType) session.grainType = body.grainType
  if (body.targetMoisture) session.targetMoisture = body.targetMoisture
  await session.save()

  return successResponse(session)
})

export const DELETE = withAuth(async (_req, user, ctx) => {
  const { id } = await ctx.params

  const session = await DryingSession.findById(id)
  if (!session) {
    return errorResponse('Session not found', ErrorCodes.NOT_FOUND, 404)
  }

  if (user.role !== UserRole.Admin) {
    return errorResponse('Admin only', ErrorCodes.FORBIDDEN, 403)
  }

  await DryingSession.findByIdAndDelete(id)
  return successResponse({ deleted: true })
}, { role: UserRole.Admin })
