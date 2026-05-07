import { withAuth } from '@/lib/utils/handler'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { FCMToken } from '@/lib/models/Notification'

export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const { token, platform } = body

  if (!token) {
    return errorResponse('FCM token is required', ErrorCodes.INVALID_INPUT, 400)
  }

  await FCMToken.findOneAndUpdate(
    { token },
    { userId: user.userId, token, platform: platform || 'web' },
    { upsert: true }
  )

  return successResponse({ registered: true })
})

export const DELETE = withAuth(async (req, user) => {
  const body = await req.json()
  const { token } = body

  if (!token) {
    return errorResponse('FCM token is required', ErrorCodes.INVALID_INPUT, 400)
  }

  await FCMToken.deleteOne({ token, userId: user.userId })
  return successResponse({ removed: true })
})
