import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import dbConnect from '@/lib/db'
import User from '@/lib/models/User'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { checkRateLimit, RateLimits } from '@/lib/utils/rateLimit'
import { validateLoginRequest, getQueryParams } from '@/lib/utils/validation'
import { generateToken } from '@/lib/utils/auth'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimit = checkRateLimit(request, RateLimits.AUTH)
    if (!rateLimit.allowed) {
      const response = errorResponse(
        'Too many login attempts. Please try again later.',
        ErrorCodes.RATE_LIMIT,
        429
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    await dbConnect()

    const body = await request.json()

    // Validate input
    const validation = validateLoginRequest(body)
    if (!validation.valid) {
      const response = errorResponse(
        Object.values(validation.errors).join(', '),
        ErrorCodes.INVALID_INPUT,
        400
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const { email, password } = body

    // Find user by email
    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      const response = errorResponse(
        'Invalid credentials',
        ErrorCodes.INVALID_CREDENTIALS,
        401
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      const response = errorResponse(
        'Invalid credentials',
        ErrorCodes.INVALID_CREDENTIALS,
        401
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Check if user is active
    if (user.status !== 'active') {
      const response = errorResponse(
        'Account is inactive',
        ErrorCodes.ACCOUNT_INACTIVE,
        403
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Generate JWT token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    })

    // Return user data without password
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    }

    const response = successResponse({
      token,
      user: userData,
      expiresIn: 604800, // 7 days in seconds
    })

    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Login error:', error)
    const response = errorResponse(
      'Internal server error',
      ErrorCodes.INTERNAL_ERROR,
      500
    )
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}