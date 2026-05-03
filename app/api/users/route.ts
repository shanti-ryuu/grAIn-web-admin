import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import dbConnect from '@/lib/db'
import User from '@/lib/models/User'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { getUserFromRequest } from '@/lib/utils/auth'
import { UserRole, UserStatus } from '@/lib/enums'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function GET(request: NextRequest) {
  try {
    // 1. Verify JWT
    const user = await getUserFromRequest(request)
    if (!user) {
      console.error('[GET /api/users] Unauthorized — no valid token')
      const response = errorResponse('Unauthorized', ErrorCodes.UNAUTHORIZED, 401)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // 2. Role check — only admin can list all users
    if (user.role !== UserRole.Admin) {
      console.error('[GET /api/users] Forbidden — role:', user.role)
      const response = errorResponse('Forbidden: Admin access required', ErrorCodes.FORBIDDEN, 403)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // 3. Connect DB
    await dbConnect()

    // 4. Parse pagination
    const { searchParams } = request.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '10'))
    const skip = (page - 1) * limit

    // 5. Query ALL users — NO filter by assignedUser or current user
    const [users, total] = await Promise.all([
      User.find({})
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({}),
    ])

    console.log(`[GET /api/users] Found ${users.length} users (total: ${total})`)

    // 6. Return with pagination metadata inside successResponse data
    const response = successResponse({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    })
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Get users error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify JWT
    const user = await getUserFromRequest(request)
    if (!user) {
      console.error('[POST /api/users] Unauthorized — no valid token')
      const response = errorResponse('Unauthorized', ErrorCodes.UNAUTHORIZED, 401)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // 2. Role check
    if (user.role !== UserRole.Admin) {
      console.error('[POST /api/users] Forbidden — role:', user.role)
      const response = errorResponse('Forbidden: Admin access required', ErrorCodes.FORBIDDEN, 403)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // 3. Connect DB
    await dbConnect()

    const { name, email, password, role } = await request.json()

    if (!name || !email || !password) {
      const response = errorResponse('Name, email, and password are required', ErrorCodes.INVALID_INPUT, 400)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      const response = errorResponse('User with this email already exists', ErrorCodes.CONFLICT, 400)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Create user
    const newUser = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: role ?? UserRole.Farmer,
      status: UserStatus.Active,
    })

    // Return created user without password
    const userWithoutPassword = newUser.toObject()
    delete userWithoutPassword.password

    console.log(`[POST /api/users] Created user: ${newUser.name} (${newUser.email})`)

    const response = successResponse(userWithoutPassword, 201)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Create user error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}