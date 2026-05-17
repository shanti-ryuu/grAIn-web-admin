import User from '@/lib/models/User'
import { successResponse } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'
import { revokeRefreshToken } from '@/lib/utils/tokens'
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, clearAuthCookies } from '@/lib/utils/auth-cookies'

export const POST = withAuth(async (request, user) => {
  // Revoke the access token
  const token = request.headers.get('authorization')?.split(' ')[1]
    || request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  if (token) {
    await User.findByIdAndUpdate(user.userId, {
      $push: { revokedTokens: { token, revokedAt: new Date() } },
    })
  }

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value
  if (refreshToken) {
    await revokeRefreshToken(user.userId, refreshToken)
  }

  // Cleanup: remove revoked tokens older than 7 days (JWT expiry)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  await User.findByIdAndUpdate(user.userId, {
    $pull: { revokedTokens: { revokedAt: { $lt: sevenDaysAgo } } },
  })

  return clearAuthCookies(successResponse({ message: 'Logged out successfully' }))
})
