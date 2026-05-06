import bcrypt from 'bcryptjs'
import User from '@/lib/models/User'
import Device from '@/lib/models/Device'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'
import { BCRYPT_ROUNDS } from '@/lib/enums'
import { sanitizeObject } from '@/lib/utils/validation'

export const PATCH = withAuth(async (request, authUser, { params }) => {
  const { id } = await params
  const body = sanitizeObject(await request.json())
  const { name, email, role, status, password, currentPassword } = body

  const isAdmin = authUser.role === 'admin'
  const isSelf = authUser.userId === id

  if (!isAdmin && !isSelf) {
    return errorResponse('Forbidden', ErrorCodes.FORBIDDEN, 403)
  }

  const updateData: Record<string, unknown> = {}

  if (name) updateData.name = name
  if (email) updateData.email = email

  if (isAdmin) {
    if (role) updateData.role = role
    if (status) updateData.status = status
  }

  if (password) {
    if (!currentPassword && !isAdmin) {
      return errorResponse('Current password is required', ErrorCodes.INVALID_INPUT, 400)
    }

    const targetUser = await User.findById(id).select('+password')
    if (!targetUser) {
      return errorResponse('User not found', ErrorCodes.USER_NOT_FOUND, 404)
    }

    if (!isAdmin) {
      const isValid = await bcrypt.compare(currentPassword, targetUser.password)
      if (!isValid) {
        return errorResponse('Current password is incorrect', ErrorCodes.INVALID_INPUT, 400)
      }
    }

    updateData.password = await bcrypt.hash(password, BCRYPT_ROUNDS)
  }

  const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password')
  if (!updatedUser) {
    return errorResponse('User not found', ErrorCodes.USER_NOT_FOUND, 404)
  }

  return successResponse({
    id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    status: updatedUser.status,
    createdAt: updatedUser.createdAt?.toISOString?.() || updatedUser.createdAt,
  })
})

export const DELETE = withAuth(async (_request, authUser, { params }) => {
  const { id } = await params

  if (authUser.userId === id) {
    return errorResponse('Cannot delete your own account', ErrorCodes.INVALID_INPUT, 400)
  }

  const user = await User.findById(id)
  if (!user) {
    return errorResponse('User not found', ErrorCodes.USER_NOT_FOUND, 404)
  }

  await Device.updateMany({ assignedUser: id }, { $unset: { assignedUser: '' } })
  await User.findByIdAndDelete(id)

  return successResponse({ id, name: user.name, email: user.email })
}, { role: 'admin' })