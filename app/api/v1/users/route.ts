import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import User from '@/lib/models/User'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'
import { BCRYPT_ROUNDS } from '@/lib/enums'
import { sanitizeString } from '@/lib/utils/validation'

export const GET = withAuth(async (request, user) => {
  const { searchParams } = request.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '10'))
  const skip = (page - 1) * limit

  const [users, total] = await Promise.all([
    User.find({})
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments({}),
  ])

  return successResponse({
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    limit,
  })
}, { role: 'admin' })

export const POST = withAuth(async (request, user) => {
  const { name, email, password, role } = await request.json()

  // Sanitize user-input string fields (NOT email, password)
  const safeName = typeof name === 'string' ? sanitizeString(name) : name

  if (!name || !email || !password) {
    return errorResponse('Name, email, and password are required', ErrorCodes.INVALID_INPUT, 400)
  }

  const existingUser = await User.findOne({ email })
  if (existingUser) {
    return errorResponse('User with this email already exists', ErrorCodes.CONFLICT, 400)
  }

  const newUser = await User.create({
    name: safeName,
    email,
    password: await bcrypt.hash(password, BCRYPT_ROUNDS),
    role: role ?? 'farmer',
    status: 'active',
  })

  const userWithoutPassword = newUser.toObject()
  delete userWithoutPassword.password

  return successResponse(userWithoutPassword, 201)
}, { role: 'admin' })