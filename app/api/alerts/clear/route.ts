import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import Alert from '@/lib/models/Alert'
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

    await Alert.updateMany({ isRead: false }, { isRead: true })

    const response = successResponse({ cleared: true })
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Alerts clear error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}
