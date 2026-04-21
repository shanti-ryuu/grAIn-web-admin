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

    // Verify authentication
    const user = getUserFromRequest(request)
    if (!user) {
      const response = errorResponse(
        'Unauthorized: Missing or invalid token',
        ErrorCodes.UNAUTHORIZED,
        401
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Get current user from database
    const dbUser = await User.findById(user.userId)
    if (!dbUser) {
      const response = errorResponse(
        'User not found',
        ErrorCodes.USER_NOT_FOUND,
        404
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const userData = {
      id: dbUser._id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      status: dbUser.status,
    }

    const response = successResponse({ user: userData })
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Get me error:', error)
    const response = errorResponse(
      'Internal server error',
      ErrorCodes.INTERNAL_ERROR,
      500
    )
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}