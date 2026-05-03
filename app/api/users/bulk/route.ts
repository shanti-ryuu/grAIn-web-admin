import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import User from '@/lib/models/User'
import Device from '@/lib/models/Device'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { getUserFromRequest } from '@/lib/utils/auth'
import { UserRole } from '@/lib/enums'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect()

    const authUser = await getUserFromRequest(request)
    if (!authUser || authUser.role !== 'admin') {
      const response = errorResponse('Forbidden: Admin access required', ErrorCodes.FORBIDDEN, 403)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      const response = errorResponse('ids array is required', ErrorCodes.INVALID_INPUT, 400)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Prevent admin from deleting themselves
    const filteredIds = ids.filter((id: string) => id !== authUser.userId)

    // Unassign devices for all users being deleted
    await Device.updateMany(
      { assignedUser: { $in: filteredIds } },
      { $unset: { assignedUser: '' } }
    )

    const result = await User.deleteMany({ _id: { $in: filteredIds } })

    const response = successResponse({ deletedCount: result.deletedCount })
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Bulk delete users error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}
