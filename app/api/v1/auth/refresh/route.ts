import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { verifyRefreshToken, generateRefreshToken, revokeRefreshToken } from '@/lib/utils/tokens'
import { generateAccessToken } from '@/lib/utils/tokens'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refreshToken } = body

    if (!refreshToken || typeof refreshToken !== 'string') {
      return errorResponse('Refresh token is required', ErrorCodes.INVALID_INPUT, 400)
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

    return successResponse({ accessToken, refreshToken: newRefreshToken })

  } catch (error) {
    console.error('Refresh token error:', error)
    return errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
  }
}
