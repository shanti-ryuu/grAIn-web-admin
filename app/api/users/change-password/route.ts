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

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const user = getUserFromRequest(request)
    if (!user) {
      const response = errorResponse('Unauthorized', ErrorCodes.UNAUTHORIZED, 401)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const { currentPassword, newPassword, confirmPassword } = await request.json()

    if (!currentPassword || !newPassword || !confirmPassword) {
      const response = errorResponse('All password fields are required', ErrorCodes.INVALID_INPUT, 400)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    if (newPassword.length < 6) {
      const response = errorResponse('New password must be at least 6 characters', ErrorCodes.INVALID_INPUT, 400)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    if (newPassword !== confirmPassword) {
      const response = errorResponse('New passwords do not match', ErrorCodes.INVALID_INPUT, 400)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const dbUser = await User.findById(user.userId)
    if (!dbUser) {
      const response = errorResponse('User not found', ErrorCodes.USER_NOT_FOUND, 404)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const isMatch = await bcrypt.compare(currentPassword, dbUser.password)
    if (!isMatch) {
      const response = errorResponse('Current password is incorrect', ErrorCodes.INVALID_CREDENTIALS, 400)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    dbUser.password = hashedPassword
    await dbUser.save()

    const response = successResponse({ message: 'Password changed successfully' })
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error: any) {
    console.error('Change password error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}
