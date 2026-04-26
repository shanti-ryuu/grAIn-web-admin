import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect()

    const authUser = getUserFromRequest(request)
    if (!authUser) {
      const response = errorResponse('Unauthorized', ErrorCodes.UNAUTHORIZED, 401)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const { id } = await params
    const body = await request.json()
    const { name, email, role, status, password, currentPassword } = body

    // Allow users to update their own profile (password change) or admins to update any user
    const isAdmin = authUser.role === UserRole.Admin
    const isSelf = authUser.userId === id

    if (!isAdmin && !isSelf) {
      const response = errorResponse('Forbidden', ErrorCodes.FORBIDDEN, 403)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const updateData: any = {}

    // Profile fields (admin or self)
    if (name) updateData.name = name
    if (email) updateData.email = email

    // Admin-only fields
    if (isAdmin) {
      if (role) updateData.role = role
      if (status) updateData.status = status
    }

    // Password change requires current password verification
    if (password) {
      if (!currentPassword && !isAdmin) {
        const response = errorResponse('Current password is required', ErrorCodes.INVALID_INPUT, 400)
        return addCorsHeaders(response, request.headers.get('origin') || undefined)
      }

      const targetUser = await User.findById(id).select('+password')
      if (!targetUser) {
        const response = errorResponse('User not found', ErrorCodes.USER_NOT_FOUND, 404)
        return addCorsHeaders(response, request.headers.get('origin') || undefined)
      }

      // Non-admin must verify current password
      if (!isAdmin) {
        const isValid = await bcrypt.compare(currentPassword, targetUser.password)
        if (!isValid) {
          const response = errorResponse('Current password is incorrect', ErrorCodes.INVALID_INPUT, 400)
          return addCorsHeaders(response, request.headers.get('origin') || undefined)
        }
      }

      updateData.password = await bcrypt.hash(password, 12)
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password')

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

// FIX 2.5: DELETE handler for deleting a user (admin-only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect()

    const authUser = getUserFromRequest(request)
    if (!authUser || authUser.role !== 'admin') {
      const response = errorResponse('Forbidden: Admin access required', ErrorCodes.FORBIDDEN, 403)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const { id } = await params

    // Prevent admin from deleting themselves
    if (authUser.userId === id) {
      const response = errorResponse('Cannot delete your own account', ErrorCodes.INVALID_INPUT, 400)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const user = await User.findById(id)
    if (!user) {
      const response = errorResponse('User not found', ErrorCodes.USER_NOT_FOUND, 404)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Unassign devices before deleting user
    await Device.updateMany({ assignedUser: id }, { $unset: { assignedUser: '' } })

    await User.findByIdAndDelete(id)

    const response = successResponse({ id, name: user.name, email: user.email })
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Delete user error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}