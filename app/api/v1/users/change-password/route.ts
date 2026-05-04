import bcrypt from 'bcryptjs'
import User from '@/lib/models/User'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'
import { BCRYPT_ROUNDS } from '@/lib/enums'

export const POST = withAuth(async (request, user) => {
  const { currentPassword, newPassword, confirmPassword } = await request.json()

  if (!currentPassword || !newPassword || !confirmPassword) {
    return errorResponse('All password fields are required', ErrorCodes.INVALID_INPUT, 400)
  }

  if (newPassword.length < 6) {
    return errorResponse('New password must be at least 6 characters', ErrorCodes.INVALID_INPUT, 400)
  }

  if (newPassword !== confirmPassword) {
    return errorResponse('New passwords do not match', ErrorCodes.INVALID_INPUT, 400)
  }

  const dbUser = await User.findById(user.userId)
  if (!dbUser) {
    return errorResponse('User not found', ErrorCodes.USER_NOT_FOUND, 404)
  }

  const isMatch = await bcrypt.compare(currentPassword, dbUser.password)
  if (!isMatch) {
    return errorResponse('Current password is incorrect', ErrorCodes.INVALID_CREDENTIALS, 400)
  }

  dbUser.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  await dbUser.save()

  return successResponse({ message: 'Password changed successfully' })
})
