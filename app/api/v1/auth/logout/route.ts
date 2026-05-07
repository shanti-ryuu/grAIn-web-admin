import User from '@/lib/models/User'
import { successResponse } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'
import { revokeRefreshToken } from '@/lib/utils/tokens'

export const POST = withAuth(async (request, user) => {
  // Revoke the access token
  const token = request.headers.get('authorization')?.split(' ')[1]
  if (token) {
    await User.findByIdAndUpdate(user.userId, {
      $push: { revokedTokens: { token, revokedAt: new Date() } },
    })
  }

  // Remove the refresh token from body if provided
  try {
    const body = await request.clone().json()
    if (body.refreshToken) {
      await revokeRefreshToken(user.userId, body.refreshToken)
    }
  } catch {
    // Body may be empty or not JSON — that's fine
  }

  // Cleanup: remove revoked tokens older than 7 days (JWT expiry)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  await User.findByIdAndUpdate(user.userId, {
    $pull: { revokedTokens: { revokedAt: { $lt: sevenDaysAgo } } },
  })

  return successResponse({ message: 'Logged out successfully' })
})
