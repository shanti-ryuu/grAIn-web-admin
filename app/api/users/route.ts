import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import dbConnect from '@/lib/db'
import User from '@/lib/models/User'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { getUserFromRequest } from '@/lib/utils/auth'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const user = getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      const response = errorResponse('Forbidden: Admin access required', ErrorCodes.FORBIDDEN, 403)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const users = await User.find({}).select('-password').sort({ createdAt: -1 })

    const formattedUsers = users.map((u: any) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      lastActive: u.updatedAt?.toISOString?.() || u.updatedAt,
      createdAt: u.createdAt?.toISOString?.() || u.createdAt,
    }))

    const response = successResponse(formattedUsers)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Get users error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const user = getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      const response = errorResponse('Forbidden: Admin access required', ErrorCodes.FORBIDDEN, 403)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'farmer',
    })

    const userData = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      createdAt: newUser.createdAt?.toISOString?.() || newUser.createdAt,
    }

    const response = successResponse(userData, 201)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Create user error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}