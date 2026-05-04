import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import Alert from '@/lib/models/Alert'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { getUserFromRequest } from '@/lib/utils/auth'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect()

    const user = await getUserFromRequest(request)
    if (!user) {
      const response = errorResponse('Unauthorized', ErrorCodes.UNAUTHORIZED, 401)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const { id } = await params
    const alert = await Alert.findByIdAndUpdate(id, { isRead: true }, { new: true }).lean()

    if (!alert) {
      const response = errorResponse('Alert not found', ErrorCodes.NOT_FOUND, 404)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const response = successResponse({
      id: alert._id,
      isRead: alert.isRead,
    })
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Mark alert read error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}
