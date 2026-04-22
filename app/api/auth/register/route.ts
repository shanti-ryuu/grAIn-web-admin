import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import dbConnect from '@/lib/db'
import User from '@/lib/models/User'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { checkRateLimit, RateLimits } from '@/lib/utils/rateLimit'
import { isValidEmail } from '@/lib/utils/validation'
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
        'Too many registration attempts. Please try again later.',
        ErrorCodes.RATE_LIMIT,
        429
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    await dbConnect()

    const body = await request.json()
    const { name, email, password, role } = body

    // Validate required fields
    const errors: Record<string, string> = {}

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      errors.name = 'Name is required and must be at least 2 characters'
    }

    if (!email || typeof email !== 'string') {
      errors.email = 'Email is required'
    } else if (!isValidEmail(email)) {
      errors.email = 'Invalid email format'
    }

    if (!password || typeof password !== 'string') {
      errors.password = 'Password is required'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    if (role && !['admin', 'farmer'].includes(role)) {
      errors.role = 'Role must be admin or farmer'
    }

    if (Object.keys(errors).length > 0) {
      const response = errorResponse(
        Object.values(errors).join(', '),
        ErrorCodes.INVALID_INPUT,
        400
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() })
    if (existingUser) {
      const response = errorResponse(
        'Email already registered',
        ErrorCodes.CONFLICT,
        409
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user with default role 'farmer'
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || 'farmer',
      status: 'active',
    })

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
    }, 201)

    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Registration error:', error)
    const response = errorResponse(
      'Internal server error',
      ErrorCodes.INTERNAL_ERROR,
      500
    )
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}
