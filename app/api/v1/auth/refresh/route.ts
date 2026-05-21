import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { verifyRefreshToken, generateRefreshToken, revokeRefreshToken } from '@/lib/utils/tokens'
import { generateAccessToken } from '@/lib/utils/tokens'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { REFRESH_TOKEN_COOKIE, setAuthCookies } from '@/lib/utils/auth-cookies'
import crypto from 'crypto'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
}

function logRefreshError(code: string, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Unknown error'
  if (process.env.NODE_ENV === 'production') {
    console.error('[auth.refresh]', { code })
  } else {
    console.error('[auth.refresh]', { code, message })
  }
}

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value

    if (!refreshToken || typeof refreshToken !== 'string') {
      return errorResponse('Refresh token is required', ErrorCodes.INVALID_INPUT, 400)
    }

    const rateLimit = await checkRateLimit(request, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 10,
      keyGenerator: () => `refresh:${hashToken(refreshToken)}:${getClientIp(request)}`,
    })
    if (!rateLimit.allowed) {
      console.warn('[auth.refresh]', { code: 'REFRESH_RATE_LIMITED', ip: getClientIp(request) })
      return errorResponse('Too many refresh attempts. Please sign in again later.', ErrorCodes.RATE_LIMIT, 429)
    }

    // Validate the refresh token — finds user with matching non-expired token
    const user = await verifyRefreshToken(refreshToken)
    if (!user) {
      return errorResponse('Invalid or expired refresh token', ErrorCodes.UNAUTHORIZED, 401)
    }

    // Issue new access token (15 min)
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    })

    // Rotate: delete old refresh token, issue a new one
    await revokeRefreshToken(user._id.toString(), refreshToken)
    const newRefreshToken = await generateRefreshToken(user._id.toString())

    const response = successResponse({ user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    } })
    return setAuthCookies(response, accessToken, newRefreshToken)

  } catch (error) {
    logRefreshError('REFRESH_UNHANDLED', error)
    return errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
  }
}
