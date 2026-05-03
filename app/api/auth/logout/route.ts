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

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (token) {
      await User.findByIdAndUpdate(user.userId, {
        $push: {
          revokedTokens: {
            token,
            revokedAt: new Date(),
          },
        },
      })
    }

    // Cleanup: remove revoked tokens older than 7 days (JWT expiry)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    await User.findByIdAndUpdate(user.userId, {
      $pull: {
        revokedTokens: {
          revokedAt: { $lt: sevenDaysAgo },
        },
      },
    })

    const response = successResponse({ message: 'Logged out successfully' })
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Logout error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}
