import { NextRequest } from 'next/server'
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

    const user = await getUserFromRequest(request)
    if (!user) {
      const response = errorResponse('Unauthorized', ErrorCodes.UNAUTHORIZED, 401)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const { image } = await request.json()

    if (!image) {
      const response = errorResponse('Image is required', ErrorCodes.INVALID_INPUT, 400)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    if (!image.startsWith('data:image/')) {
      const response = errorResponse('Invalid image format — must be base64 data URI starting with data:image/', ErrorCodes.INVALID_INPUT, 400)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const maxSize = 2 * 1024 * 1024
    const base64Data = image.split(',')[1]
    if (base64Data && Buffer.from(base64Data, 'base64').length > maxSize) {
      const response = errorResponse('Image too large — max 2MB', ErrorCodes.INVALID_INPUT, 400)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const updatedUser = await User.findByIdAndUpdate(user.userId, { profileImage: image }, { new: true }).select('-password')
    if (!updatedUser) {
      const response = errorResponse('User not found', ErrorCodes.USER_NOT_FOUND, 404)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const response = successResponse({ profileImage: updatedUser.profileImage })
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error: any) {
    console.error('Avatar upload error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}
