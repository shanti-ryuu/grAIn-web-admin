import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import User from '@/lib/models/User'
import bcrypt from 'bcryptjs'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { generateToken } from '@/lib/utils/auth'
import { checkRateLimit, RateLimits } from '@/lib/utils/rateLimit'
import { BCRYPT_ROUNDS, UserRole, UserStatus } from '@/lib/enums'
import { sanitizeString } from '@/lib/utils/validation'

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, RateLimits.AUTH)
    if (!rateLimit.allowed) {
      return errorResponse('Too many registration attempts. Please try again later.', ErrorCodes.RATE_LIMIT, 429)
    }

    await dbConnect()

    const { name, email, password, bio, location } = await request.json()

    // Sanitize user-input string fields (NOT email, password — they have their own validation)
    const safeName = typeof name === 'string' ? sanitizeString(name) : name
    const safeBio = typeof bio === 'string' ? sanitizeString(bio) : bio
    const safeLocation = typeof location === 'string' ? sanitizeString(location) : location

    if (!name || !email || !password) {
      return errorResponse('Name, email, and password are required', ErrorCodes.INVALID_INPUT, 400)
    }

    if (password.length < 6) {
      return errorResponse('Password must be at least 6 characters', ErrorCodes.INVALID_INPUT, 400)
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return errorResponse('User with this email already exists', ErrorCodes.CONFLICT, 400)
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS)

    const user = await User.create({
      name: safeName,
      email,
      password: hashedPassword,
      role: UserRole.Farmer,
      status: UserStatus.Active,
      bio: safeBio || '',
      location: safeLocation || '',
    })

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    })

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    }

    return successResponse({ user: userData, token }, 201)

  } catch (error) {
    console.error('Registration error:', error)
    return errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
  }
}
