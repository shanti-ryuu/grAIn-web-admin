import { NextRequest } from 'next/server'
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

    const user = await getUserFromRequest(request)
    if (!user) {
      const response = errorResponse('Unauthorized', ErrorCodes.UNAUTHORIZED, 401)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const dbUser = await User.findById(user.userId).select('-password')
    if (!dbUser) {
      const response = errorResponse('User not found', ErrorCodes.USER_NOT_FOUND, 404)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const profileData = {
      id: dbUser._id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      status: dbUser.status,
      profileImage: dbUser.profileImage,
      bio: dbUser.bio,
      phoneNumber: dbUser.phoneNumber,
      location: dbUser.location,
      createdAt: dbUser.createdAt?.toISOString?.() || dbUser.createdAt,
    }

    const response = successResponse(profileData)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error: any) {
    console.error('Get profile error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await dbConnect()

    const user = await getUserFromRequest(request)
    if (!user) {
      const response = errorResponse('Unauthorized', ErrorCodes.UNAUTHORIZED, 401)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const body = await request.json()
    const allowedFields = ['name', 'bio', 'phoneNumber', 'location']
    const updates: Record<string, any> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      const response = errorResponse('No updatable fields provided', ErrorCodes.INVALID_INPUT, 400)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const updatedUser = await User.findByIdAndUpdate(user.userId, updates, { new: true }).select('-password')
    if (!updatedUser) {
      const response = errorResponse('User not found', ErrorCodes.USER_NOT_FOUND, 404)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const profileData = {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
      profileImage: updatedUser.profileImage,
      bio: updatedUser.bio,
      phoneNumber: updatedUser.phoneNumber,
      location: updatedUser.location,
    }

    const response = successResponse(profileData)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error: any) {
    console.error('Update profile error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}
