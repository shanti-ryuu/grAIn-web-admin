import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import User from '@/lib/models/User'
import bcrypt from 'bcryptjs'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { generateAccessToken, generateRefreshToken } from '@/lib/utils/tokens'
import { checkRateLimit, RateLimits } from '@/lib/utils/rateLimit'
import { validateLoginRequest } from '@/lib/utils/validation'
import { setAuthCookies } from '@/lib/utils/auth-cookies'

function logAuthError(code: string, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Unknown error'
  if (process.env.NODE_ENV === 'production') {
    console.error('[auth.login]', { code })
  } else {
    console.error('[auth.login]', { code, message })
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, RateLimits.AUTH)
    if (!rateLimit.allowed) {
      return errorResponse('Too many login attempts. Please try again later.', ErrorCodes.RATE_LIMIT, 429)
    }

    await dbConnect()

    const body = await request.json()
    const validation = validateLoginRequest(body)

    if (!validation.valid) {
      return errorResponse(Object.values(validation.errors).join(', '), ErrorCodes.INVALID_INPUT, 400)
    }

    const { email, password } = body

    // Do NOT sanitize email — escape() mangles @ and . characters
    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      return errorResponse('Invalid email or password', ErrorCodes.INVALID_CREDENTIALS, 401)
    }

    if (user.status === 'inactive') {
      return errorResponse('Account is inactive. Contact an administrator.', ErrorCodes.ACCOUNT_INACTIVE, 403)
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return errorResponse('Invalid email or password', ErrorCodes.INVALID_CREDENTIALS, 401)
    }

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    })

    const refreshToken = await generateRefreshToken(user._id.toString())

    const userData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    }

    const response = successResponse({ user: userData, accessToken, token: accessToken })
    return setAuthCookies(response, accessToken, refreshToken)

  } catch (error) {
    logAuthError('LOGIN_UNHANDLED', error)
    return errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
  }
}
