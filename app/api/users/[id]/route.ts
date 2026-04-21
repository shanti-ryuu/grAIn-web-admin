import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import User from '@/lib/models/User'
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

    const user = getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      const response = errorResponse('Forbidden: Admin access required', ErrorCodes.FORBIDDEN, 403)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const { id } = await params
    const { name, email, role, status } = await request.json()

    const updateData: any = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (role) updateData.role = role
    if (status) updateData.status = status

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('-password')

    if (!updatedUser) {
      const response = errorResponse('User not found', ErrorCodes.USER_NOT_FOUND, 404)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const userData = {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
      createdAt: updatedUser.createdAt?.toISOString?.() || updatedUser.createdAt,
    }

    const response = successResponse(userData)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Update user error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}